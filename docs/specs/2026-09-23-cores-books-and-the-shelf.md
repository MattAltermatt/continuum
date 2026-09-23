# Cores, books, and the shelf

**Date:** 2026-09-23
**Status:** design, agreed in a brainstorm, awaiting a panel (two reviewers
and a naysayer). Amendments from that review will be folded in and marked
*(panel)*. This is the argument and the decisions. What is queued from it
lives in [GitHub Issues](https://github.com/MattAltermatt/continuum/issues).

**Shape:** a pivot. It amends
[Books, chapters, verbs, and the one screen](2026-09-22-books-chapters-verbs.md)
(the 09-22 spec below) in the places §11 lists, and it answers open
questions #17, #36, #37 and #39 or reshapes them. Everything about the tick,
the queue, decay, food and death is untouched.

---

## 1. The pivot in a paragraph

The twelve verbs were roles wearing forest costumes: each survived the verb
test (09-22 §6) on a mechanical reason, none of them about a forest. This
spec names six roles as the game's **cores**, and lets every **book** define
its own skills, each tagged with the core it feeds. A book about digging to
the centre of the earth has no Chop and no Fish; a children's book has no
Fight. What travels between books is the six cores, a shop of permanent items
bought with badges, and nothing else. Each book is scaled so that its first
chapter is a real start no matter what the player arrives with, and a book
left on the shelf is a bookmark, not a death.

Two things fall out that the twelve could not give: a book can be as custom
as its author likes, and procedural generation has a small honest brief to
hit rather than twelve curves to keep even.

## 2. The six cores

Fixed, owned by the game, one permanent ledger each. A book skill is tagged
with exactly one.

| Core | Role | Contract every book keeps |
|---|---|---|
| **Acquire** | materials in from the world | Life 1 opens on an Acquire skill that needs nothing in hand (the Forage contract) |
| **Modify** | materials in, a different thing out | a continuous Modify skill gets its own curve (the Cook rule, §7.2) |
| **Fight** | the only skill whose extra cost is health | a book with any Fight row can feed it (§10 feasibility) |
| **Travel** | the only skill that moves the player | clock-race big events live here |
| **Talk** | the only skill that acts on people | people gate things |
| **Search** | the only skill that produces a key | under the wall rule its output is what the next row requires |

Fight, Travel, Talk and Search are unique enough to be cores on their own,
which is what 09-22 §7 already argued. Acquire absorbs Forage, Chop, Mine,
Fish and Shoot; Modify absorbs Craft, Build and Cook. The old §6 rule 5
("Travel, Talk and Search are distinct only because books are
verb-weighted") is retired: they are distinct by definition now, and verb
weighting per book becomes a profile (§6), not a constraint on authoring.

## 3. A book owns its skills

A book declares its **roster**: its skills, each with a name, an icon and a
core tag. The roster is data in the book, like its rows. The verb test
(09-22 §6: its own tool, its own curve, a unique output) is still the rule for
whether a skill earns a slot, applied by the book's author rather than by the
game once.

The digging book, as an example:

```text
book skill    core       tool / place          the verb test says
-----------   --------   -------------------   ------------------------------
Dig           Acquire    pick, then drill      the Life-1 harvest, no tool
Haul          Acquire    cart, then lift       the tool-and-place harvest
Sort          Modify     screen                background prep (Cook's slot)
Smelt         Modify     furnace, a Build      continuous, so its own curve
Cast          Modify     mould                 once a life, could share Smelt
Shore         Modify     timber, a Build       output stays put (Build's slot)
Descend       Travel     the shaft             the clock race
```

No Chop, no Fish, no Talk, no Fight. Every tick in Dig levels run-Dig and
core-Acquire. Smelt earns a slot because it runs continuously and would
subsidize Cast (§7.2's argument, unchanged). A children's book declares no
Fight skill; core Fight sits where it was and nothing on screen references
it.

**Book one is The Forest.** Its roster is today's twelve, tagged: Forage,
Chop, Mine, Fish and Shoot under Acquire; Craft, Build and Cook under Modify;
Fight, Travel, Talk, Search under their own cores. No content changes; it is
a re-tagging, and it is the fixture the generator (§10) is tested against.

## 4. What persists, and what changed

```text
tier    count        owned by     persists            bonus
-----   ----------   ----------   -----------------   -------------------------
core    6, fixed     the game     forever             (1 + core x 5%)   as today
run     N, per book  the book     until death         (1 + run x 1%)    as today
```

Two ledgers, as MECHANICS §3 has them; only the *key* of the core ledger
moves from the verb to the core. Every book skill under a core gets that
core's **full** level as its core multiplier, never a share of it. Splitting
would punish a book for having seven skills instead of three, and authors
would merge skills to protect the bonus.

**The honest change.** 09-22 §7 rejected six category skills because *"a path
built on core mastery is the thing that persists."* Under this spec the
*path* (fast at Fish, slow at Chop) lives at the run tier and dies with the
run or the book. What persists is breadth: "I have acquired a lot," not "I am
a fisherman." That is the trade for custom books, recorded here rather than
slipped in. It is coherent for a reason the old model could not offer: a
per-verb core cannot survive a book change, because the next book may have
no Fish. A category core is the only thing that *can* travel.

**The category subsidy.** Core Modify is now levelled by dinner *and* by the
sword. At 5% per permanent level that is the intended cross-book head start,
not the in-run subsidy §7.2 guarded against, which stays blocked at the run
tier where Cook and Craft keep separate ledgers.

Beyond the cores, the only things that cross a book boundary are the shop
(§7), badges (§8), and each book's own automation unlocks, which persist
*within* that book. Nothing keys an action across books, so `templateKey`
(#24) has no job and goes. Skill points (MECHANICS §1, "earned but never
spent") go too; badges are the currency. Rebirth is per book: a bookmarked
book keeps its own lives and its own bonus.

## 5. Every book carries a scale

Without it, book B sits on book A's number scale, and two things go wrong at
B's first chapter: the content is trivial under a permanent multiplier, and
the core bar is dead, because a core level at 40 costs about 45 times base, at
100 about 13,800 times, while a tick pays what it paid on day one. Both are
one bug. Increlution never meets it because its later chapters are simply
authored bigger; that works for a hand-authored sequence and breaks the
moment books are custom, generated, or played in any order.

**One number per book, set once.** It multiplies two things in that book and
nothing else: every action's `expCost`, and the core XP each tick pays.

| Who sets it | When | Value |
|---|---|---|
| a hand-authored sequence | the author | book A's expected exit cores |
| any-order or generated | first entry, then saved with the book | from the player's cores, weighted by the book's profile (§6) |

```text
                          book A, day 1    book A, replay    book B, first entry
------------------------  --------------   ---------------   -------------------
core Acquire              0                40                40
book skill (run) level    0                0                 0
scale                     1x               1x                ~45x
pick berries feels like   a real start     seconds           a real start
core bar                  moves            crawls            moves
```

What core then buys is honest: any book below the current scale is fast.
Replaying The Forest is minutes; a children's book after a hardcore one is a
breeze. The frontier book always runs at design pace, which is what every
idle game does; the bonus compresses the past, never the present. A knob,
tuning and not shape: the scale may target the frontier to feel slightly
faster than a fresh player would have it, so a veteran feels veteran without
the head start compounding across books.

Not scaled: run XP and run cost (run resets, and B's skills are new). Not
done: banking core only at chapter end (a bar that never ticks is dead UI, and
live is built), or capping the core bonus (it fixes neither problem and makes
the permanent ledger lie).

## 6. The profile, derived

For each core, the sum of `expCost` over the book's actions that feed it,
divided by the book's total. **Never typed by the author.** An author cannot
claim "no violence" over a book with a Fight row, nor pad Talk in the blurb.

```text
book                         Acquire  Modify  Fight  Travel  Talk  Search
--------------------------   -------  ------  -----  ------  ----  ------
The Forest (book one)          .40     .30     .10    .10     .05    .05
Dig, to the centre             .45     .40     0      .15     0      0
The Lighthouse Keeper (kids)   .25     .20     0      .10     .40    .05
```

One vector, three jobs:

- **Content rating.** Fight 0 is the children's badge, and it is a fact about
  the rows. It rates what the player *does*, not what the prose says; a
  narrative label, if ever wanted, is separate.
- **The picker.** The player's six cores beside the book's six weights. A
  player who dug to the centre and never talked sees Talk far below the rest,
  and the Lighthouse Keeper's .40 is visibly the book that moves it. Both
  columns are true this second; nothing is a prediction (09-22 §8.1).
  Equalizing is a goal the picker *offers*, never a tax: the scale already
  reads the cores a book uses, so a lopsided player is never punished by
  pacing.
- **The scale.** §5's weighting. A Talk-heavy book scales off Talk, so a
  player with Acquire 40 and Talk 5 gets a book paced for Talk 5.

## 7. The shop

Core is cancelled at the frontier by construction, so the point of the next
book cannot be speed. **Core is the record; badges are the power.** Badges
(§8) buy permanent, game-level items:

```text
item             tiers   effect
--------------   -----   -------------------------------------------
Deep pockets     5       +1 shared stack cap per tier
Thick skin       5       decay slower per tier
Second hand      3       +1 automation slot per tier
Provisions       3       start each life with food per tier
Long memory      3       +1 queue length per tier
```

Two rules keep the shop from recreating the problem the scale solved:

- **Every item is finite tiers, never an unbounded percentage.** Five tiers of
  cap is a bounded head start. "+2% per point, forever" compounds across books
  until the frontier is trivial again, and then the scale would have to read
  the shop, and then the shop buys nothing.
- **The scale never reads the shop.** So a shop item is a head start that
  survives at the frontier, which is the entire point of it.

The item list is illustrative. A book *may* add a unique item to the shop as
flavor; the pool lives with the game, which is what a generated book needs.

## 8. Three badges per book

A per-completion payout can be farmed by authoring: a book is at whatever
scale its author wants. Per-book badges bound what any one book can ever pay,
so no authoring trick reaches the shop.

```text
badge   earned when                            what it rewards
-----   ------------------------------------   ----------------------------
1       finished                               seeing the story through
2       finished at or above design length     playing it as a frontier book
3       finished under a fraction of it        coming back as a veteran
```

- **Ticks, not wall clock.** Decision #41: time passes only while work
  happens. "Design length" is the book's effort at scale 1, in ticks; badge
  thresholds are fractions of it, so a twenty-minute children's book and a
  six-hour epic can each earn all three. The fraction is tuning.
- **Two and three cannot both land in one run**, so a third star means the
  player came back. That is why old books stay on the shelf.
- **Dawdling for badge 2 is self-limiting.** It costs the time and buys one
  point once. Not worth a rule.
- **Shipped and generated books pay; a book the player wrote or edited is
  marked and pays none.** Otherwise a hundred one-row custom books is a
  hundred points. The generator enforces a minimum length, so its output
  cannot be junk. Custom books stay fully playable; they are not currency.
- One point per badge for now. If big books should pay more than small ones,
  that is a weight by design length, and tuning.

## 9. The bookmark, and the loop it makes

**Leaving a book freezes its run in place**: its queue, its pack, its health,
its automation. Returning resumes it. Under decision #41 this is free, since
no time passes in a book nobody is reading. The alternative, where leaving
ends the life, makes every visit to an old book a rebirth and turns "pop back
in to set up one more automation" into a chore.

The loop the decisions produce:

```text
                            book A                            book B
-------------------------   -------------------------------   --------------------------
finish A (badges 1+2)       core grows; automation partly     opens at A's exit scale
                            unlocked
play B                      idle on the shelf; every core     the frontier: design pace,
                            level B earns makes A faster      new story, new roster
pop back into A             faster than last time; set up     frozen where it was
                            the next automation; die or
                            finish; go back
a few rounds of that        one-click run, under the          still the interest
                            fraction: badge 3
drop A                      three stars, done                 the only book open
```

Core is shared, so playing B is what makes A collapse; the player never
grinds A to speed A up. Going back to A is only ever about *automation*, a
different fun from "can I get further": can I make this run itself. There is
always one book that is a story and one that is a puzzle. A's own core
contribution stalls on its own: a scale-1 book pays a 45th per tick of what a
scale-45 book pays, and its runs get shorter on top.

Badge 3's fraction is tuned so it needs both grown cores *and* set-up
automation, roughly three to five returns. It is the first number to measure
once two books exist.

## 10. The generator's brief

The profile is the generator's input and the mechanics above are the rules it
generates against. A 90% Fight book, as the worked case:

```text
input     profile [.10 .00 .90 .00 .00 .00], scale 45, length M
step 1    roster: the verb test picks from what the profile needs
          (one Acquire skill for food, one Fight skill; no Modify at all)
step 2    rows: fill each core's share of expCost until the sums land
step 3    chains: the wall rule strings them (09-22 §10: structure generates well)
step 4    feasibility: every Fight row's health cost is coverable by the
          Acquire share's food output, or the profile is refused
step 5    names, nouns and beats: a table or a model, generated once, saved
output    the same book format The Forest is written in
```

Step 4 is where "punishing" is honest: a profile that cannot feed its own
fighting is infeasible, and the generator says so rather than emitting a book
nobody can finish. Step 5 is the open half of #39 ("without AI, no
decision"); the skeleton needs no model, the prose does or a template table
does, and nothing here forces that choice.

**The hand-authored book is written in the exact format the generator
emits.** The Forest is both book one and the fixture, and "procgen" becomes
"produce this data," testable headless against the feasibility check before
any prose exists.

## 11. What this changes in the 09-22 spec

- **§1 "Books are places within a life"** is superseded. A book has its own
  lives; the player does not walk from A into B inside one run. Several
  books open at once survives, as bookmarks. "Diminishing XP per book is the
  mechanism that makes the choice" survives, as the scale. **#36** (reaching
  book B versus the run budget) is answered: it is not reached within a run.
- **§1 "A global restart resets every book"** is dropped. The shop is the
  prestige layer and needs no reset. **#37** is answered: what survives is
  the six cores, the shop, the badges, and each book's automation.
- **§5–7, the twelve verbs**, become book one's roster. The verb test (§6)
  and §7.1–7.3 stand as authoring rules. §6 rule 5 is retired. §7's rejection
  of "six category skills plus tool multipliers" is superseded by §4 here,
  with the trade named.
- **§8.3 "twelve, four across, three rows"** becomes N per book, grouped by
  core, in core order. The MVP is still twelve; the grid change folds into
  the screen pass (#46). Whether the six cores get a strip of their own on
  screen is open (§13).
- **§9 skill points** are removed rather than parked. **§9 `templateKey`**
  and **#24** are removed with them.
- **#17 "skills only make themselves faster"** changes premise: a skill's
  permanent bonus is shared with its siblings under the same core.
- **#39 procgen** gains its brief (§10).
- `(1 + core × 5%) × (1 + run × 1%) × tool` is unchanged; `core` now indexes
  a core, not a verb.

## 12. The first slice

A data reshape and a spec, not an engine change. Tick, queue, decay, food and
death are untouched, so #47, #45 and #46 are unaffected. It should ship
*before* #47: it moves the skill id from a fixed union to book data, and every
engine slice after it would otherwise churn twice.

In the slice: the six cores as the core ledger's key; the book format, with a
roster, rows, items, a `scale` and the derived profile; The Forest rewritten
in it, re-tagged, with no content change; the profile derivation with a test
against The Forest's rows; the scale as a seam, one field and two
multiplications, proven headless (a book at 45× paces like The Forest at 1×,
core XP included). Not in the slice: a second book, the shop, badges, the
bookmark, the picker, the finishing screen, the generator. Each is filed.

## 13. Open, each with a home

- 🎨 Player-facing names for the six cores. "Acquire" and "Modify" are role
  names; the picker and the ledger will show them. Needed with the second
  book.
- 🎨 The skill grid at N, and whether the cores get their own strip. The
  screen pass, #46.
- 🎨 The finishing screen, the shelf, the picker. After the MVP book.
- 🎚️ Every number: the scale's weighting formula and any frontier discount,
  the badge fractions, shop tiers and prices, badge weights by length.
- ❓ Step 5 of §10: where a generated book's prose comes from. #39.
- ❓ Whether a narrative content label exists separately from the profile.

## 14. Considered and set aside

- **Twelve roles with a per-book skin** (name and icon per verb, name per
  material). Cheaper, and it keeps a per-verb path, but it forces every book
  to have a Fish and a Chop, which is exactly what a digging book should not
  have.
- **An authored permanent ability per book** as the point of finishing. Good
  for a hand-authored book, impossible for a generated one. Superseded by the
  shop; a book may still contribute an item.
- **Points as effort divided by the player's scale**, paid every completion.
  Farm-resistant against replay but not against authoring: a custom book is
  at whatever scale its author wants. Superseded by per-book badges.
- **Replays pay nothing.** Needs a special case and a counter; badges bound
  the payout without either.
- **Absolute badge thresholds** (two hours, ten minutes). A short book could
  never earn one and a long book never the other.
- **Leaving a book ends its life.** Turns the automation loop into a chore.
- **A global rebirth bonus.** Leaks a hardcore book's deaths into a
  children's book.
