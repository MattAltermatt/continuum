# Books, chapters, verbs, and the one screen

**Date:** 2026-09-22
**Status:** design, agreed section by section in a brainstorm, then reviewed
by a panel (a reviewer against MECHANICS and the code, and a naysayer). The
amendments from that review are folded in and marked *(panel)*. This is the
argument and the decisions. What is queued from it lives in
[GitHub Issues](https://github.com/MattAltermatt/continuum/issues).

**Shape:** this is an umbrella. It decomposes into three plannable pieces:
the game's structure (§1–4), the verb roster (§5–7), and the screen (§8). The
first plan drawn from it is the v0.1 slice in §11.
**Mockups:** every visual decision below has a committed mockup in
[`docs/mockups/`](../mockups/), dated 2026-09-22.

This spec sits on top of [`VISION.md`](../../VISION.md) and
[`MECHANICS.md`](../../MECHANICS.md). Where it changes them, it says so.

**Amended 2026-09-23:** [Books own their skills](2026-09-23-books-own-their-skills.md)
supersedes §1's "books are places within a life" and the global restart,
retires §5's categories, turns §5–7's twelve verbs into an authoring
vocabulary a book's roster draws on, and removes §9's skill points and
`templateKey`. Its §10 lists every change. The rest stands.

---

## 1. The shape of the game

- 🔁 **The game never ends.** The player moves from book to book, as an
  adventure.
- ⏱️ **A run is tuned for roughly 20 minutes.** Longer is fine. Shorter should
  only happen when the player did something odd. This replaces VISION's
  "minutes, not hours" with a number, and it is the value every curve in
  `balance.ts` is derived against.
- 📖 **A book persists across lives.** What persists is the book itself: its
  existence, its chapters and their content, and the automation earned on its
  rows. What resets on death is progress: every book goes back to its first
  chapter. The arc of a book is *weeks, then minutes, then seconds*, and that
  arc is the payoff the player watches.
- 🧭 **Books are places within a life.** Within one life the player can finish
  book A and walk into book B. A mastered life *covers more ground*; it is not
  a longer life. The run clock is a fixed budget, and mastery is how much fits
  inside it.
- ⚠️ *(panel)* **The budget and the curve do not agree yet.** At MECHANICS'
  placeholder constants, decay alone passes the biggest larder on the mockups
  (7.2 hp/s) at about 19 minutes; an infinitely fed run dies at 20.5. So the
  20-minute target is not a wording change, it is a re-derivation of the decay
  constants in `balance.ts`, which are sacrosanct and get an explicit ask.
  And how a life reaches book B at all, when book A's chapters spend the
  budget, is the first question of the balance brainstorm. Its first step is
  a headless probe, no UI: run the decay curve against the mockups' own
  larder and row durations and print the longest survivable run and how many
  rows fit in it. If the answer is 19 minutes, the multi-book life is the
  thing that is wrong; if it is 45, the target is.
- 🗺️ **Books are a choice, not a line.** Several are open at once. A book that
  has stopped paying XP can be left behind. Diminishing XP per book is the
  mechanism that makes the choice, not a problem to fix.
- 🔄 **A global restart resets every book.** That is a prestige layer. What
  survives it is an open question with its own brainstorm.

## 2. Chapters

- A book has a few chapters. **Chapters are linear within a book.**
- A chapter is a self-contained themed story: a dungeon in and out, a fishing
  trip, a harbor. It has several events leading to **one big event at the
  end**. What an event produces is used throughout the chapter.
- **Every material has a sink in its chapter, and a big one** (user,
  2026-09-22: "another building that takes 5000 stone or something"). A full
  stack is a moment, not a state; mining is never pointless.
- **The big event is always a fight,** in one of two flavors:
  - a literal fight: a Kill action that drains health per tick;
  - a race: a long action of some other verb, with the decay clock as the
    enemy.
- Whether events inside a chapter are linear is open, and chapter internals
  get their own brainstorm.

## 3. The cost model

- **Every action spends time, and time is what kills.** The decay clock is the
  universal cost.
- **Only Kill has an additional drain:** damage.
- **There is no Rest.** Health comes from food and nothing else. Eating is
  automatic and never overheals, per MECHANICS.
- **There is no Learn verb.** XP falls out of doing.

## 4. The wall rule 🪨

The most important rule in this document.

> An obstacle has exactly one way through, and it is written on the row. The
> player's only choices at a wall are **prepare** and **attempt**.

- Preparation is, most of the time, more food. A food row is on screen the
  majority of the time, but not always.
- There are no alternate routes, no per-chapter tricks to remember, no "at this
  point switch to X." The game is bashing the ship against the rocks until the
  life comes where it finally gets past. The player never has to remember
  anything about a beat except that they have not beaten it yet.

Consequences:

- **The row names the verb.** Wolves are a Fight row or a Shoot row, never a
  choice between them. Fight and Shoot are separate paths at the *book* level.
- **Search's output is a key the next beat requires,** never a way around it.
- **A bypass is not a verb.** There is no Sneak. If a chapter has a cloak, it
  is the required preparation for a beat, not a way to skip it.
- Every Harvest and Create verb is preparation.

## 5. Categories

Six, grouped by **what they act on**, so that fluff could be removed. Not
symmetric, on purpose. A chapter is written in six nouns: stuff, things,
threats, places, people, secrets.

| Category | Acts on | Produces | Extra cost |
|---|---|---|---|
| Harvest | stuff | raw materials | none |
| Create | things | items and structures | none |
| Kill | threats | a threat removed | **damage** |
| Go | places | a place reached, including enduring | none |
| Talk | people | a person won over; a gate opened | none |
| Discover | secrets | knowledge: a clue, a map, a weakness | none |

## 6. The verb test

A verb earns its own slot when it has **its own tool and its own skill curve,
and a unique output.** Its own tool means Create has something to make for it.
Its own curve means a player can be fast at it and slow at its neighbor, which
is what powers "choose the path, even the book."

Refinements, each learned by applying the test:

1. **The verb is the skill; the noun is the chapter's flavor.** Fishing is
   Fish with fish in it. A chapter never introduces a new verb, only a new noun.
2. **A tool that unlocks a new noun of the same verb is not a new verb.** A
   field makes Forage faster; it does not make Farm. A boat lets Travel reach
   water; it does not make Sail.
3. **Under Harvest the noun is the output; under Create the noun is the
   input.** Craft owns wood, hide, stone and ore. Cook owns food.
4. **The frequency rule.** XP is awarded per tick to the running action's
   skill, so a skill's XP is proportional to ticks spent in that verb, and its
   level follows from that XP. A
   verb that runs *continuously* gets its own skill, or it would subsidize
   whatever it shared with. A verb that runs *once in a while* shares Craft.
5. **Travel, Talk and Search are distinct only because books are
   verb-weighted.** Every book must lean on a different subset of the verbs, or
   those three collapse into one. This is a constraint on book authoring.

## 7. The twelve verbs

```text
Harvest    Forage · Chop · Mine · Fish · Shoot
Create     Craft · Build · Cook
Kill       Fight · (Shoot)
Go         Travel
Talk       Talk
Discover   Search
```

Twelve, with Shoot serving two categories. Each survived one named test.

| Verb | Survived on | Reason |
|---|---|---|
| Forage | unique tool (none) | The only verb that needs nothing in hand. Life 1 of every book starts here. |
| Chop | unique output (wood) | The only source of wood, which most Builds and Crafts need. |
| Mine | unique output (ore, stone) | The only source of ore, the only road to metal. |
| Fish | own tool, own curve | Rod and boat. A fishing book is a different player from a forest book. |
| Shoot | unique output (hide), double duty | The only source of hide, and the Kill verb whose threat rows take less damage than a Fight row would. One bow, one skill: "hunt the deer by shooting it." |
| Craft | baseline | Materials in, a carried thing out. Includes metal and arrows. |
| Build | output stays put | A dock raises every Fish action after it; a rod raises only its carrier's. |
| Cook | continuous (frequency rule) | See §7.2. |
| Fight | the only full-damage verb | The only verb whose extra cost is health. |
| Travel | the only verb that moves the player | Clock-race big events live here. |
| Talk | the only verb that acts on people | People gate things: no boat until the harbor master says so. |
| Search | the only verb that produces a key | Under the wall rule its output is what the next row requires. |

### 7.1 Craft vs Build

- **Craft: carry it.** The output goes in the pack and travels with the player.
  Axe, rod, bow, pick, rope, arrows, an iron sword.
- **Build: leave it.** The output stays put in the chapter and changes what
  happens around it. Windbreak, dock, forge, field, fire.
- The question is: *does it move?* Moves is Craft. Stays is Build.

### 7.2 Why Cook is a verb and Forge is not

The naive reading says Cook and Forge are the same shape: materials plus a
Build (a fire, a forge) become a better thing. If one folds into Craft, both
should. The frequency rule says otherwise.

Cook runs in the background of most of every life: automation keeps cooked
fish topped off and as-needed injection pulls raw fish through to do it.
Thousands of ticks. Forging a sword happens once a life. A few hundred ticks.

If Cook shared a skill with Craft, every background cooking tick would level
the skill that makes the sword. The sword would become trivial to make for
reasons that have nothing to do with making swords; it would be subsidized by
dinner. The player would see "Craft 40" and have no idea it was mostly fish.
That breaks transparency and it breaks the path mechanic, because a cook and
a smith would be the same player.

If Forge shared a skill with Craft, nothing is subsidized. An axe from wood and
a sword from ore are the same once-a-life act, and carpentry was never going to
be its own verb, so smithing is not either. The row reads "Craft: iron sword,
needs the forge." The forge itself is a Build.

If a later chapter introduces another continuous Create verb, the same rule
says it gets its own skill and the roster grows. The count is not the rule.

### 7.3 Shoot, damage, and arrows

- Damage is a property of the **row**, not the verb. A boar in the woods is a
  game row and takes no damage. A boar blocking the pass is a threat row and
  takes reduced Shoot damage. The chapter decides which a boar is.
- Shoot is named Shoot, not Hunt, because Hunt only reads as the food side and
  Shoot does not name the weapon.
- Arrows are a Craft row. What goes into them is the storyteller's call per
  chapter. The engine does not special-case arrows.

### 7.4 Considered and set aside

Farm, Tend, Draw water, Scavenge, Salvage, Tailor, Brew, Repair, Defend, Trap,
Magic, Command, Sneak, Explore, Endure, Flee, Sail, Climb, Read, Study,
Investigate, Scout, Bribe, Trade, Recruit, and Lore (a prestige-only skill
with no verb, set aside in favor of an honest count; worth revisiting in the
global-restart brainstorm, where the argument for it was transparency).

*(panel)* Also considered: **six category skills plus tool multipliers**
instead of twelve verbs, with a rod or an axe doing the "fast at one, slow at
its neighbor" work. Rejected for two reasons. Tools are Craft outputs and
inventory resets on death, so a path built on tools would reset every life,
while a path built on core mastery is the thing that persists. And the fun
this game is built around is watching bars fill; twelve bars are the point.

## 8. The one screen

What makes the game fun, in the user's words, is **seeing the XP bars fill.**
The screen is built around that, and it was designed one chunk at a time.

### 8.1 Rules that apply everywhere

- 🎨 **Dark surface.** Tokens, all OKLCH: surface `20% .012 260`, cell `24%`
  (chunk containers), item `22%` (**every member of a list**: a row, a queue
  entry, a skill, a pack or food item), active cell `30% .02 260`, edge `34%`
  (decorative boundaries only), active edge `62% .06 260` (**every control's
  boundary**, 4.5:1), track `17%`, track edge `55% .012 260` (3.4:1 against
  the cell, so an empty bar is still a bar). *(audit)*
- 🔤 **Text:** primary `oklch(90% .01 80)` (12.2:1 on the cell), secondary
  `oklch(80% .01 80)` (8.8:1). A 66% secondary was tried and rejected as too
  low.
- 🦴 **Ledger fills, "bone and ember":** core `oklch(84% .02 80)`, a warm
  off-white with no hue, the permanent thing; run `oklch(70% .16 45)`, ember,
  burns this life and goes out at death. Measured 1.73:1 against each other,
  so they survive grayscale. Only the run ledger carries hue, which leaves
  every other hue free to mean something.
- 🩸 **Hurt** `oklch(66% .18 25)` for the health fill at every value (A: the
  alarm hue stays; it throbs near death). **Hurt text** `oklch(70% .18 25)`
  for words: drain, unmet needs, "nothing to eat" (4.8:1 on the active cell;
  66% is 4.0:1 there). *(audit)*
  ⚠️ **Warn** `oklch(80% .15 85)`: a shortfall, a full stack.
  🤖 **Automation** `oklch(72% .10 235)`. ✅ **Good** `oklch(78% .12 150)`: a
  positive net rate.
- 📏 **If there is a bar, its actual values sit immediately below it,
  centered.** Three bar heights only: 20px (health), 12px (the working queue
  entry), 8px (everything else). Bars are `aria-hidden`; the centered value
  is the text. *(critique, audit)*
- ♿ **Markup rules.** *(audit)* Every control is a `<button>` at least 24px
  square with a `:focus-visible` ring (2px active edge, 2px offset). Nothing
  is dimmed with opacity below 70%, and a need chip is never dimmed. The
  skill ledger opens on hover, focus, click and Enter, closes on Escape.
  `prefers-reduced-motion` turns the sheen off; the ember border stays. The
  log chunk is the `aria-live="polite"` region for beats, stalls and level
  ups; death is assertive. The running row carries a visually hidden
  "running". The automation chip is a button whose accessible name carries
  its state, and it is **blank until the first completion**. Until the
  automation milestone exists there is nothing to press, so the chip is a
  status element, not a button; it becomes a button when cycling arrives.
- 🕰️ **Formats.** Durations `m:ss` unpadded ("4.2s", "1:10"); the run clock
  `mm:ss` padded. Three arrows, three meanings: `→` in a row, `↑` levels up,
  `▲` accelerating. No fourth.
- ➗ **Fractions are always `a/b`,** no spaces.
- 🚫 **If a number is not accurate, it is not shown.** Facts are in; forecasts
  are out. "Dead in 2:17" was cut because a feral groundhog can make it wrong
  by ten seconds. *(panel)* The line between the two: a **countdown at the
  current rate** is shown while that rate holds and disappears when it stops
  (a row's time, the `↑ 7s` on the running skill, the queue's sum marked `≈`
  because levels rise during it). A **projection that depends on choices not
  yet made** is never shown.
- 🧱 **Every item in a list is its own bordered box,** so items are easy to
  tell apart. The desktop minimum is 1280px, the spec's target, not the
  mockup's 1100.
- ✨ **One signal for "work is happening here":** an ember border and a faint
  band of light sweeping left to right. The running row and the running skill
  both carry it, so the eye can follow it from one to the other.
- 🖼️ **Icons:** Lucide, ISC, notice kept in the repo. Forage sprout, Chop axe,
  Mine pickaxe, Fish fishing-rod, Shoot bow-arrow, Craft wrench, Build house,
  Cook chef-hat, Fight sword, Travel route, Talk message-circle, Search eye.
  Settings gear: `settings`. Chosen so all twelve stay apart at 15px. The
  notice lives in [`docs/mockups/LICENSES.md`](../mockups/LICENSES.md).
- 📐 **Widths.** *(panel)* The desktop target is 1280px and up. The row's
  three chunks are pinned **per chapter**: each is sized to the longest thing
  the chapter puts in it, so nothing moves within a chapter. Chapter authors
  get a budget: a verb-plus-noun of at most 24 characters, an output of at
  most 20. The pinned automation control fits `199/200`. The layout mockup is
  hard-coded to 1100px and is a wireframe, not a width test.

### 8.2 Layout

Grouped by what the player looks at most: the running row and queue front,
then the skills, then health and rates, then the chapter rows, then food, then
pack, clock and header.

```text
+----------------------------------------------------------------+-----+
|  HEALTH, the whole top row: full-width bar, "71 / 100" under   | ⚙   |
|  it centered. Later it throbs as death gets close.             |06:12|
+----------------------------------------------------------------+-----+
|  SKILLS: twelve, four across, three rows, always the same order      |
+------------------------------+------------------+--------------------+
|  CHAPTER (left, wide)        |  MIDDLE          |  QUEUE (right)     |
|  running head, story, rows   |  rates, food,    |                    |
|                              |  pack, log       |                    |
+------------------------------+------------------+--------------------+
```

The top-right corner is as small as the text token allows: a gear, with
settings behind it later, over the run clock.

### 8.3 Skills

Per skill, in its own box: the icon; the name over the multiplier
`(1 + core × 5%) × (1 + run × 1%) × tool`, bold when running; then two lines,
one per ledger. Each line reads **"Lv 12"** on the left, then the bar with its
XP fraction centered under it, `14.6/31.4` (a level costs base × 1.1^level,
so core 12 costs 31.4). On the running skill only, a level-up mark and the
time sit beside the fraction: `14.6/31.4 ↑ 7s`. Idle
skills show nothing but the fraction. The running skill carries the sheen.

The **hover** is a ledger. Left: one section per thing that feeds the
multiplier, "core · permanent · +5% / level" with its level, bar and "to level
13"; "run · this life · +1% / level" with "best ever"; "tools". Right: the
factor each contributes, with its arithmetic under it, a heavy rule, and the
total. **The ledger shows what is, never what could be.** Below, two small
blocks: right now, and lifetime. It needs four counters the engine does not
have yet: best run level ever, time per skill, actions completed per skill,
first-used book. The ledger names "core" and "run" are placeholders; a rename
is pending.

### 8.4 The action row

The starting point was the sparse two-button row: an icon, a name, one button
to start now, one to add to the queue. The goal was to put what a popup would
hold onto the row itself, without six layouts for six categories.

**One grammar for every row, in three chunks that line up down the chapter:**

```text
[icon  Verb noun]      [needs · inputs → output]      [time/xp  ▶  +  auto]
 left, fixed width      centered; inputs right-aligned  right-aligned
                        to the arrow, outputs left
```

- Empty slots collapse. Harvest: `→ +1 fish`. Create: `3 wood → rod`. Kill:
  `−1.1 hp/s → the rats, gone` (the output of a Kill row is the threat
  removed). Go: `→ the far bank`. Talk: `needs 5 fish → a
  boat`. Discover: `→ the channel markers`.
- **"needs X" is checked, not consumed**, and is a chip. Inputs left of the
  arrow are consumed into the work as it progresses, and are plain text.
- **Inputs stack**, one per line. An input the pack cannot cover is in warn
  with a triangle and "have n" beside it. The row is not locked by that; it
  can be queued and will wait.
- A **locked** row, with an unmet requirement, stays visible and dimmed with
  the requirement in hurt. Its buttons do nothing. The road is always on the
  row.
- **Time** is the current duration at the current multiplier; **xp** under it
  is what one completion earns, which is the row's `expCost` exactly, since
  progress advances by the tick's XP. *(panel)* It differs per row, not per
  level.
- **Automation is a first-class citizen.** One control, pinned width, click
  to cycle `off → AN → 1 → 2 → 3 → 4 → 5 → off` per MECHANICS §6. Four looks
  in one size: "off", "AN" lit, a priority lit, and `3/5` with a hairline
  underneath while it is still being earned, visible from the first
  completion. It sits at the right edge as the third control after ▶ and +.
- **The running row:** the ▶ becomes a filled ■ in the same place, and the row
  carries the sheen. Progress is not on the row.
- **On click**, the pressed button fills for the frame it is pressed, the row
  flashes once, and if anything is missing the whole middle chunk is replaced
  by the instruction, one line per missing thing: "missing 12 wood · **Chop
  some!**". It holds a few seconds and fades back. The verb named is whichever
  verb makes the thing.
- A full table with headers and cell borders was tried and rejected.

### 8.5 The queue

A vertical panel; the front entry expanded. **The queue is a view:** the only
control in it is remove. A "fix" button on a stalled entry was tried and
rejected, because complex entries would sprout buttons and an entry that
reaches the front and stalls at once would be noise.

- The working entry (the first that is not stalled): a big ember bar per
  completion, its count under it, the sheen. Every entry shows the time its
  remaining work takes; the header sums the entries that can run and says
  "+ waiting" for the rest. *(critique)*
- A ⚠ sits beside any input that is short *right now*, on entries that are
  not running. The running entry says it in words.
- A **stall** is dashed, not red. Its bar goes dim and it stays in the queue
  as a waiting entry; "waiting on wood." A stall is not an error. When the
  wood lands, the bar continues from where it was. Nothing is re-paid.
  *(panel)* This changes MECHANICS, which stashes a stalled action outside the
  queue; see §9. An as-needed producer still goes in front of it, and the
  player pressing ▶ on a producer does the same, so the entry behind moves
  down; "keeps its place" means it is not removed, not that its index is
  frozen.
- Multi-input entries list their inputs as numbers. Per-input mini bars were
  tried and rejected: while running they only track the main bar.

### 8.6 Health, clock, rates, food, pack, header

- **Health:** the full-width top bar, hurt, with `71 / 100` centered under it
  and nothing else. It is where health is communicated, and it will throb as
  death gets close, driven by current hp, not by a time-to-death.
- **Clock:** the run time, in the top-right corner under the gear. When the
  queue is empty and the game is not paused it reads dimmed with "idle"
  beside it, because time only passes while work happens (§9).
- **Log:** *(new)* at the bottom of the middle column. Story beats in the
  running head's serif, housekeeping in the secondary token ("life 7
  begins", "saved"), newest on top, a handful visible, the rest behind a
  scroll. It is also the screen's live region.
- **Rates:** the one place to see if you are going to make it. A column of
  rates true *this second*: decay with a ▲ because it accelerates, the running
  action's drain if it has one, and "food, up to +7.2 hp/s", the larder's heal
  ceiling from the food cooldowns. A heavy rule, then **net**. *(panel)* Net
  is **measured**, the actual change in hp over the last few seconds, not the
  sum of the lines above it: at full health no bite lands, so the sum would
  read green while the true rate is decay alone. Red when hp is falling,
  green when it is rising. "Up to" stays labelled as a ceiling. All rates in
  hp/s so they line up with Fight rows.
- **Food:** its own chunk, because **food is the only thing that survives
  between books within a life.** Each food in its own box: name, what one bite
  heals, a small cooldown bar that drains until it can be eaten again with the
  count/cap centered under it. A full stack is warn. With zero food the box
  border goes hurt and the header says "nothing to eat"; it is the one moment
  food is allowed to be loud.
- **Pack:** materials only, no tools. Name left, a stack bar right with
  count/cap centered under it. Full is warn. Zero counts are dimmed, not
  hidden. Raw fish is a material until cooked. Where carried tools live is
  open.
- **Header:** a running head like a printed book. Small caps book title left,
  chapter numeral and title right, a rule, the chapter's one-line story in a
  serif italic. The one place on screen that looks like a page. No book
  switcher: books are places, reached by Travel rows.

### 8.7 Tried and rejected, so it is not re-proposed

A three-column layout with skills as a left column; a top row of health, rates
and clock with dead space; a status bar with the running head in it; per-skill
time-to-level to the right of the bar; "dead in" in any form; "life 7" on the
health chunk; the skill point line; "worth 160 hp"; a blink on the automatic
bite; "+12 hp / 5s" beside "next bite 2.1s"; the queue fix button; the full
table row; per-input mini bars.

## 9. Changes to MECHANICS and VISION implied here

Each of these widens the engine and is filed as its own issue.

- VISION: "a run is minutes, not hours" becomes "tuned for 20 minutes."
- MECHANICS §4: the decay constants are **re-derived from the 20-minute
  target** (see §1). A tuning change; asked for explicitly, never slipped in.
  `ticksPerSkillPoint` and the rebirth curve were derived from the old target
  and are re-examined with it.
- MECHANICS: the decay rate is displayed in hp/s, not hp/min. Display only.
- MECHANICS §2 step 1 **stands, by decision (B), now [decision #41](https://github.com/MattAltermatt/continuum/issues/41):** a tick short-circuits when
  the queue is empty, and when no entry can run this tick, and the tick that
  would have found the working entry unable to pay does not advance the clock
  either. Time passes only while work happens; an empty queue is a planning
  surface, not a cost. The corner clock says "idle" when the queue is empty
  and "waiting" when entries exist but none can run.
- MECHANICS §2 step 3 **capacity gate, replaced (user decision, 2026-09-22
  evening):** a producer never produces into a full stack. When the unit that
  would overflow is about to land, the entry **stops and leaves the queue**;
  if the stack is full when a unit would start, it leaves immediately. Ticks
  spent stay spent, XP earned stays earned, nothing is wasted. When that was
  the last entry, the queue is empty and time stops: click Mine with room for
  15, come back to 15 stone and a stopped game. The log says "Mine stone
  stops: the pack is full of stone." The only *wait* is a missing input.
  (Two earlier readings were rejected: a "full" wait would freeze the game
  under decision B, and wasting the surplus burned the clock for nothing.)
- MECHANICS §2 on completion: `healthDecayMultiplier` applies, so the slice's
  cabin does something visible: it slows the clock.
- The engine emits **typed events** per tick (stall, resume, completion of a
  one-time, a core level up, death); the UI turns them into log lines. The
  engine never writes prose. A one-time action may carry a **beat**, one
  authored sentence the log prints in the serif when it completes: that is
  how a big event's payoff is seen, and how story reaches the log.
- MECHANICS §2: **progress advances by the tick's XP.** `expCost` is "total XP
  of effort," so a tick's progress is the same `tickExp` that goes to the
  ledgers, and an action's duration is `expCost ÷ (tickExp × 10)` seconds.
  This is the reading the row's "time at the current multiplier" and "hours
  then seconds" both rest on; MECHANICS only says "advance progress."
- MECHANICS §2: a **stalled action stays in the queue** as a waiting entry
  instead of being stashed in `stalledActionProgress`. Its progress and
  consumed costs are kept on the entry.
- MECHANICS: a **per-action health drain**, the Kill cost, with a slot in the
  tick order after decay. `ActionDefinition` has only a permanent decay
  multiplier today.
- MECHANICS: **item-gated requirements**, "needs 5 fish", checked not consumed,
  and **keys**, the output of a Search row, as something a later row can
  require. `requires` today is completion counts only.
- MECHANICS: **place-scoped multipliers**: a Build's output can raise the
  rate of a verb's actions in its chapter. `toolMultiplier` today is per
  skill, not per place.
- MECHANICS §1, skill points: earned but never spent. Off the screen until a
  sink exists.
- New mechanic: **materials always reset at a book boundary, and may reset at
  a chapter boundary** with a story reason, when procgen is designed. **Food
  never resets** between chapters or books. Death still restores inventory to
  starting defaults per §5; food across death was not discussed.
- New: **books and chapters as context.** MECHANICS design note 6 warns that
  a notion of location must prune the queue when it changes. A chapter or
  book transition does.
- Four new per-skill counters for the hover (actions completed per skill is
  derivable from `actionCompletionCounts`; best run level joins the persist
  list).

## 10. Open, each with a home

- *(panel)* **Reaching book B.** See §1. The balance brainstorm, starting with
  the headless probe.
- *(panel)* **Automation on big-event rows.** A one-time row earns automation
  at 5 lifetime completions, so a cleared big event would queue itself. The
  wall rule says nothing about it. Decide before the first big event ships.
- *(panel)* **Cook-to-cap before a boundary.** Cooked food persists and raw
  fish does not, so the optimal play is to cook everything before a chapter
  ends. That is a preparation decision, which the wall rule allows; whether
  it is a good one is for the chapter brainstorm.
- **The log's content.** Which beats a chapter author writes, and how saves
  report. The chunk itself is in §8.6.
- Chapter internals: linear or not, and how many events. Own brainstorm.
- Global restart: what survives, and whether Lore or skill points live there.
- XP balance across books, and verb weighting per book.
- Procgen. Discussed, no decision. The notes: structure and requirement
  chains generate well; story does not; hand-author the first books as the
  corpus; a generated book is generated once and persisted, because "weeks
  then seconds" needs the same book every life; no AI.
- Where carried tools are shown. Whether tools reset with materials.
- The rename of "core" and "run".
- The book-choice surface, once more than one book is open.

## 11. The first slice: v0.1

Three rows that feed each other, in their final shapes, driven by the real
tick and XP math:

```text
Forage  berries        →  +1 berries         food; keeps the run alive
Mine    stone          →  +1 stone
Build   a cabin        6 stone → cabin       one-time; stands in for a big event
```

The stone cap sits below six, so queuing the cabin first stalls it, mining
fills the pack, and the cabin resumes from where it stopped. That exercises the
two things issue #5 says are easiest to get wrong: cost draining visibly, and
a stall that is not an error.

In the slice: the three rows, three live skill cells, the queue, the pack,
the health bar, the tick loop and the XP math. Placeholders: rates, the
running head, the log, the other nine skills. Every number is a `balance.ts`
placeholder marked as such; nothing is tuned.
