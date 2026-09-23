# Continuum

[![CI](https://github.com/MattAltermatt/continuum/actions/workflows/ci.yml/badge.svg)](https://github.com/MattAltermatt/continuum/actions/workflows/ci.yml)

An idle survival game about queuing work against a clock you cannot beat.

You never click to chop wood. You queue it — and then decide what deserves the
next stretch of a short, accelerating life. Health decays faster every minute
you survive, so every run ends the same way. What carries forward is the skill
you built, the automation you earned, and the handful of seconds you bought by
building the right thing early.

Death is the loop, not the failure.

> 🚧 **Early.** The engine design is settled and written down, and so is the
> game's shape: books and chapters, twelve verbs, and the one screen, decided
> in [`docs/specs/2026-09-22-books-chapters-verbs.md`](./docs/specs/2026-09-22-books-chapters-verbs.md)
> with committed mockups in [`docs/mockups/`](./docs/mockups/). Nothing is
> built yet; the first slice's plan is in [`docs/plans/`](./docs/plans/).

## Run it

```sh
npm install
npm run dev
```

Then open the URL Vite prints (usually <http://localhost:5173>).

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
- **[`docs/mockups/`](./docs/mockups/)** — dated, committed mockups. A design
  that only ever existed in a scratch directory cannot be pointed back at.

## Built with

TypeScript · React · Vite · Vitest

## License

MIT — see [`LICENSE`](./LICENSE).
