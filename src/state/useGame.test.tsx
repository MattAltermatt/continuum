// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { balance } from '../balance';
import { saltRoad } from '../data/salt-road';
import { LOG_LINES, useGame } from './useGame';

describe('useGame', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts live with an empty queue, so nothing ticks until work is queued (decision #41), and a lifeBegins line', () => {
    const { result } = renderHook(() => useGame(saltRoad));
    expect(result.current.state.paused).toBe('none');
    expect(result.current.state.queue).toHaveLength(0);
    expect(result.current.log[0]).toEqual({ seq: 0, at: 0, event: { type: 'lifeBegins', life: 1 } });
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 5));
    expect(result.current.state.runTicks).toBe(0);
  });

  it('setHealth (dev handle) lets verification reach death: the next working tick dies and logs it', () => {
    const { result } = renderHook(() => useGame(saltRoad));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => result.current.dispatch({ type: 'setHealth', health: 0.001 }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs));
    expect(result.current.state.dead).toBe(true);
    expect(result.current.log[0]!.event).toEqual({ type: 'died', runTicks: 1 });
  });

  it('keeps at most LOG_LINES, newest first, and seq stays unique past the cap (a length-based seq would repeat)', () => {
    const { result } = renderHook(() => useGame(saltRoad));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'hall' }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'mine' }));
    // The hall and Mine alternate on every stone: two lines per stone. Twelve minutes, health
    // topped up every half minute so decay does not end it first: about 190 lines, past the cap.
    const halfMinute = balance.time.ticksPerMinute / 2;
    for (let i = 0; i < 24; i++) {
      act(() => result.current.dispatch({ type: 'setHealth', health: balance.health.base }));
      act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * halfMinute));
    }
    const log = result.current.log;
    expect(log).toHaveLength(LOG_LINES);
    expect(new Set(log.map((l) => l.seq)).size).toBe(LOG_LINES);
    expect(log[0]!.seq).toBeGreaterThan(LOG_LINES);
    expect(log.every((l, i) => i === 0 || l.seq < log[i - 1]!.seq)).toBe(true);
  });
  it('gives every log line a distinct seq that does not change when newer lines are prepended', () => {
    const { result } = renderHook(() => useGame(saltRoad));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'cabin' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs));
    const before = result.current.log.map((l) => [l.seq, l.event.type]);
    act(() => result.current.dispatch({ type: 'queue', actionId: 'mine' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 70));
    const after = result.current.log;
    expect(after.length).toBeGreaterThan(before.length);
    expect(after.slice(after.length - before.length).map((l) => [l.seq, l.event.type])).toEqual(before);
    expect(new Set(after.map((l) => l.seq)).size).toBe(after.length);
  });

  it('queues, resumes, and ticks on the balance interval', () => {
    const { result } = renderHook(() => useGame(saltRoad));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => result.current.dispatch({ type: 'resume' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 3));
    expect(result.current.state.runTicks).toBe(3);
  });

  it('front puts the entry first; remove drops by action id', () => {
    const { result } = renderHook(() => useGame(saltRoad));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'mine', front: true }));
    expect(result.current.state.queue.map((e) => e.actionId)).toEqual(['mine', 'forage']);
    act(() => result.current.dispatch({ type: 'remove', actionId: 'mine' }));
    expect(result.current.state.queue.map((e) => e.actionId)).toEqual(['forage']);
  });

  it('resume after a pause starts the clock again', () => {
    const { result } = renderHook(() => useGame(saltRoad));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => result.current.dispatch({ type: 'pause' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 3));
    expect(result.current.state.runTicks).toBe(0);
    act(() => result.current.dispatch({ type: 'resume' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 3));
    expect(result.current.state.runTicks).toBe(3);
  });
  it('pause stops the clock', () => {
    const { result } = renderHook(() => useGame(saltRoad));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => result.current.dispatch({ type: 'resume' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs));
    act(() => result.current.dispatch({ type: 'pause' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 5));
    expect(result.current.state.runTicks).toBe(1);
  });

  it('logs a wait the tick it is found, newest first, and does not log repeat completions', () => {
    const { result } = renderHook(() => useGame(saltRoad));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'cabin' }));
    act(() => result.current.dispatch({ type: 'resume' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs));
    expect(result.current.log[0]!.event).toEqual({ type: 'stalled', actionId: 'cabin', item: 'stone' });
    const forageTicks = Math.floor(saltRoad.actions.forage!.expCost / balance.skills.baseTickExp) + 1;
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * forageTicks));
    expect(result.current.state.inventory.berries).toBeGreaterThan(0);
    expect(result.current.log.some((l) => l.event.type === 'completed')).toBe(false);
    const lines = result.current.log.length;
    const ticks = result.current.state.runTicks;
    act(() => result.current.dispatch({ type: 'remove', actionId: 'forage' }));   // the cabin cannot pay: nothing can run
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 3));
    expect(result.current.state.runTicks).toBe(ticks);
    expect(result.current.log).toHaveLength(lines);
  });
  function die(result: { current: ReturnType<typeof useGame> }, workTicks: number) {
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * workTicks));
    act(() => result.current.dispatch({ type: 'setHealth', health: 0.001 }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs));
  }

  it('alive, the view is the state itself and there is no card', () => {
    const { result } = renderHook(() => useGame(saltRoad));
    expect(result.current.view).toBe(result.current.state);
    expect(result.current.card).toBeNull();
  });

  it('a death keeps the dead state; the card and the reborn view are derived from it', () => {
    const { result } = renderHook(() => useGame(saltRoad));
    die(result, 50);
    const { state, view, card, log } = result.current;
    expect(state.dead).toBe(true);
    expect(card?.life).toBe(1);
    expect(card?.runTicks).toBe(51);
    expect(view.dead).toBe(false);
    expect(view.life).toBe(2);
    expect(view.queue).toEqual([]);
    expect(view.inventory).toEqual({});
    expect(view.health).toBe(view.maxHealth);
    expect(view.maxHealth).toBeGreaterThan(balance.health.base);
    expect(view.paused).toBe('system');
    expect(log[0]!.event).toEqual({ type: 'died', runTicks: 51 });
  });

  it('while dead, orders, pause/resume and setHealth change nothing, and no time passes', () => {
    const { result } = renderHook(() => useGame(saltRoad));
    die(result, 5);
    const before = result.current.state;
    expect(before.dead).toBe(true);
    act(() => result.current.dispatch({ type: 'queue', actionId: 'mine' }));
    act(() => result.current.dispatch({ type: 'resume' }));
    act(() => result.current.dispatch({ type: 'pause' }));
    act(() => result.current.dispatch({ type: 'remove', actionId: 'forage' }));
    act(() => result.current.dispatch({ type: 'setHealth', health: 50 }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 20));
    expect(result.current.state).toBe(before);
  });

  it('begin starts the next life live, clears the card, logs it, and the next queue ticks', () => {
    const { result } = renderHook(() => useGame(saltRoad));
    die(result, 5);
    act(() => result.current.dispatch({ type: 'begin' }));
    const { state, card, log } = result.current;
    expect(card).toBeNull();
    expect(state.dead).toBe(false);
    expect(state.life).toBe(2);
    expect(state.paused).toBe('none');
    expect(log[0]!.event).toEqual({ type: 'lifeBegins', life: 2 });
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 3));
    expect(result.current.state.runTicks).toBe(3);
  });

  it('begin while alive does nothing', () => {
    const { result } = renderHook(() => useGame(saltRoad));
    const before = result.current.state;
    act(() => result.current.dispatch({ type: 'begin' }));
    expect(result.current.state).toBe(before);
    expect(result.current.log).toHaveLength(1);
  });

  it('two deaths: the second card starts where the first one ended', () => {
    const { result } = renderHook(() => useGame(saltRoad));
    die(result, 30);
    const first = result.current.card!;
    act(() => result.current.dispatch({ type: 'begin' }));
    die(result, 30);
    const second = result.current.card!;
    expect(second.life).toBe(2);
    expect(second.maxHealthFrom).toBe(first.maxHealthTo);
    expect(second.maxHealthTo).toBeGreaterThan(second.maxHealthFrom);
  });
});
