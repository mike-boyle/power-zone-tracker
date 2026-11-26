import { For } from 'solid-js';
import { FEEL_OPTIONS, type Feel } from '../domain/feel';
import { cx } from '../lib/cx';
import styles from './FeelPicker.module.css';

export function FeelPicker(props: { value: Feel | undefined; onChange: (feel: Feel) => void }) {
  return (
    <div class={styles.grid} role="radiogroup" aria-label="How did that feel?">
      <For each={FEEL_OPTIONS}>
        {(option) => (
          <button
            type="button"
            role="radio"
            aria-checked={props.value === option.value}
            class={cx(
              styles.option,
              styles[option.value],
              props.value === option.value && styles.on,
            )}
            onClick={() => props.onChange(option.value)}
          >
            <span class={styles.label}>{option.label}</span>
            <span class={styles.hint}>{option.hint}</span>
          </button>
        )}
      </For>
    </div>
  );
}
