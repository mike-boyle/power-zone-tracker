import type { TimedSegment } from '../domain/ride';
import type { ActiveRide } from './types';

/**
 * Ride time is derived from wall-clock timestamps rather than counted ticks,
 * so it stays correct when the phone sleeps, the tab is backgrounded, or the
 * page reloads mid-ride.
 */
export function elapsedMs(ride: Pick<ActiveRide, 'accumulatedMs' | 'runningSince'>, now: number) {
  return (
    ride.accumulatedMs + (ride.runningSince === null ? 0 : Math.max(0, now - ride.runningSince))
  );
}

/** Index of the segment playing at `seconds` into the ride, clamped to the last one. */
export function segmentIndexAt(segments: readonly TimedSegment[], seconds: number): number {
  if (segments.length === 0) return -1;
  for (const s of segments) {
    if (seconds < s.end) return s.index;
  }
  return segments.length - 1;
}
