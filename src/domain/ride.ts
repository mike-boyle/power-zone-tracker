import type { Zone } from './zones';

export type RideType = 'endurance' | 'power' | 'max' | 'recovery' | 'test';

export type Phase = 'warmup' | 'main' | 'cooldown';

export interface Segment {
  zone: Zone;
  seconds: number;
  phase: Phase;
  /** Short coaching cue shown under the zone, e.g. "Spin-up" or "Add resistance". */
  label?: string;
  /** The all-out portion of an FTP test. The player shows pacing guidance instead of a zone. */
  test?: boolean;
}

export interface Ride {
  /** Stable id: `<recipe>-<minutes>`. Plans store these, so never rename one that has shipped. */
  id: string;
  recipe: string;
  name: string;
  type: RideType;
  minutes: number;
  description: string;
  segments: Segment[];
  /** Estimated training stress, assuming each interval is ridden mid-zone. */
  tss: number;
}

export const RIDE_TYPE_LABEL: Record<RideType, string> = {
  endurance: 'Endurance',
  power: 'Power Zone',
  max: 'Max',
  recovery: 'Recovery',
  test: 'FTP Test',
};

export const RIDE_TYPE_SHORT: Record<RideType, string> = {
  endurance: 'PZE',
  power: 'PZ',
  max: 'PZM',
  recovery: 'REC',
  test: 'FTP',
};

/**
 * Parse the compact interval notation used by the ride library.
 *
 *   `3@4`            Zone 3 for 4 minutes
 *   `5@1:30`         Zone 5 for 1 minute 30 seconds
 *   `6@0:20'Spin-up'` with a cue
 *   `4x[5@1 1@2]`    repeat the bracketed group 4 times (groups can nest)
 */
export function parseIntervals(source: string, phase: Phase = 'main'): Segment[] {
  const token = /\s*(?:(\d+)x\[|(\])|([1-7])@(\d+)(?::(\d{2}))?(?:'([^']*)')?)/y;
  const stack: { repeat: number; items: Segment[] }[] = [{ repeat: 1, items: [] }];
  let index = 0;

  while (index < source.length) {
    if (/^\s*$/.test(source.slice(index))) break;
    token.lastIndex = index;
    const match = token.exec(source);
    if (!match) {
      throw new Error(`Bad interval notation near "${source.slice(index, index + 12)}"`);
    }
    index = token.lastIndex;
    const [, repeat, close, zone, minutes, seconds, label] = match;

    if (repeat !== undefined) {
      stack.push({ repeat: Number(repeat), items: [] });
    } else if (close !== undefined) {
      const group = stack.pop();
      const parent = stack[stack.length - 1];
      if (!group || !parent) throw new Error('Unbalanced "]" in interval notation');
      for (let i = 0; i < group.repeat; i++) {
        parent.items.push(...group.items.map((s) => ({ ...s })));
      }
    } else {
      const total = Number(minutes) * 60 + Number(seconds ?? 0);
      const segment: Segment = { zone: Number(zone) as Zone, seconds: total, phase };
      if (label) segment.label = label;
      stack[stack.length - 1]!.items.push(segment);
    }
  }

  if (stack.length !== 1) throw new Error('Unclosed "[" in interval notation');
  return stack[0]!.items;
}

export function totalSeconds(segments: readonly Segment[]): number {
  return segments.reduce((sum, s) => sum + s.seconds, 0);
}

/** Merge back-to-back segments with the same zone, phase, cue and test flag. */
export function mergeAdjacent(segments: readonly Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const s of segments) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.zone === s.zone &&
      prev.phase === s.phase &&
      prev.label === s.label &&
      prev.test === s.test
    ) {
      prev.seconds += s.seconds;
    } else {
      out.push({ ...s });
    }
  }
  return out;
}

export interface TimedSegment extends Segment {
  index: number;
  start: number;
  end: number;
}

export function withTimes(segments: readonly Segment[]): TimedSegment[] {
  let start = 0;
  return segments.map((s, index) => {
    const timed = { ...s, index, start, end: start + s.seconds };
    start += s.seconds;
    return timed;
  });
}

/** Seconds spent in each zone, optionally limited to the main set. */
export function timeInZones(
  segments: readonly Segment[],
  options: { mainOnly?: boolean } = {},
): Record<Zone, number> {
  const out: Record<Zone, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  for (const s of segments) {
    if (options.mainOnly && s.phase !== 'main') continue;
    out[s.zone] += s.seconds;
  }
  return out;
}
