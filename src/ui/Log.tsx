import type { Content } from '../data/types';
import { ticksToSeconds } from '../engine/time';
import type { LogLine } from '../state/useGame';
import { clock, splitDelta } from './format';
import { narrate } from './narrate';
import { Region } from './Region';

/** What the delta's sign and colour say, in words, for a screen reader: the log is a live region, and a glyph may go unspoken. */
const SAID = { sooner: 'sooner than last life', later: 'later than last life', same: 'the same as last life' } as const;

/** The log chunk: newest first, and the screen's live region (spec 8.1, 8.6). */
export function Log({ lines, content }: { lines: readonly LogLine[]; content: Content }) {
  return (
    <Region name="log" className="log" live>
      <ul className="log__list">
        {lines.map((l) => {
          const n = narrate(l.event, content);
          const d = l.event.type === 'completed' && typeof l.event.lastAt === 'number' ? splitDelta(l.at, l.event.lastAt) : null;
          return (
            <li key={l.seq} className={`log__line log__line--${n.kind}`}>
              <span className="log__at">{clock(ticksToSeconds(l.at))}</span>
              <span className={`log__dt${d ? ` log__dt--${d.tone}` : ''}`}>{d?.text ?? ''}{d && <span className="visually-hidden">{` ${SAID[d.tone]}, `}</span>}</span>
              <span>{n.text}</span>
            </li>
          );
        })}
      </ul>
    </Region>
  );
}
