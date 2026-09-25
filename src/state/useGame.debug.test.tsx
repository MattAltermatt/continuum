// @vitest-environment jsdom
/**
 * The dev-only actions the debug overlay dispatches (spec
 * 2026-09-24-screen-pass section 5.3): setSkill, setItem, earnChips and die,
 * beside the older setHealth. Reducer tests: each is a plain write, refused
 * on a dead run and on a value that makes no sense.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import { isUnlocked, unlockAt } from '../engine/automation';
import { feeding } from '../engine/health';
import { testBook } from '../test-utils/book';
import { useGame } from './useGame';

function open() {
  return renderHook(() => useGame(testBook, { storage: null }));
}

/** Ticks to one scrap at multiplier 1 (ten 0.1s are 0.999..., so +1). */
const ticksPerScrap = Math.floor(testBook.actions.salvage!.expCost / balance.skills.baseTickExp) + 1;

describe('setSkill', () => {
  it('sets the one ledger to the level with fresh XP and keeps the other', () => {
    const { result } = open();
    act(() => result.current.dispatch({ type: 'queue', actionId: 'fish' }));
    act(() => result.current.dispatch({ type: 'tick', n: 3 }));
    const before = result.current.state.skills.fish!;
    expect(before.core.exp).toBeGreaterThan(0);
    act(() => result.current.dispatch({ type: 'setSkill', skill: 'fish', ledger: 'run', level: 5 }));
    const after = result.current.state.skills.fish!;
    expect(after.run).toEqual({ level: 5, exp: 0 });
    expect(after.core).toEqual(before.core);
  });
  it('ignores an unknown skill, a negative level and a fractional one', () => {
    const { result } = open();
    const before = result.current.state;
    act(() => result.current.dispatch({ type: 'setSkill', skill: 'talk', ledger: 'core', level: 1 }));
    act(() => result.current.dispatch({ type: 'setSkill', skill: 'fish', ledger: 'core', level: -1 }));
    act(() => result.current.dispatch({ type: 'setSkill', skill: 'fish', ledger: 'core', level: 1.5 }));
    expect(result.current.state).toBe(before);
  });
});

describe('setItem', () => {
  it('writes the count and adds a new item to the end of the pack once', () => {
    const { result } = open();
    act(() => result.current.dispatch({ type: 'setItem', item: 'scrap', count: 3 }));
    expect(result.current.state.inventory.scrap).toBe(3);
    expect(result.current.state.acquired).toEqual(['scrap']);
    act(() => result.current.dispatch({ type: 'setItem', item: 'pass', count: 1 }));
    act(() => result.current.dispatch({ type: 'setItem', item: 'scrap', count: 40 }));
    expect(result.current.state.inventory.scrap).toBe(40);   // not clamped to the cap: an over-full stack can be tried
    expect(result.current.state.acquired).toEqual(['scrap', 'pass']);
  });
  it('a count of 0 for an item not yet carried leaves the pack alone', () => {
    const { result } = open();
    act(() => result.current.dispatch({ type: 'setItem', item: 'scrap', count: 0 }));
    expect(result.current.state.inventory.scrap).toBe(0);
    expect(result.current.state.acquired).toEqual([]);
  });
  it('on a food, leaves the cooldown as it was and the food reads as feeding', () => {
    const { result } = open();
    const cooldowns = result.current.state.foodCooldowns;
    act(() => result.current.dispatch({ type: 'setItem', item: 'fish', count: 2 }));
    expect(result.current.state.foodCooldowns).toBe(cooldowns);
    expect(feeding(result.current.state, 'fish')).toBe(true);
  });
  it('ignores an unknown item, a negative count and a fractional one', () => {
    const { result } = open();
    const before = result.current.state;
    act(() => result.current.dispatch({ type: 'setItem', item: 'gold', count: 1 }));
    act(() => result.current.dispatch({ type: 'setItem', item: 'scrap', count: -1 }));
    act(() => result.current.dispatch({ type: 'setItem', item: 'scrap', count: 0.5 }));
    expect(result.current.state).toBe(before);
    expect(result.current.state.inventory.gold).toBeUndefined();
  });
});

describe('earnChips', () => {
  it('raises every row on the page to its unlock count, so each reads as earned by the game\'s own rule', () => {
    const { result } = open();
    act(() => result.current.dispatch({ type: 'earnChips' }));
    const s = result.current.state;
    for (const id of testBook.chapters[0]!.pages[0]!.order) {
      const a = testBook.actions[id]!;
      expect(s.completionCounts[id]).toBe(unlockAt(testBook, a));
      expect(isUnlocked(s, testBook, a)).toBe(true);
    }
    // Earned, but no chip is set, so nothing queues by itself.
    expect(s.queue).toEqual([]);
  });
  it('keeps a count already past its unlock', () => {
    const { result } = open();
    const past = balance.automation.unlockRepeatable + 7;
    act(() => result.current.dispatch({ type: 'load', model: { ...{ state: { ...result.current.state, completionCounts: { fish: past } }, log: [], nextSeq: 0 } } }));
    act(() => result.current.dispatch({ type: 'earnChips' }));
    expect(result.current.state.completionCounts.fish).toBe(past);
  });
});

describe('die', () => {
  it('on a fresh idle game: dead, system-paused, one died line, and the card is up', () => {
    const { result } = open();
    const lines = result.current.log.length;
    act(() => result.current.dispatch({ type: 'die' }));
    expect(result.current.state.dead).toBe(true);
    expect(result.current.state.paused).toBe('system');
    expect(result.current.state.events).toEqual([{ type: 'died', runTicks: 0 }]);
    expect(result.current.log).toHaveLength(lines + 1);
    expect(result.current.log[0]!.event).toEqual({ type: 'died', runTicks: 0 });
    expect(result.current.card).not.toBeNull();
  });
  it('on a paused game too: the player pause becomes the system one, one line is added', () => {
    const { result } = open();
    act(() => result.current.dispatch({ type: 'pause' }));
    const lines = result.current.log.length;
    act(() => result.current.dispatch({ type: 'die' }));
    expect(result.current.state.dead).toBe(true);
    expect(result.current.state.paused).toBe('system');
    expect(result.current.log).toHaveLength(lines + 1);
    expect(result.current.card).not.toBeNull();
  });
  it('right after a tick that logged a completion, adds exactly one line: the last tick\'s events are not logged again', () => {
    const { result } = open();
    act(() => result.current.dispatch({ type: 'setItem', item: 'scrap', count: 8 }));
    act(() => result.current.dispatch({ type: 'queue', actionId: 'hull', once: true }));
    for (let i = 0; i < ticksPerScrap * 20 && !result.current.state.completedOneTime.includes('hull'); i++) act(() => result.current.dispatch({ type: 'tick' }));
    expect(result.current.state.completedOneTime).toContain('hull');
    expect(result.current.log[0]!.event).toMatchObject({ type: 'completed', actionId: 'hull' });
    act(() => result.current.dispatch({ type: 'pause' }));
    const lines = result.current.log.length;
    act(() => result.current.dispatch({ type: 'die' }));
    expect(result.current.log).toHaveLength(lines + 1);
    expect(result.current.log[0]!.event.type).toBe('died');
    expect(result.current.log.filter((l) => l.event.type === 'completed')).toHaveLength(1);
  });
});

describe('a dead run', () => {
  it('ignores all four', () => {
    const { result } = open();
    act(() => result.current.dispatch({ type: 'die' }));
    const dead = result.current.state;
    act(() => result.current.dispatch({ type: 'setSkill', skill: 'fish', ledger: 'core', level: 3 }));
    act(() => result.current.dispatch({ type: 'setItem', item: 'scrap', count: 3 }));
    act(() => result.current.dispatch({ type: 'earnChips' }));
    act(() => result.current.dispatch({ type: 'die' }));
    expect(result.current.state).toBe(dead);
  });
});

describe('setHealth', () => {
  it('clamps to the range: above max reads max, below zero reads zero, and zero is not a death', () => {
    const { result } = open();
    act(() => result.current.dispatch({ type: 'setHealth', health: 999 }));
    expect(result.current.state.health).toBe(result.current.state.maxHealth);
    act(() => result.current.dispatch({ type: 'setHealth', health: -5 }));
    expect(result.current.state.health).toBe(0);
    expect(result.current.state.dead).toBe(false);
    // The engine's own death takes it from there on the next working tick.
    act(() => result.current.dispatch({ type: 'queue', actionId: 'fish' }));
    act(() => result.current.dispatch({ type: 'tick' }));
    expect(result.current.state.dead).toBe(true);
    expect(result.current.state.paused).toBe('system');
  });
});

describe('the offered speeds', () => {
  it('setSpeed takes an offered speed and refuses any other', () => {
    const { result } = open();
    act(() => result.current.setSpeed(7));
    expect(result.current.speed).toBe(1);
    act(() => result.current.setSpeed(10));
    expect(result.current.speed).toBe(10);
  });
});
