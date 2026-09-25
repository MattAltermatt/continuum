# CLAUDE.md — Continuum

Project-local notes for Claude Code sessions. Read this first.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript | `strict: true`, no implicit `any` |
| UI | React | function components + hooks only |
| Build | Vite | dev server on `:5173` (may bump if busy) |
| Tests | Vitest | `environment: 'node'` for engine; jsdom for components |
| Verify | Chrome | never a built-in preview panel |

## Commands

```sh
npm install
npm run dev         # dev server — Claude starts this, never asks the user to
npm run build       # typecheck + production build
npm run typecheck   # BOTH programs: the ship build, and src/engine/ with no DOM
npm run lint        # oxlint; silent on a clean tree, so any output is real
npm test            # vitest, one shot
npm run test:watch  # vitest, watch mode
npm run test:hooks  # the guards in .claude/hooks/ have their own suite
npm run preview     # serve the built ./dist, to check a production build
```

There is no formatter, deliberately (#35, measured: Prettier and oxfmt each
rewrite 89 of 120 files at any width); `oxlint` is the only style gate.

`npm run typecheck` runs `tsc` twice on purpose. The second pass compiles
`src/engine/` under `tsconfig.engine.json`, which has no DOM library and no
ambient types — see **The guard layer** below.

## Where planning lives

| Thing | Where | Never |
|---|---|---|
| What's queued / the backlog | **GitHub Issues** | a `BACKLOG.md` |
| Phases | **GitHub Milestones** | a `ROADMAP.md` |
| What shipped | **Closed issues + Releases** | a `CHANGELOG.md` |
| Standing decisions | **Closed + locked issues**, label `decision` | a "decisions" heading in a doc |
| Design reasoning | `docs/specs/`, dated | — |
| Mockups | `docs/mockups/`, dated + committed | an ephemeral scratch dir |

🚨 **In-repo markdown points at GitHub and never duplicates it.** Do not create
`ROADMAP.md`, `BACKLOG.md` or `CHANGELOG.md`. Read "add it to the roadmap" as
"file an issue." A doc may *link* to open work; it may never *list* it.

Cite standing decisions by number (`decision #12`) — the issue number is the
only stable identifier a decision gets.

## Decisions in force

Cited from code and prose by number. The issue is authoritative; this table is
only an index so a number can be looked up without a search.

| # | Decision |
|---|---|
| [1](https://github.com/MattAltermatt/continuum/issues/1) | TypeScript + React + Vite + Vitest |
| [2](https://github.com/MattAltermatt/continuum/issues/2) | Planning lives in GitHub Issues, not in the repo |
| [3](https://github.com/MattAltermatt/continuum/issues/3) | All tuning lives in `balance.ts` and is sacrosanct |
| [4](https://github.com/MattAltermatt/continuum/issues/4) | The engine never imports from the UI |
| [31](https://github.com/MattAltermatt/continuum/issues/31) | Mockups are committed artifacts, never scratch |
| [41](https://github.com/MattAltermatt/continuum/issues/41) | Time passes only while work happens |
| [68](https://github.com/MattAltermatt/continuum/issues/68) | The game is a sky world, and we are the heroes |

A decision is a **closed and locked** issue. Amending one means reopening it,
which leaves a trail; editing a heading in a file does not.

## Source layout

```text
src/
  engine/     pure simulation — no React, no DOM, no imports from ui/
              — play.ts plays a book headless and measures its length
              (spec 2026-09-23-headless-play)
  data/       content definitions (actions, items, skills) — data, not logic
              — a book is a value of the Book type in types.ts;
              src/data/validate.ts is the only check on it, and
              books.test.ts runs it over every shipped book; the one
              shipped book is The Windward Run (windward-run.ts); the
              proving ground (proving-ground.ts, `?book=proving`, dev
              builds only) is a book outside BOOKS with its numbers as
              literals, one page per mechanic, tested from
              src/engine/proving-ground.test.ts
  ui/         React components
  state/      reducer + context wiring engine to UI
  balance.ts  every tuning number, in one place
```

All five exist as of v0.1. The boundaries are the contract; the directories are
just where it gets enforced. Content *types* live in `src/data/types.ts` so
that both content and the engine can import them; the engine imports data,
never the reverse.

**The engine never imports from `ui/`.** The simulation must be runnable and
testable headless; if a test needs to render a component to check a rule, the
rule is in the wrong layer.

## Testing convention

Two layers, both without booting a renderer where possible:

| Layer | What it covers | Speed |
|---|---|---|
| 🧠 **Engine** | tick math, queue, costs, XP, decay, automation. Pure functions. | sub-ms |
| 🖼️ **Component** | rendering + interaction, jsdom. One per component. | ~10ms |

**Definition of Done for any phase:**

- ✅ `npm run typecheck` green — both programs
- ✅ `npm run lint` green
- ✅ `npm test` green, with tests for every rule touched
- ✅ `npm run test:hooks` green
- ✅ `version` in `package.json` bumped if `src/` changed since `main` (CI checks
  it on a push to `main`; `/slice-ship` step 5 checks it before)
- ✅ Verified in Chrome — the change actually visible doing the thing
- ✅ Console clean, including cosmetic 404s

CI runs everything on that list except the Chrome pass, on every push to `main`
and every pull request (the version check on pushes to `main` only). The Chrome pass is a person looking at the game and is
deliberately not automated. `/slice-ship` walks the whole list in order.

📌 **This list is canonical.** `.claude/skills/slice-ship`, `.github/workflows/ci.yml`
and `.claude/agents/engine-reviewer.md` each execute it, and each will drift from
it. When a gate is added or removed, change it here first and then update those
three — and if one of them disagrees with this list, this list is right.

## The guard layer

Two invariants in this file are load-bearing enough to be enforced by machinery
rather than by memory: the engine/UI wall (`decision #4`) and every-number-in-
`balance.ts` (`decision #3`). Each has more than one guard, because each guard is
blind to what the others see.

| Guard | Catches | Blind to |
|---|---|---|
| `tsconfig.engine.json` | an **ambient** reach — `document`, `setTimeout`, `performance.now()` — that no import statement shows | a type-clean import of something outside the engine; `data/` and `balance.ts`, which it only reaches transitively |
| `src/purity.test.ts` | exactly that: a legal import of a file that is not part of the layer, across all three layers below the wall, plus host globals in their *tests* | `Date.now()` and `Math.random()` — see below |
| `.claude/hooks/tuning-literals.sh` | a number typed outside `balance.ts` | a number **changed inside** `balance.ts` |
| `tuning-guard` agent | that change, before merge | — |

`.claude/hooks/` also carries `branch-guard.sh` (source edited on `main`) and
`gates-on-stop.sh`, which runs typecheck and the suite **once per turn** on
`Stop` rather than on every edit — `PostToolUse` cannot tell a break from a
half-finished rename, and a guard that is loudest during ordinary multi-file work
is a guard that gets commented out.

⚠️ **`Date.now()` and `Math.random()` pass every guard.** `lib: ES2022` provides
both, so neither config rejects them and neither is an import. They are also the
two reaches an idle engine actually wants — the decay curve is a function of
elapsed time. Take the clock and the seed as **parameters**; `src/state/` supplies
them. Nothing will stop you doing otherwise.

🚨 **Widening a guard is a change to the wall, not part of a feature.** An entry
added to the allowlist in `src/purity.test.ts`, or a widened `include` in
`tsconfig.engine.json`, must be called out on its own and justified. An exemption
is invisible forever once it lands.

**The guards have their own test suite** — `npm run test:hooks`, 26 checks, every
hook with at least one case that **must fire** and several that must stay quiet.
A guard nobody has watched fail is decoration; one that has silently stopped
firing is worse than none, because it is a wall everyone still believes in. The
must-fire cases run against stub toolchains, because an earlier version of this
suite asserted only silence — and stubbing a hook body to `exit 0` left every
check passing. CI runs it.

## The permissions allowlist

`.claude/settings.json` allowlists reads and the project's own scripts. Two rules
about editing it, both learned by finding the escape rather than by reasoning:

🚨 **A trailing `:*` on a command that takes flags is usually an escape.** Verified
on this repo's own first draft: `npm test --prefix <dir>` runs a *different*
package's test script; `rg --pre <script>` executes that script; `npx vitest
--config <file>` executes that module; `sed -n -i ''` truncates a file; `git
branch -v -D <branch>` deletes an unmerged branch; `git checkout -b tmp -f`
discards the working tree. Each of those matched an entry that looked read-only or
harmless. npm scripts are therefore listed by **exact** name, and `git checkout -b`
is pinned to `feature/`.

**Test the entry, do not reason about it.** Every one of the above was found by
running it in a scratch repo, and two entries that *looked* identically dangerous
— `git branch --list` and `git branch --show-current` — turned out to be safe,
because git refuses to combine a listing mode with a delete. Reasoning would have
removed the wrong ones.

Knowingly accepted: `git diff --output=<path>` overwrites that path with diff
text. Recoverable, never typed by accident, and `git diff` is too central to gate.

## Reviewers

`.claude/agents/` holds three, dispatched fresh with no implementation bias:
`engine-reviewer` (the invariants, opus), `tuning-guard` (numeric changes to
`balance.ts`), `vacuous-test-hunter` (tests that pass without testing anything).
Code review before merge is not optional and is not scaled down for small
changes.

## Balance

**Every tuning number lives in `src/balance.ts`.** No magic numbers in engine or
component files. If you would write `if (hp <= 3)`, write
`if (hp <= balance.someThing)` instead.

🚨 **Balance values are sacrosanct — ask before changing any of them.** This
includes mid-debug. If a fix edits a literal like `1.25` or `expCost: 1000`,
stop and ask; a bug whose fix is a tuning change is almost always a
misdiagnosed mechanism bug. Mechanism fixes (a missing clamp, a null ref, an
unsubscribed event) ship without asking.

## Forbidden

- ❌ `master` — the default branch is `main`.
- ❌ `whitelist` / `blacklist` — use `allowlist` / `blocklist`.
- ❌ `enabled` / `disabled` for app state — use `active` / `inactive`.
  (Those two are fine for HTML form controls and CSS pseudo-classes.)
- ❌ `Co-Authored-By` trailers in commits.
- ❌ Magic numbers outside `balance.ts`.
- ❌ `ROADMAP.md` / `BACKLOG.md` / `CHANGELOG.md`.
- ❌ Emoji in code, code comments, commit messages or PR titles.

## Workflow

- Work on `feature/...` branches, never directly on `main`.
- Commit each logical unit; terse one-line subjects, ~50–72 chars.
- Squash a feature branch before fast-forward merging, so `git log` reads as
  "what shipped."
- Code review before merge, always — including for small changes.
- Manual verification in Chrome before merge, always. "It compiles" is not
  verification and neither is "tests pass."
- Delete both ends of a branch as the last step of its merge.
- Every merge to `main` is a release: bump `version` in `package.json` in the
  squash commit (patch by default, minor when a milestone closes); CI's
  `verify` job fails on a push to `main` that changed `src/` since its previous
  tip without a bump, and the site does not update until a bump lands. `measure()`'s callers pass it from `package.json`;
  `src/version.test.ts` keeps it a semver.
- **`main` is the build the user plays.** CI's `deploy` job publishes a push
  to `main` that passed CI's four machine gates to https://mattaltermatt.github.io/continuum/
  (only while it is still `main`'s tip; `vite.config.ts` builds with a relative
  base for the sub-path). A merge is a release to the player: after one, watch
  CI (`/slice-ship` step 7), open the live URL, hard-reload, check the console
  and that the page's script is the merged build's. A red `deploy` job is a
  release failure, not a gate failure: "Re-run all jobs" on the tip's run. The
  production build has no dev handle and no speed control.

## Gotchas

- **A component test needs `// @vitest-environment jsdom` as its first line.**
  `vite.config.ts` sets `environment: 'node'` globally, because the engine is
  the larger half and pays for jsdom otherwise. Components opt in per file with
  the docblock; `src/ui/App.test.tsx` is the working example. Without it the
  test fails on a missing `document` rather than on anything to do with the
  component. `src/test-setup.ts` guards the `jest-dom` matcher import on
  `typeof document` for the same reason.
- **Vite HMR does not reflect structural module rewrites.** After changing the
  module graph (new exports, restructured loops), HMR will claim success while
  the browser holds old references. Restart the dev server. Diagnostic: read a
  known-new constant in the console; a mismatch means HMR, not your code.
- **Per-frame `replaceChildren()` breaks clicks.** A real mouse click has a
  50–150 ms gap between mousedown and mouseup. If a render loop rebuilds a
  clickable element's children in between, the browser fires no `click` at all.
  Cache child nodes at mount and mutate `textContent`. Synthetic clicks from
  automation tools do *not* reproduce this — reproduce it with real
  `mousedown`/`mouseup` events or coordinate clicks.
- **UI must not move under the cursor.** Controls whose label or number changes
  get a pinned width. Click A → content widens → A is where B was → the next
  click hits the wrong control.
- **Tests do not import React from engine tests.** If an engine test needs a
  component, the boundary has leaked.
- **`src/data/` may not import `src/engine/`.** The purity test names the file
  and the import it resolved. Content types live in `src/data/types.ts` for
  that reason; an engine test may import data, so a test that needs both lives
  under `src/engine/`.
- **Ten additions of `0.1` are `0.9999…`.** A test that counts ticks to a
  completion uses `floor(expCost / baseTickExp) + 1`, not `ceil`.
- **The screen is watched; the sheets are operated** (spec 2026-09-25-the-watched-screen).
  Three tiers by content width, `src/ui/tiers.ts`: I under 640 (one column: top,
  skill, food, doing, log; the skills, actions and pack regions are sheets from
  the bottom bar), P from 640 (skill beside food, doing beside log, 3:2; sheets
  still), O from 1200 (three columns, the sheets docked, no buttons). `useTier`
  reads two `matchMedia` queries on the window's width less the screen's 20px of
  side padding; `styles.css` repeats the numbers in two `@container` queries on
  `.screen`, and `src/ui/tiers.test.ts` keeps the two in step and keeps
  `scrollbar-gutter` out (`body` never scrolls: the doing and log boxes scroll
  inside). **The boxes never move** (spec section 5): `.watch` has fixed rows,
  every text line that can be empty holds a no-break space (the empty skill cell,
  a blank food slot, the health label's `steady`), and the chrome-verify skill's
  rigidity script compares the six boxes' rects across every state. `Sheet.tsx`
  is one region over the body (`${name} sheet`, `hidden` when closed, Escape
  unless another dialog is open, a scrim) or a docked column whose region scrolls.
  `Gauge.tsx` is the one bar grammar (bar left, label over value right, `--g-right`
  pinned per region); a row's middle is a list (`needs:` with `scrap 1/16` paid of
  total, `still required:`, `gives:`), a refused play flashes the row and the
  line it names; `lastVerb` on the state keeps the screen's cell on the last
  skill that ran; the sheen takes 6s.
- **`step()` returns the same object when nothing happened.** React skips
  the render on an idle tick, and `useGame` only logs a state that is new. A
  change that spreads the state on every tick breaks both silently.
- **The dev handle ignores an unknown action.** `window.continuum.dispatch`
  with a type the reducer does not know (`'enqueue'` instead of `'queue'`) now
  leaves the game as it is (#67), so a typo fails quietly: read the union in
  `src/state/useGame.ts` (`queue` with `front`/`once`, `remove` with `entryId`,
  `automate`, `tick` with `n`, `reset`, `load`, and the dev-only `setHealth`,
  `setSkill`, `setItem`, `earnChips` and `die`). The handle also has
  `step(n)`, `speed(n)`, `save()`, `load()` and `erase()`. The sheets are React
  state, not the handle's: open one with a click on its bottom-bar button
  (`.qbtn--actions`), and read the game through `state()` either way. **The backtick
  opens the debug overlay** (`src/ui/Debug.tsx`, dev builds only, a portal on
  `document.body`) with the same actions as buttons and inputs; `setHealth`
  to 0 is not a death (death is the tick's decay), `die` is.
- **Every bar glides one tick and a reset jumps.** `.bar__fill` transitions
  its width over `--tick` (set on `<main>` from `balance.time.tickIntervalMs`);
  a fill that resets to zero is keyed on the counter whose change is the
  reset (a ledger's level, a row's completion count, the life, the chapter),
  so it remounts and does not slide backwards. A new bar needs its key, or
  a level-up slides down for one tick.
- **The game saves itself.** Key `continuum.save` in local storage, every few
  seconds and on hide; a save it cannot load is set aside under
  `continuum.save.aside` (the newest three) and a fresh run starts. Clear it
  from the gear (erase save), with `continuum.erase()`, or
  `localStorage.removeItem('continuum.save')`. Saves are per book:
  `saveKey(book)` in `src/state/save.ts`, the bare key for the Windward Run
  and `continuum.save.<id>` for any other. **One tab plays** (#73): a Web
  Lock per save key, requested queued with a one-tick abort (an
  `ifAvailable` request in the same task as a release is refused, and React's
  development remount is that task). A second tab gets a card in the death
  card's place with Play here, which steals the lock, waits a tick and
  re-reads the save (setting aside what it cannot load); the tab that lost
  sees its request reject, writes once if nobody wrote since, and stops
  ticking, saving and erasing. `useGame` takes `locks` as a parameter, null
  for none; jsdom has none, so component tests play unlocked; the tab tests
  use `src/test-utils/locks.ts`, which grants one request per microtask. The
  dev handle can still step a held tab; nothing it steps is written unless
  Play here finds no save to load, a dev-only corner.
  `src/test-setup.ts` clears local storage after every test, so jsdom tests
  never load each other's runs.
- **A row's `healthRate` is signed** (#54): hp/s while on top and working,
  negative drains, positive heals clamped at max, in the tick after decay.
  `hurts()` in `fight.ts` reads the sign; `bookHurts` in `src/data/derived.ts`
  reads the rows. Balance keeps magnitudes (`hurts: 0.3`); the book writes
  the sign.
- **Unlock counts resolve row, then book, then balance** (`unlockAt(content,
  action)` in `automation.ts`); `modeOf`, `isUnlocked` and `automated` take
  `content`.
- **The page is derived, never stored** (spec 2026-09-24-pages). `pageOf` in
  `src/engine/rows.ts` is the chapter's first page whose closing row is not done,
  so nothing resets it and no save carries it. Two readers of "the event" differ:
  the page rule, `delayFor` and the play policy read `pageOf(...).closes`;
  departure (provisioning, `castOff`, the "casts off" tag) reads `eventOf(chapter)`,
  the last page's closer. A test not about pages starts past them with `built()`
  from `src/engine/fixture.ts`; `pagedBook` there is the two-page fixture.
- **Automation acts in one place: `resolve()` in `src/engine/resolve.ts`,** the
  zero-time pass before a tick spends time. Anything that queues on the game's
  behalf belongs there (its orders leave with the order they supply through
  `withoutOrphans` in `automation.ts`, which `removeEntry`, `setAutomation`,
  the save's `reconcile` and resolve all call), and it must leave the state object untouched when it
  does nothing, or `step` stops returning the same object on an idle tick.
  `useGame` also runs it after every action and tick while live (`settled`),
  so the committed state, the screen and `window.continuum.state()` are the
  state the next tick will work: a producer that just filled is already gone
  from the top. Its supply path branches on who an order is for: a player's
  order, or anything serving one down its `for` chain, pulls the page's maker
  whatever the chips (spec 2026-09-24-pages 4.3); automation's own orders go
  through the chips. Paused, nothing settles. **`src/engine/property.test.ts`**
  (seeded random play at every port, invariants checked after every action
  and tick) is the guard for this area: five code panel rounds each found a
  queue defect the previous round's fix had made, and it fails on every one of
  them. A change to resolve that turns it red has found a real case.
- **A fight stops before it kills: `src/engine/fight.ts`** (#74, spec
  2026-09-24-queue-plays-safely). `wouldKill` plays the fight's window out tick
  by tick with the tick's own functions (decay, hurt, eat), so it agrees with
  `step` by construction; keep it that way rather than writing a formula.
  Resolve applies the three cases before provisioning; the play button asks
  `playBlock`. An automated fight (chip on) never stops, only waits behind a
  harvest, then fights on to the death: the user's rule. Only JIT food skips
  `killers`. A Shift order is `forced`, and so are the supplies it pulls. After
  a back-off, automation may still run a harvest the player dies doing: that is
  an age death and by design (spec §3.2).
- **A queue entry is an order, not a row.** Entries carry their own `id`; a
  component that lists the queue keys by it. A row's progress lives on the row
  (`state.work`), so two entries for one row share it and removing one loses
  nothing.
- **The loop catches up by real time.** `useGame` dispatches `{ type: 'tick', n }`
  with the ticks real time says are due, capped at `balance.loop.maxCatchUpMinutes`
  of game time per wake; one `act()` in a test batches every dispatch inside
  it, so a test that needs a commit between intervals uses two.
- **Probing a whole book** (the tuning and the whole-book gate in the Windward
  Run plan): a temporary `src/zz-probe.test.ts`, outside the purity scan's
  layers, first line `// @ts-nocheck` (both typecheck programs otherwise
  reject its `node:fs`), writing its readings to a file (console output is
  swallowed). Delete it before committing. Read events only from a step that
  returned a new object: an idle step returns its input with the previous
  tick's events. `measure(book, policies, version)` takes the version
  imported from `package.json` (the probe is outside the layers).
- **The Salt Road lives on as a test fixture** (`src/test-utils/salt-road.ts`),
  so component tests written against it did not have to move when the book
  changed; `testBook` in `src/test-utils/book.ts` is the two-port fixture for
  the rebuilt screen.
- **The headless play is a synchronous loop.** A broken bound in
  `src/engine/play.ts` hangs vitest rather than failing it (a per-test timeout
  cannot interrupt synchronous code); CI's `timeout-minutes: 15` is the backstop.
  When mutation-testing it, run `timeout 90 npm test`. The play and measure
  suites allow 30 s each, since a slower runner took 5.02 s on one case.
- **`realClick` needs real timers.** It awaits a real `setTimeout`; a suite
  under `vi.useFakeTimers()` hangs on it. Wrap the await in `act`. It passes no
  `view` to `MouseEvent`: under vitest the global `window` is not jsdom's.
- **Spec glyphs are escapes.** `⚠` and `▶` carry the Unicode Emoji property;
  they live in `src/ui/glyphs.ts` as `\u` escapes and are imported, never typed.
