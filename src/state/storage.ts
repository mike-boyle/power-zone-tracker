import type { AppState } from './types';

const KEY = 'power-zone-tracker:v1';

export function defaultState(): AppState {
  return {
    version: 1,
    settings: { ftp: null, beeps: true, voice: false },
    ftpHistory: [],
    plan: null,
    history: [],
    activeRide: null,
  };
}

/** Fill in any fields missing from older or partial saves. */
export function normalize(raw: unknown): AppState {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Partial<AppState>;
  if (data.version !== 1) return base;
  return {
    version: 1,
    settings: { ...base.settings, ...data.settings },
    ftpHistory: Array.isArray(data.ftpHistory) ? data.ftpHistory : [],
    plan: data.plan ?? null,
    history: Array.isArray(data.history) ? data.history : [],
    activeRide: data.activeRide ?? null,
  };
}

export function loadState(): AppState {
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return defaultState();
    return normalize(JSON.parse(text));
  } catch (error) {
    // Keep the unreadable copy rather than silently losing it.
    try {
      const text = localStorage.getItem(KEY);
      if (text) localStorage.setItem(`${KEY}:unreadable`, text);
    } catch {
      /* storage unavailable */
    }
    console.error('Could not read saved data', error);
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Could not save data', error);
  }
}

/** Ask the browser not to evict our storage (matters most on iOS). */
export function requestPersistentStorage(): void {
  navigator.storage?.persist?.().catch(() => {});
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // randomUUID needs a secure context; plain-http LAN testing falls back to this.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
