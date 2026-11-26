import type { RideType } from './ride';

/**
 * How a ride felt, rated after finishing it. Without live power data this is
 * the main signal that the FTP (and so every zone target) is set right.
 */
export type Feel = 'easy' | 'right' | 'hard' | 'tooHard';

export const FEEL_OPTIONS: readonly { value: Feel; label: string; hint: string }[] = [
  { value: 'easy', label: 'Easy', hint: 'Could have pushed harder' },
  { value: 'right', label: 'Just right', hint: 'Hard where it should be' },
  { value: 'hard', label: 'Hard', hint: 'Tough, but I held the targets' },
  { value: 'tooHard', label: 'Too hard', hint: "Couldn't hold the targets" },
];

export const FEEL_LABEL: Record<Feel, string> = {
  easy: 'Easy',
  right: 'Just right',
  hard: 'Hard',
  tooHard: 'Too hard',
};

/** The parts of a ride record the suggestion looks at. */
export interface RatedRide {
  id: string;
  rideId: string;
  ftp: number | null;
  feel?: Feel | undefined;
}

export interface FtpSuggestion {
  direction: 'up' | 'down';
  from: number;
  to: number;
  reason: string;
  /** Identifies this suggestion, so dismissing it doesn't hide later ones. */
  key: string;
}

/** How many recent rated rides the suggestion considers. */
const WINDOW = 3;
const RAISE = 0.03;
const LOWER = 0.04;

/**
 * Suggest an FTP change from recent ride ratings at the current FTP.
 *
 * - Raise 3% when the last 3 rated rides all felt easy and at least one was a
 *   Power Zone or Max ride (an easy endurance ride alone proves little).
 * - Lower 4% when 2 of the last 3 rated rides felt too hard.
 *
 * Recovery rides and FTP tests don't count, and nor do rides done at a
 * different FTP: changing FTP starts the count again.
 */
export function suggestFtpChange(
  records: readonly RatedRide[],
  ftp: number | null,
  typeOf: (rideId: string) => RideType | undefined,
): FtpSuggestion | null {
  if (ftp === null) return null;
  const relevant = records.filter((r) => {
    const type = typeOf(r.rideId);
    return r.feel && r.ftp === ftp && type !== undefined && type !== 'recovery' && type !== 'test';
  });
  const recent = relevant.slice(-WINDOW);
  const last = recent[recent.length - 1];
  if (!last) return null;

  const tooHard = recent.filter((r) => r.feel === 'tooHard').length;
  if (tooHard >= 2) {
    const to = Math.round(ftp * (1 - LOWER));
    return {
      direction: 'down',
      from: ftp,
      to,
      reason: `${tooHard} of your last ${recent.length} rides felt too hard.`,
      key: `down:${ftp}:${last.id}`,
    };
  }

  const allEasy = recent.length === WINDOW && recent.every((r) => r.feel === 'easy');
  const hadIntensity = recent.some((r) => {
    const type = typeOf(r.rideId);
    return type === 'power' || type === 'max';
  });
  if (allEasy && hadIntensity) {
    const to = Math.round(ftp * (1 + RAISE));
    return {
      direction: 'up',
      from: ftp,
      to,
      reason: `Your last ${WINDOW} rides felt easy, including hard intervals.`,
      key: `up:${ftp}:${last.id}`,
    };
  }
  return null;
}
