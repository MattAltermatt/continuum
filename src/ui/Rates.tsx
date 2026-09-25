import { hpClass, hpRate } from './format';
import { RISING } from './glyphs';
import { Region } from './Region';

/**
 * Spec 8.6, 2026-09-23 section 4.1, 2026-09-23-the-windward-run section 6.1
 * and 2026-09-24-proving-ground section 1. Each line true this second;
 * nothing predicts. Decay, and while a row with a health rate runs, its rate,
 * signed (`row`, labelled by `rowBy`, its skill): red for a drain, green for
 * a heal. The food line's colour is the one judgement: green when the larder
 * and any heal cover everything draining health this second, decay plus a
 * drain; red when they do not. There is no net line (plan Revision 2). A
 * stopped clock dims the chunk and keeps the rates that apply when it
 * restarts.
 */
export function Rates({ decay, ceiling, row = 0, rowBy = 'row', stopped }: {
  decay: number; ceiling: number; row?: number; rowBy?: string; stopped: boolean;
}) {
  const covered = ceiling + Math.max(0, row) >= decay + Math.max(0, -row);
  const shown = row !== 0;
  return (
    <Region name="rates" className={`rates${stopped ? ' rates--stopped' : ''}`}>
      <div className="rates__kv">
        <span className="ink-2">decay</span><span className="rates__v hurt-text">{`${hpRate(-decay)} ${RISING}`}</span>
        <span className="ink-2">food, up to</span><span className={`rates__v ${covered ? 'rates__food--covers' : 'rates__food--short'}`}>{hpRate(ceiling)}</span>
        {/* The third line keeps its box while blank, so a fight starting or ending does not move the chunks below. */}
        <span className={`ink-2${shown ? '' : ' rates__blank'}`} aria-hidden={shown ? undefined : 'true'}>{shown ? rowBy : '\u00A0'}</span>
        <span className={`rates__v ${hpClass(row)}${shown ? '' : ' rates__blank'}`} aria-hidden={shown ? undefined : 'true'}>{shown ? hpRate(row) : '\u00A0'}</span>
      </div>
    </Region>
  );
}
