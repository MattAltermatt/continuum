import { describe, expect, it } from 'vitest';
import { pagedTestBook as paged, testBook } from '../test-utils/book';
import { windwardRun } from '../data/windward-run';
import { narrate } from './narrate';

describe('narrate: pages (spec 2026-09-24-pages)', () => {
  it('a page turn reads as the number and the name of the page turned to', () => {
    expect(narrate({ type: 'pageTurn', chapter: 0, page: 1 }, paged)).toEqual({ kind: 'note', text: 'Page 2: The raid' });
  });
  it('a page with no name reads by its number', () => {
    expect(narrate({ type: 'pageTurn', chapter: 0, page: 0 }, testBook)).toEqual({ kind: 'note', text: 'Page 1' });
  });
  it('a closer that left names the rows it waits on by their nouns, as its "after:" line does', () => {
    expect(narrate({ type: 'popped', actionId: 'gate', reason: 'page', waits: ['hull', 'satchel', 'net'] }, paged))
      .toEqual({ kind: 'note', text: 'Fight the gate waits on the hull, a satchel, a net' });
  });
  it('on The Windward Run: Rig the sails waits on the hull, a trawl net, a canvas satchel', () => {
    expect(narrate({ type: 'popped', actionId: 'sails', reason: 'page', waits: ['hull', 'net', 'satchel'] }, windwardRun).text)
      .toBe('Rig the sails waits on the hull, a trawl net, a canvas satchel');
  });
  it('a page turn on The Windward Run names the page: Page 2: Pirates!', () => {
    expect(narrate({ type: 'pageTurn', chapter: 0, page: 1 }, windwardRun).text).toBe('Page 2: Pirates!');
  });
  it('a life\'s first line names page 1 when it has a name, and reads as before when it has none', () => {
    expect(narrate({ type: 'lifeBegins', life: 1 }, paged)).toEqual({ kind: 'note', text: 'Life 1 begins: Fitting out' });
    expect(narrate({ type: 'lifeBegins', life: 2 }, testBook)).toEqual({ kind: 'note', text: 'Life 2 begins' });
  });
});
