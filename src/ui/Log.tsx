import type { Content } from '../data/types';
import { ticksToSeconds } from '../engine/time';
import type { LogLine } from '../state/useGame';
import { clock } from './format';
import { narrate } from './narrate';
import { Region } from './Region';

/** The log chunk: newest first, and the screen's live region (spec 8.1, 8.6). */
export function Log({ lines, content }: { lines: readonly LogLine[]; content: Content }) {
  return (
    <Region name="log" className="log" live>
      <ul className="log__list">
        {lines.map((l) => {
          const n = narrate(l.event, content);
          return (
            <li key={l.seq} className={`log__line log__line--${n.kind}`}>
              <span className="log__at">{clock(ticksToSeconds(l.at))}</span>
              <span>{n.text}</span>
            </li>
          );
        })}
      </ul>
    </Region>
  );
}
