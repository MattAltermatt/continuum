/**
 * Death and rebirth, MECHANICS section 5 and spec 2026-09-23 sections 2-3.
 * What resets, what persists, and what the life bought. Pure.
 */
import { balance } from '../balance';
import { SKILL_IDS, type SkillId } from '../data/types';
import { newState } from './queue';
import { expToNextLevel, newSkill } from './skills';
import { ticksToMinutes } from './time';
import type { GameState, SkillState } from './types';

/** Max health one death earns: growthRate ^ minutes alive - 1. Fractional; nothing is floored. */
export function rebirthGain(runTicks: number): number {
  return Math.pow(balance.rebirth.growthRate, ticksToMinutes(runTicks)) - 1;
}

export interface CoreGain {
  readonly skill: SkillId;
  readonly from: number;
  readonly to: number;
  /** Progress toward the next core level, 0..1, for the card's bar. */
  readonly progress: number;
}

/** What the death card shows: gains only (spec 2.4). */
export interface DeathSummary {
  readonly life: number;
  readonly runTicks: number;
  readonly gain: number;
  readonly maxHealthFrom: number;
  readonly maxHealthTo: number;
  readonly coreGains: readonly CoreGain[];
}

function maxHealthFor(rebirthBonus: number): number {
  return balance.health.base + rebirthBonus;
}

export function deathSummary(dead: GameState): DeathSummary {
  const gain = rebirthGain(dead.runTicks);
  const coreGains = SKILL_IDS
    .filter((id) => dead.skills[id].core.level > dead.lifeStartCore[id])
    .map((id) => {
      const core = dead.skills[id].core;
      return { skill: id, from: dead.lifeStartCore[id], to: core.level, progress: core.exp / expToNextLevel(balance.skills.coreMastery.baseExp, core.level) };
    });
  // From and to are computed the same way (Revision 1, accepted risk 1).
  return { life: dead.life, runTicks: dead.runTicks, gain, maxHealthFrom: maxHealthFor(dead.rebirthBonus), maxHealthTo: maxHealthFor(dead.rebirthBonus + gain), coreGains };
}

/**
 * The next life. Resets everything a life owns, keeps what the game owns, and
 * starts on a system pause the death card's Begin lifts. A state that is not
 * dead comes back unchanged.
 */
export function rebirth(dead: GameState): GameState {
  if (!dead.dead) return dead;
  const rebirthBonus = dead.rebirthBonus + rebirthGain(dead.runTicks);
  const maxHealth = maxHealthFor(rebirthBonus);
  const skills = Object.fromEntries(SKILL_IDS.map((id) => [id, { core: dead.skills[id].core, run: newSkill().run }])) as Record<SkillId, SkillState>;
  const lifeStartCore = Object.fromEntries(SKILL_IDS.map((id) => [id, skills[id].core.level])) as Record<SkillId, number>;
  return {
    ...newState(),
    paused: 'system',
    life: dead.life + 1,
    rebirthBonus,
    maxHealth,
    health: maxHealth,
    skills,
    completionCounts: dead.completionCounts,
    lifeStartCore,
  };
}
