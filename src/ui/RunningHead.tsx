import type { ChapterHead } from '../data/types';

/**
 * Spec 2026-09-25-the-watched-screen 4.1: the running head, a printed book's,
 * shared by the top strip and the chapter sheet. The page's name follows the
 * chapter (spec 2026-09-24-pages section 7) as its own span, so a page turn
 * can fade only that word (`.head__page`, spec 4.1's one-word turn); a page
 * with no name adds nothing. `head__line` stays as a second class for the
 * tests that read it.
 */
export function HeadLine({ book, head, page = '' }: { book: string; head: ChapterHead; page?: string }) {
  return (
    <header className="region__head region__head--book head__line">
      <span>{book}</span>
      <span>{head.numeral} {'\u00B7'} {head.chapter}{page !== '' && <> {'\u00B7'} <span key={page} className="head__page">{page}</span></>}</span>
    </header>
  );
}

/**
 * Spec 8.6: the running head plus the chapter's one-line story under it. It
 * is the chapter region's heading (spec 2026-09-24-screen-pass 2.4); the
 * story line is not in the top strip (spec 2026-09-25 4.1), only here.
 */
export function RunningHead(props: { book: string; head: ChapterHead; page?: string }) {
  return (
    <>
      <HeadLine {...props} />
      <p className="head__story">{props.head.story}</p>
    </>
  );
}
