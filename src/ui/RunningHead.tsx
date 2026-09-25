import type { ChapterHead } from '../data/types';

/**
 * Spec 8.6: a running head like a printed book, and the chapter's one-line
 * story. The page's name follows the chapter (spec 2026-09-24-pages section 7);
 * a page with no name adds nothing. It is the chapter region's heading (spec
 * 2026-09-24-screen-pass 2.4): the line in the region's heading style, the
 * story under it. `head__line` stays as a second class for the tests that
 * read it.
 */
export function RunningHead({ book, head, page = '' }: { book: string; head: ChapterHead; page?: string }) {
  return (
    <>
      <header className="region__head region__head--book head__line"><span>{book}</span><span>{`${head.numeral} \u00B7 ${head.chapter}${page === '' ? '' : ` \u00B7 ${page}`}`}</span></header>
      <p className="head__story">{head.story}</p>
    </>
  );
}
