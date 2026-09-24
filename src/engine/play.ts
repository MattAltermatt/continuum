/**
 * The headless play (spec 2026-09-23-headless-play). Plays a book from zero
 * across lives under a policy and reports how it ended. Game time only: ticks,
 * which pass only while work happens (decision #41). No clock, no randomness.
 */
import { balance } from '../balance';
import type { ActionDefinition, ActionId, Book, BookLength } from '../data/types';
import { canJit, isPriority, isUnlocked, modeOf, setAutomation } from './automation';
import { count } from './inventory';
import { enqueue, newState, startBlock } from './queue';
import { rebirth } from './rebirth';
import { setPaused, step } from './tick';
import { HOURS_PER_DAY, lengthInHours } from '../data/length';
import { ticksPerHour, ticksPerSecond } from './time';
import { chapterOf, isDone } from './rows';
import type { GameState } from './types';

/**
 * Bumped by hand whenever the play's rules change: a policy, a check, a bound
 * (spec section 5). measure.test.ts locks it together with balance.play, so a
 * bound cannot change without this being looked at.
 */
export const PLAY_VERSION = 2;

/** balance.play's shape with plain numbers, so a test or a caller can pass other bounds. */
export type PlayBounds = { readonly [K in keyof typeof balance.play]: number };

export interface Policy {
  readonly name: string;
  /** Counted by the short-life flag: a sane policy eats and walks every row. */
  readonly sane: boolean;
  /**
   * 0 means every tick. Counted in game ticks. The policy is also asked the
   * moment time stops (a step that did not advance): a player notices an idle
   * queue, and an ask costs no ticks (decision #41).
   */
  readonly checkEverySeconds: number;
  /** Returns the state with its orders queued. */
  decide(state: GameState, book: Book): GameState;
}

export type PlayOutcome = 'finished' | 'never-finishes' | 'frozen';

export interface PlayRun {
  readonly policy: string;
  readonly outcome: PlayOutcome;
  readonly lives: number;
  readonly ticksPerLife: readonly number[];
  /** The furthest chapter index each life reached (spec 2026-09-23-the-windward-run section 11). */
  readonly chaptersPerLife: readonly number[];
  readonly totalTicks: number;
}

export function play(book: Book, policy: Policy, bounds: PlayBounds = balance.play): PlayRun {
  const interval = Math.round(policy.checkEverySeconds * ticksPerSecond());
  const giveUpAt = declaredTicks({ days: bounds.maxBookDays });
  const ticksPerLife: number[] = [];
  const chaptersPerLife: number[] = [];
  let reached = 0;                  // the furthest chapter this life
  let before = 0;                   // ticks in the lives already ended
  let s = setPaused(newState(book.roster), 'none');
  let sinceDecide = interval;       // ticks since the last ask; decide on the first tick
  let stalled = false;              // the previous step did not advance time
  const end = (outcome: PlayOutcome, last: GameState): PlayRun => {
    const lives = [...ticksPerLife, last.runTicks];
    return { policy: policy.name, outcome, lives: lives.length, ticksPerLife: lives, chaptersPerLife: [...chaptersPerLife, Math.max(reached, last.chapter)], totalTicks: before + last.runTicks };
  };
  for (;;) {
    const decideNow = stalled || sinceDecide >= interval;
    if (decideNow) { s = policy.decide(s, book); sinceDecide = 0; }
    const next = step(s, book);
    reached = Math.max(reached, next.chapter);
    // A finished state is also dead: the finish is read first.
    if (next.finished) return end('finished', next);
    if (next.dead) {
      ticksPerLife.push(next.runTicks);
      chaptersPerLife.push(reached);
      reached = 0;
      before += next.runTicks;
      s = setPaused(rebirth(next), 'none');
      sinceDecide = interval;
      stalled = false;
      continue;
    }
    const advanced = next.runTicks !== s.runTicks;
    // Frozen: two steps in a row that did not advance, with the policy asked in
    // between (a step that does not advance sets `stalled`, which asks at once).
    // One such step is not a freeze: resolve may have drained the queue on a
    // check-in tick, and the next ask queues again.
    if (!advanced && stalled) return end('frozen', next);
    if (before + next.runTicks > giveUpAt) return end('never-finishes', next);
    s = next;
    stalled = !advanced;
    if (advanced) sinceDecide += 1;
  }
}

export function declaredTicks(length: BookLength): number {
  return lengthInHours(length) * ticksPerHour();
}

/** Hours up to balance.play.hoursShownUpTo, whole days past it (spec section 4). */
export function formatGameTime(ticks: number): string {
  const hours = ticks / ticksPerHour();
  const shownHours = Math.round(hours);
  if (shownHours <= balance.play.hoursShownUpTo) return shownHours < 1 ? '< 1 h' : `${shownHours} h`;
  return `${Math.round(hours / HOURS_PER_DAY)} days`;
}


/**
 * A person-like player for the queue of orders (spec section 11). Checks in
 * every balance.policy.checkEverySeconds of game time and whenever time stops.
 * It sets foods and makers to JIT as they earn chips and never uses the
 * priorities. Whenever the queue is dry it queues, by hand: food, then the
 * port's first unfinished one-time behind one fill of each maker automation
 * does not supply (the big event is the last one-time, so it comes once the
 * port is built). One fill per ask is enough, since the play asks again the
 * moment the queue drains. With food at zero and no JIT on it, it presses
 * "now" on the food row, or on the maker of what the food lacks when "now"
 * refuses. It does only what the screen lets a person do. Sane: it eats and
 * walks every row.
 */
export const attentive: Policy = {
  name: 'attentive',
  sane: true,
  checkEverySeconds: balance.policy.checkEverySeconds,
  decide: (state, book) => byHand(jitAsEarned(state, book), book),
};

/** The same player, who never touches automation: the other end of the measured range. */
export const handsOn: Policy = {
  name: 'hands-on',
  sane: true,
  checkEverySeconds: balance.policy.checkEverySeconds,
  decide: (state, book) => byHand(state, book),
};

/**
 * A player who switches on every chip as it arrives, the way section 3 reads:
 * foods and makers to JIT, the port's other one-times to high, its big event
 * to low; by hand, only rows whose chip is still off. Reported, never tuned
 * to (Task 5): it is the player who would lock themselves out if a harvest's
 * chip came later than the one-times it feeds (Revision 3, point 4).
 */
export const prioritized: Policy = {
  name: 'prioritized',
  sane: true,
  checkEverySeconds: balance.policy.checkEverySeconds,
  decide: (state, book) => {
    let s = state;
    const chapter = chapterOf(s, book);
    for (const id of chapter.order) {
      const a = book.actions[id]!;
      if (!isUnlocked(s, a) || (s.automation[id] ?? 'off') !== 'off') continue;
      s = setAutomation(s, book, id, canJit(book, a) ? 'jit' : id === chapter.event ? 'low' : a.isOneTime ? 'high' : 'mid');
    }
    return byHand(s, book, (a) => modeOf(s, a) === 'off');
  },
};

function makesFood(book: Book, a: ActionDefinition): boolean {
  return a.producedItem !== undefined && book.items[a.producedItem]?.kind === 'food';
}

/** Foods and makers (key makers included) to JIT as they earn their chips; nothing else is automated. */
function jitAsEarned(state: GameState, book: Book): GameState {
  let s = state;
  for (const id of chapterOf(s, book).order) {
    const a = book.actions[id]!;
    if (isUnlocked(s, a) && (s.automation[id] ?? 'off') === 'off' && canJit(book, a)) s = setAutomation(s, book, id, 'jit');
  }
  return s;
}

/** Queues `a` behind one fill of each maker of what it costs or needs that automation does not supply (a key's one-time maker once). */
function withMakers(state: GameState, book: Book, rows: readonly ActionDefinition[], a: ActionDefinition): GameState {
  let s = state;
  for (const c of [...(a.needs ?? []), ...a.itemCosts]) {
    const maker = rows.find((m) => m.producedItem === c.item && !isDone(s, m));
    if (maker === undefined || modeOf(s, maker) !== 'off') continue;
    if (maker.isOneTime && s.queue.some((e) => e.actionId === maker.id)) continue;
    s = enqueue(s, book, maker.id);
  }
  return enqueue(s, book, a.id);
}

/**
 * `byHand` for every player: food, then the port's FIRST unfinished one-time
 * (the big event is the last one-time in order, which the validator enforces,
 * so it comes only once the port is built). One at a time: a costly row pops
 * short after one fill, the queue drains, and the play asks again; a second
 * row queued in the same batch (a 600-XP fight) would run instead. `mine`
 * limits which one-times this player queues by hand (the prioritized player
 * leaves chipped ones to automation), and the event waits while automation's
 * idle fill will still take one of the port's one-times.
 */
function byHand(state: GameState, book: Book, mine: (a: ActionDefinition) => boolean = () => true): GameState {
  let s = state;
  const chapter = chapterOf(s, book);
  const rows = chapter.order.map((id) => book.actions[id]!);
  const queued = (id: ActionId) => s.queue.some((e) => e.actionId === id);
  const food = rows.find((a) => makesFood(book, a));
  if (food !== undefined && modeOf(s, food) !== 'jit' && count(s.inventory, food.producedItem!) === 0 && !queued(food.id)) {
    const block = startBlock(s, book, food.id);
    const press = block?.kind === 'short' && block.maker !== null ? block.maker : food.id;
    s = enqueue(s, book, press, { front: true });
  }
  if (s.queue.length > 0) return s;
  if (food !== undefined && modeOf(s, food) !== 'jit') s = withMakers(s, book, rows, food);
  // Withhold the event only while the idle fill will take a one-time of this port; withholding it whenever
  // any one-time is unfinished froze a life, since JIT key makers are pulled only through the event's chain.
  const waiting = rows.some((b) => b.isOneTime && b.id !== chapter.event && !isDone(s, b) && isPriority(modeOf(s, b)) && startBlock(s, book, b.id) === null);
  const next = rows.find((a) => a.isOneTime && !isDone(s, a) && mine(a) && (a.id !== chapter.event || !waiting));
  if (next !== undefined && !queued(next.id)) s = withMakers(s, book, rows, next);
  return s;
}

export type PlayFlag =
  | { readonly kind: 'never-finishes'; readonly policy: string }
  | { readonly kind: 'frozen'; readonly policy: string; readonly life: number }
  | { readonly kind: 'long-life'; readonly policy: string; readonly life: number; readonly ticks: number }
  | { readonly kind: 'short-life'; readonly policy: string; readonly lives: number; readonly life: number; readonly ticks: number }
  | { readonly kind: 'off-length'; readonly declared: number; readonly min: number; readonly max: number }
  /** The one flag that will cost points: under the floor, a book pays none (spec section 6). */
  | { readonly kind: 'too-short'; readonly min: number; readonly floor: number };

export interface PlayReport {
  readonly bookId: string;
  readonly bookVersion: number;
  readonly playVersion: number;
  /** Supplied by the caller: the engine does not read package.json. */
  readonly gameVersion: string;
  /** The bounds this reading was taken with; a caller may pass others than balance.play. */
  readonly bounds: PlayBounds;
  readonly declared: BookLength;
  readonly runs: readonly PlayRun[];
  /** Total ticks over the runs that finished; null when none did. */
  readonly range: { readonly min: number; readonly max: number } | null;
  readonly flags: readonly PlayFlag[];
}

/** Every policy plays the book once; the flags are read off the runs (spec sections 5-6). */
export function measure(book: Book, policies: readonly Policy[], gameVersion: string, bounds: PlayBounds = balance.play): PlayReport {
  const runs = policies.map((p) => play(book, p, bounds));
  const flags: PlayFlag[] = [];
  const perMinute = balance.time.ticksPerMinute;
  runs.forEach((run, k) => {
    const policy = policies[k]!;
    if (run.outcome === 'never-finishes') flags.push({ kind: 'never-finishes', policy: run.policy });
    if (run.outcome === 'frozen') flags.push({ kind: 'frozen', policy: run.policy, life: run.lives });
    run.ticksPerLife.forEach((ticks, i) => {
      if (ticks > bounds.maxLifeMinutes * perMinute) flags.push({ kind: 'long-life', policy: run.policy, life: i + 1, ticks });
    });
    // Every run ends alive (finished, frozen, or given up mid-life), so the lives
    // that ended in death are all but the last. One flag per policy: how many, and the shortest.
    const died = run.ticksPerLife.slice(0, -1);
    const short = died.map((ticks, i) => ({ ticks, life: i + 1 })).filter((l) => l.ticks < bounds.minLifeMinutes * perMinute);
    if (policy.sane && short.length > 0) {
      const worst = short.reduce((a, b) => (b.ticks < a.ticks ? b : a));
      flags.push({ kind: 'short-life', policy: run.policy, lives: short.length, life: worst.life, ticks: worst.ticks });
    }
  });
  const finished = runs.filter((r) => r.outcome === 'finished').map((r) => r.totalTicks);
  const range = finished.length === 0 ? null : { min: Math.min(...finished), max: Math.max(...finished) };
  if (range !== null) {
    const floor = declaredTicks({ hours: bounds.minBookHours });
    if (range.min < floor) flags.push({ kind: 'too-short', min: range.min, floor });
    const declared = declaredTicks(book.length);
    if (range.min < declared * (1 - bounds.lengthTolerance) || range.max > declared * (1 + bounds.lengthTolerance)) {
      flags.push({ kind: 'off-length', declared, min: range.min, max: range.max });
    }
  }
  return { bookId: book.id, bookVersion: book.version, playVersion: PLAY_VERSION, gameVersion, bounds, declared: book.length, runs, range, flags };
}
