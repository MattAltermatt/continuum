# The queue plays safely — spec (2026-09-24)

Issues: #69 (freeze cause), #77 (an empty queue does what JIT can), #74 (a fight
stops before it kills). One branch, one merge, one re-tune (the user, 2026-09-24:
*"69 -> 77 -> 74"*, merged together so #77 never ships without #74's guard).
#72 was answered A and closed; its lock-out moves to #78, out of scope here.

## 1. #69: the headless play says who froze it

Today `play()` returns `frozen` whenever two steps in a row pass no time with the
policy asked in between. It cannot say whether the **policy** left something
undone or the **book** cannot go on. That matters now: #74 adds a new way to stop
the clock (a refused fight), and the re-tune reads these runs.

**Rule.** When a run freezes, the frozen state is probed by construction: for each
row that **moves the port on** (its unfinished one-times, and the makers of what
they cost or need, down the chain), in order, queue it the ways a person can
(play, and Shift+play) on a copy of the state and `step` once. If any probe
advances the clock, the policy froze, and the report names that row. If none
does, the book froze. A stack nothing unfinished uses passes time without getting
anywhere, so it does not count (found building it: `frozenBook` could still mine
stone nobody needed, and read `policy`).

- `PlayRun` gains `frozen?: { cause: 'policy'; row: ActionId } | { cause: 'book' }`,
  present exactly when `outcome === 'frozen'`.
- The `frozen` flag carries the same `cause` (and `row` for a policy freeze).
- `PLAY_VERSION` 2 → 3: a check changed.

Existing `frozenBook` fixtures (a monument costs gold, which nothing makes) must
read `book`. A policy that queues nothing must read `policy`, naming the first row.

## 2. #77: an empty queue does what JIT can

The user's words (issue #77): *"if the queue is empty, and there are items that
can be done in JIT, they should be done. food refilled, actions taken."*

**Rule.** In `resolve()`, when the queue is empty, before the priority idle fill:
the first JIT row of the port that can start (`startBlock` null) is queued by
automation, a food first, then the port's row order. A food fills to its cap
(`left` = the fill count); a producer runs to its cap (its stack fills, then it
pops `full`); a one-time runs once. The loop ends by itself: a full stack or a
done one-time cannot start. `tried` keeps one resolve from queuing a row twice.
The event is `automated` with `why: 'idle'`.

Priority rows keep an idle queue fed after the JIT rows are done, as today. While
other work is queued, JIT behaves as before.

**Food and actions take turns** (with nothing else ready, food goes again at
once: an empty pass left a committed state the next resolve changed, the code
panel found) (panel, then the lead: *"food refilled, actions
taken"* asks for both). Late in a life, food is eaten faster than it is made
(decay 0.44 hp/tick at minute 17 against a food ceiling of 0.08–0.2), so a food
never reaches its cap. With food always first, an empty queue would refill food
forever and nothing else would run. So after a food's idle fill finishes, the
next empty queue goes to the other JIT rows and then the priority fill; only
when neither can start does food go again at once. An idle order also leaves when its row's mode goes off
JIT.

A JIT one-time that hurts (the wardens) now starts by itself on an empty queue.
§3's rule covers it once it is on top.

### 2.1 Amended by #79 (2026-09-24, folded into this branch)

The user, from play: *"JIT only should harvest food items to keep them stocked,
for non-food items, it should wait until there is demand."* The empty-queue JIT
fill now runs **JIT food only**. A JIT producer or one-time (Salvage, the
dealers, the wardens) runs only as a supply for an order that is short of its
item. So Rig the hull on a priority, with Salvage on JIT, queues the hull and
then Salvage for it, which the user confirmed is the intended flow. The turns
are between food and the priority fill. Readings after: attentive 32.3 h,
hands-on 30.3 h, prioritized 30.1 h, no flags.

## 3. #74: a fight stops before it kills

The user's rule (2026-09-24, after the panel showed that in this book age, not
the fight, does most of the killing; they chose to build it anyway):

> if the player is about to die from fighting, then see if there is 1) an
> automated action that can be done to buy time and delay the fight, if so, run
> that once. 2) if there is nothing automated, but there are actions that _can_
> be ran, stop fighting, explain that you are about to die 3) allow the player to
> force fighting, this stops the 'spiral' of having to keep getting just enough
> food to stay alive only to be hurt again, which is more of a problem before
> automation.

### 3.1 "About to die"

A top row with `hurts` **would kill** when fighting on for its window ends the
life, played out tick by tick in the tick's own order: decay, the fight's hurt,
then eating what is in the pack (`wouldKill` in `src/engine/fight.ts`).

```text
window = min(ticks the fight still needs to finish,
             ticks the port's first food row needs for one unit, at its own
             verb's rate and gear, from its kept progress, + 1)
         (the second term is 1 when the port has no food row); at least 1
```

- The **simulation** replaced a closed formula after the panel's second round.
  The formula ignored the pack, so it backed off from fights the food would have
  carried (15 of 52 in one player's run). The first simulated tick is exactly the
  next real one, so a fight that does not back off always survives its next tick.
- The **min** keeps a fight that would win first from backing off.
- The window's second term is the lead's choice of mechanism, not a tuning
  number: roughly one food's worth of warning, in time rather than health. If
  the user wants a different warning, that is a number and goes to `balance.ts`.

### 3.2 What happens: the user's three cases, in resolve

When the top is a hurting row that is **not forced** and would kill:

1. **Delay.** An automated **harvest** (repeatable, makes an item, mode not
   off, does not hurt) that can start **without any hurting row on its supply
   chain** is queued by automation **once**, in front of the fight (`automated`,
   `why: 'delay'`). Foods first, then the best rank, then row order. The fight
   stays behind it with its progress. One-times never delay (the user:
   *"harvesting the non-off resources"*), so a delay never casts off.
2. **Stop.** Otherwise, if any row of the port that does not hurt can start
   without a hurting row on its chain, the fight **pops** with reason `'hurt'`.
   Its progress stays on the row. The clock may stop (decision #41) until the
   player acts.
3. **Carry on.** Otherwise nothing else can run, so the fight goes on.

**(Superseded by "Automated fights" below.)** **Automation never starts a fight that would kill,** nor a row whose supply
runs through one (`killers` in fight.ts, read by the JIT and priority idle
fills). Without this, the state changed on every wake while no time passed:
automation re-queued the fight and it popped again (panel round two, cases C and
D, now tests).

A player's plain play on a fight that would **stop** (case 2) is refused with the
row's words (*"too hurt to fight: one more push would end this life · Shift+play
fights to the end"*). `+` appends and shows the same words. Under case 1 play is
accepted, since automation buys the time (code panel: refusing there pointed the
player at Shift and death).

**Code panel rounds two and three, as built.**
- A harvest delays a fight only if the player lives through it (`survives`).
- (Superseded below by the automated-fight rule: the `via` refusal and the
  set-chip *"waits"* on a fight are gone.)
- A delay is tied to its fight (`for`) and leaves with it.

**By design, not a defect.** Once the fight has backed off, automation may
fill the empty queue with a harvest the player dies doing, of age. The rule
guards against death *from fighting*, and the user on #72: *"a player can have
automation do whatever, even bad decisions"*.

**Known and accepted.** A delay whose chip is turned off mid-delay still runs
its one unit, because it leaves with its fight, not with its chip.

**Automated fights (the user, 2026-09-24, after playing).** *"Once a fight is
automated, it should try to keep the player alive, but it should kill the
player if there is no other action to run"*, and it is taken *"only if ... there
is nothing of higher priority"*. So a fight whose chip is on:
- is queued by the idle fill in its rank like any priority row, even when it
  would kill;
- still waits behind an automated harvest that buys time (case 1), and also
  behind any automated row ranked **above** it that can run and that the player
  survives, one-times included, the port's event aside (review of 41e7ca5: once
  on top, rank was never looked at again). A delay must be able to start with
  nothing to supply: a supply it pulled in would run past what the survival
  check counted (review of ed3bf88). Same rank is not above;
- never stops (case 2): with no harvest to run, it fights on, death included.

Case 2, the stop and its log line, is for a fight with its chip off, queued by
hand. Only automated rows supply, and an automated fight never stops, so no
row waits on a fight down its supply chain. The round-three `via` refusal is
gone with that. JIT food still avoids a supply chain through a fight that
would kill.

### 3.3 Shift forces

A hurting one-time queued with Shift (play or +) is **forced**: the entry carries
`forced: true`, and §3.2 never applies to it. It is fought to the end, death
included, and the death card keeps "fell during …". One-time rows are always a
single run, so Shift did nothing on them before; on a hurting row it now means
force. Automation never forces on its own, but a forced order's supply orders are
forced too (round three: Shift on the compass has to carry through the wardens
it needs).

The field is optional and additive. An old save loads unchanged, and the loader's
entry check accepts `forced === undefined || forced === true`. `SAVE_FORMAT` does
not change.

### 3.4 The log: "explain that you are about to die"

A `popped` with reason `hurt` is logged as *"Backed off from {row}: one more push
would end this life. Shift+play fights to the end."* It is logged once per row per
life, found by scanning the log back to the current life's first line (a line
that has scrolled out of the 100-line log may repeat). A delay is not logged:
automation's orders are not news.

### 3.5 Invariant

A non-forced hurting top ends a life only when nothing else of the port could
start (case 3). `src/engine/property.test.ts` checks this after every tick.

## 4. The measuring players

- `byHand` queues past automation's own orders (the #77 reading): a person can,
  and waiting them out read about 12 h long.
- When the port's first unfinished one-time is a fight that would back off,
  **whatever its chip** (a chipped fight never stops, so in practice a chip-off fight), the players follow the user's point 3:
  1. queue the food row, or its maker when the food is short of an input;
  2. otherwise queue the fight forced;
  3. if the forced press is refused (a need not in hand), fall through to the
     rest of the port.

## 5. The re-tune

None was needed. The final readings, after #79, are in §2.1 (attentive 32.3 h,
hands-on 30.3 h, prioritized 30.1 h, no flags). Before #79, read with the bot fix
in §4 (plan, "Readings"):

```text
policy        #77      #77 + #74
attentive     33.13 h  33.14 h
hands-on      30.33 h  30.34 h
prioritized   37.38 h  37.38 h   (reported only)
```

There are no flags and `balance.ts` is unchanged.

## 6. Out of scope

- Conditions on the next step (#78), pages, hubs (#65).
- Log wording beyond §3.4, #75's deltas.
