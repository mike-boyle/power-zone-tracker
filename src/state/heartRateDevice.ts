import {
  forgetHeartRateMonitor,
  pairHeartRateMonitor,
  reconnectKnownMonitor,
} from '../lib/heartRate';
import { setSetting, state } from './store';

/** Pick a strap (call from a tap) and remember it for next time. */
export async function connectHeartRate(): Promise<void> {
  const device = await pairHeartRateMonitor();
  if (device) setSetting('hrDevice', device);
}

export async function forgetHeartRate(): Promise<void> {
  await forgetHeartRateMonitor();
  setSetting('hrDevice', null);
}

/** On app start: quietly reconnect to the remembered strap if the browser allows it. */
export function reconnectRememberedHeartRate(): void {
  const known = state.settings.hrDevice;
  if (known) void reconnectKnownMonitor(known.id);
}
