import { RIDES } from './library';
import type { Ride } from './ride';

export type SwapMode = 'similar' | 'shorter' | 'any';

/** How close in TSS a ride must be to count as "similar effort". */
function similarTolerance(tss: number): number {
  return Math.max(8, tss * 0.2);
}

/**
 * Alternatives for a planned ride:
 * - similar: same type, about the same training stress, any length
 * - shorter: same type, shorter, longest first (the closest to the original effort)
 * - any:     any ride type except the FTP test, closest training stress first
 */
export function swapOptions(current: Ride, mode: SwapMode): Ride[] {
  const others = RIDES.filter((r) => r.id !== current.id && r.type !== 'test');
  const byCloseness = (a: Ride, b: Ride) =>
    Math.abs(a.tss - current.tss) - Math.abs(b.tss - current.tss) || a.minutes - b.minutes;

  switch (mode) {
    case 'similar':
      return others
        .filter(
          (r) =>
            r.type === current.type &&
            Math.abs(r.tss - current.tss) <= similarTolerance(current.tss),
        )
        .sort(byCloseness);
    case 'shorter':
      return others
        .filter((r) => r.type === current.type && r.minutes < current.minutes)
        .sort((a, b) => b.minutes - a.minutes || b.tss - a.tss);
    case 'any':
      return others.sort(byCloseness);
  }
}

/** FTP tests aren't swapped: turn them off for a program instead. */
export function canSwap(ride: Ride): boolean {
  return ride.type !== 'test';
}
