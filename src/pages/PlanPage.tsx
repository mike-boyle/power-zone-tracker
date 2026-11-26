import { For, Show, createSignal } from 'solid-js';
import { getRide } from '../domain/library';
import { plannedMinutes, plannedTss } from '../domain/plan';
import { WEEK_KIND_LABEL, getProgram } from '../domain/programs';
import { formatDate } from '../domain/format';
import {
  currentWeek,
  endProgram,
  planCounts,
  plannedStatus,
  state,
  weekRiddenTss,
} from '../state/store';
import type { ActivePlan } from '../state/types';
import { href, rideHref } from '../router';
import { Page } from '../ui/Page';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { PlanRideRow } from '../components/PlanRideRow';
import { WeeklyLoadChart } from '../components/WeeklyLoadChart';
import styles from './PlanPage.module.css';

export function PlanPage() {
  return (
    <Show
      when={state.plan}
      fallback={
        <Page title="Plan">
          <Card>
            <div class={styles.empty}>
              <h2>No program yet</h2>
              <p class={styles.muted}>Pick a program and the plan for every week shows up here.</p>
              <Button href={href('/programs')} variant="primary" size="lg" block>
                Browse programs
              </Button>
            </div>
          </Card>
        </Page>
      }
    >
      {(plan) => <PlanView plan={plan()} />}
    </Show>
  );
}

function hours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

function PlanView(props: { plan: ActivePlan }) {
  const [confirmEnd, setConfirmEnd] = createSignal(false);
  const program = () => getProgram(props.plan.programId);
  const counts = () => planCounts(props.plan);
  const now = () => currentWeek(props.plan);
  const riddenTotal = () =>
    props.plan.weeks.reduce((sum, w) => sum + weekRiddenTss(props.plan, w.number), 0);

  return (
    <Page
      title={program()?.name ?? 'Plan'}
      subtitle={`${props.plan.daysPerWeek} rides a week · started ${formatDate(props.plan.startedAt)}`}
      action={
        <Button href={href('/programs')} size="sm">
          Change
        </Button>
      }
    >
      <Card>
        <div class={styles.summary}>
          <WeeklyLoadChart
            weeks={props.plan.weeks.map((w) => ({
              number: w.number,
              kind: w.kind,
              planned: plannedTss(w),
              ridden: weekRiddenTss(props.plan, w.number),
            }))}
            current={now()}
          />
          <div class={styles.legendRow}>
            <span class={styles.legendItem}>
              <span class={styles.swatchPlanned} /> Planned TSS
            </span>
            <span class={styles.legendItem}>
              <span class={styles.swatchRidden} /> Ridden
            </span>
          </div>
          <dl class={styles.stats}>
            <div>
              <dt>Rides done</dt>
              <dd>
                {counts().done}
                <span class={styles.of}>/{counts().total}</span>
              </dd>
            </div>
            <div>
              <dt>TSS ridden</dt>
              <dd>{riddenTotal()}</dd>
            </div>
            <div>
              <dt>Skipped</dt>
              <dd>{counts().skipped}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <For each={props.plan.weeks}>
        {(week) => {
          const statuses = () =>
            week.rides.map((_, i) => plannedStatus(props.plan, week.number, i));
          const finished = () => statuses().every((s) => s !== 'todo' && s !== 'next');
          return (
            <details class={styles.week} open={week.number >= now()}>
              <summary class={styles.weekHead}>
                <span class={styles.weekTitle}>
                  Week {week.number}
                  <span class={styles.kind}>
                    {WEEK_KIND_LABEL[week.kind]}
                    {week.hasTest ? ' + test' : ''}
                  </span>
                </span>
                <span class={styles.weekMeta}>
                  <Show when={finished()}>
                    <span class={styles.check} aria-label="Week complete">
                      ✓
                    </span>
                  </Show>
                  {plannedTss(week)} TSS · {hours(plannedMinutes(week))}
                </span>
              </summary>
              <div class={styles.rides}>
                <For each={week.rides}>
                  {(planned, index) => (
                    <Show when={getRide(planned.rideId)}>
                      {(ride) => (
                        <PlanRideRow
                          ride={ride()}
                          href={href(rideHref(ride().id, week.number, index()))}
                          status={statuses()[index()]!}
                        />
                      )}
                    </Show>
                  )}
                </For>
              </div>
            </details>
          );
        }}
      </For>

      <Button variant="danger" block onClick={() => setConfirmEnd(true)}>
        End program
      </Button>

      <Dialog
        open={confirmEnd()}
        onClose={() => setConfirmEnd(false)}
        title={`End ${program()?.name ?? 'this program'}?`}
        actions={
          <>
            <Button
              variant="danger"
              size="lg"
              block
              onClick={() => {
                setConfirmEnd(false);
                endProgram();
              }}
            >
              End program
            </Button>
            <Button variant="ghost" block onClick={() => setConfirmEnd(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <p>The plan and its progress are cleared. Your ride history and FTP are kept.</p>
      </Dialog>
    </Page>
  );
}
