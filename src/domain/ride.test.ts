import { describe, expect, it } from 'vitest';
import { mergeAdjacent, parseIntervals, timeInZones, totalSeconds, withTimes } from './ride';

describe('parseIntervals', () => {
  it('parses zones, minutes and seconds', () => {
    expect(parseIntervals('3@4 5@1:30 7@0:15')).toEqual([
      { zone: 3, seconds: 240, phase: 'main' },
      { zone: 5, seconds: 90, phase: 'main' },
      { zone: 7, seconds: 15, phase: 'main' },
    ]);
  });

  it('parses cues', () => {
    expect(parseIntervals("5@0:20'Spin-up' 1@1", 'warmup')).toEqual([
      { zone: 5, seconds: 20, phase: 'warmup', label: 'Spin-up' },
      { zone: 1, seconds: 60, phase: 'warmup' },
    ]);
  });

  it('expands nested repeats', () => {
    const segments = parseIntervals('2x[3x[6@0:30 1@0:30] 1@1]');
    expect(segments).toHaveLength(14);
    expect(totalSeconds(segments)).toBe(2 * (3 * 60 + 60));
  });

  it('rejects bad notation', () => {
    expect(() => parseIntervals('3@4 banana')).toThrow();
    expect(() => parseIntervals('2x[3@1')).toThrow();
    expect(() => parseIntervals('3@1]')).toThrow();
    expect(() => parseIntervals('8@1')).toThrow();
  });
});

describe('segment helpers', () => {
  it('merges adjacent identical zones', () => {
    const merged = mergeAdjacent(parseIntervals('1@0:30 1@1 2@1 2@1:00'));
    expect(merged.map((s) => [s.zone, s.seconds])).toEqual([
      [1, 90],
      [2, 120],
    ]);
  });

  it('does not merge across cues or phases', () => {
    const merged = mergeAdjacent([
      ...parseIntervals("1@1 1@1'Easy'"),
      ...parseIntervals('1@1', 'cooldown'),
    ]);
    expect(merged).toHaveLength(3);
  });

  it('computes start and end times', () => {
    const timed = withTimes(parseIntervals('1@1 3@2'));
    expect(timed.map((s) => [s.start, s.end])).toEqual([
      [0, 60],
      [60, 180],
    ]);
  });

  it('totals time in zones', () => {
    const segments = [...parseIntervals('1@1', 'warmup'), ...parseIntervals('3@2 1@1')];
    expect(timeInZones(segments)[1]).toBe(120);
    expect(timeInZones(segments, { mainOnly: true })[1]).toBe(60);
    expect(timeInZones(segments)[3]).toBe(120);
  });
});
