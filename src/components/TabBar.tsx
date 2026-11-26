import { For, type JSX } from 'solid-js';
import type { Route } from '../router';
import { href } from '../router';
import { cx } from '../lib/cx';
import styles from './TabBar.module.css';

interface Tab {
  label: string;
  path: string;
  matches: Route['name'][];
  icon: () => JSX.Element;
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
} as const;

const TABS: Tab[] = [
  {
    label: 'Today',
    path: '/',
    matches: ['today'],
    icon: () => (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...stroke} d="M13 2 4 14h7l-1 8 9-12h-7z" />
      </svg>
    ),
  },
  {
    label: 'Plan',
    path: '/plan',
    matches: ['plan', 'programs', 'program'],
    icon: () => (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...stroke} d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
  {
    label: 'Rides',
    path: '/library',
    matches: ['library', 'ride'],
    icon: () => (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...stroke} d="M3 6h18M3 12h18M3 18h12" />
      </svg>
    ),
  },
  {
    label: 'Progress',
    path: '/progress',
    matches: ['progress'],
    icon: () => (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...stroke} d="M3 17l5-5 4 3 8-9M15 6h5v5" />
      </svg>
    ),
  },
  {
    label: 'You',
    path: '/you',
    matches: ['you', 'summary'],
    icon: () => (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle {...stroke} cx="12" cy="8" r="4" />
        <path {...stroke} d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </svg>
    ),
  },
];

export function TabBar(props: { active: Route['name'] }) {
  return (
    <nav class={styles.bar} aria-label="Main">
      <For each={TABS}>
        {(tab) => {
          const on = () => tab.matches.includes(props.active);
          return (
            <a
              class={cx(styles.tab, on() && styles.on)}
              href={href(tab.path)}
              aria-current={on() ? 'page' : undefined}
            >
              <span class={styles.icon}>{tab.icon()}</span>
              <span class={styles.label}>{tab.label}</span>
            </a>
          );
        }}
      </For>
    </nav>
  );
}
