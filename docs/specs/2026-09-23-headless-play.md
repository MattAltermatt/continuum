# The headless play: a book's length, measured honestly

2026-09-23 · issue [#51](https://github.com/MattAltermatt/continuum/issues/51) ·
builds on [books own their skills](2026-09-23-books-own-their-skills.md) §8–9

## 1. What it is for

*(user)* Two goals, in the user's words: *"have a version in the book so that
they can be shared"* and *"continue to improve the engine and this test, so as
more tests are added or more loopholes found, I want to be honest with someone
that their v1 book that said 95 hours is actually x."* It will eventually be
shown to players who add books that do not ship with the game.

So the play is not a one-time certificate. It is a **reading**, stamped with
what took it, that can be taken again when the play gets better.

## 2. Scope: the half that survives the queue rewrite

The play's *policy* (what a player queues, and when) is written against the
queue, and #47 replaces the queue's semantics: only the top entry runs, and an
entry that cannot run is popped. Every policy written today breaks under it
*(panel, measured: "keep every row queued" under #47 runs Forage forever)*. And
the rules #51 inherited from the validator are caught by playing, not by
policy tuning.

This slice builds what does not depend on the queue:

- the finish, the version and the declared length on the book format
- `play()`: one playthrough from zero across lives, with its stop conditions
- `measure()`: the report, over a set of policies, with its flags and stamps
- one stand-in policy, labelled as such until #47

Not in this slice, each filed on its own: the tuned policy set (after #47),
hubs and branch orders (§6), keeping old readings beside a book (§5), the
screen a player reads a report on.

## 3. The book format gains three fields

```ts
interface Book extends Content {
  // ...existing
  readonly version: number;          // 1, 2, ... A shared book is "The Salt Road v1".
  readonly finish: ActionId;         // the big event whose completion finishes the book
  readonly length: BookLength;       // the author's claim, in game time
}
type BookLength = { readonly hours: number } | { readonly days: number };
```

`validateBook` requires all three: `version` a positive integer, `finish` a
one-time row in the last chapter's order, `length` a positive number no
longer than 60 days (§6).

The Salt Road v1: `finish: 'hall'`, `length: { days: 5 }` *(user: "yes" to 5
days, 2026-09-23)*. *(panel, measured
at today's numbers)* the hall does complete, on about life 457 after about
120 h of game time, and the whole playthrough runs in about 4 s headless.
§8 of the parent spec said The Salt Road has no finish; that was an estimate
(life 407, 125 h, spec §4) from a different policy, and measuring replaced it.

**The measurement is never stored in the book.** The declared length is the
author's claim; the measured length is recomputed. A shared file cannot carry
a stale number that looks authoritative.

## 4. Game time, and how it is shown

Everything is **game time**: ticks, which pass only while work happens
(decision #41). A player's wall-clock time is longer by however long they
spend in front of an empty queue; the report says so.

*(user)* Shown in hours up to 48 h, in whole days past that: *"no human can
really tell the difference between 278 and 233 hours."*

```text
measured   shown
--------   --------
5.3 h      5 h
48 h       48 h
97 h       4 days
278 h      12 days
```

One formatter, in the engine, used by the report and later by the shelf.
Rounding to the nearest whole unit; a length that rounds to 0 h shows `< 1 h`.

## 5. The report

```text
The Salt Road v1 · declared 5 days
measured by play v1: 5 days (5–5)
  flags: none
```

*(Illustrative: the text a screen would render from the report below. The
renderer comes with that screen.)*

```ts
interface PlayReport {
  readonly bookId: string;
  readonly bookVersion: number;
  readonly playVersion: number;       // PLAY_VERSION, see below
  readonly gameVersion: string;       // supplied by the caller; the engine does not read package.json
  readonly declared: BookLength;
  readonly runs: readonly PlayRun[];  // one per policy
  readonly range: { min: number; max: number } | null;   // total ticks over finished runs; null if none finished
  readonly flags: readonly PlayFlag[];
}
```

**`PLAY_VERSION`** is an integer constant in `src/engine/play.ts`, bumped by
hand whenever the play's rules change: a policy added or changed, a check
added, a bound changed, a queue rewrite. Every report carries it, so a reading
from play v1 is never mistaken for one from play v3. The game version is
stamped too, because a change to `balance.ts` moves the numbers without the
play changing. (`package.json` is `0.0.0` today; keeping it in step with
releases is filed separately.)

Keeping earlier readings, to print *"play v1 had measured 88–97 h"*, needs
somewhere to keep them: the saves and the shelf. Filed with the shelf.

## 6. Flags

Each flag names what fired and, where one policy fired it, which policy. `off-length` and `too-short` are read off the range across every policy, so they name none.

```text
*(user)* The per-life cap is the user's: *"anything over 60 minutes flagged."*

flag            fires when                                                 number
--------------  ---------------------------------------------------------  --------------------------------
never-finishes  the bot gives up at the ceiling, unfinished                 balance.play.maxBookDays = 60
too-short       the measured length is under the floor; pays no points     balance.play.minBookHours = 24
frozen          a policy's run stops advancing, alive (decision #41)       none: runTicks did not advance
long-life       any life runs past the per-life cap                        balance.play.maxLifeMinutes = 60
short-life      a sane policy's life ends in death under the line          balance.play.minLifeMinutes = 10
off-length      the measured range leaves declared ± tolerance             balance.play.lengthTolerance = 0.25
```

**Short life, and what "sane" means here.** *(user)* *"If a player makes sane
decisions, they should live for 20 minutes ... I would like a check if there
is a way to 'short circuit' and have the time drop really low, and not have
completed the book."* A sane policy eats and walks every row the book offers.
A row that speeds decay (`healthDecayMultiplier > 1`) is exactly the short
circuit: the player did nothing foolish, the book laid a trap. *(panel,
measured)* a ×3 decay row gave 6.4-minute lives under chapter-order play with
eating. A no-food formula floor was considered and dropped: refusing to eat is
not sane play, and every book kills a player who does not eat. *(user)* The
line is 10 (answered "y"; the choice to keep it after the corrected margin
was delegated: "please figure this out")
minutes, half the 20-minute target; The Salt Road's life 1 under the stand-in
policy is 10.35 minutes, a narrow pass at placeholder numbers (#21, #44).

**Off-length.** *(user)* The tolerance is ±25%, put to the user and answered
"y", because a bot's estimate is good to
about 20% *(panel, measured: across six orders on the 500-stone hall, total
time spread 17% while lives spread 31%)*. Checked on both ends of the range.

**Frozen.** Detected as `runTicks` not advancing across a step after the
policy has had its turn. *(panel, measured)* `step()` returning the same
object is **not** a freeze test under a policy that re-queues: re-enqueueing a
full producer and settling it back out makes a new state every call, and a
no-sink book ran 200,000 such calls frozen at tick 2087.

**Giving up, and the ceiling.** *(user)* The bot gives up at **one ceiling
for every book, 60 days of game time** (`maxBookDays`), whatever the book
claims, and *"if it goes past 60 days, it can't even be loaded."* So the
validator rejects a declared length past 60 days, and a book the bot cannot
finish within 60 days reads `never-finishes`: the refusal. Blocking it at load
time lands with the shelf, the first thing that loads a player's book. It is
the bot's bound only; a person playing is never stopped. One rule covers both
ways a book can fail to end: a finish out of reach, and a life that never ends
(a repeatable row that slows decay compounds toward none, so nothing dies).
Worst case about a minute of CPU per policy.

Two stop rules were tried first and rejected *(panel, measured)*: a lives
count (1000 lives of about 20 minutes is about 14 days whatever the book
claims), and 4× the declared length, which the user picked first and which
failed the honesty goal: a book that claimed too little got no number at all
(The Salt Road declared 1 day read `never-finishes`), and one that claimed too
much could hold the bot for days.

**The floor.** *(user)* Played from zero, no abilities, every level 0, the
queue never empty, *"that should be at least 24 hours. I am the creator of
this, I say 24 hours."* A book measuring under it is `too-short`, and *"you
don't get any book finishing points."* Points arrive with badges and the shop
(parent spec §6); this slice ships the flag, and the no-points rule is filed
there, beside "a book the player wrote pays none". It is the only flag that
will cost anything.

Every life that ended in death is read for short-life, not only the first: a
trap in chapter 2 shortens a later life. One flag per policy, naming how many
lives were short and the shortest. It is a **warning**, never a penalty: the
floor measures the whole book, and only this check sees a book that plays
long but kills every life fast. At 8 s of margin on The Salt Road it is too
close to ordinary play to cost an author anything. *(panel, measured)* The line sits near
today's numbers: The Salt Road's shortest life is 10.14 min (life 3), 8 s
over; its life 1 is 10.35; a book like it without the cabin is 9.56; #45's
berry cap of 5 would make life 1 8.72.

## 7. `play()` and the policy interface

```ts
interface Policy {
  readonly name: string;
  readonly sane: boolean;                         // counted by short-life
  readonly checkEverySeconds: number;             // 0 means every tick
  decide(state: GameState, book: Book): GameState;   // returns the state with its orders queued
}

interface PlayRun {
  readonly policy: string;
  readonly outcome: 'finished' | 'never-finishes' | 'frozen';
  readonly lives: number;
  readonly ticksPerLife: readonly number[];
  readonly totalTicks: number;
}

function play(book: Book, policy: Policy, bounds = balance.play): PlayRun;
function measure(book: Book, policies: readonly Policy[], gameVersion: string, bounds = balance.play): PlayReport;
```

The loop, per pass: call the policy when its interval of game ticks is due, or at once when the last step did not advance time (a player notices an idle queue; an ask costs no ticks); step; if dead, rebirth and start the next
life; if `book.finish` is in `completedOneTime`, stop `finished`; if `runTicks`
did not advance after the policy's turn, stop `frozen`; if the give-up point is
passed, stop `never-finishes`. A life past the per-life cap is not stopped, only
flagged: the run goes on so its length is still measured.

The clock and randomness: the engine has neither, and the play adds neither.

**The stand-in policy**, `everyRowInOrder`: every tick, enqueue every row in
chapter order. Sane. It is the drive `playable.test.ts` already uses, and it
is labelled in code as the stand-in until #47. *(panel, measured)* under
today's queue, order hardly matters: four orderings landed within half a
minute; food handling and how often the player checks in are what move the
number. The tuned set (an attentive, a casual and an idle player, derived from
the book's structure rather than its action ids) is designed after #47.

## 8. Hubs and branch orders, later

*(user)* A chapter may branch from a hub and return to it: fight scarecrows for
grain, back to the square, help the tailor for a +5-inventory cloak, back to
the square. The paths can be taken in any order, and the order matters,
because an upgrade speeds everything after it.

When hubs exist the play tries **every order of a hub's branches** (a hub has
a few: 2 to 4 branches is 2 to 24 orders, at seconds each) and the range in
§5 becomes best-to-worst over them. An order that can never finish is a
softlock and gets a flag naming the order. None of this is in the format yet;
§9 of the parent spec lists the `requires` gate it needs. `measure()` taking a
list of policies is the seam: a branch order is a policy.

*(panel)* A search over queue plans was argued and set aside for today's
content: at about 1M steps a second, playing is cheap enough that enumerating
the few choices that matter beats searching the many that do not.

## 9. Tests

Small hand-built books, one per outcome, each asserting the outcome and the
number that proves it:

- finishes: a tiny book whose finish completes in a known number of lives
- frozen: a book with no sink; the run stops `frozen`, alive
- never-finishes: a finish the bound cannot reach
- short-life: a ×3 decay row walked by the sane policy
- off-length: a book declaring a length far from what it measures, both ends
- long-life: a bound lowered in the test so a life passes it
- too-short: a book measuring under the 24-hour floor, read off the shortest run

Plus the formatter's table (§4), the validator's three new rules, and The
Salt Road end to end once (about 4 s): finishes, no flags, 5 days.

## 10. What changes elsewhere

- `src/data/types.ts`: `version`, `finish`, `length`
- `src/data/validate.ts`: three rules
- `src/data/salt-road.ts`: the three values
- `src/balance.ts`: a `play` section (maxBookDays, minBookHours, maxLifeMinutes,
  minLifeMinutes, lengthTolerance, hoursShownUpTo), each put to the user
- `src/data/length.ts`: hours per day and `lengthInHours()`, which the
  validator and the engine both need
- `src/engine/time.ts`: minutes per hour and `ticksPerHour()`, unit conversions
  beside `MS_PER_SECOND`, not tuning
- The Salt Road's `length: { days: 5 }` is written in the book: the author's
  claim, not a tuning number
- `src/engine/play.ts` and its test
- #51's spec link points at the deleted feature branch; it should read
  `blob/main`
