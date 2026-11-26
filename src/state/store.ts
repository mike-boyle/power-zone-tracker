import { createStore, produce, unwrap } from 'solid-js/store';
import { getRide } from '../domain/library';
import { generatePlan, type PlannedRide, type TestOptions } from '../domain/plan';
import { getProgram, type DaysPerWeek } from '../domain/programs';
import { estimateTss } from '../domain/tss';
import { HR_SAMPLE_SECONDS, summarizeHeartRate } from '../domain/heartRate';
import { ftpFromTwentyMinute } from '../domain/zones';
import { loadState, newId, normalize, saveState } from './storage';
import {
  progressKey,
  type ActivePlan,
  type AppState,
  type FtpEntry,
  type PlanRef,
  type RecordedHeartRate,
  type RideRecord,
  type Settings,
} from './types';

const [state, setState] = createStore<AppState>(loadState());

export { state };

function commit(change: (draft: AppState) => void): void {
  setState(produce(change));
  saveState(unwrap(state));
}

// ── Settings and FTP ───────────────────────────────────────────────────────

export function setFtp(ftp: number, source: FtpEntry['source'] = 'manual'): void {
  const value = Math.round(ftp);
  if (!Number.isFinite(value) || value <= 0) return;
  commit((s) => {
    s.settings.ftp = value;
    const today = new Date().toISOString().slice(0, 10);
    const last = s.ftpHistory[s.ftpHistory.length - 1];
    // Several manual edits in one day are one change, not many.
    if (last && last.source === source && source === 'manual' && last.date.slice(0, 10) === today) {
      last.ftp = value;
      last.date = new Date().toISOString();
    } else {
      s.ftpHistory.push({ date: new Date().toISOString(), ftp: value, source });
    }
  });
}

export function setSetting<K extends Exclude<keyof Settings, 'ftp'>>(key: K, value: Settings[K]) {
  commit((s) => {
    s.settings[key] = value;
  });
}

// ── Programs ───────────────────────────────────────────────────────────────

export function newPlanSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/** Start a program. Pass the seed used for the preview so the plan matches what was shown. */
export function startProgram(
  programId: string,
  daysPerWeek: DaysPerWeek,
  tests: TestOptions,
  seed: number = newPlanSeed(),
) {
  const program = getProgram(programId);
  if (!program) return;
  const plan: ActivePlan = {
    id: newId(),
    programId,
    daysPerWeek,
    startWithTest: tests.startWithTest,
    betweenBlockTests: tests.betweenBlockTests,
    finalTest: tests.finalTest,
    seed,
    startedAt: new Date().toISOString(),
    weeks: generatePlan(program, { daysPerWeek, seed, ...tests }),
    progress: {},
  };
  commit((s) => {
    s.plan = plan;
  });
}

export function endProgram(): void {
  commit((s) => {
    s.plan = null;
  });
}

export function setSkipped(week: number, index: number, skipped: boolean): void {
  commit((s) => {
    if (!s.plan) return;
    const key = progressKey(week, index);
    if (skipped) s.plan.progress[key] = { status: 'skipped', at: new Date().toISOString() };
    else if (s.plan.progress[key]?.status === 'skipped') delete s.plan.progress[key];
  });
}

export interface NextRide {
  week: number;
  index: number;
  planned: PlannedRide;
}

/** The first planned ride not yet done or skipped. */
export function nextPlanned(plan: ActivePlan | null): NextRide | null {
  if (!plan) return null;
  for (const week of plan.weeks) {
    for (let index = 0; index < week.rides.length; index++) {
      if (!plan.progress[progressKey(week.number, index)]) {
        return { week: week.number, index, planned: week.rides[index]! };
      }
    }
  }
  return null;
}

export function planCounts(plan: ActivePlan) {
  const total = plan.weeks.reduce((sum, w) => sum + w.rides.length, 0);
  const entries = Object.values(plan.progress);
  return {
    total,
    done: entries.filter((p) => p.status === 'done').length,
    skipped: entries.filter((p) => p.status === 'skipped').length,
  };
}

export type PlannedStatus = 'done' | 'partial' | 'skipped' | 'next' | 'todo';

export function plannedStatus(plan: ActivePlan, week: number, index: number): PlannedStatus {
  const entry = plan.progress[progressKey(week, index)];
  if (entry?.status === 'skipped') return 'skipped';
  if (entry?.status === 'done') {
    const record = entry.recordId ? getRecord(entry.recordId) : undefined;
    return record && !record.completed ? 'partial' : 'done';
  }
  const next = nextPlanned(plan);
  return next && next.week === week && next.index === index ? 'next' : 'todo';
}

/** The week the next ride is in, or the last week once everything is done. */
export function currentWeek(plan: ActivePlan): number {
  return nextPlanned(plan)?.week ?? plan.weeks.length;
}

/** TSS actually ridden for planned rides in a week. */
export function weekRiddenTss(plan: ActivePlan, week: number): number {
  let sum = 0;
  const planned = plan.weeks[week - 1];
  if (!planned) return 0;
  planned.rides.forEach((_, index) => {
    const entry = plan.progress[progressKey(week, index)];
    if (entry?.status === 'done' && entry.recordId) sum += getRecord(entry.recordId)?.tss ?? 0;
  });
  return sum;
}

// ── Riding ─────────────────────────────────────────────────────────────────

export function openRide(rideId: string, planRef?: PlanRef): void {
  commit((s) => {
    s.activeRide = {
      rideId,
      ...(planRef ? { planRef } : {}),
      createdAt: new Date().toISOString(),
      startedAt: null,
      accumulatedMs: 0,
      runningSince: null,
    };
  });
}

export function play(): void {
  commit((s) => {
    const ride = s.activeRide;
    if (!ride || ride.runningSince !== null) return;
    ride.startedAt ??= new Date().toISOString();
    ride.runningSince = Date.now();
  });
}

export function pause(): void {
  commit((s) => {
    const ride = s.activeRide;
    if (!ride || ride.runningSince === null) return;
    ride.accumulatedMs += Math.max(0, Date.now() - ride.runningSince);
    ride.runningSince = null;
  });
}

/** Jump to a point in the ride (used for previous/next interval). */
export function seekTo(ms: number): void {
  commit((s) => {
    const ride = s.activeRide;
    if (!ride) return;
    ride.accumulatedMs = Math.max(0, ms);
    if (ride.runningSince !== null) ride.runningSince = Date.now();
  });
}

export function discardRide(): void {
  commit((s) => {
    s.activeRide = null;
  });
}

/**
 * Store a heart rate reading for the HR_SAMPLE_SECONDS bucket at this ride
 * position. The first reading in a bucket wins, so this saves at most once per
 * bucket rather than on every tick.
 */
export function recordHeartRate(elapsedSeconds: number, bpm: number): void {
  const bucket = Math.floor(elapsedSeconds / HR_SAMPLE_SECONDS);
  const existing = state.activeRide?.hr?.[bucket];
  if (!state.activeRide || (existing !== undefined && existing !== null)) return;
  commit((s) => {
    const ride = s.activeRide;
    if (!ride) return;
    const hr = (ride.hr ??= []);
    while (hr.length < bucket) hr.push(null);
    hr[bucket] = bpm;
  });
}

function recordedHeartRate(
  samples: readonly (number | null)[] | undefined,
  seconds: number,
): RecordedHeartRate | undefined {
  if (!samples) return undefined;
  const kept = samples.slice(0, Math.ceil(seconds / HR_SAMPLE_SECONDS));
  const summary = summarizeHeartRate(kept);
  return summary ? { ...summary, samples: kept, interval: HR_SAMPLE_SECONDS } : undefined;
}

/** Save the active ride to history and clear it. Returns the new record id. */
export function finishRide(elapsedSeconds: number): string | null {
  const active = state.activeRide;
  if (!active) return null;
  const ride = getRide(active.rideId);
  if (!ride) {
    discardRide();
    return null;
  }
  const total = ride.minutes * 60;
  const seconds = Math.min(total, Math.max(0, Math.round(elapsedSeconds)));
  const heartRate = recordedHeartRate(unwrap(active).hr, seconds);
  const record: RideRecord = {
    id: newId(),
    rideId: ride.id,
    startedAt: active.startedAt ?? active.createdAt,
    finishedAt: new Date().toISOString(),
    seconds,
    tss: Math.round(estimateTss(ride.segments, seconds)),
    completed: seconds >= total - 1,
    ftp: state.settings.ftp,
    ...(active.planRef ? { planRef: { ...active.planRef } } : {}),
    ...(heartRate ? { heartRate } : {}),
  };
  commit((s) => {
    s.history.push(record);
    const ref = record.planRef;
    if (ref && s.plan && s.plan.id === ref.planId) {
      s.plan.progress[progressKey(ref.week, ref.index)] = {
        status: 'done',
        recordId: record.id,
        at: record.finishedAt,
      };
    }
    s.activeRide = null;
  });
  return record.id;
}

export function getRecord(id: string): RideRecord | undefined {
  return state.history.find((r) => r.id === id);
}

export function saveTestResult(recordId: string, averageWatts: number): number | null {
  const avg = Math.round(averageWatts);
  if (!Number.isFinite(avg) || avg <= 0) return null;
  const ftp = ftpFromTwentyMinute(avg);
  commit((s) => {
    const record = s.history.find((r) => r.id === recordId);
    if (record) record.testResult = { averageWatts: avg, ftp };
  });
  setFtp(ftp, 'test');
  return ftp;
}

export function deleteRecord(id: string): void {
  commit((s) => {
    s.history = s.history.filter((r) => r.id !== id);
    if (s.plan) {
      for (const [key, entry] of Object.entries(s.plan.progress)) {
        if (entry.recordId === id) delete s.plan.progress[key];
      }
    }
  });
}

// ── Backup ─────────────────────────────────────────────────────────────────

export function exportData(): string {
  return JSON.stringify({ ...unwrap(state), exportedAt: new Date().toISOString() }, null, 2);
}

export function importData(text: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return false;
  }
  if (!parsed || typeof parsed !== 'object' || (parsed as { version?: unknown }).version !== 1) {
    return false;
  }
  const next = normalize(parsed);
  commit((s) => {
    Object.assign(s, next);
  });
  return true;
}

export function resetAll(): void {
  const fresh = normalize(null);
  commit((s) => {
    Object.assign(s, fresh);
  });
}
