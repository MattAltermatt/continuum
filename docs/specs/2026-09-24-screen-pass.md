# The screen pass, smooth bars, and the debug overlay

*2026-09-24. Issues #46, #76, #83, #63, and the cosmetic leftovers on #43 and
#78. Brainstormed with the user the same day; every look a player sees is
theirs, picked on a mockup or stated outright.*

## 1. Why

Three asks from play-testing The Windward Run, and two the user added in the
brainstorm:

- **#46**: "having separation will go a long way to help see what is going
  on." The regions run into one another: the band has no heading, the queue's
  is a bare label, the pack's sits outside its box while the log's sits inside.
- **#76**: "the overall width should match." Health, band and columns end at
  three different right edges (mockup `2026-09-24-before-1280.png`).
- **#83 / #63**: a play-test needs the chips, a death and any health without
  the console and without waiting.
- **Smooth bars** (the user, mid-session): "some of them have an obvious
  stutter, you can see the ticks, and with so many going off at once, much
  easier on the eyes if it was smooth."
- **The overlay's shape** (the user): "when in dev mode, if I press `, it
  opens up a movable overlay in which the different skills can be set to
  specific values, and the items can be tweaked."

The user chose to **build and adjust live** over mocking the whole screen, with
one mockup for the single open visual question, the region treatment
(`2026-09-24-regions.html`, pick **A: heading inside the box**).

## 2. The shell (the user's picks, #46 and the regions mockup)

1. **Health alone on top, full width, sticky** to the window top. The bar and
   its "97 / 100", nothing else.
2. **The corner column is gone.** A **bottom bar** holds the gear (left), the
   run clock with its `paused` / `idle` / `waiting` note (centre) and
   pause/resume (right). It is **sticky to the window bottom**, so the controls
   stay reachable when a long queue scrolls the page.
3. **One content width.** Every region fills the same width: health, band,
   chapter, queue, middle. The page gets a **max content width of 1600px**,
   centred, so at 1920 the chapter no longer stretches to ~1354px with sparse
   rows (a number the user sees; adjusted live at 1920 during the build,
   recorded on #46 when it moves).
4. **Every region is a box with its heading inside, at the top edge** (pick A):
   `skills`, the chapter, `queue · n`, `rates`, `food`, `pack`, `log`. One
   heading style, one box style, one padding, with the one exception the
   next lines give the chapter. The chapter's heading **is its
   running head** ("The Windward Run · I · Port Cinder · Fitting out") with
   the story line under it inside the box. Items sit inside their region
   as the darker inset (`--item` on `--cell`). **The chapter's rows sit
   flush inside its frame**: the region has no side padding around them,
   the rows drop their own side borders and corner radius, and the
   region's border stands in (the heading and story keep a 10px inset).
   The user's pick after panel round 3, "whatever makes sense once we also
   put mobile into the mix": a phone (#62) would strip that inset from the
   rows first, and the alternative pushed the desktop three-column tier
   from a 1280 window to 1300, the wrong way for narrow windows. With the
   row's 712px floor now made of 710 of content plus the frame's two
   border pixels, the chapter column's minimum is unchanged and every
   fold tier keeps today's numbers. The running row keeps its ember frame
   on all four sides (the user, on the live build): with no side borders of
   its own, the two vertical edges are painted inside the row as an inset
   shadow.
5. **The band's cells stretch to fill the box**: `repeat(auto-fit, minmax(360px,
   1fr))`. Three cells of ~410px at 1280; under the 1600 cap the band is
   1560px inside its padding, which holds **four** cells of ~387px, so the
   seven-skill roster sits 4 + 3 from about 1500 up (five 360px cells need
   1816px, which the cap does not allow; panel round 1 corrected the first
   draft's "five"). Still 360px minimum, still wrapping by width. This amends
   the 2026-09-23 fixed-360 pick, which predates "one width".
6. **The fold tiers stay, numbers and all.** With the chapter's rows flush
   in their frame (2.4), the chapter column's floor is still 712, so three
   columns still need 1258 of content width (query `max-width: 1257px`),
   two need 1000 (query `999px`), and the page floor is 732 (747 with a
   classic scrollbar), the numbers CLAUDE.md's layout gotcha and #62
   carry today. The queries still measure the content box, now inside the
   max width. The phone layout is #62, untouched.
7. **The death and finish cards** keep their place over the chapter but no
   longer overhang it: the chapter panel and the card are stacked in one grid
   cell (`grid-area: 1 / 1` on both, the card `align-self: start` with its
   margins), so the chapter column's height is the taller of the two by
   layout, whatever the card holds. No measured height, no class toggled
   while a card is up. The card sits above the sticky bars, so Begin is never
   under the bottom bar on a short window.

## 3. The food chunk and the pack (#46, mockup 2026-09-23-food-cooldown, picks C + B)

- **Food is timing only.** Each food row: name, `+4 hp`, an **ember** cooldown
  bar (`--run`) that drains until the food can be eaten again, and under the
  bar, where `n/cap` sat, the **countdown**: `3.2s`, `ready`, or a dimmed
  `none` when nothing is on hand and nothing is feeding. Ember means time; a
  light bar with `n/cap` means a stack everywhere else. The rows keep their
  smallest-heal-first order (#45).
- **The pack lists food too**, with its count and stack bar like any item and
  `+4 hp` beside the name to mark it as special. Food obeys the pack's
  enter/stay/leave rules like any item. The pack's `full` warning applies to
  food as to anything else.
- The `nothing to eat` note stays in the food heading.

## 4. Smooth bars

Every bar fill jumps to its new width on each 100ms tick, and no bar has a
transition. The rule:

1. **`.bar__fill` gets `transition: width 100ms linear`**, one tick long, so a
   fill glides into the next tick's value instead of stepping. Health, skill
   XP, queue progress, cooldown and stack bars all take it, by the one class.
   The duration is the tick interval, read as a CSS variable set from
   `balance.time.tickIntervalMs` at mount, not a second literal.
2. **A reset snaps, by remount.** A fill that drops to zero because its row
   completed or its ledger levelled must not slide backwards. Rather than a
   threshold on the drop, each fill element is **keyed on the counter whose
   change is the reset**: a skill's core line on its level, its run line on
   the life and the level together (a run ledger still at level 0 with some
   XP is reset to zero by death, and the level alone would not see it), a
   queue entry's on its row's completion count, the health bar's on the
   life, a food's cooldown bar on the life too (death empties the
   cooldowns while the food row stays), a pack stack's on the chapter. A
   keyed element that changes key is a new
   element, and a new element does not transition, so a reset jumps by
   construction and no number decides it (panel round 1's cheaper design;
   the first draft's "a drop of more than half" was a threshold that
   StrictMode's double render also defeated). A stack spent down by a cost
   (16 scrap to the hull) keeps its key and slides, as a real drop should. A
   cooldown bar refilling after a bite is a rise and glides up in one tick.
3. **Reduced motion turns it off**, as the sheen already is.
4. At speed ×10 and ×100 the steps are large and the glide covers them as far
   as 100ms can; that is a dev build and not tuned for.

## 5. The debug overlay (#83, #63, the user's shape)

Dev builds only: `import.meta.env.DEV`, like the window handle, and gone from
the production bundle. Nothing here touches `balance.ts` (decision #3).

### 5.1 Opening, moving, size

- **`` ` `` toggles it; Escape closes it.** The key is matched by
  `e.code === 'Backquote'`, so a dead-key layout (US-International, German)
  still opens it. It is ignored while an input or textarea inside the
  overlay has focus, so it never toggles under a typed value; a focused
  button does not swallow it, so the key works right after a press. Escape
  closes the overlay only while focus is inside it or on the body, so the
  band's ledger and the gear's panel keep their own Escape. (After `die
  now`, the death card's Begin takes focus, so Escape no longer closes the
  overlay until it is clicked into; the backtick still toggles it.
  Accepted, a dev tool's wrinkle.) There is no button for it; the key is
  the door.
- **Movable**: dragged by its title bar. Its position is remembered in local
  storage (`continuum.debug`, a dev convenience, wrapped in try/catch like the
  save) and clamped to the window on open, so a position saved on a wider
  screen still lands on the page.
- **A max height, then a scrollbar**: the panel is at most 70% of the window
  height and scrolls inside. Its width is fixed (about 44ch). It is clamped
  to the window on open, again whenever it grows (a list opened) and on a
  window resize, since a fixed panel cannot be scrolled to.
- Floats above everything: rendered through a portal onto `document.body`
  (`position: fixed` inside `.screen`, a container-query root, may be
  positioned against the container rather than the window), with a z-index
  above the settings panel, the bars and the cards. It is not `inert`
  behind the death card: dying and beginning again from it is the point.
  It reads the committed state, so behind the card it shows the dead life
  (health 0, that life's run levels) while the screen shows the next; a
  `dead` note in its title says so, and every write is refused until Begin.

### 5.2 Sections, top to bottom

```text
┌ debug ····························· drag ─ × ┐
│ time    [+10s] [+1m] [+10m]                      │
│ speed   ×1 ×10 ×100                              │
│ health  [ 47 ] set             [die now]         │
│ chips   [earn every chip on this page]           │
│ ▸ skills (7)                                     │
│ ▸ items (14)                                     │
└──────────────────────────────────────────────────┘
```

- **time**: `+10s`, `+1m`, `+10m` step game time through the existing tick
  path (`{ type: 'tick', n }`), so what happens is exactly what waiting would
  do, including nothing: time passes only while work happens (decision #41),
  so while the clock is stopped (idle, waiting or paused, the same `stopped`
  the rates chunk dims on) the three buttons are dimmed with the words
  `time passes only while work happens` under them. **speed** ×1 ×10 ×100
  moves here from the gear, which becomes production-only (its dev rule and
  section go).
- **health**: a number input and `set` (`setHealth`, clamped to zero and max;
  health takes fractions, so any finite value at or above zero applies);
  **die now** is its own action, `die` (#63). Health at zero is not death:
  death happens in the tick's decay, which runs only while the top can work,
  so `setHealth` to 0 on an idle or paused game reads "0 / 100" for ever
  (panel round 1). `die` applies the engine's own decay to a state at zero
  health with an empty event list (as the tick does before decay; the
  committed state still carries the last tick's events, and reusing them
  would log them twice, panel round 2), which returns the dead,
  system-paused state with its `died` event alone, so the log line, the
  card and the reborn view follow by construction.
- **chips**: every row on the current page gets its lifetime completion count
  raised to its unlock count if below it, so the automation chip appears. A
  row already past it is untouched. The count is the row's real
  `completionCounts` entry, so the chip is earned by the game's own rule and
  the save carries it.
- **skills, collapsed on start** (`▸ skills (n)`): one line per skill in the
  book's roster, in roster order, with two number inputs, **core** level and
  **run** level. Applying one puts that ledger at the level with `exp: 0`;
  the other ledger is untouched. The band's cell updates on the spot.
- **items, collapsed on start** (`▸ items (n)`): one line per item in the
  book, every item, not only the pack's. A number input, **have**. Setting a
  count writes the inventory entry; a count above zero for an item not yet
  carried adds it to the end of `acquired`, the pack's enter rule (#45). The
  count is **not clamped to the cap**, so an over-full stack can be tried. A
  key is an item like any other here.
- Inputs apply once, on blur; Enter blurs the input, so Enter-then-click
  applies once, not twice. Escape while typing closes the overlay and
  discards the value not yet applied (the input unmounts before any blur);
  the `×` button applies it first, since its press blurs the input before
  the close. A value that does not parse (a negative, a
  blank, `NaN`; for a level or a count also a fraction) is ignored and the
  input shows the state's value again.

### 5.3 The actions

Four dev-only reducer actions beside `setHealth` in `src/state/useGame.ts`,
each a plain write to the state, each a no-op on a dead run as `setHealth`
is, each settled after like every other action:

```ts
| { type: 'setSkill'; skill: SkillId; ledger: 'core' | 'run'; level: number }
| { type: 'setItem'; item: ItemId; count: number }
| { type: 'earnChips' }          // every row on the current page, to unlockAt(row)
| { type: 'die' }                // applyDecay on health 0, events []: the engine's own death
```

(`tick` with `n` and `setHealth` already exist.) They are reachable from the
window handle too, as any action is. They live in `src/state/`, not the
engine: the engine has no dev path, and a test of them is a reducer test.
`die` imports `applyDecay` from `src/engine/health.ts`, an import the state
layer already makes of the engine.

## 6. Leftovers folded in

From #43:
- **The click instruction fades back** rather than vanishing: after its hold
  it fades out over a few hundred milliseconds (presentation timing, beside
  `INSTRUCTION_MS`), then the row's resting words return.
- **The look of ■**: two looks are put in Chrome side by side during the
  adjust pass, today's filled ember square and an outlined one; the user picks
  looking at it, and the pick is recorded on #43. The spec does not fix it.

From #78 (recorded on #46):
- The **"turns the page" tag** on a closing row no longer hides what the row
  makes: both show, the makes first, then the tag.
- A row the chain will supply (spec 2026-09-24-pages 4.3) shows its shortfall
  **in the quiet colour, not red**, since ▶ on it just works. "The chain will
  supply" is the engine's own rule, `makersOf` (a row on the page that makes
  the item and is not done this life, other than the row itself), the same
  test `frontBlock` makes; the row reads it, never a second copy.
- **The page-turn log line names the page** ("Page 2: Pirates!") and the life's
  first line names page 1 too.

Not folded: **x on a prerequisite a closer pulled** re-pulls next tick. That is
behaviour, not look, and stays on #46 for its own decision.

## 7. Out of scope

- #62, a phone layout. The 732px floor stands.
- #75, finish times and deltas in the log.
- #82, the proving-ground book. The overlay is its first tool; the book waits.
- Any change to what a row, the queue or automation does. This slice moves
  and dresses; the engine is untouched.

## 8. Testing

- **Component tests** (jsdom, one per component touched): the bottom bar's
  three controls and their notes; the region headings present on every region;
  food rows show the countdown words in all three states; the pack lists a
  food with its `+hp`; a fill whose reset counter changes is a new element
  and one whose width alone changes is the same element.
- **The overlay**: `` ` `` toggles it and does not while an input inside it has
  focus (the overlay stays open and the input keeps focus; what the browser
  does with the character in a number input is its own business); Escape
  closes; each control dispatches its action with the typed value; a bad
  value is ignored; sections start collapsed; the position is saved and
  clamped.
- **Reducer tests** for `setSkill`, `setItem`, `earnChips` and `die`: the
  write, the `acquired` append, the unlock reached by the game's own `earned`
  rule, the death with its event on an idle and on a paused game, the no-op
  on a dead run.
- **The wall**: `src/purity.test.ts` unchanged; nothing new is imported into
  the engine. The overlay lives in `src/ui/`, its actions in `src/state/`.
- **Production**: the built bundle contains no overlay. Vite folds
  `import.meta.env.DEV` to `false` and drops the unused module, provided the
  overlay's module has no side-effect import (no CSS import of its own; its
  rules live in `styles.css`, which ships either way). The check is a grep of
  the built JS for a control's label (`earn every chip on this page`), not
  the word `debug`, which the CSS would match.
- **Chrome**: the whole screen at 1920, 1280, 1100, 900 and 732, each tier
  boundary from both sides, and
  the sticky top and bottom on a long queue and on a short fresh game; the overlay opened, dragged, each control
  pressed and its effect read through `window.continuum.state()`; the bars
  watched gliding with three running at once.
