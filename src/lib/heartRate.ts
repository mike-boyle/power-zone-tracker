import { createSignal } from 'solid-js';
import { parseHeartRateMeasurement } from '../domain/heartRate';

/**
 * Live heart rate from a Bluetooth chest strap using the standard Heart Rate
 * Service. Web Bluetooth works in Chrome on Android and desktop; Safari on iOS
 * doesn't support it.
 *
 * Exposes Solid signals so any screen can show the current reading. Pairing
 * must start from a tap (`pairHeartRateMonitor`); after that the connection is
 * kept alive and re-established if the strap drops out.
 */

export type HeartRateStatus =
  'unsupported' | 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

/** A reading older than this is treated as no reading (strap off, out of range). */
const STALE_MS = 5000;
const RETRY_DELAYS_MS = [1000, 2000, 5000, 10000];

export function heartRateSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof navigator !== 'undefined' &&
    'bluetooth' in navigator
  );
}

const [status, setStatus] = createSignal<HeartRateStatus>(
  heartRateSupported() ? 'idle' : 'unsupported',
);
const [bpm, setBpm] = createSignal<number | null>(null);
const [deviceName, setDeviceName] = createSignal<string | null>(null);
const [battery, setBattery] = createSignal<number | null>(null);
const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

export const heartRate = { status, bpm, deviceName, battery, errorMessage };

let device: BluetoothDevice | null = null;
let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
let wanted = false;
let retry = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let lastReadingAt = 0;
let simulation: ReturnType<typeof setInterval> | undefined;

if (typeof window !== 'undefined') {
  setInterval(() => {
    if (bpm() !== null && Date.now() - lastReadingAt > STALE_MS) setBpm(null);
  }, 1000);
}

function onMeasurement(event: Event): void {
  const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
  if (!value) return;
  const reading = parseHeartRateMeasurement(value);
  lastReadingAt = Date.now();
  setBpm(reading.contact === false || reading.bpm === 0 ? null : reading.bpm);
}

async function readBattery(server: BluetoothRemoteGATTServer): Promise<void> {
  try {
    const service = await server.getPrimaryService('battery_service');
    const level = await service.getCharacteristic('battery_level');
    setBattery((await level.readValue()).getUint8(0));
  } catch {
    setBattery(null);
  }
}

async function connectGatt(): Promise<void> {
  const gatt = device?.gatt;
  if (!gatt) throw new Error('This device has no Bluetooth GATT server.');
  const server = await gatt.connect();
  const service = await server.getPrimaryService('heart_rate');
  characteristic?.removeEventListener('characteristicvaluechanged', onMeasurement);
  characteristic = await service.getCharacteristic('heart_rate_measurement');
  characteristic.addEventListener('characteristicvaluechanged', onMeasurement);
  await characteristic.startNotifications();
  retry = 0;
  setErrorMessage(null);
  setStatus('connected');
  void readBattery(server);
}

function scheduleReconnect(): void {
  clearTimeout(retryTimer);
  if (!wanted || !device) return;
  setStatus('reconnecting');
  const delay = RETRY_DELAYS_MS[Math.min(retry, RETRY_DELAYS_MS.length - 1)]!;
  retry++;
  retryTimer = setTimeout(() => {
    connectGatt().catch(scheduleReconnect);
  }, delay);
}

function onDisconnected(): void {
  setBpm(null);
  if (wanted) scheduleReconnect();
  else setStatus('idle');
}

async function attach(next: BluetoothDevice): Promise<void> {
  if (device && device !== next) {
    device.removeEventListener('gattserverdisconnected', onDisconnected);
    if (device.gatt?.connected) device.gatt.disconnect();
  }
  device = next;
  wanted = true;
  retry = 0;
  setDeviceName(next.name ?? 'Heart rate monitor');
  next.addEventListener('gattserverdisconnected', onDisconnected);
  setStatus('connecting');
  await connectGatt();
}

function describe(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'Bluetooth permission was denied.';
    if (error.name === 'NetworkError') return "Couldn't reach the monitor. Is it on and in range?";
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * Show the browser's device picker and connect to the chosen strap. Call from a
 * tap handler. Resolves to the device's id and name, or null if cancelled.
 */
export async function pairHeartRateMonitor(): Promise<{ id: string; name: string } | null> {
  if (!heartRateSupported()) return null;
  stopSimulation();
  setErrorMessage(null);
  let picked: BluetoothDevice;
  try {
    picked = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['heart_rate'] }],
      optionalServices: ['battery_service'],
    });
  } catch (error) {
    // NotFoundError means the picker was closed without choosing.
    if (!(error instanceof DOMException && error.name === 'NotFoundError')) {
      setErrorMessage(describe(error));
      setStatus('error');
    }
    return null;
  }
  try {
    await attach(picked);
  } catch (error) {
    setErrorMessage(describe(error));
    // Keep trying in the background: the strap may just need a moment to wake.
    scheduleReconnect();
  }
  return { id: picked.id, name: picked.name ?? 'Heart rate monitor' };
}

/**
 * Reconnect to a strap paired in an earlier visit without showing the picker.
 * Needs `navigator.bluetooth.getDevices()`, which not every Chrome build has;
 * returns false when it can't, and the user taps Connect instead.
 */
export async function reconnectKnownMonitor(id: string): Promise<boolean> {
  if (!heartRateSupported() || status() === 'connected' || status() === 'connecting') return false;
  const getDevices = navigator.bluetooth.getDevices?.bind(navigator.bluetooth);
  if (!getDevices) return false;
  try {
    const known = (await getDevices()).find((d) => d.id === id);
    if (!known) return false;
    await attach(known);
    return true;
  } catch {
    // Probably not worn or out of range yet; keep retrying quietly.
    scheduleReconnect();
    return false;
  }
}

export function disconnectHeartRateMonitor(): void {
  wanted = false;
  clearTimeout(retryTimer);
  stopSimulation();
  if (device?.gatt?.connected) device.gatt.disconnect();
  setBpm(null);
  setStatus(heartRateSupported() ? 'idle' : 'unsupported');
}

/** Disconnect and revoke the site's permission for the device where supported. */
export async function forgetHeartRateMonitor(): Promise<void> {
  const current = device;
  disconnectHeartRateMonitor();
  device = null;
  setDeviceName(null);
  setBattery(null);
  await current?.forget?.().catch(() => {});
}

/** Development only: fake a strap so the UI can be checked without hardware. */
export function simulateHeartRate(start = 118): void {
  stopSimulation();
  let value = start;
  setDeviceName('Simulated monitor');
  setBattery(87);
  setStatus('connected');
  simulation = setInterval(() => {
    value = Math.max(60, Math.min(190, value + Math.round((Math.random() - 0.4) * 4)));
    lastReadingAt = Date.now();
    setBpm(value);
  }, 1000);
}

function stopSimulation(): void {
  if (simulation === undefined) return;
  clearInterval(simulation);
  simulation = undefined;
}
