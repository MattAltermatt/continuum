import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import { cycleOf, isUnlocked, makersOf, modeOf, nextMode, setAutomation, unlockAt } from './automation';
import { fixture } from './fixture';
import { newState } from './queue';
import type { GameState } from './types';

const content = fixture;
const fresh = () => newState(content.roster);
const earned = (s: GameState, ...ids: string[]): GameState =>
  ({ ...s, completionCounts: { ...s.completionCounts, ...Object.fromEntries(ids.map((id) => [id, unlockAt(content.actions[id]!)])) } });

describe('earning a chip', () => {
  it('a repeatable at balance.automation.unlockRepeatable, a one-time at unlockOneTime', () => {
    const salvage = content.actions.salvage!;
    const hull = content.actions.hull!;
    const { unlockRepeatable, unlockOneTime } = balance.automation;
    expect(unlockAt(salvage)).toBe(unlockRepeatable);
    expect(unlockAt(hull)).toBe(unlockOneTime);
    expect(isUnlocked({ ...fresh(), completionCounts: { salvage: unlockRepeatable - 1 } }, salvage)).toBe(false);
    expect(isUnlocked({ ...fresh(), completionCounts: { salvage: unlockRepeatable } }, salvage)).toBe(true);
    expect(isUnlocked({ ...fresh(), completionCounts: { hull: unlockOneTime - 1 } }, hull)).toBe(false);
    expect(isUnlocked({ ...fresh(), completionCounts: { hull: unlockOneTime } }, hull)).toBe(true);
  });
  it('modeOf reads off for a row whose mode is set but not earned', () => {
    expect(modeOf({ ...fresh(), automation: { salvage: 'jit' } }, content.actions.salvage!)).toBe('off');
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
