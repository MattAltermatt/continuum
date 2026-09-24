import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import type { Content } from '../data/types';
import { capOf } from './effects';
import { fixture, withOrder } from './fixture';
import { newState } from './queue';
import { lookAheadTarget, reachOf, shortfall } from './rows';
import { unitThreshold } from './costs';
import type { GameState } from './types';

const content = fixture;
const cap = balance.inventory.stackCap;
const queued = (s: GameState, ...ids: string[]): GameState =>
  ({ ...s, queue: ids.map((actionId, id) => ({ id, actionId, mode: 'repeat' as const, by: 'player' as const })) });
const fresh = () => newState(content.roster);

describe('lookAheadTarget (section 2.3)', () => {
  it('sums what the entries below still need, down to the next maker, capped', () => {
    expect(lookAheadTarget(queued(fresh(), 'salvage', 'hull'), content, 0)).toBe(cap);
    expect(lookAheadTarget(queued(fresh(), 'salvage', 'satchel'), content, 0)).toBe(2);
    expect(lookAheadTarget(queued(fresh(), 'salvage', 'hull', 'salvage', 'satchel'), content, 0)).toBe(cap);
  });
  it('reads the kept progress of the row below', () => {
    const s = { ...queued(fresh(), 'salvage', 'hull'), work: { hull: { progress: 5, costsConsumed: 5 } } };
    expect(lookAheadTarget(s, content, 0)).toBe(3);
  });
  it('with nothing below needing it, the cap; a need counts; a capacity row raises the cap', () => {
    expect(lookAheadTarget(queued(fresh(), 'salvage'), content, 0)).toBe(cap);
    expect(lookAheadTarget(queued(fresh(), 'gate', 'raid'), content, 0)).toBe(1);
    expect(lookAheadTarget({ ...queued(fresh(), 'salvage'), completedOneTime: ['satchel'] }, content, 0)).toBe(10);
  });
  it('stops at the next maker of the item, below a cap that would not (the user: "on the last mine ... only a single stone")', () => {
    // A three-scrap hull: the hull and the satchel below the second Salvage (3 + 2) come to the cap, the hull alone does not.
    const c: Content = { ...content, actions: { ...content.actions, hull: { ...content.actions.hull!, itemCosts: [{ item: 'scrap', amount: 3 }] } } };
    expect(3 + 2).toBe(cap);
    expect(lookAheadTarget(queued(fresh(), 'salvage', 'hull', 'salvage', 'satchel'), c, 0)).toBe(3);
    expect(lookAheadTarget(queued(fresh(), 'salvage', 'satchel', 'salvage', 'hull'), content, 0)).toBe(2);
  });
  it('a material need below the cap counts as the amount to hold, once however many entries ask', () => {
    const c: Content = { ...content, actions: { ...content.actions, raid: { ...content.actions.raid!, needs: [{ item: 'scrap', amount: 3 }] } } };
    expect(lookAheadTarget(queued(fresh(), 'salvage', 'raid'), c, 0)).toBe(3);
    expect(lookAheadTarget(queued(fresh(), 'salvage', 'raid', 'raid'), c, 0)).toBe(3);
  });
  it('a one-time row queued twice counts once', () => {
    const s: GameState = { ...queued(fresh(), 'salvage', 'hull', 'hull'), completedOneTime: ['satchel'], work: { hull: { progress: 5, costsConsumed: 5 } } };
    expect(lookAheadTarget(s, content, 0)).toBe(3);
  });
  describe('a repeating consumer below', () => {
    /** Stew: a repeating row that turns one scrap into an eel. */
    const c: Content = {
      ...content,
      actions: { ...content.actions, stew: { id: 'stew', verb: 'fish', noun: 'a stew', expCost: 1, producedItem: 'eel', producedAmount: 1, itemCosts: [{ item: 'scrap', amount: 1 }], isOneTime: false } },
      chapters: [withOrder(content.chapters[0]!, [...content.chapters[0]!.pages[0]!.order, 'stew']), content.chapters[1]!],
    };
    const roomy = (s: GameState): GameState => ({ ...s, completedOneTime: ['satchel'], inventory: { eel: 7 } });
    it('owes its cost for every completion before its own output is full', () => {
      expect(capOf(roomy(fresh()), c, 'eel') - 7).toBe(3);
      expect(lookAheadTarget(roomy(queued(fresh(), 'salvage', 'stew')), c, 0)).toBe(3);
    });
    it('a single entry owes one completion, two single entries two, an automation fill its count left', () => {
      const once: GameState = { ...roomy(fresh()), queue: [{ id: 0, actionId: 'salvage', mode: 'repeat', by: 'player' }, { id: 1, actionId: 'stew', mode: 'once', by: 'player' }] };
      expect(lookAheadTarget(once, c, 0)).toBe(1);
      const twice: GameState = { ...once, queue: [...once.queue, { id: 2, actionId: 'stew', mode: 'once', by: 'player' }] };
      expect(lookAheadTarget(twice, c, 0)).toBe(2);
      const fill: GameState = { ...roomy(fresh()), queue: [{ id: 0, actionId: 'salvage', mode: 'repeat', by: 'player' }, { id: 1, actionId: 'stew', mode: 'repeat', by: 'auto', left: 2 }] };
      expect(lookAheadTarget(fill, c, 0)).toBe(2);
    });
    it('a supply order fetches for the order it supplies alone: one completion, never a stack or a one-time below it', () => {
      const fill = { id: 1, actionId: 'stew', mode: 'repeat' as const, by: 'auto' as const, left: 3 };
      const supply = { id: 0, actionId: 'salvage', mode: 'repeat' as const, by: 'auto' as const, for: 1 };
      expect(lookAheadTarget({ ...roomy(fresh()), queue: [supply, fill] }, c, 0)).toBe(1);
      expect(lookAheadTarget({ ...roomy(fresh()), queue: [supply, { ...fill, by: 'player' as const, left: undefined }] }, c, 0)).toBe(1);
      // The round-three case: a one-time below the fill it supplies does not count (without the link: 1 + 2).
      expect(lookAheadTarget({ ...roomy(fresh()), completedOneTime: [], queue: [supply, fill, { id: 2, actionId: 'satchel', mode: 'once' as const, by: 'player' as const }] }, c, 0)).toBe(1);
      // A one-time it supplies: what it still owes (the hull with 5 of its 8 spent owes 3), capped; done, nothing.
      const hull = { id: 3, actionId: 'hull', mode: 'once' as const, by: 'player' as const };
      expect(lookAheadTarget({ ...fresh(), work: { hull: { progress: 5, costsConsumed: 5 } }, queue: [{ ...supply, for: 3 }, hull] }, c, 0)).toBe(3);
      expect(lookAheadTarget({ ...fresh(), queue: [{ ...supply, for: 3 }, hull] }, c, 0)).toBe(cap);
      expect(lookAheadTarget({ ...fresh(), completedOneTime: ['hull'], queue: [{ ...supply, for: 3 }, hull] }, c, 0)).toBe(0);
      // A need of the order it supplies: the amount to hold.
      const needy: Content = { ...c, actions: { ...c.actions, raid: { ...c.actions.raid!, needs: [{ item: 'scrap', amount: 3 }] } } };
      expect(lookAheadTarget({ ...fresh(), queue: [{ ...supply, for: 4 }, { id: 4, actionId: 'raid', mode: 'once' as const, by: 'player' as const }] }, needy, 0)).toBe(3);
      // Its order gone: nothing to fetch.
      expect(lookAheadTarget({ ...roomy(fresh()), queue: [{ ...supply, for: 9 }] }, c, 0)).toBe(0);
    });
    it('a full one owes nothing', () => {
      expect(lookAheadTarget({ ...roomy(queued(fresh(), 'salvage', 'stew')), inventory: { eel: 10 } }, c, 0)).toBe(10);
    });
  });
});

describe('reachOf', () => {
  const hull = content.actions.hull!;
  it('the XP cost when the pack pays every unit left, else the threshold of the first it cannot', () => {
    expect(reachOf({ ...fresh(), inventory: { scrap: 8 } }, hull)).toBe(hull.expCost);
    expect(reachOf({ ...fresh(), inventory: { scrap: 3 } }, hull)).toBe(unitThreshold(hull, 3));
    expect(reachOf(fresh(), hull)).toBe(unitThreshold(hull, 0));
  });
  it('counts from what the kept progress already spent', () => {
    const s: GameState = { ...fresh(), inventory: { scrap: 2 }, work: { hull: { progress: 5, costsConsumed: 5 } } };
    expect(reachOf(s, hull)).toBe(unitThreshold(hull, 7));
    expect(reachOf({ ...s, inventory: { scrap: 3 } }, hull)).toBe(hull.expCost);
  });
  it('counts each item from its own stock: two scrap then two brass, holding two scrap and one brass, stops at the fourth unit', () => {
    const two = { ...hull, itemCosts: [{ item: 'scrap', amount: 2 }, { item: 'brass', amount: 2 }] };
    expect(reachOf({ ...fresh(), inventory: { scrap: 2, brass: 1 } }, two)).toBe(unitThreshold(two, 3));
    expect(reachOf({ ...fresh(), inventory: { scrap: 1, brass: 5 } }, two)).toBe(unitThreshold(two, 1));
  });
  it('a row that costs nothing reaches its XP cost', () => {
    expect(reachOf(fresh(), content.actions.salvage!)).toBe(content.actions.salvage!.expCost);
  });
});

describe('shortfall', () => {
  const needy = { ...content.actions.hull!, needs: [{ item: 'pass', amount: 1 }] };
  it('an unmet need comes before a cost', () => {
    expect(shortfall(fresh(), needy)).toEqual({ item: 'pass', amount: 1 });
  });
  it('amount is the whole remaining cost when none is on hand', () => {
    expect(shortfall({ ...fresh(), inventory: { pass: 1 } }, needy)).toEqual({ item: 'scrap', amount: 8 });
  });
  it('null once one unit is on hand', () => {
    expect(shortfall({ ...fresh(), inventory: { pass: 1, scrap: 1 } }, needy)).toBeNull();
  });
});
