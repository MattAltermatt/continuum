import type { Content, SkillId } from '../data/types';
import type { GameState } from '../engine/types';
import { SkillCell } from './SkillCell';

/**
 * The book's whole roster, in roster order, from life 1 (spec 2026-09-23
 * section 2). It takes the whole state: each cell's pop-out reads the
 * counters and the gear (spec 2026-09-23-the-windward-run section 8).
 */
export function SkillsBand({ content, state, runningSkill }: {
  content: Content; state: GameState; runningSkill: SkillId | null;
}) {
  // Only the top entry works, so while a skill runs the top is its row.
  const top = state.queue[0] === undefined ? undefined : content.actions[state.queue[0].actionId];
  const row = top !== undefined && top.verb === runningSkill ? top : null;
  return (
    <section className="skills" aria-label="skills">
      {content.roster.map((s) => {
        const running = s.id === runningSkill;
        return <SkillCell key={s.id} skill={s} content={content} state={state} running={running} row={running ? row : null} />;
      })}
    </section>
  );
}
