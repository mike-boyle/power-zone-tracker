import { Show, createSignal } from 'solid-js';
import { setFtp, state } from '../state/store';
import { Button } from '../ui/Button';
import { Field, NumberInput } from '../ui/Controls';
import styles from './FtpForm.module.css';

const MIN_FTP = 40;
const MAX_FTP = 600;

export function FtpForm(props: { onSaved?: (ftp: number) => void; label?: string }) {
  const [value, setValue] = createSignal(state.settings.ftp ? String(state.settings.ftp) : '');
  const [saved, setSaved] = createSignal(false);
  const parsed = () => Number(value());
  const valid = () =>
    value().trim() !== '' &&
    Number.isInteger(parsed()) &&
    parsed() >= MIN_FTP &&
    parsed() <= MAX_FTP;
  const unchanged = () => parsed() === state.settings.ftp;

  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!valid()) return;
    setFtp(parsed());
    setSaved(true);
    props.onSaved?.(parsed());
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form class={styles.form} onSubmit={submit}>
      <Field
        label={props.label ?? 'FTP'}
        hint={
          <Show
            when={value().trim() === '' || valid()}
            fallback={`Enter a whole number between ${MIN_FTP} and ${MAX_FTP}.`}
          >
            Functional Threshold Power: the output you could hold for about an hour.
          </Show>
        }
      >
        {(id) => (
          <div class={styles.row}>
            <NumberInput
              id={id}
              value={value()}
              onInput={(v) => {
                setValue(v);
                setSaved(false);
              }}
              suffix="W"
              placeholder="e.g. 180"
              min={MIN_FTP}
              max={MAX_FTP}
            />
            <Button type="submit" variant="primary" size="lg" disabled={!valid() || unchanged()}>
              {saved() ? 'Saved' : 'Save'}
            </Button>
          </div>
        )}
      </Field>
    </form>
  );
}
