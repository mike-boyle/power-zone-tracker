import { Show } from 'solid-js';
import { getRide } from '../domain/library';
import { state } from '../state/store';
import { href } from '../router';
import styles from './ActiveRideBanner.module.css';

/** Shown on every screen except the player while a ride is open. */
export function ActiveRideBanner() {
  const ride = () => (state.activeRide ? getRide(state.activeRide.rideId) : undefined);
  return (
    <Show when={ride()}>
      {(r) => (
        <a class={styles.banner} href={href('/play')}>
          <span class={styles.pulse} aria-hidden="true" />
          <span class={styles.text}>
            <strong>{r().name}</strong>{' '}
            {state.activeRide?.runningSince !== null ? 'in progress' : 'paused'}
          </span>
          <span class={styles.cta}>Resume</span>
        </a>
      )}
    </Show>
  );
}
