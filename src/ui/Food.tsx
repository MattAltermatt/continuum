import { balance } from '../balance';
import type { Content } from '../data/types';
import { makersOf } from '../engine/automation';
import { feeding, foodsByHeal } from '../engine/health';
import { count } from '../engine/inventory';
import { ticksToSeconds } from '../engine/time';
import type { GameState } from '../engine/types';
import { duration } from './format';
import { Region } from './Region';

/**
 * Spec 8.6 and 2026-09-23-the-windward-run section 7: food is its own chunk
 * because it rides along when the ship casts off. Foods smallest heal first,
 * the order they are eaten in, so the rows never reorder (#45). A food shows
 * while there is some on hand or a row in this port can make it. Each: name,
 * one bite's heal, an ember cooldown bar that drains until it can be eaten
 * again, and the countdown under it: "3.2s" while cooling, "ready" when a
 * bite can land, a dimmed "none" when nothing is feeding. Food is timing only
 * here; the pack carries the stack (spec 2026-09-24-screen-pass section 3).
 */
export function Food({ state, content }: { state: GameState; content: Content }) {
  const foods = foodsByHeal(content);
  const shown = foods.filter((it) => count(state.inventory, it.id) > 0 || makersOf(state, content, it.id).length > 0);
  // Loud only when nothing is feeding the player: eaten-as-it-lands is not starving (plan Revision 3).
  const starving = foods.length > 0 && foods.every((it) => !feeding(state, it.id));
  return (
    <Region name="food" className="food" note={starving ? <span className="hurt-text">nothing to eat</span> : undefined}>
      {shown.map((it) => {
        const left = state.foodCooldowns[it.id] ?? 0;
        const cooling = left / balance.health.foodCooldownTicks;
        const none = !feeding(state, it.id);
        const word = left > 0 ? duration(ticksToSeconds(left)) : none ? 'none' : 'ready';
        return (
          <div key={it.id} data-item={it.id} className={`item food__item${none ? ' food__item--none' : ''}`}>
            <span>{it.name}</span>
            <span>+{it.healPerUnit} hp</span>
            <div className="food__cooldown">
              <div className="bar" aria-hidden="true"><div key={state.life} className="bar__fill bar__fill--run" style={{ width: `${cooling * 100}%` }} /></div>
              <div className="bar__value">{word}</div>
            </div>
          </div>
        );
      })}
    </Region>
  );
}
