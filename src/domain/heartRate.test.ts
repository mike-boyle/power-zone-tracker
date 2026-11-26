import { describe, expect, it } from 'vitest';
import { parseHeartRateMeasurement, summarizeHeartRate } from './heartRate';

function view(...bytes: number[]): DataView {
  return new DataView(new Uint8Array(bytes).buffer);
}

describe('parseHeartRateMeasurement', () => {
  it('reads an 8-bit heart rate with no extras', () => {
    expect(parseHeartRateMeasurement(view(0x00, 72))).toEqual({ bpm: 72, contact: null, rr: [] });
  });

  it('reads a 16-bit heart rate', () => {
    // 0x012C = 300, little endian.
    expect(parseHeartRateMeasurement(view(0x01, 0x2c, 0x01)).bpm).toBe(300);
  });

  it('reports sensor contact when supported', () => {
    expect(parseHeartRateMeasurement(view(0x06, 140)).contact).toBe(true);
    expect(parseHeartRateMeasurement(view(0x04, 0)).contact).toBe(false);
  });

  it('skips energy expended and reads RR intervals', () => {
    // flags: contact ok + energy + RR; bpm 150; energy 0x0010; RR 1024 (1000 ms) and 512 (500 ms)
    const m = parseHeartRateMeasurement(view(0x1e, 150, 0x10, 0x00, 0x00, 0x04, 0x00, 0x02));
    expect(m).toEqual({ bpm: 150, contact: true, rr: [1000, 500] });
  });
});

describe('summarizeHeartRate', () => {
  it('averages readings and ignores gaps', () => {
    expect(summarizeHeartRate([120, null, 140, undefined, 0, 160])).toEqual({ avg: 140, max: 160 });
  });

  it('returns null with no readings', () => {
    expect(summarizeHeartRate([])).toBeNull();
    expect(summarizeHeartRate([null, null])).toBeNull();
  });
});
