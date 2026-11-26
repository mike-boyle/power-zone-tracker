import { For, Show, createMemo } from 'solid-js';
import { FTP_TEST_RIDE_ID, getRide } from '../domain/library';
import { plannedTss } from '../domain/plan';
import { PROGRAMS, WEEK_KIND_LABEL, getProgram } from '../domain/programs';
import { formatClock } from '../domain/format';
import {
  currentWeek,
  nextPlanned,
  planCounts,
  plannedStatus,
  setSkipped,
  state,
  weekRiddenTss,
} from '../state/store';
import type { ActivePlan } from '../state/types';
import { href, rideHref } from '../router';
import { Page } from '../ui/Page';
import { Card, SectionTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { FtpForm } from '../components/FtpForm';
import { RideCard } from '../components/RideCard';
import { PlanRideRow } from '../components/PlanRideRow';
import { StartRideButton } from '../components/StartRideButton';
import { WeeklyLoadChart } from '../components/WeeklyLoadChart';
import styles from './TodayPage.module.css';

export function TodayPage() {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Page title="Today" subtitle={today}>
      <Show when={state.settings.ftp === null}>
        <Card>
          <div class={styles.stack}>
            <h2 class={styles.cardTitle}>Set your FTP</h2>
            <p class={styles.muted}>
              Every zone's watt range comes from your FTP. Enter your last known number, or take the
              test first.
            </p>
            <FtpForm />
            <a class={styles.inlineLink} href={href(rideHref(FTP_TEST_RIDE_ID))}>
              Don't know it? Take the 20-minute FTP test →
            </a>
          </div>
        </Card>
      </Show>

      <Show when={state.plan} fallback={<NoPlan />}>
        {(plan) => <PlanToday plan={plan()} />}
      </Show>

      <RecentRides />
    </Page>
  );
}

function NoPlan() {
  return (
    <>
      <Card>
        <div class={styles.stack}>
          <h2 class={styles.cardTitle}>Pick a program</h2>
          <p class={styles.muted}>
            Choose a plan that fits where you are, and how many days a week you can ride. Each
            builds in 4-week blocks and tells you exactly what to ride next.
          </p>
          <Button href={href('/programs')} variant="primary" size="lg" block>
            Browse programs
          </Button>
        </div>
      </Card>
      <SectionTitle>Programs</SectionTitle>
      <div class={styles.programList}>
        <For each={PROGRAMS}>
          {(program) => (
            <Card href={href(`/programs/${program.id}`)}>
              <div class={styles.programRow}>
                <div>
                  <h3 class={styles.programName}>{program.name}</h3>
                  <p class={styles.muted}>{program.tagline}</p>
                </div>
                <span class={styles.weeks}>{program.weeks} wk</span>
              </div>
            </Card>
          )}
        </For>
      </div>
      <Button href={href('/library')} variant="ghost" block>
        Or just pick a ride
      </Button>
    </>
  );
}

function PlanToday(props: { plan: ActivePlan }) {
  const program = () => getProgram(props.plan.programId);
  const next = createMemo(() => nextPlanned(props.plan));
  const counts = () => planCounts(props.plan);
  const weekNumber = () => currentWeek(props.plan);
  const week = () => props.plan.weeks[weekNumber() - 1];
  const nextRide = () => {
    const n = next();
    return n ? getRide(n.planned.rideId) : undefined;
  };
  const bars = () =>
    props.plan.weeks.map((w) => ({
      number: w.number,
      kind: w.kind,
      planned: plannedTss(w),
      ridden: weekRiddenTss(props.plan, w.number),
    }));

  return (
    <>
      <Card href={href('/plan')} aria-label="Open plan">
        <div class={styles.stack}>
          <div class={styles.planHead}>
            <div>
              <p class={styles.eyebrow}>{program()?.name}</p>
              <h2 class={styles.cardTitle}>
                Week {weekNumber()} of {props.plan.weeks.length}
                <Show when={week()}>
                  {(w) => <span class={styles.kind}> · {WEEK_KIND_LABEL[w().kind]}</span>}
                </Show>
              </h2>
            </div>
            <span class={styles.count}>
              {counts().done}/{counts().total}
              <span class={styles.countLabel}>rides</span>
            </span>
          </div>
          <WeeklyLoadChart weeks={bars()} current={weekNumber()} compact />
        </div>
      </Card>

      <Show
        when={next() && nextRide()}
        fallback={
          <Card>
            <div class={styles.stack}>
              <h2 class={styles.cardTitle}>Program complete</h2>
              <p class={styles.muted}>
                Every ride in {program()?.name} is done or skipped. Great work. Pick your next
                program when you're ready.
              </p>
              <Button href={href('/programs')} variant="primary" size="lg" block>
                Choose next program
              </Button>
            </div>
          </Card>
        }
      >
        {(ride) => {
          const n = () => next()!;
          const ref = () => ({ planId: props.plan.id, week: n().week, index: n().index });
          const eyebrow = () =>
            `Week ${n().week} · Ride ${n().index + 1} of ${props.plan.weeks[n().week - 1]?.rides.length}`;
          return (
            <>
              <SectionTitle>Up next</SectionTitle>
              <RideCard
                ride={ride()}
                href={href(rideHref(ride().id, n().week, n().index))}
                eyebrow={eyebrow()}
              />
              <div class={styles.actions}>
                <StartRideButton rideId={ride().id} planRef={ref()} label="Start ride" />
                <Button variant="ghost" block onClick={() => setSkipped(n().week, n().index, true)}>
                  Skip this one
                </Button>
              </div>
            </>
          );
        }}
      </Show>

      <Show when={week()}>
        {(w) => (
          <>
            <SectionTitle action={<span class={styles.muted}>{plannedTss(w())} TSS</span>}>
              This week
            </SectionTitle>
            <Card>
              <For each={w().rides}>
                {(planned, index) => (
                  <Show when={getRide(planned.rideId)}>
                    {(ride) => (
                      <PlanRideRow
                        ride={ride()}
                        href={href(rideHref(ride().id, w().number, index()))}
                        status={plannedStatus(props.plan, w().number, index())}
                      />
                    )}
                  </Show>
                )}
              </For>
            </Card>
          </>
        )}
      </Show>
    </>
  );
}

function RecentRides() {
  const recent = () => [...state.history].reverse().slice(0, 3);
  return (
    <Show when={recent().length > 0}>
      <SectionTitle action={<a href={href('/you')}>All</a>}>Recent</SectionTitle>
      <Card>
        <For each={recent()}>
          {(record) => (
            <Show when={getRide(record.rideId)}>
              {(ride) => (
                <a class={styles.recent} href={href(`/summary/${record.id}`)}>
                  <span class={styles.recentName}>{ride().name}</span>
                  <span class={styles.muted}>
                    {new Date(record.finishedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    · {formatClock(record.seconds)} · {record.tss} TSS
                  </span>
                </a>
              )}
            </Show>
          )}
        </For>
      </Card>
    </Show>
  );
}
