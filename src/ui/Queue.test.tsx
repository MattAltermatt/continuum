// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { balance } from '../balance';
import { unitThreshold } from '../engine/costs';
import { enqueue, newState, removeEntry } from '../engine/queue';
import type { GameState } from '../engine/types';
import { testBook as book } from '../test-utils/book';
import { realClick } from '../test-utils/realClick';
import { WARN } from './glyphs';
import { Queue } from './Queue';

const noop = () => {};
const fresh = (): GameState => newState(book.roster);
const cap = balance.inventory.stackCap;

describe('Queue', () => {
  it('shows each order with its row\'s progress under the bar, the top entry\'s countdown only, and no total', () => {
    const s = enqueue(enqueue(fresh(), book, 'fish'), book, 'salvage');
    render(<Queue state={s} content={book} working={0} live={true} onRemove={noop} />);
    expect(screen.getByText(/queue \u00B7 2/)).toBeInTheDocument();
    expect(screen.getAllByText('0.0/1.0')).toHaveLength(2);
    // Fish: 1 xp at 0.1 a tick, ten ticks a second. The second entry has no countdown.
    expect(screen.getAllByText('1.0s')).toHaveLength(1);
    expect(screen.queryByText(/\u2248/)).toBeNull();
  });
  it('a forced fight is tagged to the end (#74); a plain order is not', () => {
    const s = { ...fresh(), inventory: { pass: 1 } };
    const { unmount } = render(<Queue state={enqueue(s, book, 'raid', { once: true })} content={book} working={0} live={true} onRemove={noop} />);
    expect(screen.getByText('to the end')).toBeInTheDocument();
    unmount();
    render(<Queue state={enqueue(s, book, 'raid')} content={book} working={0} live={true} onRemove={noop} />);
    expect(screen.queryByText('to the end')).toBeNull();
  });
  it('a forced supply that does not hurt carries the flag but not the tag (code panel round four)', () => {
    const s = { ...fresh(), queue: [{ id: 0, actionId: 'salvage', mode: 'repeat' as const, by: 'auto' as const, forced: true as const, for: 1 }, { id: 1, actionId: 'raid', mode: 'once' as const, by: 'player' as const, forced: true as const }], nextEntryId: 2 };
    render(<Queue state={s} content={book} working={0} live={true} onRemove={noop} />);
    expect(screen.getAllByText('to the end')).toHaveLength(1);
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
    expect(screen.getByText('0/1 scrap')).toBeInTheDocument();
  });
  it('the countdown is at the gear-aware rate: with the net made, the fish take 0.8s', () => {
    const s = { ...enqueue(fresh(), book, 'fish'), completedOneTime: ['net'] };
    render(<Queue state={s} content={book} working={0} live={true} onRemove={noop} />);
    expect(screen.getByText('0.8s')).toBeInTheDocument();
  });
  it('no countdown while paused, nor while the top cannot work', () => {
    const paused = render(<Queue state={enqueue(fresh(), book, 'fish')} content={book} working={0} live={false} onRemove={noop} />);
    expect(screen.queryByText('1.0s')).toBeNull();
    paused.unmount();
    render(<Queue state={enqueue(fresh(), book, 'hull')} content={book} working={-1} live={true} onRemove={noop} />);
    expect(screen.queryByText(/\d\.\ds$/)).toBeNull();
  });
  it('each order is tagged repeat or once, and an order automation added is tagged auto', () => {
    let s = enqueue(fresh(), book, 'salvage');
    s = enqueue(s, book, 'salvage', { once: true });
    s = enqueue(s, book, 'hull', { by: 'auto' });
    const { container } = render(<Queue state={s} content={book} working={0} live={true} onRemove={noop} />);
    const entries = [...container.querySelectorAll('.entry')];
    expect(entries.map((e) => e.querySelector('.tag')!.textContent)).toEqual(['repeat', 'once', 'once']);
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
  it('the bar and each cost come from the row\'s kept work, on every entry that row has; the unit owed now is warned', () => {
    let s = enqueue(enqueue(fresh(), book, 'fish'), book, 'hull');
    s = { ...s, work: { hull: { progress: 5, costsConsumed: 5 } } };
    const { container } = render(<Queue state={s} content={book} working={0} live={true} onRemove={noop} />);
    const hull = container.querySelector('[data-entry="1"]')!;
    expect(hull.querySelector('.bar__value')).toHaveTextContent('5.0/8.0');
    expect(hull.querySelector('.bar__fill')).toHaveStyle({ width: `${(5 / 8) * 100}%` });
    expect(hull.querySelector('.bar__fill')).toHaveClass('bar__fill--wait');
    expect(hull.querySelector('.entry__third')).toHaveTextContent(`${WARN} scrap 5/8`);
  });
  it('the worked top is ember; the same entry paused is grey', () => {
    const s = enqueue(fresh(), book, 'fish');
    const on = render(<Queue state={s} content={book} working={0} live={true} onRemove={noop} />);
    expect(on.container.querySelector('.working .bar__fill')).toHaveClass('bar__fill--run');
    on.unmount();
    const off = render(<Queue state={s} content={book} working={0} live={false} onRemove={noop} />);
    expect(off.container.querySelector('.working')).toBeNull();
    expect(off.container.querySelector('.entry--on .bar__fill')).toHaveClass('bar__fill--wait');
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
  it('a hurting row shows its hurt on its order', () => {
    const { container } = render(<Queue state={enqueue(fresh(), book, 'raid')} content={book} working={-1} live={true} onRemove={noop} />);
    expect(container.querySelector('.entry__third')).toHaveTextContent('\u22121.00 hp/s');
  });
  it('every entry keeps all its lines, so none changes height and no x moves', () => {
    const s = enqueue(enqueue(enqueue(fresh(), book, 'fish'), book, 'hull'), book, 'raid');
    const { container } = render(<Queue state={s} content={book} working={0} live={true} onRemove={noop} />);
    for (const e of container.querySelectorAll('.entry')) {
      expect(e.querySelectorAll('.entry__sub')).toHaveLength(2);
      expect(e.querySelector('.entry__third')!.textContent!.length).toBeGreaterThan(0);
    }
  });
  it('says waiting only when the top cannot run: not while it can, and not while paused', () => {
    const one = render(<Queue state={enqueue(fresh(), book, 'fish')} content={book} working={0} live={true} onRemove={noop} />);
    expect(screen.queryByText('waiting')).toBeNull();
    one.unmount();
    const stuck = enqueue(fresh(), book, 'hull');
    const two = render(<Queue state={stuck} content={book} working={-1} live={false} onRemove={noop} />);
    expect(screen.queryByText('waiting')).toBeNull();
    two.unmount();
    render(<Queue state={stuck} content={book} working={-1} live={true} onRemove={noop} />);
    expect(screen.getByText('waiting')).toBeInTheDocument();
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
