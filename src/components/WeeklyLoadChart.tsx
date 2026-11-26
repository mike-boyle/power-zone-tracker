import { For, createMemo } from 'solid-js';
import type { WeekKind } from '../domain/programs';
import { WEEK_KIND_LABEL } from '../domain/programs';
import { cx } from '../lib/cx';
import styles from './WeeklyLoadChart.module.css';

export interface WeekBar {
  number: number;
  kind: WeekKind;
  planned: number;
  ridden?: number;
}

/**
 * One bar per week, height = planned TSS. Ridden TSS fills the bar from the
 * bottom. Shows the 4-week block shape at a glance.
 */
export function WeeklyLoadChart(props: {
  weeks: readonly WeekBar[];
  current?: number;
  compact?: boolean;
}) {
  const max = createMemo(() => Math.max(1, ...props.weeks.map((w) => w.planned)));
  return (
    <div class={cx(styles.chart, props.compact && styles.compact)}>
      <ol class={styles.bars} aria-label="Planned training stress by week">
        <For each={props.weeks}>
          {(week) => {
            const ridden = () => Math.min(week.ridden ?? 0, week.planned);
            return (
              <li
                class={cx(
                  styles.week,
                  styles[week.kind],
                  props.current === week.number && styles.current,
                )}
                aria-label={`Week ${week.number}, ${WEEK_KIND_LABEL[week.kind]}: ${week.planned} TSS planned${
                  week.ridden ? `, ${week.ridden} ridden` : ''
                }`}
              >
                <span class={styles.track}>
                  <span
                    class={styles.planned}
                    style={{ height: `${(week.planned / max()) * 100}%` }}
                  >
                    <span
                      class={styles.ridden}
                      style={{ height: `${week.planned ? (ridden() / week.planned) * 100 : 0}%` }}
                    />
                  </span>
                </span>
                <span class={styles.label}>{week.number}</span>
              </li>
            );
          }}
        </For>
      </ol>
    </div>
  );
}
