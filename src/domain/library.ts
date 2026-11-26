import { mergeAdjacent, parseIntervals, type Ride, type RideType, type Segment } from './ride';
import { estimateTss } from './tss';

/**
 * The ride library. Every ride is a warm-up, a main set and a cool-down, written
 * in the notation documented on `parseIntervals`. The structures are original,
 * modelled on the shapes common in power zone classes (zone builds, ladders,
 * pyramids, over-unders, steady tempo blocks).
 *
 * Ride ids are `<recipe>-<minutes>` and are stored in saved plans, so a recipe id
 * or a length that has shipped must keep existing.
 */

type Minutes = 20 | 30 | 45 | 60 | 75 | 90;

interface Recipe {
  id: string;
  name: string;
  type: Exclude<RideType, 'recovery' | 'test'>;
  description: string;
  /** Main set per ride length. Must exactly fill the time between warm-up and cool-down. */
  mains: Partial<Record<Minutes, string>>;
}

// ── Warm-ups and cool-downs ────────────────────────────────────────────────

const WARMUPS: Record<'easy' | 'standard' | 'max', Record<number, string>> = {
  easy: {
    5: "1@2'Easy spin' 2@2 3@1'Open up'",
    8: "1@3'Easy spin' 2@3 3@1'Open up' 2@1",
    10: "1@4'Easy spin' 2@3 3@2'Open up' 2@1",
  },
  standard: {
    5: "1@2'Easy spin' 2@1 3@0:45 4@0:30 5@0:15'Spin-up' 1@0:30",
    8: "1@3'Easy spin' 2@1 3@1 4@0:40 5@0:20'Spin-up' 1@1 5@0:20'Spin-up' 1@0:40",
    10: "1@4'Easy spin' 2@1 3@1 4@1 3x[5@0:20'Spin-up' 1@0:40]",
  },
  max: {
    5: "1@2'Easy spin' 2@1 3@0:30 4@0:30 5@0:20 6@0:10'Opener' 1@0:30",
    8: "1@3'Easy spin' 2@1 3@1 4@0:40 5@0:20 1@1 6@0:15'Opener' 1@0:45",
    10: "1@3'Easy spin' 2@2 3@1 4@1 5@0:30 1@0:30 2x[6@0:15'Opener' 1@0:45]",
  },
};

const COOLDOWNS: Record<number, string> = {
  3: "2@1 1@2'Easy spin'",
  5: "2@1 1@4'Easy spin'",
};

/** Warm-up and cool-down minutes for a ride of a given type and length. */
export function phaseMinutes(
  type: Recipe['type'],
  minutes: Minutes,
): { warmup: number; cooldown: number } {
  if (type === 'max') {
    if (minutes <= 20) return { warmup: 5, cooldown: 3 };
    if (minutes <= 30) return { warmup: 8, cooldown: 3 };
    return { warmup: 10, cooldown: 5 };
  }
  if (minutes <= 30) return { warmup: 5, cooldown: 3 };
  if (minutes <= 45) return { warmup: 8, cooldown: 5 };
  return { warmup: 10, cooldown: 5 };
}

// ── Recipes ────────────────────────────────────────────────────────────────

const RECIPES: Recipe[] = [
  // Endurance: Zone 2 and Zone 3 only.
  {
    id: 'tempo-blocks',
    name: 'Tempo Blocks',
    type: 'endurance',
    description: 'Alternate Zone 2 and Zone 3 blocks to build aerobic durability.',
    mains: {
      20: "2@2 3@4'Steady' 2@2 3@4",
      30: "2@3 3@5'Steady' 2@3 3@5 2@3 3@3",
      45: "2@4 3@6'Steady' 2@3 3@6 2@3 3@6 2@4",
      60: "2@5 3@8'Steady' 2@4 3@8 2@4 3@8 2@4 3@4",
      75: "2@5 3@10'Steady' 2@5 3@10 2@5 3@10 2@5 3@5 2@5",
      90: "2@5 3@12'Steady' 2@5 3@12 2@5 3@12 2@5 3@12 2@7",
    },
  },
  {
    id: 'long-tempo',
    name: 'Long Tempo',
    type: 'endurance',
    description: 'Fewer, longer Zone 3 efforts. Settle in and hold it steady.',
    mains: {
      30: "2@4 3@10'Settle in' 2@3 3@5",
      45: "2@4 3@12'Settle in' 2@4 3@8 2@4",
      60: "2@5 3@20'Settle in' 2@5 3@10 2@5",
      75: "2@5 3@20'Settle in' 2@5 3@20 2@5 3@5",
      90: "2@5 3@25'Settle in' 2@5 3@20 2@5 3@10 2@5",
    },
  },
  {
    id: 'endurance-pyramid',
    name: 'Endurance Pyramid',
    type: 'endurance',
    description: 'Zone 3 efforts grow, peak, then shrink, with Zone 2 in between.',
    mains: {
      30: '2@2 3@2 2@2 3@4 2@2 3@6 2@2 3@2',
      45: '2@2 3@2 2@2 3@4 2@2 3@6 2@2 3@4 2@2 3@2 2@4',
      60: '2@3 3@3 2@3 3@5 2@3 3@7 2@3 3@5 2@3 3@3 2@4 3@3',
      75: '2@3 3@4 2@3 3@6 2@3 3@8 2@3 3@10 2@3 3@8 2@3 3@6',
      90: '2@3 3@4 2@3 3@6 2@3 3@8 2@3 3@10 2@3 3@10 2@3 3@8 2@3 3@6 2@2',
    },
  },
  {
    id: 'z2-cruise',
    name: 'Zone 2 Cruise',
    type: 'endurance',
    description:
      'Mostly Zone 2 with short Zone 3 lifts. You should be able to hold a conversation.',
    mains: {
      20: "2@4'Conversational' 3@1 2@3 3@1 2@3",
      30: "2@6'Conversational' 3@1 2@4 3@1 2@4 3@1 2@5",
      45: "2@8'Conversational' 3@2 2@6 3@2 2@6 3@2 2@6",
      60: "2@10'Conversational' 3@2 2@8 3@2 2@8 3@2 2@8 3@2 2@3",
      75: "2@10'Conversational' 3@3 2@8 3@3 2@8 3@3 2@8 3@3 2@8 3@3 2@3",
      90: "2@12'Conversational' 3@3 2@10 3@3 2@10 3@3 2@10 3@3 2@10 3@3 2@8",
    },
  },
  {
    id: 'rolling-hills',
    name: 'Rolling Hills',
    type: 'endurance',
    description: 'Regular Zone 2 to Zone 3 changes, like riding rolling terrain.',
    mains: {
      30: "4x[2@3 3@2'Climb'] 2@2",
      45: "6x[2@3 3@2'Climb'] 2@2",
      60: "7x[2@3 3@3'Climb'] 2@3",
      75: "8x[2@4 3@3'Climb'] 2@4",
      90: "10x[2@4 3@3'Climb'] 2@5",
    },
  },

  // Power Zone: Zone 3 to Zone 5 intervals.
  {
    id: 'three-four-five',
    name: 'Three-Four-Five',
    type: 'power',
    description: 'Sets that build from Zone 3 through Zone 5, with Zone 1 recovery between.',
    mains: {
      20: '2x[3@2 4@2 5@1 1@1]',
      30: '3x[3@2 4@2 5@1 1@2] 2@1',
      45: '4x[3@3 4@2 5@1 1@2]',
      60: '4x[3@4 4@3 5@1 1@2] 3@5',
      75: '5x[3@4 4@3 5@1 1@2] 2@4 3@6',
    },
  },
  {
    id: 'threshold-builders',
    name: 'Threshold Builders',
    type: 'power',
    description: 'Sustained Zone 4 efforts, the classic way to raise your FTP.',
    mains: {
      20: '3@2 1@1 4@3 1@2 4@3 2@1',
      30: '3@3 1@1 4@4 1@2 4@4 1@2 4@4 2@2',
      45: '3@3 1@1 3x[4@6 1@2] 3@4',
      60: '3@4 1@1 4x[4@7 2@2] 3@4',
    },
  },
  {
    id: 'over-unders',
    name: 'Over-Unders',
    type: 'power',
    description: 'Zone 4 with Zone 5 surges. Practise recovering while still working.',
    mains: {
      30: "3@3 1@1 3x[4@1:30 5@0:30'Surge' 4@1:30 5@0:30'Surge' 1@2]",
      45: "3@1 1@1 4x[4@1:30 5@0:30'Surge' 4@1:30 5@0:30'Surge' 4@1:30 5@0:30'Surge' 1@1:30]",
      60: "3@4 1@1 5x[4@1:30 5@0:30'Surge' 4@1:30 5@0:30'Surge' 4@1:30 5@0:30'Surge' 1@2]",
    },
  },
  {
    id: 'tempo-threshold',
    name: 'Tempo to Threshold',
    type: 'power',
    description: 'Zone 3 into steadily longer Zone 4 efforts. A friendly way into Power Zone work.',
    mains: {
      20: '3@3 4@1 1@1 3@3 4@2 2@2',
      30: '3@4 4@1 2@2 3@4 4@2 2@2 3@4 4@3',
      45: '3@4 4@2 2@2 3@4 4@3 2@2 3@4 4@4 2@2 3@3 4@2',
      60: '3@5 4@2 2@2 3@5 4@3 2@2 3@5 4@4 2@2 3@5 4@5 2@2 3@3',
    },
  },
  {
    id: 'z5-repeats',
    name: 'VO2 Repeats',
    type: 'power',
    description: 'Zone 5 intervals after a threshold primer.',
    mains: {
      30: '3@3 4@2 1@2 5x[5@1 1@2]',
      45: '3@4 4@3 1@2 6x[5@1:30 1@2] 2@2',
      60: '3@6 4@6 1@2 5x[5@2 1@2] 3@5 2@6',
    },
  },
  {
    id: 'long-climb',
    name: 'The Long Climb',
    type: 'power',
    description: 'Long Zone 3 and Zone 4 climbs. Add resistance, stay seated, stay smooth.',
    mains: {
      30: "3@6 1@2 4@8'Climb' 1@2 3@4",
      45: "3@8 1@2 4@10'Climb' 1@2 3@5 4@5",
      60: "3@8 1@2 4@12'Climb' 1@3 3@8 4@8 1@2 3@2",
    },
  },
  {
    id: 'pz-pyramid',
    name: 'Zone Pyramid',
    type: 'power',
    description: 'Up from Zone 3 to Zone 5 and back down again.',
    mains: {
      30: '3@3 4@2 5@1 4@2 3@3 1@2 3@2 4@2 5@1 4@2 3@2',
      45: '2x[3@3 4@3 5@1 4@2 3@2 1@2] 3@2 4@2 5@1 4@1',
      60: '3x[3@3 4@3 5@1 4@2 3@3 1@2] 3@3',
    },
  },

  // Max: Zone 5 to Zone 7, short and sharp.
  {
    id: 'max-ladders',
    name: 'Max Ladders',
    type: 'max',
    description: 'Quick builds from Zone 3 all the way to a Zone 7 sprint, then full recovery.',
    mains: {
      20: "2x[3@1 4@0:45 5@0:30 6@0:20 7@0:15'Sprint' 1@3:10]",
      30: "3x[3@1 4@0:45 5@0:30 6@0:20 7@0:15'Sprint' 1@3:10] 2@1",
      45: "5x[3@1 4@0:45 5@0:30 6@0:20 7@0:15'Sprint' 1@3:10]",
    },
  },
  {
    id: 'z6-bursts',
    name: 'Anaerobic Bursts',
    type: 'max',
    description: '30 seconds hard, 30 seconds easy, in sets.',
    mains: {
      20: '2x[5x[6@0:30 1@0:30] 1@1]',
      30: '3x[5x[6@0:30 1@0:30] 1@1:20]',
      45: '4x[6x[6@0:30 1@0:30] 1@1:30]',
    },
  },
  {
    id: 'vo2-max',
    name: 'VO2 Max Intervals',
    type: 'max',
    description: 'Longer Zone 5 efforts. Find the edge and hold it.',
    mains: {
      20: '3x[5@2 1@2]',
      30: '5@2 1@2 5@3 1@3 5@3 1@3 5@2 1@1',
      45: '4@2 1@2 5x[5@3 1@2] 1@1',
    },
  },
  {
    id: 'sprint-mix',
    name: 'Sprint Mix',
    type: 'max',
    description: 'Short Zone 7 sprints mixed with Zone 6 efforts.',
    mains: {
      20: "4@2 1@1 3x[7@0:15'Sprint' 1@1:45] 6@1 1@2",
      30: "4@2 1@1 6x[7@0:15'Sprint' 1@1:45] 5@2 1@2",
      45: "4@3 1@1 4x[6@1 1@2] 8x[7@0:15'Sprint' 1@1:15] 5@1 1@1",
    },
  },
  {
    id: 'threshold-max',
    name: 'Threshold Kickers',
    type: 'max',
    description: 'Zone 4 efforts that finish with a Zone 6 kick.',
    mains: {
      30: "2x[4@4 6@0:30'Kick' 1@3] 5@2 1@2",
      45: "3x[4@4 6@0:30'Kick' 1@3] 5@2 1@2 4@2 6@0:30'Kick' 1@1",
    },
  },
];

// ── Assembly ───────────────────────────────────────────────────────────────

function buildRide(recipe: Recipe, minutes: Minutes, main: string): Ride {
  const { warmup, cooldown } = phaseMinutes(recipe.type, minutes);
  const style = recipe.type === 'endurance' ? 'easy' : recipe.type === 'max' ? 'max' : 'standard';
  const segments: Segment[] = mergeAdjacent([
    ...parseIntervals(WARMUPS[style][warmup]!, 'warmup'),
    ...parseIntervals(main, 'main'),
    ...parseIntervals(COOLDOWNS[cooldown]!, 'cooldown'),
  ]);
  return finish({
    id: `${recipe.id}-${minutes}`,
    recipe: recipe.id,
    name: recipe.name,
    type: recipe.type,
    minutes,
    description: recipe.description,
    segments,
  });
}

function finish(ride: Omit<Ride, 'tss'>): Ride {
  return { ...ride, tss: Math.round(estimateTss(ride.segments)) };
}

const RECOVERY_RIDES: Ride[] = [
  finish({
    id: 'recovery-spin-20',
    recipe: 'recovery-spin',
    name: 'Recovery Spin',
    type: 'recovery',
    minutes: 20,
    description: 'Zone 1 with a little easy Zone 2. Loosen the legs and keep it light.',
    segments: parseIntervals("1@4'Easy spin' 2@3 1@3 2@3 1@3 2@2 1@2"),
  }),
  finish({
    id: 'recovery-spin-30',
    recipe: 'recovery-spin',
    name: 'Recovery Spin',
    type: 'recovery',
    minutes: 30,
    description: 'Zone 1 with a little easy Zone 2. Loosen the legs and keep it light.',
    segments: parseIntervals("1@5'Easy spin' 2@4 1@3 2@5 1@3 2@5 1@5"),
  }),
];

export const FTP_TEST_RIDE_ID = 'ftp-test-35';
export const FTP_TEST_SECONDS = 20 * 60;

const TEST_RIDE: Ride = finish({
  id: FTP_TEST_RIDE_ID,
  recipe: 'ftp-test',
  name: '20-Minute FTP Test',
  type: 'test',
  minutes: 35,
  description:
    'A 10-minute warm-up, then your best steady 20 minutes. Your new FTP is 95% of your average output for the 20 minutes.',
  segments: [
    ...parseIntervals("1@4'Easy spin' 2@2 3@1:30 4@1 5@0:30'Opener' 1@1", 'warmup'),
    {
      zone: 4,
      seconds: FTP_TEST_SECONDS,
      phase: 'main',
      test: true,
      label: 'Best steady 20 minutes',
    },
    ...parseIntervals(COOLDOWNS[5]!, 'cooldown'),
  ],
});

export const RIDES: readonly Ride[] = [
  ...RECIPES.flatMap((recipe) =>
    (Object.entries(recipe.mains) as [string, string][]).map(([minutes, main]) =>
      buildRide(recipe, Number(minutes) as Minutes, main),
    ),
  ),
  ...RECOVERY_RIDES,
  TEST_RIDE,
];

const BY_ID = new Map(RIDES.map((ride) => [ride.id, ride]));

export function getRide(id: string): Ride | undefined {
  return BY_ID.get(id);
}

export function ridesOfType(type: RideType): Ride[] {
  return RIDES.filter((ride) => ride.type === type);
}

/** Exposed for tests: the declared main-set strings, to check they fill their slot exactly. */
export const RECIPE_MAINS = RECIPES.map((r) => ({ id: r.id, type: r.type, mains: r.mains }));
