import { For, Show, createEffect, createMemo } from 'solid-js';
import { withTimes, type Phase, type Segment, type TimedSegment } from '../domain/ride';
import { formatClock, formatDuration } from '../domain/format';
import { ZONE_INFO, formatWattRange, wattRange } from '../domain/zones';
import { ZoneChip } from '../ui/Badges';
import { cx } from '../lib/cx';
import styles from './IntervalList.module.css';

const PHASE_LABEL: Record<Phase, string> = {
  warmup: 'Warm-up',
  main: 'Main set',
  cooldown: 'Cool-down',
};

/**
 * Every interval in a ride, grouped by phase, with watt targets. In the
 * player, `currentIndex` highlights the live interval and keeps it in view.
 */
export function IntervalList(props: {
  segments: readonly Segment[];
  ftp: number | null;
  currentIndex?: number;
  onSelect?: (segment: TimedSegment) => void;
  compact?: boolean;
}) {
  const groups = createMemo(() => {
    const out: { phase: Phase; items: TimedSegment[] }[] = [];
    for (const s of withTimes(props.segments)) {
      const last = out[out.length - 1];
      if (last && last.phase === s.phase) last.items.push(s);
      else out.push({ phase: s.phase, items: [s] });
    }
    return out;
  });

  let list: HTMLDivElement | undefined;
  createEffect(() => {
    const index = props.currentIndex;
    if (index === undefined || !list) return;
    const row = list.querySelector<HTMLElement>(`[data-index="${index}"]`);
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  return (
    <div class={cx(styles.list, props.compact && styles.compact)} ref={list}>
      <For each={groups()}>
        {(group) => (
          <section class={styles.group}>
            <h3 class={styles.phase}>{PHASE_LABEL[group.phase]}</h3>
            <ol class={styles.rows}>
              <For each={group.items}>
                {(s) => {
                  const state = () => {
                    if (props.currentIndex === undefined) return undefined;
                    if (s.index < props.currentIndex) return 'past';
                    if (s.index === props.currentIndex) return 'current';
                    return 'future';
                  };
                  const watts = () =>
                    s.test || props.ftp === null
                      ? null
                      : formatWattRange(wattRange(props.ftp, s.zone));
                  return (
                    <li
                      class={cx(styles.row, state() && styles[state()!])}
                      data-index={s.index}
                      aria-current={state() === 'current' ? 'step' : undefined}
                    >
                      <span class={styles.start}>{formatClock(s.start)}</span>
                      <ZoneChip zone={s.zone} test={s.test} size="sm" />
                      <span class={styles.name}>
                        {s.test ? 'FTP test' : ZONE_INFO[s.zone].name}
                        <Show when={s.label}>
                          <span class={styles.cue}>{s.label}</span>
                        </Show>
                      </span>
                      <span class={styles.right}>
                        <span class={styles.duration}>{formatDuration(s.seconds)}</span>
                        <Show when={watts()}>
                          {(w) => <span class={styles.watts}>{w()} W</span>}
                        </Show>
                      </span>
                    </li>
                  );
                }}
              </For>
            </ol>
          </section>
        )}
      </For>
    </div>
  );
}
