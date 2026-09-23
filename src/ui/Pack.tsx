import type { Content } from '../data/types';
import { count } from '../engine/inventory';
import type { GameState } from '../engine/types';

/**
 * Materials only (spec 8.6): food has its own chunk, and structures are not
 * carried. Each in its own box. A material at zero is dimmed.
 */
export function Pack({ state, content }: { state: GameState; content: Content }) {
  const materials = Object.values(content.items).filter((it) => it.kind === 'material');
  return (
    <section className="pack" aria-label="pack">
      <header className="chunk__head"><span>pack</span></header>
      {materials.map((it) => {
        const have = count(state.inventory, it.id);
        const full = have >= it.cap;
        return (
          <div key={it.id} data-item={it.id} className={`item pack__item${have === 0 ? ' pack__item--zero' : ''}${full ? ' pack__item--full' : ''}`}>
            <span>{it.name}</span>
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
