import { describe, expect, it } from 'vitest';
import type { Content } from '../data/types';
import { validateBook } from '../data/validate';
import { windwardRun } from '../data/windward-run';
import { cycleOf, setAutomation, unlockAt } from './automation';
import { playBlock } from './fight';
import { built, fixture, onePage, pagedBook } from './fixture';
import { enqueue, newState, startBlock } from './queue';
import { rebirth } from './rebirth';
import { resolve } from './resolve';
import { pageOf } from './rows';
import { setPaused, step } from './tick';
import type { AutoMode, GameEvent, GameState } from './types';

const c = pagedBook;
const live = (s: GameState) => setPaused(s, 'none');
const fresh = () => newState(c.roster);
const earned = (content: Content, s: GameState, ...ids: string[]): GameState =>
  ({ ...s, completionCounts: { ...s.completionCounts, ...Object.fromEntries(ids.map((id) => [id, unlockAt(content, content.actions[id]!)])) } });
const withModes = (content: Content, s: GameState, modes: Record<string, AutoMode>): GameState =>
  ({ ...earned(content, s, ...Object.keys(modes)), automation: { ...s.automation, ...modes } });
const holding = (s: GameState, items: Record<string, number>): GameState => ({ ...s, inventory: { ...s.inventory, ...items } });
function runUntil(content: Content, state: GameState, done: (s: GameState) => boolean, limit = 10_000): { s: GameState; events: GameEvent[] } {
  let s = state;
  const events: GameEvent[] = [];
  for (let i = 0; i < limit && !done(s); i++) {
    const next = step(s, content);
    if (next !== s) events.push(...next.events);
    s = next;
  }
  return { s, events };
}
/** No order has two entries serving it (the property test's supply invariant). */
const oneSupplyEach = (s: GameState) => {
  const fors = s.queue.flatMap((e) => (e.for === undefined ? [] : [e.for]));
  expect(new Set(fors).size).toBe(fors.length);
};

describe('the paged fixture', () => {
  it('is a valid book', () => {
    expect(validateBook({ ...c, id: 'p', name: 'P', version: 1, length: { hours: 1 } })).toEqual([]);
  });
});

describe('the page is derived (spec 2026-09-24-pages section 4)', () => {
  it('is the first page whose closer is not done; page 2 once the gate is', () => {
    expect(pageOf(fresh(), c).name).toBe('Fitting out');
    expect(pageOf(built(fresh(), 'gate'), c).name).toBe('The raid');
  });
  it('is the last page of the chapter once every closer is done, so the screen behind the finish card has one', () => {
    const finished: GameState = { ...built(fresh(), 'vault'), chapter: 1, dead: true, finished: true };
    expect(pageOf(finished, c).closes).toBe('vault');
    // On a chapter of three pages, so the last page is not also the first.
    const w = windwardRun;
    const done: GameState = { ...built(newState(w.roster), 'door', 'salons', 'varro'), chapter: 2, dead: true, finished: true };
    expect(w.chapters[2]!.pages).toHaveLength(3);
    expect(pageOf(done, w).name).toBe("Varro's table");
  });
  it('is page 1 again in a new life', () => {
    const turned: GameState = { ...built(fresh(), 'hull', 'satchel', 'gate'), dead: true };
    expect(pageOf(turned, c).name).toBe('The raid');
    expect(pageOf(rebirth(turned), c).name).toBe('Fitting out');
  });
});

describe('a closer waits on its page (section 4.2)', () => {
  it('names exactly the page\'s undone one-times, in page order', () => {
    expect(startBlock(fresh(), c, 'gate')).toEqual({ kind: 'page', waits: ['hull', 'satchel'] });
    expect(startBlock(built(fresh(), 'hull'), c, 'gate')).toEqual({ kind: 'page', waits: ['satchel'] });
    expect(startBlock(built(fresh(), 'hull', 'satchel'), c, 'gate')).toBeNull();
  });
  it('a play press on it is honoured, and pulls the first prerequisite in front of it, for it', () => {
    const s = live(enqueue(holding(fresh(), { plank: 2, scrap: 2 }), c, 'gate', { front: true }));
    expect(s.queue.map((e) => e.actionId)).toEqual(['gate']);
    const r = resolve(s, c);
    expect(r.ready).toBe(true);
    expect(r.state.queue.map((e) => e.actionId)).toEqual(['hull', 'gate']);
    expect(r.state.queue[0]).toMatchObject({ by: 'auto', for: r.state.queue[1]!.id });
    oneSupplyEach(r.state);
  });
  it('a + order behaves the same once it reaches the top', () => {
    const s = live(enqueue(holding(fresh(), { plank: 2, scrap: 2 }), c, 'gate'));
    expect(resolve(s, c).state.queue.map((e) => e.actionId)).toEqual(['hull', 'gate']);
  });
  it('builds the page one prerequisite at a time, then runs, and the page turns', () => {
    const s = live(enqueue(holding(fresh(), { plank: 2, scrap: 2 }), c, 'gate', { front: true }));
    const { s: end, events } = runUntil(c, s, (x) => x.completedOneTime.includes('gate'));
    expect(end.completedOneTime).toEqual(expect.arrayContaining(['hull', 'satchel', 'gate']));
    expect(events.filter((e) => e.type === 'completed' && e.oneTime).map((e) => (e as { actionId: string }).actionId)).toEqual(['hull', 'satchel', 'gate']);
    expect(events).toContainEqual({ type: 'pageTurn', chapter: 0, page: 1 });
    expect(pageOf(end, c).name).toBe('The raid');
  });
  it('a prerequisite already queued below moves up with what serves it, and stays the player\'s', () => {
    // The hull is the player's (+), short of planks; the saw, on JIT, supplies it. Then play on the gate.
    const chipped = withModes(c, fresh(), { saw: 'jit', chop: 'jit' });
    let s = live(enqueue(chipped, c, 'hull'));
    s = resolve(s, c).state;
    const hull = s.queue.find((e) => e.actionId === 'hull')!;
    expect(s.queue.find((e) => e.actionId === 'saw')).toMatchObject({ for: hull.id });
    s = enqueue(s, c, 'gate', { front: true });
    const r = resolve(s, c).state;
    const ids = r.queue.map((e) => e.actionId);
    // The hull's own supply chain first, then the hull, then the gate: nothing served twice, the hull still the player's.
    expect(ids.indexOf('hull')).toBeLessThan(ids.indexOf('gate'));
    expect(ids.indexOf('saw')).toBeLessThan(ids.indexOf('hull'));
    expect(r.queue.find((e) => e.actionId === 'hull')).toMatchObject({ id: hull.id, by: 'player' });
    expect(r.queue.find((e) => e.actionId === 'hull')!.for).toBeUndefined();
    oneSupplyEach(r);
  });
});

describe('nothing waits forever at the top (section 4.2)', () => {
  const leaves = (events: readonly GameEvent[]) => events.filter((e) => e.type === 'popped' && e.reason === 'page');
  it('a prerequisite short of what nothing on the page makes: it stops, and the closer leaves naming its page', () => {
    // The hull lacks planks and this page has no saw: nothing here makes them.
    const bare: Content = { ...c, chapters: [{ ...c.chapters[0]!, pages: [onePage(['fish', 'salvage', 'hull', 'satchel', 'gate'], 'gate'), c.chapters[0]!.pages[1]!] }, c.chapters[1]!] };
    const r = resolve(live(enqueue(newState(bare.roster), bare, 'gate', { front: true })), bare);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'short', actionId: 'hull', maker: null, gap: 'none' }));
    // The hull is pulled as the gate's prerequisite; nothing is ordered for its planks.
    expect(r.events.filter((e) => e.type === 'automated')).toEqual([{ type: 'automated', actionId: 'hull', why: 'supply' }]);
    expect(leaves(r.events)).toEqual([{ type: 'popped', actionId: 'gate', reason: 'page', waits: ['hull', 'satchel'] }]);
    expect(r.state.queue).toEqual([]);
  });
  it('nothing on the page makes it, though a row on another page of the chapter does: no order for that row', () => {
    // The saw moves to page 2: the hull on page 1 still lacks planks, and the saw, earned and on JIT, is not here.
    const split: Content = { ...c, chapters: [{ ...c.chapters[0]!, pages: [
      onePage(['fish', 'salvage', 'chop', 'hull', 'satchel', 'gate'], 'gate'),
      onePage(['fish', 'salvage', 'saw', 'raid'], 'raid'),
    ] }, c.chapters[1]!] };
    const s = live(enqueue(withModes(split, newState(split.roster), { saw: 'jit', chop: 'jit' }), split, 'gate', { front: true }));
    const r = resolve(s, split);
    // The hull is pulled as the gate's prerequisite; nothing is ordered for its planks.
    expect(r.events.filter((e) => e.type === 'automated')).toEqual([{ type: 'automated', actionId: 'hull', why: 'supply' }]);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'short', actionId: 'hull', maker: null, gap: 'none' }));
    expect(leaves(r.events)).toEqual([{ type: 'popped', actionId: 'gate', reason: 'page', waits: ['hull', 'satchel'] }]);
    expect(r.state.queue).toEqual([]);
  });
  it('a prerequisite that pops full (its key already held) takes the closer out too', () => {
    const k: Content = {
      ...fixture,
      actions: { ...fixture.actions, door: { id: 'door', verb: 'rig', noun: 'the door', expCost: 1, itemCosts: [], isOneTime: true } },
      chapters: [{ ...fixture.chapters[0]!, pages: [onePage(['fish', 'gate', 'door'], 'door')] }, fixture.chapters[1]!],
    };
    const r = resolve(live(enqueue(holding(newState(k.roster), { pass: 1 }), k, 'door', { front: true })), k);
    expect(r.events).toContainEqual({ type: 'popped', actionId: 'gate', reason: 'full' });
    expect(leaves(r.events)).toEqual([{ type: 'popped', actionId: 'door', reason: 'page', waits: ['gate'] }]);
  });
  it('a pulled fight that backs off takes the closer out too', () => {
    const f: Content = {
      ...fixture,
      actions: {
        ...fixture.actions,
        brawl: { id: 'brawl', verb: 'fight', noun: 'a brawl', expCost: 30, itemCosts: [], isOneTime: true, healthRate: -1 },
        exit: { id: 'exit', verb: 'rig', noun: 'the exit', expCost: 1, itemCosts: [], isOneTime: true },
      },
      chapters: [{ ...fixture.chapters[0]!, pages: [onePage(['fish', 'brawl', 'exit'], 'exit')] }, fixture.chapters[1]!],
    };
    const low: GameState = { ...newState(f.roster), health: 1 };
    const r = resolve(live(enqueue(low, f, 'exit', { front: true })), f);
    expect(r.events).toContainEqual({ type: 'popped', actionId: 'brawl', reason: 'hurt' });
    expect(leaves(r.events)).toEqual([{ type: 'popped', actionId: 'exit', reason: 'page', waits: ['brawl'] }]);
  });
});

describe('food on any chip goes to the top when you run out (#81)', () => {
  for (const mode of ['jit', 'top', 'high', 'mid', 'low', 'last'] as const) {
    it(`with fish on ${mode}, an empty pack puts fish on top of a press's chain`, () => {
      const w = windwardRun;
      const s = live(enqueue(withModes(w, newState(w.roster), { fish: mode }), w, 'sails', { front: true }));
      expect(resolve(s, w).state.queue[0]).toMatchObject({ actionId: 'fish', by: 'auto' });
    });
  }
  it('a whole press chain with fish on a priority keeps the player fed, one fill at a time, and the page turns', () => {
    const w = windwardRun;
    let s = live(enqueue(withModes(w, newState(w.roster), { fish: 'high' }), w, 'sails', { front: true }));
    let lowest = s.health;
    for (let i = 0; i < 20_000 && !s.completedOneTime.includes('sails') && !s.dead; i++) {
      s = step(s, w);
      lowest = Math.min(lowest, s.health);
      expect(s.queue.filter((e) => e.actionId === 'fish' && e.by === 'auto').length).toBeLessThanOrEqual(1);
    }
    expect(s.completedOneTime).toContain('sails');
    // Unfed, the same chain ends near half health (the code panel's reading, 46.6); fed, it stays near full.
    expect(lowest).toBeGreaterThan(90);
  });
  it('turning a priority food off takes its fill out with it: off, automation stops harvesting', () => {
    const w = windwardRun;
    const s = resolve(live(withModes(w, newState(w.roster), { fish: 'mid' })), w).state;
    expect(s.queue[0]).toMatchObject({ actionId: 'fish', by: 'auto' });
    expect(setAutomation(s, w, 'fish', 'off').queue).toEqual([]);
    // Between priorities the fill stays: it is still automated.
    expect(setAutomation(s, w, 'fish', 'high').queue.map((e) => e.actionId)).toEqual(['fish']);
  });
  it('with fish off, it does not: the chain alone', () => {
    const w = windwardRun;
    const s = live(enqueue(newState(w.roster), w, 'sails', { front: true }));
    expect(resolve(s, w).state.queue[0]!.actionId).not.toBe('fish');
  });
});

describe('a press queues its whole chain (section 4.3)', () => {
  it('an automation order already serving another order keeps that tie when it moves up for a closer', () => {
    // The gate, a prerequisite of the raid, is queued as automation's supply for the wardens (who need its pass).
    const k: Content = {
      ...fixture,
      actions: { ...fixture.actions, wardens: { id: 'wardens', verb: 'fight', noun: 'the wardens', expCost: 5, itemCosts: [], needs: [{ item: 'pass', amount: 1 }], isOneTime: true } },
      chapters: [{ ...fixture.chapters[0]!, pages: [onePage(['fish', 'salvage', 'hull', 'satchel', 'gate', 'wardens', 'raid'], 'raid')] }, fixture.chapters[1]!],
    };
    let s: GameState = built(newState(k.roster), 'hull', 'satchel');
    s = { ...s, queue: [{ id: 1, actionId: 'gate', mode: 'once', by: 'auto', for: 0 }, { id: 0, actionId: 'wardens', mode: 'once', by: 'player' }], nextEntryId: 2 };
    s = live(enqueue(s, k, 'raid', { front: true }));
    const q = resolve(s, k).state.queue;
    expect(q.find((e) => e.actionId === 'gate')).toMatchObject({ id: 1, for: 0 });
  });
  it('an automation order moved up for a player\'s closer joins the player\'s chain, and is supplied whatever the chips', () => {
    // The code panel's repro: automation has the hull queued (its chip high, Salvage off); the player presses the gate.
    const s0 = withModes(c, fresh(), { hull: 'high', saw: 'off', chop: 'off' });
    let s = live({ ...s0, queue: [{ id: 0, actionId: 'hull', mode: 'once', by: 'auto' }], nextEntryId: 1 });
    s = enqueue(s, c, 'gate', { front: true });
    const r = resolve(s, c);
    expect(r.events.some((e) => e.type === 'popped' && e.reason === 'page')).toBe(false);
    const q = r.state.queue;
    expect(q.map((e) => e.actionId)).toEqual(['chop', 'saw', 'hull', 'gate']);
    expect(q.find((e) => e.actionId === 'hull')).toMatchObject({ id: 0, for: q.find((e) => e.actionId === 'gate')!.id });
  });
  it('play on page 1\'s closer with an empty pack builds the page and turns it, with no further input', () => {
    const s = live(enqueue(fresh(), c, 'gate', { front: true }));
    const { s: end, events } = runUntil(c, s, (x) => x.completedOneTime.includes('gate'));
    expect(end.completedOneTime).toEqual(expect.arrayContaining(['hull', 'satchel', 'gate']));
    expect(events).toContainEqual({ type: 'pageTurn', chapter: 0, page: 1 });
    expect(events.some((e) => e.type === 'short' || (e.type === 'popped' && e.reason === 'page'))).toBe(false);
  });
  it('the chain goes as deep as it needs, deepest on top, each tied to the order it serves', () => {
    // The gate waits on the hull, which lacks planks, which the saw makes from wood, which the chop fetches.
    const q = resolve(live(enqueue(fresh(), c, 'gate', { front: true })), c).state.queue;
    expect(q.map((e) => e.actionId)).toEqual(['chop', 'saw', 'hull', 'gate']);
    for (let i = 0; i < 3; i++) expect(q[i]).toMatchObject({ by: 'auto', for: q[i + 1]!.id });
    oneSupplyEach({ ...fresh(), queue: q });
  });
  it('play on the hull with no scrap and Salvage\'s chip off queues Salvage for it, and the hull completes', () => {
    const f = fixture;
    const s = live(enqueue(earned(f, newState(f.roster), 'salvage'), f, 'hull', { front: true }));
    const r = resolve(s, f).state;
    expect(r.queue.map((e) => e.actionId)).toEqual(['salvage', 'hull']);
    expect(r.queue[0]).toMatchObject({ by: 'auto', for: r.queue[1]!.id });
    expect(r.queue[0]!.left).toBeUndefined();
    expect(runUntil(f, s, (x) => x.completedOneTime.includes('hull')).s.completedOneTime).toContain('hull');
  });
  it('it does not wait behind a better-ranked automated producer: Fish on a priority, Salvage off, Salvage first', () => {
    const f = fixture;
    const s = live(enqueue({ ...withModes(f, newState(f.roster), { fish: 'high' }), inventory: { fish: 1 } }, f, 'hull', { front: true }));
    expect(resolve(s, f).state.queue.map((e) => e.actionId)).toEqual(['salvage', 'hull']);
  });
  it('Shift carries to the supply a chain pulls: a chip-off fight that supplies a forced fight arrives forced', () => {
    const w: Content = {
      ...fixture,
      actions: {
        ...fixture.actions,
        wardens: { id: 'wardens', verb: 'fight', noun: 'the wardens', expCost: 5, itemCosts: [], needs: [{ item: 'pass', amount: 1 }], isOneTime: true, healthRate: -1 },
      },
      chapters: [{ ...fixture.chapters[0]!, pages: [onePage(['fish', 'salvage', 'hull', 'satchel', 'gate', 'wardens', 'raid'], 'raid')] }, fixture.chapters[1]!],
    };
    const s = live(enqueue(newState(w.roster), w, 'wardens', { front: true, once: true }));
    const q = resolve(s, w).state.queue;
    expect(q.map((e) => e.actionId)).toEqual(['gate', 'wardens']);
    expect(q[0]).toMatchObject({ forced: true, for: q[1]!.id });
  });
  it('automation\'s own order still goes through the chips: an automated hull with Salvage off stops short', () => {
    const f = fixture;
    const s = live({ ...earned(f, newState(f.roster), 'salvage'), queue: [{ id: 1, actionId: 'hull', mode: 'once', by: 'auto' }], nextEntryId: 2 });
    const r = resolve(s, f);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'short', actionId: 'hull', maker: 'salvage', gap: 'off' }));
    expect(r.state.queue).toEqual([]);
  });
});

describe('what the page rule leaves alone', () => {
  it('automation does not order a waiting closer whose next prerequisite cannot start, even on a priority', () => {
    const s = live(withModes(c, fresh(), { gate: 'high' }));
    const r = resolve(s, c);
    expect(r.state.queue.some((e) => e.actionId === 'gate')).toBe(false);
    // Not ordered and then turned out: never ordered at all.
    expect(r.events.filter((e) => e.type === 'automated' && e.actionId === 'gate')).toEqual([]);
    expect(r.events.filter((e) => e.type === 'popped' || e.type === 'pageTurn')).toEqual([]);
  });
  it('it does not order one whose next prerequisite is a fight that would back off: no tick spins without time passing', () => {
    // The code panel's repro: Upper decks, the deck pass held, the salons on a priority, the enforcers off, low health.
    const w = windwardRun;
    let s: GameState = { ...withModes(w, newState(w.roster), { salons: 'low' }), chapter: 2, completedOneTime: ['dock', 'trunk', 'door'], inventory: { 'deck-pass': 1 }, health: 3 };
    s = live(s);
    const first = step(s, w);
    expect(first.runTicks).toBe(s.runTicks);
    expect(first.queue).toEqual([]);
    expect(step(first, w)).toBe(first);
  });
  it('it orders one whose next prerequisite can start, and pulls it: the demand a JIT one-time waits for', () => {
    // The hull on JIT acts only on demand; the gate's chip is that demand once the hull could run.
    const s = live(holding(withModes(c, fresh(), { gate: 'high', hull: 'jit' }), { plank: 2 }));
    const q = resolve(s, c).state.queue;
    expect(q.map((e) => e.actionId)).toEqual(['hull', 'gate']);
    expect(q[0]).toMatchObject({ by: 'auto', for: q[1]!.id });
  });
  it('play on a fight closer is not refused as one that would stop while its page is unfinished; it is once the page is done', () => {
    const f: Content = { ...fixture, actions: { ...fixture.actions, raid: { ...fixture.actions.raid!, healthRate: -1 } } };
    const low: GameState = { ...newState(f.roster), health: 1 };
    expect(playBlock(low, f, 'raid')).toBeNull();
    expect(playBlock(holding(built(low, 'hull', 'satchel', 'gate'), { pass: 1 }), f, 'raid')).toMatchObject({ kind: 'hurt' });
  });
  it('Shift on a closer forces the closer, not the prerequisites it pulls', () => {
    const f: Content = { ...fixture, actions: { ...fixture.actions, raid: { ...fixture.actions.raid!, healthRate: -1 } } };
    const s = live(enqueue(holding(newState(f.roster), { scrap: 8 }), f, 'raid', { front: true, once: true }));
    expect(s.queue[0]).toMatchObject({ actionId: 'raid', forced: true });
    const q = resolve(s, f).state.queue;
    expect(q.map((e) => e.actionId)).toEqual(['hull', 'raid']);
    expect(q[0]!.forced).toBeUndefined();
  });
});

describe('provisioning is for the departure, not a page turn (section 3.2)', () => {
  const automatedWhy = (events: readonly GameEvent[]) => events.filter((e) => e.type === 'automated').map((e) => `${(e as { why: string }).why}:${(e as { actionId: string }).actionId}`);
  it('a mid-chapter closer on top with a JIT food below its cap: nothing is provisioned, and the closer runs', () => {
    const s = live(enqueue(holding(withModes(c, built(fresh(), 'hull', 'satchel'), { fish: 'jit' }), { fish: 2 }), c, 'gate', { front: true }));
    const r = resolve(s, c);
    expect(automatedWhy(r.events)).toEqual([]);
    expect(r.ready).toBe(true);
    expect(r.state.queue.map((e) => e.actionId)).toEqual(['gate']);
    expect(r.state.provisioned).toEqual([]);
  });
  it('the chapter\'s last closer, on the page after, is provisioned for', () => {
    const s = live(enqueue(holding(withModes(c, built(fresh(), 'hull', 'satchel', 'gate'), { fish: 'jit' }), { fish: 2, pass: 1 }), c, 'raid', { front: true }));
    const r = resolve(s, c);
    expect(automatedWhy(r.events)).toEqual(['provision:fish']);
    expect(r.state.provisioned).toEqual(['fish']);
  });
});

describe('turning the page (section 2)', () => {
  it('keeps a carried row\'s order and progress, drops an order the new page lacks, keeps items and chips', () => {
    let s = withModes(c, built(fresh(), 'hull', 'satchel'), { salvage: 'mid' });
    s = holding(s, { scrap: 3, wood: 2 });
    s = enqueue(s, c, 'gate', { front: true });
    s = enqueue(s, c, 'salvage');
    s = enqueue(s, c, 'chop');
    s = { ...s, work: { ...s.work, salvage: { progress: 0.5, costsConsumed: 0 } } };
    const { s: end, events } = runUntil(c, live(s), (x) => x.completedOneTime.includes('gate'));
    expect(events).toContainEqual({ type: 'pageTurn', chapter: 0, page: 1 });
    expect(end.queue.map((e) => e.actionId)).toEqual(['salvage']);
    expect(end.work.salvage).toEqual({ progress: 0.5, costsConsumed: 0 });
    expect(end.inventory).toMatchObject({ scrap: 3, wood: 2, pass: 1 });
    expect(end.automation.salvage).toBe('mid');
  });
  it('the last page\'s closer casts off, to the next chapter\'s first page', () => {
    const s = live(enqueue(holding(built(fresh(), 'hull', 'satchel', 'gate'), { pass: 1 }), c, 'raid', { front: true }));
    const { s: end, events } = runUntil(c, s, (x) => x.chapter === 1);
    expect(events).toContainEqual({ type: 'castOff', chapter: 1 });
    expect(events.some((e) => e.type === 'pageTurn')).toBe(false);
    expect(pageOf(end, c).closes).toBe('vault');
  });
  it('in the last chapter, the closer finishes the book', () => {
    const s: GameState = live(enqueue({ ...fresh(), chapter: 1 }, c, 'vault', { front: true }));
    const { s: end } = runUntil(c, s, (x) => x.finished);
    expect(end).toMatchObject({ finished: true, dead: true });
  });
});

describe('JIT only where it can act (section 4)', () => {
  it('a row whose item only a later page needs has no JIT in its cycle; on one page it does', () => {
    expect(cycleOf(c, c.actions.gate!)).not.toContain('jit');
    expect(cycleOf(fixture, fixture.actions.gate!)).toContain('jit');
    expect(cycleOf(c, c.actions.saw!)).toContain('jit');
  });
});
