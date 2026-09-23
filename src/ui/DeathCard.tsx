import { balance } from '../balance';
import { SKILLS } from '../data/skills';
import type { DeathSummary } from '../engine/rebirth';
import { ticksToMinutes, ticksToSeconds } from '../engine/time';
import { Fragment } from 'react';
import { clock, floored } from './format';
import { ARROW, MINUS } from './glyphs';
import { SKILL_ICONS } from './icons';

/** The card is the ledger, to two decimals. Display precision, not tuning. */
const CARD_DECIMALS = 2;

/**
 * Spec 2026-09-23 section 2.4 and its mockup: what the life bought, then a
 * button. The screen behind it already shows the next life; this shows gains only.
 * Every number is floored, so none reads higher than it is, and the gain shown
 * is the difference of the two shown values, so from + gain = to on the card.
 */

export function DeathCard({ summary, onBegin }: { summary: DeathSummary; onBegin: () => void }) {
  const title = `Life ${summary.life} ends`;
  const at = clock(ticksToSeconds(summary.runTicks));
  const minutes = floored(ticksToMinutes(summary.runTicks), CARD_DECIMALS);
  const from = floored(summary.maxHealthFrom, CARD_DECIMALS);
  const to = floored(summary.maxHealthTo, CARD_DECIMALS);
  const gain = (Number(to) - Number(from)).toFixed(CARD_DECIMALS);
  return (
    <div className="card" role="dialog" aria-modal="true" aria-label={title}>
      <div className="card__title">{title}</div>
      <div className="card__sub">{at} on the clock</div>
      {summary.coreGains.length > 0 && (
        <div className="card__gains">
          {summary.coreGains.map((g) => {
            const Icon = SKILL_ICONS[g.skill];
            // One grid for every gain row, as the mockup has it, so the bars line up.
            return (
              <Fragment key={g.skill}>
                <Icon aria-hidden="true" size={14} />
                <b>{SKILLS[g.skill].name}</b>
                <div className="bar" aria-hidden="true"><div className="bar__fill" style={{ width: `${g.progress * 100}%` }} /></div>
                <span className="card__lv">core {g.from} {ARROW} <b>{g.to}</b></span>
              </Fragment>
            );
          })}
        </div>
      )}
      <div className="card__rule" />
      <div className="card__hp"><span>max health</span><b>{from} {ARROW} <span className="card__new">{to}</span></b></div>
      <div className="card__why">+{gain} from {at} alive {'·'} {balance.rebirth.growthRate}^{minutes} {MINUS} 1</div>
      <button type="button" className="card__begin" autoFocus onClick={onBegin}>Begin life {summary.life + 1}</button>
      <div className="card__quiet">pack, food, queue and run levels start over</div>
    </div>
  );
}
