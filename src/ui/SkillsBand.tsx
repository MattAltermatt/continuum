import type { Content, SkillId } from '../data/types';
import type { GameState } from '../engine/types';
import { Region } from './Region';
import { SkillCell, type LedgerMode } from './SkillCell';

/**
 * The book's whole roster, in roster order, from life 1 (spec 2026-09-23
 * section 2). It takes the whole state: each cell's pop-out reads the
 * counters and the gear (spec 2026-09-23-the-windward-run section 8). The
 * region is named `roster`: `skills` is the sheet around it (spec 2026-09-25
 * section 4.7), and a label is one thing.
 */
export function SkillsBand({ content, state, runningSkill, ledger = 'popout' }: {
  content: Content; state: GameState; runningSkill: SkillId | null;
  /** Where each cell's ledger goes: a pop-out in the desktop's column, inline in the sheet. */
  ledger?: LedgerMode;
}) {
  // Only the top entry works, so while a skill runs the top is its row.
  const top = state.queue[0] === undefined ? undefined : content.actions[state.queue[0].actionId];
  const row = top !== undefined && top.verb === runningSkill ? top : null;
  return (
    <Region name="roster" className="skills">
      {content.roster.map((s) => {
        const running = s.id === runningSkill;
        // The running one lit, the rest dimmed (spec 2026-09-25 section 4.7).
        return <SkillCell key={s.id} skill={s} content={content} state={state} running={running} row={running ? row : null} idle={!running} ledger={ledger} />;
      })}
    </Region>
  );
}
