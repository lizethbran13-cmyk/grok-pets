/* Grok Pets - game data: species, Lizeth's family pets, items, tricks, mini games */
(function () {
'use strict';
const GP = window.GP = window.GP || {};

GP.RARITY = {
  common: { name: 'Common', col: '#4ade80', w: 45 },
  uncommon: { name: 'Uncommon', col: '#38bdf8', w: 30 },
  rare: { name: 'Rare', col: '#a78bfa', w: 15 },
  epic: { name: 'Epic', col: '#fb923c', w: 8 },
  legendary: { name: 'Legendary', col: '#facc15', w: 2 },
  family: { name: '\u2605 Family', col: '#ff6bd6', w: 0 }
};

/* kind = which 3D builder is used. vars = [name, main colour, second colour] */
GP.SPECIES = {
  schnauzer: { name: 'Schnauzer', kind: 'dog', r: 'common', price: 150, size: 0.92, snd: 'bark', icon: '\uD83D\uDC15', vars: [['Salt & Pepper', '#8b9099', '#e5e7eb'], ['Black', '#34343c', '#a1a7b0'], ['Silver', '#c4c9d1', '#f4f6f8']], opt: { ears: 'fold', tail: 'stub', beard: 1, snout: 0.2 } },
  retriever: { name: 'Golden Puppy', kind: 'dog', r: 'common', price: 150, size: 1, snd: 'bark', icon: '\uD83D\uDC36', vars: [['Golden', '#e0a84a', '#f3d9a4'], ['Cream', '#f0dcb0', '#fff7e6'], ['Red', '#c46a2a', '#e8a56a']], opt: { ears: 'flop', tail: 'fluffy', snout: 0.2 } },
  corgi: { name: 'Corgi', kind: 'dog', r: 'uncommon', price: 240, size: 0.9, snd: 'bark', icon: '\uD83D\uDC15', vars: [['Red', '#e08a3a', '#ffffff'], ['Tricolor', '#3b2a20', '#ffffff'], ['Sable', '#a8642e', '#fff4e0']], opt: { ears: 'point', tail: 'fluffy', short: 1, snout: 0.18 } },
  pug: { name: 'Pug', kind: 'dog', r: 'uncommon', price: 240, size: 0.82, snd: 'bark', icon: '\uD83D\uDC36', vars: [['Fawn', '#d9b98a', '#2b2420'], ['Black', '#2b2b30', '#151518'], ['Apricot', '#e3a86a', '#3a2a20']], opt: { ears: 'fold', tail: 'curl', snout: 0.07, mask: 1 } },
  tabby: { name: 'Tabby Kitten', kind: 'cat', r: 'common', price: 140, size: 0.85, snd: 'meow', icon: '\uD83D\uDC31', vars: [['Orange', '#e8923a', '#fff1dc'], ['Grey', '#8a8f98', '#eef0f3'], ['Brown', '#8a6440', '#f3e3cc']], opt: { stripes: 1 } },
  siamese: { name: 'Siamese Kitten', kind: 'cat', r: 'uncommon', price: 240, size: 0.85, snd: 'meow', icon: '\uD83D\uDC08', vars: [['Seal Point', '#f2e6cf', '#5a4030'], ['Blue Point', '#eef0f4', '#6a7690'], ['Lilac Point', '#f6efe9', '#a08a98']], opt: { points: 1, eye: '#2f7df6' } },
  rat: { name: 'Fancy Rat', kind: 'rat', r: 'common', price: 90, size: 0.62, snd: 'squeak', icon: '\uD83D\uDC00', vars: [['Agouti', '#9a7b5c', '#efe4d4'], ['Hooded', '#2f2f36', '#ffffff'], ['Cinnamon', '#c08a5a', '#f5e6d3']] },
  tortoise: { name: 'Desert Tortoise', kind: 'tortoise', r: 'uncommon', price: 220, size: 0.8, snd: 'chirp', icon: '\uD83D\uDC22', vars: [['Desert', '#8a6a3a', '#a89060'], ['Olive', '#6a7a3a', '#a8a868'], ['Sunset', '#a0522d', '#c8a070']] },
  bunny: { name: 'Bunny', kind: 'bunny', r: 'common', price: 130, size: 0.72, snd: 'squeak', icon: '\uD83D\uDC07', vars: [['Snow', '#f6f6f6', '#ffc6d3'], ['Cocoa', '#9a6a44', '#f3e3cc'], ['Grey', '#a4abb5', '#f1f5f9']] },
  hamster: { name: 'Hamster', kind: 'hamster', r: 'common', price: 80, size: 0.55, snd: 'squeak', icon: '\uD83D\uDC39', vars: [['Golden', '#e8b060', '#fff4e0'], ['Panda', '#2f2f36', '#ffffff'], ['Cream', '#f3dfb8', '#ffffff']] },
  parrot: { name: 'Parrot', kind: 'bird', r: 'uncommon', price: 260, size: 0.7, snd: 'tweet', icon: '\uD83E\uDD9C', vars: [['Green', '#22c55e', '#facc15'], ['Blue', '#3b82f6', '#fde047'], ['Scarlet', '#ef4444', '#3b82f6']] },
  goldfish: { name: 'Goldfish', kind: 'fish', r: 'common', price: 60, size: 0.75, snd: 'bubble', icon: '\uD83D\uDC20', vars: [['Gold', '#f59e0b', '#fde68a'], ['Calico', '#fb923c', '#ffffff'], ['Black Moor', '#2f2f35', '#8b8b96']] },
  hedgehog: { name: 'Hedgehog', kind: 'hedgehog', r: 'rare', price: 420, size: 0.6, snd: 'squeak', icon: '\uD83E\uDD94', vars: [['Classic', '#8a6a4a', '#f3e3cc'], ['Snowflake', '#e2ddd3', '#ffffff'], ['Cinnamon', '#b07a4a', '#f8e8d4']] },
  robodog: { name: 'Robot Dog', kind: 'robodog', r: 'rare', egg: 1, size: 0.9, snd: 'beep', icon: '\uD83E\uDD16', vars: [['Chrome', '#cbd5e1', '#38bdf8'], ['Gold', '#fbbf24', '#f43f5e'], ['Midnight', '#3b4659', '#4ade80']] },
  dragon: { name: 'Mini Dragon', kind: 'dragon', r: 'epic', egg: 1, size: 0.95, snd: 'roar', icon: '\uD83D\uDC09', vars: [['Ember', '#ef4444', '#fbbf24'], ['Jade', '#10b981', '#a7f3d0'], ['Royal', '#7c3aed', '#f0abfc']] },
  unicorn: { name: 'Unicorn Pony', kind: 'pony', r: 'epic', egg: 1, size: 1.05, snd: 'neigh', icon: '\uD83E\uDD84', vars: [['Pearl', '#fdf4ff', '#f472b6'], ['Sky', '#e0f2fe', '#a78bfa'], ['Peach', '#ffedd5', '#38bdf8']] },
  galaxycat: { name: 'Galaxy Cat', kind: 'cat', r: 'legendary', egg: 1, size: 0.9, snd: 'meow', icon: '\uD83C\uDF0C', vars: [['Nebula', '#4c1d95', '#22d3ee'], ['Aurora', '#0f766e', '#f0abfc'], ['Cosmic', '#1e1b4b', '#fbbf24']], opt: { galaxy: 1, eye: '#fde047' } }
};
GP.SPECIES_ORDER = Object.keys(GP.SPECIES);

/* Lizeth's real pets: special family members (cute versions, not exact likenesses) */
GP.FAMILY = [
  { id: 'candy', sp: 'schnauzer', name: 'Candy', col: ['#8e939c', '#eceef1'], acc: { neck: 'pinkcollar' }, blurb: 'A sweet, bouncy miniature schnauzer with a fluffy beard.', goal: 'Walk 300 m with your pets', test: (s) => [s.stats.walk || 0, 300] },
  { id: 'martina', sp: 'tortoise', name: 'Martina', col: ['#8d6b3c', '#b59a68'], acc: { head: 'flower' }, blurb: 'A calm desert tortoise who loves veggies and sunny naps.', goal: 'Reach level 3 with any pet', test: (s) => [Math.max(0, ...s.pets.map((p) => p.lv)), 3] },
  { id: 'luna', sp: 'rat', name: 'Luna', col: ['#8f93a3', '#f4f2f7'], acc: { head: 'bow' }, blurb: 'A curious fancy rat with soft moon-grey fur.', goal: 'Teach any pet a trick', test: (s) => [s.stats.learned || 0, 1] },
  { id: 'pirat', sp: 'rat', name: 'Pi-rat', col: ['#b98b62', '#f6eadb'], oneEye: 1, acc: { neck: 'bandana' }, blurb: 'A brave little fancy rat with one eye and a big heart. Arr!', goal: 'Play 3 mini games', test: (s) => [s.stats.games || 0, 3] },
  { id: 'snowie', sp: 'rat', name: 'Snowie', col: ['#fbfbfb', '#ffe4ec'], eye: '#d9466f', acc: {}, blurb: 'A snow-white fancy rat with rosy eyes.', goal: 'Own 3 pets', test: (s) => [s.pets.length, 3] }
];
GP.familyById = (id) => GP.FAMILY.find((f) => f.id === id);

/* Shop items. food: h = hunger filled, f = happiness. toy: f = fun per fetch. acc: slot. furn: footprint w x d */
GP.ITEMS = {
  kibble: { cat: 'food', name: 'Kibble', icon: '\uD83E\uDD63', price: 10, h: 30, f: 2, col: '#b45309' },
  seeds: { cat: 'food', name: 'Seed Mix', icon: '\uD83C\uDF3B', price: 8, h: 26, f: 3, fav: ['rat', 'hamster', 'bird'], col: '#eab308' },
  veggie: { cat: 'food', name: 'Veggie Bowl', icon: '\uD83E\uDD55', price: 14, h: 30, f: 4, fav: ['bunny', 'tortoise', 'pony', 'hamster'], col: '#f97316' },
  fishsnack: { cat: 'food', name: 'Fishy Bites', icon: '\uD83D\uDC1F', price: 15, h: 32, f: 4, fav: ['cat'], col: '#60a5fa' },
  flakes: { cat: 'food', name: 'Fish Flakes', icon: '\u2728', price: 6, h: 30, f: 3, fav: ['fish'], col: '#f472b6' },
  steak: { cat: 'food', name: 'Meaty Treat', icon: '\uD83C\uDF56', price: 24, h: 45, f: 8, fav: ['dog', 'dragon', 'hedgehog'], col: '#dc2626' },
  bolts: { cat: 'food', name: 'Battery Bites', icon: '\uD83D\uDD0B', price: 26, h: 45, f: 8, fav: ['robodog'], col: '#22c55e' },
  cupcake: { cat: 'food', name: 'Pupcake', icon: '\uD83E\uDDC1', price: 35, h: 22, f: 22, col: '#f9a8d4' },
  ball: { cat: 'toy', name: 'Tennis Ball', icon: '\uD83C\uDFBE', price: 20, f: 9, col: '#d9f99d' },
  bone: { cat: 'toy', name: 'Squeaky Bone', icon: '\uD83E\uDDB4', price: 40, f: 12, col: '#fef3c7' },
  yarn: { cat: 'toy', name: 'Yarn Ball', icon: '\uD83E\uDDF6', price: 35, f: 12, fav: ['cat'], col: '#f472b6' },
  rope: { cat: 'toy', name: 'Rope Toy', icon: '\uD83E\uDEA2', price: 45, f: 12, col: '#fb923c' },
  duck: { cat: 'toy', name: 'Rubber Duck', icon: '\uD83E\uDD86', price: 50, f: 14, col: '#facc15' },
  frisbee: { cat: 'toy', name: 'Frisbee', icon: '\uD83E\uDD4F', price: 60, f: 14, col: '#3ff0ff', note: 'Wider catches in Frisbee Catch!' },
  partyhat: { cat: 'acc', slot: 'head', name: 'Party Hat', icon: '\uD83E\uDD73', price: 45, style: 2 },
  bow: { cat: 'acc', slot: 'head', name: 'Pink Bow', icon: '\uD83C\uDF80', price: 40, style: 2 },
  flower: { cat: 'acc', slot: 'head', name: 'Flower Crown', icon: '\uD83C\uDF3C', price: 55, style: 2 },
  cap: { cat: 'acc', slot: 'head', name: 'Ball Cap', icon: '\uD83E\uDDE2', price: 60, style: 2 },
  tophat: { cat: 'acc', slot: 'head', name: 'Top Hat', icon: '\uD83C\uDFA9', price: 110, style: 3 },
  cowboy: { cat: 'acc', slot: 'head', name: 'Cowboy Hat', icon: '\uD83E\uDD20', price: 110, style: 3 },
  wizard: { cat: 'acc', slot: 'head', name: 'Wizard Hat', icon: '\uD83E\uDDD9', price: 160, style: 4 },
  crown: { cat: 'acc', slot: 'head', name: 'Royal Crown', icon: '\uD83D\uDC51', price: 300, style: 5 },
  redcollar: { cat: 'acc', slot: 'neck', name: 'Red Collar', icon: '\uD83D\uDD34', price: 30, style: 1 },
  pinkcollar: { cat: 'acc', slot: 'neck', name: 'Heart Collar', icon: '\uD83D\uDC97', price: 35, style: 2 },
  bellcollar: { cat: 'acc', slot: 'neck', name: 'Bell Collar', icon: '\uD83D\uDD14', price: 50, style: 2 },
  bandana: { cat: 'acc', slot: 'neck', name: 'Bandana', icon: '\uD83E\uDDE3', price: 45, style: 2 },
  bowtie: { cat: 'acc', slot: 'neck', name: 'Bow Tie', icon: '\uD83C\uDF80', price: 55, style: 3 },
  scarf: { cat: 'acc', slot: 'neck', name: 'Cozy Scarf', icon: '\uD83E\uDDE3', price: 60, style: 3 },
  sunglasses: { cat: 'acc', slot: 'face', name: 'Sunglasses', icon: '\uD83D\uDE0E', price: 80, style: 3 },
  heartglasses: { cat: 'acc', slot: 'face', name: 'Heart Shades', icon: '\uD83D\uDE0D', price: 95, style: 4 },
  petbed: { cat: 'furn', name: 'Pet Bed', icon: '\uD83D\uDECF\uFE0F', price: 60, w: 1.4, d: 1.2, comfort: 2 },
  cushion: { cat: 'furn', name: 'Floor Cushion', icon: '\uD83D\uDFE3', price: 35, w: 1, d: 1, comfort: 1 },
  rug: { cat: 'furn', name: 'Round Rug', icon: '\uD83D\uDFE0', price: 50, w: 2.6, d: 2.6, flat: 1, comfort: 1 },
  plant: { cat: 'furn', name: 'Big Plant', icon: '\uD83E\uDEB4', price: 45, w: 0.8, d: 0.8, solid: 1, comfort: 1 },
  lamp: { cat: 'furn', name: 'Floor Lamp', icon: '\uD83D\uDCA1', price: 55, w: 0.7, d: 0.7, solid: 1, comfort: 1 },
  beanbag: { cat: 'furn', name: 'Beanbag', icon: '\uD83D\uDFE1', price: 70, w: 1.3, d: 1.3, comfort: 2 },
  sofa: { cat: 'furn', name: 'Comfy Sofa', icon: '\uD83D\uDECB\uFE0F', price: 150, w: 2.6, d: 1.1, solid: 1, comfort: 3 },
  table: { cat: 'furn', name: 'Coffee Table', icon: '\uD83E\uDE91', price: 80, w: 1.6, d: 1, solid: 1, comfort: 1 },
  bookshelf: { cat: 'furn', name: 'Bookshelf', icon: '\uD83D\uDCDA', price: 110, w: 1.8, d: 0.6, solid: 1, comfort: 2 },
  toybox: { cat: 'furn', name: 'Toy Box', icon: '\uD83E\uDDF8', price: 65, w: 1.2, d: 0.8, solid: 1, comfort: 2 },
  cattree: { cat: 'furn', name: 'Cat Tree', icon: '\uD83C\uDF33', price: 130, w: 1.2, d: 1.2, solid: 1, comfort: 3 },
  aquarium: { cat: 'furn', name: 'Aquarium', icon: '\uD83D\uDC20', price: 190, w: 1.8, d: 0.7, solid: 1, comfort: 3 },
  tv: { cat: 'furn', name: 'Big TV', icon: '\uD83D\uDCFA', price: 210, w: 2, d: 0.6, solid: 1, comfort: 3 },
  fireplace: { cat: 'furn', name: 'Fireplace', icon: '\uD83D\uDD25', price: 240, w: 2, d: 0.8, solid: 1, comfort: 4 },
  egg: { cat: 'egg', name: 'Mystery Egg', icon: '\uD83E\uDD5A', price: 350, desc: 'Hatches any pet, even rare ones!' },
  fegg: { cat: 'egg', name: 'Fantasy Egg', icon: '\uD83D\uDC8E', price: 1100, desc: 'Always Rare or better: Robot Dog, Mini Dragon, Unicorn Pony, Galaxy Cat or Hedgehog!' }
};
GP.CATS = { food: 'Food', toy: 'Toys', acc: 'Accessories', furn: 'Furniture', egg: 'Eggs' };
GP.itemsOf = (cat) => Object.keys(GP.ITEMS).filter((k) => GP.ITEMS[k].cat === cat);

GP.TRICKS = [
  { id: 'sit', name: 'Sit', icon: '\u2B07\uFE0F', lv: 1, gest: 'Swipe DOWN' },
  { id: 'jump', name: 'Jump', icon: '\u2B06\uFE0F', lv: 2, gest: 'Swipe UP' },
  { id: 'spin', name: 'Spin', icon: '\uD83D\uDD04', lv: 3, gest: 'Draw a CIRCLE' },
  { id: 'wave', name: 'Wave', icon: '\uD83D\uDC4B', lv: 4, gest: 'DOUBLE-TAP' },
  { id: 'roll', name: 'Roll Over', icon: '\uD83C\uDF00', lv: 5, gest: 'Swipe SIDEWAYS' }
];
GP.TRICK_NEED = 3; // successful lessons to learn a trick

GP.GAMES = [
  { id: 'frisbee', name: 'Frisbee Catch', icon: '\uD83E\uDD4F', col: '#3ff0ff', desc: 'Run under the frisbees and catch them before they land. Chain catches for combos!', goal: 30 },
  { id: 'race', name: 'Pet Race', icon: '\uD83C\uDFC1', col: '#f43f5e', desc: 'Obstacle course! Switch lanes, jump hurdles and grab treats for speed.', goal: 180 },
  { id: 'show', name: 'Pet Show', icon: '\uD83C\uDFC6', col: '#facc15', desc: 'Talent contest! Judges score happiness, style and tricks. Tap the trick they call!', goal: 95 },
  { id: 'dig', name: 'Treasure Dig', icon: '\uD83D\uDC8E', col: '#fb923c', desc: 'Your pet sniffs for buried treasure. Hot or cold? 10 digs to find the most loot!', goal: 110 }
];
GP.gameById = (id) => GP.GAMES.find((g) => g.id === id);

GP.levelXP = (lv) => 40 + lv * 30;
GP.MAX_LV = 20;
GP.stage = (lv) => lv >= 6 ? 'Adult' : lv >= 3 ? 'Kid' : 'Baby';
GP.stageScale = (lv) => lv >= 6 ? 1 : lv >= 3 ? 0.84 : 0.68;

/* seeded random (shared mini game layouts online) */
GP.rng = function (seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
GP.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
})();
