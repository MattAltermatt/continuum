import { balance } from '../balance';
import type { Content } from '../data/types';
import { makersOf } from '../engine/automation';
import { capOf } from '../engine/effects';
import { feeding, foodsByHeal } from '../engine/health';
import { count } from '../engine/inventory';
import type { GameState } from '../engine/types';

/**
 * Spec 8.6 and 2026-09-23-the-windward-run section 7: food is its own chunk
 * because it rides along when the ship casts off. Foods smallest heal first,
 * the order they are eaten in, so the rows never reorder (#45). A food shows
 * while there is some on hand or a row in this port can make it. Each: name,
 * one bite's heal, a cooldown bar that drains until it can be eaten again,
 * count/cap centered under it.
 */
export function Food({ state, content }: { state: GameState; content: Content }) {
  const foods = foodsByHeal(content);
  const shown = foods.filter((it) => count(state.inventory, it.id) > 0 || makersOf(state, content, it.id).length > 0);
  // Loud only when nothing is feeding the player: eaten-as-it-lands is not starving (plan Revision 3).
  const starving = foods.length > 0 && foods.every((it) => !feeding(state, it.id));
  return (
    <section className="chunk food" aria-label="food">
      <header className="chunk__head"><span>food</span>{starving && <span className="hurt-text">nothing to eat</span>}</header>
      {shown.map((it) => {
        const have = count(state.inventory, it.id);
        const cap = capOf(state, content, it.id);
        const full = have >= cap;
        const cooling = (state.foodCooldowns[it.id] ?? 0) / balance.health.foodCooldownTicks;
        const cls = !feeding(state, it.id) ? ' food__item--empty' : full ? ' food__item--full' : '';
        return (
          <div key={it.id} data-item={it.id} className={`item food__item${cls}`}>
            <span>{it.name}</span>
            <span>+{it.healPerUnit} hp</span>
            <div className="food__cooldown">
              <div className="bar" aria-hidden="true"><div className="bar__fill" style={{ width: `${cooling * 100}%` }} /></div>
              <div className="bar__value">{have}/{cap}</div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
