import { describe, expect, it } from 'vitest';
import type { ActionId, Content } from '../data/types';
import { windwardRun } from '../data/windward-run';
import { cycleOf, modeOf, setAutomation, unlockAt } from './automation';
import { capOf } from './effects';
import { fixture } from './fixture';
import { enqueue, newState, removeEntry, startBlock } from './queue';
import { rebirth } from './rebirth';
import { resolve } from './resolve';
import { setPaused, step } from './tick';
import type { GameState, QueueEntry } from './types';

/**
 * Seeded random play (code panel round four): a player pressing play and +,
 * x, chips and pause at random, with every row's chip earned, checked after
 * each action against the invariants the four code panel rounds found broken
 * one at a time. Each action is settled as useGame settles it (resolve while
 * live). Deterministic: a small LCG, never Math.random.
 */
function lcg(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 2 ** 32;
  };
}

/** A stew: an eel from `cost`. With scrap, a second JIT food whose input has a maker; with fish, a food another row costs. */
const withStew = (cost: { readonly item: string; readonly amount: number }): Content => ({
  ...fixture,
  actions: { ...fixture.actions, stew: { id: 'stew', verb: 'fish', noun: 'a stew', expCost: 1, producedItem: 'eel', producedAmount: 1, itemCosts: [cost], isOneTime: false } },
  chapters: [{ ...fixture.chapters[0]!, order: [...fixture.chapters[0]!.order, 'stew'] }, fixture.chapters[1]!],
});
const stewed = withStew({ item: 'scrap', amount: 1 });
const chained = withStew({ item: 'fish', amount: 2 });

/** The order `e` is, or supplies through its chain, an order for row `id`. */
function leadsTo(s: GameState, e: QueueEntry, id: ActionId): boolean {
  const seen = new Set<number>();
  for (let cur: QueueEntry | undefined = e; cur !== undefined && !seen.has(cur.id); cur = cur.for === undefined ? undefined : s.queue.find((x) => x.id === cur!.for)) {
    if (cur.actionId === id) return true;
    seen.add(cur.id);
  }
  return false;
}

/**
 * A JIT food out that could be made has its food on the way: not buried under a
 * player's order, and either an automation fill queued for it or its own order
 * on top or below nothing but its supply. Checked after every tick, it may miss
 * by one tick (the next tick's resolve queues the fill).
 */
function starving(s: GameState, content: Content): readonly ActionId[] {
  if (s.paused !== 'none' || s.dead) return [];
  return content.chapters[s.chapter]!.order.filter((id) => {
    const a = content.actions[id]!;
    const food = a.producedItem !== undefined && content.items[a.producedItem]?.kind === 'food';
    if (!food || modeOf(s, a) !== 'jit' || (s.inventory[a.producedItem!] ?? 0) > 0 || startBlock(s, content, id) !== null) return false;
    const i = s.queue.findIndex((e) => e.actionId === id);
    if (i < 0) return true;
    const above = s.queue.slice(0, i);
    if (above.some((e) => e.by === 'player')) return true;
    // The first order for the row is an automation fill, or the player's own order on top or below only its supply.
    const fill = s.queue[i]!.by === 'auto';
    return !fill && !above.every((e) => leadsTo(s, e, id));
  });
}

function play(content: Content, seed: number, actions: number, chapter = 0): void {
  const rand = lcg(seed);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
  const ids = Object.keys(content.actions);
  const earned = Object.fromEntries(ids.map((id) => [id, unlockAt(content.actions[id]!)]));
  let s: GameState = setPaused({ ...newState(content.roster), completionCounts: earned, chapter }, 'none');
  const settle = (x: GameState): GameState => (x.paused === 'none' && !x.dead ? resolve(x, content).state : x);
  const hungry = new Map<ActionId, number>();
  for (let n = 0; n < actions; n++) {
    const roll = rand();
    const here = content.chapters[s.chapter]!.order;
    if (roll < 0.25) s = enqueue(s, content, pick(here), { front: rand() < 0.5, once: rand() < 0.3 });
    else if (roll < 0.35 && s.queue.length > 0) s = removeEntry(s, pick(s.queue).id);
    else if (roll < 0.5) { const id = pick(here); s = setAutomation(s, content, id, pick(cycleOf(content, content.actions[id]!))); }
    else if (roll < 0.53) s = setPaused(s, s.paused === 'none' ? 'player' : 'none');
    else for (let k = Math.floor(rand() * 40); k > 0 && !s.dead; k--) {
      s = step(s, content);
      // Liveness (round five): a JIT food out and makeable is on its way by the next tick.
      const now = new Set(starving(s, content));
      for (const id of [...hungry.keys()]) if (!now.has(id)) hungry.delete(id);
      for (const id of now) {
        hungry.set(id, (hungry.get(id) ?? 0) + 1);
        expect(hungry.get(id), `seed ${seed}, action ${n}: ${id} out and not on its way: ${s.queue.map((e) => `${e.actionId}:${e.by}`).join(',')}`).toBeLessThanOrEqual(1);
      }
    }
    if (s.dead) { s = setPaused({ ...rebirth(s), chapter }, 'none'); hungry.clear(); }
    s = settle(s);

    const at = `seed ${seed}, action ${n}`;
    if (s.paused === 'none') expect(resolve(s, content).state, `${at}: settled`).toBe(s);
    // The player may pile up orders, each with its supply; automation's other orders stay few (a fill per food, one going first, the idle fill).
    const shown = s.queue.map((e) => `${e.actionId}:${e.by}${e.for === undefined ? '' : `>${e.for}`}`).join(',');
    expect(s.queue.filter((e) => e.by === 'auto' && e.for === undefined).length, `${at}: ${shown}`).toBeLessThanOrEqual(4);
    const served = s.queue.flatMap((e) => (e.for === undefined ? [] : [e.for]));
    expect(new Set(served).size, `${at}: two supplies for one order: ${shown}`).toBe(served.length);
    for (const e of s.queue) if (e.for !== undefined) expect(s.queue.some((x) => x.id === e.for), `${at}: orphan ${e.actionId}`).toBe(true);
    const fills = s.queue.filter((e) => e.by === 'auto' && e.left !== undefined).map((e) => e.actionId);
    expect(new Set(fills).size, `${at}: two fills for one row`).toBe(fills.length);
    // A JIT food out that could be made is never left under the player's orders (round two's starvation).
    if (s.paused === 'none') for (const id of content.chapters[s.chapter]!.order) {
      const a = content.actions[id]!;
      const food = a.producedItem !== undefined && content.items[a.producedItem]?.kind === 'food';
      if (!food || modeOf(s, a) !== 'jit' || (s.inventory[a.producedItem!] ?? 0) > 0 || startBlock(s, content, id) !== null) continue;
      const i = s.queue.findIndex((e) => e.actionId === id);
      expect(i >= 0 && !s.queue.slice(0, i).some((e) => e.by === 'player'), `${at}: ${id} out and not on its way: ${shown}`).toBe(true);
    }
    for (const [item, have] of Object.entries(s.inventory)) {
      expect(have, `${at}: ${item}`).toBeGreaterThanOrEqual(0);
      expect(have, `${at}: ${item} over its cap`).toBeLessThanOrEqual(capOf(s, content, item));
    }
  }
}

describe('seeded random play keeps the queue sound', () => {
  // A second or two on a laptop; a slow runner gets 30 s (CLAUDE.md: the play and measure suites likewise).
  it('on the fixture with two JIT foods', () => {
    for (const seed of [1, 2, 3, 4, 5]) play(stewed, seed, 3000);
  }, 30_000);
  it('on the fixture with a food another row costs', () => {
    for (const seed of [6, 7, 8]) play(chained, seed, 3000);
  }, 30_000);
  it('on The Windward Run, from each port', () => {
    for (const chapter of [0, 1, 2]) for (const seed of [11, 12, 13]) play(windwardRun, seed + 10 * chapter, 3000, chapter);
  }, 60_000);
});
