import { describe, expect, it } from 'vitest';
import { RIDES, getRide, FTP_TEST_RIDE_ID } from './library';
import { totalSeconds } from './ride';

describe('ride library', () => {
  it('has unique ids', () => {
    const ids = RIDES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(RIDES.map((r) => [r.id, r] as const))('%s fills exactly its length', (_id, ride) => {
    expect(totalSeconds(ride.segments)).toBe(ride.minutes * 60);
  });

  it.each(RIDES.map((r) => [r.id, r] as const))('%s has no zero-length segments', (_id, ride) => {
    for (const s of ride.segments) expect(s.seconds).toBeGreaterThan(0);
  });

  it('keeps endurance rides in Zone 3 or below outside warm-up spin-ups', () => {
    for (const ride of RIDES.filter((r) => r.type === 'endurance')) {
      const main = ride.segments.filter((s) => s.phase === 'main');
      expect(Math.max(...main.map((s) => s.zone)), ride.id).toBeLessThanOrEqual(3);
    }
  });

  it('keeps recovery rides in Zone 2 or below', () => {
    for (const ride of RIDES.filter((r) => r.type === 'recovery')) {
      expect(Math.max(...ride.segments.map((s) => s.zone)), ride.id).toBeLessThanOrEqual(2);
    }
  });

  it('puts every max ride into Zone 5 or above', () => {
    for (const ride of RIDES.filter((r) => r.type === 'max')) {
      expect(Math.max(...ride.segments.map((s) => s.zone)), ride.id).toBeGreaterThanOrEqual(5);
    }
  });

  it('scores longer rides of a recipe higher', () => {
    const byRecipe = new Map<string, number[]>();
    for (const ride of RIDES) {
      const list = byRecipe.get(ride.recipe) ?? [];
      list.push(ride.tss);
      byRecipe.set(ride.recipe, list);
    }
    for (const [recipe, list] of byRecipe) {
      expect(
        [...list].sort((a, b) => a - b),
        recipe,
      ).toEqual(list);
    }
  });

  it('lands TSS in the range typical for each class type and length', () => {
    // Loose bands around typical class scores, so a typo in a main set that
    // makes a ride far too easy or too hard is caught.
    const bands: Record<string, [number, number]> = {
      'endurance-20': [12, 24],
      'endurance-30': [20, 34],
      'endurance-45': [32, 50],
      'endurance-60': [44, 66],
      'endurance-75': [56, 84],
      'endurance-90': [68, 100],
      'power-20': [16, 30],
      'power-30': [26, 46],
      'power-45': [40, 66],
      'power-60': [54, 86],
      'power-75': [68, 100],
      'max-20': [16, 36],
      'max-30': [26, 50],
      'max-45': [40, 72],
      'recovery-20': [6, 16],
      'recovery-30': [10, 24],
      'test-35': [30, 50],
    };
    for (const ride of RIDES) {
      const band = bands[`${ride.type}-${ride.minutes}`];
      expect(band, `${ride.id} has no band`).toBeDefined();
      expect(ride.tss, ride.id).toBeGreaterThanOrEqual(band![0]);
      expect(ride.tss, ride.id).toBeLessThanOrEqual(band![1]);
    }
  });

  it('has an FTP test with a 20 minute test segment', () => {
    const test = getRide(FTP_TEST_RIDE_ID)!;
    const effort = test.segments.filter((s) => s.test);
    expect(effort).toHaveLength(1);
    expect(effort[0]!.seconds).toBe(1200);
  });
});
