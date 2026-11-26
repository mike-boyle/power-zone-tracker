import { Match, Switch } from 'solid-js';
import type { Ride } from '../domain/ride';
import { TypeBadge } from '../ui/Badges';
import { cx } from '../lib/cx';
import styles from './PlanRideRow.module.css';

export type RowStatus = 'done' | 'partial' | 'skipped' | 'next' | 'todo';

/** Compact row for a planned ride: status, type, name, length and TSS. */
export function PlanRideRow(props: { ride: Ride; href: string; status: RowStatus }) {
  const statusText = () =>
    ({
      done: 'Done',
      partial: 'Partly done',
      skipped: 'Skipped',
      next: 'Up next',
      todo: 'To do',
    })[props.status];
  return (
    <a class={cx(styles.row, styles[props.status])} href={props.href}>
      <span class={styles.icon} role="img" aria-label={statusText()}>
        <Switch fallback={<span class={styles.circle} />}>
          <Match when={props.status === 'done' || props.status === 'partial'}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="10" r="9" fill="currentColor" />
              <path
                d="M6 10.5l2.5 2.5L14 7.5"
                fill="none"
                stroke="var(--color-surface)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </Match>
          <Match when={props.status === 'skipped'}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle
                cx="10"
                cy="10"
                r="8.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path d="M6 10h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </Match>
          <Match when={props.status === 'next'}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="10" r="9" fill="currentColor" />
              <path d="M8 6.5v7l5.5-3.5z" fill="var(--color-surface)" />
            </svg>
          </Match>
        </Switch>
      </span>
      <TypeBadge type={props.ride.type} />
      <span class={styles.name}>{props.ride.name}</span>
      <span class={styles.meta}>
        {props.ride.minutes}m · {props.ride.tss}
      </span>
    </a>
  );
}
