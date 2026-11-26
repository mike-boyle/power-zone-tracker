import { describe, expect, it } from 'vitest';
import { swapOptions, canSwap } from './swap';
import { getRide, FTP_TEST_RIDE_ID } from './library';

const overUnders45 = getRide('over-unders-45')!;

describe('swapOptions', () => {
  it('finds similar rides of the same type, closest effort first', () => {
    const options = swapOptions(overUnders45, 'similar');
    expect(options.length).toBeGreaterThan(2);
    for (const r of options) {
      expect(r.type).toBe('power');
      expect(r.id).not.toBe(overUnders45.id);
      expect(Math.abs(r.tss - overUnders45.tss)).toBeLessThanOrEqual(12);
    }
    const gaps = options.map((r) => Math.abs(r.tss - overUnders45.tss));
    expect([...gaps].sort((a, b) => a - b)).toEqual(gaps);
  });

  it('finds shorter rides of the same type, longest first', () => {
    const options = swapOptions(overUnders45, 'shorter');
    expect(options.length).toBeGreaterThan(2);
    for (const r of options) {
      expect(r.type).toBe('power');
      expect(r.minutes).toBeLessThan(45);
    }
    expect(options[0]!.minutes).toBe(30);
  });

  it('offers every other ride type except the test', () => {
    const options = swapOptions(overUnders45, 'any');
    expect(new Set(options.map((r) => r.type))).toEqual(
      new Set(['endurance', 'power', 'max', 'recovery']),
    );
  });

  it('never offers the FTP test, and the test itself is not swappable', () => {
    for (const mode of ['similar', 'shorter', 'any'] as const) {
      expect(swapOptions(overUnders45, mode).map((r) => r.id)).not.toContain(FTP_TEST_RIDE_ID);
    }
    expect(canSwap(getRide(FTP_TEST_RIDE_ID)!)).toBe(false);
    expect(canSwap(overUnders45)).toBe(true);
  });
});
