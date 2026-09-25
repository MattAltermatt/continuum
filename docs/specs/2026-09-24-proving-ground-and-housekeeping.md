# The proving ground, and the housekeeping six — spec (2026-09-24)

Issues: #54 (a row's health field, signed), #82 (the proving-ground book, and
books that set their own unlock counts), #73 (one tab plays), #70 (touches per
life), #66 (the version), #35 (a formatter). One branch, one merge. The user
picked the six from the survey of open issues that need no gameplay decision,
answered the two that did (#82: books override the balance numbers, "can even
use this as part of the story"; #54: "could this be an ambiguous field like
'decay', and minus means it takes away and positive means you get health"), and
chose B for #73 after asking how feasible it is.

Amended the same day after the plan panel's four rounds (Revisions 1 to 4 of
the plan): the field is `healthRate`; the proving ground is a `src/data/`
book outside `BOOKS` with its own literals, and its fight page keeps a calm
row; the lock request is queued with a one-tick abort, there is no broadcast
channel, the loser's one write is guarded and lands in the commit that turns
the seat lost, and a takeover sets aside what it cannot load; touches are asks
that changed something, as #70 says; the version has an enforcer in CI; and
#35 is closed rather than built, on a measurement the second round corrected.
Each is explained where it lands.

Nothing here changes a number in `balance.ts`. The Windward Run plays exactly as
it does today.

## 1. #54: a row's health field is signed

`ActionDefinition.hurts` already exists: hp lost per second while the row is on
top and works, applied in the tick after decay (`applyHurts`), and the Windward
Run's four fights carry it. It becomes one signed field.

**Rule.** `ActionDefinition.healthRate?: number` replaces `hurts?: number`: hp
per second while the row is on top and works. Negative takes health, positive
gives it. Named a rate and not `health`, because the panel found
`state.health + action.health / ticks` on one line: a level and a rate under one
word. A heal never passes `maxHealth` (the same clamp as eating: the tick adds
what fits, so a heal at full health does nothing). The tick's order is
unchanged: decay, the row's rate, eat. Only a drain can kill; the death event is
the one decay writes.

**Derived, never typed.**

- A row **hurts** when `healthRate < 0` (`fight.ts`'s `hurts()` keeps its name
  and reads the sign). Everything that reads "does this row hurt" reads that:
  the fight guard (`wouldKill`, `killers`, `hurtBlock`), the Shift order's
  `forced`, the death card's "died mid-fight", the queue's "to the end" tag.
- A **book hurts** when any of its rows does: `bookHurts(book)` in
  `src/data/derived.ts`, the badge #54 names, for the shelf later.
- `PlayRun.hurtShare`: of a run's ticks, the share the working row hurt on, 0
  when none did. "How much of this book hurts", the issue's reading. The
  killing tick counts.

**Validator.** `healthRate` must be a finite number other than zero ("row X has
a health rate of 0; it must be a number other than zero").

**Screen.** Where a row printed `−0.30 hp/s` in `hurt-text` (the chapter's row,
the queue's entry) a healing row prints `+0.30 hp/s` in a new `heal-text`
class, the `--good` green the covered food line uses. The rates chunk's third
line, today "hurts" labelled by the running row's skill, shows the running row's
rate signed under the same label, red for a drain and green for a heal; its
"covered" judgement counts a heal on the larder's side:
`ceiling + heal >= decay + drain`.

**Content.** `balance.content.windward` keeps its keys and values (`hurts: 0.3`
reads "hurts by 0.3"); the book writes the sign: `healthRate: -n.pirates.hurts`.
The component tests' `testBook` writes `healthRate: -1` for its raid. No save
carries a row definition, so `SAVE_FORMAT` stays 1.

**Not here.** Which shipped rows heal, and the porcupine, are #89's content.
Nothing in the Windward Run heals after this slice.

## 2. #82: books set their own unlock counts, and the proving ground

### 2.1 The override

The user, 2026-09-24: *"this new setting overrides the balance setting.
originally, I thought this would be a single, infinite book, so it made sense
that it followed a pattern. But I like it that books can even modify this, can
even use this as part of the story."*

**Rule.** A row's chip is earned at the first of: the row's own `unlockAt`, its
book's `automation.unlockRepeatable` or `automation.unlockOneTime` by the row's
kind, `balance.automation`'s by the row's kind. Positive whole numbers, checked
by the validator.

```ts
// src/data/types.ts
interface Content { readonly automation?: { readonly unlockRepeatable?: number; readonly unlockOneTime?: number } }
interface ActionDefinition { readonly unlockAt?: number }
```

The field sits on `Content` (which `Book` extends), so the engine's `Content`
fixtures can set it. `unlockAt(content, action)` takes the content, and so do
`isUnlocked` and `modeOf`; every caller already has it in hand. The Windward Run
sets nothing: its counts stay #23's, which stays open.

### 2.2 The proving ground

A book for testing in Chrome, in the user's words: *"no story, just a list of
what should be happening kind of thing."* Its rows name their expected result
and are the checklist.

- **`src/data/proving-ground.ts`**, `provingGround: Book`, id `proving-ground`,
  name "The Proving Ground". **Not in `BOOKS`**: it never ships, never reaches
  the shelf, never deploys, and nothing that ships imports it. In `src/data/`
  so the purity scan reads it (a book may not import the engine) and the
  engine's tests may read it: `src/engine/proving-ground.test.ts` validates it
  and plays it headless with every measuring policy to `finished` under a
  one-day bound, so a change to resolve that freezes it is caught in seconds,
  and `property.test.ts` runs its seeded play over the proving ground's pages
  as it does the Windward Run's. (Round 1 put it in a new `src/dev/`; round 2
  found the reasons hollow: the tuning hook is a notice, not a block, and
  `src/engine/fixture.ts` already carries literals inside its scope; a new
  directory beside `src/test-utils/` was one more thing to explain.)
- **Its numbers are literals in that file**, as `src/engine/fixture.ts`'s and
  `src/test-utils/book.ts`'s are, with the same header: a fixture's, chosen so
  each mechanic shows inside a minute at speed 1, never tuned, never the
  user's. They do not go in `balance.ts`: a "never tuned" block in the
  sacrosanct file dilutes decision #3 and would need the tuning guard and
  `balance.test.ts` to learn an exception. The tuning hook notices an edit to
  the file, as it does an edit to `fixture.ts`; the header says why.
- **Opened by `?book=proving`, dev builds only.** `src/main.tsx` picks the
  book: under `import.meta.env.DEV` with the parameter set, a dynamic
  `import('./data/proving-ground')` in a callback, else the Windward Run;
  `App` takes the book as a prop instead of importing it. Production builds
  ignore the parameter, and the plan checks the build output carries no
  proving-ground text. A first step toward the shelf, not the shelf: the
  shelf picks from `BOOKS`, and this override survives beside it.
- **Its own save.** `saveKey(book)` in `src/state/save.ts`: `continuum.save`
  for the Windward Run (every existing save keeps loading) and
  `continuum.save.<book id>` for any other. Playing the proving ground never
  touches the Windward Run's save. The aside list stays one key: a set-aside
  save carries its book id.
- **Its unlock counts** use 2.1: the book sets `unlockRepeatable` and
  `unlockOneTime` low, and one row overrides the book's, so both overrides are
  exercised. The debug overlay's `earnChips` stays for the Windward Run.

**Shape: one page per mechanic**, each row's noun its expectation, each
one-time's beat what should have just happened. Two chapters, so casting off
and the finish are both on the list; a row belongs to one chapter (the
validator's rule), so chapter II's page lists only its closer. The overlay is
part of the walk where a mechanic needs a state a fresh life does not reach: a
fresh player has 100 hp, and no fight short enough to win is a fight that would
kill one inside its window, so the back-off is shown by setting health with the
overlay, and the row says so. The plan fixes the names and numbers; the
mechanics each page proves are:

1. **The chain.** A one-time that costs what a harvest makes: "needs 4 sticks;
   press ▶ with none, and the chain pulls sticks first" (spec 2026-09-24-pages
   4.3). Closes the page.
2. **Pages.** Two one-times, the closer listed last: "closes the page; waits on
   the row above" (pages 4.2, `pageWaits`).
3. **Chips.** A harvest that earns its chip after the book's count, and one
   row that overrides it ("chip after one run: this row's own count"). The
   chip's cycle shows JIT on the food and the priorities on the rest.
4. **JIT, food at zero, the fight.** A food on JIT; a fight whose numbers the
   row states with their preconditions (the panel probed the page on today's
   engine, twice): with the food's chip off and the pack empty it wins from
   full health, starts and backs off mid-fight from the band below that, and
   from lower still backs off before starting (#74, case 2); food in the pack
   lowers the win band, since the guard counts eating inside the window, and
   leaves the refusal where it was; a chip on the food with room in the pack
   makes the guard wait behind a unit first (case 1), again and again, until
   the pack is full and the fight is refused, or the bites carry it to a win;
   the overlay sets the health and the pack. Beside it a **repeatable
   one-tick fight** at a rate no max health or larder covers, so case 2 shows
   with no overlay at all: with the food's chip off or the pack full, play
   refuses and says why; Shift forces it (no policy ever automates it: it
   kills on its first working tick, so it never completes and never earns a
   chip, and every measuring player finishes the book). And the **heal row is
   on this page too**, so something calm can always run: with only the food
   beside the fights, a full or chipped food row leaves nothing calm and a
   fight is fought to the death, which the probe found. Food at zero on any
   chip (#81) shows on the food row. Every death returns the walk to page 1.
4b. **The last stand.** One page, one one-time fight, no food row: nothing is
   calm and the guard has nothing to wait for, so the fight is fought to the
   end from any health (#74, case 3): from full it wins, from low it kills.
   The property test's case-3 tripwire, which no book had ever reached,
   fires here.
5. **Heals.** A repeatable that heals while it runs ("+2 hp/s, never past
   max"): section 1's positive side, on the screen.
6. **Capacity.** A one-time with a `capacityBonus` ("the stack holds 5 more"),
   with the harvest it raises the cap for on the **next** page too, so the
   raised cap is seen.
7. **Casting off.** The chapter's last page; its closer casts off.
8. **The finish.** Chapter II, one page, one closer: the book's finish, then
   the finish card.

The book claims `length: { hours: 1 }`. The play's short-book flag is for
shipped books; the proving ground's test checks the outcome, not the flags.

## 3. #73: one tab plays

Two tabs of the game each write the same save every few seconds; the last
writer wins and the other tab's progress goes without a word. The user chose
**B**: one tab plays, a second tab gets a card with a way to take over. The
pattern is WhatsApp Web's ("open in another window; click Use Here").

**Mechanism: the Web Locks API** (`navigator.locks`, widely available since
March 2022, secure contexts only; GitHub Pages is HTTPS and `localhost` is
secure). One named lock per save key, `continuum.lock.<save key>`. The panel
verified two things in Chrome and the W3C text: a stolen holder's `request()`
promise rejects with `AbortError`, and an `ifAvailable` request issued in the
same task as a release is refused. Both shape the rules below.

- **On mount**, `useGame` requests the lock **queued, not `ifAvailable`, with
  an abort one tick later** (`balance.time.tickIntervalMs`). Granted in time:
  the game opens as today. Aborted: the game opens **held**: nothing ticks,
  nothing saves, and the screen shows a card, "The game is open in another
  tab", with one button, **Play here**. Queued-with-abort is what survives
  React's development double-mount, whose cleanup and remount run in one
  task: the first mount's release lands a microtask later and the queued
  second request is granted; an `ifAvailable` request there is refused and
  every dev load would show the card.
- **Play here** requests the lock with `steal: true`. Granted, it waits one
  tick (for the loser's last write, below), re-reads the save, and goes live;
  a re-read it cannot load (an old build's last write, #73's second comment)
  is set aside first, as a mount would set it aside, so a save is never
  silently overwritten (`save.ts`'s contract).
- **The tab that lost** its lock sees its request reject and goes **lost**.
  In the same commit it **writes its save once, if the key still holds what
  it last read or wrote**: then its state is the newest and the write keeps
  the loser's last stretch, a hidden tab's whole throttled catch-up batch
  included (the write is a layout effect on the lost seat, after the effect
  that keeps the latest model, so the two commit together; the panel showed
  a write from the rejection's microtask could miss a batch of minutes). If
  the key holds someone else's text, or the read throws, it writes nothing:
  a tab Chrome froze hours ago learns of its loss when it thaws, and its
  stale state must not overwrite the winner's. The interval stops, the
  autosave stops, and the screen shows "This game continued in another tab.
  Reload to play here." Reloading requests the lock again, and gets the card
  if the other tab still holds it. No broadcast channel: the rejection is the
  signal, and a second channel was a third host capability for a message
  that already arrives.
- Held and lost are one `elsewhere: 'none' | 'held' | 'lost'` on the handle.
  While it is not `none`, the tab card takes the death card's place (never
  beside it: a held tab that opened a dead save must not offer Begin), every
  wrapper is inert as it is under the death card, the loop does not dispatch
  ticks, and `save` and `erase` are no-ops. The reducer stays pure and knows
  nothing of tabs. The dev handle can still step a held tab: nothing it steps
  is ever written, since `save` refuses and Play here replaces the model from
  the save.
- **No `navigator.locks`** (an old browser, an insecure origin): the game plays
  as today, unlocked. The lock manager is a parameter of `useGame` like the
  storage is; jsdom has none, so component tests play unlocked, and the tab
  tests pass a fake that queues requests and grants asynchronously, as the
  real one does.

The two cards' words are a first draft for the user to read in Chrome. The
CLAUDE.md gotcha "two tabs of the game each write the same key" becomes this
rule. Residual, accepted: the loser's final write races the winner's re-read by
design of the one-tick wait; a machine that takes longer than a tick to settle
the rejection and commit loses that stretch.

## 4. #70: touches per life

A **touch** is an ask of the policy that changed the state: the reaction #70
names ("a bot that reacts to every pop is more attentive than a person. The
play should count those reactions as touches"). One ask that queued food, a
maker and a one-time is one touch, since a person glanced once; an ask that
changed nothing is none. (Revision 1 counted orders and chips instead; round 2
read the issue and put it back.) `PlayRun.touchesPerLife: readonly number[]`,
one entry per life like `ticksPerLife`; the report's range and flags are
unchanged. A book's length reading now says how much attention it assumed.

`PLAY_VERSION` 4 → 5, once, for sections 1 and 4 together: the report's shape
changed. `measure.test.ts`'s lock moves with it.

## 5. #66: the version

There are no GitHub Releases yet. `package.json` goes from `0.0.0` to `0.2.0`:
the line the game is on (milestone v0.2 shipped; v0.3 is open). Every merge to
`main` is a release (CLAUDE.md, Workflow), so **slice-ship bumps the version in
the squash commit**: the patch by default, the minor when a milestone closes.
`measure()`'s callers pass `version` read from `package.json`; the probe pattern
in CLAUDE.md says so. A test outside the three layers (`src/version.test.ts`;
an engine test may not import `package.json`, the purity scan reads every
relative import) checks the version is a semver and not `0.0.0`. A GitHub
Release, when the user wants one, takes its number from the file.

**The enforcer is CI**, read-only: on a push to `main`, the `verify` job fails
when `src/` changed since the push's previous tip (the event's `before`, since
a push may carry more than one commit) and the version did not, naming the
base. A docs-only push needs no bump. `slice-ship` runs the same diff against
`main` before the merge, so the forgotten bump is caught before the push and
CI is the backstop. Tags and Releases themselves, a write, stay a later step
the user can take from the same number.

## 6. #35: a formatter, closed and not built

The spec as first written chose Prettier at `printWidth: 200`, on the premise
that a wide width would leave the tree's long, dense lines alone and the
reformat would be "spacing and the odd wrap". The plan panel measured it:

```text
prettier, src/, --print-width 200 --single-quote --trailing-comma all
  1,029 of 13,365 source lines rewritten (7.7%), 89 of 120 files,
  most of them one line expanded into several (3,386 lines added)
prettier, the same at --print-width 120
  92 of 120 files
oxfmt, the same settings
  89 files, 1,027 removed / 3,385 added: the same, by design
```

(Round 1 reported "4,415 of 13,944 lines, 32%", which added the output lines to
the input count; round 2 re-ran it and corrected the ratio. The decision rests
on the file count and the chain rule, not the ratio.)

Width is not the driver. Prettier breaks any member chain of three calls onto
five lines whatever the width (`new Set(rowsHere(...).filter(...).map(...))`),
hoists ternaries and re-parenthesizes `&&`/`||`; and 51 lines are longer than
200 anyway. The tree's house style is one row per line and one sentence of
comment beside it, and that style is exactly what a formatter rewrites. Eighty-
nine files rewritten is a cost `git log -S` and `bisect` pay forever;
`blame` alone honours an ignore file. And an edit-time hook would rewrite most
files after most edits, which the harness reads as an external change.

**Decision: the issue's third option, "nothing, deliberately".** The tree is
consistent because one author writes it; `oxlint` stays the only style gate.
#35 closed with this measurement as the reason (the user's y, 2026-09-24),
which is what the issue asked for ("either a formatter is wired with a CI
check, or this is closed with the reason for not having one"). Revisit if a
second author arrives.

## 7. Out of scope

- The shelf, the bookmark (#57), the finish screen (#58, #87): `App` taking a
  book prop is the whole of the shelf this slice builds.
- The balance numbers in #23; which shipped rows hurt or heal (#89).
- The touches' use in the Windward Run's tuning: this reports; the re-tune is
  a later reading.
- GitHub Releases themselves; a formatter.

## 8. Tests and the Definition of Done

Engine (node): the signed field (a heal adds, clamps at max, cannot kill; a
drain kills as today; the derived `hurts` reads the sign); the validator on
`healthRate: 0`, on unlock counts; `unlockAt` resolution at all three levels;
`hurtShare` (the killing tick included) and `touchesPerLife` (by ask: three
orders in one ask are one touch) on a monument book; the proving ground
validates, hurts, is not in `BOOKS`, and every measuring player finishes it
under a one-day bound; the property test runs over its pages. State (jsdom): two fake
tabs, the second is held after a tick, Play here takes over and the first
writes once then is lost and never again, a loser whose key someone else has
written since writes nothing, a reload of the first is held; a
mount-unmount-remount in one task (the StrictMode sequence) is granted, against
a fake that serializes same-task requests; a takeover whose re-read cannot load
sets it aside; no lock manager plays as today; `saveKey` per book, a
proving-ground save never touches the Windward Run's key. Component: the rates
line signed both ways; the two cards; a healing row's `+` in the chapter and
the queue. Root: the version is a semver.

The Definition of Done is CLAUDE.md's, unchanged. Chrome: `?book=proving`
walked page by page against each row's expectation, with the overlay where a
row says so; a single dev tab never shows the held card; two tabs of the
Windward Run through both cards; the Windward Run's save untouched after a
proving-ground session.
