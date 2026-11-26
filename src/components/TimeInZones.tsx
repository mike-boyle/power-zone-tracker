import { For, Show, createMemo } from 'solid-js';
import { timeInZones, type Segment } from '../domain/ride';
import { ZONES } from '../domain/zones';
import { formatClock } from '../domain/format';
import styles from './TimeInZones.module.css';

/** Stacked bar of time per zone, plus a legend of the zones that appear. */
export function TimeInZones(props: { segments: readonly Segment[]; upTo?: number }) {
  const totals = createMemo(() => {
    if (props.upTo === undefined) return timeInZones(props.segments);
    // Only count what has been ridden.
    let remaining = props.upTo;
    const ridden: Segment[] = [];
    for (const s of props.segments) {
      if (remaining <= 0) break;
      ridden.push({ ...s, seconds: Math.min(s.seconds, remaining) });
      remaining -= s.seconds;
    }
    return timeInZones(ridden);
  });
  const sum = createMemo(() => ZONES.reduce((a, z) => a + totals()[z], 0) || 1);
  const present = createMemo(() => ZONES.filter((z) => totals()[z] > 0));

  return (
    <div class={styles.wrap}>
      <div class={styles.bar} role="img" aria-label="Time in each zone">
        <For each={present()}>
          {(zone) => (
            <span
              class={styles.part}
              style={{
                width: `${(totals()[zone] / sum()) * 100}%`,
                background: `var(--zone-${zone})`,
              }}
            />
          )}
        </For>
      </div>
      <ul class={styles.legend}>
        <For each={present()}>
          {(zone) => (
            <li>
              <span class={styles.swatch} style={{ background: `var(--zone-${zone})` }} />
              <span class={styles.zone}>Z{zone}</span>
              <span class={styles.time}>{formatClock(totals()[zone])}</span>
            </li>
          )}
        </For>
        <Show when={present().length === 0}>
          <li class={styles.time}>Nothing ridden yet</li>
        </Show>
      </ul>
    </div>
  );
}
