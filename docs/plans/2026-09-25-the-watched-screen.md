# The watched screen — plan (2026-09-25)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Spec: `docs/specs/2026-09-25-the-watched-screen.md` (#62, #91, #84; seats for
#90 and #73). Branch `feature/phone-layout`. Mockups `docs/mockups/2026-09-25-*`.

**Status:** executed and shipped 2026-09-25 (version 0.3.0), Tasks 0 to 9,
subagent-driven with the controller inline on 0, 1, 2, 6b, 7, 8 and 9; a
five-seat code panel ran three rounds (Revision 4 below records what it
moved). Deviations from the tasks as written are rulings there (the empty skill
region's note, `.watch` rows in 6b, the docked `.btns` box, `wasCarded`, the
pop-out on every tier, docks that scroll, W1 = 640).

## Revision 3 (2026-09-25, panel round 3)

Reviewer A three must-fixes, Reviewer B twelve, the naysayer five; the three
accepted risks **accepted by the naysayer** (with probe numbers). Two blocks
Revision 1 had rewritten were found still in their old form (the SkillCell
idle test; a stray ChapterPanel test in 5a); they are rewritten now. And the
user's food decision landed mid-round.

- **Food is three fixed slots** (the user: "show the top 3"; "it can be
  eaten"): food on hand, in the eating order (#45, smallest heal first),
  the first three; a slot with nothing to fill it sits blank. The box is
  always three lines; a book with a dozen foods shows its next three. Spec
  4.3 and the rigidity table amended; Task 2's rule, tests and Review
  Focus 2 rewritten. This replaces Revision 2's chapter ∪ acquired rule.
- **The fresh run's skill cell is the cell's height** (naysayer O1, spec
  4.2's "empty bars"): `nothing yet` is the heading, the cell renders with
  two empty gauges. A 6b test pins the box's shape before and after the
  first press.
- **`Sheet` takes `inert`** (naysayer O2) for both the sheet and the dock,
  and App passes it; behind a card nothing in a sheet or a dock takes focus.
  Task 7's "the bottom bar stays live" is withdrawn: the bar's wrapper keeps
  `inert` behind a card as today, its controls placeholders (Reviewer B M9).
- **The `actions` pin is `12ch + 18px`** (naysayer O3: at 12px Menlo two
  digits need 98.5px and `11ch + 16px` is 95.4), and Task 8 looks at 360
  wide, where the bar has 4px to spare.
- **Task 8 exercises the reason line live** (naysayer O4): a `+` on the
  pirates at 5 hp pops the queue on `hurt`, the box shows the log's line,
  and a tick later it is gone.
- **Task 5a is 5a-i and 5a-ii** (naysayer, Reviewer B): 5a-i rewrites
  `row()` and converts every case against today's markup, green by
  construction; 5a-ii is the row rewrite with its new cases and deletions.
  The ActionRow line accounting is redone case by case (Reviewer B M2):
  `:48-54`, `:178-184`, `:192-198`, `:235-249`, `:263-268` named; the
  `enough`/`hurt` cases kept minus their words; `:314-325` kept (the only pin
  on `auto--waits`); `:378-384` kept (the only test of play on a closer).
- **The desktop mockup is re-rendered with the list rows in Task 0**
  (naysayer, risk 3's cheaper move): `docs/mockups/2026-09-25-desktop-o2.html`,
  so the user sees that column before the row is built.
- **The sheets are named `skills sheet`, `actions sheet`, `pack sheet`**
  (Reviewer B M8: the pack sheet and the pack region both read `pack` to
  `getByLabelText`); 6b's role queries use those names; the band keeps its
  `roster` rename.
- **`entry--on` follows `working`, not the top** (Reviewer B M10, App.test
  :94-102): paused with `working === -1`, every entry is a line; the
  three-line shape is the entry at `working` only, its label blank while not
  live.
- **Every cost on the running entry is written, always** (Reviewer B M5:
  `shortfall` is null while the pack covers the next unit, so the plan's
  test could not pass): `scrap 1/8` on the tags line for each cost, `warn`
  only when it is the shortfall; the test asserts the line, not the warn.
- **Task 0 keeps one wrapper**: the bottom bar's (`App.test:106`); `.watch`
  carries `inert` for the rest, so the `.watch` list is
  `['skills', 'rates', 'food', 'queue', 'log']` (Reviewer B M9).
- **5b replaces the file's `panel()` helper** and converts its five callers
  (Reviewer B M11). **Task 3's App case reads the third cell without a
  unit** (M7) and names `:129` (N5). **`rate(0)` is `0.00`**, no sign (N3),
  shown with its test. **Task 4's `short` literal carries `amount`,
  `maker`, `gap`** (A 1, B M4). **Task 8 reads `.region--doing`** (A 2, B
  M12). **The spec's testing line drops "a waiting top"** (A 3). The
  SkillCell idle case uses `fishDef`, `newState`, `act` (B M3). The Food
  tests are the new rule's. `:130` in the death case goes (N4); the card
  narrowing uses `card &&` (N6); the two empty fences go (N7); `row()`'s
  body, `rate()`, `close` and `skillsHead` are shown (N1, N2, N3); `useTier`
  shows its imports; the sheets keep their inner region headings (the
  sheet's head is the doing line or a count; the region's is its own).
- **Accepted risk 4 (new)**: the reason line is blind to the second back-off
  of the same fight in a life. Objection (naysayer O6, by probe): `withLog`
  logs a `hurt` pop once per row per life (#74's rule), so a second `+` on
  the same fight empties the queue with no line, and the box shows its words
  with no reason. Alternative: log every back-off. Rejected: that changes
  the log's rule (#74) for every pop kind, which the user has not asked for;
  the first back-off is explained, the second is the same fight, and the
  handoff says so. **Accepted risk 5 (new)**: `at` is stamped after the
  clock advances (naysayer O7), so a pop inside a tick that also completes
  the next entry to empty names the popped row; one tick wide, the words
  still true of that tick. Alternative: stamp pops before the advance.
  Rejected: a `withLog` change for a one-tick edge nobody will see.

## Revision 2 (2026-09-25, panel round 2)

Reviewer A three must-fixes, Reviewer B fifteen, the naysayer seven and one
accepted risk sent back for its reasoning. Two of Revision 1's edits had not
reached the file (the 5a/5b split, the built row's word); they are in now.

- **`scrollbar-gutter: stable` goes in Task 0** (naysayer 1, by reading:
  it propagates to the viewport under `overflow: hidden`, so on classic
  15px scrollbars the container is 15px narrower than `innerWidth − 20`
  and `matchMedia` and `@container` would disagree in a 15px band above
  each tier; `tiers.test.ts` asserts it is absent).
- **The empty box's reason covers `short` and cannot go stale** (naysayer
  4): a `popped` **or** `short` event whose `at` is the current `runTicks`;
  a pop takes no time, so anything that ran since moved the clock.
- **Food is this chapter's rows ∪ what this life has acquired** (naysayer
  5: today's `makersOf` reads the page, not the chapter, and "on hand"
  falls to zero mid-chapter). `acquired` is monotone within a life, so a
  line appears at a chapter turn or a first acquisition and never leaves.
  Spec 4.3 amended. The user's y/n on the food rule stands.
- **Two pins** (naysayer 6): the rates line is `repeat(4, 1fr)`; the
  `actions` button has a `min-width` for two digits; the open button shows
  no ▾ (class only), so nothing widens.
- **Task 0 is a mechanics spike, not a measurement** (naysayer 9): W1 and
  W2 stay 560 and 1200, provisional, and Task 8 measures them once the
  list row and the one-line entry exist. Task 0 wraps the card in
  `<div className="veil">` from the start, so the App test's card read is
  rewritten once (Reviewer B N-24); the three inert wrappers are kept
  (Reviewer B 23).
- **6a runs after 5b** (naysayer 10, Reviewer B 25): four tasks edit
  `styles.css`; nothing runs beside anything.
- **#91 gets the away-player signal** (naysayer 11): `document.title` is
  `Continuum · idle` while the queue is empty and the game live, in 6b,
  with a jsdom test; #91 closes on that plus the on-screen three.
- **A sheet closes when a card comes up** (naysayer 3) and **the bottom bar
  outranks a sheet** (naysayer 7: the gear's panel opened under it).
- **The sheet buttons are placeholders behind a card** (Reviewer B N-27),
  as pause is.
- **The Chrome cost-flash check is dropped** (Reviewer B 2: every costing
  row on both books has its maker on its page, so `frontBlock` never
  refuses on a cost; jsdom's `unsalvaged` covers it); the `hurt` flash is
  checked on the proving ground's boar at `setHealth` 10 (N-26).
- **Every test the tasks break is named, this time by grep against the
  file**: ActionRow's fifteen non-instruction cases (Reviewer B 3);
  `ChapterPanel.test:36, :51`; `BottomBar.test:10, :29`; `Queue.test:47-52,
  :120-128`; `App.test:32`. The `row()` helper is rewritten to
  `row(id, over?, content?)` returning `el` as an element and the kept
  cases converted (Reviewer A 5, B 13).
- **The actions sheet's head is the doing line only**; `ChapterPanel`
  keeps its own `Region` head, so no prop goes dead and no head test
  breaks (Reviewer B N-22).
- **`ledger` is optional, default `'popout'`** (Reviewer B 6); the SkillCell
  tests use `fishDef` and `newState` (B 5).
- Text fixes: Task 2's Interfaces say the chapter rule (Reviewer A 3);
  Task 9 says the measured numbers (A 1, B 21); `save.test`'s `book` is the
  Salt Road alias (A 5), and a `loadSave` case pins the legacy file (B N-4);
  the paused Queue case is `working={0} live={false}` with no fill
  assertion (B 10, 11); `noop` → `vi.fn()`, `fresh` → `newState`, `N`
  from balance (B 14, 17); `fireEvent`, `within` imported (B 18, 20);
  `rate(n)` without a unit for the first three rates cells (naysayer 8);
  `topLabel` loses its unread `live` (naysayer 8).
- **Accepted risk 1 carries its numbers** (naysayer, by probe: a life is
  12–18 min of game time with 6–15 empty-queue moments, ~3 presses each).
  **Accepted risk 3 is reworded**: the desktop mockup showed the old prose
  row, so the list row in a ~470px column is **unapproved**; Task 8's Chrome
  pass at 1280 is where the user judges it, and the handoff says so.

## Revision 4 (2026-09-25, after the code panel)

Not a plan change but the record of what the code panel moved, so the
accepted risks below read against what shipped:

- **Accepted risk 4 is moot.** The reason line reads the state's own
  `events` (an idle tick keeps them), not the log, so the second back-off of
  a life shows its reason like the first; the log's one-line-per-life rule
  (#74) is untouched.
- **Accepted risk 3 is settled**: the desktop mockup did render the list row
  (`lrow`), and the live build at 1280 is in `docs/mockups/2026-09-25-live-1280.png`.
- **W1 is 640, not 560** (Task 8 measured), and a 29-character order line
  may ellipsize between 640 and 665 of content; the row's name never does
  (it wraps). The user's 696 window is tier P by design.
- **Every refusal flashes the line it names** (spec section 7 rewritten):
  the earlier "the log line for the refusal stays" was false.
- The skill cell stays on the desktop; the roster's ledgers are inline
  everywhere; the docks scroll at fixed shares; `queuedSeconds` counts a
  row's kept progress once, per tick.

## Revision 1 (2026-09-25, panel round 1)

Reviewer A three must-fixes, Reviewer B twenty-two, the naysayer seven (by
probe: a throwaway test and a 60,000-step seeded play). What changed:

- **The waiting entry is gone** (naysayer 1, by probe: `resolve` pops or
  fills every non-ready top, so `queue.length > 0 && !topWorks` never
  settles; `startBlock` never returns `hurt`, so the reason line had no
  source). Task 4 drops `entry--waits`, `waits`, `entry__why` and its test;
  Task 3's `topLabel` drops `waiting`; Task 6's nudge is idle alone. The
  empty box says why the queue emptied when the log's newest line is a pop
  (`nothing queued — the fight would have killed you`, from `narrate`).
  Spec 4.4, 4.1 and 4.6 amended; F3 stays as evidence of a state that does
  not exist.
- **A `+` press is seen** (naysayer 2): the actions sheet's head line carries
  the doing heading live, `doing · 5 · 1:29 queued`, from the same
  `queuedSeconds`; a press changes the number under the finger.
- **A CSS spike is Task 0** (naysayer 19): the shell from `window-p.html` and
  `desktop-o.html` on today's components, looked at in Chrome at 390, 696
  and 1280 before any component is rewritten. It sets W1 and W2 from
  evidence; `TIER_O_MIN` starts at **1200** (naysayer 3: 360 + 360 + 460 +
  gaps = 1196, and `overflow: hidden` clipped the actions column between
  1000 and 1196) and both are provisional until Task 0 measures.
- **`useTier` is `matchMedia` through `useSyncExternalStore`** (naysayer
  19): with `body { overflow: hidden }` the content width is the window's
  minus the padding, deterministic, so no `ResizeObserver`, no first-paint
  flash at 1280, no second decision in JS; the CSS test still keeps the two
  numbers in step.
- **The skill cell's tap follows the spec after all** (naysayer 4): on tiers
  I and P a tap opens the skills sheet; the hover ledger exists only in tier
  O; inside the sheet a tap toggles the ledger **inline under the cell**, so
  nothing 470px wide opens on a 390px screen. `SkillCell` gains
  `ledger: 'popout' | 'inline' | 'none'` and `onOpen?`. The Task 2 spec
  amendment is withdrawn.
- **A built row keeps its list** (naysayer 5), dimmed, `built` in the time
  cell; nothing under it moves. **A chipped row that runs stays receded**,
  its line lit with the ember frame, so JIT fish never jumps groups.
- **No measured heights** (naysayer 6, Reviewer B 31): sheets, scrim and
  veil are children of `.body` with `inset: 0`; `.watch` carries the inert;
  `.body--O .watch { grid-row: 1 / 3 }` (naysayer 7).
- **The health label is not a fight countdown** (naysayer 10): `left` only
  while the running row has no negative `healthRate`; a fight shows `steady`
  (the engine guards the fight).
- **Food**: the number of lines is **this chapter's foods** (on hand, or a
  row in the chapter makes it), the rule today, so chapter I shows one line
  and chapter III's canapés are not a spoiler; the height changes only at a
  chapter turn, a scene change, never mid-chapter (naysayer 11). Spec 4.3
  amended. (The user's call to reverse; see the handoff.)
- **The region is `doing`** (naysayer 13): `name="doing"`; the two tests
  that read `queue` change with it.
- **Escape has one rule** (naysayer 12): a sheet ignores Escape while any
  other `[role="dialog"]` is in the document (ledger, settings, debug close
  first, on their own handlers); `aria-modal` is dropped, since the bottom
  bar stays live.
- **Closed sheets are `hidden`**, not `inert` (Reviewer B 26: jsdom's
  `queryByRole` sees through `inert`); a test that presses a row opens the
  actions sheet first (naysayer 18; the code panel's vacuous-test-hunter is
  told).
- **Every fixture id is real** (Reviewer A 1, Reviewer B 3, 14, 20, 21):
  `hull` is the row that costs scrap and cannot run on a bare state; `net`
  the supplied one; `gate` in `pagedTestBook` the closer that waits; the
  chip case uses the file's `N` (200). `deadLife()` sets `lastVerb: 'forage'`
  (Reviewer A 2, B 1). `costOf` is inlined (B 15). `startBlock` is from
  `../engine/queue` (B 16). `RunningHead` is typed (B 9). `tiers.test.ts`
  reads the stylesheet with `?raw` (B 23) and Task 0 writes the two query
  shells it asserts (B 24).
- **Every existing test each task breaks is named** (Reviewer A 3, B 4, 5,
  6, 7, 10, 11, 17, 18, 22, 25, 27): `App.test.tsx` is in the file list of
  Tasks 2, 3, 4, 6b and 7 with the lines; ActionRow's twenty `.row__say`
  cases are listed for rewrite in Task 5a; Queue's entry-shape cases in
  Task 4; HeadLine's text-node split in `RunningHead.test` and
  `ChapterPanel.test`; `BottomBar`'s `note` goes and its three App cases
  read the top strip instead.
- **Task 5 is 5a (the row) and 5b (the groups); Task 6 is 6a (tiers, hook,
  Sheet, BottomBar) and 6b (App wiring, App tests)** (Reviewer B 34).
- **Task 8's refusal step** uses `setItem` scrap 0 **and** automation off on
  Salvage is not enough (a maker on the page supplies regardless); it uses
  the proving ground's page whose row costs an item nothing there makes
  (`?book=proving`), as Task 5a's `unsalvaged` fixture does (Reviewer B 32).

Accepted risks, each with the objection, the cheaper alternative, and why
it was rejected:

1. **Presses in the hand-driven lives** (naysayer 8). Objection: with
   `unlockOneTime: 5` and `unlockRepeatable: 200`, the first five lives
   hand-queue every one-time row, and a sheet costs open + presses + close
   against today's presses alone. Alternative: keep the rows on screen at
   696 (tier P with a docked actions column, no sheet). Rejected: the user
   chose the sheet on sight (D over B and C, then E, then P) and named the
   rows as "required, but not watched"; the sheet stays open across a burst
   of presses, and the doing count now moves in its head line, so a burst
   is one open and one close. The cost, by probe (Revision 2): a life is
   12–18 minutes of game time with 6–15 empty-queue moments of about three
   presses each, so about two extra taps every one to two minutes in the
   hand-driven lives. Revisit if the live build says otherwise.
2. **`lastVerb` in the engine** (naysayer 9). Objection: a persisted field
   for a visual need; a `useRef` in App would do for a session. Alternative:
   the ref. Rejected: a reload with an empty queue would read `nothing yet`
   until the first tick, and the spec names the field as the one state
   change; the probe confirms idle identity holds.
3. **The desktop's rows are the phone's list rows in a ~470px column**
   (naysayer 14). Alternative: a wide row form for tier O. Rejected for this
   slice: one row component at every width is the spec's rule. **The user
   has not seen this column**: mockup O drew the old prose row, two lines
   tall; the list row is about six. Task 8's Chrome pass at 1280 is where it
   is judged, and the handoff's to-test list says so; a wide form for tier O
   is the polish if the column scrolls too much.

**Goal:** one layout for the phone, the 696×793 window and the desktop, in
which what is watched is the screen and what is operated is a sheet, and
nothing moves because the game's state changed.

**Architecture:** the screen becomes three fixed rows (top strip, body, bottom
bar); the body's arrangement is one of three tiers chosen by the content width
(a `useTier` hook, mirrored by `@container` queries), and inside a tier every
region has a fixed height or a fixed share. One `Gauge` component carries every
bar. The chapter, the roster and the pack render once and are shown as sheets
(tiers I and P) or columns (tier O). One state field, `lastVerb`, lets the
skill cell keep the last skill while idle.

**Tech stack:** TypeScript strict, React 19 function components, Vite, Vitest
(jsdom for components), CSS container queries. No new dependencies.

## Global Constraints

- Nothing in `balance.ts` changes. The tier widths, sheet heights, the sheen's
  6s and every pixel are CSS or `src/ui/` constants, not tuning.
- `src/engine/` imports nothing from `src/ui/`, `src/state/` or
  `src/test-utils/`; `src/data/` imports nothing from `src/engine/`
  (`src/purity.test.ts`, `tsconfig.engine.json`). No new exemption.
- `step()` returns the same object on an idle tick; `resolve()` leaves the
  state untouched when it does nothing. `lastVerb` is written only on a tick
  that works.
- `SAVE_FORMAT` stays 1: `lastVerb` is optional on load and reconciled.
- Terms: `active/inactive`, `allowlist/blocklist`. No emoji in code, comments
  or commit messages. No `Co-Authored-By`. Spec glyphs (`⚠`, `▶`, `■`, `→`)
  are imported from `src/ui/glyphs.ts`, never typed.
- Every component test starts with `// @vitest-environment jsdom`.
- Machine gates at the end of every task: `npm run typecheck`, `npm run lint`,
  `npm test`, `npm run test:hooks`.
- Commit subjects: terse, one line, 50–72 chars.

## Review Focus

1. **A save whose `lastVerb` names a skill the book lacks** (a save from
   another book, or a renamed roster): reconcile reads `null`, the cell shows
   `nothing yet`, nothing throws. Test in Task 1.
2. **More than three foods on hand, or none**: the box is three slots either
   way; with four foods the fourth is not shown (the pack lists it); with
   none, three blank slots and `nothing to eat`. Test in Task 2.
3. **A positive or zero net rate**: the health label is blank, never `≈ … left`
   with a negative or infinite time. Test in Task 3.
4. **A queue that emptied itself** (a pop: `hurt`, `short`, `page`): the box
   keeps its size, says `nothing queued — pick an action`, and under it the
   log's reason for the pop, so the player sees why the game stopped. Test
   in Task 4.
5. **A play press on a row short of an item a row on the page makes**: play
   dispatches (the chain supplies it, spec 2026-09-24-pages 4.3) and nothing
   flashes; only a refusal `playBlock` returns flashes. Test in Task 5.

---

### Task 0: The shell as a CSS spike, looked at before anything is rewritten

**Files:**
- Modify: `src/styles.css` (`.screen`, new `.body`, `.watch`, `.sheet*`, `.scrim`, `.dock*`,
  the two `@container (min-width: …)` shells, `.item.working::after` at 6s),
  `src/ui/App.tsx` (wrap today's regions in `.body > .watch` and three
  `<section className="sheet sheet--{name}">` placeholders; no component changes)
- Create: `docs/mockups/2026-09-25-spike-390.png`, `-spike-696.png`, `-spike-1280.png`

**Interfaces:**
- Produces the shell every later task renders into: `.screen` (rows: top,
  body, bottom), `.body` (`position: relative; overflow: hidden`), `.watch`
  (the watched column), `.sheet` (absolute in `.body`, `inset: 0`, hidden
  unless `.sheet--open`), `.scrim`, `.veil` (a bare wrapper, styled in Task
  7), `.dock` (tier O columns), and the two container-query shells at
  `560px` and `1200px`, **provisional**: Task 8 measures them once the list
  row and the one-line entry exist (this spike renders today's rows, which
  cannot set W1 or W2). `body { overflow: hidden }`; `html`'s
  `scrollbar-gutter: stable` **deleted** (under `overflow: hidden` it
  propagates to the viewport and, with classic scrollbars, makes the
  container 15px narrower than the width the tier hook reads). The sheen
  at 6s.
- Produces a look at the mechanics: sticky bars, a sheet over the body, the
  veil's place, the dock columns, at three widths.

- [ ] **Step 1: The CSS**

Port the shell rules from `docs/mockups/2026-09-25-window-p.html` (lines
135–334: `.win__body`, `.region--doing`, `.sheet*`, `.scrim`) and
`2026-09-25-desktop-o.html` (`.desk__cols`, `.col*`, `.dock*`) onto the
class names above, replacing `.columns*` and the old `@container (max-width)`
blocks; today's components keep their own classes. The full set is Task 8's
Step 1 block; write it now and Task 8 only corrects it.

- [ ] **Step 2: App's wrappers**

```tsx
<main className="screen" style={tickVars}>
  <div className="top" inert={inert}>{/* today's HealthBar */}</div>
  <div className="body body--I">
    <div className="watch" inert={inert}>{/* today's SkillsBand, Rates, Food, Queue, Log, in that order, without their own .inert-wrap divs: .watch carries it */}</div>
    <section className="sheet sheet--skills" aria-label="skills sheet" inert={inert} />
    <section className="sheet sheet--actions" aria-label="actions sheet" inert={inert}>{/* today's ChapterPanel */}</section>
    <section className="sheet sheet--pack" aria-label="pack sheet" inert={inert}>{/* today's Pack */}</section>
    {(card || elsewhere !== 'none') && <div className="veil">{/* today's TabCard | FinishCard | DeathCard */}</div>}
  </div>
  <div className="inert-wrap" inert={inert}>{/* today's BottomBar */}</div>
</main>
```

One wrapper stays, the bottom bar's (`App.test:106` reads `main > .inert-wrap >
footer`); `.watch` and the three sheets carry `inert` themselves, so
`:121-123` (every region under `[inert]`) holds. `App.test:119, :144`
(`card.parentElement` has `columns__chapter`) read `.veil` from here on and
are not touched again; `:183` (`.middle > [aria-label]`) reads `.watch` and
expects `['skills', 'rates', 'food', 'queue', 'log']`. Until Task 7 styles
`.veil`, the card is a plain block at the end of the body: visible, unstyled,
in every dev build between.

Also in this task, before any row is built: **re-render the desktop mockup
with the list rows** — copy `docs/mockups/2026-09-25-desktop-o.html` to
`2026-09-25-desktop-o2.html`, replace the actions column's rows with the M1
list rows from `2026-09-25-phone-m.html` (the `lrow` markup and its CSS,
about twenty lines), screenshot it at 1280 and 1600, add it to
`docs/mockups/README.md`, and put the link in the handoff's to-test list.
The list row in a ~470px column is the one thing the user has not seen.

- [ ] **Step 3: Look**

Gates green, then the chrome-verify skill at 390×800, 696×793, 1280×820 with
the `.body--I` / `--P` / `--O` class set by hand through the console
(`document.querySelector('.body').className = 'body body--O'`) and
`.sheet--open` toggled by hand. This is a look at the **mechanics**, not a
measurement: the sticky bars, a sheet over the body under the bottom bar,
the scrim, the dock columns at 1280, the sheen at 6s, and whether the
roster's ledger pop-out clips inside `.body` (it will: it is 470px; Task 2's
`inline` mode is the answer). Screenshot each width. W1 and W2 are Task 8's.

- [ ] **Step 4: Commit**

```bash
git add src/styles.css src/ui/App.tsx src/ui/App.test.tsx docs/mockups
git commit -m "ui: the shell as a CSS spike, looked at before the rewrite"
```

---

### Task 1: `lastVerb`, the one state change

**Files:**
- Modify: `src/engine/types.ts:79-124` (`GameState`), `src/engine/queue.ts:21-50`
  (`blankRun`), `src/engine/queue.ts:293-322` (`work`), `src/engine/rebirth.ts:71-84`
  (`rebirth`), `src/state/save.ts:144-180` (`reconcile`)
- Test: `src/engine/tick.test.ts`, `src/engine/rebirth.test.ts`, `src/state/save.test.ts`

**Interfaces:**
- Produces: `GameState.lastVerb: SkillId | null` — the verb of the last row
  that did work this run; `null` on a fresh run. Kept across death. Reconciled
  to `null` when the book's roster lacks it.

- [ ] **Step 1: Failing engine tests**

`src/engine/tick.test.ts`, a new describe at the end (imports `enqueue`,
`newState`, `setPaused`, `step` and `content` are already at the top):

```ts
describe('lastVerb', () => {
  it('is null on a fresh run and becomes the verb of a row that works', () => {
    const s = setPaused(newState(content.roster), 'none');
    expect(s.lastVerb).toBeNull();
    const t = step(enqueue(s, content, 'fish'), content);
    expect(t.lastVerb).toBe('fish');
  });
  it('is untouched by an idle step, which still returns the same object', () => {
    const s = setPaused(newState(content.roster), 'none');
    expect(step(s, content)).toBe(s);
  });
});
```

`src/engine/rebirth.test.ts`, inside its describe (a dead state is built the
way its other cases build one; use the same helper):

```ts
it('keeps lastVerb across death (the cell shows the last skill of the life that ended)', () => {
  expect(rebirth(deadLife()).lastVerb).toBe('forage');
});
```

`src/state/save.test.ts`, in the reconcile describe (`midRun`, `reconcile`
and `book`, the Salt Road fixture aliased at `:9`, whose roster has `forage`,
are already in scope):

```ts
it('lastVerb: a save without it reads null; one the roster lacks reads null; one it has is kept', () => {
  const m = midRun();
  const { lastVerb: _, ...legacy } = m.state;
  expect(reconcile(legacy as GameState, book).lastVerb).toBeNull();
  expect(reconcile({ ...m.state, lastVerb: 'nosuch' }, book).lastVerb).toBeNull();
  expect(reconcile({ ...m.state, lastVerb: 'forage' }, book).lastVerb).toBe('forage');
});
it('a file from before lastVerb loads, and reads null', () => {
  const m = midRun();
  const { lastVerb: _, ...old } = m.state;
  const r = loadSave(JSON.stringify({ format: SAVE_FORMAT, bookId: book.id, bookVersion: book.version, model: { ...m, state: old } }), book);
  expect(r.kind).toBe('loaded');
  if (r.kind === 'loaded') expect(r.model.state.lastVerb).toBeNull();
});
```

- [ ] **Step 2: Run them, see them fail**

Run: `npx vitest run src/engine/tick.test.ts src/engine/rebirth.test.ts src/state/save.test.ts`
Expected: FAIL — `lastVerb` is not a property of `GameState` (typecheck) and
`toBeNull` receives `undefined`. (The `loadSave` case copies the `idleFed`
case at `save.test.ts:43-50` for the file's exact shape: `bookId`,
`bookVersion` as that case spells them.)

- [ ] **Step 3: The field**

`src/engine/types.ts`, after `lifeStartCore`:

```ts
  /** The verb of the last row that did work this run, so an idle screen can keep showing it; null on a fresh run. */
  readonly lastVerb: SkillId | null;
```

`src/engine/queue.ts` `blankRun`: add `lastVerb: null,` after `lifeStartCore,`.
In `work()`, the `next = { ...next, inventory: after.inventory, ... }` object
gains `lastVerb: action.verb,`. The early return on `before.short` stays as it
is: a tick that could not pay did no work.

`src/engine/rebirth.ts` `rebirth()`: add `lastVerb: dead.lastVerb,` beside
`automation: dead.automation`.

`src/state/save.ts` `reconcile()`, in `kept`:

```ts
    lastVerb: book.roster.some((r) => r.id === state.lastVerb) ? state.lastVerb : null,
```

- [ ] **Step 4: Fixtures that build a `GameState` by hand, and the rebirth key list**

`src/engine/rebirth.test.ts:141-143` classifies every `GameState` key as
`RESETS`, `PERSISTS` or `DERIVED` and asserts the three together are
`Object.keys(newState(roster))`: add `'lastVerb'` to `PERSISTS` (it survives
death, Step 3), and add `lastVerb: 'forage'` to `deadLife()`'s overrides
(`rebirth.test.ts:12-41`), since the "every persist field differs from fresh"
case reads `dead[k] !== fresh[k]` and both would be `null`. Run `npm run typecheck`. Every object literal typed `GameState` without
`lastVerb` fails; add `lastVerb: null` to each (expected: `src/engine/fixture.ts`
if it spreads a literal, `src/state/save.test.ts`'s `midRun` is a spread of
`newState`, so it passes; `src/ui/Debug.test.tsx` and `src/engine/property.test.ts`
build from `newState`). Do not widen the type to optional.

- [ ] **Step 5: Green, gates, commit**

Run: `npm run typecheck && npm run lint && npm test && npm run test:hooks`
Expected: all green; the tuning hook is silent (no literal was typed).

```bash
git add src/engine src/state
git commit -m "engine: lastVerb, the verb of the last row that worked"
```

---

### Task 2: The gauge, and the skill cell, food and health on it

**Files:**
- Create: `src/ui/Gauge.tsx`, `src/ui/Gauge.test.tsx`
- Modify: `src/ui/SkillCell.tsx` (the `Line` helper, the cell's title, the ledger modes),
  `src/ui/SkillsBand.tsx` (a `ledger` prop passed down), `src/ui/SkillLedger.tsx:32-34`
  (add `nextMultiplierText`; an `inline` prop that drops `position: absolute`),
  `src/ui/skill-ledger.css` (`.ledger--inline { position: static; width: auto; }`),
  `src/ui/Food.tsx`, `src/ui/HealthBar.tsx`, `src/ui/App.tsx` (the two new props at the call sites),
  `src/styles.css` (`.skill*`, `.food*`, `.health*`, new `.gauge*`)
- Test: `src/ui/SkillCell.test.tsx`, `src/ui/Food.test.tsx`, `src/ui/HealthBar.test.tsx`,
  `src/ui/SkillLedger.test.tsx`, `src/ui/App.test.tsx` (~126, ~128)
- Spec amendment: `docs/specs/2026-09-25-the-watched-screen.md` 4.3 (this chapter's foods)

**Interfaces:**
- Produces:
  ```ts
  export function Gauge({ pct, fill, resetKey, label, value, tone, tall }: {
    pct: number;                       // 0..100, clamped inside
    fill: 'core' | 'run' | 'hp';       // bone, ember, red
    resetKey: string | number;         // the fill remounts when it changes (spec 2026-09-24-screen-pass 4)
    label: ReactNode;                  // right column, top: "core Lv 0 ↑ 10s", "ready", "18s"
    value: ReactNode;                  // right column, under: "0.5/10.0", "1/5", "97 / 100"
    tone?: 'warn' | 'dim' | 'hurt' | 'good';   // the label's colour
    tall?: boolean;                    // the health bar's 16px
  }): JSX.Element
  ```
  Renders `<div class="gauge gauge--{fill}[ gauge--tall]"><div class="bar" aria-hidden><div key class="bar__fill[ bar__fill--run| bar__fill--hp]" style="width"/></div><span class="gauge__label[ gauge__label--tone]">…</span><span class="gauge__value">…</span></div>`.
  The right column's width is `--g-right`, set per region in CSS.
- Produces `nextMultiplierText(skill: SkillState, gear: number): string` in
  `SkillLedger.tsx`: `→ ×1.05 at Lv 1` — `multiplier()` with `core.level + 1`.
- `SkillCell` gains `idle?: boolean` (dimmed, no timers, `skill--idle`),
  `ledger?: 'popout' | 'inline' | 'none'` (default `'popout'`, so every
  existing render compiles) and `onOpen?: () => void`. `popout`
  is today's hover/held pop-out (tier O's docked roster); `inline` renders
  `SkillLedger` under the cell when held, no hover, no absolute box (the
  sheet); `none` renders no ledger and a click calls `onOpen` (the screen's
  cell on tiers I and P, which opens the skills sheet). `SkillsBand` gains
  `ledger` and passes it down.
- `Food` is **three fixed slots** (`FOOD_SLOTS = 3`, a `src/ui/` constant):
  the foods on hand (`count > 0`), in the eating order `foodsByHeal` already
  gives (smallest heal first, #45), the first three, then blank slots to
  three. A food eaten to zero leaves its slot blank; a fourth food waits in
  the pack. The box is three lines in every book. The note reads `n to eat`
  (the foods shown) or `nothing to eat` (`starving`, as today).
- `HealthBar` keeps its props and renders one tall `Gauge` with `label` from a
  new prop `label: ReactNode` and `value` `97 / 100`. Task 3 wraps it.

- [ ] **Step 1: Failing tests**

`src/ui/Gauge.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Gauge } from './Gauge';

describe('Gauge', () => {
  it('draws the bar on the left and the label over the value on the right, clamping the fill', () => {
    const { container } = render(<Gauge pct={140} fill="run" resetKey={1} label="18s" value="0.5/60.0" />);
    const fill = container.querySelector('.bar__fill') as HTMLElement;
    expect(fill).toHaveClass('bar__fill--run');
    expect(fill.style.width).toBe('100%');
    expect(container.querySelector('.gauge__label')).toHaveTextContent('18s');
    expect(container.querySelector('.gauge__value')).toHaveTextContent('0.5/60.0');
  });
  it('a tone colours the label; a tall gauge is the health bar', () => {
    const { container } = render(<Gauge pct={10} fill="hp" resetKey={1} label="waiting" value="31 / 100" tone="warn" tall />);
    expect(container.querySelector('.gauge')).toHaveClass('gauge--tall');
    expect(container.querySelector('.gauge__label')).toHaveClass('gauge__label--warn');
    expect(screen.getByText('31 / 100')).toBeInTheDocument();
  });
  it('a changed resetKey remounts the fill (a reset jumps, spec 2026-09-24-screen-pass 4)', () => {
    const { container, rerender } = render(<Gauge pct={80} fill="core" resetKey={0} label="" value="" />);
    const before = container.querySelector('.bar__fill');
    rerender(<Gauge pct={0} fill="core" resetKey={1} label="" value="" />);
    expect(container.querySelector('.bar__fill')).not.toBe(before);
  });
});
```

`src/ui/SkillCell.test.tsx`, added cases (the file's existing setup renders a
cell from `testBook`; reuse its helpers):

```tsx
it('is two gauges: core and run, label over value, with the next multiplier on the title line', () => {
  render(<SkillCell skill={fishDef} content={book} state={newState(book.roster)} running={false} row={null} />);
  const gauges = document.querySelectorAll('.gauge');
  expect(gauges).toHaveLength(2);
  expect(gauges[0]).toHaveTextContent(/core Lv 0/);
  expect(gauges[1]).toHaveTextContent(/run Lv 0/);
  expect(screen.getByText(/→ ×1\.\d\d at Lv 1/)).toBeInTheDocument();
});
it('idle: dimmed, no timers; ledger none: a click calls onOpen and opens nothing', async () => {
  const onOpen = vi.fn();
  render(<SkillCell skill={fishDef} content={book} state={newState(book.roster)} running={false} row={null} idle ledger="none" onOpen={onOpen} />);
  const cell = screen.getByRole('button', { name: /Fish/ });
  expect(cell).toHaveClass('skill--idle');
  expect(screen.queryByText(/↑/)).toBeNull();
  await act(() => realClick(cell));
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('ledger inline: held opens the ledger under the cell, in flow, and hover does nothing', async () => {
  render(<SkillCell skill={fishDef} content={book} state={newState(book.roster)} running={false} row={null} ledger="inline" />);
  const cell = screen.getByRole('button', { name: /Fish/ });
  fireEvent.mouseEnter(cell.parentElement!);
  expect(screen.queryByRole('dialog')).toBeNull();
  await act(() => realClick(cell));
  expect(screen.getByRole('dialog')).toHaveClass('ledger--inline');
});
```

`src/ui/Food.test.tsx`: the rule is three slots of food on hand. The six
cases at `:17-27, :28-32, :33-36, :54-59, :60-65, :66-76` that read
`.bar__value`, `.food__cooldown .bar__fill`, `food__item--none` and "no n/cap
under the food bar" are rewritten: the selectors become `.gauge__label` (the
word), `.gauge .bar__fill` (the cooldown) and `.food__row--none`; the n/cap
case inverts to assert the gauge's value **is** `have/cap`. `:37-42`
("smallest heal first") keeps its order assertion on foods on hand. `:43-53`
("hides a food nobody makes") becomes "a food not on hand is not shown, maker
or no maker". Add:

```tsx
it('each food is a gauge: name and heal on a line, the ember cooldown, the word over have/cap', () => {
  render(<Food state={fresh()} content={book} />);
  const g = document.querySelector('[data-item="fish"] .gauge')!;
  expect(g.querySelector('.gauge__label')).toHaveTextContent('none');
  expect(g.querySelector('.gauge__value')).toHaveTextContent(`0/${balance.inventory.stackCap}`);
  expect(screen.getByLabelText('food').querySelector('.region__head')).toHaveTextContent(/food/);
});
it('is three slots: nothing on hand is three blank slots and nothing to eat', () => {
  render(<Food state={fresh()} content={book} />);
  expect(screen.getByLabelText('food').querySelectorAll('.food__slot')).toHaveLength(3);
  expect(screen.getByLabelText('food').querySelectorAll('.food__row')).toHaveLength(0);
  expect(screen.getByText('nothing to eat')).toBeInTheDocument();
});
it('the note counts foods on hand: 1 to eat, and the other two slots are blank', () => {
  render(<Food state={{ ...fresh(), inventory: { fish: 2 } }} content={book} />);
  expect(screen.getByText('1 to eat')).toBeInTheDocument();
  expect(document.querySelectorAll('.food__row')).toHaveLength(1);
  expect(document.querySelectorAll('.food__slot--blank')).toHaveLength(2);
});
it('a fourth food on hand is not shown; the first three in eating order are', () => {
  const four = { ...book, items: { ...book.items, a: { id: 'a', name: 'a', kind: 'food' as const, healPerUnit: 1 }, b: { id: 'b', name: 'b', kind: 'food' as const, healPerUnit: 2 }, c: { id: 'c', name: 'c', kind: 'food' as const, healPerUnit: 9 } } };
  render(<Food state={{ ...fresh(), inventory: { a: 1, b: 1, c: 1, fish: 1 } }} content={four} />);
  const names = [...document.querySelectorAll('.food__row .food__name')].map((n) => n.textContent);
  expect(names).toHaveLength(3);
  expect(names[0]).toMatch(/^a/);
  expect(names).not.toContain(expect.stringMatching(/^c/));
});
```

`src/ui/HealthBar.test.tsx`: the existing value case plus

```tsx
it('is one tall gauge with the label the caller gives', () => {
  render(<HealthBar health={97} max={100} life={1} label="idle" />);
  expect(document.querySelector('.gauge--tall')).not.toBeNull();
  expect(document.querySelector('.gauge__label')).toHaveTextContent('idle');
});
```

Every existing `HealthBar.test` case gains `label=""` (the prop is required)
and reads `.gauge__value` where it read `.health__value`. `App.test.tsx`'s
death case reads `.health__value` (~126) and the cloud-fish `.bar__value`
(~128): they become `.health .gauge__value` and `[data-item="cloud-fish"] .gauge__label`.
`SkillCell.test`'s `getByText('Lv 12')` / `getByText('Lv 5')` become
`getByText(/core Lv 12/)` / `getByText(/run Lv 5/)` (the label now carries
the ledger's name). `fireEvent` and `vi` join `SkillCell.test`'s imports.

- [ ] **Step 2: Run, see them fail**

Run: `npx vitest run src/ui/Gauge.test.tsx src/ui/SkillCell.test.tsx src/ui/Food.test.tsx src/ui/HealthBar.test.tsx`
Expected: FAIL — `./Gauge` missing; `.gauge` not found; `idle` unknown prop.

- [ ] **Step 3: `Gauge.tsx`**

```tsx
import type { ReactNode } from 'react';

/**
 * One grammar for every bar (spec 2026-09-25-the-watched-screen section 5):
 * the bar on the left, and on the right, in a column whose width the region
 * pins (--g-right), the label with its time or state over the value. Bone is
 * XP, ember is time and work, red is health. The fill is keyed on the counter
 * whose change is a reset, so a reset remounts and jumps (spec
 * 2026-09-24-screen-pass section 4).
 */
export function Gauge({ pct, fill, resetKey, label, value, tone, tall = false }: {
  pct: number; fill: 'core' | 'run' | 'hp'; resetKey: string | number; label: ReactNode; value: ReactNode;
  tone?: 'warn' | 'dim' | 'hurt' | 'good'; tall?: boolean;
}) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div className={`gauge gauge--${fill}${tall ? ' gauge--tall' : ''}`}>
      <div className="bar" aria-hidden="true">
        <div key={resetKey} className={`bar__fill${fill === 'run' ? ' bar__fill--run' : fill === 'hp' ? ' bar__fill--hp' : ''}`} style={{ width: `${width}%` }} />
      </div>
      <span className={`gauge__label${tone ? ` gauge__label--${tone}` : ''}`}>{label}</span>
      <span className="gauge__value">{value}</span>
    </div>
  );
}
```

CSS, after `.bar__value`:

```css
/* The gauge (spec 2026-09-25-the-watched-screen section 5): bar left; label over value right, in a column the region pins. */
.gauge { display: grid; grid-template-columns: minmax(0, 1fr) var(--g-right, 11ch); grid-template-rows: auto auto; gap: 0 10px; align-items: center; font-variant-numeric: tabular-nums; }
.gauge .bar { grid-row: 1 / 3; }
.gauge--tall .bar { height: var(--bar-health); }
.gauge__label, .gauge__value { font-size: 11px; text-align: right; white-space: nowrap; color: var(--ink-2); }
.gauge__label b { color: var(--ink); font-weight: 400; }
.gauge__label--warn { color: var(--warn); } .gauge__label--dim { color: var(--ink-3); } .gauge__label--hurt { color: var(--hurt-text); } .gauge__label--good { color: var(--good); }
.gauge--tall .gauge__value { font-size: 13px; font-weight: 700; color: var(--ink); }
.gauge--tall .gauge__value small { font-weight: 400; color: var(--ink-2); }
```

Add `--ink-3: oklch(62% 0.01 80);` to `:root` (a dimmer text, the mockups' third grey).

- [ ] **Step 4: The skill cell on the gauge**

`SkillCell.tsx`: delete `Line`; the cell body becomes

```tsx
<div className="skill__title">
  <span><b>{skill.name}</b> <span className="skill__mult">{multiplierText(s, gear)}</span>{running && <span className="visually-hidden">running</span>}</span>
  <span className="skill__to">{nextMultiplierText(s, gear)}</span>
</div>
<Gauge fill="core" pct={pctOf(s.core, coreCost)} resetKey={s.core.level}
  label={<>core Lv {s.core.level}{running && <b> {'↑'} {countdown((coreCost - s.core.exp) / perSecond)}</b>}</>}
  value={fraction(s.core.exp, coreCost)} />
<Gauge fill="run" pct={pctOf(s.run, runCost)} resetKey={`${state.life}:${s.run.level}`}
  label={<>run Lv {s.run.level}{running && <b> {'↑'} {countdown((runCost - s.run.exp) / perSecond)}</b>}</>}
  value={fraction(s.run.exp, runCost)} />
```

with `coreCost = expToNextLevel(balance.skills.coreMastery.baseExp, s.core.level)`,
`runCost` likewise for `runMastery`, `pctOf = (l: Ledger, cost: number) => (l.exp / cost) * 100`.
The cell's class gains `skill--idle` when `idle`; `idle` suppresses the timers
even if `running` were true (it never is). The icon stays in its column: the
cell grid becomes `grid-template-columns: 1.6em 1fr` with the title and both
gauges in column 2 (`.skill__title { display: flex; justify-content: space-between; }`,
`.skill .gauge { grid-column: 2; --g-right: 15ch; }`, `.skill--idle { opacity: .7; }`).
`nextMultiplierText` in `SkillLedger.tsx`:

```ts
/** The multiplier the next core level gives, the cell's title-line promise: "→ ×1.05 at Lv 1". */
export function nextMultiplierText(skill: SkillState, gear: number): string {
  const up = { ...skill, core: { ...skill.core, level: skill.core.level + 1 } };
  return `${ARROW} ×${multiplier(up, gear).toFixed(2)} at Lv ${up.core.level}`;
}
```

(`ARROW` from `./glyphs`.) `SkillsBand.tsx` is unchanged here; it moves into
the sheet in Task 6.

- [ ] **Step 5: Food and health on the gauge**

`Food.tsx`: `const shown = foodsByHeal(content).filter((it) => count(state.inventory, it.id) > 0).slice(0, FOOD_SLOTS)`
and `const blanks = FOOD_SLOTS - shown.length`; the region renders `shown`
then `blanks` × `<div className="food__slot food__slot--blank" aria-hidden="true" />`;
every shown row is also `.food__slot`. Per food a `.item food__row food__slot` (plus `food__row--none`) with
`<div className="food__name">{it.name}<b>+{it.healPerUnit} hp</b></div>` and
`<Gauge fill="run" pct={cooling * 100} resetKey={state.life} label={word} value={`${have}/${cap}`} tone={none ? 'dim' : undefined} />`
where `have = count(state.inventory, it.id)` and `cap = capOf(state, content, it.id)`
(`capOf` from `../engine/effects`). The note: `toEat = foods.filter((f) => count(...) > 0).length`;
`note = foods.length === 0 ? undefined : starving ? <span className="hurt-text">nothing to eat</span> : <span>{toEat} to eat</span>`.
CSS: `.food__row { display: grid; gap: 2px; padding: 5px 8px; } .food__name b { color: var(--good); font-weight: 400; margin-left: 4px; } .food .gauge { --g-right: 7ch; }`;
delete `.food__item*` and `.food__cooldown`.

`HealthBar.tsx`: props gain `label: ReactNode; tone?: 'warn' | 'dim' | 'hurt' | 'good'`; body

```tsx
<Region name="health" className="health" head={null}>
  <Gauge fill="hp" pct={pct} resetKey={life} tall label={label} tone={tone} value={<>{v.now} <small>/ {v.max}</small></>} />
</Region>
```

`.health .gauge { --g-right: 13ch; }`; delete `.health__value`. `App.tsx`
passes `label={<span>{clockNote ?? ''}</span>}` for now (Task 3 replaces it).

- [ ] **Step 6: The ledger modes, the spec amendment, green, gates, commit**

`SkillCell`: `ledger === 'none'` → no `onMouseEnter`/`onMouseLeave`, `onClick`
calls `onOpen?.()`, no `SkillLedger` ever rendered, no `aria-haspopup`;
`'inline'` → no hover handlers, held by click/Enter as today, `SkillLedger`
rendered with `inline` (class `ledger ledger--inline`, in flow after the cell
inside `.skill-slot`); `'popout'` → exactly today. `App.tsx` passes
`ledger="popout"` to the band for now (Task 6b sets it per tier).

CSS: `.food__slot { min-height: calc(12px * 1.35 + 8px + 8px + 10px); }` (a
row's two lines and padding, so a blank slot is a row's height);
`.food__slot--blank { border: 1px dashed var(--edge); border-radius: 4px; opacity: .4; }`.
The spec's 4.3 reads the three-slot rule (Revision 3). Run the four gates.

```bash
git add src/ui src/styles.css docs/specs
git commit -m "ui: the gauge; skill cell, food and health on it"
```

---

### Task 3: The top strip

**Files:**
- Create: `src/ui/TopStrip.tsx`, `src/ui/TopStrip.test.tsx`
- Modify: `src/ui/App.tsx` (the `.top` block, the label, remove `Rates`, drop the
  clock's `note`), `src/ui/BottomBar.tsx` (drop `note`), `src/ui/HealthBar.tsx` (`tone`),
  `src/ui/RunningHead.tsx` (split: `HeadLine` and the story), `src/styles.css`
  (`.top`, `.rates*`, `.head*`, `.bottom__clock--dim` goes)
- Delete: `src/ui/Rates.tsx`, `src/ui/Rates.test.tsx`
- Test: `src/ui/App.test.tsx` (:21, :103-110, :121, ~165, :186-199, and the three
  run-clock note cases), `src/ui/BottomBar.test.tsx` (the note case goes),
  `src/ui/RunningHead.test.tsx:14`, `src/ui/ChapterPanel.test.tsx:38-47`

**Interfaces:**
- Produces:
  ```ts
  export type TopLabel =
    | { kind: 'left'; seconds: number }   // ≈ 14:42 left, hurt; only while net < 0
    | { kind: 'steady' }                  // blank
    | { kind: 'idle' } | { kind: 'paused' } | { kind: 'elsewhere' }
    | { kind: 'life'; life: number };     // behind a card
  export function topLabel(a: { elsewhere: 'none' | 'held' | 'lost'; card: boolean; paused: boolean;
    queued: number; fighting: boolean; health: number; net: number; life: number }): TopLabel
  export function TopStrip({ book, head, page, health, max, life, label, decay, ceiling, row, rowBy }: {
    book: string; head: ChapterHead; page: string; health: number; max: number; life: number; label: TopLabel;
    decay: number; ceiling: number; row: number; rowBy: string | null;
  }): JSX.Element
  ```
  Renders `<div class="top">`: `<header class="region__head region__head--book head__line">` (book left; `numeral · chapter · page` right, the page span keyed on its name with class `head__page`), then `<HealthBar … label={…}/>`, then `<div class="rates" aria-label="rates">` with four cells `decay <b>−0.11</b>`, `food <b>0.00</b>`, `{rowBy ?? '—'} <b>…</b>`, `net <b>−0.11 hp/s</b>` (`rate(n)`, a new `format.ts` export that is `hpRate`
without its unit, for the first three; `hpRate` for `net`, the one that
carries `hp/s`; `hpClass` colours; a zero is `dim`).
- `RunningHead` keeps its export for the actions sheet (Task 6) but its head
  line is the new `HeadLine({ book, head, page })`, used by both.
- `topLabel` order: `elsewhere !== 'none'` → elsewhere; `card` → life;
  `paused` → paused; `queued === 0` → idle; `net < 0 && !fighting` → left
  with `seconds = health / -net`; else steady. `fighting` is "the running row
  has a negative `healthRate`": the engine guards a fight (#74), so a
  countdown through one would be a false alarm (panel round 1, naysayer 10).
  There is no `waiting`: a queued top that cannot run never settles
  (`resolve` pops or fills it; Revision 1).

- [ ] **Step 1: Failing tests**

`src/ui/TopStrip.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { testBook as book } from '../test-utils/book';
import { TopStrip, topLabel } from './TopStrip';

const head = book.chapters[0]!.head;
const strip = (label: ReturnType<typeof topLabel>, over: Partial<Parameters<typeof TopStrip>[0]> = {}) =>
  render(<TopStrip book={book.name} head={head} page="Fitting out" health={97} max={100} life={1} label={label} decay={0.11} ceiling={0} row={0} rowBy={null} {...over} />);

describe('topLabel', () => {
  const base = { elsewhere: 'none' as const, card: false, paused: false, queued: 2, fighting: false, health: 97, net: -0.11, life: 4 };
  it('orders the states: elsewhere, life, paused, idle, left, steady; a fight is never counted down', () => {
    expect(topLabel({ ...base, elsewhere: 'held' }).kind).toBe('elsewhere');
    expect(topLabel({ ...base, card: true })).toEqual({ kind: 'life', life: 4 });
    expect(topLabel({ ...base, paused: true }).kind).toBe('paused');
    expect(topLabel({ ...base, queued: 0 }).kind).toBe('idle');
    expect(topLabel(base)).toEqual({ kind: 'left', seconds: 97 / 0.11 });
    expect(topLabel({ ...base, fighting: true, net: -0.4 }).kind).toBe('steady');
    expect(topLabel({ ...base, net: 0 }).kind).toBe('steady');
    expect(topLabel({ ...base, net: 0.2 }).kind).toBe('steady');
  });
});

describe('TopStrip', () => {
  it('is the running head, the health gauge and the rates line', () => {
    strip({ kind: 'left', seconds: 882 });
    expect(screen.getByText(/Fitting out/)).toHaveClass('head__page');
    expect(screen.getByLabelText('health').querySelector('.gauge__label')).toHaveTextContent('≈ 14:42 left');
    expect(screen.getByLabelText('rates')).toHaveTextContent(/decay.*food.*net/);
  });
  it('the row cell names the running skill, or a dash', () => {
    strip({ kind: 'steady' }, { row: -0.3, rowBy: 'fight' });
    expect(screen.getByLabelText('rates')).toHaveTextContent('fight');
    strip({ kind: 'steady' });
    expect(screen.getAllByLabelText('rates')[1]).toHaveTextContent('—');
  });
  it('idle, paused, elsewhere and life read as words; steady is blank', () => {
    for (const [label, word] of [[{ kind: 'idle' }, 'idle'], [{ kind: 'paused' }, 'paused'], [{ kind: 'elsewhere' }, 'elsewhere'], [{ kind: 'life', life: 4 }, 'life 4']] as const) {
      const { unmount } = strip(label as ReturnType<typeof topLabel>);
      expect(screen.getByLabelText('health').querySelector('.gauge__label')).toHaveTextContent(word);
      unmount();
    }
    strip({ kind: 'steady' });
    expect(screen.getByLabelText('health').querySelector('.gauge__label')).toHaveTextContent('');
  });
});
```

- [ ] **Step 2: Run, see them fail**

Run: `npx vitest run src/ui/TopStrip.test.tsx`
Expected: FAIL — module missing.

- [ ] **Step 3: `TopStrip.tsx`**

```tsx
import type { ReactNode } from 'react';
import type { ChapterHead } from '../data/types';
import { clock, hpClass, hpRate, rate } from './format';
import { HeadLine } from './RunningHead';
import { HealthBar } from './HealthBar';

export type TopLabel = /* as in Interfaces */;

/** Which one word the health gauge carries (spec 2026-09-25 4.1), most urgent first. */
export function topLabel(a: { elsewhere: 'none' | 'held' | 'lost'; card: boolean; paused: boolean; queued: number; fighting: boolean; health: number; net: number; life: number }): TopLabel {
  if (a.elsewhere !== 'none') return { kind: 'elsewhere' };
  if (a.card) return { kind: 'life', life: a.life };
  if (a.paused) return { kind: 'paused' };
  if (a.queued === 0) return { kind: 'idle' };
  if (a.net < 0 && !a.fighting) return { kind: 'left', seconds: a.health / -a.net };
  return { kind: 'steady' };
}

function labelNode(l: TopLabel): { node: ReactNode; tone?: 'warn' | 'dim' | 'hurt' } {
  switch (l.kind) {
    case 'left': return { node: `≈ ${clock(l.seconds)} left`, tone: 'hurt' };
    case 'idle': case 'paused': case 'elsewhere': return { node: l.kind, tone: 'dim' };
    case 'life': return { node: `life ${l.life}`, tone: 'dim' };
    case 'steady': return { node: '' };
  }
}

export function TopStrip({ book, head, page, health, max, life, label, decay, ceiling, row, rowBy }: { /* as in Interfaces */ }) {
  const l = labelNode(label);
  const net = ceiling + row - decay;
  const cell = (name: string, n: number, unit = false) => (
    <span className="rates__cell"><span className="ink-2">{name}</span> <b className={n === 0 ? 'ink-3' : hpClass(n)}>{unit ? hpRate(n) : rate(n)}</b></span>
  );
  return (
    <div className="top">
      <HeadLine book={book} head={head} page={page} />
      <HealthBar health={health} max={max} life={life} label={l.node} tone={l.tone} />
      <div className="rates" aria-label="rates">
        {cell('decay', -decay)}{cell('food', ceiling)}{cell(rowBy ?? '—', row)}{cell('net', net, true)}
      </div>
    </div>
  );
}
```

`HeadLine` in `RunningHead.tsx`:

```tsx
export function HeadLine({ book, head, page = '' }: { book: string; head: ChapterHead; page?: string }) {
  return (
    <header className="region__head region__head--book head__line">
      <span>{book}</span>
      <span>{head.numeral} {'·'} {head.chapter}{page !== '' && <> {'·'} <span key={page} className="head__page">{page}</span></>}</span>
    </header>
  );
}
export function RunningHead(props: { book: string; head: ChapterHead; page?: string }) {
  return <><HeadLine {...props} /><p className="head__story">{props.head.story}</p></>;
}
```

`RunningHead.test.tsx:14` and `ChapterPanel.test.tsx:38-47, :51` read the
right span with `getByText('I · Port Cinder · Fitting out')`; the page is
now its own span inside it, so they read `document.querySelector('.head__line')`
with `toHaveTextContent` instead. `format.ts` gains

```ts
/** A rate without its unit, for the rates line's first three cells: the sign as hpRate writes it, and a bare 0.00 for zero. */
export function rate(n: number): string {
  return n === 0 ? n.toFixed(2) : hpRate(n).replace(' hp/s', '');
}
```

and `format.test.ts` a case: `rate(-0.3)` is `−0.30`, `rate(0.3)` is `+0.30`,
`rate(0)` is `0.00`.

CSS: `.top { position: sticky; top: 0; z-index: 4; background: var(--bg); padding: calc(10px + env(safe-area-inset-top)) 10px 6px; display: grid; gap: 4px; border-bottom: 1px solid var(--edge); }`;
`.rates { display: grid; grid-template-columns: repeat(4, 1fr); font-size: 11px; font-variant-numeric: tabular-nums; }`
(four equal cells, so `fish` → `—` → `salvage` in the third moves nothing);
`.rates__cell b { font-weight: 400; }`; `.ink-3 { color: var(--ink-3); }`;
`@keyframes turn { from { color: var(--warn); } } .head__page { animation: turn 700ms ease-out; }` under the reduced-motion guard as the sheen is;
delete `.rates__kv`, `.rates__v`, `.rates__food--*`, `.rates__blank`, `.rates--stopped`.
Delete `Rates.tsx` and its test.

- [ ] **Step 4: App**

Replace the `.top` div and the `<Rates …/>` line: compute
`net = foodCeilingPerSecond(screen, book) + row - decayPerSecond(screen)`,
`label = topLabel({ elsewhere, card: card !== null, paused: view.paused !== 'none' && elsewhere === 'none' && card === null, queued: screen.queue.length, fighting: row < 0, health: screen.health, net, life: screen.life })`,
and render `<div className="inert-wrap" inert={inert}><TopStrip book={book.name} head={chapterOf(screen, book).head} page={pageOf(screen, book).name} health={screen.health} max={screen.maxHealth} life={screen.life} label={label} decay={decayPerSecond(screen)} ceiling={foodCeilingPerSecond(screen, book)} row={row} rowBy={rowBy ?? null} /></div>`.
`App.test.tsx` `renders every chunk`: the list drops `rates` as a region;
add `expect(screen.getByLabelText('rates')).toBeInTheDocument()` after it.
The `every region is a box` case drops `rates` from its loop. The case at
:103-110 that asserts `.top` has one child and the bottom bar's children are
`['settings','run clock','pause']` is rewritten to the strip's three children
(`head__line`, `health`, `rates`); the cases at :186-199 that read `.rates`,
`rates--stopped` and `.rates__food--*` become reads of the rates line's four
cells (`decay`, `food`, the row, `net`) and their `hurt-text` / `heal-text` /
`ink-3` classes: the food-covers judgement is now the `net` cell's sign. The
case at `:152-163` ("a hurting row … rates chunk") asserts `'fight−0.30 hp/s'`;
the third cell renders `fight` and `−0.30` (no unit; only `net` carries it),
so it reads the third `.rates__cell` with `toHaveTextContent(/fight.*−0\.30/)`.
`:129` in the death case reads `.rates__food--short`: it reads the `food`
cell's `hurt-text` class instead. The three App
cases that read `'idle'` / `'paused'` on the run clock ("starts live, idle",
"queued work shows the sheen", "an empty queue refilled … not idle") read the
health gauge's label instead (`.health .gauge__label`): the clock's note moves
to the top strip, and `BottomBar` loses `note` here (its "a note dims the
clock" case is deleted, and every other `note=` in `BottomBar.test.tsx:10,
:29` goes).

- [ ] **Step 5: Green, gates, commit**

```bash
git add src/ui src/styles.css
git commit -m "ui: the top strip, running head, health gauge and rates line"
```

---

### Task 4: Doing

**Files:**
- Modify: `src/ui/Queue.tsx` (whole body), `src/ui/App.tsx` (`lastLine`),
  `src/styles.css` (`.entry*`, `.queue`)
- Test: `src/ui/Queue.test.tsx`, `src/ui/App.test.tsx` (:127 and the `queue` label reads)

**Interfaces:**
- `Queue` props are `{ state, content, working, live, dead?, onRemove, lastLine? }`:
  `lastLine?: LogLine` is the log's newest line, so an empty box can say why
  the queue emptied when that line is a pop (`narrate(lastLine.event, content).text`
  under the words, dim). There is no waiting entry: a top that cannot run
  never settles (Revision 1).
- Produces `queuedSeconds(state: GameState, content: Content): number` (exported
  for the test): the sum over entries of `(a.expCost - workOf(state, a.id).progress) / (tickExp(skills[a.verb], gearMultiplier(...)) * ticksPerSecond())`,
  a repeat counted once (spec 4.4: "at current rates").
- The region: `name="doing"` (`App.test.tsx:127` and the two `getByLabelText('queue')`
  sites change with it), `title={`doing · ${n}`}`, note `{duration(queuedSeconds)} queued`
  or `idle` (dim) when empty.
- Entry shapes: the entry at `i === working` is `.entry entry--on` (plus
  `working` while `live`): icon, name, ×; `.entry__tags` with the mode tag,
  `auto`, `to the end`, **every cost as `· scrap 1/8`** (`consumedOf` /
  amount, always written, `warn` only on the one `shortfall(state, a)`
  names); a `Gauge fill="run"` labelled by the countdown while live, blank
  otherwise, over `fraction(progress, expCost)`. When `working === -1`
  (paused with a top that would leave on resume, `App.test:94-102`) no entry
  is `entry--on`: **every** entry is `.entry entry--line` (icon, name, mode
  tag, `duration(a.expCost / rate)` dim, ×).
  No bar below the top. The look-ahead `have/target` line (`lookAheadTarget`)
  moves onto the top entry's tags line as `· 4/6 scrap`, since it is that
  entry's stopping point.
- Empty: `<div className="queue__empty">nothing queued {'—'} pick an action{why}</div>`
  where `why` is `<small>{narrate(lastLine.event, content).text}</small>` when
  `lastLine` is a `popped` **or `short`** event **and `lastLine.at === state.runTicks`**
  (a pop takes no time; anything that ran since moved the clock, so an old
  reason never blames the wrong row; Revision 2). The `short` event's shape
  is `src/engine/types.ts`'s; copy it into the test.

- [ ] **Step 1: Failing tests** (`src/ui/Queue.test.tsx`; keep the remove and
  forced-fight cases, rewrite the first case, add these)

```tsx
it('the heading is doing · n with the queued total; the top runs as a gauge; the rest are one line each with no bar', () => {
  const s = enqueue(enqueue(enqueue(fresh(), book, 'fish'), book, 'salvage'), book, 'fish');
  render(<Queue state={s} content={book} working={0} live={true} onRemove={noop} />);
  expect(screen.getByLabelText('doing').querySelector('.region__head')).toHaveTextContent(/^doing · 3/);
  expect(screen.getByText(/queued$/)).toHaveTextContent(`${duration(queuedSeconds(s, book))} queued`);
  expect(document.querySelectorAll('.entry--on .gauge')).toHaveLength(1);
  expect(document.querySelectorAll('.entry--line')).toHaveLength(2);
  expect(document.querySelectorAll('.entry--line .bar')).toHaveLength(0);
});
it('paused with the top still the worker: the shape stays, the label is blank, no sheen; paused with no worker: every entry is a line', () => {
  const s = enqueue(fresh(), book, 'hull');
  const { unmount } = render(<Queue state={s} content={book} working={0} live={false} onRemove={noop} />);
  expect(document.querySelector('.entry--on')).not.toBeNull();
  expect(document.querySelector('.entry--on')).not.toHaveClass('working');
  expect(document.querySelector('.entry--on .gauge__label')).toHaveTextContent('');
  unmount();
  render(<Queue state={s} content={book} working={-1} live={false} onRemove={noop} />);
  expect(document.querySelector('.entry--on')).toBeNull();
  expect(document.querySelectorAll('.entry--line')).toHaveLength(1);
});
it('empty: the box stays with its words, the heading says idle, and a pop this tick says why; an older one does not', () => {
  const popped = { seq: 9, at: 30, event: { type: 'popped' as const, actionId: 'raid', reason: 'hurt' as const } };
  const s = { ...fresh(), runTicks: 30 };
  const { unmount } = render(<Queue state={s} content={book} working={-1} live={true} onRemove={noop} lastLine={popped} />);
  expect(screen.getByText(/nothing queued/)).toBeInTheDocument();
  expect(screen.getByLabelText('doing').querySelector('.region__head')).toHaveTextContent(/doing · 0.*idle/);
  expect(document.querySelector('.queue__empty small')).toHaveTextContent(narrate(popped.event, book).text);
  unmount();
  render(<Queue state={{ ...s, runTicks: 31 }} content={book} working={-1} live={true} onRemove={noop} lastLine={popped} />);
  expect(document.querySelector('.queue__empty small')).toBeNull();
});
it('a short this tick says why too', () => {
  const short = { seq: 9, at: 30, event: { type: 'short' as const, actionId: 'hull', item: 'scrap', amount: 8, maker: null, gap: 'none' as const } };
  render(<Queue state={{ ...fresh(), runTicks: 30 }} content={book} working={-1} live={true} onRemove={noop} lastLine={short} />);
  expect(document.querySelector('.queue__empty small')).toHaveTextContent(narrate(short.event, book).text);
});
it('the running entry writes every cost as paid/total, the same fraction as the row, warn only on the shortfall', () => {
  const s = { ...enqueue({ ...fresh(), inventory: { scrap: 2 } }, book, 'hull'), work: { hull: { progress: 1, costsConsumed: 1 } } };
  const { unmount } = render(<Queue state={s} content={book} working={0} live={true} onRemove={noop} />);
  expect(screen.getByText(/scrap 1\/8/)).not.toHaveClass('warn');
  unmount();
  render(<Queue state={{ ...s, inventory: {} }} content={book} working={0} live={true} onRemove={noop} />);
  expect(screen.getByText(/scrap 1\/8/)).toHaveClass('warn');
});
```

(`hull` costs 8 scrap in `testBook`; the `popped` event's exact shape is in
`src/engine/types.ts:58-77`, copy it. `duration` from `./format`,
`queuedSeconds` from `./Queue`, `narrate` from `./narrate`, `LogLine` from
`../state/useGame`.) The existing cases that read `.bar__value`,
`.entry__third`, `.entry__target`, `.entry__sub` counts, `bar__fill--wait`,
`'queue · 2'`, `getAllByText('0.0/1.0')` and the countdown are rewritten:
the value is `.entry--on .gauge__value`, the countdown `.entry--on .gauge__label`,
the tags `.entry__tags`, the look-ahead `· 4/6 scrap` on the tags line, the
heading `doing · n`; the "no countdown while paused / cannot work" case
becomes the paused case above; the second entry's `0.0/1.0` is gone (one
line, no value); `Queue.test.tsx:47-52`'s exact `getByText('0/1 scrap')`
becomes a regex on the tags line (`/0\/1 scrap/`); `:120-128` (a hurt or
heal rate on an entry) are **deleted**, the entry no longer carries a rate
(the rates line does). Say in the commit which cases were deleted.

- [ ] **Step 2: Run, see them fail**

Run: `npx vitest run src/ui/Queue.test.tsx`
Expected: FAIL — `queuedSeconds` not exported; `doing` not found.

- [ ] **Step 3: Rewrite `Queue.tsx`**

Keep `remainingSeconds`. Add `queuedSeconds` (Interfaces). The body:

```tsx
const note = state.queue.length === 0 ? <span className="ink-3">idle</span> : <span>{duration(queuedSeconds(state, content))} queued</span>;
const why = lastLine !== undefined && (lastLine.event.type === 'popped' || lastLine.event.type === 'short') && lastLine.at === state.runTicks
  ? <small>{narrate(lastLine.event, content).text}</small> : null;
return (
  <Region name="doing" className="queue" title={`doing · ${state.queue.length}`} note={note}>
    {state.queue.length === 0 && <div className="queue__empty">nothing queued {'—'} pick an action{why}</div>}
    <div className="queue__list">
      {state.queue.map((e, i) => { /* top: i === 0; running = top && working === 0 && live */ })}
    </div>
  </Region>
);
```

The top, running: the existing `entry--on working` markup with the third line
replaced by `<Gauge fill="run" pct={pct} resetKey={counts[a.id] ?? 0} label={<b>{duration(remainingSeconds(state, content, e))}</b>} value={fraction(w.progress, a.expCost)} />`
and the tags line carrying, per cost, `<span key={c.item} className={owes === c.item ? 'warn' : undefined}>{'·'} {itemName(content, c.item)} {consumedOf(a, w.costsConsumed, c.item)}/{c.amount}</span>`
and, when `target !== null`, `<span className="entry__target">{'·'} {count(state.inventory, item)}/{target} {itemName(content, item, target)}</span>`.
The entry at `working` while not live: the same markup without `working`,
the gauge's label `''`; `counts` is `state.completionCounts`. With
`working === -1` no entry takes this shape. `App.test.tsx:127` reads `'queue · 0'`: it
becomes `'doing · 0'`; the two `getByLabelText('queue')` sites read `doing`.
`App.tsx` passes `lastLine={log[0]}`.
Every other entry:

```tsx
<div key={e.id} data-entry={e.id} data-mode={e.mode} data-by={e.by} className="item entry entry--line">
  <Icon aria-hidden="true" />
  <span className="entry__name"><b>{skill.name}</b> {a.noun}</span>
  <span className={`tag${e.by === 'auto' ? ' tag--auto' : ''}`}>{e.by === 'auto' ? 'auto' : e.mode}</span>
  <span className="entry__len ink-3">{duration(a.expCost / rate)}</span>
  <button type="button" className="entry__x" aria-label={`remove ${name}`} …>{'×'}</button>
</div>
```

CSS: `.queue { display: grid; grid-template-rows: auto minmax(0, 1fr); overflow: hidden; }`,
`.queue__list { overflow-y: auto; display: grid; grid-auto-rows: max-content; gap: 5px; align-content: start; scrollbar-width: thin; }`,
`.queue__empty { color: var(--ink-3); font-size: 11px; padding: 10px 6px; }`,
`.entry--line { grid-template-columns: 1.4em 1fr auto auto auto; gap: 0 8px; padding: 5px 8px; }`,
`.entry--line .entry__name b { font-weight: 400; }`, `.queue__empty small { display: block; color: var(--ink-3); margin-top: 4px; }`,
`.entry--on .gauge { grid-column: 1 / -1; --g-right: 9ch; }`; delete `.entry__bar`,
`.entry__third`.

- [ ] **Step 4: Green, gates, commit**

```bash
git add src/ui src/styles.css
git commit -m "ui: doing, the queue with one running gauge and one line per order"
```

---

### Task 5a-i: The ActionRow test helper returns the element

**Files:**
- Test: `src/ui/ActionRow.test.tsx` only

**Interfaces:**
- Produces the helper every later case uses:

```ts
function row(id: string, over: Partial<GameState> = {}, content: Book = book, running = false) {
  const spies = { onNow: vi.fn(), onQueue: vi.fn(), onAutomate: vi.fn() };
  const state = { ...newState(content.roster), ...over };
  const r = render(<ActionRow action={content.actions[id]!} content={content} state={state} running={running} {...spies} />);
  const el = r.container.querySelector('.row') as HTMLElement;
  const rerenderWith = (next: Partial<GameState>, run = running) =>
    r.rerender(<ActionRow action={content.actions[id]!} content={content} state={{ ...state, ...next }} running={run} {...spies} />);
  return { ...r, ...spies, el, rerenderWith };
}
```

- [ ] **Step 1: Rewrite the helper and convert every case, against today's markup**

Replace `row(state, id, running = false, content = book)` (`:26-32`, `el` a
function) with the helper above and convert every call in the file: `row(fresh(), 'hull')`
→ `row('hull')`; `row(fresh(), 'hull', false, unsalvaged)` → `row('hull', {}, unsalvaged)`;
`row(earned(fresh(), 'salvage', N), 'salvage')` → `row('salvage', earned(fresh(), 'salvage', N))`;
`row(s, 'hull', true)` → `row('hull', s, book, true)`; every `el()` → `el`.
No component changes; every assertion stays as it is.

- [ ] **Step 2: Green, gates, commit**

Run: `npx vitest run src/ui/ActionRow.test.tsx` — green, the same count of
cases as before. Then the four gates.

```bash
git add src/ui/ActionRow.test.tsx
git commit -m "test: the ActionRow helper takes the id and returns the element"
```

---

### Task 5a-ii: The row

**Files:**
- Modify: `src/ui/ActionRow.tsx` (whole body), `src/ui/App.tsx` (`--fade` var goes),
  `src/styles.css` (`.row*`, new `.li*`)
- Test: `src/ui/ActionRow.test.tsx` (every case named in Step 1; the helper
  is 5a-i's), `src/ui/ChapterPanel.test.tsx:36` (a built row now lists
  `+8.0 xp`: the `not.toHaveTextContent('xp')` assertion inverts here, since
  the built row's list is this task's)

**Interfaces:**
- `ActionRow` props unchanged. `INSTRUCTION_MS`, `FADE_MS`, the instruction
  state and `row__say` go; `outputsOf` and `modeWord` stay exported.
- Produces `RowList({ action, content, state, refusedItem }: { …; refusedItem: ItemId | null })`
  (in `ActionRow.tsx`, exported): the list. A built row keeps its list,
  dimmed (`row--built`), with `built` in the time cell; its height does not
  change when it completes (Revision 1).

- [ ] **Step 1: Failing tests** (`src/ui/ActionRow.test.tsx`, on 5a-i's
  helper; lines are the file's before 5a-i, which changes only the calls)

- **deleted**: `:144-156` (words on a refused press), the whole fake-timer
  describe `:231-269` (the hold, the fade, `vi.runAllTimers` on an
  instruction, and `:263-268`'s trivial null read), `:326-336` (the
  `row__say--waits` text) and `:359-377` (`after:` via `row__say`). The `+`
  press says nothing now.
- **rewritten to the list**: `:48-54` (`/1 scrap\b/` → `/scrap 0\/1/`),
  `:57-141` ("what the row reads": `.row__c1/c2`, `.row__in/arr/out`,
  `.row__short`, `--quiet`, `need--unmet`, `getByText(/8 scrap/)`) become
  reads of `.row__list`'s `li` lines (`scrap 0/8`, `needs 3 scrap` as a
  `li--unmet` line, the outputs as `gives:` bullets); `:199-205` and
  `:337-347` (`.row__in`) read `.row__list`.
- **kept, minus their `.row__say` lines**: `:157-166` (`enough`) and
  `:167-177` (`hurt`) keep "dispatches nothing" and gain `row--refused`;
  `:178-184` and `:192-198` drop their `.row__say` reads; `:314-325` stays
  (the only pin on `auto--waits` and the chip's `; waits: …` name);
  `:378-384` stays (the only test of play on a closer with its page
  unfinished).
- **kept as they are**: every other dispatch, Shift, chip and built case.

Add:

```tsx
it('the middle is a list: needs with each cost as paid/total, gives with the xp first', () => {
  const { el } = row('hull', { inventory: { scrap: 4 } });
  const list = el.querySelector('.row__list')!;
  expect(list).toHaveTextContent(/needs:.*scrap 0\/8.*gives:.*\+\d+\.\d xp/);
  expect(el.querySelector('.row__say')).toBeNull();
});
it('a closer whose page is unfinished lists what is still required, by name', () => {
  const { el } = row('gate', {}, paged);
  expect(el.querySelector('.row__list')).toHaveTextContent(/still required:/);
  expect(el.querySelectorAll('.li--wait').length).toBeGreaterThan(0);
});
it('the same, spelled out without the helper', () => {
  render(<ActionRow action={paged.actions.gate!} content={paged} state={newState(paged.roster)} running={false} onNow={vi.fn()} onQueue={vi.fn()} onAutomate={vi.fn()} />);
  expect(document.querySelector('.row__list')).toHaveTextContent(/still required:/);
  expect(document.querySelectorAll('.li--wait').length).toBeGreaterThan(0);
});
it('a refused play flashes the row and its short cost line, rewrites nothing, and dispatches nothing', async () => {
  // unsalvaged: the file's book with no scrap maker on the page, the one way play refuses on this fixture (queue.ts frontBlock).
  const { el, onNow } = row('hull', {}, unsalvaged);
  const before = el.querySelector('.row__list')!.textContent;
  await act(() => realClick(screen.getByRole('button', { name: /do it now/ })));
  expect(onNow).not.toHaveBeenCalled();
  expect(el).toHaveClass('row--refused');
  expect(el.querySelector('.li--flash')).toHaveTextContent(/scrap/);
  expect(el.querySelector('.row__list')!.textContent).toBe(before);
});
it('a built row keeps its list, dimmed, and says built where its time was', () => {
  const { el } = row('hull', built(fresh(), 'hull'));
  expect(el).toHaveClass('row--built');
  expect(el.querySelector('.row__tx')).toHaveTextContent('built');
  expect(el.querySelector('.row__list')).toHaveTextContent(/gives:/);
});
it('a row short of an item a row on the page makes plays without a flash (the chain supplies it)', async () => {
  const { el, onNow } = row('net');
  await act(() => realClick(screen.getByRole('button', { name: /do it now/ })));
  expect(onNow).toHaveBeenCalled();
  expect(el).not.toHaveClass('row--refused');
});
```

- [ ] **Step 2: Run, see them fail**

Run: `npx vitest run src/ui/ActionRow.test.tsx`
Expected: FAIL — `.row__list` missing.

- [ ] **Step 3: Rewrite the row**

Structure:

```tsx
<div className={`item row${running ? ' row--on working' : ''}${built ? ' row--built' : ''}${refused ? ' row--refused' : ''}`} data-action={action.id} onAnimationEnd={…}>
  <Icon aria-hidden="true" />
  <span className="row__name" title={action.noun}><b>{skill.name}</b> {action.noun}{running && <span className="visually-hidden">running</span>}</span>
  <span className="row__tx">{built ? 'built' : duration(action.expCost / perSecond)}</span>
  <div className="row__ctl">{/* the three controls, unchanged markup */}</div>
  <RowList action={action} content={content} state={state} refusedItem={refusedItem} />
</div>
```

`RowList`:

```tsx
export function RowList({ action, content, state, refusedItem }: { action: ActionDefinition; content: Content; state: GameState; refusedItem: ItemId | null }) {
  const w = workOf(state, action.id);
  const waits = pageWaits(state, content, action.id);   // the rows this closer waits on (rows.ts)
  const li = (key: string, node: ReactNode, cls = '') => <div key={key} className={`li${cls}`}>{node}</div>;
  return (
    <div className="row__list">
      {(action.itemCosts.length > 0 || (action.needs ?? []).length > 0 || action.healthRate !== undefined) && <div className="li-h">needs:</div>}
      {action.itemCosts.map((c) => li(c.item, <>{itemName(content, c.item)} {consumedOf(action, w.costsConsumed, c.item)}/{c.amount}</>, refusedItem === c.item ? ' li--flash' : ''))}
      {(action.needs ?? []).map((n) => li(`need:${n.item}`, needPhrase(content, n.item, n.amount), count(state.inventory, n.item) < n.amount ? ' li--unmet' : ''))}
      {action.healthRate !== undefined && li('hp', <span className={hpClass(action.healthRate)}>{hpRate(action.healthRate)}</span>)}
      {waits.length > 0 && <div className="li-h">still required:</div>}
      {waits.map((id) => li(`wait:${id}`, rowName(content, id), ' li--wait'))}
      <div className="li-h">gives:</div>
      {li('xp', `+${action.expCost.toFixed(1)} xp`)}
      {outputsOf(content, action).map((o) => li(o, o))}
    </div>
  );
}
```

The press: `now(once)` computes `refusal = playBlock(...)`; on a refusal set
`refused = true` and `refusedItem = refusal.kind === 'short' ? refusal.item : null`;
`onAnimationEnd` clears both. `add(once)` dispatches and sets nothing (the
`+` instruction goes with the rest; the log still says what a queued fight
will do). `waits` (the chip's dashed look and aria text) stays as today.
Delete `INSTRUCTION_MS`, `FADE_MS`, `useEffect`, the instruction state;
`App.tsx` drops `--fade` from `tickVars` and the `FADE_MS` import.

CSS: `.row { display: grid; grid-template-columns: 1.6em minmax(0, 1fr) auto auto; gap: 2px 8px; align-items: start; padding: 7px 8px; }`,
`.row__name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`,
`.row__tx { font-size: 11px; font-variant-numeric: tabular-nums; }`,
`.row__ctl { display: flex; gap: 4px; --control: 30px; }`, `.row__list { grid-column: 2 / -1; font-size: 11px; line-height: 1.35; display: grid; }`,
`.li-h { color: var(--run); margin-top: 2px; }`, `.li { padding-left: 1.2em; text-indent: -1.2em; } .li::before { content: "\00b7  "; color: var(--edge-on); }`,
`.li--wait, .li--unmet { color: var(--ink); }`, `.li--flash { color: var(--hurt-text); }`,
`.row--built { opacity: .6; } .row--built .row__tx { color: var(--good); }`;
delete `.row__c1/c2/c3`, `.row__in`, `.row__needs`, `.row__short*`, `.row__arr`, `.row__out`, `.row__say*`, `.need*`.
The refusal keyframe stays; `.row--refused .li--flash` needs no keyframe, the
class comes and goes with the row's.

- [ ] **Step 4: Green, gates, commit**

```bash
git add src/ui src/styles.css
git commit -m "ui: the row as a list, one cost grammar, no instruction text"
```

---

### Task 5b: The chapter's two groups

**Files:**
- Modify: `src/ui/ChapterPanel.tsx` (live and automated groups, `RecededRow`),
  `src/styles.css` (`.group`, `.row--auto`)
- Test: `src/ui/ChapterPanel.test.tsx` (the file's `panel(state, onAutomate = noop, chapter = 0)`
  at `:13-14` is **replaced** by the one below, and its five callers at
  `:19, :23, :28, :53, :58` converted — `panel(s, noop, 1)` → `panel(s, null, noop, 1)`;
  the two cases below)

**Interfaces:**
- `ChapterPanel` props unchanged; it keeps its `Region` head (the running
  head and story). It renders two groups: **live** (rows where
  `modeOf(state, content, a) === 'off'`, built rows included) in page order,
  then, if any, `<div className="group"><span>automated · n</span><span>page · {page.name}</span></div>`
  and the **automated** rows as `RecededRow` (icon, name, `×{done}`, the lit
  chip which calls `onAutomate(id, 'off')`). **A chipped row that is running
  stays receded**, its line carrying `working` and the ember frame, so JIT
  fish never jumps groups.

- [ ] **Step 1: Failing tests** (`src/ui/ChapterPanel.test.tsx`; `balance`,
  `newState`, `book` are imported there; add `fireEvent`, `vi`)

```tsx
const N = balance.automation.unlockRepeatable;
const panel = (state: GameState, runningActionId: string | null = null, onAutomate = noop, chapter = 0) =>
  render(<ChapterPanel content={book} book={book.name} chapter={book.chapters[chapter]!} page={book.chapters[chapter]!.pages[0]!} state={state} runningActionId={runningActionId} onNow={noop} onQueue={noop} onAutomate={onAutomate} />);

it('chipped rows recede to a line under automated · n; a chipped row that runs stays there, lit', () => {
  const s = { ...newState(book.roster), automation: { fish: 'jit' as const }, completionCounts: { fish: N } };
  const { rerender } = panel(s);
  expect(screen.getByText(/automated · 1/)).toBeInTheDocument();
  const receded = document.querySelector('.row--auto')!;
  expect(receded).toHaveTextContent(new RegExp(`Fish.*×${N}`));
  expect(receded.querySelector('.auto--lit')).not.toBeNull();
  rerender(<ChapterPanel content={book} book={book.name} chapter={book.chapters[0]!} page={book.chapters[0]!.pages[0]!} state={s} runningActionId="fish" onNow={vi.fn()} onQueue={vi.fn()} onAutomate={vi.fn()} />);
  expect(document.querySelector('.row--auto')).toHaveClass('working');
  expect(document.querySelectorAll('.row:not(.row--auto)[data-action="fish"]')).toHaveLength(0);
});
it('the chip on a receded line turns the row off', () => {
  const onAutomate = vi.fn();
  panel({ ...newState(book.roster), automation: { fish: 'jit' as const }, completionCounts: { fish: N } }, null, onAutomate);
  fireEvent.click(document.querySelector('.row--auto .auto')!);
  expect(onAutomate).toHaveBeenCalledWith('fish', 'off');
});
```

- [ ] **Step 2: Run, see them fail**

Run: `npx vitest run src/ui/ChapterPanel.test.tsx`
Expected: FAIL — no `.row--auto`.

- [ ] **Step 3: The groups**

```tsx
const rows = page.order.map((id) => content.actions[id]).filter((a): a is ActionDefinition => a !== undefined);
const receded = (a: ActionDefinition) => modeOf(state, content, a) !== 'off';
const live = rows.filter((a) => !receded(a)), auto = rows.filter(receded);
return (
  <Region name="chapter" className="chapter" head={<RunningHead book={book} head={chapter.head} page={page.name} />}>
    {live.map((a) => <ActionRow key={a.id} action={a} content={content} state={state} running={a.id === runningActionId} onNow={onNow} onQueue={onQueue} onAutomate={onAutomate} />)}
    {auto.length > 0 && <div className="group"><span>automated {'·'} {auto.length}</span><span>page {'·'} {page.name}</span></div>}
    {auto.map((a) => <RecededRow key={a.id} action={a} content={content} state={state} running={a.id === runningActionId} onAutomate={onAutomate} />)}
  </Region>
);

function RecededRow({ action, content, state, running, onAutomate }: { action: ActionDefinition; content: Content; state: GameState; running: boolean; onAutomate: (id: ActionId, mode: AutoMode) => void }) {
  const skill = skillOf(content, action.verb);
  const Icon = ICONS[skill.icon];
  const mode = modeOf(state, content, action);
  return (
    <div className={`item row row--auto${running ? ' working' : ''}`} data-action={action.id}>
      <Icon aria-hidden="true" />
      <span className="row__name"><b>{skill.name}</b> {action.noun}</span>
      <span className="row__done">{'×'}{state.completionCounts[action.id] ?? 0}</span>
      <button type="button" className="auto auto--btn auto--lit" aria-label={`automation: ${modeWord(mode)}, press for off`} onClick={() => onAutomate(action.id, 'off')}><b aria-hidden="true">{modeWord(mode)}</b></button>
    </div>
  );
}
```

(`skillOf` from `../data/roster`, `ICONS` from `./icons`, `modeOf` from
`../engine/automation`, `modeWord` from `./ActionRow`.)
CSS: `.group { padding: 5px 10px 2px; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3); display: flex; justify-content: space-between; }`,
`.row--auto { padding: 4px 8px; grid-template-columns: 1.6em 1fr auto auto; color: var(--ink-2); } .row--auto .row__done { font-size: 10px; color: var(--ink-3); }`.

- [ ] **Step 4: Green, gates, commit**

```bash
git add src/ui src/styles.css
git commit -m "ui: chipped rows recede under automated, and stay there running"
```

---

### Task 6a: Tiers, the hook, the sheet, the bottom bar

**Files:**
- Create: `src/ui/tiers.ts`, `src/ui/tiers.test.ts`, `src/ui/useTier.ts`,
  `src/ui/Sheet.tsx`, `src/ui/Sheet.test.tsx`
- Modify: `src/ui/BottomBar.tsx`, `src/styles.css` (`.qbtn*`, `.btns`)
- Test: `src/ui/BottomBar.test.tsx`

**Interfaces:**
- `src/ui/tiers.ts`:
  ```ts
  /** Content widths at which the body's arrangement snaps (spec 2026-09-25 section 3). CSS's @container queries repeat them; tiers.test.ts keeps the two in step. */
  export const TIER_P_MIN = 560;    // Task 0's measurement replaces both
  export const TIER_O_MIN = 1200;
  export type Tier = 'I' | 'P' | 'O';
  export function tierFor(width: number): Tier   // < P_MIN → 'I'; < O_MIN → 'P'; else 'O'
  ```
- `useTier(): Tier` — two `matchMedia('(min-width: Npx)')` queries through
  `useSyncExternalStore`, where N is the tier width plus the screen's 20px
  of side padding (`body { overflow: hidden }` makes the content width the
  window's minus that padding, deterministic, so the CSS container query and
  the hook agree by construction and there is no first-paint flash). `'I'`
  wherever `matchMedia` is undefined (jsdom).
- `Sheet`:
  ```ts
  export type SheetName = 'skills' | 'actions' | 'pack';
  export function Sheet({ name, open, docked, inert, onClose, head, children }: {
    name: SheetName; open: boolean; docked: boolean; inert?: boolean; onClose: () => void; head: ReactNode; children: ReactNode;
  }): JSX.Element
  ```
  Docked (tier O): `<section className="dock dock--{name}" aria-label={`${name} sheet`} inert={inert}>{head}{children}</section>`, no scrim.
  Not docked: `<div className="scrim" hidden={!open} onClick={onClose} />` and
  `<section className={`sheet sheet--${name}${open ? ' sheet--open' : ''}`} role="dialog" aria-label={`${name} sheet`} hidden={!open} inert={inert}>` with the grip, `head`, children;
  the label is `pack sheet`, not `pack`, because the pack region inside it is
  labelled `pack` and `getByLabelText` does not filter hidden nodes;
  `hidden`, not `inert`: jsdom's role queries see through `inert` (panel round
  1, Reviewer B 26). No `aria-modal`: the bottom bar stays live. Escape closes
  when open **unless another `[role="dialog"]` is in the document** (a ledger,
  the settings panel, the debug overlay close first on their own handlers);
  document keydown, as `Settings` does.
- `BottomBar` props (after Task 3 dropped `note`) gain `sheet: SheetName | null; onSheet: (s: SheetName | null) => void; actionsCount: number; nudge: boolean; docked: boolean`.
  Three buttons between the clock and pause (`skills`, `actions · n`, `pack`;
  `aria-expanded`, class `qbtn--open` on the open one, `qbtn--waits` on
  `actions` when `nudge`), rendered only when `!docked`.

- [ ] **Step 1: Failing tests**

`src/ui/tiers.test.ts` (node environment; reads the stylesheet through Vite's
`?raw`, typed by `vite/client` in `src/vite-env.d.ts`; there is no `@types/node`):

```ts
import { describe, expect, it } from 'vitest';
import css from '../styles.css?raw';
import { TIER_O_MIN, TIER_P_MIN, tierFor } from './tiers';

describe('tiers', () => {
  it('names the tier by width', () => {
    expect(tierFor(0)).toBe('I'); expect(tierFor(TIER_P_MIN - 1)).toBe('I');
    expect(tierFor(TIER_P_MIN)).toBe('P'); expect(tierFor(TIER_O_MIN - 1)).toBe('P');
    expect(tierFor(TIER_O_MIN)).toBe('O');
  });
  it('the stylesheet snaps at the same two widths (Task 0 wrote the shells), and reserves no scrollbar gutter', () => {
    expect(css).not.toContain('scrollbar-gutter');
    expect(css).toContain(`@container (min-width: ${TIER_P_MIN}px)`);
    expect(css).toContain(`@container (min-width: ${TIER_O_MIN}px)`);
  });
});
```

`src/ui/Sheet.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Sheet } from './Sheet';

describe('Sheet', () => {
  it('closed: inert and its scrim hidden; open: a modal dialog; Escape and the scrim close it', () => {
    const onClose = vi.fn();
    const { rerender } = render(<Sheet name="pack" open={false} docked={false} onClose={onClose} head={<b>pack</b>}><p>items</p></Sheet>);
    expect(screen.queryByRole('dialog', { name: 'pack sheet' })).toBeNull();   // hidden
    rerender(<Sheet name="pack" open docked={false} onClose={onClose} head={<b>pack</b>}><p>items</p></Sheet>);
    expect(screen.getByRole('dialog', { name: 'pack sheet' })).toBeVisible();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(document.querySelector('.scrim')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
  it('Escape is ignored while another dialog is open (a ledger closes first)', () => {
    const onClose = vi.fn();
    render(<><div role="dialog" aria-label="ledger" /><Sheet name="pack" open docked={false} onClose={onClose} head={<b>pack</b>}><p>items</p></Sheet></>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
  it('docked: a plain column, no dialog, no scrim', () => {
    render(<Sheet name="skills" open={false} docked onClose={() => {}} head={<b>skills</b>}><p>cells</p></Sheet>);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('.scrim')).toBeNull();
    expect(screen.getByLabelText('skills sheet')).toBeVisible();
  });
  it('inert reaches the sheet and the dock', () => {
    const { rerender } = render(<Sheet name="pack" open docked={false} inert onClose={() => {}} head={<b>pack</b>}><p>items</p></Sheet>);
    expect(document.querySelector('.sheet')).toHaveAttribute('inert');
    rerender(<Sheet name="pack" open={false} docked inert onClose={() => {}} head={<b>pack</b>}><p>items</p></Sheet>);
    expect(document.querySelector('.dock')).toHaveAttribute('inert');
  });
});
```

`src/ui/BottomBar.test.tsx`, added (`fireEvent` and `vi` join its imports):

```tsx
it('three sheet buttons; the open one is expanded; actions carries its count and the nudge', () => {
  const onSheet = vi.fn();
  render(<BottomBar clockSeconds={0} live card={false} onPause={noop} onResume={noop} onErase={noop} sheet="actions" onSheet={onSheet} actionsCount={4} nudge docked={false} />);
  expect(screen.getByRole('button', { name: /actions/ })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('button', { name: /actions/ })).toHaveTextContent('4');
  expect(screen.getByRole('button', { name: /actions/ })).toHaveClass('qbtn--waits');
  fireEvent.click(screen.getByRole('button', { name: 'skills' }));
  expect(onSheet).toHaveBeenCalledWith('skills');
  fireEvent.click(screen.getByRole('button', { name: /actions/ }));
  expect(onSheet).toHaveBeenCalledWith(null);
});
it('docked: no sheet buttons', () => {
  render(<BottomBar clockSeconds={0} live card={false} onPause={noop} onResume={noop} onErase={noop} sheet={null} onSheet={noop} actionsCount={4} nudge={false} docked />);
  expect(screen.queryByRole('button', { name: 'skills' })).toBeNull();
});
it('behind a card the three are placeholders, as pause is', () => {
  render(<BottomBar clockSeconds={0} live={false} card onPause={noop} onResume={noop} onErase={noop} sheet={null} onSheet={noop} actionsCount={4} nudge={false} docked={false} />);
  expect(screen.queryByRole('button', { name: 'skills' })).toBeNull();
  expect(document.querySelectorAll('.qbtn--placeholder')).toHaveLength(3);
});
```

- [ ] **Step 2: Run, see them fail**

Run: `npx vitest run src/ui/tiers.test.ts src/ui/Sheet.test.tsx src/ui/BottomBar.test.tsx`
Expected: FAIL — modules missing.

- [ ] **Step 3: `tiers.ts`, `useTier.ts`, `Sheet.tsx`, `BottomBar`**

`useTier`:

```ts
import { useSyncExternalStore } from 'react';
import { TIER_O_MIN, TIER_P_MIN, tierFor, type Tier } from './tiers';

/** The screen's side padding, twice: the content width is the window's less this (body never scrolls). Mirrors .screen's padding in styles.css. */
const SCREEN_PADDING = 20;

function subscribe(cb: () => void): () => void {
  if (typeof matchMedia === 'undefined') return () => {};
  const qs = [TIER_P_MIN, TIER_O_MIN].map((w) => matchMedia(`(min-width: ${w + SCREEN_PADDING}px)`));
  qs.forEach((q) => q.addEventListener('change', cb));
  return () => qs.forEach((q) => q.removeEventListener('change', cb));
}
function read(): Tier {
  if (typeof matchMedia === 'undefined') return 'I';
  return tierFor(window.innerWidth - SCREEN_PADDING);
}
export function useTier(): Tier {
  return useSyncExternalStore(subscribe, read, () => 'I');
}
```

`Sheet` as in Interfaces; the Escape listener is registered only while
`open && !docked`; it returns early when `document.querySelector('[role="dialog"]:not(.sheet)')`
is non-null (a ledger, the settings panel or the debug overlay is open and
closes first on its own handler).

`BottomBar`: between the clock and pause,

```tsx
{!docked && (
  <span className="btns">
    {(['skills', 'actions', 'pack'] as const).map((s) => card
      ? <span key={s} className="qbtn qbtn--placeholder" aria-hidden="true" />
      : (
        <button key={s} type="button" className={`qbtn qbtn--${s}${sheet === s ? ' qbtn--open' : ''}${s === 'actions' && nudge ? ' qbtn--waits' : ''}`} aria-expanded={sheet === s} onClick={() => onSheet(sheet === s ? null : s)}>
          {s}{s === 'actions' && <small> {'·'} {actionsCount}</small>}
        </button>
      ))}
  </span>
)}
```

CSS: `.bottom { grid-template-columns: var(--control) auto 1fr var(--control); padding-bottom: calc(10px + env(safe-area-inset-bottom)); }`,
`.btns { display: flex; gap: 5px; justify-content: flex-end; }`,
`.qbtn { height: var(--control); border: 1px solid var(--edge-on); border-radius: 5px; background: transparent; color: var(--ink); font: inherit; padding: 0 8px; }`,
`.qbtn--open { border-color: var(--run); } .qbtn--waits { border-color: var(--warn); color: var(--warn); } .qbtn small { color: var(--ink-2); }`,
`.qbtn--actions { min-width: calc(12ch + 18px); }` (pinned for two digits: at
12px Menlo `actions` plus `· 10` in `small` is 98.5px with padding and border,
so `· 10` → `· 9` moves neither neighbour), `.qbtn--placeholder { visibility: hidden; }`.
The bottom bar's `z-index` becomes 6 (above a sheet's 5, so the gear's panel
opens over an open sheet, not under it).
`.bottom__clock` keeps its pin at `min-width: 7ch` (the note moved to the top strip; the `note` prop and `bottom__clock--dim` go).

- [ ] **Step 4: `Sheet.tsx`**

```tsx
import { useEffect, type ReactNode } from 'react';

export type SheetName = 'skills' | 'actions' | 'pack';

/**
 * One operated region (spec 2026-09-25 4.7): a sheet over the body on the
 * phone and in the window, a docked column on the desktop. Closed, it is
 * hidden (not inert: jsdom's role queries see through inert). Escape closes
 * it unless another dialog is open, which closes first on its own handler.
 */
export function Sheet({ name, open, docked, inert, onClose, head, children }: {
  name: SheetName; open: boolean; docked: boolean; inert?: boolean; onClose: () => void; head: ReactNode; children: ReactNode;
}) {
  useEffect(() => {
    if (!open || docked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[role="dialog"]:not(.sheet)') !== null) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, docked, onClose]);
  if (docked) return <section className={`dock dock--${name}`} aria-label={`${name} sheet`} inert={inert}>{head}{children}</section>;
  return (
    <>
      <div className="scrim" hidden={!open} onClick={onClose} />
      <section className={`sheet sheet--${name}${open ? ' sheet--open' : ''}`} role="dialog" aria-label={`${name} sheet`} hidden={!open} inert={inert}>
        <div className="sheet__grip" aria-hidden="true" />
        {head}
        <div className="sheet__list">{children}</div>
      </section>
    </>
  );
}
```

- [ ] **Step 5: Green, gates, commit**

```bash
git add src/ui src/styles.css
git commit -m "ui: tiers by matchMedia, the sheet, the bottom bar's three buttons"
```

---

### Task 6b: App's body, the skill region, the sheets wired

**Files:**
- Modify: `src/ui/App.tsx` (the body), `src/ui/SkillsBand.tsx` (`Region name="roster"`,
  `ledger` prop), `src/styles.css` (`.region--skill`, `.skill__none`, `.sheet__doing`)
- Test: `src/ui/App.test.tsx` (:21, :27, :121 the region lists, the sheets by
  `getByRole('dialog', { name: '… sheet' })` after opening them; every case
  that presses a row opens the actions sheet first; `:130` in the death case
  presses a row behind a card, which a player cannot, so that line goes;
  :183 the `.watch` list becomes `['skill', 'food', 'doing', 'log']`; the
  cases below), `src/ui/SkillsBand.test.tsx` (`roster`), `src/ui/SkillCell.test.tsx`
  (an `empty` case: two gauges, no name)

**Interfaces:**
- App: `const tier = useTier(); const [sheet, setSheet] = useState<SheetName | null>(null);` The body:
  ```tsx
  <div className={`body body--${tier}`}>
    <div className="watch" inert={inert}>{skillNow}{food}{doing}{log}</div>
    <Sheet name="skills" open={sheet === 'skills'} docked={tier === 'O'} inert={inert} onClose={close} head={skillsHead}><SkillsBand content={book} state={screen} runningSkill={runningSkill} ledger={tier === 'O' ? 'popout' : 'inline'} /></Sheet>
    <Sheet name="actions" open={sheet === 'actions'} docked={tier === 'O'} inert={inert} onClose={close} head={<div className="region__head sheet__doing"><span>doing {'\u00b7'} {screen.queue.length}</span><span>{duration(queuedSeconds(screen, book))} queued</span></div>}><ChapterPanel content={book} book={book.name} chapter={chapter} page={page} state={screen} runningActionId={runningActionId} onNow={onNow} onQueue={onQueue} onAutomate={onAutomate} /></Sheet>
    <Sheet name="pack" open={sheet === 'pack'} docked={tier === 'O'} inert={inert} onClose={close} head={<div className="region__head"><span>pack</span></div>}><Pack state={screen} content={book} /></Sheet>
  </div>
  ```
  with `const close = () => setSheet(null);` and
  `const skillsHead = <div className="region__head"><span>skills {'\u00b7'} {book.roster.length}</span><span>{runningSkill ? `${skillOf(book, runningSkill).name.toLowerCase()} is running` : ''}</span></div>;`.
  Each sheet keeps the inner region's own heading (`roster`, `chapter`,
  `pack`) under the sheet's head: the sheet's head is the count or the doing
  line, the region's is its name.
  The sheets sit inside the inert wrapper (behind a card nothing opens), and
  **a card closes any open sheet**: `useEffect(() => { if (card !== null || elsewhere !== 'none') setSheet(null); }, [card, elsewhere])`.
  The actions sheet's head is the doing line only, carrying the count and
  total live so a `+` press is seen under the finger; `ChapterPanel` keeps
  its own `Region` head (the running head and story), so no prop goes dead
  and its tests stand. **The tab's title says idle** (#91's away player):
  `useEffect(() => { document.title = nudge ? 'Continuum \u00b7 idle' : 'Continuum'; return () => { document.title = 'Continuum'; }; }, [nudge])`.
- `skillNow` is `<Region name="skill" title="skill" note={note}>` around one
  `SkillCell` for `runningSkill ?? screen.lastVerb` with `ledger={tier === 'O' ? 'popout' : 'none'}`
  and `onOpen={() => setSheet('skills')}`, `idle` when not running. When
  both are null the region holds **the same cell grid, empty**: `SkillCell`
  takes `empty?: boolean`, rendering no icon, no name, and two `Gauge`s at
  `pct={0}` with blank label and value (class `skill--empty`), so the box is
  the cell's height from the first paint and the first press moves nothing
  (naysayer O1; spec 4.2's "empty bars"). `note` is `nextMultiplierText(...)`
  for the running skill, `last used` idle, `nothing yet` empty.
- `actionsCount = page.order.filter((id) => { const a = book.actions[id]!; return modeOf(screen, book, a) === 'off' && !isDone(screen, a); }).length`;
  `nudge = live && screen.queue.length === 0`.
- `SkillsBand`'s region is `name="roster"` (class `skills`), so the sheet's
  `aria-label` `skills` is unique.

- [ ] **Step 1: Failing tests** (`src/ui/App.test.tsx`; `within` joins its
  `@testing-library/react` import)

```tsx
it('the skill region shows the running skill, keeps the last one while idle, and is the same box, empty, on a fresh run', () => {
  render(<App book={windwardRun} />);
  expect(screen.getByLabelText('skill')).toHaveTextContent('nothing yet');
  const before = screen.getByLabelText('skill').querySelectorAll('.gauge').length;
  expect(before).toBe(2);
  act(() => { window.continuum!.dispatch({ type: 'queue', actionId: 'fish' }); window.continuum!.step(2); });
  expect(screen.getByLabelText('skill')).toHaveTextContent(/Fish/);
  expect(screen.getByLabelText('skill').querySelectorAll('.gauge')).toHaveLength(before);
  act(() => { window.continuum!.dispatch({ type: 'remove', entryId: 0 }); });
  expect(screen.getByLabelText('skill')).toHaveTextContent(/last used/);
  expect(screen.getByLabelText('skill')).toHaveTextContent(/Fish/);
});
it('one sheet at a time, from the bottom bar; the actions head counts the queue live; jsdom is tier I', () => {
  render(<App book={windwardRun} />);
  fireEvent.click(screen.getByRole('button', { name: /actions/ }));
  const sheet = screen.getByRole('dialog', { name: 'actions sheet' });
  expect(within(sheet).getByText(/doing \u00b7 0/)).toBeInTheDocument();
  fireEvent.click(within(sheet).getByRole('button', { name: 'add to queue: Fish the cloud shallows' }));
  expect(within(sheet).getByText(/doing \u00b7 1/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'pack' }));
  expect(screen.queryByRole('dialog', { name: 'actions sheet' })).toBeNull();
  expect(screen.getByRole('dialog', { name: 'pack sheet' })).toBeInTheDocument();
});
it('the tab title says idle while the queue is empty and live, and Continuum otherwise', () => {
  render(<App book={windwardRun} />);
  expect(document.title).toBe('Continuum \u00b7 idle');
  act(() => { window.continuum!.dispatch({ type: 'queue', actionId: 'fish' }); });
  expect(document.title).toBe('Continuum');
});
it('a card closes an open sheet', () => {
  render(<App book={windwardRun} />);
  fireEvent.click(screen.getByRole('button', { name: 'pack' }));
  act(() => { window.continuum!.dispatch({ type: 'die' }); });
  expect(screen.queryByRole('dialog', { name: 'pack sheet' })).toBeNull();
});
it('the screen cell opens the skills sheet on a click; the band inside is the roster', async () => {
  render(<App book={windwardRun} />);
  act(() => { window.continuum!.dispatch({ type: 'queue', actionId: 'fish' }); window.continuum!.step(1); });
  await act(() => realClick(within(screen.getByLabelText('skill')).getByRole('button')));
  expect(screen.getByRole('dialog', { name: 'skills sheet' })).toBeInTheDocument();
  expect(within(screen.getByRole('dialog', { name: 'skills sheet' })).getByLabelText('roster')).toBeInTheDocument();
});
```

Every existing App case that presses a row's button (`add to queue: …`,
`do it now: …`, the chip) first does `fireEvent.click(screen.getByRole('button', { name: /actions/ }))`
and queries `within(screen.getByRole('dialog', { name: 'actions' }))`: in
jsdom the sheet is closed and `hidden`, and a press through a hidden sheet
is a press the user could not make (panel round 1, naysayer 18). The region
list in `renders every chunk` becomes `['health', 'skill', 'food', 'doing', 'log']`
on the screen plus `roster` and `chapter` inside their sheets and `pack` in
its sheet; the `.watch > [aria-label]` list is `['skill', 'food', 'doing', 'log']`.

- [ ] **Step 2: Run, see them fail**

Run: `npx vitest run src/ui/App.test.tsx`
Expected: FAIL — no `skill` region; no dialog named `actions`.

- [ ] **Step 3: Wire it**

As in Interfaces. `App.tsx` imports `useTier`, `Sheet`, `SheetName`,
`queuedSeconds`, `duration`, `nextMultiplierText`, `modeOf`, `isDone`.
CSS: `.region--skill { display: grid; gap: 4px; } .skill__none { color: var(--ink-3); font-size: 11px; padding: 10px 6px; }`.

- [ ] **Step 4: Green, gates, commit**

```bash
git add src/ui src/styles.css
git commit -m "ui: the body wired: the skill region, three sheets, the roster"
```

---

### Task 7: The cards' seat

**Files:**
- Modify: `src/ui/App.tsx` (the card block: the veil is already there from
  Task 0), `src/styles.css` (`.veil`, `.card*`, drop `.columns__chapter`)
- Test: `src/ui/App.test.tsx` (:119, :144 already read `.veil` since Task 0;
  the case below is new), `src/ui/DeathCard.test.tsx` (button class only)

**Interfaces:** none new. The card, finish card or tab card renders inside
`<div className="veil">` as the last child of `.body`, so `inset: 0` covers
exactly the body between the two bars, with no measurement (Revision 1);
`.card__begin` is full width.

- [ ] **Step 1: Failing test** (`App.test.tsx`; the file already has a death
  case that presses Begin — extend it)

```tsx
it('the card sits in a veil over the body, above the bottom bar, its button full width', () => {
  render(<App book={windwardRun} />);
  act(() => { window.continuum!.dispatch({ type: 'die' }); });
  const dialog = screen.getByRole('dialog', { name: /Life 1 ends/ });
  expect(dialog.closest('.veil')).not.toBeNull();
  expect(dialog.closest('.body')).not.toBeNull();
  expect(dialog.closest('[inert]')).toBeNull();
  expect(screen.getByLabelText('doing').closest('[inert]')).not.toBeNull();
  expect(screen.getByLabelText('actions sheet').closest('[inert]')).not.toBeNull();
  expect(screen.getByRole('button', { name: /Begin life 2/ })).toHaveClass('card__begin');
});
```

(`die` is dev-only; the test file already runs under `import.meta.env.DEV`.
If it does not, use `setHealth` then a step on a fight; copy the file's existing death case's approach.)

- [ ] **Step 2: Run, see it fail**

Run: `npx vitest run src/ui/App.test.tsx -t veil`
Expected: FAIL — `.veil` is null.

- [ ] **Step 3: The veil**

`App.test.tsx`'s death case ends with `expect(container.querySelector('[inert]')).toBeNull()`
after Begin: it stays true (the watch and the sheets lose `inert` on Begin).

App: the last child of `.body`,

```tsx
{(card !== null || elsewhere !== 'none') && (
  <div className="veil">
    {elsewhere !== 'none'
      ? <TabCard kind={elsewhere} onPlayHere={playHere} />
      : card && (card.finished
        ? <FinishCard summary={card} content={book} book={book.name} onReadAgain={() => dispatch({ type: 'begin' })} />
        : <DeathCard summary={card} content={book} onBegin={() => dispatch({ type: 'begin' })} />)}
  </div>
)}
```

The watch, the three sheets and the bottom bar's wrapper carry `inert`
behind a card, as today (pause and the three sheet buttons are
placeholders); the veil does not.
CSS: `.veil { position: absolute; inset: 0; z-index: 6; background: oklch(0% 0 0 / .55); display: grid; place-items: center; padding: 16px; }`
(`.body` is already `position: relative` from Task 0).
`.card { width: 100%; max-width: 420px; margin: 0; }`, `.card__begin { width: 100%; padding: 10px 18px; border-radius: 5px; font-size: 13px; }`;
delete `.columns__chapter*` if Task 0 left any.

- [ ] **Step 4: Green, gates, commit**

```bash
git add src/ui src/styles.css
git commit -m "ui: the cards' seat, a veil over the body above the bottom bar"
```

---

### Task 8: The layout, the sheen, rigidity in Chrome

**Files:**
- Modify: `src/styles.css` (`.screen`, `.body*`, `.watch`, `.sheet*`, `.dock*`,
  `@container` tiers, `.item.working::after`), `.claude/skills/chrome-verify/SKILL.md`
  (a rigidity step)
- Create: `docs/mockups/2026-09-25-live-390.png`, `-live-696.png`, `-live-1280.png` (the build, not a mockup)

**Interfaces:** none. This task is CSS and a Chrome pass.

- [ ] **Step 1: The grid** (Task 0 wrote this; correct what Task 0's look and
  Tasks 2–7 changed, then **measure W1 and W2 here**, now that the one-line
  entry and the list row exist: drag from 390 up until two `.watch` columns
  hold every queue name (W1), and until three columns hold the list row
  without the dock clipping (W2, expected 1196 + 20); write both into
  `tiers.ts`, the two `@container` shells and spec section 3)

```css
.screen { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; height: 100%; max-width: 1600px; margin: 0 auto; padding: 0 10px; container-type: inline-size; }
.body { display: grid; gap: 8px; padding: 8px 0; min-height: 0; overflow: hidden; position: relative; }
.watch { display: grid; gap: 8px; grid-template-rows: auto auto minmax(0, 2fr) minmax(0, 1fr); min-height: 0; }
.region--doing, .region--log { min-height: 0; overflow: hidden; display: grid; grid-template-rows: auto minmax(0, 1fr); }
.log__list { max-height: none; overflow-y: auto; }
/* Tier I: one column; the sheets over the body. */
.body--I, .body--P { grid-template-columns: minmax(0, 1fr); }
.sheet { position: absolute; left: 0; right: 0; bottom: 0; height: 80%; z-index: 5; display: none; grid-template-rows: auto auto minmax(0, 1fr); gap: 6px; padding: 6px 10px 10px; background: var(--cell); border-top: 1px solid var(--edge-on); border-radius: 12px 12px 0 0; box-shadow: 0 -12px 30px oklch(0% 0 0 / .5); }
.sheet--open { display: grid; }
.sheet__grip { width: 36px; height: 4px; border-radius: 2px; background: var(--edge-on); margin: 0 auto; }
.sheet__list { overflow-y: auto; min-height: 0; }
.scrim { position: absolute; inset: 0; z-index: 5; background: oklch(0% 0 0 / .35); }
/* Tier P: the width in pairs, 3:2. */
@container (min-width: 560px) {
  .watch { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); grid-template-rows: auto minmax(0, 1fr); }
  .sheet--skills .sheet__list { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; align-content: start; }
}
/* Tier O: three columns, the sheets docked. */
@container (min-width: 1200px) {   /* TIER_O_MIN: 360 + 360 + 460 + gaps, Task 0's number */
  .body--O { grid-template-columns: minmax(360px, 1fr) minmax(360px, 1fr) minmax(460px, 1.15fr); }
  .body--O .watch { grid-column: 1; grid-row: 1 / 3; grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 2fr) minmax(0, 1fr); }
  .body--O .region--skill { display: none; }   /* the roster column shows it lit */
  .dock { display: grid; grid-template-rows: auto minmax(0, 1fr); min-height: 0; overflow: hidden; }
  .dock--skills { grid-row: 1; grid-column: 2; }
  .dock--pack { grid-row: 2; grid-column: 2; }
  .dock--actions { grid-column: 3; grid-row: 1 / 3; }
  .body--O { grid-template-rows: minmax(0, 1fr) auto; }
}
```

Delete `.columns*`, the old `@container (max-width: …)` blocks, `.top`'s
`margin: 0 -10px`, `.screen`'s `min-width`/`min-height`, `.skills { grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)) }` (the band is a one-column list in the sheet, two-up in P, one column docked).
The sheen: `.item.working::after { … animation: sheen 6s linear infinite; }`.
`html, body, #root { height: 100%; }` already holds; `body { overflow: hidden; }`
so the page never scrolls, only the boxes.

- [ ] **Step 2: The gates, then Chrome**

Run the four gates. Then the chrome-verify skill: start `npm run dev` in the
background, open `http://localhost:5173/`, and at each of **390×800**,
**696×793** and **1280×820** (`resize_page`):

1. `window.continuum.state().lastVerb` reads `null`; the skill region says
   `nothing yet`; the top label says `idle`; `actions · n` is warn. At 390
   and 696 a click on the skill cell opens the skills sheet, and inside it a
   click on a cell opens its ledger **in flow** (nothing clipped, nothing
   wider than the sheet); at 1280 the roster is a column and hover pops the
   ledger as today.
2. Queue fish and salvage from the actions sheet (real clicks on `+`);
   `step(30)`; the top runs with a countdown; the skill region shows Fish lit
   with `↑` timers; the food gauge's word changes; the rates line's third cell
   reads `fish`.
3. **Rigidity:** with the queue at 1, record
   `[...document.querySelectorAll('.top, .region--skill, .region--food, .region--doing, .region--log, .bottom')].map(e => e.getBoundingClientRect().toJSON())`;
   queue eight more rows through the sheet; `step(200)`; remove three;
   `dispatch({ type: 'die' })`; `dispatch({ type: 'begin' })`; record again;
   every rect equal to the pixel. Save the script as the skill's step 4 bullet.
4. Each sheet opens and closes on its button, on Escape and on the scrim; the
   bottom bar is visible under an open sheet; at 1280 there are no buttons and
   three columns.
5. A refused play: on both shipped books every cost has a maker on its page,
   so play never refuses on a cost (Task 5a's fourth test; the cost-line
   flash is covered by jsdom's `unsalvaged` fixture and has no live fixture).
   Open `?book=proving`, whose fight page refuses at low health (`setHealth`
   10, the header's documented refusal; press the boar): the row flashes red,
   no words change, nothing moves.
6. `+` in the actions sheet: the sheet's head reads `doing · 1 · 4.0s queued`
   the moment the button is pressed, and `doing · 2` on the next.
6b. The reason line, live (spec 4.4; #91): at 696, `setItem` scrap 100,
   queue hull, net, satchel and sails from the sheet, `step` until the page
   turns to Pirates!, `setHealth` 5, then `+` on the pirates: the queue
   empties on the `hurt` pop and the doing box reads `nothing queued — pick
   an action` with `Backed off from Fight the harbor pirates…` under it;
   `+` a fish and `step(1)`: the line is gone.
6c. At **360** wide the bottom bar's six controls fit with a few pixels to
   spare (the `actions` pin at two digits); nothing wraps.
7. The death card: over the body, Begin never under the bottom bar at 390×667
   (`resize_page` to it).
8. A built row (complete the hull through the handle: `setItem` scrap 16,
   queue it, `step` to completion): it dims, `built` where its time was, and
   the rows under it did not move (rects before and after).
9. Console clean. Screenshot each width to `docs/mockups/2026-09-25-live-<w>.png`.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css .claude/skills/chrome-verify/SKILL.md docs/mockups
git commit -m "ui: the three tiers, sheets and docks in CSS; the sheen at 6s"
```

---

### Task 9: Docs, the tracker, the ship

**Files:**
- Modify: `README.md` (the screen paragraph), `CLAUDE.md` (the layout gotcha,
  the dev handle's note on sheets, `lastVerb`), the spec's status line, this
  plan's status line, `docs/mockups/README.md` (the live PNGs)
- Tracker (batched into the handoff's **Open**): close #62, #91, #84; comment
  #43 (the fade item done, ■ stays), #90 and #73 (the seat), #46 (the shell
  parts superseded by spec 2026-09-25); `package.json` version bump (minor:
  the screen is new).

- [ ] **Step 1: CLAUDE.md's layout gotcha**

Replace the "The layout folds rather than scrolls" bullet with: the three
tiers (`src/ui/tiers.ts`, `TIER_P_MIN` and `TIER_O_MIN` as Task 8 measured
them, 560 and 1200 until then, mirrored by `@container` queries in
`styles.css`, a test keeps them in step and keeps `scrollbar-gutter` out); the body's
fixed rows; the sheets (`Sheet.tsx`, docked in tier O); the gauge (`Gauge.tsx`,
`--g-right` per region); the row's list and `scrap 1/16`; `lastVerb`; the
sheen at 6s. Add to the dev handle's bullet that the sheets are React state,
not the handle's (open them with a click).

- [ ] **Step 2: README and the spec's status**

README: one paragraph on the screen (watched vs operated, three widths). The
spec gets `**Status:** shipped as <sha>` after the ship.

- [ ] **Step 3: `/slice-ship`**

Its list, in order: the gates, the code panel (engine-reviewer, tuning-guard,
vacuous-test-hunter, plus the generic reviewer and the naysayer), Chrome (Task
8's pass), docs, the version bump (`0.2.0` → `0.3.0`), squash, stop at the
approval gate.

## Execution handoff

Inline: Task 0 (CSS and a Chrome look, sets two numbers), Task 1 (the state
shape), Task 2 (locks the gauge idiom every later task copies), Task 6b (App
wiring, three dialogs' Escape), Task 8 (CSS and Chrome), Task 9. Subagent,
each after what it needs has landed: Task 3 (after 2), Task 4 (after 3),
Task 5a-i (after 4; a pure test refactor), Task 5a-ii (after 5a-i), Task 5b
(after 5a-ii), Task 6a (after 5b: it edits `styles.css`, as 4, 5a-ii and 5b
do, so nothing runs beside anything), Task 6b inline (after 6a), Task 7
(after 6b). Every task from 3 on touches `styles.css`; the order is the
whole order.

**The food rule is the user's** (Revision 3): three fixed slots, food on hand
in eating order, the first three.

**One thing the user sees in Task 0 and judges in Task 8** (accepted risk 3):
the desktop's actions column with the list rows, re-rendered as
`docs/mockups/2026-09-25-desktop-o2.html` in Task 0 and live at 1280 in Task
8; the handoff's to-test list names both.
