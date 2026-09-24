import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import { saltRoad } from './salt-road';
import type { Book } from './types';
import { validateBook } from './validate';

describe('the Scrub', () => {
  it('is version 1, finishes at the hall, and claims five days', () => {
    expect(saltRoad.version).toBe(1);
    expect(saltRoad.finish).toBe('hall');
    expect(saltRoad.length).toEqual({ days: 5 });
  });
  it('has the four rows in display order, each with a defined action', () => {
    expect(saltRoad.chapters[0]!.order).toEqual(['forage', 'mine', 'cabin', 'hall']);
    for (const id of saltRoad.chapters[0]!.order) expect(saltRoad.actions[id]).toBeDefined();
  });
  it('the stone cap is below the cabin cost, so the stall is exercised', () => {
    expect(saltRoad.items.stone!.cap).toBeLessThan(saltRoad.actions.cabin!.itemCosts[0]!.amount);
  });
  it('the cabin slows the clock and carries a beat', () => {
    expect(saltRoad.actions.cabin!.healthDecayMultiplier).toBe(balance.content.scrub.cabin.decayMultiplier);
    expect(saltRoad.actions.cabin!.healthDecayMultiplier!).toBeLessThan(1);
    expect(saltRoad.actions.cabin!.beat!.length).toBeGreaterThan(0);
  });
  it('kinds: berries are food, stone a material, the cabin and the hall structures', () => {
    expect(saltRoad.items.berries!.kind).toBe('food');
    expect(saltRoad.items.stone!.kind).toBe('material');
    expect(saltRoad.items.cabin!.kind).toBe('structure');
    expect(saltRoad.items.hall!.kind).toBe('structure');
  });
  it('the hall is a one-time Build that sinks far more stone than the pack holds, and carries a beat', () => {
    const hall = saltRoad.actions.hall!;
    expect(hall.verb).toBe('build');
    expect(hall.isOneTime).toBe(true);
    expect(hall.itemCosts).toEqual([{ item: 'stone', amount: balance.content.scrub.hall.stone }]);
    expect(hall.itemCosts[0]!.amount).toBeGreaterThan(saltRoad.items.stone!.cap);
    expect(hall.beat!.length).toBeGreaterThan(0);
  });
  it('declares a roster of the three skills its rows use, and one chapter with a head', () => {
    expect(saltRoad.roster.map((s) => s.id)).toEqual(['forage', 'mine', 'build']);
    for (const s of saltRoad.roster) expect(s.name.length).toBeGreaterThan(0);
    expect(saltRoad.chapters).toHaveLength(1);
    expect(saltRoad.chapters[0]!.head.story.length).toBeGreaterThan(0);
    expect(saltRoad.name).not.toBe(saltRoad.chapters[0]!.head.chapter);
  });
  it('round-trips through JSON: the value is serializable, which is what a generator emits', () => {
    const copy = JSON.parse(JSON.stringify(saltRoad)) as Book;
    expect(copy).toEqual(saltRoad);
    expect(validateBook(copy)).toEqual([]);
  });
});
