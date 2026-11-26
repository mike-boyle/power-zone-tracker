import { describe, expect, it } from 'vitest';
import {
  ZONES,
  averageWattsFromKj,
  formatWattRange,
  ftpFromTwentyMinute,
  wattRange,
  zoneForWatts,
} from './zones';
import { estimateTss } from './tss';
import { parseIntervals } from './ride';

describe('watt ranges', () => {
  it('matches the standard zone percentages for FTP 200', () => {
    expect(ZONES.map((z) => formatWattRange(wattRange(200, z)))).toEqual([
      '0–110',
      '111–150',
      '151–180',
      '181–210',
      '211–240',
      '241–300',
      '301+',
    ]);
  });

  it('is contiguous for awkward FTPs', () => {
    for (const ftp of [97, 143, 188, 251, 333]) {
      for (const zone of ZONES.slice(1)) {
        const prev = wattRange(ftp, (zone - 1) as typeof zone);
        expect(wattRange(ftp, zone).low).toBe(prev.high! + 1);
      }
    }
  });

  it('maps watts back to zones', () => {
    expect(zoneForWatts(200, 110)).toBe(1);
    expect(zoneForWatts(200, 111)).toBe(2);
    expect(zoneForWatts(200, 210)).toBe(4);
    expect(zoneForWatts(200, 500)).toBe(7);
  });
});

describe('FTP helpers', () => {
  it('takes 95% of a 20 minute average', () => {
    expect(ftpFromTwentyMinute(220)).toBe(209);
  });

  it('derives average watts from kJ', () => {
    // 240 kJ over 20 minutes is 200 W.
    expect(averageWattsFromKj(100, 340, 1200)).toBe(200);
  });
});

describe('TSS', () => {
  it('scores one hour at FTP as 100', () => {
    // Zone 4 intensity is 0.98 of FTP: 0.98² × 100 ≈ 96.
    expect(estimateTss(parseIntervals('4@60'))).toBeCloseTo(96.04, 1);
  });

  it('weights hard efforts more than their average', () => {
    const steady = estimateTss(parseIntervals('3@20'));
    const surgy = estimateTss(parseIntervals('10x[1@1 5@1]'));
    // The surges average 0.815 of FTP, below steady Zone 3 (0.83), but variable
    // power raises normalized power, so they score higher.
    expect(surgy).toBeGreaterThan(steady);
  });

  it('can score part of a ride', () => {
    const segments = parseIntervals('2@30 2@30');
    expect(estimateTss(segments, 1800)).toBeCloseTo(estimateTss(segments) / 2, 1);
  });

  it('handles very short spans', () => {
    expect(estimateTss(parseIntervals('3@0:10'))).toBeGreaterThan(0);
    expect(estimateTss([], 0)).toBe(0);
  });
});
