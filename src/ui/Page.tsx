import { Show, type JSX } from 'solid-js';
import { goBack } from '../router';
import { cx } from '../lib/cx';
import styles from './Page.module.css';

/** Standard screen: optional back button, title, and a centred content column. */
export function Page(props: {
  title: string;
  subtitle?: JSX.Element;
  back?: string;
  action?: JSX.Element;
  children: JSX.Element;
  footer?: JSX.Element;
  class?: string;
}) {
  return (
    <div class={cx(styles.page, !!props.footer && styles.withFooter, props.class)}>
      <header class={styles.header}>
        <Show when={props.back}>
          {(back) => (
            <button
              type="button"
              class={styles.back}
              onClick={() => goBack(back())}
              aria-label="Back"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                <path
                  d="M15 5l-7 7 7 7"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.25"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          )}
        </Show>
        <div class={styles.titles}>
          <h1 class={styles.title}>{props.title}</h1>
          {props.subtitle && <p class={styles.subtitle}>{props.subtitle}</p>}
        </div>
        {props.action}
      </header>
      <main class={styles.main}>{props.children}</main>
      <Show when={props.footer}>
        <div class={styles.footer}>
          <div class={styles.footerInner}>{props.footer}</div>
        </div>
      </Show>
    </div>
  );
}
