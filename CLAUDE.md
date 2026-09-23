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

A decision is a **closed and locked** issue. Amending one means reopening it,
which leaves a trail; editing a heading in a file does not.

## Source layout

```text
src/
  engine/     pure simulation — no React, no DOM, no imports from ui/
  data/       content definitions (actions, items, skills) — data, not logic
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
- ✅ Verified in Chrome — the change actually visible doing the thing
- ✅ Console clean, including cosmetic 404s

CI runs everything on that list except the Chrome pass, on every push to `main`
and every pull request. The Chrome pass is a person looking at the game and is
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
- **The layout has a 1280px minimum and does not reflow.** Desktop target, a
  two-dimensional game grid; accepted (audit 2026-09-22).
- **`step()` returns the same object when nothing happened.** React skips
  the render on an idle tick, and `useGame` only logs a state that is new. A
  change that spreads the state on every tick breaks both silently.
- **`realClick` needs real timers.** It awaits a real `setTimeout`; a suite
  under `vi.useFakeTimers()` hangs on it. Wrap the await in `act`. It passes no
  `view` to `MouseEvent`: under vitest the global `window` is not jsdom's.
- **Spec glyphs are escapes.** `⚠` and `▶` carry the Unicode Emoji property;
  they live in `src/ui/glyphs.ts` as `\u` escapes and are imported, never typed.
