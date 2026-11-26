import { For, Show, createMemo, createSignal } from 'solid-js';
import { FTP_TEST_RIDE_ID, getRide } from '../domain/library';
import { formatClock, formatDate } from '../domain/format';
import { exportData, importData, resetAll, setSetting, state } from '../state/store';
import { href, rideHref } from '../router';
import { wakeLockSupported } from '../lib/wakeLock';
import { Page } from '../ui/Page';
import { Card, SectionTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Toggle } from '../ui/Controls';
import { FtpForm } from '../components/FtpForm';
import { ZoneTable } from '../components/ZoneTable';
import styles from './YouPage.module.css';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function YouPage() {
  const [confirmReset, setConfirmReset] = createSignal(false);
  const [message, setMessage] = createSignal('');
  let fileInput: HTMLInputElement | undefined;

  const history = createMemo(() => [...state.history].reverse());
  const lastWeek = createMemo(() => {
    const since = Date.now() - WEEK_MS;
    const recent = state.history.filter((r) => Date.parse(r.finishedAt) >= since);
    return {
      rides: recent.length,
      tss: recent.reduce((s, r) => s + r.tss, 0),
      seconds: recent.reduce((s, r) => s + r.seconds, 0),
    };
  });

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `power-zone-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const ok = importData(await file.text());
    setMessage(ok ? 'Backup restored.' : "That file isn't a backup from this app.");
    if (fileInput) fileInput.value = '';
  };

  return (
    <Page title="You">
      <SectionTitle>FTP</SectionTitle>
      <Card>
        <div class={styles.stack}>
          <FtpForm label="Your FTP" />
          <a class={styles.link} href={href(rideHref(FTP_TEST_RIDE_ID))}>
            Take the 20-minute FTP test →
          </a>
        </div>
      </Card>

      <Show when={state.settings.ftp}>
        {(ftp) => (
          <>
            <SectionTitle>Your zones</SectionTitle>
            <Card>
              <ZoneTable ftp={ftp()} />
            </Card>
          </>
        )}
      </Show>

      <Show when={state.ftpHistory.length > 1}>
        <SectionTitle>FTP history</SectionTitle>
        <Card>
          <ol class={styles.ftpHistory}>
            <For each={[...state.ftpHistory].reverse()}>
              {(entry) => (
                <li>
                  <span>{formatDate(entry.date)}</span>
                  <span class={styles.muted}>
                    {entry.source === 'test' ? 'FTP test' : 'Entered'}
                  </span>
                  <strong>{entry.ftp} W</strong>
                </li>
              )}
            </For>
          </ol>
        </Card>
      </Show>

      <SectionTitle>During rides</SectionTitle>
      <Card>
        <div class={styles.toggles}>
          <Toggle
            label="Countdown beeps"
            description="Beep for the last 3 seconds of each interval, and vibrate where supported."
            checked={state.settings.beeps}
            onChange={(v) => setSetting('beeps', v)}
          />
          <Toggle
            label="Voice cues"
            description="Announce each new zone and its watt range."
            checked={state.settings.voice}
            onChange={(v) => setSetting('voice', v)}
          />
        </div>
        <Show when={!wakeLockSupported()}>
          <p class={styles.note}>
            This browser can't keep the screen awake automatically. Turn up your auto-lock time
            before riding.
          </p>
        </Show>
      </Card>

      <SectionTitle>History</SectionTitle>
      <Card>
        <div class={styles.weekStats}>
          <span>
            <strong>{lastWeek().rides}</strong> rides
          </span>
          <span>
            <strong>{formatClock(lastWeek().seconds)}</strong> ridden
          </span>
          <span>
            <strong>{lastWeek().tss}</strong> TSS
          </span>
          <span class={styles.muted}>last 7 days</span>
        </div>
        <Show
          when={history().length > 0}
          fallback={<p class={styles.muted}>Rides you finish show up here.</p>}
        >
          <ul class={styles.history}>
            <For each={history()}>
              {(record) => (
                <li>
                  <a href={href(`/summary/${record.id}`)}>
                    <span class={styles.historyName}>
                      {getRide(record.rideId)?.name ?? 'Unknown ride'}
                      <Show when={!record.completed}>
                        <span class={styles.partialTag}>partial</span>
                      </Show>
                    </span>
                    <span class={styles.muted}>
                      {formatDate(record.finishedAt)} · {formatClock(record.seconds)} · {record.tss}{' '}
                      TSS
                    </span>
                  </a>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Card>

      <SectionTitle>Your data</SectionTitle>
      <Card>
        <div class={styles.stack}>
          <p class={styles.muted}>
            Everything is stored on this device only. Save a backup now and then, especially on
            iPhone, where Safari can clear data for sites you haven't added to your Home Screen.
          </p>
          <div class={styles.buttons}>
            <Button onClick={download}>Save backup</Button>
            <Button onClick={() => fileInput?.click()}>Restore backup</Button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            class="visually-hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => void upload(e.currentTarget.files?.[0])}
          />
          <Show when={message()}>
            <p class={styles.message} role="status">
              {message()}
            </p>
          </Show>
          <Button variant="danger" block onClick={() => setConfirmReset(true)}>
            Erase all data
          </Button>
        </div>
      </Card>

      <p class={styles.about}>
        Zone targets and TSS are estimates based on your FTP. Ride by feel when they disagree, and
        retest every few weeks as you get fitter.
      </p>

      <Dialog
        open={confirmReset()}
        onClose={() => setConfirmReset(false)}
        title="Erase all data?"
        actions={
          <>
            <Button
              variant="danger"
              size="lg"
              block
              onClick={() => {
                setConfirmReset(false);
                resetAll();
              }}
            >
              Erase everything
            </Button>
            <Button variant="ghost" block onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <p>
          Your FTP, program, progress and ride history are deleted from this device. This can't be
          undone unless you have a backup.
        </p>
      </Dialog>
    </Page>
  );
}
