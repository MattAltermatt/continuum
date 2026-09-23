import { SKILL_IDS } from '../data/types';
import type { SkillId } from '../data/types';
import type { SkillState } from '../engine/types';
import { SkillCell } from './SkillCell';

/** Twelve cells, four across, three rows, always the same order (spec 8.2). */
export function SkillsBand({ skills, runningSkill }: { skills: Readonly<Record<SkillId, SkillState>>; runningSkill: SkillId | null }) {
  return (
    <section className="skills" aria-label="skills">
      {SKILL_IDS.map((id) => <SkillCell key={id} id={id} state={skills[id]} running={id === runningSkill} />)}
    </section>
  );
}
