import { describe, expect, it } from 'vitest';
import { elapsedMs, segmentIndexAt } from './clock';
import { parseIntervals, withTimes } from '../domain/ride';

describe('elapsedMs', () => {
  it('counts banked time while paused', () => {
    expect(elapsedMs({ accumulatedMs: 5000, runningSince: null }, 99_999)).toBe(5000);
  });

  it('adds the running stretch', () => {
    expect(elapsedMs({ accumulatedMs: 5000, runningSince: 10_000 }, 12_500)).toBe(7500);
  });

  it('never goes backwards if the clock jumps back', () => {
    expect(elapsedMs({ accumulatedMs: 5000, runningSince: 10_000 }, 9_000)).toBe(5000);
  });
});

describe('segmentIndexAt', () => {
  const segments = withTimes(parseIntervals('1@1 3@2 5@1'));

  it('finds the segment for a time', () => {
    expect(segmentIndexAt(segments, 0)).toBe(0);
    expect(segmentIndexAt(segments, 59.9)).toBe(0);
    expect(segmentIndexAt(segments, 60)).toBe(1);
    expect(segmentIndexAt(segments, 200)).toBe(2);
  });

  it('clamps past the end', () => {
    expect(segmentIndexAt(segments, 10_000)).toBe(2);
    expect(segmentIndexAt([], 10)).toBe(-1);
  });
});
