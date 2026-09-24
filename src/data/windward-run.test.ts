import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import type { Book } from './types';
import { validateBook } from './validate';
import { windwardRun } from './windward-run';

describe('The Windward Run', () => {
  it('declares its seven skills with their icons, in order', () => {
    expect(windwardRun.roster.map((s) => [s.id, s.icon])).toEqual([
      ['fish', 'fishing-rod'], ['salvage', 'recycle'], ['tinker', 'wrench'], ['rig', 'sailboat'],
      ['fight', 'sword'], ['search', 'eye'], ['talk', 'message-circle'],
    ]);
  });
  it('has three ports whose events are casting off, the compass and Varro', () => {
    expect(windwardRun.chapters.map((c) => c.pages[c.pages.length - 1]!.closes)).toEqual(['openSky', 'compass', 'varro']);
  });
  it('is paged as the user approved it (spec 2026-09-24-pages section 5)', () => {
    expect(windwardRun.chapters.map((c) => c.pages.map((p) => [p.name, p.closes]))).toEqual([
      [['Fitting out', 'sails'], ['Pirates!', 'pirates'], ['Casting off', 'openSky']],
      [['Landfall', 'wardens'], ['The inner halls', 'compass']],
      [['At the tables', 'door'], ['Upper decks', 'salons'], ["Varro's table", 'varro']],
    ]);
    // Food carried on every page; Salvage leaves the Hollow Isle after Landfall; the dealers stay, since the kitchens spend chips.
    const food = ['fish', 'eels', 'kitchens'];
    for (const [k, c] of windwardRun.chapters.entries()) for (const p of c.pages) expect(p.order, `${k} ${p.name}`).toContain(food[k]);
    expect(windwardRun.chapters[1]!.pages[1]!.order).not.toContain('ruin');
    for (const p of windwardRun.chapters[2]!.pages) expect(p.order).toContain('dealers');
  });
  it('finishes at Varro, on the cliffhanger', () => {
    expect(windwardRun.finish).toBe('varro');
    expect(windwardRun.actions.varro!.beat!.endsWith('The lights go out.')).toBe(true);
  });
  it('every port has a decay reducer and a stack-cap row, and the cap reaches 20', () => {
    let bonus = 0;
    for (const c of windwardRun.chapters) {
      const rows = c.pages.flatMap((p) => p.order).map((id) => windwardRun.actions[id]!);
      expect(rows.some((a) => a.healthDecayMultiplier !== undefined)).toBe(true);
      expect(rows.some((a) => a.capacityBonus !== undefined)).toBe(true);
      bonus += rows.reduce((sum, a) => sum + (a.capacityBonus ?? 0), 0);
    }
    expect(bonus).toBe(15);
    expect(balance.inventory.stackCap + bonus).toBe(20);
  });
  it('the Fortune has no fishing', () => {
    expect(windwardRun.chapters[2]!.pages.flatMap((p) => p.order).some((id) => windwardRun.actions[id]!.verb === 'fish')).toBe(false);
  });
  it('reads its numbers from balance.content.windward', () => {
    expect(windwardRun.actions.hull!.itemCosts).toEqual([{ item: 'scrap', amount: balance.content.windward.hull.scrap }]);
  });
  it('validates, and round-trips through JSON', () => {
    expect(validateBook(windwardRun)).toEqual([]);
    const copy = JSON.parse(JSON.stringify(windwardRun)) as Book;
    expect(copy).toEqual(windwardRun);
  });
});
