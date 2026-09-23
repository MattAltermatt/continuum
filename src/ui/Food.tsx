import { balance } from '../balance';
import type { Content } from '../data/types';
import { feeding } from '../engine/health';
import { count } from '../engine/inventory';
import type { GameState } from '../engine/types';

/**
 * Spec 8.6: food is its own chunk because it is the only thing that survives
 * between books within a life. Each food: name, one bite's heal, a cooldown bar
 * that drains until it can be eaten again, count/cap centered under it.
 */
export function Food({ state, content }: { state: GameState; content: Content }) {
  const foods = Object.values(content.items).filter((it) => it.kind === 'food');
  // Loud only when nothing is feeding the player: eaten-as-it-lands is not starving (plan Revision 3).
  const starving = foods.length > 0 && foods.every((it) => !feeding(state, it.id));
  return (
    <section className="chunk food" aria-label="food">
      <header className="chunk__head"><span>food</span>{starving && <span className="hurt-text">nothing to eat</span>}</header>
      {foods.map((it) => {
        const have = count(state.inventory, it.id);
        const full = have >= it.cap;
        const cooling = (state.foodCooldowns[it.id] ?? 0) / balance.health.foodCooldownTicks;
        const cls = !feeding(state, it.id) ? ' food__item--empty' : full ? ' food__item--full' : '';
        return (
          <div key={it.id} data-item={it.id} className={`item food__item${cls}`}>
            <span>{it.name}</span>
            <span>+{it.healPerUnit} hp</span>
            <div className="food__cooldown">
              <div className="bar" aria-hidden="true"><div className="bar__fill" style={{ width: `${cooling * 100}%` }} /></div>
              <div className="bar__value">{have}/{it.cap}</div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
