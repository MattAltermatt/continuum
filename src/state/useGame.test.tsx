// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { balance } from '../balance';
import { saltRoadFixture } from '../test-utils/salt-road';
import { LOG_LINES, useGame } from './useGame';

describe('useGame', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts live with an empty queue, so nothing ticks until work is queued (decision #41), and a lifeBegins line', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
    expect(result.current.state.paused).toBe('none');
    expect(result.current.state.queue).toHaveLength(0);
    expect(result.current.log[0]).toEqual({ seq: 0, at: 0, event: { type: 'lifeBegins', life: 1 } });
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 5));
    expect(result.current.state.runTicks).toBe(0);
  });

  it('setHealth (dev handle) lets verification reach death: the next working tick dies and logs it', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => result.current.dispatch({ type: 'setHealth', health: 0.001 }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs));
    expect(result.current.state.dead).toBe(true);
    expect(result.current.log[0]!.event).toEqual({ type: 'died', runTicks: 1 });
  });

  it('keeps at most LOG_LINES, newest first, and seq stays unique past the cap (a length-based seq would repeat)', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
    // Stall chatter is gone, and coreLevel lines cannot reach the cap in a test's time (the
    // hundredth core level costs about 1.4M XP). A + on a cabin with no stone, which no automation
    // supplies, pops on the next tick with one short line: 101 of them, plus lifeBegins, pass the cap.
    for (let i = 0; i < LOG_LINES + 1; i++) {
      act(() => result.current.dispatch({ type: 'queue', actionId: 'cabin' }));
      act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs));
    }
    expect(result.current.log.filter((l) => l.event.type === 'short')).toHaveLength(LOG_LINES);
    const log = result.current.log;
    expect(log).toHaveLength(LOG_LINES);
    expect(new Set(log.map((l) => l.seq)).size).toBe(LOG_LINES);
    expect(log[0]!.seq).toBeGreaterThan(LOG_LINES);
    expect(log.every((l, i) => i === 0 || l.seq < log[i - 1]!.seq)).toBe(true);
  });
  it('gives every log line a distinct seq that does not change when newer lines are prepended', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'cabin' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs));
    const before = result.current.log.map((l) => [l.seq, l.event.type]);
    act(() => result.current.dispatch({ type: 'queue', actionId: 'mine' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 250));   // two Mine core levels
    const after = result.current.log;
    expect(after.length).toBeGreaterThan(before.length);
    expect(after.slice(after.length - before.length).map((l) => [l.seq, l.event.type])).toEqual(before);
    expect(new Set(after.map((l) => l.seq)).size).toBe(after.length);
  });

  it('queues, resumes, and ticks on the balance interval', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => result.current.dispatch({ type: 'resume' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 3));
    expect(result.current.state.runTicks).toBe(3);
  });

  it('front puts the entry first; once is single; remove drops by entry id', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'mine', front: true, once: true }));
    expect(result.current.state.queue.map((e) => [e.actionId, e.mode])).toEqual([['mine', 'once'], ['forage', 'repeat']]);
    act(() => result.current.dispatch({ type: 'remove', entryId: 1 }));
    expect(result.current.state.queue.map((e) => e.actionId)).toEqual(['forage']);
  });
  it('an unknown action leaves the game as it is (#67)', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
    const before = result.current.state;
    act(() => result.current.dispatch({ type: 'enqueue', actionId: 'forage' } as never));
    expect(result.current.state).toBe(before);
  });
  it('automate sets an earned row\'s mode and refuses an unearned one', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
    const before = result.current.state;
    act(() => result.current.dispatch({ type: 'automate', actionId: 'forage', mode: 'jit' }));
    expect(result.current.state).toBe(before);
  });

  it('resume after a pause starts the clock again', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => result.current.dispatch({ type: 'pause' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 3));
    expect(result.current.state.runTicks).toBe(0);
    act(() => result.current.dispatch({ type: 'resume' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 3));
    expect(result.current.state.runTicks).toBe(3);
  });
  it('pause stops the clock', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => result.current.dispatch({ type: 'resume' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs));
    act(() => result.current.dispatch({ type: 'pause' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 5));
    expect(result.current.state.runTicks).toBe(1);
  });

  it('logs a short the tick it is found, and not repeat completions or pops; an empty queue logs nothing more', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'cabin' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs));
    expect(result.current.log[0]!.event).toEqual({ type: 'short', actionId: 'cabin', item: 'stone', amount: 6, maker: 'mine', gap: 'unearned' });
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    const forageTicks = Math.floor(saltRoadFixture.actions.forage!.expCost / balance.skills.baseTickExp) + 1;
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * forageTicks * (balance.inventory.stackCap + 1)));
    expect(result.current.state.inventory.berries).toBe(balance.inventory.stackCap);
    expect(result.current.state.queue).toEqual([]);
    expect(result.current.log.some((l) => l.event.type === 'completed' || l.event.type === 'popped')).toBe(false);
    const lines = result.current.log.length;
    const ticks = result.current.state.runTicks;
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 3));
    expect(result.current.state.runTicks).toBe(ticks);
    expect(result.current.log).toHaveLength(lines);
  });
  it('an order settles at once: a + on a cabin nothing can supply leaves with its line in the same commit, and no time passes', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'cabin' }));
    expect(result.current.state.queue).toEqual([]);
    expect(result.current.log[0]!.event).toMatchObject({ type: 'short', actionId: 'cabin', item: 'stone' });
    expect(result.current.state.runTicks).toBe(0);
  });
  it('paused, nothing settles: the order waits where it was put, and no automation refills', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
    const s = result.current.state;
    const jit = { ...s, paused: 'player' as const, completionCounts: { forage: balance.automation.unlockRepeatable }, automation: { forage: 'jit' as const } };
    act(() => result.current.dispatch({ type: 'load', model: { state: jit, log: [], nextSeq: 0 } }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'cabin' }));
    expect(result.current.state.queue.map((e) => e.actionId)).toEqual(['cabin']);
    expect(result.current.log).toEqual([]);
    act(() => result.current.dispatch({ type: 'resume' }));
    // Resumed, it settles: the forage fill goes in on top for the empty larder.
    expect(result.current.state.queue.map((e) => `${e.actionId}:${e.by}`)).toEqual(['forage:auto', 'cabin:player']);
  });
  it('a shortfall whose row still has an order queued is not news: mine, cabin, mine, cabin builds the cabin with no short line', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
    for (const actionId of ['mine', 'cabin', 'mine', 'cabin']) act(() => result.current.dispatch({ type: 'queue', actionId }));
    const mineTicks = Math.floor(saltRoadFixture.actions.mine!.expCost / balance.skills.baseTickExp) + 1;
    const cabinTicks = Math.floor(saltRoadFixture.actions.cabin!.expCost / balance.skills.baseTickExp) + 1;
    for (let i = 0; i < (mineTicks * 6 + cabinTicks) * 2 && !result.current.state.completedOneTime.includes('cabin'); i++) act(() => result.current.dispatch({ type: 'tick' }));
    expect(result.current.state.completedOneTime).toContain('cabin');
    expect(result.current.log.some((l) => l.event.type === 'short')).toBe(false);
  });
  it('a shortfall still says why when a different row is what remains queued', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture, { storage: null }));
    act(() => result.current.dispatch({ type: 'pause' }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'cabin' }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => result.current.dispatch({ type: 'resume' }));
    expect(result.current.state.queue.map((e) => e.actionId)).toEqual(['forage']);
    expect(result.current.log[0]!.event).toMatchObject({ type: 'short', actionId: 'cabin' });
  });
  it('two different rows leaving in one go each say why', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture, { storage: null }));
    act(() => result.current.dispatch({ type: 'pause' }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'cabin' }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'hall' }));
    act(() => result.current.dispatch({ type: 'resume' }));
    expect(result.current.state.queue).toEqual([]);
    expect(result.current.log.filter((l) => l.event.type === 'short').map((l) => (l.event as { actionId: string }).actionId).sort()).toEqual(['cabin', 'hall']);
  });
  it('two orders for one row leaving in one go say it once', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture, { storage: null }));
    act(() => result.current.dispatch({ type: 'pause' }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'cabin' }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'cabin' }));
    act(() => result.current.dispatch({ type: 'resume' }));
    expect(result.current.state.queue).toEqual([]);
    expect(result.current.log.filter((l) => l.event.type === 'short')).toHaveLength(1);
  });
  it('a tick of many stops at the first idle step: the last tick\'s short is not logged again for each idle one', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'cabin' }));
    act(() => result.current.dispatch({ type: 'tick' }));
    // The cabin popped short with nothing to supply it: the queue is empty, and the state still carries that tick's short.
    expect(result.current.state.queue).toEqual([]);
    expect(result.current.state.events).toContainEqual(expect.objectContaining({ type: 'short', actionId: 'cabin' }));
    expect(result.current.log.filter((l) => l.event.type === 'short')).toHaveLength(1);
    const before = result.current.state;
    const lines = result.current.log.length;
    act(() => result.current.dispatch({ type: 'tick', n: 50 }));
    expect(result.current.state).toBe(before);
    expect(result.current.log).toHaveLength(lines);
    expect(result.current.log.filter((l) => l.event.type === 'short')).toHaveLength(1);
  });
  it('automation\'s own orders stay out of the log, as pops do (plan Task 7): a JIT food fill runs without a line', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
    const s = result.current.state;
    const jit = { ...s, completionCounts: { forage: balance.automation.unlockRepeatable }, automation: { forage: 'jit' as const } };
    act(() => result.current.dispatch({ type: 'load', model: { state: jit, log: [], nextSeq: 0 } }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 3));
    expect(result.current.state.queue[0]).toMatchObject({ actionId: 'forage', by: 'auto' });
    expect(result.current.state.runTicks).toBe(3);
    expect(result.current.log.some((l) => l.event.type === 'automated' || l.event.type === 'popped')).toBe(false);
  });
  function die(result: { current: ReturnType<typeof useGame> }, workTicks: number) {
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * workTicks));
    act(() => result.current.dispatch({ type: 'setHealth', health: 0.001 }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs));
  }

  it('alive, the view is the state itself and there is no card', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
    expect(result.current.view).toBe(result.current.state);
    expect(result.current.card).toBeNull();
  });

  it('a death keeps the dead state; the card and the reborn view are derived from it', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
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
    const { result } = renderHook(() => useGame(saltRoadFixture));
    die(result, 5);
    const before = result.current.state;
    expect(before.dead).toBe(true);
    act(() => result.current.dispatch({ type: 'queue', actionId: 'mine' }));
    act(() => result.current.dispatch({ type: 'resume' }));
    act(() => result.current.dispatch({ type: 'pause' }));
    act(() => result.current.dispatch({ type: 'remove', entryId: 0 }));
    act(() => result.current.dispatch({ type: 'setHealth', health: 50 }));
    act(() => vi.advanceTimersByTime(balance.time.tickIntervalMs * 20));
    expect(result.current.state).toBe(before);
  });

  it('begin starts the next life live, clears the card, logs it, and the next queue ticks', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
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
    const { result } = renderHook(() => useGame(saltRoadFixture));
    const before = result.current.state;
    act(() => result.current.dispatch({ type: 'begin' }));
    expect(result.current.state).toBe(before);
    expect(result.current.log).toHaveLength(1);
  });

  it('two deaths: the second card starts where the first one ended', () => {
    const { result } = renderHook(() => useGame(saltRoadFixture));
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
