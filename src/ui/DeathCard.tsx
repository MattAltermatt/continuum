import { Fragment } from 'react';
import { balance } from '../balance';
import { skillOf } from '../data/roster';
import type { Content } from '../data/types';
import type { DeathSummary } from '../engine/rebirth';
import { ticksToMinutes, ticksToSeconds } from '../engine/time';
import { clock, floored } from './format';
import { ARROW, MINUS } from './glyphs';
import { ICONS } from './icons';

/** The card is the ledger, to two decimals. Display precision, not tuning. */
const CARD_DECIMALS = 2;

export type CardContent = Pick<Content, 'roster' | 'chapters' | 'actions' | 'finish'>;

/** Each skill whose core moved, on one grid so the bars line up (mockup 2026-09-23-death-card). Nothing when none moved. */
export function CardGains({ summary, content }: { summary: DeathSummary; content: CardContent }) {
  if (summary.coreGains.length === 0) return null;
  return (
    <div className="card__gains">
      {summary.coreGains.map((g) => {
        const skill = skillOf(content, g.skill);
        const Icon = ICONS[skill.icon];
        return (
          <Fragment key={g.skill}>
            <Icon aria-hidden="true" size={14} />
            <b>{skill.name}</b>
            <div className="bar" aria-hidden="true"><div className="bar__fill" style={{ width: `${g.progress * 100}%` }} /></div>
            <span className="card__lv">core {g.from} {ARROW} <b>{g.to}</b></span>
          </Fragment>
        );
      })}
    </div>
  );
}

/**
 * Max health from and to, with the reason in full. Every number is floored, so
 * none reads higher than it is, and the gain shown is the difference of the two
 * shown values, so from + gain = to on the card.
 */
export function CardHealth({ summary }: { summary: DeathSummary }) {
  const at = clock(ticksToSeconds(summary.runTicks));
  const minutes = floored(ticksToMinutes(summary.runTicks), CARD_DECIMALS);
  const from = floored(summary.maxHealthFrom, CARD_DECIMALS);
  const to = floored(summary.maxHealthTo, CARD_DECIMALS);
  const gain = (Number(to) - Number(from)).toFixed(CARD_DECIMALS);
  return (
    <>
      <div className="card__hp"><span>max health</span><b>{from} {ARROW} <span className="card__new">{to}</span></b></div>
      <div className="card__why">+{gain} from {at} alive {'\u00B7'} {balance.rebirth.growthRate}^{minutes} {MINUS} 1</div>
    </>
  );
}

/**
 * Spec 2026-09-23 section 2.4 and its mockup: what the life bought, then a
 * button. The screen behind it already shows the next life; this shows gains
 * only. It names the port the life reached, and a death mid-fight says so
 * (spec 2026-09-23-the-windward-run sections 6.1 and 9; mockup
 * 2026-09-23-finish-card). A finish has its own card, FinishCard.
 */
export function DeathCard({ summary, content, onBegin }: { summary: DeathSummary; content: CardContent; onBegin: () => void }) {
  const title = `Life ${summary.life} ends`;
  const head = content.chapters[summary.chapter]?.head;
  const during = summary.during === null ? undefined : content.actions[summary.during];
  return (
    <div className="card" role="dialog" aria-modal="true" aria-label={title}>
      <div className="card__title">{title}</div>
      <div className="card__sub">{clock(ticksToSeconds(summary.runTicks))} on the clock</div>
      {(head !== undefined || during !== undefined) && (
        <div className="card__facts">
          {head !== undefined && <div>reached {head.numeral} {'\u00B7'} {head.chapter}</div>}
          {during !== undefined && <div className="hurt-text">fell during {skillOf(content, during.verb).name} {during.noun}</div>}
        </div>
      )}
      <CardGains summary={summary} content={content} />
      <div className="card__rule" />
      <CardHealth summary={summary} />
      <button type="button" className="card__begin" autoFocus onClick={onBegin}>Begin life {summary.life + 1}</button>
      <div className="card__quiet">pack, food, queue and run levels start over</div>
    </div>
  );
}
