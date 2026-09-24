# The queue plays safely — plan (2026-09-24)

Spec: `docs/specs/2026-09-24-queue-plays-safely.md`. Branch
`feature/queue-plays-safely`. Every task ends with `npm run typecheck`, `npm run
lint`, `npm test` green and a commit.

## Tasks

**1. Freeze cause (#69), inline.** `freezeCause(state, book)` in `src/engine/play.ts`:
probe each row of the current chapter with `enqueue(..., { front: true })` and
`enqueue(..., { front: true, once: true })`, `step` each, first that advances →
`{ cause: 'policy', row }`, else `{ cause: 'book' }`. `play()` attaches it to a
frozen run; `measure()` copies it onto the flag. `PLAY_VERSION` 3 (measure.test's
lock). Tests: both `frozenBook` fixtures read `book`; a do-nothing policy reads
`policy` naming the first row; existing `toContainEqual` flag assertions restated
with `cause`.

**1b. #77 (subagent, running).** `jitIdle` plus take-turns and leaving on mode
change, per spec §2. Tests restated and added. The end-to-end measure stays red
(spec §5).

**2. The fight rule (#74 engine), inline, after 1b is committed** (both touch
`resolve.ts`).
- `wouldKill(state, content, action)` in `src/engine/health.ts` per spec §3.1.
  It reads the rate through the same helpers `work()` uses (`tickExp`,
  `gearMultiplier`); a test pins the window against a measured completion so
  the two cannot drift apart silently.
- In resolve: the three cases of spec §3.2 for a non-forced hurting top, before
  provisioning. Delay is `why: 'delay'`, mode `once`, at the front. Stop is
  `popped` with reason `'hurt'`.
- `QueueEntry.forced?: true`. `enqueue` sets it for `once` on a hurting
  one-time. The save's `isEntry` accepts it.
- Tests: each of the three cases; not the tick before the window covers health;
  a fight that would win first carries on; a forced fight dies; progress kept
  across a stop; an old save loads; `forced: 'yes'` reads corrupt; restate
  `tick.test.ts` "a hurt that takes health to zero dies…" as a forced entry.
- Property test: the invariant in spec §3.5.

**3. Screen and log (#74 UI), inline.** The log line of spec §3.4, once per row
per life, in `withLog`. The row's Shift hint says "fight to the end" on a hurting
row. Component tests.

**4. Measuring players, inline.** `byHand` per spec §4, with a test on the
reviewer's frozen prioritized state. Re-measure. Write the readings into this
plan and take them and a proposal to the user. No `balance.ts` edit.

**6. Code review panel.** `engine-reviewer`, `vacuous-test-hunter`,
`tuning-guard`, plus a naysayer who plays the build in a headless jsdom soak.
Loop to a clean round.

**7. Verify + docs.** Chrome verify at port I: let the pirates run into low health
(dev handle `setHealth`) and watch them back off; Shift+play forces. CLAUDE.md
gotchas, the spec's §3 cited from resolve; issues #69 #74 #77 commented with the
commits. Hand off to the user; wait for the FF-merge yes.

## Execution split

1, 2, 3, 4, 7 inline. 1b (#77) went to an Opus subagent first because the spec
revision for #74 was still with the user.

## Risks

- **The spiral.** Before automation, backing off and fishing can repeat. The
  user's point 3: Shift forces the fight to the end.
- **Length.** The end-to-end measure stays red until the user rules (spec §5).

## Readings

**After #77 (94b4bd1 + the bot fix), 2026-09-24.** The first reading was
30.3–42.0 h, off-length. The cause was the measuring bot, not the book: it
queued only on an empty queue, and #77 keeps the queue busy with JIT's orders, so
it waited those out. A person can queue past automation's orders, so now the bot
does too (`byHand` returns early only for an order of its own). No `balance.ts`
change.

```text
policy        outcome   lives   hours
attentive     finished     97   33.13
hands-on      finished     91   30.33
prioritized   finished    110   37.38   (reported, never tuned to)
range 1,092,056 - 1,345,510 ticks; no flags
```
