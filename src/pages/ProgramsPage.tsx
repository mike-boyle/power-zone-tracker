import { For, Show } from 'solid-js';
import { PROGRAMS } from '../domain/programs';
import { state } from '../state/store';
import { href } from '../router';
import { Page } from '../ui/Page';
import { Card } from '../ui/Card';
import { IntensityMeter } from '../components/IntensityMeter';
import styles from './ProgramsPage.module.css';

export function ProgramsPage() {
  return (
    <Page
      title="Programs"
      subtitle="Each one builds in 4-week blocks: three weeks up, then an easier week. FTP tests between blocks are optional."
      back="/plan"
    >
      <For each={PROGRAMS}>
        {(program) => (
          <Card href={href(`/programs/${program.id}`)}>
            <div class={styles.card}>
              <div class={styles.head}>
                <h2 class={styles.name}>{program.name}</h2>
                <Show when={state.plan?.programId === program.id}>
                  <span class={styles.current}>Current</span>
                </Show>
              </div>
              <p class={styles.tagline}>{program.tagline}</p>
              <div class={styles.facts}>
                <span>
                  <strong>{program.weeks}</strong> weeks
                </span>
                <span class={styles.intensity}>
                  <IntensityMeter level={program.intensity} />
                </span>
                <span class={styles.goodFor}>{program.goodFor}</span>
              </div>
            </div>
          </Card>
        )}
      </For>
    </Page>
  );
}
