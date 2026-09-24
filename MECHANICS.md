# Continuum — Engine Mechanics

The design of Continuum's simulation layer: how time advances, how work gets
done, how skill is earned, how a run ends, and how the player hands repetition
over to automation.

> **Status.** This document is the *design*, not a description of shipped code.
> It is the specification the engine is built toward, and it is the reference
> that settles arguments about intent. Where a number is a starting point rather
> than a derived value it is marked 🎚️ — see
> [Numbers not yet derived](#numbers-not-yet-derived).

---

## 1. Time

### The tick

The simulation advances on a fixed interval. Everything — progress, decay, XP,
eating, death — happens on tick boundaries. Nothing is frame-dependent and
nothing interpolates.

```
TICK_INTERVAL_MS = 100      // 10 ticks per second of real time
TICKS_PER_MINUTE = 600      // 100 ms × 600 = 60 s
```

A single loop wakes every interval and dispatches the whole ticks real time says
are due since its last wake (`{ type: 'tick', n }`), times the dev speed, and
carries the leftover milliseconds to the next wake. A tab the browser throttled
or a laptop that slept catches up on waking, by at most
`balance.loop.maxCatchUpMinutes` of game time; the rest is dropped, not banked,
so there is no offline progress. The engine still sees only whole ticks, one
`step` at a time. The tick guards itself: while
paused or dead it returns the state untouched, and whenever nothing in the
queue can run it returns without advancing the clock (bookkeeping that takes no
time, such as dropping a full producer, still happens). A stopped game renders
nothing.

Pause distinguishes **paused by the player** from **paused by the system**
(death, which holds the dead state behind the death card until Begin; the first run and every new life open live, because under decision #41 an empty queue costs nothing). The distinction matters because passive automation is
suppressed while the player has deliberately paused — a paused game is a
planning surface, and having the queue refill itself underneath the player
while they think defeats the point.

### The run clock

`runTickCount` increments once per tick and **resets to 0 on death**. It is the
time axis for everything that escalates within a run — most importantly health
decay. It is not a score and it is not persistent; it is the answer to "how long
has this life lasted."

---

## 2. Actions and the queue

The player does not click to perform work. They **queue** actions: an ordered
list of orders, where the same row may appear more than once and each entry has
its own identity. **Only the top entry runs**, one tick at a time. A plain
click queues a repeating order and Shift+click a single run, on both "now"
(the top) and + (the bottom); a one-time row is always single. (Spec
2026-09-23-the-windward-run section 2 replaced one-entry-per-action and
stall-in-place.)

### What an action is

```ts
interface ActionDefinition {
  id: string
  verb: SkillId                     // which skill earns XP while this runs
  noun: string
  expCost: number                   // total XP of effort to complete once
  producedItem?: ItemId
  producedAmount?: number
  itemCosts: ItemCost[]             // consumed INCREMENTALLY; an item at most once
  needs?: ItemCost[]                // checked, never spent (a key the next row requires)
  isOneTime: boolean
  hurts?: number                    // health lost per second while this row runs
  // effects of a one-time row, for the rest of the life:
  healthDecayMultiplier?: number    // the run's decay multiplier
  capacityBonus?: number            // + to the shared stack cap
  gear?: { skill, multiplier }      // a skill's tick multiplier (the "tool" factor)
  beat?: string                     // one authored sentence, printed on completion
}
```

Items carry no cap of their own: every item but a key holds at most
`balance.inventory.stackCap`, raised by capacity rows; a key holds one. Food
items carry `healPerUnit`.

One field carries more weight than its size suggests:

- **`healthDecayMultiplier`** is how construction pays off. Completing a shelter
  does not grant health; it *slows the clock* for the rest of the run.

### Incremental cost consumption

**This is the defining mechanic of crafting in Continuum, and the one most
worth protecting.** Costs are paid one unit at a time as progress accrues —
never as a lump sum checked on completion.

```ts
// Unit n (0-based) falls due at progress n * expCost / totalUnits. The engine
// counts thresholds reached rather than dividing, so it agrees exactly with the
// progress a waiting entry is clamped to.
function getRequiredCostsConsumed(action, progress): number {
  const totalUnits = sum(action.itemCosts.map(c => c.amount))
  let n = 0
  while (n < totalUnits && progress >= n * (action.expCost / totalUnits)) n++
  return n
}
```

Worked example — a cart costing 10 wood with an `expCost` of 1000:

```text
totalUnits  = 10
expPerUnit  = 1000 / 10 = 100 XP of effort per unit of wood

progress    required units consumed
      0       1     ← one unit is spent just to BEGIN
    100       2
    500       6
   1000      10     ← the last unit lands with the last of the work
```

Each tick, once progress has advanced, the engine walks `itemCosts` in
**declared order** and pays one unit for each unit threshold the new progress
has reached; a unit it cannot pay stops progress at that threshold.
Declaration order *is* spend order — a deliberate authoring lever, not an
accident.

Why this matters: a half-built cart has really eaten five wood. The player can
see materials draining into work in progress, and abandoning a build is a real
loss rather than a free undo.

### When the top cannot run: pops, and progress on the row

A row's progress and the units already spent into it live **on the row**, for
the rest of the life, not on the queue entry. So when the top entry cannot run
it is **popped**, and the next entry for that row resumes exactly where the
last stopped; nothing is paid twice, and removing an entry loses nothing.
Death clears every row's progress.

Before any time passes (decision #41), in order:

1. A row the current page does not have is dropped.
2. A page's closing row whose page still has one-time rows undone pulls the
   first of them in front of it, for it (section 7); one already queued below
   moves up with the orders that serve it, staying the player's. One pulled
   this pass and gone again means the page cannot be built now: the closer
   leaves, and says what it waits on.
3. A fight about to kill backs off (section 4, Hurts), unless it was forced.
4. A producer that is full, or a repeating producer that has fetched what the
   entries below it need (the look-ahead, below), pops.
5. A top entry that lacks an item (a cost unit it owes, or an unmet need) is
   **supplied**. A player's order, or anything serving one, takes the first
   row on the page that makes the item, whatever that row's automation: the
   player's press queues its whole chain, deepest first. Automation's own
   orders are supplied only if automation can make the item (section 6). The
   maker goes in at the top for exactly the shortfall. Otherwise the entry
   pops, and says why: nothing here makes it, its maker's automation is off or
   not yet earned, or its maker is blocked itself (naming the deepest cause
   down the chain).
6. An empty queue is filled by automation (section 6): JIT rows first, then
   the priorities. A closing row on a priority is ordered only once its next
   prerequisite can start, so its pull never fails.

This repeats until the top can run or the queue is empty; an empty queue stops
the clock.

**The look-ahead.** A repeating producer looks at the entries below it, down to
the next entry that makes the same item, and sums what they still need of its
item. It stops once the pack holds that much, or at the cap; with nothing below
needing the item, it fills to the cap. Each row below counts once, however
many entries it has: a one-time row owes what it has yet to spend; a repeating
row owes its cost for every completion it is asked for (a single entry one, an
automation fill its count left, a repeating entry as many as it can make before
its own stack is full), except that an automation supply order fetches for the
one order it supplies and nothing below that (it supplies again at the next
shortfall, and leaves when that order does);
a need counts once, as the amount to hold. A single
entry runs exactly one completion. So `salvage, hull, salvage, hull` with an
8-scrap hull and a cap of 5 fetches 5, the hull eats 5 and pops, the second
salvage fetches exactly 3, and the hull finishes; and `dealers, kitchens`, both
repeating, fetches a chip for every canapé the kitchens can still make.

"Now" refuses a row short of something nothing on the page makes, a
producer whose look-ahead from the top is already met, and a fight that would
stop at once (section 4, Hurts); a closing row waiting on its page is accepted
and checked for the fight when it would start. + appends even then.

### On completion

In order:

1. Produce items, if any, up to the cap.
2. Multiply the run's decay multiplier by the row's `healthDecayMultiplier`, if set.
3. Increment `completionCounts[id]`: a **lifetime** counter that survives death
   and earns automation (section 6). Reaching the threshold is logged.
4. A one-time row is recorded as done this life (its `capacityBonus` and `gear`
   apply from here, derived from the done list, so they reset at death).
5. A one-time or single entry leaves the queue; an automation fill with a
   count left counts down; a repeating entry stays.
6. If the row is the port's big event, **cast off** (section 7).

### Order of operations within a tick

1. Short-circuit if paused or dead.
2. **Resolve**, which takes no time: automation queues what it decides and the
   top pops until it can work (above). If it cannot, stop: the clock does not
   advance, nothing decays, nothing is eaten (decision #41).
3. Advance the run clock.
4. Apply this tick's health decay (section 4); at zero, die and stop.
5. Apply the top row's `hurts`, if any; at zero, die and stop.
6. Eat (section 4).
7. Work the top: pay the unit it owes, advance progress by the tick's XP
   (times its skill's gear), pay every unit whose threshold the new progress
   reached (an unpaid one clamps progress to it), and award the progress
   actually made as XP to **both** ledgers of its skill (section 3).
8. If progress has reached `expCost`, complete the row (above).

---

## 3. Skills and XP

> This section is the one most likely to be consulted later and the one most
> easily got subtly wrong. The two ledgers are *parallel*, not split.

### Dual mastery

Every skill carries **two independent levels that advance simultaneously from
the same effort**:

| Ledger | Base XP to level 1 | Multiplier per level | Survives death? |
|---|---|---|---|
| **Core mastery** | 10 | +5% | ✅ yes — permanent |
| **Run mastery** | 25 | +1% | ❌ no — resets to 0 |

Core mastery is the slow accumulation that makes every future life easier. Run
mastery is the fast, fragile competence built inside a single life. Core levels
faster per unit of XP (base 10 vs 25) but each level is worth more (+5% vs +1%),
which makes core the long game on both axes.

### The XP curve

Both ledgers use the same curve, differing only in their base:

```ts
function getExpToNextLevel(baseExp: number, level: number): number {
  return baseExp * Math.pow(1.1, level)     // 10% harder each level
}
```

| Level → next | Core XP needed (base 10) | Run XP needed (base 25) |
|---|---|---|
| 0 → 1 | 10.0 | 25.0 |
| 1 → 2 | 11.0 | 27.5 |
| 5 → 6 | 16.1 | 40.3 |
| 10 → 11 | 25.9 | 64.8 |
| 20 → 21 | 67.3 | 168.2 |

### XP earned per tick

While an action runs, its `requiredSkill` earns XP every tick:

```ts
const totalMult = (1 + coreLevel * 0.05)     // core contributes +5%/level
                * (1 + runLevel  * 0.01)     // run  contributes +1%/level
                * gear                       // the product of the life's gear for this skill; 1.0 with none

const tickExp = totalMult * 0.1              // baseline is 0.1 XP per tick
```

**The same `tickExp` value is then added to both ledgers.** This is the part
that is easy to misread: it is not a 50/50 split of one award, and it is not two
separate calculations. It is *one* amount of effort recorded in two books, each
of which converts it to levels at its own rate.

Worked example — a skill at core level 10, run level 5, no gear:

```text
totalMult = (1 + 10 × 0.05) × (1 + 5 × 0.01) × 1.0
          = 1.50 × 1.05
          = 1.575

tickExp   = 1.575 × 0.1 = 0.1575 XP per tick
          = 1.575 XP per second of real time

  → 0.1575 added to the CORE ledger (needs 25.9 for its next level)
  → 0.1575 added to the RUN  ledger (needs 64.8 for its next level)
```

Because the multiplier is shared, the two ledgers compound each other: core
levels make run levels arrive faster, and run levels make core levels arrive
faster within the same life.

### What skills currently do

Levelling a skill makes *that skill* earn XP faster. That is the whole effect.
Skills do not unlock actions, do not gate content, and do not modify any
mechanic outside their own multiplier.

⚠️ **This is a known design weakness, not a design decision.** A progression
system whose only reward is more progression is a flat one. Resolving it is
tracked in the issues and is expected to reshape this section.

---

## 4. Health, decay, food, death

### Constants

```
BASE_HEALTH                 = 100
BASE_DAMAGE_PER_TICK        = 0.01     🎚️
DECAY_GROWTH_RATE           = 1.25     🎚️
DEFAULT_FOOD_COOLDOWN_TICKS = 50       🎚️  (5 seconds)
```

### Decay is the clock

Health does not drain at a constant rate. It accelerates, exponentially, for as
long as the run lasts:

```ts
function getDamagePerTick(runTickCount, decayMultiplier = 1.0): number {
  const minutes = runTickCount / TICKS_PER_MINUTE
  return BASE_DAMAGE_PER_TICK * Math.pow(DECAY_GROWTH_RATE, minutes) * decayMultiplier
}
```

**`damage = 0.01 × 1.25^(minutes elapsed) × decayMultiplier`**

| Run time | Damage per tick | HP lost per minute |
|---|---|---|
| 0 min | 0.0100 | 6.0 |
| 5 min | 0.0305 | 18.3 |
| 10 min | 0.0931 | 55.9 |
| 15 min | 0.2842 | 170.5 |

The intent is a run with three distinct movements: an opening that forgives
experimentation, a middle that forces the player to stop gathering and start
securing, and an end that cannot be survived — only postponed, and only by
having earned a lower `decayMultiplier` earlier.

`decayMultiplier` starts at 1.0 each run and is multiplied down by completing
actions that carry a `healthDecayMultiplier`. **It is the only defence against
the clock**, and it resets on death.

### Food and auto-eating

Eating is automatic. There is no eat button, and that is deliberate — the
decision the player makes is *whether to have food*, not *when to swallow it*.

Once per tick, after damage is applied, each inventory item with a
`healPerUnit` is considered, **smallest heal first** (the order the food chunk
shows too, which never changes):

1. Skip if that item is still on cooldown.
2. Skip if eating it would push health above maximum — **no unit is ever
   wasted on overheal**.
3. Otherwise: heal by `healPerUnit`, consume one unit, and put that item on a
   50-tick cooldown.

At most one unit per food type is eaten per tick. The cooldown exists to stop a
full stack being swallowed in a single burst the instant health dips.

### Hurts

A row may carry `hurts`, health lost per second **while it runs** (the top
entry, on a tick it works), applied after decay. A fight interrupted by a JIT
food fill does not drain while the food runs, and keeps its progress.

**A fight stops before it kills** (#74). A hurting top **would kill** when
fighting on for its window ends the life, played out tick by tick in the
tick's own order (decay, hurt, then eating from the pack). The window is the
ticks the port's first food row needs for one unit, plus one tick (a unit made
in one tick is eaten in the next), and never past the fight's own finish, so a
fight that would win first carries on. When it would kill, before any time
passes:

1. An automated **harvest** (repeatable, not off, does not hurt) that can start
   without any fight on its supply chain runs **once** in front of it, foods
   first. The fight stays queued with its progress.
2. With none, if anything else of the port can start, the fight **stops**: it
   leaves the queue with its progress kept, the clock may stop, and the log says
   so once per row per life. Play on that fight is refused with the same words.
3. With nothing else that can start, the fight goes on.

**An automated fight** (chip on) takes case 1, where any automated row ranked
above it also buys time, but never case 2: with nothing to run it fights on,
death included. The idle fill queues it in its rank
like any priority row. Case 2 is for a fight queued by hand with its chip off.

**Shift forces** a hurting row: the entry is tagged *to the end* and never backs
off, death included; the supply orders it pulls are forced too. JIT food is
never refilled through a supply chain that runs through a fight that would
kill.

### Death

Checked once per tick, after decay and after hurts, before eating:
`health <= 0`.

---

## 5. Death and rebirth

Death is a normal, expected, frequent event. It is the loop, not the fail state.

### What resets

- Health restored to maximum (including accrued rebirth bonus).
- Inventory restored to starting defaults, **food included**: food is a
  within-life plan (spec 2026-09-23 §2.1).
- The queue is emptied, and every row's kept progress cleared.
- One-time actions become available again (and with them their capacity and
  gear effects end).
- Back to the first port.
- `runTickCount` → 0.
- `healthDecayMultiplier` → 1.0.
- Food cooldowns cleared, and the tick's events.
- Every skill's **run mastery** → level 0.
- The next life begins with a plan rather than with lost seconds. Under
  decision #41 a new life costs nothing until something is queued. The dead
  state is held behind a death card until the player presses **Begin**, and
  the screen behind the card already shows the next life.

### What persists

- Every skill's **core mastery**, and its lifetime counters (ticks spent, best
  run level) for the skill ledger.
- `completionCounts`: lifetime totals that earn automation.
- Automation settings, keyed by row.
- Accumulated rebirth health bonus.
- The life number, counting up from 1, and the times the book was finished.

Finishing the book ends a life the same way (section 7).

### The rebirth bonus

```ts
function rebirthGain(runTicks: number): number {
  return Math.pow(balance.rebirth.growthRate, minutes(runTicks)) - 1   // 🎚️ 1.1
}
```

The bonus from each death is added to a permanent total, and maximum health is
`base + total`. The shape is the one a player reports for Increlution: it
rewards the **longer** life, and a longer life is the sign that skills and
found content are doing their work (spec 2026-09-23 §3). It is fractional and
never floored.

| Life length | Bonus earned |
|---|---|
| 5 min | +0.61 |
| 10 min | +1.59 |
| 20 min | +5.73 |
| 30 min | +16.4 |

A couple of seconds of extra life per death is the intended size. Max health is
not the main lever: faster rows from core mastery are, along with content that
multiplies the gain, which is tracked in the issues.

---

## 6. Automation

Automation is earned per row, by doing that row enough times across all lives,
and once earned it is permanent.

### Earning it

```
repeatable rows  → 200 lifetime completions     🎚️
one-time rows    →   5 lifetime completions     🎚️
```

Keyed by row, counted across deaths, never lost. Until earned, a row's chip
shows its progress (`37/200`) and cannot be pressed.

### The modes

An earned chip cycles:

```text
off → JIT → top → high → mid → low → last → off
```

JIT appears only on a row that makes a food, or an item some row costs or
needs. A newly earned chip starts at off.

- **JIT, just in time.** When the top entry lacks the item this row makes, it
  goes in at the top at once, for exactly the shortfall (the look-ahead makes it
  exact), skipping every priority. A **food** row on any chip, JIT or a
  priority (#81), is queued at the top the moment its food runs out, even in the
  middle of a press's chain, with a count: the completions to the cap from what was on hand
  (so a fill that eating outpaces still ends; while food is at zero a new one
  follows). A fill the player buries under a play press (an order of the
  player's above it) goes back to the top if the food is out, and so does a
  fill for a food whose only order is the player's own, below anything but its
  own supply; taken off JIT, or turned off from a priority, a food row's fill
  leaves with its supply (off, automation stops harvesting), and leaving JIT
  owes the departure's provision again. And when a port's big event is on top, unstarted and able to start
  (its own supply, a key it needs, already fetched), every JIT food below its
  cap is **provisioned** first, once per food per departure (never before the
  book's finish, which is not a departure).
- **top, high, mid, low, last: the priorities.** When the top entry lacks an
  item whose maker is on a priority, the maker goes in once nothing better
  ranked can go first: a repeatable producer, not already queued, that can work
  at once with no supply of its own (Forage on a higher priority fills the
  berries before Mine supplies the cabin). When the queue is empty and not
  paused, a JIT **food** below its cap refills to it first (#77). Only food:
  other JIT rows wait for demand, running only when an order is short of what
  they make (#79). Food and the priorities take turns, since late in a life
  food is eaten faster than it is made and would
  otherwise take every empty queue; with nothing else ready, food goes again at
  once, so an empty queue never sits idle while a JIT **food** could run. After those, the highest-priority row **that can run** is queued, one at a time;
  ties go to the port's row order. A row set to a priority that cannot run (its
  harvest has no chip yet) is passed over, and its chip shows why.
- **off.** Nothing. A short entry whose maker is off pops, and says so.

Supply follows the chain: a maker that is automated but cannot run itself does
not count, and "now" refuses up front what no chain can close. Nothing refills
while the player has paused.

## 7. Ports, pages, casting off, and the finish

A book is a line of chapters, its **ports**, and each port is a line of
**pages**. Only the current page's rows are on screen and can be queued. A page
ends on its **closing row**, a one-time row that cannot start until every
other one-time row on the page is done; completing it turns the page. Pages
replace one another: each lists its own rows, and a row (food, usually) may be
listed on several pages of its port, carrying its progress. Turning a page
keeps the items and the automation and drops queued orders for rows the new
page does not list. The page is never stored: it is the first page of the port
whose closing row is not done, so a new life is on page 1. A gate in a story
is written as a page boundary, never as a condition on a row
([spec](./docs/specs/2026-09-24-pages.md)). JIT is offered only on a row whose
output a row on a page it shares spends.

A port's last page's closing row is its event, whatever that row is.
Completing it **casts off**: the next port's first page is the page, every
non-food item is dumped (provisions ride along), and the queue keeps only
orders the new page has. The
effects completed rows applied stay for the life. The last port's event is the
book's **finish**: the life ends there, a finish card shows the book's last
line, and the next life starts again at the first port with core ledgers,
automation and counts kept and the life's max-health gain applied.

---

## Constants summary

| Constant | Value | Meaning |
|---|---|---|
| `TICK_INTERVAL_MS` | 100 | 10 ticks per real second |
| `TICKS_PER_MINUTE` | 600 | 600 ticks = 60 s |
| `BASE_HEALTH` | 100 | Starting maximum health |
| `BASE_DAMAGE_PER_TICK` | 0.01 🎚️ | Decay at the start of a run |
| `DECAY_GROWTH_RATE` | 1.25 🎚️ | Decay multiplied per minute elapsed |
| `REBIRTH_GROWTH_RATE` | 1.1 🎚️ | Per-death bonus = 1.1^minutes − 1 |
| `DEFAULT_FOOD_COOLDOWN_TICKS` | 50 🎚️ | 5 s between eats of the same food |
| Core mastery base / multiplier | 10 / +5% 🎚️ | Persistent ledger |
| Run mastery base / multiplier | 25 / +1% 🎚️ | Per-run ledger |
| XP curve exponent | 1.1 🎚️ | 10% harder per level |
| Baseline tick XP | 0.1 🎚️ | Before mastery and tool multipliers |
| Automation unlock (repeatable) | 200 🎚️ | Lifetime completions |
| Automation unlock (one-time) | 5 🎚️ | Lifetime completions |
| Stack cap | 5 | Every item but a key; raised by capacity rows (#45) |
| Catch-up per wake | 5 min 🎚️ | Game time a throttled or woken tab may run at once |

---

## Numbers not yet derived

Every value marked 🎚️ was chosen by feel. None has a derivation, and none
should be defended on the grounds that it is written down here. They are
starting points for a balance pass against the real content, and they are
tracked as tuning issues.

The ones that matter most, because everything else sits downstream of them:

- **`BASE_DAMAGE_PER_TICK` and `DECAY_GROWTH_RATE` together define the entire
  difficulty curve.** They are what makes a run 10 minutes rather than 60.
- **`REBIRTH_GROWTH_RATE`** is small by design (spec 2026-09-23 §3): a
  couple of seconds per death, with the real lever in content that multiplies
  the gain.
- **The 40× gap between the two automation thresholds** (200 vs 5) reads as
  correct but has never been justified.

⚠️ **Balance values are changed deliberately, never opportunistically.** A bug
whose fix edits a tuning number is a bug that has been misdiagnosed — find the
mechanism.

---

## Design notes

Things that bite, kept where they will be read.

1. **Cost declaration order is spend order.** `itemCosts` is walked
   left-to-right, so the author controls which material drains first; an item
   appears at most once in a row's costs.
2. **Progress is keyed by row, not by entry.** Two entries for one row share
   its progress; a popped or removed entry loses nothing.
3. **Effects are derived.** The stack cap's raise and gear come from the life's
   done one-time rows, so they end at death with them; the decay multiplier is
   the one effect kept on the state.
4. **JIT food fires on empty, not on low.** The player briefly has no food
   before the fill begins (#25, answered by the user: "if that food item is
   out, it is immediately queued").
5. **The idle fill passes over a row that cannot run.** A player who sets an
   upgrade to a priority before its harvest has a chip, and the big event too,
   will cast off past the upgrade; the chip says why.
6. **A port change prunes the queue.** Entries for rows the new port lacks are
   dropped; their rows' progress stays unreachable for the rest of the life.
