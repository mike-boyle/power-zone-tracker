import type { Segment } from './ride';
import { ZONE_INFO } from './zones';

/** Intensity (fraction of FTP) assumed for the all-out part of an FTP test. */
export const TEST_INTENSITY = 1.02;

export function segmentIntensity(segment: Segment): number {
  return segment.test ? TEST_INTENSITY : ZONE_INFO[segment.zone].intensity;
}

/**
 * Estimated Training Stress Score, computed the standard way from a
 * second-by-second power trace:
 *
 *   NP  = 4th root of the mean of (30 s rolling average)^4
 *   IF  = NP / FTP
 *   TSS = hours × IF² × 100
 *
 * Power is expressed as a fraction of FTP, so FTP itself drops out. Pass
 * `upToSeconds` to score only the part of the ride that has been ridden.
 */
export function estimateTss(segments: readonly Segment[], upToSeconds?: number): number {
  const trace: number[] = [];
  for (const s of segments) {
    const intensity = segmentIntensity(s);
    for (let i = 0; i < s.seconds; i++) trace.push(intensity);
  }
  const length = upToSeconds === undefined ? trace.length : Math.min(trace.length, upToSeconds);
  if (length <= 0) return 0;

  const window = 30;
  let rolling = 0;
  let sumFourth = 0;
  let count = 0;
  for (let i = 0; i < length; i++) {
    rolling += trace[i]!;
    if (i >= window) rolling -= trace[i - window]!;
    if (i >= window - 1) {
      const avg = rolling / window;
      sumFourth += avg ** 4;
      count++;
    }
  }
  if (count === 0) {
    // Shorter than the rolling window: fall back to the plain average.
    const avg = trace.slice(0, length).reduce((a, b) => a + b, 0) / length;
    return (length / 3600) * avg * avg * 100;
  }
  const np = (sumFourth / count) ** 0.25;
  return (length / 3600) * np * np * 100;
}

/** Intensity factor (NP / FTP) for a ride. */
export function intensityFactor(segments: readonly Segment[]): number {
  const seconds = segments.reduce((sum, s) => sum + s.seconds, 0);
  if (seconds === 0) return 0;
  return Math.sqrt(estimateTss(segments) / ((seconds / 3600) * 100));
}
