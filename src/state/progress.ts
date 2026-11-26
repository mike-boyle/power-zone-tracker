import { getRide } from '../domain/library';
import {
  addDays,
  dailyTss,
  dateKey,
  daysBetween,
  projectRides,
  trainingLoad,
  type LoadDay,
} from '../domain/load';
import { state } from './store';
import { progressKey, type ActivePlan } from './types';

export type LoadRange = 42 | 90 | 'all';

/** TSS of the plan's rides not yet done or skipped, in plan order. */
export function remainingPlanTss(plan: ActivePlan): number[] {
  const out: number[] = [];
  for (const week of plan.weeks) {
    week.rides.forEach((planned, index) => {
      if (!plan.progress[progressKey(week.number, index)]) {
        out.push(getRide(planned.rideId)?.tss ?? 0);
      }
    });
  }
  return out;
}

export interface LoadView {
  days: LoadDay[];
  /** Index of today in `days`. */
  todayIndex: number;
  hasHistory: boolean;
}

/**
 * Fitness, fatigue and form for the chosen range, optionally continued
 * through the rest of the active plan (rides spread from tomorrow on).
 */
export function loadView(range: LoadRange, includePlan: boolean, now = new Date()): LoadView {
  const today = dateKey(now);
  const actual = dailyTss(state.history);
  const first = [...actual.keys()].sort()[0];

  const from =
    range === 'all'
      ? first && daysBetween(first, today) > 14
        ? first
        : addDays(today, -14)
      : addDays(today, -(range - 1));

  const daily = new Map(actual);
  let to = today;
  const plan = state.plan;
  if (includePlan && plan) {
    const projected = projectRides(remainingPlanTss(plan), plan.daysPerWeek, addDays(today, 1));
    for (const [day, tss] of projected) {
      daily.set(day, (daily.get(day) ?? 0) + tss);
      if (day > to) to = day;
    }
    // A few days past the last ride shows the taper's effect on form.
    if (to > today) to = addDays(to, 3);
  }

  const days = trainingLoad(daily, from, to, { today });
  return {
    days,
    todayIndex: Math.max(
      0,
      days.findIndex((d) => d.date === today),
    ),
    hasHistory: actual.size > 0,
  };
}

/** Today's numbers and the change over the past week, for summary tiles. */
export function currentLoad(now = new Date()) {
  const { days, todayIndex, hasHistory } = loadView(42, false, now);
  const today = days[todayIndex];
  const weekAgo = days[todayIndex - 7];
  if (!today) return null;
  return {
    hasHistory,
    fitness: today.fitness,
    fatigue: today.fatigue,
    form: today.form,
    fitnessChange: weekAgo ? today.fitness - weekAgo.fitness : null,
  };
}
