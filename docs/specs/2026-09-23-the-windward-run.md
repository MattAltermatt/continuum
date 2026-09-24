# The Windward Run: a playable game

**Date:** 2026-09-23
**Status:** built on `feature/playable-windward-run` (2026-09-24), awaiting
the user's play. Designed section by section in a brainstorm on 2026-09-23.
User decisions are marked *(user)*; picks the lead made under the user's
standing instruction for numbers are marked *(pick)*. Reviewed by an agent
panel with a naysayer before it became code; findings are folded in and
marked *(panel)* (plan rounds one to five, 2026-09-23). The code panel's
changes are marked *(code panel)* (round one, 2026-09-24). What is queued from it lives in
[GitHub Issues](https://github.com/MattAltermatt/continuum/issues).

**Builds on:** [books, chapters, verbs](2026-09-22-books-chapters-verbs.md)
(the 09-22 spec), [v0.2](2026-09-23-v0-2-a-run-you-can-lose.md),
[books own their skills](2026-09-23-books-own-their-skills.md) (BOYS) and
[the headless play](2026-09-23-headless-play.md). Where it changes them, §13
says so.

---

## 0. What this is for

*(user)* "I want to play this for awhile and report back." Playable means,
in the user's words:

- "all of the skills working as expected", and a book's skills are its own
- "books have ends"
- "the queue works as written up" (#47, as refined in §2 below)
- "the pop-out works": the skill ledger from the 09-22 mockup
- "a save system as well"
- "we don't need the prestige or anything like that"
- "we don't need switching books for playable, keep a single book, make sure
  it has some content"

And one standing instruction for numbers: *"If a number is up for
contention, pick something, remember it, and make it tunable."* Every number
this spec introduces is such a pick: it lives in `balance.ts` marked
`UNDERIVED`, its target is in §11 (the book's content values, row by row,
are in the plan's "Task 5 reading" and its code panel readings), and it is
recorded in memory.

## 1. The world 🎈

*(user)* "We live in a world where everything is in the sky, it just is. We
are adventurers, we have our own ship and we hop from town to adventure to
giant airship that is a casino, etc. ... we are the heroes." And: "I have been
following Increlution, lets go our own path with this."

So the game's setting changes from dry-country survival to a sky world of
floating towns and airships, and the tone from grim to swashbuckling. The
mechanics carry over unchanged in shape; what they are *called* follows the
world:

```text
mechanic                       in the sky world
-----------------------------  ------------------------------------------------
a book                         a voyage: one story, several ports of call
a chapter                      a port of call: a town, an adventure, the casino
a chapter's big event          casting off: the fight or race that frees the ship
food carried between chapters  provisions in the galley
non-food dumped at a chapter   cargo sold or left at the dock
a Build (stays put)            Rig: work on the ship itself
a Craft (carried)              Tinker: gear
the decay clock                unchanged; health, as today
```

The Salt Road is retired. Its one chapter was a placeholder (#44), and the
new book replaces it entirely.

## 2. The queue 🪨

*(user, section approved 2026-09-23)* This is #47 as filed, refined in the
brainstorm. It replaces stall-in-place, one-entry-per-action and
`firstRunnable`.

### 2.1 Entries

- The queue is an **ordered list of orders**. The same row may appear more
  than once; each entry has an identity of its own.
- *(user)* **A plain click queues a repeating entry; Shift+click queues a
  single run**, on both ▶ and +. Every entry shows which it is, including the
  running one. A one-time row is always single.
- **Only the top entry runs.** Nothing below it moves.

### 2.2 Progress lives on the row

When the top entry cannot run and nothing supplies it (§2.4), it is
**popped**. Its progress and the materials already spent into it stay **on
the row** for the rest of the life, so the next entry for that row resumes
exactly where the last stopped and nothing is paid twice. Death clears it.
*(panel, survey)* This is forced, not chosen: with a 6-stone cabin and a
5-stone cap, `mine, cabin, mine, cabin` only ever finishes if progress
survives the pop.

Removing an entry with × loses nothing, for the same reason: the work stays
on the row. The two-press remove (armed "?") existed because removal used to
destroy spent materials; it goes, and × removes on one press.

### 2.3 Producers fetch only what is needed

*(user)* "If I am doing the sequence of mine → build → mine → build, on the
last mine, I would expect only a single stone to be mined, both when this is
queued by automation and the player. If nothing following the harvested item,
then it will fill all the way up."

The rule: a **repeating producer** looks at the entries below it, down to the
next entry that makes the same item, and sums what they still need of its
item (each row's cost, less what its kept progress has already spent, plus
any unmet `needs`, §6.2). It stops once the pack holds that much, or when the
stack is full. With nothing below it that needs the item, it fills to the
cap. A **single** entry runs exactly one completion.

*(code panel)* Two cases the rule was silent on, read from "only what is
needed": a row below counts **once**, however many entries it has (two
entries for one hull share its progress, so a second hull asks for nothing
more), and a **repeating** consumer below needs its cost for every completion
it is asked for, up to the ones that would fill its own stack: a single entry
one, an automation fill its count left, a repeating entry all it can make. So
by hand, `Talk to the dealers · Talk to the kitchens` (both repeating) fetches
a chip for each canapé the kitchens can still make, where one completion's
cost alone made one canapé and stopped. *(code panel, round two)* That is the
player's own order only. An **automation** supply order fetches for the one
order it was queued to supply (one completion of a repeating row, what a
one-time still owes), and nothing further down: it supplies again at the next
shortfall, so JIT stays exactly the shortfall, and a food fill never waits on
a whole stack of its input or on a one-time queued below it (fetching 15 chips
before the first canapé starved players in the Fortune). *(code panel, round
three)* The supply order carries the id of the order it serves, and leaves
when that order does (removed, buried and taken back, pruned at a port);
*(round four)* at once, paused or not.

```text
queue (top first)                    what the top producer does
-----------------------------------  --------------------------------------------------
Salvage · Patch hull (8) · Salvage   looks below: the hull needs 8 → fills to cap (5), pops
Patch hull · Salvage · Patch hull    eats 5 (5 of 8), short → pops, progress kept
Salvage · Patch hull                 looks below: the hull still needs 3 → salvages 3, pops
Patch hull                           resumes, pays 3, done
Salvage            (nothing below)   nothing needs scrap → fills to cap, pops
```

### 2.4 When the top cannot run

In order, before any time passes (decision #41):

1. A row the current chapter does not have is dropped (it can only get there
   from before a chapter change; §4).
2. A producer that has met its target (§2.3) or is full pops.
3. A top entry that is short an item or an unmet need is **supplied** if the
   row that makes it is automated (§3): the producer goes in front, at index
   0, for exactly the shortfall. Otherwise it pops, and says why: *"needs 3
   scrap · Salvage automation is off"* (or *"not yet earned"*). *(code
   panel)* When that maker cannot start by hand either, the words follow its
   chain to the first thing a hand can do, as for an automated maker. *(code
   panel, round two)* A cause more than one maker down says so, since the
   blocked maker itself lacks something else: *"needs Varro's table · Search
   the salons can't run: further down, needs chips · Talk to the dealers
   automation is not yet earned (0/200) · earn it by hand"*.
4. If the queue is empty, passive automation may fill it (§3.3).

This repeats until the top can run or the queue is empty; an empty queue
stops the clock.

### 2.5 ▶ and +

- **▶** puts the row at the top. It **refuses** a row that cannot run and
  that no automation would supply: the row flashes red, and the instruction
  line says why (#43's refusal flash). A refused ▶ changes nothing.
  *(panel)* "Would supply" follows the chain: a maker that is automated but
  cannot run itself does not count, so a chain that cannot close is refused
  up front instead of accepted and dropped.
- **+** appends the row at the bottom, even if it cannot run yet. *(user,
  #47)* "It can be added to any spot after the top spot, because the player
  may do some shenanigans."

## 3. Automation 🤖

*(user)* "Automation is tied heavily into this." And: "a, thats the game":
automation is **earned per row** by lifetime completions, as MECHANICS §6
has it.

### 3.1 The chip and its modes

Until a row has earned automation, its chip shows progress toward it
(`37/200`) and cannot be pressed. Once earned, it is a button that cycles:

```text
off → JIT → top → high → mid → low → last → off
```

*(user)* "AN" is renamed **JIT** ("because that is what it is"), and the
numbered priorities become tiny words, because "I don't honestly know if 1 is
highest or lowest priority." A newly earned chip starts at **off**.

JIT appears in the cycle only for a row that produces something: an item
another row costs or needs, or a food. A row that produces nothing another
row uses cycles `off → top → … → last → off`.

### 3.2 JIT: just in time

*(user)* "If automation or the player clicks 'build' and the mine is in JIT,
it automatically queues in index 0 the harvest option for exactly how many it
needs (up to the max inventory space). If the mine automation is off, then
nothing happens, a warning should show that automation is off or stone is
needed."

- **A short entry on top**: the JIT producer goes in at index 0 at once, for
  exactly the shortfall (the look-ahead of §2.3 makes it exact), skipping
  priorities.
- *(user)* **Food runs out**: "If a food item is in AN, and that food item is
  out, it is immediately queued." It goes in at index 0 to fill to cap.
  *(panel)* The fill carries a count, the completions to cap from what was on
  hand (MECHANICS §6's `targetCount`), so each fill ends; while food is still
  at zero a new one follows, which is the user's rule.
- *(user)* **Before casting off**: "Before travel, AN food items are
  stockpiled." When a chapter's big event reaches the top with no progress on
  it, every JIT food below its cap is queued in front of it first, to cap.
  *(panel)* Once per food per departure, and not before the book's finish,
  which is not a departure. *(code panel)* And only once the event could
  start: a key its own supply still has to fetch is fetched first, so the
  galley is not eaten on the way (every guardian start with the key makers on
  JIT provisioned first and then fought at 1 to 5 of 15 eels).
- *(code panel, round two)* **A fill the player buried.** A play press puts
  its row above a JIT food fill already under way. If the food is out, the
  fill goes back to the top at once (the user's "immediately queued"); if the
  port's event is the pressed row, the provision replaces the buried fill. A
  fill below nothing of the player's is under way, not buried. *(code panel,
  round four)* Only a player's order buries a fill: what automation puts
  above one (its input's supply, another food's fill, a better-ranked
  producer going first) finishes and lets it run, and a supply left over from
  an order that has gone is gone with it. A food row taken off JIT drops its
  automation fill and the fill's supply, and owes its departure's provision
  again. *(code panel, round five)* The player's own order for the food is no
  fill: it counts as on its way only on top or below nothing but its own
  supply, so an idle order above it no longer fills its stack while the food
  sits at zero; and a food's fill does not stop its maker supplying another
  row's fill (a stew made of fish) in the same pass.

### 3.3 The priorities: top, high, mid, low, last

*(user)* "If the mine is in 1, 2, 3, 4 or 5, it must first see if there is
anything of higher priority it can queue. AN skips that and just queues."

- **A short entry on top** and its producer is on a priority: the producer
  is queued for the shortfall **once nothing of higher priority can go
  first**. A higher-priority row that can run is queued ahead of it; when that
  pops, the check runs again. *(user, confirmed with an example: Forage on a
  higher priority fills the berries first, then Mine goes in for the cabin's
  one stone.)*
- **The queue is empty**: the highest-priority row that can run is queued,
  one at a time (MECHANICS §6's passive fill). One-times already done this
  life are skipped, as are producers whose stack is full.
- Ties break by the chapter's row order.
- Nothing refills while the player has paused (MECHANICS §1).
- *(panel)* The row that goes before a priority maker is narrower than "can
  run": a repeatable producer, not already queued, that can work at once
  with no supply of its own (the user's example is Forage filling first).
  Anything wider re-queued the rows waiting on the same maker, or started the
  port's big fight as a "supply" step.
- *(panel)* The empty-queue rule is the one the user approved, word for word:
  *"empty queue → the highest-priority row that can run is queued, one at a
  time"*. A row set to a priority that cannot run (its harvest has no chip
  yet) is passed over, so a player who has set the big event too can see it
  cast off past that row. The chip says so: a set chip whose row cannot start
  shows a waiting look and says what to do (`Salvage drifting scrap 120/200 ·
  earn it by hand`). *(panel, round five)* Content ordering (§3.4) closes the
  lock-out for a player who builds every upgrade before switching chips on; a
  player who skips one upgrade and switches on the others can still meet it,
  so the words are what carry it, and whether an engine rule is wanted is for
  the user to judge from play (#72).

### 3.4 Earning it

Keyed by row, counted across lives, never lost. The thresholds start at
MECHANICS' 200 for a repeatable and 5 for a one-time. *(panel)* The old
reading of a first unlock by life 3 or 4 was taken on the old queue; under
the stack cap of 5 a harvest completes less often, so §11 makes it a target
again. *(panel, round three)* The user's
approval of the numbers read *"automation unlock 200 repeat / 5 one-time
kept unless play shows the first unlock later than ~life 3"*; play shows life
4-5, and a player who switches on one-time chips (life 5) before their
harvest's chip (life 9) casts off past their own upgrades and stops salvaging,
for good. *(panel, round four)* That approval is about the first unlock of
any row, and content alone meets it with the thresholds as they are; the
lock-out is closed by content too: the one-times cost enough of their
harvest that its chip arrives no later than theirs. The thresholds stay; if
content cannot do it, the user decides. Earning a chip is logged: *"Salvage scrap can now be
automated."*

## 4. Ports of call, and casting off

*(user)* "A, and that is the point where the non-food items are dumped."

- A book is a line of chapters. **Completing a chapter's big event casts
  off:** the player is in the next chapter.
- At casting off, **every non-food item is dumped**. Food rides along. The
  *effects* completed rows applied stay for the life (the hull's slower decay,
  the satchel's bigger stack, a net's faster fishing); only the items leave.
- The queue drops every entry for a row the new chapter does not have. The
  rows' kept progress (§2.2) stays on the state but is unreachable for the
  rest of the life; death clears it, as it clears all kept progress.
- **Only the current chapter's rows are on screen**, under its running head.
- The big event is the chapter's own declaration (`chapter.event`): a
  one-time row in its `order`, with no one-time row after it (the validator
  enforces it; a repeatable row may still follow). In the last chapter it is
  the book's `finish`.
- Death sends the next life back to chapter I, as today.

## 5. The book: The Windward Run

*(user)* The story, approved: "chef-kiss, looks great." The names and text
are the lead's draft; the user may rewrite them after playing.

### 5.1 The roster

Seven skills, each with its own job (the verb test, 09-22 §6):

```text
skill    icon            its job
-------  --------------  ----------------------------------------------------
Fish     fishing-rod     cloud-trawling: the food, all book long
Salvage  recycle         scrap and brass from drifting wrecks and the ruin
Tinker   wrench          gear (a skill multiplier) and the satchels
Rig      sailboat        the ship itself: every decay reducer
Fight    sword           threats, and every big event but the last; hurts
Search   eye             clues the next row needs (the star chart)
Talk     message-circle  people who open doors, on the Fortune
```

`recycle` and `sailboat` join the icon vocabulary (BOYS §2: it grows by a
code change).

### 5.2 The story

```text
I   Port Cinder         a floating market town. Outfit the ship. A rumor of a
                        lost artifact on a drifting ruin.
    casting off         see off the harbor pirates                 (fight)

II  The Hollow Isle     the ruin. Salvage it, fight past its wardens, search
                        the halls for the star chart.
    casting off         claim the Sky Compass                      (fight its guardian)
    beat                a maker's mark nobody aboard can read; the one man
                        said to know it deals cards on the Gilded Fortune

III The Gilded Fortune  a casino the size of a city. Talk our way past the
                        door, get roughed up by the house's enforcers, work
                        our way deck by deck to him.
    finish              reach the old cartographer, Varro
    cliffhanger         He takes one look at the Compass and goes white.
                        "Where did you get this?" The lights go out.
```

*(user)* "We know of someone that has more knowledge about this artifact,
and they are on the casino. We get roughed up a bit, but eventually make our
way to him, and cliffhanger."

### 5.3 The rows

Each port has a food, a harvest, things that feed each other, at least one
sink, and its big event. *(user)* "Add some areas where we get items that
increase inventory and decrease our health decay": every port has a decay
reducer and a stack-cap item. Numbers are tuned by the headless play against
§11's targets and land in `balance.content.windward`.

```text
port  row                            skill    inputs                   output / effect
----  -----------------------------  -------  -----------------------  ------------------------------------
I     fish the cloud shallows        Fish     —                        +1 cloud-fish (food, smallest heal)
I     salvage drifting scrap         Salvage  —                        +1 scrap
I     rig the hull                   Rig      scrap                    decay slowed (one-time)
I     tinker a trawl net             Tinker   scrap                    gear: Fish faster (one-time)
I     tinker a canvas satchel        Tinker   scrap                    stack cap +5 (one-time)
I     fight the harbor pirates       Fight    —                        hurts; casts off (one-time)

II    fish the eel runs              Fish     —                        +1 sky-eel (food, bigger heal)
II    salvage the ruin               Salvage  —                        +1 brass
II    fight the wardens              Fight    —                        hurts; +1 the inner door (one-time)
II    search the halls               Search   needs the inner door     +1 star chart (one-time)
II    rig brass fittings             Rig      brass                    decay slowed (one-time)
II    tinker a sea chest             Tinker   brass                    stack cap +5 (one-time)
II    tinker a cutlass               Tinker   brass                    gear: Fight faster (one-time)
II    fight the guardian             Fight    needs the star chart     hurts; casts off (one-time)

III   talk to the dealers            Talk     —                        +1 chips
III   talk to the kitchens           Talk     chips                    +1 canapé (food)
III   talk past the door             Talk     chips                    +1 a deck pass (one-time)
III   rig the high dock              Rig      chips                    decay slowed (one-time)
III   tinker a gilded trunk          Tinker   chips                    stack cap +5 (one-time)
III   fight the enforcers            Fight    needs a deck pass        hurts; +1 the lift key (one-time)
III   search the salons              Search   needs the lift key       +1 Varro's table (one-time)
III   talk to Varro                  Talk     needs Varro's table      the finish (one-time)
```

*(panel)* Row names are written to fit the screen's budget of 24 characters
for skill plus noun (09-22 §8.1): "Talk to the dealers", "Tinker a gilded
trunk", "Fight the guardian", "Search the salons".

The stack cap goes 5 → 10 → 15 → 20 across the three ports *(user: "think
from 5 slots to 20")*, rebuilt each life. The Fortune has no fishing: the
galley stocked before casting off from the Hollow Isle (§3.2) is what a life
arrives with, plus canapés bought with chips.

## 6. What a row can do

Three abilities join the book format. Each is a field on a row, validated,
and shown on the row in the 09-22 §8.4 grammar.

### 6.1 Hurts

A row may drain health while it runs: `hurts`, in hp per second in the
content, applied per tick after decay. It reads `−1.2 hp/s` in the row's
middle chunk, and while it runs the rates chunk shows a third line beside
decay and food. A life can end mid-fight; the death card says so as it says
the clock. Damage is a property of the row (09-22 §7.3). This is #54's
damage field; its derived `hurts` rating for the shelf is out (no shelf).

### 6.2 Needs

A row may require an item it does not consume: `needs`, checked and never
spent, shown as a chip (*needs the star chart*). A missing need is a shortfall
like a missing input: JIT or a priority can supply it (§3), and ▶ refuses
without it. The keys (the inner door, the star chart, a deck pass, the lift
key, Varro's table) are ordinary items with a cap of 1.

### 6.3 Effects

A one-time row may carry effects that apply when it completes and last the
life:

- **decay** ×m: the run's decay multiplier, as the cabin's today
- **capacity** +n: the shared stack cap (§7)
- **gear** skill ×m: that skill's tick multiplier; the pop-out's "tools"
  line (§8), renamed **gear**

Gear is an effect, not an item in the pack *(user, approved)*, so it survives
casting off. Effects are derived from the life's completed one-times, so they
reset at death with them.

## 7. The pack and the stack cap

*(user, #45)* "There should be 1 inventory size, and both food and pack use
this. It should start low, and some of the items found increase this. start
at 5." Clarified: "can only hold _x_ of each item." One shared cap for every
item, food included, starting at 5 and raised by capacity effects. *(panel)*
Keys are the one exception: a key is held or not, so its cap is 1.

The pack rules the user set on #45:

- An item enters at the bottom the first time it is acquired.
- It stays at 0, dimmed, while a row in the current port can make it.
- It leaves at 0 once nothing here can.
- Death, and casting off for non-food, empty it.

*(user, #45)* Food is eaten **smallest heal first**, and the food chunk's
rows never reorder.

## 8. The skill pop-out

*(user)* "The pop out over the skills, there was a mockup for it, it had a
ledger for why the multiplication is what it is." Built as mocked in
[`2026-09-22-skills-hover.html`](../mockups/2026-09-22-skills-hover.html),
the 09-22 §8.3 ledger:

- Opens on hover, focus, click or Enter; closes on Escape (09-22 §8.1).
- Left: **core** (level, bar, "permanent · +5% / level", XP to the next
  level), **run** (level, bar, "this life · +1% / level", best ever),
  **gear** (each piece by name with its factor, or *none*).
- Right: the factor each contributes with its arithmetic under it
  (`1 + 12 × 5%`), a heavy rule, the total, which equals the ×number on the
  cell.
- Below: **right now** (the action, XP/s, its rate) and **lifetime** (XP,
  time spent, times done, across N lives).

"Shows what is, never what could be." Two new per-skill counters persist
across lives: ticks spent and best run level. Lifetime XP and times done are
derived from the ledgers and the completion counts.

## 9. Ends

*(user)* "Books have ends."

- Completing the book's `finish` **finishes the book** and ends that life.
- A **finish card**, in the death card's style and place, shows the book's
  last line (the cliffhanger), the clock, what the life gained, and how many
  times the book has been finished.
- **Read again** starts the next life at chapter I with core ledgers,
  automation and counts kept (BOYS §8). The life's max-health gain applies as
  a death's would.
- Mockup first (decision #31).

The death card gains one fact: the port the life reached.

## 10. Save and the clock 💾

*(user, section approved)*

- **Autosave, always**: every few seconds, and at once when the tab is
  hidden or closed. One versioned save holds the whole run: state, automation
  settings, counters and the log.
- **A reload is invisible**: it comes back exactly where it was, death card
  included.
- **A hidden tab keeps full pace.** The loop counts real elapsed time and
  runs the ticks it missed, so Chrome's background-timer throttling does not
  slow the game.
- **A closed tab or a sleeping computer is a bookmark**: no offline
  progress. Catch-up is capped per wake *(pick: 5 minutes of game time)*: a
  wake advances at most that, so opening a laptop after a night moves the
  game five minutes, not eight hours.
- **The gear opens settings**, with one entry for now: erase save, two
  presses.
- **Dev builds only: a speed control**, ×1, ×10, ×100, to reach an end in
  testing. Never in a production build. The dev handle gains save, load and
  speed, and its reducer stops blanking the page on an unknown action (#67).

The save's version field is written from the first save (#27). A save from an
older format, or for a book the game no longer has, is set aside under a
second key rather than loaded, and the log says so.

## 11. Numbers 🎚️

*(user)* "Whatever makes sense to help keep the 20 min avg."

**Targets** *(pick, all of them)*:

```text
target                              pick
----------------------------------  ----------------------------------------------
a sane first life                   12–15 min
a life late in the book             about 20 min
every one-time of every port        completes at least once before the finish
reach port II                       about life 5
reach port III                      about life 20
first unlock of any row             about life 3 (the user's approval); by content, every
                                    harvest feeding a port's one-times no later than they do
finish                              24–36 game hours, declared 30 (the test enforces
                                    30 h ±25%, 22.5–37.5, over the 24 h floor; the user's floor
                                    is 24); at these life lengths about life 90–110
stack cap                           5 base, +5 per port → 20      (user)
automation unlock                   200 repeatable, 5 one-time (kept)
automation vs hands-on              the automating player finishes within 25% of the
                                    hands-on one (asserted by the end-to-end measure
                                    test). *(code panel)* The canapé's chip price
                                    sets the book's length with pirates, and bounds
                                    this from above: automation's gap is 1% at 1
                                    chip, 11% at 2, 34% at 3, because a JIT food
                                    fills to cap at the top whatever its input costs
catch-up per wake                   5 minutes of game time
the measuring player's check-in     every 30 s of game time
```

**How they are reached:**

- **No change to the global decay, rebirth or skill constants.** *(panel,
  measured)* Content reaches the 20-minute life at today's constants: each ×0.8
  decay row moves the point where decay passes the food ceiling by exactly one
  minute (1/0.8 = 1.25), and a second food with its own cooldown adds about
  three. #21 and #22 stay open for a later pass.
- **The headless play is rewritten for the new queue** and `PLAY_VERSION`
  goes to 2. Its stand-in policy breaks under #47 by its own comment.
  *(panel)* Two players are measured and the report is a range: `attentive`
  sets foods and makers to JIT as they are earned and builds each port by
  hand, one one-time at a time, before its big event; `handsOn` is the same
  player never touching automation. A third, `prioritized`, switches on every
  chip as it arrives and is reported, not tuned to. The play measures life
  length, the port reached per life and the book's total game time, and
  every content number is tuned against the range.
  *(panel)* An earlier draft's "about life 60-90" could not hold with a 30 h
  declaration: at 12-20 minute lives, 30 hours is about 100 lives. The hours
  win; the life count follows.
- *(panel)* **The targets assume a glance every 30 seconds.** A player who
  checks every 5 minutes dies sooner (life 1 at about 8 minutes) and reaches
  the ports later; the handoff says so.
- **Every pick is recorded** in `balance.ts` (`UNDERIVED`, "picked
  2026-09-23"), in this table, and in memory. Changing one later is still a
  deliberate act; the tuning guard sees it.

## 12. The screen

What changes, each built from a committed mockup (decision #31):

- **Action row**: Shift+click on ▶ and +; the red refusal flash; `hurts` and
  `needs` in the middle chunk; the automation chip as a button once earned.
- **Queue**: entries keyed by their own identity; each marked *repeat* or
  *once*, and entries automation added marked in the automation color; the
  kept progress of each row shown on its entries; × on one press.
- **Chapter panel**: the current port's head and rows; casting off prints
  the event's beat to the log.
- **Rates**: the hurts line while a hurting row runs.
- **Food and pack**: the shared cap; #45's pack rules; smallest heal first.
- **Skill cells**: the pop-out.
- **Finish card**, and the death card's port line.
- **Settings** behind the gear; the dev speed control.

The #46 screen pass (sticky health, bottom bar) is not in this build.

## 13. What this changes elsewhere

**VISION.md**: the pitch gains the sky world, the ship and the heroes; "a run
is minutes" reads "tuned for about 20 minutes" (09-22 §9 had queued it).

**MECHANICS.md**: §2's queue (entries, top-only, pop, progress on the row,
the look-ahead), §2's tick order, §4's eating order, §6 rewritten (JIT, the
word priorities, supply, the food and casting-off triggers), the shared stack
cap, chapters and casting off, and the three row abilities.

**The 09-22 spec**: §8.5's stall-in-place and "the only control is remove"
stand for the queue view; the queue's rules are replaced by §2 here. §9's
"materials may reset at a chapter boundary" is decided: non-food always does.

**BOYS**: nothing reversed. Per-book rosters stay proven in code (the
validator and `books.test.ts`); this build ships one book.

**The headless-play spec**: §7's stand-in is replaced (§11).

**Decisions**: #41 stands and governs every "time stops" above. #3 is
honored: every pick lives in `balance.ts`, under the user's instruction to
pick.

**Issues**: this build answers #47, #7, #45, #10, #19, #20, #25 (JIT food
fires on empty, the user's words), #27, #44, #58's finish detection and
card (both #54 and #58 stay open for what remains), #54's field, #42 (stall chatter goes with stall-in-place), #64 (the
warning names the automation, not a made-up verb) and #67. The retired Salt
Road closes nothing on its own.

## 14. Out of this build

Book switching, the shelf and the bookmark map (#57, #58's shelf half); a
second book (#53) and the book-author skill (#52); badges and the shop (#55,
#56); the #46 screen pass; health throb (#49); the ledger rename (#60); a
phone layout (#62); procgen (#39); rebirth-gain multipliers (#48); #21 and
#22's constant re-derivation.

## 15. Open, each with a home

- Whether JIT on a one-time's inputs should also pre-stockpile materials
  before casting off: no; only food, as the user said. Revisit from play.
- What the enforcers' damage should feel like against the galley: tuned
  (§11), reported back from play.
- The finish card's "Read again" wording: the mockup.
