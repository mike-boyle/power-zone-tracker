import { For } from 'solid-js';
import { cx } from '../lib/cx';
import styles from './IntensityMeter.module.css';

const LABEL = { 1: 'Gentle', 2: 'Moderate', 3: 'Hard' } as const;

export function IntensityMeter(props: { level: 1 | 2 | 3 }) {
  return (
    <span class={styles.meter}>
      <span class={styles.bars} aria-hidden="true">
        <For each={[1, 2, 3]}>
          {(n) => <span class={cx(styles.bar, n <= props.level && styles.on)} />}
        </For>
      </span>
      <span>{LABEL[props.level]}</span>
    </span>
  );
}
