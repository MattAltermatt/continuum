import { MINUS, RISING } from './glyphs';

/** Two decimals: the smallest decay shown is 0.10 hp/s. Display precision, not tuning. */
const RATE_DECIMALS = 2;

function signed(n: number): string {
  return `${n < 0 ? MINUS : '+'}${Math.abs(n).toFixed(RATE_DECIMALS)} hp/s`;
}

/**
 * Spec 8.6, 2026-09-23 section 4.1 and 2026-09-23-the-windward-run section
 * 6.1. Each line true this second; nothing predicts. Decay, and while a
 * hurting row runs, what it takes (`hurts`, labelled by `hurtsBy`, its skill).
 * The food line's colour is the one judgement: green when the larder covers
 * everything draining health this second, decay plus hurts; red when it does
 * not. There is no net line (plan Revision 2). A stopped clock dims the chunk
 * and keeps the rates that apply when it restarts.
 */
export function Rates({ decay, ceiling, hurts = 0, hurtsBy = 'hurts', stopped }: {
  decay: number; ceiling: number; hurts?: number; hurtsBy?: string; stopped: boolean;
}) {
  const covered = ceiling >= decay + hurts;
  const hurting = hurts > 0;
  return (
    <section className={`chunk rates${stopped ? ' rates--stopped' : ''}`} aria-label="rates">
      <div className="rates__kv">
        <span className="ink-2">decay</span><span className="rates__v hurt-text">{`${signed(-decay)} ${RISING}`}</span>
        <span className="ink-2">food, up to</span><span className={`rates__v ${covered ? 'rates__food--covers' : 'rates__food--short'}`}>{signed(ceiling)}</span>
        {/* The third line keeps its box while blank, so a fight starting or ending does not move the chunks below. */}
        <span className={`ink-2${hurting ? '' : ' rates__blank'}`} aria-hidden={hurting ? undefined : 'true'}>{hurting ? hurtsBy : '\u00A0'}</span>
        <span className={`rates__v hurt-text${hurting ? '' : ' rates__blank'}`} aria-hidden={hurting ? undefined : 'true'}>{hurting ? signed(-hurts) : '\u00A0'}</span>
      </div>
    </section>
  );
}
