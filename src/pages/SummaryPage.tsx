import { Show, createMemo, createSignal } from 'solid-js';
import { FTP_TEST_SECONDS, getRide } from '../domain/library';
import type { Ride } from '../domain/ride';
import { formatClock } from '../domain/format';
import { averageWattsFromKj, ftpFromTwentyMinute } from '../domain/zones';
import { deleteRecord, getRecord, nextPlanned, saveTestResult, state } from '../state/store';
import type { RideRecord } from '../state/types';
import { href, navigate, rideHref } from '../router';
import { Page } from '../ui/Page';
import { Card, SectionTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Field, NumberInput, SegmentedControl } from '../ui/Controls';
import { RideProfile } from '../components/RideProfile';
import { TimeInZones } from '../components/TimeInZones';
import { RideCard } from '../components/RideCard';
import { NotFoundPage } from './NotFoundPage';
import styles from './SummaryPage.module.css';

export function SummaryPage(props: { id: string }) {
  return (
    <Show when={getRecord(props.id)} keyed fallback={<NotFoundPage />}>
      {(record) => (
        <Show when={getRide(record.rideId)} fallback={<NotFoundPage />}>
          {(ride) => <Summary record={record} ride={ride()} />}
        </Show>
      )}
    </Show>
  );
}

function Summary(props: { record: RideRecord; ride: Ride }) {
  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const date = () =>
    new Date(props.record.finishedAt).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  const next = createMemo(() => {
    const plan = state.plan;
    if (!plan || props.record.planRef?.planId !== plan.id) return null;
    const n = nextPlanned(plan);
    const ride = n ? getRide(n.planned.rideId) : undefined;
    return n && ride ? { ...n, ride } : null;
  });

  return (
    <Page
      title={props.record.completed ? 'Ride complete' : 'Ride saved'}
      subtitle={`${props.ride.name} · ${date()}`}
      back="/"
    >
      <Card>
        <dl class={styles.stats}>
          <div>
            <dt>Time</dt>
            <dd>{formatClock(props.record.seconds)}</dd>
          </div>
          <div>
            <dt>Est. TSS</dt>
            <dd>{props.record.tss}</dd>
          </div>
          <div>
            <dt>FTP used</dt>
            <dd>{props.record.ftp ? `${props.record.ftp} W` : '—'}</dd>
          </div>
        </dl>
        <Show when={!props.record.completed}>
          <p class={styles.partial}>
            Ended early: {formatClock(props.record.seconds)} of {props.ride.minutes}:00.
          </p>
        </Show>
      </Card>

      <Show when={props.ride.type === 'test'}>
        <TestResult record={props.record} />
      </Show>

      <SectionTitle>Time in zones</SectionTitle>
      <Card>
        <div class={styles.visuals}>
          <RideProfile
            segments={props.ride.segments}
            elapsed={props.record.completed ? undefined : props.record.seconds}
            class={styles.profile}
          />
          <TimeInZones segments={props.ride.segments} upTo={props.record.seconds} />
        </div>
      </Card>

      <Show when={next()}>
        {(n) => (
          <>
            <SectionTitle>Next in your plan</SectionTitle>
            <RideCard
              ride={n().ride}
              href={href(rideHref(n().ride.id, n().week, n().index))}
              eyebrow={`Week ${n().week} · Ride ${n().index + 1}`}
            />
          </>
        )}
      </Show>

      <div class={styles.actions}>
        <Button href={href('/')} variant="primary" size="lg" block>
          Done
        </Button>
        <Button variant="danger" block onClick={() => setConfirmDelete(true)}>
          Delete this ride
        </Button>
      </div>

      <Dialog
        open={confirmDelete()}
        onClose={() => setConfirmDelete(false)}
        title="Delete this ride?"
        actions={
          <>
            <Button
              variant="danger"
              size="lg"
              block
              onClick={() => {
                setConfirmDelete(false);
                deleteRecord(props.record.id);
                navigate('/', { replace: true });
              }}
            >
              Delete ride
            </Button>
            <Button variant="ghost" block onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <p>
          It's removed from your history
          {props.record.planRef ? ' and the plan marks it as not done again' : ''}. This can't be
          undone.
        </p>
      </Dialog>
    </Page>
  );
}

function TestResult(props: { record: RideRecord }) {
  const [mode, setMode] = createSignal<'avg' | 'kj'>('avg');
  const [avg, setAvg] = createSignal('');
  const [kjStart, setKjStart] = createSignal('');
  const [kjEnd, setKjEnd] = createSignal('');

  const average = () => {
    if (mode() === 'avg') return Number(avg()) || 0;
    const a = Number(kjStart());
    const b = Number(kjEnd());
    return kjEnd() !== '' && b > a ? averageWattsFromKj(a, b, FTP_TEST_SECONDS) : 0;
  };
  const valid = () => average() >= 50 && average() <= 800;
  const previous = props.record.ftp;

  return (
    <Card>
      <Show
        when={!props.record.testResult}
        fallback={
          <div class={styles.result}>
            <p class={styles.resultLabel}>Your new FTP</p>
            <p class={styles.resultValue}>{props.record.testResult!.ftp} W</p>
            <p class={styles.muted}>
              From a 20-minute average of {props.record.testResult!.averageWatts} W
              {previous ? ` (was ${previous} W)` : ''}. Zone targets now use it.
            </p>
          </div>
        }
      >
        <form
          class={styles.testForm}
          onSubmit={(e) => {
            e.preventDefault();
            if (valid()) saveTestResult(props.record.id, average());
          }}
        >
          <h2 class={styles.formTitle}>Enter your result</h2>
          <SegmentedControl
            label="How to enter your result"
            options={[
              { value: 'avg', label: 'Average W' },
              { value: 'kj', label: 'Total kJ' },
            ]}
            value={mode()}
            onChange={setMode}
          />
          <Show
            when={mode() === 'avg'}
            fallback={
              <div class={styles.kjRow}>
                <Field label="kJ at start of the 20 min">
                  {(id) => (
                    <NumberInput id={id} value={kjStart()} onInput={setKjStart} suffix="kJ" />
                  )}
                </Field>
                <Field label="kJ at end">
                  {(id) => <NumberInput id={id} value={kjEnd()} onInput={setKjEnd} suffix="kJ" />}
                </Field>
              </div>
            }
          >
            <Field label="Average output for the 20 minutes">
              {(id) => <NumberInput id={id} value={avg()} onInput={setAvg} suffix="W" />}
            </Field>
          </Show>
          <Show when={valid()}>
            <p class={styles.preview}>
              {mode() === 'kj' ? `That's an average of ${average()} W. ` : ''}New FTP:{' '}
              <strong>{ftpFromTwentyMinute(average())} W</strong>
              {previous ? ` (was ${previous} W)` : ''}
            </p>
          </Show>
          <Button type="submit" variant="primary" size="lg" block disabled={!valid()}>
            Save new FTP
          </Button>
        </form>
      </Show>
    </Card>
  );
}
