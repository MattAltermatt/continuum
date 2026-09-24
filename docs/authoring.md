# Writing a book

How a book is put together, for anyone writing one by hand, and for the
`book-author` skill ([#52](https://github.com/MattAltermatt/continuum/issues/52))
when it exists. The format is the `Book` type in `src/data/types.ts`;
`src/data/validate.ts` is the only check on it, and `src/data/books.test.ts`
runs it over every shipped book. The design is in
[`docs/specs/2026-09-24-pages.md`](./specs/2026-09-24-pages.md).

## 📖 Chapters and pages

A book is a line of **chapters** (ports), and a chapter is a line of
**pages**. Only the current page's rows are in play.

- **A page ends on a closing row:** a one-time row, the last one-time row the
  page lists. It waits for every other one-time row on its page; completing it
  turns the page. The last page's closing row ends the chapter, and the last
  chapter's ends the book.
- **A gate is a page boundary.** If something must happen before something
  else (fit the ship out before the pirates come), put them on successive
  pages. Rows never carry conditions.
- **Pages replace one another.** Each page lists its own rows. A repeatable row
  may be listed on several pages of its chapter, and keeps its progress; a
  one-time row is on exactly one page.

## 🧭 Guidelines (not rules)

The validator does not enforce these; they are what makes a book fun.

- **Carry the food.** Early on especially: a page with no food is a page where
  the player dies before they can play it.
- **Keep a harvest while something on the page spends its output.** In The
  Windward Run, salvaging the ruin leaves the Hollow Isle after Landfall,
  because nothing after it spends brass; the dealers stay through the Gilded
  Fortune, because the kitchens spend chips.
- **Automation starts off, and that is guidance too.** Order the rows food
  first, then the page's work, then its closing row at the bottom.

## ✅ What the validator does enforce

- Every item a page's rows **cost** is made on that page, by a row other than
  its closing row. A harvest dropped from a page cannot restock it, and food is
  eaten every tick, so neither counts from an earlier page.
- Every item a page's rows **need** (held, not spent) is made on that page by a
  row other than its closer, or by a one-time on an earlier page of the
  chapter (a harvest's stock may be spent; a one-time's key is held). A key
  survives a page turn; it does not survive casting off.
- A one-time row never depends on what only a one-time listed after it on its
  page makes, no row is listed twice on a page, and no row needs more of an
  item than the base stack holds.
