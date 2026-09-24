import type { DeathSummary } from '../engine/rebirth';
import { ticksToSeconds } from '../engine/time';
import { CardGains, CardHealth, type CardContent } from './DeathCard';
import { clock } from './format';

/**
 * The book is finished (spec 2026-09-23-the-windward-run section 9; mockup
 * 2026-09-23-finish-card). The death card's frame and place: the book's name,
 * the finish row's beat in the running head's serif, the clock, what the life
 * gained, max health from and to, how many times the book has been finished,
 * and Read again, which starts the next life at chapter I as a death's Begin
 * does. The reset has already happened behind it.
 */
export function FinishCard({ summary, content, book, onReadAgain }: {
  summary: DeathSummary; content: CardContent; book: string; onReadAgain: () => void;
}) {
  const beat = content.actions[content.finish]?.beat;
  const first = content.chapters[0]?.head;
  return (
    <div className="card" role="dialog" aria-modal="true" aria-label={`${book}, finished`}>
      <div className="card__title">{book}</div>
      {beat !== undefined && <p className="card__line">{beat}</p>}
      <div className="card__sub">{clock(ticksToSeconds(summary.runTicks))} on the clock</div>
      <CardGains summary={summary} content={content} />
      <div className="card__rule" />
      <CardHealth summary={summary} />
      <div className="card__rule" />
      <div className="card__count">finished <b>{summary.finishes}{'\u00D7'}</b></div>
      <button type="button" className="card__begin" autoFocus onClick={onReadAgain}>Read again</button>
      <div className="card__quiet">
        {first !== undefined && <>back to {first.numeral} {'\u00B7'} {first.chapter} {'\u00B7'} </>}pack, food, queue and run levels start over
      </div>
    </div>
  );
}
