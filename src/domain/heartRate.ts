/**
 * Heart rate maths with no browser dependencies: decoding the standard
 * Bluetooth Heart Rate Measurement characteristic (0x2A37) and summarising
 * the samples recorded during a ride.
 */

export interface HeartRateMeasurement {
  bpm: number;
  /** null when the strap doesn't report skin contact. */
  contact: boolean | null;
  /** Beat-to-beat intervals in milliseconds, if the strap sends them. */
  rr: number[];
}

/**
 * Decode a Heart Rate Measurement value.
 *
 * Flags (byte 0):
 *   bit 0    heart rate is uint16 (else uint8)
 *   bit 1-2  sensor contact: 0b10 = supported, no contact; 0b11 = in contact
 *   bit 3    energy expended (uint16) present
 *   bit 4    RR intervals (uint16, 1/1024 s) present
 */
export function parseHeartRateMeasurement(view: DataView): HeartRateMeasurement {
  const flags = view.getUint8(0);
  const wide = (flags & 0x01) !== 0;
  const contactSupported = (flags & 0x04) !== 0;
  const contactDetected = (flags & 0x02) !== 0;
  const energyPresent = (flags & 0x08) !== 0;
  const rrPresent = (flags & 0x10) !== 0;

  let offset = 1;
  const bpm = wide ? view.getUint16(offset, true) : view.getUint8(offset);
  offset += wide ? 2 : 1;
  if (energyPresent) offset += 2;

  const rr: number[] = [];
  if (rrPresent) {
    for (; offset + 1 < view.byteLength; offset += 2) {
      rr.push(Math.round((view.getUint16(offset, true) / 1024) * 1000));
    }
  }

  return { bpm, contact: contactSupported ? contactDetected : null, rr };
}

/** Seconds between stored heart rate samples during a ride. */
export const HR_SAMPLE_SECONDS = 5;

export interface HeartRateSummary {
  avg: number;
  max: number;
}

/** Average and max of the samples that have a reading, or null if none do. */
export function summarizeHeartRate(
  samples: readonly (number | null | undefined)[],
): HeartRateSummary | null {
  const values = samples.filter((v): v is number => typeof v === 'number' && v > 0);
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return { avg: Math.round(sum / values.length), max: Math.max(...values) };
}
