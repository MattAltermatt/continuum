import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import { scrub } from '../data/scrub';
import { enqueue, newState } from './queue';
import { setPaused, step } from './tick';

/**
 * The Scrub at its real numbers, headless. The hall is the big sink that keeps
 * time passing (spec section 2); without it every session froze alive, which
 * is what the first test still shows for Forage on its own.
 */
describe('the Scrub at the real numbers', () => {
  it('Forage alone fills berries to the cap, then the queue empties, time stops, and the run is alive', () => {
    let s = setPaused(enqueue(newState(), scrub, 'forage'), 'none');
    const limit = balance.time.ticksPerMinute * 20;   // spec section 1: a run is tuned for 20 minutes
    let t = 0;
    while (s.queue.length > 0 && !s.dead && t < limit) {
      const next = step(s, scrub);
      expect(next).not.toBe(s);          // a fixed point while there is work would be a freeze
      s = next;
      t += 1;
    }
    expect(s.dead).toBe(false);
    expect(s.queue).toHaveLength(0);
    expect(s.inventory.berries).toBe(scrub.items.berries!.cap);
    expect(s.events).toContainEqual({ type: 'full', actionId: 'forage', item: 'berries' });
    expect(step(s, scrub)).toBe(s);      // and now nothing happens: time has stopped
  });
  it('the hall with Mine behind it keeps time passing until the run dies, the hall unfinished', () => {
    let s = setPaused(enqueue(enqueue(newState(), scrub, 'hall'), scrub, 'mine'), 'none');
    const limit = balance.time.ticksPerMinute * 20;
    for (let t = 0; t < limit && !s.dead; t++) {
      s = enqueue(s, scrub, 'mine');     // a no-op while Mine is queued; puts it back if it ever stops at a full pack
      s = step(s, scrub);
    }
    expect(s.dead).toBe(true);
    expect(s.completedOneTime).not.toContain('hall');
    expect(s.queue.find((e) => e.actionId === 'hall')!.costsConsumed).toBeGreaterThan(0);
  });
  it('queuing every row whenever it is not queued ends in death by decay, with food eaten along the way', () => {
    let s = setPaused(newState(), 'none');
    const limit = balance.time.ticksPerMinute * 20;
    let bites = 0;
    const queueOrder = ['forage', 'mine', 'cabin', 'hall'];   // the cabin ahead of the hall, so it gets its stone
    for (let t = 0; t < limit && !s.dead; t++) {
      for (const id of queueOrder) s = enqueue(s, scrub, id);
      const before = s.inventory.berries ?? 0;
      s = step(s, scrub);
      if ((s.inventory.berries ?? 0) < before) bites += 1;
    }
    expect(s.dead).toBe(true);
    expect(s.completedOneTime).toContain('cabin');
    expect(s.completedOneTime).not.toContain('hall');
    expect(bites).toBeGreaterThan(0);
  });
});
