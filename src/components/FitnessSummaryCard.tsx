import { Show, createMemo } from 'solid-js';
import { formStatus } from '../domain/load';
import { currentLoad } from '../state/progress';
import { state } from '../state/store';
import { href } from '../router';
import { Card } from '../ui/Card';
import styles from './FitnessSummaryCard.module.css';

function signed(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${r}` : r < 0 ? `−${Math.abs(r)}` : '0';
}

/** Today's fitness, fatigue and form at a glance, linking to the Progress page. */
export function FitnessSummaryCard() {
  // Recompute when history changes.
  const load = createMemo(() => (state.history.length ? currentLoad() : null));
  return (
    <Show when={load()?.hasHistory ? load() : null}>
      {(l) => (
        <Card href={href('/progress')} aria-label="Open progress">
          <div class={styles.row}>
            <div class={styles.stat}>
              <span class={styles.value}>{Math.round(l().fitness)}</span>
              <span class={styles.label}>
                Fitness
                <Show when={l().fitnessChange !== null && Math.round(l().fitnessChange!) !== 0}>
                  {' '}
                  {signed(l().fitnessChange!)}
                </Show>
              </span>
            </div>
            <div class={styles.stat}>
              <span class={styles.value}>{Math.round(l().fatigue)}</span>
              <span class={styles.label}>Fatigue</span>
            </div>
            <div class={styles.stat}>
              <span class={styles.value}>{signed(l().form)}</span>
              <span class={styles.label}>Form · {formStatus(l().form).label}</span>
            </div>
            <span class={styles.chevron} aria-hidden="true">
              ›
            </span>
          </div>
        </Card>
      )}
    </Show>
  );
}
