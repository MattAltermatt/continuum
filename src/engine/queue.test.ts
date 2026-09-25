import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import type { Content } from '../data/types';
import { setAutomation, unlockAt } from './automation';
import { unitThreshold } from './costs';
import { capOf } from './effects';
import { built, fixture, withOrder } from './fixture';
import { enqueue, frontBlock, newState, removeEntry, startBlock, supplyVia, work } from './queue';
import { deathSummary, rebirth } from './rebirth';
import { setPaused, step } from './tick';
import type { AutoMode, GameEvent, GameState } from './types';

const content = fixture;
const live = (s: GameState) => setPaused(s, 'none');
/** Gives rows their chips. Takes the content, so a local variant's rows work too. */
const earned = (c: Content, s: GameState, ...ids: string[]): GameState =>
  ({ ...s, completionCounts: { ...s.completionCounts, ...Object.fromEntries(ids.map((id) => [id, unlockAt(c, c.actions[id]!)])) } });
/**
 * Steps `c` until the predicate holds (bounded), collecting every event. An
 * idle step returns its input, whose events are the previous tick's, so events
 * are collected only from a step that changed something.
 */
function runUntil(c: Content, state: GameState, done: (s: GameState) => boolean, limit = 10_000): { s: GameState; events: GameEvent[] } {
  let s = state;
  const events: GameEvent[] = [];
  for (let i = 0; i < limit && !done(s); i++) {
    const next = step(s, c);
    if (next !== s) events.push(...next.events);
    s = next;
  }
  return { s, events };
}

const fresh = () => newState(content.roster);

describe('enqueue', () => {
  it('a plain order repeats, a Shift order is single, a one-time is always single', () => {
    expect(enqueue(fresh(), content, 'salvage').queue[0]!.mode).toBe('repeat');
    expect(enqueue(fresh(), content, 'salvage', { once: true }).queue[0]!.mode).toBe('once');
    expect(enqueue(fresh(), content, 'hull').queue[0]!.mode).toBe('once');
  });
  it('ids count 0, 1, 2 and nextEntryId follows; front puts the order first', () => {
    let s = enqueue(fresh(), content, 'salvage');
    s = enqueue(s, content, 'salvage');
    s = enqueue(s, content, 'fish', { front: true, by: 'auto' });
    expect(s.queue.map((e) => [e.id, e.actionId])).toEqual([[2, 'fish'], [0, 'salvage'], [1, 'salvage']]);
    expect(s.nextEntryId).toBe(3);
  });
  it('refuses (the same object) a row this port lacks, a done one-time, and a dead state', () => {
    const s = fresh();
    expect(enqueue(s, content, 'vault')).toBe(s);
    const hullDone = { ...s, completedOneTime: ['hull'] };
    expect(enqueue(hullDone, content, 'hull')).toBe(hullDone);
    const dead = { ...s, dead: true };
    expect(enqueue(dead, content, 'salvage')).toBe(dead);
  });
});

describe('now refuses what cannot start (spec section 2.5)', () => {
  it('refuses the hull on an empty pack when nothing on the page makes scrap; + appends; automation is accepted', () => {
    // With Salvage on the page, play is accepted whatever its chip: resolve pulls it (spec 2026-09-24-pages 4.3).
    expect(enqueue(fresh(), content, 'hull', { front: true }).queue.map((e) => e.actionId)).toEqual(['hull']);
    const bare: Content = { ...content, chapters: [withOrder(content.chapters[0]!, ['fish', 'hull', 'satchel', 'gate', 'raid']), content.chapters[1]!] };
    const s = newState(bare.roster);
    expect(enqueue(s, bare, 'hull', { front: true })).toBe(s);
    expect(enqueue(s, bare, 'hull').queue.map((e) => e.actionId)).toEqual(['hull']);
    expect(enqueue(s, bare, 'hull', { front: true, by: 'auto' }).queue.map((e) => e.actionId)).toEqual(['hull']);
  });
  it('on the fixture page, + appends and automation\'s play is accepted', () => {
    const s = fresh();
    expect(enqueue(s, content, 'hull').queue.map((e) => e.actionId)).toEqual(['hull']);
    expect(enqueue(s, content, 'hull', { front: true, by: 'auto' }).queue.map((e) => e.actionId)).toEqual(['hull']);
  });
  it('startBlock says why', () => {
    const s = fresh();
    expect(startBlock(s, content, 'hull')).toEqual({ kind: 'short', item: 'scrap', amount: 8, maker: 'salvage', gap: 'unearned' });
    expect(startBlock({ ...s, inventory: { fish: 5 } }, content, 'fish')).toEqual({ kind: 'full', item: 'fish' });
    expect(startBlock({ ...s, completedOneTime: ['hull'] }, content, 'hull')).toEqual({ kind: 'done' });
    expect(startBlock(s, content, 'vault')).toEqual({ kind: 'elsewhere' });
    const jit = setAutomation(earned(content, s, 'salvage'), content, 'salvage', 'jit');
    expect(startBlock(jit, content, 'hull')).toBeNull();
  });
});

describe('removeEntry', () => {
  it('removes that entry only, and the row keeps its work', () => {
    let s = enqueue(fresh(), content, 'salvage');
    s = enqueue(s, content, 'salvage');
    s = { ...s, work: { hull: { progress: 3, costsConsumed: 3 } } };
    const after = removeEntry(s, 0);
    expect(after.queue.map((e) => e.id)).toEqual([1]);
    expect(after.work.hull).toEqual({ progress: 3, costsConsumed: 3 });
    expect(removeEntry(s, 99)).toBe(s);
  });
});

describe("the spec's walk-through (section 2.3): hull 8 scrap, cap 5", () => {
  it('salvage, hull, salvage, hull finishes the hull, and the second salvage fetches exactly 3', () => {
    let s = fresh();
    // The hulls are automation's orders, which pop short with Salvage unearned as the walk-through reads; a
    // player's hull would pull Salvage in front of it instead (spec 2026-09-24-pages section 4.3).
    for (const id of ['salvage', 'hull', 'salvage', 'hull']) s = enqueue(s, content, id, id === 'hull' ? { by: 'auto' } : {});
    s = live(s);
    let peakFirst = 0;
    let peakSecond = 0;
    let consumedAtPop = -1;
    const events: GameEvent[] = [];
    for (let i = 0; i < 10_000 && s.queue.length > 0; i++) {
      const next = step(s, content);
      if (next !== s) events.push(...next.events);
      if (next.events.some((e) => e.type === 'short' && e.actionId === 'hull') && next !== s) consumedAtPop = next.work.hull?.costsConsumed ?? -1;
      s = next;
      if (s.queue[0]?.id === 0) peakFirst = Math.max(peakFirst, s.inventory.scrap ?? 0);
      if (s.queue[0]?.id === 2) peakSecond = Math.max(peakSecond, s.inventory.scrap ?? 0);
    }
    expect(s.completedOneTime).toContain('hull');
    expect(peakFirst).toBe(balance.inventory.stackCap);
    expect(events).toContainEqual({ type: 'popped', actionId: 'salvage', reason: 'full' });
    expect(events).toContainEqual({ type: 'short', actionId: 'hull', item: 'scrap', amount: 3, maker: 'salvage', gap: 'unearned' });
    expect(consumedAtPop).toBe(5);
    expect(peakSecond).toBe(3);
    expect(events).toContainEqual({ type: 'popped', actionId: 'salvage', reason: 'enough' });
    expect(s.inventory.scrap ?? 0).toBe(0);
  });
  it('a single Salvage yields exactly one scrap and leaves', () => {
    const { s } = runUntil(content, live(enqueue(fresh(), content, 'salvage', { once: true })), (x) => x.queue.length === 0);
    expect(s.inventory.scrap).toBe(1);
  });
  it('a repeat Salvage alone fills to the cap and pops full; then time stops (decision #41)', () => {
    const { s, events } = runUntil(content, live(enqueue(fresh(), content, 'salvage')), (x) => x.queue.length === 0);
    expect(s.inventory.scrap).toBe(balance.inventory.stackCap);
    expect(events).toContainEqual({ type: 'popped', actionId: 'salvage', reason: 'full' });
    expect(step(s, content)).toBe(s);
  });
});

describe('work', () => {
  it('spends a tick, awards both ledgers and counts the tick in skillStats; bestRun follows the run level', () => {
    const s = live(enqueue(fresh(), content, 'salvage'));
    const one = step(s, content);
    expect(one.runTicks).toBe(1);
    expect(one.skills.salvage!.core.exp).toBeCloseTo(balance.skills.baseTickExp, 12);
    expect(one.skills.salvage!.run.exp).toBeCloseTo(balance.skills.baseTickExp, 12);
    expect(one.skillStats.salvage).toEqual({ ticks: 1, bestRun: 0 });
    // The raid is 30 XP of Fight: its run ledger reaches level 1 (25 XP) before it completes. The rest of its page is built, so only the raid runs.
    const raid = live(enqueue({ ...built(fresh(), 'hull', 'satchel', 'gate'), inventory: { pass: 1 } }, content, 'raid'));
    const { s: later } = runUntil(content, raid, (x) => x.skills.fight!.run.level >= 1);
    expect(later.skillStats.fight!.bestRun).toBe(1);
    expect(later.skillStats.fight!.ticks).toBe(later.runTicks);
  });
  it('a gear row multiplies the tick once it is done', () => {
    const geared: Content = { ...content, actions: { ...content.actions, satchel: { ...content.actions.satchel!, gear: { skill: 'rig', multiplier: 2 } } } };
    const base = { ...fresh(), inventory: { scrap: 5 }, queue: [{ id: 0, actionId: 'hull', mode: 'once' as const, by: 'player' as const }] };
    const plain = work(base, geared).state;
    const withGear = work({ ...base, completedOneTime: ['satchel'] }, geared).state;
    expect(withGear.skills.rig!.core.exp).toBeCloseTo(2 * plain.skills.rig!.core.exp, 12);
  });
});

describe('progress never runs past an unpaid unit (MECHANICS section 2)', () => {
  const tick = balance.skills.baseTickExp;
  // Four scrap over two ticks of XP: a unit every half tick, so a single tick crosses two thresholds.
  const quickBook: Content = {
    ...content,
    actions: { ...content.actions, quick: { id: 'quick', verb: 'rig', noun: 'a quick thing', expCost: 2 * tick, itemCosts: [{ item: 'scrap', amount: 4 }], isOneTime: true } },
    chapters: [withOrder(content.chapters[0]!, [...content.chapters[0]!.pages[0]!.order, 'quick']), content.chapters[1]!],
  };
  const quick = quickBook.actions.quick!;
  const onQuick = (scrap: number): GameState => ({ ...fresh(), inventory: { scrap }, queue: [{ id: 0, actionId: 'quick', mode: 'once', by: 'player' }] });
  /** work() `n` times on `c`, collecting every event. */
  const workN = (c: Content, state: GameState, n: number): { s: GameState; events: GameEvent[] } => {
    let s = state;
    const events: GameEvent[] = [];
    for (let i = 0; i < n; i++) {
      const r = work(s, c);
      events.push(...r.events);
      s = r.state;
    }
    return { s, events };
  };
  it('a tick that crosses two thresholds pays both, and the row completes only once every unit is paid', () => {
    const one = workN(quickBook, onQuick(4), 1);
    // The unit to begin, then the two whose thresholds the first tick crossed.
    expect(one.s.work.quick).toEqual({ progress: tick, costsConsumed: 3 });
    expect(one.s.inventory.scrap).toBe(1);
    expect(one.events.some((e) => e.type === 'completed')).toBe(false);
    const two = workN(quickBook, one.s, 1);
    expect(two.events).toContainEqual({ type: 'completed', actionId: 'quick', oneTime: true });
    expect(two.s.inventory.scrap).toBe(0);
    expect(two.s.completedOneTime).toEqual(['quick']);
  });
  it('a tick that crosses an unpayable threshold clamps progress to it, and both ledgers earn only the progress made', () => {
    const { s, events } = workN(quickBook, onQuick(1), 1);
    expect(s.work.quick).toEqual({ progress: unitThreshold(quick, 1), costsConsumed: 1 });
    expect(s.inventory.scrap).toBe(0);
    // Half a tick of progress before the clamp, not the tick's whole gain: XP is what was made.
    expect(unitThreshold(quick, 1)).toBeLessThan(tick);
    expect(s.skills.rig!.core.exp).toBeCloseTo(unitThreshold(quick, 1), 12);
    expect(s.skills.rig!.run.exp).toBeCloseTo(unitThreshold(quick, 1), 12);
    expect(events).toEqual([]);
  });
  it('the completing tick cannot pass the last unpaid unit: it stops below expCost instead of completing', () => {
    const { s, events } = workN(quickBook, onQuick(3), 2);
    expect(events.some((e) => e.type === 'completed')).toBe(false);
    expect(s.completedOneTime).toEqual([]);
    expect(s.work.quick).toEqual({ progress: unitThreshold(quick, 3), costsConsumed: 3 });
    expect(s.work.quick!.progress).toBeLessThan(quick.expCost);
    expect(s.skills.rig!.core.exp).toBeCloseTo(unitThreshold(quick, 3), 12);
  });
  it('the hull stalls at its unpaid unit\'s threshold, keeps its progress there, and XP is the progress made, not the ticks spent', () => {
    const hull = content.actions.hull!;
    const onHull: GameState = { ...fresh(), inventory: { scrap: 2 }, queue: [{ id: 0, actionId: 'hull', mode: 'once', by: 'player' }] };
    // Twice the ticks it takes to reach the unpaid unit: the rest are spent owing it.
    const { s } = workN(content, onHull, 2 * (Math.floor(unitThreshold(hull, 2) / tick) + 1));
    expect(s.work.hull).toEqual({ progress: unitThreshold(hull, 2), costsConsumed: 2 });
    expect(s.inventory.scrap).toBe(0);
    expect(s.skills.rig!.core.exp).toBeCloseTo(s.work.hull!.progress, 9);
    expect(s.skills.rig!.run.exp).toBeCloseTo(s.work.hull!.progress, 9);
  });
});

describe('completion', () => {
  const on = (s: GameState, id: string, mode: 'repeat' | 'once' = 'repeat'): GameState => ({ ...s, queue: [{ id: 0, actionId: id, mode, by: 'player' }], work: { [id]: { progress: content.actions[id]!.expCost - 0.05, costsConsumed: 0 } } });
  it('counts up completionCounts, and unlocked fires on the completion that reaches unlockAt, not the next', () => {
    const before = { ...fresh(), completionCounts: { salvage: unlockAt(content, content.actions.salvage!) - 1 } };
    const first = work(on(before, 'salvage'), content);
    expect(first.state.completionCounts.salvage).toBe(unlockAt(content, content.actions.salvage!));
    expect(first.events).toContainEqual({ type: 'unlocked', actionId: 'salvage' });
    const second = work(on(first.state, 'salvage'), content);
    expect(second.events.some((e) => e.type === 'unlocked')).toBe(false);
  });
  it('a one-time earns its chip on the completion that reaches its own threshold, through a once entry', () => {
    const gate = content.actions.gate!;
    expect(unlockAt(content, gate)).toBe(balance.automation.unlockOneTime);
    const before = { ...fresh(), completionCounts: { gate: unlockAt(content, gate) - 1 } };
    const after = work(on(before, 'gate', 'once'), content);
    expect(after.state.completedOneTime).toEqual(['gate']);
    expect(after.state.completionCounts.gate).toBe(unlockAt(content, gate));
    expect(after.events).toContainEqual({ type: 'unlocked', actionId: 'gate' });
  });
  it("the port's event counts its completion on the cast-off path, and the book's finish on the finishing path", () => {
    const raid = work(on({ ...fresh(), inventory: { pass: 1 } }, 'raid', 'once'), content);
    expect(raid.events).toContainEqual({ type: 'castOff', chapter: 1 });
    expect(raid.state.completionCounts.raid).toBe(1);
    const vault = work(on({ ...fresh(), chapter: 1, completionCounts: { vault: 2 } }, 'vault', 'once'), content);
    expect(vault.state.finished).toBe(true);
    expect(vault.state.completionCounts.vault).toBe(3);
  });
  it('a product joins acquired on its first completion, once, however many follow', () => {
    const first = work(on(fresh(), 'salvage'), content).state;
    expect(first.acquired).toEqual(['scrap']);
    const second = work(on(first, 'salvage'), content).state;
    expect(second.inventory.scrap).toBe(2);
    expect(second.acquired).toEqual(['scrap']);
  });
  it('a one-time lands in completedOneTime and leaves; a once entry leaves; a repeat producer stays', () => {
    const gate = work({ ...on(fresh(), 'gate'), queue: [{ id: 0, actionId: 'gate', mode: 'once', by: 'player' }, { id: 1, actionId: 'fish', mode: 'repeat', by: 'player' }] }, content).state;
    expect(gate.completedOneTime).toEqual(['gate']);
    expect(gate.queue.map((e) => e.id)).toEqual([1]);
    expect(gate.inventory.pass).toBe(1);
    expect(gate.acquired).toEqual(['pass']);
    expect(work(on(fresh(), 'fish', 'once'), content).state.queue).toEqual([]);
    expect(work(on(fresh(), 'fish'), content).state.queue).toHaveLength(1);
  });
  it('a repeat consumer stays in the queue after a completion', () => {
    const polish: Content = {
      ...content,
      actions: { ...content.actions, polish: { id: 'polish', verb: 'rig', noun: 'brass', expCost: 1, itemCosts: [{ item: 'scrap', amount: 1 }], isOneTime: false } },
      chapters: [withOrder(content.chapters[0]!, [...content.chapters[0]!.pages[0]!.order, 'polish']), content.chapters[1]!],
    };
    const s = { ...fresh(), inventory: { scrap: 2 }, queue: [{ id: 0, actionId: 'polish', mode: 'repeat' as const, by: 'player' as const }], work: { polish: { progress: 0.95, costsConsumed: 1 } } };
    const after = work(s, polish);
    expect(after.events).toContainEqual({ type: 'completed', actionId: 'polish', oneTime: false });
    expect(after.state.queue).toHaveLength(1);
  });
  it('the capacity row raises capOf to 10 for the rest of the life', () => {
    const s = { ...fresh(), inventory: { scrap: 1 }, queue: [{ id: 0, actionId: 'satchel', mode: 'once' as const, by: 'player' as const }], work: { satchel: { progress: 1.95, costsConsumed: 1 } } };
    const after = work(s, content).state;
    expect(after.completedOneTime).toContain('satchel');
    expect(capOf(after, content, 'scrap')).toBe(balance.inventory.stackCap + 5);
    expect(capOf(after, content, 'fish')).toBe(10);
  });
});

describe('supplyVia (section 2.4)', () => {
  const auto = (c: Content, s: GameState, modes: Record<string, AutoMode>): GameState =>
    ({ ...earned(c, s, ...Object.keys(modes)), automation: { ...s.automation, ...modes } });
  const seen = (id: string) => new Set([id]);
  it('none for an item nothing here makes; unearned; off once earned; ok with the mode once set', () => {
    expect(supplyVia(fresh(), content, 'eel', seen('x'))).toEqual({ kind: 'gap', maker: null, gap: 'none' });
    expect(supplyVia(fresh(), content, 'scrap', seen('hull'))).toEqual({ kind: 'gap', maker: 'salvage', gap: 'unearned' });
    const e = earned(content, fresh(), 'salvage');
    expect(supplyVia(e, content, 'scrap', seen('hull'))).toEqual({ kind: 'gap', maker: 'salvage', gap: 'off' });
    expect(supplyVia(setAutomation(e, content, 'salvage', 'mid'), content, 'scrap', seen('hull'))).toEqual({ kind: 'ok', maker: 'salvage', mode: 'mid' });
  });
  const withPress = (costs: Content['actions'][string]['itemCosts']): Content => ({
    ...content,
    actions: { ...content.actions, press: { id: 'press', verb: 'salvage', noun: 'a press', expCost: 1, producedItem: 'scrap', producedAmount: 1, itemCosts: costs, isOneTime: false } },
    chapters: [withOrder(content.chapters[0]!, [...content.chapters[0]!.pages[0]!.order, 'press']), content.chapters[1]!],
  });
  it('JIT goes before a priority when two rows make the item', () => {
    const two = withPress([]);
    const s = auto(two, fresh(), { salvage: 'high', press: 'jit' });
    expect(supplyVia(s, two, 'scrap', seen('hull'))).toEqual({ kind: 'ok', maker: 'press', mode: 'jit' });
  });
  it('with the JIT maker blocked and a low one free, ok names the free one', () => {
    const two = withPress([{ item: 'pass', amount: 1 }]);   // no pass, and the gate is unearned
    const s = auto(two, fresh(), { salvage: 'low', press: 'jit' });
    expect(supplyVia(s, two, 'scrap', seen('hull'))).toEqual({ kind: 'ok', maker: 'salvage', mode: 'low' });
  });
  it('a blocked chain two makers deep names the direct maker as blocked and the deepest maker and its gap as cause', () => {
    // scrap <- press (JIT) costs oil <- well (not yet earned); Salvage unearned
    const two = withPress([{ item: 'oil', amount: 1 }]);
    const deep: Content = {
      ...two,
      items: { ...two.items, oil: { id: 'oil', name: 'oil', kind: 'material' } },
      actions: { ...two.actions, well: { id: 'well', verb: 'salvage', noun: 'a well', expCost: 1, producedItem: 'oil', producedAmount: 1, itemCosts: [], isOneTime: false } },
      chapters: [withOrder(two.chapters[0]!, [...two.chapters[0]!.pages[0]!.order, 'well']), two.chapters[1]!],
    };
    const s = auto(deep, newState(deep.roster), { press: 'jit' });
    expect(supplyVia(s, deep, 'scrap', seen('hull'))).toEqual({ kind: 'gap', maker: 'press', gap: 'blocked', cause: { item: 'oil', maker: 'well', gap: 'unearned' } });
    expect(startBlock(s, deep, 'hull')).toEqual({ kind: 'short', item: 'scrap', amount: 8, maker: 'press', gap: 'blocked', cause: { item: 'oil', maker: 'well', gap: 'unearned' } });
  });
  it('a chain three deep carries the deepest cause all the way up', () => {
    // scrap <- press (JIT) costs oil <- well (JIT) costs ore <- mine (not yet earned); Salvage unearned
    const two = withPress([{ item: 'oil', amount: 1 }]);
    const deep: Content = {
      ...two,
      items: { ...two.items, oil: { id: 'oil', name: 'oil', kind: 'material' }, ore: { id: 'ore', name: 'ore', kind: 'material' } },
      actions: {
        ...two.actions,
        well: { id: 'well', verb: 'salvage', noun: 'a well', expCost: 1, producedItem: 'oil', producedAmount: 1, itemCosts: [{ item: 'ore', amount: 1 }], isOneTime: false },
        mine: { id: 'mine', verb: 'salvage', noun: 'a mine', expCost: 1, producedItem: 'ore', producedAmount: 1, itemCosts: [], isOneTime: false },
      },
      chapters: [withOrder(two.chapters[0]!, [...two.chapters[0]!.pages[0]!.order, 'well', 'mine']), two.chapters[1]!],
    };
    const s = auto(deep, newState(deep.roster), { press: 'jit', well: 'jit' });
    // Deep: the press itself lacks oil, not ore.
    expect(startBlock(s, deep, 'hull')).toEqual({ kind: 'short', item: 'scrap', amount: 8, maker: 'press', gap: 'blocked', cause: { item: 'ore', maker: 'mine', gap: 'unearned', deep: true } });
  });
  it('in a cycle, the maker is blocked with no cause', () => {
    // scrap <- press (JIT) costs scrap: the press is already on its own chain.
    const loop = withPress([{ item: 'scrap', amount: 1 }]);
    const s = auto(loop, newState(loop.roster), { press: 'jit' });
    expect(supplyVia(s, loop, 'scrap', seen('hull'))).toEqual({ kind: 'gap', maker: 'press', gap: 'blocked' });
    expect(startBlock(s, loop, 'hull')).toEqual({ kind: 'short', item: 'scrap', amount: 8, maker: 'press', gap: 'blocked' });
  });
});

describe('frontBlock (section 2.5)', () => {
  it('a repeating Salvage at 5 scrap with nothing below needing scrap is full', () => {
    expect(frontBlock({ ...fresh(), inventory: { scrap: 5 } }, content, 'salvage')).toEqual({ kind: 'full', item: 'scrap' });
  });
  it('with the satchel done (cap 10), 6 scrap and a queued row owing 6, it is enough, and now returns the same state; once, null', () => {
    const base: GameState = { ...fresh(), completedOneTime: ['satchel'], inventory: { scrap: 6 } };
    const s = { ...enqueue(base, content, 'hull'), work: { hull: { progress: 2, costsConsumed: 2 } } };
    expect(frontBlock(s, content, 'salvage')).toEqual({ kind: 'enough', item: 'scrap' });
    expect(enqueue(s, content, 'salvage', { front: true })).toBe(s);
    expect(frontBlock(s, content, 'salvage', true)).toBeNull();
    expect(enqueue(s, content, 'salvage', { front: true, once: true }).queue[0]!.actionId).toBe('salvage');
  });
  it('Shift+now on that met look-ahead still runs exactly once: one completion, one more scrap, then the hull', () => {
    const base: GameState = { ...fresh(), completedOneTime: ['satchel'], inventory: { scrap: 6 } };
    const s = { ...enqueue(base, content, 'hull'), work: { hull: { progress: 2, costsConsumed: 2 } } };
    expect(capOf(s, content, 'scrap')).toBeGreaterThan(s.inventory.scrap!);
    const id = s.nextEntryId;
    const once = live(enqueue(s, content, 'salvage', { front: true, once: true }));
    expect(once.queue[0]!.id).toBe(id);
    const { s: after, events } = runUntil(content, once, (x) => x.queue[0]?.id !== id);
    expect(events.some((e) => e.type === 'popped' && e.actionId === 'salvage')).toBe(false);
    expect(after.completionCounts.salvage ?? 0).toBe((s.completionCounts.salvage ?? 0) + 1);
    expect(after.inventory.scrap).toBe(s.inventory.scrap! + content.actions.salvage!.producedAmount!);
    expect(after.queue.map((e) => e.actionId)).toEqual(['hull']);
  });
});

describe('casting off (section 4)', () => {
  it("the port's event casts off: next port, non-food dumped, queue kept to the new rows, effects and a row's work stay", () => {
    const s: GameState = live({
      ...fresh(),
      inventory: { scrap: 3, pass: 1, fish: 2 },
      // The raid closes its page (spec 2026-09-24-pages): the rest of the page is built.
      completedOneTime: ['satchel', 'hull', 'gate'],
      decayMultiplier: 0.5,
      // Salvage half-worked: a row that is not done keeps its work across the cast-off.
      work: { salvage: { progress: 0.5, costsConsumed: 0 }, raid: { progress: 29.95, costsConsumed: 0 } },
      queue: [{ id: 0, actionId: 'raid', mode: 'once', by: 'player' }, { id: 1, actionId: 'salvage', mode: 'repeat', by: 'player' }, { id: 2, actionId: 'fish', mode: 'repeat', by: 'player' }],
      nextEntryId: 3,
      provisioned: ['fish'],
    });
    const after = step(s, content);
    expect(after.chapter).toBe(1);
    expect(after.provisioned).toEqual([]);
    expect(after.events).toContainEqual({ type: 'castOff', chapter: 1 });
    expect(after.inventory.scrap).toBeUndefined();
    expect(after.inventory.pass).toBeUndefined();
    expect(after.inventory.fish).toBe(2);
    expect(after.queue).toEqual([]);
    expect(after.work.salvage).toEqual({ progress: 0.5, costsConsumed: 0 });
    expect(capOf(after, content, 'eel')).toBe(10);
    expect(after.decayMultiplier).toBe(0.5);
    expect(enqueue(after, content, 'eels').queue.map((e) => e.actionId)).toEqual(['eels']);
    expect(enqueue(after, content, 'salvage')).toBe(after);
  });
  it("the last port's event finishes the book and ends the life", () => {
    const s: GameState = live({ ...fresh(), chapter: 1, runTicks: 500, queue: [{ id: 0, actionId: 'vault', mode: 'once', by: 'player' }], work: { vault: { progress: 0.95, costsConsumed: 0 } }, automation: { fish: 'jit' }, skills: { ...fresh().skills, rig: { core: { level: 2, exp: 1 }, run: { level: 1, exp: 0 } } } });
    const after = step(s, content);
    expect(after.dead).toBe(true);
    expect(after.finished).toBe(true);
    expect(after.paused).toBe('system');
    expect(after.events).toContainEqual({ type: 'finished', runTicks: 501 });
    expect(step(after, content)).toBe(after);
    const next = rebirth(after);
    expect(next.chapter).toBe(0);
    expect(next.finishes).toBe(1);
    expect(next.life).toBe(after.life + 1);
    expect(next.automation).toEqual({ fish: 'jit' });
    expect(next.skills.rig!.core).toEqual(after.skills.rig!.core);
    expect(deathSummary(after, content)).toMatchObject({ finished: true, finishes: 1, chapter: 1 });
  });
});
