import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
} from 'solid-js';
import type { LoadDay } from '../domain/load';
import { cx } from '../lib/cx';
import styles from './TrainingLoadChart.module.css';

/**
 * Fitness and fatigue (with daily TSS) above, form below, on one shared time
 * axis. Two panels rather than two y-scales: form is centred on zero and would
 * distort the other lines. Days after today (from the plan) are dashed.
 *
 * Drag or hover to read any day; arrow keys do the same when focused. The
 * readout defaults to today.
 */

const PAD_LEFT = 30;
const PAD_RIGHT = 12;
const TOP = 16;
const LOAD_HEIGHT = 170;
const GAP = 22;
const FORM_HEIGHT = 96;
const AXIS_BAND = 22;
const HEIGHT = TOP + LOAD_HEIGHT + GAP + FORM_HEIGHT + AXIS_BAND;
const FORM_TOP = TOP + LOAD_HEIGHT + GAP;
/** Form band edges (see formStatus). */
const FORM_LINES = [5, 0, -10, -30];

function niceStep(max: number, maxTicks: number): number {
  for (const step of [5, 10, 20, 25, 50, 100, 200]) {
    if (max / step <= maxTicks) return step;
  }
  return 500;
}

function shortDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function longDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function signed(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${r}` : r < 0 ? `−${Math.abs(r)}` : '0';
}

/** SVG path through points, as separate solid (≤ split) and dashed (≥ split) runs. */
function linePaths(points: readonly [number, number][], split: number) {
  const toPath = (pts: readonly [number, number][]) =>
    pts.length < 2
      ? ''
      : pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  return {
    actual: toPath(points.slice(0, split + 1)),
    projected: toPath(points.slice(split)),
  };
}

export function TrainingLoadChart(props: { days: readonly LoadDay[]; todayIndex: number }) {
  let box: HTMLDivElement | undefined;
  const [width, setWidth] = createSignal(340);
  onMount(() => {
    if (!box) return;
    setWidth(box.clientWidth || 340);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(240, entry.contentRect.width));
    });
    observer.observe(box);
    onCleanup(() => observer.disconnect());
  });

  const [picked, setPicked] = createSignal<number | null>(null);
  createEffect(
    on(
      () => props.days,
      () => setPicked(null),
      { defer: true },
    ),
  );
  const active = () => Math.min(props.days.length - 1, picked() ?? props.todayIndex);
  const day = () => props.days[active()];

  const n = () => props.days.length;
  const plotWidth = () => width() - PAD_LEFT - PAD_RIGHT;
  const x = (i: number) => PAD_LEFT + (n() <= 1 ? plotWidth() / 2 : (i * plotWidth()) / (n() - 1));

  const loadMax = createMemo(() => {
    const peak = Math.max(20, ...props.days.map((d) => Math.max(d.fitness, d.fatigue, d.tss)));
    const step = niceStep(peak, 4);
    return { max: Math.ceil(peak / step) * step, step };
  });
  const yLoad = (v: number) => TOP + LOAD_HEIGHT - (v / loadMax().max) * LOAD_HEIGHT;

  const formRange = createMemo(() => {
    const forms = props.days.map((d) => d.form);
    return {
      min: Math.min(-35, Math.floor(Math.min(...forms) / 5) * 5 - 5),
      max: Math.max(15, Math.ceil(Math.max(...forms) / 5) * 5 + 5),
    };
  });
  const yForm = (v: number) =>
    FORM_TOP + ((formRange().max - v) / (formRange().max - formRange().min)) * FORM_HEIGHT;

  const fitness = createMemo(() =>
    linePaths(
      props.days.map((d, i) => [x(i), yLoad(d.fitness)]),
      props.todayIndex,
    ),
  );
  const fatigue = createMemo(() =>
    linePaths(
      props.days.map((d, i) => [x(i), yLoad(d.fatigue)]),
      props.todayIndex,
    ),
  );
  const form = createMemo(() =>
    linePaths(
      props.days.map((d, i) => [x(i), yForm(d.form)]),
      props.todayIndex,
    ),
  );
  const hasProjection = () => props.todayIndex < n() - 1;

  const barWidth = () => Math.max(1.5, Math.min(6, (plotWidth() / Math.max(1, n())) * 0.6));
  const barPath = (i: number, tss: number) => {
    const w = barWidth();
    const x0 = x(i) - w / 2;
    const x1 = x0 + w;
    const base = TOP + LOAD_HEIGHT;
    const top = yLoad(tss);
    const r = Math.min(2, w / 2, base - top);
    return `M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x1 - r}Q${x1},${top} ${x1},${top + r}V${base}Z`;
  };

  const xTicks = createMemo(() => {
    const count = Math.min(5, n());
    if (count <= 1) return [0];
    return Array.from({ length: count }, (_, k) => Math.round((k * (n() - 1)) / (count - 1)));
  });

  /** Direct labels at the right end, only when the two lines are far enough apart. */
  const endLabels = createMemo(() => {
    const last = props.days[n() - 1];
    if (!last) return null;
    const a = yLoad(last.fitness);
    const b = yLoad(last.fatigue);
    return Math.abs(a - b) >= 14 ? { fitness: a, fatigue: b, day: last } : null;
  });

  const pick = (clientX: number) => {
    if (!box || n() === 0) return;
    const rect = box.getBoundingClientRect();
    const fraction = (clientX - rect.left - PAD_LEFT) / plotWidth();
    setPicked(Math.max(0, Math.min(n() - 1, Math.round(fraction * (n() - 1)))));
  };

  const onKey = (e: KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, PageUp: -7, PageDown: 7 }[e.key];
    if (step !== undefined) {
      e.preventDefault();
      setPicked(Math.max(0, Math.min(n() - 1, active() + step)));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setPicked(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setPicked(n() - 1);
    }
  };

  return (
    <div class={styles.wrap}>
      <Show when={day()}>
        {(d) => (
          <div class={styles.readout} aria-live="polite">
            <p class={styles.readoutDate}>
              {active() === props.todayIndex ? `Today, ${shortDate(d().date)}` : longDate(d().date)}
              <Show when={d().projected}>
                <span class={styles.projectedTag}>Projected</span>
              </Show>
            </p>
            <dl class={styles.values}>
              <div>
                <dt>
                  <span class={cx(styles.key, styles.key1)} /> Fitness
                </dt>
                <dd>{Math.round(d().fitness)}</dd>
              </div>
              <div>
                <dt>
                  <span class={cx(styles.key, styles.key2)} /> Fatigue
                </dt>
                <dd>{Math.round(d().fatigue)}</dd>
              </div>
              <div>
                <dt>
                  <span class={cx(styles.key, styles.key3)} /> Form
                </dt>
                <dd>{signed(d().form)}</dd>
              </div>
              <div>
                <dt>
                  <span class={styles.barKey} /> TSS
                </dt>
                <dd>{Math.round(d().tss)}</dd>
              </div>
            </dl>
          </div>
        )}
      </Show>

      <div
        ref={box}
        class={styles.plot}
        tabIndex={0}
        role="group"
        aria-label="Fitness, fatigue and form by day. Use the arrow keys to move between days."
        onKeyDown={onKey}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerMove={(e) => {
          if (e.pointerType === 'mouse' || e.buttons) pick(e.clientX);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') setPicked(null);
        }}
      >
        <svg width={width()} height={HEIGHT} aria-hidden="true" class={styles.svg}>
          {/* Load panel grid and y ticks */}
          <For
            each={Array.from(
              { length: loadMax().max / loadMax().step + 1 },
              (_, k) => k * loadMax().step,
            )}
          >
            {(v) => (
              <>
                <line
                  class={v === 0 ? styles.axis : styles.grid}
                  x1={PAD_LEFT}
                  x2={width() - PAD_RIGHT}
                  y1={yLoad(v)}
                  y2={yLoad(v)}
                />
                <text
                  class={styles.tick}
                  x={PAD_LEFT - 6}
                  y={yLoad(v)}
                  dy="0.32em"
                  text-anchor="end"
                >
                  {v}
                </text>
              </>
            )}
          </For>

          {/* Daily TSS columns */}
          <For each={props.days}>
            {(d, i) => (
              <Show when={d.tss > 0}>
                <path
                  class={cx(styles.bar, d.projected && styles.barProjected)}
                  d={barPath(i(), d.tss)}
                />
              </Show>
            )}
          </For>

          {/* Fitness and fatigue */}
          <path class={cx(styles.line, styles.series2)} d={fatigue().actual} />
          <path class={cx(styles.line, styles.series2, styles.dashed)} d={fatigue().projected} />
          <path class={cx(styles.line, styles.series1)} d={fitness().actual} />
          <path class={cx(styles.line, styles.series1, styles.dashed)} d={fitness().projected} />

          <Show when={endLabels()}>
            {(labels) => (
              <>
                <text
                  class={styles.endLabel}
                  x={width() - PAD_RIGHT - 4}
                  y={labels().fitness - 8}
                  text-anchor="end"
                >
                  Fitness {Math.round(labels().day.fitness)}
                </text>
                <text
                  class={styles.endLabel}
                  x={width() - PAD_RIGHT - 4}
                  y={labels().fatigue - 8}
                  text-anchor="end"
                >
                  Fatigue {Math.round(labels().day.fatigue)}
                </text>
              </>
            )}
          </Show>

          {/* Form panel */}
          <text class={styles.panelLabel} x={PAD_LEFT} y={FORM_TOP - 6}>
            Form
          </text>
          <For each={FORM_LINES.filter((v) => v >= formRange().min && v <= formRange().max)}>
            {(v) => (
              <>
                <line
                  class={v === 0 ? styles.axis : styles.grid}
                  x1={PAD_LEFT}
                  x2={width() - PAD_RIGHT}
                  y1={yForm(v)}
                  y2={yForm(v)}
                />
                <text
                  class={styles.tick}
                  x={PAD_LEFT - 6}
                  y={yForm(v)}
                  dy="0.32em"
                  text-anchor="end"
                >
                  {signed(v)}
                </text>
              </>
            )}
          </For>
          <text class={styles.band} x={width() - PAD_RIGHT} y={yForm(5) - 4} text-anchor="end">
            Fresh
          </text>
          <text class={styles.band} x={width() - PAD_RIGHT} y={yForm(-10) + 12} text-anchor="end">
            Building
          </text>
          <Show when={formRange().min < -30}>
            <text class={styles.band} x={width() - PAD_RIGHT} y={yForm(-30) + 12} text-anchor="end">
              Very tired
            </text>
          </Show>
          <path class={cx(styles.line, styles.series3)} d={form().actual} />
          <path class={cx(styles.line, styles.series3, styles.dashed)} d={form().projected} />

          {/* Today marker when the plan continues past it */}
          <Show when={hasProjection()}>
            <line
              class={styles.today}
              x1={x(props.todayIndex)}
              x2={x(props.todayIndex)}
              y1={TOP - 4}
              y2={FORM_TOP + FORM_HEIGHT}
            />
            <text class={styles.todayLabel} x={x(props.todayIndex) + 4} y={TOP - 4}>
              Today
            </text>
          </Show>

          {/* Crosshair */}
          <Show when={day()}>
            {(d) => (
              <g class={styles.crosshair}>
                <line x1={x(active())} x2={x(active())} y1={TOP} y2={FORM_TOP + FORM_HEIGHT} />
                <circle class={styles.dot1} cx={x(active())} cy={yLoad(d().fitness)} r={4} />
                <circle class={styles.dot2} cx={x(active())} cy={yLoad(d().fatigue)} r={4} />
                <circle class={styles.dot3} cx={x(active())} cy={yForm(d().form)} r={4} />
              </g>
            )}
          </Show>

          {/* Date axis */}
          <For each={xTicks()}>
            {(i, k) => (
              <text
                class={styles.tick}
                x={x(i)}
                y={HEIGHT - 6}
                text-anchor={k() === 0 ? 'start' : k() === xTicks().length - 1 ? 'end' : 'middle'}
              >
                {props.days[i] ? shortDate(props.days[i]!.date) : ''}
              </text>
            )}
          </For>
        </svg>
      </div>

      <ul class={styles.legend}>
        <li>
          <span class={cx(styles.key, styles.key1)} /> Fitness
        </li>
        <li>
          <span class={cx(styles.key, styles.key2)} /> Fatigue
        </li>
        <li>
          <span class={cx(styles.key, styles.key3)} /> Form
        </li>
        <li>
          <span class={styles.barKey} /> Daily TSS
        </li>
        <Show when={hasProjection()}>
          <li>
            <span class={styles.dashKey} /> From your plan
          </li>
        </Show>
      </ul>
    </div>
  );
}

/** The same data as a table: one row per week, ending on the last day shown. */
export function TrainingLoadTable(props: { days: readonly LoadDay[]; todayIndex: number }) {
  const rows = createMemo(() => {
    const out: { date: string; tss: number; day: LoadDay; projected: boolean }[] = [];
    for (let end = props.days.length - 1; end >= 0; end -= 7) {
      const week = props.days.slice(Math.max(0, end - 6), end + 1);
      const day = props.days[end]!;
      out.push({
        date: day.date,
        tss: Math.round(week.reduce((s, d) => s + d.tss, 0)),
        day,
        projected: day.projected,
      });
    }
    return out;
  });
  return (
    <details class={styles.tableView}>
      <summary>Show as table</summary>
      <table class={styles.table}>
        <thead>
          <tr>
            <th scope="col">Week to</th>
            <th scope="col">TSS</th>
            <th scope="col">Fitness</th>
            <th scope="col">Fatigue</th>
            <th scope="col">Form</th>
          </tr>
        </thead>
        <tbody>
          <For each={rows()}>
            {(row) => (
              <tr class={cx(row.projected && styles.projectedRow)}>
                <th scope="row">
                  {shortDate(row.date)}
                  {row.projected ? ' (plan)' : ''}
                </th>
                <td>{row.tss}</td>
                <td>{Math.round(row.day.fitness)}</td>
                <td>{Math.round(row.day.fatigue)}</td>
                <td>{signed(row.day.form)}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </details>
  );
}
