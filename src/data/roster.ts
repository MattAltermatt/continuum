import type { Content, SkillDefinition, SkillId } from './types';

/** The roster entry for a skill id. Throws: a validated book has one for every verb its rows use. */
export function skillOf(content: Pick<Content, 'roster'>, id: SkillId): SkillDefinition {
  const s = content.roster.find((d) => d.id === id);
  if (!s) throw new Error(`no skill "${id}" in the roster`);
  return s;
}
