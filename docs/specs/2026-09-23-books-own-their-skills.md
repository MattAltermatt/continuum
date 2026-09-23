# Books own their skills

**Date:** 2026-09-23
**Status:** design, agreed in a brainstorm, then reviewed by a panel over
three rounds (a reviewer against the code and the earlier specs, an economist
who simulated the loop headless, a naysayer; rounds two and three ran the
real engine). Rounds one and two each broke the shared cross-book ledger the
design then rested on; the user dropped it, and then dropped the six
"categories" that had survived as tags. Findings that shaped a section are
marked *(panel)*; the user's decisions *(user)*. This is the argument and the
decisions. What is queued from it lives in
[GitHub Issues](https://github.com/MattAltermatt/continuum/issues).

**Shape:** a pivot. It amends
[Books, chapters, verbs, and the one screen](2026-09-22-books-chapters-verbs.md)
(the 09-22 spec below), MECHANICS.md and VISION.md in the places §10 lists,
and it answers or reshapes #36, #37 and #39. The tick order, the queue,
decay, food, death and rebirth are untouched.

---

## 1. The pivot in a paragraph

*(user)* "It's like we are taking on the guise of the character in the book,
and starting fresh each time." Each book is the whole game on its own. A
book declares its own skills, and each of those skills keeps the two ledgers
MECHANICS §3 has today: one that persists across deaths for as long as the
book exists, one that resets on death. A book about digging to the centre of
the earth has no Chop and no Fish; a children's book has no Fight. If book A
and book B both have a skill called Forage, that is coincidence; they do not
interact. **Nothing crosses a book boundary except what the player has
bought**: badges earned per book buy permanent things in a shop, and a book
left on the shelf is a bookmark, not a death.

*(panel)* Two earlier shapes were tried and measured. A shared six-core ledger
across books needed a per-book scale to keep the next book from being
trivial; every scale rule either broke the next book's pacing or removed the
cross-life lever inside a book, and the shared ledger let dinner level the
sword. The six roles then survived a round as category tags with no reader;
the user scrapped them. See §13.

## 2. A book owns its skills, and their ledgers

A book declares its **roster**: its skills, each with an id, a name, and an
icon name from a closed vocabulary that lives in `src/data/` and the UI maps
*(panel: data may not import UI, so the roster cannot hold a component, and
a validator in the data layer cannot read a UI list)*. The roster is data in
the book, like its rows.

*(user, decision A)* **The roster is the skills that have rows.** A skill
without a row is not in the book. The Salt Road's roster today is therefore
**Forage, Mine and Build**, the three verbs its four rows use; the skills
band shows three cells, and the other nine of the old twelve return as
chapters give them rows. *(panel)* Twelve declared skills with nine that can
never move failed the fixture's own verb test, and a generated book could pad
its roster the same way.

The verb test (09-22 §6: its own tool, its own curve, a unique output) is the
rule for whether a skill earns a slot, applied by the book's author rather
than by the game once. §7.1–7.3 of 09-22 stand as authoring rules, fully,
because every book skill has its own persistent curve: two continuous
skills in one book diverge as far as play takes them.

**Two ledgers per skill, both scoped to the book:**

```text
ledger    persists                 resets          bonus
-------   ----------------------   -------------   -----------------------------
core      as long as the book      never           (1 + level x 5%)   as today
run       until death              on death        (1 + level x 1%)   as today
```

These are today's ledgers (MECHANICS §3, `balance.skills`), paid the same
amount from the same tick, unchanged; only the *scope* of the persistent one
becomes the book, and it already is, since the game holds one book. *(user)*
Both names are due a rename ("I have forgotten what they mean") and that
comes later; the slice keeps `core` and `run` everywhere, including the death
card's "core 4 → 6".

The digging book, as an example of a roster the verb test allows:

```text
book skill    tool / place          the verb test says
-----------   -------------------   ------------------------------
Dig           bare hands, then a    the Life-1 harvest, no inputs
              pick
Haul          cart, then lift       the tool-and-place harvest
Sort          screen                background prep (Cook's slot)
Smelt         furnace, a Build      continuous, so its own curve
Cast          mould                 once a life, could share Smelt
Shore         timber, a Build       output stays put (Build's slot)
Descend       the shaft             the clock race
```

The one rule every book keeps: **its first chapter has a row with no
inputs**, so life 1 can begin (09-22 §7's Forage contract, now a validator
check rather than a verb).

## 3. What crosses a book boundary

Three things, and nothing else:

- **Badges**, earned per book (§6).
- **The shop**, where badges buy permanent things (§6). *(user)* A book may
  add a unique item, so that what was bought carries the story of where it
  came from: "the connection becomes the things bought."
- **The bookmark** (§7): every book the player has opened, frozen where it
  was, with its ledgers, its automation, its lives and its rebirth bonus.

Nothing else. No skill level, no multiplier, no profile of the player. A new
book starts every skill at zero for every player. *(panel)* That is what two
rounds of scale rules were trying to achieve by formula, and it is now true
by definition: the next book's first chapter is a real start, there is
nothing to peek at and lock, and book-hopping and custom books cannot pump
anything.

**`GameState` is one book's run.** *(panel)* Everything in it is already
book-scoped: ledgers, completion counts, lives, rebirth bonus. The bookmark
is a map of those states keyed by book, held in `src/state/`, with the engine
unchanged: the inactive ones are simply not stepped. So counts and ledgers
need no re-keying, and `templateKey` (#24), whose only job was a stable
identity across books, goes. Skill points (MECHANICS §1, "earned but never
spent") go too; badges are the currency. Rebirth is per book because the
state is; *(panel, measured)* the rebirth math is untouched, and pays about
+1.7 to +2.8 max health per early death depending on how the life is played,
rising with the arc.

## 4. Every book is a real start, and its arc is its own

A book's arc is 09-22 §1's *"weeks, then minutes, then seconds"*, produced by
its own persistent ledger across its own lives, exactly as The Salt Road's
is today. Two consequences, both accepted:

- **A veteran opening a new book is a beginner in it.** What they bring is
  the shop, and the shop is designed to be that (§6).
- **Returning to an old book is fast only because of that book's own
  ledger.** Playing B does nothing for A. Going back to A is A's own arc
  continuing, which is the loop in §7.

*(panel, measured on the real engine)* **The arc is a tuning debt this pivot
rests on.** At today's placeholder numbers hall stone per life on The Salt
Road rises 45, 69, 82, 91, 99, 105 over six lives, but the 500-stone hall
first completes on about life 407, after about 125 hours, and Forage speeds
up about 5× over 90 hours; life length drifts from 14 to 17 minutes over a
hundred lives. That is #21 (re-derive decay), #22 (the rebirth bonus is too
small to feel) and #44 (the hall is a placeholder), none of which this spec
changes; the second-book slice has to derive them, because under this shape
that curve is the whole of in-book progression.

## 5. The rating

A book has one derived flag, **hurts**, true when any row costs health.
Derived from the rows, never typed: an author cannot claim "no violence"
over a book with a damaging row. *(panel)* It needs a damage field on a row,
which the engine does not have yet (09-22 §9 lists the Kill drain as a
widening); it lands with that field. "How much of this book hurts" is the
share of a finish's effort spent in rows that hurt, an output of the same
headless play the generator's validator runs (§9), and it lands there.

*(panel)* An earlier draft had a six-way profile vector. It measured the
author's tags, not the mechanics, and had no reader once the shared ledger
was gone. Scrapped with the categories.

## 6. Direction, decided with the second book: badges and the shop

*(user)* Badges and the shop are direction, not decisions. Most early books
will be generated, and the numbers come from playing two. Recorded so the
thinking is not lost, with the panel's constraints pinned beside it; each
becomes an issue with no milestone. Nothing in §11 depends on this section.
*(panel)* Under this shape the shop is the **entire** cross-book meta, so it
is the load-bearing design of the second-book slice rather than a later
concern.

**The shop sells attention, not ticks.** *(panel, measured)* Multiplier-type
items are a per-book scale in disguise: a decay item is worth nothing on a
short book and two-thirds of the lives on a long one, its tiers are not even
monotone, and the strongest one tried was worth less than dying once in the
new book. Unlock-type items have none of that: "no-input rows automate from
life 1 in any book", "settings carry between books", one more automation
slot. Their value is attention, which is what the genre progresses toward,
from clicking everything to watching it run. That arc across a library is
the meta. Two rules: every item is finite, never an unbounded percentage;
and a book may add a unique item. *(panel)* Illustrative tiers are bought out
after a handful of books; prices that rise, a badge sink, and items that
arrive with books are the levers, decided with the shop.

**Why badges, three per book.** A per-completion payout can be farmed by
authoring; per-book badges bound what any one book can ever pay. Badge 1,
finished. Badge 2, played it fresh. Badge 3, came back. *(panel, measured)*
Two constraints for their design: badge 2 cannot compare a time against a
policy's time, because a shop owner or a player who plays better than the
bot never earns it ("finished before any restart" is the likely form); and
"finished under a fraction of design length" is met by a single restart on
any book longer than a few lives, since a restart with ledgers kept finishes
in one life, so badge 3 needs a definition that a restart alone does not
satisfy, or there are two badges.

- **Ticks, not wall clock** (decision #41), counted from the book's restart
  to its finish across every life between. *(user)* Automation is the game
  choosing actions from the player's settings; it never makes a run faster.
  It makes a return visit free of attention.
- **Shipped and generated books pay; a book the player wrote or edited is
  marked and pays none.** *(panel)* An in-save flag stops accidents, not
  intent, and that is enough; short generated books as a badge source are
  bounded by the generator's minimum length.

## 7. The bookmark, and the loop it makes

**Leaving a book freezes its run in place**: its queue, its pack, its health,
its automation, its ledgers. Returning resumes it. Under decision #41 this is
free, since no time passes in a book nobody is reading, and with nothing
player-level to carry, leaving and returning changes nothing about the book.
The alternative, where leaving ends the life, makes every visit to an old
book a rebirth and turns "pop back in to set up one more automation" into a
chore.

*(panel)* **What it costs, named.** The save holds the shop and badges plus
one frozen run per book plus which is active, and every generated book's
data. #27 (save and load) had recommended saving at death only, to avoid
in-flight state; bookmarks make mid-run the normal case. When a shop purchase
applies to a frozen run is decided with the shop.

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
some rounds of that         a hands-free run: badge 3,        still the interest
                            when it exists
drop A                      three stars, done                 the only book open
```

There is always one book that is a story and one that is a puzzle, and the
puzzle book gets faster only by being played.

## 8. What a finish is

A book is finished when its last chapter's big event completes. Finishing
ends that life; the book can be restarted from its first chapter with its
persistent ledgers and automation kept and its badge clock (§6) reset. What
the finishing screen looks like, and the shelf, are designed after the
second book exists (§12). The Salt Road has no finish today: its hall is a
placeholder sink no life can complete (#44), so finish detection lands with
the first book that has an end.

## 9. The generator's brief

*(user)* "If you want a punishing book with 90% fighting, go for it." The
generator takes a length and a hurt share (§5), and the mechanics above are
the rules it generates against:

```text
step 1    roster: the verb test picks the skills the book needs
step 2    rows: fill the book's effort until the length and the hurt
          share land
step 3    chains: the wall rule strings them (09-22 §10: structure generates well)
step 4    feasibility: the validator plays the book headless from zero and
          refuses it unless it is finished within a bounded number of lives
step 5    names, nouns and beats: from a template table, generated once, saved
output    the same book format The Salt Road is written in
```

*(panel)* **Step 4 is a simulation, not a formula, and this shape makes it
well-defined in state**: every player opens every book at zero, so "from
zero" is the only state there is. It is not yet well-defined in policy: on a
150-stone hall the lives to finish were 8 with a food-aware policy, 9 with
push-everything, 42 with no foraging, and a bot that re-plans every tick is
superhuman until automation exists. The policy and the bound are part of the
game's definition of feasibility and are designed with the generator; a book
that is not finished within the bound is refused rather than emitted. The
play covers the decay clock, the need for a `healthDecayMultiplier` source,
a sink per material and a reachable big event per chapter at once.

*(panel)* **Step 1 is not pure structure.** The verb test's "its own tool"
prong is a fiction judgement; the generator needs a table of tools and
outputs to pick from, which is content. **Step 5 is a word**: the template
table has no schema yet. Both belong to #39, which stands at "without AI, no
decision"; a model at generation time would reopen it, and this spec does
not.

**The book format is the type, and The Salt Road is a value of it.** *(panel)*
Its numbers stay in `balance.content.scrub` and the type is filled from
them; a round-trip test (serialize, parse, validate, deep-equal) proves the
format is what a generator would emit. A generated book's numbers cannot
live in `balance.ts`, which is a change to decision #3, and per-row numbers
such as healing and a decay multiplier are halves of the survival curve that
cannot simply leave the guard; the tuning-literals hook is silent on a book
that holds only ids and names and blind to a `.json` book. The carve-out is
decided with the generator, as a reopen of a locked decision with a trail.

## 10. What this changes elsewhere

**In the 09-22 spec:**

- **§1 "Books are places within a life"** is superseded. A book has its own
  lives; the player does not walk from A into B inside one run. Several
  books open at once survives, as bookmarks. **#36** (reaching book B versus
  the run budget) is answered: it is not reached within a run.
- **§1 "every book goes back to its first chapter"** on death: now only the
  book the player died in.
- **§1 "A global restart resets every book"** is dropped. The shop is the
  prestige layer and needs no reset. **#37** is answered: what survives is
  each book's own ledgers and automation, the badges, and the shop.
- **§5, the six categories** (Harvest, Create, Kill, Go, Talk, Discover) are
  retired as a concept; they were a way to sort twelve verbs and there are no
  fixed verbs. **§6 rule 5** is retired with them. **§7's Shoot "serving two
  categories"** is moot; damage stays a property of the row (§7.3).
- **§5–7, the twelve verbs**, become an authoring vocabulary. Book one's
  roster is three of them. The verb test (§6) and §7.1–7.3 stand as
  authoring rules.
- **§8.3 "twelve, four across, three rows, always the same order"** becomes
  N per book, in roster order. Book one shows **three cells**. The grid's
  shape at larger N is #46's. **§8.3's** hover counter "first-used book"
  goes.
- **§8.6 "No book switcher: books are places, reached by Travel rows"** is
  superseded by the shelf (§7, §12), designed later.
- **§8.6 and §9 "food is the only thing that survives between books within a
  life"** and "materials always reset at a book boundary": moot, since a book
  boundary is no longer crossed within a life. A bookmark freezes the whole
  pack. Whether materials reset at a *chapter* boundary stands as written.
- **§9 skill points** are removed rather than parked. **§9 `templateKey`**
  goes; **#24** closes with its answer (keyed per action, and book-scoped
  because the state is), and **#47**'s partial-progress question inherits
  that key.
- **§9 and MECHANICS design note 6**, "a book transition prunes the queue":
  queues are per book and frozen; nothing is pruned.
- **#17 "skills only make themselves faster"** stands as it is; its note on
  skill points as an unused currency is answered by their removal.
- **#27**'s "`templateKey` is the stable identity" is dead; the bookmark's
  cost above replaces it.
- **#39 procgen** gains its brief (§9).
- `(1 + core × 5%) × (1 + run × 1%) × tool` is unchanged.

**In MECHANICS.md:**

- §1 and the constants table: skill points and `ticksPerSkillPoint` go.
- §2: the `templateKey` field and "increment `actionCompletionCounts[templateKey]`"
  become the action id; §6's "keyed by `templateKey`" and the `requires`
  note likewise.
- §3: "every skill carries two independent levels" stands; the skills are the
  book's.
- §5: what persists is per book, plus the shop and badges. Skill points go.

**In VISION.md:** "dual mastery: every skill keeps two ledgers" stands, per
book; "what carries forward is what you learned to do faster" becomes
"within a book, what you learned; between books, what you bought"; "few
abilities, the roster stays small enough" is now per book, enforced by the
validator's roster rules and a cap for generated books; "keep the max-health
you earned" is per book.

**In the v0.2 spec:** nothing in the slice. A "starting food" shop item, if
it ever lands, contradicts v0.2 §2.1's "food is a within-life plan" and is
decided with the shop.

**In README.md and CLAUDE.md:** "the twelve skills" becomes book one's
roster; the guard-layer notes on `src/data/` gain the book format.

## 11. The first slice: the seam

*(user)* This ships **before #47**, so that the queue model, the stack cap
(#45) and the screen pass (#46) are each built once on the new shape.
*(panel)* It is a re-key with one consumer, the second book, which is the
next slice and the thing that produces every number §6 and §12 defer.
Behaviour is preserved across a medium-sized mechanical refactor; the one
visible change is three skill cells instead of twelve.

**In the slice, in an order where each step ends green:**

1. **Skill points out.** `ticksPerSkillPoint` leaves `balance.ts`; the
   time-constants assertion and the skill-point test in `balance.test.ts`
   change; MECHANICS §1 and its constants line follow. *(panel)* Nothing in
   engine, state or UI reads them. Named here so the tuning guard sees an
   intended removal.
2. **`templateKey` out** of the format, the engine's count key, and the
   row's automation lookup. *(panel)* No content or test sets it, so this is
   a no-op in behaviour.
3. **The book format**, as a type: id, name, chapters (each with its head
   and its ordered row ids, since the cabin-before-hall order is
   design-bearing), roster (id, name, icon name), actions, items. The icon
   name vocabulary lives in `src/data/`, and `src/ui/icons.tsx` maps it. The
   Salt Road becomes a value of the type with its numbers still read from
   `balance.content.scrub`; `SKILLS` and the side exports (`SCRUB_HEAD`,
   `SCRUB_ORDER`) fold into it. The roster is still typed by the old union at
   this step.
4. **The validator**, static, in the data layer, with a test per rule: every
   row's verb is in the roster; every roster skill has at least one row;
   every icon name is in the vocabulary; every item a row names exists;
   every item a row costs has a producing row *(panel: this makes the action
   row's hard-coded "Craft" fallback unreachable, and it goes)*; the first
   chapter has a row with no inputs; the book round-trips through JSON. A
   roster cap is a constant in `balance.ts`, applied to generated books
   later. *(panel)* The completeness tests over the fixed union
   (`icons.test.ts`, `scrub.test.ts`) are replaced by these; `icons.test.ts`
   keeps the reverse check that every vocabulary name has a component.
5. **Drop the union.** The skill id is a string from the roster; `newState`
   takes the book and builds the skill map from its roster; every reader of
   `state.skills[verb]` gains the guard `noUncheckedIndexedAccess` demands;
   `SkillsBand`, `SkillCell`, `Queue`, `ActionRow`, `DeathCard`, `narrate`,
   `icons` and `App` read the roster through the content rather than the
   `SKILLS` global. The Salt Road's roster is Forage, Mine, Build.

**Not in the slice, each filed with no milestone:** the second book (next),
`hurts` and the damage field, badges, the shop, the bookmark map in
`src/state/`, the shelf, finish detection and the finishing screen, the
generator and its validator play, the decision #3 carve-out, the ledger
rename, and the skill grid at larger N (#46).

**Tests the slice ends on** *(panel: "green" means edited mechanically, with
no expected literal changed)*: every existing engine and component test,
including `playable.test.ts`'s progression across lives, with the roster
order and every number preserved; the validator accepts The Salt Road and
rejects each malformed book above; the round trip; the hooks suite. The
`newState` signature change touches about 118 call sites in 11 test files;
that is the mechanical edit.

## 12. Open, each with a home

- 🎨 The two ledgers' player-facing names. *(user)* Later; filed.
- 🎨 The skill grid at larger N. #46.
- 🎨 The finishing screen and the shelf. After the second book.
- 🎚️ Badge definitions, shop items, prices, a badge sink. With the shop,
  which is the second-book slice's load-bearing design.
- 🎚️ The in-book arc: #21, #22, #44. With the second book.
- ❓ The validator's play policy and its bound on lives; the tool table for
  step 1; the template table for step 5. #39.
- ❓ Whether a narrative content label exists separately from `hurts`.

## 13. Considered and set aside

- **Six shared cores with a per-book ledger key** (rounds one and two). A
  category-level ledger that crossed books needed a scale so the next book
  was not trivial. One scale per book (the core cost ratio) made book B 15×
  slower and starved lives; a per-core scale snapshotted each life removed
  the cross-life lever (hall stone per life 45, 32, 30, 30 on the real
  engine); snapshotting once per book worked at core 40 and failed at core
  80 on a shortened 590-XP hall, and was not finished in 2000 lives on the
  real one; and the shared ledger let Cook level Modify mid-life so siblings
  differed by under a third. Each measured. *(user)* Dropped: "the connection
  becomes the things bought."
- **Six categories as tags** on book skills, with a profile vector as a
  rating and the generator's input (round three). Typed by the author, so
  the vector measured the tags; no mechanical reader. *(user)* Scrapped.
- **Twelve roles with a per-book skin**, books using a subset. Keeps a
  per-verb ledger across books, which is the same shared-ledger problem with
  twelve keys instead of six.
- **A flatter persistent curve** so a shared ledger kept growing. Moot with
  no shared ledger.
- **Multiplier-type shop items** (decay, caps). Measured as a per-book scale
  in disguise (§6).
- **Badge 3 as a hands-off run** counting manual inputs. Set aside when ticks
  looked honest; *(panel)* ticks turned out to be met by one restart, so it
  is back on the table with the badges (§6).
- **An authored permanent ability per book** as the point of finishing.
  Superseded by the shop; a book may still contribute an item.
- **Points as effort divided by the player's scale**, paid every completion.
  Moot with no scale.
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
- **Cross-book connections the panel named and this spec leaves open:** a
  category-keyed unlock, carried settings, lineage between generated books,
  a bought starting level. *(panel)* None was measured. The first two are
  what "the shop sells attention" means; the last two are not taken up.
