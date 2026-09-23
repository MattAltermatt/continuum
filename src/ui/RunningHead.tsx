import type { ChapterHead } from '../data/types';

/** Spec 8.6: a running head like a printed book, and the chapter's one-line story. */
export function RunningHead({ head }: { head: ChapterHead }) {
  return (
    <header className="head">
      <div className="head__line"><span>{head.book}</span><span>{head.numeral} · {head.chapter}</span></div>
      <p className="head__story">{head.story}</p>
    </header>
  );
}
