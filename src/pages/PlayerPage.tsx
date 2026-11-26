import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js';
import { getRide } from '../domain/library';
import { totalSeconds, withTimes, type Ride, type TimedSegment } from '../domain/ride';
import { ZONE_INFO, formatWattRange, wattRange } from '../domain/zones';
import { formatClock, formatCountdown, formatDuration } from '../domain/format';
import { discardRide, finishRide, pause, play, seekTo, state } from '../state/store';
import { elapsedMs, segmentIndexAt } from '../state/clock';
import { goBack, href, navigate } from '../router';
import { keepScreenOn, releaseScreen } from '../lib/wakeLock';
import { changeBeep, countdownBeep, speak, spokenDuration, unlockAudio } from '../lib/cues';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { ZoneChip } from '../ui/Badges';
import { RideProfile } from '../components/RideProfile';
import { IntervalList } from '../components/IntervalList';
import styles from './PlayerPage.module.css';

export function PlayerPage() {
  const ride = () => (state.activeRide ? getRide(state.activeRide.rideId) : undefined);
  return (
    <Show
      when={ride()}
      keyed
      fallback={
        <div class={styles.empty}>
          <p>No ride in progress.</p>
          <Button href={href('/')} variant="primary" size="lg">
            Back to Today
          </Button>
        </div>
      }
    >
      {(r) => <Player ride={r} />}
    </Show>
  );
}

/** Pacing target for the 20-minute test: the average that would confirm the current FTP. */
function testPace(ftp: number): number {
  return Math.round(ftp / 0.95);
}

function Player(props: { ride: Ride }) {
  const timed = withTimes(props.ride.segments);
  const total = totalSeconds(props.ride.segments);

  const [now, setNow] = createSignal(Date.now());
  const tick = setInterval(() => setNow(Date.now()), 250);
  onCleanup(() => clearInterval(tick));

  const active = () => state.activeRide;
  const started = () => !!active()?.startedAt;
  const running = () => active()?.runningSince != null;
  const elapsed = () => {
    const a = active();
    return a ? Math.min(total, elapsedMs(a, now()) / 1000) : 0;
  };
  const index = createMemo(() => segmentIndexAt(timed, elapsed()));
  const segment = (): TimedSegment => timed[index()]!;
  const upcoming = () => timed[index() + 1];
  const left = () => Math.max(0, segment().end - elapsed());
  const progress = () => Math.min(1, (elapsed() - segment().start) / segment().seconds);
  const ftp = () => state.settings.ftp;

  const [ending, setEnding] = createSignal(false);
  // A ride that already ran out while the app was closed asks before saving.
  const endedWhileAway = untrack(() => started() && elapsed() >= total);

  onMount(() => {
    keepScreenOn();
    if (endedWhileAway) setEnding(true);
  });
  onCleanup(releaseScreen);

  const describe = (s: TimedSegment) => {
    if (s.test) return `FTP test. ${spokenDuration(s.seconds)}. Best steady effort.`;
    const f = ftp();
    const range = f ? wattRange(f, s.zone) : null;
    const watts = range
      ? range.high
        ? `, ${range.low} to ${range.high} watts`
        : `, over ${range.low} watts`
      : '';
    return `Zone ${s.zone}, ${spokenDuration(s.seconds)}${watts}.`;
  };

  // Cue each interval change while riding.
  createEffect(
    on(index, (i, prev) => {
      if (prev === undefined || i === prev || !untrack(running)) return;
      if (state.settings.beeps) changeBeep();
      if (state.settings.voice) speak(describe(timed[i]!));
    }),
  );

  // 3-2-1 beeps at the end of each interval.
  let lastBeep = '';
  createEffect(() => {
    if (!running() || !state.settings.beeps) return;
    const secondsLeft = Math.ceil(left());
    const key = `${index()}:${secondsLeft}`;
    if (secondsLeft >= 1 && secondsLeft <= 3 && key !== lastBeep) {
      lastBeep = key;
      countdownBeep();
    }
  });

  const complete = (seconds: number) => {
    const id = finishRide(seconds);
    navigate(id ? `/summary/${id}` : '/', { replace: true });
  };

  // Finish automatically when the clock runs out with the player open.
  let finished = false;
  createEffect(() => {
    if (finished || endedWhileAway || !started() || elapsed() < total) return;
    finished = true;
    complete(total);
  });

  const start = () => {
    const first = !started();
    unlockAudio();
    keepScreenOn();
    play();
    if (first && state.settings.voice) speak(describe(timed[0]!));
  };

  const togglePause = () => (running() ? pause() : start());

  const next = () => {
    const n = upcoming();
    seekTo((n ? n.start : total) * 1000);
  };

  const previous = () => {
    const s = segment();
    const target = elapsed() - s.start > 3 || s.index === 0 ? s.start : timed[s.index - 1]!.start;
    seekTo(target * 1000);
  };

  const zoneStyle = () => ({
    '--zone': `var(--zone-${segment().zone})`,
    '--zone-ink': `var(--zone-${segment().zone}-ink)`,
  });

  return (
    <div class={styles.player} style={zoneStyle()}>
      <header class={styles.top}>
        <button
          type="button"
          class={styles.iconButton}
          onClick={() => goBack('/')}
          aria-label="Minimize player (the ride keeps going)"
        >
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path
              d="M6 9l6 6 6-6"
              fill="none"
              stroke="currentColor"
              stroke-width="2.25"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <div class={styles.titleBlock}>
          <span class={styles.rideName}>{props.ride.name}</span>
          <span class={styles.rideTime}>
            {formatClock(elapsed())} / {formatClock(total)}
          </span>
        </div>
        <button type="button" class={styles.endButton} onClick={() => setEnding(true)}>
          End
        </button>
      </header>

      <section class={cx(styles.hero, !running() && styles.heroPaused)}>
        <div class={styles.zoneLine} aria-live="polite">
          <span class={styles.zoneLabel}>
            {segment().test ? 'FTP test' : `Zone ${segment().zone}`}
          </span>
          <span class={styles.zoneName}>
            {segment().test ? 'Best steady 20 minutes' : ZONE_INFO[segment().zone].name}
          </span>
        </div>

        <div class={styles.target}>
          <Show
            when={ftp()}
            fallback={
              <a class={styles.noFtp} href={href('/you')}>
                Set your FTP to see watts
              </a>
            }
          >
            {(f) => (
              <Show
                when={!segment().test}
                fallback={
                  <span class={styles.watts}>
                    <span class={styles.approx}>≈</span>
                    {testPace(f())}
                    <span class={styles.unit}>W</span>
                  </span>
                }
              >
                <span class={styles.watts}>
                  {formatWattRange(wattRange(f(), segment().zone))}
                  <span class={styles.unit}>W</span>
                </span>
              </Show>
            )}
          </Show>
        </div>

        <Show when={segment().test && (elapsed() - segment().start < 20 || left() < 20)}>
          <div class={styles.cue}>Note your total output (kJ) now</div>
        </Show>
        <Show when={!segment().test && segment().label}>
          <div class={styles.cue}>{segment().label}</div>
        </Show>

        <div class={styles.countdown} role="timer" aria-label="Time left in this interval">
          {formatCountdown(left())}
        </div>

        <div class={styles.segTrack} aria-hidden="true">
          <div class={styles.segFill} style={{ width: `${progress() * 100}%` }} />
        </div>

        <Show when={!started()}>
          <p class={styles.ready}>Get set on the bike, then tap Start.</p>
        </Show>
        <Show when={started() && !running()}>
          <p class={styles.ready}>Paused</p>
        </Show>
      </section>

      <div class={styles.next}>
        <Show when={upcoming()} fallback={<span class={styles.nextLabel}>Last interval</span>}>
          {(n) => (
            <>
              <span class={styles.nextLabel}>Next</span>
              <ZoneChip zone={n().zone} test={n().test} />
              <span class={styles.nextName}>
                {n().test ? 'FTP test' : ZONE_INFO[n().zone].name}
              </span>
              <span class={styles.nextMeta}>
                {formatDuration(n().seconds)}
                <Show when={ftp() && !n().test}>
                  {' · '}
                  {formatWattRange(wattRange(ftp()!, n().zone))} W
                </Show>
              </span>
            </>
          )}
        </Show>
      </div>

      <section class={styles.overview} aria-label="Whole ride">
        <RideProfile segments={props.ride.segments} elapsed={elapsed()} class={styles.profile} />
        <div class={styles.totals}>
          <span>{formatClock(elapsed())} done</span>
          <span>
            Interval {index() + 1} of {timed.length}
          </span>
          <span>{formatClock(total - elapsed())} left</span>
        </div>
      </section>

      <div class={styles.controls}>
        <button
          type="button"
          class={styles.skip}
          onClick={previous}
          disabled={!started()}
          aria-label="Previous interval"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M7 5v14M19 5l-9 7 9 7z"
              fill="currentColor"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <Button variant="primary" size="xl" block onClick={togglePause}>
          {!started() ? 'Start' : running() ? 'Pause' : 'Resume'}
        </Button>
        <button
          type="button"
          class={styles.skip}
          onClick={next}
          disabled={!started()}
          aria-label="Next interval"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M17 5v14M5 5l9 7-9 7z"
              fill="currentColor"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <details class={styles.all}>
        <summary>All intervals</summary>
        <IntervalList
          segments={props.ride.segments}
          ftp={ftp()}
          currentIndex={started() ? index() : undefined}
          compact
        />
      </details>

      <Dialog
        open={ending()}
        onClose={() => setEnding(false)}
        title={elapsed() >= total ? 'Ride finished' : 'End this ride?'}
        actions={
          <>
            <Button
              variant="primary"
              size="lg"
              block
              disabled={elapsed() < 1}
              onClick={() => {
                setEnding(false);
                finished = true;
                complete(elapsed());
              }}
            >
              Save ride
            </Button>
            <Button
              variant="danger"
              size="lg"
              block
              onClick={() => {
                setEnding(false);
                finished = true;
                discardRide();
                navigate('/', { replace: true });
              }}
            >
              Discard
            </Button>
            <Show when={elapsed() < total}>
              <Button variant="ghost" block onClick={() => setEnding(false)}>
                Keep riding
              </Button>
            </Show>
          </>
        }
      >
        <p>
          <Show
            when={elapsed() < total}
            fallback="The timer ran out while the app was closed. Save it if you rode it."
          >
            You've ridden {formatClock(elapsed())} of {formatClock(total)}. Save what you've done so
            far, or discard it.
          </Show>
        </p>
      </Dialog>
    </div>
  );
}
