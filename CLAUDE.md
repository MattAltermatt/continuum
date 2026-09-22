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
npm run typecheck   # tsc --noEmit
npm test            # vitest, one shot
npm run test:watch  # vitest, watch mode
```

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

## Source layout

```text
src/
  engine/     pure simulation — no React, no DOM, no imports from ui/
  data/       content definitions (actions, items, skills) — data, not logic
  ui/         React components
  state/      reducer + context wiring engine to UI
  balance.ts  every tuning number, in one place
```

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

- ✅ `npm run typecheck` green
- ✅ `npm test` green, with tests for every rule touched
- ✅ Verified in Chrome — the change actually visible doing the thing
- ✅ Console clean, including cosmetic 404s

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
