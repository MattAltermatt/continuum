# Continuum

[![CI](https://github.com/MattAltermatt/continuum/actions/workflows/ci.yml/badge.svg)](https://github.com/MattAltermatt/continuum/actions/workflows/ci.yml)

An idle survival game about queuing work against a clock you cannot beat.

You never click to chop wood. You queue it — and then decide what deserves the
next stretch of a short, accelerating life. Health decays faster every minute
you survive, so every run ends the same way. What carries forward is the skill
you built, the automation you earned, and the handful of seconds you bought by
building the right thing early.

Death is the loop, not the failure.

**▶ Play it:** https://mattaltermatt.github.io/continuum/ (`main`'s tip once it passes
[CI](./.github/workflows/ci.yml)'s machine gates; your run saves in the browser).

> 🎈 **Playable.** One book, *The Windward Run*: a sky world of floating
> towns and airships, three ports of call (Port Cinder, the Hollow Isle, the
> Gilded Fortune), each told in pages, seven skills, and an end, a cliffhanger,
> after about thirty hours of game time. The queue is a list of orders: only the top runs, one
> that cannot run is popped, and its progress stays on the row. Rows earn
> automation by repetition (JIT for exactly the shortfall, and to keep food
> stocked; top, high, mid, low and last to keep an empty queue fed). Press play
> on something you cannot do yet and the game queues what it needs first, as
> deep as it goes; a page's closing row waits for the rest of the page. Fights
> hurt, and back off before they kill unless Shift forces them. Ports cast off, the pack
> holds five of anything until you find bigger bags, the skill cells open a
> ledger of their multiplier, and the run saves itself. What is next lives in
> [the milestones](https://github.com/MattAltermatt/continuum/milestones). The
> design is [`docs/specs/2026-09-23-the-windward-run.md`](./docs/specs/2026-09-23-the-windward-run.md)
> on top of the earlier specs in [`docs/specs/`](./docs/specs/), with mockups in
> [`docs/mockups/`](./docs/mockups/) and plans in [`docs/plans/`](./docs/plans/).

**The screen is what you watch; the sheets are what you operate.** The
running skill, the food on hand, the queue and the log are the screen; the
skills, the actions and the pack open as sheets from the bottom bar. One
layout serves a phone (one column), the 696-wide window the game is mostly
played in (the width in pairs) and a desktop (three columns, the sheets
docked); the boxes never move, the page never scrolls, and every bar reads the
same way (spec
[`docs/specs/2026-09-25-the-watched-screen.md`](./docs/specs/2026-09-25-the-watched-screen.md)).

**Every death shows what the life kept, and every life so far.** The death
overlay lists health and each skill's core level from and to, and charts the
row you pick across every life you have lived; **see how it ended** hides it
over the frozen kill screen (the row you died in, still lit), and Begin starts
the next life (spec
[`docs/specs/2026-09-25-death-overlay.md`](./docs/specs/2026-09-25-death-overlay.md)).

## Run it

```sh
npm install
npm run dev
```

Then open the URL Vite prints (usually <http://localhost:5173>). The game saves
to the browser's local storage every few seconds and when the tab is hidden;
the gear's **erase save** starts over. One tab plays at a time; a second tab
offers to take over.

**In a dev build, the backtick key** (`` ` ``) opens a movable debug overlay
for play-testing: step time (+10s, +1m, +10m) and set the speed (×1, ×10,
×100), set health or die on the spot, earn every automation chip on the page
at once, and set any skill's levels or any item's count. It is stripped from
the production build, along with the `window.continuum` handle.
**`?book=proving`** opens the proving ground, a dev-only book with no story
whose rows say what should happen: one page per mechanic, for play-testing.

```sh
npm test           # engine + component tests, one shot
npm run test:watch # the same, in watch mode
npm run typecheck  # the ship build, and the engine with no DOM available to it
npm run lint       # oxlint
npm run build      # typecheck + production build into ./dist
```

The engine is compiled a second time with no DOM library present, so a reach for
`document` or `setTimeout` inside the simulation fails to build. That, a purity
test and a set of edit-time hooks are what keep the simulation headless rather
than merely intended to be.

## Documents

- **[`VISION.md`](./VISION.md)** — what the game is, the principles it holds to,
  and what it deliberately is not.
- **[`MECHANICS.md`](./MECHANICS.md)** — the engine specification: the tick, the
  queue, incremental cost consumption, dual-mastery XP, the decay curve, death
  and rebirth, and the automation model. This is the document that settles
  arguments about intent.
- **[`CLAUDE.md`](./CLAUDE.md)** — conventions, layout, testing contract and
  gotchas for anyone (or anything) writing code here.
- **[Issues](https://github.com/MattAltermatt/continuum/issues)** — everything
  queued, every open question, and every decision on record. There is no
  roadmap file; the issues *are* the plan.
- **[`docs/specs/`](./docs/specs/)** — dated design reasoning: what was
  considered and what was rejected, for the decisions big enough to argue about.
- **[`docs/authoring.md`](./docs/authoring.md)** — how to write a book: pages,
  closing rows, what to carry from page to page.
- **[`docs/mockups/`](./docs/mockups/)** — dated, committed mockups. A design
  that only ever existed in a scratch directory cannot be pointed back at.

## Built with

TypeScript · React · Vite · Vitest · Lucide icons

## License

MIT — see [`LICENSE`](./LICENSE).

Third-party notices: [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).
