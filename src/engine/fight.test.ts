import { describe, expect, it } from 'vitest';
import type { Content } from '../data/types';
import { unlockAt } from './automation';
import { delayFor, fightWindow, hurtBlock, hurts, playBlock, stops, wouldKill } from './fight';
import { built, fixture, withOrder } from './fixture';
import { damagePerTick } from './health';
import { enqueue, newState, removeEntry, startBlock } from './queue';
import { deathSummary } from './rebirth';
import { setPaused, step } from './tick';
import { ticksPerSecond } from './time';
import type { GameState, QueueEntry } from './types';

/** The fixture's raid hurts; a pass is in hand, and the rest of its page is built, so it can start. */
const content: Content = { ...fixture, actions: { ...fixture.actions, raid: { ...fixture.actions.raid!, healthRate: -1 } } };
const raid = content.actions.raid!;
const live = (s: GameState) => setPaused(s, 'none');
/** The raid closes its page (spec 2026-09-24-pages): these tests are about the fight, so they start past the rows it waits on. */
const raidPage = built(newState(content.roster), 'hull', 'satchel', 'gate').completedOneTime;
const entry = (over: Partial<QueueEntry> = {}): QueueEntry => ({ id: 0, actionId: 'raid', mode: 'once', by: 'player', ...over });
const at = (extra: Partial<GameState> = {}): GameState =>
  live({ ...newState(content.roster), completedOneTime: raidPage, inventory: { pass: 1 }, queue: [entry()], nextEntryId: 1, work: { raid: { progress: 5, costsConsumed: 0 } }, ...extra });
/** The raid forced and fought for its window from `s`: does the life end? The game's own ticks, as the oracle. */
const diesFighting = (s: GameState) => {
  let cur: GameState = { ...s, queue: [entry({ forced: true })] };
  for (let i = fightWindow(s, content, raid); i > 0 && !cur.dead; i--) cur = step(cur, content);
  return cur.dead;
};
/** The lowest health, to 1e-9, at which the raid would not kill from `s`; just under it, it would. */
const threshold = (s: GameState) => {
  let lo = 0, hi = s.maxHealth;
  while (hi - lo > 1e-9) { const mid = (lo + hi) / 2; if (wouldKill({ ...s, health: mid }, content, raid)) lo = mid; else hi = mid; }
  return hi;
};
/** Health just under the threshold: about to die. */
const edge = (extra: Partial<GameState> = {}) => { const s = at(extra); return { ...s, health: threshold(s) - 1e-6 }; };
const fishOnJit = { completionCounts: { fish: unlockAt(content, content.actions.fish!) }, automation: { fish: 'jit' as const } };

describe('about to die (#74, spec 2026-09-24 section 3.1)', () => {
  it('would kill agrees with fighting the window out, across health, with and without food in the pack', () => {
    for (const inventory of [{ pass: 1 }, { pass: 1, fish: 3 }] as readonly Record<string, number>[]) {
      const s = at({ inventory });
      for (let h = 0.05; h < 3; h += 0.05) expect(wouldKill({ ...s, health: h }, content, raid), `health ${h}`).toBe(diesFighting({ ...s, health: h }));
    }
  });
  it('health exactly one tick\'s drain would kill: the edge is inclusive, as the tick\'s own <= 0 is', () => {
    const lone: Content = { ...content, chapters: [withOrder(content.chapters[0]!, ['raid']), content.chapters[1]!] };
    const s = at();
    const oneTick = damagePerTick(s.runTicks + 1, s.decayMultiplier) + 1 / ticksPerSecond();
    expect(wouldKill({ ...s, health: oneTick }, lone, raid)).toBe(true);
    expect(step({ ...s, health: oneTick }, lone).dead).toBe(true);
  });
  it('food in the pack lowers the health at which a fight backs off', () => {
    expect(threshold(at({ inventory: { pass: 1, fish: 3 } }))).toBeLessThan(threshold(at()));
  });
  it('the window is one food unit plus one, and never less than a tick', () => {
    const s = at();
    const fishTicks = Math.ceil(content.actions.fish!.expCost / step(live(enqueue(newState(content.roster), content, 'fish')), content).work.fish!.progress);
    expect(fightWindow(s, content, raid)).toBe(fishTicks + 1);
    expect(fightWindow({ ...s, work: { raid: { progress: raid.expCost - 1e-9, costsConsumed: 0 } } }, content, raid)).toBe(1);
  });
  it('a fight that would win first does not back off', () => {
    const s = at({ work: { raid: { progress: raid.expCost - 1e-9, costsConsumed: 0 } } });
    const oneTick = damagePerTick(1, 1) + 1 / ticksPerSecond();
    expect(wouldKill({ ...s, health: oneTick * 2 }, content, raid)).toBe(false);
    expect(wouldKill({ ...at(), health: oneTick * 2 }, content, raid)).toBe(true);   // the same health, far from done
    const after = step({ ...s, health: oneTick * 2 }, content);
    expect(after.completedOneTime).toContain('raid');
  });
  it('a row that does not hurt never would kill', () => {
    expect(wouldKill({ ...at(), health: 0.0001 }, content, content.actions.fish!)).toBe(false);
  });
});

describe('the three cases (section 3.2)', () => {
  it('1. an automated harvest runs once in front of the fight, which stays queued with its progress', () => {
    const s = edge({ ...fishOnJit, inventory: { pass: 1, fish: 1 } });   // a fish in hand: no food-out fill goes first
    const after = step(s, content);
    expect(after.queue.map((e) => [e.actionId, e.mode, e.by])).toEqual([['fish', 'once', 'auto'], ['raid', 'once', 'player']]);
    expect(after.events).toContainEqual({ type: 'automated', actionId: 'fish', why: 'delay' });
    expect(after.runTicks).toBe(s.runTicks + 1);
    expect(after.work.raid!.progress).toBe(5);
  });
  it('2. with no automation but a row to run, the fight leaves the queue, keeps its progress, and time stops', () => {
    const s = edge();
    const after = step(s, content);
    expect(after.queue).toEqual([]);
    expect(after.events).toContainEqual({ type: 'popped', actionId: 'raid', reason: 'hurt' });
    expect(after.runTicks).toBe(s.runTicks);
    expect(after.dead).toBe(false);
    expect(after.work.raid!.progress).toBe(5);
    expect(step(after, content)).toBe(after);   // settled: an idle step is the same object
  });
  it('3. with nothing else that can run, the fight goes on', () => {
    const lone: Content = { ...content, chapters: [withOrder(content.chapters[0]!, ['raid']), content.chapters[1]!] };
    const t = { ...at(), health: 0.05 };   // no food row here: the window is one tick, and one tick of raid takes more
    expect(wouldKill(t, lone, raid)).toBe(true);
    expect(playBlock({ ...t, queue: [] }, lone, 'raid')).toBeNull();   // the only row left: play is not refused
    const after = step(t, lone);
    expect(after.queue.map((e) => e.actionId)).toEqual(['raid']);
    expect(after.runTicks).toBe(t.runTicks + 1);
  });
  it('a harvest reached only through a fight buys no time (panel round two: that chain froze the game)', () => {
    // Tolls need a pass; the gate makes it and hurts. Tolls can start by the book, through the gate, but not calmly.
    const tolls: Content = {
      ...content,
      actions: {
        ...content.actions,
        gate: { ...content.actions.gate!, healthRate: -1 },
        tolls: { id: 'tolls', verb: 'salvage', noun: 'tolls', expCost: 1, producedItem: 'scrap', producedAmount: 1, itemCosts: [], needs: [{ item: 'pass', amount: 1 }], isOneTime: false },
      },
      chapters: [withOrder(content.chapters[0]!, ['fish', 'tolls', 'gate', 'raid']), content.chapters[1]!],
    };
    const counts = { tolls: unlockAt(tolls, tolls.actions.tolls!), gate: unlockAt(tolls, tolls.actions.gate!) };
    const s = { ...at({ completionCounts: counts, automation: { tolls: 'jit' as const, gate: 'jit' as const }, completedOneTime: [] }), inventory: {} };
    expect(startBlock(s, tolls, 'tolls')).toBeNull();
    expect(delayFor(s, tolls, new Set())).toBeNull();
  });
  it('an automated fight that would kill, with no harvest to buy time, fights on though a row could be run by hand (the user)', () => {
    const gateHurts: Content = { ...content, actions: { ...content.actions, gate: { ...content.actions.gate!, healthRate: -1 } } };
    const gate = gateHurts.actions.gate!;
    const low = live({ ...newState(content.roster), health: 0.05, completionCounts: { gate: unlockAt(gateHurts, gate) }, automation: { gate: 'high' } });
    expect(wouldKill(low, gateHurts, gate)).toBe(true);
    expect(stops(low, gateHurts, gate)).toBe(false);
    const after = step(low, gateHurts);
    expect(after.queue.map((e) => e.actionId)).toEqual(['gate']);
    expect(after.runTicks).toBe(low.runTicks + 1);
    // Queued by hand with its chip off, the same fight stops instead.
    const byHand = live({ ...newState(content.roster), health: 0.05, queue: [{ id: 0, actionId: 'gate', mode: 'once', by: 'player' }], nextEntryId: 1 });
    expect(step(byHand, gateHurts).events).toContainEqual({ type: 'popped', actionId: 'gate', reason: 'hurt' });
  });
});

describe('what buys time (section 3.2 case 1)', () => {
  it('foods first: with fish and salvage both on JIT, the fish delays the fight even when salvage comes first in order', () => {
    const c: Content = { ...content, chapters: [withOrder(content.chapters[0]!, ['salvage', 'fish', 'hull', 'satchel', 'gate', 'raid']), content.chapters[1]!] };
    const both = { completionCounts: { fish: unlockAt(c, c.actions.fish!), salvage: unlockAt(c, c.actions.salvage!) }, automation: { fish: 'jit' as const, salvage: 'jit' as const } };
    expect(delayFor(edge({ ...both, inventory: { pass: 1, fish: 1 } }), c, new Set())).toBe('fish');
  });
  it('then the best rank: salvage on high goes before salvage on low when no food is automated', () => {
    const counts = { salvage: unlockAt(content, content.actions.salvage!) };
    const withAlt = { ...content, actions: { ...content.actions, salvage2: { ...content.actions.salvage!, id: 'salvage2' } },
      chapters: [withOrder(content.chapters[0]!, ['fish', 'salvage', 'salvage2', 'raid']), content.chapters[1]!] };
    const s = edge({ completionCounts: { ...counts, salvage2: unlockAt(content, content.actions.salvage!) }, automation: { salvage: 'low', salvage2: 'high' } });
    expect(delayFor(s, withAlt, new Set())).toBe('salvage2');
  });
  it('a one-time never buys time, though it is automated and could start', () => {
    const s = edge({ completionCounts: { gate: unlockAt(content, content.actions.gate!) }, automation: { gate: 'jit' }, inventory: {}, completedOneTime: [] });
    expect(startBlock(s, content, 'gate')).toBeNull();
    expect(delayFor(s, content, new Set())).toBeNull();
  });
  it('under case 1 play is accepted, since automation buys the time; under case 2 it is refused', () => {
    const one = { ...edge({ ...fishOnJit, inventory: { pass: 1, fish: 1 } }), queue: [] };
    expect(stops(one, content, raid)).toBe(false);
    expect(playBlock(one, content, 'raid')).toBeNull();
    const two = { ...edge(), queue: [] };
    expect(stops(two, content, raid)).toBe(true);
    expect(playBlock(two, content, 'raid')).toEqual({ kind: 'hurt' });
  });
  it('a JIT food whose input runs through a fight that would kill is not refilled on an empty queue (#79 review)', () => {
    // Stew needs the pass; the gate makes it and hurts.
    const c: Content = {
      ...content,
      items: { ...content.items, stew: { id: 'stew', name: 'stew', kind: 'food', healPerUnit: 4 } },
      actions: { ...content.actions, gate: { ...content.actions.gate!, healthRate: -1 },
        stew: { id: 'stew', verb: 'fish', noun: 'a stew', expCost: 1, producedItem: 'stew', producedAmount: 1, itemCosts: [], needs: [{ item: 'pass', amount: 1 }], isOneTime: false } },
      chapters: [withOrder(content.chapters[0]!, ['stew', 'gate']), content.chapters[1]!],
    };
    const s = live({ ...newState(content.roster), health: 0.05, inventory: { stew: 1 },
      completionCounts: { stew: unlockAt(c, c.actions.stew!), gate: unlockAt(c, c.actions.gate!) }, automation: { stew: 'jit', gate: 'jit' } });
    expect(wouldKill(s, c, c.actions.gate!)).toBe(true);
    expect(startBlock(s, c, 'stew')).toBeNull();
    expect(step(s, c)).toBe(s);
  });
  it('an automated fight still waits behind a harvest that buys time, and no play is refused on it', () => {
    const s = live({ ...newState(content.roster), completedOneTime: raidPage, inventory: { pass: 1, fish: 1 }, foodCooldowns: { fish: 50 }, health: 0.5, work: { raid: { progress: 5, costsConsumed: 0 } },
      queue: [entry()], nextEntryId: 1, completionCounts: { raid: unlockAt(content, raid), fish: unlockAt(content, content.actions.fish!) }, automation: { raid: 'high', fish: 'jit' } });
    expect(wouldKill(s, content, raid)).toBe(true);
    const r = step(s, content);
    expect(r.queue.map((e) => e.actionId)).toEqual(['fish', 'raid']);
    expect(r.events).toContainEqual({ type: 'automated', actionId: 'fish', why: 'delay' });
    expect(playBlock({ ...s, queue: [], automation: { raid: 'high' } }, content, 'raid')).toBeNull();
  });
});

describe('code panel round two', () => {
  const salvageOnJit = { completionCounts: { salvage: unlockAt(content, content.actions.salvage!) }, automation: { salvage: 'jit' as const } };
  it('a harvest the player would not live through buys no time: the fight stops instead of draining them to death', () => {
    const doomed = at({ ...salvageOnJit, health: 0.05 });
    expect(wouldKill(doomed, content, raid)).toBe(true);
    expect(delayFor(doomed, content, new Set())).toBeNull();
    const after = step(doomed, content);
    expect(after.events).toContainEqual({ type: 'popped', actionId: 'raid', reason: 'hurt' });
    expect(after.dead).toBe(false);
    // With the health to live through it, salvage does buy time.
    const spare = edge(salvageOnJit);
    expect(delayFor(spare, content, new Set())).toBe('salvage');
  });
  it('a delay is tied to its fight and leaves with it', () => {
    const s = step(edge({ ...fishOnJit, inventory: { pass: 1, fish: 1 } }), content);
    const fight = s.queue.find((e) => e.actionId === 'raid')!;
    expect(s.queue[0]).toMatchObject({ actionId: 'fish', for: fight.id });
    expect(removeEntry(s, fight.id).queue).toEqual([]);
  });
});

describe('code panel round three', () => {
  const guarded: Content = {
    ...content,
    actions: { ...content.actions, gate: { ...content.actions.gate!, healthRate: -1 },
      door: { id: 'door', verb: 'rig', noun: 'the door', expCost: 1, itemCosts: [], needs: [{ item: 'pass', amount: 1 }], isOneTime: true } },
    chapters: [withOrder(content.chapters[0]!, ['fish', 'salvage', 'gate', 'door', 'raid']), content.chapters[1]!],
  };
  const gateJit = { gate: unlockAt(guarded, guarded.actions.gate!) };
  it('Shift on a fight carries through the fight that supplies it: the gate is forced too, and time passes', () => {
    // The raid closes the page, so it pulls the gate as a page prerequisite, not as its pass's supply (spec
    // 2026-09-24-pages section 4.2). The wardens are a fight the page does not close, listed after the gate,
    // needing its pass: the gate comes to them through the item supply.
    const warded: Content = {
      ...guarded,
      actions: { ...guarded.actions,
        wardens: { id: 'wardens', verb: 'fight', noun: 'the wardens', expCost: 1, itemCosts: [], needs: [{ item: 'pass', amount: 1 }], isOneTime: true, healthRate: -1 } },
      chapters: [withOrder(guarded.chapters[0]!, ['fish', 'salvage', 'gate', 'door', 'wardens', 'raid']), guarded.chapters[1]!],
    };
    const s = live({ ...newState(content.roster), health: 0.3, completionCounts: gateJit, automation: { gate: 'jit' } });
    expect(wouldKill(s, warded, warded.actions.gate!)).toBe(true);
    const forced = enqueue(s, warded, 'wardens', { once: true });
    expect(forced.queue[0]).toMatchObject({ actionId: 'wardens', forced: true });
    const after = step(forced, warded);
    expect(after.queue[0]).toMatchObject({ actionId: 'gate', by: 'auto', forced: true, for: forced.queue[0]!.id });
    expect(after.events).toContainEqual({ type: 'automated', actionId: 'gate', why: 'supply' });
    expect(after.runTicks).toBe(s.runTicks + 1);
  });
  it('Shift on the raid, which closes the page, pulls the gate as a page prerequisite, and does not force it', () => {
    const s = live({ ...newState(content.roster), health: 0.3, completionCounts: gateJit, automation: { gate: 'jit' } });
    const forced = enqueue(s, guarded, 'raid', { once: true });
    expect(forced.queue[0]).toMatchObject({ actionId: 'raid', forced: true });
    const after = step(forced, guarded);
    expect(after.queue[0]).toMatchObject({ actionId: 'gate', by: 'auto', for: forced.queue[0]!.id });
    expect(after.queue[0]!.forced).toBeUndefined();
    expect(after.events).toContainEqual({ type: 'automated', actionId: 'gate', why: 'supply' });
  });
  it('a row behind an automated fight is never refused: the fight it needs fights on', () => {
    const s = live({ ...newState(content.roster), health: 0.3, completionCounts: gateJit, automation: { gate: 'jit' } });
    expect(wouldKill(s, guarded, guarded.actions.gate!)).toBe(true);
    expect(hurtBlock(s, guarded, 'door')).toBeNull();
    expect(playBlock(s, guarded, 'door')).toBeNull();
    const r = step(enqueue(s, guarded, 'door', { front: true }), guarded);
    expect(r.queue[0]).toMatchObject({ actionId: 'gate', by: 'auto' });
    expect(r.runTicks).toBe(s.runTicks + 1);
  });
});

describe('an automated fight yields to what is ranked above it (the user: "nothing of higher priority")', () => {
  // The raid closes its page and waits on the hull there (spec 2026-09-24-pages); here it is a fight the page
  // does not close, so the hull goes before it by rank alone, which is what these tests are about.
  const unclosed: Content = { ...content, chapters: [withOrder(content.chapters[0]!, ['fish', 'salvage', 'hull', 'satchel', 'raid', 'gate'], 'gate'), content.chapters[1]!] };
  const chips = { raid: unlockAt(unclosed, raid), hull: unlockAt(unclosed, unclosed.actions.hull!) };
  const at2 = (raidMode: 'low' | 'high', hullMode: 'top' | 'last') => ({ ...edge({ inventory: { pass: 1, scrap: 8 },
    completionCounts: chips, automation: { raid: raidMode, hull: hullMode }, completedOneTime: [] }) });
  it('a one-time ranked above the fight runs first, once, in front of it', () => {
    const s = at2('low', 'top');
    expect(delayFor(s, unclosed, new Set(), raid)).toBe('hull');
    const r = step(s, unclosed);
    expect(r.queue.map((e) => e.actionId)).toEqual(['hull', 'raid']);
    expect(r.events).toContainEqual({ type: 'automated', actionId: 'hull', why: 'delay' });
  });
  it('one ranked below it does not: the fight fights on', () => {
    const s = at2('high', 'last');
    expect(delayFor(s, unclosed, new Set(), raid)).toBeNull();
    const r = step(s, unclosed);
    expect(r.queue[0]).toMatchObject({ actionId: 'raid' });
    expect(r.runTicks).toBe(s.runTicks + 1);
  });
  it('one short of materials is no delay: its supply would run past what the player survives', () => {
    const s = { ...at2('low', 'top'), inventory: { pass: 1 }, completionCounts: { ...chips, salvage: unlockAt(unclosed, unclosed.actions.salvage!) }, automation: { raid: 'low' as const, hull: 'top' as const, salvage: 'mid' as const } };
    expect(startBlock(s, unclosed, 'hull')).toBeNull();   // it could start, through Salvage
    expect(delayFor(s, unclosed, new Set(), raid)).not.toBe('hull');
  });
  it('one at the same rank is not above it', () => {
    expect(delayFor({ ...at2('low', 'top'), automation: { raid: 'low', hull: 'low' } }, unclosed, new Set(), raid)).toBeNull();
  });
  it('a fight with its chip off takes only harvests, never a one-time', () => {
    expect(delayFor({ ...at2('low', 'top'), automation: { hull: 'top' } }, unclosed, new Set(), raid)).toBeNull();
  });
});

describe('a forced fight takes no detours', () => {
  it('Shift skips the delay a harvest would otherwise buy', () => {
    const base = edge({ ...fishOnJit, inventory: { pass: 1, fish: 1 } });
    expect(step(base, content).events).toContainEqual({ type: 'automated', actionId: 'fish', why: 'delay' });
    const forced = step({ ...base, queue: [entry({ forced: true })] }, content);
    expect(forced.events.some((e) => e.type === 'automated' && e.why === 'delay')).toBe(false);
    expect(forced.queue[0]).toMatchObject({ actionId: 'raid' });
  });
});

describe('settled while a fight would kill (panel round two: the state churned with no time passing)', () => {
  // The gate makes the pass and hurts; the door needs the pass and does not. Fish are full, so nothing else runs.
  const churn: Content = {
    ...content,
    actions: {
      ...content.actions,
      gate: { ...content.actions.gate!, healthRate: -1 },
      door: { id: 'door', verb: 'rig', noun: 'the door', expCost: 1, itemCosts: [], needs: [{ item: 'pass', amount: 1 }], isOneTime: true },
    },
    chapters: [withOrder(content.chapters[0]!, ['fish', 'gate', 'door', 'raid']), content.chapters[1]!],
  };
  const gate = churn.actions.gate!;
  const low = (automation: GameState['automation']) => live({
    ...newState(content.roster), health: 0.05, inventory: { fish: 200 },
    completionCounts: { gate: unlockAt(churn, gate), door: unlockAt(churn, churn.actions.door!) }, automation,
  });
  it('a JIT fight waits for demand (#79): with nothing asking for its pass, an idle step is the same object', () => {
    const s = low({ gate: 'jit' });
    expect(wouldKill(s, churn, gate)).toBe(true);
    expect(step(s, churn)).toBe(s);
  });
  it('a priority row that needs it pulls the automated fight, which fights on: time passes, no churn', () => {
    const s = low({ gate: 'jit', door: 'high' });
    const r = step(s, churn);
    expect(r.queue.map((e) => e.actionId)).toEqual(['gate', 'door']);
    expect(r.runTicks).toBe(s.runTicks + 1);
  });
});

describe('Shift forces (section 3.3)', () => {
  it('Shift on a hurting row queues it forced; a plain press, a row that does not hurt, or automation does not', () => {
    const base = live({ ...newState(content.roster), inventory: { pass: 1 } });
    expect(enqueue(base, content, 'raid', { once: true }).queue[0]!.forced).toBe(true);
    expect(enqueue(base, content, 'raid').queue[0]!.forced).toBeUndefined();
    expect(enqueue(base, content, 'fish', { once: true }).queue[0]!.forced).toBeUndefined();
    // A hurting repeatable forces too: its refusal names Shift+play, so Shift+play must keep that promise.
    const hurtingSalvage: Content = { ...content, actions: { ...content.actions, salvage: { ...content.actions.salvage!, healthRate: -1 } } };
    expect(enqueue(base, hurtingSalvage, 'salvage', { once: true }).queue[0]!.forced).toBe(true);
    expect(enqueue(base, content, 'raid', { once: true, by: 'auto' }).queue[0]!.forced).toBeUndefined();
  });
  it('a forced fight is fought to the death, and the card names it', () => {
    const s = edge({ queue: [entry({ forced: true })] });
    let cur = s;
    for (let i = 0; i < 100 && !cur.dead; i++) cur = step(cur, content);
    expect(cur.dead).toBe(true);
    expect(deathSummary(cur, content).during).toBe('raid');
  });
  it('play is refused with hurt on a fight that would back off; Shift+play passes', () => {
    const s = { ...edge(), queue: [] };
    expect(playBlock(s, content, 'raid')).toEqual({ kind: 'hurt' });
    expect(playBlock(s, content, 'raid', true)).toBeNull();
    expect(playBlock({ ...s, health: 50 }, content, 'raid')).toBeNull();
  });
});

describe('hurts', () => {
  it('reads the sign: a healing row is not a fight', () => {
    expect(hurts({ ...fixture.actions.raid!, healthRate: 1 })).toBe(false);
    expect(hurts({ ...fixture.actions.raid!, healthRate: -1 })).toBe(true);
    expect(hurts({ ...fixture.actions.raid!, healthRate: undefined })).toBe(false);
  });
});
