// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { balance } from '../balance';
import { cycleOf, unlockAt } from '../engine/automation';
import { enqueue, newState } from '../engine/queue';
import type { AutoMode, GameState } from '../engine/types';
import type { Book } from '../data/types';
import { testBook as book } from '../test-utils/book';
import { realClick } from '../test-utils/realClick';
import { ActionRow, outputsOf } from './ActionRow';
import { STOP, WARN } from './glyphs';

const N = balance.automation.unlockRepeatable;
const fresh = (): GameState => newState(book.roster);
const earned = (s: GameState, id: string, n: number): GameState => ({ ...s, completionCounts: { ...s.completionCounts, [id]: n } });
const auto = (s: GameState, id: string, mode: AutoMode): GameState => ({ ...s, automation: { ...s.automation, [id]: mode } });

function row(state: GameState, id: string, running = false) {
  const spies = { onNow: vi.fn(), onQueue: vi.fn(), onAutomate: vi.fn() };
  const view = (s: GameState, r = running) => <ActionRow action={book.actions[id]!} content={book} state={s} running={r} {...spies} />;
  const r = render(view(state));
  const el = () => r.container.querySelector(`[data-action="${id}"]`)!;
  return { ...r, ...spies, el, rerenderWith: (s: GameState, run = running) => r.rerender(view(s, run)) };
}
const play = () => screen.getByRole('button', { name: /^do it now/ });
const plus = () => screen.getByRole('button', { name: /^add to queue/ });
const chip = () => screen.getByRole('button', { name: /^automation:/ });
/**
 * The end of the row's CSS animation. jsdom has no AnimationEvent, so React
 * listens there for the prefixed name; Chrome sends the plain one. Both, so the
 * test holds either way.
 */
function animationEnd(el: Element) {
  fireEvent(el, new Event('animationend', { bubbles: true }));
  fireEvent(el, new Event('webkitAnimationEnd', { bubbles: true }));
}

describe('ActionRow: one of an item', () => {
  const shop: Book = { ...book, items: { ...book.items, scrap: { ...book.items.scrap!, name: 'scraps', one: 'scrap' } }, actions: { ...book.actions, satchel: { ...book.actions.satchel!, itemCosts: [{ item: 'scrap', amount: 1 }] } } };
  it('a harvest of 1 and a cost of 1 print the name of one unit', () => {
    const at = (id: string) => render(<ActionRow action={shop.actions[id]!} content={shop} state={fresh()} running={false} onNow={vi.fn()} onQueue={vi.fn()} onAutomate={vi.fn()} />).container.querySelector(`[data-action="${id}"]`)!;
    expect(at('salvage')).toHaveTextContent('+1 scrap');
    expect(at('salvage')).not.toHaveTextContent('+1 scraps');
    expect(at('satchel')).toHaveTextContent(/1 scrap\b/);
    expect(at('satchel')).not.toHaveTextContent('1 scraps');
  });
});

describe('ActionRow: what the row reads', () => {
  it('reads verb, noun, what it owes, the output, its time and its xp', () => {
    row(fresh(), 'hull');
    expect(screen.getByText('Rig')).toBeInTheDocument();
    expect(screen.getByText('the hull')).toBeInTheDocument();
    expect(screen.getByText(/8 scrap/)).toBeInTheDocument();
    expect(screen.getByText('decay \u00D70.50')).toBeInTheDocument();
    // 8 xp at the base 0.1 a tick, ten ticks a second.
    expect(screen.getByText('8.0s')).toBeInTheDocument();
    expect(screen.getByText('+8.0 xp')).toBeInTheDocument();
  });
  it('the middle chunk reads needs, then hurts, then the arrow and the output; an unmet need is in hurt text', () => {
    const r = row(fresh(), 'raid');
    const c2 = r.el().querySelector('.row__c2')!;
    expect([...c2.children].map((e) => e.className)).toEqual(['row__in', 'row__arr', 'row__out']);
    const inputs = [...c2.querySelector('.row__in')!.children];
    expect(inputs.map((e) => e.textContent)).toEqual(['needs a pass', '\u22121.00 hp/s']);
    expect(screen.getByText('needs a pass')).toHaveClass('need', 'need--unmet');
    expect(c2.querySelector('.row__out')).toHaveTextContent('casts off');
    r.unmount();
    row({ ...fresh(), inventory: { pass: 1 } }, 'raid');
    expect(screen.getByText('needs a pass')).not.toHaveClass('need--unmet');
  });
  it('an input part spent reads what is still owed; short of it, a warning and what the pack has', () => {
    const kept = { ...fresh(), work: { hull: { progress: 5, costsConsumed: 5 } } };
    const r = row({ ...kept, inventory: { scrap: 1 } }, 'hull');
    const owed = r.el().querySelector('.row__in > span')!;
    expect(owed).toHaveClass('row__short');
    expect(owed).toHaveTextContent(`${WARN} 3 of 8 scrap have 1`);
    r.unmount();
    const paid = row({ ...kept, inventory: { scrap: 3 } }, 'hull');
    expect(paid.el().querySelector('.row__in > span')).not.toHaveClass('row__short');
    expect(paid.el().querySelector('.row__in > span')!.textContent).toBe('3 of 8 scrap');
  });
  it('the output: +n for a harvest, a made thing by name, the effect for a one-time, casts off, the end', () => {
    expect(outputsOf(book, book.actions.salvage!)).toEqual(['+1 scrap']);
    expect(outputsOf(book, book.actions.eels!)).toEqual(['+1 eel']);
    expect(outputsOf(book, book.actions.gate!)).toEqual(['a pass']);
    expect(outputsOf(book, book.actions.hull!)).toEqual(['decay \u00D70.50']);
    expect(outputsOf(book, book.actions.satchel!)).toEqual(['stack +5']);
    expect(outputsOf(book, book.actions.net!)).toEqual(['Fish \u00D71.25']);
    expect(outputsOf(book, book.actions.raid!)).toEqual(['casts off']);
    expect(outputsOf(book, book.actions.vault!)).toEqual(['the end']);
  });
  it('the time is at the gear-aware rate: the net makes Fish 1.25 times faster, so 1.0s reads 0.8s', () => {
    const plain = row(fresh(), 'fish');
    expect(screen.getByText('1.0s')).toBeInTheDocument();
    plain.unmount();
    row({ ...fresh(), completedOneTime: ['net'] }, 'fish');
    expect(screen.getByText('0.8s')).toBeInTheDocument();
  });
  it('the running row shows a stop square that does nothing, on the same button, so focus survives', () => {
    const r = row(fresh(), 'fish');
    const button = play();
    button.focus();
    r.rerenderWith(fresh(), true);
    const mark = screen.getByRole('button', { name: /^running/ });
    expect(mark).toBe(button);
    expect(document.activeElement).toBe(mark);
    expect(mark).toHaveAttribute('aria-disabled', 'true');
    expect(mark).toHaveTextContent(STOP);
    act(() => { mark.click(); });
    expect(r.onNow).not.toHaveBeenCalled();
  });
});

describe('ActionRow: play and +', () => {
  it('a refused play flashes the row red, shows the words, and dispatches nothing', async () => {
    const r = row(fresh(), 'hull');
    await act(() => realClick(play()));
    expect(r.onNow).not.toHaveBeenCalled();
    expect(r.el()).toHaveClass('row--refused');
    expect(r.el().querySelector('.row__say')).toHaveTextContent(`needs 8 scrap \u00B7 Salvage scrap automation is not yet earned (0/${N}) \u00B7 earn it by hand`);
    // An animation that ends on a child (the play button's own flash) bubbles up and does not end the row's.
    animationEnd(play());
    expect(r.el()).toHaveClass('row--refused');
    animationEnd(r.el());
    expect(r.el()).not.toHaveClass('row--refused');
    expect(r.el().querySelector('.row__say')).toHaveTextContent(/needs 8 scrap/);
  });
  it('play asks frontBlock, so a producer whose look-ahead is already met is refused with "enough"; Shift+click is a single run and passes', async () => {
    const s = { ...enqueue(fresh(), book, 'satchel'), inventory: { scrap: 3 } };
    const r = row(s, 'salvage');
    await act(() => realClick(play()));
    expect(r.onNow).not.toHaveBeenCalled();
    expect(r.el()).toHaveClass('row--refused');
    expect(screen.getByText('scrap: enough for what is queued')).toBeInTheDocument();
    await act(() => realClick(play(), { shiftKey: true }));
    expect(r.onNow).toHaveBeenCalledWith('salvage', true);
  });
  it('play on a fight that would back off is refused with the words that name Shift+play; Shift+play passes (#74)', async () => {
    const s = { ...fresh(), inventory: { pass: 1 }, health: 0.5 };
    const r = row(s, 'raid');
    await act(() => realClick(play()));
    expect(r.onNow).not.toHaveBeenCalled();
    expect(r.el()).toHaveClass('row--refused');
    expect(screen.getByText('too hurt to fight: one more push would end this life \u00B7 Shift+play fights to the end')).toBeInTheDocument();
    await act(() => realClick(play(), { shiftKey: true }));
    expect(r.onNow).toHaveBeenCalledWith('raid', true);
  });
  it('+ on a fight that would stop dispatches and says why, with no flash (#74: + did nothing visible)', async () => {
    const r = row({ ...fresh(), inventory: { pass: 1 }, health: 0.5 }, 'raid');
    await act(() => realClick(plus()));
    expect(r.onQueue).toHaveBeenCalledWith('raid', false);
    expect(r.el()).not.toHaveClass('row--refused');
    expect(r.el().querySelector('.row__say')).toHaveTextContent('too hurt to fight: one more push would end this life \u00B7 Shift+play fights to the end');
  });
  it('a set chip on a fight that would kill does not wait and is not refused: automated, it fights on (the user, 2026-09-24)', async () => {
    const s = { ...fresh(), inventory: { pass: 1 }, health: 0.5, completionCounts: { raid: unlockAt(book.actions.raid!) }, automation: { raid: 'high' as const } };
    const r = row(s, 'raid');
    expect(r.el().querySelector('.row__say')).toBeNull();
    await act(() => realClick(play()));
    expect(r.onNow).toHaveBeenCalledWith('raid', false);
  });
  it('+ always dispatches, and for a short row shows the same words with no flash', async () => {
    const r = row(fresh(), 'hull');
    await act(() => realClick(plus()));
    expect(r.onQueue).toHaveBeenCalledWith('hull', false);
    expect(r.el()).not.toHaveClass('row--refused');
    expect(r.el().querySelector('.row__say')).toHaveTextContent(`needs 8 scrap \u00B7 Salvage scrap automation is not yet earned (0/${N}) \u00B7 earn it by hand`);
  });
  it('Shift+click passes once on both buttons; a plain click does not', async () => {
    const r = row(fresh(), 'fish');
    await act(() => realClick(play(), { shiftKey: true }));
    await act(() => realClick(plus(), { shiftKey: true }));
    await act(() => realClick(plus()));
    await act(() => realClick(play()));
    expect(r.onNow.mock.calls).toEqual([['fish', true], ['fish', false]]);
    expect(r.onQueue.mock.calls).toEqual([['fish', true], ['fish', false]]);
  });
  it('Enter on a focused button queues a repeating order; other keys do nothing', () => {
    const r = row(fresh(), 'fish');
    fireEvent.keyDown(play(), { key: 'Enter' });
    fireEvent.keyDown(plus(), { key: 'Enter' });
    fireEvent.keyDown(plus(), { key: 'a' });
    expect(r.onNow.mock.calls).toEqual([['fish', false]]);
    expect(r.onQueue.mock.calls).toEqual([['fish', false]]);
  });
  it('Enter on play is refused like a click: nothing dispatched, the row flashes', () => {
    const r = row(fresh(), 'hull');
    fireEvent.keyDown(play(), { key: 'Enter' });
    expect(r.onNow).not.toHaveBeenCalled();
    expect(r.el()).toHaveClass('row--refused');
  });
});

describe('ActionRow: the instruction holds, then fades', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('the words hold for a few seconds and go, and the flash goes with them if no animation ended it', () => {
    const r = row(fresh(), 'hull');
    act(() => { play().click(); });
    expect(r.el()).toHaveClass('row--refused');
    act(() => { vi.runAllTimers(); });
    expect(r.el().querySelector('.row__say')).toBeNull();
    expect(r.el()).not.toHaveClass('row--refused');
    expect(r.el().querySelector('.row__in')).toHaveTextContent(/8 scrap/);
  });
  it('the instruction is a snapshot: it holds even if the scrap lands during the hold', () => {
    const r = row(fresh(), 'hull');
    act(() => { plus().click(); });
    r.rerenderWith({ ...fresh(), inventory: { scrap: 5 } });
    expect(r.el().querySelector('.row__say')).toHaveTextContent(/needs 8 scrap/);
  });
  it('no instruction when play succeeds', () => {
    const r = row(fresh(), 'fish');
    act(() => { play().click(); });
    expect(r.onNow).toHaveBeenCalledWith('fish', false);
    expect(r.el().querySelector('.row__say')).toBeNull();
  });
});

describe('ActionRow: the automation chip', () => {
  it('is blank until the first completion, then a status n/N with its hairline, and not a button', () => {
    const first = row(fresh(), 'salvage');
    expect(screen.queryByRole('button', { name: /^automation/ })).toBeNull();
    expect(first.el().querySelector('.auto [aria-hidden="true"]')).toBeNull();
    expect(screen.getByText('automation, not yet earned')).toHaveClass('visually-hidden');
    first.unmount();
    const r = row(earned(fresh(), 'salvage', 37), 'salvage');
    expect(r.el().querySelector('.auto [aria-hidden="true"]')).toHaveTextContent(`37/${N}`);
    expect(r.el().querySelector('.auto i')).toHaveStyle({ width: `${(37 / N) * 100}%` });
    expect(screen.getByText(`automation, 37 of ${N} to earn`)).toHaveClass('visually-hidden');
    expect(screen.queryByRole('button', { name: /^automation/ })).toBeNull();
  });
  it('once earned it is a button in the same pinned box, showing the mode word and naming the next', () => {
    const r = row(earned(fresh(), 'salvage', N), 'salvage');
    expect(chip()).toHaveClass('auto', 'auto--btn');
    expect(chip()).toHaveTextContent('off');
    expect(chip()).toHaveAccessibleName('automation: off, press for JIT');
    r.rerenderWith(auto(earned(fresh(), 'salvage', N), 'salvage', 'jit'));
    expect(chip()).toHaveTextContent('JIT');
    expect(chip()).toHaveAccessibleName('automation: JIT, press for top');
  });
  it('the chip cycles through its row\'s cycle, one step a press', async () => {
    const start = earned(fresh(), 'salvage', N);
    const r = row(start, 'salvage');
    const seen: AutoMode[] = [];
    // Each press depends on the one before (the parent feeds the new mode back), so the presses run one after another.
    const press = async (s: GameState, left: number): Promise<void> => {
      if (left === 0) return;
      await act(() => realClick(chip()));
      const mode = r.onAutomate.mock.calls.at(-1)![1] as AutoMode;
      seen.push(mode);
      r.rerenderWith(auto(s, 'salvage', mode));
      return press(auto(s, 'salvage', mode), left - 1);
    };
    await press(start, cycleOf(book, book.actions.salvage!).length);
    expect(seen).toEqual(['jit', 'top', 'high', 'mid', 'low', 'last', 'off']);
    expect(r.onAutomate.mock.calls.every((c) => c[0] === 'salvage')).toBe(true);
  });
  it('a row whose output no row uses skips JIT', () => {
    row(earned(fresh(), 'hull', balance.automation.unlockOneTime), 'hull');
    expect(chip()).toHaveAccessibleName('automation: off, press for top');
  });
  it('set on a row that cannot start: the chip is dashed and the row shows the words, which the chip\'s name carries too', () => {
    const s = auto(earned(earned(fresh(), 'hull', balance.automation.unlockOneTime), 'salvage', 120), 'hull', 'high');
    const r = row(s, 'hull');
    const text = `waits: Salvage scrap automation is not yet earned (120/${N}) \u00B7 earn it by hand`;
    expect(chip()).toHaveClass('auto--waits', 'auto--lit');
    expect(chip()).toHaveTextContent('high');
    expect(r.el().querySelector('.row__say')).toHaveTextContent(text);
    expect(r.el().querySelector('.row__say')).toHaveClass('row__say--waits');
    expect(chip()).toHaveAccessibleName(`automation: high, press for mid; ${text}`);
    r.rerenderWith(auto(earned(s, 'salvage', N), 'salvage', 'off'));
    expect(r.el().querySelector('.row__say')).toHaveTextContent('waits: Salvage scrap automation is off');
  });
  it('the waiting words give way to a running row and to an instruction', async () => {
    const s = auto(earned(fresh(), 'hull', balance.automation.unlockOneTime), 'hull', 'high');
    const r = row(s, 'hull', true);
    expect(r.el().querySelector('.row__say')).toBeNull();
    expect(chip()).toHaveClass('auto--waits');
    r.rerenderWith(s, false);
    await act(() => realClick(plus()));
    expect(r.el().querySelector('.row__say')).toHaveTextContent(`needs 8 scrap \u00B7 Salvage scrap automation is not yet earned (0/${N}) \u00B7 earn it by hand`);
    expect(r.el().querySelector('.row__say')).not.toHaveClass('row__say--waits');
  });
  it('no waiting look while the chip is off, nor once automation would supply the row', () => {
    const off = row(earned(fresh(), 'hull', balance.automation.unlockOneTime), 'hull');
    expect(chip()).not.toHaveClass('auto--waits');
    expect(off.el().querySelector('.row__say')).toBeNull();
    off.unmount();
    const supplied = auto(auto(earned(earned(fresh(), 'hull', balance.automation.unlockOneTime), 'salvage', N), 'hull', 'high'), 'salvage', 'jit');
    const r = row(supplied, 'hull');
    expect(chip()).not.toHaveClass('auto--waits');
    expect(r.el().querySelector('.row__say')).toBeNull();
    expect(r.el().querySelector('.row__in')).toHaveTextContent(/8 scrap/);
  });
});
