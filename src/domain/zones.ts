/**
 * Power zones as percentages of FTP, matching the 7-zone scheme used by
 * power zone classes:
 *
 *   Z1 Active Recovery  ≤ 55%
 *   Z2 Endurance        56–75%
 *   Z3 Tempo            76–90%
 *   Z4 Threshold        91–105%
 *   Z5 VO2 Max          106–120%
 *   Z6 Anaerobic        121–150%
 *   Z7 Neuromuscular    > 150%
 */

export type Zone = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const ZONES: readonly Zone[] = [1, 2, 3, 4, 5, 6, 7];

export interface ZoneInfo {
  zone: Zone;
  name: string;
  /** Lower bound as a fraction of FTP (exclusive, except Z1 which starts at 0). */
  low: number;
  /** Upper bound as a fraction of FTP (inclusive). `null` means open-ended. */
  high: number | null;
  /**
   * Representative intensity used for TSS estimates and graph heights: roughly
   * the middle of the zone (Z7 is open-ended, so it uses a typical sprint value).
   */
  intensity: number;
  feel: string;
}

export const ZONE_INFO: Record<Zone, ZoneInfo> = {
  1: { zone: 1, name: 'Active Recovery', low: 0, high: 0.55, intensity: 0.5, feel: 'Easy spin' },
  2: { zone: 2, name: 'Endurance', low: 0.55, high: 0.75, intensity: 0.65, feel: 'All-day pace' },
  3: { zone: 3, name: 'Tempo', low: 0.75, high: 0.9, intensity: 0.83, feel: 'Comfortably hard' },
  4: {
    zone: 4,
    name: 'Threshold',
    low: 0.9,
    high: 1.05,
    intensity: 0.98,
    feel: 'Hard, sustainable',
  },
  5: { zone: 5, name: 'VO2 Max', low: 1.05, high: 1.2, intensity: 1.13, feel: 'Very hard' },
  6: { zone: 6, name: 'Anaerobic', low: 1.2, high: 1.5, intensity: 1.35, feel: 'Max for a minute' },
  7: { zone: 7, name: 'Neuromuscular', low: 1.5, high: null, intensity: 1.6, feel: 'Sprint' },
};

export interface WattRange {
  low: number;
  /** `null` for the open-ended top zone. */
  high: number | null;
}

/**
 * Watt range for a zone. Ranges are contiguous integers: Z1 is 0..floor(55%),
 * and every other zone starts one watt above the previous zone's ceiling.
 */
export function wattRange(ftp: number, zone: Zone): WattRange {
  const info = ZONE_INFO[zone];
  const low = zone === 1 ? 0 : Math.floor(ftp * info.low) + 1;
  const high = info.high === null ? null : Math.floor(ftp * info.high);
  return { low, high };
}

export function formatWattRange(range: WattRange): string {
  return range.high === null ? `${range.low}+` : `${range.low}–${range.high}`;
}

/** Which zone a given output falls into for this FTP. */
export function zoneForWatts(ftp: number, watts: number): Zone {
  for (const zone of ZONES) {
    const { high } = wattRange(ftp, zone);
    if (high === null || watts <= high) return zone;
  }
  return 7;
}

/** CSS custom property names for zone colors (defined in tokens.css). */
export function zoneColorVar(zone: Zone): string {
  return `var(--zone-${zone})`;
}

export function zoneInkVar(zone: Zone): string {
  return `var(--zone-${zone}-ink)`;
}

/** FTP from a 20-minute test: 95% of the average output. */
export function ftpFromTwentyMinute(averageWatts: number): number {
  return Math.round(averageWatts * 0.95);
}

/** Average watts over a span from the bike's running total output (kJ). */
export function averageWattsFromKj(kjStart: number, kjEnd: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.round(((kjEnd - kjStart) * 1000) / seconds);
}
