// @vitest-environment jsdom
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { rebirthGain, type DeathSummary } from '../engine/rebirth';
import type { LifeRecord } from '../engine/types';
import { testBook as book } from '../test-utils/book';
import { DeathOverlay } from './DeathOverlay';

const ids = book.roster.map((s) => s.id);
const core = (lv: Record<string, number>) => Object.fromEntries(ids.map((id) => [id, lv[id] ?? 0]));
const [a, b] = ids as [string, string];
const history: LifeRecord[] = [
  { life: 1, maxHealth: 100.4, core: core({ [a]: 1 }) },
  { life: 2, maxHealth: 101.3, core: core({ [a]: 2, [b]: 1 }) },
  { life: 3, maxHealth: 103.0, core: core({ [a]: 3, [b]: 1 }) },
];
const summary: DeathSummary = {
  life: 3, runTicks: 5820, gain: rebirthGain(5820), maxHealthFrom: 101.3, maxHealthTo: 103.0,
  chapter: 0, finished: false, finishes: 0, during: null,
};
const from = core({ [a]: 2, [b]: 1 });
const el = (s: DeathSummary = summary, onBegin = () => {}, h: readonly LifeRecord[] = history) =>
  <DeathOverlay summary={s} content={book} book={book.name} history={h} from={from} onBegin={onBegin} />;
const show = (s?: DeathSummary, onBegin?: () => void) => render(el(s, onBegin));
const picks = () => [...document.querySelectorAll<HTMLButtonElement>('button.pick')];

describe('DeathOverlay', () => {
  it('is a modal dialog titled with the life that ended, its clock as "alive"', () => {
    show();
    expect(screen.getByRole('dialog', { name: 'Life 3 ends' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('09:42 alive')).toBeInTheDocument();
  });
  it('lists Health first, then every roster skill in book order, each with core from and to', () => {
    show();
    expect(picks().map((p) => p.querySelector('.pick__name')!.textContent)).toEqual(['Health', ...book.roster.map((s) => s.name)]);
    expect(picks()[1]!.querySelector('.pick__lv')).toHaveTextContent('2 \u2192 3');
    expect(picks()[1]!.querySelector('.pick__d')).toHaveTextContent('+1');
  });
  it('a skill whose core did not move is listed, dimmed, with an empty gain cell', () => {
    show();
    const rowB = picks()[2]!;
    expect(rowB).toHaveClass('pick--still');
    expect(rowB.querySelector('.pick__lv')).toHaveTextContent('1 \u2192 1');
    expect(rowB.querySelector('.pick__d')!.textContent).toBe('');
  });
  it('health reads to one decimal from the summary, and from + gain = to as shown', () => {
    show({ ...summary, maxHealthFrom: 101.34, maxHealthTo: 103.08 });
    const health = picks()[0]!;
    expect(health.querySelector('.pick__lv')).toHaveTextContent('101.3 \u2192 103.0');
    expect(health.querySelector('.pick__d')).toHaveTextContent('+1.7');
    expect(health).not.toHaveClass('pick--still');
  });
  it('Health is selected on open and charted, one dot per recorded life', () => {
    show();
    expect(picks()[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'Health \u00B7 max health by life' }).querySelectorAll('.chart__dot')).toHaveLength(3);
    expect(screen.getByText('now 103.0')).toBeInTheDocument();
    expect(screen.getByText('life 1 \u2192 3 \u00B7 the last point is this life')).toBeInTheDocument();
  });
  it('a click selects a skill and charts its core level', () => {
    show();
    act(() => picks()[1]!.click());
    expect(picks()[1]).toHaveAttribute('aria-pressed', 'true');
    expect(picks()[0]).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('img', { name: `${book.roster[0]!.name} \u00B7 core level by life` })).toBeInTheDocument();
    expect(screen.getByText('now 3')).toBeInTheDocument();
    // The chart is the skill's levels by life (1, 2, 3), on a level axis from 0: not max health.
    expect([...document.querySelectorAll('.chart__y')].map((t) => t.textContent)).toEqual(['0', '1', '2', '3']);
  });
  it('a skill missing from an older record charts as 0 there, below its later level, and draws no NaN', () => {
    const h: LifeRecord[] = [{ life: 1, maxHealth: 100.4, core: { [a]: 1 } }, ...history.slice(1)];
    render(el(summary, () => {}, h));
    act(() => picks()[2]!.click());
    const svg = screen.getByRole('img');
    expect(svg.outerHTML).not.toMatch(/NaN/);
    const dots = [...svg.querySelectorAll('.chart__dot')];
    expect(Number(dots[0]!.getAttribute('cy'))).toBeGreaterThan(Number(dots[1]!.getAttribute('cy')));
  });
  it('health that did not rise is dimmed like a skill, with an empty gain cell', () => {
    show({ ...summary, maxHealthFrom: 103.0, maxHealthTo: 103.0 });
    expect(picks()[0]).toHaveClass('pick--still');
    expect(picks()[0]!.querySelector('.pick__d')!.textContent).toBe('');
  });
  it('see how it ended hides the dialog and shows the pill; back restores it, the selection kept', () => {
    show();
    act(() => picks()[1]!.click());
    act(() => screen.getByRole('button', { name: 'see how it ended' }).click());
    expect(screen.queryByRole('dialog')).toBeNull();
    const pill = screen.getByRole('group', { name: 'the life that ended' });
    act(() => within(pill).getByRole('button', { name: '\u25B2 back to life 3' }).click());
    expect(screen.getByRole('dialog', { name: 'Life 3 ends' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'the life that ended' })).toBeNull();
    expect(picks()[1]).toHaveAttribute('aria-pressed', 'true');
  });
  it('under StrictMode: Begin has focus on open, the back button after looking, the toggle after back', () => {
    render(<StrictMode>{el()}</StrictMode>);
    expect(screen.getByRole('button', { name: 'Begin life 4' })).toHaveFocus();
    act(() => screen.getByRole('button', { name: 'see how it ended' }).click());
    expect(screen.getByRole('button', { name: '\u25B2 back to life 3' })).toHaveFocus();
    act(() => screen.getByRole('button', { name: '\u25B2 back to life 3' }).click());
    expect(screen.getByRole('button', { name: 'see how it ended' })).toHaveFocus();
  });
  it('Begin calls onBegin, from the dialog and from the pill', () => {
    const onBegin = vi.fn();
    show(summary, onBegin);
    act(() => screen.getByRole('button', { name: 'Begin life 4' }).click());
    act(() => screen.getByRole('button', { name: 'see how it ended' }).click());
    act(() => within(screen.getByRole('group', { name: 'the life that ended' })).getByRole('button', { name: 'Begin life 4' }).click());
    expect(onBegin).toHaveBeenCalledTimes(2);
  });
  it('a death mid-fight says so, and names the port reached', () => {
    const raid = book.actions.raid!;
    show({ ...summary, during: 'raid' });
    expect(screen.getByText(new RegExp(`fell during .* ${raid.noun}`))).toHaveClass('hurt-text');
    expect(screen.getByText(new RegExp(`reached ${book.chapters[0]!.head.numeral}`))).toBeInTheDocument();
  });
  it('a finish: the book finished as title, the beat, the count, and Read again; back reads "back"', () => {
    show({ ...summary, finished: true, finishes: 2 });
    expect(screen.getByRole('dialog', { name: `${book.name}, finished` })).toBeInTheDocument();
    expect(screen.getByText(book.actions[book.finish]!.beat!)).toBeInTheDocument();
    expect(screen.getByText('finish 2')).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'see how it ended' }).click());
    expect(screen.getByRole('button', { name: '\u25B2 back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Read again' })).toBeInTheDocument();
  });
  it('a first overlay after an old save (one record) draws one dot', () => {
    render(el(summary, () => {}, history.slice(-1)));
    expect(screen.getByRole('img').querySelectorAll('.chart__dot')).toHaveLength(1);
  });
});
