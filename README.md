# Continuum

[![CI](https://github.com/MattAltermatt/continuum/actions/workflows/ci.yml/badge.svg)](https://github.com/MattAltermatt/continuum/actions/workflows/ci.yml)

An idle survival game about queuing work against a clock you cannot beat.

You never click to chop wood. You queue it — and then decide what deserves the
next stretch of a short, accelerating life. Health decays faster every minute
you survive, so every run ends the same way. What carries forward is the skill
you built, the automation you earned, and the handful of seconds you bought by
building the right thing early.

Death is the loop, not the failure.

> 🚧 **Early.** v0.1 is on screen: three rows that feed each other (forage,
> mine, build) and a stone hall no first life can finish, the twelve skills
> with live XP ledgers, a queue whose stalls wait in place and whose producers
> stop at a full stack, the pack, the health bar and a log. Time passes only
> while work happens. What is next lives in
> [the milestones](https://github.com/MattAltermatt/continuum/milestones). The design is
> [`docs/specs/2026-09-22-books-chapters-verbs.md`](./docs/specs/2026-09-22-books-chapters-verbs.md),
> with mockups in [`docs/mockups/`](./docs/mockups/) and plans in
> [`docs/plans/`](./docs/plans/).

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

TypeScript · React · Vite · Vitest · Lucide icons

## License

MIT — see [`LICENSE`](./LICENSE).

Third-party notices: [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).
