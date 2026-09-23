import type { ActionId, ChapterHead, Content } from '../data/types';
import type { GameState } from '../engine/types';
import { ActionRow } from './ActionRow';
import { RunningHead } from './RunningHead';

export function ChapterPanel({ content, order, head, state, runningActionId, onNow, onQueue }: {
  content: Content; order: readonly ActionId[]; head: ChapterHead;
  state: GameState; runningActionId: ActionId | null;
  onNow: (id: ActionId) => void; onQueue: (id: ActionId) => void;
}) {
  return (
    <section className="chapter" aria-label="chapter">
      <RunningHead head={head} />
      {order.map((id) => {
        const action = content.actions[id];
        if (!action) return null;
        return <ActionRow key={id} action={action} content={content} state={state} running={id === runningActionId} onNow={onNow} onQueue={onQueue} />;
      })}
    </section>
  );
}
