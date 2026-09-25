import type { Content, ItemDefinition } from '../data/types';
import { makersOf } from '../engine/automation';
import { capOf } from '../engine/effects';
import { count } from '../engine/inventory';
import type { GameState } from '../engine/types';
import { Region } from './Region';

/**
 * Everything carried, food included (spec 2026-09-23-the-windward-run
 * section 7, the user's rules on #45; spec 2026-09-24-screen-pass section 3):
 * a food marks one bite's heal beside its name and is otherwise any item. An item enters at the bottom the first
 * time this life acquires it; it stays at 0, dimmed, while a row in this port
 * can make it, and leaves at 0 once nothing here can. Keys hold one. A full
 * stack warns, because its maker will stop; a key is held or not, and holding
 * it is the point, so a key never warns.
 */
export function Pack({ state, content }: { state: GameState; content: Content }) {
  const items = state.acquired
    .map((id) => content.items[id])
    .filter((it): it is ItemDefinition => it !== undefined)
    .filter((it) => count(state.inventory, it.id) > 0 || makersOf(state, content, it.id).length > 0);
  return (
    <Region name="pack" className="pack">
      {items.map((it) => {
        const have = count(state.inventory, it.id);
        const cap = capOf(state, content, it.id);
        const full = have >= cap && it.kind !== 'key';
        return (
          <div key={it.id} data-item={it.id} className={`item pack__item${have === 0 ? ' pack__item--zero' : ''}${full ? ' pack__item--full' : ''}`}>
            <span>{it.name}{it.healPerUnit !== undefined && <> <small className="pack__hp">+{it.healPerUnit} hp</small></>}</span>
            <div>
              <div className="bar" aria-hidden="true"><div key={state.chapter} className={`bar__fill${full ? ' bar__fill--warn' : ''}`} style={{ width: `${(have / cap) * 100}%` }} /></div>
              <div className="bar__value">{have}/{cap}</div>
            </div>
          </div>
        );
      })}
    </Region>
  );
}
