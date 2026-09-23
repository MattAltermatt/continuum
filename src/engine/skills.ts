/**
 * Dual mastery, MECHANICS section 3. Two ledgers advance from one amount of
 * effort per tick; each converts it to levels at its own rate. Pure.
 */
import { balance } from '../balance';
import type { Ledger, SkillState } from './types';

const { coreMastery, runMastery, expCurveExponent, baseTickExp } = balance.skills;

export function newSkill(): SkillState {
  return { core: { level: 0, exp: 0 }, run: { level: 0, exp: 0 } };
}

/** XP a ledger needs to go from `level` to `level + 1`. */
export function expToNextLevel(baseExp: number, level: number): number {
  return baseExp * Math.pow(expCurveExponent, level);
}

/** (1 + core x per-level) x (1 + run x per-level) x tool. */
export function multiplier(s: SkillState, tool = 1): number {
  return (1 + s.core.level * coreMastery.multiplierPerLevel)
    * (1 + s.run.level * runMastery.multiplierPerLevel)
    * tool;
}

/** XP earned by this skill in one tick of running its action. */
export function tickExp(s: SkillState, tool = 1): number {
  return baseTickExp * multiplier(s, tool);
}

function advance(ledger: Ledger, baseExp: number, exp: number): { ledger: Ledger; gained: number } {
  let level = ledger.level;
  let pool = ledger.exp + exp;
  let cost = expToNextLevel(baseExp, level);
  let gained = 0;
  while (pool >= cost) {
    pool -= cost;
    level += 1;
    gained += 1;
    cost = expToNextLevel(baseExp, level);
  }
  return { ledger: { level, exp: pool }, gained };
}

/** Add one tick's effort to BOTH ledgers. Not a split: the same amount twice. */
export function award(s: SkillState, exp: number): { skill: SkillState; coreLevelsGained: number } {
  const core = advance(s.core, coreMastery.baseExp, exp);
  const run = advance(s.run, runMastery.baseExp, exp);
  return { skill: { core: core.ledger, run: run.ledger }, coreLevelsGained: core.gained };
}
