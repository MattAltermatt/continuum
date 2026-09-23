import { MINUS, RISING } from './glyphs';

/** Two decimals: the smallest decay the Scrub shows is 0.10 hp/s. Display precision, not tuning. */
const RATE_DECIMALS = 2;

function signed(n: number): string {
  return `${n < 0 ? MINUS : '+'}${Math.abs(n).toFixed(RATE_DECIMALS)} hp/s`;
}

/**
 * Spec 8.6 and 2026-09-23 section 4.1. Two lines, each true this second;
 * nothing predicts. The food line's color is the one judgement: green when the
 * larder covers decay, red when it does not. There is no net line (plan
 * Revision 2). A stopped clock dims the chunk and keeps the rates that apply
 * when it restarts.
 */
export function Rates({ decay, ceiling, covered, stopped }: { decay: number; ceiling: number; covered: boolean; stopped: boolean }) {
  return (
    <section className={`chunk rates${stopped ? ' rates--stopped' : ''}`} aria-label="rates">
      <div className="rates__kv">
        <span className="ink-2">decay</span><span className="rates__v hurt-text">{`${signed(-decay)} ${RISING}`}</span>
        <span className="ink-2">food, up to</span><span className={`rates__v ${covered ? 'rates__food--covers' : 'rates__food--short'}`}>{signed(ceiling)}</span>
      </div>
    </section>
  );
}
