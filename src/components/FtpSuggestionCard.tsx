import { Show } from 'solid-js';
import { acceptFtpSuggestion, currentFtpSuggestion, dismissFtpSuggestion } from '../state/store';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import styles from './FtpSuggestionCard.module.css';

/** Offers an FTP change when recent ride ratings point to one. Renders nothing otherwise. */
export function FtpSuggestionCard() {
  return (
    <Show when={currentFtpSuggestion()} keyed>
      {(suggestion) => (
        <Card>
          <div class={styles.stack} role="status">
            <p class={styles.eyebrow}>
              {suggestion.direction === 'up' ? 'Ready for more?' : 'Ease off a little?'}
            </p>
            <h2 class={styles.title}>
              {suggestion.direction === 'up' ? 'Raise' : 'Lower'} your FTP from {suggestion.from} to{' '}
              {suggestion.to} W
            </h2>
            <p class={styles.muted}>
              {suggestion.reason} Every zone's watt range moves with it.
              {suggestion.direction === 'up'
                ? ' An FTP test gives an exact number if you prefer.'
                : ''}
            </p>
            <div class={styles.buttons}>
              <Button variant="primary" onClick={() => acceptFtpSuggestion(suggestion)}>
                Set {suggestion.to} W
              </Button>
              <Button variant="ghost" onClick={() => dismissFtpSuggestion(suggestion)}>
                Not now
              </Button>
            </div>
          </div>
        </Card>
      )}
    </Show>
  );
}
