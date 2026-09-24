// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { balance } from '../balance';
import { rebirthGain, type DeathSummary } from '../engine/rebirth';
import { testBook as book } from '../test-utils/book';
import { DeathCard } from './DeathCard';

const summary: DeathSummary = {
  // Derived from the real gain, so the fixture cannot drift from the formula it displays.
  life: 3, runTicks: 5820, gain: rebirthGain(5820), maxHealthFrom: 100, maxHealthTo: 100 + rebirthGain(5820),
  coreGains: [{ skill: 'fish', from: 4, to: 6, progress: 0.62 }, { skill: 'salvage', from: 3, to: 5, progress: 0.18 }],
  chapter: 0, finished: false, finishes: 0, during: null,
};
const card = (s: DeathSummary = summary, onBegin = () => {}) => render(<DeathCard summary={s} content={book} onBegin={onBegin} />);

describe('DeathCard', () => {
  it('is a labelled modal dialog titled with the life that ended and its clock', () => {
    card();
    expect(screen.getByRole('dialog', { name: 'Life 3 ends' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('09:42 on the clock')).toBeInTheDocument();
  });
  it('lists each skill whose core moved, as "core from -> to"', () => {
    const { container } = card();
    expect(screen.getByText('Fish')).toBeInTheDocument();
    const levels = [...container.querySelectorAll('.card__lv')];
    expect(levels.map((e) => e.textContent)).toEqual(['core 4 \u2192 6', 'core 3 \u2192 5']);
    expect(levels[0]!.querySelector('b')).toHaveTextContent('6');   // the new level is bold, as in the mockup
  });
  it('shows max health from and to, and the reason in full, all to two decimals so the sum checks', () => {
    const { container } = card();
    expect(container.querySelector('.card__hp b')).toHaveTextContent('100.00 \u2192 101.52');
    expect(container.querySelector('.card__new')).toHaveTextContent('101.52');
    expect(screen.getByText(`+1.52 from 09:42 alive \u00B7 ${balance.rebirth.growthRate}^9.70 \u2212 1`)).toBeInTheDocument();
  });
  it('the reason line reproduces its own numbers: from + gain = to, and rate^minutes - 1 = gain', () => {
    const { container } = card({ ...summary, runTicks: 6208, gain: rebirthGain(6208), maxHealthFrom: 101.681, maxHealthTo: 101.681 + rebirthGain(6208) });
    const [from, to] = container.querySelector('.card__hp b')!.textContent!.split(' \u2192 ').map(Number);
    const why = container.querySelector('.card__why')!.textContent!;
    const gain = Number(/^\+([\d.]+)/.exec(why)![1]);
    const exponent = Number(/\^([\d.]+)/.exec(why)![1]);
    expect(from! + gain).toBeCloseTo(to!, 2);
    expect(balance.rebirth.growthRate ** exponent - 1).toBeCloseTo(gain, 1);
  });
  it('from + gain = to holds on every card, and nothing reads higher than it is, including at rounding edges', () => {
    const pairs: [number, number][] = [[100.004, 100.008], [101.995, 102.004], [101.996, 103.2], [100, 101.5206], [103.3399, 105.0]];
    for (const [f, t] of pairs) {
      const { container, unmount } = card({ ...summary, maxHealthFrom: f, maxHealthTo: t, gain: t - f });
      const [from, to] = container.querySelector('.card__hp b')!.textContent!.split(' \u2192 ').map(Number);
      const gain = Number(/^\+([\d.]+)/.exec(container.querySelector('.card__why')!.textContent!)![1]);
      expect(from! + gain, `${f} -> ${t}`).toBeCloseTo(to!, 9);
      expect(from!).toBeLessThanOrEqual(f);
      expect(to!).toBeLessThanOrEqual(t);
      unmount();
    }
  });
  it('Begin names the next life, has focus, and calls onBegin', () => {
    const onBegin = vi.fn();
    card(summary, onBegin);
    const begin = screen.getByRole('button', { name: 'Begin life 4' });
    expect(begin).toHaveFocus();
    begin.click();
    expect(onBegin).toHaveBeenCalledTimes(1);
  });
  it('with no core gains there is no skill list, and the quiet line still says what starts over', () => {
    const { container } = card({ ...summary, coreGains: [] });
    expect(container.querySelector('.card__gains')).toBeNull();
    expect(screen.getByText('pack, food, queue and run levels start over')).toBeInTheDocument();
  });
  it('names the port the life reached', () => {
    card({ ...summary, chapter: 1 });
    expect(screen.getByText('reached II \u00B7 Two')).toBeInTheDocument();
  });
  it('a death mid-fight says which row it fell during; a death to decay alone does not', () => {
    const fight = card({ ...summary, during: 'raid' });
    expect(screen.getByText('fell during Fight the raid')).toHaveClass('hurt-text');
    fight.unmount();
    card();
    expect(screen.queryByText(/fell during/)).toBeNull();
    expect(screen.getByText('reached I \u00B7 One')).toBeInTheDocument();
  });
  it('is never the finish card: no book name, no count, no Read again', () => {
    card({ ...summary, finished: true, finishes: 1 });
    expect(screen.queryByText(book.name)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Read again' })).toBeNull();
  });
});
