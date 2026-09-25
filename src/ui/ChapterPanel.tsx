import { skillOf } from '../data/roster';
import type { ActionDefinition, ActionId, Chapter, Content, Page } from '../data/types';
import { modeOf } from '../engine/automation';
import { startBlock } from '../engine/queue';
import type { AutoMode, GameState } from '../engine/types';
import { ActionRow, modeWord } from './ActionRow';
import { ICONS } from './icons';
import { Region } from './Region';
import { RunningHead } from './RunningHead';
import { words } from './words';

/**
 * The port the life is in: its running head and its current page's rows, in
 * the book's order (spec 2026-09-23-the-windward-run section 4). Live rows
 * (automation off, built rows included) render in full; a chipped row
 * recedes under a group line to one line each (spec 2026-09-25-the-watched-
 * screen section 7), and a chipped row that is running stays receded so it
 * never jumps groups.
 */
export function ChapterPanel({ content, book, chapter, page, state, runningActionId, onNow, onQueue, onAutomate }: {
  content: Content; book: string; chapter: Chapter; page: Page;
  state: GameState; runningActionId: ActionId | null;
  onNow: (id: ActionId, once: boolean) => void; onQueue: (id: ActionId, once: boolean) => void;
  onAutomate: (id: ActionId, mode: AutoMode) => void;
}) {
  const rows = page.order.map((id) => content.actions[id]).filter((a): a is ActionDefinition => a !== undefined);
  const receded = (a: ActionDefinition) => modeOf(state, content, a) !== 'off';
  const live = rows.filter((a) => !receded(a)), auto = rows.filter(receded);
  return (
    <Region name="chapter" className="chapter" head={<RunningHead book={book} head={chapter.head} page={page.name} />}>
      {live.map((a) => <ActionRow key={a.id} action={a} content={content} state={state} running={a.id === runningActionId} onNow={onNow} onQueue={onQueue} onAutomate={onAutomate} />)}
      {auto.length > 0 && <div className="group"><span>automated {'\u00B7'} {auto.length}</span>{page.name !== '' && <span>page {'\u00B7'} {page.name}</span>}</div>}
      {auto.map((a) => <RecededRow key={a.id} action={a} content={content} state={state} running={a.id === runningActionId} onAutomate={onAutomate} />)}
    </Region>
  );
}

function RecededRow({ action, content, state, running, onAutomate }: {
  action: ActionDefinition; content: Content; state: GameState; running: boolean;
  onAutomate: (id: ActionId, mode: AutoMode) => void;
}) {
  const skill = skillOf(content, action.verb);
  const Icon = ICONS[skill.icon];
  const mode = modeOf(state, content, action);
  // Set, but its row cannot start and nothing along the chain would supply it (accepted risk 3): the chip says so, as a live row's does.
  const block = startBlock(state, content, action.id);
  const waits = block?.kind === 'short' ? words(content, block, { counts: state.completionCounts, waiting: true }) : null;
  return (
    <div className={`item row row--auto${running ? ' working' : ''}`} data-action={action.id}>
      <Icon aria-hidden="true" />
      <span className="row__name"><b>{skill.name}</b> {action.noun}</span>
      <span className="row__done">{'\u00D7'}{state.completionCounts[action.id] ?? 0}</span>
      <button
        type="button" className={`auto auto--btn auto--lit${waits !== null ? ' auto--waits' : ''}`}
        aria-label={`automation: ${modeWord(mode)}, press for off${waits !== null ? `; ${waits}` : ''}`}
        onClick={() => onAutomate(action.id, 'off')}
      ><b aria-hidden="true">{modeWord(mode)}</b></button>
    </div>
  );
}
