import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TESTS,
  generatePlan,
  hasBetweenBlockTests,
  plannedTss,
  weekSlots,
  type PlanOptions,
  type TestOptions,
} from './plan';
import { DAY_OPTIONS, PROGRAMS, getProgram, type DaysPerWeek } from './programs';
import { getRide } from './library';

const combos = PROGRAMS.flatMap((program) =>
  DAY_OPTIONS.map((days) => [program.id, days] as const),
);

const NO_TESTS: TestOptions = { startWithTest: false, betweenBlockTests: false, finalTest: false };

/** Every combination of the three test switches. */
const TEST_CHOICES: TestOptions[] = [false, true].flatMap((startWithTest) =>
  [false, true].flatMap((betweenBlockTests) =>
    [false, true].map((finalTest) => ({ startWithTest, betweenBlockTests, finalTest })),
  ),
);

function opts(days: DaysPerWeek, seed: number, tests: TestOptions = DEFAULT_TESTS): PlanOptions {
  return { daysPerWeek: days, seed, ...tests };
}

describe('programs', () => {
  it.each(PROGRAMS.map((p) => [p.id, p] as const))('%s is internally consistent', (_id, p) => {
    expect(p.load).toHaveLength(p.weeks);
    expect(p.kinds).toHaveLength(p.weeks);
    for (const days of DAY_OPTIONS) expect(p.patterns[days]).toHaveLength(days);
    for (const [days, pattern] of Object.entries(p.peakPatterns ?? {})) {
      expect(pattern).toHaveLength(Number(days));
    }
    for (const w of p.testWeeks) {
      expect(w).toBeLessThanOrEqual(p.weeks);
      expect(p.kinds[w - 1], `test week ${w} should be a lighter week`).toBe('recovery');
    }
  });
});

describe('generatePlan', () => {
  it.each(combos)('%s with %i days builds every week', (id, days) => {
    const program = getProgram(id)!;
    const weeks = generatePlan(program, opts(days, 1));
    expect(weeks).toHaveLength(program.weeks);
    for (const week of weeks) {
      expect(week.rides).toHaveLength(days);
      for (const ride of week.rides) expect(getRide(ride.rideId), ride.rideId).toBeDefined();
    }
  });

  it.each(combos)('%s with %i days places tests exactly where chosen', (id, days) => {
    const program = getProgram(id)!;
    for (const tests of TEST_CHOICES) {
      const weeks = generatePlan(program, opts(days, 1, tests));
      for (const week of weeks) {
        const isFinal = week.number === program.weeks;
        const wanted =
          program.testWeeks.includes(week.number) &&
          (isFinal ? tests.finalTest : tests.betweenBlockTests);
        const label = `week ${week.number}, ${JSON.stringify(tests)}`;
        expect(week.hasTest, label).toBe(wanted);
        expect(week.rides[week.rides.length - 1]!.slot === 'test', label).toBe(wanted);

        const expectedCount = (wanted ? 1 : 0) + (week.number === 1 && tests.startWithTest ? 1 : 0);
        expect(
          week.rides.filter((r) => r.slot === 'test'),
          label,
        ).toHaveLength(expectedCount);
      }
    }
  });

  it.each(combos)('%s with %i days follows the 4-week block shape', (id, days) => {
    const program = getProgram(id)!;
    for (const tests of [DEFAULT_TESTS, NO_TESTS]) {
      const tss = generatePlan(program, opts(days, 7, tests)).map(plannedTss);
      program.kinds.forEach((kind, i) => {
        if (kind === 'recovery') expect(tss[i]!, `week ${i + 1}`).toBeLessThan(tss[i - 1]!);
      });
      // Weeks 2 and 3 climb from the intro week.
      expect(tss[1]!).toBeGreaterThan(tss[0]!);
      expect(tss[2]!).toBeGreaterThanOrEqual(tss[1]!);
    }
  });

  it.each(combos)('%s with %i days lands near its weekly targets', (id, days) => {
    const program = getProgram(id)!;
    for (const tests of [DEFAULT_TESTS, NO_TESTS]) {
      for (const week of generatePlan(program, opts(days, 3, tests))) {
        const ratio = plannedTss(week) / week.targetTss;
        const label = `week ${week.number}: ${plannedTss(week)} vs ${week.targetTss}`;
        expect(ratio, label).toBeGreaterThan(0.75);
        expect(ratio, label).toBeLessThan(1.25);
      }
    }
  });

  it('gives a lighter week without a test an easy ride instead', () => {
    const program = getProgram('balanced-12')!;
    const slots = weekSlots(program, 4, opts(5, 1, NO_TESTS));
    expect(slots).not.toContain('test');
    expect(slots).toContain('recovery');
    expect(slots).not.toContain('max');
  });

  it('knows which programs have tests between blocks', () => {
    expect(hasBetweenBlockTests(getProgram('comeback')!)).toBe(false);
    expect(hasBetweenBlockTests(getProgram('balanced-12')!)).toBe(true);
  });

  it('is deterministic for a seed and varies between seeds', () => {
    const program = getProgram('balanced-12')!;
    const a = generatePlan(program, opts(5, 11));
    const b = generatePlan(program, opts(5, 11));
    const c = generatePlan(program, opts(5, 12));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('rotates through workouts', () => {
    const program = getProgram('balanced-12')!;
    const powerRecipes = generatePlan(program, opts(5, 5))
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
      const weeks = generatePlan(program, opts(days, 2));
      const types = weeks.flatMap((w) => w.rides.map((r) => getRide(r.rideId)!.type));
      expect(types).not.toContain('max');
      const intro = weeks[0]!.rides.map((r) => getRide(r.rideId)!.type);
      expect(intro.every((t) => t === 'endurance' || t === 'recovery')).toBe(true);
    }
  });

  it('can start with an FTP test', () => {
    const program = getProgram('performance-12')!;
    const slots = weekSlots(program, 1, opts(4, 1, { ...NO_TESTS, startWithTest: true }));
    expect(slots[0]).toBe('test');
  });

  it('makes the long ride the longest endurance ride of the week', () => {
    for (const program of PROGRAMS) {
      for (const week of generatePlan(program, opts(5, 9))) {
        const long = week.rides.find((r) => r.slot === 'long');
        if (!long) continue;
        for (const o of week.rides.filter((r) => r.slot === 'endurance')) {
          expect(getRide(long.rideId)!.minutes).toBeGreaterThanOrEqual(getRide(o.rideId)!.minutes);
        }
      }
    }
  });
});
