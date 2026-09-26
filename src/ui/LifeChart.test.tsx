// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { LifeChart, type ChartPoint } from './LifeChart';

const pts = (values: number[], first = 1): ChartPoint[] => values.map((value, i) => ({ life: first + i, value }));
const draw = (points: ChartPoint[], kind: 'health' | 'level' = 'level') =>
  render(<LifeChart points={points} kind={kind} label="chart" />).container.querySelector('svg')!;
const num = (el: Element, a: string) => Number(el.getAttribute(a));

describe('LifeChart', () => {
  it('draws one dot per life through one line, the last dot marked as this life', () => {
    const svg = draw(pts([1, 2, 2, 4]));
    expect(svg.querySelectorAll('.chart__dot')).toHaveLength(4);
    expect(svg.querySelector('.chart__line')!.getAttribute('points')!.split(' ')).toHaveLength(4);
    expect(svg.querySelectorAll('.chart__dot--now')).toHaveLength(1);
    expect(svg.querySelectorAll('.chart__dot')[3]).toHaveClass('chart__dot--now');
  });
  it('a higher value sits higher on screen, and lives run left to right', () => {
    const dots = [...draw(pts([1, 3])).querySelectorAll('.chart__dot')];
    expect(num(dots[1]!, 'cy')).toBeLessThan(num(dots[0]!, 'cy'));
    expect(num(dots[1]!, 'cx')).toBeGreaterThan(num(dots[0]!, 'cx'));
  });
  it('one recorded life draws one dot and no line, and no NaN anywhere', () => {
    const svg = draw(pts([2]));
    expect(svg.querySelectorAll('.chart__dot')).toHaveLength(1);
    expect(svg.querySelector('.chart__line')).toBeNull();
    expect(svg.outerHTML).not.toMatch(/NaN|Infinity/);
  });
  it('flat values still have an axis with height: a skill at zero, health that did not rise', () => {
    expect(draw(pts([0, 0, 0])).outerHTML).not.toMatch(/NaN|Infinity/);
    const flat = draw(pts([100, 100]), 'health');
    expect(flat.outerHTML).not.toMatch(/NaN|Infinity/);
    expect([...flat.querySelectorAll('.chart__y')].map((t) => t.textContent)).toEqual(['100', '101']);
  });
  it('the axes are round: health on a round step around its values, a level from 0, lowest label first', () => {
    const health = [...draw(pts([100.4, 142.9]), 'health').querySelectorAll('.chart__y')].map((t) => t.textContent);
    expect(health).toEqual(['100', '120', '140', '160']);
    const long = [...draw(pts([100, 683]), 'health').querySelectorAll('.chart__y')].map((t) => t.textContent);
    expect(long).toEqual(['0', '200', '400', '600', '800']);
    const level = [...draw(pts([15, 81])).querySelectorAll('.chart__y')].map((t) => t.textContent);
    expect(level).toEqual(['0', '20', '40', '60', '80', '100']);
  });
  it('a hundred lives: every dot drawn, the last life labelled, at most nine grid lines, no NaN', () => {
    const svg = draw(pts(Array.from({ length: 100 }, (_, i) => Math.floor(i / 10))));
    expect(svg.querySelectorAll('.chart__dot')).toHaveLength(100);
    // Many lives shrink the dots (at most a third of the pitch), never below the floor; this life's stays large.
    const r = num(svg.querySelectorAll('.chart__dot')[0]!, 'r');
    expect(r).toBeLessThan(3);
    expect(r).toBeGreaterThanOrEqual(1);
    expect(num(svg.querySelector('.chart__dot--now')!, 'r')).toBe(5);
    expect([...svg.querySelectorAll('.chart__x')].at(-1)!.textContent).toBe('100');
    expect(svg.querySelectorAll('.chart__grid').length).toBeLessThanOrEqual(9);
    expect(svg.outerHTML).not.toMatch(/NaN|Infinity/);
  });
  it('a few lives with room to spare are all labelled', () => {
    const xs = [...draw(pts([1, 2, 3])).querySelectorAll('.chart__x')].map((t) => t.textContent);
    expect(xs).toEqual(['1', '2', '3']);
  });
  it('life labels come from the lives\' own numbers, not their places', () => {
    const xs = [...draw(pts(Array.from({ length: 30 }, () => 1), 71)).querySelectorAll('.chart__x')].map((t) => t.textContent);
    expect(xs[0]).toBe('71');
    expect(xs.at(-1)).toBe('100');
    expect(xs.slice(1, -1).every((t) => Number(t) % 2 === 0)).toBe(true);
  });
  it('life labels are round steps between the first life and this one', () => {
    const xs = [...draw(pts(Array.from({ length: 92 }, () => 1))).querySelectorAll('.chart__x')].map((t) => t.textContent);
    expect(xs[0]).toBe('1');
    expect(xs.at(-1)).toBe('92');
    // At the fallback width 92 lives are about 6px apart, so the round step that keeps the gap is 5.
    expect(xs.slice(1, -1).every((t) => Number(t) % 5 === 0)).toBe(true);
    expect(xs).toContain('85');   // 90 is too close to 92 and gives way to it
  });
  it('life labels never crowd: at every count from 1 to 120, adjacent labels are at least the gap apart, the first and last labelled', () => {
    for (let n = 1; n <= 120; n++) {
      const { container, unmount } = render(<LifeChart points={pts(Array.from({ length: n }, () => 1))} kind="level" label="c" />);
      const labels = [...container.querySelectorAll('.chart__x')];
      const xs = labels.map((t) => num(t, 'x'));
      for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!, `n=${n}`).toBeGreaterThanOrEqual(28);
      expect(labels.at(-1)!.textContent, `n=${n}`).toBe(String(n));
      expect(labels[0]!.textContent, `n=${n}`).toBe('1');
      unmount();
    }
  });
  it('sizes its view box to the box it is given, so one unit is one pixel', () => {
    let fire: (w: number, h: number) => void = () => {};
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb: (e: { contentRect: { width: number; height: number } }[]) => void) { fire = (width, height) => cb([{ contentRect: { width, height } }]); }
      observe() {}
      disconnect() {}
    });
    const svg = draw(pts([1, 2]));
    act(() => fire(350, 180));
    expect(svg.getAttribute('viewBox')).toBe('0 0 350 180');
    act(() => fire(0, 0));
    expect(svg.getAttribute('viewBox')).toBe('0 0 350 180');
    vi.unstubAllGlobals();
  });
  it('the level axis starts at 0: a 1 sits above a 0, and at the same height whatever else is charted', () => {
    const [zero, one] = [...draw(pts([0, 1])).querySelectorAll('.chart__dot')];
    expect(num(one!, 'cy')).toBeLessThan(num(zero!, 'cy'));
    const [, alsoOne] = [...draw(pts([1, 1])).querySelectorAll('.chart__dot')];
    expect(num(alsoOne!, 'cy')).toBe(num(one!, 'cy'));
  });
  it('the line carries its kind, so health and a level are drawn in their own colours', () => {
    expect(draw(pts([1, 2]), 'health').querySelector('.chart__line')).toHaveClass('chart__line--health');
    expect(draw(pts([1, 2])).querySelector('.chart__line')).toHaveClass('chart__line--level');
  });
  it('is an image named by its label', () => {
    expect(draw(pts([1, 2]))).toHaveAttribute('role', 'img');
  });
});
