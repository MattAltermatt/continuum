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

A single loop dispatches one `TICK` per interval. The tick guards itself: while
paused or dead it returns the state untouched, and whenever nothing in the
queue can run it returns without advancing the clock (bookkeeping that takes no
time, such as dropping a full producer, still happens). A stopped game renders
nothing.

Pause distinguishes **paused by the player** from **paused by the system**
(death; the first run opens live, because under decision B an empty queue costs nothing; §5's paused rebirth is unchanged). The distinction matters because passive automation is
suppressed while the player has deliberately paused — a paused game is a
planning surface, and having the queue refill itself underneath the player
while they think defeats the point.

### The run clock

`runTickCount` increments once per tick and **resets to 0 on death**. It is the
time axis for everything that escalates within a run — most importantly health
decay. It is not a score and it is not persistent; it is the answer to "how long
has this life lasted."

### Skill points

```
TICKS_PER_SKILL_POINT = 9,000     // 15 minutes of unbroken survival
```

One skill point is awarded each time a *single run* crosses a 15-minute
boundary. Points persist across death. This is the one reward that scales with
run *length* rather than run *output*, and it is deliberately the slowest clock
in the game.

---

## 2. Actions and the queue

The player does not click to perform work. They **queue** actions, and the
queue works one action at a time, one tick at a time: the first entry that can run, which is the front one unless it is waiting on an input. The queue holds one entry per action.

### What an action is

```ts
interface ActionDefinition {
  id: string
  name: string
  description: string
  category: ActionCategory          // grouping for presentation
  requiredSkill: SkillId            // which skill earns XP while this runs
  expCost: number                   // total XP of effort to complete once
  producedItem?: ItemId
  producedAmount?: number
  itemCosts?: ItemCost[]            // consumed INCREMENTALLY — see below
  isOneTime: boolean
  capacityBonusOnComplete: number   // +N to every inventory slot's max
  healthDecayMultiplier?: number    // permanent per-run decay modifier
  templateKey?: string              // stable identity for meta-progression
  healPerUnit?: number              // food: HP restored per unit eaten
  requires?: Record<string, number> // gating: templateKey → completions needed
}
```

Two fields carry more weight than their size suggests:

- **`templateKey`** is the action's *stable* identity. Automation unlocks,
  player priority settings and lifetime completion counts are all keyed by it,
  never by `id`. This is what lets meta-progression survive death and survive
  content being restructured underneath it. Falls back to `id` when absent.
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

### Stalling and resuming

When an action's progress reaches the point where its next unit is due and
that unit cannot be paid, progress stops exactly there and the action
**waits**: it stays in the queue, flagged, keeping its progress and the units
already spent, and the engine works the first entry that can run. Progress
never runs past an unpaid unit, so a waiting action owes exactly one. Every
entry is re-checked before each tick and resumes the moment it can pay.
Nothing is re-paid. (Spec 2026-09-22 §9 replaced the earlier "pull it out and
stash it" model, so the queue view is honest.)

A producer never produces into a full stack. When a completion leaves its
stack with no room for another, the entry leaves the queue; one queued onto an
already-full stack leaves before it does any work. Ticks spent stay spent, XP
stays earned, and nothing lands past the cap.

A stall is not a failure state and should not read as one. It is the game
saying *you ran out of wood*, and the correct response is to go get wood.

### On completion

In order:

1. Produce items, if any.
2. Apply `capacityBonusOnComplete` to **every** inventory slot's maximum.
3. If one-time, record it so it cannot be queued again this run.
4. Multiply the run's `healthDecayMultiplier` by the action's, if set.
5. Increment `actionCompletionCounts[templateKey]` — a **lifetime** counter that
   survives death and drives automation unlocks.
6. If repeatable and the output stack has no room for another completion, the
   entry leaves the queue; otherwise it resets to zero progress and stays.

### Order of operations within a tick

1. Short-circuit if paused or dead.
2. Settle, which takes no time: drop producers whose stack is full, flag
   entries that cannot pay the unit they owe, unflag those that can again.
3. Find the first entry that can run. If there is none (which covers an empty
   queue), stop: the clock does not advance, nothing decays, nothing is eaten.
   Time passes only while work happens (decision B, 2026-09-22).
4. Advance the run clock.
5. Apply this tick's health decay (§4); at zero, die and stop.
6. Eat (§4).
7. Work the entry found in step 3: pay the unit it owes, advance progress by
   the tick's XP (`expCost` is in XP), and pay every unit whose threshold the
   new progress reached. A unit that cannot be paid stops progress at its
   threshold, and the entry waits. Then award the progress actually made as XP
   to **both** mastery ledgers of its skill (§3): a clamped tick earns only
   what it applied.
8. If progress has reached `expCost`, complete the action (above).
9. If the queue is now empty, attempt a passive automation fill (§6).
   *Not built yet; when it is, it belongs in step 2, since an empty queue
   never reaches this step, and it must skip producers whose stack is full.*
10. If a food item hit zero this tick, attempt as-needed food injection (§6).

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
                * toolMultiplier             // equipment hook; 1.0 by default

const tickExp = totalMult * 0.1              // baseline is 0.1 XP per tick
```

**The same `tickExp` value is then added to both ledgers.** This is the part
that is easy to misread: it is not a 50/50 split of one award, and it is not two
separate calculations. It is *one* amount of effort recorded in two books, each
of which converts it to levels at its own rate.

Worked example — a skill at core level 10, run level 5, no tool bonus:

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
`healPerUnit` is considered:

1. Skip if that item is still on cooldown.
2. Skip if eating it would push health above maximum — **no unit is ever
   wasted on overheal**.
3. Otherwise: heal by `healPerUnit`, consume one unit, and put that item on a
   50-tick cooldown.

At most one unit per food type is eaten per tick. The cooldown exists to stop a
full stack being swallowed in a single burst the instant health dips.

### Death

Checked once per tick, after damage and before the queue advances:
`health <= 0`.

---

## 5. Death and rebirth

Death is a normal, expected, frequent event. It is the loop, not the fail state.

### What resets

- Health restored to maximum (including accrued rebirth bonus).
- Inventory restored to starting defaults.
- The queue is emptied.
- One-time actions become available again.
- `runTickCount` → 0.
- `healthDecayMultiplier` → 1.0.
- Every skill's **run mastery** → level 0.
- The game starts **paused**, so the next life begins with a plan rather than
  with lost seconds.

### What persists

- Every skill's **core mastery**.
- `actionCompletionCounts` — lifetime totals that drive automation unlocks.
- Automation settings and as-needed flags, keyed by `templateKey`.
- Skill points.
- Accumulated rebirth health bonus.

### The rebirth bonus

```ts
function calculateRebirthBonus(runTickCount: number): number {
  return 0.01 * Math.sqrt(runTickCount)     // 🎚️
}
```

The bonus from each run is added to a permanent total applied to maximum health.
Growth is sub-linear, so two 15-minute runs are worth more than one 30-minute
run — the curve deliberately rewards *more attempts* over *longer attempts*.

| Run length | Bonus earned |
|---|---|
| 5 min | +0.55 |
| 15 min | +1.00 |
| 30 min | +1.34 |

⚠️ **The scale here is a known problem.** Against a base of 100 HP, a full
15-minute run buys +1.00 maximum health — roughly 100 runs, or about 25 hours,
to double. A meta-progression reward the player cannot feel is not a reward.
Re-deriving this curve is tracked in the issues.

---

## 6. Automation

Automation is earned per action, by doing that action enough times across all
lives, and once earned it is permanent.

### Unlock thresholds

```
repeatable actions  → 200 lifetime completions     🎚️
one-time actions    →   5 lifetime completions     🎚️
```

Keyed by `templateKey`, counted across deaths, never lost.

### The mode cycle

Each unlocked action cycles through:

```text
Off (0) → AN → 1 → 2 → 3 → 4 → 5 → Off
```

- **Off** — manual only.
- **1..5** — passive priority, where 1 is highest.
- **AN** — *as-needed*: a reactive producer that does not run on its own.

### Passive mode

When the queue empties and the player has not deliberately paused, the engine
picks **exactly one** action to queue:

1. Collect every reachable action with a passive priority of 1 or higher.
2. Drop one-times already completed this run.
3. Drop anything the proceed-gate rejects.
4. Sort by priority ascending, tie-broken by declaration order.
5. Queue **the first one only.**

Passive never bulk-fills and never stages a chain. Each completion empties the
queue, which re-triggers the fill on the next tick.

### As-needed mode

An AN producer sits dormant and activates on exactly two triggers.

**Trigger 1 — a consumer stalls on a missing material.** The engine finds an AN
producer of that item, computes precisely how many runs are needed to cover the
shortfall, and injects it at the front of the queue:

```ts
const stillNeeded = totalUnits - costsConsumed
const mustGather  = Math.max(0, stillNeeded - inventoryCount)
const cycles      = Math.ceil(mustGather / producer.producedAmount)
```

The producer is queued with `targetCount = cycles` and the stalled consumer is
pushed to position 1 with its progress and consumed costs **preserved**. The
producer removes itself the moment its count runs out, and the consumer picks up
mid-build. Without an AN producer for that item, the consumer just stalls.

**Trigger 2 — a food item reaches zero.** Detected on the transition from above
zero to zero within a tick. Here the producer is told to gather to *capacity*,
not merely to one unit:

```ts
const cycles = Math.max(1, Math.ceil(maxCapacity / producer.producedAmount))
```

### Finite runs (`targetCount`)

A queued action with a `targetCount` decrements it on each completion and
removes itself at zero. Without one, it repeats indefinitely. This single field
is what lets AN injections be exact instead of open-ended.

---

## Constants summary

| Constant | Value | Meaning |
|---|---|---|
| `TICK_INTERVAL_MS` | 100 | 10 ticks per real second |
| `TICKS_PER_MINUTE` | 600 | 600 ticks = 60 s |
| `TICKS_PER_SKILL_POINT` | 9,000 | 15-minute run → 1 skill point |
| `BASE_HEALTH` | 100 | Starting maximum health |
| `BASE_DAMAGE_PER_TICK` | 0.01 🎚️ | Decay at the start of a run |
| `DECAY_GROWTH_RATE` | 1.25 🎚️ | Decay multiplied per minute elapsed |
| `REBIRTH_GROWTH_FACTOR` | 0.01 🎚️ | Per-death bonus = 0.01 × √ticks |
| `DEFAULT_FOOD_COOLDOWN_TICKS` | 50 🎚️ | 5 s between eats of the same food |
| Core mastery base / multiplier | 10 / +5% 🎚️ | Persistent ledger |
| Run mastery base / multiplier | 25 / +1% 🎚️ | Per-run ledger |
| XP curve exponent | 1.1 🎚️ | 10% harder per level |
| Baseline tick XP | 0.1 🎚️ | Before mastery and tool multipliers |
| Automation unlock (repeatable) | 200 🎚️ | Lifetime completions |
| Automation unlock (one-time) | 5 🎚️ | Lifetime completions |

---

## Numbers not yet derived

Every value marked 🎚️ was chosen by feel. None has a derivation, and none
should be defended on the grounds that it is written down here. They are
starting points for a balance pass against the real content, and they are
tracked as tuning issues.

The ones that matter most, because everything else sits downstream of them:

- **`BASE_DAMAGE_PER_TICK` and `DECAY_GROWTH_RATE` together define the entire
  difficulty curve.** They are what makes a run 10 minutes rather than 60.
- **`REBIRTH_GROWTH_FACTOR`** decides whether the meta-layer is felt or
  invisible. At its current scale it is invisible.
- **The 40× gap between the two automation thresholds** (200 vs 5) reads as
  correct but has never been justified.

⚠️ **Balance values are changed deliberately, never opportunistically.** A bug
whose fix edits a tuning number is a bug that has been misdiagnosed — find the
mechanism.

---

## Design notes

Things that bite, kept where they will be read.

1. **Cost declaration order is spend order.** `itemCosts` is walked
   left-to-right, so the author controls which material drains first.
2. **A waiting action is keyed by its queue entry, and the queue holds one entry per action.** If content ever regenerates action ids, a waiting entry is simply removed by the new chapter's queue prune (design note 6).
3. **The capacity bonus is global.** `capacityBonusOnComplete` raises *every*
   slot's maximum. Per-slot bonuses would need a reshape.
4. **As-needed food fires on empty, not on low.** It triggers on the transition
   to zero, so the player briefly has no food before the gather begins. Whether
   that gap is tension or friction is an open question.
5. **Passive automation never chains.** Staging a dependent chain of producers is
   as-needed's job, by design. Passive picks one action and stops.
6. **Unreachable queued entries are dropped silently.** Any notion of context or
   location must prune the queue when it changes, or stale entries block the
   front of the queue forever.
