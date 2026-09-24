# The headless play — Implementation Plan

**Status:** executed 2026-09-23. Tasks 1–4 landed; plan panel clean at round five, code panel clean at round three; Chrome verified. Written 2026-09-23 on `feature/headless-play`, the branch that
carries the spec; revised after plan-panel rounds one to three (Revisions 1
to 3 below; a later revision supersedes an earlier one where they differ). The
panel reviewed the spec too: it went straight from brainstorm to spec to plan.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Code panel, round one (2026-09-23)

Five reviewers on the built branch: engine-reviewer, tuning-guard,
vacuous-test-hunter (51 real mutations), a generic plan-vs-diff reviewer, and
the naysayer (which also ran `npm run build`: nothing in `src/ui` or
`src/state` reads the new fields, and `play.ts` is not in the bundle). No
must-fix from the engine-reviewer or the generic reviewer. Fixed:

- **The check-in interval counts game ticks,** and a step that does not
  advance time asks the policy at once (engine-reviewer; naysayer and hunter:
  the freeze guard `&& decideNow` was unpinned). A test with a policy asked
  every 1000 s that must finish through a mid-interval stall pins it.
- **The report records the bounds it was taken with,** and a test locks
  `PLAY_VERSION` with `balance.play` (engine-reviewer).
- **`UNDERIVED` / derived marks** on every `balance.play` value (engine-reviewer).
- **A `NaN` length passed validation** (naysayer, hunter); now tested against
  `/not a positive number/`.
- **`{ hours: 1, days: 9999 }` validated as 1 h** (naysayer): the type forbids
  both keys and the validator rejects them.
- The `< 1 h` band (0.7 h shows `1 h`), a life exactly at the long-life cap,
  a claim inside the ±25% band, and a version-2 book in the stamp test.
- Tuning-guard: no existing balance value changed; the spec now marks where
  each new value was agreed.

**Accepted, logged:** removing the stall ask, dropping `before +=`,
reading the ceiling from `balance.play` instead of `bounds`, and deleting the
freeze return each hang the suite rather than fail it, like the give-up line (Revision 3); CI's 15-minute
timeout is the backstop. (Round two's naysayer disproved a claim first logged
here, that no book can freeze after a death: levels carry over, so a faster
later life can fill every stack before decay kills it. A test now freezes a
book in a later life and pins the flag's `life`.) Round two's hunter showed the tolerance and the floor were never
tested with a bound other than the default; one test with `lengthTolerance: 0`
and `minBookHours` at the measured length pins both, and both exact-tick
boundaries.

## Revision 3 (2026-09-23, after plan-panel round three)

Round three: a reviewer (applied Tasks 1–3 verbatim, then 14 mutations) and
the naysayer (applied and probed). One red test, two unpinned claims, and a
design hole the user decided.

**Decided by the user:**

1. **One fixed ceiling, 60 days, for every book** (`balance.play.maxBookDays`),
   replacing Revision 2's 4× the declared length. *Why* (naysayer, measured):
   under 4×, a book that claims too little never got a number (The Salt Road
   declared 1 day read `never-finishes` with no range, the opposite of *"be
   honest with someone that their v1 book that said 95 hours is actually x"*),
   and a book that claims too much could hold the bot for days (declared
   36,500 days: about 2 days of CPU). *(user)* *"if it goes past 60 days, it
   can't even be loaded."* So: the validator rejects a declared length past
   60 days, and a book the bot cannot finish within 60 days reads
   `never-finishes`, which is the refusal. Refusing it at load time lands
   with the shelf, the first thing that loads a player's book (filed).
2. **A 24-hour floor on every book** (`balance.play.minBookHours: 24`): *(user)*
   played from zero with the queue never empty, a book must take at least 24 h
   of game time; under that it is flagged `too-short` and *"you don't get any
   book finishing points."* Points do not exist yet (spec §6, badges and the
   shop); the no-points rule is filed there. This slice ships the flag.
3. **Short-life stays, as a warning** *(user delegated: "please figure this
   out")*. The 24-hour floor is the penalty; the per-life check is the only
   thing that sees a book that runs long but kills every life fast. At 8 s
   of margin on The Salt Road, and certain to trip after #45, it must not be
   able to cost an author points, so it is a warning only. The line stays at
   10 minutes, as agreed.

**Fixed:**

4. **The range test was red** (both): its book declared 1 h, so the second
   policy was cut off at 4 h. Gone with the fixed ceiling; tests that must
   *not* finish pass a small `maxBookDays` for speed.
5. **Short-life's count was unpinned** (reviewer, mutation 6 survived: in the
   trap book every life is short, so `lives: died.length` passed). A test now
   sets the line between the shortest and longest life of one run, so some
   lives clear it and some do not.
6. **Off-length's min and max could be swapped** (reviewer, mutation 13): every
   case used one policy. A case with two policies measuring differently now
   pins which end each side reads.
7. **The trap run's outcome is asserted** (reviewer): it finishes, at about
   20 h (naysayer, measured with the bound raised).
8. `HOURS_PER_DAY` moves to `src/data/length.ts` with a `lengthInHours()`
   helper, since the validator (data layer) needs it and data may not import
   the engine; the engine imports it from there.

**Round-four fixes** (reviewer, applied and mutated; folded into Task 3):
the off-length ends test was red by construction (its precondition and its
second assertion could not both hold); it now declares at the long run's
length and at the short run's, one assertion per side. And `too-short` was
not pinned to the range's short end (every case had one policy); a
two-policy case with the floor between the runs pins it.

**Accepted risk, added:** *Objection:* deleting the give-up line makes the
suite hang rather than fail, because the loop is synchronous and vitest's
timeout cannot interrupt it (reviewer). *Alternative:* a test-only iteration
guard inside `play()`. *Rejected because* a guard only tests could trip is
code the ship build carries for nothing, and a CI job that hangs is still a
red CI job, but a slow one: `ci.yml` sets no `timeout-minutes`, so GitHub's
default would leave it hanging for 6 hours (round-four naysayer). Task 4 adds
`timeout-minutes: 15` to the `verify` job, which caps it with no ship code.
Review Focus 4 names it.

Rounds two and three's naysayers accepted every earlier risk.

## Revision 2 (2026-09-23, after plan-panel round two)

Round two: a reviewer and the naysayer each applied Tasks 1–3 verbatim in a
scratch copy. Every gate was green (269 tests, 6.8 s; The Salt Road again life
457, 120.6 h, no flags, 4.5 s). Both then mutation-tested the fixes.

**Fixed:**

1. **The time-bound test proved nothing** (both, by mutation: deleting the
   bound left every test green). Its balm capped at 5, so it stopped
   compounding and lives ended at about 25 min. The endless test book's balm
   now produces nothing and costs nothing, so it compounds forever; the test
   asserts `lives === 1`.
2. **The stop rule is a multiple of the declared length, not a lives count**
   (naysayer: 1000 lives × about 20 min is about 14 days, so an honest book
   declared at three weeks always read never-finishes). *(user)* picked
   "give up at 4× the declared length": `balance.play.giveUpMultiple: 4`
   replaces `livesBound`, and the `livesBound × maxLifeMinutes` coupling is
   gone. It covers both a finish out of reach and a life that never ends.
   The Salt Road gives up at 20 days and finishes at 5. It is the measuring
   bot's bound only; nothing changes for a person playing.
3. **A false short-life on a run stopped mid-life** (naysayer measured 0.21
   min). With one stop rule, the last life of every run is alive: finished,
   frozen, or given up mid-life. Short-life reads every life but the last.
4. **The stall re-ask was invisible in game time** (both: removing it left
   every test green; a stall spends no ticks, and `sinceDecide` counts loop
   passes, so the policy is asked at the same tick either way). Removed from
   the loop and from spec §7. The check-in interval is pinned instead by a
   test counting `decide` calls.
5. **Review Focus 2 cannot be pinned** (reviewer: swapping the dead and
   finished checks changes nothing, since `step()` returns on death before
   working). Reworded as a note, not a claim of coverage.
6. **One short-life flag per policy**, with the count and the shortest life,
   not one per life (naysayer: a ×3 trap raised 165).
7. `monumentFirst` never eats: marked `sane: false`.
8. **The margin was misreported** (naysayer). Reading every life, The Salt
   Road's shortest life is 10.14 min at life 3, not 10.35 at life 1: 8 s over
   the line. The control test book bottoms out at the same 10.14. Both tests
   carry a comment that #45 will move them.

Round two's naysayer accepted all five risks logged in Revision 1.

**Asked of the user, pending:** the short-life line (keep 10 minutes, or
lower it) with the corrected margin; The Salt Road at `{ days: 5 }`.

## Revision 1 (2026-09-23, after plan-panel round one)

Round one: Reviewer A (read and hand-traced), Reviewer B (replayed the loop
against the engine), the naysayer (applied the plan in a scratch copy and ran
it). Measured and agreed by B and the naysayer: The Salt Road under the
stand-in finishes on life 457 after 120.6 h, "5 days", life 1 10.35 min,
longest life 20.0 min, no flag, 4.5 s.

**Fixed in the plan:**

1. `PlayBounds = typeof balance.play` has literal types under `as const`, so
   `{ ...balance.play, livesBound: 3 }` failed typecheck (A, B, naysayer ran
   it). Now a mapped type of plain numbers.
2. `src/balance.test.ts` locks `balance.time` and `content.scrub` exactly and
   failed on the new keys (naysayer ran it). Task 1 now lists it, and adds a
   lock for `balance.play`.
3. Unit constants moved out of `balance.ts` into `src/engine/time.ts`, beside
   `MS_PER_SECOND`, whose comment is the house rule: a unit conversion nobody
   may tune does not go in the tuning file (A, B, naysayer).
4. The Salt Road's declared length is the author's claim, not tuning: it is
   written in the book, `length: { days: 5 }`, and `content.scrub.lengthDays`
   is dropped (naysayer). The tuning-literals hook passes a one-digit integer.
5. `play()` could run forever on a shared book: a repeatable row with a decay
   multiplier below 1 compounds toward no decay, and the per-life cap only
   flagged (A). Now a hard stop with no new number: total ticks past
   `livesBound × maxLifeMinutes`, the most a book can take if every life hit
   the per-life cap, ends the run `never-finishes`.
6. The short-life control failed: `monumentBook(150, 1500)` has no cabin and
   its life 1 is 9.56 min (B, naysayer measured). The test books now carry a
   cabin-like row (×0.8), the shape The Salt Road has.
7. Short-life read only life 1, so a trap in chapter 2 was invisible
   (naysayer). Now every life that ended in death is read, and the flag names
   the life.
8. Vacuous assertions: the short-life `ticks < line` (implied by the flag
   existing), and the range test with two identical policies (B). Replaced by
   assertions against the run's own numbers and two policies measured to
   differ.
9. The `checkEverySeconds > 0` path and the stall re-ask were never exercised
   (B). A test with a 5-second policy now pins them.
10. The frozen test now pins "alive" (B).
11. Spec §5's text block has no renderer in the plan (B): marked illustrative
    in the spec; a renderer comes with the screen that shows it.

**Accepted risks** (objection, cheaper alternative, why rejected):

- **Required fields on `Book`.** *Objection:* nothing shares books yet;
  `finish` could be derived as the last one-time row of the last chapter;
  three fields cost every fixture. *Alternative:* derive `finish`, defer
  `version` and `length`. *Rejected because* the user named versioned,
  shareable books as the goal of this work, and a derived finish is a hidden
  rule an author only learns by tripping it; the validator makes the choice
  explicit. Every fixture pays three short fields once.
- **Merging before #47 and #45.** *Objection:* #45 alone moves The Salt Road's
  life 1 to 8.72 min and trips short-life, so the next slice starts by editing
  this test. *Alternative:* ship `play()` alone and defer the report, flags
  and format fields until both land. *Rejected because* the flag firing then
  is the play doing its job, telling the truth about a change that shortened
  lives; the e2e test is a characterization, commented as such, and editing
  it is the re-measure the spec asks for. The runner, flags and stamps
  survive #47 unchanged; only the policy does not.
- **Off-length is nearly insensitive on The Salt Road.** *Objection:* ±20%
  on the hall's stone lands inside ±25%, because decay dominates the length.
  *Alternative:* none cheaper that keeps the user's ±25%. *Rejected because*
  that is a finding about the placeholder numbers (#21, #44), not about the
  check, which the test books exercise on both sides.
- **CI cost.** *Objection:* the suite goes from 1.4 s to about 6.6 s.
  *Alternative:* keep The Salt Road reading out of the default run.
  *Rejected because* the one real book finishing is the check this whole
  slice exists for; 5 s is affordable, and bound tests use small bounds.
- **Frozen blames the book for a policy that did not queue a row.**
  *Objection:* a policy bug reads as a book bug. *Alternative:* only flag a
  freeze when every row is queued. *Rejected for now because* the stand-in
  queues every row, so today the two are the same; the distinction is written
  into the tuned-policy issue for after #47.

**Asked of the user, pending:** `livesBound: 1000` and The Salt Road's
`{ days: 5 }` (asked before round one); whether the 10-minute short-life line
stays, knowing #45 will make the shipped book flag it (round one's finding).
Task 1 does not commit until both are answered.

---

**Goal:** A book declares its version, its finish and its length; the engine
plays a book from zero across lives and reports, stamped with the play's
version, how long it measures in game time and which flags fired.

**Architecture:** Three fields join `Book` in `src/data/types.ts` and three
rules join `validateBook`. A new `src/engine/play.ts` holds `play()` (one
playthrough under one policy, with its stop conditions), `measure()` (the
report over a list of policies, with the flags), the game-time formatter, and
one stand-in policy. Thresholds live in a new `balance.play` section; unit
conversions in `src/engine/time.ts`. Nothing in `src/ui/` or `src/state/`
changes.

**Tech Stack:** TypeScript (strict, `noUncheckedIndexedAccess`), Vitest
(`node` environment for everything here).

**Spec:** [`docs/specs/2026-09-23-headless-play.md`](../specs/2026-09-23-headless-play.md)

## Global Constraints

- The engine never imports from `src/ui/` or `src/state/` (decision #4); `play.ts` imports only `src/data/types`, `src/balance` and engine modules.
- No clock, no randomness in the engine: no `Date.now()`, no `Math.random()`, no `performance`.
- Every tuning number in `src/engine/` and `src/data/` comes from `balance.ts` (decision #3); counts and unit conversions do not (unit conversions live in `time.ts`, as `MS_PER_SECOND` does).
- New balance values, all put to the user: `maxBookDays: 60`, `minBookHours: 24`, `maxLifeMinutes: 60`, `minLifeMinutes: 10`, `lengthTolerance: 0.25`, `hoursShownUpTo: 48`. The Salt Road declares `{ days: 5 }`.
- Game time only: ticks. Shown in hours up to 48 h, in whole days past that, rounded to the nearest whole unit; under half an hour shows `< 1 h`.
- `PLAY_VERSION = 1`, exported from `src/engine/play.ts`.
- Terse commit subjects, no trailers, no emoji.
- Commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:hooks`. Not `npx vitest`.

## Review Focus

1. **A re-queuing policy never makes `step()` return the same object**, so a freeze must be detected by `runTicks`, not identity (spec §6). Task 2's frozen test uses the stand-in, which re-queues every tick.
2. **Death on the tick the finish would complete** cannot happen: `step()` returns on death before working the queue. The loop checks `dead` first for readability; no test can tell the orders apart, and none claims to.
3. **A rebirth starts paused** (`paused: 'system'`); a loop that forgets `setPaused(…, 'none')` reads as frozen at life 2. Task 2's multi-life test would fail as `frozen`.
4. **A book that never ends a life** (decay compounding toward zero) must still stop. Task 2 pins the give-up with a repeatable ×0.5 row that produces nothing, and asserts `lives === 1`. Deleting the give-up line hangs the suite rather than failing it, and a ceiling that wrongly reads the declared length makes the `{ days: 50 }` case run for minutes (accepted, Revision 3).
5. **The formatter at the boundaries:** 48 h and 48.4 h show `48 h`, 48.6 h shows `2 days`, 0.2 h shows `< 1 h`. Task 2 pins the table.

---

### Task 1: The book format gains `version`, `finish`, `length`; `balance.play`

**Files:**
- Modify: `src/data/types.ts`, `src/data/validate.ts`, `src/data/salt-road.ts`, `src/balance.ts`
- Create: `src/data/length.ts`
- Test: `src/data/validate.test.ts`, `src/data/salt-road.test.ts`, `src/balance.test.ts`

**Interfaces:**
- Produces: `type BookLength = { readonly hours: number } | { readonly days: number }`; `Book.version: number`, `Book.finish: ActionId`, `Book.length: BookLength`; `balance.play = { maxBookDays, minBookHours, maxLifeMinutes, minLifeMinutes, lengthTolerance, hoursShownUpTo }`; `src/data/length.ts`: `HOURS_PER_DAY`, `lengthInHours(length: BookLength): number`.

- [ ] **Step 1: Add the fields to the type**

In `src/data/types.ts`, above `Book`:

```ts
/** The author's claim, in game time (spec 2026-09-23-headless-play section 3). Never a measurement. */
export type BookLength = { readonly hours: number } | { readonly days: number };
```

and in `Book`:

```ts
  /** 1, 2, ... A shared book is "The Salt Road v1" (headless-play spec section 3). */
  readonly version: number;
  /** The big event whose completion finishes the book: a one-time row in the last chapter. */
  readonly finish: ActionId;
  readonly length: BookLength;
```

- [ ] **Step 2: Add `balance.play`**

In `src/balance.ts`, a new section after `automation`:

```ts
  /**
   * The headless play (spec 2026-09-23-headless-play section 6). Agreed with the
   * user in the brainstorm. Bounds on the measuring bot only; a person playing
   * is never stopped.
   */
  play: {
    /** The bot gives up on a book at this, and a book may not declare more: past it a book cannot be loaded. */
    maxBookDays: 60,
    /** A book measuring under this is too short and pays no finishing points (when points exist). */
    minBookHours: 24,
    /** A life longer than this is flagged; the run goes on. */
    maxLifeMinutes: 60,
    /** A sane policy's life ending in death under this is warned about. Half the 20-minute target. */
    minLifeMinutes: 10,
    /** The measured range may sit this far either side of the declared length. */
    lengthTolerance: 0.25,
    /** Game time is shown in hours up to this, in whole days past it. */
    hoursShownUpTo: 48,
  },
```

- [ ] **Step 3: Write the failing tests**

`src/balance.test.ts`, a new case:

```ts
  it('holds the headless play thresholds', () => {
    expect(balance.play).toEqual({ maxBookDays: 60, minBookHours: 24, maxLifeMinutes: 60, minLifeMinutes: 10, lengthTolerance: 0.25, hoursShownUpTo: 48 });
  });
```

`src/data/validate.test.ts` (import `balance` from `../balance`): give `good` the three fields (`version: 1, finish: 'hut', length: { hours: 1 }`) and any other `Book` literal in the file the same, then add:

```ts
  it('rejects a version that is not a positive integer', () => {
    for (const version of [0, -1, 1.5, Number.NaN]) {
      expect(validateBook({ ...good, version })).toContainEqual(expect.stringMatching(/version/));
    }
  });
  it('rejects a finish that is not a row', () => {
    expect(validateBook({ ...good, finish: 'nothing' })).toContainEqual(expect.stringMatching(/finish "nothing" is not a row/));
  });
  it('rejects a finish that is repeatable', () => {
    expect(validateBook({ ...good, finish: 'forage' })).toContainEqual(expect.stringMatching(/finish "forage".*one-time/));
  });
  it('rejects a finish outside the last chapter', () => {
    const b: Book = { ...good, chapters: [good.chapters[0]!, { head: { numeral: 'II', chapter: 'Two', story: 'Later.' }, order: [] }] };
    expect(validateBook(b)).toContainEqual(expect.stringMatching(/finish "hut".*last chapter/));
  });
  it('rejects a length that is not a positive number', () => {
    for (const length of [{ hours: 0 }, { days: -2 }, { hours: Number.POSITIVE_INFINITY }]) {
      expect(validateBook({ ...good, length })).toContainEqual(expect.stringMatching(/length/));
    }
  });
  it('rejects a length past the ceiling, in days or in hours, and accepts one at it', () => {
    const max = balance.play.maxBookDays;
    expect(validateBook({ ...good, length: { days: max + 1 } })).toContainEqual(expect.stringMatching(/cannot be loaded/));
    expect(validateBook({ ...good, length: { hours: (max + 1) * 24 } })).toContainEqual(expect.stringMatching(/cannot be loaded/));
    expect(validateBook({ ...good, length: { days: max } })).toEqual([]);
  });
```

`src/data/salt-road.test.ts`:

```ts
  it('is version 1, finishes at the hall, and claims five days', () => {
    expect(saltRoad.version).toBe(1);
    expect(saltRoad.finish).toBe('hall');
    expect(saltRoad.length).toEqual({ days: 5 });
  });
```

- [ ] **Step 4: Run to verify they fail**

Run: `npm run typecheck` — expected: errors where `Book` literals lack the fields. `npm test` — expected: the new validator, Salt Road and balance cases fail.

- [ ] **Step 5: Implement**

`src/data/length.ts`:

```ts
/**
 * A declared length in hours. The data layer needs it (the validator's
 * ceiling) and may not import the engine, so the unit lives here and the
 * engine imports it. A unit conversion, not tuning (see MS_PER_SECOND in
 * src/engine/time.ts).
 */
import type { BookLength } from './types';

export const HOURS_PER_DAY = 24;

export function lengthInHours(length: BookLength): number {
  return 'hours' in length ? length.hours : length.days * HOURS_PER_DAY;
}
```

`src/data/salt-road.ts`, after `name`:

```ts
  version: 1,
  finish: 'hall',
  /** The author's claim, not tuning (headless-play spec section 3); measured at about 120 h. */
  length: { days: 5 },
```

`src/data/validate.ts`, importing `balance` from `../balance` and `HOURS_PER_DAY`, `lengthInHours` from `./length`, before `return problems`:

```ts
  if (!Number.isInteger(book.version) || book.version < 1) problems.push(`version ${book.version} is not a positive integer`);
  const last = book.chapters[book.chapters.length - 1];
  if (!has(book.actions, book.finish)) problems.push(`finish "${book.finish}" is not a row`);
  else if (!book.actions[book.finish]!.isOneTime) problems.push(`finish "${book.finish}" is repeatable; it must be one-time`);
  else if (last === undefined || !last.order.includes(book.finish)) problems.push(`finish "${book.finish}" is not in the last chapter`);
  const amount = 'hours' in book.length ? book.length.hours : book.length.days;
  if (!Number.isFinite(amount) || amount <= 0) problems.push(`length ${amount} is not a positive number`);
  else if (lengthInHours(book.length) > balance.play.maxBookDays * HOURS_PER_DAY) problems.push(`length is past ${balance.play.maxBookDays} days: a book that long cannot be loaded`);
```

Fix any other `Book` literal that typecheck names by adding the three fields.

- [ ] **Step 6: Verify green**

Run: `npm run typecheck`, `npm run lint`, `npm test` — all green; `books.test.ts` still passes.

- [ ] **Step 7: Commit**

```bash
git add src/data src/balance.ts src/balance.test.ts
git commit -m "feat: books declare a version, a finish and a length"
```

---

### Task 2: `play()`, the formatter, the stand-in policy

**Files:**
- Modify: `src/engine/time.ts` (two unit constants, `ticksPerHour()`)
- Create: `src/engine/play.ts` (test books live in the tests)
- Test: `src/engine/play.test.ts`, `src/engine/time.test.ts`

**Interfaces:**
- Consumes: `Book`, `BookLength` (Task 1); `balance.play` (Task 1); `newState`, `enqueue` (`./queue`); `step`, `setPaused` (`./tick`); `rebirth` (`./rebirth`); `ticksPerSecond` (`./time`); `GameState` (`./types`).
- Produces:

```ts
// time.ts
export function ticksPerHour(): number;
// play.ts
export const PLAY_VERSION = 1;
export type PlayBounds = { readonly [K in keyof typeof balance.play]: number };
export interface Policy {
  readonly name: string;
  readonly sane: boolean;
  readonly checkEverySeconds: number;
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
export function play(book: Book, policy: Policy, bounds?: PlayBounds): PlayRun;
export function declaredTicks(length: BookLength): number;
export function formatGameTime(ticks: number): string;
export const everyRowInOrder: Policy;
```

- [ ] **Step 1: Write the failing tests**

`src/engine/time.test.ts`, a new case:

```ts
  it('an hour of game time is sixty minutes of ticks', () => {
    expect(ticksPerHour()).toBe(balance.time.ticksPerMinute * 60);
  });
```

(import `ticksPerHour` from `./time` and `balance` if the file does not already.)

`src/engine/play.test.ts`. Test books built in the test (numbers in tests are expected values, not tuning). Every test book carries a shelter, a one-time ×0.8 row like The Salt Road's cabin: without it a sane life 1 is 9.56 min (panel, measured) and the short-life flag fires on the control.

```ts
import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import type { Book } from '../data/types';
import { declaredTicks, everyRowInOrder, formatGameTime, play, type Policy } from './play';

const hour = balance.time.ticksPerMinute * 60;

/**
 * Forage feeds, Mine yields stone, a shelter slows decay like The Salt Road's
 * cabin, and the monument sinks `stone` and finishes the book.
 */
function monumentBook(stone: number, expCost: number): Book {
  return {
    id: 'monument', name: 'Monument', version: 1, finish: 'monument', length: { hours: 1 },
    roster: [
      { id: 'forage', name: 'Forage', icon: 'sprout' },
      { id: 'mine', name: 'Mine', icon: 'pickaxe' },
      { id: 'build', name: 'Build', icon: 'house' },
    ],
    chapters: [{ head: { numeral: 'I', chapter: 'One', story: 'A start.' }, order: ['forage', 'mine', 'shelter', 'monument'] }],
    items: {
      berries: { id: 'berries', name: 'berries', kind: 'food', cap: 20, healPerUnit: 4 },
      stone: { id: 'stone', name: 'stone', kind: 'material', cap: 5 },
      shelter: { id: 'shelter', name: 'shelter', kind: 'structure', cap: 1 },
      monument: { id: 'monument', name: 'monument', kind: 'structure', cap: 1 },
    },
    actions: {
      forage: { id: 'forage', verb: 'forage', noun: 'berries', expCost: 4.2, producedItem: 'berries', producedAmount: 1, itemCosts: [], isOneTime: false },
      mine: { id: 'mine', verb: 'mine', noun: 'stone', expCost: 6, producedItem: 'stone', producedAmount: 1, itemCosts: [], isOneTime: false },
      shelter: { id: 'shelter', verb: 'build', noun: 'a shelter', expCost: 60, producedItem: 'shelter', producedAmount: 1, itemCosts: [{ item: 'stone', amount: 6 }], isOneTime: true, healthDecayMultiplier: 0.8 },
      monument: { id: 'monument', verb: 'build', noun: 'a monument', expCost, producedItem: 'monument', producedAmount: 1, itemCosts: [{ item: 'stone', amount: stone }], isOneTime: true },
    },
  };
}

/** The monument costs gold, which nothing produces: Forage and Mine fill, then nothing can run. */
function frozenBook(): Book {
  const b = monumentBook(3, 30);
  return {
    ...b,
    items: { ...b.items, gold: { id: 'gold', name: 'gold', kind: 'material', cap: 5 } },
    actions: { ...b.actions, monument: { ...b.actions.monument!, itemCosts: [{ item: 'gold', amount: 1 }] } },
  };
}

describe('play', () => {
  it('finishes a small book in life 1', () => {
    const run = play(monumentBook(3, 30), everyRowInOrder);
    expect(run.outcome).toBe('finished');
    expect(run.lives).toBe(1);
    expect(run.ticksPerLife).toHaveLength(1);
    expect(run.totalTicks).toBe(run.ticksPerLife[0]);
    expect(run.totalTicks).toBeGreaterThan(0);
  });
  it('finishes a larger book after dying, and every life is counted', () => {
    const run = play(monumentBook(150, 1500), everyRowInOrder);
    expect(run.outcome).toBe('finished');
    expect(run.lives).toBeGreaterThan(1);
    expect(run.ticksPerLife).toHaveLength(run.lives);
    expect(run.totalTicks).toBe(run.ticksPerLife.reduce((a, b) => a + b, 0));
  });
  it('a policy that checks in every 5 seconds is asked about once per 5 seconds of game time', () => {
    let calls = 0;
    const every5: Policy = { ...everyRowInOrder, name: 'every 5 s', checkEverySeconds: 5, decide: (s, book) => { calls += 1; return everyRowInOrder.decide(s, book); } };
    const run = play(monumentBook(150, 1500), every5);
    expect(run.outcome).toBe('finished');
    const perInterval = 5 * balance.time.ticksPerMinute / 60;
    // one call at the start of each life, then one per interval
    expect(calls).toBeGreaterThanOrEqual(Math.floor(run.totalTicks / perInterval));
    expect(calls).toBeLessThanOrEqual(Math.ceil(run.totalTicks / perInterval) + run.lives);
  });
  it('stops frozen, alive, when nothing the policy queues can run', () => {
    const run = play(frozenBook(), everyRowInOrder);
    expect(run.outcome).toBe('frozen');
    expect(run.lives).toBe(1);
    expect(run.ticksPerLife[0]).toBeGreaterThan(0);
    // alive: it froze well inside the first life a sane policy lives (panel measured 1.86 min)
    expect(run.ticksPerLife[0]).toBeLessThan(balance.play.minLifeMinutes * balance.time.ticksPerMinute);
  });
  // A ceiling of 1/6 day (4 h of game time) keeps the give-up tests fast; the default is 60 days.
  const quick = { ...balance.play, maxBookDays: 1 / 6 };
  const limit = declaredTicks({ days: quick.maxBookDays });

  it('gives up at the ceiling when the finish is out of reach, after several lives', () => {
    const run = play(monumentBook(100000, 1e9), everyRowInOrder, quick);
    expect(run.outcome).toBe('never-finishes');
    expect(run.lives).toBeGreaterThan(1);
    expect(run.totalTicks).toBe(limit + 1);   // stops on the first tick past it
  });
  it('the ceiling ignores what the book claims', () => {
    const b = monumentBook(100000, 1e9);
    for (const length of [{ hours: 1 }, { days: 50 }]) {
      expect(play({ ...b, length }, everyRowInOrder, quick).totalTicks).toBe(limit + 1);
    }
  });
  it('gives up on a book whose one life never ends', () => {
    // a repeatable x0.5 row that produces nothing and costs nothing: it compounds forever, so decay goes to zero
    const b = monumentBook(100000, 1e9);
    const endless: Book = {
      ...b,
      chapters: [{ ...b.chapters[0]!, order: ['forage', 'balm', 'mine', 'shelter', 'monument'] }],
      actions: { ...b.actions, balm: { id: 'balm', verb: 'forage', noun: 'balm', expCost: 1, itemCosts: [], isOneTime: false, healthDecayMultiplier: 0.5 } },
    };
    const run = play(endless, everyRowInOrder, quick);
    expect(run.outcome).toBe('never-finishes');
    expect(run.lives).toBe(1);   // the premise: nothing ever died
    expect(run.totalTicks).toBe(limit + 1);
  });
});

describe('game time', () => {
  it('declared lengths convert to ticks', () => {
    expect(declaredTicks({ hours: 2 })).toBe(2 * hour);
    expect(declaredTicks({ days: 3 })).toBe(72 * hour);
  });
  it('is shown in hours up to 48, in whole days past it', () => {
    expect(formatGameTime(0.2 * hour)).toBe('< 1 h');
    expect(formatGameTime(5.3 * hour)).toBe('5 h');
    expect(formatGameTime(48 * hour)).toBe('48 h');
    expect(formatGameTime(48.4 * hour)).toBe('48 h');
    expect(formatGameTime(48.6 * hour)).toBe('2 days');
    expect(formatGameTime(97 * hour)).toBe('4 days');
    expect(formatGameTime(233 * hour)).toBe('10 days');
    expect(formatGameTime(278 * hour)).toBe('12 days');
  });
});
```

The endless book was measured in round two (naysayer): a balm with no product compounds forever and the one life never ends. The give-up tests stop at 4 h of game time each, well under a second. Round three measured `limit + 1` exact for both books. If `totalTicks` lands one tick off `limit + 1`, check whether the loop tests the bound before or after the tick it counts and make the test state the loop's actual rule; do not loosen it to a range.

- [ ] **Step 2: Run to verify they fail**

Run: `npm test` — expected: `play.test.ts` fails to resolve `./play`; the time case fails on the missing export.

- [ ] **Step 3: Implement**

`src/engine/time.ts`, beside `MS_PER_SECOND`, under the same rule its comment states:

```ts
/** A unit conversion for game time shown to a person, not tuning (see MS_PER_SECOND). */
const MINUTES_PER_HOUR = 60;

/** Ticks in one hour of game time. */
export function ticksPerHour(): number {
  return balance.time.ticksPerMinute * MINUTES_PER_HOUR;
}
```

`src/engine/play.ts`:

```ts
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

/** Bumped by hand whenever the play's rules change: a policy, a check, a bound (spec section 5). */
export const PLAY_VERSION = 1;

/** balance.play's shape with plain numbers, so a test or a caller can pass other bounds. */
export type PlayBounds = { readonly [K in keyof typeof balance.play]: number };

export interface Policy {
  readonly name: string;
  /** Counted by the short-life flag: a sane policy eats and walks every row. */
  readonly sane: boolean;
  /** 0 means every tick. Counted in loop passes, so a stalled pass (no tick) brings the next ask closer. */
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
  let sinceDecide = interval;       // decide on the first tick
  const end = (outcome: PlayOutcome, last: GameState): PlayRun => {
    const lives = [...ticksPerLife, last.runTicks];
    return { policy: policy.name, outcome, lives: lives.length, ticksPerLife: lives, totalTicks: before + last.runTicks };
  };
  for (;;) {
    const decideNow = sinceDecide >= interval;
    if (decideNow) { s = policy.decide(s, book); sinceDecide = 0; }
    const next = step(s, book);
    if (next.dead) {
      ticksPerLife.push(next.runTicks);
      before += next.runTicks;
      s = setPaused(rebirth(next), 'none');
      sinceDecide = interval;
      continue;
    }
    if (next.completedOneTime.includes(book.finish)) return end('finished', next);
    const advanced = next.runTicks !== s.runTicks;
    // A freeze is time not advancing after the policy has had its turn. Not
    // identity: a policy that re-queues makes a new state every call (spec section 6).
    if (!advanced && decideNow) return end('frozen', next);
    if (before + next.runTicks > giveUpAt) return end('never-finishes', next);
    s = next;
    sinceDecide += 1;
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
```

- [ ] **Step 4: Run to verify they pass**

Run: `npm test` — expected: all green.

- [ ] **Step 5: Typecheck both programs, lint**

Run: `npm run typecheck`, `npm run lint` — expected green. `tsconfig.engine.json` compiles `play.ts` with no DOM.

- [ ] **Step 6: Commit**

```bash
git add src/engine/play.ts src/engine/play.test.ts src/engine/time.ts src/engine/time.test.ts
git commit -m "feat: play a book from zero across lives, with a stand-in policy"
```

---

### Task 3: `measure()`, the flags and the report

**Files:**
- Modify: `src/engine/play.ts`
- Test: `src/engine/measure.test.ts`

**Interfaces:**
- Consumes: everything Task 2 produces.
- Produces:

```ts
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
  readonly gameVersion: string;
  readonly declared: BookLength;
  readonly runs: readonly PlayRun[];
  readonly range: { readonly min: number; readonly max: number } | null;
  readonly flags: readonly PlayFlag[];
}
export function measure(book: Book, policies: readonly Policy[], gameVersion: string, bounds?: PlayBounds): PlayReport;
```

- [ ] **Step 1: Write the failing tests**

`src/engine/measure.test.ts`. Copy `monumentBook` and `frozenBook` verbatim from Task 2's `play.test.ts` (two users do not earn a shared helper file).

```ts
import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import { saltRoad } from '../data/salt-road';
import type { Book } from '../data/types';
import { PLAY_VERSION, declaredTicks, everyRowInOrder, formatGameTime, measure, type PlayFlag, type Policy } from './play';
import { enqueue } from './queue';

// monumentBook(stone, expCost) and frozenBook(): copied verbatim from play.test.ts

const hour = balance.time.ticksPerMinute * 60;
const shortLife = (flags: readonly PlayFlag[]) => flags.filter((f): f is Extract<PlayFlag, { kind: 'short-life' }> => f.kind === 'short-life');

/** Every tick, the rows in reverse chapter order: the monument first. It never eats (Forage comes last and never runs), so it is not sane. Measured to finish on a different total. */
const monumentFirst: Policy = {
  name: 'monument first', sane: false, checkEverySeconds: 0,
  decide: (s, book) => [...book.chapters.flatMap((c) => c.order)].reverse().reduce((acc, id) => enqueue(acc, book, id), s),
};

describe('measure', () => {
  it('stamps the book, the play and the game', () => {
    const r = measure(monumentBook(3, 30), [everyRowInOrder], 'test-1');
    expect(r).toMatchObject({ bookId: 'monument', bookVersion: 1, playVersion: PLAY_VERSION, gameVersion: 'test-1', declared: { hours: 1 } });
    expect(r.runs).toHaveLength(1);
  });
  it('the range spans the finished runs', () => {
    const r = measure(monumentBook(150, 1500), [everyRowInOrder, monumentFirst], 'test');
    const [a, b] = r.runs.map((run) => run.totalTicks);
    expect(a).not.toBe(b);   // the precondition: the two policies measure differently
    expect(r.range).toEqual({ min: Math.min(a!, b!), max: Math.max(a!, b!) });
  });
  it('the range is null and never-finishes is flagged when nothing finished', () => {
    const r = measure(monumentBook(100000, 1e9), [everyRowInOrder], 'test', { ...balance.play, maxBookDays: 1 / 6 });
    expect(r.range).toBeNull();
    expect(r.flags).toContainEqual({ kind: 'never-finishes', policy: everyRowInOrder.name });
  });
  it('flags a frozen run with the life it froze in', () => {
    expect(measure(frozenBook(), [everyRowInOrder], 'test').flags).toContainEqual({ kind: 'frozen', policy: everyRowInOrder.name, life: 1 });
  });
  it('flags a short life when a sane policy walks into a decay trap, and not without the trap', () => {
    const b = monumentBook(150, 1500);
    const trap: Book = {
      ...b,
      chapters: [{ ...b.chapters[0]!, order: ['forage', 'curse', 'mine', 'shelter', 'monument'] }],
      items: { ...b.items, curse: { id: 'curse', name: 'curse', kind: 'structure', cap: 1 } },
      actions: { ...b.actions, curse: { id: 'curse', verb: 'build', noun: 'a cursed shrine', expCost: 1, producedItem: 'curse', producedAmount: 1, itemCosts: [], isOneTime: true, healthDecayMultiplier: 3 } },
    };
    const trapped = measure(trap, [everyRowInOrder], 'test');
    expect(trapped.runs[0]!.outcome).toBe('finished');   // it plays long overall; its lives are short (about 20 h, measured)
    const flags = shortLife(trapped.flags);
    expect(flags).toHaveLength(1);   // one per policy
    const died = trapped.runs[0]!.ticksPerLife.slice(0, -1);
    const line = balance.play.minLifeMinutes * balance.time.ticksPerMinute;
    expect(flags[0]!.lives).toBe(died.filter((t) => t < line).length);
    expect(flags[0]!.ticks).toBe(Math.min(...died));
    expect(trapped.runs[0]!.ticksPerLife[flags[0]!.life - 1]).toBe(flags[0]!.ticks);
    // The control clears the line by 8 s at today's numbers (panel, measured: shortest life 10.14 min, life 3); #45 will move it.
    const control = measure(b, [everyRowInOrder], 'test');
    expect(shortLife(control.flags)).toEqual([]);
    expect(trapped.runs[0]!.ticksPerLife[0]!).toBeLessThan(control.runs[0]!.ticksPerLife[0]!);
  });
  it('short-life counts only the lives under the line', () => {
    const b = monumentBook(150, 1500);
    const died = measure(b, [everyRowInOrder], 'test').runs[0]!.ticksPerLife.slice(0, -1);
    const sorted = [...died].sort((x, y) => x - y);
    const lineTicks = sorted[Math.floor(sorted.length / 2)]!;   // the median: some lives under it, some not
    const f = shortLife(measure(b, [everyRowInOrder], 'test', { ...balance.play, minLifeMinutes: lineTicks / balance.time.ticksPerMinute }).flags);
    const under = died.filter((t) => t < lineTicks).length;
    expect(under).toBeGreaterThan(0);
    expect(under).toBeLessThan(died.length);
    expect(f).toHaveLength(1);
    expect(f[0]!.lives).toBe(under);
  });
  it('an insane policy dying fast is not a short-life flag', () => {
    const starve: Policy = { name: 'starve', sane: false, checkEverySeconds: 0, decide: (s, book) => everyRowInOrder.decide(s, { ...book, chapters: [{ ...book.chapters[0]!, order: ['mine', 'monument'] }] }) };
    const r = measure(monumentBook(150, 1500), [starve], 'test');
    expect(r.runs[0]!.ticksPerLife[0]!).toBeLessThan(balance.play.minLifeMinutes * balance.time.ticksPerMinute);   // it does die fast
    expect(shortLife(r.flags)).toEqual([]);
  });
  it('flags a life past the per-life cap, and keeps playing', () => {
    const r = measure(monumentBook(150, 1500), [everyRowInOrder], 'test', { ...balance.play, maxLifeMinutes: 1 });
    expect(r.runs[0]!.outcome).toBe('finished');
    const long = r.flags.filter((f) => f.kind === 'long-life');
    expect(long).toHaveLength(r.runs[0]!.lives);   // every life of this book is over a minute
    expect(long[0]).toEqual({ kind: 'long-life', policy: everyRowInOrder.name, life: 1, ticks: r.runs[0]!.ticksPerLife[0] });
  });
  it('flags a measured length off the declared one by more than the tolerance, on either side', () => {
    const b = monumentBook(3, 30);
    const measured = measure(b, [everyRowInOrder], 'test').runs[0]!.totalTicks;
    const hours = measured / hour;
    expect(measure({ ...b, length: { hours } }, [everyRowInOrder], 'test').flags.some((f) => f.kind === 'off-length')).toBe(false);
    for (const claim of [hours * 2, hours / 2]) {
      const off = measure({ ...b, length: { hours: claim } }, [everyRowInOrder], 'test').flags;
      expect(off).toContainEqual({ kind: 'off-length', declared: declaredTicks({ hours: claim }), min: measured, max: measured });
    }
  });
  it('off-length reads the short end against the low side and the long end against the high side', () => {
    const b = monumentBook(150, 1500);
    const pair = [everyRowInOrder, monumentFirst];
    const r0 = measure(b, pair, 'test');
    const { min, max } = r0.range!;
    expect(r0.runs.every((run) => run.outcome === 'finished')).toBe(true);
    expect(min).toBeLessThan(max * (1 - balance.play.lengthTolerance));   // precondition (measured 3.66 h and 7.18 h)
    // declared at max: only the short run can fall under the low side
    expect(measure({ ...b, length: { hours: max / hour } }, pair, 'test').flags).toContainEqual(expect.objectContaining({ kind: 'off-length', min, max }));
    // declared at min: only the long run can pass the high side
    expect(measure({ ...b, length: { hours: min / hour } }, pair, 'test').flags).toContainEqual(expect.objectContaining({ kind: 'off-length', min, max }));
  });
  it('flags a book that measures under the 24-hour floor, and not one over it', () => {
    const r = measure(monumentBook(150, 1500), [everyRowInOrder], 'test');   // about 3.7 h
    expect(r.flags).toContainEqual({ kind: 'too-short', min: r.range!.min, floor: declaredTicks({ hours: balance.play.minBookHours }) });
    const lower = measure(monumentBook(150, 1500), [everyRowInOrder], 'test', { ...balance.play, minBookHours: 1 });
    expect(lower.flags.some((f) => f.kind === 'too-short')).toBe(false);
  });
  it('too-short reads the shortest finished run', () => {
    // a floor between the two runs (3.66 h and 7.18 h): only the short one is under it
    const r = measure(monumentBook(150, 1500), [everyRowInOrder, monumentFirst], 'test', { ...balance.play, minBookHours: 5 });
    expect(r.range!.min).toBeLessThan(declaredTicks({ hours: 5 }));
    expect(r.range!.max).toBeGreaterThan(declaredTicks({ hours: 5 }));
    expect(r.flags).toContainEqual({ kind: 'too-short', min: r.range!.min, floor: declaredTicks({ hours: 5 }) });
  });
});

/**
 * A characterization of The Salt Road v1 at today's placeholder numbers and the
 * stand-in policy (panel, measured: life 457, 120.6 h, shortest life 10.14 min at life 3, 8 s over the line). When
 * #45, #47, #21 or #44 lands, re-measure and update: a new flag here is the play
 * telling the truth about the change, not a test to bend.
 */
describe('The Salt Road v1, end to end', () => {
  it('finishes at the hall, measures 5 days, and raises no flag', () => {
    const r = measure(saltRoad, [everyRowInOrder], 'test');
    expect(r.runs[0]!.outcome).toBe('finished');
    expect(formatGameTime(r.range!.max)).toBe('5 days');
    expect(r.flags).toEqual([]);
  }, 60_000);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test` — expected: `measure.test.ts` fails, `measure` is not exported.

- [ ] **Step 3: Implement, appended to `src/engine/play.ts`**

```ts
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
  return { bookId: book.id, bookVersion: book.version, playVersion: PLAY_VERSION, gameVersion, declared: book.length, runs, range, flags };
}
```

A run that gives up does so on a live tick, so its last life is always alive; `died` never includes it.

- [ ] **Step 4: Run to verify they pass**

Run: `npm test` — expected green. If The Salt Road measures other than `5 days` or raises a flag, **stop and report the measured numbers**: the declared length and the thresholds are the user's, and a mismatch is a finding, not a test to bend. If `monumentFirst` measures the same total as `everyRowInOrder`, report it; do not weaken the assertion.

- [ ] **Step 5: Typecheck, lint, hooks**

Run: `npm run typecheck`, `npm run lint`, `npm run test:hooks` — expected green.

- [ ] **Step 6: Commit**

```bash
git add src/engine/play.ts src/engine/measure.test.ts
git commit -m "feat: measure a book: range, flags, and the play's version"
```

---

### Task 4: Docs

**Files:** `CLAUDE.md`, `.github/workflows/ci.yml`, `src/data/salt-road.ts` header, `src/balance.ts` content comment, this plan's status line.

- [ ] **Step 1:** In `CLAUDE.md`'s source-layout block, under `engine/`, add: `— play.ts plays a book headless and measures its length (spec 2026-09-23-headless-play)`.
- [ ] **Step 2:** Update the two comments that say the hall is a sink no life completes: no *first* life completes it, and the play measures it finishing on about life 457.
- [ ] **Step 3:** In `.github/workflows/ci.yml`, add `timeout-minutes: 15` to the `verify` job, under `runs-on`: a synchronous loop that never ends is not interrupted by vitest's per-test timeout.
- [ ] **Step 4:** Run `npm run typecheck`, `npm test` — green.
- [ ] **Step 5: Commit** — `git commit -am "docs: the headless play in CLAUDE.md and the Salt Road notes"`

---

### Task 5: Code panel, then Chrome

- [ ] Run all four gates. Dispatch `engine-reviewer`, `tuning-guard`, `vacuous-test-hunter`, a generic reviewer against this plan, and a naysayer, in parallel. Loop to a clean round.
- [ ] Chrome (`chrome-verify` skill): the game still loads The Salt Road, plays, dies and rebirths, console clean. Nothing visible changed; this confirms the format change broke nothing.

## Execution Handoff

- **Task 1 inline:** it locks the format, the ceiling rule and the balance section.
- **Task 2 inline:** it locks `play.ts`'s shape and the loop's freeze and give-up rules.
- **Task 3 subagent (Opus), "Task 3 only":** pure logic against a fixed interface.
- **Task 4 inline**, **Task 5 inline** (panel dispatch, Chrome).

## Open

- Filed after merge, in the handoff's tracker batch: refusing a `never-finishes` book at load time (with the shelf); "a `too-short` book pays no finishing points" (on the badges/shop issue); hubs and branch orders (spec §8); the tuned policy set after #47, including the frozen-blames-the-book distinction and counting reactions to a popped queue as touches; keeping earlier readings beside a book (spec §5); a screen for the report; `package.json` version tracking releases. And #51's spec link to `blob/main`.
