import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import { cycleOf, isUnlocked, makersOf, modeOf, nextMode, setAutomation, unlockAt } from './automation';
import { fixture } from './fixture';
import { newState } from './queue';
import type { GameState } from './types';

const content = fixture;
const fresh = () => newState(content.roster);
const earned = (s: GameState, ...ids: string[]): GameState =>
  ({ ...s, completionCounts: { ...s.completionCounts, ...Object.fromEntries(ids.map((id) => [id, unlockAt(content, content.actions[id]!)])) } });

describe('earning a chip', () => {
  it('a repeatable at balance.automation.unlockRepeatable, a one-time at unlockOneTime', () => {
    const salvage = content.actions.salvage!;
    const hull = content.actions.hull!;
    const { unlockRepeatable, unlockOneTime } = balance.automation;
    expect(unlockAt(content, salvage)).toBe(unlockRepeatable);
    expect(unlockAt(content, hull)).toBe(unlockOneTime);
    expect(isUnlocked({ ...fresh(), completionCounts: { salvage: unlockRepeatable - 1 } }, content, salvage)).toBe(false);
    expect(isUnlocked({ ...fresh(), completionCounts: { salvage: unlockRepeatable } }, content, salvage)).toBe(true);
    expect(isUnlocked({ ...fresh(), completionCounts: { hull: unlockOneTime - 1 } }, content, hull)).toBe(false);
    expect(isUnlocked({ ...fresh(), completionCounts: { hull: unlockOneTime } }, content, hull)).toBe(true);
  });
  it('modeOf reads off for a row whose mode is set but not earned', () => {
    expect(modeOf({ ...fresh(), automation: { salvage: 'jit' } }, content, content.actions.salvage!)).toBe('off');
  });
});

describe('the cycle', () => {
  it('salvage has JIT; the vault (makes nothing anyone uses) does not; last wraps to off', () => {
    expect(cycleOf(content, content.actions.salvage!)).toEqual(['off', 'jit', 'top', 'high', 'mid', 'low', 'last']);
    expect(cycleOf(content, content.actions.vault!)).not.toContain('jit');
    expect(nextMode(content, content.actions.salvage!, 'last')).toBe('off');
  });
  it('setAutomation refuses before unlock and outside the cycle, accepts otherwise, and is the same object when unchanged', () => {
    const s = fresh();
    expect(setAutomation(s, content, 'salvage', 'jit')).toBe(s);
    const vault = earned(s, 'vault');
    expect(setAutomation(vault, content, 'vault', 'jit')).toBe(vault);
    const on = setAutomation(earned(s, 'salvage'), content, 'salvage', 'jit');
    expect(on.automation.salvage).toBe('jit');
    expect(setAutomation(on, content, 'salvage', 'jit')).toBe(on);
  });
});

describe('makersOf', () => {
  it("lists the port's rows that make an item and are not done", () => {
    expect(makersOf(fresh(), content, 'scrap').map((a) => a.id)).toEqual(['salvage']);
    expect(makersOf(fresh(), content, 'pass').map((a) => a.id)).toEqual(['gate']);
    expect(makersOf({ ...fresh(), completedOneTime: ['gate'] }, content, 'pass')).toEqual([]);
    // eels make eel, but only in chapter II
    expect(makersOf(fresh(), content, 'eel')).toEqual([]);
    expect(makersOf({ ...fresh(), chapter: 1 }, content, 'eel').map((a) => a.id)).toEqual(['eels']);
  });
});

describe('unlockAt', () => {
  const row = { id: 'r', verb: 'fish', noun: '', expCost: 1, itemCosts: [], isOneTime: false } as const;
  const once = { ...row, id: 'o', isOneTime: true } as const;
  it('falls back to balance by kind', () => {
    expect(unlockAt(fixture, row)).toBe(balance.automation.unlockRepeatable);
    expect(unlockAt(fixture, once)).toBe(balance.automation.unlockOneTime);
  });
  it("a book's counts override balance, by kind", () => {
    const book = { ...fixture, automation: { unlockRepeatable: 3, unlockOneTime: 2 } };
    expect(unlockAt(book, row)).toBe(3);
    expect(unlockAt(book, once)).toBe(2);
    expect(unlockAt({ ...fixture, automation: { unlockOneTime: 2 } }, row)).toBe(balance.automation.unlockRepeatable);
  });
  it("a row's own count overrides its book, whatever the kind", () => {
    const book = { ...fixture, automation: { unlockRepeatable: 3, unlockOneTime: 2 } };
    expect(unlockAt(book, { ...row, unlockAt: 1 })).toBe(1);
    expect(unlockAt(book, { ...once, unlockAt: 7 })).toBe(7);
    expect(isUnlocked({ ...newState(fixture.roster), completionCounts: { r: 1 } }, book, { ...row, unlockAt: 1 })).toBe(true);
    expect(isUnlocked({ ...newState(fixture.roster), completionCounts: { o: 2 } }, book, { ...once, unlockAt: 7 })).toBe(false);
  });
});
