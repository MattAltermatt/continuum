# v0.2: a run you can lose

**Date:** 2026-09-23
**Status:** design, agreed question by question in a brainstorm. This is the
argument and the decisions. The work is queued in the
[v0.2 milestone](https://github.com/MattAltermatt/continuum/milestone/2).
**Mockup:** [`2026-09-23-death-card.html`](../mockups/2026-09-23-death-card.html).
**Builds on:** [books, chapters, verbs](2026-09-22-books-chapters-verbs.md),
§8.6 for the screen and §9 for the mechanics it changed.

---

## 0. What v0.2 is for

v0.1 ends at "Dead at 9:42. Rebirth is a later milestone." The loop stops at
its first death. v0.2 closes the loop: **the player dies, sees what the life
bought, begins the next life, and feels it go further.** Everything else
waits until life after life is playable, because the feel notes the game needs
come from playing many lives.

Two v0.2 issues were already built in v0.1 and are closed from this spec, not
rebuilt: the decay clock (#11: `damagePerTick` in `src/engine/health.ts`, the
curve asserted by test) and auto-eating (#12: `eat()` in the same file, with
the cooldown, overheal and one-bite-per-food rules each under test).

## 1. The display rule 🪨

> **Show rates and states as they are this second. Never show a prediction.**

This came from the HUD question and governs everything on the screen.

- A row that reads **"60s"** means 60 seconds *at today's rate*. It is not a
  forecast of how long the action will take once levels land mid-action. It is
  meant to drop from life to life: part of the fun is watching something that
  took *n* minutes take *m* minutes because of skill. The row timer and the
  queue countdown stay exactly as they are.
- **Time-to-death is a prediction** and is never shown, in any form. A queued
  fight that has not started, berries that Forage has not produced yet and a
  cabin half built all change it. Spec §8.7 already rejected "dead in", and this
  rule is why. A forward simulation that would make it exact was considered
  and rejected. If a number is not accurate now, it is not reported.
- #15's done-when, *"can the player answer 'how long do I have?' without
  arithmetic"*, is **replaced** by: *at a glance, does the larder cover decay
  right now?* The food line's color answers it (§4.1).

## 2. Death and rebirth (#13)

Death is detected where v0.1 already detects it: in `applyDecay`, once per
tick, after damage and before eating. The state goes `dead`.

### 2.1 What resets

Health to the new maximum. The inventory to starting defaults (empty),
**food included** (a brainstorm decision: food is a within-life plan). The queue
emptied. `completedOneTime` emptied, so the cabin and the hall can be built
again. `foodCooldowns` cleared. `runTicks` to 0. `decayMultiplier` to 1.0.
Every skill's **run** ledger to level 0 with 0 exp.

### 2.2 What persists

Every skill's **core** ledger, level and exp. `completionCounts`. The accrued
rebirth bonus, so maximum health = `balance.health.base` + the sum of every
death's gain. A **life number**, counting up from 1, which the log already
speaks of ("life 4 begins").

Automation settings and skill points join this list when they exist. Neither
is built yet, and v0.2 does not build them.

### 2.3 Both lists are asserted, including the negatives

A field that wrongly persists is as wrong as one that wrongly resets, and much
harder to notice. The tests assert every field above in both directions. When
a field is added to `GameState` later, a test fails until that field is put on
one list or the other: a new field that nobody decided about is the bug this
guards against.

### 2.4 The moment of death (mockup, approved)

A **death card**, over the chapter column. The reset has **already happened
behind it**: the pack and queue are empty, and health is full at the new
maximum. The rows show the new life's times. *(Revision 1)* Those times are
faster than the last life's *start*, because core mastery stayed, and slower
than the moment of death, by about 8–11% on the Scrub, because run levels are
gone. The card shows what the life **gained**, never what it lost:

- the title "Life 3 ends" in the running head's serif, and "09:42 on the clock"
  (the run clock's own format);
- each skill whose **core** level moved during the life, `core 4 → 6`, with its
  bar; skills that did not move are left off;
- `max health 100.00 → 101.52`, and under it the reason in full:
  `+1.52 from 09:42 alive · 1.1^9.70 − 1`. *(Code review)* The card is the
  ledger, so it uses two decimals, **floored** like every number on screen, so
  none reads higher than it is. The gain shown is the difference of the two
  values shown, so from + gain = to always checks on the card;
- a **Begin life 4** button;
- one quiet line: "pack, food, queue and run levels start over."

Nothing ticks while the card is up, and nothing on the screen behind it takes
orders. *(Revision 1)* The dead state stays the game's state until **Begin**.
The engine already refuses orders on a dead state, and the card and the screen
behind it are both derived from that state. A save taken while the card is up
would bring the card back. **Begin** dismisses the card and logs "life 4 begins". The new life then
costs nothing until something is queued (decision #41). #13's "the game starts
paused" is met by that rule and needs no extra pause.

The card needs the core levels as they stood when the life began. The state
carries that snapshot, taken at each life's start.

## 3. The rebirth bonus (#14)

**Shape changed in the brainstorm**, from `growthFactor × √ticks` to
Increlution's shape, as a player on its Steam forum reports it (not a
developer statement):

```text
max health gain per death = growthRate ^ (minutes alive) − 1
```

with `growthRate = 1.1` and minutes read from the run clock, which under
decision #41 counts only time spent working. Idle planning earns nothing.

| Life length | Gain |
|---|---|
| 5 min | +0.61 |
| 10 min | +1.59 |
| 20 min | +5.73 |
| 30 min | +16.4 |

- **#14's reasoning is reversed.** It argued "more attempts beat longer
  attempts". The curve now rewards the longer life, sharply. The user's
  expectation for the loop: as skills improve, the player gets further along
  and finds more things that raise health or slow decay. A longer life is the
  sign of that, and it pays back.
- **A couple of seconds per death is the intended size.** Against an unfed
  run, +1.6 max health buys a few seconds. Max health is not the main
  lever. Faster rows from core mastery are, along with content found by
  playing.
- **Fractional, never floored.** Nothing is wasted. *(Revision 1)* With a
  fractional maximum, the health display shows **both** numbers floored to
  tenths (`71.4 / 101.5`), so a full bar reads full (`101.5 / 101.5`), not
  `101 / 101.5`. A whole maximum keeps v0.1's reading. The card uses floored
  hundredths (§2.4).
- **Content that multiplies the gain** (Increlution's exploration effects, a
  one-time task that doubles it) is the real lever and is **not** in v0.2. It
  is filed as its own issue: a field on an action, the same seam as the
  cabin's `decayMultiplier`.

`balance.rebirth` changes from `{ growthFactor: 0.01 }` to
`{ growthRate: 1.1 }`. The user asked for this explicitly in the brainstorm
(decision #3 is satisfied). No other balance value changes in v0.2.

## 4. The HUD: rates and food (#15)

Built as mocked in [`2026-09-22-rates-food.html`](../mockups/2026-09-22-rates-food.html)
and placed as in [`2026-09-22-layout.html`](../mockups/2026-09-22-layout.html):
the middle column stacks **rates, food, pack**, with the log below.

### 4.1 Rates

All in hp/s, true this second, per §1:

- **decay**, `−0.93 hp/s ▲`, from `damagePerTick` at the current `runTicks` and
  `decayMultiplier`, times ticks per second. The ▲ is there because the rate
  accelerates.
- **food, up to**: the larder's ceiling. Each food that is **feeding** adds
  `healPerUnit ÷ cooldown seconds`. A food is feeding when it has a unit on
  hand or its cooldown is running *(plan Revision 3)*: a food eaten on the
  tick it lands is still feeding, and hand-to-mouth eating does not read as an
  empty larder. The food chunk's "nothing to eat" uses the same rule. It is labelled as a ceiling
  because it is one. With nothing to eat the line reads `+0.00` in the hurt
  color, not hidden: the absence is the news.
- **There is no net line** *(plan Revision 2)*. Every form of net was tried
  against a simulated life, and each one either lied or repeated another line:
  - **Measured over a window:** it read green for five seconds after each bite
    while health fell.
  - **Computed from foods that could bite now:** it equalled the decay line on
    every tick, because a bite lands in the same tick that room for it opens.
  - **Decay plus the full larder:** it read green at full health.

  Instead, **the food line's color is the chunk's one judgement**: green when
  the ceiling covers decay, red when it does not, including `+0.00` with an
  empty larder. Across a fed life it changes twice: red while the first berries
  come in, green while the larder keeps up, and red once nothing is feeding
  (`+0.00`, "nothing to eat"). In the default order that happens because Forage
  stops at a full stack, and once re-queued it sits behind the hall and Mine,
  which can always run, so no more berries arrive. On the Scrub, the cabin keeps decay below the ceiling for a whole fed
  life. The
  rates mockup's net row is superseded.
- A per-action drain line arrives with Fight. v0.2 has none.

While the run clock is stopped (paused, idle, waiting, or the death card),
nothing drains. The chunk then shows the rates that apply when the clock
restarts, dimmed like the clock itself.

### 4.2 Food

Food moves out of the pack into its own chunk, as §8.6 designs it. Each food in
its own box: name, what one bite heals, a small **cooldown bar** that drains
until it can be eaten again, and count/cap centered under it. A full stack is
warn. With zero food the box border goes hurt and the header says "nothing to
eat". The pack keeps materials only.

## 5. Out of v0.2

- **The decay curve and the 20-minute target (#21).** Blocked on real content,
  as #21 says; deriving it against the Scrub would calibrate the game to a
  placeholder. No decay constant changes in v0.2.
- **Health that throbs as death gets close** (§8.6). Presentation, and its own
  small issue once the death loop has been played.
- **Gain multipliers from content.** §3. Filed.
- **Saving across a page reload.** A reload is a new game in v0.2.
- **Automation, skill points, more chapters.** Later milestones.

## 6. Done when

- A run dies, the death card shows the life's real gains, **Begin** starts the
  next life, and that life's rows are visibly faster. Played in Chrome across
  at least three lives, not read from a screenshot.
- The reset and persist lists are asserted in both directions, and a new
  `GameState` field fails a test until it is classified.
- The bonus formula is asserted at sampled life lengths, and maximum health
  accrues across several deaths.
- Rates show decay and the food ceiling, colored by whether it covers decay,
  and the display rule holds: no number on the screen predicts.
- Food has its own chunk with cooldown bars. The pack holds materials only.
- The CLAUDE.md Definition of Done passes in full.
