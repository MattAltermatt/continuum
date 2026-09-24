import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import type { ActionId, Book } from '../data/types';
import { windwardRun } from '../data/windward-run';
import { attentive, declaredTicks, handsOn, play, prioritized, type PlayOutcome, type PlayRun, type Policy } from './play';
import { newState } from './queue';
import { rebirth } from './rebirth';
import { setPaused, step } from './tick';
import { ticksPerSecond } from './time';

/**
 * The Windward Run as tuned by Task 5 of plan 2026-09-23-the-windward-run
 * (spec section 11's targets; the reading is under "Task 5 reading" in the
 * plan). Characterizations: a later tuning change that trips one of these is
 * the play telling the truth about the book, and the reading is re-taken.
 */

interface CastOff { readonly from: number; readonly undone: readonly ActionId[] }
interface Life { readonly ticks: number; readonly done: readonly ActionId[]; readonly castOffs: readonly CastOff[] }
interface Recorded { readonly outcome: PlayOutcome; readonly lives: readonly Life[]; readonly totalTicks: number }

/**
 * A copy of play()'s loop (src/engine/play.ts) that also records, per life,
 * the one-time rows completed and, at each cast-off, the one-times of the port
 * left behind undone. Checked against play() itself below, so the copy cannot
 * drift from the loop it copies without a test saying so.
 */
function playRecording(book: Book, policy: Policy): Recorded {
  const interval = Math.round(policy.checkEverySeconds * ticksPerSecond());
  const giveUpAt = declaredTicks({ days: balance.play.maxBookDays });
  const lives: Life[] = [];
  let castOffs: CastOff[] = [];
  let before = 0;
  let s = setPaused(newState(book.roster), 'none');
  let sinceDecide = interval;
  let stalled = false;
  const end = (outcome: PlayOutcome, last: typeof s): Recorded => {
    lives.push({ ticks: last.runTicks, done: last.completedOneTime, castOffs });
    return { outcome, lives, totalTicks: before + last.runTicks };
  };
  for (;;) {
    if (stalled || sinceDecide >= interval) { s = policy.decide(s, book); sinceDecide = 0; }
    const next = step(s, book);
    if (next.chapter > s.chapter) {
      const port = book.chapters[s.chapter]!;
      const undone = port.pages.flatMap((p) => p.order).filter((id) => book.actions[id]!.isOneTime && !next.completedOneTime.includes(id));
      castOffs.push({ from: s.chapter, undone });
    }
    if (next.finished) return end('finished', next);
    if (next.dead) {
      lives.push({ ticks: next.runTicks, done: next.completedOneTime, castOffs });
      castOffs = [];
      before += next.runTicks;
      s = setPaused(rebirth(next), 'none');
      sinceDecide = interval;
      stalled = false;
      continue;
    }
    const advanced = next.runTicks !== s.runTicks;
    if (!advanced && stalled) return end('frozen', next);
    if (before + next.runTicks > giveUpAt) return end('never-finishes', next);
    s = next;
    stalled = !advanced;
    if (advanced) sinceDecide += 1;
  }
}

/** Each is a whole-book play, a few seconds each; computed once, on first use. */
function once<T>(f: () => T): () => T {
  let v: T | undefined;
  return () => (v ??= f());
}
const attentiveRun = once((): PlayRun => play(windwardRun, attentive));
const attentiveRecorded = once(() => playRecording(windwardRun, attentive));
const prioritizedRecorded = once(() => playRecording(windwardRun, prioritized));
const handsOnRun = once((): PlayRun => play(windwardRun, handsOn));

const minutes = (ticks: number) => ticks / balance.time.ticksPerMinute;
/** The 1-based life in which chaptersPerLife first reaches `chapter`. */
const firstLifeAt = (run: PlayRun, chapter: number) => run.chaptersPerLife.findIndex((c) => c >= chapter) + 1;

/**
 * The play is synchronous, so a per-test timeout cannot interrupt a broken
 * bound (CLAUDE.md); it is headroom for a slow runner, where each play here
 * takes several times a laptop's few seconds.
 */
describe('The Windward Run, as tuned', { timeout: 60_000 }, () => {
  it('life 1 lasts 12 to 15 minutes', () => {
    const first = minutes(attentiveRun().ticksPerLife[0]!);
    expect(first).toBeGreaterThanOrEqual(12);
    expect(first).toBeLessThanOrEqual(15);
  });

  it('port II is first reached between lives 3 and 8, and port III between lives 12 and 30', () => {
    const run = attentiveRun();
    const two = firstLifeAt(run, 1);
    const three = firstLifeAt(run, 2);
    expect(two).toBeGreaterThanOrEqual(3);
    expect(two).toBeLessThanOrEqual(8);
    expect(three).toBeGreaterThanOrEqual(12);
    expect(three).toBeLessThanOrEqual(30);
  });

  it('the run ends finished', () => {
    expect(attentiveRun().outcome).toBe('finished');
  });

  it('every measuring player finishes the paged book, the prioritized one included (spec 2026-09-24-pages section 8)', () => {
    expect(attentiveRun().outcome).toBe('finished');
    expect(handsOnRun().outcome).toBe('finished');
    expect(prioritizedRecorded().outcome).toBe('finished');
  });

  it('the recording loop plays exactly what play() plays', () => {
    const run = attentiveRun();
    const rec = attentiveRecorded();
    expect(rec.outcome).toBe(run.outcome);
    expect(rec.lives.map((l) => l.ticks)).toEqual(run.ticksPerLife);
    expect(rec.totalTicks).toBe(run.totalTicks);
  });

  it('every one-time of every port completes at least once before the finish', () => {
    const rec = attentiveRecorded();
    expect(rec.outcome).toBe('finished');
    // The finishing life ends on the finish, so everything else in the union came before it.
    expect(rec.lives.at(-1)!.done.at(-1)).toBe(windwardRun.finish);
    const ever = new Set(rec.lives.flatMap((l) => l.done));
    const oneTimes = windwardRun.chapters.flatMap((c) => c.pages.flatMap((p) => p.order)).filter((id) => windwardRun.actions[id]!.isOneTime);
    expect(oneTimes.length).toBeGreaterThan(windwardRun.chapters.length);   // more than the three events
    expect(oneTimes.filter((id) => !ever.has(id))).toEqual([]);
  });

  it('prioritized: from life 10, no life casts off from port I or II with a one-time of that port undone', () => {
    const rec = prioritizedRecorded();
    expect(rec.outcome).toBe('finished');
    const late = rec.lives.slice(9).flatMap((l, i) => l.castOffs.map((c) => ({ life: i + 10, ...c })));
    // Precondition: it does cast off from both ports in those lives, so the check below is not vacuous.
    expect(late.some((c) => c.from === 0)).toBe(true);
    expect(late.some((c) => c.from === 1)).toBe(true);
    expect(late.filter((c) => c.undone.length > 0)).toEqual([]);
  });
});
