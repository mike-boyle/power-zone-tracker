import type { PlannedWeek } from '../domain/plan';
import type { DaysPerWeek } from '../domain/programs';

export interface PlanRef {
  planId: string;
  /** 1-based week number. */
  week: number;
  /** 0-based position within the week. */
  index: number;
}

export interface ActivePlan {
  id: string;
  programId: string;
  daysPerWeek: DaysPerWeek;
  startWithTest: boolean;
  /** Missing on plans saved before test options existed; those had every test. */
  betweenBlockTests?: boolean;
  finalTest?: boolean;
  seed: number;
  startedAt: string;
  /** The generated plan, stored so later library changes never reshuffle a plan in progress. */
  weeks: PlannedWeek[];
  /** Keyed by `progressKey(week, index)`. Missing means not done yet. */
  progress: Record<string, PlanProgress>;
}

export interface PlanProgress {
  status: 'done' | 'skipped';
  recordId?: string;
  at: string;
}

export interface RideRecord {
  id: string;
  rideId: string;
  startedAt: string;
  finishedAt: string;
  /** Seconds actually ridden. */
  seconds: number;
  /** Estimated TSS for the part ridden. */
  tss: number;
  /** True if the whole ride was finished, false if ended early. */
  completed: boolean;
  /** FTP at the time, so watt ranges in old summaries stay as they were. */
  ftp: number | null;
  planRef?: PlanRef;
  testResult?: { averageWatts: number; ftp: number };
  heartRate?: RecordedHeartRate;
}

export interface RecordedHeartRate {
  avg: number;
  max: number;
  /** One reading per `interval` seconds of ride time; null where there was none. */
  samples: (number | null)[];
  interval: number;
}

export interface ActiveRide {
  rideId: string;
  planRef?: PlanRef;
  /** When the ride was opened (ISO). */
  createdAt: string;
  /** When Start was first pressed (ISO), or null while waiting to start. */
  startedAt: string | null;
  /** Ride time banked before the current running stretch, in ms. */
  accumulatedMs: number;
  /** Epoch ms when the current running stretch began, or null when paused. */
  runningSince: number | null;
  /** Heart rate per HR_SAMPLE_SECONDS of ride position, while a monitor is connected. */
  hr?: (number | null)[];
}

export interface FtpEntry {
  date: string;
  ftp: number;
  source: 'manual' | 'test';
}

export interface Settings {
  ftp: number | null;
  /** Beep for the last 3 seconds of each interval. */
  beeps: boolean;
  /** Speak the next zone at each change. */
  voice: boolean;
  /** The Bluetooth heart rate strap paired last, to reconnect to automatically. */
  hrDevice: { id: string; name: string } | null;
}

export interface AppState {
  version: 1;
  settings: Settings;
  ftpHistory: FtpEntry[];
  plan: ActivePlan | null;
  history: RideRecord[];
  activeRide: ActiveRide | null;
}

export function progressKey(week: number, index: number): string {
  return `${week}-${index}`;
}
