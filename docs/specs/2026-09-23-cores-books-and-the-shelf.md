# Cores, books, and the shelf

**Date:** 2026-09-23
**Status:** design, agreed in a brainstorm, then reviewed by a panel (a
reviewer against the code and the earlier specs, an economist who simulated
the loop headless with the real `balance.ts` numbers, and a naysayer). Round
one found the scale, the profile and the fixture wrong as written; the
amendments are folded in and marked *(panel)*, and the user's decisions from
the synthesis are marked *(user)*. This is the argument and the decisions.
What is queued from it lives in
[GitHub Issues](https://github.com/MattAltermatt/continuum/issues).

**Shape:** a pivot. It amends
[Books, chapters, verbs, and the one screen](2026-09-22-books-chapters-verbs.md)
(the 09-22 spec below), MECHANICS.md and VISION.md in the places §11 lists,
and it answers or reshapes #17, #36, #37 and #39. The tick order, the queue,
decay, food and death rules are untouched; the code that keys skills is not
(§12).

---

## 1. The pivot in a paragraph

The twelve verbs were roles wearing forest costumes: each survived the verb
test (09-22 §6) on a mechanical reason, none of them about a forest. This
spec names six roles as the game's **cores**, and lets every **book** define
its own skills, each tagged with the core it feeds. A book about digging to
the centre of the earth has no Chop and no Fish; a children's book has no
Fight. What travels between books is the six cores and, later, a shop of
permanent items bought with badges. Each book is scaled per core so that its
first chapter runs at day-one pace no matter what the player arrives with,
and a book left on the shelf is a bookmark, not a death.

Two things fall out that the twelve could not give: a book can be as custom
as its author likes, and procedural generation has a small honest brief to
hit rather than twelve curves to keep even.

## 2. The six cores

Fixed, owned by the game, one permanent ledger each. A book skill is tagged
with exactly one.

| Core | Role | Contract every book keeps |
|---|---|---|
| **Acquire** | materials in from the world | Life 1 opens on an Acquire skill that needs nothing in hand (the Forage contract) |
| **Modify** | materials in, a different thing out | a continuous Modify skill gets its own run curve (the Cook rule, 09-22 §7.2) |
| **Fight** | rows whose extra cost is always health | a book with any row that costs health can feed it (§10) |
| **Travel** | the only skill that moves the player | clock-race big events live here |
| **Talk** | the only skill that acts on people | people gate things |
| **Search** | the only skill that produces a key | under the wall rule its output is what the next row requires |

*(panel)* Damage is a property of the **row**, not the core (09-22 §7.3,
which stands): a Shoot threat row under Acquire takes damage. Fight is the
core whose rows always cost health; other cores' rows may. Anything that
reads "does this book hurt" reads the rows (§6), never the tag.

Fight, Travel, Talk and Search are unique enough to be cores on their own,
which is what 09-22 §7 already argued. Acquire absorbs Forage, Chop, Mine,
Fish and Shoot; Modify absorbs Craft, Build and Cook. The old §6 rule 5
("Travel, Talk and Search are distinct only because books are
verb-weighted") is retired: they are distinct by definition now, and verb
weighting per book becomes a profile (§6), not a constraint on authoring.

## 3. A book owns its skills

A book declares its **roster**: its skills, each with a name, an icon name
from a closed vocabulary the UI maps *(panel: data may not import UI, so the
roster cannot hold a component)*, and a core tag. The roster is data in the
book, like its rows. The verb test (09-22 §6: its own tool, its own curve, a
unique output) is still the rule for whether a skill earns a slot, applied by
the book's author rather than by the game once.

The digging book, as an example:

```text
book skill    core       tool / place          the verb test says
-----------   --------   -------------------   ------------------------------
Dig           Acquire    bare hands, then a    the Life-1 harvest, no tool
                         pick
Haul          Acquire    cart, then lift       the tool-and-place harvest
Sort          Modify     screen                background prep (Cook's slot)
Smelt         Modify     furnace, a Build      continuous, so its own curve
Cast          Modify     mould                 once a life, could share Smelt
Shore         Modify     timber, a Build       output stays put (Build's slot)
Descend       Travel     the shaft             the clock race
```

No Chop, no Fish, no Talk, no Fight. Every tick in Dig levels run-Dig and
core-Acquire. A children's book declares no Fight skill; core Fight sits
where it was, and only the picker (§6) ever shows it.

**Book one is The Salt Road** *(panel: "The Forest" was a placeholder name;
the shipped book is `book: 'The Salt Road'`, chapter The Scrub, in
`src/data/scrub.ts`)*. Its roster is today's twelve, tagged: Forage, Chop,
Mine, Fish and Shoot under Acquire; Craft, Build and Cook under Modify;
Fight, Travel, Talk, Search under their own cores. Today only Forage, Mine
and Build have rows (four rows: forage, mine, cabin, hall). No content
changes; it is a re-tagging, and it is the fixture the generator (§10) is
tested against.

## 4. What persists, and what changed

```text
tier    count        owned by     persists            bonus
-----   ----------   ----------   -----------------   -------------------------
core    6, fixed     the game     forever             (1 + core x 5%)   as today
run     N, per book  the book     until death         (1 + run x 1%)    as today
```

Two ledgers, as MECHANICS §3 has them, paid the same amount from the same
tick, as today; only the *key* of the core ledger moves from the verb to the
core. Every book skill under a core gets that core's **full** level as its
core multiplier, never a share of it. Splitting would punish a book for
having seven skills instead of three, and authors would merge skills to
protect the bonus.

**The honest change.** 09-22 §7 rejected six category skills because *"a path
built on core mastery is the thing that persists."* Under this spec the
*path* (fast at Fish, slow at Chop) lives at the run tier and dies with the
run or the book. What persists is breadth: "I have acquired a lot," not "I am
a fisherman." That is the trade for custom books, recorded here rather than
slipped in. *(panel)* It is not the *only* design that travels: a global verb
set that books use a subset of, with per-book names, also travels and keeps
the fisherman. It was set aside because the user wants a book to split one
core into as many skills as its story needs (§14).

**The category subsidy, measured.** *(panel)* The core ledger advances live,
every tick, so Cook ticks raise core Modify *mid-life* and speed the sword in
the same life at 5% a level. The run tier, where the §7.2 block survives, is
worth little at today's curve: a whole life on one skill reaches run level
about 28, a 1.29× multiplier, against a shared 3× at core 40. Siblings under
one core therefore differ by under a third. Whether a book's roster is worth
authoring rests on the run ledger's weight, which is tuning, filed, and
decided with the second book (§13).

**The core curve stays `1.1^level`** *(user, decision A)*. Core is a slow
trophy ledger: measured at today's numbers, one core's levels arrive at about
26 an hour at level 40, one an hour at 80, one every six hours at 100. Since
a core level buys nothing at the frontier (§5), its rate is feel, and the
feel chosen is "permanent levels get rare." The spec does not promise that
the core bar moves at the frontier; it promises that it is true.

Beyond the cores, the only things that cross a book boundary are the shop
and badges when they exist (§7), and each book's own automation unlocks,
which persist *within* that book: completion counts are keyed by book and
action *(panel: today's `templateKey ?? id` key would let two books that both
define `forage` share progress)*. Nothing keys an action across books, so
`templateKey` (#24) has no job and goes. Skill points (MECHANICS §1, "earned
but never spent") go too. Rebirth is per book: a bookmarked book keeps its own
lives and its own bonus, and *(panel, measured)* the rebirth math is untouched
by the change: about +2.8 max health per death at every core.

## 5. Every book is scaled, per core, to the player

Without a scale, book B sits on book A's numbers and its first chapter is
trivial under a permanent multiplier. Increlution never meets this because its
later chapters are simply authored bigger; that works for a hand-authored
sequence and breaks the moment books are custom, generated, or played in any
order.

*(panel)* **Round one's scale was wrong, and the simulation showed it.** It
scaled every row by one number, the core *cost* ratio (`1.1^40 ≈ 45`), and
asked that number to fix two problems at once: content trivialised by the
multiplier, and a core bar gone dead. Those grow at different rates. Row
speed is linear in core (`1 + 0.05 × 40 = 3`); level cost is exponential
(45 at 40, 13,780 at 100). One scalar cannot match both. At 45× a berry took
63 s against 4 s on day one, a forage-only life starved at 8 minutes because
food was scaled and healing was not, the placeholder hall took 21 hours, and
by book C a berry took 40 minutes. Scaling core XP by the cost ratio also
made book-hopping an unbounded core pump. All measured.

**The scale that works, per core.** At the start of each life in a book,
until the book has been finished once, every row's `expCost` is multiplied by
the **current multiplier of the core its skill feeds**, `1 + 0.05 × level`.
On the first finish the vector freezes with the book. Nothing else is scaled:
not core XP, not run XP, not healing, not decay.

| Property | Measured on the real Scrub rows |
|---|---|
| rows at design pace | berries, cabin and hall take exactly their day-one ticks (42 / 600 / 50,000) at core 40 |
| food holds | life one lasts 14.0 minutes, as on day one; first berry at tick 42 |
| lopsided players | each core's rows are paced by *that* core, so Talk 5 beside Acquire 40 is paced for both |
| replays | a frozen scale-1 book at core 40 runs at 3×, at core 100 at 6× |
| book-hopping | harmless: core 106 after 20 hours of hopping against 99 for staying |
| peek-and-lock | closed: opening a book at core 0 and returning later re-snapshots at each life until the first finish |
| custom books | closed: the scale is derived, never typed, so no book can pump a core |

What core then buys is honest: any book finished below the current cores is
fast. Replaying The Salt Road is minutes; a children's book after a hardcore
one is a breeze. The frontier book always runs at design pace, which is what
every idle game does; the bonus compresses the past, never the present.

**Design length** *(panel: was undefined)*: the ticks a finish spends at
scale 1 with every required completion counted, the same basis the profile
uses (§6). Under the per-core scale a first honest play lands near it by
construction, less the run ledger and the rebirth bonus.

Not done, each measured or argued in round one: one scale per book (punishes
the weak core or trivialises the strong one); scaling core XP by the cost
curve (the pump); a frontier discount (a knob with no consumer yet; if ever
wanted it is a tuning ask); banking core at chapter end (a bar that never
ticks); capping the core bonus (fixes neither problem).

## 6. The profile, derived

*(panel)* Round one summed each row's `expCost` once. On the real Scrub that
gives Acquire .002 and Modify .998, because the 5000-XP placeholder hall
counts once beside a berry that runs seven hundred times, and every book has
a big one-time sink by 09-22 §2, so every book's profile would be its Build
sinks. The definition that measures play:

**For each core, the share of a finish's effort spent on that core**, with
repeatable rows weighted by the completions the book's sinks demand of them
(a hall that needs 500 stone demands 500 completions of Mine stone, and so on
back through every input). It is computed by the book validator (§12), never
typed by the author. An author cannot claim "no violence" over a book with a
damaging row, nor pad Talk in the blurb.

Beside the vector, one derived flag: **hurts**, true when any row costs
health. *(panel)* A Shoot threat row hurts under Acquire, so "Fight 0" was
never the children's badge; this flag is.

```text
book (illustrative, not measured)   Acquire  Modify  Fight  Travel  Talk  Search  hurts
---------------------------------   -------  ------  -----  ------  ----  ------  -----
Dig, to the centre                    .45     .40     0      .15     0      0     no
The Lighthouse Keeper (kids)          .25     .20     0      .10     .40    .05   no
a wolf book                           .30     .10     .50    .10     0      0     yes
```

The Salt Road's real vector is a test output in the slice, not a number in
this spec.

One vector, three jobs:

- **Content rating.** `hurts` is the children's badge, and the vector says
  what the book is mostly about. Both rate what the player *does*, not what
  the prose says; a narrative label, if ever wanted, is separate.
- **The picker.** The player's six cores beside the book's six weights. A
  player who dug to the centre and never talked sees Talk far below the rest,
  and the Lighthouse Keeper's .40 is visibly the book that moves it. Both
  columns are true this second; nothing is a prediction (09-22 §8.1).
  Equalizing is a goal the picker *offers*, never a tax: §5 paces each core's
  rows by that core, so a lopsided player is never punished by pacing.
- **The generator's brief.** §10.

## 7. Direction, decided with the second book: the shop and three badges

*(user)* Badges and the shop are direction, not decisions. Most early books
will be generated, and the numbers come from playing two. Recorded here so
the thinking is not lost, with the panel's constraints pinned beside it; each
becomes an issue with no milestone. Nothing in §12 depends on this section.

**Why a shop.** Core is cancelled at the frontier by construction, so the
point of the next book cannot be speed. Core is the record; badges are the
power. Badges buy permanent, game-level items in finite tiers (a stack cap
tier, slower decay, an automation slot, starting food, queue length: all
illustrative, and several name mechanics that do not exist yet). Two rules:
every item is finite tiers, never an unbounded percentage, or it compounds
until the frontier is trivial again; and the scale never reads the shop, so
a shop item is a head start that survives at the frontier.

**Why badges, three per book.** A per-completion payout can be farmed by
authoring; per-book badges bound what any one book can ever pay. Badge 1,
finished. Badge 2, finished at or above design length: played it as a
frontier book. Badge 3, finished under a fraction of design length: came
back as a veteran. Two and three cannot both land in one run.

- **Ticks, not wall clock** (decision #41), **counted from the book's restart
  to its finish across every life between.** A death costs its ticks, so
  settings that mismanage food show in the number. *(user)* Automation is
  the game choosing actions from the player's settings; it never makes a run
  faster. It makes a return visit free of attention, which is what lets a
  player collect badge 3 from a book they have moved past.
- *(panel, measured)* **The fraction has a floor.** At today's curve, core
  alone reaches half of design length after about 50 hours in the next book,
  and a third is never reached. So the fraction is a knob at or above about a
  half, and "a few returns" is whatever that number makes it.
- *(panel)* **The shop runs dry** after about seven books at nineteen tiers.
  Prices that rise per tier, a badge sink, or items that arrive with books:
  decided with the shop.
- **Shipped and generated books pay; a book the player wrote or edited is
  marked and pays none.** Custom books stay fully playable; they are not
  currency. *(panel)* This is an in-save flag in a single-player browser
  game; it stops accidents, not intent, and that is enough.

## 8. The bookmark, and the loop it makes

**Leaving a book freezes its run in place**: its queue, its pack, its health,
its automation. Returning resumes it. Under decision #41 this is free, since
no time passes in a book nobody is reading; *(panel)* the economist looked
for an exploit in it and found none. The alternative, where leaving ends the
life, makes every visit to an old book a rebirth and turns "pop back in to
set up one more automation" into a chore.

*(panel)* **What it costs, named.** Game state becomes the cores plus one
frozen run per book plus which is active, with max health, life number and
rebirth bonus per book. #27 (save and load) had recommended saving at death
only, to avoid in-flight state; bookmarks make mid-run the normal case, so
the save holds every frozen run and every generated book's data. And the
death card's "core gains this life" needs a snapshot per *stint*, not per
life: leave A mid-life, grow cores in B, return and die in A, and a per-life
snapshot would credit B's gains to A.

The loop the decisions produce:

```text
                            book A                            book B
-------------------------   -------------------------------   --------------------------
finish A                    cores grow; automation partly     opens paced to the
                            unlocked                          player's cores
play B                      idle on the shelf; every core     the frontier: design pace,
                            level B earns makes A faster      new story, new roster
pop back into A             faster than last time; set up     frozen where it was
                            the next automation; the
                            settings run it; go back
some rounds of that         a hands-free run under the        still the interest
                            fraction: badge 3, when it
                            exists
drop A                      three stars, done                 the only book open
```

Core is shared, so playing B is what makes A collapse; the player never
grinds A to speed A up. Going back to A is only ever about *automation*, a
different fun from "can I get further": can I make this run itself. There is
always one book that is a story and one that is a puzzle. *(panel,
measured)* A's own core contribution shrinks rather than stalls: a scale-1
book at core 40 pays about a third per tick of what the frontier pays, and
its runs get shorter on top.

## 9. What a finish is

A book is finished when its last chapter's big event completes. Finishing
ends that life; the book can be restarted from its first chapter, with its
automation and its frozen per-core scale (§5) kept, and its badge clock
(§7) reset. What the finishing screen looks like, and the shelf and the
picker, are designed after the second book exists (§13).

## 10. The generator's brief

The profile is the generator's input and the mechanics above are the rules it
generates against. A 90% Fight book, as the worked case:

```text
input     profile [.10 .00 .90 .00 .00 .00], length M
step 1    roster: the verb test picks from what the profile needs
          (one Acquire skill for food, one Fight skill; a Build for the
          decay defence, so Modify is not quite zero)
step 2    rows: fill each core's share of a finish's effort until the sums land
step 3    chains: the wall rule strings them (09-22 §10: structure generates well)
step 4    feasibility: the validator plays the book headless at scale 1 and
          refuses it unless every chapter is finishable
step 5    names, nouns and beats: from a template table, generated once, saved
output    the same book format The Salt Road is written in
```

*(panel)* **Step 4 is a simulation, not a formula.** Round one checked food
against Fight damage only. A book also has to survive the decay clock, which
is the universal cost (09-22 §3); it needs a `healthDecayMultiplier` source,
"the only defence against the clock" (MECHANICS §4); every material needs a
sink (09-22 §2); and every chapter needs a big event that can be reached. The
honest check is the same headless play the badges' design length rests on,
with a greedy survival policy, at scale 1. A profile that cannot be finished
is refused rather than emitted. "Punishing" is a book that is finishable and
mostly Fight.

*(panel)* **Step 5 is a template table**, which is the reading consistent
with #39's "without AI." A model at generation time would reopen #39, and
this spec does not.

**The hand-authored book is written in the exact format the generator
emits.** The Salt Road is both book one and the fixture, and "procgen"
becomes "produce this data," testable headless through the validator before
any prose exists. *(panel)* That forces a change to decision #3: a generated
book's numbers cannot live in `balance.ts`. The carve-out proposed in §12
keeps every *curve* in `balance.ts` and lets a *book's* numbers live in the
book; it is a reopen of a locked decision, with a trail.

## 11. What this changes elsewhere

**In the 09-22 spec:**

- **§1 "Books are places within a life"** is superseded. A book has its own
  lives; the player does not walk from A into B inside one run. Several
  books open at once survives, as bookmarks. "Diminishing XP per book is the
  mechanism that makes the choice" survives, as the scale. **#36** (reaching
  book B versus the run budget) is answered: it is not reached within a run.
- **§1 "every book goes back to its first chapter"** on death: now only the
  book the player died in.
- **§1 "A global restart resets every book"** is dropped. The shop, when it
  exists, is the prestige layer and needs no reset. **#37** is answered: what
  survives is the six cores, each book's automation, and later the shop and
  badges.
- **§5–7, the twelve verbs**, become book one's roster. The verb test (§6)
  and §7.1–7.3 stand as authoring rules. §6 rule 5 is retired. §7's rejection
  of "six category skills plus tool multipliers" is superseded by §4 here,
  with the trade named.
- **§8.3 "twelve, four across, three rows"** becomes N per book, grouped by
  core, in core order. Book one is still twelve. **§8.3's hover ledger** names
  a core, not a verb, and the "first-used book" counter goes.
- **§8.6 "No book switcher: books are places, reached by Travel rows"** is
  superseded by the shelf (§9), designed later.
- **§8.6 and §9 "food is the only thing that survives between books within a
  life"** and "materials always reset at a book boundary": moot, since a book
  boundary is no longer crossed within a life. A bookmark freezes the whole
  pack. Whether materials reset at a *chapter* boundary stands as written.
- **§9 skill points** are removed rather than parked. **§9 `templateKey`**
  and **#24** are removed with them.
- **§9 and MECHANICS design note 6**, "a book transition prunes the queue":
  queues are per book and frozen; nothing is pruned.
- **#17 "skills only make themselves faster"** changes premise: a skill's
  permanent bonus is shared with its siblings under the same core.
- **#39 procgen** gains its brief (§10).
- `(1 + core × 5%) × (1 + run × 1%) × tool` is unchanged; `core` now indexes
  a core, not a verb.

**In MECHANICS.md** *(panel: round one listed none of these)*:

- §1 and the constants table: skill points and `ticksPerSkillPoint` go.
- §2: the `templateKey` field and "increment `actionCompletionCounts[templateKey]`"
  become a book-and-action key.
- §3: "every skill carries two independent levels" becomes one core ledger
  per core and one run ledger per book skill, still paid the same amount.
- §5: what persists is the cores, per-book automation, per-book rebirth bonus
  and life number; skill points go.
- §6: automation keyed by book and action.

**In VISION.md:** "dual mastery: every skill keeps two ledgers" becomes the
core and run tiers of §4; "what carries forward is what you learned to do
faster" becomes "the six cores"; "few abilities, the roster stays small
enough" is now per book, and the generator enforces it; "keep the max-health
you earned" is per book.

**In the v0.2 spec:** nothing in the slice. The Provisions shop item, if it
ever lands, contradicts v0.2 §2.1's "food is a within-life plan" and is
decided with the shop.

## 12. The first slice

*(user, decision A)* This ships **before #47**, so that the queue model, the
stack cap (#45) and the screen pass (#46) are each built once on the new
shape. *(panel)* It is an engine and UI change, not a data reshape: the
skill key runs through about twenty files.

**In the slice:**

- The six cores as the core ledger's key. `SkillState`'s core/run pair splits
  into cores by core id and runs by book skill; `award`, `multiplier`,
  `newState`, `stepQueue`'s award step, `lifeStartCore`, the `coreLevel`
  event, and rebirth's death-card gains all re-key.
- The book format: id, name, roster (name, icon name, core), rows, items, a
  per-core scale vector, and derived profile and `hurts`. The Salt Road
  rewritten in it, re-tagged, no content change.
- **Core display names** *(panel: needed here, not with book two)*: the log
  line for a core level, the death card's gains, and the skill cells must
  name a core, or five Acquire cells show one shared bar with no name. The
  six names in this spec are placeholders the user renames (§13).
- The per-core scale as §5 defines it: at life start until first finish,
  then frozen. Proven headless: at core 40, The Scrub's rows take their
  day-one ticks and life one lasts as long as day one, food included; a
  scale-1 replay at core 40 runs at 3×.
- The profile and `hurts`, computed by a **book validator** that also rejects
  a row whose verb is not in the roster, a tag that is not a core, an icon
  name outside the vocabulary, and a book with no no-tool Acquire row. The
  Salt Road's real vector is asserted by a test. *(panel)* Once the skill id
  is book data nothing checks these at compile time, and the current
  completeness tests over the fixed union go vacuous and are replaced.
- Completion counts keyed by book and action; `templateKey` removed.
- Skill points removed: `ticksPerSkillPoint` leaves `balance.ts` and its
  locking test goes with it. *(panel)* Named here so the tuning guard sees an
  intended removal, not a slipped change.
- **Decision #3 reopened** with this carve-out: every curve and every
  game-wide constant stays in `balance.ts`; a book's own numbers live in the
  book's data file, and the tuning-literals hook learns the book format.
  A GitHub write, asked for explicitly.
- The two UI duration computations read the scale.

**Not in the slice, each filed with no milestone:** a second book, the shop,
badges, the bookmark and the state split, the picker and the shelf, the
finishing screen, the generator and step 5's template table, the run
ledger's weight.

**Tests the slice ends on:** the validator accepts The Salt Road and rejects
each malformed book above; the profile of The Salt Road equals its measured
vector; the scale test in §5; every existing engine and component test green
with the new key; the hooks suite green.

## 13. Open, each with a home

- 🎨 Player-facing names for the six cores. "Acquire" and "Modify" are role
  names and ship as placeholders in slice one, where the log and the death
  card must say something. *(user)* Renamed when the user has seen them.
- 🎨 The skill grid at N, and whether the cores get their own strip. The
  screen pass, #46.
- 🎨 The finishing screen, the shelf, the picker. After the second book.
- 🎚️ The run ledger's weight (§4), so sibling skills in a roster diverge.
  Decided with the second book, by measurement.
- 🎚️ Badge fractions and their floor, shop tiers and prices, badge weights by
  length. With the shop.
- ❓ Whether a narrative content label exists separately from `hurts`.

## 14. Considered and set aside

- **Twelve roles with a per-book skin**, books using a subset. Cheaper, keeps
  the fisherman, and *(panel)* nothing in it forces a Fish on every book. Set
  aside because it cannot split one core into the many skills a book's story
  wants (a digging book's Sort, Smelt, Cast and Shore are four Modify curves),
  which is the thing the user asked for.
- **One scale per book.** Measured wrong (§5).
- **Scaling core XP by the cost curve** to keep the core bar moving. The
  book-hopping pump (§5).
- **A flatter core curve** so levels keep arriving. *(user, decision A)*
  Rejected in favour of a trophy ledger.
- **Badge 3 as a hands-off run** counting manual inputs. Set aside once
  automation was defined as the game choosing actions: it never speeds a
  run, so ticks are the honest measure, and automation is what makes
  collecting the badge free.
- **An authored permanent ability per book** as the point of finishing. Good
  for a hand-authored book, impossible for a generated one. Superseded by the
  shop direction; a book may still contribute an item.
- **Points as effort divided by the player's scale**, paid every completion.
  Farm-resistant against replay but not against authoring. Superseded by
  per-book badges.
- **Replays pay nothing.** Needs a special case and a counter; badges bound
  the payout without either.
- **Absolute badge thresholds** (two hours, ten minutes). A short book could
  never earn one and a long book never the other.
- **Leaving a book ends its life.** Turns the automation loop into a chore.
- **A global rebirth bonus.** Leaks a hardcore book's deaths into a
  children's book.
- **A hand-authored sequence at bigger numbers, and no scale** *(panel's
  cheaper design)*. It is Increlution's model and it works for one authored
  line of books. Set aside because generated and custom books are the
  direction, and a sequence cannot be played out of order.
