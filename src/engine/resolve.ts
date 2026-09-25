/**
 * Everything that happens before any time passes (spec 2026-09-23-the-windward-run
 * section 2.4, decision #41): automation queues what it decides (section 3),
 * and the top entry pops until one can work or the queue is empty. Only then
 * does a tick spend time. Pure.
 */
import type { ActionDefinition, ActionId, Content } from '../data/types';
import { isPriority, modeOf, rankOf, withoutOrphans } from './automation';
import { anyCalm, automated, delayFor, hurtBlock, killers, wouldKill } from './fight';
import { capOf } from './effects';
import { count } from './inventory';
import { enqueue, startBlock, supplyVia } from './queue';
import { chapterOf, eventOf, here, isDone, isFull, lookAheadTarget, pageOf, pageWaits, shortfall, workOf } from './rows';
import type { GameEvent, GameState, QueueEntry } from './types';

/**
 * Zero-time passes in one resolve. Each pass pops or queues exactly one entry,
 * so a real queue settles in a handful; this only keeps a content cycle from
 * spinning. A loop bound, not tuning.
 */
const RESOLVE_PASSES = 64;

export interface Resolved {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
  /** The top entry can work this tick. */
  readonly ready: boolean;
  /** Zero-time passes this resolve used, of RESOLVE_PASSES (the whole-book gate reads it). */
  readonly passes: number;
}

function rowsHere(state: GameState, content: Content): readonly ActionDefinition[] {
  return pageOf(state, content).order.map((id) => content.actions[id]!);
}

function makesFood(content: Content, action: ActionDefinition): boolean {
  return action.producedItem !== undefined && content.items[action.producedItem]?.kind === 'food';
}

/**
 * A supply order serves `target`, directly or through the supply orders
 * between them.
 */
function serves(state: GameState, e: QueueEntry, target: number): boolean {
  const seen = new Set<number>();
  for (let cur: QueueEntry | undefined = e; cur?.for !== undefined && !seen.has(cur.id); cur = state.queue.find((x) => x.id === cur!.for)) {
    if (cur.for === target) return true;
    seen.add(cur.id);
  }
  return false;
}

/** The entry is a player's order, or serves one down its `for` chain at any depth (pulled entries are `by: 'auto'`). */
function onPlayersChain(state: GameState, e: QueueEntry): boolean {
  return e.by === 'player' || state.queue.some((p) => p.by === 'player' && serves(state, e, p.id));
}

/**
 * The first order for this food row is under way. Never below an order of the
 * player's: a play press buries it (round two). An automation fill runs once
 * what automation put above it finishes (its input's supply, another food's
 * fill, a better-ranked producer going first; round four: counting those as
 * burial re-queued two fills over each other every tick). The player's own
 * order for the row is no fill: it is under way only on top or below nothing
 * but its own supply (round five: an idle order above it filled its stack to
 * the cap with the food at zero). A supply left over from an order that has
 * gone is already gone (withoutOrphans).
 */
function fillUnderWay(state: GameState, id: ActionId): boolean {
  const at = state.queue.findIndex((e) => e.actionId === id);
  if (at < 0) return false;
  const above = state.queue.slice(0, at);
  if (above.some((e) => e.by === 'player')) return false;
  const first = state.queue[at]!;
  return first.by === 'auto' || above.every((e) => serves(state, e, first.id));
}

/**
 * A JIT food row whose food is out (section 3.2): it goes in at the top at
 * once, unless its fill is already under way. A fill the player buried under a
 * play press is taken back to the top (code panel round two), or the food
 * never comes while the pressed row runs.
 */
function foodDue(state: GameState, content: Content, tried: ReadonlySet<ActionId>): ActionId | null {
  for (const a of rowsHere(state, content)) {
    // Any chip, not only JIT (#81, the user: "if the player runs out of food, and the action is automated, it
    // goes to the top of this list"): priority food otherwise waited for an empty queue behind a press's chain.
    if (!makesFood(content, a) || tried.has(a.id) || modeOf(state, content, a) === 'off') continue;
    if (count(state.inventory, a.producedItem!) > 0) continue;
    if (fillUnderWay(state, a.id)) continue;
    if (startBlock(state, content, a.id) !== null) continue;
    return a.id;
  }
  return null;
}

/**
 * A JIT food row below its cap, not yet provisioned for this departure, while
 * the port's big event waits unstarted on top (section 3.2). A fill of it
 * buried below the event does not count: the provision replaces it.
 */
function provisionDue(state: GameState, content: Content, tried: ReadonlySet<ActionId>): ActionId | null {
  for (const a of rowsHere(state, content)) {
    if (!makesFood(content, a) || tried.has(a.id) || modeOf(state, content, a) !== 'jit' || state.provisioned.includes(a.id)) continue;
    if (count(state.inventory, a.producedItem!) >= capOf(state, content, a.producedItem!)) continue;
    if (startBlock(state, content, a.id) !== null) continue;
    return a.id;
  }
  return null;
}

/**
 * A JIT food that can start, for an empty queue: JIT keeps food stocked (#77),
 * and only food (#79, the user: "JIT only should harvest food items to keep
 * them stocked, for non-food items, it should wait until there is demand").
 * Other JIT rows run only when an order is short of what they make.
 */
function jitMeal(state: GameState, content: Content, tried: ReadonlySet<ActionId>): ActionId | null {
  const avoid = killers(state, content);
  return rowsHere(state, content).find((a) => makesFood(content, a) && modeOf(state, content, a) === 'jit' && !tried.has(a.id) && !avoid.has(a.id) && startBlock(state, content, a.id, avoid) === null)?.id ?? null;
}

/**
 * The best priority row that can start now, for an empty queue (section 3.3). Ties go to the earlier row.
 * A fight on a priority is taken in its rank like any row, even one that would kill: automated, it tries to keep
 * the player alive (a harvest delays it) and fights on when nothing else can run (#74, the user 2026-09-24).
 */
function bestIdle(state: GameState, content: Content, tried: ReadonlySet<ActionId>): ActionId | null {
  let best: { readonly id: ActionId; readonly rank: number } | null = null;
  for (const a of rowsHere(state, content)) {
    const mode = modeOf(state, content, a);
    if (!isPriority(mode) || tried.has(a.id)) continue;
    const rank = rankOf(mode);
    if (best !== null && rank >= best.rank) continue;
    const block = startBlock(state, content, a.id);
    // A closer waiting on its page is ordered once its next prerequisite can start, and pulls it (spec
    // 2026-09-24-pages 4.2): a JIT one-time acts only on demand, and the closer's order is that demand. Only
    // then, so the pull never fails and the chip never re-orders a closer every tick without time passing:
    // "can start" includes a fight that would not back off (code panel: the salons re-ordered the enforcers
    // every tick at low health, since startBlock does not model the back-off).
    if (block !== null && !(block.kind === 'page' && startBlock(state, content, block.waits[0]!) === null && hurtBlock(state, content, block.waits[0]!) === null)) continue;
    best = { id: a.id, rank };
  }
  return best === null ? null : best.id;
}

/** Completions a food fill needs to reach the cap from here: the `left` of automation's food and provision entries. */
function fillLeft(state: GameState, content: Content, id: ActionId): number {
  const a = content.actions[id]!;
  const item = a.producedItem!;
  return Math.max(1, Math.ceil((capOf(state, content, item) - count(state.inventory, item)) / (a.producedAmount ?? 1)));
}

/**
 * A row that goes before a priority maker supplies the top (section 3.3): a
 * repeatable producer ranked better than `betterThan`, not already queued, and
 * able to work at once with no supply of its own. The user's example: Forage
 * on a higher priority fills the berries first. A one-time is never taken
 * this way, so a supply step cannot start the port's big fight.
 */
function readyHigher(state: GameState, content: Content, tried: ReadonlySet<ActionId>, betterThan: number, except: ActionId): ActionId | null {
  let best: { readonly id: ActionId; readonly rank: number } | null = null;
  for (const a of rowsHere(state, content)) {
    const mode = modeOf(state, content, a);
    if (!isPriority(mode) || tried.has(a.id) || a.id === except || a.isOneTime || a.producedItem === undefined) continue;
    const rank = rankOf(mode);
    if (rank >= betterThan || (best !== null && rank >= best.rank)) continue;
    if (state.queue.some((e) => e.actionId === a.id)) continue;
    if (isDone(state, a) || isFull(state, content, a) || shortfall(state, a) !== null) continue;
    best = { id: a.id, rank };
  }
  return best === null ? null : best.id;
}

export function resolve(state: GameState, content: Content): Resolved {
  let s = state;
  const events: GameEvent[] = [];
  const tried = new Set<ActionId>();
  // A maker queued this resolve as a food fill may still supply the top once (round five: a food that another
  // row costs popped its consumer as 'blocked'). A second supply by the same maker in one resolve is refused,
  // a backstop against a loop (RESOLVE_PASSES bounds it too).
  const supplied = new Set<ActionId>();
  const byAutomation = (id: ActionId, why: 'supply' | 'food' | 'provision' | 'idle' | 'delay', left?: number, supplies?: number) => {
    // A food fill takes the place of any automation order for its row further down: one fill, on top.
    // The supply that was serving the old fill is left without it, and leaves on the next pass.
    if (why === 'food' || why === 'provision') s = { ...s, queue: s.queue.filter((e) => e.actionId !== id || e.by !== 'auto') };
    s = enqueue(s, content, id, { front: why !== 'idle', by: 'auto', ...(why === 'delay' ? { once: true } : {}), ...(left === undefined ? {} : { left }), ...(supplies === undefined ? {} : { for: supplies }) });
    tried.add(id);
    events.push({ type: 'automated', actionId: id, why });
  };
  const pop = () => { s = { ...s, queue: s.queue.slice(1) }; };
  let pass = 0;
  for (; pass < RESOLVE_PASSES; pass++) {
    // A supply order whose order has left (taken back to the top, pruned at a port, a load) leaves too.
    const kept = withoutOrphans(s.queue);
    if (kept !== s.queue) {
      for (const o of s.queue) if (!kept.includes(o)) events.push({ type: 'popped', actionId: o.actionId, reason: 'enough' });
      s = { ...s, queue: kept };
      continue;
    }
    const food = foodDue(s, content, tried);
    if (food !== null) { byAutomation(food, 'food', fillLeft(s, content, food)); continue; }
    const top = s.queue[0];
    if (top === undefined) {
      // A JIT food first (#77; only food, #79). Food and the priorities take turns: a food fill eating outpaces
      // never reaches its cap, and queued back to back it would take every empty queue there is. After one, the
      // next empty queue goes to the priority idle fill; with none, food again.
      const meal = jitMeal(s, content, tried);
      const turn = meal !== null && s.idleFed;
      if (meal !== null && !turn) {
        byAutomation(meal, 'idle', fillLeft(s, content, meal));
        s = { ...s, idleFed: true };
        continue;
      }
      const other = bestIdle(s, content, tried);
      if (other !== null) {
        byAutomation(other, 'idle');
        if (s.idleFed) s = { ...s, idleFed: false };
        continue;
      }
      // Nothing else to do: food again, at once. Leaving the queue empty for a pass committed a state the next
      // resolve changed (code panel: the settled state was not a fixed point, and read as #77's idle screen).
      if (turn) { byAutomation(meal!, 'idle', fillLeft(s, content, meal!)); continue; }
      break;
    }
    const action = content.actions[top.actionId];
    if (action === undefined || !here(s, content, action.id)) {
      pop(); events.push({ type: 'popped', actionId: top.actionId, reason: 'elsewhere' }); continue;
    }
    if (isDone(s, action)) { pop(); events.push({ type: 'popped', actionId: action.id, reason: 'done' }); continue; }
    // A closing row waits on its page (spec 2026-09-24-pages section 4.2): it pulls its first undone
    // prerequisite, one at a time. Already queued below: that order moves up with what serves it, and
    // stays the player's. Pulled this resolve and gone (short, backed off, full): the chain has failed, and
    // the closer leaves naming what it waits on, so nothing waits forever at the top.
    const waits = pageWaits(s, content, action.id);
    if (waits.length > 0) {
      const next = waits[0]!;
      if (tried.has(next)) { pop(); events.push({ type: 'popped', actionId: action.id, reason: 'page', waits }); continue; }
      const queued = s.queue.find((e) => e.actionId === next);
      if (queued !== undefined) {
        // An order of automation's own, moved up, is tied to the closer, so it joins the closer's chain (a
        // player's closer then supplies it whatever the chips, section 4.3) and leaves with it. The player's
        // own order keeps its independence: removing the closer never removes it (code panel).
        const tied = queued.by === 'auto' && queued.for === undefined ? { ...queued, for: top.id } : queued;
        const group = s.queue.filter((e) => e === queued || serves(s, e, queued.id)).map((e) => (e === queued ? tied : e));
        s = { ...s, queue: [...group, ...s.queue.filter((e) => e !== queued && !group.includes(e))] };
        tried.add(next);
      }
      else byAutomation(next, 'supply', undefined, top.id);
      continue;
    }
    // A fight stops before it kills (#74, spec 2026-09-24 section 3.2), unless Shift forced it: an automated
    // harvest runs once in front of it; with none, but anything else that can run, it leaves the queue with
    // its progress kept; with nothing else, it goes on.
    if (top.forced !== true && wouldKill(s, content, action)) {
      const delay = delayFor(s, content, tried, action);
      // Tied to the fight (`for`), so it leaves if the fight does (code panel round two: delays outlived their fight).
      if (delay !== null) { byAutomation(delay, 'delay', undefined, top.id); continue; }
      // An automated fight never stops (the user: "it should kill the player if there is no other action to run").
      if (!automated(s, content, action) && anyCalm(s, content)) {
        pop(); tried.add(action.id); events.push({ type: 'popped', actionId: action.id, reason: 'hurt' }); continue;
      }
    }
    // The last port's event is the finish, not a departure: nothing to provision for. Provisioning waits
    // until the event could start, so a key its own supply still has to fetch is fetched first and the
    // galley is not eaten on the way (the user: "Before travel, AN food items are stockpiled").
    const departing = action.id === eventOf(chapterOf(s, content)) && s.chapter < content.chapters.length - 1;
    if (departing && workOf(s, action.id).progress === 0 && shortfall(s, action) === null) {
      const provision = provisionDue(s, content, tried);
      if (provision !== null) {
        byAutomation(provision, 'provision', fillLeft(s, content, provision));
        s = { ...s, provisioned: [...s.provisioned, provision] };
        continue;
      }
    }
    if (isFull(s, content, action)) { pop(); events.push({ type: 'popped', actionId: action.id, reason: 'full' }); continue; }
    if (action.producedItem !== undefined && top.mode === 'repeat' && count(s.inventory, action.producedItem) >= lookAheadTarget(s, content, 0)) {
      pop(); events.push({ type: 'popped', actionId: action.id, reason: 'enough' }); continue;
    }
    const short = shortfall(s, action);
    if (short === null) return { state: s, events, ready: true, passes: pass + 1 };
    // A player's order, or anything serving one, pulls what it lacks whatever the chips (spec 2026-09-24-pages
    // section 4.3, the user: "if the thing can be harvested, it should be harvested"): the first row on the page
    // that makes the item, queued straight in front as a plain supply order. No `left`: the `for` look-ahead
    // stops it at what the order owes. Not through readyHigher: the chain in the queue is the order and what it
    // needs. Pulled already this resolve and gone means the chain has failed, and the order leaves below.
    if (onPlayersChain(s, top)) {
      const maker = rowsHere(s, content).find((m) => m.producedItem === short.item && m.id !== action.id && !isDone(s, m));
      if (maker !== undefined && !tried.has(maker.id)) {
        supplied.add(maker.id);
        byAutomation(maker.id, 'supply', undefined, top.id);
        if (top.forced === true) s = { ...s, queue: [{ ...s.queue[0]!, forced: true }, ...s.queue.slice(1)] };
        continue;
      }
    }
    const supply = supplyVia(s, content, short.item, new Set([action.id]));
    if (supply.kind === 'ok' && !supplied.has(supply.maker)) {
      const first = supply.mode === 'jit' ? null : readyHigher(s, content, tried, rankOf(supply.mode), action.id);
      // A better-ranked producer going first is not this order's supply; the maker is, and fetches for it alone.
      // The maker counts as having supplied only once it is queued: the one going first may leave at once
      // (its look-ahead already met), and the maker must still be free to supply (the round-five fix check).
      if (first === null) {
        supplied.add(supply.maker);
        byAutomation(supply.maker, 'supply', undefined, top.id);
        // A forced order's supply is forced too (code panel round three): Shift on the compass must carry through
        // the wardens it needs, or the promise "Shift+play fights to the end" breaks one link down.
        if (top.forced === true) s = { ...s, queue: [{ ...s.queue[0]!, forced: true }, ...s.queue.slice(1)] };
      }
      else byAutomation(first, 'supply');
      continue;
    }
    pop();
    const shortEvent = { type: 'short' as const, actionId: action.id, item: short.item, amount: short.amount, maker: supply.maker, gap: supply.kind === 'ok' ? 'blocked' as const : supply.gap };
    events.push(supply.kind === 'gap' && supply.cause !== undefined ? { ...shortEvent, cause: supply.cause } : shortEvent);
  }
  return { state: s, events, ready: false, passes: pass };
}

/**
 * The screen's "working": the top can run as the state stands, with nothing
 * resolve would do first (no pop, no supply, no food). Live, the state is
 * already settled, so this is resolve's own answer; paused, it is where work
 * resumes, and a top that would leave or wait on a supply is not it.
 */
export function topWorks(state: GameState, content: Content): boolean {
  const r = resolve(state, content);
  return r.ready && r.state === state;
}
