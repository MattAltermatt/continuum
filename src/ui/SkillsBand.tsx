import type { Content, SkillId } from '../data/types';
import type { SkillState } from '../engine/types';
import { SkillCell } from './SkillCell';

/** The book's whole roster, in roster order, from life 1 (spec 2026-09-23 section 2). */
export function SkillsBand({ content, skills, runningSkill }: {
  content: Pick<Content, 'roster'>; skills: Readonly<Record<SkillId, SkillState>>; runningSkill: SkillId | null;
}) {
  return (
    <section className="skills" aria-label="skills">
      {content.roster.map((s) => <SkillCell key={s.id} skill={s} state={skills[s.id]!} running={s.id === runningSkill} />)}
    </section>
  );
}
