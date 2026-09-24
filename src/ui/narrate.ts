/** The one place engine events become words. Spec 8.6, 9; spec 2026-09-23-the-windward-run sections 3.4, 4 and 9. */
import { skillOf } from '../data/roster';
import type { Content } from '../data/types';
import { ticksToSeconds } from '../engine/time';
import type { LogEvent } from '../state/useGame';
import { clock } from './format';
import { pageList, rowName, words } from './words';

export interface Narration { readonly kind: 'story' | 'note'; readonly text: string }

export function narrate(e: LogEvent, content: Content): Narration {
  switch (e.type) {
    case 'lifeBegins': return { kind: 'note', text: `Life ${e.life} begins` };
    case 'saveAside': return { kind: 'note', text: 'An old save was set aside' };
    // The row's own words (src/ui/words.ts), so the row and the log never disagree. A log line is a record, so an
    // unearned maker reads without its n/N: a count frozen at the pop would contradict the chip, and a live one the past.
    case 'short': return {
      kind: 'note',
      text: `${rowName(content, e.actionId)} stops: ${words(content, { kind: 'short', item: e.item, amount: e.amount, maker: e.maker, gap: e.gap, cause: e.cause })}`,
    };
    case 'unlocked': return { kind: 'note', text: `${rowName(content, e.actionId)} can now be automated` };
    // The event's own beat has already printed on its `completed` line; this names the port now entered.
    case 'castOff': {
      const head = content.chapters[e.chapter]?.head;
      return { kind: 'note', text: head === undefined ? `Port ${e.chapter + 1}` : `Port ${head.numeral} \u00B7 ${head.chapter}` };
    }
    // The closing row's beat has printed on its `completed` line; this names the page now turned to.
    case 'pageTurn': {
      const name = content.chapters[e.chapter]?.pages[e.page]?.name;
      return { kind: 'note', text: name === undefined || name === '' ? `Page ${e.page + 1}` : name };
    }
    case 'finished': return { kind: 'note', text: 'The book is finished' };
    case 'completed': {
      const beat = content.actions[e.actionId]?.beat;
      return e.oneTime && beat ? { kind: 'story', text: beat } : { kind: 'note', text: `${rowName(content, e.actionId)} is done` };
    }
    case 'coreLevel': return { kind: 'note', text: `${skillOf(content, e.skill).name} reaches Lv ${e.level}` };
    case 'died': return { kind: 'note', text: `Dead at ${clock(ticksToSeconds(e.runTicks))}` };
    // A fight that backed off (#74) and a closer that left waiting on its page (spec 2026-09-24-pages 4.2) are the pops logged:
    // the user's "explain that you are about to die", and the rows the closer waits on as its "after:" line names them.
    case 'popped': return e.reason === 'page'
      ? { kind: 'note', text: `${rowName(content, e.actionId)} waits on ${pageList(content, e.waits)}` }
      : e.reason === 'hurt'
      ? { kind: 'note', text: `Backed off from ${rowName(content, e.actionId)}: one more push would end this life. Shift+play fights to the end` }
      // Never logged otherwise (src/state/useGame.ts withLog keeps pops and automation's own orders out); worded only so a stray line is not blank.
      : { kind: 'note', text: `${rowName(content, e.actionId)} leaves the queue` };
    case 'automated': return { kind: 'note', text: `${rowName(content, e.actionId)} queued by automation` };
    // A save from a later format may hold an event this build does not know: a plain note, never a blank log.
    default: return { kind: 'note', text: String((e as { readonly type?: unknown }).type ?? 'something happened') };
  }
}
