import { For, createUniqueId, type JSX } from 'solid-js';
import { cx } from '../lib/cx';
import styles from './Controls.module.css';

export function SegmentedControl<T extends string | number>(props: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  class?: string;
}) {
  return (
    <div class={cx(styles.segmented, props.class)} role="radiogroup" aria-label={props.label}>
      <For each={props.options}>
        {(option) => (
          <button
            type="button"
            role="radio"
            aria-checked={option.value === props.value}
            class={cx(styles.segment, option.value === props.value && styles.segmentOn)}
            onClick={() => props.onChange(option.value)}
          >
            {option.label}
          </button>
        )}
      </For>
    </div>
  );
}

export function Toggle(props: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = createUniqueId();
  return (
    <label class={styles.toggleRow} for={id}>
      <span class={styles.toggleText}>
        <span class={styles.toggleLabel} id={`${id}-label`}>
          {props.label}
        </span>
        {props.description && (
          <span class={styles.toggleDescription} id={`${id}-description`}>
            {props.description}
          </span>
        )}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-labelledby={`${id}-label`}
        aria-describedby={props.description ? `${id}-description` : undefined}
        class={styles.switch}
        checked={props.checked}
        onChange={(e) => props.onChange(e.currentTarget.checked)}
      />
    </label>
  );
}

export function Field(props: {
  label: string;
  hint?: JSX.Element;
  children: (id: string) => JSX.Element;
}) {
  const id = createUniqueId();
  return (
    <div class={styles.field}>
      <label class={styles.fieldLabel} for={id}>
        {props.label}
      </label>
      {props.children(id)}
      {props.hint && <p class={styles.fieldHint}>{props.hint}</p>}
    </div>
  );
}

export function NumberInput(props: {
  id?: string;
  value: string;
  onInput: (value: string) => void;
  suffix?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  'aria-label'?: string;
  autofocus?: boolean;
}) {
  return (
    <div class={styles.numberWrap}>
      <input
        id={props.id}
        class={styles.number}
        type="number"
        inputmode="numeric"
        pattern="[0-9]*"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        placeholder={props.placeholder}
        value={props.value}
        aria-label={props['aria-label']}
        autofocus={props.autofocus}
        onInput={(e) => props.onInput(e.currentTarget.value)}
      />
      {props.suffix && <span class={styles.suffix}>{props.suffix}</span>}
    </div>
  );
}
