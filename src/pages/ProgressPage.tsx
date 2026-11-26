import { Show, createMemo, createSignal } from 'solid-js';
import { formStatus } from '../domain/load';
import { getProgram } from '../domain/programs';
import { state } from '../state/store';
import { loadView, type LoadRange } from '../state/progress';
import { href } from '../router';
import { Page } from '../ui/Page';
import { Card, SectionTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { SegmentedControl, Toggle } from '../ui/Controls';
import { TrainingLoadChart, TrainingLoadTable } from '../components/TrainingLoadChart';
import styles from './ProgressPage.module.css';

// Module-level so the choice survives leaving and coming back.
const [range, setRange] = createSignal<LoadRange>(42);
const [showPlan, setShowPlan] = createSignal(true);

export function ProgressPage() {
  const view = createMemo(() => loadView(range(), showPlan() && !!state.plan));
  const today = () => view().days[view().todayIndex];
  const weekAgo = () => view().days[view().todayIndex - 7];
  const status = () => formStatus(today()?.form ?? 0);
  const planEnd = () => {
    const days = view().days;
    const last = days[days.length - 1];
    return last?.projected ? last : undefined;
  };

  return (
    <Page title="Progress" subtitle="Fitness, fatigue and form from the TSS of your rides.">
      <Show
        when={view().hasHistory || state.plan}
        fallback={
          <Card>
            <div class={styles.empty}>
              <p>Finish a few rides and your fitness shows up here.</p>
              <Button href={href('/programs')} variant="primary" block>
                Pick a program
              </Button>
            </div>
          </Card>
        }
      >
        <div class={styles.filters}>
          <SegmentedControl
            label="Time range"
            options={[
              { value: 42 as LoadRange, label: '6 weeks' },
              { value: 90 as LoadRange, label: '3 months' },
              { value: 'all' as LoadRange, label: 'All' },
            ]}
            value={range()}
            onChange={setRange}
          />
          <Show when={state.plan}>
            <Toggle
              label="Show the rest of my plan"
              description={`Projects ${getProgram(state.plan!.programId)?.name ?? 'your plan'} onto the calendar from tomorrow.`}
              checked={showPlan()}
              onChange={setShowPlan}
            />
          </Show>
        </div>

        <Show when={today()}>
          {(t) => (
            <div class={styles.tiles}>
              <Tile
                label="Fitness"
                value={Math.round(t().fitness)}
                delta={weekAgo() ? t().fitness - weekAgo()!.fitness : undefined}
              />
              <Tile label="Fatigue" value={Math.round(t().fatigue)} />
              <Tile label="Form" value={signedText(t().form)} note={status().label} />
            </div>
          )}
        </Show>

        <Card>
          <p class={styles.status}>
            <strong>{status().label}.</strong> {status().detail}
          </p>
        </Card>

        <Card>
          <TrainingLoadChart days={view().days} todayIndex={view().todayIndex} />
          <TrainingLoadTable days={view().days} todayIndex={view().todayIndex} />
        </Card>

        <Show when={planEnd()}>
          {(end) => (
            <p class={styles.projection}>
              If you ride the rest of the plan as written, fitness reaches about{' '}
              <strong>{Math.round(end().fitness)}</strong> (from {Math.round(today()?.fitness ?? 0)}{' '}
              today), with form at {signedText(end().form)} at the end.
            </p>
          )}
        </Show>

        <SectionTitle>What these mean</SectionTitle>
        <Card>
          <dl class={styles.glossary}>
            <div>
              <dt>Fitness</dt>
              <dd>
                Your training load averaged over about six weeks. It rises slowly as you train
                consistently, and it's the number a program is building.
              </dd>
            </div>
            <div>
              <dt>Fatigue</dt>
              <dd>
                The same over about a week. It jumps after hard days and drops quickly with rest.
              </dd>
            </div>
            <div>
              <dt>Form</dt>
              <dd>
                Fitness minus fatigue, going into the day. Between −10 and −30 means you're training
                productively; above +5 you're fresh, which suits an FTP test. Lighter weeks are
                where form comes back up.
              </dd>
            </div>
          </dl>
          <p class={styles.footnote}>
            Based on estimated TSS, so treat the numbers as a guide rather than a measurement.
          </p>
        </Card>
      </Show>
    </Page>
  );
}

function signedText(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${r}` : r < 0 ? `−${Math.abs(r)}` : '0';
}

function Tile(props: {
  label: string;
  value: number | string;
  delta?: number | undefined;
  note?: string;
}) {
  return (
    <div class={styles.tile}>
      <span class={styles.tileLabel}>{props.label}</span>
      <span class={styles.tileValue}>{props.value}</span>
      <Show when={props.delta !== undefined}>
        <span class={styles.tileNote}>{signedText(props.delta!)} this week</span>
      </Show>
      <Show when={props.note}>
        <span class={styles.tileNote}>{props.note}</span>
      </Show>
    </div>
  );
}
