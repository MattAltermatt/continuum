# The screen pass, smooth bars, and the debug overlay — plan (2026-09-24)

Spec: `docs/specs/2026-09-24-screen-pass.md` (#46, #76, #83, #63; leftovers on
#43 and #78). Branch `feature/screen-pass`.

**Status (2026-09-24): built, tasks 1 to 7 committed on `feature/screen-pass` (721 tests, production grep clean, Chrome pass done); code panel next, then the ship.**

## Revision 5 (2026-09-24, panel round 5)

- The overlay's bad-value test is scoped per input: `''`, `-3`, `1.5`
  rejected on a level or count; `97.3` accepted on health (Reviewer A).
- The bars carry `z-index: 4` in 2b's text, not only in the mockup
  (Reviewer A). `.top` keeps its `inert`. The footer is queried by label,
  not `contentinfo` (Reviewer B, naysayer). `Settings` drops its
  `DEV_SPEEDS` import and orphaned rules in 2b (Reviewer B: typecheck).
  Every region heading assertion is a starts-with match. Overlay inputs
  are queried by role. The Escape test's outside element is a sibling
  button in the test. The `.region--chapter` padding rule carries the
  ordering note, not the row rule. `grep -l` in task 7.
- The card z-order comment says "stacking context", not "z-index"; `×`
  applies while Escape discards, in spec 5.2; `.row__short--quiet small`;
  the `▸` marker; two line-number slips (naysayer).


## Revision 4 (2026-09-24, panel round 4)

Every accepted-risk entry accepted by the naysayer, the rewritten one
verified in the code. Folded in:

- **The footer's inert wrapper is `display: contents`** (`.inert-wrap`,
  naysayer): a bare wrapper would be the footer's containing block, its
  own height, and `position: sticky` would have nowhere to stick.
- **The Enter test focuses the input first** (Reviewer B, naysayer):
  jsdom's `blur()` fires nothing on an unfocused element, so the test as
  first worded would have counted zero dispatches and taught a subagent to
  dispatch on Enter again.
- **The flush chapter rows are shown to the user in 2a's Chrome pass
  before the commit** (naysayer): a running row and a refused one, since
  the running row's ember becomes two horizontal lines and the refusal's
  ring paints past the frame; a `refuse-flush` keyframe with an inset
  shadow is the two-line fix if the ring looks wrong. The `.row` comment
  says the floor is chosen, not enforced by the row.
- **Smaller**: the widest queue entry in 2b's Chrome list (the region's
  padding takes 22px from the entries, which clip rather than wrap); a
  `dead` note in the overlay's title while the card is up; a CSS comment
  on the two conditions the card's z-order rests on; Escape-discards
  written into spec 5.2; the running row's ember frame and Food's key
  identity test named (Reviewer A, B); task 7's CLAUDE.md edit names the
  band's stretch and the flush rows (Reviewer B).


**The tasks below are the authority.** The history section records how the
plan got here; where it and a task disagree, the task is right.

## Revision 3 (2026-09-24, panel round 3)

- **The chapter's rows sit flush in their frame, and the tiers keep
  today's numbers** (naysayer: boxing the chapter moved the three-column
  tier from a 1280 window to 1300, a change the user had not been shown;
  the user's pick: "do whatever makes sense once we also put mobile into
  the mix"). The chapter region has no side padding around its rows; the
  rows drop their side borders and radius; the frame's border stands in;
  the floor stays 712 and the queries stay 1257 / 999, floor 732. Spec 2.4
  and 2.6 say so; CLAUDE.md and #62 keep their numbers.
- **The band's heading spans its grid** (`.region__head { grid-column: 1 / -1 }`,
  Reviewer B): with `.skills` on the section the heading was about to be
  the band's first cell.
- **The overlay applies on blur only, Enter blurs** (naysayer): Enter then
  a click applied twice and put a ticked-down health back.
- **The backquote is ignored only in an input or textarea**, not a button
  (naysayer). The health input takes fractions in the spec as in the plan.
  `Debug` takes the committed `state`; `stopped` covers the card being up.
- **Food's cooldown fill is keyed on the life** (naysayer): death empties
  the cooldowns behind the card while the food row stays. Erase save at
  life 1 is now an honestly written accepted risk, not "dev-only".
- **Smaller**: the `style` prop's `CSSProperties` cast; the chapter heading
  assertion reads the book's span; the quiet shortfall keeps its glyph and
  words; two test titles reworded; a one-line App test for the dev handle's
  speed wiring; the clamp stub restored by descriptor; the overlay's
  default position computed from the footer's height; the sticky bars'
  negative margins named as a known adjust; the boundary widths in the
  Chrome list; task 7 reads the tier numbers from the final CSS and lists
  the ship-time tracker writes for the handoff.

## Revision 2 (2026-09-24, panel round 2)

Round 2 accepted every entry on the accepted-risk list and found the
following, all folded into the tasks and the spec:

- **`die` starts from an empty event list** (all three panellists): the
  committed state carries the last tick's events, and `applyDecay` appends
  to them, so the first draft re-logged a completion under the death line.
  Task 1's test now completes a one-time row, pauses, dies, and reads one
  new line.
- **The tiers move by the border too**: 734 / 1279 / 1021 / 754 (naysayer);
  the spec's arithmetic now names the sum and the query separately, as the
  CSS comment does (Reviewer A).
- **`.screen` rows**: `grid-template-rows: auto auto 1fr auto`, so
  `min-height: 100%` gives the slack to the columns row instead of
  stretching every box (naysayer, Reviewer B).
- **The clamp test stubs the panel's size** on `HTMLElement.prototype` and
  asserts the exact clamped position (naysayer, Reviewer B).
- **The offered-speed rule gets a hook test in task 1**, where the rule
  lives; task 5's overlay test only checks the pressed button follows the
  prop (naysayer, Reviewer B).
- **The run line's key includes the life** (naysayer, Reviewer B): a run
  ledger at level 0 with XP is reset by death without a level change.
- **The time buttons dim on `stopped`** (idle, waiting or paused), the
  value App already computes, not on `!live` (naysayer, Reviewer B).
- **The health input syncs from the state only while unfocused**, and
  accepts any finite value at or above zero, since `setHealth` takes
  fractions (Reviewer B).
- **Task 3 names every Food and Pack test it restates** (Reviewer B).
- **The order is 1, 2a, 2b, 3, 4, 5, 6, 7 in one tree**, task 5 placed
  (Reviewer B). `--fade` belongs to task 6 alone; 2b sets only `--tick` and
  drops `speed` from App's destructure until 5 restores it; the footer is
  wrapped `inert` behind the card; `HealthBar.test`'s four renders pass
  `life`; `Region` gets a `title` prop so the queue's heading reads
  `queue · n`; overlay tests query through `screen`, since a portal is
  outside `container`.
- **Two new accepted risks** written below: Begin's autofocus after `die
  now` and the needs line keeping its red on a chain-supplied need.

## Revision 1 (2026-09-24, panel round 1)

The panel (two reviewers, one naysayer) read the spec against the code and
the plan against both. What changed, all folded into the tasks below and
into the spec:

- **`die` is its own action.** `setHealth` to 0 does not die on an idle or
  paused game: death happens in `applyDecay`, which `step` runs only when the
  top can work (`src/engine/tick.ts:19-22`). `die` applies `applyDecay` to
  the state at health 0 (naysayer 3). The overlay's time buttons dim on an
  idle or paused game with the words `time passes only while work happens`.
- **The fold tiers move by the region padding**: 1277 / 1019 / floor 752,
  re-derived in task 2b (naysayer 1). The first draft's "keep their numbers"
  clipped the action row's middle column between 1258 and 1278.
- **Four band cells under the 1600 cap, not five** (naysayer 2): arithmetic,
  corrected in spec 2.5. The cap itself is adjusted live at 1920 in task 2b.
- **The chain rule in task 6 is `makersOf`**, the engine's own, not a copy
  (naysayer 4).
- **The snap rule is a key, not a threshold** (naysayer 8; Reviewer B's
  StrictMode finding): each fill is keyed on the counter whose change is the
  reset. `Fill`, `SNAP_DROP` and the ref are gone from task 4.
- **The card stacks with the panel in one grid cell**, no measured
  `--card-min`, no `has-card` (naysayer 6; Reviewer B's "nothing sets the
  class").
- **The settings panel re-anchors** up and right from the bottom-left gear
  (naysayer 5). `.screen` gets `min-height: 100%` so the sticky bottom bar
  reaches the window bottom on a short page (naysayer 11). The card outranks
  the bars in z-order.
- **The overlay renders through a portal** to `document.body` (naysayer 11,
  Reviewer B): `.screen` is a container-query root. The key is
  `e.code === 'Backquote'`; Escape acts only with focus inside the overlay or
  on the body (naysayer 9).
- **Task 2 splits into 2a (regions) and 2b (the shell)** (Reviewer B).
  `Region` carries each caller's bare class forward through `className`
  (`.rates`, `.queue`, `.food`, `.pack`, `.log`, `.chapter`, `.skills` are
  selected by the CSS and the fold queries, and `Rates.test` queries
  `.rates`) and passes `aria-live` for the log (Reviewer A). `HealthBar` is
  in 2a's list and keeps its box (Reviewer B, naysayer). The queue heading
  keeps the text `queue · n`; the note is `waiting` alone.
- **The speed control moves in 2b**: `Settings` loses `speed`, `onSpeed`,
  `dev` there, its test and `App.test.tsx`'s "sets only an offered speed"
  case go there with a note, and task 5 re-pins the offered-speed rule
  through the overlay (Reviewers A and B). `App.test.tsx`'s food `0/cap`
  line is restated in task 3, and `.head__line` at App.test 160 in 2a.
- **No parallel subagents in one tree**: 3, 4, 6 run one after another
  (naysayer 7, Reviewer B). Each keeps its own CSS rules.
- **Task 5's input reset is a controlled input** with local text, reset on a
  failed parse (Reviewer B). The clamp test asserts `left < innerWidth` with
  the panel measured in a layout effect after mount. `INSTRUCTION_MS` and
  `FADE_MS` are exported; `--fade` is set on `<main>` beside `--tick`.
- **Production check**: task 7 greps the built JS for
  `earn every chip on this page`, and `Debug.tsx` has no side-effect import
  (naysayer 10).

Every task ends with `npm run typecheck`, `npm run lint`, `npm test` and `npm
run test:hooks` green, and a commit. The engine (`src/engine/`) is not
touched by any task: this slice moves and dresses (spec section 7). Nothing
is added to `src/balance.ts`; a number in `src/ui/` is presentation and sits
in a named constant with a comment saying so, as `INSTRUCTION_MS` does.

## Global constraints (spec, verbatim where it matters)

- Dev-only surfaces are behind `import.meta.env.DEV` and absent from the
  production bundle. `Debug.tsx` has no side-effect import.
- `balance.ts` untouched (decision #3). The engine untouched (spec 7).
- The purity test's layers (`src/purity.test.ts`) gain no entry.
- Words: `active` / `inactive`, never `enabled` / `disabled` for app state; no
  emoji in code or commits.
- A component test starts with `// @vitest-environment jsdom`.
- Controls whose text changes keep a pinned width (CLAUDE.md "UI must not move
  under the cursor").
- The fold tiers keep today's numbers: queries at 1257 and 999 on
  `.screen`, chapter floor 712, page floor 732, 747 with a classic
  scrollbar (spec 2.6). The chapter's rows are flush in their frame so
  that this stays true (spec 2.4).

## Review focus

Inputs the spec implies and no task's first draft would test; each has its
test pinned in the owning task below.

1. **The backtick pressed in the overlay's own health input** must leave the
   overlay open with the input focused (task 5).
2. **A saved overlay position past the window's edge** (saved on a wider
   screen) must be clamped on open so the panel is reachable (task 5).
3. **`setItem` on a food** leaves its cooldown alone and makes `feeding` true;
   `setItem` on an id the book does not know is ignored, not written (task 1).
4. **`earnChips` on a page whose rows are already earned** changes nothing,
   and on a dead run changes nothing; **`die` on an idle game and on a paused
   game** both produce the dead state with the `died` event (task 1).
5. **A fill whose width alone changes is the same element** (it glides);
   **one whose reset counter changes is a new element** (it jumps) (task 4).

## Tasks

**1. The dev actions (inline).** Spec 5.3. `src/state/useGame.ts`:
- `GameAction` gains
  `{ type: 'setSkill'; skill: SkillId; ledger: 'core' | 'run'; level: number }`,
  `{ type: 'setItem'; item: ItemId; count: number }`, `{ type: 'earnChips' }`
  and `{ type: 'die' }`, each documented as dev-only beside `setHealth`.
- In `act`: each returns `model` unchanged on `s.dead`, on a skill or item the
  content does not have, or on a level or count that is not a non-negative
  integer (`Number.isInteger(n) && n >= 0`). Otherwise: `setSkill` writes
  `skills[skill][ledger] = { level, exp: 0 }`, the other ledger as it was;
  `setItem` writes `inventory[item] = count` and, when `count > 0` and `item`
  is not in `acquired`, appends it to `acquired` (`count === 0` leaves
  `acquired` alone: the pack's stay rule reads it); `earnChips` maps every
  `id` in `pageOf(s, content).order` to
  `completionCounts[id] = max(current, unlockAt(content.actions[id]))`, using
  `unlockAt` from `src/engine/automation.ts` and `pageOf` from
  `src/engine/rows.ts` (its comment notes that the skill ledger's
  "completions" line sums these counts and reads high by the grant, a dev
  build's honest lie); `die` returns
  `withLog(model, applyDecay({ ...s, health: 0, events: [] }))` with
  `applyDecay` from `src/engine/health.ts` (health 0 minus any decay is at
  most 0, so the branch that sets `dead`, `paused: 'system'` and the `died`
  event is the one taken; `events: []` first, as `step` does before decay,
  because the committed state still holds the last tick's events and
  `applyDecay` appends; `withLog` records the one event, and the card
  follows from `dead`).
- The result settles like any other action (the wrapper in `reduce` already
  does this). A newly earned row's mode is `off` (`setAutomation` refuses an
  unearned row, so `state.automation` never holds one), so `earnChips` queues
  nothing by itself.
- Tests, in a new `src/state/useGame.debug.test.tsx` (jsdom, `renderHook`
  over `useGame(testBook, { storage: null })`, the shape `useGame.test.tsx:208`
  uses with its own book): `setSkill` sets the one ledger and keeps the other; `setItem` writes
  the count, appends to `acquired` once and never twice, leaves `acquired`
  alone at 0, ignores an unknown item; `setItem` on a food (`fish` in the
  fixture) leaves `foodCooldowns` as it was and `feeding` reads true;
  `earnChips` raises every page row to `unlockAt` and `isUnlocked` reads true
  for each; a row already past its count keeps it; `die` on a fresh idle game
  (empty queue) and on a paused game gives `dead: true`, `paused: 'system'`,
  and a `died` line at the top of the log, and the hook's `card` is set;
  `die` right after a tick that logged a one-time completion (queue `hull`
  with the scrap in hand, tick until its line prints, pause, die) adds
  exactly one line, the death; a dead run ignores all four; a negative or
  fractional level or count is ignored. Also here, the offered-speed rule
  where it lives: `setSpeed(7)` leaves `speed` at 1 and `setSpeed(10)` gives
  10 (App.test's gear case goes in 2b; this is its replacement).

**2a. Regions (inline).** Spec 2.4. Files: new `src/ui/Region.tsx` and
`Region.test.tsx`; `src/ui/Rates.tsx`, `Food.tsx`, `Pack.tsx`, `Log.tsx`,
`Queue.tsx`, `ChapterPanel.tsx`, `RunningHead.tsx`, `SkillsBand.tsx`,
`HealthBar.tsx`; `src/styles.css`; `src/ui/App.test.tsx`, `Rates.test.tsx`,
`Log.test.tsx`, `Queue.test.tsx`, `ChapterPanel.test.tsx`.
- `Region({ name, title, className, note, head, live, children })` renders
  `<section className={`region region--${name}${className ? ' ' + className : ''}`} aria-label={name} aria-live={live ? 'polite' : undefined}>`
  then the heading, then children. The heading is `head` when given (a
  node), else `<header class="region__head"><span>{title ?? name}</span>{note}</header>`;
  `head={null}` renders no heading (the health bar, spec 2.1: the bar and
  its value, nothing else). The `aria-label` is the region name, so every
  `getByLabelText` in the suite keeps passing.
- Each caller carries its bare class in `className`, since the CSS and the
  fold queries select them: Rates `className={`rates${stopped ? ' rates--stopped' : ''}`}`
  (`Rates.test.tsx:49` queries `.rates`), Queue `queue`, Food `food`, Pack
  `pack`, Log `log` with `live`, ChapterPanel `chapter`, SkillsBand `skills`,
  HealthBar `health` with `head={null}`. Each drops its own `chunk`,
  `chunk__head` and `<section>` markup.
- Queue passes `title={`queue \u00b7 ${state.queue.length}`}` so the heading
  span reads `queue · n` (App.test 118 and Queue.test 21 read it
  contiguous); its note is `waiting` alone. Food's note is `nothing to eat`.
- The chapter's `head` is `<RunningHead>`, which now renders the
  `region__head region__head--book` line (keeping `head__line` as a second
  class so App.test 160's query survives) and the story `<p class="head__story">`
  under it; the rows follow inside the region.
- CSS: `.region`, `.region__head`, `.region__head--book` as the mockup
  (`docs/mockups/2026-09-24-regions.html`, treatment A), plus
  `.region__head { grid-column: 1 / -1 }`: the bare classes make several
  regions grids, and the band's is multi-column, so without the span the
  band's heading would sit in its first 360px cell and the skills would
  flow after it (panel round 3); in the single-column regions the rule is
  inert. `.chunk` and `.chunk__head` removed. `.chapter`, `.skills`,
  `.queue`, `.middle`, `.pack`, `.food`, `.rates` keep their rules. Items
  inside a region keep `--item`. **The chapter region**: `padding: 8px 0`
  (its heading and story get `padding-inline: 10px` of their own), and
  `.region--chapter { padding: 8px 0 }` written after `.region`'s padding
  rule (same specificity, so order decides) and
  `.region--chapter .row { border-inline: 0; border-radius: 0 }`, so the
  row's 712px floor is 710 of content inside the frame's two border pixels
  and the chapter column's minimum is unchanged (spec 2.4). The `.row`
  comment's arithmetic is updated to say so, and to say that the floor is
  a chosen width (the words in the middle chunk fit at it), enforced by
  `.screen`'s `min-width` and the column tiers, not by the row's own grid,
  whose min-content is far smaller. Two live picks in 2b, named
  so they are chosen rather than found: whether the rows keep the 5px gap
  between them or share dividers; and the running row's ember frame, which
  with no side borders becomes a top and bottom line (the `row--on` tint
  and the sheen still mark it, and the refusal ring is a box shadow and
  survives, but paints 1px past the frame's side border; if that looks
  wrong, `.region--chapter .row--refused { animation-name: refuse-flush }`
  with an inset shadow is the two-line fix). If the two ember lines read
  too faint, an inset `box-shadow` in the ember colour restores the frame
  without touching the width. **Before 2a's commit, the user sees the
  chapter in Chrome at 1280 with a running row and a refused one**: the
  flush look was chosen for the phone's sake on a description, and the
  regions mockup shows inset rows, so the first render is the mockup.
- `Region.test.tsx`: the label, the heading text, `head={null}` renders no
  header, `live` sets `aria-live`, `className` lands on the section.
  `App.test.tsx`: every region has a heading whose text starts with its
  name, `toMatch(/^name/)` (a note may follow it: the queue's count, the
  food's `nothing to eat` on a fresh game; the chapter's starts with the
  book's name, `toMatch(/^The Windward Run/)`, since the running head's
  line holds the book and the port in two spans; health has none). Ends
  green with the old shell still around it.

**2b. The shell (inline).** Spec 2.1 to 2.3 and 2.5 to 2.7. Files:
`src/ui/App.tsx`, new `src/ui/BottomBar.tsx` and `BottomBar.test.tsx`,
`src/ui/Settings.tsx` and `Settings.test.tsx`, `src/styles.css`,
`src/ui/App.test.tsx`.
- `BottomBar({ clockSeconds, note, live, card, onPause, onResume, onErase })`
  renders `<footer class="bottom">` with the gear (`Settings`, now
  `{ onErase }` only), the `role="timer"` clock with its note (pinned width
  as the corner had), and pause/resume with the card's placeholder, the
  markup the corner had; the visually hidden ticks-per-second line stays
  in it. `App.tsx`: `.top` holds the health bar alone; the corner is gone;
  the footer is last inside `<main>`, wrapped
  `<div className="inert-wrap" inert={inert}>` (`display: contents`, the
  idiom the band and the queue use), so the gear and erase save stay
  unreachable behind the card as today and the footer stays a direct grid
  item of `.screen`: a bare wrapper div would be its containing block, its
  own height, and `position: sticky; bottom: 0` would have nowhere to
  stick. `App` sets `--tick` on `<main>` as `${balance.time.tickIntervalMs}ms`
  through the `style` prop, cast `as CSSProperties` (React's type has no
  index signature for a custom property; `import type { CSSProperties } from 'react'`);
  `--fade` is task 6's and joins the same cast object. `speed` leaves App's
  destructure of `useGame` here (nothing reads it until task 5 restores
  it; `setSpeed` stays, the dev handle uses it).
- `Settings` loses `speed`, `onSpeed` and `dev` and its dev section, with
  its `DEV_SPEEDS` import (`noUnusedLocals` would fail typecheck) and the
  orphaned `.settings__seg`, `.settings__dev` and `.settings__rule` rules
  (task 5 styles the overlay under `.debug*`); the gear is production-only. `Settings.test.tsx` drops the speed case and the
  three props from every render. `App.test.tsx:92-101` ("the dev handle sets
  only an offered speed") is removed here with the commit body saying task 5
  re-pins it through the overlay. `.settings__panel` re-anchors
  `left: 0; bottom: calc(var(--control) + 4px); right: auto; top: auto`.
- CSS: `.screen { max-width: 1600px; margin: 0 auto; min-height: 100%; grid-template-rows: auto auto 1fr auto; padding: 0 10px; min-width: 732px }`
  (1600 is spec 2.3; 732 is today's floor, kept because the chapter's rows
  are flush in their frame; the explicit rows give the slack from `min-height` to
  the columns row, since a grid's default `align-content` would stretch
  the health box and the band on a short page; `.inert-wrap` is
  `display: contents`, so the four items are top, band, columns, bottom);
  `.top` sticky at `top: 0` with the page background, its own padding and
  `z-index: 4`; `.bottom` sticky at `bottom: 0`, `z-index: 4`,
  `grid-template-columns: var(--control) 1fr var(--control)`, a top rule,
  the page background; the container queries keep
  `max-width: 1257px` and `max-width: 999px` and their comment, which
  gains one clause: the chapter column's 712 is now the row's 710 plus the
  frame's border; `.skills` becomes
  `repeat(auto-fit, minmax(360px, 1fr))`; `.columns__chapter { display: grid } .columns__chapter > * { grid-area: 1 / 1 }`
  with `.card { position: static; align-self: start; margin: 24px 40px 0; z-index: 6 }`
  (above the bars' 4 and the settings panel's 5) so the column is as tall as
  the taller of panel and card, with a CSS comment naming the two
  conditions that z-order rests on: a static grid item honours `z-index`,
  and neither `.columns__chapter` nor `.columns` may ever form a stacking
  context (a `z-index`, `opacity` under 1, `transform`, `filter`,
  `contain: paint`, `isolation: isolate`), or Begin goes under the bottom
  bar with no error; `.corner*`, `.top__health` removed.
- `BottomBar.test.tsx`: the three controls in order inside the footer,
  `paused` / `idle` / `waiting` notes, the placeholder while a card is up.
  `App.test.tsx`: the footer, given `aria-label="bottom bar"` and queried by
  label (a `<footer>` inside `<main>` is `generic` to a real reader; today's
  testing-library matches `contentinfo` only by ignoring that scope, and a
  library bump would turn the test red for nothing), holds `settings`, the
  run clock and `pause`; nothing named `corner` remains. `.top` keeps its
  `inert={inert}` (App.test 113 reads the health region behind an `[inert]`
  ancestor during death).
- The sticky bars cover what scrolls under them: `.screen` has 10px side
  padding and an 8px row gap, so each bar takes `margin: 0 -10px; padding:
  ... 10px` and its own bottom or top padding stands in for the gap, or the
  strip either side and the gap show scrolling content. Written here so
  the live pass adjusts it rather than discovers it.
- Chrome, before the commit: 1920, then each tier boundary from both sides
  (three columns at the first tier's width and two one pixel under it;
  the same for the second tier and for the floor, with the 15px
  classic-scrollbar offset noted), then 1100, 900 and the floor; a
  12-entry queue to see both bars stick; a fresh game on a tall window to
  see the bottom bar at the window bottom; the widest queue entry (a
  forced fight with `once`, `auto`, `to the end` and a countdown, and a
  top repeat producer with its `n/target`) inside the region's 22px
  narrower box, since `.entry__sub` clips rather than wraps; the settings panel opening
  upward; the death card's Begin above the bottom bar below 1000. Adjust
  padding, rule colours, the region head weight and the 1600 live; the user
  is watching the dev URL. A moved number is recorded on #46.

**3. Food is timing, the pack lists food (subagent).** Spec section 3.
Files: `src/ui/Food.tsx`, `src/ui/Food.test.tsx`, `src/ui/Pack.tsx`,
`src/ui/Pack.test.tsx`, `src/ui/App.test.tsx`, `src/styles.css`.
- `Food`: each row `name · +n hp · bar · countdown`. The bar's fill has
  `bar__fill--run` (ember) at `cooling * 100`%. Under it, in `.bar__value`:
  `duration(ticksToSeconds(state.foodCooldowns[id] ?? 0))` while cooling
  (`3.2s`), `ready` when the cooldown is 0 and some is on hand, and `none`
  (with `food__item--none`, dimmed) when `!feeding(state, id)`. The
  `food__item--empty` red border and `food__item--full` go, since the pack
  now carries the stack. Rows keep `foodsByHeal` order and the show rule.
- `Pack`: drops the `kind !== 'food'` filter. A food row shows
  `<span>{name} <small class="pack__hp">+{heal} hp</small></span>` then the
  stack bar and `n/cap` as any item. Enter, stay, leave and `full` apply as
  to any item. Keys still never warn.
- Restatements, each named in the commit body: `App.test.tsx:119`
  (`0/${stackCap}` in the food region after a death) becomes `none`, since
  a fresh life has no fish and no cooldown; `Food.test.tsx:16-23` (count
  under the bar) becomes the countdown words; `41-44` (the raised cap)
  moves to `Pack.test.tsx` as `n/(cap+5)` on a food with `satchel` built;
  `45-49` and `50-54` (`food__item--empty`) become `none` and
  `food__item--none`; `55-58` (`food__item--full`) moves to `Pack.test.tsx`
  as the `full` warning on a food at cap; `Pack.test.tsx:15-21` expects
  `['pass', 'fish', 'scrap']` now that food is listed. The two test titles
  that would read as lies afterwards (`Food.test.tsx:16` "count/cap under
  it", `Pack.test.tsx:15` "lists what is not food") are reworded with their
  bodies.
- Tests: Food shows `3.2s` at the ticks that make 3.2 s (from
  `balance.time.tickIntervalMs`, not a literal), `ready` at 0 with one on
  hand, `none` dimmed with none and no cooldown; the bar carries the run
  class; the smallest heal is first. Pack lists a food with `+4 hp`, at the
  bottom the first time it is acquired, dimmed at 0 while a maker is on the
  page, gone at 0 with none; the `full` warning on a food at cap.

**4. Smooth bars (subagent).** Spec section 4. Files: `src/styles.css`,
`src/ui/HealthBar.tsx`, `SkillCell.tsx`, `Queue.tsx`, `Pack.tsx`, `Food.tsx`,
`DeathCard.tsx`, and their tests.
- CSS: `.bar__fill { transition: width var(--tick) linear; }` and under
  `@media (prefers-reduced-motion: reduce)` `transition: none`. `--tick` is
  set on `<main>` by 2b.
- Keys, on the fill `<div>` at each site, so a reset remounts and jumps:
  `HealthBar` `key={life}` (a new required prop, `App` passes `screen.life`;
  `HealthBar.test.tsx:8,12,17,21` pass `life={1}`); `SkillCell`'s core
  `Line` `key={ledger.level}` and its run `Line` `key={`${state.life}:${ledger.level}`}`
  (death resets a run ledger to zero without a level change when it was
  still level 0); `Queue` `key={state.completionCounts[a.id] ?? 0}`;
  `Pack` `key={state.chapter}`; `Food`'s cooldown bar `key={state.life}`
  (a refill after a bite is a rise and glides, but death empties the
  cooldowns while the page's food row stays on screen behind the card, so
  the life is its reset); `DeathCard`'s `CardGains` no key (rendered once
  per card). The `.auto i` earning line is not a bar and stays.
- Tests: for the health bar, the skill line and a queue entry, a rerender
  with the width changed and the key unchanged keeps the same DOM node
  (`container.querySelector('.bar__fill')` is `toBe` the node held before);
  a rerender with the key changed yields a different node (review focus 5),
  including a run line at level 0 across a life change and Food's cooldown
  fill across a life change (one rerender with `life: 2`). jsdom does not
  run transitions; the identity is what the rule rests on.

**5. The debug overlay (subagent, then inline in Chrome).** Spec section 5.
New `src/ui/Debug.tsx`, `src/ui/Debug.test.tsx`; `src/ui/App.tsx`;
`src/ui/App.test.tsx`; `src/styles.css`.
- `Debug({ content, state, stopped, speed, onSpeed, dispatch })`, mounted
  in `App` as `{import.meta.env.DEV && <Debug .../>}` outside every `inert`
  wrapper, with the committed `state` (not the `screen` view: behind the
  card they differ, and every write is refused on `dead` anyway) and App's
  existing `stopped` (`!live || working === -1`: idle, waiting, paused, or
  the card up, where a tick is a no-op too); `speed` returns to App's
  destructure here. The
  component renders through `createPortal(..., document.body)`, so its
  tests query through `screen`, never `container`. It owns `open`, `pos`,
  `skillsOpen`, `itemsOpen`. No CSS import; its rules live in `styles.css`
  under `.debug*`. While `state.dead` the title reads `debug · dead` (the
  overlay shows the dead life behind a screen that shows the next; every
  write is refused until Begin).
- A `keydown` listener on `document`: `e.code === 'Backquote'` toggles `open`
  unless `e.target` is an `input` or `textarea` inside `root.current`, in
  which case nothing (a focused button does not swallow it);
  `Escape` closes when open and `document.activeElement` is `document.body`
  or inside `root`. Review focus 1: a test fires the backquote keydown on the
  health input and the overlay stays open with that input focused.
- The panel: `<div class="debug" role="dialog" aria-label="debug" style={{ left, top }}>`,
  `position: fixed`, `z-index: 7`, `width: 44ch`, `max-height: 70vh;
  overflow-y: auto`. The title bar (`.debug__title`, "debug", a `×` button
  named `close debug`) drags: `mousedown` records the offset, `mousemove`
  on `document` sets `pos`, `mouseup` ends it and writes
  `localStorage.setItem('continuum.debug', JSON.stringify(pos))` inside
  try/catch. A layout effect after open reads the saved `pos` the same way
  and clamps it to `[0, innerWidth - offsetWidth] × [0, innerHeight - offsetHeight]`
  of the panel; review focus 2's test stubs
  `Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 400 })`
  and `offsetHeight` to 300 (restored by re-defining the captured
  descriptors, never by `delete`, which would strip jsdom's own getter for
  the rest of the file), saves `{ left: 5000, top: 5000 }`,
  opens, and reads `left === innerWidth - 400` and `top === innerHeight - 300`
  (jsdom lays nothing out, so without the stub the clamp is untested).
  Default position: bottom-left, above the bottom bar, computed from the
  footer's rendered height (`document.querySelector('.bottom')?.offsetHeight`)
  in the same layout effect, never typed, so a padding change in 2b's live
  loop cannot put the panel under the bar.
- Sections in order, each a `.debug__row`:
  time (`+10s` `+1m` `+10m` dispatch `{ type: 'tick', n }` with `n` from
  `ticksPerSecond()` and `balance.time.ticksPerMinute` times the button's
  own 10 or 1; while `stopped` the three carry `aria-disabled` and a
  `.debug__note` under them reads `time passes only while work happens`;
  speed as `Settings` rendered it, the `role="group"` named `speed`);
  health (a controlled `type="number"` input named `health`; `set`
  dispatches `setHealth` with the parsed value; `die now` dispatches `die`);
  chips (`earn every chip on this page` dispatches `earnChips`);
  skills (a `<button aria-expanded>` "skills (n)" with a `▸` marker
  before it from `[aria-expanded="false"]::before` and `▾` when open,
  both plain glyphs without the Emoji property, toggling a list: one
  `.debug__line` per roster skill with two controlled `type="number"` inputs
  labelled `${name} core` and `${name} run`, text state seeded from the
  state's level, applying `setSkill` on Enter and on blur);
  items (the same for every `Object.values(content.items)`, one input
  labelled `${name} have`, applying `setItem`).
  Both lists start closed. Each input keeps local text; **blur is the one
  apply path**, and Enter calls `e.currentTarget.blur()`, so Enter followed
  by a click elsewhere applies once (the first draft applied on both, so
  typing 50, Enter, then a click after ticks had taken health to 45 set it
  back to 50). On blur a parse that passes dispatches
  (`Number.isInteger(n) && n >= 0` for a level or a count;
  `Number.isFinite(n) && n >= 0` for health, since `setHealth` takes
  fractions and a seeded `97.3` must round-trip), anything else resets the
  text to the state's value. When the state's value changes from
  outside (a tick, another control) the text follows it only while the
  input is not focused (`document.activeElement !== ref.current` in the
  effect), so health ticking down every 100ms cannot clobber a value being
  typed.
- Tests (`Debug.test.tsx`, `dispatch` a `vi.fn()`; every test that types
  into an input or asserts its focus first does `act(() => input.focus())`,
  since jsdom's `blur()` fires nothing on an unfocused element and
  `fireEvent.keyDown` does not focus; inputs are queried by role,
  `getByRole('spinbutton', { name: 'health' })`, since `getByLabelText('health')`
  would also match the health region in any App test that opens the
  overlay): the backquote opens and closes, Escape closes with focus on the
  body, Escape with focus on a sibling `<button>` rendered beside Debug in
  the test (an element outside the overlay) does not; the two
  lists start collapsed and open on press; each control dispatches its
  action with the typed value; on a level or a count input `''`, `-3` and
  `1.5` dispatch nothing and the input shows the state's value; on the
  health input `97.3` dispatches `setHealth` with `97.3` and stays in the
  field, while `''`, `-3` and `abc` dispatch nothing; the Enter path, shaped so it proves
  something (`input.focus()`, `fireEvent.change` to `50`,
  `fireEvent.keyDown(input, { key: 'Enter' })`: `dispatch` has one call and
  `document.activeElement` is no longer the input; no synthetic blur
  follows, since a click elsewhere fires no blur on an unfocused input,
  and jsdom's `blur()` fires `focusout` only on the focused element, so a
  trailing `fireEvent.blur` would count the same apply twice);
  a focused health input keeps its typed text when the `state` prop's
  health changes, an unfocused one follows it;
  the time buttons carry `aria-disabled` while `stopped` (an idle game with
  an empty queue is the case); the speed group's pressed button follows the
  `speed` prop and a press calls `onSpeed` (the offered-speed rule itself is
  task 1's hook test); the position is saved on drag end and clamped on
  open; nothing renders while closed but the listener is live. In
  `App.test.tsx`, one case for the wiring App owns: fire the backquote,
  `act(() => window.continuum!.speed(10))`, the speed group's pressed
  button reads `×10`.
- Then inline in Chrome: open, drag, press each control, read the effect
  through `window.continuum.state()`; die from it on an idle game and begin
  again; check the panel's `left: 0` touches the window edge at 1920.

**6. The leftovers (subagent).** Spec section 6. Files: `src/ui/ActionRow.tsx`
and test, `src/ui/narrate.ts` and tests, `src/ui/App.tsx` (the `--fade`
source), `src/styles.css`.
- The instruction fades: `ActionRow` exports `INSTRUCTION_MS` and a new
  `FADE_MS = 400` (presentation, commented as `INSTRUCTION_MS` is); `App`
  sets `--fade` on `<main>` from it, beside `--tick`. `.row__say--fading { opacity: 0; transition: opacity var(--fade) }`;
  a second timeout at `INSTRUCTION_MS - FADE_MS` sets `fading`, the hold's
  end clears both. Test with fake timers (`ActionRow.test.tsx:212-224` is
  the pattern): after `INSTRUCTION_MS - FADE_MS` the element carries the
  class, after `INSTRUCTION_MS` it is gone.
- `outputsOf`: a closer's list is what it makes and leaves, then
  `turns the page` (or `casts off`); the finish keeps `the end` alone.
  `ActionRow.test.tsx:322` (`gate`) restates to `['a pass', 'turns the page']`;
  the `raid` cases stay `['casts off']`.
- A shortfall the page will supply reads quiet: in the costs loop, `short &&
  makersOf(state, content, c.item).some((m) => m.id !== action.id)` gives
  `row__short--quiet` (`--ink-2`, no red) instead of `row__short`.
  `makersOf` is exported from `src/engine/automation.ts` and is the test
  `frontBlock` makes. The glyph and the words stay (`⚠ 3 of 8 scrap
  have 1`, ActionRow.test 85); only the class flips (with a
  `.row__short--quiet small` twin of `.row__short small` so `have 1` keeps
  its colour), so the row still says
  it is short and the colour says the page will handle it. Tests:
  `ActionRow.test.tsx:81-91` restates (the hull short of scrap with Salvage
  on the page carries `row__short--quiet`, same text); `unsalvaged`
  (line 24) short of an item no page row makes carries `row__short`.
- `narrate`: `pageTurn` reads `Page ${e.page + 1}: ${name}` (the number
  alone when the name is blank); `lifeBegins` reads
  `Life ${life} begins: ${content.chapters[0].pages[0].name}` when that page
  has a name, else as today. `narrate.pages.test.ts:8,22` restate;
  `Log.test.tsx:18` (the Salt Road's blank page name) is unchanged.
- The look of ■ is task 7's, in Chrome.

**7. Chrome, the ■ pick, the production check, docs (inline).**
`/chrome-verify` over the whole of spec section 8's Chrome list; the ■ shown
filled and outlined (a temporary class toggled from the console) for the
user's pick, recorded on #43 and applied; `npm run build` and
`grep -l "earn every chip on this page" dist/assets/*.js` prints nothing
(`-c` over several chunks prints one count per file and exits 1 either
way), noted in the commit body; `CLAUDE.md` (the dev handle gotcha gains the overlay and its
key; the layout gotcha takes the tier numbers **read from the final CSS**,
not from this plan, with the sticky bars, the max width, the band's cells
stretching by `auto-fit` in place of "a fixed 360px", and the chapter's
rows flush in their frame; the settings note loses speed), `README.md` (the overlay under a dev heading, food and
pack wording), `docs/mockups/README.md` (a capture of the built screen at
1280 beside the before shot). The ship-time tracker writes (a comment on
#62 with the new floor, the ■ pick on #43, the cap on #46 if it moved) go
in the handoff's Open list. Commit.

## Execution split

**Order: 1, 2a, 2b, 3, 4, 5, 6, 7, one after another in the one tree.**
Tasks 1, 2a and 2b inline: 1 locks the action contract task 5 dispatches,
2a and 2b are the live-adjust pass with the user watching the dev URL.
Tasks 3, 4, 6 are subagents in that order (4 keys 3's bar; each edits
`styles.css`). Task 5 is a subagent for the component and its tests, then
inline for the Chrome pass; it sits after 4 so its Chrome pass sees the
bars gliding and before 6 so 6 owns the last `App.tsx` edit. Task 7
inline. Nothing runs in parallel.

## Accepted risks

- **Escape closes more than one thing.** Objection: three document keydown
  listeners (the band's ledger, the gear's panel, the overlay) each act on
  Escape, so one press can close all three. Cheaper alternative: one shared
  keyboard owner. Rejected: the overlay now acts only with focus inside it
  or on the body, which removes the case that matters (typing in the
  overlay); the remaining overlap is a dev tool closing beside a ledger, and
  a shared owner is a refactor of two shipped components for no player-
  visible gain.
- **The overlay's drag is mouse-only.** Objection: no touch. Alternative:
  pointer events. Rejected: the overlay is a desktop dev tool; touch is #62's
  world, and pointer events cost nothing to add then.
- **`setItem` above the cap.** Objection: an over-full stack makes a chipped
  producer pop `full` each resolve. Alternative: clamp to the cap. Rejected:
  the spec asks for over-full on purpose (to try it); the naysayer traced
  the pop as once per resolve and unlogged, and `eat` drains food back to
  the cap.
- **A catch-up batch can wrap a level.** Objection: one `tick` with many
  ticks can level and continue; the fill glides from the old exp to the new
  in one go. With the key rule the level change remounts the element, so
  this case jumps; the objection held only against the threshold rule, which
  is gone.
- **Begin's autofocus after `die now`.** Objection: the death card's Begin
  takes focus, so Escape no longer closes the overlay until it is clicked
  into. Alternative: drop the focus condition on Escape. Rejected: the
  condition is what keeps Escape from closing the overlay while the band's
  ledger or the gear's panel is the thing being closed; the backtick still
  toggles the overlay from anywhere, and a play-tester who just died is
  about to press Begin anyway. Written into spec 5.1.
- **The needs line keeps its red on a chain-supplied need.** Objection:
  task 6 softens a *cost* the page will supply but not a *need*
  (`need--unmet`), so a need an on-page row makes stays red while play
  works. Alternative: apply `makersOf` to needs too. Rejected for this
  slice: in the shipped book the only such needs sit on closers, which show
  their `after:` line instead of the needs line while their page is
  unfinished, so nothing is visible today; the proving-ground book (#82)
  will reach it, and #84 is already the issue rethinking the cost grammar,
  so the needs case is noted there rather than half-fixed here.
- **A reset the keys do not see glides for one tick.** Three cases keep
  every key while XP or progress drops to zero: `setSkill` to the level a
  ledger already holds (dev only); **erase save at life 1** (a production
  control: `reset` returns a fresh model with life 1, chapter 0, every
  ledger at level 0, so a bar with XP slides to zero over one tick); and
  the dev handle's `load`. Alternative: a run-generation counter bumped by
  `erase` and `load`, keyed on the whole region tree. Rejected: erase save
  is a two-press control the player uses on purpose to start over, and
  one tick of a bar emptying is the right picture of it; the counter would
  add state to the hook for a 100ms glide. Written honestly: reached in
  production, by erase save, one tick.

## Risks

- **`Region` changes every labelled section's markup at once.** The suite's
  `getByLabelText` calls and the bare-class rule (2a) are the guard.
- **The 1600 cap is a first number.** It is adjusted live at 1920 in 2b and
  recorded on #46 when it moves.

## History

- 2026-09-24: written from the spec after the brainstorm (regions mockup,
  pick A; the smooth-bars and backtick-overlay asks folded into the spec).
- 2026-09-24, Revision 5: panel round 5 (Reviewer A: one must-fix, a test
  line against the fractions rule, fixed; Reviewer B: no must-fix, nine
  notes folded; the naysayer: no must-fix, all seven risks accepted with
  their code lines, nits folded).
- 2026-09-24, Revision 4: panel round 4 (Reviewer A: clean, one note on the
  running row's frame; Reviewer B: the Enter test's shape, three notes; the
  naysayer: the footer wrapper, the same Enter test, seven risks folded in
  as words; every accepted risk accepted).
- 2026-09-24, Revision 3: panel round 3 (Reviewer A: the stale tier lines;
  Reviewer B: the band heading as a grid cell, the `CSSProperties` cast and
  four notes; the naysayer: the 1280 window folding, put to the user, who
  chose for the phone's sake; the double apply; the unkeyed food fill and
  erase save; five risks written in). Every accepted-risk entry accepted
  except the one whose reason was wrong, rewritten.
- 2026-09-24, Revision 2: panel round 2 (all three found `die` re-logging
  the last tick's events; the naysayer the border in the tier arithmetic,
  the grid stretch under `min-height`, the vacuous clamp test, the lost
  offered-speed test, the run ledger's key, `!live` vs idle; Reviewer B the
  health input's sync clobbering typing, task 3's unnamed restatements,
  task 5's place in the order, and the smaller wiring notes). The four
  accepted risks were accepted; two more written.
- 2026-09-24, Revision 1: panel round 1 (Reviewer A: APIs exist, four
  must-fixes on Region's classes, `aria-live`, and two App tests left
  homeless; Reviewer B: four must-fixes on the speed seam, the food test,
  the input reset, and the StrictMode ref; the naysayer: seven must-fixes,
  the largest that `setHealth` 0 does not die, and the fold tiers moving by
  the region padding). All folded in above; the spec's 2.5, 2.6, 2.7, 4.2,
  5.1, 5.2, 5.3, 6 and 8 corrected the same pass.
