import { describe, expect, it } from 'vitest';
import { anyCalm, automated, delayFor, hurts } from './fight';
import type { ActionId, Content } from '../data/types';
import { provingGround } from '../data/proving-ground';
import { windwardRun } from '../data/windward-run';
import { cycleOf, modeOf, setAutomation, unlockAt } from './automation';
import { capOf } from './effects';
import { fixture, pagedBook, withOrder } from './fixture';
import { enqueue, newState, removeEntry, startBlock } from './queue';
import { rebirth } from './rebirth';
import { pageOf } from './rows';
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
  chapters: [withOrder(fixture.chapters[0]!, [...fixture.chapters[0]!.pages[0]!.order, 'stew']), fixture.chapters[1]!],
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
 * A food on any chip (#81), out and makeable, has its food on the way: not buried under a
 * player's order, and either an automation fill queued for it or its own order
 * on top or below nothing but its supply. Checked after every tick, it may miss
 * by one tick (the next tick's resolve queues the fill).
 */
function starving(s: GameState, content: Content): readonly ActionId[] {
  if (s.paused !== 'none' || s.dead) return [];
  return pageOf(s, content).order.filter((id) => {
    const a = content.actions[id]!;
    const food = a.producedItem !== undefined && content.items[a.producedItem]?.kind === 'food';
    if (!food || modeOf(s, content, a) === 'off' || (s.inventory[a.producedItem!] ?? 0) > 0 || startBlock(s, content, id) !== null) return false;
    const i = s.queue.findIndex((e) => e.actionId === id);
    if (i < 0) return true;
    const above = s.queue.slice(0, i);
    if (above.some((e) => e.by === 'player')) return true;
    // The first order for the row is an automation fill, or the player's own order on top or below only its supply.
    const fill = s.queue[i]!.by === 'auto';
    return !fill && !above.every((e) => leadsTo(s, e, id));
  });
}

/** Delays and stops seen, so a test can show the #74 invariant was exercised, not merely never reached. */
let backedOff = 0;
/** Deaths under an automated fight the invariant checked. */
let automatedDeaths = 0;
/** Case 3 (#74): a chip-off fight dying with nothing at all to run. The proving ground's last stand is the one page that reaches it. */
let case3Deaths = 0;
/** Page turns, closer pulls and prerequisites moved up, so the page tests show they were exercised (spec 2026-09-24-pages). */
let pageTurns = 0;
let movedUp = 0;

/**
 * A life started on `page` of `chapter`: every one-time of the chapter's earlier pages done, and the keys they
 * made in the pack, so random play reaches the rows of later pages (spec 2026-09-24-pages).
 */
function startAt(content: Content, chapter: number, page: number): Pick<GameState, 'completedOneTime' | 'inventory'> {
  const done = content.chapters[chapter]!.pages.slice(0, page).flatMap((p) => p.order).filter((id) => content.actions[id]!.isOneTime);
  const keys = done.map((id) => content.actions[id]!.producedItem).filter((i): i is string => i !== undefined && content.items[i]?.kind === 'key');
  return { completedOneTime: done, inventory: Object.fromEntries(keys.map((k) => [k, 1])) };
}

function play(content: Content, seed: number, actions: number, chapter = 0, page = 0): void {
  const rand = lcg(seed);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
  const ids = Object.keys(content.actions);
  const earned = Object.fromEntries(ids.map((id) => [id, unlockAt(content, content.actions[id]!)]));
  const start = startAt(content, chapter, page);
  let s: GameState = setPaused({ ...newState(content.roster), completionCounts: earned, chapter, ...start }, 'none');
  const settle = (x: GameState): GameState => (x.paused === 'none' && !x.dead ? resolve(x, content).state : x);
  const hungry = new Map<ActionId, number>();
  for (let n = 0; n < actions; n++) {
    const roll = rand();
    const here = pageOf(s, content).order;
    if (roll < 0.25) s = enqueue(s, content, pick(here), { front: rand() < 0.5, once: rand() < 0.3 });
    else if (roll < 0.35 && s.queue.length > 0) s = removeEntry(s, pick(s.queue).id);
    else if (roll < 0.5) { const id = pick(here); s = setAutomation(s, content, id, pick(cycleOf(content, content.actions[id]!))); }
    else if (roll < 0.53) s = setPaused(s, s.paused === 'none' ? 'player' : 'none');
    // Low health now and then, so fights reach the brink and the #74 rule is exercised, not just reachable.
    else if (roll < 0.56 && !s.dead) s = { ...s, health: Math.min(s.maxHealth, 0.02 + rand() * 3) };
    // + on a one-time of the page, then play on the page's closer: the prerequisite queued below moves up (section 4.2).
    else if (roll < 0.59) {
      const thisPage = pageOf(s, content);
      const ones = thisPage.order.filter((id) => id !== thisPage.closes && content.actions[id]!.isOneTime && !s.completedOneTime.includes(id));
      if (ones.length > 0) {
        const one = pick(ones);
        // The entries these two presses made, by id: an older order for either row is not the one being checked.
        const plus = s.nextEntryId;
        s = enqueue(s, content, one);
        const mine = s.queue.find((e) => e.id === plus && e.actionId === one && e.by === 'player');
        const press = s.nextEntryId;
        s = enqueue(s, content, thisPage.closes, { front: true });
        const closer = s.queue[0]?.id === press && s.queue[0].actionId === thisPage.closes ? s.queue[0] : undefined;
        if (mine !== undefined && closer !== undefined && s.paused === 'none' && !s.dead) {
          const after = resolve(s, content).state.queue;
          const at = after.findIndex((e) => e.id === mine.id);
          const by = after.findIndex((e) => e.id === closer.id);
          // Queued at the back, behind the press: before it now only if resolve moved it up.
          if (at >= 0 && by >= 0 && at < by) movedUp++;
        }
      }
    }
    else for (let k = Math.floor(rand() * 40); k > 0 && !s.dead; k--) {
      const before = s.paused === 'none' ? resolve(s, content).state : s;
      s = step(s, content);
      // A fight stops before it kills (#74 section 3.5): an unforced, unautomated fight ends a life only when nothing else could run.
      const top = before.queue[0];
      pageTurns += s.events.filter((e) => e.type === 'pageTurn').length;
      backedOff += s.events.filter((e) => (e.type === 'automated' && e.why === 'delay') || (e.type === 'popped' && e.reason === 'hurt')).length;
      // An automated fight fights on when automation has nothing else (the user, 2026-09-24): it kills only with no
      // delay to take. A fight queued by hand with its chip off kills only when nothing at all could run.
      const fight = top === undefined ? undefined : content.actions[top.actionId];
      if (s.dead && !s.finished && top !== undefined && top.forced !== true && hurts(fight)) {
        if (automated(before, content, fight!)) {
          automatedDeaths++;
          expect(delayFor(before, content, new Set(), fight), `seed ${seed}, action ${n}: ${top.actionId} killed with a delay to take`).toBeNull();
        // Random play has never reached this branch (a chip-off fight dying with nothing at all to run): case 3 is
        // pinned by fight.test.ts, not here. It stays as a tripwire.
        } else { case3Deaths++; expect(anyCalm(before, content), `seed ${seed}, action ${n}: ${top.actionId} killed with something else to run`).toBe(false); }
      }
      // Liveness (round five): a JIT food out and makeable is on its way by the next tick.
      const now = new Set(starving(s, content));
      for (const id of [...hungry.keys()]) if (!now.has(id)) hungry.delete(id);
      for (const id of now) {
        hungry.set(id, (hungry.get(id) ?? 0) + 1);
        expect(hungry.get(id), `seed ${seed}, action ${n}: ${id} out and not on its way: ${s.queue.map((e) => `${e.actionId}:${e.by}`).join(',')}`).toBeLessThanOrEqual(1);
      }
    }
    if (s.dead) { s = setPaused({ ...rebirth(s), chapter, ...start }, 'none'); hungry.clear(); }
    s = settle(s);

    const at = `seed ${seed}, action ${n}`;
    if (s.paused === 'none') expect(resolve(s, content).state, `${at}: settled`).toBe(s);
    // The player may pile up orders, each with its supply; automation's other orders stay few (a fill per food, one going first, the idle fill).
    const shown = s.queue.map((e) => `${e.actionId}:${e.by}${e.for === undefined ? '' : `>${e.for}`}`).join(',');
    expect(s.queue.filter((e) => e.by === 'auto' && e.for === undefined).length, `${at}: ${shown}`).toBeLessThanOrEqual(4);
    const served = s.queue.flatMap((e) => (e.for === undefined ? [] : [e.for]));
    expect(new Set(served).size, `${at}: two supplies for one order: ${shown}`).toBe(served.length);
    for (const e of s.queue) if (e.for !== undefined) expect(s.queue.some((x) => x.id === e.for), `${at}: orphan ${e.actionId}`).toBe(true);
    // Every queued order is for a row on the page this life is on (spec 2026-09-24-pages section 8).
    const onPage = pageOf(s, content).order;
    for (const e of s.queue) expect(onPage.includes(e.actionId), `${at}: ${e.actionId} is not on this page: ${shown}`).toBe(true);
    const fills = s.queue.filter((e) => e.by === 'auto' && e.left !== undefined).map((e) => e.actionId);
    expect(new Set(fills).size, `${at}: two fills for one row`).toBe(fills.length);
    // A JIT food out that could be made is never left under the player's orders (round two's starvation).
    if (s.paused === 'none') for (const id of pageOf(s, content).order) {
      const a = content.actions[id]!;
      const food = a.producedItem !== undefined && content.items[a.producedItem]?.kind === 'food';
      if (!food || modeOf(s, content, a) === 'off' || (s.inventory[a.producedItem!] ?? 0) > 0 || startBlock(s, content, id) !== null) continue;
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
  it('on the paged fixture: pages turn, and a queued prerequisite moves up for its closer', () => {
    pageTurns = 0;
    movedUp = 0;
    for (const seed of [21, 22, 23, 24]) play(pagedBook, seed, 3000);
    expect(pageTurns, 'no page ever turned: the page invariants checked nothing').toBeGreaterThan(0);
    expect(movedUp, 'no prerequisite ever moved up for its closer').toBeGreaterThan(0);
  }, 30_000);
  it('on The Windward Run, from each page of each port', () => {
    backedOff = 0;
    automatedDeaths = 0;
    windwardRun.chapters.forEach((ch, chapter) => ch.pages.forEach((_, page) => {
      for (const seed of [11, 12]) play(windwardRun, seed + 10 * chapter + 100 * page, 3000, chapter, page);
    }));
    expect(backedOff, 'the fight rule never came up: the invariant checked nothing').toBeGreaterThan(0);
    expect(automatedDeaths, 'no automated fight died: its invariant checked nothing').toBeGreaterThan(0);
  }, 60_000);
  it('on the proving ground, from each page of each chapter', () => {
    case3Deaths = 0;
    provingGround.chapters.forEach((ch, chapter) => ch.pages.forEach((_, page) => {
      for (const seed of [31, 32]) play(provingGround, seed + 10 * chapter + 100 * page, 3000, chapter, page);
    }));
    expect(case3Deaths, 'the last stand never killed with nothing calm: case 3 checked nothing').toBeGreaterThan(0);
  }, 60_000);
});
