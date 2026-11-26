import { splitProps, type JSX } from 'solid-js';
import { cx } from '../lib/cx';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  class?: string;
  children: JSX.Element;
}

type ButtonProps = CommonProps & JSX.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type LinkProps = CommonProps & JSX.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function Button(props: ButtonProps | LinkProps) {
  const [local, rest] = splitProps(props, ['variant', 'size', 'block', 'class', 'children']);
  const className = () =>
    cx(
      styles.button,
      styles[local.variant ?? 'secondary'],
      styles[local.size ?? 'md'],
      local.block && styles.block,
      local.class,
    );

  if ('href' in rest && rest.href !== undefined) {
    return (
      <a class={className()} {...(rest as JSX.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {local.children}
      </a>
    );
  }
  return (
    <button
      type="button"
      class={className()}
      {...(rest as JSX.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {local.children}
    </button>
  );
}
