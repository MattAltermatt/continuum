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
  it('has three ports whose events are the pirates, the compass and Varro', () => {
    expect(windwardRun.chapters.map((c) => c.event)).toEqual(['pirates', 'compass', 'varro']);
  });
  it('finishes at Varro, on the cliffhanger', () => {
    expect(windwardRun.finish).toBe('varro');
    expect(windwardRun.actions.varro!.beat!.endsWith('The lights go out.')).toBe(true);
  });
  it('every port has a decay reducer and a stack-cap row, and the cap reaches 20', () => {
    let bonus = 0;
    for (const c of windwardRun.chapters) {
      const rows = c.order.map((id) => windwardRun.actions[id]!);
      expect(rows.some((a) => a.healthDecayMultiplier !== undefined)).toBe(true);
      expect(rows.some((a) => a.capacityBonus !== undefined)).toBe(true);
      bonus += rows.reduce((sum, a) => sum + (a.capacityBonus ?? 0), 0);
    }
    expect(bonus).toBe(15);
    expect(balance.inventory.stackCap + bonus).toBe(20);
  });
  it('the Fortune has no fishing', () => {
    expect(windwardRun.chapters[2]!.order.some((id) => windwardRun.actions[id]!.verb === 'fish')).toBe(false);
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
