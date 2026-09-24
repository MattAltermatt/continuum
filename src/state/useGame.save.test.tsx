// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { balance } from '../balance';
import type { Book } from '../data/types';
import { saltRoadFixture } from '../test-utils/salt-road';
import { ASIDE_KEY, AUTOSAVE_MS, SAVE_KEY } from './save';
import { useGame, type SaveStorage } from './useGame';

/** A storage the test can read back. */
function fakeStorage(initial: Record<string, string> = {}): SaveStorage & { data: Record<string, string> } {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k]! : null),
    setItem: (k, v) => { data[k] = v; },
    removeItem: (k) => { delete data[k]; },
  };
}

/** One row that never finishes and costs nothing: the clock runs as long as it is queued. */
const longBook: Book = {
  id: 'long', name: 'Long', version: 1, finish: 'long', length: { hours: 1 },
  roster: [{ id: 'build', name: 'Build', icon: 'house' }],
  items: {},
  actions: { long: { id: 'long', verb: 'build', noun: 'a long thing', expCost: 1e9, itemCosts: [], isOneTime: true } },
  chapters: [{ head: { numeral: 'I', chapter: 'One', story: 'A start.' }, pages: [{ name: '', order: ['long'], closes: 'long' }] }],
};

const interval = balance.time.tickIntervalMs;

describe('useGame: the save', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('opens a stored save where it was', () => {
    const storage = fakeStorage();
    const first = renderHook(() => useGame(saltRoadFixture, { storage }));
    act(() => first.result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => vi.advanceTimersByTime(interval * 20));
    act(() => first.result.current.save());
    const saved = first.result.current.state;
    first.unmount();
    const again = renderHook(() => useGame(saltRoadFixture, { storage }));
    expect(again.result.current.state.runTicks).toBe(saved.runTicks);
    expect(again.result.current.state.queue).toEqual(saved.queue);
    expect(again.result.current.state.work).toEqual(saved.work);
  });
  it('a corrupt save opens fresh, is set aside, and says so; a second one is kept beside it', () => {
    const storage = fakeStorage({ [SAVE_KEY]: '{ not json' });
    const { result, unmount } = renderHook(() => useGame(saltRoadFixture, { storage }));
    expect(result.current.state.life).toBe(1);
    expect(result.current.state.runTicks).toBe(0);
    expect(result.current.log[0]!.event).toEqual({ type: 'saveAside', why: 'corrupt' });
    expect(JSON.parse(storage.data[ASIDE_KEY]!)).toEqual(['{ not json']);
    unmount();
    storage.data[SAVE_KEY] = '{"format":99}';
    renderHook(() => useGame(saltRoadFixture, { storage }));
    expect(JSON.parse(storage.data[ASIDE_KEY]!)).toEqual(['{ not json', '{"format":99}']);
  });
  it('a storage that throws opens fresh with no error, and saving into it does not throw', () => {
    const throwing: SaveStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
    const { result } = renderHook(() => useGame(saltRoadFixture, { storage: throwing }));
    expect(result.current.state.life).toBe(1);
    expect(() => act(() => result.current.save())).not.toThrow();
    expect(() => act(() => result.current.erase())).not.toThrow();
  });
  it('writes on an interval and when the page is hidden', () => {
    const storage = fakeStorage();
    const { result } = renderHook(() => useGame(saltRoadFixture, { storage }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    // Two acts: one act batches every dispatch until it ends, while a browser commits between intervals.
    act(() => vi.advanceTimersByTime(AUTOSAVE_MS - interval));
    act(() => vi.advanceTimersByTime(interval));
    const written = JSON.parse(storage.data[SAVE_KEY]!);
    expect(written).toMatchObject({ bookId: saltRoadFixture.id });
    expect(written.model.state.runTicks).toBeGreaterThan(0);
    delete storage.data[SAVE_KEY];
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(storage.data[SAVE_KEY]).toBeDefined();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });
  it('erase removes the save and starts life 1 fresh', () => {
    const storage = fakeStorage();
    const { result } = renderHook(() => useGame(saltRoadFixture, { storage }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => vi.advanceTimersByTime(interval * 10));
    act(() => result.current.save());
    act(() => result.current.erase());
    expect(storage.data[SAVE_KEY]).toBeUndefined();
    expect(result.current.state.runTicks).toBe(0);
    expect(result.current.state.queue).toEqual([]);
    expect(result.current.log).toHaveLength(1);
  });
  it('load reads the save back into the game', () => {
    const storage = fakeStorage();
    const { result } = renderHook(() => useGame(saltRoadFixture, { storage }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'forage' }));
    act(() => vi.advanceTimersByTime(interval * 10));
    act(() => result.current.save());
    const saved = result.current.state.runTicks;
    act(() => vi.advanceTimersByTime(interval * 10));
    act(() => result.current.load());
    expect(result.current.state.runTicks).toBe(saved);
  });
});

describe('useGame: the loop catches up', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('a wake after a throttled gap runs the ticks it missed', () => {
    const { result } = renderHook(() => useGame(longBook, { storage: null }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'long' }));
    const now = performance.now();
    // Chrome woke the hidden tab 3 s late: one interval fires, 3 s of real time has passed.
    vi.spyOn(performance, 'now').mockReturnValue(now + 3000);
    act(() => vi.advanceTimersByTime(interval));
    expect(result.current.state.runTicks).toBe(3000 / interval);
  });
  it('a wake after a night runs at most balance.loop.maxCatchUpMinutes of game time', () => {
    const { result } = renderHook(() => useGame(longBook, { storage: null }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'long' }));
    const now = performance.now();
    const night = now + 8 * 60 * 60 * 1000;
    const clock = vi.spyOn(performance, 'now').mockReturnValue(night);
    act(() => vi.advanceTimersByTime(interval));
    const cap = balance.loop.maxCatchUpMinutes * balance.time.ticksPerMinute;
    expect(result.current.state.runTicks).toBe(cap);
    // The rest of the night is dropped, not owed: the next interval runs one tick, not another capped wake.
    clock.mockReturnValue(night + interval);
    act(() => vi.advanceTimersByTime(interval));
    expect(result.current.state.runTicks).toBe(cap + 1);
  });
  it('a wake keeps the milliseconds it did not spend: two and a half intervals, then one and a half, run four ticks', () => {
    // Real time is pinned from before mount, so the loop's first reading is exactly `start`.
    const start = performance.now();
    const clock = vi.spyOn(performance, 'now').mockReturnValue(start);
    const { result } = renderHook(() => useGame(longBook, { storage: null }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'long' }));
    clock.mockReturnValue(start + 2.5 * interval);
    act(() => vi.advanceTimersByTime(interval));
    expect(result.current.state.runTicks).toBe(2);
    clock.mockReturnValue(start + 4 * interval);
    act(() => vi.advanceTimersByTime(interval));
    expect(result.current.state.runTicks).toBe(4);
  });
  it('speed 10 runs ten ticks per interval', () => {
    const { result } = renderHook(() => useGame(longBook, { storage: null }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'long' }));
    act(() => result.current.setSpeed(10));
    act(() => vi.advanceTimersByTime(interval * 3));
    expect(result.current.state.runTicks).toBe(30);
  });
  it('tick n stops at an idle step and at a death', () => {
    const { result } = renderHook(() => useGame(longBook, { storage: null }));
    act(() => result.current.dispatch({ type: 'tick', n: 50 }));
    expect(result.current.state.runTicks).toBe(0);   // nothing queued: the first step is idle
    act(() => result.current.dispatch({ type: 'queue', actionId: 'long' }));
    act(() => result.current.dispatch({ type: 'setHealth', health: 0.001 }));
    act(() => result.current.dispatch({ type: 'tick', n: 50 }));
    expect(result.current.state.dead).toBe(true);
    expect(result.current.state.runTicks).toBe(1);
  });
});
