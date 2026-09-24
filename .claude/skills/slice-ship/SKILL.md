---
name: slice-ship
description: Walk a finished slice of Continuum through every Definition-of-Done gate in order and stop at the user-verify gate. Use when implementation on a feature branch is complete and the work is thought ready to merge. User-invoked as /slice-ship.
disable-model-invocation: true
---

# slice-ship — the Definition of Done, walked in order

`CLAUDE.md` names the gates. This runs them in the cheapest-first order, fails
fast, and **stops at the user-verify gate** — merging is never automatic.

Keep a TodoWrite item per gate so progress is visible.

## 1. The machine gates

Run each; stop at the first red and fix before continuing.

```bash
npm run typecheck    # ship build AND src/engine/ with no DOM lib
npm run lint
npm test
npm run test:hooks   # the guards' own suite
npm run build
```

A red `typecheck` under `tsconfig.engine.json` is **not** an ordinary type error
— it means engine code reached for an ambient host capability. Read
`tsconfig.engine.json`'s header before "fixing" it, and never widen the config to
make it pass.

## 2. The review panel — always, never optional

`CLAUDE.md`: "Code review before merge, always — including for small changes."
Dispatch **in parallel**, fresh, with no implementation bias:

- `engine-reviewer` — the invariants this codebase rests on
- `tuning-guard` — only if the diff touches `src/balance.ts`; it says so in one
  line when nothing numeric changed
- `vacuous-test-hunter` — tests that pass without testing anything

Do not ask permission to dispatch them and do not offer the review as a choice.
Synthesise the findings yourself and report **which survived and what changed** —
not the menu. A slice that survives the panel unchanged is a fine outcome; say so
plainly.

## 3. Chrome verification

Run the `chrome-verify` skill. Green tests are necessary and not sufficient, and
for anything the player touches the interaction checks in that skill are the real
gate.

## 4. Docs and the tracker

Docs are ship dependencies, and planning lives in GitHub — not in a file.

- Does `README.md` still describe what the game does?
- Does `CLAUDE.md` still describe how to work on it? A new convention, gotcha or
  layer boundary introduced by this slice belongs there now, not later.
- Does `MECHANICS.md` still match the engine? If the slice changed intent rather
  than implementing it, that document is the thing that settles arguments and it
  must be updated in the same change.
- Did a design argument get made? It belongs in `docs/specs/`, dated. A mockup
  belongs in `docs/mockups/`, dated and committed — `decision #31`.
- Which issues did this close? Close them with the **commit that did it** named,
  the test that covers it, or the verify that saw it. Anything less is a comment
  on an issue left open.
- What did the slice discover? File it. "Add it to the backlog" means file an
  issue and move on.

⚠️ GitHub **writes** are gated like a push. Propose the batch — closes, comments,
new issues, milestone moves — and ask once for the whole thing.

## 5. Squash, then stop

```bash
git reset --soft main && git commit    # one commit that reads as "what shipped"
```

Terse one-line subject, ~50–72 chars, no trailers, no emoji.

**Then stop and hand off for user verification.** Surface the clickable URL, what
to look at, and what would count as wrong. Wait for an explicit approval.

## 6. After approval — merge and clean both ends

```bash
git checkout main && git merge --ff-only <branch> && git push
git branch -d <branch> && git push origin --delete <branch>
```

Branch cleanup is the final step of the merge, not a session-end chore.

## 7. Validate the release live

A push to `main` is a release to the player: CI's `deploy` job publishes it to
GitHub Pages once CI's four machine gates pass. Green CI is not a working deploy.

Find the run for the pushed commit (it can take a few seconds to appear, so
ask again while this prints nothing), then watch it to the end:

```bash
gh run list --workflow ci.yml --event push --commit "$(git rev-parse HEAD)" --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch <id> --exit-status
```

Then open https://mattaltermatt.github.io/continuum/ in Chrome, hard-reload,
and check: the page's script is the merged build's (its `assets/index-*.js`
name matches the one in the run's Build log, `gh run view <id> --log | grep -o
'dist/assets/index-[^ ]*\.js'`; a local macOS build need not match Linux), the
change is visible, and the console is clean. If the deploy job warned "no
longer main's tip", or shows cancelled, a newer push replaced it: watch that
run instead. If it failed, use "Re-run all jobs" on the tip's run (or run CI by
hand on main once the day-old artifact has expired); never re-run an older
main run.
