import type { Content } from '../data/types';
import { count } from '../engine/inventory';
import type { GameState } from '../engine/types';

/**
 * Materials and food, by kind; structures are not carried (spec 8.6). Each in
 * its own box. Food lives here until its own chunk arrives (#40), and keeps
 * that chunk's one loud rule: food at zero gets a hurt border, and when there
 * is no food at all the header says "nothing to eat". A material at zero is
 * dimmed.
 */
export function Pack({ state, content }: { state: GameState; content: Content }) {
  const carried = Object.values(content.items).filter((it) => it.kind !== 'structure');
  const foods = carried.filter((it) => it.kind === 'food');
  const starving = foods.length > 0 && foods.every((it) => count(state.inventory, it.id) === 0);
  return (
    <section className="pack" aria-label="pack">
      <header className="chunk__head"><span>pack</span>{starving && <span className="hurt-text">nothing to eat</span>}</header>
      {carried.map((it) => {
        const have = count(state.inventory, it.id);
        const full = have >= it.cap;
        const zero = have === 0 ? (it.kind === 'food' ? ' pack__item--empty' : ' pack__item--zero') : '';
        return (
          <div key={it.id} data-item={it.id} className={`item pack__item${zero}${full ? ' pack__item--full' : ''}`}>
            <span>{it.name}</span>
            {it.healPerUnit !== undefined ? <span>+{it.healPerUnit} hp</span> : <span />}
            <div>
              <div className="bar" aria-hidden="true"><div className={`bar__fill${full ? ' bar__fill--warn' : ''}`} style={{ width: `${(have / it.cap) * 100}%` }} /></div>
              <div className="bar__value">{have}/{it.cap}</div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
