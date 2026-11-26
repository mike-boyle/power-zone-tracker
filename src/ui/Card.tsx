import type { JSX } from 'solid-js';
import { cx } from '../lib/cx';
import styles from './Card.module.css';

export function Card(props: {
  children: JSX.Element;
  class?: string;
  href?: string;
  padded?: boolean;
  'aria-label'?: string;
}) {
  const className = () =>
    cx(
      styles.card,
      props.padded !== false && styles.padded,
      props.href && styles.link,
      props.class,
    );
  if (props.href) {
    return (
      <a class={className()} href={props.href} aria-label={props['aria-label']}>
        {props.children}
      </a>
    );
  }
  return <section class={className()}>{props.children}</section>;
}

export function SectionTitle(props: { children: JSX.Element; action?: JSX.Element }) {
  return (
    <div class={styles.sectionTitle}>
      <h2>{props.children}</h2>
      {props.action}
    </div>
  );
}
