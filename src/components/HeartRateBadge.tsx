import { Match, Show, Switch } from 'solid-js';
import { heartRate } from '../lib/heartRate';
import { connectHeartRate } from '../state/heartRateDevice';
import { cx } from '../lib/cx';
import styles from './HeartRateBadge.module.css';

export function HeartIcon(props: { class?: string }) {
  return (
    <svg class={props.class} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.1 4.4 2.6.8-1.5 2.3-2.6 4.4-2.6 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z"
      />
    </svg>
  );
}

/**
 * Live heart rate for the ride player. Shows a Connect button until a strap is
 * paired, and nothing at all in browsers without Web Bluetooth.
 */
export function HeartRateBadge(props: { class?: string }) {
  return (
    <Show when={heartRate.status() !== 'unsupported'}>
      <Switch>
        <Match when={heartRate.status() === 'idle' || heartRate.status() === 'error'}>
          <button
            type="button"
            class={cx(styles.badge, styles.connect, props.class)}
            onClick={() => void connectHeartRate()}
          >
            <HeartIcon class={styles.icon} />
            Connect HR
          </button>
        </Match>
        <Match when={heartRate.status() === 'connected'}>
          <span
            class={cx(styles.badge, props.class)}
            role="status"
            aria-label={
              heartRate.bpm() === null
                ? 'Heart rate: no reading'
                : `Heart rate ${heartRate.bpm()} beats per minute`
            }
          >
            <HeartIcon class={cx(styles.icon, heartRate.bpm() !== null && styles.beat)} />
            <span class={styles.value}>{heartRate.bpm() ?? '--'}</span>
          </span>
        </Match>
        <Match when={true}>
          <span
            class={cx(styles.badge, props.class)}
            role="status"
            aria-label="Connecting to heart rate monitor"
          >
            <HeartIcon class={cx(styles.icon, styles.waiting)} />
            <span class={styles.value}>…</span>
          </span>
        </Match>
      </Switch>
    </Show>
  );
}
