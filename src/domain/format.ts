/** 75 → "1:15", 3725 → "1:02:05". Negative values clamp to 0. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`;
  return `${minutes}:${ss}`;
}

/** Countdown display that never shows 0:00 while time remains: rounds up. */
export function formatCountdown(remainingSeconds: number): string {
  return formatClock(Math.ceil(Math.max(0, remainingSeconds)));
}

/** 90 → "1:30", 600 → "10 min", 45 → "0:45". For interval lengths in lists. */
export function formatDuration(seconds: number): string {
  if (seconds >= 600 && seconds % 60 === 0) return `${seconds / 60} min`;
  return formatClock(seconds);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
