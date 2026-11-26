import { For, Show, createMemo, createSignal } from 'solid-js';
import { getRide } from '../domain/library';
import { generatePlan, plannedMinutes, plannedTss } from '../domain/plan';
import { DAY_OPTIONS, getProgram, type DaysPerWeek, type Program } from '../domain/programs';
import { RIDE_TYPE_LABEL, type RideType } from '../domain/ride';
import { plural } from '../domain/format';
import { newPlanSeed, startProgram, state } from '../state/store';
import { navigate } from '../router';
import { Page } from '../ui/Page';
import { Card, SectionTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { SegmentedControl, Toggle } from '../ui/Controls';
import { TypeBadge } from '../ui/Badges';
import { WeeklyLoadChart } from '../components/WeeklyLoadChart';
import { IntensityMeter } from '../components/IntensityMeter';
import { NotFoundPage } from './NotFoundPage';
import styles from './ProgramSetupPage.module.css';

const SIX_WEEKS_MS = 42 * 24 * 60 * 60 * 1000;

export function ProgramSetupPage(props: { id: string }) {
  return (
    <Show when={getProgram(props.id)} fallback={<NotFoundPage />}>
      {(program) => <Setup program={program()} />}
    </Show>
  );
}

function Setup(props: { program: Program }) {
  const lastFtp = state.ftpHistory[state.ftpHistory.length - 1];
  const ftpStale =
    state.settings.ftp === null || !lastFtp || Date.now() - Date.parse(lastFtp.date) > SIX_WEEKS_MS;

  const [days, setDays] = createSignal<DaysPerWeek>(
    state.plan?.programId === props.program.id ? state.plan.daysPerWeek : 5,
  );
  // Comeback ends with a test anyway; for the others, test first if the FTP is old or missing.
  const [startWithTest, setStartWithTest] = createSignal(
    props.program.id === 'comeback' ? state.settings.ftp === null : ftpStale,
  );
  const [seed, setSeed] = createSignal(newPlanSeed());
  const [confirming, setConfirming] = createSignal(false);

  const weeks = createMemo(() =>
    generatePlan(props.program, {
      daysPerWeek: days(),
      startWithTest: startWithTest(),
      seed: seed(),
    }),
  );
  const stats = createMemo(() => {
    const tss = weeks().map(plannedTss);
    const minutes = weeks().map(plannedMinutes);
    const mix = new Map<RideType, number>();
    for (const w of weeks()) {
      for (const r of w.rides) {
        const type = getRide(r.rideId)?.type;
        if (type) mix.set(type, (mix.get(type) ?? 0) + 1);
      }
    }
    return {
      rides: weeks().reduce((n, w) => n + w.rides.length, 0),
      minTss: Math.min(...tss),
      maxTss: Math.max(...tss),
      avgHours: minutes.reduce((a, b) => a + b, 0) / minutes.length / 60,
      longest: Math.max(
        ...weeks().flatMap((w) => w.rides.map((r) => getRide(r.rideId)?.minutes ?? 0)),
      ),
      mix: (['endurance', 'power', 'max', 'recovery', 'test'] as RideType[])
        .filter((t) => mix.has(t))
        .map((t) => ({ type: t, count: mix.get(t)! })),
    };
  });

  const start = () => {
    startProgram(props.program.id, days(), startWithTest(), seed());
    navigate('/', { replace: true });
  };

  return (
    <Page
      title={props.program.name}
      subtitle={props.program.tagline}
      back="/programs"
      footer={
        <Button
          variant="primary"
          size="xl"
          block
          onClick={() => (state.plan ? setConfirming(true) : start())}
        >
          Start {props.program.name}
        </Button>
      }
    >
      <p class={styles.description}>{props.program.description}</p>
      <div class={styles.facts}>
        <span>
          <strong>{props.program.weeks}</strong> weeks
        </span>
        <IntensityMeter level={props.program.intensity} />
        <span class={styles.muted}>{props.program.goodFor}</span>
      </div>

      <SectionTitle>Rides per week</SectionTitle>
      <SegmentedControl
        label="Rides per week"
        options={DAY_OPTIONS.map((d) => ({ value: d, label: String(d) }))}
        value={days()}
        onChange={setDays}
      />

      <Card>
        <Toggle
          label="Start with an FTP test"
          description={
            state.settings.ftp === null
              ? "You haven't set an FTP yet, so this is recommended."
              : `Your FTP is ${state.settings.ftp} W. Test first if it's more than a few weeks old.`
          }
          checked={startWithTest()}
          onChange={setStartWithTest}
        />
      </Card>

      <SectionTitle
        action={
          <button type="button" class={styles.shuffle} onClick={() => setSeed(newPlanSeed())}>
            Shuffle rides
          </button>
        }
      >
        Your plan
      </SectionTitle>
      <Card>
        <div class={styles.preview}>
          <WeeklyLoadChart
            weeks={weeks().map((w) => ({ number: w.number, kind: w.kind, planned: plannedTss(w) }))}
          />
          <dl class={styles.stats}>
            <div>
              <dt>Rides</dt>
              <dd>{stats().rides}</dd>
            </div>
            <div>
              <dt>Weekly TSS</dt>
              <dd>
                {stats().minTss}–{stats().maxTss}
              </dd>
            </div>
            <div>
              <dt>Avg per week</dt>
              <dd>{stats().avgHours.toFixed(1)} h</dd>
            </div>
            <div>
              <dt>Longest ride</dt>
              <dd>{stats().longest} min</dd>
            </div>
          </dl>
          <div class={styles.mix}>
            <For each={stats().mix}>
              {(m) => (
                <span class={styles.mixItem}>
                  <TypeBadge type={m.type} /> {m.count}
                  <span class="visually-hidden"> {RIDE_TYPE_LABEL[m.type]} rides</span>
                </span>
              )}
            </For>
          </div>
        </div>
      </Card>

      <SectionTitle>Week by week</SectionTitle>
      <Card>
        <ol class={styles.weeks}>
          <For each={weeks()}>
            {(w) => (
              <li class={styles.week}>
                <span class={styles.weekName}>Week {w.number}</span>
                <span class={styles.weekTypes}>
                  <For each={w.rides}>
                    {(r) => {
                      const ride = getRide(r.rideId);
                      return ride ? (
                        <span
                          class={styles.dot}
                          style={{ background: `var(--type-${ride.type})` }}
                          title={`${RIDE_TYPE_LABEL[ride.type]}, ${ride.minutes} min`}
                        />
                      ) : null;
                    }}
                  </For>
                </span>
                <span class={styles.weekTss}>{plannedTss(w)}</span>
              </li>
            )}
          </For>
        </ol>
        <p class={styles.legend}>
          Dots are rides in order: <span style={{ color: 'var(--type-endurance)' }}>●</span>{' '}
          endurance, <span style={{ color: 'var(--type-power)' }}>●</span> power zone,{' '}
          <span style={{ color: 'var(--type-max)' }}>●</span> max,{' '}
          <span style={{ color: 'var(--type-recovery)' }}>●</span> recovery,{' '}
          <span style={{ color: 'var(--type-test)' }}>●</span> FTP test. Numbers are TSS.
        </p>
      </Card>

      <Dialog
        open={confirming()}
        onClose={() => setConfirming(false)}
        title="Replace your current program?"
        actions={
          <>
            <Button variant="primary" size="lg" block onClick={start}>
              Start {props.program.name}
            </Button>
            <Button variant="ghost" block onClick={() => setConfirming(false)}>
              Keep current program
            </Button>
          </>
        }
      >
        <p>
          Your progress in {getProgram(state.plan?.programId ?? '')?.name ?? 'your program'} will be
          cleared. Your ride history is kept. ({plural(stats().rides, 'ride')} in the new plan.)
        </p>
      </Dialog>
    </Page>
  );
}
