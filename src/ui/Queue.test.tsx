// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { saltRoad } from '../data/salt-road';
import { enqueue, newState } from '../engine/queue';
import type { GameState } from '../engine/types';
import { WARN } from './glyphs';
import { Queue } from './Queue';

const noop = () => {};

describe('Queue', () => {
  it('shows each entry with its progress fraction under the bar and this completion\'s time, and no total', () => {
    let s = enqueue(newState(saltRoad.roster), saltRoad, 'mine');
    s = enqueue(s, saltRoad, 'forage');
    render(<Queue state={s} content={saltRoad} working={0} live={true} onRemove={noop} />);
    expect(screen.getByText('Mine')).toBeInTheDocument();
    expect(screen.getByText(/queue · 2/)).toBeInTheDocument();
    expect(screen.getByText('6.0s')).toBeInTheDocument();
    expect(screen.getByText('4.2s')).toBeInTheDocument();
    expect(screen.queryByText(/≈/)).toBeNull();   // a total was not accurate in play, so it is not shown
    expect(screen.getByText(`0.0/${saltRoad.actions.mine!.expCost.toFixed(1)}`)).toBeInTheDocument();
  });
  it('says waiting only when nothing can run: not while something runnable is queued, and not while paused', () => {
    const mixed = enqueue(enqueue(newState(saltRoad.roster), saltRoad, 'forage'), saltRoad, 'cabin');
    const one = render(<Queue state={mixed} content={saltRoad} working={0} live={true} onRemove={noop} />);
    expect(screen.queryByText('waiting')).toBeNull();
    one.unmount();
    const stuck = enqueue(newState(saltRoad.roster), saltRoad, 'cabin');
    const two = render(<Queue state={stuck} content={saltRoad} working={-1} live={false} onRemove={noop} />);
    expect(screen.queryByText('waiting')).toBeNull();
    two.unmount();
    render(<Queue state={stuck} content={saltRoad} working={-1} live={true} onRemove={noop} />);
    expect(screen.getByText('waiting')).toBeInTheDocument();
  });
  it('shows no countdown on an entry while paused or dead', () => {
    render(<Queue state={enqueue(newState(saltRoad.roster), saltRoad, 'forage')} content={saltRoad} working={0} live={false} onRemove={noop} />);
    expect(screen.queryByText('4.2s')).toBeNull();
  });
  it('the working entry carries the sheen and the sum shows only while live', () => {
    const s = enqueue(newState(saltRoad.roster), saltRoad, 'forage');
    const on = render(<Queue state={s} content={saltRoad} working={0} live={true} onRemove={noop} />);
    expect(on.container.querySelector('.working')).toBeInTheDocument();
    on.unmount();
    const off = render(<Queue state={s} content={saltRoad} working={0} live={false} onRemove={noop} />);
    expect(off.container.querySelector('.working')).toBeNull();
    expect(off.container.querySelector('.entry--on')).toBeInTheDocument();
    expect(screen.queryByText(/≈/)).toBeNull();
  });
  it('a waiting entry is dashed, says why, warns on the input it owes, and the header says waiting with no sum', () => {
    let s = enqueue(newState(saltRoad.roster), saltRoad, 'cabin');
    s = { ...s, queue: [{ ...s.queue[0]!, stalled: true, progress: 10, costsConsumed: 1 }] };
    const { container } = render(<Queue state={s} content={saltRoad} working={-1} live={true} onRemove={noop} />);
    expect(container.querySelector('.entry--waiting')).toBeInTheDocument();
    expect(screen.getByText(/waiting on stone/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(WARN))).toBeInTheDocument();
    expect(screen.getByText('waiting')).toBeInTheDocument();
    expect(screen.queryByText(/≈/)).toBeNull();
  });
  it('an entry that can pay what it owes right now carries no warning, even if the pack cannot cover the whole recipe', () => {
    const s = { ...enqueue(newState(saltRoad.roster), saltRoad, 'cabin'), inventory: { stone: 5 } };
    render(<Queue state={s} content={saltRoad} working={-1} live={true} onRemove={noop} />);
    expect(screen.queryByText(new RegExp(WARN))).toBeNull();
  });
  it('a producer on a full stack, queued while paused, says so and is not counted', () => {
    const s = enqueue({ ...newState(saltRoad.roster), inventory: { stone: 5 } }, saltRoad, 'mine');
    const paused = render(<Queue state={s} content={saltRoad} working={-1} live={false} onRemove={noop} />);
    expect(paused.container.querySelector('.entry--waiting')).toBeInTheDocument();
    expect(screen.getByText(/stone is full/)).toBeInTheDocument();
    paused.unmount();
    render(<Queue state={s} content={saltRoad} working={-1} live={true} onRemove={noop} />);
    expect(screen.getByText('waiting')).toBeInTheDocument();
    expect(screen.queryByText(/≈/)).toBeNull();
  });
  it('attributes consumed units to each cost in declared order', () => {
    const two = { ...saltRoad, actions: { ...saltRoad.actions, pair: { id: 'pair', verb: 'build' as const, noun: 'a pair', expCost: 10, itemCosts: [{ item: 'stone', amount: 2 }, { item: 'berries', amount: 3 }], isOneTime: true } } };
    const base: GameState = enqueue(newState(saltRoad.roster), two, 'pair');
    const s = { ...base, queue: [{ ...base.queue[0]!, costsConsumed: 3 }] };
    render(<Queue state={s} content={two} working={0} live={true} onRemove={noop} />);
    expect(screen.getByText(/stone 2\/2/)).toBeInTheDocument();
    expect(screen.getByText(/berries 1\/3/)).toBeInTheDocument();
  });
  it('remove calls back with the action id, on one press when nothing has been consumed', () => {
    const onRemove = vi.fn();
    render(<Queue state={enqueue(newState(saltRoad.roster), saltRoad, 'forage')} content={saltRoad} working={0} live={true} onRemove={onRemove} />);
    act(() => { screen.getByRole('button', { name: 'remove Forage berries' }).click(); });
    expect(onRemove).toHaveBeenCalledWith('forage');
  });
  it('an entry that has consumed inputs takes two presses; the first only arms it, and arming lapses', () => {
    vi.useFakeTimers();
    try {
      const onRemove = vi.fn();
      const base = enqueue(newState(saltRoad.roster), saltRoad, 'cabin');
      const s = { ...base, queue: [{ ...base.queue[0]!, costsConsumed: 5, progress: 50 }] };
      render(<Queue state={s} content={saltRoad} working={-1} live={true} onRemove={onRemove} />);
      act(() => { screen.getByRole('button', { name: 'remove Build a cabin' }).click(); });
      expect(onRemove).not.toHaveBeenCalled();
      act(() => { vi.runAllTimers(); });
      act(() => { screen.getByRole('button', { name: 'remove Build a cabin' }).click(); });
      expect(onRemove).not.toHaveBeenCalled();
      act(() => { screen.getByRole('button', { name: 'press again to remove Build a cabin' }).click(); });
      expect(onRemove).toHaveBeenCalledWith('cabin');
    } finally {
      vi.useRealTimers();
    }
  });
  it('a press that slides onto a costly entry after the one above leaves only arms it', () => {
    const onRemove = vi.fn();
    const base = enqueue(enqueue(newState(saltRoad.roster), saltRoad, 'mine'), saltRoad, 'cabin');
    const s = { ...base, queue: [base.queue[0]!, { ...base.queue[1]!, costsConsumed: 5, progress: 50 }] };
    const { container, rerender } = render(<Queue state={s} content={saltRoad} working={0} live={true} onRemove={onRemove} />);
    const firstSlot = () => container.querySelectorAll<HTMLButtonElement>('.entry__x')[0]!;
    rerender(<Queue state={{ ...s, queue: [s.queue[1]!] }} content={saltRoad} working={-1} live={true} onRemove={onRemove} />);   // Mine left on its own
    act(() => { firstSlot().click(); });   // the press aimed at Mine's remove
    expect(onRemove).not.toHaveBeenCalled();
  });
  it('on a dead run the remove buttons say they are inert and do nothing, even on a costly entry', () => {
    const onRemove = vi.fn();
    const base = enqueue(enqueue(newState(saltRoad.roster), saltRoad, 'forage'), saltRoad, 'cabin');
    const s = { ...base, queue: [base.queue[0]!, { ...base.queue[1]!, costsConsumed: 5, progress: 50 }], dead: true };
    render(<Queue state={s} content={saltRoad} working={-1} live={false} dead={true} onRemove={onRemove} />);
    for (const name of ['remove Forage berries', 'remove Build a cabin']) {
      const x = screen.getByRole('button', { name });
      expect(x).toHaveAttribute('aria-disabled', 'true');
      act(() => { x.click(); });
      act(() => { x.click(); });
    }
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.queryByText('?')).toBeNull();
  });
  it('an armed remove goes back to x when the run dies', () => {
    const base = enqueue(newState(saltRoad.roster), saltRoad, 'cabin');
    const s = { ...base, queue: [{ ...base.queue[0]!, costsConsumed: 2, progress: 20 }] };
    const { rerender } = render(<Queue state={s} content={saltRoad} working={-1} live={true} onRemove={noop} />);
    act(() => { screen.getByRole('button', { name: 'remove Build a cabin' }).click(); });
    expect(screen.getByText('?')).toBeInTheDocument();
    rerender(<Queue state={{ ...s, dead: true }} content={saltRoad} working={-1} live={false} dead={true} onRemove={noop} />);
    expect(screen.queryByText('?')).toBeNull();
    expect(screen.getByRole('button', { name: 'remove Build a cabin' })).toHaveAttribute('aria-disabled', 'true');
  });
});
