import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { skillOf } from '../data/roster';
import type { ActionDefinition, ActionId, Content } from '../data/types';
import { isUnlocked, modeOf, nextMode, unlockAt } from '../engine/automation';
import { consumedOf } from '../engine/costs';
import { gearMultiplier } from '../engine/effects';
import { playBlock } from '../engine/fight';
import { count } from '../engine/inventory';
import { startBlock, type StartBlock } from '../engine/queue';
import { eventOf, pageWaits, workOf } from '../engine/rows';
import { tickExp } from '../engine/skills';
import { ticksPerSecond } from '../engine/time';
import type { AutoMode, GameState } from '../engine/types';
import { duration, hpClass, hpRate } from './format';
import { PLAY } from './glyphs';
import { ICONS } from './icons';
import { itemName, needPhrase, rowName, words } from './words';

/** Effects read to two decimals: a decay factor of 0.80. Display precision, not tuning. */
const FACTOR_DECIMALS = 2;

/** The chip's word for a mode (spec section 3.1): tiny words, and JIT in capitals. */
export function modeWord(mode: AutoMode): string {
  return mode === 'jit' ? 'JIT' : mode;
}

/**
 * What the row gives, on the right of the arrow (09-22 section 8.4): what it
 * makes (a harvest as "+1 scrap", a made thing by its name) and the effects a
 * one-time leaves, then a closer's tag, a port's casting off or any other
 * page's turning (spec 2026-09-24-pages; spec 2026-09-24-screen-pass section
 * 6: the tag no longer hides the makes). The book's end reads alone.
 */
export function outputsOf(content: Content, action: ActionDefinition): readonly string[] {
  if (action.id === content.finish) return ['the end'];
  const out: string[] = [];
  if (action.producedItem !== undefined) {
    const harvest = !action.isOneTime && action.itemCosts.length === 0;
    const n = action.producedAmount ?? 1;
    out.push(harvest ? `+${n} ${itemName(content, action.producedItem, n)}` : itemName(content, action.producedItem));
  }
  if (action.healthDecayMultiplier !== undefined) out.push(`decay \u00D7${action.healthDecayMultiplier.toFixed(FACTOR_DECIMALS)}`);
  if (action.capacityBonus !== undefined) out.push(`stack +${action.capacityBonus}`);
  if (action.gear !== undefined) out.push(`${skillOf(content, action.gear.skill).name} \u00D7${action.gear.multiplier.toFixed(FACTOR_DECIMALS)}`);
  if (content.chapters.some((ch) => eventOf(ch) === action.id)) out.push('casts off');
  else if (content.chapters.some((ch) => ch.pages.some((p) => p.closes === action.id))) out.push('turns the page');
  return out;
}

/**
 * The line a refusal names (spec section 7: "the short cost line or unmet
 * prerequisite" flashes; the user's rule, no words): a short names its item's
 * cost or needs line; a hurt the health line; full and enough the line of
 * what the row makes. Keys are prefixed so an item called `hp` cannot
 * collide with the health line. A closer's page block never refuses a press
 * (the press pulls its page), and `done` and `elsewhere` never reach one
 * (the button is inert then): the row alone flashes.
 */
export type RefusedLine = `item:${string}` | 'line:hp' | 'line:gives';

export function refusedLineOf(refusal: StartBlock): RefusedLine | null {
  switch (refusal.kind) {
    case 'short': return `item:${refusal.item}`;
    case 'hurt': return 'line:hp';
    case 'full': case 'enough': return 'line:gives';
    case 'page': case 'done': case 'elsewhere': return null;
  }
}

/**
 * The row's middle (spec 2026-09-25-the-watched-screen section 7): a list,
 * never prose. `needs:` first (each item cost as paid/total from
 * `consumedOf`, or total/total once the row is built, then an unmet `needs`
 * chip, then a healthRate line), `still required:` next (a closer's undone
 * page prerequisites, by name, in page order, today's "after:" line), and
 * `gives:` last, the xp always first. A refused press flashes the row and
 * the one line the refusal names (`refused`); nothing here rewrites for it.
 */
export function RowList({ action, content, state, refused }: {
  action: ActionDefinition; content: Content; state: GameState; refused: RefusedLine | null;
}) {
  const w = workOf(state, action.id);
  const waits = pageWaits(state, content, action.id);
  const built = action.isOneTime && state.completedOneTime.includes(action.id);
  const flash = (line: RefusedLine) => (refused === line ? ' li--flash' : '');
  const li = (key: string, node: ReactNode, cls = '') => <div key={key} className={`li${cls}`}>{node}</div>;
  const outputs = outputsOf(content, action);
  return (
    <div className="row__list">
      {(action.itemCosts.length > 0 || (action.needs ?? []).length > 0 || action.healthRate !== undefined) && <div className="li-h">needs:</div>}
      {action.itemCosts.map((c) => li(c.item, <>{itemName(content, c.item, c.amount)} {built ? c.amount : consumedOf(action, w.costsConsumed, c.item)}/{c.amount}</>, flash(`item:${c.item}`)))}
      {(action.needs ?? []).map((n) => li(`need:${n.item}`, needPhrase(content, n.item, n.amount), `${count(state.inventory, n.item) < n.amount ? ' li--unmet' : ''}${flash(`item:${n.item}`)}`))}
      {action.healthRate !== undefined && li('hp', <span className={hpClass(action.healthRate)}>{hpRate(action.healthRate)}</span>, flash('line:hp'))}
      {waits.length > 0 && <div className="li-h">still required:</div>}
      {waits.map((id) => li(`wait:${id}`, rowName(content, id), ' li--wait'))}
      <div className="li-h">gives:</div>
      {li('xp', `+${action.expCost.toFixed(1)} xp`)}
      {outputs.map((o, i) => li(o, o, i === 0 && action.producedItem !== undefined ? flash('line:gives') : ''))}
    </div>
  );
}

/**
 * One row (09-22 section 8.4; spec 2026-09-25-the-watched-screen section 7;
 * spec 2026-09-23-the-windward-run sections 2.5, 3, 6 and 12; mockup
 * 2026-09-23-queue-orders). Play asks the engine's frontBlock before it
 * dispatches: a refusal flashes the row and the one line it names (a cost, a
 * prerequisite, the health line, what it makes) and changes nothing else: the
 * row's own list is the instruction. + always dispatches. A click queues a repeating order,
 * Shift+click a single one.
 */
export function ActionRow({ action, content, state, running, onNow, onQueue, onAutomate }: {
  action: ActionDefinition; content: Content; state: GameState; running: boolean;
  onNow: (id: ActionId, once: boolean) => void; onQueue: (id: ActionId, once: boolean) => void;
  onAutomate: (id: ActionId, mode: AutoMode) => void;
}) {
  const skill = skillOf(content, action.verb);
  const Icon = ICONS[skill.icon];
  const perSecond = tickExp(state.skills[action.verb]!, gearMultiplier(state, content, action.verb)) * ticksPerSecond();
  const [refused, setRefused] = useState(false);
  const [refusedLine, setRefusedLine] = useState<RefusedLine | null>(null);

  // A completed one-time row stays where it was, marked built, so no row below it moves up.
  const built = action.isOneTime && state.completedOneTime.includes(action.id);
  const inert = running || built || state.dead;
  const name = rowName(content, action.id);
  const counts = state.completionCounts;
  const block = startBlock(state, content, action.id);

  const now = (once: boolean) => {
    if (inert) return;
    // Only playBlock knows `enough` and `hurt`; asking startBlock alone would dispatch an order that enqueue then refuses
    // without a word, or a fight that backs off at once (#74).
    const refusal = playBlock(state, content, action.id, once);
    if (refusal !== null) {
      setRefused(true);
      setRefusedLine(refusedLineOf(refusal));
      return;
    }
    onNow(action.id, once);
  };
  const add = (once: boolean) => {
    if (built || state.dead) return;
    onQueue(action.id, once);
  };
  // Enter on a focused button is a plain press (a repeating order); Shift+Enter matches Shift+click.
  const enter = (fn: (once: boolean) => void) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    fn(e.shiftKey);
  };

  const unlocked = isUnlocked(state, content, action);
  const mode = modeOf(state, content, action);
  const next = nextMode(content, action, mode);
  // Set, but its row cannot start and nothing along the chain would supply it (accepted risk 3): the chip says so.
  const waits = unlocked && mode !== 'off' && block?.kind === 'short' ? words(content, block, { counts, waiting: true }) : null;
  const done = counts[action.id] ?? 0;
  const needed = unlockAt(content, action);

  return (
    <div
      className={`item row${running ? ' row--on working' : ''}${built ? ' row--built' : ''}${refused ? ' row--refused' : ''}`}
      data-action={action.id}
      onAnimationEnd={(e) => { if (e.target === e.currentTarget) { setRefused(false); setRefusedLine(null); } }}
    >
      <Icon aria-hidden="true" />
      {/* The name never truncates (spec 2026-09-25 section 7): it wraps under itself when the column is narrow. */}
      <span className="row__name"><b>{skill.name}</b> {action.noun}{running && <span className="visually-hidden">running</span>}</span>
      <span className="row__tx">{built ? 'built' : duration(action.expCost / perSecond)}</span>
      <div className="row__ctl">
        {/* Always the play button (#43): on the running row "do it now" is already true, so a press does nothing, and it keeps its look. */}
        <button
          type="button"
          className={`btn btn--play${running && !state.dead ? ' btn--running' : ''}`}
          aria-label={`${running ? 'running' : 'do it now'}: ${name}`}
          aria-disabled={inert ? 'true' : undefined}
          onClick={inert ? undefined : (e) => now(e.shiftKey)}
          onKeyDown={inert ? undefined : enter(now)}
        >{PLAY}</button>
        <button
          type="button"
          className="btn"
          aria-label={`add to queue: ${name}`}
          aria-disabled={built || state.dead ? 'true' : undefined}
          onClick={(e) => add(e.shiftKey)}
          onKeyDown={enter(add)}
        >+</button>
        {unlocked ? (
          <button
            type="button"
            className={`auto auto--btn${mode !== 'off' ? ' auto--lit' : ''}${waits !== null ? ' auto--waits' : ''}`}
            aria-label={`automation: ${modeWord(mode)}, press for ${modeWord(next)}${waits !== null ? `; ${waits}` : ''}`}
            aria-disabled={state.dead ? 'true' : undefined}
            onClick={state.dead ? undefined : () => onAutomate(action.id, next)}
          ><b aria-hidden="true">{modeWord(mode)}</b></button>
        ) : (
          // Earning: a status, not a button (spec 3.1). Blank until the first completion.
          <span className="auto">
            <span className="visually-hidden">{done === 0 ? 'automation, not yet earned' : `automation, ${done} of ${needed} to earn`}</span>
            {done > 0 && <span aria-hidden="true">{done}/{needed}<i style={{ width: `${Math.min(100, (done / needed) * 100)}%` }} /></span>}
          </span>
        )}
      </div>
      <RowList action={action} content={content} state={state} refused={refusedLine} />
    </div>
  );
}
