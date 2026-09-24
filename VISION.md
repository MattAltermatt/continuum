# Continuum — Vision

## The pitch

An idle adventure about **queuing work against a clock you cannot beat.**

The world is in the sky; it just is. Towns float on warm air, ruins drift,
and a casino the size of a city hangs over the clouds. We are adventurers
with our own ship, hopping from port to port, and we are the heroes.

You do not click to haul scrap. You decide what deserves the next stretch of a
short, accelerating life, and then you watch whether you chose well. Health
decays faster every minute you stay alive, so every run ends the same way. What
carries forward is what you learned to do faster, and what you taught the game
to do without you: automation, earned row by row.

Death is the loop, not the failure.

## The shape of a run

```text
plan (paused)  →  queue work  →  the clock accelerates  →  you die
      ↑                                                       │
      └───────── keep skill, keep automation, keep ────────────┘
                 the max-health you earned by lasting
```

A run is tuned for about twenty minutes. The interesting decision is never
*what to click*; it is **what to spend a shortening life on**, and when to stop
gathering and start building the thing that slows the clock down.

A book is a voyage: a few ports of call, each ending in a big event that casts
the ship off to the next. Provisions ride along; cargo stays at the dock. The
last port's big event is the book's end.

## What the game is made of

| Layer | What it does |
|---|---|
| **The queue** | A list of orders. Only the top runs; one that cannot run is popped, and its progress stays on the row. The only way work happens. |
| **Incremental costs** | Materials are spent *into* work as it progresses, not paid on delivery. A half-built thing has really eaten half its cost. |
| **Dual mastery** | Every skill keeps two ledgers from the same effort — one that survives death, one that does not. |
| **The decay clock** | Health loss grows exponentially with run length. The only counter is having built something earlier that slows it. |
| **Automation** | Earned per row by repetition across lives. JIT producers step in for exactly the shortfall they see; the priorities (top, high, mid, low, last) keep an empty queue fed. |

The full specification lives in [`MECHANICS.md`](./MECHANICS.md).

## Principles

These are the things worth being stubborn about.

🎛️ **The buttons are the game.** This is a game you experience almost entirely
through a small number of controls, pressed thousands of times. How a queue row
responds, whether a progress bar reads at a glance, what a stall *looks* like —
these are not polish applied at the end. They are the first thing built and the
thing most often revisited.

🔍 **Transparency over mystery.** Every timer, every rate, every threshold is
surfaced. An idle game asks the player to reason about numbers they cannot see
changing; hiding them does not create depth, it creates guessing.

✂️ **Few abilities, each of them deliberate.** A long list of actions that
differ only in which noun they produce is not content. Every ability earns its
place by changing a decision, and the roster stays small enough that it can.

⏳ **The clock is honest.** The player can always tell how long they have and
what would buy more. Losing a run should feel like a miscalculation, never like
an ambush.

🧊 **Nothing is wasted.** Food is never eaten into overheal. Materials spent
into an abandoned build are really spent. Progress stalls rather than
evaporating, and resumes exactly where it stopped.

## Scope

Milestones and their contents live in
[GitHub Issues](https://github.com/MattAltermatt/continuum/issues) — this is a
description of the arc, not a checklist.

- **First** — one action, one button, one tick loop, and the interaction feel
  settled. Small enough to change our minds about cheaply.
- **Then** — a complete run: the decay clock, food, death and what carries
  forward. The loop closes.
- **Then** — the ability roster, chosen carefully, and the skill payoffs that
  make levelling worth something beyond itself.
- **After that** — persistence, a longer arc, and the content structure that
  hangs off it. All genuinely open.

## Non-goals

- ❌ **Not a clicker.** No action is performed by repeated clicking. If a
  mechanic rewards click rate, it is the wrong mechanic.
- ❌ **Not a numbers-go-up screensaver.** A run is short and it is *decided*.
  Idle means "you are not clicking," not "you are not thinking."
- ❌ **No hidden mechanics.** Nothing meaningful is undocumented in-game.
- ❌ **No content padding.** Ten near-identical gathering actions will not be
  added to make a chapter feel bigger.
- ❌ **Not a mobile / touch target.** Desktop browser, keyboard available.

## Tech

| Layer | Choice |
|---|---|
| Language | TypeScript, strict |
| UI | React |
| Build | Vite |
| Tests | Vitest |
| Verification | Chrome |

Chosen because the game is a dense, text-and-control interface that changes ten
times a second — a DOM problem, not a canvas one — and because the simulation is
plain TypeScript that can be tested without booting a renderer.
