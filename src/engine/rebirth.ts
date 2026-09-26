/**
 * Death and rebirth, MECHANICS section 5 and spec 2026-09-23 sections 2-3.
 * What resets, what persists, and what the life bought. Pure.
 */
import { balance } from '../balance';
import type { ActionId, Content, SkillId } from '../data/types';
import { blankRun } from './queue';
import { newSkill } from './skills';
import { ticksToMinutes } from './time';
import type { GameState, LifeRecord, SkillState } from './types';

/** Max health one death earns: growthRate ^ minutes alive - 1. Fractional; nothing is floored. */
export function rebirthGain(runTicks: number): number {
  return Math.pow(balance.rebirth.growthRate, ticksToMinutes(runTicks)) - 1;
}

/** What the death overlay reads besides the history: the life, its clock, its health from and to, where it ended (spec 2026-09-25-death-overlay). */
export interface DeathSummary {
  readonly life: number;
  readonly runTicks: number;
  readonly gain: number;
  readonly maxHealthFrom: number;
  readonly maxHealthTo: number;
  /** The port the life reached, an index into content.chapters (spec 2026-09-23-the-windward-run section 9). */
  readonly chapter: number;
  /** The life ended at the book's finish, not a death. */
  readonly finished: boolean;
  /** Times the book has been finished, this life's finish included. */
  readonly finishes: number;
  /** The row on top when the life ended, if it hurts: a death mid-fight (section 6.1). */
  readonly during: ActionId | null;
}

function maxHealthFor(rebirthBonus: number): number {
  return balance.health.base + rebirthBonus;
}

export function deathSummary(dead: GameState, content: Content): DeathSummary {
  const gain = rebirthGain(dead.runTicks);
  // From and to are computed the same way (Revision 1, accepted risk 1).
  // The dead state still holds its queue (rebirth clears it), so its top is what the life ended on.
  const top = dead.queue[0];
  const during = top !== undefined && (content.actions[top.actionId]?.healthRate ?? 0) < 0 ? top.actionId : null;
  return {
    life: dead.life, runTicks: dead.runTicks, gain, maxHealthFrom: maxHealthFor(dead.rebirthBonus), maxHealthTo: maxHealthFor(dead.rebirthBonus + gain),
    chapter: dead.chapter, finished: dead.finished, finishes: dead.finishes + (dead.finished ? 1 : 0), during,
  };
}

/** The life as it ended, for the death overlay's chart (#90). Its max health is the card's "to". */
export function lifeRecord(dead: GameState): LifeRecord {
  const core = Object.fromEntries(Object.keys(dead.skills).map((id) => [id, dead.skills[id]!.core.level]));
  return { life: dead.life, maxHealth: maxHealthFor(dead.rebirthBonus + rebirthGain(dead.runTicks)), core };
}

/**
 * The next life. Resets everything a life owns, keeps what the game owns, and
 * starts on a system pause the death overlay's Begin lifts. A state that is not
 * dead comes back unchanged.
 */
export function rebirth(dead: GameState): GameState {
  if (!dead.dead) return dead;
  const rebirthBonus = dead.rebirthBonus + rebirthGain(dead.runTicks);
  const maxHealth = maxHealthFor(rebirthBonus);
  const ids = Object.keys(dead.skills);
  const skills: Record<SkillId, SkillState> = Object.fromEntries(ids.map((id) => [id, { core: dead.skills[id]!.core, run: newSkill().run }]));
  const lifeStartCore: Record<SkillId, number> = Object.fromEntries(ids.map((id) => [id, skills[id]!.core.level]));
  return {
    ...blankRun(skills, lifeStartCore), paused: 'system', life: dead.life + 1, rebirthBonus, maxHealth, health: maxHealth,
    lives: [...dead.lives, lifeRecord(dead)],
    completionCounts: dead.completionCounts, automation: dead.automation, skillStats: dead.skillStats, lastVerb: dead.lastVerb,
    finishes: dead.finishes + (dead.finished ? 1 : 0),
  };
}
