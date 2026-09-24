/**
 * The headless play (spec 2026-09-23-headless-play). Plays a book from zero
 * across lives under a policy and reports how it ended. Game time only: ticks,
 * which pass only while work happens (decision #41). No clock, no randomness.
 */
import { balance } from '../balance';
import type { Book, BookLength } from '../data/types';
import { enqueue, newState } from './queue';
import { rebirth } from './rebirth';
import { setPaused, step } from './tick';
import { HOURS_PER_DAY, lengthInHours } from '../data/length';
import { ticksPerHour, ticksPerSecond } from './time';
import type { GameState } from './types';

/**
 * Bumped by hand whenever the play's rules change: a policy, a check, a bound
 * (spec section 5). measure.test.ts locks it together with balance.play, so a
 * bound cannot change without this being looked at.
 */
export const PLAY_VERSION = 1;

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
  readonly totalTicks: number;
}

export function play(book: Book, policy: Policy, bounds: PlayBounds = balance.play): PlayRun {
  const interval = Math.round(policy.checkEverySeconds * ticksPerSecond());
  // The bot gives up at one ceiling for every book, whatever it claims: a finish
  // out of reach, or a life that never ends (spec section 6). A person playing is never stopped.
  const giveUpAt = declaredTicks({ days: bounds.maxBookDays });
  const ticksPerLife: number[] = [];
  let before = 0;                   // ticks in the lives already ended
  let s = setPaused(newState(book.roster), 'none');
  let sinceDecide = interval;       // ticks since the last ask; decide on the first tick
  let stalled = false;              // the previous step did not advance time
  const end = (outcome: PlayOutcome, last: GameState): PlayRun => {
    const lives = [...ticksPerLife, last.runTicks];
    return { policy: policy.name, outcome, lives: lives.length, ticksPerLife: lives, totalTicks: before + last.runTicks };
  };
  for (;;) {
    const decideNow = stalled || sinceDecide >= interval;
    if (decideNow) { s = policy.decide(s, book); sinceDecide = 0; }
    const next = step(s, book);
    if (next.dead) {
      ticksPerLife.push(next.runTicks);
      before += next.runTicks;
      s = setPaused(rebirth(next), 'none');
      sinceDecide = interval;
      stalled = false;
      continue;
    }
    if (next.completedOneTime.includes(book.finish)) return end('finished', next);
    const advanced = next.runTicks !== s.runTicks;
    // A freeze is time not advancing after the policy has had its turn. Not
    // identity: a policy that re-queues makes a new state every call (spec section 6).
    // A stall between asks is not a freeze: the next pass asks at once.
    if (!advanced && decideNow) return end('frozen', next);
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
 * The stand-in until #47: every tick, every row in chapter order. It is the
 * drive playable.test.ts already uses, and it breaks under #47's queue, where
 * only the top entry runs. Sane: it eats (Forage is queued) and walks every row.
 */
export const everyRowInOrder: Policy = {
  name: 'every row in order (stand-in until #47)',
  sane: true,
  checkEverySeconds: 0,
  decide: (state, book) => book.chapters.flatMap((c) => c.order).reduce((acc, id) => enqueue(acc, book, id), state),
};

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
