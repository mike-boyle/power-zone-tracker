import { Show, createMemo } from 'solid-js';
import { getRide } from '../domain/library';
import { RIDE_TYPE_LABEL, type Ride } from '../domain/ride';
import { intensityFactor } from '../domain/tss';
import { plannedStatus, setSkipped, state } from '../state/store';
import type { PlanRef } from '../state/types';
import { href, swapHref } from '../router';
import { canSwap } from '../domain/swap';
import { Page } from '../ui/Page';
import { Card, SectionTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Meta, TypeBadge } from '../ui/Badges';
import { RideProfile } from '../components/RideProfile';
import { TimeInZones } from '../components/TimeInZones';
import { IntervalList } from '../components/IntervalList';
import { StartRideButton } from '../components/StartRideButton';
import { NotFoundPage } from './NotFoundPage';
import styles from './RideDetailPage.module.css';

export function RideDetailPage(props: { id: string; week?: number; index?: number }) {
  return (
    <Show when={getRide(props.id)} fallback={<NotFoundPage />}>
      {(ride) => <Detail ride={ride()} week={props.week} index={props.index} />}
    </Show>
  );
}

function Detail(props: { ride: Ride; week?: number | undefined; index?: number | undefined }) {
  /** Only treat this as a plan ride if the plan really has this ride in that slot. */
  const planRef = createMemo((): PlanRef | undefined => {
    const plan = state.plan;
    if (!plan || props.week === undefined || props.index === undefined) return undefined;
    const planned = plan.weeks[props.week - 1]?.rides[props.index];
    if (planned?.rideId !== props.ride.id) return undefined;
    return { planId: plan.id, week: props.week, index: props.index };
  });
  const status = () => {
    const ref = planRef();
    return ref && state.plan ? plannedStatus(state.plan, ref.week, ref.index) : undefined;
  };
  const swappedFrom = () => {
    const ref = planRef();
    const original = ref && state.plan?.weeks[ref.week - 1]?.rides[ref.index]?.originalRideId;
    return original ? getRide(original) : undefined;
  };
  const subtitle = () => {
    const ref = planRef();
    const count = ref ? state.plan?.weeks[ref.week - 1]?.rides.length : undefined;
    return ref
      ? `Week ${ref.week} · Ride ${ref.index + 1} of ${count}`
      : RIDE_TYPE_LABEL[props.ride.type];
  };

  return (
    <Page
      title={props.ride.name}
      subtitle={subtitle()}
      back={planRef() ? '/plan' : '/library'}
      footer={
        <>
          <StartRideButton
            rideId={props.ride.id}
            planRef={planRef()}
            label={status() === 'done' || status() === 'partial' ? 'Ride it again' : 'Ride this'}
          />
          <Show when={planRef()}>
            {(ref) => (
              <div class={styles.secondary}>
                <Show when={canSwap(props.ride) && status() !== 'done' && status() !== 'partial'}>
                  <Button variant="ghost" block href={href(swapHref(ref().week, ref().index))}>
                    Swap
                  </Button>
                </Show>
                <Show when={status() === 'next' || status() === 'todo'}>
                  <Button
                    variant="ghost"
                    block
                    onClick={() => setSkipped(ref().week, ref().index, true)}
                  >
                    Skip
                  </Button>
                </Show>
                <Show when={status() === 'skipped'}>
                  <Button
                    variant="ghost"
                    block
                    onClick={() => setSkipped(ref().week, ref().index, false)}
                  >
                    Un-skip
                  </Button>
                </Show>
              </div>
            )}
          </Show>
        </>
      }
    >
      <div class={styles.meta}>
        <TypeBadge type={props.ride.type} long />
        <Meta label="min" value={props.ride.minutes} />
        <Meta label="TSS" value={props.ride.tss} />
        <Meta label="IF" value={intensityFactor(props.ride.segments).toFixed(2)} />
      </div>

      <Card>
        <div class={styles.visuals}>
          <RideProfile segments={props.ride.segments} axis class={styles.profile} />
          <TimeInZones segments={props.ride.segments} />
        </div>
      </Card>

      <p class={styles.description}>{props.ride.description}</p>

      <Show when={swappedFrom()}>
        {(original) => (
          <p class={styles.notice}>
            Swapped in for {original().name} ({original().minutes} min).{' '}
            <a href={href(swapHref(planRef()!.week, planRef()!.index))}>Change</a>
          </p>
        )}
      </Show>

      <Show when={props.ride.type === 'test'}>
        <Card>
          <div class={styles.testTips}>
            <h2>How the test works</h2>
            <ol>
              <li>Warm up as prompted, including the short opener.</li>
              <li>
                Ride the 20-minute effort as hard as you can <em>evenly</em>. Start a little
                conservative and build in the last five minutes.
              </li>
              <li>
                Note your bike's total output (kJ) when the effort starts and ends, or its average
                output for the 20 minutes.
              </li>
              <li>Enter it when you finish. Your FTP is 95% of the 20-minute average.</li>
            </ol>
          </div>
        </Card>
      </Show>

      <Show when={state.settings.ftp === null && props.ride.type !== 'test'}>
        <Card>
          <p class={styles.notice}>
            Set your FTP to see a watt range for each interval. <a href={href('/you')}>Set FTP</a>
          </p>
        </Card>
      </Show>

      <SectionTitle>Intervals</SectionTitle>
      <Card>
        <IntervalList segments={props.ride.segments} ftp={state.settings.ftp} />
      </Card>
    </Page>
  );
}
