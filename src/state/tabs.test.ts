import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeLocks } from '../test-utils/locks';
import { acquire, lockName } from './tabs';

const tick = (): Promise<void> => Array.from({ length: 6 }).reduce<Promise<void>>((p) => p.then(() => undefined), Promise.resolve());

describe('acquire', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('holds a free lock until released; lost never settles for a release', async () => {
    const locks = fakeLocks();
    const p = acquire(locks, lockName('k'), { steal: false, waitMs: 100 });
    await tick();
    const held = await p;
    expect(held).not.toBeNull();
    let settled = false;
    void held!.lost.then(() => { settled = true; });
    held!.release();
    await tick();
    expect(settled).toBe(false);
    expect(locks.heldNames()).toEqual([]);
  });
  it('a second request waits, and comes back null when its wait runs out', async () => {
    const locks = fakeLocks();
    const first = acquire(locks, lockName('k'), { steal: false, waitMs: 100 });
    await tick();
    await first;
    const second = acquire(locks, lockName('k'), { steal: false, waitMs: 100 });
    await tick();
    vi.advanceTimersByTime(100);
    await tick();
    expect(await second).toBeNull();
    expect(locks.heldNames()).toEqual([lockName('k')]);
  });
  it('two requests in one task are granted one at a time, and a release inside the wait grants the second: the StrictMode sequence', async () => {
    const locks = fakeLocks();
    const first = acquire(locks, lockName('k'), { steal: false, waitMs: 100 });
    const second = acquire(locks, lockName('k'), { steal: false, waitMs: 100 });
    await tick();
    let secondSettled = false;
    void second.then(() => { secondSettled = true; });
    await tick();
    expect(secondSettled).toBe(false);   // the first holds; the second is queued, not granted
    (await first)!.release();
    await tick();
    expect(await second).not.toBeNull();
    expect(locks.heldNames()).toEqual([lockName('k')]);
  });
  it("a steal takes it, and the holder's lost settles", async () => {
    const locks = fakeLocks();
    const p = acquire(locks, lockName('k'), { steal: false, waitMs: 100 });
    await tick();
    const first = (await p)!;
    let lost = false;
    void first.lost.then(() => { lost = true; });
    const second = await acquire(locks, lockName('k'), { steal: true, waitMs: 0 });
    expect(second).not.toBeNull();
    await tick();
    expect(lost).toBe(true);
  });
});
