import { For, Show, createMemo } from 'solid-js';
import { totalSeconds, withTimes, type Segment } from '../domain/ride';
import type { Zone } from '../domain/zones';
import { formatClock } from '../domain/format';
import { cx } from '../lib/cx';
import styles from './RideProfile.module.css';

/** Bar height per zone, as a share of the graph height. */
const LEVEL: Record<Zone, number> = { 1: 0.2, 2: 0.34, 3: 0.48, 4: 0.62, 5: 0.76, 6: 0.88, 7: 1 };

export interface HeartRateTrace {
  samples: readonly (number | null)[];
  /** Seconds per sample. */
  interval: number;
}

/**
 * Turn heart rate samples into polyline point lists in the graph's coordinate
 * space (x in ride seconds, y 0–100), split wherever a reading is missing.
 * The y range is fitted to the readings so changes are visible.
 */
function heartRateLines(trace: HeartRateTrace, total: number): string[] {
  const values = trace.samples.filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return [];
  const low = Math.min(...values) - 8;
  const high = Math.max(Math.max(...values) + 8, low + 40);
  const lines: string[] = [];
  let points: string[] = [];
  trace.samples.forEach((v, i) => {
    if (typeof v !== 'number') {
      if (points.length) lines.push(points.join(' '));
      points = [];
      return;
    }
    const x = Math.min(total, (i + 0.5) * trace.interval);
    const y = 100 - ((v - low) / (high - low)) * 100;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  if (points.length) lines.push(points.join(' '));
  // A lone point can't draw a line; repeat it so it shows as a dot.
  return lines.map((l) => (l.includes(' ') ? l : `${l} ${l}`));
}

/**
 * The whole ride as zone-coloured bars: width is duration, height is zone.
 * With `elapsed`, ridden time is dimmed and a cursor marks "now". With
 * `heartRate`, a heart rate line is drawn over the bars.
 */
export function RideProfile(props: {
  segments: readonly Segment[];
  elapsed?: number;
  heartRate?: HeartRateTrace | undefined;
  class?: string;
  axis?: boolean;
  label?: string;
}) {
  const timed = createMemo(() => withTimes(props.segments));
  const total = createMemo(() => Math.max(1, totalSeconds(props.segments)));
  const hrLines = createMemo(() =>
    props.heartRate ? heartRateLines(props.heartRate, total()) : [],
  );
  const description = () =>
    props.label ?? `Ride profile, ${formatClock(total())} long, ${props.segments.length} intervals`;

  return (
    <div class={cx(styles.wrap, props.class)}>
      <svg
        class={styles.svg}
        viewBox={`0 0 ${total()} 100`}
        preserveAspectRatio="none"
        role="img"
        aria-label={description()}
      >
        <For each={timed()}>
          {(s) => {
            const height = LEVEL[s.zone] * 100;
            const state = () => {
              if (props.elapsed === undefined) return 'future';
              if (s.end <= props.elapsed) return 'past';
              if (s.start <= props.elapsed) return 'current';
              return 'future';
            };
            return (
              <rect
                class={cx(styles.bar, styles[state()])}
                x={s.start}
                y={100 - height}
                width={s.seconds}
                height={height}
                fill={`var(--zone-${s.zone})`}
              />
            );
          }}
        </For>
        <For each={hrLines()}>
          {(points) => (
            <>
              <polyline class={styles.hrHalo} points={points} vector-effect="non-scaling-stroke" />
              <polyline class={styles.hrLine} points={points} vector-effect="non-scaling-stroke" />
            </>
          )}
        </For>
        <Show when={props.elapsed !== undefined}>
          <line
            class={styles.cursor}
            x1={props.elapsed}
            x2={props.elapsed}
            y1={0}
            y2={100}
            vector-effect="non-scaling-stroke"
          />
        </Show>
      </svg>
      <Show when={props.axis}>
        <div class={styles.axis} aria-hidden="true">
          <span>0:00</span>
          <span>{formatClock(total() / 2)}</span>
          <span>{formatClock(total())}</span>
        </div>
      </Show>
    </div>
  );
}
