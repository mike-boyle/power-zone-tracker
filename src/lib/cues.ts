/**
 * Audio, voice and vibration cues for the ride player.
 *
 * iOS only allows audio that was unlocked by a user gesture, so `unlockAudio`
 * must be called from a tap handler (the Start button) before any beeps.
 */

let context: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    context ??= new Ctor();
    if (context.state === 'suspended') void context.resume();
    // A silent blip completes the unlock on older iOS.
    tone(0, 0.01, 0);
  } catch {
    context = null;
  }
}

function tone(frequency: number, seconds: number, volume: number): void {
  if (!context) return;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency || 440;
  const t = context.currentTime;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  osc.connect(gain).connect(context.destination);
  osc.start(t);
  osc.stop(t + seconds + 0.02);
}

/** Short tick for the 3-2-1 countdown. */
export function countdownBeep(): void {
  tone(880, 0.12, 0.25);
  navigator.vibrate?.(60);
}

/** Longer, higher tone when a new interval starts. */
export function changeBeep(): void {
  tone(1320, 0.3, 0.3);
  navigator.vibrate?.([120, 60, 120]);
}

export function speak(text: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  window.speechSynthesis.speak(utterance);
}

/** "2:30" → "2 minutes 30", for speech. */
export function spokenDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} seconds`;
  const minutes = `${m} minute${m === 1 ? '' : 's'}`;
  return s === 0 ? minutes : `${minutes} ${s}`;
}
