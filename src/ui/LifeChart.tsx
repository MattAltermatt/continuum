import { useLayoutEffect, useRef, useState } from 'react';

/** One life's reading of the charted value: the life's number and the value it ended with. */
export interface ChartPoint { readonly life: number; readonly value: number }

/** Fallback width, before the box is measured (and always under jsdom). Display. */
const W = 600;
/** Fallback height, before the box is measured. Display. */
const H = 300;
/** Inset from every edge to the plot; the axis labels sit centred in it. Display. */
const PAD = 28;
/** Label size in pixels; one unit is one pixel, so it holds at every tier. Display. */
const FONT = 11;
/** A life's dot radius at most. Display. */
const DOT = 3;
/** This life's dot radius. Display. */
const DOT_NOW = 5;
/** A life's dot radius at least, however many lives. Display. */
const DOT_MIN = 1;
/** A dot's radius is at most this fraction (one over) of the pitch between lives. Display. */
const DOT_SPACING = 3;
/** The health axis's intervals at most; a round step is chosen to fit. Display. */
const HEALTH_LINES = 4;
/** The level axis's intervals at most; a round step is chosen to fit. Display. */
const MAX_GRID_LINES = 8;
/** Round steps are these times a power of ten: 1, 2, 5, 10, 20, 50 ... Display. */
const NICE = [1, 2, 5, 10] as const;
/** Pixels at least between two life labels. Display. */
const MIN_LABEL_GAP = 28;

/** The smallest round step (1, 2, 5 times a power of ten) at least `raw`; 1 for nothing to fit. */
function nice(raw: number): number {
  if (!(raw > 0)) return 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return NICE.map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
}

/**
 * One row's value across every life (#90): a dot per life joined by a line,
 * this life's dot larger, a grid of values behind and life numbers beneath.
 * The view box is the box's own size in pixels, measured on mount and on every
 * resize, so labels are the same size at every tier; jsdom measures nothing
 * and sees the fallback. Colours are the stylesheet's, by class.
 */
export function LifeChart({ points, kind, label }: { points: readonly ChartPoint[]; kind: 'health' | 'level'; label: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: W, h: H });

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    // Measured before the first paint, so the chart never draws at the fallback size in a browser.
    const rect = box.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) setSize({ w: rect.width, h: rect.height });
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // A hidden box measures zero: keep the last real size rather than collapse the plot.
        if (width > 0 && height > 0) setSize({ w: width, h: height });
      }
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // With no points there is no range to draw; the overlay always passes at least one.
  if (points.length === 0) return null;

  const { w, h } = size;
  const n = points.length;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Round axes (the user, 2026-09-25): health on a round step around its values, a level from 0 on a whole round step,
  // the top line at or above the highest value. A value that never moved still gets an axis one step tall.
  // Whole steps only: max health and levels read in whole numbers on an axis.
  const step = Math.max(1, kind === 'health' ? nice((max - min) / HEALTH_LINES) : nice(max / MAX_GRID_LINES));
  const lo = kind === 'health' ? Math.floor(min / step) * step : 0;
  const hi = Math.max(lo + step, Math.ceil(max / step) * step);
  const grid: number[] = [];
  for (let k = 0; lo + k * step <= hi; k++) grid.push(lo + k * step);

  const x = (i: number) => (n === 1 ? w / 2 : PAD + i * (w - 2 * PAD) / (n - 1));
  const y = (v: number) => h - PAD - (v - lo) * (h - 2 * PAD) / (hi - lo);
  const r = Math.min(DOT, Math.max(DOT_MIN, (w - 2 * PAD) / Math.max(1, n - 1) / DOT_SPACING));
  const pairs = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');

  // Life labels on a round step wide enough to keep the gap, always with the first life and this one; a round
  // label too close to either end gives way to it.
  const pitch = n === 1 ? w : (w - 2 * PAD) / (n - 1);
  // Whole lives only: a step under 1 would test `life % 0.2` in floating point and drop lives that fit.
  const every = Math.max(1, nice(MIN_LABEL_GAP / pitch));
  const labelled = points.map((_, i) => i).filter((i) => {
    if (i === 0 || i === n - 1) return true;
    return points[i]!.life % every === 0 && x(i) - x(0) >= MIN_LABEL_GAP && x(n - 1) - x(i) >= MIN_LABEL_GAP;
  });

  return (
    <div className={`chart__box chart__box--${kind}`} ref={boxRef}>
      <svg className="chart__svg" role="img" aria-label={label} viewBox={`0 0 ${w} ${h}`}>
        {grid.map((v) => (
          <g key={v}>
            <line className="chart__grid" x1={PAD} x2={w - PAD} y1={y(v)} y2={y(v)} />
            <text className="chart__y" fontSize={FONT} x={PAD / 2} y={y(v)} textAnchor="middle" dominantBaseline="middle">{v}</text>
          </g>
        ))}
        {n > 1 && <polyline className={`chart__line chart__line--${kind}`} points={pairs} />}
        {points.map((p, i) => (
          i === n - 1
            ? <circle key={p.life} className="chart__dot chart__dot--now" cx={x(i)} cy={y(p.value)} r={DOT_NOW} />
            : <circle key={p.life} className="chart__dot" cx={x(i)} cy={y(p.value)} r={r} />
        ))}
        {labelled.map((i) => (
          <text key={points[i]!.life} className="chart__x" fontSize={FONT} x={x(i)} y={h - PAD / 2} textAnchor="middle" dominantBaseline="middle">{points[i]!.life}</text>
        ))}
      </svg>
    </div>
  );
}
