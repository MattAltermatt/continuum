import { describe, expect, it } from 'vitest';
import { scrub } from '../data/scrub';
import { narrate } from './narrate';

describe('narrate', () => {
  it('writes a note per event kind, and a story line for a one-time with a beat', () => {
    expect(narrate({ type: 'lifeBegins', life: 1 }, scrub)).toEqual({ kind: 'note', text: 'Life 1 begins' });
    expect(narrate({ type: 'stalled', actionId: 'cabin', item: 'stone' }, scrub)).toEqual({ kind: 'note', text: 'Build a cabin is waiting on stone' });
    expect(narrate({ type: 'resumed', actionId: 'cabin' }, scrub)).toEqual({ kind: 'note', text: 'Build a cabin can go on' });
    expect(narrate({ type: 'full', actionId: 'mine', item: 'stone' }, scrub)).toEqual({ kind: 'note', text: 'Mine stone stops: the pack is full of stone' });
    expect(narrate({ type: 'completed', actionId: 'cabin', oneTime: true }, scrub)).toEqual({ kind: 'story', text: scrub.actions.cabin!.beat });
    expect(narrate({ type: 'completed', actionId: 'forage', oneTime: false }, scrub)).toEqual({ kind: 'note', text: 'Forage berries is done' });
    expect(narrate({ type: 'coreLevel', skill: 'forage', level: 3 }, scrub)).toEqual({ kind: 'note', text: 'Forage reaches Lv 3' });
    expect(narrate({ type: 'died', runTicks: 600 }, scrub)).toEqual({ kind: 'note', text: 'Dead at 01:00' });
  });
});
