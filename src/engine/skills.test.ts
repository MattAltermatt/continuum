import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import { award, expToNextLevel, multiplier, newSkill, tickExp } from './skills';

const { coreMastery, runMastery, expCurveExponent, baseTickExp } = balance.skills;

describe('expToNextLevel', () => {
  it('matches the MECHANICS table: core 20 -> 21 costs 67.275, run 168.19', () => {
    expect(expToNextLevel(coreMastery.baseExp, 20)).toBeCloseTo(67.275, 3);
    expect(expToNextLevel(runMastery.baseExp, 20)).toBeCloseTo(168.187, 3);
  });
  it('is the base at level 0 and grows by the curve', () => {
    expect(expToNextLevel(coreMastery.baseExp, 0)).toBe(coreMastery.baseExp);
    expect(expToNextLevel(runMastery.baseExp, 1)).toBeCloseTo(runMastery.baseExp * expCurveExponent, 9);
  });
});

describe('multiplier and tickExp', () => {
  it('reproduces the MECHANICS worked example: core 10, run 5 -> 1.575 and 0.1575 per tick', () => {
    const s = { core: { level: 10, exp: 0 }, run: { level: 5, exp: 0 } };
    expect(multiplier(s)).toBeCloseTo(1.575, 9);
    expect(tickExp(s)).toBeCloseTo(0.1575, 9);
  });
  it('applies a tool multiplier and is 1.0 with nothing', () => {
    expect(multiplier(newSkill(), 1.25)).toBeCloseTo(1.25, 9);
    expect(multiplier(newSkill())).toBe(1);
    expect(tickExp(newSkill())).toBe(baseTickExp);
  });
});

describe('award', () => {
  it('adds the same amount to both ledgers', () => {
    const { skill } = award(newSkill(), 3);
    expect(skill.core.exp).toBe(3);
    expect(skill.run.exp).toBe(3);
  });
  it('levels core at its cheaper threshold, carries the excess, and reports the level', () => {
    const { skill, coreLevelsGained } = award(newSkill(), coreMastery.baseExp + 2);
    expect(skill.core.level).toBe(1);
    expect(skill.core.exp).toBeCloseTo(2, 9);
    expect(skill.run.level).toBe(0);
    expect(coreLevelsGained).toBe(1);
  });
  it('can level more than once from one award', () => {
    const big = expToNextLevel(coreMastery.baseExp, 0) + expToNextLevel(coreMastery.baseExp, 1) + 1;
    const { skill, coreLevelsGained } = award(newSkill(), big);
    expect(skill.core.level).toBe(2);
    expect(skill.core.exp).toBeCloseTo(1, 9);
    expect(coreLevelsGained).toBe(2);
  });
  it('never mutates its input', () => {
    const before = newSkill();
    award(before, 50);
    expect(before.core.level).toBe(0);
  });
});
