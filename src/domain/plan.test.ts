import { describe, expect, it } from 'vitest';
import { generatePlan, plannedTss, weekSlots } from './plan';
import { DAY_OPTIONS, PROGRAMS, getProgram } from './programs';
import { getRide } from './library';

const combos = PROGRAMS.flatMap((program) =>
  DAY_OPTIONS.map((days) => [program.id, days] as const),
);

describe('programs', () => {
  it.each(PROGRAMS.map((p) => [p.id, p] as const))('%s is internally consistent', (_id, p) => {
    expect(p.load).toHaveLength(p.weeks);
    expect(p.kinds).toHaveLength(p.weeks);
    for (const days of DAY_OPTIONS) expect(p.patterns[days]).toHaveLength(days);
    for (const [days, pattern] of Object.entries(p.peakPatterns ?? {})) {
      expect(pattern).toHaveLength(Number(days));
    }
    for (const w of p.testWeeks) expect(w).toBeLessThanOrEqual(p.weeks);
  });
});

describe('generatePlan', () => {
  it.each(combos)('%s with %i days builds every week', (id, days) => {
    const program = getProgram(id)!;
    const weeks = generatePlan(program, { daysPerWeek: days, startWithTest: false, seed: 1 });
    expect(weeks).toHaveLength(program.weeks);
    for (const week of weeks) {
      expect(week.rides).toHaveLength(days);
      for (const ride of week.rides) expect(getRide(ride.rideId), ride.rideId).toBeDefined();
    }
  });

  it.each(combos)('%s with %i days ends each test week with the FTP test', (id, days) => {
    const program = getProgram(id)!;
    const weeks = generatePlan(program, { daysPerWeek: days, startWithTest: false, seed: 1 });
    for (const week of weeks) {
      const last = week.rides[week.rides.length - 1]!;
      expect(last.slot === 'test', `week ${week.number}`).toBe(
        program.testWeeks.includes(week.number),
      );
    }
  });

  it.each(combos)('%s with %i days follows the 4-week block shape', (id, days) => {
    const program = getProgram(id)!;
    const weeks = generatePlan(program, { daysPerWeek: days, startWithTest: false, seed: 7 });
    const tss = weeks.map(plannedTss);
    for (const week of weeks) {
      if (week.kind !== 'recovery') continue;
      const before = tss[week.number - 2]!;
      expect(tss[week.number - 1]!, `week ${week.number}`).toBeLessThan(before);
    }
    // Weeks 2 and 3 climb from the intro week.
    expect(tss[1]!).toBeGreaterThan(tss[0]!);
    expect(tss[2]!).toBeGreaterThanOrEqual(tss[1]!);
  });

  it.each(combos)('%s with %i days lands near its weekly targets', (id, days) => {
    const program = getProgram(id)!;
    const weeks = generatePlan(program, { daysPerWeek: days, startWithTest: false, seed: 3 });
    for (const week of weeks) {
      const ratio = plannedTss(week) / week.targetTss;
      expect(
        ratio,
        `week ${week.number}: ${plannedTss(week)} vs ${week.targetTss}`,
      ).toBeGreaterThan(0.75);
      expect(ratio, `week ${week.number}: ${plannedTss(week)} vs ${week.targetTss}`).toBeLessThan(
        1.25,
      );
    }
  });

  it('is deterministic for a seed and varies between seeds', () => {
    const program = getProgram('balanced-12')!;
    const a = generatePlan(program, { daysPerWeek: 5, startWithTest: false, seed: 11 });
    const b = generatePlan(program, { daysPerWeek: 5, startWithTest: false, seed: 11 });
    const c = generatePlan(program, { daysPerWeek: 5, startWithTest: false, seed: 12 });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('rotates through workouts', () => {
    const program = getProgram('balanced-12')!;
    const weeks = generatePlan(program, { daysPerWeek: 5, startWithTest: false, seed: 5 });
    const powerRecipes = weeks
      .flatMap((w) => w.rides)
      .filter((r) => r.slot === 'power')
      .map((r) => getRide(r.rideId)!.recipe);
    expect(new Set(powerRecipes).size).toBeGreaterThanOrEqual(6);
    for (let i = 1; i < powerRecipes.length; i++) {
      expect(powerRecipes[i]).not.toBe(powerRecipes[i - 1]);
    }
  });

  it('keeps the comeback program free of max rides and starts it all-endurance', () => {
    const program = getProgram('comeback')!;
    for (const days of DAY_OPTIONS) {
      const weeks = generatePlan(program, { daysPerWeek: days, startWithTest: false, seed: 2 });
      const types = weeks.flatMap((w) => w.rides.map((r) => getRide(r.rideId)!.type));
      expect(types).not.toContain('max');
      const intro = weeks[0]!.rides.map((r) => getRide(r.rideId)!.type);
      expect(intro.every((t) => t === 'endurance' || t === 'recovery')).toBe(true);
    }
  });

  it('can start with an FTP test', () => {
    const program = getProgram('performance-12')!;
    const slots = weekSlots(program, 1, { daysPerWeek: 4, startWithTest: true, seed: 1 });
    expect(slots[0]).toBe('test');
  });

  it('makes the long ride the longest endurance ride of the week', () => {
    for (const program of PROGRAMS) {
      const weeks = generatePlan(program, { daysPerWeek: 5, startWithTest: false, seed: 9 });
      for (const week of weeks) {
        const long = week.rides.find((r) => r.slot === 'long');
        if (!long) continue;
        const others = week.rides.filter((r) => r.slot === 'endurance');
        for (const o of others) {
          expect(getRide(long.rideId)!.minutes).toBeGreaterThanOrEqual(getRide(o.rideId)!.minutes);
        }
      }
    }
  });
});
