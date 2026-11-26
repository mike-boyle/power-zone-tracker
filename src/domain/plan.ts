import { RIDES, getRide, FTP_TEST_RIDE_ID } from './library';
import type { Ride, RideType } from './ride';
import {
  daysFactor,
  type DaysPerWeek,
  type Program,
  type SlotKind,
  type WeekKind,
} from './programs';

export interface PlannedRide {
  slot: SlotKind;
  rideId: string;
}

export interface PlannedWeek {
  /** 1-based. */
  number: number;
  kind: WeekKind;
  hasTest: boolean;
  targetTss: number;
  rides: PlannedRide[];
}

export interface PlanOptions {
  daysPerWeek: DaysPerWeek;
  /** Make the first ride of week 1 an FTP test. */
  startWithTest: boolean;
  /** Varies ride choice between plans; the same seed always gives the same plan. */
  seed: number;
}

/** Relative share of the week's TSS each slot should take. */
const SLOT_WEIGHT: Record<Exclude<SlotKind, 'test'>, number> = {
  endurance: 1,
  long: 1.6,
  power: 1.15,
  max: 1.05,
  recovery: 0.4,
};

const SLOT_RIDE_TYPE: Record<SlotKind, RideType> = {
  endurance: 'endurance',
  long: 'endurance',
  power: 'power',
  max: 'max',
  recovery: 'recovery',
  test: 'test',
};

/** Small deterministic PRNG (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The slot mix for one week, after week-type adjustments. */
export function weekSlots(program: Program, weekNumber: number, options: PlanOptions): SlotKind[] {
  const kind = program.kinds[weekNumber - 1] ?? 'build';
  const days = options.daysPerWeek;
  let slots = [...((kind === 'peak' && program.peakPatterns?.[days]) || program.patterns[days])];

  if (kind === 'intro') {
    slots = slots.map((s) => {
      if (s === 'max') return 'power';
      if (program.gentleIntro && s === 'power') return 'endurance';
      return s;
    });
  }

  if (kind === 'recovery') {
    let keptPower = false;
    slots = slots.map((s) => {
      if (s === 'max' || s === 'long') return 'endurance';
      if (s === 'power') {
        if (keptPower) return 'endurance';
        keptPower = true;
      }
      return s;
    });
  }

  const hasTest = program.testWeeks.includes(weekNumber);
  if (hasTest) {
    slots[slots.length - 1] = 'test';
    // An easy ride right before the test, unless the week already has one.
    if (!slots.includes('recovery') && slots.length >= 3) slots[slots.length - 2] = 'recovery';
  } else if (kind === 'recovery' && days >= 4 && !slots.includes('recovery')) {
    const i = slots.indexOf('endurance');
    if (i >= 0) slots[i] = 'recovery';
  }

  if (weekNumber === 1 && options.startWithTest) slots[0] = 'test';
  return slots;
}

export function weekTarget(program: Program, weekNumber: number, days: DaysPerWeek): number {
  const load = program.load[weekNumber - 1] ?? 1;
  return Math.round(program.baseWeeklyTss * load * daysFactor(days));
}

/**
 * Build a full plan. Each week's target TSS is shared across its slots by
 * weight; each slot then takes the library ride closest to its share, rotating
 * through recipes so the same workout doesn't come up week after week.
 */
export function generatePlan(program: Program, options: PlanOptions): PlannedWeek[] {
  const random = seededRandom(options.seed);
  const testRide = getRide(FTP_TEST_RIDE_ID)!;
  /** Recipes picked so far for each ride type, most recent last. */
  const history = new Map<RideType, string[]>();

  const weeks: PlannedWeek[] = [];
  for (let number = 1; number <= program.weeks; number++) {
    const kind = program.kinds[number - 1] ?? 'build';
    const slots = weekSlots(program, number, options);
    const targetTss = weekTarget(program, number, options.daysPerWeek);

    const tests = slots.filter((s) => s === 'test').length;
    const budget = Math.max(0, targetTss - tests * testRide.tss);
    const weightSum = slots.reduce((sum, s) => sum + (s === 'test' ? 0 : SLOT_WEIGHT[s]), 0);

    const rides: PlannedRide[] = [];
    let previousEnduranceMinutes = 0;
    for (const slot of slots) {
      if (slot === 'test') {
        rides.push({ slot, rideId: FTP_TEST_RIDE_ID });
        continue;
      }
      const target = weightSum > 0 ? (budget * SLOT_WEIGHT[slot]) / weightSum : 0;
      const type = SLOT_RIDE_TYPE[slot];
      let candidates = RIDES.filter((r) => r.type === type);
      if (kind === 'recovery') {
        // Lighter weeks stay short even when few days concentrate the budget.
        candidates = candidates.filter((r) => r.minutes <= RECOVERY_WEEK_MAX_MINUTES);
      }
      if (slot === 'long') {
        // The long ride should never be shorter than the week's other endurance rides.
        const longer = candidates.filter((r) => r.minutes >= previousEnduranceMinutes);
        if (longer.length) candidates = longer;
      }
      const picked = history.get(type) ?? [];
      const ride = chooseRide(candidates, target, picked, random);
      history.set(type, [...picked, ride.recipe]);
      if (slot === 'endurance') {
        previousEnduranceMinutes = Math.max(previousEnduranceMinutes, ride.minutes);
      }
      rides.push({ slot, rideId: ride.id });
    }

    weeks.push({ number, kind, hasTest: program.testWeeks.includes(number), targetTss, rides });
  }
  return weeks;
}

const RECOVERY_WEEK_MAX_MINUTES = 45;

/**
 * Cost, in TSS points, of repeating a recipe used this many picks ago (1 = the
 * previous pick of this ride type). Trades a slightly worse TSS fit for variety.
 */
const REPEAT_COST = [0, 12, 7, 4, 2];

function chooseRide(
  candidates: readonly Ride[],
  target: number,
  history: readonly string[],
  random: () => number,
): Ride {
  let best: Ride | undefined;
  let bestCost = Infinity;
  for (const ride of candidates) {
    const at = history.lastIndexOf(ride.recipe);
    const age = at < 0 ? Infinity : history.length - at;
    const repeat = REPEAT_COST[age] ?? 0;
    // A little jitter so different seeds give different, equally good plans.
    const cost = Math.abs(ride.tss - target) + repeat + random() * 2;
    if (cost < bestCost) {
      best = ride;
      bestCost = cost;
    }
  }
  return best!;
}

export function plannedTss(week: PlannedWeek): number {
  return week.rides.reduce((sum, r) => sum + (getRide(r.rideId)?.tss ?? 0), 0);
}

export function plannedMinutes(week: PlannedWeek): number {
  return week.rides.reduce((sum, r) => sum + (getRide(r.rideId)?.minutes ?? 0), 0);
}
