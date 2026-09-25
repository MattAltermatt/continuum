# Specs

Dated design reasoning: `YYYY-MM-DD-<topic>.md`.

This is where the *argument* for a design lives — what was considered, what was
rejected, and why. What is queued lives in
[GitHub Issues](https://github.com/MattAltermatt/continuum/issues) instead; see
`decision #2`.

| Date | Topic |
|---|---|
| 2026-09-22 | [Books, chapters, verbs, and the one screen](2026-09-22-books-chapters-verbs.md) — the game's shape, the wall rule, the twelve verbs and why, and every chunk of the one screen with its mockup |
| 2026-09-23 | [v0.2: a run you can lose](2026-09-23-v0-2-a-run-you-can-lose.md) — the display rule (now, never a prediction), death and rebirth, the death card, the bonus reshaped to 1.1^min − 1, rates and food chunks |
| 2026-09-23 | [Books own their skills](2026-09-23-books-own-their-skills.md) — the pivot: each book declares its own skills and keeps their two ledgers, nothing crosses books but badges, the shop and the bookmark; the shelf loop, the generator's brief, and the shared-ledger and category shapes the panel measured and the user dropped |
| 2026-09-24 | [The screen pass, smooth bars, and the debug overlay](2026-09-24-screen-pass.md) — health alone on top and sticky, a sticky bottom bar, every region a box with its heading inside at one width (mockup 2026-09-24-regions, pick A), ember food timing and food in the pack, bars that glide between ticks and snap on a reset, and the backtick debug overlay: time, health, chips, skills and items |
| 2026-09-24 | [The proving ground, and the housekeeping six](2026-09-24-proving-ground-and-housekeeping.md) — a row's health field signed (heals go up, clamped at max), books that set their own unlock counts and a dev-only proving-ground book opened by `?book=proving`, one tab plays (Web Locks, a card with Play here), touches per life in the play report, the version in package.json bumped per merge with a CI check, and #35 closed on a measurement: no formatter |
