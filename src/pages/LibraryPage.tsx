import { For, Show, createMemo, createSignal, type JSX } from 'solid-js';
import { RIDES } from '../domain/library';
import { RIDE_TYPE_LABEL, type RideType } from '../domain/ride';
import { ZONES } from '../domain/zones';
import { href, rideHref } from '../router';
import { Page } from '../ui/Page';
import { cx } from '../lib/cx';
import { RideCard } from '../components/RideCard';
import styles from './LibraryPage.module.css';

const TYPE_ORDER: RideType[] = ['endurance', 'power', 'max', 'recovery', 'test'];
const LENGTHS = [20, 30, 45, 60, 75, 90] as const;

// Module-level so filters survive leaving and coming back to the page.
const [type, setType] = createSignal<RideType | 'all'>('all');
const [length, setLength] = createSignal<number | 'any'>('any');

export function LibraryPage() {
  const rides = createMemo(() =>
    RIDES.filter((r) => type() === 'all' || r.type === type())
      .filter((r) => length() === 'any' || r.minutes === length())
      .slice()
      .sort(
        (a, b) =>
          TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
          a.minutes - b.minutes ||
          a.tss - b.tss,
      ),
  );

  return (
    <Page title="Rides" subtitle={`${RIDES.length} structured rides, 20 to 90 minutes.`}>
      <div class={styles.filters}>
        <div class={styles.chips} role="group" aria-label="Ride type">
          <Chip on={type() === 'all'} onClick={() => setType('all')}>
            All
          </Chip>
          <For each={TYPE_ORDER}>
            {(t) => (
              <Chip on={type() === t} onClick={() => setType(t)} color={`var(--type-${t})`}>
                {RIDE_TYPE_LABEL[t]}
              </Chip>
            )}
          </For>
        </div>
        <div class={styles.chips} role="group" aria-label="Length">
          <Chip on={length() === 'any'} onClick={() => setLength('any')}>
            Any length
          </Chip>
          <For each={LENGTHS}>
            {(m) => (
              <Chip on={length() === m} onClick={() => setLength(m)}>
                {m} min
              </Chip>
            )}
          </For>
        </div>
      </div>

      <p class={styles.count} aria-live="polite">
        {rides().length} {rides().length === 1 ? 'ride' : 'rides'}
      </p>

      <Show
        when={rides().length > 0}
        fallback={<p class={styles.empty}>No rides match. Try another length.</p>}
      >
        <For each={rides()}>
          {(ride) => (
            <RideCard
              ride={ride}
              href={href(rideHref(ride.id))}
              aside={
                <span class={styles.zones}>
                  <For
                    each={ZONES.filter((z) =>
                      ride.segments.some((s) => s.phase === 'main' && s.zone === z),
                    )}
                  >
                    {(z) => (
                      <span
                        class={styles.zoneDot}
                        style={{ background: `var(--zone-${z})` }}
                        title={`Zone ${z}`}
                      />
                    )}
                  </For>
                </span>
              }
            />
          )}
        </For>
      </Show>
    </Page>
  );
}

function Chip(props: { on: boolean; onClick: () => void; color?: string; children: JSX.Element }) {
  return (
    <button
      type="button"
      class={cx(styles.chip, props.on && styles.chipOn)}
      aria-pressed={props.on}
      onClick={() => props.onClick()}
    >
      <Show when={props.color}>
        <span class={styles.chipDot} style={{ background: props.color }} />
      </Show>
      {props.children}
    </button>
  );
}
