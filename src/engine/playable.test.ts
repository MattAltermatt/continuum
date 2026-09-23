import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import { saltRoad } from '../data/salt-road';
import { enqueue, newState } from './queue';
import { setPaused, step } from './tick';
import { covers } from './health';
import { rebirth } from './rebirth';
import type { GameState } from './types';

/**
 * The Scrub at its real numbers, headless. The hall is the big sink that keeps
 * time passing (spec section 2); without it every session froze alive, which
 * is what the first test still shows for Forage on its own.
 */
describe('the Scrub at the real numbers', () => {
  it('Forage alone fills berries to the cap, then the queue empties, time stops, and the run is alive', () => {
    let s = setPaused(enqueue(newState(saltRoad.roster), saltRoad, 'forage'), 'none');
    const limit = balance.time.ticksPerMinute * 20;   // spec section 1: a run is tuned for 20 minutes
    let t = 0;
    while (s.queue.length > 0 && !s.dead && t < limit) {
      const next = step(s, saltRoad);
      expect(next).not.toBe(s);          // a fixed point while there is work would be a freeze
      s = next;
      t += 1;
    }
    expect(s.dead).toBe(false);
    expect(s.queue).toHaveLength(0);
    expect(s.inventory.berries).toBe(saltRoad.items.berries!.cap);
    expect(s.events).toContainEqual({ type: 'full', actionId: 'forage', item: 'berries' });
    expect(step(s, saltRoad)).toBe(s);      // and now nothing happens: time has stopped
  });
  it('the hall with Mine behind it keeps time passing until the run dies, the hall unfinished', () => {
    let s = setPaused(enqueue(enqueue(newState(saltRoad.roster), saltRoad, 'hall'), saltRoad, 'mine'), 'none');
    const limit = balance.time.ticksPerMinute * 20;
    for (let t = 0; t < limit && !s.dead; t++) {
      s = enqueue(s, saltRoad, 'mine');     // a no-op while Mine is queued; puts it back if it ever stops at a full pack
      s = step(s, saltRoad);
    }
    expect(s.dead).toBe(true);
    expect(s.completedOneTime).not.toContain('hall');
    expect(s.queue.find((e) => e.actionId === 'hall')!.costsConsumed).toBeGreaterThan(0);
  });
  it('queuing every row whenever it is not queued ends in death by decay, with food eaten along the way', () => {
    let s = setPaused(newState(saltRoad.roster), 'none');
    const limit = balance.time.ticksPerMinute * 20;
    let bites = 0;
    const queueOrder = ['forage', 'mine', 'cabin', 'hall'];   // the cabin ahead of the hall, so it gets its stone
    for (let t = 0; t < limit && !s.dead; t++) {
      for (const id of queueOrder) s = enqueue(s, saltRoad, id);
      const before = s.inventory.berries ?? 0;
      s = step(s, saltRoad);
      if ((s.inventory.berries ?? 0) < before) bites += 1;
    }
    expect(s.dead).toBe(true);
    expect(s.completedOneTime).toContain('cabin');
    expect(s.completedOneTime).not.toContain('hall');
    expect(bites).toBeGreaterThan(0);
  });
});

describe('three lives at the real numbers', () => {
  it('each life dies, is reborn, and the next reaches further into the hall with a larger maximum', () => {
    let s = setPaused(newState(saltRoad.roster), 'none');
    const limit = balance.time.ticksPerMinute * 30;
    const hallProgress: number[] = [];
    const maxHealth: number[] = [];
    const queueOrder = ['forage', 'mine', 'cabin', 'hall'];
    for (let life = 0; life < 3; life++) {
      maxHealth.push(s.maxHealth);
      for (let t = 0; t < limit && !s.dead; t++) {
        for (const id of queueOrder) s = enqueue(s, saltRoad, id);
        s = step(s, saltRoad);
      }
      expect(s.dead).toBe(true);
      hallProgress.push(s.queue.find((e) => e.actionId === 'hall')?.costsConsumed ?? 0);
      s = setPaused(rebirth(s), 'none');
    }
    expect(hallProgress[1]!).toBeGreaterThan(hallProgress[0]!);
    expect(hallProgress[2]!).toBeGreaterThan(hallProgress[1]!);
    expect(maxHealth[1]!).toBeGreaterThan(maxHealth[0]!);
    expect(maxHealth[2]!).toBeGreaterThan(maxHealth[1]!);
    expect(s.life).toBe(4);
  });
});

/**
 * Review focus 4. The food line's color is the chunk's one judgement. Across a
 * fed life it must be a state the player can read, not a flicker: short until
 * food is coming in, covered while it keeps up, short once nothing is feeding.
 * Three orders, because the default one never feeds hand to mouth; the rescue
 * (Forage queued at the front at 3:00 by a starving player) and Mine-first do,
 * and flickered under Revision 2's units-only ceiling (naysayer, round 3).
 * Measured with the running-cooldown rule: default R4.1s G450s R167s,
 * rescue R184s G299s R126s (this drive), Mine-first R79s G380s R162s.
 * A characterization of the Scrub's placeholder numbers: when the content or
 * its balance changes, re-measure and update the shape. Do not bend the engine
 * to keep it.
 */
describe('the food line across a fed life', () => {
  function segmentsOf(drive: (s: GameState, t: number) => GameState) {
    let s = setPaused(newState(saltRoad.roster), 'none');
    const segments: { covered: boolean; ticks: number }[] = [];
    for (let t = 0; t < balance.time.ticksPerMinute * 30 && !s.dead; t++) {
      s = step(drive(s, t), saltRoad);
      const c = covers(s, saltRoad);
      const last = segments[segments.length - 1];
      if (last && last.covered === c) last.ticks += 1;
      else segments.push({ covered: c, ticks: 1 });
    }
    return { segments, runTicks: s.runTicks };
  }
  const all = (order: string[]) => (s: GameState) => order.reduce((acc, id) => enqueue(acc, saltRoad, id), s);
  const rescueAt = balance.time.ticksPerMinute * 3;
  const cases: [string, (s: GameState, t: number) => GameState][] = [
    ['default order', all(['forage', 'mine', 'cabin', 'hall'])],
    ['Mine first', all(['mine', 'cabin', 'hall', 'forage'])],
    ['the rescue: Forage to the front at 3:00', (s, t) => {
      let next = all(['hall', 'mine'])(s);
      if (t === rescueAt) next = enqueue(next, saltRoad, 'forage', { front: true });
      if (t > rescueAt) next = enqueue(next, saltRoad, 'forage');
      return next;
    }],
  ];
  for (const [name, drive] of cases) {
    it(`${name}: short, then covered, then short, and no flicker`, () => {
      const { segments, runTicks } = segmentsOf(drive);
      expect(segments.map((x) => x.covered)).toEqual([false, true, false]);
      expect(segments[1]!.ticks / runTicks).toBeGreaterThan(0.4);
    });
  }
});
