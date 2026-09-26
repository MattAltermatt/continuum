// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { balance } from '../balance';
import { cycleOf, unlockAt } from '../engine/automation';
import { built, withOrder } from '../engine/fixture';
import { enqueue, newState } from '../engine/queue';
import type { AutoMode, GameState } from '../engine/types';
import type { Book } from '../data/types';
import { pagedTestBook as paged, testBook as book } from '../test-utils/book';
import { realClick } from '../test-utils/realClick';
import { ActionRow, outputsOf } from './ActionRow';
import { hpRate } from './format';
import { PLAY } from './glyphs';
import { rowName } from './words';

const N = balance.automation.unlockRepeatable;
const fresh = (): GameState => newState(book.roster);
const earned = (s: GameState, id: string, n: number): GameState => ({ ...s, completionCounts: { ...s.completionCounts, [id]: n } });
const auto = (s: GameState, id: string, mode: AutoMode): GameState => ({ ...s, automation: { ...s.automation, [id]: mode } });

/**
 * The first port with no Salvage on the page: nothing here makes the hull's scrap, so play on the hull is still
 * refused. On the full page a player's order pulls Salvage whatever its chip (spec 2026-09-24-pages section 4.3).
 */
const unsalvaged: Book = { ...book, chapters: [withOrder(book.chapters[0]!, ['fish', 'hull', 'satchel', 'net', 'gate', 'raid']), book.chapters[1]!] };

function row(id: string, over: Partial<GameState> = {}, content: Book = book, running = false) {
  const spies = { onNow: vi.fn(), onQueue: vi.fn(), onAutomate: vi.fn() };
  const state = { ...newState(content.roster), ...over };
  const r = render(<ActionRow action={content.actions[id]!} content={content} state={state} running={running} {...spies} />);
  const el = r.container.querySelector('.row') as HTMLElement;
  const rerenderWith = (next: Partial<GameState>, run = running) =>
    r.rerender(<ActionRow action={content.actions[id]!} content={content} state={{ ...state, ...next }} running={run} {...spies} />);
  return { ...r, ...spies, el, rerenderWith };
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
    expect(at('satchel')).toHaveTextContent(/scrap 0\/1/);
    expect(at('satchel')).not.toHaveTextContent('scraps');
  });
});

describe('ActionRow: what the row reads', () => {
  it('reads verb, noun, what it owes, the output, its time and its xp', () => {
    row('hull');
    expect(screen.getByText('Rig')).toBeInTheDocument();
    expect(screen.getByText('the hull')).toBeInTheDocument();
    expect(screen.getByText(/scrap 0\/8/)).toBeInTheDocument();
    expect(screen.getByText('decay \u00D70.50')).toBeInTheDocument();
    // 8 xp at the base 0.1 a tick, ten ticks a second.
    expect(screen.getByText('8.0s')).toBeInTheDocument();
    expect(screen.getByText('+8.0 xp')).toBeInTheDocument();
  });
  it('the middle is a list: needs then the hurt rate, then gives with the tag; an unmet need is a li--unmet line', () => {
    const past = (s: GameState) => built(s, 'hull', 'satchel', 'net', 'gate');
    const r = row('raid', past(fresh()));
    const lines = [...r.el.querySelectorAll('.row__list .li')].map((e) => e.textContent);
    expect(lines).toEqual(['needs a pass', '\u22121.00 hp/s', '+30.0 xp', 'casts off']);
    expect(screen.getByText('needs a pass')).toHaveClass('li--unmet');
    r.unmount();
    row('raid', past({ ...fresh(), inventory: { pass: 1 } }));
    expect(screen.getByText('needs a pass')).not.toHaveClass('li--unmet');
  });
  it('the noun is printed whole, with no title to stand in for a clipped one (spec 2026-09-25 section 7: never truncated)', () => {
    const r = row('hull');
    expect(r.el.querySelector('.row__name')).toHaveTextContent(book.actions.hull!.noun);
    expect(r.el.querySelector('.row__name')).not.toHaveAttribute('title');
  });
  it('a healing row prints its rate with a plus in heal-text', () => {
    const past = (s: GameState) => built(s, 'hull', 'satchel', 'net', 'gate');
    row('raid', past(fresh()), { ...book, actions: { ...book.actions, raid: { ...book.actions.raid!, healthRate: 1 } } });
    expect(screen.getByText('+1.00 hp/s')).toHaveClass('heal-text');
  });
  it('a cost line reads paid/total from consumedOf, against the row\'s own kept progress', () => {
    const r = row('hull', { ...fresh(), work: { hull: { progress: 5, costsConsumed: 5 } }, inventory: { scrap: 1 } });
    expect(r.el.querySelector('.row__list')).toHaveTextContent(/scrap 5\/8/);
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
    const plain = row('fish');
    expect(screen.getByText('1.0s')).toBeInTheDocument();
    plain.unmount();
    row('fish', { completedOneTime: ['net'] });
    expect(screen.getByText('0.8s')).toBeInTheDocument();
  });
  it('the running row keeps its play button, which does nothing and keeps focus (#43)', () => {
    const r = row('fish');
    const button = play();
    button.focus();
    r.rerenderWith(fresh(), true);
    const mark = screen.getByRole('button', { name: /^running/ });
    expect(mark).toBe(button);
    expect(document.activeElement).toBe(mark);
    expect(mark).toHaveAttribute('aria-disabled', 'true');
    expect(mark).toHaveTextContent(PLAY);
    expect(mark).toHaveClass('btn--play', 'btn--running');
    act(() => { mark.click(); });
    expect(r.onNow).not.toHaveBeenCalled();
  });
  it('while dead the lit row\'s play button dims with the rest: btn--running is a live run\'s alone', () => {
    const r = row('fish', { dead: true }, book, true);
    const lit = screen.getByRole('button', { name: /^running/ });
    expect(lit).toHaveAttribute('aria-disabled', 'true');
    expect(lit).not.toHaveClass('btn--running');
    r.rerenderWith({ dead: true }, false);
    expect(play()).not.toHaveClass('btn--running');
  });
});

describe('ActionRow: play and +', () => {
  it('play asks frontBlock, so a producer whose look-ahead is already met is refused with "enough"; Shift+click is a single run and passes', async () => {
    const s = { ...enqueue(fresh(), book, 'satchel'), inventory: { scrap: 3 } };
    const r = row('salvage', s);
    await act(() => realClick(play()));
    expect(r.onNow).not.toHaveBeenCalled();
    expect(r.el).toHaveClass('row--refused');
    expect([...r.el.querySelectorAll('.li--flash')].map((li) => li.textContent)).toEqual([`+1 ${book.items.scrap!.one ?? 'scrap'}`]);   // enough names what it makes: the gives line flashes
    await act(() => realClick(play(), { shiftKey: true }));
    expect(r.onNow).toHaveBeenCalledWith('salvage', true);
  });
  it('play on a fight that would back off is refused; Shift+play passes (#74)', async () => {
    // The raid's page built (spec 2026-09-24-pages): the fight is checked once it could start.
    const s = built({ ...fresh(), inventory: { pass: 1 }, health: 0.5 }, 'hull', 'satchel', 'net', 'gate');
    const r = row('raid', s);
    await act(() => realClick(play()));
    expect(r.onNow).not.toHaveBeenCalled();
    expect(r.el).toHaveClass('row--refused');
    // A hurt refusal names no item: the health line is the line it names (spec 2026-09-25 section 7), and it alone flashes.
    const flashed = [...r.el.querySelectorAll('.li--flash')];
    expect(flashed).toHaveLength(1);
    expect(flashed[0]).toHaveTextContent(hpRate(book.actions.raid!.healthRate!));
    await act(() => realClick(play(), { shiftKey: true }));
    expect(r.onNow).toHaveBeenCalledWith('raid', true);
  });
  it('+ on a fight that would stop dispatches, with no flash (#74: + did nothing visible)', async () => {
    const r = row('raid', built({ ...fresh(), inventory: { pass: 1 }, health: 0.5 }, 'hull', 'satchel', 'net', 'gate'));
    await act(() => realClick(plus()));
    expect(r.onQueue).toHaveBeenCalledWith('raid', false);
    expect(r.el).not.toHaveClass('row--refused');
  });
  it('a set chip on a fight that would kill does not wait and is not refused: automated, it fights on (the user, 2026-09-24)', async () => {
    const s = built({ ...fresh(), inventory: { pass: 1 }, health: 0.5, completionCounts: { raid: unlockAt(book, book.actions.raid!) }, automation: { raid: 'high' as const } }, 'hull', 'satchel', 'net', 'gate');
    const r = row('raid', s);
    await act(() => realClick(play()));
    expect(r.onNow).toHaveBeenCalledWith('raid', false);
  });
  it('+ always dispatches, even for a row nothing on the page supplies, with no flash', async () => {
    const r = row('hull', {}, unsalvaged);
    await act(() => realClick(plus()));
    expect(r.onQueue).toHaveBeenCalledWith('hull', false);
    expect(r.el).not.toHaveClass('row--refused');
  });
  it('+ on a row short of what a row on the page makes: the order pulls the maker, chip unearned (spec 2026-09-24-pages 4.3)', async () => {
    const r = row('hull');
    await act(() => realClick(plus()));
    expect(r.onQueue).toHaveBeenCalledWith('hull', false);
    expect(r.el.querySelector('.row__list')).toHaveTextContent(/scrap 0\/8/);
  });
  it('Shift+click passes once on both buttons; a plain click does not', async () => {
    const r = row('fish');
    await act(() => realClick(play(), { shiftKey: true }));
    await act(() => realClick(plus(), { shiftKey: true }));
    await act(() => realClick(plus()));
    await act(() => realClick(play()));
    expect(r.onNow.mock.calls).toEqual([['fish', true], ['fish', false]]);
    expect(r.onQueue.mock.calls).toEqual([['fish', true], ['fish', false]]);
  });
  it('Enter on a focused button queues a repeating order; other keys do nothing', () => {
    const r = row('fish');
    fireEvent.keyDown(play(), { key: 'Enter' });
    fireEvent.keyDown(plus(), { key: 'Enter' });
    fireEvent.keyDown(plus(), { key: 'a' });
    expect(r.onNow.mock.calls).toEqual([['fish', false]]);
    expect(r.onQueue.mock.calls).toEqual([['fish', false]]);
  });
  it('Enter on play is refused like a click: nothing dispatched, the row flashes', () => {
    const r = row('hull', {}, unsalvaged);
    fireEvent.keyDown(play(), { key: 'Enter' });
    expect(r.onNow).not.toHaveBeenCalled();
    expect(r.el).toHaveClass('row--refused');
  });
});

describe('ActionRow: the middle list', () => {
  it('the middle is a list: needs with each cost as paid/total, gives with the xp first', () => {
    const { el } = row('hull', { inventory: { scrap: 4 } });
    const list = el.querySelector('.row__list')!;
    expect(list).toHaveTextContent(/needs:.*scrap 0\/8.*gives:.*\+\d+\.\d xp/);
  });
  it('a closer whose page is unfinished lists what is still required, by name, in page order, shrinking as rows are built', () => {
    const waits = (el: Element) => [...el.querySelectorAll('.li--wait')].map((li) => li.textContent);
    const r = row('gate', {}, paged);
    expect(r.el.querySelector('.row__list')).toHaveTextContent(/still required:/);
    expect(waits(r.el)).toEqual(['hull', 'satchel', 'net'].map((id) => rowName(paged, id)));
    r.rerenderWith(built(newState(paged.roster), 'hull', 'net'));
    expect(waits(r.el)).toEqual([rowName(paged, 'satchel')]);
    r.rerenderWith(built(newState(paged.roster), 'hull', 'satchel', 'net'));
    expect(r.el.querySelector('.row__list')).not.toHaveTextContent(/still required:/);
    expect(waits(r.el)).toEqual([]);
  });
  it('a refused play flashes the row and its short cost line, rewrites nothing, and dispatches nothing', async () => {
    // unsalvaged: the file's book with no scrap maker on the page, the one way play refuses on this fixture (queue.ts frontBlock).
    const { el, onNow } = row('hull', {}, unsalvaged);
    const before = el.querySelector('.row__list')!.textContent;
    await act(() => realClick(screen.getByRole('button', { name: /do it now/ })));
    expect(onNow).not.toHaveBeenCalled();
    expect(el).toHaveClass('row--refused');
    expect(el.querySelector('.li--flash')).toHaveTextContent(/scrap/);
    expect(el.querySelector('.row__list')!.textContent).toBe(before);
    // An animation that ends on a child (the play button's own flash) bubbles up and does not end the row's.
    animationEnd(screen.getByRole('button', { name: /do it now/ }));
    expect(el).toHaveClass('row--refused');
    animationEnd(el);
    expect(el).not.toHaveClass('row--refused');
    expect(el.querySelector('.li--flash')).toBeNull();
  });
  it('a refusal naming a needs item flashes that bullet, not a cost line: shortfall checks needs first', async () => {
    // needful: hull with a needs entry ('pass') nothing on this page makes, so shortfall reports it before its scrap
    // cost, and frontBlock's page-4.3 leniency (a maker elsewhere on the page) does not strip the refusal.
    const needful: Book = {
      ...book,
      chapters: [withOrder(book.chapters[0]!, ['fish', 'hull', 'satchel', 'net', 'raid']), book.chapters[1]!],
      actions: { ...book.actions, hull: { ...book.actions.hull!, needs: [{ item: 'pass', amount: 1 }] } },
    };
    const { el, onNow } = row('hull', {}, needful);
    await act(() => realClick(screen.getByRole('button', { name: /do it now/ })));
    expect(onNow).not.toHaveBeenCalled();
    expect(el).toHaveClass('row--refused');
    const lines = [...el.querySelectorAll('.row__list .li')];
    expect(lines[0]).toHaveTextContent('scrap 0/8');
    expect(lines[0]).not.toHaveClass('li--flash');
    expect(lines[1]).toHaveTextContent('needs a pass');
    expect(lines[1]).toHaveClass('li--flash');
    expect(el.querySelectorAll('.li--flash')).toHaveLength(1);
  });
  it('a built row keeps its list, dimmed, says built where its time was, and has paid its costs in full', () => {
    const { el } = row('hull', built(fresh(), 'hull'));
    expect(el).toHaveClass('row--built');
    expect(el.querySelector('.row__tx')).toHaveTextContent('built');
    expect(el.querySelector('.row__list')).toHaveTextContent(/gives:/);
    // The row's work reset on completion; the line still reads what was paid, not 0/8.
    expect(el.querySelector('.row__list')).toHaveTextContent(/scrap 8\/8/);
  });
  it('a row short of an item a row on the page makes plays without a flash (the chain supplies it)', async () => {
    const { el, onNow } = row('net');
    await act(() => realClick(screen.getByRole('button', { name: /do it now/ })));
    expect(onNow).toHaveBeenCalled();
    expect(el).not.toHaveClass('row--refused');
  });
});

describe('ActionRow: the automation chip', () => {
  it('is blank until the first completion, then a status n/N with its hairline, and not a button', () => {
    const first = row('salvage');
    expect(screen.queryByRole('button', { name: /^automation/ })).toBeNull();
    expect(first.el.querySelector('.auto [aria-hidden="true"]')).toBeNull();
    expect(screen.getByText('automation, not yet earned')).toHaveClass('visually-hidden');
    first.unmount();
    const r = row('salvage', earned(fresh(), 'salvage', 37));
    expect(r.el.querySelector('.auto [aria-hidden="true"]')).toHaveTextContent(`37/${N}`);
    expect(r.el.querySelector('.auto i')).toHaveStyle({ width: `${(37 / N) * 100}%` });
    expect(screen.getByText(`automation, 37 of ${N} to earn`)).toHaveClass('visually-hidden');
    expect(screen.queryByRole('button', { name: /^automation/ })).toBeNull();
  });
  it('once earned it is a button in the same pinned box, showing the mode word and naming the next', () => {
    const r = row('salvage', earned(fresh(), 'salvage', N));
    expect(chip()).toHaveClass('auto', 'auto--btn');
    expect(chip()).toHaveTextContent('off');
    expect(chip()).toHaveAccessibleName('automation: off, press for JIT');
    r.rerenderWith(auto(earned(fresh(), 'salvage', N), 'salvage', 'jit'));
    expect(chip()).toHaveTextContent('JIT');
    expect(chip()).toHaveAccessibleName('automation: JIT, press for top');
  });
  it('the chip cycles through its row\'s cycle, one step a press', async () => {
    const start = earned(fresh(), 'salvage', N);
    const r = row('salvage', start);
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
    row('hull', earned(fresh(), 'hull', balance.automation.unlockOneTime));
    expect(chip()).toHaveAccessibleName('automation: off, press for top');
  });
  it('set on a row that cannot start: the chip is dashed and its name carries the words', () => {
    const s = auto(earned(earned(fresh(), 'hull', balance.automation.unlockOneTime), 'salvage', 120), 'hull', 'high');
    const r = row('hull', s);
    const text = `waits: Salvage scrap automation is not yet earned (120/${N}) \u00B7 earn it by hand`;
    expect(chip()).toHaveClass('auto--waits', 'auto--lit');
    expect(chip()).toHaveTextContent('high');
    expect(chip()).toHaveAccessibleName(`automation: high, press for mid; ${text}`);
    r.rerenderWith(auto(earned(s, 'salvage', N), 'salvage', 'off'));
    expect(chip()).toHaveAccessibleName('automation: high, press for mid; waits: Salvage scrap automation is off');
  });
  it('no waiting look while the chip is off, nor once automation would supply the row', () => {
    const off = row('hull', earned(fresh(), 'hull', balance.automation.unlockOneTime));
    expect(chip()).not.toHaveClass('auto--waits');
    off.unmount();
    const supplied = auto(auto(earned(earned(fresh(), 'hull', balance.automation.unlockOneTime), 'salvage', N), 'hull', 'high'), 'salvage', 'jit');
    const r = row('hull', supplied);
    expect(chip()).not.toHaveClass('auto--waits');
    expect(r.el.querySelector('.row__list')).toHaveTextContent(/scrap 0\/8/);
  });
});

describe('ActionRow: pages (spec 2026-09-24-pages)', () => {
  it('the tag: the end for the finish, casts off for a chapter\'s last closer, turns the page for any other closer, after what it makes', () => {
    expect(outputsOf(paged, paged.actions.vault!)).toEqual(['the end']);
    expect(outputsOf(paged, paged.actions.raid!)).toEqual(['casts off']);
    // A closer lists what it makes first, then the tag.
    expect(outputsOf(paged, paged.actions.gate!)).toEqual(['a pass', 'turns the page']);
    // Not a closer: what it makes, as before.
    expect(outputsOf(paged, paged.actions.satchel!)).toEqual(['stack +5']);
  });
  it('play on a closer with its page unfinished is not refused: it dispatches, since the press pulls its page', async () => {
    const r = row('gate', {}, paged);
    await act(() => realClick(play()));
    expect(r.onNow).toHaveBeenCalledWith('gate', false);
    expect(r.el).not.toHaveClass('row--refused');
  });
});
