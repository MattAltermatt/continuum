import { useEffect, useState } from 'react';
import { balance } from '../balance';
import { SKILLS } from '../data/skills';
import type { ActionDefinition, ActionId, Content, ItemId } from '../data/types';
import { consumedOf } from '../engine/costs';
import { count, room } from '../engine/inventory';
import { tickExp } from '../engine/skills';
import { ticksPerSecond } from '../engine/time';
import type { GameState } from '../engine/types';
import { duration } from './format';
import { PLAY, STOP, WARN } from './glyphs';
import { SKILL_ICONS } from './icons';

/**
 * How long the click instruction holds before fading (spec 8.4: "a few
 * seconds"). Presentation timing, not a gameplay value; kept out of balance.ts
 * on the same reasoning as MS_PER_SECOND in src/engine/time.ts.
 */
const INSTRUCTION_MS = 3000;

export interface Shortfall { readonly item: ItemId; readonly owed: number; readonly have: number; readonly atCap: boolean }

/** What this row still owes of one input: the whole amount unless a queued entry has consumed some, in declared order. */
function owedOf(action: ActionDefinition, state: GameState, item: ItemId): number {
  const consumed = state.queue.find((e) => e.actionId === action.id)?.costsConsumed ?? 0;
  const amount = action.itemCosts.find((c) => c.item === item)?.amount ?? 0;
  return amount - consumedOf(action, consumed, item);
}

/**
 * Inputs this row still owes that the pack lacks (spec 8.4). A queued entry
 * owes only what it has not consumed. `atCap` marks a stack that cannot hold
 * more right now, so the instruction does not send the player to its producer.
 */
export function owedShortfalls(action: ActionDefinition, content: Content, state: GameState): Shortfall[] {
  const out: Shortfall[] = [];
  for (const c of action.itemCosts) {
    const owed = owedOf(action, state, c.item);
    const have = count(state.inventory, c.item);
    if (have < owed) out.push({ item: c.item, owed, have, atCap: room(state.inventory, content, c.item) <= 0 });
  }
  return out;
}

function makerOf(content: Content, item: ItemId): string {
  const producer = Object.values(content.actions).find((a) => a.producedItem === item);
  return producer ? SKILLS[producer.verb].name : SKILLS.craft.name;
}

export function ActionRow({ action, content, state, running, onNow, onQueue }: {
  action: ActionDefinition; content: Content; state: GameState; running: boolean;
  onNow: (id: ActionId) => void; onQueue: (id: ActionId) => void;
}) {
  const Icon = SKILL_ICONS[action.verb];
  const perSecond = tickExp(state.skills[action.verb]) * ticksPerSecond();
  const shortfalls = owedShortfalls(action, content, state);
  // A snapshot taken at the click, so an input landing during the hold does not blank it.
  const [instruction, setInstruction] = useState<readonly Shortfall[] | null>(null);
  useEffect(() => {
    if (instruction === null) return;
    const id = setTimeout(() => setInstruction(null), INSTRUCTION_MS);
    return () => clearTimeout(id);
  }, [instruction]);
  // A completed one-time row stays where it was, marked built, so no row below it moves up.
  const built = action.isOneTime && state.completedOneTime.includes(action.id);
  const inert = running || built || state.dead;
  const rowName = `${SKILLS[action.verb].name} ${action.noun}`;
  const press = (fn: (id: ActionId) => void) => () => {
    if (built || state.dead) return;
    fn(action.id);
    if (shortfalls.length > 0) setInstruction(shortfalls);
  };
  const done = state.completionCounts[action.templateKey ?? action.id] ?? 0;
  const needed = action.isOneTime ? balance.automation.unlockOneTime : balance.automation.unlockRepeatable;
  const output = action.producedItem
    ? (action.itemCosts.length === 0 ? `+${action.producedAmount ?? 1} ${action.producedItem}` : action.producedItem)
    : '';

  return (
    <div className={`item row${running ? ' row--on working' : ''}${built ? ' row--built' : ''}`} data-action={action.id}>
      <div className="row__c1">
        <Icon aria-hidden="true" />
        <span><b>{SKILLS[action.verb].name}</b>{' '}{action.noun}{running && <span className="visually-hidden">running</span>}</span>
      </div>
      <div className="row__c2">
        {built ? (
          <div className="row__say row__built">built</div>
        ) : instruction !== null ? (
          <div className="row__say">{instruction.map((c) => (
            <div key={c.item}>missing {c.owed - c.have} {c.item} · <b>{makerOf(content, c.item)} {c.atCap ? 'more as it builds' : 'some!'}</b></div>
          ))}</div>
        ) : (
          <>
            <div className="row__in">{action.itemCosts.map((c) => {
              const short = shortfalls.find((f) => f.item === c.item);
              const owed = owedOf(action, state, c.item);
              // A queued entry that has consumed part of this input shows what it still owes: "1 of 6 stone".
              const amount = owed < c.amount ? `${owed} of ${c.amount}` : `${c.amount}`;
              return <span key={c.item} className={short ? 'row__short' : ''}>{short && `${WARN} `}{amount} {c.item}{short && <small> have {short.have}</small>}</span>;
            })}</div>
            <div className="row__arr" aria-hidden="true">→</div>
            <div className="row__out">{output}</div>
          </>
        )}
      </div>
      <div className="row__c3">
        {/* A built row has no work left: no time, no xp, same width so nothing moves. */}
        <div className="row__tx">{built ? '\u00a0' : duration(action.expCost / perSecond)}<small>{built ? '\u00a0' : `+${action.expCost.toFixed(1)} xp`}</small></div>
        {/* One element in both states, so focus survives the swap; while running it does nothing. */}
        <button
          type="button"
          className={`btn ${running ? 'btn--stop' : 'btn--play'}`}
          aria-label={`${running ? 'running' : 'do it now'}: ${rowName}`}
          aria-disabled={inert ? 'true' : undefined}
          onClick={inert ? undefined : press(onNow)}
        >{running ? STOP : PLAY}</button>
        <button
          type="button"
          className="btn"
          aria-label={`add to queue: ${rowName}`}
          aria-disabled={built || state.dead ? 'true' : undefined}
          onClick={press(onQueue)}
        >+</button>
        <span className="auto">
          <span className="visually-hidden">{done === 0 ? 'automation, not yet earned' : `automation, ${done} of ${needed} to earn`}</span>
          {done > 0 && <span aria-hidden="true">{done}/{needed}<i style={{ width: `${Math.min(100, (done / needed) * 100)}%` }} /></span>}
        </span>
      </div>
    </div>
  );
}
