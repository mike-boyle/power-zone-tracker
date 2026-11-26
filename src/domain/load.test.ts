import { describe, expect, it } from 'vitest';
import {
  addDays,
  dailyTss,
  dateKey,
  daysBetween,
  formStatus,
  projectRides,
  trainingLoad,
} from './load';

describe('dates', () => {
  it('adds days across month ends and daylight saving changes', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31);
  });

  it('keys rides by local day and sums them', () => {
    const late = new Date(2026, 10, 24, 23, 30).toISOString();
    const early = new Date(2026, 10, 24, 6, 0).toISOString();
    const next = new Date(2026, 10, 25, 7, 0).toISOString();
    const daily = dailyTss([
      { finishedAt: early, tss: 40 },
      { finishedAt: late, tss: 20 },
      { finishedAt: next, tss: 55 },
    ]);
    expect(daily.get('2026-11-24')).toBe(60);
    expect(daily.get('2026-11-25')).toBe(55);
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('trainingLoad', () => {
  it('converges on a steady daily load, with form near zero', () => {
    const daily = new Map<string, number>();
    for (let i = 0; i < 300; i++) daily.set(addDays('2026-01-01', i), 50);
    const days = trainingLoad(daily, '2026-01-01', addDays('2026-01-01', 299));
    const last = days[days.length - 1]!;
    expect(last.fitness).toBeCloseTo(50, 0);
    expect(last.fatigue).toBeCloseTo(50, 0);
    expect(Math.abs(last.form)).toBeLessThan(1);
  });

  it('raises fatigue faster than fitness, so form drops after a hard day', () => {
    const daily = new Map([['2026-06-01', 100]]);
    const [day0, day1] = trainingLoad(daily, '2026-06-01', '2026-06-02');
    expect(day0!.fatigue).toBeCloseTo(100 / 7, 5);
    expect(day0!.fitness).toBeCloseTo(100 / 42, 5);
    // Form going into the hard day is still 0; the next day it's negative.
    expect(day0!.form).toBe(0);
    expect(day1!.form).toBeLessThan(0);
  });

  it('counts history before the requested range', () => {
    const daily = new Map([['2026-05-01', 80]]);
    const [first] = trainingLoad(daily, '2026-05-10', '2026-05-10');
    expect(first!.date).toBe('2026-05-10');
    expect(first!.fitness).toBeGreaterThan(0);
  });

  it('marks days after today as projected', () => {
    const days = trainingLoad(new Map(), '2026-05-01', '2026-05-03', { today: '2026-05-02' });
    expect(days.map((d) => d.projected)).toEqual([false, false, true]);
  });
});

describe('projectRides', () => {
  it('spreads five rides a week over evenly spaced days', () => {
    const projected = projectRides([10, 20, 30, 40, 50, 60], 5, '2026-06-01');
    expect([...projected.keys()]).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-05',
      '2026-06-06',
      '2026-06-08',
    ]);
    expect(projected.get('2026-06-08')).toBe(60);
  });

  it('spreads three rides a week every other day', () => {
    expect([...projectRides([1, 1, 1], 3, '2026-06-01').keys()]).toEqual([
      '2026-06-01',
      '2026-06-03',
      '2026-06-05',
    ]);
  });
});

describe('formStatus', () => {
  it('reads common form bands', () => {
    expect(formStatus(12).tone).toBe('fresh');
    expect(formStatus(0).tone).toBe('neutral');
    expect(formStatus(-20).tone).toBe('building');
    expect(formStatus(-40).tone).toBe('strained');
  });
});
