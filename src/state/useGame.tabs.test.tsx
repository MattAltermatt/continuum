// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { balance } from '../balance';
import type { Book } from '../data/types';
import { fakeLocks } from '../test-utils/locks';
import { ASIDE_KEY, saveKey } from './save';
import { useGame, type SaveStorage } from './useGame';

function fakeStorage(initial: Record<string, string> = {}): SaveStorage & { data: Record<string, string> } {
  const data: Record<string, string> = { ...initial };
  return { data, getItem: (k) => (k in data ? data[k]! : null), setItem: (k, v) => { data[k] = v; }, removeItem: (k) => { delete data[k]; } };
}
const longBook: Book = {
  id: 'long', name: 'Long', version: 1, finish: 'long', length: { hours: 1 },
  roster: [{ id: 'build', name: 'Build', icon: 'house' }], items: {},
  actions: { long: { id: 'long', verb: 'build', noun: 'a long thing', expCost: 1e9, itemCosts: [], isOneTime: true } },
  chapters: [{ head: { numeral: 'I', chapter: 'One', story: 'A start.' }, pages: [{ name: '', order: ['long'], closes: 'long' }] }],
};
const interval = balance.time.tickIntervalMs;
const key = saveKey(longBook);
/** Lets the fake's microtasks and the hook's promise chains settle: the StrictMode path takes five turns. */
const flush = () => act(() => Array.from({ length: 10 }).reduce<Promise<void>>((p) => p.then(() => undefined), Promise.resolve()));
/** One tick of wall time: the mount's wait, the winner's wait. */
const oneTick = () => act(() => { vi.advanceTimersByTime(interval); });
const ticksOf = (raw: string | undefined): number => JSON.parse(raw!).model.state.runTicks;

describe('useGame: one tab plays', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('with no lock manager the game plays and saves as before', async () => {
    const storage = fakeStorage();
    const { result } = renderHook(() => useGame(longBook, { storage, locks: null }));
    await flush();
    expect(result.current.elsewhere).toBe('none');
    act(() => result.current.dispatch({ type: 'queue', actionId: 'long' }));
    act(() => vi.advanceTimersByTime(interval * 5));
    expect(result.current.state.runTicks).toBe(5);
  });
  it('the first tab plays; the second is held after its wait, does not tick and does not save', async () => {
    const locks = fakeLocks(); const storage = fakeStorage();
    const first = renderHook(() => useGame(longBook, { storage, locks }));
    await flush();
    expect(first.result.current.elsewhere).toBe('none');
    const second = renderHook(() => useGame(longBook, { storage, locks }));
    await flush();
    oneTick();
    await flush();
    expect(second.result.current.elsewhere).toBe('held');
    act(() => second.result.current.dispatch({ type: 'queue', actionId: 'long' }));
    act(() => vi.advanceTimersByTime(interval * 5));
    expect(second.result.current.state.runTicks).toBe(0);
    act(() => vi.advanceTimersByTime(10_000));
    // The first tab's autosave wrote; the held tab never did: the text has the first's empty queue, not the second's order.
    expect(JSON.parse(storage.data[key]!).model.state.queue).toEqual([]);
  });
  it('Play here takes over: the loser writes once and stops; the winner plays on from that write', async () => {
    const locks = fakeLocks(); const storage = fakeStorage();
    const first = renderHook(() => useGame(longBook, { storage, locks }));
    await flush();
    act(() => first.result.current.dispatch({ type: 'queue', actionId: 'long' }));
    act(() => vi.advanceTimersByTime(interval * 7));
    const second = renderHook(() => useGame(longBook, { storage, locks }));
    await flush();
    oneTick();   // the first tab ticks once more while the second waits
    await flush();
    expect(second.result.current.elsewhere).toBe('held');
    const played = first.result.current.state.runTicks;
    expect(played).toBe(8);
    act(() => second.result.current.playHere());
    await flush();
    // The loser learned and wrote its ticks (it had never saved: 800 ms is under the 5 s autosave).
    expect(first.result.current.elsewhere).toBe('lost');
    expect(ticksOf(storage.data[key])).toBe(played);
    // The winner waits a whole tick before it re-reads: a tick less and it is still held.
    act(() => { vi.advanceTimersByTime(interval - 1); });
    await flush();
    expect(second.result.current.elsewhere).toBe('held');
    // Then it re-reads and goes live on the loser's last write. A tick of its own due at the same instant may land
    // after the seat flips, so the base is read, not asserted.
    act(() => { vi.advanceTimersByTime(1); });
    await flush();
    expect(second.result.current.elsewhere).toBe('none');
    const base = second.result.current.state.runTicks;
    expect(base).toBeGreaterThanOrEqual(played);   // an unloaded winner would sit at 0
    // The winner plays on; the loser does not.
    act(() => vi.advanceTimersByTime(interval * 5));
    expect(second.result.current.state.runTicks).toBe(base + 5);
    expect(first.result.current.state.runTicks).toBe(played);
    // Review Focus 2: nothing more from the loser, by hand, by erase or by interval.
    act(() => second.result.current.save());
    const newest = storage.data[key]!;
    act(() => first.result.current.save());
    expect(storage.data[key]).toBe(newest);
    act(() => first.result.current.erase());
    expect(storage.data[key]).toBe(newest);
    act(() => vi.advanceTimersByTime(10_000));
    expect(ticksOf(storage.data[key])).toBeGreaterThanOrEqual(played + 5);
  });
  it('a loser whose key someone else has written since writes nothing', async () => {
    const locks = fakeLocks(); const storage = fakeStorage();
    const first = renderHook(() => useGame(longBook, { storage, locks }));
    await flush();
    act(() => first.result.current.dispatch({ type: 'queue', actionId: 'long' }));
    act(() => vi.advanceTimersByTime(interval * 3));
    // Another tab wrote in the meantime (a frozen tab thaws to find the world moved on).
    storage.data[key] = 'someone else\'s newer save';
    const second = renderHook(() => useGame(longBook, { storage, locks }));
    await flush(); oneTick(); await flush();
    act(() => second.result.current.playHere());
    await flush();
    expect(first.result.current.elsewhere).toBe('lost');
    expect(storage.data[key]).toBe('someone else\'s newer save');
  });
  it('a takeover whose re-read cannot load sets it aside before going live', async () => {
    const locks = fakeLocks(); const storage = fakeStorage();
    const first = renderHook(() => useGame(longBook, { storage, locks }));
    await flush();
    const second = renderHook(() => useGame(longBook, { storage, locks }));
    await flush(); oneTick(); await flush();
    // Written after the second opened, so its mount set nothing aside: only the takeover's re-read can.
    storage.data[key] = '{"format":99}';
    act(() => second.result.current.playHere());
    await flush(); oneTick(); await flush();
    expect(first.result.current.elsewhere).toBe('lost');
    expect(second.result.current.elsewhere).toBe('none');
    expect(JSON.parse(storage.data[ASIDE_KEY]!)).toEqual(['{"format":99}']);
    // The loser saw null at open and the key holds another text, so it wrote nothing; the winner's autosave is 5 s off.
    expect(storage.data[key]).toBe('{"format":99}');
  });
  it('a lost tab that reloads while the other holds is held', async () => {
    const locks = fakeLocks(); const storage = fakeStorage();
    const first = renderHook(() => useGame(longBook, { storage, locks }));
    await flush();
    const second = renderHook(() => useGame(longBook, { storage, locks }));
    await flush(); oneTick(); await flush();
    act(() => second.result.current.playHere());
    await flush(); oneTick(); await flush();
    first.unmount();
    const again = renderHook(() => useGame(longBook, { storage, locks }));
    await flush(); oneTick(); await flush();
    expect(again.result.current.elsewhere).toBe('held');
  });
  it('mount, unmount and remount in one task (StrictMode) is granted, not held', async () => {
    const locks = fakeLocks(); const storage = fakeStorage();
    const first = renderHook(() => useGame(longBook, { storage, locks }));
    first.unmount();
    const again = renderHook(() => useGame(longBook, { storage, locks }));
    await flush(); oneTick(); await flush();
    expect(again.result.current.elsewhere).toBe('none');
    expect(locks.heldNames()).toEqual([`continuum.lock.${key}`]);
  });
});
