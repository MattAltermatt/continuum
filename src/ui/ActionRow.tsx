import { useEffect, useState, type KeyboardEvent } from 'react';
import { skillOf } from '../data/roster';
import type { ActionDefinition, ActionId, Content } from '../data/types';
import { isUnlocked, makersOf, modeOf, nextMode, unlockAt } from '../engine/automation';
import { gearMultiplier } from '../engine/effects';
import { count } from '../engine/inventory';
import { playBlock } from '../engine/fight';
import { startBlock } from '../engine/queue';
import { eventOf, stillOwed, workOf } from '../engine/rows';
import { tickExp } from '../engine/skills';
import { ticksPerSecond } from '../engine/time';
import type { AutoMode, GameState } from '../engine/types';
import { duration, hpClass, hpRate } from './format';
import { ARROW, PLAY, STOP, WARN } from './glyphs';
import { ICONS } from './icons';
import { itemName, needPhrase, rowName, words } from './words';

/**
 * How long the click instruction holds before fading (spec 8.4: "a few
 * seconds"). Presentation timing, not a gameplay value; kept out of balance.ts
 * on the same reasoning as MS_PER_SECOND in src/engine/time.ts.
 */
export const INSTRUCTION_MS = 3000;

/**
 * How long the click instruction takes to fade out, at the end of its hold
 * (spec 2026-09-24-screen-pass section 6). Presentation timing, not a gameplay
 * value; kept out of balance.ts on the same reasoning as MS_PER_SECOND in
 * src/engine/time.ts. App sets it as --fade for the stylesheet's transition.
 */
export const FADE_MS = 400;

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
 * One row (09-22 section 8.4; spec 2026-09-23-the-windward-run sections 2.5,
 * 3, 6 and 12; mockup 2026-09-23-queue-orders). Play asks the engine's
 * frontBlock before it dispatches: a refusal flashes the row red, shows the
 * words, and changes nothing. + always dispatches. A click queues a repeating
 * order, Shift+click a single one.
 */
export function ActionRow({ action, content, state, running, onNow, onQueue, onAutomate }: {
  action: ActionDefinition; content: Content; state: GameState; running: boolean;
  onNow: (id: ActionId, once: boolean) => void; onQueue: (id: ActionId, once: boolean) => void;
  onAutomate: (id: ActionId, mode: AutoMode) => void;
}) {
  const skill = skillOf(content, action.verb);
  const Icon = ICONS[skill.icon];
  const perSecond = tickExp(state.skills[action.verb]!, gearMultiplier(state, content, action.verb)) * ticksPerSecond();
  // A snapshot taken at the click: it holds for INSTRUCTION_MS whatever lands meanwhile. A new object per press restarts the hold.
  const [instruction, setInstruction] = useState<{ readonly text: string } | null>(null);
  const [refused, setRefused] = useState(false);
  // The hold's last FADE_MS: the words fade out (--fade in the stylesheet) before they go. Keyed to the snapshot, so a
  // new press, a new object, starts unfaded.
  const [fadingFor, setFadingFor] = useState<object | null>(null);
  const fading = instruction !== null && fadingFor === instruction;
  useEffect(() => {
    if (instruction === null) return;
    const fade = setTimeout(() => setFadingFor(instruction), INSTRUCTION_MS - FADE_MS);
    const id = setTimeout(() => { setInstruction(null); setRefused(false); setFadingFor(null); }, INSTRUCTION_MS);
    return () => { clearTimeout(fade); clearTimeout(id); };
  }, [instruction]);

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
      setInstruction({ text: words(content, refusal, { counts }) });
      return;
    }
    setInstruction(null);
    onNow(action.id, once);
  };
  const add = (once: boolean) => {
    if (built || state.dead) return;
    onQueue(action.id, once);
    // What play would refuse, + says (code panel: + did nothing visible): a fight that will stop the moment it reaches
    // the top, and a row nothing on the page supplies. A shortfall a row on the page makes is not said: the order pulls
    // that row when it reaches the top, whatever its chip (spec 2026-09-24-pages section 4.3).
    const refusal = playBlock(state, content, action.id, once);
    setInstruction(refusal?.kind === 'short' || refusal?.kind === 'hurt' ? { text: words(content, refusal, { counts }) } : null);
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
  // Set, but its row cannot start and nothing along the chain would supply it (accepted risk 3): the chip says so, and so does the row.
  const waits = unlocked && mode !== 'off' && block?.kind === 'short' ? words(content, block, { counts, waiting: true }) : null;
  // A closer whose page is unfinished says what it comes after, at rest (spec 2026-09-24-pages section 4.2).
  const after = block?.kind === 'page' ? words(content, block) : null;
  const say = built ? null : instruction !== null ? instruction.text : running ? null : waits ?? after;
  const done = counts[action.id] ?? 0;
  const needed = unlockAt(content, action);
  const w = workOf(state, action.id);

  return (
    <div
      className={`item row${running ? ' row--on working' : ''}${built ? ' row--built' : ''}${refused ? ' row--refused' : ''}`}
      data-action={action.id}
      onAnimationEnd={(e) => { if (e.target === e.currentTarget) setRefused(false); }}
    >
      <div className="row__c1">
        <Icon aria-hidden="true" />
        {/* The column clips a long noun; the title carries the whole of it (the proving ground's rows are their expectations). */}
        <span title={action.noun}><b>{skill.name}</b>{' '}{action.noun}{running && <span className="visually-hidden">running</span>}</span>
      </div>
      <div className="row__c2">
        {built ? (
          <div className="row__say row__built">built</div>
        ) : say !== null ? (
          <div className={`row__say${instruction === null ? ' row__say--waits' : ''}${fading ? ' row__say--fading' : ''}`} title={say}>{say}</div>
        ) : (
          <>
            <div className="row__in">
              {(action.needs ?? []).length > 0 && (
                <div className="row__needs">{(action.needs ?? []).map((n) => (
                  <span key={n.item} className={`need${count(state.inventory, n.item) < n.amount ? ' need--unmet' : ''}`}>{needPhrase(content, n.item, n.amount)}</span>
                ))}</div>
              )}
              {action.itemCosts.map((c) => {
                const owed = stillOwed(action, w, c.item);
                const have = count(state.inventory, c.item);
                const short = have < owed;
                // A shortfall a row on the page makes reads quiet, not red: play pulls that row (spec 2026-09-24-pages 4.3),
                // by the engine's own rule, the test frontBlock makes.
                const quiet = short && makersOf(state, content, c.item).some((m) => m.id !== action.id);
                // Once part is spent the row owes the rest: "3 of 8 scrap".
                const amount = owed < c.amount ? `${owed} of ${c.amount}` : `${c.amount}`;
                return (
                  <span key={c.item} className={quiet ? 'row__short--quiet' : short ? 'row__short' : undefined}>
                    {short && `${WARN} `}{amount} {itemName(content, c.item, c.amount)}{short && <small> have {have}</small>}
                  </span>
                );
              })}
              {action.healthRate !== undefined && <span className={hpClass(action.healthRate)}>{hpRate(action.healthRate)}</span>}
            </div>
            <div className="row__arr" aria-hidden="true">{ARROW}</div>
            <div className="row__out">{outputsOf(content, action).map((o) => <span key={o}>{o}</span>)}</div>
          </>
        )}
      </div>
      <div className="row__c3">
        {/* A built row has no work left: no time, no xp, same width so nothing moves. */}
        <div className="row__tx">{built ? '\u00A0' : duration(action.expCost / perSecond)}<small>{built ? '\u00A0' : `+${action.expCost.toFixed(1)} xp`}</small></div>
        {/* One element in both states, so focus survives the swap; while running it does nothing. */}
        <button
          type="button"
          className={`btn ${running ? 'btn--stop' : 'btn--play'}`}
          aria-label={`${running ? 'running' : 'do it now'}: ${name}`}
          aria-disabled={inert ? 'true' : undefined}
          onClick={inert ? undefined : (e) => now(e.shiftKey)}
          onKeyDown={inert ? undefined : enter(now)}
        >{running ? STOP : PLAY}</button>
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
    </div>
  );
}
