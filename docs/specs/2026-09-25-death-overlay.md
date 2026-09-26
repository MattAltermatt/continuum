# The death overlay: what the life kept, and every life so far

*2026-09-25. Issue #90. Brainstormed with the user the same day; the look is
the mockup `docs/mockups/2026-09-25-death-overlay.html` (and its `.png`),
approved as drawn. Every player-facing choice below is the user's, picked on
that mockup or stated outright.*

**Status:** shipped 2026-09-25 as 0.3.1, the squash e1357c7, live on GitHub
Pages; plan `docs/plans/2026-09-25-death-overlay.md`. Amended during the build
by the user: round axes, the kill screen reads `dead`, Health dims when it did
not rise, the pill stays at the bottom (#96). Amends spec 2026-09-23-v0-2-a-run-you-can-lose section 2.4
("the screen behind it already shows the next life"): after this, the screen
behind shows the life that ended.

## 1. Why

The user, on #90:

> modify the whole death screen, it becomes an overlay that shows the different
> stats, like the skills that were increased and the levels gained with a delta,
> and graphs. importantly though, there should be a way to see the 'kill screen'
> so you can see how you actually died. on the death screen, then player kicks
> 'start' and thats when the game refreshes and the world starts anew.

And in the brainstorm, on what the graphs are for:

> It would be nice to have a graph that showed the skills and their levels each
> life. things of that nature, so the progression the player has made, even if
> it may feel like a slog.

and on the layout:

> a list of skills in a column on the left, they list the skills in order and
> show the advancement in core. the run doesn't matter, if you care you go view
> the dead screen. on the right side is where the graph is. if you click on a
> skill, that is what shows the graph. health should be in this list too

## 2. What the player sees

### 2.1 The overlay

It replaces `DeathCard` and `FinishCard`, in their seat: the veil over the body,
between the top strip and the bottom bar (spec 2026-09-25-the-watched-screen
4.8), on every tier. The top strip above it shows the dead life.

- **Head.** A death: `Life 8 ends`, then one line: `06:05 alive`,
  `reached II · The Hollow Isle`, and, for a death during a row that hurts,
  `fell during Fight pirates` in the hurt colour. A finish: the book's name with
  `, finished` (`The Windward Run, finished`), the finish row's beat under it
  where the book has one (as `FinishCard` shows it today), then `06:05 alive` and
  `finish 2`.
- **The list, left.** First row **Health**: max health from and to, to one
  decimal, and the gain in the good colour (`129.6 → 142.9 +13.3`); dimmed like a
  skill when it did not rise (the user, 2026-09-25). A rule under
  it. Then **every skill in the book's roster order**, icon and name, core level
  from and to, and `+n` where it moved. A skill whose core did not move is
  listed, dimmed, with no `+`. No run levels (the user: "the run doesn't
  matter"). Each row is selectable; exactly one is selected. **Health is
  selected when the overlay opens.**
- **The chart, right.** The selected row, by life: a line through one point per
  life, lives numbered along the bottom from the first recorded to this one,
  the last point (this life) larger and in the run colour. Health charts max
  health, in the hurt colour; a skill charts core level, from 0. Both axes are
  **round** (the user, 2026-09-25): a whole step of 1, 2 or 5 times a power of
  ten, health around its values (`0, 200, 400 … 800`), a level from 0 up to a
  line at or above its highest (`0, 20 … 100`); life numbers on a round step
  too, always with the first life and this one (`1, 10, 15 … 85, 92`).
  A head over the chart: `Health · max health by life` or
  `Fight · core level by life`, and `now 142.9` / `now 3` at its right.
- **Foot.** `see how it ended` at the left; the begin button at the right:
  `Begin life 9` after a death, `Read again` after a finish. The begin button
  takes focus when the overlay opens, as the card's does today.
- **Phone tier (I).** The same, stacked: head, then the chart, then the list
  under it, scrolling inside the overlay; the foot stays at the bottom. Tiers P
  and O use the two columns.

### 2.2 The kill screen

While the life is dead, **the screen behind the overlay is the life that
ended**, frozen: health at 0 over its max, the queue as it stood with the row
it died in on top, the food, the skill cell, the log's last lines, the clock at
the moment of death, the chapter it reached. Today that screen shows the next
life, already reborn; that stops.

The strip's label reads `dead` (after a finish, `finished`),
and an empty doing box says `nothing was queued` (the user, 2026-09-25).

`see how it ended` hides the overlay and clears its veil to a light tint, so
the frozen world reads as a still picture. The world stays frozen and
inert (nothing in it can be pressed, the sheets do not open); a **pill** pinned
at the bottom centre holds two buttons: `▲ back to life 8` (or `▲ back` after a
finish), which brings the overlay back with the same row selected, and the same
begin button as the overlay's foot.

### 2.3 Begin

Begin (or Read again), from the overlay or the pill, is the reset: rebirth runs
then, the screen becomes the new life, the overlay goes. This is already what
the game state does (the state stays dead until `begin`); only the screen
changes.

## 3. The record of lives

Nothing records anything across lives today. The chart needs one small record
per life.

```ts
/** One ended life, as it ended: what the death overlay charts (#90). */
export interface LifeRecord {
  readonly life: number;
  /** Max health after this life's gain. */
  readonly maxHealth: number;
  /** Core level of every roster skill as the life ended. */
  readonly core: Readonly<Record<SkillId, number>>;
}
```

- `GameState.lives: readonly LifeRecord[]`, oldest first, kept across rebirths
  as `completionCounts` is.
- **`rebirth` appends** the dead life's record, so the ended life joins the
  history exactly once, at Begin. `lifeRecord(dead)` in `src/engine/rebirth.ts`
  builds it; `maxHealth` there is the same number `deathSummary` shows as
  `maxHealthTo`.
- **The chart's points are `[...state.lives, lifeRecord(state)]`** while dead:
  the history, then the life on the screen. A derived value, never stored twice.
- A skill missing from an older record (a roster that grew) charts as 0 for
  that life.
- `blankRun` starts `lives: []`. Saves: `reconcile` reads a missing or
  malformed `lives` as `[]`, so a save from before this has no history and its
  first overlay charts one point; records keep only roster skills. The save
  format number does not change (every earlier field addition read the same
  way).
- Size: one record per life, a number per skill. A thousand lives of a
  seven-skill book is about 130 KB of save. No cap now; if one is ever needed it
  is a later issue.
- The headless play (`src/engine/play.ts`) rebirths through the same function,
  so its states carry the history too; nothing reads it there.

## 4. Where it lives

- `src/engine/rebirth.ts`: `LifeRecord`, `lifeRecord`, the append in
  `rebirth`. `DeathSummary` gains nothing the overlay cannot read from the
  dead state and the records; the overlay takes the summary and the points.
- `src/state/useGame.ts`: `view` is the committed state, dead or not (the
  `rebirth(model.state)` view goes); `card` stays the summary; a new `history`
  (the chart's points) comes out beside it, derived while dead, empty
  otherwise.
- `src/state/save.ts`: `reconcile` defaults and filters `lives`.
- `src/ui/DeathOverlay.tsx`: the overlay, its list, the look toggle and the
  pill; one component for death and finish, the head and the button's words
  chosen by `summary.finished`. `src/ui/LifeChart.tsx`: the chart, plain SVG,
  no library. `DeathCard.tsx` and `FinishCard.tsx` go, and their tests with
  them, replaced by the overlay's.
- `src/ui/App.tsx`: the veil holds the overlay in the cards' place; the tab
  card still takes that place first (#73). While the overlay is hidden the
  screen stays inert and the pill sits outside the inert wrappers.
- Chart geometry (padding, point radius, the health axis's round-to step) is
  display, not tuning, and lives beside the chart as the card's
  `CARD_DECIMALS` did.

## 5. Tests

- **Engine.** `rebirth` appends exactly one record, the dead life's, with the
  core levels and max health the dead state had and the new life starts with;
  a state that is not dead is unchanged; two deaths make two records in order.
  `lifeRecord`'s max health equals `deathSummary`'s `maxHealthTo`.
- **Save.** A save with no `lives` loads with `[]`; a record naming a skill the
  roster lacks loses that skill; a round trip keeps the records.
- **State.** While dead, `view` is the dead state (health 0, the queue it died
  with), and after `begin` it is the new life with one more record.
- **Component (jsdom).** Health first then the roster in order; an unmoved
  skill dimmed without `+`; Health selected on open; a click selects a row and
  retitles the chart; `see how it ended` hides the overlay and shows the pill,
  back restores it with the selection kept; both begin buttons dispatch
  `begin`; the finish words; a single recorded life draws one point.
- **Chrome.** Die from the debug overlay on the Windward Run at 390, 696 and
  1280: the kill screen is the dead life, every row charts, the toggle and the
  pill work by real clicks, Begin starts the next life and the next death's
  chart has one more point. Console clean.
