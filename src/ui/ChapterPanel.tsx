import type { ActionId, Chapter, Content } from '../data/types';
import type { AutoMode, GameState } from '../engine/types';
import { ActionRow } from './ActionRow';
import { RunningHead } from './RunningHead';

/** The port the life is in: its running head and its rows, in the book's order (spec 2026-09-23-the-windward-run section 4). */
export function ChapterPanel({ content, book, chapter, state, runningActionId, onNow, onQueue, onAutomate }: {
  content: Content; book: string; chapter: Chapter;
  state: GameState; runningActionId: ActionId | null;
  onNow: (id: ActionId, once: boolean) => void; onQueue: (id: ActionId, once: boolean) => void;
  onAutomate: (id: ActionId, mode: AutoMode) => void;
}) {
  return (
    <section className="chapter" aria-label="chapter">
      <RunningHead book={book} head={chapter.head} />
      {chapter.order.map((id) => {
        const action = content.actions[id];
        if (!action) return null;
        return <ActionRow key={id} action={action} content={content} state={state} running={id === runningActionId} onNow={onNow} onQueue={onQueue} onAutomate={onAutomate} />;
      })}
    </section>
  );
}
