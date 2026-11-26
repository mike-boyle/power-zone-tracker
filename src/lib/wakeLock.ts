/**
 * Keep the screen on during a ride. The browser drops the lock whenever the
 * page is hidden, so it is re-requested when the page becomes visible again.
 */

let sentinel: WakeLockSentinel | null = null;
let wanted = false;

async function acquire(): Promise<void> {
  if (!wanted || sentinel || document.visibilityState !== 'visible') return;
  try {
    sentinel = (await navigator.wakeLock?.request('screen')) ?? null;
    sentinel?.addEventListener('release', () => {
      sentinel = null;
    });
  } catch {
    // Not supported, not a secure context, or battery saver. The ride still works.
    sentinel = null;
  }
}

function onVisibility(): void {
  void acquire();
}

export function keepScreenOn(): void {
  if (wanted) return;
  wanted = true;
  document.addEventListener('visibilitychange', onVisibility);
  void acquire();
}

export function releaseScreen(): void {
  wanted = false;
  document.removeEventListener('visibilitychange', onVisibility);
  void sentinel?.release().catch(() => {});
  sentinel = null;
}

export function wakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}
