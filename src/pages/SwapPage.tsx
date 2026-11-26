import { For, Show, createMemo, createSignal } from 'solid-js';
import { getRide } from '../domain/library';
import { RIDE_TYPE_LABEL, type Ride } from '../domain/ride';
import { canSwap, swapOptions, type SwapMode } from '../domain/swap';
import { state, swapPlannedRide } from '../state/store';
import { navigate, rideHref } from '../router';
import { Page } from '../ui/Page';
import { SegmentedControl } from '../ui/Controls';
import { RideCard } from '../components/RideCard';
import { NotFoundPage } from './NotFoundPage';
import styles from './SwapPage.module.css';

const MODE_HINT: Record<SwapMode, string> = {
  similar: 'Same kind of ride with about the same training stress.',
  shorter: 'Same kind of ride when you have less time. Longest first.',
  any: 'Any kind of ride, closest training stress first.',
};

export function SwapPage(props: { week: number; index: number }) {
  const planned = () => state.plan?.weeks[props.week - 1]?.rides[props.index];
  const current = () => {
    const p = planned();
    return p ? getRide(p.rideId) : undefined;
  };
  return (
    <Show when={current()} keyed fallback={<NotFoundPage />}>
      {(ride) => (
        <Swap
          ride={ride}
          week={props.week}
          index={props.index}
          original={planned()?.originalRideId ? getRide(planned()!.originalRideId!) : undefined}
        />
      )}
    </Show>
  );
}

function Swap(props: { ride: Ride; week: number; index: number; original: Ride | undefined }) {
  const [mode, setMode] = createSignal<SwapMode>('similar');
  const options = createMemo(() => swapOptions(props.ride, mode()));

  const choose = (ride: Ride) => {
    swapPlannedRide(props.week, props.index, ride.id);
    // Replace the swap screen so Back goes to wherever the rider came from.
    navigate(rideHref(ride.id, props.week, props.index), { replace: true });
  };

  return (
    <Show
      when={canSwap(props.ride)}
      fallback={
        <Page title="Swap ride" back="/plan">
          <p class={styles.muted}>
            FTP tests can't be swapped. To drop tests, start the program again with them switched
            off, or skip this one.
          </p>
        </Page>
      }
    >
      <Page
        title="Swap ride"
        subtitle={`Week ${props.week} · Ride ${props.index + 1} · ${props.ride.name}, ${props.ride.minutes} min, TSS ${props.ride.tss}`}
        back={rideHref(props.ride.id, props.week, props.index)}
      >
        <Show when={props.original}>
          {(original) => (
            <RideCard
              ride={original()}
              eyebrow="Originally planned"
              onSelect={() => choose(original())}
              aside={<span class={styles.restore}>Restore</span>}
            />
          )}
        </Show>

        <SegmentedControl
          label="Kind of swap"
          options={[
            { value: 'similar', label: 'Similar' },
            { value: 'shorter', label: 'Shorter' },
            { value: 'any', label: 'Any type' },
          ]}
          value={mode()}
          onChange={setMode}
        />
        <p class={styles.muted}>{MODE_HINT[mode()]}</p>

        <Show
          when={options().length > 0}
          fallback={
            <p class={styles.empty}>
              {mode() === 'shorter'
                ? `This is already the shortest ${RIDE_TYPE_LABEL[props.ride.type].toLowerCase()} ride.`
                : 'Nothing close enough. Try Any type.'}
            </p>
          }
        >
          <For each={options()}>
            {(ride) => (
              <RideCard
                ride={ride}
                onSelect={() => choose(ride)}
                aside={<TssDelta from={props.ride.tss} to={ride.tss} />}
              />
            )}
          </For>
        </Show>
      </Page>
    </Show>
  );
}

function TssDelta(props: { from: number; to: number }) {
  const diff = () => props.to - props.from;
  return (
    <span class={styles.delta}>
      {diff() === 0 ? 'Same TSS' : `${diff() > 0 ? '+' : '−'}${Math.abs(diff())} TSS`}
    </span>
  );
}
