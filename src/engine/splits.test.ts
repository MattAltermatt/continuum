import { describe, expect, it } from 'vitest';
import { fixture } from './fixture';
import { enqueue, newState } from './queue';
import { rebirth } from './rebirth';
import { setPaused, step } from './tick';
import type { GameEvent, GameState } from './types';

/** Spec 2026-09-25-log-delta sections 3 and 6: a life's split times, and the last one on the completion event. */

const HULL_SCRAP = 8;
const live = (s: GameState): GameState => setPaused(s, 'none');
const fresh = (): GameState => live(newState(fixture.roster));
const withScrap = (s: GameState): GameState => ({ ...s, inventory: { ...s.inventory, scrap: HULL_SCRAP } });

type Completed = Extract<GameEvent, { type: 'completed' }>;

/** Steps until `id` completes; the state is the step that emitted it. */
function until(s: GameState, id: string): { state: GameState; event: Completed } {
  for (let i = 0; i < 10_000; i++) {
    s = step(s, fixture);
    const e = s.events.find((x): x is Completed => x.type === 'completed' && x.actionId === id);
    if (e !== undefined) return { state: s, event: e };
  }
  throw new Error(`${id} never completed`);
}

const hull = (s: GameState) => until(enqueue(withScrap(s), fixture, 'hull'), 'hull');
const die = (s: GameState): GameState => live(rebirth({ ...s, dead: true, health: 0 }));

describe('finishedAt: this life\'s split times', () => {
  it('a one-time completion stamps the tick of the step that completed it', () => {
    const { state } = hull(fresh());
    expect(state.finishedAt).toEqual({ hull: state.runTicks });
  });
  it('a repeatable completion stamps nothing', () => {
    const { state } = until(enqueue(fresh(), fixture, 'fish'), 'fish');
    expect(state.finishedAt).toEqual({});
  });
});

describe('lastAt on the completion event', () => {
  it('is the kept tick of the last life that finished the row', () => {
    const { event } = hull({ ...fresh(), lastFinish: { hull: 1500 } });
    expect(event.lastAt).toBe(1500);
  });
  it('is absent, not undefined, when no life has finished the row', () => {
    const { event } = hull(fresh());
    expect('lastAt' in event).toBe(false);
  });
  it('is never on a repeatable row, even one the map names', () => {
    const { event } = until(enqueue({ ...fresh(), lastFinish: { fish: 5 } }, fixture, 'fish'), 'fish');
    expect('lastAt' in event).toBe(false);
  });
  it('skips a life that did not reach the row: life 1 finishes, life 2 dies short, life 3 compares with life 1', () => {
    const one = hull(fresh());
    const two = die(one.state);
    const three = die(two);
    expect(three.life).toBe(3);
    expect(hull(three).event.lastAt).toBe(one.state.runTicks);
  });
  it('the same inputs in the next life finish sooner: the core exp carries (probe: 81 then 78 on the fixture)', () => {
    const one = hull(fresh());
    // Not a level: rig's core is still level 0 after life 1, with exp that crosses level 1 part way through life 2's hull.
    expect(one.state.skills.rig!.core.level).toBe(0);
    expect(one.state.skills.rig!.core.exp).toBeGreaterThan(0);
    const two = hull(die(one.state));
    expect(two.event.lastAt).toBe(one.state.runTicks);
    expect(two.state.runTicks).toBeLessThan(one.state.runTicks);
  });
});
