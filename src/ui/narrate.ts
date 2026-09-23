/** The one place engine events become words. Spec 8.6, 9. */
import { SKILLS } from '../data/skills';
import type { ActionId, Content } from '../data/types';
import { ticksToSeconds } from '../engine/time';
import type { LogEvent } from '../state/useGame';
import { clock } from './format';

export interface Narration { readonly kind: 'story' | 'note'; readonly text: string }

function rowName(content: Content, id: ActionId): string {
  const a = content.actions[id];
  return a ? `${SKILLS[a.verb].name} ${a.noun}` : id;
}

export function narrate(e: LogEvent, content: Content): Narration {
  switch (e.type) {
    case 'lifeBegins': return { kind: 'note', text: `Life ${e.life} begins` };
    case 'stalled': return { kind: 'note', text: `${rowName(content, e.actionId)} is waiting on ${e.item}` };
    // "can go on", not "resumes": the entry is no longer waiting, which is not the same as running (it may sit behind another).
    case 'resumed': return { kind: 'note', text: `${rowName(content, e.actionId)} can go on` };
    case 'full': return { kind: 'note', text: `${rowName(content, e.actionId)} stops: the pack is full of ${content.items[e.item]?.name ?? e.item}` };
    case 'completed': {
      const beat = content.actions[e.actionId]?.beat;
      return e.oneTime && beat ? { kind: 'story', text: beat } : { kind: 'note', text: `${rowName(content, e.actionId)} is done` };
    }
    case 'coreLevel': return { kind: 'note', text: `${SKILLS[e.skill].name} reaches Lv ${e.level}` };
    case 'died': return { kind: 'note', text: `Dead at ${clock(ticksToSeconds(e.runTicks))}` };
  }
}
