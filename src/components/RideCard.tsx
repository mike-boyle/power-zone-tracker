import { Show, type JSX } from 'solid-js';
import type { Ride } from '../domain/ride';
import { TypeBadge } from '../ui/Badges';
import { cx } from '../lib/cx';
import { RideProfile } from './RideProfile';
import styles from './RideCard.module.css';

export type RideStatus = 'done' | 'skipped' | 'next' | 'partial';

export function RideCard(props: {
  ride: Ride;
  href: string;
  eyebrow?: string;
  status?: RideStatus;
  aside?: JSX.Element;
}) {
  return (
    <a class={cx(styles.card, props.status && styles[props.status])} href={props.href}>
      <div class={styles.top}>
        <TypeBadge type={props.ride.type} />
        <Show when={props.eyebrow}>
          <span class={styles.eyebrow}>{props.eyebrow}</span>
        </Show>
        <span class={styles.spacer} />
        <Show when={props.status}>{(status) => <StatusTag status={status()} />}</Show>
      </div>
      <div class={styles.titleRow}>
        <h3 class={styles.name}>{props.ride.name}</h3>
        <span class={styles.minutes}>{props.ride.minutes} min</span>
      </div>
      <RideProfile segments={props.ride.segments} class={styles.profile} />
      <div class={styles.meta}>
        <span>
          TSS <strong>{props.ride.tss}</strong>
        </span>
        {props.aside}
      </div>
    </a>
  );
}

const STATUS: Record<RideStatus, { text: string; class: string | undefined }> = {
  done: { text: 'Done', class: styles.statusDone },
  skipped: { text: 'Skipped', class: styles.statusSkipped },
  next: { text: 'Up next', class: styles.statusNext },
  partial: { text: 'Partly done', class: styles.statusPartial },
};

function StatusTag(props: { status: RideStatus }) {
  return (
    <span class={cx(styles.status, STATUS[props.status].class)}>{STATUS[props.status].text}</span>
  );
}
