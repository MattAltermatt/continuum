/**
 * What a book is, read off its rows and never typed by its author (#54):
 * the shelf's badges, when there is a shelf.
 */
import type { Content } from './types';

/** Any row takes health while it runs. */
export function bookHurts(content: Pick<Content, 'actions'>): boolean {
  return Object.values(content.actions).some((a) => (a.healthRate ?? 0) < 0);
}
