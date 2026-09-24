import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import type { Content } from '../data/types';
import { validateBook } from '../data/validate';
import { setAutomation, unlockAt } from './automation';
import { built, fixture, withOrder } from './fixture';
import { enqueue, newState, removeEntry, startBlock } from './queue';
import { resolve, topWorks } from './resolve';
import { setPaused, step } from './tick';
import type { AutoMode, GameEvent, GameState, QueueEntry } from './types';

const content = fixture;
const live = (s: GameState) => setPaused(s, 'none');
/** Gives rows their chips. Takes the content, so a local variant's rows work too. */
const earned = (c: Content, s: GameState, ...ids: string[]): GameState =>
  ({ ...s, completionCounts: { ...s.completionCounts, ...Object.fromEntries(ids.map((id) => [id, unlockAt(c.actions[id]!)])) } });
/** Earns the rows and sets their modes. */
const withModes = (s: GameState, c: Content, modes: Record<string, AutoMode>): GameState =>
  ({ ...earned(c, s, ...Object.keys(modes)), automation: { ...s.automation, ...modes } });
/**
 * Steps `c` until the predicate holds (bounded), collecting every event. An
 * idle step returns its input, whose events are the previous tick's, so events
 * are collected only from a step that changed something. Also keeps each new
 * state, for tests that inspect the queue along the way.
 */
function runUntil(c: Content, state: GameState, done: (s: GameState) => boolean, limit = 10_000): { s: GameState; events: GameEvent[]; states: GameState[] } {
  let s = state;
  const events: GameEvent[] = [];
  const states: GameState[] = [];
  for (let i = 0; i < limit && !done(s); i++) {
    const next = step(s, c);
    if (next !== s) { events.push(...next.events); states.push(next); }
    s = next;
  }
  return { s, events, states };
}
const fresh = () => newState(content.roster);
/**
 * The raid closes its page and waits on the page's other one-time rows (spec
 * 2026-09-24-pages section 4.2). A test about the raid, not about its page,
 * starts past them.
 */
const ready = () => built(fresh(), 'hull', 'satchel', 'gate');
/**
 * Chapter I with the raid's page short of the satchel, whose capacity bonus,
 * once built, would move the food cap the fill and provision tests count to.
 */
const unpacked: Content = { ...content, chapters: [withOrder(content.chapters[0]!, ['fish', 'salvage', 'hull', 'gate', 'raid']), content.chapters[1]!] };
/** Past the raid's page in `unpacked`. */
const unpackedReady = () => built(fresh(), 'hull', 'gate');
/**
 * Chapter I with the raid on a page it does not close: a test about how the
 * raid's pass is supplied reaches the supply path, which a closer's page
 * prerequisite would otherwise go around.
 */
const unclosed: Content = { ...content, chapters: [withOrder(content.chapters[0]!, ['fish', 'salvage', 'hull', 'gate', 'raid', 'satchel'], 'satchel'), content.chapters[1]!] };
const automated = (events: GameEvent[]) => events.filter((e): e is Extract<GameEvent, { type: 'automated' }> => e.type === 'automated');
const entry = (id: number, actionId: string, mode: QueueEntry['mode'] = 'repeat'): QueueEntry => ({ id, actionId, mode, by: 'player' });

describe('the engine fixture', () => {
  it('is a valid book', () => {
    expect(validateBook({ ...fixture, id: 'f', name: 'F', version: 1, length: { hours: 1 } })).toEqual([]);
  });
});

describe('JIT supply (section 3.2)', () => {
  it('queues Salvage in front of a short hull, exactly as needed, and the hull completes', () => {
    const s = live(enqueue(withModes(fresh(), content, { salvage: 'jit' }), content, 'hull'));
    const { s: end, events, states } = runUntil(content, s, (x) => x.completedOneTime.includes('hull'));
    expect(end.completedOneTime).toContain('hull');
    expect(events.some((e) => e.type === 'short')).toBe(false);
    expect(automated(events).filter((e) => e.actionId === 'salvage' && e.why === 'supply')).toHaveLength(2);
    expect(end.inventory.scrap ?? 0).toBe(0);
    for (const st of states) for (const e of st.queue) if (e.actionId === 'salvage') expect(e.by).toBe('auto');
  });
});

describe('off, unearned, none (section 2.4)', () => {
  it('a hull whose maker is off pops with gap off; unearned with gap unearned', () => {
    // Automation's order: a player's order pulls its maker whatever the chip (spec 2026-09-24-pages section 4.3);
    // automation's still goes through the chips, and this is that path.
    const off = step(live(enqueue(withModes(fresh(), content, { salvage: 'off' }), content, 'hull', { by: 'auto' })), content);
    expect(off.events).toContainEqual({ type: 'short', actionId: 'hull', item: 'scrap', amount: 8, maker: 'salvage', gap: 'off' });
    const unearned = step(live(enqueue(fresh(), content, 'hull', { by: 'auto' })), content);
    expect(unearned.events).toContainEqual({ type: 'short', actionId: 'hull', item: 'scrap', amount: 8, maker: 'salvage', gap: 'unearned' });
  });
  it('a row costing an item nothing makes pops with gap none and no maker', () => {
    const forge: Content = {
      ...content,
      items: { ...content.items, ore: { id: 'ore', name: 'ore', kind: 'material' } },
      actions: { ...content.actions, forge: { id: 'forge', verb: 'rig', noun: 'a forge', expCost: 1, itemCosts: [{ item: 'ore', amount: 2 }], isOneTime: true } },
      chapters: [withOrder(content.chapters[0]!, [...content.chapters[0]!.pages[0]!.order, 'forge']), content.chapters[1]!],
    };
    const s = live(enqueue(newState(forge.roster), forge, 'forge'));
    expect(step(s, forge).events).toContainEqual({ type: 'short', actionId: 'forge', item: 'ore', amount: 2, maker: null, gap: 'none' });
  });
});

describe("the user's priority example (section 3.3)", () => {
  it('Fish on high fills first, then Salvage on mid supplies the hull', () => {
    // The hull is automation's order: the example is about what the chips order (a player's hull pulls Salvage
    // directly, whatever the ranks, spec 2026-09-24-pages section 4.3).
    const base = { ...withModes(fresh(), content, { fish: 'high', salvage: 'mid' }), inventory: { fish: 3 } };
    const { s, events } = runUntil(content, live(enqueue(base, content, 'hull', { by: 'auto' })), (x) => x.completedOneTime.includes('hull'));
    const auto = automated(events);
    expect(auto[0]).toEqual({ type: 'automated', actionId: 'fish', why: 'supply' });
    expect(events).toContainEqual({ type: 'popped', actionId: 'fish', reason: 'full' });
    expect(auto[1]).toEqual({ type: 'automated', actionId: 'salvage', why: 'supply' });
    expect(s.completedOneTime).toContain('hull');
  });
  it('with Salvage on JIT, Salvage goes first', () => {
    const base = { ...withModes(fresh(), content, { fish: 'high', salvage: 'jit' }), inventory: { fish: 3 } };
    const first = step(live(enqueue(base, content, 'hull')), content);
    expect(automated([...first.events])[0]).toEqual({ type: 'automated', actionId: 'salvage', why: 'supply' });
  });
});

describe('JIT food (section 3.2)', () => {
  it('food at zero goes in on top at once; the raid keeps its work; one order only; the raid resumes where it was', () => {
    const base: GameState = { ...withModes(unpackedReady(), unpacked, { fish: 'jit' }), inventory: { pass: 1 }, queue: [entry(0, 'raid', 'once')], nextEntryId: 1, work: { raid: { progress: 5, costsConsumed: 0 } } };
    const first = step(live(base), unpacked);
    expect(first.events[0]).toEqual({ type: 'automated', actionId: 'fish', why: 'food' });
    expect(first.queue.map((e) => e.actionId)).toEqual(['fish', 'raid']);
    expect(first.queue[0]).toMatchObject({ by: 'auto', mode: 'repeat', left: 5 });
    expect(first.work.raid).toEqual({ progress: 5, costsConsumed: 0 });
    let s = first;
    while ((s.inventory.fish ?? 0) === 0) {
      expect(s.queue).toHaveLength(2);
      s = step(s, unpacked);
    }
    // The fill leaves inside work() on its fifth completion (`left`): the raid is back on top at exactly 5.
    const { s: filled } = runUntil(unpacked, s, (x) => x.queue[0]?.actionId === 'raid');
    expect(filled.inventory.fish).toBe(balance.inventory.stackCap);
    expect(filled.work.raid!.progress).toBe(5);
    expect(step(filled, unpacked).work.raid!.progress).toBeCloseTo(5 + balance.skills.baseTickExp, 12);
  });
});

describe('a food fill ends even when eating takes fish during it (MECHANICS section 6 targetCount)', () => {
  it('a slow local fish, eaten as it lands: exactly left completions, then the row behind it runs', () => {
    // 6 XP is 61 ticks at level 0, longer than the 50-tick cooldown: every fish is eaten the tick it lands.
    const slow: Content = { ...unpacked, actions: { ...unpacked.actions, fish: { ...unpacked.actions.fish!, expCost: 6 } } };
    const base: GameState = { ...withModes(built(newState(slow.roster), 'hull', 'gate'), slow, { fish: 'jit' }), health: 20, inventory: { pass: 1 }, queue: [entry(0, 'raid', 'once')], nextEntryId: 1, work: { raid: { progress: 5, costsConsumed: 0 } } };
    let s = step(live(base), slow);
    const fillId = s.queue[0]!.id;
    expect(s.queue[0]).toMatchObject({ actionId: 'fish', by: 'auto', left: 5 });
    let fished = 0;
    let peak = 0;
    for (let i = 0; i < 10_000 && s.queue.some((e) => e.id === fillId); i++) {
      const next = step(s, slow);
      if (next !== s) fished += next.events.filter((e) => e.type === 'completed' && e.actionId === 'fish').length;
      s = next;
      peak = Math.max(peak, s.inventory.fish ?? 0);
    }
    expect(s.dead).toBe(false);
    expect(fished).toBe(5);
    expect(peak).toBeLessThanOrEqual(1);   // each is eaten the tick after it lands: the fill never gets ahead
    const before = s.work.raid!.progress;
    const next = step(s, slow);
    expect(next.queue[0]!.actionId).toBe('raid');
    expect(next.work.raid!.progress).toBeGreaterThan(before);
  });
});

describe('fillLeft counts what is on hand', () => {
  it('with 2 fish and a cap of 5, the fill is queued with left 3', () => {
    const base: GameState = { ...withModes(unpackedReady(), unpacked, { fish: 'jit' }), inventory: { pass: 1, fish: 2 }, queue: [entry(0, 'raid', 'once')], nextEntryId: 1 };
    const first = step(live(base), unpacked);
    expect(first.events[0]).toEqual({ type: 'automated', actionId: 'fish', why: 'provision' });
    expect(first.queue[0]).toMatchObject({ actionId: 'fish', by: 'auto', left: balance.inventory.stackCap - 2 });
  });
});

describe('provisions happen once per departure', () => {
  it('eating outpaces the provision: one provision event, then the raid starts below the cap', () => {
    const base: GameState = { ...withModes(unpackedReady(), unpacked, { fish: 'jit' }), health: 20, inventory: { pass: 1, fish: 2 }, queue: [entry(0, 'raid', 'once')], nextEntryId: 1 };
    const { s, events } = runUntil(unpacked, live(base), (x) => (x.work.raid?.progress ?? 0) > 0);
    expect(automated(events).filter((e) => e.why === 'provision')).toHaveLength(1);
    expect(s.provisioned).toEqual(['fish']);
    expect(s.inventory.fish ?? 0).toBeLessThan(balance.inventory.stackCap);
    expect(s.dead).toBe(false);
    // Task 4: casting off clears it, so the next port's departure provisions again.
    const { s: away } = runUntil(unpacked, s, (x) => x.chapter === 1 || x.dead);
    expect(away.dead).toBe(false);
    expect(away.chapter).toBe(1);
    expect(away.provisioned).toEqual([]);
  });
});

describe('an unsupplied JIT food stays idle', () => {
  it('a JIT food row whose cost nothing supplies is never queued: step returns the same object', () => {
    const bakery: Content = {
      ...content,
      items: { ...content.items, bread: { id: 'bread', name: 'bread', kind: 'food', healPerUnit: 6 } },
      actions: { ...content.actions, bake: { id: 'bake', verb: 'rig', noun: 'bread', expCost: 1, producedItem: 'bread', producedAmount: 1, itemCosts: [{ item: 'scrap', amount: 1 }], isOneTime: false } },
      chapters: [withOrder(content.chapters[0]!, [...content.chapters[0]!.pages[0]!.order, 'bake']), content.chapters[1]!],
    };
    const s = live(withModes(newState(bakery.roster), bakery, { bake: 'jit' }));
    expect(step(s, bakery)).toBe(s);
  });
});

describe("an auto food entry under a player's now is not doubled", () => {
  it('with an auto Fish entry at index 0 and no fish, now Salvage, step: still exactly one Fish entry', () => {
    const base: GameState = { ...withModes(fresh(), content, { fish: 'jit' }), queue: [{ id: 0, actionId: 'fish', mode: 'repeat', by: 'auto', left: 5 }], nextEntryId: 1 };
    const pressed = enqueue(base, content, 'salvage', { front: true });
    expect(pressed.queue.map((e) => e.actionId)).toEqual(['salvage', 'fish']);
    const next = step(live(pressed), content);
    expect(next.queue.filter((e) => e.actionId === 'fish')).toHaveLength(1);
  });
});

describe('a higher row already queued is not queued again', () => {
  it('Fish on high queued below the hull, Salvage on mid: supplying the hull queues Salvage, not a second Fish', () => {
    // A fish in the pack, so Fish is a producer here and not food at zero (which goes to the top, #81).
    const base: GameState = { ...withModes(fresh(), content, { fish: 'high', salvage: 'mid' }), inventory: { fish: 1 }, queue: [{ ...entry(0, 'hull', 'once'), by: 'auto' }, entry(1, 'fish')], nextEntryId: 2 };
    const next = step(live(base), content);
    expect(automated([...next.events])[0]).toEqual({ type: 'automated', actionId: 'salvage', why: 'supply' });
    expect(next.queue.filter((e) => e.actionId === 'fish')).toHaveLength(1);
  });
});

describe('a supply step never takes a one-time', () => {
  it('the gate (a one-time that makes something) earned on top, Salvage on mid, the hull queued: Salvage supplies the hull; nothing automated names the gate', () => {
    const base: GameState = withModes(fresh(), content, { gate: 'top', salvage: 'mid' });
    const { s, events } = runUntil(content, live(enqueue(base, content, 'hull')), (x) => x.completedOneTime.includes('hull'));
    expect(s.completedOneTime).toContain('hull');
    expect(automated(events)[0]).toEqual({ type: 'automated', actionId: 'salvage', why: 'supply' });
    expect(automated(events).some((e) => e.actionId === 'gate' && e.why === 'supply')).toBe(false);
  });
  it('nor the big fight: the raid earned on top with the pass on hand, Salvage on mid, the hull queued', () => {
    const base: GameState = { ...withModes(fresh(), content, { raid: 'top', salvage: 'mid' }), inventory: { pass: 1 } };
    const { events } = runUntil(content, live(enqueue(base, content, 'hull')), (x) => x.completedOneTime.includes('hull'));
    expect(automated(events).some((e) => e.actionId === 'raid' && e.why === 'supply')).toBe(false);
  });
});

describe('provisions before casting off (section 3.2)', () => {
  it('the unstarted event waits while JIT food fills to the cap, then runs', () => {
    const base: GameState = { ...withModes(unpackedReady(), unpacked, { fish: 'jit' }), inventory: { pass: 1, fish: 2 }, queue: [entry(0, 'raid', 'once')], nextEntryId: 1 };
    const first = step(live(base), unpacked);
    expect(first.events[0]).toEqual({ type: 'automated', actionId: 'fish', why: 'provision' });
    const { s } = runUntil(unpacked, first, (x) => x.queue[0]?.actionId === 'raid');
    expect(s.inventory.fish).toBe(balance.inventory.stackCap);
    expect(step(s, unpacked).work.raid!.progress).toBeGreaterThan(0);
  });
  it('a started event is not provisioned for', () => {
    const base: GameState = { ...withModes(ready(), content, { fish: 'jit' }), inventory: { pass: 1, fish: 4 }, queue: [entry(0, 'raid', 'once')], nextEntryId: 1, work: { raid: { progress: 1, costsConsumed: 0 } } };
    const next = step(live(base), content);
    expect(automated([...next.events])).toEqual([]);
    expect(next.work.raid!.progress).toBeGreaterThan(1);
  });
});

describe('provisioning waits for the event\'s own supply', () => {
  it('the raid short its pass, the gate on JIT: the gate is supplied first, the fish provisioned after, then the raid runs', () => {
    // The raid must be the departure to be provisioned for, so it closes its page; a one-time gate on that page
    // would come as a page prerequisite, and a player's raid would pull it whatever its chip (spec 2026-09-24-pages
    // sections 4.2, 4.3). A repeatable gate and automation's own raid leave the JIT supply as the only way the pass comes.
    const open: Content = { ...unpacked, actions: { ...unpacked.actions, gate: { ...unpacked.actions.gate!, isOneTime: false } } };
    const base: GameState = { ...withModes(built(fresh(), 'hull'), open, { fish: 'jit', gate: 'jit' }), inventory: { fish: 2 }, queue: [{ id: 0, actionId: 'raid', mode: 'once', by: 'auto' }], nextEntryId: 1 };
    const { s, events } = runUntil(open, live(base), (x) => (x.work.raid?.progress ?? 0) > 0);
    expect(automated(events).map((e) => `${e.why}:${e.actionId}`)).toEqual(['supply:gate', 'provision:fish']);
    expect(s.inventory.fish).toBe(balance.inventory.stackCap);
  });
});

describe('a food fill the player buried under a play press (code panel round two)', () => {
  it('food out: the buried fill comes back to the top at once', () => {
    const filling: GameState = { ...withModes(fresh(), content, { fish: 'jit' }), queue: [{ id: 0, actionId: 'fish', mode: 'repeat', by: 'auto', left: 5 }], nextEntryId: 1 };
    const pressed = enqueue(filling, content, 'salvage', { front: true });
    expect(pressed.queue.map((e) => e.actionId)).toEqual(['salvage', 'fish']);
    const next = step(live(pressed), content);
    expect(next.queue.map((e) => `${e.actionId}:${e.by}`)).toEqual(['fish:auto', 'salvage:player']);
    expect(next.work.salvage?.progress ?? 0).toBe(0);
  });
  it('and before the port\'s fight: the fight starts fed', () => {
    const filling: GameState = { ...withModes(fresh(), content, { fish: 'jit' }), inventory: { pass: 1 }, queue: [{ id: 0, actionId: 'fish', mode: 'repeat', by: 'auto', left: 5 }], nextEntryId: 1 };
    const { s } = runUntil(content, live(enqueue(filling, content, 'raid', { front: true })), (x) => (x.work.raid?.progress ?? 0) > 0);
    expect(s.inventory.fish ?? 0).toBeGreaterThan(0);
  });
  it('food on hand: the provision replaces the buried fill before the event starts', () => {
    const base: GameState = { ...withModes(ready(), content, { fish: 'jit' }), inventory: { pass: 1, fish: 2 }, queue: [entry(0, 'raid', 'once'), { id: 1, actionId: 'fish', mode: 'repeat', by: 'auto', left: 3 }], nextEntryId: 2 };
    const next = step(live(base), content);
    expect(automated([...next.events])).toEqual([{ type: 'automated', actionId: 'fish', why: 'provision' }]);
    expect(next.provisioned).toEqual(['fish']);
    expect(next.queue.map((e) => e.actionId)).toEqual(['fish', 'raid']);
  });
});

describe('a supply order is tied to the order it supplies (code panel round three)', () => {
  const stewed: Content = {
    ...content,
    actions: { ...content.actions, stew: { id: 'stew', verb: 'fish', noun: 'a stew', expCost: 1, producedItem: 'eel', producedAmount: 1, itemCosts: [{ item: 'scrap', amount: 1 }], isOneTime: false } },
    chapters: [withOrder(content.chapters[0]!, [...content.chapters[0]!.pages[0]!.order, 'stew']), content.chapters[1]!],
  };
  const base = (queue: QueueEntry[], inventory: Record<string, number> = { fish: 5, eel: 5 }): GameState => ({ ...withModes(newState(stewed.roster), stewed, { stew: 'jit', salvage: 'jit', fish: 'jit' }), inventory, queue, nextEntryId: 20 });
  it('JIT supply names the order it supplies', () => {
    const s = live(enqueue(withModes(fresh(), content, { salvage: 'jit' }), content, 'hull'));
    const next = step(s, content);
    expect(next.queue[0]).toMatchObject({ actionId: 'salvage', by: 'auto', for: s.queue[0]!.id });
  });
  it('x on the order it supplies: the supply leaves with it at once, paused or not', () => {
    const s = base([{ id: 0, actionId: 'salvage', mode: 'repeat', by: 'auto', for: 1 }, { id: 1, actionId: 'hull', mode: 'once', by: 'player' }]);
    expect(removeEntry(setPaused(s, 'player'), 1).queue).toEqual([]);
    const next = step(live(removeEntry(s, 1)), stewed);
    expect(next.queue).toEqual([]);
    expect(next.inventory.scrap ?? 0).toBe(0);
  });
  it('a one-time supply leaves with its order too, having done no work: x on the raid takes the gate with it', () => {
    const s = live({ ...withModes(fresh(), content, { gate: 'jit' }), queue: [{ id: 0, actionId: 'gate', mode: 'once', by: 'auto', for: 1 }, entry(1, 'raid', 'once')], nextEntryId: 2 });
    const next = step(removeEntry(s, 1), content);
    expect(next.queue).toEqual([]);
    expect(next.completedOneTime).not.toContain('gate');
    expect(next.work.gate?.progress ?? 0).toBe(0);
  });
  it('an orphan in a loaded queue (no x to take it) leaves on the first resolve', () => {
    const s = live({ ...withModes(fresh(), content, { gate: 'jit' }), queue: [{ id: 0, actionId: 'gate', mode: 'once', by: 'auto', for: 7 }], nextEntryId: 2 });
    const r = resolve(s, content);
    expect(r.state.queue).toEqual([]);
    expect(r.events).toContainEqual({ type: 'popped', actionId: 'gate', reason: 'enough' });
  });
  it('a fill taken back from under a play press takes its supply with it: nothing is left below the pressed row', () => {
    const s = base([{ id: 0, actionId: 'salvage', mode: 'repeat', by: 'auto', for: 1 }, { id: 1, actionId: 'stew', mode: 'repeat', by: 'auto', left: 3 }], { fish: 5 });
    const pressed = enqueue(s, stewed, 'gate', { front: true });
    expect(pressed.queue.map((e) => e.actionId)).toEqual(['gate', 'salvage', 'stew']);
    const first = step(live(pressed), stewed);
    const at = first.queue.map((e) => e.actionId);
    expect(at.indexOf('stew')).toBeLessThan(at.indexOf('gate'));
    const { states } = runUntil(stewed, first, (x) => (x.work.gate?.progress ?? 0) > 0 || x.queue.length === 0, 400);
    for (const st of [first, ...states]) expect(st.queue.slice(st.queue.findIndex((e) => e.actionId === 'gate') + 1).some((e) => e.actionId === 'salvage')).toBe(false);
  });
  it('x again and again on a fill whose food is out: it comes back, and nothing piles up', () => {
    let s = live(base([{ id: 0, actionId: 'salvage', mode: 'repeat', by: 'auto', for: 1 }, { id: 1, actionId: 'stew', mode: 'repeat', by: 'auto', left: 3 }], { fish: 5 }));
    for (let k = 0; k < 4; k++) {
      const fill = s.queue.find((e) => e.actionId === 'stew')!;
      s = resolve(removeEntry(s, fill.id), stewed).state;
      expect(s.queue.map((e) => e.actionId)).toEqual(['salvage', 'stew']);
    }
  });
  it('only a player\'s order buries a fill: two food fills out at once settle, and stay put', () => {
    const s = live(base([], {}));
    const once = resolve(s, stewed).state;
    expect(once.queue.filter((e) => e.left !== undefined).map((e) => e.actionId).sort()).toEqual(['fish', 'stew']);
    expect(resolve(once, stewed).state).toBe(once);
    const { states } = runUntil(stewed, once, (x) => (x.inventory.eel ?? 0) > 0 && (x.inventory.fish ?? 0) > 0, 2000);
    const fills = new Set(states.flatMap((st) => st.queue.filter((e) => e.left !== undefined).map((e) => e.id)));
    expect(fills.size).toBeLessThanOrEqual(2);
  });
  it('a better-ranked producer queued ahead of a food fill\'s supply goes first, and the state is settled', () => {
    // A fish in the pack: Fish goes first as the better-ranked producer, not as food at zero (#81).
    const s = live({ ...withModes(newState(stewed.roster), stewed, { stew: 'jit', salvage: 'mid', fish: 'high' }), inventory: { fish: 1 } });
    const once = resolve(s, stewed).state;
    expect(once.queue.map((e) => `${e.actionId}:${e.by}`)).toEqual(['fish:auto', 'stew:auto']);
    expect(resolve(once, stewed).state).toBe(once);
    expect(topWorks(once, stewed)).toBe(true);
  });
  it('the player\'s own order for the food, on top with its supply above it, is under way: settling twice changes nothing', () => {
    const s = live(base([{ id: 1, actionId: 'stew', mode: 'repeat', by: 'player' }], { fish: 5 }));
    const once = resolve(s, stewed).state;
    expect(once.queue.map((e) => `${e.actionId}:${e.by}`)).toEqual(['salvage:auto', 'stew:player']);
    expect(resolve(once, stewed).state).toBe(once);
  });
  it('the player\'s own order for the food under an idle order is no fill: food out, a fill goes on top (round five)', () => {
    const s = live({ ...withModes(fresh(), content, { fish: 'jit', salvage: 'high' }), queue: [{ id: 0, actionId: 'salvage', mode: 'repeat', by: 'auto' }, entry(1, 'fish')], nextEntryId: 2 });
    const once = resolve(s, content).state;
    expect(once.queue[0]).toMatchObject({ actionId: 'fish', by: 'auto', left: balance.inventory.stackCap });
    expect(resolve(once, content).state).toBe(once);
  });
  it('the player\'s own order for the food below its supply chain two deep is under way: nothing is re-queued', () => {
    const sawn: Content = {
      ...content,
      items: { ...content.items, plank: { id: 'plank', name: 'plank', kind: 'material' } },
      actions: {
        ...content.actions,
        saw: { id: 'saw', verb: 'rig', noun: 'planks', expCost: 1, producedItem: 'plank', producedAmount: 1, itemCosts: [{ item: 'scrap', amount: 1 }], isOneTime: false },
        stew: { id: 'stew', verb: 'fish', noun: 'a stew', expCost: 1, producedItem: 'eel', producedAmount: 1, itemCosts: [{ item: 'plank', amount: 1 }], isOneTime: false },
      },
      chapters: [withOrder(content.chapters[0]!, [...content.chapters[0]!.pages[0]!.order, 'saw', 'stew']), content.chapters[1]!],
    };
    const s = live({ ...withModes(newState(sawn.roster), sawn, { stew: 'jit', saw: 'jit', salvage: 'jit' }), inventory: { fish: 5 }, queue: [entry(0, 'stew')], nextEntryId: 1 });
    const once = resolve(s, sawn).state;
    expect(once.queue.map((e) => `${e.actionId}:${e.by}`)).toEqual(['salvage:auto', 'saw:auto', 'stew:player']);
    expect(resolve(once, sawn).state).toBe(once);
  });
  it('a better-ranked producer that goes first and leaves at once does not cost the maker its supply', () => {
    // The raid needs the pass (gate on mid); Salvage on high goes first, but the hull below owes 3 scrap and 4 are held,
    // so Salvage leaves at once: the gate must still supply the raid, and the raid is not dropped.
    const s: GameState = { ...withModes(fresh(), unclosed, { gate: 'mid', salvage: 'high' }), inventory: { scrap: 4, fish: 5 }, work: { hull: { progress: 5, costsConsumed: 5 } }, queue: [entry(0, 'raid', 'once'), entry(1, 'hull', 'once')], nextEntryId: 2 };
    const r = resolve(live(s), unclosed);
    expect(r.events.some((e) => e.type === 'short')).toBe(false);
    expect(r.state.queue.map((e) => `${e.actionId}:${e.by}`)).toEqual(['gate:auto', 'raid:player', 'hull:player']);
    expect(r.state.queue[0]!.for).toBe(0);
    expect(resolve(r.state, unclosed).state).toBe(r.state);
  });
  it('a food that another row costs: its fill does not stop it supplying that row\'s fill in the same resolve', () => {
    const chained: Content = {
      ...content,
      actions: { ...content.actions, stew: { id: 'stew', verb: 'fish', noun: 'a stew', expCost: 1, producedItem: 'eel', producedAmount: 1, itemCosts: [{ item: 'fish', amount: 2 }], isOneTime: false } },
      chapters: [withOrder(content.chapters[0]!, [...content.chapters[0]!.pages[0]!.order, 'stew']), content.chapters[1]!],
    };
    const s = live(withModes(newState(chained.roster), chained, { fish: 'jit', stew: 'jit' }));
    const r = resolve(s, chained);
    expect(r.events.some((e) => e.type === 'short')).toBe(false);
    expect(resolve(r.state, chained).state).toBe(r.state);
  });
  it('a food fill spares the player\'s own order for the row', () => {
    const s = live({ ...withModes(fresh(), content, { fish: 'jit' }), queue: [entry(0, 'salvage'), entry(1, 'fish', 'once')], nextEntryId: 2 });
    const next = step(s, content);
    expect(next.queue.filter((e) => e.actionId === 'fish').map((e) => e.by)).toEqual(['auto', 'player']);
    expect(resolve(next, content).state).toBe(next);
  });
  it('a food row taken off JIT drops its fill, and the fill\'s supply follows', () => {
    const s = base([{ id: 0, actionId: 'salvage', mode: 'repeat', by: 'auto', for: 1 }, { id: 1, actionId: 'stew', mode: 'repeat', by: 'auto', left: 3 }], { fish: 5 });
    const moved = setAutomation({ ...s, provisioned: ['stew', 'fish'] }, stewed, 'stew', 'off');
    expect(moved.queue).toEqual([]);
    // Back to JIT before the event starts, this row's provision (and only this row's) is owed again.
    expect(moved.provisioned).toEqual(['fish']);
  });
  it('taken off JIT and back with the event waiting unstarted: the provision comes again', () => {
    const s: GameState = { ...withModes(ready(), content, { fish: 'jit' }), inventory: { pass: 1, fish: 2 }, provisioned: ['fish'], queue: [entry(0, 'raid', 'once')], nextEntryId: 1 };
    const back = setAutomation(setAutomation(s, content, 'fish', 'top'), content, 'fish', 'jit');
    expect(automated([...step(live(back), content).events])).toEqual([{ type: 'automated', actionId: 'fish', why: 'provision' }]);
  });
  it('leaving JIT keeps the player\'s orders for the row and other rows\' supply', () => {
    const s = base([{ id: 0, actionId: 'salvage', mode: 'repeat', by: 'auto', for: 5 }, { id: 5, actionId: 'hull', mode: 'once', by: 'player' }, { id: 1, actionId: 'stew', mode: 'repeat', by: 'auto', left: 3 }, { id: 2, actionId: 'stew', mode: 'once', by: 'player' }], { fish: 5 });
    const moved = setAutomation(s, stewed, 'stew', 'off');
    expect(moved.queue.map((e) => `${e.id}:${e.actionId}:${e.by}`)).toEqual(['0:salvage:auto', '5:hull:player', '2:stew:player']);
  });
  it('x while paused on the root of a supply chain two deep: the whole chain leaves', () => {
    const s = setPaused({ ...fresh(), queue: [{ id: 2, actionId: 'salvage', mode: 'repeat', by: 'auto', for: 1 }, { id: 1, actionId: 'gate', mode: 'once', by: 'auto', for: 0 }, entry(0, 'raid', 'once')], nextEntryId: 3 }, 'player');
    expect(removeEntry(s, 0).queue).toEqual([]);
  });
});

describe('JIT food through a JIT input: the first bite after one maker completion', () => {
  it('stew on JIT (an eel from a scrap), Salvage on JIT: one scrap, then an eel, then again', () => {
    const stewed: Content = {
      ...content,
      actions: { ...content.actions, stew: { id: 'stew', verb: 'fish', noun: 'a stew', expCost: 1, producedItem: 'eel', producedAmount: 1, itemCosts: [{ item: 'scrap', amount: 1 }], isOneTime: false } },
      chapters: [withOrder(content.chapters[0]!, [...content.chapters[0]!.pages[0]!.order, 'stew']), content.chapters[1]!],
    };
    const base: GameState = { ...withModes(newState(stewed.roster), stewed, { stew: 'jit', salvage: 'jit' }), inventory: { fish: 5 } };
    const { s, states } = runUntil(stewed, live(base), (x) => (x.inventory.eel ?? 0) > 0);
    expect(s.completionCounts.salvage).toBe(base.completionCounts.salvage! + 1);
    expect(s.inventory.eel).toBe(1);
    // The fill's own supply on top is the fill under way, not a fill buried: nothing piles up behind it.
    for (const st of states) expect(st.queue.map((e) => e.actionId)).toEqual(st.queue.length === 2 ? ['salvage', 'stew'] : ['stew']);
  });
});

describe('priority rules (section 3.3)', () => {
  /** Stew: a repeating row that turns one scrap into an eel. */
  const stewed: Content = {
    ...content,
    actions: { ...content.actions, stew: { id: 'stew', verb: 'fish', noun: 'a stew', expCost: 1, producedItem: 'eel', producedAmount: 1, itemCosts: [{ item: 'scrap', amount: 1 }], isOneTime: false } },
    chapters: [withOrder(content.chapters[0]!, [...content.chapters[0]!.pages[0]!.order, 'stew']), content.chapters[1]!],
  };
  it('the idle fill breaks a tie by the port\'s row order', () => {
    const first = step(live({ ...withModes(fresh(), content, { salvage: 'mid', fish: 'mid' }), inventory: { fish: 1 } }), content);
    expect(first.events[0]).toEqual({ type: 'automated', actionId: 'fish', why: 'idle' });
  });
  it('a better-ranked producer that is short itself does not go before the supply', () => {
    const base = { ...withModes(newState(stewed.roster), stewed, { stew: 'high', salvage: 'mid' }), inventory: { eel: 1 } };
    // Automation's hull: a player's pulls its maker directly and never meets the ranking (spec 2026-09-24-pages 4.3).
    const next = step(live(enqueue(base, stewed, 'hull', { by: 'auto' })), stewed);
    expect(automated([...next.events])[0]).toEqual({ type: 'automated', actionId: 'salvage', why: 'supply' });
  });
  it('an equally ranked producer does not go before the supply', () => {
    const next = step(live(enqueue({ ...withModes(fresh(), content, { fish: 'mid', salvage: 'mid' }), inventory: { fish: 1 } }, content, 'hull', { by: 'auto' })), content);
    expect(automated([...next.events])[0]).toEqual({ type: 'automated', actionId: 'salvage', why: 'supply' });
  });
  it('a food on a priority is not provisioned: only JIT food is', () => {
    const base: GameState = { ...withModes(ready(), content, { fish: 'high' }), inventory: { pass: 1, fish: 2 }, queue: [entry(0, 'raid', 'once')], nextEntryId: 1 };
    const next = step(live(base), content);
    expect(automated([...next.events])).toEqual([]);
    expect(next.work.raid!.progress).toBeGreaterThan(0);
  });
  it('the player\'s own Fish on top with no fish gets no automated Fish above it', () => {
    const base: GameState = { ...withModes(fresh(), content, { fish: 'jit' }), queue: [entry(0, 'fish')], nextEntryId: 1 };
    const next = step(live(base), content);
    expect(next.queue.filter((e) => e.actionId === 'fish')).toEqual([entry(0, 'fish')]);
  });
});

describe('passive fill (section 3.3)', () => {
  it('an empty queue takes the best priority row that can start; then time stops', () => {
    const base = { ...withModes(fresh(), content, { salvage: 'low', fish: 'high' }), inventory: { fish: 5 } };
    const first = step(live(base), content);
    expect(first.events[0]).toEqual({ type: 'automated', actionId: 'salvage', why: 'idle' });
    const { s } = runUntil(content, first, (x) => x.queue.length === 0);
    expect(s.inventory.scrap).toBe(balance.inventory.stackCap);
    expect(step(s, content)).toBe(s);
  });
  it('paused: nothing, whatever automation holds', () => {
    const s = withModes(fresh(), content, { salvage: 'low' });
    expect(step(setPaused(s, 'player'), content)).toEqual(setPaused(s, 'player'));
    const paused = setPaused(s, 'player');
    expect(step(paused, content)).toBe(paused);
  });
});

describe('a chain that cannot close (review focus 2)', () => {
  const press: Content = {
    ...content,
    actions: { ...content.actions, press: { id: 'press', verb: 'salvage', noun: 'a press', expCost: 1, producedItem: 'scrap', producedAmount: 1, itemCosts: [{ item: 'pass', amount: 1 }], isOneTime: false } },
    chapters: [withOrder(content.chapters[0]!, [...content.chapters[0]!.pages[0]!.order, 'press']), content.chapters[1]!],
  };
  const base = withModes(newState(press.roster), press, { press: 'jit' });
  it('startBlock reads blocked; play is still accepted, and the chain goes round the press through Salvage', () => {
    // A player's press pulls the first row on the page that makes scrap, whatever its chip (spec 2026-09-24-pages 4.3).
    expect(startBlock(base, press, 'satchel')).toEqual({ kind: 'short', item: 'scrap', amount: 2, maker: 'press', gap: 'blocked', cause: { item: 'pass', maker: 'gate', gap: 'unearned' } });
    const s = live(enqueue(base, press, 'satchel', { front: true }));
    expect(s.queue.map((e) => e.actionId)).toEqual(['satchel']);
    const q = resolve(s, press).state.queue;
    expect(q.map((e) => e.actionId)).toEqual(['salvage', 'satchel']);
    expect(q[0]).toMatchObject({ by: 'auto', for: q[1]!.id });
  });
  it('queued by automation, the first step pops it once without queuing the press, and the next step is idle', () => {
    // Automation's order: a player's (queued by +) pulls Salvage, the first row on the page that makes scrap,
    // whatever its chip (spec 2026-09-24-pages section 4.3), so its chain closes. Automation's goes through the chips.
    const s = live(enqueue(base, press, 'satchel', { by: 'auto' }));
    const first = step(s, press);
    expect(first.events.filter((e) => e.type === 'short')).toEqual([{ type: 'short', actionId: 'satchel', item: 'scrap', amount: 2, maker: 'press', gap: 'blocked', cause: { item: 'pass', maker: 'gate', gap: 'unearned' } }]);
    expect(first.events.some((e) => e.type === 'automated')).toBe(false);
    expect(first.queue).toEqual([]);
    expect(step(first, press)).toBe(first);
  });
  it('a blocked row on a priority is never taken by the idle fill', () => {
    const s = live({ ...base, completionCounts: { ...base.completionCounts, satchel: unlockAt(press.actions.satchel!) }, automation: { ...base.automation, satchel: 'high' } });
    expect(step(s, press)).toBe(s);
  });
});

describe('a maker the player would run by hand that cannot start by hand either', () => {
  const hungry: Content = { ...unclosed, actions: { ...unclosed.actions, gate: { ...unclosed.actions.gate!, needs: [{ item: 'scrap', amount: 1 }] } } };
  it('the raid short its pass, the gate unearned and short of scrap: the block names what stops the gate', () => {
    expect(startBlock(newState(hungry.roster), hungry, 'raid')).toEqual({ kind: 'short', item: 'pass', amount: 1, maker: 'gate', gap: 'blocked', cause: { item: 'scrap', maker: 'salvage', gap: 'unearned' } });
  });
  it('an unearned maker that can start by hand keeps its plain reason', () => {
    expect(startBlock(fresh(), unclosed, 'raid')).toEqual({ kind: 'short', item: 'pass', amount: 1, maker: 'gate', gap: 'unearned' });
  });
});

describe('no duplicate one-times from priority supply', () => {
  it('two one-times on high and their maker on mid leave no duplicate entry', () => {
    const base = withModes(fresh(), content, { hull: 'high', satchel: 'high', salvage: 'mid' });
    const s = live(enqueue(base, content, 'hull'));
    const { s: end, events, states } = runUntil(content, s, (x) => x.completedOneTime.includes('hull'));
    expect(end.completedOneTime).toContain('hull');
    for (const st of states) {
      const ids = st.queue.map((e) => e.actionId);
      expect(new Set(ids).size, ids.join(',')).toBe(ids.length);
    }
    expect(automated(events).some((e) => e.actionId === 'satchel' && e.why === 'supply')).toBe(false);
  });
});

describe('no provisions before the finish', () => {
  it('the last port\'s event is not a departure', () => {
    const base: GameState = { ...withModes(fresh(), content, { eels: 'jit' }), chapter: 1, inventory: { eel: 2 }, queue: [entry(0, 'vault', 'once')], nextEntryId: 1 };
    const next = step(live(base), content);
    expect(automated([...next.events]).some((e) => e.why === 'provision')).toBe(false);
    expect(next.work.vault!.progress).toBeGreaterThan(0);
  });
});

describe('a content cycle', () => {
  const cycle: Content = {
    ...content,
    items: { ...content.items, aItem: { id: 'aItem', name: 'a', kind: 'material' }, bItem: { id: 'bItem', name: 'b', kind: 'material' } },
    actions: {
      ...content.actions,
      a: { id: 'a', verb: 'rig', noun: 'a', expCost: 1, producedItem: 'aItem', producedAmount: 1, itemCosts: [{ item: 'bItem', amount: 1 }], isOneTime: false },
      b: { id: 'b', verb: 'rig', noun: 'b', expCost: 1, producedItem: 'bItem', producedAmount: 1, itemCosts: [{ item: 'aItem', amount: 1 }], isOneTime: false },
    },
    chapters: [withOrder(content.chapters[0]!, [...content.chapters[0]!.pages[0]!.order, 'a', 'b']), content.chapters[1]!],
  };
  it('both off, as every row starts a life: the block ends, and names no row already on the chain', () => {
    expect(startBlock(newState(cycle.roster), cycle, 'a')).toEqual({ kind: 'short', item: 'bItem', amount: 1, maker: 'b', gap: 'blocked' });
  });
  it('a row that costs what it makes, off: a row needing it reads blocked, not caused by itself', () => {
    const press: Content = {
      ...content,
      actions: { ...content.actions, press: { id: 'press', verb: 'salvage', noun: 'a press', expCost: 1, producedItem: 'pass', producedAmount: 1, itemCosts: [{ item: 'pass', amount: 1 }], isOneTime: false }, gate: { ...content.actions.gate!, producedItem: undefined } },
      chapters: [withOrder(unclosed.chapters[0]!, [...unclosed.chapters[0]!.pages[0]!.order, 'press']), content.chapters[1]!],
    };
    expect(startBlock(newState(press.roster), press, 'raid')).toEqual({ kind: 'short', item: 'pass', amount: 1, maker: 'press', gap: 'blocked' });
  });
  it('two rows that each cost what the other makes, both JIT: no throw, no growing queue', () => {
    const cyc: Content = {
      ...content,
      items: { ...content.items, aItem: { id: 'aItem', name: 'a', kind: 'material' }, bItem: { id: 'bItem', name: 'b', kind: 'material' } },
      actions: {
        ...content.actions,
        a: { id: 'a', verb: 'rig', noun: 'a', expCost: 1, producedItem: 'aItem', producedAmount: 1, itemCosts: [{ item: 'bItem', amount: 1 }], isOneTime: false },
        b: { id: 'b', verb: 'rig', noun: 'b', expCost: 1, producedItem: 'bItem', producedAmount: 1, itemCosts: [{ item: 'aItem', amount: 1 }], isOneTime: false },
      },
      chapters: [withOrder(content.chapters[0]!, [...content.chapters[0]!.pages[0]!.order, 'a', 'b']), content.chapters[1]!],
    };
    let s = live(enqueue(withModes(newState(cyc.roster), cyc, { a: 'jit', b: 'jit' }), cyc, 'a'));
    for (let i = 0; i < 100; i++) {
      s = step(s, cyc);
      expect(s.queue.length).toBeLessThanOrEqual(4);
    }
  });
});

describe('topWorks: the top can run as the state stands', () => {
  it('a top that works is working, paused or not', () => {
    const s = enqueue(fresh(), content, 'salvage');
    expect(topWorks(live(s), content)).toBe(true);
    expect(topWorks(setPaused(s, 'player'), content)).toBe(true);
  });
  it('paused, a top that would leave is not, even with a row behind it that could run', () => {
    const s = setPaused(enqueue(enqueue(fresh(), content, 'hull'), content, 'salvage'), 'player');
    expect(s.queue.map((e) => e.actionId)).toEqual(['hull', 'salvage']);
    expect(resolve(s, content).ready).toBe(true);
    expect(topWorks(s, content)).toBe(false);
  });
  it('paused, a top a JIT maker would supply first is not: the maker would run', () => {
    const s = setPaused(enqueue(withModes(fresh(), content, { salvage: 'jit' }), content, 'hull'), 'player');
    expect(topWorks(s, content)).toBe(false);
  });
  it('an empty queue is not', () => {
    expect(topWorks(live(fresh()), content)).toBe(false);
  });
});

describe('resolve on a settled state', () => {
  it('returns the state it was given where it has nothing to do (the screen renders it as is)', () => {
    const cases: GameState[] = [
      live(enqueue(fresh(), content, 'salvage')),
      live(fresh()),
      live({ ...ready(), inventory: { pass: 1 }, queue: [entry(0, 'raid', 'once')], nextEntryId: 1, work: { raid: { progress: 5, costsConsumed: 0 } } }),
      live(enqueue({ ...fresh(), inventory: { scrap: 3 } }, content, 'hull')),
    ];
    for (const s of cases) {
      const r = resolve(s, content);
      expect(r.state).toBe(s);
    }
  });
  it('resolve uses one pass on a ready top with nothing to do', () => {
    const s = live(enqueue(fresh(), content, 'salvage'));
    const r = resolve(s, content);
    expect(r.ready).toBe(true);
    expect(r.passes).toBe(1);
  });
});

describe('an empty queue does what JIT can (#77)', () => {
  const cap = balance.inventory.stackCap;
  /** A one-time with no cost, for a priority row that can always start. */
  const charted: Content = {
    ...content,
    actions: { ...content.actions, chart: { id: 'chart', verb: 'rig', noun: 'a chart', expCost: 1, itemCosts: [], isOneTime: true } },
    chapters: [withOrder(content.chapters[0]!, [...content.chapters[0]!.pages[0]!.order, 'chart']), content.chapters[1]!],
  };
  const idle = (events: GameEvent[]) => automated(events).filter((e) => e.why === 'idle').map((e) => e.actionId);

  it('a JIT food below its cap refills to the cap, one fill of the count it lacks', () => {
    const s = live({ ...withModes(fresh(), content, { fish: 'jit' }), inventory: { fish: 2 } });
    const r = resolve(s, content);
    expect(r.state.queue).toEqual([{ id: 0, actionId: 'fish', mode: 'repeat', by: 'auto', left: cap - 2 }]);
    expect(r.events).toContainEqual({ type: 'automated', actionId: 'fish', why: 'idle' });
    const { s: end } = runUntil(content, s, (x) => x.queue.length === 0 && x.runTicks > 0);
    expect(end.inventory.fish).toBe(cap);
  });
  it('a JIT producer waits for demand: an empty queue does not run it, and the priority row runs instead (#79)', () => {
    const s = live(withModes(fresh(), content, { salvage: 'jit', satchel: 'high' }));
    const r = resolve(s, content);
    expect(idle([...r.events])).toEqual(['satchel']);
    // The satchel's scrap is the demand: Salvage supplies it, for the satchel alone.
    expect(r.state.queue[0]).toMatchObject({ actionId: 'salvage', for: r.state.queue[1]!.id });
    expect(resolve(live(withModes(fresh(), content, { salvage: 'jit' })), content).state.queue).toEqual([]);
  });
  it('a JIT one-time waits for demand too: the gate is not run on an empty queue, only for the raid that needs its pass', () => {
    // On `unclosed` the raid closes nothing, so the gate is no page prerequisite of it; and the raid is automation's
    // own order, which a player's would not be: a player's pulls the gate whatever its chip (spec 2026-09-24-pages 4.3).
    const s = live(withModes(built(fresh(), 'hull'), unclosed, { gate: 'jit' }));
    expect(step(s, unclosed)).toBe(s);
    const raided: GameState = { ...s, queue: [{ id: 0, actionId: 'raid', mode: 'once', by: 'auto' }], nextEntryId: 1 };
    const r = resolve(raided, unclosed);
    expect(r.state.queue.map((e) => e.actionId)).toEqual(['gate', 'raid']);
    expect(r.state.queue[0]).toMatchObject({ by: 'auto', for: 0 });
    expect(r.events).toContainEqual({ type: 'automated', actionId: 'gate', why: 'supply' });
  });
  it('a JIT food goes before a JIT producer earlier in the row order', () => {
    const reordered: Content = { ...content, chapters: [withOrder(content.chapters[0]!, ['salvage', 'fish', 'hull', 'satchel', 'gate', 'raid']), content.chapters[1]!] };
    const s = live({ ...withModes(fresh(), reordered, { salvage: 'jit', fish: 'jit' }), inventory: { fish: 2 } });
    const r = resolve(s, reordered);
    expect(idle([...r.events])[0]).toBe('fish');
    expect(r.state.queue[0]).toMatchObject({ actionId: 'fish', left: cap - 2 });
  });
  it('paused, a step does nothing: no JIT order is queued', () => {
    const s = setPaused({ ...withModes(fresh(), content, { fish: 'jit', salvage: 'jit' }), inventory: { fish: 2 } }, 'player');
    expect(step(s, content)).toBe(s);
    expect(step(live(s), content).queue[0]).toMatchObject({ actionId: 'fish', by: 'auto' });
  });
  it('with an order in the queue, JIT adds no idle order of its own', () => {
    const s = live({ ...withModes(fresh(), content, { fish: 'jit' }), inventory: { fish: 2 }, queue: [entry(0, 'salvage')], nextEntryId: 1 });
    const { states } = runUntil(content, s, (x) => !x.queue.some((e) => e.actionId === 'salvage'));
    const busy = states.filter((x) => x.queue.some((e) => e.actionId === 'salvage'));
    expect(busy.length).toBeGreaterThan(0);
    for (const x of busy) expect(x.queue.filter((e) => e.by === 'auto')).toEqual([]);
    expect(step(states[states.length - 1]!, content).queue[0]).toMatchObject({ actionId: 'fish', by: 'auto' });
  });
  it('an empty queue with every JIT row full or done is idle: step returns the same object', () => {
    const s = live({ ...withModes(fresh(), content, { fish: 'jit', salvage: 'jit', gate: 'jit' }), inventory: { fish: cap, scrap: cap, pass: 1 }, completedOneTime: ['gate'] });
    expect(step(s, content)).toBe(s);
    expect(resolve(s, content).state).toBe(s);
    expect(resolve({ ...s, inventory: { ...s.inventory, fish: cap - 1 } }, content).state.queue[0]).toMatchObject({ actionId: 'fish', left: 1 });
  });

  describe('food and the rest take turns', () => {
    it('after a JIT food fill, the next empty queue goes to the priority row, then food again; a JIT producer is passed over', () => {
      // Hurt, so the fish is eaten and is below its cap again by the time the chart's turn comes.
      const s = live({ ...withModes(fresh(), charted, { fish: 'jit', salvage: 'jit', chart: 'high' }), inventory: { fish: 2 }, health: 20 });
      const { events } = runUntil(charted, s, (x) => x.completedOneTime.includes('chart') && x.queue.length === 0);
      expect(idle(events).slice(0, 2)).toEqual(['fish', 'chart']);
      expect(idle(events)).not.toContain('salvage');
    });
    it('food eaten faster than it is made still lets a priority row run within a bounded number of empties', () => {
      // A unit of fish takes longer than the food cooldown, and a hurt player eats each one as it lands: the fill
      // never reaches the cap. Back to back, food fills would take every empty queue there is.
      const slow: Content = { ...charted, actions: { ...charted.actions, fish: { ...charted.actions.fish!, expCost: 10 } } };
      const s = live({ ...withModes(fresh(), slow, { fish: 'jit', chart: 'high' }), inventory: { fish: 1 }, health: 20 });
      const { s: end, events, states } = runUntil(slow, s, (x) => x.completedOneTime.includes('chart'), 4000);
      expect(states.every((x) => (x.inventory.fish ?? 0) < cap)).toBe(true);
      expect(idle(events).indexOf('chart')).toBe(1);
      expect(end.completedOneTime).toContain('chart');
    });
    it('with nothing else to do, food goes again at once: the settled state is a fixed point (code panel)', () => {
      const s = live({ ...withModes(fresh(), content, { fish: 'jit' }), inventory: { fish: 2 }, idleFed: true });
      const r = resolve(s, content);
      expect(r.state.queue[0]).toMatchObject({ actionId: 'fish', by: 'auto', left: cap - 2 });
      expect(resolve(r.state, content).state).toBe(r.state);
      expect(step(s, content).runTicks).toBe(s.runTicks + 1);
    });
  });

  it('casting off clears the food turn: the next port\'s first empty queue may feed (code panel)', () => {
    const s = live({ ...ready(), inventory: { pass: 1 }, idleFed: true, queue: [{ id: 0, actionId: 'raid', mode: 'once', by: 'player' }], nextEntryId: 1,
      work: { raid: { progress: content.actions.raid!.expCost - 1e-9, costsConsumed: 0 } } });
    const after = step(s, content);
    expect(after.chapter).toBe(1);
    expect(after.idleFed).toBe(false);
  });
});
