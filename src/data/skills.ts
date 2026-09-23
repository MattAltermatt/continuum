import type { SkillId } from './types';

/** Display names for the twelve verbs. The verb is the skill (spec section 6). */
export const SKILLS: Readonly<Record<SkillId, { readonly name: string }>> = {
  forage: { name: 'Forage' }, chop: { name: 'Chop' }, mine: { name: 'Mine' }, fish: { name: 'Fish' }, shoot: { name: 'Shoot' },
  craft: { name: 'Craft' }, build: { name: 'Build' }, cook: { name: 'Cook' },
  fight: { name: 'Fight' }, travel: { name: 'Travel' }, talk: { name: 'Talk' }, search: { name: 'Search' },
};
