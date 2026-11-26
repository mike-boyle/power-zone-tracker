import { Match, Show, Switch } from 'solid-js';
import { disconnectHeartRateMonitor, heartRate, type HeartRateStatus } from '../lib/heartRate';
import { connectHeartRate, forgetHeartRate } from '../state/heartRateDevice';
import { state } from '../state/store';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { HeartIcon } from './HeartRateBadge';
import styles from './HeartRateMonitorCard.module.css';

const STATUS_TEXT: Record<HeartRateStatus, string> = {
  unsupported: 'Not available in this browser',
  idle: 'Not connected',
  connecting: 'Connecting…',
  connected: 'Connected',
  reconnecting: 'Signal lost, reconnecting…',
  error: "Couldn't connect",
};

/** Pair, see and manage the Bluetooth heart rate strap. */
export function HeartRateMonitorCard() {
  const name = () =>
    heartRate.deviceName() ?? state.settings.hrDevice?.name ?? 'No monitor paired yet';
  const busy = () => heartRate.status() === 'connecting' || heartRate.status() === 'reconnecting';
  const live = () => heartRate.status() === 'connected' || busy();

  return (
    <Card>
      <Show
        when={heartRate.status() !== 'unsupported'}
        fallback={
          <p class={styles.muted}>
            This browser can't connect to Bluetooth devices. Open the app in Chrome on Android to
            use a heart rate strap. (Safari on iPhone doesn't support Web Bluetooth.)
          </p>
        }
      >
        <div class={styles.stack}>
          <div class={styles.device}>
            <HeartIcon class={styles.icon} />
            <div class={styles.info}>
              <strong>{name()}</strong>
              <span class={styles.muted}>
                {STATUS_TEXT[heartRate.status()]}
                <Show when={heartRate.status() === 'connected' && heartRate.battery() !== null}>
                  {' '}
                  · battery {heartRate.battery()}%
                </Show>
              </span>
            </div>
            <Show when={heartRate.status() === 'connected'}>
              <span class={styles.bpm} aria-label="Current heart rate">
                {heartRate.bpm() ?? '--'}
                <span class={styles.unit}>bpm</span>
              </span>
            </Show>
          </div>

          <Show when={heartRate.errorMessage()}>
            <p class={styles.error} role="alert">
              {heartRate.errorMessage()}
            </p>
          </Show>

          <div class={styles.buttons}>
            <Switch>
              <Match when={live()}>
                <Button onClick={disconnectHeartRateMonitor}>Disconnect</Button>
              </Match>
              <Match when={true}>
                <Button variant="primary" onClick={() => void connectHeartRate()}>
                  {state.settings.hrDevice ? 'Connect' : 'Pair a monitor'}
                </Button>
              </Match>
            </Switch>
            <Show when={state.settings.hrDevice}>
              <Button variant="ghost" onClick={() => void forgetHeartRate()}>
                Forget
              </Button>
            </Show>
          </div>

          <ul class={styles.tips}>
            <li>
              Wet the strap's sensors and put it on before connecting; it sleeps when not worn.
            </li>
            <li>
              Most straps allow only one or two Bluetooth connections. Connect the bike over ANT+ so
              Bluetooth stays free for your phone.
            </li>
            <li>Your heart rate is shown during rides and saved with each ride you finish.</li>
          </ul>
        </div>
      </Show>
    </Card>
  );
}
