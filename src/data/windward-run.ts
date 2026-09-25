/**
 * Book one: The Windward Run (spec 2026-09-23-the-windward-run section 5). A
 * sky world, and we are the heroes. Three ports of call, each with a food, a
 * harvest, a decay reducer, a stack-cap row and a big event that casts off.
 * Every tuning number comes from balance.content.windward; a yield of one and
 * a need of one key are counts, not tuning. Names and text are a first draft
 * for the user to rewrite after playing.
 */
import { balance } from '../balance';
import type { Book } from './types';

const n = balance.content.windward;

export const windwardRun: Book = {
  id: 'windward-run',
  name: 'The Windward Run',
  version: 2,
  finish: 'varro',
  /** The author's claim, not tuning (headless-play spec section 3); Task 5 measures it. */
  length: { hours: 30 },
  roster: [
    { id: 'fish', name: 'Fish', icon: 'fishing-rod' },
    { id: 'salvage', name: 'Salvage', icon: 'recycle' },
    { id: 'tinker', name: 'Tinker', icon: 'wrench' },
    { id: 'rig', name: 'Rig', icon: 'sailboat' },
    { id: 'fight', name: 'Fight', icon: 'sword' },
    { id: 'search', name: 'Search', icon: 'eye' },
    { id: 'talk', name: 'Talk', icon: 'message-circle' },
  ],
  chapters: [
    {
      head: { numeral: 'I', chapter: 'Port Cinder', story: 'A market town adrift on warm air. Word is, something old sleeps on a drifting ruin.' },
      pages: [
        { name: 'Fitting out', order: ['fish', 'salvage', 'hull', 'net', 'satchel', 'sails'], closes: 'sails' },
        { name: 'Pirates!', order: ['fish', 'pirates'], closes: 'pirates' },
        { name: 'Casting off', order: ['fish', 'openSky'], closes: 'openSky' },
      ],
    },
    {
      head: { numeral: 'II', chapter: 'The Hollow Isle', story: 'A ruin the wind forgot. Whatever it guards, it guards still.' },
      pages: [
        { name: 'Landfall', order: ['eels', 'ruin', 'fittings', 'chest', 'cutlass', 'wardens'], closes: 'wardens' },
        { name: 'The inner halls', order: ['eels', 'halls', 'compass'], closes: 'compass' },
      ],
    },
    {
      head: { numeral: 'III', chapter: 'The Gilded Fortune', story: 'A casino the size of a city, and one old man somewhere inside it.' },
      pages: [
        { name: 'At the tables', order: ['dealers', 'kitchens', 'dock', 'trunk', 'door'], closes: 'door' },
        { name: 'Upper decks', order: ['dealers', 'kitchens', 'enforcers', 'salons'], closes: 'salons' },
        { name: "Varro's table", order: ['dealers', 'kitchens', 'varro'], closes: 'varro' },
      ],
    },
  ],
  items: {
    'cloud-fish': { id: 'cloud-fish', name: 'cloud-fish', kind: 'food', healPerUnit: n.cloudFish.healPerUnit },
    scrap: { id: 'scrap', name: 'scrap', kind: 'material' },
    'sky-eel': { id: 'sky-eel', name: 'sky-eel', kind: 'food', healPerUnit: n.skyEel.healPerUnit },
    brass: { id: 'brass', name: 'brass', kind: 'material' },
    'inner-door': { id: 'inner-door', name: 'the inner door', kind: 'key' },
    'star-chart': { id: 'star-chart', name: 'the star chart', kind: 'key' },
    chips: { id: 'chips', name: 'chips', one: 'chip', kind: 'material' },
    canape: { id: 'canape', name: 'canapés', one: 'canapé', kind: 'food', healPerUnit: n.canape.healPerUnit },
    'deck-pass': { id: 'deck-pass', name: 'a deck pass', kind: 'key' },
    'lift-key': { id: 'lift-key', name: 'the lift key', kind: 'key' },
    'varros-table': { id: 'varros-table', name: "Varro's table", kind: 'key' },
  },
  actions: {
    fish: { id: 'fish', verb: 'fish', noun: 'the cloud shallows', expCost: n.fish.expCost, producedItem: 'cloud-fish', producedAmount: 1, itemCosts: [], isOneTime: false },
    salvage: { id: 'salvage', verb: 'salvage', noun: 'drifting scrap', expCost: n.salvage.expCost, producedItem: 'scrap', producedAmount: 1, itemCosts: [], isOneTime: false },
    hull: {
      id: 'hull', verb: 'rig', noun: 'the hull', expCost: n.hull.expCost, itemCosts: [{ item: 'scrap', amount: n.hull.scrap }], isOneTime: true,
      healthDecayMultiplier: n.hull.decayMultiplier, beat: 'The hull holds. Let the wind try harder.',
    },
    net: {
      id: 'net', verb: 'tinker', noun: 'a trawl net', expCost: n.net.expCost, itemCosts: [{ item: 'scrap', amount: n.net.scrap }], isOneTime: true,
      gear: { skill: 'fish', multiplier: n.net.fishMultiplier }, beat: 'A trawl net, fine as smoke. The shallows give up more.',
    },
    satchel: {
      id: 'satchel', verb: 'tinker', noun: 'a canvas satchel', expCost: n.satchel.expCost, itemCosts: [{ item: 'scrap', amount: n.satchel.scrap }], isOneTime: true,
      capacityBonus: n.satchel.capacity, beat: 'A canvas satchel. Room for more of everything.',
    },
    pirates: {
      id: 'pirates', verb: 'fight', noun: 'the harbor pirates', expCost: n.pirates.expCost, itemCosts: [], isOneTime: true, healthRate: -n.pirates.hurts,
      beat: 'The harbor pirates scatter. The dock is ours again.',
    },
    sails: {
      id: 'sails', verb: 'rig', noun: 'the sails', expCost: n.sails.expCost, itemCosts: [], isOneTime: true,
      beat: 'The sails go up, patched and proud. She is ready to fly.',
    },
    openSky: {
      id: 'openSky', verb: 'rig', noun: 'the ship for the open sky', expCost: n.openSky.expCost, itemCosts: [], isOneTime: true,
      beat: 'We slip the moorings. The town cheers us off the dock, bound for the ruin.',
    },
    eels: { id: 'eels', verb: 'fish', noun: 'the eel runs', expCost: n.eels.expCost, producedItem: 'sky-eel', producedAmount: 1, itemCosts: [], isOneTime: false },
    ruin: { id: 'ruin', verb: 'salvage', noun: 'the ruin', expCost: n.ruin.expCost, producedItem: 'brass', producedAmount: 1, itemCosts: [], isOneTime: false },
    wardens: {
      id: 'wardens', verb: 'fight', noun: 'the wardens', expCost: n.wardens.expCost, producedItem: 'inner-door', producedAmount: 1, itemCosts: [], isOneTime: true,
      healthRate: -n.wardens.hurts, beat: 'The last warden stills. The inner door stands open.',
    },
    halls: {
      id: 'halls', verb: 'search', noun: 'the halls', expCost: n.halls.expCost, producedItem: 'star-chart', producedAmount: 1, itemCosts: [],
      needs: [{ item: 'inner-door', amount: 1 }], isOneTime: true, beat: 'Behind a fallen shelf: a star chart, and a route in old ink.',
    },
    fittings: {
      id: 'fittings', verb: 'rig', noun: 'brass fittings', expCost: n.fittings.expCost, itemCosts: [{ item: 'brass', amount: n.fittings.brass }], isOneTime: true,
      healthDecayMultiplier: n.fittings.decayMultiplier, beat: 'Brass fittings, polished bright. The ship rides easier.',
    },
    chest: {
      id: 'chest', verb: 'tinker', noun: 'a sea chest', expCost: n.chest.expCost, itemCosts: [{ item: 'brass', amount: n.chest.brass }], isOneTime: true,
      capacityBonus: n.chest.capacity, beat: 'A sea chest from the ruin. More room below.',
    },
    cutlass: {
      id: 'cutlass', verb: 'tinker', noun: 'a cutlass', expCost: n.cutlass.expCost, itemCosts: [{ item: 'brass', amount: n.cutlass.brass }], isOneTime: true,
      gear: { skill: 'fight', multiplier: n.cutlass.fightMultiplier }, beat: 'A cutlass that remembers its last owner. Fights go quicker.',
    },
    compass: {
      id: 'compass', verb: 'fight', noun: 'the guardian', expCost: n.compass.expCost, itemCosts: [], needs: [{ item: 'star-chart', amount: 1 }], isOneTime: true,
      healthRate: -n.compass.hurts,
      beat: 'The Sky Compass is ours. A maker’s mark nobody aboard can read, and a rumor: the one man who knows it deals cards on the Gilded Fortune.',
    },
    dealers: { id: 'dealers', verb: 'talk', noun: 'to the dealers', expCost: n.dealers.expCost, producedItem: 'chips', producedAmount: 1, itemCosts: [], isOneTime: false },
    kitchens: {
      id: 'kitchens', verb: 'talk', noun: 'to the kitchens', expCost: n.kitchens.expCost, producedItem: 'canape', producedAmount: 1,
      itemCosts: [{ item: 'chips', amount: n.kitchens.chips }], isOneTime: false,
    },
    door: {
      id: 'door', verb: 'talk', noun: 'past the door', expCost: n.door.expCost, producedItem: 'deck-pass', producedAmount: 1,
      itemCosts: [{ item: 'chips', amount: n.door.chips }], isOneTime: true, beat: 'The doorman smiles at the chips, then at us. We are in.',
    },
    dock: {
      id: 'dock', verb: 'rig', noun: 'the high dock', expCost: n.dock.expCost, itemCosts: [{ item: 'chips', amount: n.dock.chips }], isOneTime: true,
      healthDecayMultiplier: n.dock.decayMultiplier, beat: 'A berth at the high dock. The ship rests, and so do we.',
    },
    trunk: {
      id: 'trunk', verb: 'tinker', noun: 'a gilded trunk', expCost: n.trunk.expCost, itemCosts: [{ item: 'chips', amount: n.trunk.chips }], isOneTime: true,
      capacityBonus: n.trunk.capacity, beat: 'A gilded trunk, won at the tables. Room for the rest.',
    },
    enforcers: {
      id: 'enforcers', verb: 'fight', noun: 'the enforcers', expCost: n.enforcers.expCost, producedItem: 'lift-key', producedAmount: 1, itemCosts: [],
      needs: [{ item: 'deck-pass', amount: 1 }], isOneTime: true, healthRate: -n.enforcers.hurts,
      beat: 'Bruised and grinning, we take the lift key off the last of them.',
    },
    salons: {
      id: 'salons', verb: 'search', noun: 'the salons', expCost: n.salons.expCost, producedItem: 'varros-table', producedAmount: 1, itemCosts: [],
      needs: [{ item: 'lift-key', amount: 1 }], isOneTime: true, beat: 'Past velvet and smoke, in the last salon: Varro’s table.',
    },
    varro: {
      id: 'varro', verb: 'talk', noun: 'to Varro', expCost: n.varro.expCost, itemCosts: [], needs: [{ item: 'varros-table', amount: 1 }], isOneTime: true,
      beat: 'He takes one look at the Compass and goes white. “Where did you get this?” The lights go out.',
    },
  },
};
