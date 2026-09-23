import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import { scrub, SCRUB_HEAD, SCRUB_ORDER } from './scrub';
import { SKILLS } from './skills';
import { SKILL_IDS } from './types';

describe('the Scrub', () => {
  it('has the four rows in display order, each with a defined action', () => {
    expect(SCRUB_ORDER).toEqual(['forage', 'mine', 'cabin', 'hall']);
    for (const id of SCRUB_ORDER) expect(scrub.actions[id]).toBeDefined();
  });
  it('the stone cap is below the cabin cost, so the stall is exercised', () => {
    expect(scrub.items.stone!.cap).toBeLessThan(scrub.actions.cabin!.itemCosts[0]!.amount);
  });
  it('the cabin slows the clock and carries a beat', () => {
    expect(scrub.actions.cabin!.healthDecayMultiplier).toBe(balance.content.scrub.cabin.decayMultiplier);
    expect(scrub.actions.cabin!.healthDecayMultiplier!).toBeLessThan(1);
    expect(scrub.actions.cabin!.beat!.length).toBeGreaterThan(0);
  });
  it('kinds: berries are food, stone a material, the cabin and the hall structures', () => {
    expect(scrub.items.berries!.kind).toBe('food');
    expect(scrub.items.stone!.kind).toBe('material');
    expect(scrub.items.cabin!.kind).toBe('structure');
    expect(scrub.items.hall!.kind).toBe('structure');
  });
  it('the hall is a one-time Build that sinks far more stone than the pack holds, and carries a beat', () => {
    const hall = scrub.actions.hall!;
    expect(hall.verb).toBe('build');
    expect(hall.isOneTime).toBe(true);
    expect(hall.itemCosts).toEqual([{ item: 'stone', amount: balance.content.scrub.hall.stone }]);
    expect(hall.itemCosts[0]!.amount).toBeGreaterThan(scrub.items.stone!.cap);
    expect(hall.beat!.length).toBeGreaterThan(0);
  });
  it('names all twelve skills and the running head', () => {
    for (const id of SKILL_IDS) expect(SKILLS[id].name.length).toBeGreaterThan(0);
    expect(SCRUB_HEAD.story.length).toBeGreaterThan(0);
    expect(SCRUB_HEAD.book).not.toBe(SCRUB_HEAD.chapter);
  });
});
