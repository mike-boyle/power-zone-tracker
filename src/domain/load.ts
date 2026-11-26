/**
 * Training load over time (the "performance management" model):
 *
 *   fitness  (CTL) = exponentially weighted average of daily TSS over ~42 days
 *   fatigue  (ATL) = the same over ~7 days
 *   form     (TSB) = yesterday's fitness − yesterday's fatigue
 *
 * Each day: value += (todayTss − value) / timeConstant. Form uses the previous
 * day's numbers, so it describes how fresh you are going into the day.
 *
 * Dates are local calendar days as "YYYY-MM-DD" strings.
 */

export const FITNESS_DAYS = 42;
export const FATIGUE_DAYS = 7;

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  // Noon avoids daylight-saving edges when adding days.
  return new Date(y!, m! - 1, d!, 12);
}

export function addDays(key: string, days: number): string {
  const date = parseKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseKey(to).getTime() - parseKey(from).getTime()) / 86_400_000);
}

/** Total TSS per local day. */
export function dailyTss(
  rides: readonly { finishedAt: string; tss: number }[],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const ride of rides) {
    const key = dateKey(new Date(ride.finishedAt));
    out.set(key, (out.get(key) ?? 0) + ride.tss);
  }
  return out;
}

export interface LoadDay {
  date: string;
  tss: number;
  fitness: number;
  fatigue: number;
  form: number;
  /** True for days after today, filled in from the plan. */
  projected: boolean;
}

/**
 * Fitness, fatigue and form for each day from `from` to `to` inclusive. The
 * model starts from zero at the earliest day with any TSS (or `from`, if
 * earlier), so history before the range still counts.
 */
export function trainingLoad(
  daily: ReadonlyMap<string, number>,
  from: string,
  to: string,
  options: { today?: string } = {},
): LoadDay[] {
  const keys = [...daily.keys()].sort();
  const start = keys[0] && keys[0] < from ? keys[0] : from;
  const out: LoadDay[] = [];
  let fitness = 0;
  let fatigue = 0;
  for (let day = start; day <= to; day = addDays(day, 1)) {
    const tss = daily.get(day) ?? 0;
    const form = fitness - fatigue;
    fitness += (tss - fitness) / FITNESS_DAYS;
    fatigue += (tss - fatigue) / FATIGUE_DAYS;
    if (day >= from) {
      out.push({
        date: day,
        tss,
        fitness,
        fatigue,
        form,
        projected: options.today !== undefined && day > options.today,
      });
    }
  }
  return out;
}

/**
 * Spread upcoming planned rides over the calendar for a projection: the
 * rides of each week go on evenly spaced days (5 a week → days 0, 1, 2, 4, 5).
 */
export function projectRides(
  tssInOrder: readonly number[],
  daysPerWeek: number,
  start: string,
): Map<string, number> {
  const out = new Map<string, number>();
  tssInOrder.forEach((tss, k) => {
    const week = Math.floor(k / daysPerWeek);
    const slot = k % daysPerWeek;
    const key = addDays(start, week * 7 + Math.floor((slot * 7) / daysPerWeek));
    out.set(key, (out.get(key) ?? 0) + tss);
  });
  return out;
}

export type FormTone = 'fresh' | 'neutral' | 'building' | 'strained';

/** Plain-language reading of a form number. Bands follow common TSB guidance. */
export function formStatus(form: number): { tone: FormTone; label: string; detail: string } {
  if (form > 5) {
    return {
      tone: 'fresh',
      label: 'Fresh',
      detail: 'Well rested. A good day for a test or a hard ride.',
    };
  }
  if (form >= -10) {
    return { tone: 'neutral', label: 'Balanced', detail: 'Training and recovery are in balance.' };
  }
  if (form >= -30) {
    return {
      tone: 'building',
      label: 'Building',
      detail: "Productive fatigue: you're training hard enough to improve.",
    };
  }
  return {
    tone: 'strained',
    label: 'Very tired',
    detail: 'Fatigue is high. An easier day or two will help you absorb the work.',
  };
}
