// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { balance } from '../balance';
import { unitThreshold } from '../engine/costs';
import { enqueue, newState, removeEntry } from '../engine/queue';
import type { GameState } from '../engine/types';
import { testBook as book } from '../test-utils/book';
import { realClick } from '../test-utils/realClick';
import { duration } from './format';
import { narrate } from './narrate';
import { Queue, queuedSeconds } from './Queue';

const noop = () => {};
const fresh = (): GameState => newState(book.roster);
const cap = balance.inventory.stackCap;

describe('Queue', () => {
  it('the heading is doing \u00B7 n with the queued total; the top runs as a gauge; the rest are one line each with no bar', () => {
    const s = enqueue(enqueue(enqueue(fresh(), book, 'fish'), book, 'salvage'), book, 'fish');
    render(<Queue state={s} content={book} working={0} live={true} onRemove={noop} />);
    expect(screen.getByLabelText('doing').querySelector('.region__head')).toHaveTextContent(/^doing \u00B7 3/);
    // At the base rate (0.1 xp a tick, ten ticks a second) a row of E xp takes E seconds: the total is written out, not asked of the function.
    const seconds = 2 * book.actions.fish!.expCost + book.actions.salvage!.expCost;
    expect(queuedSeconds(s, book)).toBe(seconds);
    expect(screen.getByText(/queued$/)).toHaveTextContent(`${duration(seconds)} queued`);
    expect(document.querySelectorAll('.entry--on .gauge')).toHaveLength(1);
    expect(document.querySelectorAll('.entry--line')).toHaveLength(2);
    expect(document.querySelectorAll('.entry--line .bar')).toHaveLength(0);
  });
  it('the total counts a row\'s kept progress once: two orders for one row share it, the second starts from zero', () => {
    const hull = book.actions.hull!.expCost;
    const s = { ...enqueue(enqueue(fresh(), book, 'hull'), book, 'hull'), work: { hull: { progress: 1, costsConsumed: 0 } } };
    expect(queuedSeconds(s, book)).toBe((hull - 1) + hull);
    // Whole ticks: a remainder short of a tick still costs the tick.
    expect(queuedSeconds({ ...s, work: { hull: { progress: hull - 0.05, costsConsumed: 0 } } }, book)).toBe(0.1 + hull);
  });
  it('paused with the top still the worker: the shape stays, the label is a blank line, no sheen; paused with no worker: every entry is a line', () => {
    const s = enqueue(fresh(), book, 'hull');
    const { unmount } = render(<Queue state={s} content={book} working={0} live={false} onRemove={noop} />);
    expect(document.querySelector('.entry--on')).not.toBeNull();
    expect(document.querySelector('.entry--on')).not.toHaveClass('working');
    expect(document.querySelector('.entry--on .gauge__label')!.textContent).toBe('\u00a0');   // a blank line, so the gauge keeps its height
    unmount();
    render(<Queue state={s} content={book} working={-1} live={false} onRemove={noop} />);
    expect(document.querySelector('.entry--on')).toBeNull();
    expect(document.querySelectorAll('.entry--line')).toHaveLength(1);
  });
  it('empty on a dead life: the box says nothing was queued, and asks for nothing', () => {
    render(<Queue state={fresh()} content={book} working={-1} live={false} dead onRemove={noop} />);
    expect(screen.getByText('nothing was queued')).toBeInTheDocument();
    expect(screen.queryByText(/pick an action/)).toBeNull();
  });
  it('empty: the box stays with its words, the heading says idle, and the pop in the state\'s events says why; events with no pop do not', () => {
    const popped = { type: 'popped' as const, actionId: 'raid', reason: 'hurt' as const };
    const s = { ...fresh(), runTicks: 30, events: [popped] };
    const { unmount } = render(<Queue state={s} content={book} working={-1} live={true} onRemove={noop} />);
    expect(screen.getByText(/nothing queued/)).toBeInTheDocument();
    expect(screen.getByLabelText('doing').querySelector('.region__head')).toHaveTextContent(/doing \u00B7 0.*idle/);
    expect(document.querySelector('.queue__empty small')).toHaveTextContent(narrate(popped, book).text);
    unmount();
    // Work moved the clock and the events are its own: the old reason is gone with them.
    render(<Queue state={{ ...s, runTicks: 31, events: [{ type: 'coreLevel', skill: 'fish', level: 2 }] }} content={book} working={-1} live={true} onRemove={noop} />);
    expect(document.querySelector('.queue__empty small')).toBeNull();
  });
  it('a page not yet turned is a reason with words: the closer waits on its page', () => {
    const page = { type: 'popped' as const, actionId: 'gate', reason: 'page' as const, waits: ['hull', 'net'] };
    render(<Queue state={{ ...fresh(), events: [page] }} content={book} working={-1} live={true} onRemove={noop} />);
    expect(document.querySelector('.queue__empty small')).toHaveTextContent(narrate(page, book).text);
    expect(document.querySelector('.queue__empty small')).toHaveTextContent(/waits on/);
  });
  it('a pop for full, enough or done says nothing (the queue emptied by design), and the last reason with words wins', () => {
    const full = { type: 'popped' as const, actionId: 'salvage', reason: 'full' as const };
    const { unmount } = render(<Queue state={{ ...fresh(), events: [full] }} content={book} working={-1} live={true} onRemove={noop} />);
    expect(document.querySelector('.queue__empty small')).toBeNull();
    unmount();
    const hurt = { type: 'popped' as const, actionId: 'raid', reason: 'hurt' as const };
    const short = { type: 'short' as const, actionId: 'hull', item: 'scrap', amount: 8, maker: null, gap: 'none' as const };
    render(<Queue state={{ ...fresh(), events: [hurt, full, short] }} content={book} working={-1} live={true} onRemove={noop} />);
    expect(document.querySelector('.queue__empty small')).toHaveTextContent(narrate(short, book).text);
  });
  it('a short in the events says why too, and a pop with orders still queued shows nothing under them', () => {
    const short = { type: 'short' as const, actionId: 'hull', item: 'scrap', amount: 8, maker: null, gap: 'none' as const };
    const { unmount } = render(<Queue state={{ ...fresh(), runTicks: 30, events: [short] }} content={book} working={-1} live={true} onRemove={noop} />);
    expect(document.querySelector('.queue__empty small')).toHaveTextContent(narrate(short, book).text);
    unmount();
    render(<Queue state={{ ...enqueue(fresh(), book, 'fish'), events: [short] }} content={book} working={0} live={true} onRemove={noop} />);
    expect(document.querySelector('.queue__empty')).toBeNull();
  });
  it('the running entry writes every cost as paid/total, the same fraction as the row, warn only on the shortfall', () => {
    const s = { ...enqueue({ ...fresh(), inventory: { scrap: 2 } }, book, 'hull'), work: { hull: { progress: 1, costsConsumed: 1 } } };
    const { unmount } = render(<Queue state={s} content={book} working={0} live={true} onRemove={noop} />);
    expect(screen.getByText(/scrap 1\/8/)).not.toHaveClass('warn');
    unmount();
    render(<Queue state={{ ...s, inventory: {} }} content={book} working={0} live={true} onRemove={noop} />);
    expect(screen.getByText(/scrap 1\/8/)).toHaveClass('warn');
  });
  it('a forced fight is tagged to the end (#74); a plain order is not', () => {
    const s = { ...fresh(), inventory: { pass: 1 } };
    const { unmount } = render(<Queue state={enqueue(s, book, 'raid', { once: true })} content={book} working={0} live={true} onRemove={noop} />);
    expect(screen.getByText('to the end')).toBeInTheDocument();
    unmount();
    render(<Queue state={enqueue(s, book, 'raid')} content={book} working={0} live={true} onRemove={noop} />);
    expect(screen.queryByText('to the end')).toBeNull();
  });
  it('a forced supply that does not hurt carries the flag but not the tag (code panel round four): only the running entry shows it', () => {
    const s = { ...fresh(), queue: [{ id: 0, actionId: 'salvage', mode: 'repeat' as const, by: 'auto' as const, forced: true as const, for: 1 }], nextEntryId: 1 };
    const { unmount } = render(<Queue state={s} content={book} working={0} live={true} onRemove={noop} />);
    expect(screen.queryByText('to the end')).toBeNull();
    unmount();
    const hurting = { ...fresh(), queue: [{ id: 0, actionId: 'raid', mode: 'once' as const, by: 'player' as const, forced: true as const }], nextEntryId: 1 };
    render(<Queue state={hurting} content={book} working={0} live={true} onRemove={noop} />);
    expect(screen.getByText('to the end')).toBeInTheDocument();
  });
  it('the countdown runs to where the row will stop: the hull with 3 of its 8 scrap on hand stops at the fourth unit', () => {
    const s = { ...enqueue(fresh(), book, 'hull'), inventory: { scrap: 3 } };
    render(<Queue state={s} content={book} working={0} live={true} onRemove={noop} />);
    expect(unitThreshold(book.actions.hull!, 3)).toBe(3);
    expect(screen.getByText('3.0s')).toBeInTheDocument();
    expect(screen.queryByText('8.0s')).toBeNull();
  });
  it('a producer on top whose target is 1 names one unit', () => {
    const shop = { ...book, items: { ...book.items, scrap: { ...book.items.scrap!, name: 'scraps', one: 'scrap' } } };
    const s = { ...enqueue(enqueue(fresh(), shop, 'salvage'), shop, 'satchel'), work: { satchel: { progress: 1, costsConsumed: 1 } } };
    render(<Queue state={s} content={shop} working={0} live={true} onRemove={noop} />);
    expect(screen.getByText(/0\/1 scrap/)).toBeInTheDocument();
    expect(screen.queryByText(/0\/1 scraps/)).toBeNull();
  });
  it('the countdown is at the gear-aware rate: with the net made, the fish take 0.8s', () => {
    const s = { ...enqueue(fresh(), book, 'fish'), completedOneTime: ['net'] };
    render(<Queue state={s} content={book} working={0} live={true} onRemove={noop} />);
    expect(screen.getByText('0.8s')).toBeInTheDocument();
  });
  it('each order is tagged repeat or once, and an order automation added is tagged auto: the top keeps both tags, a one-line entry shows only one', () => {
    let s = enqueue(fresh(), book, 'salvage');
    s = enqueue(s, book, 'salvage', { once: true });
    s = enqueue(s, book, 'hull', { by: 'auto' });
    const { container } = render(<Queue state={s} content={book} working={0} live={true} onRemove={noop} />);
    const entries = [...container.querySelectorAll('.entry')];
    expect(entries.map((e) => e.querySelector('.tag')!.textContent)).toEqual(['repeat', 'once', 'auto']);
    expect(entries.map((e) => e.querySelector('.tag--auto')?.textContent ?? null)).toEqual([null, null, 'auto']);
  });
  it('entries are keyed by their own id: removing the first keeps every other entry\'s node', () => {
    const s = enqueue(enqueue(enqueue(fresh(), book, 'salvage'), book, 'salvage'), book, 'fish');
    const { container, rerender } = render(<Queue state={s} content={book} working={0} live={true} onRemove={noop} />);
    const second = container.querySelector('[data-entry="1"]');
    const third = container.querySelector('[data-entry="2"]');
    rerender(<Queue state={removeEntry(s, 0)} content={book} working={0} live={true} onRemove={noop} />);
    expect(container.querySelector('[data-entry="1"]')).toBe(second);
    expect(container.querySelector('[data-entry="2"]')).toBe(third);
    expect(container.querySelector('[data-entry="0"]')).toBeNull();
  });
  it('a repeating producer on top shows have/target from the look-ahead: what the orders below it still need', () => {
    // The hull has spent 5 of its 8: it owes 3, and the pack holds 1.
    let s = enqueue(enqueue(fresh(), book, 'salvage'), book, 'hull');
    s = { ...s, inventory: { scrap: 1 }, work: { hull: { progress: 5, costsConsumed: 5 } } };
    const { container, rerender } = render(<Queue state={s} content={book} working={0} live={true} onRemove={noop} />);
    expect(container.querySelector('[data-entry="0"] .entry__target')).toHaveTextContent('1/3 scrap');
    // Nothing below it needs scrap: it fills to the cap.
    rerender(<Queue state={{ ...enqueue(fresh(), book, 'salvage'), inventory: { scrap: 1 } }} content={book} working={0} live={true} onRemove={noop} />);
    expect(container.querySelector('.entry__target')).toHaveTextContent(`1/${cap} scrap`);
  });
  it('no target on a single run, on an entry below the top, or on a row that makes nothing', () => {
    let s = enqueue(fresh(), book, 'salvage', { once: true });
    s = enqueue(s, book, 'salvage');
    s = enqueue(s, book, 'hull');
    const { container } = render(<Queue state={s} content={book} working={0} live={true} onRemove={noop} />);
    expect(container.querySelector('.entry__target')).toBeNull();
  });
  it('x removes on one press, with the entry\'s own id, even when its row has kept work', async () => {
    const onRemove = vi.fn();
    let s = enqueue(enqueue(fresh(), book, 'fish'), book, 'hull');
    s = { ...s, work: { hull: { progress: 5, costsConsumed: 5 } } };
    render(<Queue state={s} content={book} working={0} live={true} onRemove={onRemove} />);
    await act(() => realClick(screen.getByRole('button', { name: 'remove Rig the hull' })));
    expect(onRemove.mock.calls).toEqual([[1]]);
    expect(screen.queryByText('?')).toBeNull();
  });
  it('on a dead run the remove buttons say they are inert and do nothing', () => {
    const onRemove = vi.fn();
    const s = { ...enqueue(enqueue(fresh(), book, 'fish'), book, 'hull'), dead: true };
    render(<Queue state={s} content={book} working={-1} live={false} dead={true} onRemove={onRemove} />);
    for (const name of ['remove Fish the shallows', 'remove Rig the hull']) {
      const x = screen.getByRole('button', { name });
      expect(x).toHaveAttribute('aria-disabled', 'true');
      act(() => { x.click(); });
    }
    expect(onRemove).not.toHaveBeenCalled();
  });
});
