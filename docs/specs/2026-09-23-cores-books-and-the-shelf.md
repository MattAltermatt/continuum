# Categories, books, and the shelf

**Date:** 2026-09-23
**Status:** design, agreed in a brainstorm, then reviewed by a panel over
three rounds (a reviewer against the code and the earlier specs, an economist
who simulated the loop headless, a naysayer; round two ran the real engine).
Rounds one and two each broke the shared cross-book ledger the design then
rested on; the user dropped it in favour of this shape. Findings that shaped a
section are marked *(panel)*; the user's decisions *(user)*. This is the
argument and the decisions. What is queued from it lives in
[GitHub Issues](https://github.com/MattAltermatt/continuum/issues).

**Shape:** a pivot. It amends
[Books, chapters, verbs, and the one screen](2026-09-22-books-chapters-verbs.md)
(the 09-22 spec below), MECHANICS.md and VISION.md in the places §11 lists,
and it answers or reshapes #36, #37 and #39. The tick order, the queue,
decay, food, death and rebirth are untouched.

---

## 1. The pivot in a paragraph

Each book is the whole game on its own. A book defines its own skills, and
each of those skills keeps the two ledgers MECHANICS §3 has today: one that
persists across deaths for as long as the book exists, one that resets on
death. A book about digging to the centre of the earth has no Chop and no
Fish; a children's book has no Fight. **Nothing crosses a book boundary
except what the player has bought**: badges earned per book buy permanent
items in a shop, and a book left on the shelf is a bookmark, not a death.
The twelve verbs' six mechanical roles survive as **categories**, tags on a
skill that say what kind of thing it is, for the book's rating and for the
generator's brief. They are not skills and they have no ledger.

*(user)* "I was really hoping to have some connection between the books, but
that just complicates everything. The connection becomes the things bought."

*(panel)* Two earlier shapes were tried and measured. A shared six-core
ledger across books needed a per-book scale to keep the next book from being
trivial; every scale rule either broke the next book's pacing or removed the
cross-life lever inside a book, and the shared ledger let dinner level the
sword. See §14.

## 2. The six categories

Fixed, owned by the game. A book skill is tagged with exactly one. A
category is a tag, not a ledger.

| Category | What its skills do | Rule every book keeps |
|---|---|---|
| **Acquire** | materials in from the world | Life 1 opens on an Acquire row with no inputs (the Forage contract) |
| **Modify** | materials in, a different thing out | a continuous Modify skill gets its own curve (the Cook rule, 09-22 §7.2, which stands) |
| **Fight** | rows whose extra cost is always health | none beyond that |
| **Travel** | the only skills that move the player | clock-race big events live here |
| **Talk** | the only skills that act on people | people gate things |
| **Search** | the only skills that produce a key | under the wall rule its output is what the next row requires |

*(panel)* Damage is a property of the **row** (09-22 §7.3, which stands): a
Shoot threat row under Acquire takes damage. Anything that reads "does this
book hurt" reads the rows (§6), never the tag. The old 09-22 §6 rule 5
("Travel, Talk and Search are distinct only because books are
verb-weighted") is retired: they are categories by definition, and verb
weighting per book becomes a profile (§6), not a constraint on authoring.

## 3. A book owns its skills, and their ledgers

A book declares its **roster**: its skills, each with a name, an icon name
from a closed vocabulary the UI maps *(panel: data may not import UI, so the
roster cannot hold a component)*, and a category. The roster is data in the
book, like its rows. The verb test (09-22 §6: its own tool, its own curve, a
unique output) is the rule for whether a skill earns a slot, applied by the
book's author rather than by the game once. *(panel)* With a ledger per book
skill, the "own curve" prong is real: two siblings under Modify diverge as
far as play takes them, which a shared ledger could not give.

**Two ledgers per book skill, both scoped to the book:**

```text
ledger    persists                 resets          bonus
-------   ----------------------   -------------   -----------------------------
book      as long as the book      never           (1 + level x 5%)   as today
run       until death              on death        (1 + level x 1%)   as today
```

These are today's "core" and "run" ledgers (MECHANICS §3, `balance.skills`),
paid the same amount from the same tick, unchanged; only the *scope* of the
persistent one becomes the book. Its name changes, since "core" now means a
category; the name is settled in the plan and is player-facing only in the
ledger hover (09-22 §8.3 already calls those names placeholders).

The digging book, as an example:

```text
book skill    category   tool / place          the verb test says
-----------   --------   -------------------   ------------------------------
Dig           Acquire    bare hands, then a    the Life-1 harvest, no inputs
                         pick
Haul          Acquire    cart, then lift       the tool-and-place harvest
Sort          Modify     screen                background prep (Cook's slot)
Smelt         Modify     furnace, a Build      continuous, so its own curve
Cast          Modify     mould                 once a life, could share Smelt
Shore         Modify     timber, a Build       output stays put (Build's slot)
Descend       Travel     the shaft             the clock race
```

No Chop, no Fish, no Talk, no Fight. A children's book declares no Fight
skill and its rating (§6) says so.

**Book one is The Salt Road** (`book: 'The Salt Road'`, chapter The Scrub,
`src/data/scrub.ts`; *panel: an earlier draft called it "The Forest", which
never existed*). Its roster is today's twelve, tagged: Forage, Chop, Mine,
Fish and Shoot under Acquire; Craft, Build and Cook under Modify; Fight,
Travel, Talk, Search under their own categories. Today only Forage, Mine and
Build have rows (forage, mine, cabin, hall). No content changes and no number
moves: it is a re-tagging, and it is the fixture the generator (§10) is
tested against.

## 4. What crosses a book boundary

Three things, and nothing else:

- **Badges**, earned per book (§7).
- **The shop**, where badges buy permanent, game-level items in finite tiers
  (§7). A shop item is the only thing that makes a veteran faster in a book
  they have never opened. *(user)* A book may add a unique item to the shop,
  so that what was bought carries the story of where it came from; that is
  the connection between books.
- **The bookmark** (§8): every book the player has opened, frozen where it
  was, with its ledgers, its automation, its lives and its rebirth bonus.

Nothing else. No skill level, no multiplier, no profile of the player. A new
book starts every skill at zero for every player. *(panel)* That is what two
rounds of scale rules were trying to achieve by formula, and it is now true by
definition: the next book's first chapter is a real start, a lopsided player
cannot exist, there is nothing to peek at and lock, and book-hopping and
custom books cannot pump anything. The existing progression test on The Salt
Road stays green because nothing about a single book changes.

Automation unlocks are per book: completion counts are keyed by book and
action *(panel: today's `templateKey ?? id` would let two books that both
define `forage` share progress)*. Nothing keys an action across books, so
`templateKey` (#24) has no job and goes. Skill points (MECHANICS §1, "earned
but never spent") go too; badges are the currency. Rebirth is per book: a
bookmarked book keeps its own lives and its own bonus, and *(panel, measured)*
the rebirth math is untouched: about +2.8 max health per death.

## 5. Every book is a real start, and its arc is its own

A book's arc is 09-22 §1's *"weeks, then minutes, then seconds"*, produced by
its own persistent ledger across its own lives, exactly as The Salt Road's
is today. *(panel, measured on the real engine)* At today's numbers hall
stone per life on The Salt Road goes 45, 69, 82, 91, 99, 105 across six
lives; that arc is the mechanism, and it is what the two earlier scale rules
destroyed (§14).

Two consequences, both accepted:

- **A veteran opening a new book is a beginner in it.** What they bring is
  the shop, and the shop is designed to be that (§7).
- **Returning to an old book is fast only because of that book's own
  ledger.** Playing B does nothing for A. Going back to A is A's own arc
  continuing, which is the loop in §8.

## 6. The profile, derived

For each category, the share of a finish's effort spent on skills of that
category, and beside it one flag, **hurts**, true when any row costs health.
Both derived, never typed: an author cannot claim "no violence" over a book
with a damaging row, nor pad Talk in the blurb.

*(panel)* The share cannot be read off the rows. Summing each row's `expCost`
once rates the real Salt Road Modify .998, because the 5000-XP placeholder
hall counts once beside a berry that runs hundreds of times, and food demand
depends on decay and life length, which are play, not data. So the profile is
an output of the **headless play** the generator's validator runs (§10), with
its policy named, and it lands with the generator, not before. `hurts` needs
a damage field on a row, which the engine does not have yet (09-22 §9 lists
the Kill drain as a widening); it lands with that field.

```text
book (illustrative, not measured)   Acquire  Modify  Fight  Travel  Talk  Search  hurts
---------------------------------   -------  ------  -----  ------  ----  ------  -----
Dig, to the centre                    .45     .40     0      .15     0      0     no
The Lighthouse Keeper (kids)          .25     .20     0      .10     .40    .05   no
a wolf book                           .30     .10     .50    .10     0      0     yes
```

Two jobs:

- **Content rating.** `hurts` is the children's badge, and the vector says
  what the book is mostly about. Both rate what the player *does*, not what
  the prose says; a narrative label, if ever wanted, is separate.
- **The generator's brief.** §10. *(user)* "If you want a punishing book
  with 90% fighting, go for it."

The earlier draft gave the profile a third job, a picker that compared the
player's cores to the book's weights. With no player ledger there is nothing
to compare; the shelf shows books, badges and ratings.

## 7. Direction, decided with the second book: badges and the shop

*(user)* Badges and the shop are direction, not decisions. Most early books
will be generated, and the numbers come from playing two. Recorded so the
thinking is not lost, with the panel's constraints pinned beside it; each
becomes an issue with no milestone. Nothing in §12 depends on this section.
*(panel)* Under this shape the shop is the **entire** cross-book meta, so it
is the load-bearing design of the second-book slice rather than a later
concern.

**Why a shop.** Badges buy permanent, game-level items in finite tiers (a
stack cap tier, slower decay, an automation slot, starting food, queue
length: all illustrative, and several name mechanics that do not exist yet).
Two rules: every item is finite tiers, never an unbounded percentage, or a
veteran's new book stops being a start; and a book may add a unique item.
*(panel)* Nineteen illustrative tiers are bought out after about seven books;
prices that rise per tier, a badge sink, and items that arrive with books are
the levers, decided with the shop.

**Why badges, three per book.** A per-completion payout can be farmed by
authoring; per-book badges bound what any one book can ever pay. Badge 1,
finished. Badge 2, finished at or above design length: played it fresh.
Badge 3, finished under a fraction of design length: came back and let the
book's own arc do it. Two and three cannot both land in one run.

- **Ticks, not wall clock** (decision #41), **counted from the book's restart
  to its finish across every life between.** A death costs its ticks, so
  settings that mismanage food show in the number. *(user)* Automation is
  the game choosing actions from the player's settings; it never makes a run
  faster. It makes a return visit free of attention, which is what lets a
  player collect badge 3 from a book they have moved past.
- **Design length** *(panel: was undefined)*: the ticks the validator's
  headless play spends finishing the book from zero, all lives counted, the
  same play that yields the profile (§6).
- **Shipped and generated books pay; a book the player wrote or edited is
  marked and pays none.** Custom books stay fully playable; they are not
  currency. *(panel)* This is an in-save flag in a single-player browser
  game; it stops accidents, not intent, and that is enough.

## 8. The bookmark, and the loop it makes

**Leaving a book freezes its run in place**: its queue, its pack, its health,
its automation, its ledgers. Returning resumes it. Under decision #41 this is
free, since no time passes in a book nobody is reading. *(panel)* With no
player-level ledger, leaving and returning changes nothing about the book,
so the bookmark has no exploit surface at all. The alternative, where leaving
ends the life, makes every visit to an old book a rebirth and turns "pop back
in to set up one more automation" into a chore.

*(panel)* **What it costs, named.** Game state becomes the shop and badges
plus one frozen run per book plus which is active, with max health, life
number and rebirth bonus per book. #27 (save and load) had recommended
saving at death only, to avoid in-flight state; bookmarks make mid-run the
normal case, so the save holds every frozen run and every generated book's
data.

The loop the decisions produce:

```text
                            book A                            book B
-------------------------   -------------------------------   --------------------------
finish A                    its ledgers high; automation      every skill at zero;
                            partly unlocked                   a real start
play B                      idle on the shelf, unchanged      the story: new roster,
                                                              new arc from scratch
pop back into A             its own arc continues; set up     frozen where it was
                            the next automation; the
                            settings run it; go back
some rounds of that         a hands-free run under the        still the interest
                            fraction: badge 3, when it
                            exists
drop A                      three stars, done                 the only book open
```

There is always one book that is a story and one that is a puzzle, and the
puzzle book gets faster only by being played. *(panel)* Nothing about B makes
A collapse; an earlier draft claimed that and it rested on the shared ledger.

## 9. What a finish is

A book is finished when its last chapter's big event completes. Finishing
ends that life; the book can be restarted from its first chapter with its
persistent ledgers and automation kept and its badge clock (§7) reset. What
the finishing screen looks like, and the shelf, are designed after the
second book exists (§13). The Salt Road has no finish today: its hall is a
placeholder sink no life can complete (#44), so finish detection lands with
the first book that has an end.

## 10. The generator's brief

The profile is the generator's input and the mechanics above are the rules it
generates against. A 90% Fight book, as the worked case:

```text
input     profile [.10 .00 .90 .00 .00 .00], length M
step 1    roster: the verb test picks from what the profile needs
          (one Acquire skill for food, one Fight skill; a Build for the
          decay defence, so Modify is not quite zero)
step 2    rows: fill each category's share of a finish's effort until the
          sums land
step 3    chains: the wall rule strings them (09-22 §10: structure generates well)
step 4    feasibility: the validator plays the book headless from zero and
          refuses it unless it is finished within a bounded number of lives
step 5    names, nouns and beats: from a template table, generated once, saved
output    the same book format The Salt Road is written in
```

*(panel)* **Step 4 is a simulation, not a formula, and this shape makes it
well-defined.** Every player opens every book at zero, so "from zero" is the
only state there is; the earlier shape had to ask "at which core?" and the
verdict flipped with the answer. The check plays the book from zero with a
named policy and a bound on lives; a book that is not finished within the
bound is refused rather than emitted. A book also has to survive the decay
clock (09-22 §3), needs a `healthDecayMultiplier` source ("the only defence
against the clock", MECHANICS §4), needs a sink for every material (09-22
§2), and needs a reachable big event per chapter; the play covers all of
that at once. *(panel)* Open: a greedy policy can refuse a book a human
finishes by stockpiling before a fight. The policy is part of the game's
definition of feasibility and is designed with the generator.

*(panel)* **Step 5 is a template table**, which is the reading consistent
with #39's "without AI." A model at generation time would reopen #39, and
this spec does not.

**The hand-authored book is written in the exact format the generator
emits.** The Salt Road is both book one and the fixture, and "procgen"
becomes "produce this data," testable headless through the validator before
any prose exists. *(panel)* A generated book's numbers cannot live in
`balance.ts`, which is a change to decision #3; and per-row numbers such as
healing and a decay multiplier are halves of the survival curve and cannot
simply leave the guard. The carve-out is decided with the generator, as a
reopen of a locked decision with a trail. Until then The Salt Road's numbers
stay where they are.

## 11. What this changes elsewhere

**In the 09-22 spec:**

- **§1 "Books are places within a life"** is superseded. A book has its own
  lives; the player does not walk from A into B inside one run. Several
  books open at once survives, as bookmarks. "Diminishing XP per book is the
  mechanism that makes the choice" survives as each book's own arc. **#36**
  (reaching book B versus the run budget) is answered: it is not reached
  within a run.
- **§1 "every book goes back to its first chapter"** on death: now only the
  book the player died in.
- **§1 "A global restart resets every book"** is dropped. The shop is the
  prestige layer and needs no reset. **#37** is answered: what survives is
  each book's own ledgers and automation, the badges, and the shop.
- **§5–7, the twelve verbs**, become book one's roster. The verb test (§6)
  and §7.1–7.3 stand as authoring rules, fully, since every book skill has
  its own persistent curve. §6 rule 5 is retired. §7's rejection of "six
  category skills plus tool multipliers" stands, for a reason this spec
  measured (§14).
- **§8.3 "twelve, four across, three rows"** becomes N per book, grouped by
  category, in category order. Book one is still twelve, so the grid change
  folds into the screen pass (#46). **§8.3's** "first-used book" counter
  goes.
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
- **#17 "skills only make themselves faster"** stands as it is.
- **#39 procgen** gains its brief (§10).
- `(1 + persistent × 5%) × (1 + run × 1%) × tool` is unchanged.

**In MECHANICS.md:**

- §1 and the constants table: skill points and `ticksPerSkillPoint` go.
- §2: the `templateKey` field and "increment `actionCompletionCounts[templateKey]`"
  become a book-and-action key.
- §3: "every skill carries two independent levels" stands; the skills are the
  book's, and the persistent ledger is scoped to the book.
- §5: what persists is per book: its ledgers, automation, rebirth bonus and
  life number; plus the shop and badges. Skill points go.
- §6: automation keyed by book and action.

**In VISION.md:** "dual mastery: every skill keeps two ledgers" stands, per
book; "what carries forward is what you learned to do faster" becomes
"within a book, what you learned; between books, what you bought"; "few
abilities, the roster stays small enough" is now per book, and the generator
enforces it; "keep the max-health you earned" is per book.

**In the v0.2 spec:** nothing in the slice. The Provisions shop item, if it
ever lands, contradicts v0.2 §2.1's "food is a within-life plan" and is
decided with the shop.

**In README.md and CLAUDE.md:** "the twelve skills" becomes book one's
roster; the guard-layer notes on `src/data/` gain the book format.

## 12. The first slice: the seam

*(user)* This ships **before #47**, so that the queue model, the stack cap
(#45) and the screen pass (#46) are each built once on the new shape.
*(panel)* It is a re-key with one consumer, the second book, which is the
next slice and the thing that produces every number §7 and §13 defer. It
cannot harm The Salt Road because nothing about a single book changes.

**In the slice:**

- The skill id becomes book data: the fixed `SkillId` union goes, and the
  engine's skill map, `newState`, `stepQueue`'s award step, `lifeStartCore`,
  the `coreLevel` event and rebirth's death-card gains are keyed by the
  book's skill ids. The persistent ledger is renamed from "core", in code and
  in the ledger hover.
- The book format: id, name, roster (name, icon name, category), rows, items.
  The Salt Road rewritten in it, re-tagged, with its numbers still read from
  `balance.content.scrub`. *(panel)* No scale field: there is no scale.
- A **book validator** (static, no play): every row's verb is in the roster,
  every category is one of the six, every icon name is in the vocabulary,
  every item a row names exists, and the book has an Acquire row with no
  inputs. *(panel)* Once the skill id is book data nothing checks these at
  compile time, and the completeness tests over the fixed union
  (`icons.test.ts`, `scrub.test.ts`) go vacuous and are replaced by it.
- Completion counts keyed by book and action; `templateKey` removed from the
  format, the engine, and the row's automation lookup.
- Skill points removed: `ticksPerSkillPoint` leaves `balance.ts` and its
  locking test goes with it. *(panel)* Named here so the tuning guard sees an
  intended removal, not a slipped change.
- The icon vocabulary: `SKILL_ICONS` keyed by icon name, and the roster names
  one.

**Not in the slice, each filed with no milestone:** the second book (next),
the profile and `hurts`, badges, the shop, the bookmark and the state split,
the shelf, finish detection and the finishing screen, the generator and its
validator play, the decision #3 carve-out, and the skill grid at N (#46).

**Tests the slice ends on:** every existing engine and component test green,
including `playable.test.ts`'s progression across lives; the validator
accepts The Salt Road and rejects each malformed book above; The Salt Road's
roster names all twelve with their categories; the hooks suite green.

## 13. Open, each with a home

- 🎨 The persistent ledger's player-facing name in the hover. The plan.
- 🎨 The skill grid at N, and whether categories group it visibly. #46.
- 🎨 The finishing screen and the shelf. After the second book.
- 🎚️ Badge fractions, shop tiers, prices, a badge sink, badge weights by
  length. With the shop, which is the second-book slice's load-bearing
  design.
- ❓ The validator's play policy and its bound on lives. With the generator.
- ❓ Whether a narrative content label exists separately from `hurts`.

## 14. Considered and set aside

- **Six shared cores with a per-book ledger key** (rounds one and two). A
  category-level ledger that crossed books needed a scale so the next book
  was not trivial. One scale per book (the core cost ratio) made book B 15×
  slower and starved lives; a per-core scale snapshotted each life removed
  the cross-life lever (hall stone per life 45, 32, 30, 30 on the real
  engine); snapshotting once per book worked at core 40 (35 lives) and
  failed at core 80 (350 lives) under the `1.1^level` curve; and the shared
  ledger let Cook level Modify mid-life so siblings differed by under a
  third. Each measured. *(user)* Dropped: "the connection becomes the things
  bought."
- **Twelve roles with a per-book skin**, books using a subset. Keeps a
  per-verb ledger across books, which is the same shared-ledger problem with
  twelve keys instead of six, and cannot split one category into the many
  skills a book's story wants.
- **A flatter persistent curve** so a shared ledger kept growing. Moot with
  no shared ledger; inside a book the exponential curve is Increlution's own
  and restarts per book.
- **Badge 3 as a hands-off run** counting manual inputs. Set aside once
  automation was defined as the game choosing actions: it never speeds a
  run, so ticks are the honest measure, and automation is what makes
  collecting the badge free.
- **An authored permanent ability per book** as the point of finishing.
  Superseded by the shop; a book may still contribute an item.
- **Points as effort divided by the player's scale**, paid every completion.
  Moot with no scale. Superseded by per-book badges.
- **Replays pay nothing.** Needs a special case and a counter; badges bound
  the payout without either.
- **Absolute badge thresholds** (two hours, ten minutes). A short book could
  never earn one and a long book never the other.
- **Leaving a book ends its life.** Turns the automation loop into a chore.
- **A global rebirth bonus.** Leaks a hardcore book's deaths into a
  children's book.
- **A hand-authored sequence at bigger numbers** (the panel's cheaper
  design). Works for one authored line of books and cannot be played out of
  order. Under this shape it is unnecessary anyway: every book is a start.
