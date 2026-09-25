# The proving ground, and the housekeeping six — plan (2026-09-24)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Spec: `docs/specs/2026-09-24-proving-ground-and-housekeeping.md` (#54, #82, #73,
#70, #66, #35). Branch `feature/proving-ground-and-housekeeping`.

**Status (2026-09-25): shipped to main as a359584 (squashed), live on GitHub Pages; CI's first version check read 0.0.0 -> 0.2.0. Four plan panel rounds (the user chose to execute after round 4; every remaining finding was text-level); code panel round 1 fixed in the same slice. 768 tests. #54 #82 #73 #70 #66 closed; #35 closed on the measurement. The Chrome pass was the agent's (spec section 8's list, plus the two-tab takeover); the user can eyeball ?book=proving and two tabs at any time.**

## Revision 4 (2026-09-24, panel round 4)

Nothing in the hook, the lock or the engine changed; every item is a noun, a
test, a comment, one YAML base, one skill line and one page of the book.

- **The wasp's and the boar's nouns state what the probe found** (naysayer,
  27 configurations per life): a chipped berries row with room in the pack
  makes the guard delay behind a berry (case 1) before any refusal, for the
  wasp as much as the boar, and at a full pack the delay is gone and the row
  is refused (case 2); berries in the pack **lower** the boar's win band (25 hp
  wins with three berries, since the guard eats inside the window) and leave
  the refuse band near 16. The Chrome step sets berries to two to four before
  the chipped press and says "chip off or pack full" for the wasp's refusal.
- **A ninth page, "Last stand"**, one one-time fight and no food row, so #74's
  case 3 (nothing calm, fought to the end) is on the list; the property test's
  case-3 tripwire, which had never fired on any book, fires on it (naysayer,
  by probe: from full health it wins, under about 31 it kills; every policy
  finishes the book in one life).
- **The CI check diffs from the push's `before` sha** with a full fetch and a
  zero-sha fallback to the previous commit (naysayer and Reviewer A: the
  previous commit is the previous tip only for a single-commit push, and this
  repo has pushed doc chains of a dozen commits). `slice-ship` step 5 runs the
  same diff against `main` before the merge, so the forgotten bump is caught
  before the push and CI is the backstop.
- **The proving-ground test plays all three policies** (naysayer: the reason
  given for `attentive` only was false; the wasp never completes, so it is
  never unlocked, so `prioritized` never chips it; all three finish in one
  life).
- **`RATE_DECIMALS` goes with `signed`** in `Rates.tsx` (Reviewer B: an
  orphaned constant fails `noUnusedLocals`); the decay and food lines call
  `hpRate`. **A seventh hook test pins the takeover-aside** (Reviewer B: the
  spec lists it). The lost-write comment says "dispatched before this commit"
  (naysayer: "render together" is a lane accident, not the guarantee). The
  checkout step's lines are written out.

The two accepted risks (a held tab's dev handle; Task 6 last) stand as
Revision 3 wrote them; the naysayer accepted both after tracing every write
path.

## Revision 3 (2026-09-24, panel round 3)

Reviewer A clean; Reviewer B one must-fix; the naysayer three, two of them
accepted-risk write-ups whose cheaper alternatives are now taken.

- **The fight page has a row that is always calm** (naysayer, by probe on
  today's engine: once berries is full or chipped, nothing calm is left, so
  the wasp is fought to the death instead of refused, and with any berries in
  the pack the boar wins from 25 hp because `wouldKill` eats inside the
  window). The nap joins the fight page (a repeatable carried across pages),
  the wasp's rate is one that no max health or larder covers, and the boar's
  noun and header state their preconditions: chip off and pack empty for the
  bands as computed; berries in the pack lift them; a chip makes it wait
  behind a berry. The Chrome walk says each death and the erase return the
  player to page 1, so the fight page's killing checks come last. Spec 2.2
  amended.
- **The version bump has an enforcer** (naysayer: an enforcer needs no write;
  editing `ci.yml` is a repo edit the user vets at the merge gate). CI's
  `verify` job, on a push to `main`, fails when `src/` changed since the
  previous tip and `package.json`'s version did not. Task 7. Accepted risk 1
  is gone.
- **The loser's one write runs in a layout effect on the lost seat**
  (naysayer: a hidden tab's throttled interval dispatches a whole catch-up
  batch, and `latest` is set in a later commit, so "at most one tick" was
  false). The write and the seat change commit together, so `latest` is
  current; `watch` only sets the seat. A throwing storage read means "do not
  write"; `erase` resets what the tab last saw. Accepted risk 4 is gone.
- **A takeover sets aside a re-read it cannot load** (naysayer: an old-build
  tab's last write, format N, would have been overwritten by the winner's
  autosave without a copy, against `save.ts`'s contract). `playHere` writes
  the aside before going live.
- **The three `MINUS` imports the rewrite orphans are dropped** (Reviewer B:
  `noUnusedLocals` fails Task 2's named command); the import lines are
  written out. Test 3's post-takeover assertion reads a base instead of
  depending on timer tie-break order (Reviewer B). The property test's
  proving-ground loop is its own `it` with its own timeout (Reviewers A and
  B). Every return of `open()` carries `raw` (Reviewer A: the loaded branch
  is the common path, and a null there would skip the loser's write).
  `TabCard` is imported where it is rendered; `App.tsx`'s `topWorks` memo
  lists `book`; the Rates blanks keep their escape and `aria-hidden`; the
  proving-ground test says only `attentive` plays it (`prioritized` chips
  the wasp and dies forever).

**Accepted risks**, each three sentences: the objection, the alternative, why
it was rejected. Two remain from Revision 2; the naysayer accepted both.

1. **A held tab's dev handle still steps** (naysayer). The alternative gates
   `step` and `dispatch` in `App.tsx` where `elsewhere` is in hand, two lines.
   Not taken because nothing a held tab steps is ever written: `save` and
   `erase` refuse off-seat, and Play here replaces the model from the save,
   setting aside what it cannot load; the handle is a dev tool for looking,
   and a held tab is a fine place to look.
2. **Task 6, the only task with async React state, runs last** (naysayer:
   the riskiest thing should fail first). Moving it first means it defines
   `saveKey` and the book prop itself, or works against `SAVE_KEY` and is
   rewritten in Task 5. Not taken because its failure mode is a red hook test
   that invalidates none of Tasks 2–5's commits, the lead runs it inline, and
   Task 6 rewrites lines Task 5 writes (`open`'s `raw`, the `saveKey` uses).

## Revision 2 (2026-09-24, panel round 2)

Seven must-fix items across the three reviewers, all folded in; the naysayer
rejected three of the four accepted-risk write-ups and its rewrites are below.

- **The #35 figures were wrong** (naysayer, re-measured): 1,029 of 13,365
  source lines rewritten (7.7%), 89 of 120 files, 3,386 lines added; oxfmt
  gives the same 89 files. The close comment on #35, the spec's section 6 and
  Task 1 carry the corrected numbers; the decision stands on the file count and
  the chain rule.
- **Touches are asks that changed something**, as #70 says (naysayer: the
  diff count reported 12–21 where #70's unit gave 10 on the same run). Task 4's
  `touchesBetween` is gone; `if (decided !== s) touches += 1` is back, and the
  three play tests are pinned (Reviewer B: the "three at once" total held only
  by the dynamics of eating; the killer case froze at zero ticks and would have
  read `hurtShare` 0; the chip case gets an outcome assertion).
- **The proving ground is `src/data/proving-ground.ts`, outside `BOOKS`, with
  its test at `src/engine/proving-ground.test.ts` and a seed loop in
  `property.test.ts`** (naysayer: `src/dev/` was one more directory to explain,
  the tuning hook is a notice not a block, and `fixture.ts` already carries
  literals in its scope; putting the book in `data/` gives it the purity scan
  and lets the property test cover it, which removes round 1's accepted risk
  3). The headless finish runs under a one-day bound (Reviewer B: under the
  default a book defect hangs for 51.8M ticks). A **repeatable one-tick fight**
  (`wasp`) joins the fight page so case 2 shows from full health with no
  overlay (naysayer, with the trace that `byHand` never queues a repeatable
  fight).
- **The fake lock manager serializes same-task requests** (Reviewers A and B:
  two requests in one task were both granted, so the StrictMode test passed by
  ordering luck): a per-name pump with a pending flag. **The hook's mount
  effect keeps a per-effect `cancelled`** and `mountedRef` serves only `watch`
  and `playHere` (Reviewer B: the hoist as worded would keep the first
  mount's lock and show the held card). The hook code is written out in full.
- **The loser's one write is guarded** (naysayer, from #73's second comment):
  it writes only if the key still holds what it last read or wrote, so a tab
  Chrome froze hours ago cannot overwrite the winner when it thaws. A test
  pins it. **`erase` is guarded like `save`** (naysayer: a held tab's
  `continuum.erase()` deleted the playing tab's save).
- **The tab card takes the death card's place** (naysayer: a held tab that
  opened a dead save showed a live Begin, since the card is a sibling of the
  inert wrappers). One ternary in `App.tsx`.
- **Task 6 test 3 reads the loser's tick count instead of asserting 7**
  (Reviewer B: the held tab's one-tick wait gives the live tab an eighth
  tick). `flush()` is ten microtasks. `SAVE_KEY` is imported in `save.test.ts`;
  `balance` in `version.test.ts`; `MINUS` in `format.ts`; the ActionRow heal
  case is written out; `mount` in `main.tsx` is an arrow so `root` stays
  narrowed; `App.tsx` imports the `Book` type.
- **The false reason for the dynamic import is gone** (naysayer: Vite 8's
  default target allows top-level `await`); the callback stays because it is
  the simpler shape.

**Accepted risks** as Revision 2 wrote them. Risks 1 and 4 were taken in
Revision 3 (the CI check; the layout-effect write); 2 and 3 stand above.

1. **The version bump has no enforcer** (naysayer, twice). The honest
   alternative is a step in CI's deploy job that tags `v<version>` and fails
   when the tag exists, which also creates the Releases #66 asks to keep in
   step with; a forgotten bump would then fail the merge that forgot it. Not
   in this slice because `ci.yml` holds `contents: read` and a job that
   writes tags is a permission the user grants, so it is offered in the
   handoff's Open list rather than taken here.
2. **A held tab's dev handle still steps** (naysayer). The alternative gates
   `step` and `dispatch` in `App.tsx` where `elsewhere` is in hand, two lines.
   Not taken because nothing a held tab steps is ever written: `save` and
   `erase` refuse off-seat, and Play here replaces the model from the save;
   the handle is a dev tool for looking, and a held tab is a fine place to
   look.
3. **Task 6, the only task with async React state, runs last** (naysayer:
   the riskiest thing should fail first). Moving it first means it defines
   `saveKey` and the book prop itself, or works against `SAVE_KEY` and is
   rewritten in Task 5. Not taken because its failure mode is a red hook test
   that invalidates none of Tasks 2–5's commits, the lead runs it inline, and
   the earlier tasks are compiler-enumerated and cheap.
4. **The loser's write can trail its last dispatched tick by one render**
   (naysayer): `latest` is set in a layout effect, and a tick dispatched from
   the interval commits on a later task. The alternative reads the reducer's
   state synchronously, which the hook does not expose. Not taken: at most
   one tick of the loser's play is lost, the spec says so, and the winner's
   one-tick wait is the same order of loss by design.

**The tasks below are the authority.** Where the history and a task disagree,
the task is right.

## Revision 1 (2026-09-24, panel round 1)

Fourteen must-fix items folded in; two decisions changed on the naysayer's
measurements: #35 closed rather than built (Prettier rewrote 89 of 120 files at
any width), and `health` renamed `healthRate`. Also: chapter II's page lists
only its closer (a row belongs to one chapter); `sticks` after the pouch so the
cap shows; the boar's three bands stated; the mount lock queued with a one-tick
abort rather than `ifAvailable` (StrictMode's cleanup and remount are one task;
verified in Chrome); no BroadcastChannel (the stolen request rejects; verified
against the W3C text); the killing tick counts toward `hurtShare`; the version
test outside the engine (purity). Round 1's placement of the book in `src/dev/`
and its touch-by-diff were reversed in Revision 2.

**Goal:** A row's health rate is signed; books set their own unlock counts and
a dev-only proving-ground book exercises every mechanic page by page; one tab
plays; the play report counts touches and hurt share; the version is real; and
#35 is closed with a measured reason.

**Architecture:** Every engine change is a pure function taking `content`
(`src/engine/`), guarded by node tests; `src/state/` supplies the host
capabilities (storage, the lock manager) as parameters of `useGame`; `App`
takes the book as a prop and `main.tsx` picks it, loading the proving ground
with a dynamic import only in a dev build.

**Tech Stack:** TypeScript strict, React 19, Vite 8, Vitest 5 (node for the
engine, jsdom per component test), the Web Locks API.

## Global Constraints

- Nothing in `balance.ts` changes. `balance.content.windward` keeps its keys
  (`hurts: 0.3` stays; the book writes `healthRate: -n.pirates.hurts`).
- `src/engine/` imports nothing from `src/ui/`, `src/state/` or
  `src/test-utils/`, tests included, and reaches for no ambient host
  capability (`tsconfig.engine.json`, `src/purity.test.ts`). `src/data/`
  imports nothing from `src/engine/`, tests included. An engine test may
  import `src/data/`.
- Every number outside `balance.ts` in `src/engine|data|state` trips
  `tuning-literals.sh`, a notice; `src/data/proving-ground.ts`'s header says
  why it carries literals, as `src/engine/fixture.ts`'s does.
- Terms: `active/inactive`, `allowlist/blocklist`, `main`. No emoji in code,
  comments or commit messages. No `Co-Authored-By`.
- `SAVE_FORMAT` stays 1: no save carries a row definition or a lock.
- Commit subjects: terse, one line, 50–72 chars.
- Machine gates at the end of every task: `npm run typecheck`, `npm run lint`,
  `npm test`, `npm run test:hooks`.
- A test in `src/ui/` or `src/state/` that renders starts with
  `// @vitest-environment jsdom`.

## Review Focus

1. **A heal at full health on a tick that also decays.** Decay runs first, then
   the row adds what fits: health ends at exactly `maxHealth`, never above,
   never one decay below. Test in Task 2.
2. **A stolen tab's writes after the steal.** The loser writes exactly once,
   at the instant it learns, only if nobody else has written since, and never
   again: not from its interval, not from `save()`, not from `erase()`. Tests
   in Task 6 (tests 3 and 4).
3. **`?book=proving`, then the plain URL in the same browser.** The Windward
   save is untouched, and no aside is written. Test in Task 5.
4. **A row override of `unlockAt` on a one-time.** The row's own count wins
   whatever the kind. Test in Task 3.
5. **Mount, unmount, remount in one task** (StrictMode). The remount is
   granted, not held, against a fake that would grant both if they were not
   serialized. Test in Task 6 (test 6).

---

### Task 1: #35 closed, not built

**Files:** none. Done: the user answered y and #35 was closed on 2026-09-24
with the corrected measurement (1,029 of 13,365 source lines, 7.7%, 89 of 120
files; oxfmt the same). Task 7 puts one line in CLAUDE.md.

---

### Task 2: A row's health rate is signed (#54)

**Files:**
- Modify: `src/data/types.ts` (`ActionDefinition`), `src/data/validate.ts:69`,
  `src/engine/health.ts:87-101`, `src/engine/tick.ts`, `src/engine/fight.ts:19-21,62`,
  `src/engine/queue.ts:195`, `src/engine/rebirth.ts:59`, `src/ui/format.ts`,
  `src/ui/ActionRow.tsx:179`, `src/ui/Queue.tsx:74,83,85`, `src/ui/Rates.tsx`,
  `src/ui/App.tsx:6,61-62,91`, `src/styles.css` (after `.hurt-text`),
  `src/data/windward-run.ts` (four rows), `src/test-utils/book.ts:20`, and
  the tests that read the old field: `src/engine/fight.test.ts`,
  `src/engine/pages.test.ts`, `src/engine/play.test.ts`, `src/engine/tick.test.ts:6,69,75`
  (`hurtsPerSecond` and a `hurts: 1`), `src/ui/Rates.test.tsx:25-47`,
  `src/data/validate.test.ts:128-133` (the old positive-only case),
  `src/test-utils/fixtures.test.ts:12`
- Create: `src/data/derived.ts`, `src/data/derived.test.ts`
- Test: `src/engine/health.test.ts`, `src/data/validate.test.ts`,
  `src/engine/fight.test.ts`, `src/ui/Rates.test.tsx`, `src/ui/ActionRow.test.tsx`,
  `src/ui/Queue.test.tsx`

**Interfaces:**
- Produces: `ActionDefinition.healthRate?: number` (hp/s while on top and
  working; `< 0` drains, `> 0` heals). `rowHealthPerSecond(state, content): number`
  (signed, 0 when the top has none) and `applyRowHealth(state, content)` in
  `health.ts`. `hurts(action)` in `fight.ts` reads `healthRate < 0`.
  `bookHurts(content: Pick<Content, 'actions'>): boolean` in `src/data/derived.ts`.
  `hpRate(n: number): string` in `src/ui/format.ts` (`−0.30 hp/s` / `+0.30 hp/s`)
  and `hpClass(n: number): 'hurt-text' | 'heal-text'`. `Rates` props `row?: number`
  (signed) and `rowBy?: string` replace `hurts` and `hurtsBy`.

- [ ] **Step 1: Failing engine tests**

`src/engine/health.test.ts`, a new describe. `content`, `Content`, `GameState`,
`newState` and `ticksPerSecond` are already imported at the top of the file;
add `applyRowHealth, rowHealthPerSecond` to the `./health` import.

```ts
describe('applyRowHealth', () => {
  const rows = (healthRate: number): Content => ({
    ...content,
    actions: { camp: { id: 'camp', verb: 'build', noun: 'camp', expCost: 1, itemCosts: [], isOneTime: false, healthRate } },
  });
  const onTop = (c: Content, hp: number): GameState => ({ ...newState(c.roster), health: hp, queue: [{ id: 0, actionId: 'camp', mode: 'repeat', by: 'player' }] });
  it('a positive rate heals by its per-tick share', () => {
    const s = applyRowHealth(onTop(rows(2), 50), rows(2));
    expect(s.health).toBeCloseTo(50 + 2 / ticksPerSecond(), 9);
    expect(s.dead).toBe(false);
  });
  it('a heal stops at max and never overheals', () => {
    const c = rows(2);
    expect(applyRowHealth({ ...onTop(c, 100), maxHealth: 100 }, c).health).toBe(100);
    expect(applyRowHealth({ ...onTop(c, 99.95), maxHealth: 100 }, c).health).toBe(100);
  });
  it('a negative rate drains and can kill, with the death event', () => {
    const c = rows(-30);
    const s = applyRowHealth(onTop(c, 1), c);
    expect(s.health).toBe(0);
    expect(s.dead).toBe(true);
    expect(s.events).toContainEqual({ type: 'died', runTicks: 0 });
  });
  it('no rate on top: the same state object', () => {
    const c = rows(2);
    const s = { ...onTop(c, 50), queue: [] };
    expect(applyRowHealth(s, c)).toBe(s);
    expect(rowHealthPerSecond(s, c)).toBe(0);
  });
  it('rowHealthPerSecond is signed', () => {
    expect(rowHealthPerSecond(onTop(rows(-0.5), 50), rows(-0.5))).toBe(-0.5);
    expect(rowHealthPerSecond(onTop(rows(2), 50), rows(2))).toBe(2);
  });
});
```

`src/engine/fight.test.ts`: add `hurts` to the `./fight` import (line 4) and:

```ts
it('hurts reads the sign: a healing row is not a fight', () => {
  expect(hurts({ ...fixture.actions.raid!, healthRate: 1 })).toBe(false);
  expect(hurts({ ...fixture.actions.raid!, healthRate: -1 })).toBe(true);
  expect(hurts({ ...fixture.actions.raid!, healthRate: undefined })).toBe(false);
});
```

`src/data/validate.test.ts`: replace the positive-only `hurts` case at lines
128-133 with:

```ts
it('a health rate must be a number other than zero', () => {
  const zero = withActions({ ...good.actions, forage: { ...good.actions.forage!, healthRate: 0 } });
  expect(validateBook(zero)).toContainEqual(expect.stringMatching(/forage.*health rate.*zero/));
  const nan = withActions({ ...good.actions, forage: { ...good.actions.forage!, healthRate: Number.NaN } });
  expect(validateBook(nan)).toContainEqual(expect.stringMatching(/forage.*health rate/));
  expect(validateBook(withActions({ ...good.actions, forage: { ...good.actions.forage!, healthRate: -0.5 } }))).toEqual([]);
  expect(validateBook(withActions({ ...good.actions, forage: { ...good.actions.forage!, healthRate: 0.5 } }))).toEqual([]);
});
```

`src/data/derived.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bookHurts } from './derived';
import { windwardRun } from './windward-run';

describe('bookHurts', () => {
  it('is true when any row drains and false when none does, a heal included', () => {
    expect(bookHurts(windwardRun)).toBe(true);
    expect(bookHurts({ actions: { a: { ...windwardRun.actions.fish!, healthRate: 1 } } })).toBe(false);
    expect(bookHurts({ actions: { a: windwardRun.actions.fish! } })).toBe(false);
  });
});
```

Run: `npx vitest run src/engine/health.test.ts src/engine/fight.test.ts src/data/validate.test.ts src/data/derived.test.ts`
Expected: FAIL (no `applyRowHealth`, `healthRate` unknown on the type, no module `derived`).

- [ ] **Step 2: The engine**

`src/data/types.ts`: replace the `hurts` line with

```ts
  /** Health per second while this row is on top and works: negative takes it, positive gives it, never past max (spec 2026-09-24-proving-ground section 1). */
  readonly healthRate?: number;
```

`src/data/validate.ts:69`:

```ts
    if (a.healthRate !== undefined && !(Number.isFinite(a.healthRate) && a.healthRate !== 0)) problems.push(`row "${a.id}" has a health rate of ${a.healthRate}; it must be a number other than zero`);
```

`src/data/derived.ts`:

```ts
/**
 * What a book is, read off its rows and never typed by its author (#54):
 * the shelf's badges, when there is a shelf.
 */
import type { Content } from './types';

/** Any row takes health while it runs. */
export function bookHurts(content: Pick<Content, 'actions'>): boolean {
  return Object.values(content.actions).some((a) => (a.healthRate ?? 0) < 0);
}
```

`src/engine/health.ts`: replace `hurtsPerSecond` and `applyHurts`:

```ts
/** The top row's health rate this second, signed (spec 2026-09-24-proving-ground section 1). 0 when the top has none. */
export function rowHealthPerSecond(state: GameState, content: Content): number {
  const top = state.queue[0];
  return (top === undefined ? undefined : content.actions[top.actionId]?.healthRate) ?? 0;
}

/**
 * Applied per tick after decay, only on a tick the top works (step calls it
 * after resolve said ready). A drain can kill; a heal stops at max, like eating.
 */
export function applyRowHealth(state: GameState, content: Content): GameState {
  const perTick = rowHealthPerSecond(state, content) / ticksPerSecond();
  if (perTick === 0) return state;
  const health = state.health + perTick;
  if (health <= 0) return { ...state, health: 0, dead: true, paused: 'system', events: [...state.events, { type: 'died', runTicks: state.runTicks }] };
  return { ...state, health: Math.min(state.maxHealth, health) };
}
```

`src/engine/tick.ts`: import and call `applyRowHealth` where `applyHurts` was.

`src/engine/fight.ts:19-21` and `:62`:

```ts
export function hurts(action: ActionDefinition | undefined): boolean {
  return (action?.healthRate ?? 0) < 0;
}
// in wouldKill:
  const hurtPerTick = -fight.healthRate! / ticksPerSecond();
```

`src/engine/queue.ts:195`: `(action.healthRate ?? 0) < 0` in place of `(action.hurts ?? 0) > 0`.
`src/engine/rebirth.ts:59`: `(content.actions[top.actionId]?.healthRate ?? 0) < 0`.

`src/data/windward-run.ts`: the four rows write `healthRate: -n.pirates.hurts`,
`healthRate: -n.wardens.hurts`, `healthRate: -n.compass.hurts`, `healthRate: -n.enforcers.hurts`.
`src/test-utils/book.ts:20`: `healthRate: -1`.

The tests that read the old field, each by hand:

- `src/engine/fight.test.ts`, `src/engine/pages.test.ts`, `src/engine/play.test.ts`,
  `src/engine/tick.test.ts:69`: every `hurts: <n>` becomes `healthRate: -<n>`
  (find them with `grep -n "hurts: " src/engine/*.test.ts`).
- `src/engine/tick.test.ts:6,75`: `hurtsPerSecond` becomes `rowHealthPerSecond`
  and the expectation flips sign (`-1` where it read `1`).
- `src/test-utils/fixtures.test.ts:12`: `.hurts).toBe(1)` becomes `.healthRate).toBe(-1)`.
- `src/ui/App.test.tsx:155` reads `balance.content.windward.pirates.hurts` and
  stays as it is: balance keeps the key.

Run the four test files again. Expected: PASS. Run `npm run typecheck`:
the UI files fail on `.hurts`; Step 3.

- [ ] **Step 3: Failing UI tests, then the UI**

`src/ui/Rates.test.tsx`: the existing cases pass `hurts={1}`, `{0}`, `{0.5}`,
`{0.3}` (lines 25, 37, 40, 44); each becomes `row={-1}`, `{0}`, `{-0.5}`,
`{-0.3}`, `hurtsBy` becomes `rowBy`. Add (the minus is written as the escape
`−`, as the file's existing cases do at lines 27 and 47):

```ts
it('a healing row shows a green plus under its skill, and counts toward covering decay', () => {
  render(<Rates decay={0.5} ceiling={0.2} row={0.4} rowBy="rest" stopped={false} />);
  expect(screen.getByText('rest')).toBeInTheDocument();
  expect(screen.getByText('+0.40 hp/s')).toHaveClass('heal-text');
  expect(screen.getByText('+0.20 hp/s')).toHaveClass('rates__food--covers');
});
it('a draining row is red and counts against the larder', () => {
  render(<Rates decay={0.1} ceiling={0.2} row={-0.3} rowBy="fight" stopped={false} />);
  expect(screen.getByText('−0.30 hp/s')).toHaveClass('hurt-text');
  expect(screen.getByText('+0.20 hp/s')).toHaveClass('rates__food--short');
});
```

`src/ui/ActionRow.test.tsx`: the file's `row(state, id, running, content)`
helper (line 26) takes a content override as its fourth argument, and the
hurt case builds `past` inside its own closure (line 69). Add beside it:

```ts
it('a healing row prints its rate with a plus in heal-text', () => {
  const past = (s: GameState) => built(s, 'hull', 'satchel', 'net', 'gate');
  row(past(fresh()), 'raid', false, { ...book, actions: { ...book.actions, raid: { ...book.actions.raid!, healthRate: 1 } } });
  expect(screen.getByText('+1.00 hp/s')).toHaveClass('heal-text');
});
```

(`fresh`, `built`, `book`, `GameState` are what the sibling case uses; copy its
imports if any is missing.)

`src/ui/Queue.test.tsx`: beside the hurt case at lines 120-123, render the
queue with `{ ...testBook, actions: { ...testBook.actions, raid: { ...testBook.actions.raid!, healthRate: 1 } } }`
and the raid queued, and expect the entry's `.entry__third` to contain
`+1.00 hp/s` in `heal-text`.

`src/ui/format.ts` has no imports today; add at the top
`import { MINUS } from './glyphs';` and:

```ts
/** A row's health rate, signed, two decimals: −0.30 hp/s, +1.00 hp/s. Display precision, not tuning. */
const RATE_DECIMALS = 2;
export function hpRate(n: number): string {
  return `${n < 0 ? MINUS : '+'}${Math.abs(n).toFixed(RATE_DECIMALS)} hp/s`;
}
export function hpClass(n: number): 'hurt-text' | 'heal-text' {
  return n < 0 ? 'hurt-text' : 'heal-text';
}
```

`src/ui/Rates.tsx`: props `row = 0`, `rowBy = 'row'`; delete `RATE_DECIMALS`
(line 5) and `signed` (lines 7-9) together (the constant now lives in
`format.ts` beside `hpRate`; an orphaned one fails `noUnusedLocals`); the
decay and food lines call `hpRate(-decay)` and `hpRate(ceiling)` (`hpRate(0)`
gives `+0.00 hp/s`, as the blank-ceiling test expects);
`covered = ceiling + Math.max(0, row) >= decay + Math.max(0, -row)`;
`const shown = row !== 0`; the third line's label shows `rowBy` when shown;
its value span gets `className={\`rates__v ${hpClass(row)}${shown ? '' : ' rates__blank'}\`}`
and text `shown ? hpRate(row) : ' '`. Docblock: "while a row with a
health rate runs, its rate, signed, labelled by its skill".

`src/ui/ActionRow.tsx:179` and `src/ui/Queue.tsx:83`:
`{action.healthRate !== undefined && <span className={hpClass(action.healthRate)}>{hpRate(action.healthRate)}</span>}`
(`a.healthRate` in Queue). `Queue.tsx:74`: `(content.actions[e.actionId]?.healthRate ?? 0) < 0`.
`Queue.tsx:85`: `a.healthRate === undefined`. Drop `HURT_DECIMALS` in Queue;
keep `FACTOR_DECIMALS` in ActionRow if the decay factor still uses it.

`src/ui/App.tsx`: import `rowHealthPerSecond` in place of `hurtsPerSecond`;
`const row = runningActionId ? rowHealthPerSecond(screen, windwardRun) : 0;`
`const rowBy = ...` (the old `hurtsBy`); `<Rates ... row={row} rowBy={rowBy} .../>`.

`src/styles.css`, after `.hurt-text`: `.heal-text { color: var(--good); }`.

Imports, since `noUnusedLocals` rejects an import nothing reads: `Rates.tsx:1`
becomes `import { RISING } from './glyphs';` and gains
`import { hpClass, hpRate } from './format';`; `Queue.tsx:10-11` become
`import { duration, fraction, hpClass, hpRate } from './format';` and
`import { WARN } from './glyphs';`; `ActionRow.tsx:13-14` become
`import { duration, hpClass, hpRate } from './format';` and
`import { ARROW, PLAY, STOP, WARN } from './glyphs';`. The Rates blanks keep
the `'\u00A0'` escape and their `aria-hidden`, as `Rates.test.tsx:34` expects.

Run: `npm run typecheck && npx vitest run src/ui`. Expected: PASS.

- [ ] **Step 4: Gates, commit**

```sh
npm run typecheck && npm run lint && npm test && npm run test:hooks
git add -A
git commit -m "engine: a row's health rate is signed; heals clamp at max (#54)"
```

---

### Task 3: Books and rows set their own unlock counts (#82, part 1)

**Files:**
- Modify: `src/data/types.ts` (`Content`, `ActionDefinition`),
  `src/data/validate.ts`, `src/engine/automation.ts:25-37,66-70`, and every
  caller of `unlockAt`, `isUnlocked`, `modeOf`, `automated`:
  `src/engine/queue.ts:100,250`, `src/engine/fight.ts:117-124,141,149-150`,
  `src/engine/resolve.ts:88,104,120,131,164,260`,
  `src/engine/play.ts:204,207,225,235,258,278,281`, `src/state/useGame.ts:159`,
  `src/ui/ActionRow.tsx:129-138`, `src/ui/words.ts:61`, and the tests that
  call them (`automation`, `fight`, `pages`, `play`, `property` (also
  `automated` at :140), `queue`, `resolve`, `tick`, `useGame.debug`, `ActionRow`)
- Test: `src/engine/automation.test.ts`, `src/data/validate.test.ts`

**Interfaces:**
- Produces: `Content.automation?: { readonly unlockRepeatable?: number; readonly unlockOneTime?: number }`,
  `ActionDefinition.unlockAt?: number`. `unlockAt(content: Content, action)`,
  `isUnlocked(state, content, action)`, `modeOf(state, content, action)`,
  `automated(state, content, fight)` in `fight.ts`. Later tasks pass `content`
  first, then the action.

- [ ] **Step 1: Failing tests**

`src/engine/automation.test.ts` (check its imports: it needs `balance`,
`fixture`, `newState`, `isUnlocked`, `unlockAt`):

```ts
describe('unlockAt', () => {
  const row = { id: 'r', verb: 'fish', noun: '', expCost: 1, itemCosts: [], isOneTime: false } as const;
  const once = { ...row, id: 'o', isOneTime: true } as const;
  it('falls back to balance by kind', () => {
    expect(unlockAt(fixture, row)).toBe(balance.automation.unlockRepeatable);
    expect(unlockAt(fixture, once)).toBe(balance.automation.unlockOneTime);
  });
  it("a book's counts override balance, by kind", () => {
    const book = { ...fixture, automation: { unlockRepeatable: 3, unlockOneTime: 2 } };
    expect(unlockAt(book, row)).toBe(3);
    expect(unlockAt(book, once)).toBe(2);
    expect(unlockAt({ ...fixture, automation: { unlockOneTime: 2 } }, row)).toBe(balance.automation.unlockRepeatable);
  });
  it("a row's own count overrides its book, whatever the kind", () => {
    const book = { ...fixture, automation: { unlockRepeatable: 3, unlockOneTime: 2 } };
    expect(unlockAt(book, { ...row, unlockAt: 1 })).toBe(1);
    expect(unlockAt(book, { ...once, unlockAt: 7 })).toBe(7);
    expect(isUnlocked({ ...newState(fixture.roster), completionCounts: { r: 1 } }, book, { ...row, unlockAt: 1 })).toBe(true);
    expect(isUnlocked({ ...newState(fixture.roster), completionCounts: { o: 2 } }, book, { ...once, unlockAt: 7 })).toBe(false);
  });
});
```

`src/data/validate.test.ts`, add:

```ts
it('unlock counts are positive whole numbers', () => {
  expect(validateBook({ ...good, automation: { unlockRepeatable: 0 } })).toContainEqual(expect.stringMatching(/unlockRepeatable.*0/));
  expect(validateBook({ ...good, automation: { unlockOneTime: 1.5 } })).toContainEqual(expect.stringMatching(/unlockOneTime.*1\.5/));
  expect(validateBook(withActions({ ...good.actions, forage: { ...good.actions.forage!, unlockAt: -1 } }))).toContainEqual(expect.stringMatching(/forage.*chip.*-1/));
  expect(validateBook({ ...good, automation: { unlockRepeatable: 2, unlockOneTime: 1 } })).toEqual([]);
});
```

Run: `npx vitest run src/engine/automation.test.ts src/data/validate.test.ts`. Expected: FAIL.

- [ ] **Step 2: Types, validator, resolution**

`src/data/types.ts`: on `ActionDefinition`, after `isOneTime`:

```ts
  /** This row's own completions-to-chip, over its book's and balance's (spec 2026-09-24-proving-ground section 2.1). */
  readonly unlockAt?: number;
```

On `Content`, after `finish`:

```ts
  /** The book's completions-to-chip by kind, over balance.automation's; a row's unlockAt is over both (section 2.1). */
  readonly automation?: { readonly unlockRepeatable?: number; readonly unlockOneTime?: number };
```

`src/data/validate.ts`, in the actions loop:

```ts
    if (a.unlockAt !== undefined && !positiveWhole(a.unlockAt)) problems.push(`row "${a.id}" earns its chip at ${a.unlockAt} completions, which is not a positive whole number`);
```

and after the loop over actions:

```ts
  for (const key of ['unlockRepeatable', 'unlockOneTime'] as const) {
    const n = book.automation?.[key];
    if (n !== undefined && !positiveWhole(n)) problems.push(`${key} is ${n}, which is not a positive whole number`);
  }
```

`src/engine/automation.ts`:

```ts
/** Lifetime completions that earn a row its chip: the row's own, else its book's by kind, else balance's by kind (section 2.1). */
export function unlockAt(content: Content, action: ActionDefinition): number {
  if (action.unlockAt !== undefined) return action.unlockAt;
  return action.isOneTime
    ? content.automation?.unlockOneTime ?? balance.automation.unlockOneTime
    : content.automation?.unlockRepeatable ?? balance.automation.unlockRepeatable;
}

export function isUnlocked(state: GameState, content: Content, action: ActionDefinition): boolean {
  return (state.completionCounts[action.id] ?? 0) >= unlockAt(content, action);
}

export function modeOf(state: GameState, content: Content, action: ActionDefinition): AutoMode {
  return isUnlocked(state, content, action) ? state.automation[action.id] ?? 'off' : 'off';
}
```

`setAutomation` passes `content` through. `fight.ts`'s
`automated(state, content, fight)` and every `modeOf`/`isUnlocked` call gain
`content` (`book` in `play.ts`). `queue.ts:250`: `unlockAt(content, action)`.
`useGame.ts:159`: `unlockAt(content, a)`. `ActionRow.tsx`: `isUnlocked(state, content, action)`,
`modeOf(state, content, action)`, `unlockAt(content, action)`. `words.ts:61`:
`unlockAt(content, a)`.

```sh
npm run typecheck
```

Fix every call the compiler names, tests included (`property.test.ts` calls
`unlockAt`, `modeOf` and `automated`). Expected: green.

- [ ] **Step 3: Gates, commit**

```sh
npm run typecheck && npm run lint && npm test && npm run test:hooks
git add -A
git commit -m "engine: a book and a row set their own completions-to-chip (#82)"
```

---

### Task 4: Touches per life, hurt share, the play version, the game version (#70, #54, #66)

**Files:**
- Modify: `src/engine/play.ts` (`PlayRun`, `play`, `PLAY_VERSION`),
  `package.json` (`version`), `src/engine/measure.test.ts:74` (the lock)
- Create: `src/version.test.ts`
- Test: `src/engine/play.test.ts`, `src/engine/measure.test.ts`, `src/version.test.ts`

**Interfaces:**
- Consumes: `hurts(action)` from Task 2; `Content.automation` from Task 3.
- Produces: `PlayRun.touchesPerLife: readonly number[]`, `PlayRun.hurtShare: number`,
  `PLAY_VERSION = 5`, `package.json` `"version": "0.2.0"`.

- [ ] **Step 1: Failing tests**

`src/engine/play.test.ts`, a new describe. `monumentBook(stone, expCost)` is
at line 20; `attentive`, `play`, `Policy`, `enqueue` and `balance` are
imported at the top (check, and add `setAutomation` from `./automation`).

```ts
describe('touches and hurt share', () => {
  const book = monumentBook(3, 30);
  it('one ask that changed the state is one touch, whatever it queued; an ask that changed nothing is none', () => {
    // One ask queues three orders (one touch); every later ask returns the state as it is. The run then freezes
    // once the orders are spent, so the count is exactly one, not a function of how fast berries are eaten.
    const once: Policy = {
      name: 'three at once', sane: false, checkEverySeconds: 0,
      decide: (s, b) => (s.queue.length > 0 || (s.completionCounts.shelter ?? 0) > 0 ? s : ['forage', 'mine', 'shelter'].reduce((acc, id) => enqueue(acc, b, id), s)),
    };
    const run = play(book, once);
    expect(run.outcome).toBe('frozen');
    expect(run.touchesPerLife).toEqual([1]);
  });
  it('a chip switched is a touch, like an order', () => {
    // The book earns a chip at one completion: one ask orders forage (a touch), a later ask switches it to JIT
    // (a touch), and every ask after that changes nothing. Two touches in the one life; the run freezes when the
    // full stack blocks JIT's idle fill.
    const ready = { ...book, automation: { unlockRepeatable: 1 } };
    let switched = false;
    const chip: Policy = {
      name: 'one chip', sane: false, checkEverySeconds: 0,
      decide: (s, b) => {
        if ((s.completionCounts.forage ?? 0) >= 1 && !switched) { switched = true; return setAutomation(s, b, 'forage', 'jit'); }
        return switched || s.queue.length > 0 ? s : enqueue(s, b, 'forage');
      },
    };
    const run = play(ready, chip);
    expect(run.outcome).toBe('frozen');
    expect(run.touchesPerLife[0]).toBe(2);
  });
  it('hurt share is the share of ticks the working row drained on, the killing tick included; 0 for a book that does not hurt', () => {
    expect(play(book, attentive).hurtShare).toBe(0);
    // The monument drains: it hurts on every tick it works, and the run still finishes.
    const fight = { ...book, actions: { ...book.actions, monument: { ...book.actions.monument!, healthRate: -0.1 } } };
    const run = play(fight, attentive);
    expect(run.outcome).toBe('finished');
    expect(run.hurtShare).toBeGreaterThan(0);
    expect(run.hurtShare).toBeLessThanOrEqual(1);
    // Every row drains, so nothing calm can run instead and the fight guard lets the drain go on (#74 case 3):
    // 3 hp a tick kills a fresh player on tick 34, and every tick of every life is a hurt tick, the killing one included.
    const killer = { ...book, actions: Object.fromEntries(Object.entries(book.actions).map(([id, a]) => [id, { ...a, healthRate: -30 }])) };
    const dead = play(killer, attentive, { ...balance.play, maxBookDays: 1 / 24 / 60 });
    expect(dead.lives).toBeGreaterThan(1);
    expect(dead.hurtShare).toBe(1);   // without the killing tick it would be (total - deaths) / total
  });
});
```

`src/engine/measure.test.ts:74`: the lock reads `PLAY_VERSION: 5`.

`src/version.test.ts` (outside the three layers; the purity scan never reads it):

```ts
import { describe, expect, it } from 'vitest';
import { version } from '../package.json';
import { balance } from './balance';
import { windwardRun } from './data/windward-run';
import { attentive, measure } from './engine/play';

describe('the game version', { timeout: 30_000 }, () => {
  it('is a real semver in package.json, and a report stamps it', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(version).not.toBe('0.0.0');
    // A short bound: the stamp is the point, not the outcome.
    expect(measure(windwardRun, [attentive], version, { ...balance.play, maxBookDays: 1 / 24 }).gameVersion).toBe(version);
  });
});
```

Run: `npx vitest run src/engine/play.test.ts src/engine/measure.test.ts src/version.test.ts`. Expected: FAIL.

- [ ] **Step 2: The play**

`src/engine/play.ts`: `PLAY_VERSION = 5` (docblock: "5: touches per life and
hurt share in the run"). `PlayRun` gains:

```ts
  /** Asks of the policy that changed the state, per life: the reactions #70 counts as a person's touches. */
  readonly touchesPerLife: readonly number[];
  /** Of the run's ticks, the share the working row drained health on, the killing tick included (#54). 0 for a book that does not hurt. */
  readonly hurtShare: number;
```

In `play()`: `const touchesPerLife: number[] = []; let touches = 0; let hurtTicks = 0;`.
Where the policy is asked:

```ts
    if (decideNow) { const decided = policy.decide(s, book); if (decided !== s) touches += 1; s = decided; sinceDecide = 0; }
```

Directly after `const next = step(s, book);` and BEFORE the `finished`/`dead`
branches (the killing tick counts):

```ts
    if (next.runTicks !== s.runTicks) {
      // The row that worked: a completion pops its order, so its event names it; otherwise the top.
      const done = next.events.find((e) => e.type === 'completed');
      const worked = done !== undefined && done.type === 'completed' ? done.actionId : next.queue[0]?.actionId;
      if (worked !== undefined && hurts(book.actions[worked])) hurtTicks += 1;
    }
```

(`hurts` joins `stops` in the `./fight` import.) On death:
`touchesPerLife.push(touches); touches = 0;`. In `end()`:
`touchesPerLife: [...touchesPerLife, touches]` and
`hurtShare: total === 0 ? 0 : hurtTicks / total` where `total = before + last.runTicks`.

`package.json`: `"version": "0.2.0"`.

Run the three files. Expected: PASS. Then `npm test`: a test that matches a
whole `PlayRun` with `toEqual` needs the two fields (`toMatchObject` cases do
not).

- [ ] **Step 3: Gates, commit**

```sh
npm run typecheck && npm run lint && npm test && npm run test:hooks
git add -A
git commit -m "play: touches per life and hurt share; version 0.2.0 (#70 #66)"
```

---

### Task 5: The book is a prop, the save key is per book, the proving ground (#82, part 2)

**Files:**
- Create: `src/data/proving-ground.ts`, `src/engine/proving-ground.test.ts`
- Modify: `src/ui/App.tsx` (prop), `src/main.tsx`, `src/state/save.ts` (`saveKey`),
  `src/state/useGame.ts` (four `SAVE_KEY` uses), `src/ui/App.test.tsx` (19 renders),
  `src/state/useGame.save.test.tsx` (six `SAVE_KEY` reads at lines 50, 57, 75,
  78, 81, 91, plus a new case), `src/state/save.test.ts`, `src/engine/property.test.ts`
- Test: as named

**Interfaces:**
- Consumes: `Content.automation`, `ActionDefinition.unlockAt` (Task 3),
  `healthRate` (Task 2), `play`/`attentive`, `hurtShare`, `touchesPerLife` (Task 4).
- Produces: `App({ book }: { book: Book })`; `saveKey(book: Pick<Book, 'id'>): string`
  in `save.ts`; `provingGround: Book` in `src/data/`.

Order: the book (Step 1) before the wiring that imports it (Step 3), so the
tree typechecks between commits.

- [ ] **Step 1: The book and its tests**

`src/data/proving-ground.ts`:

```ts
/**
 * The proving ground (#82, spec 2026-09-24-proving-ground section 2.2): no
 * story, one page per mechanic, every row's noun its expected result and
 * every one-time's beat what should have just happened. Dev builds only, on
 * ?book=proving; never in BOOKS, never shipped, imported by nothing that is.
 *
 * Its numbers are literals, as src/engine/fixture.ts's are: a fixture's,
 * chosen so each mechanic shows inside a minute at speed 1, never tuned and
 * never the user's. The tuning hook notices an edit here, as it does there.
 *
 * The boar's bands, computed from balance (health.base 100, baseTickExp 0.1,
 * foodCooldownTicks 50, ten ticks a second) and fight.ts with berries' chip
 * off and the pack empty: 5 hp/s over 60 ticks costs 30 hp; the window is
 * berries' 31 ticks, in which it takes 15.5 hp; so from full health it wins,
 * between about 16 and 30 it starts and backs off mid-fight (case 2, progress
 * kept), and under about 16 it backs off before starting. Berries in the pack
 * lower the win band (wouldKill eats inside the window: 25 hp wins with three
 * berries) and leave the refuse band near 16. A chip on berries with room in
 * the pack makes the guard wait behind a berry first (case 1), again and
 * again, until the pack is full and the fight is refused, or the bites carry
 * it to a win with under 1 hp left; at a full pack there is no delay and the
 * fight is refused outright. The same holds for the wasp: its rate is one no
 * max health or larder covers, so it is refused whenever nothing delays it,
 * and delayed behind a berry when a chipped berries row has room. The nap is
 * on this page so something calm can always run: without it a full or
 * chipped berries row leaves nothing calm and a fight is fought to the death.
 * That is case 3, and the last stand page shows it: no food row, so the
 * window is one tick and nothing is calm; from full health it wins, under
 * about 31 it is fought to the death.
 */
import type { Book } from './types';

export const provingGround: Book = {
  id: 'proving-ground',
  name: 'The Proving Ground',
  version: 1,
  finish: 'finish',
  length: { hours: 1 },
  automation: { unlockRepeatable: 3, unlockOneTime: 2 },
  roster: [
    { id: 'gather', name: 'Gather', icon: 'sprout' },
    { id: 'make', name: 'Make', icon: 'wrench' },
    { id: 'fight', name: 'Fight', icon: 'sword' },
    { id: 'rest', name: 'Rest', icon: 'house' },
    { id: 'go', name: 'Go', icon: 'route' },
  ],
  chapters: [
    {
      head: { numeral: 'I', chapter: 'Orders', story: 'No story. Each row says what should happen when it runs.' },
      pages: [
        { name: 'The chain', order: ['berries', 'sticks', 'shelter'], closes: 'shelter' },
        { name: 'Pages', order: ['berries', 'sticks', 'fence', 'gate'], closes: 'gate' },
        { name: 'Chips', order: ['berries', 'sticks', 'kindling', 'hearth'], closes: 'hearth' },
        { name: 'The fight', order: ['berries', 'nap', 'wasp', 'boar'], closes: 'boar' },
        { name: 'Heals', order: ['berries', 'nap', 'camp'], closes: 'camp' },
        { name: 'Capacity', order: ['sticks', 'pouch'], closes: 'pouch' },
        { name: 'Last stand', order: ['stand'], closes: 'stand' },
        { name: 'Casting off', order: ['berries', 'sticks', 'ferry'], closes: 'ferry' },
      ],
    },
    {
      head: { numeral: 'II', chapter: 'The end', story: 'A fresh page after casting off. One row, the finish; the pack keeps its food.' },
      pages: [{ name: 'The finish', order: ['finish'], closes: 'finish' }],
    },
  ],
  items: {
    berries: { id: 'berries', name: 'berries', one: 'berry', kind: 'food', healPerUnit: 4 },
    sticks: { id: 'sticks', name: 'sticks', one: 'stick', kind: 'material' },
    kindling: { id: 'kindling', name: 'kindling', kind: 'material' },
  },
  actions: {
    berries: { id: 'berries', verb: 'gather', noun: 'berries: food, eaten as decay bites; chip after 3 runs (the book\'s count, likely earned by page 3), cycling off, JIT, then the priorities; on any chip it refills at zero', expCost: 3, producedItem: 'berries', producedAmount: 1, itemCosts: [], isOneTime: false },
    sticks: { id: 'sticks', verb: 'gather', noun: 'sticks: one at a time, up to the stack cap (5 until the pouch); chip after 3 runs', expCost: 2, producedItem: 'sticks', producedAmount: 1, itemCosts: [], isOneTime: false },
    shelter: { id: 'shelter', verb: 'make', noun: 'a shelter: needs 4 sticks; press play with none and the chain pulls sticks first; closes the page', expCost: 6, itemCosts: [{ item: 'sticks', amount: 4 }], isOneTime: true, beat: 'The chain pulled the sticks, then built this. The page turns.' },
    fence: { id: 'fence', verb: 'make', noun: 'a fence: costs 2 sticks; the gate below waits for it', expCost: 4, itemCosts: [{ item: 'sticks', amount: 2 }], isOneTime: true, beat: 'The fence stands. The gate can go.' },
    gate: { id: 'gate', verb: 'go', noun: 'the gate: closes the page; at rest it says it comes after the fence; pressed first it pulls the fence', expCost: 4, itemCosts: [], isOneTime: true, beat: 'Through the gate. The page turns.' },
    kindling: { id: 'kindling', verb: 'gather', noun: 'kindling: chip after 1 run, this row\'s own count over the book\'s 3', expCost: 2, producedItem: 'kindling', producedAmount: 1, itemCosts: [], isOneTime: false, unlockAt: 1 },
    hearth: { id: 'hearth', verb: 'make', noun: 'a hearth: costs 2 kindling; closes the page', expCost: 4, itemCosts: [{ item: 'kindling', amount: 2 }], isOneTime: true, beat: 'The hearth is lit. The page turns.' },
    wasp: { id: 'wasp', verb: 'fight', noun: 'wasps: a million hp a second for a tenth of a second. With berries chip off, or the pack full, play refuses at any health and says why (it would kill inside its window); with a chip and room in the pack it waits behind berries first, then is refused once the pack is full. Shift forces it and it kills', expCost: 0.1, itemCosts: [], isOneTime: false, healthRate: -1e6 },
    boar: { id: 'boar', verb: 'fight', noun: 'a boar: takes 5 hp/s for 6 s (30 hp). From full health it wins. With berries chip off and none in the pack, set health with the overlay: at 25 it starts and backs off mid-fight, saying why; at 10 it backs off before starting. Berries in the pack lower the win band (25 wins with three; the guard counts eating) and leave the refusal near 16. With a chip on berries and room in the pack it waits behind a berry, again and again, until the pack is full and it backs off, or the bites carry it to a win with under 1 hp left. Shift forces it to the end', expCost: 6, itemCosts: [], isOneTime: true, healthRate: -5, beat: 'The boar is down. The page turns.' },
    nap: { id: 'nap', verb: 'rest', noun: 'a nap: gives 2 hp/s while it runs, never past max; the rates line shows it green', expCost: 5, itemCosts: [], isOneTime: false, healthRate: 2 },
    camp: { id: 'camp', verb: 'go', noun: 'break camp: closes the page', expCost: 4, itemCosts: [], isOneTime: true, beat: 'Camp broken. The page turns.' },
    pouch: { id: 'pouch', verb: 'make', noun: 'a pouch: costs 2 sticks; the stack cap rises by 5, seen two pages on (sticks stop at 10, not 5); closes the page', expCost: 4, itemCosts: [{ item: 'sticks', amount: 2 }], isOneTime: true, capacityBonus: 5, beat: 'The pouch holds more. The page turns.' },
    stand: { id: 'stand', verb: 'fight', noun: 'the last stand: no food here, so nothing is calm and the guard has nothing to wait for; it starts from any health and is fought to the end: from full it wins, under about 31 it kills; closes the page', expCost: 6, itemCosts: [], isOneTime: true, healthRate: -5, beat: 'The stand held. The page turns.' },
    ferry: { id: 'ferry', verb: 'go', noun: 'the ferry: casts off to chapter II; the head and the pages change', expCost: 3, itemCosts: [], isOneTime: true, beat: 'Cast off.' },
    finish: { id: 'finish', verb: 'go', noun: 'the end: finishes the book; the finish card comes up', expCost: 3, itemCosts: [], isOneTime: true, beat: 'The end.' },
  },
};
```

`src/engine/proving-ground.test.ts` (an engine test may import `src/data/`):

```ts
import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import { BOOKS } from '../data/books';
import { bookHurts } from '../data/derived';
import { provingGround } from '../data/proving-ground';
import { validateBook } from '../data/validate';
import { attentive, handsOn, play, prioritized } from './play';

describe('the proving ground', { timeout: 30_000 }, () => {
  it('is valid, hurts, and is not a shipped book', () => {
    expect(validateBook(provingGround)).toEqual([]);
    expect(bookHurts(provingGround)).toBe(true);
    expect(BOOKS.map((b) => b.id)).not.toContain(provingGround.id);
  });
  it('every measuring player finishes it, touching the game and taking some hurt', () => {
    // A day's bound: the book claims an hour, and a defect comes back as never-finishes in seconds, not 60 days.
    // All three finish in one life: the wasp never completes (it kills on its first working tick), so it never
    // earns a chip and no policy automates it; the boar and the stand are won from full health.
    for (const policy of [attentive, handsOn, prioritized]) {
      const run = play(provingGround, policy, { ...balance.play, maxBookDays: 1 });
      expect(run.outcome, policy.name).toBe('finished');
      expect(run.hurtShare, policy.name).toBeGreaterThan(0);
      expect(run.touchesPerLife.reduce((a, b) => a + b, 0), policy.name).toBeGreaterThan(0);
    }
  });
  it('sets both overrides: the book counts and one row over them', () => {
    expect(provingGround.automation).toEqual({ unlockRepeatable: 3, unlockOneTime: 2 });
    expect(provingGround.actions.kindling!.unlockAt).toBe(1);
  });
});
```

`src/engine/property.test.ts`: `import { provingGround } from '../data/proving-ground';`
beside line 4, and a sibling `it` after the Windward Run's (line 209), its own
so the Windward counters and timeout stay the Windward's (the fight page's
seeds spend much of their 3000 actions in rebirths, which is fine):

```ts
  it('on the proving ground, from each page of each chapter', () => {
    provingGround.chapters.forEach((ch, chapter) => ch.pages.forEach((_, page) => {
      for (const seed of [31, 32]) play(provingGround, seed + 10 * chapter + 100 * page, 3000, chapter, page);
    }));
  }, 60_000);
```

Run: `npx vitest run src/engine/proving-ground.test.ts src/engine/property.test.ts`. Expected: PASS.
If the attentive run does not finish, read `run.outcome` and `run.frozen`: a
page whose closer the policy cannot reach is a book defect; fix the book, not
the policy.

- [ ] **Step 2: Failing tests: the save key and the App prop**

`src/state/save.test.ts`: add `SAVE_KEY, saveKey` to the existing `./save`
import at line 9 and `import { windwardRun } from '../data/windward-run';`, then:

```ts
describe('saveKey', () => {
  it('is the bare key for the Windward Run, so every existing save keeps loading, and a suffixed key for any other book', () => {
    expect(saveKey(windwardRun)).toBe(SAVE_KEY);
    expect(saveKey({ id: 'proving-ground' })).toBe(`${SAVE_KEY}.proving-ground`);
  });
});
```

`src/state/useGame.save.test.tsx`: import `saveKey` beside `SAVE_KEY`; the
six reads of `storage.data[SAVE_KEY]` and the seeded `{ [SAVE_KEY]: ... }` at
lines 50, 57, 75, 78, 81, 91 become `saveKey(saltRoadFixture)` (the fixture is
not the Windward Run, so its key is suffixed and the old reads would find
nothing). Add, with `other` at module scope so the hook's deps see one object:

```ts
const other: Book = { ...longBook, id: 'other' };
it("another book saves under its own key and never touches the Windward Run's", () => {
  const storage = fakeStorage({ [SAVE_KEY]: 'a windward save nobody reads here' });
  const { result } = renderHook(() => useGame(other, { storage }));
  act(() => result.current.save());
  expect(storage.data[SAVE_KEY]).toBe('a windward save nobody reads here');
  expect(storage.data[saveKey(other)]).toContain('"bookId":"other"');
  expect(storage.data[ASIDE_KEY]).toBeUndefined();
});
```

`src/ui/App.test.tsx`: every `render(<App />)` becomes
`render(<App book={windwardRun} />)`; `windwardRun` is already imported (line 5):

```sh
sed -i '' 's/<App \/>/<App book={windwardRun} \/>/g' src/ui/App.test.tsx
```

Run: `npx vitest run src/state/save.test.ts src/state/useGame.save.test.tsx src/ui/App.test.tsx`. Expected: FAIL.

- [ ] **Step 3: The prop and the key**

`src/state/save.ts`:

```ts
import { windwardRun } from '../data/windward-run';
/**
 * The Windward Run keeps the bare key, so every save written before books had
 * keys still loads; any other book has its own. (A book id of "aside" would
 * collide with ASIDE_KEY; no book is called that.)
 */
export function saveKey(book: Pick<Book, 'id'>): string {
  return book.id === windwardRun.id ? SAVE_KEY : `${SAVE_KEY}.${book.id}`;
}
```

`src/state/useGame.ts`: `open`, `save`, `load`, `erase` use `saveKey(book)`
(`open` takes `book`; the three callbacks close over it and list it in their
deps).

`src/ui/App.tsx`: `export function App({ book }: { book: Book })` with
`import type { Book } from '../data/types';`; replace every `windwardRun` with
`book`; drop the import; the `topWorks` memo at line 55 lists `book` in its
deps. `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Book } from './data/types';
import { windwardRun } from './data/windward-run';
import { App } from './ui/App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root not found in index.html');

const mount = (book: Book): void => {
  createRoot(root).render(
    <StrictMode>
      <App book={book} />
    </StrictMode>,
  );
};

// Dev builds open the proving ground on ?book=proving (spec 2026-09-24-proving-ground section 2.2);
// production ignores the parameter and never carries the module.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('book') === 'proving') {
  void import('./data/proving-ground').then((m) => mount(m.provingGround));
} else {
  mount(windwardRun);
}
```

Run: `npm run typecheck && npx vitest run src/state src/ui/App.test.tsx`. Expected: PASS.

- [ ] **Step 4: The production build drops the book**

```sh
npm run build
grep -l "The Proving Ground" dist/assets/*.js || echo "dropped"
ls dist/assets
```

Expected: `dropped`, and no separate chunk for it. If a chunk exists, the
`if (import.meta.env.DEV && ...)` was not statically false at build time: read
Vite's `define` for `import.meta.env.DEV` in the build log and fix the
condition so its first operand is the literal.

- [ ] **Step 5: Gates, commit**

```sh
npm run typecheck && npm run lint && npm test && npm run test:hooks
git add -A
git commit -m "content: the proving ground on ?book=proving; a save key per book (#82)"
```

---

### Task 6: One tab plays (#73)

**Files:**
- Create: `src/state/tabs.ts`, `src/test-utils/locks.ts`, `src/state/tabs.test.ts`,
  `src/state/useGame.tabs.test.tsx`, `src/ui/TabCard.tsx`, `src/ui/TabCard.test.tsx`
- Modify: `src/state/useGame.ts` (opts, `elsewhere`, `playHere`, the loop,
  `save`, `erase`), `src/ui/App.tsx` (the card, inert), `src/ui/App.test.tsx` (one case)
- Test: as created

**Interfaces:**
- Produces, in `tabs.ts`:

```ts
/** The part of navigator.locks the game uses; a test passes a fake. */
export interface LockManagerLike {
  request(name: string, options: { steal?: boolean; signal?: AbortSignal }, callback: (lock: unknown | null) => Promise<unknown>): Promise<unknown>;
}
export interface Held { readonly release: () => void; readonly lost: Promise<void> }
export function lockName(saveKey: string): string;   // `continuum.lock.${saveKey}`
/** Queued request; `waitMs` aborts it (null) if not granted by then; `steal` takes it from a holder. */
export function acquire(locks: LockManagerLike, name: string, opts: { steal: boolean; waitMs: number }): Promise<Held | null>;
export function defaultLocks(): LockManagerLike | null;   // navigator.locks or null
```

- On the handle: `elsewhere: 'none' | 'held' | 'lost'`, `playHere: () => void`.
- `useGame(book, { storage?, locks? })`: `locks: null` means none; omitted means
  the browser's.

- [ ] **Step 1: The fake, and failing tests for `acquire`**

`src/test-utils/locks.ts`. Requests queue per name and are granted one at a
time on a microtask, as the real manager grants: two requests in one task are
never both granted (a per-name `pending` flag marks the one being granted), a
request in the same task as a release waits for the pump. `steal` preempts
and rejects the holder's request; an aborted signal rejects a queued request.

```ts
import type { LockManagerLike } from '../state/tabs';

interface Holder { readonly reject: (e: Error) => void }
type Run = () => void;

/** navigator.locks in miniature: FIFO per name, one grant per microtask; steal rejects the holder's request; a signal aborts a queued request. */
export function fakeLocks(): LockManagerLike & { readonly heldNames: () => readonly string[] } {
  const held = new Map<string, Holder>();
  const queues = new Map<string, Run[]>();
  const pending = new Set<string>();
  const pump = (name: string): void => {
    if (held.has(name) || pending.has(name)) return;
    const run = queues.get(name)?.shift();
    if (run === undefined) return;
    pending.add(name);
    queueMicrotask(() => { pending.delete(name); run(); });
  };
  const grant = (name: string, callback: (lock: unknown) => Promise<unknown>, resolve: (v: unknown) => void, reject: (e: Error) => void): void => {
    const holder: Holder = { reject };
    held.set(name, holder);
    void Promise.resolve(callback({})).then((v) => {
      if (held.get(name) === holder) { held.delete(name); pump(name); }
      resolve(v);
    });
  };
  return {
    heldNames: () => [...held.keys()],
    request(name, options, callback) {
      return new Promise<unknown>((resolve, reject) => {
        if (options.steal === true) {
          const current = held.get(name);
          if (current !== undefined) { held.delete(name); current.reject(new Error('AbortError')); }
          grant(name, callback, resolve, reject);
          return;
        }
        const run: Run = () => {
          if (options.signal?.aborted === true) { reject(new Error('AbortError')); pump(name); return; }
          grant(name, callback, resolve, reject);
        };
        const queue = queues.get(name) ?? [];
        queues.set(name, queue);
        queue.push(run);
        options.signal?.addEventListener('abort', () => {
          const i = queue.indexOf(run);
          if (i >= 0) { queue.splice(i, 1); reject(new Error('AbortError')); }
        });
        pump(name);
      });
    },
  };
}
```

`src/state/tabs.test.ts` (node; `vi.useFakeTimers()` for the abort):

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeLocks } from '../test-utils/locks';
import { acquire, lockName } from './tabs';

const tick = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

describe('acquire', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('holds a free lock until released; lost never settles for a release', async () => {
    const locks = fakeLocks();
    const p = acquire(locks, lockName('k'), { steal: false, waitMs: 100 });
    await tick();
    const held = await p;
    expect(held).not.toBeNull();
    let settled = false;
    void held!.lost.then(() => { settled = true; });
    held!.release();
    await tick();
    expect(settled).toBe(false);
    expect(locks.heldNames()).toEqual([]);
  });
  it('a second request waits, and comes back null when its wait runs out', async () => {
    const locks = fakeLocks();
    const first = acquire(locks, lockName('k'), { steal: false, waitMs: 100 });
    await tick();
    await first;
    const second = acquire(locks, lockName('k'), { steal: false, waitMs: 100 });
    await tick();
    vi.advanceTimersByTime(100);
    await tick();
    expect(await second).toBeNull();
    expect(locks.heldNames()).toEqual([lockName('k')]);
  });
  it('two requests in one task are granted one at a time, and a release inside the wait grants the second: the StrictMode sequence', async () => {
    const locks = fakeLocks();
    const first = acquire(locks, lockName('k'), { steal: false, waitMs: 100 });
    const second = acquire(locks, lockName('k'), { steal: false, waitMs: 100 });
    await tick();
    let secondSettled = false;
    void second.then(() => { secondSettled = true; });
    await tick();
    expect(secondSettled).toBe(false);   // the first holds; the second is queued, not granted
    (await first)!.release();
    await tick();
    expect(await second).not.toBeNull();
    expect(locks.heldNames()).toEqual([lockName('k')]);
  });
  it("a steal takes it, and the holder's lost settles", async () => {
    const locks = fakeLocks();
    const p = acquire(locks, lockName('k'), { steal: false, waitMs: 100 });
    await tick();
    const first = (await p)!;
    let lost = false;
    void first.lost.then(() => { lost = true; });
    const second = await acquire(locks, lockName('k'), { steal: true, waitMs: 0 });
    expect(second).not.toBeNull();
    await tick();
    expect(lost).toBe(true);
  });
});
```

Run: `npx vitest run src/state/tabs.test.ts`. Expected: FAIL (no module `./tabs`).

- [ ] **Step 2: `tabs.ts`**

```ts
/**
 * One tab plays (#73, spec 2026-09-24-proving-ground section 3): a named Web
 * Lock per save key, held for the tab's life. The mount request is queued with
 * a short abort rather than asked ifAvailable: an ifAvailable request in the
 * same task as a release is refused, and React's development remount is that
 * task. A second tab's wait runs out and it is answered "held"; Play here
 * steals. The tab that loses sees its request reject (the API rejects a stolen
 * holder's request), which is the whole signal. src/state/ supplies the lock
 * manager; the engine never sees it.
 */
export interface LockManagerLike {
  request(name: string, options: { steal?: boolean; signal?: AbortSignal }, callback: (lock: unknown | null) => Promise<unknown>): Promise<unknown>;
}
export interface Held { readonly release: () => void; readonly lost: Promise<void> }

export function lockName(saveKey: string): string {
  return `continuum.lock.${saveKey}`;
}

export function acquire(locks: LockManagerLike, name: string, opts: { steal: boolean; waitMs: number }): Promise<Held | null> {
  return new Promise((resolve) => {
    let release: () => void = () => {};
    let released = false;
    let granted = false;
    const until = new Promise<void>((r) => { release = () => { released = true; r(); }; });
    let onLost: () => void = () => {};
    const lost = new Promise<void>((r) => { onLost = r; });
    const controller = new AbortController();
    const timer = opts.steal ? null : setTimeout(() => controller.abort(), opts.waitMs);
    const request = locks.request(name, opts.steal ? { steal: true } : { signal: controller.signal }, () => {
      granted = true;
      if (timer !== null) clearTimeout(timer);
      resolve({ release, lost });
      return until;
    });
    // Released: the request resolves, no loss. Stolen: it rejects after a grant, a loss. The wait ran out: it rejects
    // before any grant, null.
    void request.then(
      () => { if (!released) onLost(); },
      () => { if (granted) { if (!released) onLost(); } else resolve(null); },
    );
  });
}

export function defaultLocks(): LockManagerLike | null {
  try { return typeof navigator !== 'undefined' && navigator.locks !== undefined ? navigator.locks : null; } catch { return null; }
}
```

Run the file. Expected: PASS.

- [ ] **Step 3: Failing hook tests**

`src/state/useGame.tabs.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { balance } from '../balance';
import type { Book } from '../data/types';
import { fakeLocks } from '../test-utils/locks';
import { ASIDE_KEY, saveKey } from './save';
import { useGame, type SaveStorage } from './useGame';

function fakeStorage(initial: Record<string, string> = {}): SaveStorage & { data: Record<string, string> } {
  const data: Record<string, string> = { ...initial };
  return { data, getItem: (k) => (k in data ? data[k]! : null), setItem: (k, v) => { data[k] = v; }, removeItem: (k) => { delete data[k]; } };
}
const longBook: Book = {
  id: 'long', name: 'Long', version: 1, finish: 'long', length: { hours: 1 },
  roster: [{ id: 'build', name: 'Build', icon: 'house' }], items: {},
  actions: { long: { id: 'long', verb: 'build', noun: 'a long thing', expCost: 1e9, itemCosts: [], isOneTime: true } },
  chapters: [{ head: { numeral: 'I', chapter: 'One', story: 'A start.' }, pages: [{ name: '', order: ['long'], closes: 'long' }] }],
};
const interval = balance.time.tickIntervalMs;
const key = saveKey(longBook);
/** Lets the fake's microtasks and the hook's promise chains settle: the StrictMode path takes five turns. */
const flush = () => act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });
/** One tick of wall time: the mount's wait, the winner's wait. */
const oneTick = () => act(() => { vi.advanceTimersByTime(interval); });
const ticksOf = (raw: string | undefined): number => JSON.parse(raw!).model.state.runTicks;

describe('useGame: one tab plays', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('with no lock manager the game plays and saves as before', async () => {
    const storage = fakeStorage();
    const { result } = renderHook(() => useGame(longBook, { storage, locks: null }));
    await flush();
    expect(result.current.elsewhere).toBe('none');
    act(() => result.current.dispatch({ type: 'queue', actionId: 'long' }));
    act(() => vi.advanceTimersByTime(interval * 5));
    expect(result.current.state.runTicks).toBe(5);
  });
  it('the first tab plays; the second is held after its wait, does not tick and does not save', async () => {
    const locks = fakeLocks(); const storage = fakeStorage();
    const first = renderHook(() => useGame(longBook, { storage, locks }));
    await flush();
    expect(first.result.current.elsewhere).toBe('none');
    const second = renderHook(() => useGame(longBook, { storage, locks }));
    await flush();
    oneTick();
    await flush();
    expect(second.result.current.elsewhere).toBe('held');
    act(() => second.result.current.dispatch({ type: 'queue', actionId: 'long' }));
    act(() => vi.advanceTimersByTime(interval * 5));
    expect(second.result.current.state.runTicks).toBe(0);
    act(() => vi.advanceTimersByTime(10_000));
    // The first tab's autosave wrote; the held tab never did: the text has the first's empty queue, not the second's order.
    expect(JSON.parse(storage.data[key]!).model.state.queue).toEqual([]);
  });
  it('Play here takes over: the loser writes once and stops; the winner plays on from that write', async () => {
    const locks = fakeLocks(); const storage = fakeStorage();
    const first = renderHook(() => useGame(longBook, { storage, locks }));
    await flush();
    act(() => first.result.current.dispatch({ type: 'queue', actionId: 'long' }));
    act(() => vi.advanceTimersByTime(interval * 7));
    const second = renderHook(() => useGame(longBook, { storage, locks }));
    await flush();
    oneTick();   // the first tab ticks once more while the second waits
    await flush();
    expect(second.result.current.elsewhere).toBe('held');
    const played = first.result.current.state.runTicks;
    expect(played).toBe(8);
    act(() => second.result.current.playHere());
    await flush();
    // The loser learned and wrote its ticks (it had never saved: 800 ms is under the 5 s autosave).
    expect(first.result.current.elsewhere).toBe('lost');
    expect(ticksOf(storage.data[key])).toBe(played);
    // The winner waits a tick, re-reads, and goes live on the loser's last write. A tick of its own due at the
    // same instant may land after the seat flips, so the base is read, not asserted.
    oneTick();
    await flush();
    expect(second.result.current.elsewhere).toBe('none');
    const base = second.result.current.state.runTicks;
    expect(base).toBeGreaterThanOrEqual(played);   // an unloaded winner would sit at 0
    // The winner plays on; the loser does not.
    act(() => vi.advanceTimersByTime(interval * 5));
    expect(second.result.current.state.runTicks).toBe(base + 5);
    expect(first.result.current.state.runTicks).toBe(played);
    // Review Focus 2: nothing more from the loser, by hand, by erase or by interval.
    act(() => second.result.current.save());
    const newest = storage.data[key]!;
    act(() => first.result.current.save());
    expect(storage.data[key]).toBe(newest);
    act(() => first.result.current.erase());
    expect(storage.data[key]).toBe(newest);
    act(() => vi.advanceTimersByTime(10_000));
    expect(ticksOf(storage.data[key])).toBeGreaterThanOrEqual(played + 5);
  });
  it('a loser whose key someone else has written since writes nothing', async () => {
    const locks = fakeLocks(); const storage = fakeStorage();
    const first = renderHook(() => useGame(longBook, { storage, locks }));
    await flush();
    act(() => first.result.current.dispatch({ type: 'queue', actionId: 'long' }));
    act(() => vi.advanceTimersByTime(interval * 3));
    // Another tab wrote in the meantime (a frozen tab thaws to find the world moved on).
    storage.data[key] = 'someone else\'s newer save';
    const second = renderHook(() => useGame(longBook, { storage, locks }));
    await flush(); oneTick(); await flush();
    act(() => second.result.current.playHere());
    await flush();
    expect(first.result.current.elsewhere).toBe('lost');
    expect(storage.data[key]).toBe('someone else\'s newer save');
  });
  it('a takeover whose re-read cannot load sets it aside before going live', async () => {
    const locks = fakeLocks(); const storage = fakeStorage();
    const first = renderHook(() => useGame(longBook, { storage, locks }));
    await flush();
    const second = renderHook(() => useGame(longBook, { storage, locks }));
    await flush(); oneTick(); await flush();
    // Written after the second opened, so its mount set nothing aside: only the takeover's re-read can.
    storage.data[key] = '{"format":99}';
    act(() => second.result.current.playHere());
    await flush(); oneTick(); await flush();
    expect(first.result.current.elsewhere).toBe('lost');
    expect(second.result.current.elsewhere).toBe('none');
    expect(JSON.parse(storage.data[ASIDE_KEY]!)).toEqual(['{"format":99}']);
    // The loser saw null at open and the key holds another text, so it wrote nothing; the winner's autosave is 5 s off.
    expect(storage.data[key]).toBe('{"format":99}');
  });
  it('a lost tab that reloads while the other holds is held', async () => {
    const locks = fakeLocks(); const storage = fakeStorage();
    const first = renderHook(() => useGame(longBook, { storage, locks }));
    await flush();
    const second = renderHook(() => useGame(longBook, { storage, locks }));
    await flush(); oneTick(); await flush();
    act(() => second.result.current.playHere());
    await flush(); oneTick(); await flush();
    first.unmount();
    const again = renderHook(() => useGame(longBook, { storage, locks }));
    await flush(); oneTick(); await flush();
    expect(again.result.current.elsewhere).toBe('held');
  });
  it('mount, unmount and remount in one task (StrictMode) is granted, not held', async () => {
    const locks = fakeLocks(); const storage = fakeStorage();
    const first = renderHook(() => useGame(longBook, { storage, locks }));
    first.unmount();
    const again = renderHook(() => useGame(longBook, { storage, locks }));
    await flush(); oneTick(); await flush();
    expect(again.result.current.elsewhere).toBe('none');
    expect(locks.heldNames()).toEqual([`continuum.lock.${key}`]);
  });
});
```

Run: `npx vitest run src/state/useGame.tabs.test.tsx`. Expected: FAIL.

- [ ] **Step 4: The hook**

`src/state/useGame.ts`, the additions in full. Imports: `acquire, defaultLocks, lockName, type Held, type LockManagerLike` from `./tabs`; `saveKey` from `./save` (Task 5).

```ts
export function useGame(book: Book, opts: { storage?: SaveStorage | null; locks?: LockManagerLike | null } = {}): GameHandle {
  const content: Content = book;
  const storage = 'storage' in opts ? opts.storage ?? null : defaultStorage();
  const locks = 'locks' in opts ? opts.locks ?? null : defaultLocks();
  // ... opened, model, latest, speed as today ...

  // One tab plays (#73). The seat: pending until the lock answers, mine while this tab holds it, held while another
  // does, lost once another took it. The loop and the writes read it through a ref, as they read `latest`.
  const [seat, setSeat] = useState<'pending' | 'mine' | 'held' | 'lost'>(locks === null ? 'mine' : 'pending');
  const seatRef = useRef(seat);
  useLayoutEffect(() => { seatRef.current = seat; }, [seat]);
  const heldRef = useRef<Held | null>(null);
  const mountedRef = useRef(false);
  // What this tab last read from or wrote to its key: the loser writes once only if the key still holds it.
  const lastSeenRef = useRef<string | null>(opened.raw);

  const writeNow = useCallback(() => {
    try {
      const text = saveText(latest.current, book);
      storage?.setItem(saveKey(book), text);
      lastSeenRef.current = text;
    } catch { /* storage full or blocked: the next write tries again */ }
  }, [storage, book]);
  const save = useCallback(() => { if (seatRef.current !== 'mine') return; writeNow(); }, [writeNow]);

  // The loser's one write, in the commit that turns the seat lost and after the `latest` effect above, so every
  // tick dispatched before this commit is in `latest` (earlier batches have committed; one pending in the same
  // lane commits with the seat), a throttled hidden tab's whole catch-up batch included, and once the seat is
  // lost the loop dispatches nothing more. Only if nobody else has written since this tab last read or wrote: a
  // tab Chrome froze learns of its loss when it thaws, and its stale state must not overwrite the winner's. A
  // read that throws is "unknown": no write.
  useLayoutEffect(() => {
    if (seat !== 'lost') return;
    let current: string | null = null;
    try { current = storage?.getItem(saveKey(book)) ?? null; } catch { return; }
    if (current === lastSeenRef.current) writeNow();
  }, [seat, storage, book, writeNow]);

  const watch = useCallback((held: Held) => {
    void held.lost.then(() => {
      if (!mountedRef.current || heldRef.current !== held) return;
      setSeat('lost');
    });
  }, []);

  useEffect(() => {
    if (locks === null) return;
    mountedRef.current = true;
    // This effect's own request, apart from mountedRef: StrictMode's first request resolves after its cleanup,
    // while the remount is mounted, and must release what it was granted.
    let cancelled = false;
    void acquire(locks, lockName(saveKey(book)), { steal: false, waitMs: balance.time.tickIntervalMs }).then((held) => {
      if (cancelled) { held?.release(); return; }
      heldRef.current = held;
      setSeat(held === null ? 'held' : 'mine');
      if (held !== null) watch(held);
    });
    return () => { cancelled = true; mountedRef.current = false; heldRef.current?.release(); heldRef.current = null; };
  }, [locks, book, watch]);

  const playHere = useCallback(() => {
    if (locks === null || seatRef.current !== 'held') return;
    void acquire(locks, lockName(saveKey(book)), { steal: true, waitMs: 0 }).then((held) => {
      if (held === null || !mountedRef.current) { held?.release(); return; }
      heldRef.current = held;
      watch(held);
      // One tick for the loser's last write to land, then play from it. A write this build cannot load (an
      // old-build tab's last minutes, #73's second comment) is set aside first, as a mount would set it aside:
      // save.ts's contract is that a save is never silently overwritten.
      setTimeout(() => {
        if (!mountedRef.current || heldRef.current !== held) return;
        let raw: string | null = null;
        try { raw = storage?.getItem(saveKey(book)) ?? null; } catch { raw = null; }
        lastSeenRef.current = raw;
        const loaded = loadSave(raw, book);
        if (loaded.kind === 'loaded') dispatch({ type: 'load', model: loaded.model });
        else if (loaded.kind === 'aside' && raw !== null) {
          try { storage?.setItem(ASIDE_KEY, asideText(storage.getItem(ASIDE_KEY), raw)); } catch { /* nothing more to do */ }
        }
        setSeat('mine');
      }, balance.time.tickIntervalMs);
    });
  }, [locks, book, storage, watch]);
```

`open()` returns `raw` beside `model` and `aside` (`Opened` gains
`readonly raw: string | null`): every one of its four returns carries the
same `raw` it read, the `loaded` branch included (the returning player's path;
a null there would skip the loser's write on the first steal), so
`lastSeenRef` starts as what this tab read.

The loop's interval callback, first lines:

```ts
      const now = performance.now();
      if (seatRef.current !== 'mine') { last = now; return; }   // a held or lost tab never catches up on that time
```

`erase`: `if (seatRef.current !== 'mine') return;` first, and
`lastSeenRef.current = null` after the key is removed (what this tab last
saw is now nothing). `load` (the dev handle's) is unchanged. The autosave and pagehide listeners stay as they are:
`save` itself refuses. Handle: `elsewhere: seat === 'held' ? 'held' : seat === 'lost' ? 'lost' : 'none'`,
`playHere`; `GameHandle` gains both.

`App.tsx`: `import { TabCard } from './TabCard';` (Step 5 creates it; this
step's named command runs only the hook files); `const { ..., elsewhere, playHere } = useGame(book);`
`const inert = card || elsewhere !== 'none' ? true : undefined;`; in the
chapter column, the tab card takes the death card's place:

```tsx
          {elsewhere !== 'none'
            ? <TabCard kind={elsewhere} onPlayHere={playHere} />
            : card && (card.finished
              ? <FinishCard ... />
              : <DeathCard ... />)}
```

Run the two test files. Expected: PASS. If the StrictMode test is held, trace
the fake: the first mount's request is pumped (pending), the unmount's cleanup
sets `cancelled`, the remount's request queues behind; the microtask grants the
first, whose `.then` sees `cancelled` and releases; the fake's grant `.then`
deletes the holder and pumps the second. Trace it with `console.log` in the
fake if it fails; the design is the point, do not change the test.

- [ ] **Step 5: The card**

`src/ui/TabCard.tsx` (the classes are the death card's: `card`, `card__title`,
`card__sub`, `card__begin`; `DeathCard.tsx` has the markup they sit on):

```tsx
/** One tab plays (#73). Held: another tab has the game; Play here takes it. Lost: this tab lost it; a reload asks again. */
export function TabCard({ kind, onPlayHere }: { kind: 'held' | 'lost'; onPlayHere: () => void }) {
  return (
    <section className="card" aria-label={kind === 'held' ? 'open in another tab' : 'continued in another tab'}>
      {kind === 'held' ? (
        <>
          <h2 className="card__title">The game is open in another tab</h2>
          <p className="card__sub">Only one tab plays, so the save is never written from two places.</p>
          <button type="button" className="card__begin" onClick={onPlayHere}>Play here</button>
        </>
      ) : (
        <>
          <h2 className="card__title">This game continued in another tab</h2>
          <p className="card__sub">Nothing here ticks or saves any more. Reload to play here.</p>
        </>
      )}
    </section>
  );
}
```

`src/ui/TabCard.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { realClick } from '../test-utils/realClick';
import { TabCard } from './TabCard';

describe('TabCard', () => {
  it('held: names the other tab and Play here takes over', async () => {
    const onPlayHere = vi.fn();
    render(<TabCard kind="held" onPlayHere={onPlayHere} />);
    expect(screen.getByRole('heading')).toHaveTextContent('open in another tab');
    await act(async () => { await realClick(screen.getByRole('button', { name: 'Play here' })); });
    expect(onPlayHere).toHaveBeenCalledTimes(1);
  });
  it('lost: says to reload and offers nothing', () => {
    render(<TabCard kind="lost" onPlayHere={() => {}} />);
    expect(screen.getByRole('heading')).toHaveTextContent('continued in another tab');
    expect(screen.queryByRole('button')).toBeNull();
  });
});
```

`App.test.tsx`, add one case: jsdom has no `navigator.locks`, so the app
plays unlocked and shows no tab card:

```tsx
it('plays unlocked where there is no lock manager, with no tab card', () => {
  render(<App book={windwardRun} />);
  expect(screen.queryByLabelText('open in another tab')).toBeNull();
  expect(screen.queryByLabelText('continued in another tab')).toBeNull();
});
```

Run: `npx vitest run src/ui/TabCard.test.tsx src/ui/App.test.tsx`. Expected: PASS.

- [ ] **Step 6: Gates, commit**

```sh
npm run typecheck && npm run lint && npm test && npm run test:hooks
git add -A
git commit -m "state: one tab plays, a card with Play here for the second (#73)"
```

---

### Task 7: Docs, the tracker, Chrome

**Files:**
- Modify: `CLAUDE.md`, `README.md`, `.claude/skills/slice-ship/SKILL.md`,
  this plan's status line

- [ ] **Step 1: CLAUDE.md**

- Source layout, `data/`'s line: "the one shipped book is The Windward Run
  (windward-run.ts); the proving ground (proving-ground.ts, `?book=proving`,
  dev builds only) is a book outside `BOOKS` with its numbers as literals, one
  page per mechanic, tested from `src/engine/proving-ground.test.ts`."
- Gotchas, replace the two-tabs sentence in "The game saves itself" with:
  "Saves are per book: `saveKey(book)` in `src/state/save.ts`, the bare key
  for the Windward Run and `continuum.save.<id>` for any other. **One tab
  plays** (#73): a Web Lock per save key, requested queued with a one-tick
  abort (an `ifAvailable` request in the same task as a release is refused,
  and React's development remount is that task). A second tab gets a card
  in the death card's place with Play here, which steals the lock, waits a
  tick and re-reads the save; the tab that lost sees its request reject,
  writes once if nobody wrote since, and stops ticking, saving and erasing.
  `useGame` takes `locks` as a parameter, null for none; jsdom has none, so
  component tests play unlocked; the tab tests use `src/test-utils/locks.ts`,
  which grants one request per microtask. The dev handle can still step a
  held tab; nothing it steps is written."
- Gotchas, add: "**A row's `healthRate` is signed** (#54): hp/s while on top
  and working, negative drains, positive heals clamped at max, in the tick
  after decay. `hurts()` in `fight.ts` reads the sign; `bookHurts` in
  `src/data/derived.ts` reads the rows. Balance keeps magnitudes
  (`hurts: 0.3`); the book writes the sign."
- Gotchas, add: "**Unlock counts resolve row, then book, then balance**
  (`unlockAt(content, action)` in `automation.ts`); `modeOf`, `isUnlocked`
  and `automated` take `content`."
- Workflow: "Every merge to `main` is a release: bump `version` in
  `package.json` in the squash commit (patch by default, minor when a
  milestone closes); CI's `verify` job refuses a push to `main` that changed
  `src/` without a bump. `measure()`'s callers pass it from `package.json`;
  `src/version.test.ts` keeps it a semver."
- Probing a whole book: `measure(book, policies, version)` with `version`
  imported from `package.json` (the probe is outside the layers).
- Under Commands, one line: "There is no formatter, deliberately (#35,
  measured: Prettier and oxfmt each rewrite 89 of 120 files at any width);
  `oxlint` is the only style gate."

- [ ] **Step 2: The version's enforcer in CI, slice-ship, README**

`.github/workflows/ci.yml`, in the `verify` job: the checkout step at line 55
becomes

```yaml
      - uses: actions/checkout@v7
        with:
          # The version check below diffs from the push's previous tip, which a shallow clone does not hold.
          fetch-depth: 0
```

and after `Test the hooks themselves`, before `Build`:

```yaml
      # Every push to main is a release (CLAUDE.md, Workflow). A release that changed the game carries a new
      # version, so a headless-play stamp names one build. The base is the push's previous tip, not HEAD~1: a
      # push may carry more than one commit. Read-only: the tag itself is a later step, #66.
      - name: The version moved with the game
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        shell: bash
        env:
          BEFORE: ${{ github.event.before }}
        run: |
          base="$BEFORE"
          if [ -z "$base" ] || ! git cat-file -e "$base^{commit}" 2>/dev/null; then
            base=$(git rev-parse HEAD~1)
          fi
          if git diff --quiet "$base" HEAD -- src; then
            echo "src/ unchanged since ${base:0:7}; no bump needed"
            exit 0
          fi
          before=$(git show "$base:package.json" | jq -r .version)
          after=$(jq -r .version package.json)
          if [ "$before" = "$after" ]; then
            echo "::error::src/ changed since ${base:0:7} but package.json is still $after; bump it in the squash commit"
            exit 1
          fi
          echo "$before -> $after"
```

(An all-zero `before`, a created branch, fails the `cat-file` and falls back;
`main` never has one.)

`slice-ship` step 5: "Bump `version` in `package.json` (patch; minor when a
milestone closes) before the squash commit. Check it the way CI will, before
the push:

```sh
git diff --quiet main -- src || [ "$(git show main:package.json | jq -r .version)" != "$(jq -r .version package.json)" ] || echo "src changed since main: bump the version"
```

CI's `verify` job refuses a push to `main` that changed `src/` since its
previous tip without a bump."

`README.md`: in the dev-build paragraph, add: "**`?book=proving`** opens the
proving ground, a dev-only book with no story whose rows say what should
happen: one page per mechanic, for play-testing." In "Run it", after the
save sentence: "One tab plays at a time; a second tab offers to take over."

- [ ] **Step 3: Gates, the plan's status, commit**

```sh
npm run typecheck && npm run lint && npm test && npm run test:hooks && npm run build
```

Update this plan's **Status** line. Commit:

```sh
git add -A
git commit -m "docs: the proving ground, one tab, signed health rate, the version"
```

The docs commits at the head of the branch (spec, plan, revisions) squash into
the slice commit at merge time with everything else.

- [ ] **Step 4: Chrome**

Run the `chrome-verify` skill. Beyond its standard pass:

1. `http://localhost:5173/` alone: **no held card on a single tab**, reloaded
   three times (the StrictMode case). Console clean.
2. `http://localhost:5173/?book=proving`: walk the nine pages against each
   row's noun. Every death, and the erase, start life 1 at page 1 (rebirth
   resets the one-times), so on "The fight" do the survivable checks first
   and the killing ones last: with berries' chip off, or the pack full, play
   the wasps and see the refusal and its words at any health; with a chip on
   berries and the pack set to 3 in the overlay, play the wasps and see it
   wait behind berries, then refuse once the pack is full. With berries' chip
   off and the pack emptied (berries to 0), set health to 25 and play the
   boar: it starts and backs off with the instruction, progress kept; set 10:
   it backs off before starting; set 25 with 3 berries in the pack: it wins
   with a sliver left; with berries on JIT, the pack at 3 and health 10, it
   waits behind a berry, again, until the pack is full and it backs off.
   "Last stand": from full health it wins; set 20 and play it: nothing calm,
   nothing to wait for, fought to the death. Then the killing ones: play the
   boar from full health and see it win (30 hp gone); Shift+play on the wasps
   kills; Begin, back to page 1.
3. "Heals": the nap's `+2.00 hp/s` in green on the row and in the rates line;
   health climbs and stops at max. "Casting off": sticks stop at 10.
4. `http://localhost:5173/` in two tabs: the second shows the held card
   within a tick; Play here: the first shows the lost card and its clock
   stops, the second's clock continues from the first's last second; reload
   the first: held. Console clean in both.
5. The Windward Run's save: play `?book=proving`, then open the plain URL:
   the run is where it was, and the log has no "set aside" line.

---

## Execution handoff

Inline: Task 2 (locks the signed field's shape and the UI helpers), Task 5's
Steps 3 and 4 (`main.tsx`, a build), Task 6 (React effects against fakes; the
lock ordering), Task 7. Subagent: Task 3 (a signature change the compiler
enumerates) once Task 2 is on the branch; Task 4 (pure play changes with
tests) once Task 3 is; Task 5 Steps 1 and 2 (the book with its tests, the key)
once Task 4 is. Task 1 is done.
