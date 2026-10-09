/* Grok Pets - LUNA PACK (DLC from the Grok Arcade DLC Machine 3000, idea #13)
   Unlocked by localStorage 'grokDLC.pets.expansi_n_luna_pack' (set by the arcade's DLC Shop, same origin).
   Adds: Moonlight Grove (night area behind the Moon Gate in the Pet Park), the Moon Market store + Moon Salon skins,
   the Luna Nursery with 5 new pets (Chinchilla, Ferret, Guinea Pig, Sugar Glider, Fennec Fox), starry outfits, food, toys and furniture,
   fireflies to catch, a wishing pond, a stargazing telescope and two new townsfolk.
   Online: if the HOST owns the pack, guests can enter and play in it during that session (buying/adopting needs your own copy). */
(function () {
'use strict';
const GP = window.GP, G = GP.G, W = GP.W, MD = GP.MD, Snd = GP.Snd, T = window.THREE, GN = window.GrokNet;
const { box, ell, sph, cyl, cone, grp, mesh, M } = MD, GEO = MD.G, TAU = Math.PI * 2;
const esc = GN.esc, GS = G.GS, $ = (id) => document.getElementById(id);
const KEY = 'grokDLC.pets.expansi_n_luna_pack', ARCADE = 'https://lizethbran13-cmyk.github.io/grok-arcade/';
const L = GP.Luna = { KEY, ARCADE };
L.owned = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };
L.hostHas = () => { const S = GS.S; return GS.role === 'client' && !!(S && S.dlc && S.dlc.luna); };
L.can = () => L.owned() || L.hostHas();
const sv = () => G.save();

/* ---------------- data: 5 new pets ---------------- */
const SP = {
  chinchilla: { name: 'Chinchilla', kind: 'chinchilla', r: 'rare', price: 380, size: 0.66, snd: 'squeak', icon: '\uD83D\uDC2D', vars: [['Moon Grey', '#a9adb8', '#eef0f4'], ['Ebony', '#4f4a56', '#b8b2bd'], ['Beige', '#d9c3a5', '#f7efe3']] },
  ferret: { name: 'Ferret', kind: 'ferret', r: 'uncommon', price: 260, size: 0.82, snd: 'squeak', icon: '\uD83E\uDDA6', vars: [['Sable', '#7a5a3e', '#f1e2cc'], ['Champagne', '#d8b994', '#fff4e4'], ['Silver', '#8e8f98', '#e9e9ee']], opt: { bandit: '#3b2a20' } },
  guineapig: { name: 'Guinea Pig', kind: 'guineapig', r: 'common', price: 150, size: 0.66, snd: 'squeak', icon: '\uD83D\uDC39', vars: [['Ginger & White', '#d98c4a', '#ffffff'], ['Tricolor', '#3a2d26', '#e8a25e'], ['Cream', '#f1dcb6', '#fff8ea']] },
  sugarglider: { name: 'Sugar Glider', kind: 'glider', r: 'rare', price: 420, size: 0.64, snd: 'chirp', icon: '\uD83D\uDC3F\uFE0F', vars: [['Classic Grey', '#9aa0ab', '#f4f1ec'], ['Leucistic', '#f4f1ea', '#ffffff'], ['Mosaic', '#b9b2c6', '#fdf7ff']] },
  fennec: { name: 'Fennec Fox', kind: 'fennec', r: 'epic', price: 650, size: 0.8, snd: 'tweet', icon: '\uD83E\uDD8A', vars: [['Desert Sand', '#e8c48e', '#fff6e6'], ['Moonlit Silver', '#c9ccd6', '#ffffff'], ['Starlight Gold', '#f2b55a', '#fff3d6']], opt: { tailTip: '#3a2a20' } }
};
GP.LUNA_ORDER = Object.keys(SP);
GP.LUNA_ORDER.forEach((k) => { GP.SPECIES[k] = Object.assign({ dlc: 'luna' }, SP[k]); });

/* ---------------- data: items ---------------- */
const IT = {
  mooncheese: { cat: 'food', name: 'Moon Cheese', icon: '\uD83E\uDDC0', price: 18, h: 34, f: 6, fav: ['chinchilla', 'guineapig', 'ferret', 'rat', 'hamster'], col: '#fde68a' },
  starberries: { cat: 'food', name: 'Star Berries', icon: '\uD83E\uDED0', price: 16, h: 28, f: 8, fav: ['glider', 'fennec', 'bird', 'guineapig', 'bunny'], col: '#818cf8' },
  stardust: { cat: 'food', name: 'Stardust Cookie', icon: '\uD83C\uDF6A', price: 40, h: 24, f: 24, col: '#c4b5fd' },
  glowball: { cat: 'toy', name: 'Glow Ball', icon: '\uD83D\uDD2E', price: 55, f: 14, col: '#a5f3fc' },
  cometplush: { cat: 'toy', name: 'Comet Plush', icon: '\u2604\uFE0F', price: 70, f: 16, col: '#f0abfc' },
  moontiara: { cat: 'acc', slot: 'head', name: 'Moon Tiara', icon: '\uD83C\uDF19', price: 120, style: 4 },
  astrohelmet: { cat: 'acc', slot: 'head', name: 'Space Helmet', icon: '\uD83D\uDE80', price: 180, style: 5 },
  starhood: { cat: 'acc', slot: 'head', name: 'Star Hood', icon: '\u2B50', price: 90, style: 3 },
  starcape: { cat: 'acc', slot: 'neck', name: 'Starry Cape', icon: '\uD83C\uDF0C', price: 130, style: 4 },
  crescent: { cat: 'acc', slot: 'neck', name: 'Crescent Pendant', icon: '\uD83C\uDF1B', price: 70, style: 3 },
  starshades: { cat: 'acc', slot: 'face', name: 'Star Shades', icon: '\uD83E\uDD29', price: 85, style: 3 },
  moonlamp: { cat: 'furn', name: 'Moon Lamp', icon: '\uD83C\uDF15', price: 90, w: 0.8, d: 0.8, solid: 1, comfort: 3 },
  starrug: { cat: 'furn', name: 'Star Rug', icon: '\u2728', price: 70, w: 2.6, d: 2.6, flat: 1, comfort: 2 },
  crescentbed: { cat: 'furn', name: 'Crescent Bed', icon: '\uD83D\uDECF\uFE0F', price: 110, w: 1.6, d: 1.2, comfort: 3 },
  telescope: { cat: 'furn', name: 'Telescope', icon: '\uD83D\uDD2D', price: 160, w: 1, d: 1, solid: 1, comfort: 3 }
};
for (const k in IT) GP.ITEMS[k] = Object.assign({ dlc: 'luna' }, IT[k]);
const itemsOf = (cat) => Object.keys(IT).filter((k) => IT[k].cat === cat);
const SKINS = [['Moonglow', '#e0e7ff', '#a5b4fc'], ['Stardust', '#c4b5fd', '#fde68a'], ['Nebula', '#6d28d9', '#22d3ee'], ['Aurora', '#5eead4', '#f0abfc'], ['Midnight', '#272361', '#93c5fd'], ['Moon Peach', '#fdba74', '#fef3c7']];
const SKIN_PRICE = 120;
L.SKINS = SKINS;

/* ---------------- 3D: outfits, furniture, toys ---------------- */
const glow = (c, e) => M(c, { emissive: e || c });
const baseAcc = MD.acc;
MD.acc = function (id, P) {
  if (!IT[id] || IT[id].cat !== 'acc') return baseAcc(id, P);
  const g = new T.Group(), k = P ? P.headR / 0.2 : 1, nr = P ? P.neckR : 0.2, s = grp(g); s.scale.setScalar(k);
  switch (id) {
    case 'moontiara': { const band = mesh(GEO.torus, '#e5e7eb', s, 0, 0.03, 0, 0.15, 0.15, 0.1); band.rotation.x = Math.PI / 2; const moon = grp(s, 0, 0.13, 0.1); sph(0.07, glow('#fde68a', '#a16207'), moon, 0, 0, 0); sph(0.06, '#e5e7eb', moon, 0.035, 0.02, 0.02); for (let i = 0; i < 4; i++) { const a = (i / 3 - 0.5) * 2.2; sph(0.022, glow('#a5b4fc', '#4338ca'), s, Math.sin(a) * 0.15, 0.06, Math.cos(a) * 0.15); } break; }
    case 'astrohelmet': { const gl = new T.MeshLambertMaterial({ color: '#bae6fd', transparent: true, opacity: 0.35, depthWrite: false }); const d = mesh(GEO.sph, gl, s, 0, -0.04, 0.02, 0.27, 0.27, 0.27); d.renderOrder = 3; const r = mesh(GEO.torus, '#f8fafc', s, 0, -0.2, 0.02, 0.24, 0.24, 0.3); r.rotation.x = Math.PI / 2; cyl(0.012, 0.14, '#94a3b8', s, 0.12, 0.25, -0.05); sph(0.03, glow('#f43f5e'), s, 0.12, 0.33, -0.05); break; }
    case 'starhood': { mesh(GEO.hemi, '#4338ca', s, 0, -0.02, -0.02, 0.21, 0.2, 0.21); const st = cone(0.05, 0.12, glow('#fde047', '#a16207'), s, 0, 0.2, 0); st.rotation.z = 0.3; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; sph(0.016, glow('#fef9c3', '#ca8a04'), s, Math.cos(a) * 0.19, 0.06, Math.sin(a) * 0.19); } break; }
    case 'starcape': { const r = mesh(GEO.torus, '#312e81', g, 0, 0, 0, nr, nr, nr * 0.9); r.rotation.x = Math.PI / 2; const c = box(nr * 2.2, 0.02, nr * 2.6, '#3730a3', g, 0, nr * 0.15, -nr * 1.4); c.rotation.x = -0.25; for (let i = 0; i < 7; i++) sph(nr * 0.07, glow('#fde68a', '#b45309'), g, (i % 3 - 1) * nr * 0.6, nr * 0.2 + 0.012, -nr * (0.6 + i * 0.28)); sph(nr * 0.16, glow('#fde047', '#a16207'), g, 0, -nr * 0.1, nr * 1.02); break; }
    case 'crescent': { const r = mesh(GEO.torus, '#cbd5e1', g, 0, 0, 0, nr, nr, nr * 0.9); r.rotation.x = Math.PI / 2; r.scale.set(nr, nr, nr * 0.4); const m = grp(g, 0, -nr * 0.35, nr * 1.05); sph(nr * 0.22, glow('#fde68a', '#a16207'), m, 0, 0, 0); sph(nr * 0.19, '#cbd5e1', m, nr * 0.1, nr * 0.06, nr * 0.05); break; }
    case 'starshades': { [-1, 1].forEach((d) => { const st = grp(s, d * 0.09, 0, 0.03); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + Math.PI / 2; const c = cone(0.025, 0.06, '#facc15', st, Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0); c.rotation.z = a - Math.PI / 2; c.scale.z = 0.3; } sph(0.04, glow('#7c3aed', '#3b0764'), st, 0, 0, 0).scale.z = 0.3; }); box(0.06, 0.015, 0.015, '#facc15', s, 0, 0.01, 0.03); break; }
    default: return null;
  }
  return g;
};
const baseFurn = MD.furn;
MD.furn = function (id) {
  if (!IT[id] || IT[id].cat !== 'furn') return baseFurn(id);
  const g = new T.Group();
  switch (id) {
    case 'moonlamp': cyl(0.22, 0.06, '#312e81', g, 0, 0.03, 0); cyl(0.03, 1.1, '#94a3b8', g, 0, 0.6, 0); sph(0.32, glow('#fef3c7', '#ca8a04'), g, 0, 1.4, 0); for (let i = 0; i < 4; i++) sph(0.05, '#e7d9a8', g, Math.cos(i * 1.7) * 0.24, 1.45 + Math.sin(i * 2.3) * 0.12, Math.sin(i * 1.7) * 0.24); break;
    case 'starrug': { const r = cyl(1.25, 0.02, '#312e81', g, 0, 0.01, 0); r.renderOrder = 0; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; const c = cone(0.35, 0.9, '#fde047', g, Math.cos(a) * 0.45, 0.02, Math.sin(a) * 0.45); c.rotation.set(Math.PI / 2, 0, a - Math.PI / 2); c.scale.y = 0.9; c.scale.z = 0.04; } cyl(0.4, 0.024, '#facc15', g, 0, 0.012, 0); break; }
    case 'crescentbed': { const t = new T.Mesh(new T.TorusGeometry(0.55, 0.22, 10, 24, Math.PI * 1.3), M('#6366f1')); t.rotation.x = -Math.PI / 2; t.rotation.z = 0.5; t.position.y = 0.22; g.add(t); cyl(0.5, 0.12, '#c7d2fe', g, 0, 0.1, 0); sph(0.12, glow('#fde047', '#a16207'), g, 0.4, 0.5, -0.3); break; }
    case 'telescope': { [0, 1, 2].forEach((i) => { const a = i / 3 * TAU; const l = cyl(0.03, 1.1, '#78350f', g, Math.cos(a) * 0.25, 0.5, Math.sin(a) * 0.25); l.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); }); const tb = grp(g, 0, 1.05, 0); tb.rotation.x = -0.6; cyl(0.12, 1.0, '#4338ca', tb, 0, 0.2, 0); cyl(0.15, 0.12, '#facc15', tb, 0, 0.72, 0); cyl(0.07, 0.2, '#1e1b4b', tb, 0, -0.35, 0); break; }
  }
  return g;
};
const baseItem = MD.item;
MD.item = function (id) {
  if (id === 'glowball') { const g = new T.Group(); sph(0.12, glow('#67e8f9', '#0e7490'), g, 0, 0.12, 0); return g; }
  if (id === 'cometplush') { const g = new T.Group(); sph(0.1, '#f0abfc', g, 0, 0.12, 0); const t = cone(0.09, 0.3, '#c084fc', g, 0, 0.12, -0.18); t.rotation.x = -Math.PI / 2; sph(0.02, '#1e1b4b', g, -0.04, 0.15, 0.09); sph(0.02, '#1e1b4b', g, 0.04, 0.15, 0.09); return g; }
  return baseItem(id);
};

/* ---------------- world ---------------- */
const GATE = { x: 41, z: -17.2 };
let gateParts = null, grove = null, lunaHots = {};
function lib() { return W.lib; }
function buildGate() {
  const Lb = lib(), A = W.areas.town, g = A.g, gate = grp(g, GATE.x, 0, GATE.z);
  [-1.7, 1.7].forEach((x) => { cyl(0.36, 0.4, '#312e81', gate, x, 0.2, 0); cyl(0.26, 3.2, '#4c3d8f', gate, x, 1.8, 0); const c = mesh(GEO.cone4, glow('#c4b5fd', '#6d28d9'), gate, x, 3.75, 0, 0.32, 0.7, 0.32); c.rotation.y = 0.4; Lb.obsC(A, GATE.x + x, GATE.z, 0.45); });
  const arch = new T.Mesh(new T.TorusGeometry(1.7, 0.16, 10, 28, Math.PI), glow('#a78bfa', '#4c1d95')); arch.position.set(0, 3.3, 0); gate.add(arch);
  const moon = grp(gate, 0, 5.25, 0); sph(0.45, glow('#fef08a', '#ca8a04'), moon, 0, 0, 0); sph(0.4, M('#1e1b4b'), moon, 0.22, 0.12, 0.12);
  const discMat = new T.MeshBasicMaterial({ color: '#4c1d95', transparent: true, opacity: 0.85, side: T.DoubleSide });
  const disc = new T.Mesh(new T.CircleGeometry(1.55, 40), discMat); disc.position.set(0, 3.3, 0); disc.scale.y = 1.95; disc.position.y = 1.85; gate.add(disc);
  const swirl = grp(gate, 0, 1.85, 0.05); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; sph(0.07, glow(i % 2 ? '#fde68a' : '#a5f3fc'), swirl, Math.cos(a) * 1.0, Math.sin(a) * 1.6, 0); }
  const lock = grp(gate, 0, 1.9, 0.18); box(0.7, 0.6, 0.22, glow('#facc15', '#713f12'), lock, 0, 0, 0); const sh = mesh(GEO.torus, '#e5e7eb', lock, 0, 0.36, 0, 0.24, 0.3, 0.24); sh.scale.set(0.24, 0.3, 0.6); sph(0.07, '#1f2937', lock, 0, -0.02, 0.12);
  Lb.obsB(A, GATE.x - 1.6, GATE.x + 1.6, GATE.z - 0.3, GATE.z + 0.3);
  const h = Lb.hot(A, { id: 'luna_gate', kind: 'luna', x: GATE.x, z: GATE.z + 1.5, reach: 2.4, name: 'Moon Gate', label: 'LOOK' });
  gateParts = { gate, disc, discMat, swirl, lock, moon, h, A, sign: null };
  for (let i = 0; i < 6; i++) MD.flowers(g, GATE.x - 3 + (i % 3) * 3 + (i > 2 ? 1.5 : 0), GATE.z + 1.6 + (i > 2 ? 0 : -0.2)).scale.setScalar(0.7);
  refreshGate();
}
function refreshGate() {
  if (!gateParts) return; const P = gateParts, open = L.can();
  P.lock.visible = !open; P.discMat.color.set(open ? '#7c3aed' : '#2e1065'); P.discMat.opacity = open ? 0.7 : 0.9; P.swirl.visible = open;
  P.h.label = open ? 'ENTER' : 'LOOK'; P.h.name = open ? 'Moonlight Grove' : 'Moon Gate (Luna Pack)';
  if (P.sign) P.A.g.remove(P.sign);
  P.sign = lib().marker(P.A, Object.assign({}, P.h, { h: 5.6 }), open ? '\uD83C\uDF19 MOONLIGHT GROVE' : '\uD83D\uDD12 LUNA PACK', open ? 'rgba(109,40,217,.95)' : 'rgba(55,48,107,.95)');
}
function crystalTree(g, x, z, s, col) { const t = grp(g, x, 0, z); s = s || 1; cyl(0.16 * s, 1.5 * s, '#3b2f5c', t, 0, 0.75 * s, 0); [[0, 2.1, 0, 0.75], [0.45, 1.75, 0.2, 0.5], [-0.4, 1.85, -0.15, 0.55]].forEach((q) => { const c = mesh(GEO.cone4, glow(col || '#a78bfa', MD.shade(col || '#a78bfa', -0.6)), t, q[0] * s, q[1] * s, q[2] * s, q[3] * s, q[3] * 2.1 * s, q[3] * s); c.rotation.y = q[0] * 3; }); return t; }
function mushroom(g, x, z, s, col) { const m = grp(g, x, 0, z); s = s || 1; cyl(0.12 * s, 0.6 * s, '#f5f3ff', m, 0, 0.3 * s, 0); const cap = mesh(GEO.hemi, glow(col, MD.shade(col, -0.55)), m, 0, 0.58 * s, 0, 0.42 * s, 0.32 * s, 0.42 * s); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; sph(0.06 * s, '#ffffff', m, Math.cos(a) * 0.26 * s, 0.75 * s, Math.sin(a) * 0.26 * s); } m.userData.cap = cap; return m; }
function buildGrove() {
  const Lb = lib(), A = Lb.newArea('luna', { spawn: [0, 12.5], cam: { h: 10.5, d: 11.5 }, bg: '#1b1446', fog: [34, 95] }), g = A.g;
  A.outdoor = true; A.label = 'Moonlight Grove';
  const gr = new T.Mesh(GEO.plane, M('#35507e')); gr.rotation.x = -Math.PI / 2; gr.scale.set(200, 200, 1); g.add(gr); A.ground.push(gr);
  Lb.rect(A, -22, 22, -20, 18);
  // moonstone paths
  Lb.ground(A, 3.2, 30, '#7f86c4', 0, 2, 0.03); Lb.ground(A, 26, 3, '#7f86c4', 0, -4, 0.032);
  for (let i = 0; i < 18; i++) sph(0.08, glow('#e0e7ff', '#6366f1'), g, (i % 2 ? 1.75 : -1.75), 0.05, -12 + i * 1.7);
  // sky: moon + stars
  const moon = grp(g, 18, 26, -70); sph(9, M('#fef9c3', { emissive: '#fde68a', fog: false }), moon, 0, 0, 0); [[2, 3, 1.4], [-3, -2, 1.8], [3.5, -3, 1]].forEach((q) => sph(q[2], M('#f5e7a1', { emissive: '#d9c36a', fog: false }), moon, q[0], q[1], 8.1));
  const sg = new T.BufferGeometry(), pts = []; for (let i = 0; i < 420; i++) { const a = Math.random() * TAU, b = Math.random() * 0.5 + 0.08; pts.push(Math.cos(a) * Math.cos(b) * 110, Math.sin(b) * 110 + 5, Math.sin(a) * Math.cos(b) * 110 - 20); }
  sg.setAttribute('position', new T.Float32BufferAttribute(pts, 3)); const stars = new T.Points(sg, new T.PointsMaterial({ color: '#ffffff', size: 0.9, fog: false })); g.add(stars);
  const pl = new T.PointLight('#a78bfa', 0.9, 45); pl.position.set(0, 9, 0); g.add(pl);
  // border crystal forest + mushrooms
  const cols = ['#a78bfa', '#67e8f9', '#f0abfc', '#93c5fd'];
  for (let i = 0; i < 34; i++) { const a = i / 34 * TAU, x = Math.cos(a) * 25 + Math.sin(i * 7) * 1.5, z = Math.sin(a) * 22 + Math.cos(i * 5) * 1.5; crystalTree(g, x, z, 1.1 + (i % 3) * 0.25, cols[i % 4]); }
  [[-18, -16], [18, 14], [-19, 12], [19, -3], [-5, -17]].forEach((q, i) => { crystalTree(g, q[0], q[1], 1.2, cols[i % 4]); Lb.obsC(A, q[0], q[1], 0.5); });
  A.shrooms = [];
  [[-4, -9, 1.6, '#f472b6'], [5, 0, 1.3, '#22d3ee'], [-6, 2, 1, '#a3e635'], [17, 1, 1.5, '#f0abfc'], [-17, -4, 1.4, '#38bdf8'], [5, 13, 1, '#f472b6'], [-5, 14, 1.2, '#facc15'], [16, 12, 1, '#22d3ee'], [-19, 0, 1, '#f472b6']].forEach((q) => { const m = mushroom(g, q[0], q[1], q[2], q[3]); A.shrooms.push({ m, x: q[0], z: q[1], s: q[2], sq: 0 }); Lb.obsC(A, q[0], q[1], 0.18 * q[2]); });
  // Moon Market (store)
  const mk = grp(g, -12, 0, -13); box(9, 3.6, 6.5, '#ede9fe', mk, 0, 1.8, 0); mesh(GEO.hemi, glow('#6d28d9', '#2e1065'), mk, 0, 3.6, 0, 4.6, 2.6, 3.4); box(9.4, 0.3, 6.9, '#4c1d95', mk, 0, 3.65, 0);
  const cm = grp(mk, 0, 6.6, 0); sph(0.55, glow('#fde047', '#a16207'), cm, 0, 0, 0); sph(0.5, M('#2e1065'), cm, 0.28, 0.15, 0.15);
  box(1.8, 2.6, 0.2, '#312e81', mk, 0, 1.3, 3.27); [-1, 1].forEach((sd) => { box(1.6, 1.2, 0.15, glow('#fef3c7', '#a16207'), mk, sd * 2.9, 2.1, 3.27); });
  const msg = Lb.signPlane('MOON MARKET', 5.4, 0.9, '#6d28d9'); msg.position.set(0, 3.15, 3.32); mk.add(msg);
  Lb.obsB(A, -16.5, -7.5, -16.25, -9.75);
  lunaHots.market = Lb.hot(A, { id: 'luna_market', kind: 'luna', x: -12, z: -8.9, reach: 2.2, name: 'Moon Market', label: 'ENTER' }); Lb.marker(A, Object.assign({}, lunaHots.market, { h: 4.4 }), '\uD83D\uDECD\uFE0F MOON MARKET', 'rgba(109,40,217,.95)');
  // Luna Nursery (adopt the new pets)
  const nx = 12, nz = -12, ns = grp(g, nx, 0, nz); box(8, 0.05, 6, '#4c6e9e', ns, 0, 0.025, 0);
  const fc = '#c4b5fd'; MD.fence(ns, -4, -3, 4, -3, fc); MD.fence(ns, -4, -3, -4, 3, fc); MD.fence(ns, 4, -3, 4, 3, fc); MD.fence(ns, -4, 3, -1.2, 3, fc); MD.fence(ns, 1.2, 3, 4, 3, fc);
  [[-4, -3], [4, -3], [-4, 3], [4, 3], [-1.2, 3], [1.2, 3]].forEach((q) => sph(0.15, glow('#fde68a', '#a16207'), ns, q[0], 0.95, q[1]));
  const nsg = Lb.signPlane('LUNA NURSERY', 3.6, 0.7, '#7c3aed'); nsg.position.set(0, 1.9, 3.05); ns.add(nsg);
  mushroom(ns, -2.8, -2, 0.8, '#f472b6'); mushroom(ns, 2.9, -2.1, 0.7, '#22d3ee'); const hut = grp(ns, 0, 0, -2.2); mesh(GEO.hemi, '#a78bfa', hut, 0, 0, 0, 0.9, 0.8, 0.7); box(0.5, 0.45, 0.1, '#2e1065', hut, 0, 0.22, 0.66);
  Lb.obsB(A, nx - 4, nx + 4, nz - 3, nz + 2.7);
  lunaHots.nursery = Lb.hot(A, { id: 'luna_nursery', kind: 'luna', x: nx, z: nz + 4.1, reach: 2.3, name: 'Luna Nursery', label: 'ADOPT' }); Lb.marker(A, Object.assign({}, lunaHots.nursery, { h: 3.3 }), '\uD83D\uDC3E LUNA NURSERY', 'rgba(124,58,237,.95)');
  A.nursery = GP.LUNA_ORDER.map((sp, i) => { const s = GP.SPECIES[sp]; const P = MD.pet({ sp, col: [s.vars[0][1], s.vars[0][2]], lv: 4 }); g.add(P.g); const o = { P, sp, x: nx - 3 + i * 1.5, z: nz - 0.5 + (i % 2), yaw: 0, sp2: 0, tx: 0, tz: 0, wait: Math.random() * 2 }; P.g.position.set(o.x, 0.05, o.z); return o; });
  A.nb = [nx - 3.4, nx + 3.4, nz - 2.4, nz + 2.4];
  // Wishing Pond
  const wp = grp(g, 11, 0, 5.5); const wat = cyl(3.6, 0.08, glow('#4f46e5', '#1e1b4b'), wp, 0, 0.05, 0); wat.scale.z = 2.4; const rim = cyl(3.9, 0.12, '#9ca3c7', wp, 0, 0.03, 0); rim.scale.z = 2.6;
  for (let i = 0; i < 5; i++) { const lp = cyl(0.42, 0.03, '#34d399', wp, Math.cos(i * 1.3) * 2.1, 0.11, Math.sin(i * 1.3) * 1.3); sph(0.1, glow(['#f472b6', '#fde68a', '#a5f3fc'][i % 3]), wp, lp.position.x, 0.2, lp.position.z); }
  const fount = grp(wp, 0, 0, 0); cyl(0.25, 1.4, '#c7d2fe', fount, 0, 0.7, 0); sph(0.42, glow('#fde68a', '#a16207'), fount, 0, 1.6, 0); A.wishOrb = fount;
  Lb.obsB(A, 7.6, 14.4, 3.2, 7.8);
  lunaHots.wish = Lb.hot(A, { id: 'luna_wish', kind: 'luna', x: 11, z: 9.2, reach: 2.2, name: 'Wishing Pond', label: 'WISH' }); Lb.marker(A, Object.assign({}, lunaHots.wish, { h: 2.6 }), '\u2728 WISHING POND', 'rgba(79,70,229,.95)');
  // Stargazing deck
  const dk = grp(g, -12, 0, 5); cyl(2.4, 0.25, '#7c5a3a', dk, 0, 0.12, 0); const tsc = MD.furn('telescope'); tsc.scale.setScalar(1.3); tsc.position.set(0, 0.25, -0.4); dk.add(tsc); MD.bench(dk, 0, 1.4, Math.PI).scale.setScalar(0.7);
  Lb.obsC(A, -12, 4.6, 0.8);
  lunaHots.scope = Lb.hot(A, { id: 'luna_scope', kind: 'luna', x: -12, z: 7.8, reach: 2.2, name: 'Stargazing Telescope', label: 'LOOK' }); Lb.marker(A, Object.assign({}, lunaHots.scope, { h: 3.3 }), '\uD83D\uDD2D STARGAZING', 'rgba(30,64,175,.95)');
  // exit portal back to the Pet Park
  const ex = grp(g, 0, 0, 17); [-1.3, 1.3].forEach((x) => cyl(0.18, 2.6, '#4c3d8f', ex, x, 1.3, 0)); const ea = new T.Mesh(new T.TorusGeometry(1.3, 0.12, 8, 24, Math.PI), glow('#a78bfa', '#4c1d95')); ea.position.y = 2.6; ex.add(ea);
  lunaHots.exit = Lb.hot(A, { id: 'luna_exit', kind: 'luna', x: 0, z: 15.7, reach: 1.8, name: 'to the Pet Park', label: 'EXIT' }); Lb.marker(A, Object.assign({}, lunaHots.exit, { h: 3.2 }), '\u2B07 PET PARK', 'rgba(22,163,74,.95)');
  // fireflies
  A.flies = []; for (let i = 0; i < 14; i++) { const f = sph(0.09, glow('#fef08a', '#facc15'), g, 0, 0, 0); const o = { m: f, t: Math.random() * 6, off: 0 }; placeFly(A, o); A.flies.push(o); }
  A.zone = (x, z) => x < -7 && z < -8 ? 'Moon Market' : x > 7 && z < -7 ? 'Luna Nursery' : x > 6 && z > 1 ? 'Wishing Pond' : x < -7 && z > 1 ? 'Stargazing Deck' : 'Moonlight Grove';
  grove = A;
}
function placeFly(A, o) { for (let k = 0; k < 20; k++) { const x = -19 + Math.random() * 38, z = -18 + Math.random() * 34; if (W.isFree(A, x, z, 0.5)) { o.x = x; o.z = z; break; } } o.off = 0; o.m.visible = true; }
function buildMarket() {
  const Lb = lib(), A = Lb.room('lunashop', 18, 12, Lb.tileTex('#3b2f73', '#2e2560', 9), '#4338ca', { bg: '#1e1b4b' }), g = A.g;
  A.hots[0].kind = 'luna'; A.hots[0].id = 'luna_mexit'; A.hots[0].name = 'to the Grove'; A.label = 'Moon Market'; A.zone = () => 'Moon Market';
  for (let i = 0; i < 7; i++) { const x = -7.5 + i * 2.5; cyl(0.01, 0.8, '#e5e7eb', g, x, 2.8, -1 + (i % 2) * 2); sph(0.18, glow(i % 2 ? '#fde68a' : '#a5f3fc'), g, x, 2.35, -1 + (i % 2) * 2); }
  [-4.5, 4.5].forEach((x) => Lb.windowOn(g, x, 1.9, -5.95));
  Lb.shelf(g, -5.5, -5.3, 'MOON SNACKS & TOYS', itemsOf('food').concat(itemsOf('toy')), '#7c3aed'); Lb.obsB(A, -7.5, -3.5, -6, -4.9);
  Lb.shelf(g, 0.5, -5.3, 'STARRY OUTFITS', itemsOf('acc'), '#db2777'); Lb.obsB(A, -1.5, 2.5, -6, -4.9);
  Lb.hot(A, { id: 'lm_food', kind: 'luna', cat: 'food', x: -5.5, z: -4.0, reach: 2.2, name: 'Snacks & Toys', label: 'SHOP' });
  Lb.hot(A, { id: 'lm_acc', kind: 'luna', cat: 'acc', x: 0.5, z: -4.0, reach: 2.2, name: 'Starry Outfits', label: 'SHOP' });
  const fr = grp(g, -7.3, 0, 1.6); box(3, 0.2, 4, '#312e81', fr, 0, 0.1, 0); ['moonlamp', 'crescentbed', 'telescope'].forEach((k, i) => { const m = MD.furn(k); m.scale.setScalar(0.6); m.position.set(0.2, 0.2, -1.3 + i * 1.3); fr.add(m); });
  Lb.obsB(A, -8.9, -5.8, -0.5, 3.7); Lb.hot(A, { id: 'lm_furn', kind: 'luna', cat: 'furn', x: -5.1, z: 1.6, reach: 2.2, name: 'Moon Furniture', label: 'SHOP' });
  // Moon Salon (skins)
  const sl = grp(g, 6.2, 0, -3.2); box(2.4, 1.0, 1.2, '#db2777', sl, 0, 0.5, 0); box(2.6, 0.1, 1.4, '#fce7f3', sl, 0, 1.05, 0); const mir = mesh(GEO.circle, M('#c7d2fe', { emissive: '#312e81' }), sl, 0, 2.3, -0.62, 0.8, 1, 1); void mir; const mr = mesh(GEO.torus, '#facc15', sl, 0, 2.3, -0.6, 0.85, 1.05, 0.85); void mr;
  SKINS.forEach((s, i) => sph(0.1, s[1], sl, -0.9 + i * 0.36, 1.2, 0.2));
  const ssg = Lb.signPlane('MOON SALON \u00b7 SKINS', 3, 0.5, '#be185d'); ssg.position.set(0, 3.5, -0.6); sl.add(ssg);
  Lb.obsB(A, 4.9, 7.5, -4, -2.5); Lb.hot(A, { id: 'lm_salon', kind: 'luna', x: 6.2, z: -1.6, reach: 2.2, name: 'Moon Salon', label: 'SKINS' });
  const sel = MD.person({ shirt: '#6d28d9', hair: '#e0e7ff', long: 1, apron: '#fde68a' }); sel.g.position.set(7.8, 0, -3.4); g.add(sel.g); A.obs.push({ t: 'c', x: 7.8, z: -3.4, r: 0.4 });
  L.selene = sel;
}
const baseBuild = W.build;
W.build = function () { baseBuild(); buildGate(); buildGrove(); buildMarket(); };

/* night lighting while inside the pack */
const baseSetArea = W.setArea; let lights = null;
W.setArea = function (id) {
  baseSetArea(id);
  if (!lights) { const h = W.scene.children.find((o) => o.isHemisphereLight), d = W.scene.children.find((o) => o.isDirectionalLight); lights = { h, d, hi: h.intensity, di: d.intensity, hc: h.color.clone(), dc: d.color.clone() }; }
  const night = id === 'luna';
  lights.h.intensity = night ? 0.5 : lights.hi; lights.d.intensity = night ? 0.32 : lights.di;
  if (night) { lights.h.color.set('#c7d2fe'); lights.d.color.set('#a5b4fc'); } else { lights.h.color.copy(lights.hc); lights.d.color.copy(lights.dc); }
};

/* ---------------- townsfolk ---------------- */
if (GP.NPC && GP.NPC.DEFS) {
  GP.NPC.DEFS.push({ id: 'stella', name: 'Stella', role: 'Moonlight explorer', area: 'luna', emo: '\uD83D\uDC69\u200D\uD83D\uDE80', col: '#a78bfa', model: { shirt: '#4338ca', hair: '#fde68a', long: 1, pants: '#1e1b4b' },
    pet: { sp: 'sugarglider', name: 'Pip', col: ['#9aa0ab', '#f4f1ec'], acc: { head: 'starhood' } }, speed: 1.1, loop: true, start: 0,
    route: [[-3, -1.5], [3.5, -2], [4.5, 3.5, 2], [2.5, 9], [-3, 10], [-4.5, 4, 2]],
    persona: 'Dreamy stargazer who moved to the grove to watch the moon every night.', gift: 'starhood', quest: 'happy',
    greet: ['Oh hi! I\u2019m Stella, and this little glider is Pip. Welcome to Moonlight Grove!', 'Shh\u2026 the fireflies are out! Try catching some. Pip loves them.'],
    greetF: ['You\u2019re back! Pip glided all the way across the grove to say hi.', 'The moon looks extra bright tonight, doesn\u2019t it?'],
    greetB: ['My moon buddy! Pip saved you a star berry.', 'You and {pet} belong here under the stars!'],
    tips: ['Walk into the glowing fireflies to catch them. Each one is worth coins!', 'Toss a coin in the Wishing Pond. Sometimes the moon wishes back!', 'This grove is named after Luna the rat. She found it first, following the moonlight!', 'The Luna Nursery has chinchillas, ferrets, guinea pigs, sugar gliders and fennec foxes!'] });
  GP.NPC.DEFS.push({ id: 'selene', name: 'Selene', role: 'Moon Market owner', area: 'lunashop', staff: true, emo: '\uD83C\uDF19', col: '#6d28d9', menu: '\uD83D\uDECD\uFE0F BROWSE', gift: 'stardust',
    place: () => [L.selene, 7.8, -3.4, -Math.PI / 2], browse: () => L.shop('food'),
    persona: 'Calm and sparkly. Sells everything that glows.',
    greet: ['Welcome to the Moon Market. Everything here glows a little. Want to browse?', 'Hello, moonbeam! Snacks, outfits, furniture and skins. Have a look!'],
    greetF: ['My favourite stargazer! New outfits just landed.', '{pet} would look amazing in a Moon Tiara\u2026'],
    greetB: ['Bestie! I saved the shiniest Stardust Cookies for you.', 'You and {pet} make my shop glow brighter!'],
    busy: 'I would love to, but the moon doesn\u2019t sell itself!',
    tips: ['The Moon Salon gives any pet a new skin: Nebula, Aurora, Stardust and more!', 'Chinchillas and guinea pigs adore Moon Cheese. Gliders and foxes love Star Berries.'] });
}

/* ---------------- interactions ---------------- */
function head(t) { return G.head(t); }
function portrait(sp, vi) { const s = GP.SPECIES[sp]; return G.portrait({ sp, col: [s.vars[vi || 0][1], s.vars[vi || 0][2]], lv: 7, acc: {} }); }
L.teaser = function () {
  const can = L.can(), guest = L.hostHas() && !L.owned();
  let h = head('\uD83C\uDF19 Luna Pack') + '<div class="lunaPics">' + GP.LUNA_ORDER.map((k) => '<figure><img src="' + portrait(k) + '" alt=""><figcaption>' + esc(GP.SPECIES[k].name) + '</figcaption></figure>').join('') + '</div>';
  h += '<p class="sub">A moonlit new area, the <b>Moon Market</b> store, <b>5 new pets</b> (Chinchilla, Ferret, Guinea Pig, Sugar Glider, Fennec Fox), starry outfits, Moon Salon skins, cosmic snacks, toys and furniture, fireflies, a wishing pond and stargazing!</p>';
  if (can) h += '<div class="big">' + (guest ? '\uD83C\uDF89 Your host has the Luna Pack, so you can play it in this session!' : '\uD83C\uDF89 UNLOCKED!') + '</div><div class="btnrow"><button class="btn primary" data-a="luEnter">GO TO MOONLIGHT GROVE</button></div>';
  else h += '<div class="big lunaLockMsg">\uD83D\uDD12 Unlock at the DLC Machine 3000 in Grok Arcade</div><div class="btnrow"><a class="btn primary" id="luArcade" href="' + ARCADE + '" target="_blank" rel="noopener">OPEN GROK ARCADE</a></div><p class="sub small">Expansion \u00b7 150 tickets. It turns on by itself the moment you unlock it.</p>';
  G.openPanel('luna_teaser', h);
};
function go(area, at) { G.closePanel(); G.travel(area, false, at); }
L.interact = function (h) {
  if (h.id === 'luna_gate') { if (L.can()) go('luna'); else L.teaser(); return; }
  if (!L.can() && h.id !== 'luna_exit' && h.id !== 'luna_mexit') { L.teaser(); return; }
  switch (h.id) {
    case 'luna_exit': go('town', [GATE.x, GATE.z + 2.2]); break;
    case 'luna_market': go('lunashop'); break;
    case 'luna_mexit': go('luna', [-12, -7.6]); break;
    case 'lm_food': case 'lm_acc': case 'lm_furn': L.shop(h.cat); break;
    case 'lm_salon': L.salon(); break;
    case 'luna_nursery': L.nursery(); break;
    case 'luna_wish': L.wish(); break;
    case 'luna_scope': L.scope(); break;
  }
};
const guestNote = '<p class="sub small lunaGuest">\uD83C\uDF1F You\u2019re playing your host\u2019s Luna Pack. To buy or adopt Luna stuff for your own save, unlock it at the DLC Machine 3000 in Grok Arcade.</p>';
L.shop = function (cat) {
  L.cat = cat = cat || L.cat || 'food'; const s = sv(), own = L.owned();
  const tabs = [['food', 'SNACKS'], ['toy', 'TOYS'], ['acc', 'OUTFITS'], ['furn', 'FURNITURE']];
  let h = head('\uD83C\uDF19 Moon Market \u00b7 \uD83E\uDE99 ' + s.coins) + '<div class="tabs">' + tabs.map((t) => '<button class="' + (t[0] === cat ? 'on' : '') + '" data-a="luTab" data-v="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
  h += '<div class="igrid shop">' + itemsOf(cat).map((k) => {
    const it = IT[k], have = s.inv[k] || 0, uniq = cat === 'toy' || cat === 'acc', done = uniq && have;
    const sub = cat === 'food' ? '+' + it.h + ' food' + (it.fav ? ' \u00b7 \u2764\uFE0F ' + it.fav.map((x) => ({ chinchilla: 'chinchillas', guineapig: 'guinea pigs', ferret: 'ferrets', rat: 'rats', hamster: 'hamsters', glider: 'gliders', fennec: 'foxes', bird: 'birds', bunny: 'bunnies' })[x]).join(', ') : '') + (have ? ' \u00b7 have ' + have : '') : cat === 'toy' ? '+' + it.f + ' fun per fetch' : cat === 'acc' ? it.slot + ' \u00b7 style +' + it.style : 'comfort +' + it.comfort + (have ? ' \u00b7 own ' + have : '');
    return '<div class="ibtn sh"><i>' + it.icon + '</i><b>' + esc(it.name) + '</b><small>' + esc(sub) + '</small>' + (done ? '<button class="btn small alt" disabled>OWNED</button>' : '<button class="btn small primary" data-a="luBuy" data-v="' + k + '"' + (s.coins < it.price || !own ? ' disabled' : '') + '>\uD83E\uDE99 ' + it.price + '</button>') + '</div>';
  }).join('') + '</div>' + (own ? '' : guestNote) + '<div class="btnrow"><button class="btn blue" data-a="luSalon">\uD83C\uDFA8 MOON SALON SKINS</button></div>';
  G.openPanel('luna_shop', h);
};
function buyItem(k) {
  const it = IT[k], s = sv(); if (!it || !L.owned()) return;
  if ((it.cat === 'toy' || it.cat === 'acc') && s.inv[k]) return;
  if (!G.spend(it.price)) return;
  s.inv[k] = (s.inv[k] || 0) + 1; Snd.fx('buy'); G.toast('\uD83C\uDF19 Bought ' + it.name + '!' + (it.cat === 'furn' ? ' Place it at home with DECOR.' : it.cat === 'acc' ? ' Dress a pet in CARE \u2192 DRESS.' : ''));
  G.persist(); L.shop(it.cat);
}
L.salon = function () {
  const s = sv(), own = L.owned(); if (!G.petById(L.salonPet)) L.salonPet = s.active[0] || (s.pets[0] && s.pets[0].id);
  const p = G.petById(L.salonPet); if (!p) { G.toast('You need a pet first!', true); return; }
  let h = head('\uD83C\uDFA8 Moon Salon \u00b7 \uD83E\uDE99 ' + s.coins) + '<div class="plist">' + s.pets.map((q) => '<button class="pchip' + (q.id === p.id ? ' on' : '') + '" data-a="luSalonPet" data-v="' + q.id + '">' + esc(q.name) + '</button>').join('') + '</div>';
  h += '<div class="infohead"><img class="pic big" src="' + G.portrait(G.petLook(p)) + '" alt=""><p class="sub">Give <b>' + esc(p.name) + '</b> a moonlit skin! \uD83E\uDE99 ' + SKIN_PRICE + ' each.</p></div><div class="btnrow">' + SKINS.map((k, i) => '<button class="vbtn" data-a="luSkin" data-v="' + i + '"' + (!own || s.coins < SKIN_PRICE ? ' disabled' : '') + '><i style="background:' + k[1] + ';box-shadow:inset -10px -6px 0 ' + k[2] + '"></i>' + esc(k[0]) + '</button>').join('') + '</div>' + (own ? '' : guestNote);
  G.openPanel('luna_salon', h);
};
function applySkin(i) {
  const p = G.petById(L.salonPet), k = SKINS[i]; if (!p || !k || !L.owned() || !G.spend(SKIN_PRICE)) return;
  p.col = [k[1], k[2]]; Snd.fx('sparkle'); G.toast('\u2728 ' + p.name + ' has the ' + k[0] + ' skin!'); G.persist(); G.syncLooks();
  const o = G.pet3d(p.id); if (o) W.fx('sparkle', o.x, o.P.hTop, o.z, 10, 0.8); L.salon();
}
L.nursery = function (sp) {
  const s = sv(), own = L.owned();
  if (!sp) {
    G.openPanel('luna_nursery', head('\uD83D\uDC3E Luna Nursery \u00b7 \uD83E\uDE99 ' + s.coins) + '<p class="sub">Five moonlight friends looking for a home!</p><div class="book">' + GP.LUNA_ORDER.map((k) => { const x = GP.SPECIES[k]; return '<button class="bcard" data-a="luSp" data-v="' + k + '"><img class="pic" src="' + portrait(k) + '" alt=""><b>' + esc(x.name) + '</b><span class="rar" style="--c:' + GP.RARITY[x.r].col + '">' + GP.RARITY[x.r].name + '</span><small>\uD83E\uDE99 ' + x.price + '</small></button>'; }).join('') + '</div>' + (own ? '' : guestNote));
    return;
  }
  const x = GP.SPECIES[sp]; if (!x || !x.dlc) return; L.sp = sp; const vi = L.vi || 0;
  G.openPanel('luna_adopt', head('\uD83D\uDC3E ' + esc(x.name)) + '<img class="pic big" src="' + portrait(sp, vi) + '" alt=""><div><span class="rar" style="--c:' + GP.RARITY[x.r].col + '">' + GP.RARITY[x.r].name + '</span></div><p class="sub">Choose a color:</p><div class="btnrow">' + x.vars.map((v, i) => '<button class="vbtn' + (i === vi ? ' on' : '') + '" data-a="luVar" data-v="' + i + '"><i style="background:' + v[1] + ';box-shadow:inset -10px -6px 0 ' + v[2] + '"></i>' + esc(v[0]) + '</button>').join('') + '</div><div class="btnrow"><button class="btn alt" data-a="luBack">BACK</button>' + (own ? '<button class="btn primary" data-a="luAdopt"' + (s.coins < x.price ? ' disabled' : '') + '>ADOPT \u00b7 \uD83E\uDE99 ' + x.price + '</button>' : '<button class="btn green" data-a="luCuddle">\uD83D\uDC96 CUDDLE</button>') + '</div>' + (own ? '' : guestNote));
};
function adopt() {
  const x = GP.SPECIES[L.sp]; if (!x || !L.owned() || !G.spend(x.price)) return;
  const p = G.makePet(L.sp, L.vi || 0, G.randName()); G.addPet(p); Snd.fx('learn');
  G.openPanel('name', head('\uD83D\uDC96 Adopted!') + '<img class="pic big" src="' + G.portrait(G.petLook(p)) + '" alt=""><p class="sub">Give your new pet a name:</p><div class="row"><input id="petNameIn" maxlength="12" value="' + esc(p.name) + '"><button class="btn primary" data-a="nameGo" data-v="' + p.id + '">DONE</button></div>');
}
function cuddle() { const A = grove, o = A && A.nursery.find((q) => q.sp === L.sp); G.closePanel(); if (o) { o.P.play('happy', 2); W.fx('heart', o.x, o.P.hTop + 0.2, o.z, 8, 0.6); } Snd.fx(GP.SPECIES[L.sp].snd); G.toast('\uD83D\uDC96 The ' + GP.SPECIES[L.sp].name + ' loves you!'); }
L.wish = function () {
  const s = sv(); if (s.coins < 5) { G.toast('A wish costs 5 coins!', true); Snd.fx('no'); return; }
  s.coins -= 5; const r = Math.random(), own = L.owned(); let msg;
  if (r < 0.45) { const c = 6 + Math.floor(Math.random() * 20); G.addCoins(c); msg = '\uD83E\uDE99 The moon wished back ' + c + ' coins!'; }
  else if (r < 0.8) { const k = own ? (Math.random() < 0.5 ? 'mooncheese' : 'starberries') : 'kibble'; s.inv[k] = (s.inv[k] || 0) + 1; msg = '\uD83C\uDF81 A ' + GP.ITEMS[k].name + ' floated out of the pond!'; }
  else if (r < 0.95 || !own) { s.inv[own ? 'stardust' : 'cupcake'] = (s.inv[own ? 'stardust' : 'cupcake'] || 0) + 1; msg = '\u2728 Wish granted: a ' + GP.ITEMS[own ? 'stardust' : 'cupcake'].name + '!'; }
  else { const opts = itemsOf('acc').filter((k) => !s.inv[k]); if (opts.length) { const k = opts[Math.floor(Math.random() * opts.length)]; s.inv[k] = 1; msg = '\uD83C\uDF1F BIG WISH! You got the ' + IT[k].name + '!'; } else { G.addCoins(40); msg = '\uD83C\uDF1F BIG WISH! +40 coins'; } }
  G.persist(); Snd.fx('treasure'); W.fx('sparkle', 11, 1.8, 5.5, 14, 2.4); W.fx('coin', 11, 0.6, 7.4, 3, 0.8); G.toast(msg);
  s.stats.wishes = (s.stats.wishes || 0) + 1;
};
const CONST = ['the Great Bunny', 'the Sleepy Hamster', 'the Flying Glider', 'Luna\u2019s Tail', 'the Fennec Ears', 'the Big Bone', 'the Cosmic Chinchilla'];
L.scope = function () {
  const s = sv(), t = new Date().toDateString(); W.camOverride = { pos: new T.Vector3(-12, 3, 9), look: new T.Vector3(10, 24, -60) };
  const c = CONST[Math.floor(Math.random() * CONST.length)]; Snd.fx('sparkle');
  let msg = '\uD83D\uDD2D You spotted ' + c + '!'; if (s.lunaScope !== t) { s.lunaScope = t; G.addCoins(25); msg += ' +25 coins (first look today)'; G.persist(); }
  G.toast(msg); setTimeout(() => { W.camOverride = null; }, 2600);
};

/* panel buttons */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; const a = b.dataset.a, v = b.dataset.v;
  switch (a) {
    case 'luTeaser': L.teaser(); break;
    case 'luEnter': if (L.can()) go('luna'); break;
    case 'luTab': L.shop(v); break;
    case 'luBuy': buyItem(v); break;
    case 'luSalon': L.salon(); break;
    case 'luSalonPet': L.salonPet = +v; L.salon(); break;
    case 'luSkin': applySkin(+v); break;
    case 'luSp': L.vi = 0; L.nursery(v); break;
    case 'luVar': L.vi = +v; L.nursery(L.sp); break;
    case 'luBack': L.nursery(null); break;
    case 'luAdopt': adopt(); break;
    case 'luCuddle': cuddle(); break;
  }
});

/* ---------------- per-frame: unlock watch, host flag, fireflies, nursery, mushrooms ---------------- */
let wasCan = null, wasOwned = null;
function checkUnlock() {
  const own = L.owned(), can = L.can();
  if (wasOwned !== null && own && !wasOwned) { G.toast('\uD83C\uDF19 Luna Pack unlocked! The Moon Gate in the Pet Park is open.'); Snd.fx('learn'); }
  if (can !== wasCan) { refreshGate(); if (GS.panel === 'luna_teaser') L.teaser(); if (GS.panel === 'map') G.UI.map(); titleBadge(); }
  wasOwned = own; wasCan = can;
  // host shares ownership with the session so guests can play it
  const S = GS.S; if (S && GS.role !== 'client') { const want = own ? 1 : 0; if (!S.dlc || (S.dlc.luna || 0) !== want) { S.dlc = Object.assign({}, S.dlc || {}, { luna: want }); GS.dirty = true; } }
  // lost access (host left / no pack): back to the Pet Park
  if (!can && G.inGame() && (GS.me.area === 'luna' || GS.me.area === 'lunashop') && !GS.mg) { G.toast('The Moon Gate closed. Back to the Pet Park!', true); G.closePanel(); G.travel('town', false, [GATE.x, GATE.z + 2.2]); }
}
function titleBadge() {
  const el = $('lunaBadge'); if (!el) return; const own = L.owned();
  el.innerHTML = own ? '\uD83C\uDF19 LUNA PACK UNLOCKED!' : '\uD83C\uDF19 NEW DLC: LUNA PACK \uD83D\uDD12'; el.classList.toggle('own', own);
  if (own) el.removeAttribute('href'); else el.href = ARCADE;
}
setInterval(checkUnlock, 1000); addEventListener('storage', (e) => { if (!e.key || e.key === KEY || e.key === 'grokDLC.owned') checkUnlock(); });
L.check = checkUnlock;
const baseTick = W.tickFx;
W.tickFx = function (dt) {
  baseTick(dt);
  const A = grove; if (!A || W.cur !== A) { if (gateParts) { gateParts.swirl.rotation.z += dt * 1.4; gateParts.moon.rotation.y += dt * 0.6; if (gateParts.lock.visible) gateParts.lock.position.y = 1.9 + Math.sin(W.time * 2) * 0.06; } return; }
  const t = W.time, me = GS.me, inG = G.inGame() && me.area === 'luna';
  A.flies.forEach((o) => {
    if (o.off > 0) { o.off -= dt; if (o.off <= 0) placeFly(A, o); return; }
    o.t += dt; o.m.position.set(o.x + Math.sin(o.t * 0.9) * 0.6, 0.9 + Math.sin(o.t * 2.3) * 0.35, o.z + Math.cos(o.t * 0.7) * 0.6);
    o.m.scale.setScalar(0.09 * (0.7 + Math.abs(Math.sin(o.t * 3)) * 0.6));
    if (inG && G.freeToAct() && Math.hypot(o.m.position.x - me.x, o.m.position.z - me.z) < 0.9) {
      o.m.visible = false; o.off = 6; G.addCoins(2); W.fx('sparkle', o.m.position.x, o.m.position.y, o.m.position.z, 6, 0.4); Snd.fx('catch');
      const s = sv(); s.stats.fireflies = (s.stats.fireflies || 0) + 1; if (s.stats.fireflies % 10 === 0) G.toast('\u2728 ' + s.stats.fireflies + ' fireflies caught!');
    }
  });
  A.shrooms.forEach((q) => { const near = inG && Math.hypot(q.x - me.x, q.z - me.z) < 1.2 * q.s; q.sq += ((near ? 1 : 0) - q.sq) * Math.min(1, dt * 8); const k = 1 + Math.sin(t * 2 + q.x) * 0.03; q.m.scale.set(k + q.sq * 0.15, k - q.sq * 0.22, k + q.sq * 0.15); if (near && !q.was) Snd.fx('rub'); q.was = near; });
  if (A.wishOrb) A.wishOrb.position.y = Math.sin(t * 1.5) * 0.12;
  const nb = A.nb;
  A.nursery.forEach((o) => {
    o.wait -= dt;
    if (o.wait <= 0 && !o.tgt) { o.tgt = [nb[0] + Math.random() * (nb[1] - nb[0]), nb[2] + Math.random() * (nb[3] - nb[2])]; }
    let sp = 0;
    if (o.tgt) { const dx = o.tgt[0] - o.x, dz = o.tgt[1] - o.z, d = Math.hypot(dx, dz); if (d < 0.2) { o.tgt = null; o.wait = 1.5 + Math.random() * 3; if (Math.random() < 0.5) o.P.play(Math.random() < 0.5 ? 'happy' : 'sniff', 1.4); } else { const ty = Math.atan2(dx, dz); let a = ty - o.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); o.yaw += a * Math.min(1, dt * 6); if (Math.abs(a) < 0.6) { sp = 1.3; o.x += dx / d * sp * dt; o.z += dz / d * sp * dt; } } }
    o.P.g.position.set(o.x, 0.05, o.z); o.P.g.rotation.y = o.yaw; o.P.anim(dt, sp);
  });
};

/* title badge */
(function () {
  const foot = $('titleFoot'); if (!foot) return; const a = document.createElement('a'); a.id = 'lunaBadge'; a.className = 'lunaBadge'; a.target = '_blank'; a.rel = 'noopener'; foot.parentNode.insertBefore(a, foot); titleBadge();
})();
L.debug = () => ({ owned: L.owned(), can: L.can(), gate: gateParts && gateParts.h.label, flies: grove && grove.flies.filter((f) => f.m.visible).length, S: GS.S && GS.S.dlc });
})();
