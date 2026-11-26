import { RIDE_TYPE_LABEL, RIDE_TYPE_SHORT, type RideType } from '../domain/ride';
import type { Zone } from '../domain/zones';
import { cx } from '../lib/cx';
import styles from './Badges.module.css';

export function TypeBadge(props: { type: RideType; long?: boolean }) {
  return (
    <span class={styles.type} style={{ '--badge-color': `var(--type-${props.type})` }}>
      <span class={styles.dot} aria-hidden="true" />
      {props.long ? RIDE_TYPE_LABEL[props.type] : RIDE_TYPE_SHORT[props.type]}
    </span>
  );
}

export function ZoneChip(props: { zone: Zone; size?: 'sm' | 'md'; test?: boolean }) {
  return (
    <span
      class={cx(styles.zone, props.size === 'sm' && styles.zoneSm)}
      style={{
        background: `var(--zone-${props.zone})`,
        color: `var(--zone-${props.zone}-ink)`,
      }}
    >
      {props.test ? 'FTP' : `Z${props.zone}`}
    </span>
  );
}

/** Small "label value" pair used in ride metadata rows. */
export function Meta(props: { label: string; value: string | number }) {
  return (
    <span class={styles.meta}>
      <span class={styles.metaValue}>{props.value}</span>
      <span class={styles.metaLabel}>{props.label}</span>
    </span>
  );
}
