/**
 * The proving ground (#82, spec 2026-09-24-proving-ground section 2.2): no
 * story, one page per mechanic, every row's noun its expected result and
 * every one-time's beat what should have just happened. Dev builds only, on
 * ?book=proving; never in BOOKS, never shipped, imported by nothing that is.
 *
 * Its numbers are literals, as src/engine/fixture.ts's are: a fixture's,
 * chosen so each mechanic shows inside a minute at speed 1, never tuned and
 * never the user's. The tuning hook notices few of them (one-digit integers
 * and the wasp's exponent pass its regex, as fixture.ts's do); the exemption
 * is this header, not the hook.
 *
 * The boar's bands, computed from balance (health.base 100, baseTickExp 0.1,
 * foodCooldownTicks 50, ten ticks a second) and fight.ts with berries' chip
 * off and the pack empty: 5 hp/s over 60 ticks costs 30 hp; the window is
 * berries' 31 ticks, in which it takes 15.5 hp; so from full health it wins,
 * between about 16 and 30 it starts and backs off mid-fight (case 2, progress
 * kept), and under about 16 it backs off before starting. Berries in the pack
 * lower the win band (wouldKill eats inside the window: 25 hp wins with three
 * berries) and leave the refuse band near 16. A chip on berries with room in
 * the pack makes the guard wait behind a berry first (case 1), again and
 * again, until the pack is full and the fight is refused, or the bites carry
 * it to a win with under 1 hp left; at a full pack there is no delay and the
 * fight is refused outright. The same holds for the wasp: its rate is one no
 * max health or larder covers, so it is refused whenever nothing delays it,
 * and delayed behind a berry when a chipped berries row has room. The nap is
 * on this page so something calm can always run: without it a full or
 * chipped berries row leaves nothing calm and a fight is fought to the death.
 * That is case 3, and the last stand page shows it: no food row, so the
 * window is one tick and nothing is calm; from full health it wins, under
 * about 31 it is fought to the death.
 */
import type { Book } from './types';

export const provingGround: Book = {
  id: 'proving-ground',
  name: 'The Proving Ground',
  version: 1,
  finish: 'finish',
  length: { hours: 1 },
  automation: { unlockRepeatable: 3, unlockOneTime: 2 },
  roster: [
    { id: 'gather', name: 'Gather', icon: 'sprout' },
    { id: 'make', name: 'Make', icon: 'wrench' },
    { id: 'fight', name: 'Fight', icon: 'sword' },
    { id: 'rest', name: 'Rest', icon: 'house' },
    { id: 'go', name: 'Go', icon: 'route' },
  ],
  chapters: [
    {
      head: { numeral: 'I', chapter: 'Orders', story: 'No story. Each row says what should happen when it runs.' },
      pages: [
        { name: 'The chain', order: ['berries', 'sticks', 'shelter'], closes: 'shelter' },
        { name: 'Pages', order: ['berries', 'sticks', 'fence', 'gate'], closes: 'gate' },
        { name: 'Chips', order: ['berries', 'sticks', 'kindling', 'hearth'], closes: 'hearth' },
        { name: 'The fight', order: ['berries', 'nap', 'wasp', 'boar'], closes: 'boar' },
        { name: 'Heals', order: ['berries', 'nap', 'camp'], closes: 'camp' },
        { name: 'Capacity', order: ['sticks', 'pouch'], closes: 'pouch' },
        { name: 'Last stand', order: ['stand'], closes: 'stand' },
        { name: 'Casting off', order: ['berries', 'sticks', 'ferry'], closes: 'ferry' },
      ],
    },
    {
      head: { numeral: 'II', chapter: 'The end', story: 'A fresh page after casting off. One row, the finish; the pack keeps its food.' },
      pages: [{ name: 'The finish', order: ['finish'], closes: 'finish' }],
    },
  ],
  items: {
    berries: { id: 'berries', name: 'berries', one: 'berry', kind: 'food', healPerUnit: 4 },
    sticks: { id: 'sticks', name: 'sticks', one: 'stick', kind: 'material' },
    kindling: { id: 'kindling', name: 'kindling', kind: 'material' },
  },
  actions: {
    berries: { id: 'berries', verb: 'gather', noun: 'berries: food, eaten as decay bites; chip after 3 runs (the book\'s count, likely earned by page 3), cycling off, JIT, then the priorities; on any chip it refills at zero', expCost: 3, producedItem: 'berries', producedAmount: 1, itemCosts: [], isOneTime: false },
    sticks: { id: 'sticks', verb: 'gather', noun: 'sticks: one at a time, up to the stack cap (5 until the pouch); chip after 3 runs', expCost: 2, producedItem: 'sticks', producedAmount: 1, itemCosts: [], isOneTime: false },
    shelter: { id: 'shelter', verb: 'make', noun: 'a shelter: needs 4 sticks; press play with none and the chain pulls sticks first; closes the page', expCost: 6, itemCosts: [{ item: 'sticks', amount: 4 }], isOneTime: true, beat: 'The chain pulled the sticks, then built this. The page turns.' },
    fence: { id: 'fence', verb: 'make', noun: 'a fence: costs 2 sticks; the gate below waits for it', expCost: 4, itemCosts: [{ item: 'sticks', amount: 2 }], isOneTime: true, beat: 'The fence stands. The gate can go.' },
    gate: { id: 'gate', verb: 'go', noun: 'the gate: closes the page; at rest it says it comes after the fence; pressed first it pulls the fence', expCost: 4, itemCosts: [], isOneTime: true, beat: 'Through the gate. The page turns.' },
    kindling: { id: 'kindling', verb: 'gather', noun: 'kindling: chip after 1 run, this row\'s own count over the book\'s 3', expCost: 2, producedItem: 'kindling', producedAmount: 1, itemCosts: [], isOneTime: false, unlockAt: 1 },
    hearth: { id: 'hearth', verb: 'make', noun: 'a hearth: costs 2 kindling; closes the page', expCost: 4, itemCosts: [{ item: 'kindling', amount: 2 }], isOneTime: true, beat: 'The hearth is lit. The page turns.' },
    wasp: { id: 'wasp', verb: 'fight', noun: 'wasps: a million hp a second for a tenth of a second. With berries chip off, or the pack full, play refuses at any health and says why (it would kill inside its window); with a chip and room in the pack it waits behind berries first, then is refused once the pack is full. Shift forces it and it kills', expCost: 0.1, itemCosts: [], isOneTime: false, healthRate: -1e6 },
    boar: { id: 'boar', verb: 'fight', noun: 'a boar: takes 5 hp/s for 6 s (30 hp). From full health it wins. With berries chip off and none in the pack, set health with the overlay: at 25 it starts and backs off mid-fight, saying why; at 10 it backs off before starting. Berries in the pack lower the win band (25 wins with three; the guard counts eating) and leave the refusal near 16. With a chip on berries and room in the pack it waits behind a berry, again and again, until the pack is full and it backs off, or the bites carry it to a win with under 1 hp left. Shift forces it to the end', expCost: 6, itemCosts: [], isOneTime: true, healthRate: -5, beat: 'The boar is down. The page turns.' },
    nap: { id: 'nap', verb: 'rest', noun: 'a nap: gives 2 hp/s while it runs, never past max; the rates line shows it green', expCost: 5, itemCosts: [], isOneTime: false, healthRate: 2 },
    camp: { id: 'camp', verb: 'go', noun: 'break camp: closes the page', expCost: 4, itemCosts: [], isOneTime: true, beat: 'Camp broken. The page turns.' },
    pouch: { id: 'pouch', verb: 'make', noun: 'a pouch: costs 2 sticks; the stack cap rises by 5, seen two pages on (sticks stop at 10, not 5); closes the page', expCost: 4, itemCosts: [{ item: 'sticks', amount: 2 }], isOneTime: true, capacityBonus: 5, beat: 'The pouch holds more. The page turns.' },
    stand: { id: 'stand', verb: 'fight', noun: 'the last stand: no food here, so nothing is calm and the guard has nothing to wait for; it starts from any health and is fought to the end: from full it wins, under about 31 it kills; closes the page', expCost: 6, itemCosts: [], isOneTime: true, healthRate: -5, beat: 'The stand held. The page turns.' },
    ferry: { id: 'ferry', verb: 'go', noun: 'the ferry: casts off to chapter II; the head and the pages change', expCost: 3, itemCosts: [], isOneTime: true, beat: 'Cast off.' },
    finish: { id: 'finish', verb: 'go', noun: 'the end: finishes the book; the finish card comes up', expCost: 3, itemCosts: [], isOneTime: true, beat: 'The end.' },
  },
};
