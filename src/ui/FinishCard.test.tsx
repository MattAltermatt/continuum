// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { balance } from '../balance';
import { rebirthGain, type DeathSummary } from '../engine/rebirth';
import { ticksPerSecond } from '../engine/time';
import { testBook as book } from '../test-utils/book';
import { realClick } from '../test-utils/realClick';
import { FinishCard } from './FinishCard';

/** 31:04 on the clock. */
const runTicks = 31 * balance.time.ticksPerMinute + 4 * ticksPerSecond();
const summary: DeathSummary = {
  life: 71, runTicks, gain: rebirthGain(runTicks), maxHealthFrom: 412.37, maxHealthTo: 412.37 + rebirthGain(runTicks),
  coreGains: [{ skill: 'fight', from: 41, to: 43, progress: 0.22 }, { skill: 'rig', from: 36, to: 37, progress: 0.09 }],
  chapter: 1, finished: true, finishes: 1, during: null,
};
const card = (s: DeathSummary = summary, onReadAgain = () => {}) =>
  render(<FinishCard summary={s} content={book} book={book.name} onReadAgain={onReadAgain} />);

describe('FinishCard', () => {
  it('is a modal dialog titled with the book, and carries the finish row\'s beat in the serif line', () => {
    const { container } = card();
    expect(screen.getByRole('dialog', { name: `${book.name}, finished` })).toHaveAttribute('aria-modal', 'true');
    expect(container.querySelector('.card__title')).toHaveTextContent(book.name);
    expect(container.querySelector('.card__line')).toHaveTextContent(book.actions[book.finish]!.beat!);
  });
  it('shows the clock, the core gains and max health from and to, as the death card does', () => {
    const { container } = card();
    expect(screen.getByText('31:04 on the clock')).toBeInTheDocument();
    expect([...container.querySelectorAll('.card__lv')].map((e) => e.textContent)).toEqual(['core 41 \u2192 43', 'core 36 \u2192 37']);
    const [from, to] = container.querySelector('.card__hp b')!.textContent!.split(' \u2192 ').map(Number);
    expect(from).toBe(412.37);
    expect(to).toBeCloseTo(412.37 + rebirthGain(runTicks), 1);
    expect(container.querySelector('.card__why')).toHaveTextContent(`from 31:04 alive \u00B7 ${balance.rebirth.growthRate}^`);
  });
  it('counts the finishes, this one included', () => {
    const { container, unmount } = card();
    expect(container.querySelector('.card__count')).toHaveTextContent('finished 1\u00D7');
    unmount();
    const again = card({ ...summary, finishes: 3 });
    expect(again.container.querySelector('.card__count')).toHaveTextContent('finished 3\u00D7');
  });
  it('Read again has focus and calls back once; the quiet line names where the next life starts', async () => {
    const onReadAgain = vi.fn();
    card(summary, onReadAgain);
    const button = screen.getByRole('button', { name: 'Read again' });
    expect(button).toHaveFocus();
    await act(() => realClick(button));
    expect(onReadAgain).toHaveBeenCalledTimes(1);
    expect(screen.getByText('back to I \u00B7 One \u00B7 pack, food, queue and run levels start over')).toBeInTheDocument();
  });
  it('says nothing of a port reached or a fall: a finish is neither', () => {
    card({ ...summary, during: 'raid' });
    expect(screen.queryByText(/reached/)).toBeNull();
    expect(screen.queryByText(/fell during/)).toBeNull();
  });
});
