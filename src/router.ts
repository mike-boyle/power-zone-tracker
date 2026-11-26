import { createSignal } from 'solid-js';

/**
 * A tiny hash router. Hash URLs work on any static host (including GitHub
 * Pages under a sub-path) with no server rewrites, and the app has few enough
 * screens that a library would be overkill.
 */

export type Route =
  | { name: 'today' }
  | { name: 'programs' }
  | { name: 'program'; id: string }
  | { name: 'plan' }
  | { name: 'library' }
  | { name: 'ride'; id: string; week?: number; index?: number }
  | { name: 'play' }
  | { name: 'summary'; id: string }
  | { name: 'you' }
  | { name: 'notFound' };

const [hash, setHash] = createSignal(typeof location === 'undefined' ? '' : location.hash);

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    setHash(location.hash);
    window.scrollTo(0, 0);
  });
}

export function parseRoute(raw: string): Route {
  const [path = '', query = ''] = raw.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(query);
  const num = (key: string) => {
    const value = params.get(key);
    return value === null || value === '' || Number.isNaN(Number(value))
      ? undefined
      : Number(value);
  };

  switch (parts[0]) {
    case undefined:
      return { name: 'today' };
    case 'programs':
      return parts[1] ? { name: 'program', id: parts[1] } : { name: 'programs' };
    case 'plan':
      return { name: 'plan' };
    case 'library':
      return { name: 'library' };
    case 'ride': {
      if (!parts[1]) return { name: 'notFound' };
      const week = num('week');
      const index = num('index');
      return {
        name: 'ride',
        id: parts[1],
        ...(week !== undefined && index !== undefined ? { week, index } : {}),
      };
    }
    case 'play':
      return { name: 'play' };
    case 'summary':
      return parts[1] ? { name: 'summary', id: parts[1] } : { name: 'notFound' };
    case 'you':
      return { name: 'you' };
    default:
      return { name: 'notFound' };
  }
}

/** The current route. Wrap in `createMemo` where it's read often. */
export const currentRoute = (): Route => parseRoute(hash());

export function href(path: string): string {
  return `#${path}`;
}

export function navigate(path: string, options: { replace?: boolean } = {}): void {
  const next = href(path);
  if (options.replace) {
    // replaceState doesn't fire hashchange, so update and reset scroll here.
    history.replaceState(null, '', next);
    setHash(next);
    window.scrollTo(0, 0);
  } else {
    location.hash = next;
  }
}

export function rideHref(rideId: string, week?: number, index?: number): string {
  const base = `/ride/${encodeURIComponent(rideId)}`;
  return week !== undefined && index !== undefined ? `${base}?week=${week}&index=${index}` : base;
}

export function goBack(fallback: string): void {
  if (history.length > 1) history.back();
  else navigate(fallback, { replace: true });
}
