import type { ActionId, Chapter, Content } from '../data/types';
import type { GameState } from '../engine/types';
import { ActionRow } from './ActionRow';
import { RunningHead } from './RunningHead';

export function ChapterPanel({ content, book, chapter, state, runningActionId, onNow, onQueue }: {
  content: Content; book: string; chapter: Chapter;
  state: GameState; runningActionId: ActionId | null;
  onNow: (id: ActionId) => void; onQueue: (id: ActionId) => void;
}) {
  return (
    <section className="chapter" aria-label="chapter">
      <RunningHead book={book} head={chapter.head} />
      {chapter.order.map((id) => {
        const action = content.actions[id];
        if (!action) return null;
        return <ActionRow key={id} action={action} content={content} state={state} running={id === runningActionId} onNow={onNow} onQueue={onQueue} />;
      })}
    </section>
  );
}
