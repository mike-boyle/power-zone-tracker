/**
 * Training programs. Each one is periodized in 4-week blocks (3 weeks of
 * building, 1 lighter week ending in an FTP test), the standard 3:1 loading
 * pattern. Weekly load is expressed as a target TSS; the plan generator picks
 * rides from the library to meet it.
 */

export type DaysPerWeek = 3 | 4 | 5 | 6;
export const DAY_OPTIONS: readonly DaysPerWeek[] = [3, 4, 5, 6];

/** What a planned ride slot asks for. `long` is an endurance ride weighted to be the week's longest. */
export type SlotKind = 'endurance' | 'long' | 'power' | 'max' | 'recovery' | 'test';

export type WeekKind = 'intro' | 'build' | 'peak' | 'recovery';

export interface Program {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Who it suits, shown as a hint when choosing. */
  goodFor: string;
  weeks: number;
  /** 1 (gentle) to 3 (hard), for the intensity meter. */
  intensity: 1 | 2 | 3;
  /** Target TSS for a 5-day week at load 1.0. */
  baseWeeklyTss: number;
  /** Load multiplier per week. */
  load: number[];
  kinds: WeekKind[];
  /** Weeks (1-based) whose final ride is an FTP test. */
  testWeeks: number[];
  /** The ride mix for a normal week, in the order the rides should be done. */
  patterns: Record<DaysPerWeek, SlotKind[]>;
  /** Replacement mix for peak weeks. */
  peakPatterns?: Partial<Record<DaysPerWeek, SlotKind[]>>;
  /** If true, the intro week is endurance and recovery only. */
  gentleIntro?: boolean;
}

const LOAD_8 = [0.7, 0.85, 1.0, 0.6, 0.9, 1.0, 1.1, 0.65];
const KINDS_8: WeekKind[] = [
  'intro',
  'build',
  'peak',
  'recovery',
  'build',
  'build',
  'peak',
  'recovery',
];
const LOAD_12 = [0.7, 0.85, 1.0, 0.6, 0.9, 1.0, 1.1, 0.65, 0.95, 1.05, 1.15, 0.65];
const KINDS_12: WeekKind[] = [...KINDS_8, 'build', 'build', 'peak', 'recovery'];

export const PROGRAMS: readonly Program[] = [
  {
    id: 'comeback',
    name: 'Comeback',
    tagline: 'Ease back in after time off',
    description:
      'Four gentle weeks. The first is all easy endurance, then one Power Zone ride a week joins in. No max efforts. It finishes with an FTP test so your next program starts from an accurate number.',
    goodFor: 'Returning after a long break',
    weeks: 4,
    intensity: 1,
    baseWeeklyTss: 160,
    load: [0.65, 0.8, 0.95, 0.75],
    kinds: ['intro', 'build', 'peak', 'recovery'],
    testWeeks: [4],
    gentleIntro: true,
    patterns: {
      3: ['endurance', 'power', 'long'],
      4: ['endurance', 'power', 'endurance', 'long'],
      5: ['endurance', 'power', 'recovery', 'endurance', 'long'],
      6: ['endurance', 'power', 'recovery', 'endurance', 'endurance', 'long'],
    },
  },
  {
    id: 'base-builder',
    name: 'Base Builder',
    tagline: 'Rebuild your aerobic base',
    description:
      'Eight weeks in two blocks, built mostly on endurance rides with one Power Zone ride a week (two in peak weeks for 5+ days). A good bridge between a comeback and a full 12-week program.',
    goodFor: 'Getting consistent again',
    weeks: 8,
    intensity: 2,
    baseWeeklyTss: 230,
    load: LOAD_8,
    kinds: KINDS_8,
    testWeeks: [4, 8],
    patterns: {
      3: ['endurance', 'power', 'long'],
      4: ['endurance', 'power', 'endurance', 'long'],
      5: ['endurance', 'power', 'endurance', 'endurance', 'long'],
      6: ['endurance', 'power', 'endurance', 'recovery', 'endurance', 'long'],
    },
    peakPatterns: {
      5: ['endurance', 'power', 'endurance', 'power', 'long'],
      6: ['endurance', 'power', 'endurance', 'recovery', 'power', 'long'],
    },
  },
  {
    id: 'endurance-12',
    name: 'Endurance 12',
    tagline: 'Big aerobic engine, fewer hard days',
    description:
      'Twelve weeks weighted toward endurance rides, with one Power Zone ride a week and a Max ride only in peak weeks. Long weekend rides grow block by block.',
    goodFor: 'Building stamina without lots of intensity',
    weeks: 12,
    intensity: 2,
    baseWeeklyTss: 290,
    load: LOAD_12,
    kinds: KINDS_12,
    testWeeks: [4, 8, 12],
    patterns: {
      3: ['endurance', 'power', 'long'],
      4: ['endurance', 'power', 'endurance', 'long'],
      5: ['endurance', 'power', 'endurance', 'endurance', 'long'],
      6: ['endurance', 'power', 'endurance', 'recovery', 'endurance', 'long'],
    },
    peakPatterns: {
      4: ['endurance', 'power', 'max', 'long'],
      5: ['endurance', 'power', 'endurance', 'max', 'long'],
      6: ['endurance', 'power', 'endurance', 'recovery', 'max', 'long'],
    },
  },
  {
    id: 'balanced-12',
    name: 'Balanced 12',
    tagline: 'A bit of everything',
    description:
      'Twelve weeks mixing Power Zone, Max and endurance rides each week. The classic all-round power zone progression.',
    goodFor: 'General fitness and a higher FTP',
    weeks: 12,
    intensity: 2,
    baseWeeklyTss: 300,
    load: LOAD_12,
    kinds: KINDS_12,
    testWeeks: [4, 8, 12],
    patterns: {
      3: ['power', 'endurance', 'long'],
      4: ['power', 'endurance', 'max', 'long'],
      5: ['power', 'endurance', 'max', 'endurance', 'long'],
      6: ['power', 'endurance', 'max', 'endurance', 'power', 'long'],
    },
    peakPatterns: {
      3: ['power', 'max', 'long'],
      5: ['power', 'endurance', 'max', 'power', 'long'],
    },
  },
  {
    id: 'performance-12',
    name: 'Performance 12',
    tagline: 'Serious training, highest load',
    description:
      'Twelve weeks with the most stress: two Power Zone rides and a Max ride most weeks, plus a long endurance ride. Best when you already ride regularly.',
    goodFor: 'Riders with a solid base who want results',
    weeks: 12,
    intensity: 3,
    baseWeeklyTss: 350,
    load: LOAD_12,
    kinds: KINDS_12,
    testWeeks: [4, 8, 12],
    patterns: {
      3: ['power', 'max', 'long'],
      4: ['power', 'endurance', 'max', 'long'],
      5: ['power', 'endurance', 'max', 'power', 'long'],
      6: ['power', 'endurance', 'max', 'power', 'endurance', 'long'],
    },
    peakPatterns: {
      4: ['power', 'max', 'power', 'long'],
      6: ['power', 'endurance', 'max', 'power', 'max', 'long'],
    },
  },
];

export function getProgram(id: string): Program | undefined {
  return PROGRAMS.find((p) => p.id === id);
}

/**
 * Weekly TSS scales with days, but less than linearly: with fewer days each
 * ride gets a little longer, with more days each gets a little shorter.
 */
export function daysFactor(days: DaysPerWeek): number {
  return (days / 5) * (1 + 0.08 * (5 - days));
}

export const WEEK_KIND_LABEL: Record<WeekKind, string> = {
  intro: 'Ease in',
  build: 'Build',
  peak: 'Peak',
  recovery: 'Recover',
};
