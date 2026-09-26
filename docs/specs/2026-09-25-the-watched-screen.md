# The watched screen: one layout for the phone, the window and the desktop

*2026-09-25. Issues #62, #91, #84, and the seats for #90 and #73; #43's ■ and
#46/#76's shell are superseded by this. Brainstormed with the user the same
day over sixteen mockups, A to P, in `docs/mockups/2026-09-25-*`; every look a
player sees is theirs, picked on a mockup or stated outright.*

**Status:** shipped 2026-09-25 as version 0.3.0, the squash of
`feature/phone-layout` (plan `docs/plans/2026-09-25-the-watched-screen.md`),
live screenshots in `docs/mockups/2026-09-25-live-*.png`. Amended during the
build: the screen's cell keeps its pop-out on every
tier (the user), the roster's ledgers open inline everywhere, W1 = 640.

## 1. Why

The screen was laid out to look like Increlution, for familiarity while the
game was built. The game has caught up, and the user asked for a layout that
"presents the interesting information to the player on a mobile and desktop,"
and then said what interesting is:

> here is the info I like to watch when playing: health, but the decay rates
> are as important. The skill, because I like seeing it grow and affect the
> current action. The queue, as that is what is currently being done. Picking
> actions and doing automation are required, but aren't being 'watched' as
> much as the others.

and how it must behave:

> I do not want items to bounce around. Skill should be a fixed size, at the
> top. The queue should have a max height, and after that it scrolls. Log is
> always at the bottom.

The game is played, most of the time, in a window of about **696 × 793**. That
window is the centre of gravity; the phone and the desktop are the two ends of
the same design.

## 2. The rule

**What is watched is the screen. What is operated is a button away.**

- **Watched**: health and its rates; the skill that is running, its two bars
  and their timers; the queue, running entry first; food and its cooldowns;
  the log.
- **Operated**: the chapter's rows (play, queue, the automation chip); the
  full roster of skills; the pack.

Once automation has the chips on, the operated things are rarely touched and
the watched things are all there is; the layout follows the run's own arc
instead of giving every region a fixed seat. On the phone and in the window
the operated things are **sheets** pulled up from the bottom bar; on the
desktop they are columns, because there is room.

## 3. The shell

The screen is a grid with `container-type: inline-size` (as today,
`src/styles.css`). Three tiers, switched by `@container` queries on the
content width. **Within a tier the layout is fluid**: columns are `fr` units,
so they stretch continuously and nothing rearranges. **Between tiers it
snaps**: a region changes *where* it lives, never its shape. The same
components render at every width.

```text
content width   tier   arrangement
--------------  -----  ---------------------------------------------------
under W1        I      one column: top, skill, food, doing, log; three sheets
W1 to W2        P      top; skill beside food; doing beside log, 3:2; three sheets
over W2         O      top; three columns, no sheets; capped at 1600
```

**W1 and W2 were set on the live build** once the one-line entry and the
list row existed (plan Task 8), by narrowing the window until something
clipped, as the earlier 999/1257 were. **W1 = 640**: at 630 of content the
doing column's longest one-line name ("Fight the harbor pirates") fits
exactly; ten more for a margin (the expected 560 clipped it by 41px).
**W2 = 1200**: three columns at their minimums, 360 + 360 + 460, and gaps
(1196); the list row fits its column at 1280. They are CSS numbers, not tuning (decision
#3 is about gameplay; nothing here changes a balance value). The tier is
decided in one place in JS by `matchMedia` on the window's width less the
screen's side padding, and by the same numbers in CSS container queries;
`html`'s `scrollbar-gutter: stable` goes, since the body never scrolls and
the gutter would make the two disagree on classic scrollbars.

The `min-width` floor on `.screen` and the sideways scroll under it go: the
phone tier reaches down to about 360. The **1600px cap** stays.

Every tier has the same **top strip** and **bottom bar**, both sticky, both
with `env(safe-area-inset-*)` padding so a notch or home indicator never
covers them.

## 4. The regions

Every region is a box with its heading inside (spec 2026-09-24-screen-pass
2.4, unchanged). The regions, top to bottom in tier I, and what each holds.

### 4.1 The top strip

Three lines, sticky to the window top, the game behind scrolling under it:

1. **The running head**: `THE WINDWARD RUN` left, `I · PORT CINDER · FITTING
   OUT` right. The last word is the page; a page turn changes it in place
   (one warn-coloured fade, the same `--fade` as the instruction used). The
   story line is not here; it is the actions sheet's heading.
2. **The health gauge** (section 5): the bar, and on the right a label over
   `97 / 100`. The label is one of: `≈ 14:42 left` (health over net rate,
   in hurt red, only while the net is negative and the running row does not
   hurt, since the engine guards a fight, #74; **"at this rate"**, so it is
   honest and no more); `idle`; `paused`; `elsewhere` (a held or lost tab,
   #73); `life 4` behind a card. There is no `waiting`: a queued top that
   cannot run never settles (`resolve` pops or fills it; plan Revision 1).
3. **The rates line**: `decay −0.11 · food 0.00 · rig 0.00 · net −0.11 hp/s`.
   Four equal cells (`repeat(4, 1fr)`, so the third's word changing moves
   nothing); the third is the running row's health rate by its skill's name
   (the rates chunk's existing rule), `—` when nothing runs; only `net`
   carries the unit. Colours as today: hurt red for a loss, good for a gain,
   dim for zero.

The rates region as a box is gone; this line is it.

### 4.2 The skill cell

One cell, the running skill, at the top of the body, **fixed size**. The
existing `SkillCell` look (mockup 2026-09-24 and the user's reference cell):
icon, `Rig ×1.00`, and to the right `→ ×1.05 at Lv 1` (the multiplier the
next core level gives, from `multiplier()` in `src/engine/skills.ts`, the
ledger's own number); under that two gauges, `core Lv 0 ↑ 10s` over
`0.5/10.0` and `run Lv 0 ↑ 25s` over `0.5/25.0`, the ↑ timers as the band
shows them today.

When nothing runs the cell keeps the **last skill that ran**, dimmed, timers
gone, the heading saying `last used`.
The state gains one field for this, `lastVerb: SkillId | null`, set by the
tick whenever a row does work, carried by the save (`reconcile` treats a
missing one as `null`; a fresh run's cell reads `nothing yet` with empty
bars). It is the only state change in this spec.

The cell keeps its pop-out ledger on every tier, hover or held, as the band's
cells had it (the user's call during the build, 2026-09-25: "please still have
the popup appear on the running skill"); the skills sheet opens from the bar's
button, never from the cell. On a phone the pop-out is capped at the screen's
width. Inside
the sheet, and in the desktop's docked roster column (which scrolls when the
window is short: seven cells do not fit 820px), a tap on a cell opens its
ledger **in flow under the cell**, never a pop-out wider than the screen or
clipped by the column. The screen's cell stays on the desktop tier too, so the
pop-out is there as well.

### 4.3 Food

Its own fixed section of **three slots** (the user: "books can have a million
items, we should maybe show the top 3"): the foods on hand, in the eating
order the game already uses (smallest heal first, #45), the first three; a
slot with nothing to fill it sits blank, dashed and dim. A food eaten to
zero leaves its slot blank; a fourth food waits in the pack. Each filled
slot: the name with `+4 hp` in good green, then a gauge whose bar is the
**ember cooldown** and whose label is `ready` or the countdown `3.2s`, over
`1/5` (on hand / stack); a slot with none on hand is blank, never labelled. The heading carries `1 to eat` or
`nothing to eat`. The box is three lines in every book and never changes
height.

### 4.4 Doing

The queue, renamed on the screen because here it is what is being done.
Heading `doing · 4` left and `1:29 queued` right (the sum of every entry's
remaining time at current rates: the arithmetic `Queue.tsx` already does for
the top entry's countdown, applied to every entry; nothing in the engine
times a queue, and nothing needs to).

- **The running entry** keeps its ember frame and sheen and is three lines:
  icon, name, ×; the mode tags (`once`, `auto`, `repeat`) and any need
  (`· scrap 1/16`, warn) on one line; then a gauge, `18s` over `0.5/60.0`.
- **Every other entry is one line**: icon, name, mode tag, its length
  (`20s`, dim), ×. No bar.
- **Empty**: the box stays, the same size, with `nothing queued — pick an
  action` dim inside it and the heading `idle`; when the queue emptied
  itself (the fight would have killed, a supply nothing makes, a page not
  yet turned) the reason sits under the words in the log's own wording, so
  the player sees why the game stopped. The reason is read from the state's
  own events, the tick's, which an idle tick keeps: it stays while nothing
  runs and goes the moment work moves the clock, so an old reason never
  blames a row that ran since; and it does not depend on the log, whose
  once-per-life rule for a back-off (#74) is untouched, so a second `+` on
  the same fight is explained like the first. A pop for a full stack or a
  met look-ahead says nothing: those empty the queue by design. There is no
  waiting entry: a top that cannot run never settles (plan Revision 1, by
  probe). The box has a floor of one running entry, paid for out of the log
  (section 6), so at the heights the layout serves the one thing it must
  show is never cut, and the floor fade never falls on it. A reload clears
  the state's events, so a reason does not survive one; the log line does.
- The box is a **fixed share of the height** (section 6) and the list
  scrolls inside it, with a fade at the floor when there is more.

### 4.5 Log

Always at the bottom, takes the rest of the height, scrolls inside. Unchanged
lines.

### 4.6 The bottom bar

Sticky to the window bottom: gear · run clock · `skills` · `actions · 4` ·
`pack` · pause. The count on `actions` is the rows still needing a hand (not
chipped, not done); the button is pinned wide enough for two digits. While
the game is **idle** the `actions` button takes the warn colour, and **the
tab's title reads `Continuum · idle`**, so a player on another tab sees it;
that, the health label and the doing heading are #91's signal. Behind a
card the three buttons are placeholders, as pause is. On the desktop tier
the three sheet buttons are absent.

### 4.7 The sheets

`skills`, `actions` and `pack` each pull a sheet up **over the body and
above the bottom bar**, with a scrim over the body, so the button that
opened it (marked open by colour, never by a glyph that would widen it)
closes it. One sheet at a time; Escape closes it unless another dialog (a
ledger, the settings panel) is open, which closes first; a card closes any
open sheet; the grip at the top is decoration until a drag gesture is
wanted. Heights: about 80% of the body. The top strip stays visible above
every sheet, and the bottom bar stays above the sheet.

- **skills**: the seven cells, the same component as the cell on the
  screen, in **roster order** (fixed; the lit one moves, cells do not), the
  running one lit, the rest dimmed. One across on the phone, two across in
  the window.
- **actions**: the chapter. The sheet's own head is the doing line, live
  (`doing · 5 · 1:29 queued`), so a `+` press is seen under the finger; under
  it the chapter's running head and story line, then the page's rows (section 7) flush to the sheet's edge; then a group
  line `automated · 2` / `page · fitting out` and the chipped rows receded
  under it.
- **pack**: every item with its count and stack bar as today, food included
  with its `+4 hp`; `full` in warn.

### 4.8 The cards

The death, finish and tab cards share one seat: a veil over the body (the
body inert, as today), the card centred in it **above the bottom bar** so
Begin is never under a sticky bar; the card's button full width. The words
and contents are today's cards', unchanged. The top strip keeps showing the
screen behind, which is already the next life (health full, `life 4` as the
label, rates at zero). #90's richer death screen grows inside this veil. *(Amended by spec
2026-09-25-death-overlay: the screen behind is now the life that ended.)*

## 5. The gauge

One grammar for every bar, the skill cell's:

```text
[bar ..................................]   label · timer
                                            value
```

- **The bar on the left**, filling. **On the right**, a fixed-width column:
  the label with its time or state on top, the value under it.
- The right column's width is **pinned per region** (`--g-right`), so `10s →
  9s` and `9.8 → 10.0` move nothing.
- Bone is XP; ember is time and work (cooldowns, the running entry, the run
  ledger); red is health. As today.
- Used by: health (bar 16px), the skill cell's two lines, each food, the
  running entry. Nothing else on the screen has a bar. The pack's stack bars
  keep their value-under look (`4/20`), since they are lists, not gauges.
- `.bar__fill` keeps `transition: width var(--tick)` and the reset-by-key
  rule (spec 2026-09-24-screen-pass 4); a new keyed fill for the food
  cooldown is on the life, as today.

## 6. Rigidity

Nothing on the screen changes size or place because the game's state changed.
The rules, by region:

| region | height | why it cannot move |
|---|---|---|
| top strip | fixed, three lines | every label has a pinned width |
| skill cell | fixed | one cell; idle keeps the last skill |
| food | fixed, three slots | food on hand fills them in eating order; a blank slot is a row's height |
| doing | a fixed share: `2fr` against the log's `1fr` in tier I, with a floor of one running entry (118px, `--doing-min`) on every tier; in tier P the pair splits the width 3:2 and both take the full remaining height | list scrolls inside; the floor fade never covers the running entry; empty keeps the box |
| log | the rest, after doing's floor | scrolls inside |

**Known short heights.** The floor is paid out of the log, and the body clips
what does not fit rather than scrolling: at 375×548 (a small phone in a
browser with its bars) the doing box is cut under the bottom bar and the log
is off the body; at 667×375 (a phone in landscape, tier P) only the doing
head shows; at 1280×620 the log is gone. Two blank food slots (114px of
dashed nothing) are the lever at every height, and the user decides whether
they collapse; until then these heights are known-broken, not tuned.
| bottom bar | fixed | `actions · 4` pins to two digits |

Rows in the actions sheet are as tall as their lists and **never change
height**: costs and prerequisites come from the book, and a built row keeps
its list. A refused press flashes; it rewrites nothing (section 7). Sheets
open over the body, never push it.

The **sheen** on a running item slows from 2.2s to **6s** (the user, on
seeing it: "slow down the shimmer by quite a bit"). Reduced motion turns it
off, as today.

## 7. The row

The action row, in the actions sheet and the desktop's actions column
(mockups K, L, M; the user's picks K1, then the buttons on the title line,
then M1):

```text
[icon] Tinker a trawl net          40s   [▶] [+] [5/200]
       needs:
       · scrap 0/12
       gives:
       · +40 xp
       · Fish ×1.25
```

- **Title line**: icon; the name at its 24-character budget, never
  truncated; the time; the three controls, 30–32px, pinned widths, the chip
  at its `7ch + padding` width with its earned-progress underline.
- **The middle is a list**, never prose. Headers in ember: `needs:`, `still
  required:`, `gives:`; bullets under each. `gives:` lists `+40 xp` first,
  then every output.
- **A cost line is `· scrap 1/16`: units paid so far / total.** Nothing
  else on the line. The pack holds the on-hand count; the queue entry's need
  (`scrap 1/16` on the running entry) is the same fraction. This is #84's
  answer: one grammar, one number, everywhere. `stillOwed` and `consumedOf`
  in `src/engine/rows.ts` and `costs.ts` supply it.
- **`still required:`** lists the rows that must finish first, by name, in
  book order (today's `after:` line).
- **A refused press** (play with the cost not on hand, a prerequisite
  unmet, a fight that would back off, a producer whose stack is full or
  whose look-ahead is met; a closer's play is never refused, it pulls its
  page): the row flashes red (the `refuse` animation, as today) and **the
  one line the refusal names** flashes with it, a wash of hurt-red behind
  the line for the same 700ms, since the health line is hurt-red already:
  the short cost line or unmet prerequisite, the health line for a fight,
  the `gives:` line of what the row makes. **No
  instruction text**: `row__say`, `INSTRUCTION_MS` and the fade go; the
  row's own list is the instruction. (A refusal never dispatches, so there
  is no log line for it; the code panel's naysayer corrected the earlier
  claim that one stays. Forcing a fight needs Shift, which a touch screen
  has not: filed as its own issue.) This closes #43's fade item; ■'s look is
  unchanged and #43 stays open for it alone.
- **Chipped rows recede** to one line under `automated · n`: icon, name,
  `×12` (lifetime completions), the lit chip. Tapping the chip turns it off
  and the row returns to the live group. A chipped row that runs **stays
  receded**, its line lit with the ember frame, so nothing jumps groups.
- **A built row keeps its list**, dimmed, with `built` where its time was;
  nothing under it moves.
- The **needs chip** (`needPhrase`) and a row's `healthRate` line keep their
  places in `needs:` as bullets.
- Desktop (tier O) uses the same row at the actions column's width.

## 8. The desktop (tier O)

Mockup 2026-09-25-desktop-o. One top strip. Three columns, watched to
operated left to right:

1. **skill · food · doing · log** (the phone body as it is, the skill cell
   with its pop-out included; the watch column spans both rows),
2. **skills** (all seven cells, roster order, the running one lit, ledgers
   inline; the column scrolls when the window is short: seven cells do not
   fit 820px) with **pack** under, the two at fixed shares (2:1) so the
   pack's contents never resize the roster,
3. **actions** (the chapter with story and rows, receded group under).

Bottom bar: gear · clock · pause. Columns `minmax(360px, 1fr) minmax(360px,
1fr) minmax(460px, 1.15fr)`, capped at 1600 as today; the cards' veil covers
the three columns. The mockup drew the list row in the actions column
(`desktop-o.html` renders `lrow`), and the user saw it there; the live build
at 1280 (`docs/mockups/2026-09-25-live-1280.png`) is where they judge it.

## 9. Copy

Strings this spec introduces, all the user's to change on the live build:
`doing`, `1:29 queued`, `nothing queued — pick an action`, `idle`,
`elsewhere`, `last used`, `nothing yet`, `≈ 14:42 left`, `1 to eat`,
`nothing to eat`, `needs:`, `gives:`, `still required:`, `automated · 2`,
`page · fitting out`.

## 10. What does not change

- The engine, except the `lastVerb` field (4.2). No balance value. No book
  format change. Every mechanic, every rule of resolve, the fight's
  back-off, JIT, pages: as they are.
- The debug overlay (dev only) and the dev handle.
- The guard layer; the purity test; no new exemption.
- The Salt Road fixture and `testBook`; component tests move with their
  components.

## 11. Testing

- **Component tests**, jsdom, one per component, on content by state: the
  top strip's label for each of the six states; the skill cell running,
  idle-with-last, fresh (the same box, empty); doing with 0, 1, 9 entries and
  an emptied queue's reason; food with none, one and four on hand; the
  row's list for a cost, a prerequisite, a refused press (class present,
  words unchanged); the receded group; each sheet opening and closing on
  its button and on Escape; the cards' seat.
- **Engine**: `lastVerb` set by a tick that works, untouched by one that
  does not (so `step` still returns the same object idle), saved and
  reconciled.
- **Rigidity is verified in Chrome**, not jsdom (no layout there): at 390,
  696 and 1280, drive the queue from 0 to 9 and back, open every sheet, die
  and Begin, and assert by `getBoundingClientRect` through the dev handle
  that no region's box moved. The chrome-verify skill carries the script.
- Property test, play, measure: untouched and green.

## 12. Mockups

`docs/mockups/2026-09-25-phone.html` (A–E), `-phone-e` (rigid), `-phone-f`
(placed, short phone, waiting), `-phone-g` (food, pack, condensed queue),
`-phone-h` (superseded), `-phone-i` (the gauge), `-phone-j` (sheets),
`-phone-k` (list rows), `-phone-l` (cost gauge, superseded by M),
`-phone-m` (the cost line, M1), `-phone-n` (cards), `-desktop-o`,
`-window-p`. Superseded ones stay as evidence.

## 13. Issues

Closes **#62** (the phone layout), **#91** (idle in three places, and why
the queue emptied),
**#84** (one cost grammar). Gives **#90** and **#73** their seat (the veil)
without doing #90's work. **#43** keeps only ■'s look. Supersedes the shell
parts of the screen pass (spec 2026-09-24-screen-pass 2.1–2.6): health alone
on top becomes the top strip; the band becomes the cell and the sheet; the
fold tiers become the three tiers here.
