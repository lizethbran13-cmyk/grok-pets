/* Grok Pets - ANIMAL CHAOS MODE (Suggestion Booth #5)
   You ARE the pet: knock things over, steal snacks and socks, tip the trash, leave muddy paw prints, hide the keys,
   confuse your owner, and escape Animal Control when the chaos gets too loud.
   Co-op is host-authoritative: the host (or the solo player) simulates owners, officers, objects, goals and scores and
   broadcasts a compact snapshot ({t:'cs'}) about 10x a second. Each player moves their own pet locally (sent with the
   normal position messages) and sends actions with G.doAct({k:'ch', ...}). */
(function () {
'use strict';
const GP = window.GP, G = GP.G, W = GP.W, MD = GP.MD, Snd = GP.Snd, T = window.THREE, GN = window.GrokNet;
const GS = G.GS, $ = (id) => document.getElementById(id), esc = GN.esc, clamp = GP.clamp, TAU = Math.PI * 2;
const CH = GP.Chaos = {};
const ang = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const yawOf = (dx, dz) => Math.atan2(dx, dz);
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const r2 = (v) => Math.round(v * 100) / 100;

/* ======================================================================
   Pets, abilities, levels
   ====================================================================== */
const ABIL = {
  bark: { name: 'BARK', icon: '\uD83D\uDCE2', cd: 7, desc: 'Startles everyone close by' },
  shell: { name: 'SHELL', icon: '\uD83D\uDEE1\uFE0F', cd: 9, dur: 3.5, desc: 'Hide in your shell: nobody can grab you' },
  sneak: { name: 'SNEAK', icon: '\uD83D\uDCA8', cd: 10, dur: 4.5, desc: 'Super sneaky: almost invisible for a while' },
  pounce: { name: 'POUNCE', icon: '\uD83D\uDCA5', cd: 6, desc: 'Big leap that knocks over everything near where you land' },
  mimic: { name: 'DING DONG', icon: '\uD83D\uDD14', cd: 12, desc: 'Copy the doorbell! Everyone runs to the front door' }
};
function petKit(sp, fam) {
  const k = (GP.SPECIES[sp] || GP.SPECIES.schnauzer).kind; let o;
  if (k === 'tortoise') o = { spd: 3.9, small: 0, lives: 2, ab: 'shell', heavy: 1, desc: 'Slow but tanky: a net needs 2 tries' };
  else if (k === 'rat' || k === 'hamster' || k === 'hedgehog') o = { spd: 5.5, small: 1, lives: 1, ab: 'sneak', desc: 'Tiny: squeezes through pet holes, hard to spot' };
  else if (k === 'bunny') o = { spd: 5.9, small: 1, lives: 1, ab: 'pounce', desc: 'Tiny and bouncy: squeezes through pet holes' };
  else if (k === 'cat') o = { spd: 5.9, small: 0, lives: 1, ab: 'pounce', desc: 'Nimble: loves knocking things off tables' };
  else if (k === 'bird') o = { spd: 5.6, small: 1, lives: 1, ab: 'mimic', desc: 'Small and chatty: a master of fake doorbells' };
  else o = { spd: 6.3, small: 0, lives: 1, ab: 'bark', desc: 'Fast runner with a big bark' };
  o.abName = ABIL[o.ab].name;
  if (o.ab === 'bark') o.abName = k === 'dragon' ? 'ROAR' : k === 'robodog' ? 'BEEP' : k === 'pony' ? 'NEIGH' : 'BARK';
  if (k === 'bunny') o.abName = 'HOP';
  o.perk = '';
  if (fam === 'candy') { o.spd += 0.3; o.barkR = 7.5; o.perk = 'Super bark: reaches extra far'; }
  if (fam === 'martina') { o.lives = 3; o.comboT = 6.5; o.perk = 'Slow and steady: 3 lives, longer combos'; }
  if (fam === 'luna') { o.sneakDur = 7; o.perk = 'Moon sneak: sneaks for much longer'; }
  if (fam === 'pirat') { o.loot = 1.5; o.perk = 'Pirate loot: stolen goodies score x1.5. Arr!'; }
  if (fam === 'snowie') { o.spd += 0.5; o.perk = 'Snow zoom: the fastest rat in town'; }
  return o;
}
const LV = [
  { id: 1, name: 'Puppy Prank', icon: '\uD83C\uDF6A', time: 120, ownerSpd: 3.0, heat: 0.45, owners: 1, ofc: 1, intro: 'Your first mess! Knock things over and grab a snack.', goals: [['knock', 3], ['steal', 1], ['score', 400]] },
  { id: 2, name: 'Sock Bandit', icon: '\uD83E\uDDE6', time: 140, ownerSpd: 3.2, heat: 0.6, owners: 1, ofc: 1, intro: 'Socks are the best toys. Muddy paws are the best art.', goals: [['sock', 3], ['prints', 15], ['confuse', 2]] },
  { id: 3, name: 'Key Caper', icon: '\uD83D\uDD11', time: 150, ownerSpd: 3.4, heat: 0.75, owners: 1, ofc: 1, intro: 'Hide the keys and watch your owner search!', goals: [['keys', 1], ['tip', 2], ['slip', 1]] },
  { id: 4, name: 'Blame Game', icon: '\uD83D\uDC31', time: 150, ownerSpd: 3.5, heat: 0.85, owners: 2, ofc: 2, blame: 1, intro: 'Grandma is visiting! Make Mr. Fluff take the blame.', goals: [['blame', 1], ['combo', 3], ['score', 1200]] },
  { id: 5, name: 'Great Escape', icon: '\uD83D\uDE90', time: 160, ownerSpd: 3.6, heat: 1.3, owners: 2, ofc: 2, cake: 1, acCall: 55, intro: 'Birthday cake + Animal Control = the great escape!', goals: [['escape', 1], ['cake', 1], ['score', 1500]] },
  { id: 6, name: 'Chaos Champion', icon: '\uD83C\uDFC6', time: 180, ownerSpd: 3.8, heat: 1.1, owners: 2, ofc: 3, cake: 1, acCall: 70, intro: 'The ultimate mess. Go wild!', goals: [['score', 2500], ['combo', 3], ['escape', 1]] }
];
const lvDef = (id) => LV.find((l) => l.id === +id) || LV[0];
function goalText(g, need) {
  switch (g[0]) {
    case 'knock': return 'Knock over ' + need + ' things';
    case 'steal': return need > 1 ? 'Steal ' + need + ' snacks' : 'Steal a snack';
    case 'sock': return 'Steal ' + need + ' socks or shoes';
    case 'score': return 'Reach ' + need + ' chaos points';
    case 'prints': return 'Leave ' + need + ' muddy paw prints inside';
    case 'confuse': return 'Confuse your owner ' + need + ' times';
    case 'keys': return 'Hide the owner\u2019s keys';
    case 'tip': return 'Tip over ' + need + ' trash cans';
    case 'slip': return 'Make someone slip';
    case 'blame': return 'Get Mr. Fluff blamed for a mess';
    case 'combo': return 'Hit a x' + need + ' combo';
    case 'escape': return 'Escape Animal Control';
    case 'cake': return 'Steal the birthday cake';
  }
  return '';
}
const GOALHINT = { knock: 'Walk up to a vase, lamp or plates and tap KNOCK!', steal: 'Snacks: cookie jar, pizza, candy bowl.', sock: 'Socks are in the bedroom and on the washing line. Shoes are by the front door.', prints: 'Step in the backyard mud, then run inside!', confuse: 'Make noise, then hide before your owner arrives.', keys: 'Grab the keys in the hall, then hide them in a hiding spot.', tip: 'Trash cans: kitchen, backyard and the front yard.', slip: 'Spill water or knock the fruit bowl, then lure someone over it.', blame: 'Make a mess and hide. Your owner might blame Mr. Fluff the cat!', combo: 'Do messes quickly, one after another!', escape: 'When the van comes, hide or run HOME until it drives away.', cake: 'The cake is on the living room coffee table.', score: 'Every mess scores. Combos score more!' };

/* ======================================================================
   Map: a cutaway house (kitchen, living room, bedroom, bathroom, hall), backyard, front yard + street
   ====================================================================== */
// rooms: K kitchen, L living, B bedroom, T bathroom, H hall, Y backyard, F front yard, W/E side paths
function roomAt(x, z) {
  if (z < -10) return 'Y'; if (z > 4) return 'F'; if (x < -14) return 'W'; if (x > 14) return 'E';
  if (z < -3) return x < -3 ? 'K' : 'L';
  return x < -3 ? 'B' : x < 4 ? 'T' : 'H';
}
const ROOMNAME = { K: 'Kitchen', L: 'Living Room', B: 'Bedroom', T: 'Bathroom', H: 'Hall', Y: 'Backyard', F: 'Front Yard', W: 'Side Path', E: 'Side Path' };
const inHouse = (x, z) => x > -14 && x < 14 && z > -10 && z < 4;
// doors people can use: [roomA, roomB, x, z, axis] (axis 'z' = the wall runs along x, so you cross it in z)
const DOORS = [['K', 'Y', -8, -10, 'z'], ['K', 'L', -3, -6.5, 'x'], ['K', 'B', -9, -3, 'z'], ['L', 'T', 0.5, -3, 'z'], ['L', 'H', 9, -3, 'z'], ['T', 'H', 4, 1, 'x'], ['H', 'F', 9, 4, 'z'],
  ['Y', 'W', -15, -10, 'z'], ['W', 'F', -15, 4, 'z'], ['Y', 'E', 15, -10, 'z'], ['E', 'F', 15, 4, 'z']];
function route(a, b) { // BFS over rooms -> list of door crossings [{pre:[x,z], post:[x,z]}]
  if (a === b) return [];
  const prev = {}; prev[a] = null; const q = [a];
  while (q.length) { const r = q.shift(); if (r === b) break; DOORS.forEach((d) => { const n = d[0] === r ? d[1] : d[1] === r ? d[0] : null; if (n && !(n in prev)) { prev[n] = { r, d }; q.push(n); } }); }
  if (!(b in prev)) return [];
  const out = []; let cur = b;
  while (prev[cur]) { const { r, d } = prev[cur]; const o = 0.95; let p1, p2;
    if (d[4] === 'z') { p1 = [d[2], d[3] - o]; p2 = [d[2], d[3] + o]; } else { p1 = [d[2] - o, d[3]]; p2 = [d[2] + o, d[3]]; }
    if (roomAt(p1[0], p1[1]) !== r) { const t = p1; p1 = p2; p2 = t; }
    out.unshift({ pre: p1, post: p2 }); cur = r; }
  return out;
}
// [id, type, sub, x, z, y, pts, model, flag]
const OBJ_DEFS = [
  ['cookie', 'steal', 'snack', -12, -9.4, 0.92, 60, 'cookie'], ['plates', 'knock', '', -10.4, -9.4, 0.92, 45, 'plates'], ['fruit', 'knock', 'banana', -5.5, -9.4, 0.92, 35, 'fruit'],
  ['pizza', 'steal', 'snack', -8.5, -5.6, 0.8, 70, 'pizza'], ['bowl', 'spill', 'water', -4.6, -4.3, 0, 30, 'bowl'], ['ktrash', 'tip', '', -3.8, -9.3, 0, 50, 'trash'],
  ['vase', 'knock', '', 0, -9.2, 0.9, 40, 'vase'], ['books', 'knock', '', 10.2, -9.15, 0.95, 40, 'books'], ['lamp', 'knock', '', 12.8, -6, 0, 35, 'lamp'],
  ['plant', 'knock', 'mud', -1.8, -4.1, 0, 40, 'plant'], ['candy', 'steal', 'snack', 5, -6.3, 0.52, 50, 'candy', 'nocake'], ['cake', 'steal', 'cake', 5, -6.3, 0.52, 150, 'cake', 'cake'],
  ['cushion', 'scatter', '', 5, -9.0, 0.55, 35, 'cushion'],
  ['sock1', 'steal', 'sock', -5.8, -1.1, 0, 45, 'sock'], ['sock2', 'steal', 'sock', -4.4, -2.1, 0, 45, 'sock'], ['sock3', 'steal', 'sock', -4.2, -0.9, 0, 45, 'sock'],
  ['pillow', 'scatter', '', -11.1, -1.0, 0.62, 30, 'pillow'], ['clock', 'knock', '', -13.3, 1.55, 0.62, 30, 'clock'],
  ['tp', 'unroll', '', 2.4, -2.6, 0.45, 45, 'tp'], ['soap', 'knock', 'water', -2.55, -0.4, 0.58, 30, 'soap'], ['towel', 'knock', '', 3.7, -0.9, 0.95, 30, 'towel'],
  ['keys', 'keys', '', 13.3, -1, 0.82, 20, 'keys'], ['shoes', 'steal', 'sock', 11.6, 3.3, 0, 40, 'shoes'], ['coat', 'knock', '', 6.5, 3.3, 0, 35, 'coat'], ['mail', 'shred', '', 7.6, 2.4, 0, 40, 'mail'],
  ['ytrash1', 'tip', '', -13, -11.6, 0, 50, 'trash'], ['ytrash2', 'tip', '', -11.6, -11.6, 0, 50, 'trash'], ['flowers', 'dig', '', -4, -17.3, 0, 40, 'flowerbed'],
  ['lsock1', 'steal', 'sock', -3, -12.2, 1.05, 45, 'hsock'], ['lsock2', 'steal', 'sock', -1.4, -12.2, 1.05, 45, 'hsock'], ['gnome', 'knock', '', 8, -12, 0, 30, 'gnome'], ['birdbath', 'spill', 'water', -8, -15, 0, 30, 'birdbath'],
  ['mailbox', 'knock', '', 12.5, 9.6, 0, 35, 'mailbox'], ['bin', 'tip', '', -12.5, 9.4, 0, 50, 'trash'], ['pots', 'knock', '', 7.0, 5.0, 0, 30, 'pots']
];
const PUD_AT = { fruit: [-5.5, -8.35, 'b'], bowl: [-4.6, -3.75, 'w'], soap: [-2.0, -0.4, 'w'], birdbath: [-8, -14.1, 'w'], plant: [-1.7, -4.9, 'm'] };
const HIDES = [
  { n: 'under the kitchen table', x: -8.5, z: -5.6, r: 0.85 }, { n: 'behind the sofa', x: 7.35, z: -9.15, r: 0.75 }, { n: 'under the bed', x: -10.05, z: -1.0, r: 0.75 },
  { n: 'in the laundry basket', x: -5.0, z: -1.6, r: 0.55 }, { n: 'behind the curtain', x: -1.1, z: 1.95, r: 0.75 },
  { n: 'in the bushes', x: -14.4, z: -17.6, r: 1.0 }, { n: 'in the bushes', x: 6, z: -17.9, r: 1.0 }, { n: 'in the hedge', x: -6, z: 8.9, r: 1.0 }, { n: 'in the hedge', x: 4, z: 8.9, r: 1.0 },
  { n: 'home in the dog house', x: 12, z: -13.9, r: 1.05, home: 1 }, { n: 'home in your pet bed', x: -6, z: 2.6, r: 1.0, home: 1 }
];
const MUD_PIT = [3, -14.5, 1.15];
const CHORES = [[-9, -8.2, 'Washing the dishes\u2026'], [-6.5, -4.9, 'Making a snack\u2026'], [2.2, -6, 'Watching TV\u2026'], [8, -7, 'Reading a book\u2026'], [-8, 1.6, 'Folding laundry\u2026'],
  [1.6, 0.4, 'Brushing my teeth\u2026'], [10, 1.2, 'Sorting the mail\u2026'], [-2, -14, 'Watering the plants\u2026'], [9.5, -4.4, 'Vacuuming\u2026']];
const PATROL = [[-6, -6.5], [6, -6], [-8, 0.5], [0.5, 0.5], [9, 0.5], [0, -14.5], [0, 7.5], [-11, -15], [11, 7], [10, -12]];
const FLUFF = [1.9, -8.95], PEN = [12.6, -8.2], VAN_Z = 12.4, VAN_X = 5.5, VAN_DOOR = [2.6, 12.4], DOOR_IN = [9, 2.6];
const SPAWN = [[-6, 1.5], [-4.8, 1.9], [-7.2, 1.9]];
const VERB = { knock: 'KNOCK!', steal: 'STEAL!', tip: 'TIP!', spill: 'SPILL!', dig: 'DIG!', unroll: 'UNROLL!', shred: 'SHRED!', scatter: 'MESS UP!', keys: 'GRAB KEYS' };
const SAYS = { knock: 'CRASH!', scatter: 'What a mess!', snack: 'Yum!', cake: 'CAKE!!', sock: 'Sock stolen!', tip: 'Trash party!', spill: 'Splash!', dig: 'Dig dig dig!', unroll: 'Wheee!', shred: 'Shred!' };

let A = null, WALLS = [], SMALL = [], OBJS = [], DYN = null, ringMat = null;
function tileTex(a, b, n) { const t = W.canvasTex(64, 64, (g) => { g.fillStyle = a; g.fillRect(0, 0, 64, 64); g.fillStyle = b; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32); }); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(n[0], n[1]); return t; }
function buildArea() {
  if (A) return A;
  A = { id: 'chaos', g: new T.Group(), walk: [[-16, 16, -19, 14]], obs: [], hots: [], ground: [], spawn: [0, 0], cam: { h: 9.5, d: 8 }, bg: '#a8e6ff', fog: [42, 95], label: 'Animal Chaos' };
  A.zone = (x, z) => ROOMNAME[roomAt(x, z)];
  A.g.visible = false; W.scene.add(A.g); W.areas.chaos = A;
  const g = A.g, box = MD.box, cyl = MD.cyl, sph = MD.sph, grp = MD.grp;
  const ob = (x0, x1, z0, z1) => { const o = { t: 'b', x0, x1, z0, z1 }; A.obs.push(o); return o; };
  const oc = (x, z, r) => { const o = { t: 'c', x, z, r }; A.obs.push(o); return o; };
  const flat = (w, d, col, x, z, y, tex) => { const m = new T.Mesh(MD.G.box, tex ? new T.MeshLambertMaterial({ map: tex }) : MD.M(col)); m.scale.set(w, 0.04, d); m.position.set(x, (y || 0.02) - 0.02, z); g.add(m); A.ground.push(m); return m; };
  // ground, street, floors
  const grass = new T.Mesh(MD.G.plane, MD.M('#86d97a')); grass.rotation.x = -Math.PI / 2; grass.scale.set(120, 120, 1); grass.position.set(0, 0, -3); g.add(grass); A.ground.push(grass);
  flat(80, 4.2, '#6b7280', 0, 12.6, 0.02); flat(80, 0.5, '#e5e7eb', 0, 10.3, 0.03); for (let x = -30; x < 30; x += 4) flat(2, 0.15, '#fde047', x, 12.6, 0.035);
  flat(2.2, 6, '#e7d7b5', 9, 7.3, 0.03); flat(2.2, 2.5, '#e7d7b5', -8, -11.3, 0.03);
  flat(11, 7, null, -8.5, -6.5, 0.04, tileTex('#f8fafc', '#dbeafe', [6, 4]));
  flat(17, 7, '#e9c48f', 5.5, -6.5, 0.04); flat(7.5, 5, '#c4b5fd', 5.5, -6.3, 0.05);
  flat(11, 7, '#fbcfe8', -8.5, 0.5, 0.04); flat(7, 7, null, 0.5, 0.5, 0.04, tileTex('#ecfeff', '#a5f3fc', [4, 4])); flat(10, 7, '#e2b47a', 9, 0.5, 0.04);
  // walls (cutaway dollhouse height). gaps: [a, b, small] small = pet hole only small pets fit through
  const WALLC = '#fde7c4';
  function wall(x0, z0, x1, z1, gaps) {
    const horiz = z0 === z1, a0 = horiz ? x0 : z0, a1 = horiz ? x1 : z1, pieces = []; let cur = a0;
    (gaps || []).slice().sort((p, q) => p[0] - q[0]).forEach((q) => { if (q[0] > cur) pieces.push([cur, q[0], 0]); if (q[2]) pieces.push([q[0], q[1], 1]); cur = q[1]; });
    if (cur < a1) pieces.push([cur, a1, 0]);
    pieces.forEach((p) => {
      const s0 = p[0] - (!p[2] && p[0] === a0 ? 0.15 : 0), s1 = p[1] + (!p[2] && p[1] === a1 ? 0.15 : 0); // only the outer ends overlap the corners
      const L = s1 - s0, c = (s0 + s1) / 2, cx = horiz ? c : x0, cz = horiz ? z0 : c, w = horiz ? L : 0.3, d = horiz ? 0.3 : L;
      const o = ob(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2);
      if (p[2]) { box(w, 0.55, d, WALLC, g, cx, 0.875, cz);
        const s = W.textSprite('\uD83D\uDC2D', { size: 30, h: 0.34, bg: 'rgba(255,255,255,.9)', border: '#a78bfa' }); s.position.set(cx, 1.45, cz); g.add(s); o.small = 1; SMALL.push(o); }
      else { box(w, 1.15, d, WALLC, g, cx, 0.575, cz); box(w + 0.03, 0.07, d + 0.03, '#ffffff', g, cx, 1.18, cz); }
      WALLS.push(o);
    });
  }
  wall(-14, -10, 14, -10, [[-9, -7], [8.2, 8.9, 1]]); wall(-14, 4, 14, 4, [[8, 10], [-9.4, -8.7, 1]]);
  wall(-14, -10, -14, 4); wall(14, -10, 14, 4);
  wall(-14, -3, 14, -3, [[-10, -8], [-5.3, -4.6, 1], [-0.5, 1.5], [8, 10]]);
  wall(-3, -10, -3, -3, [[-7.5, -5.5]]); wall(-3, -3, -3, 4, [[1, 1.7, 1]]); wall(4, -3, 4, 4, [[0, 2]]);
  // fences
  MD.fence(g, -16, -19, 16, -19); MD.fence(g, -16, -19, -16, 10.1); MD.fence(g, 16, -19, 16, 10.1);
  // kitchen
  box(4.25, 0.9, 0.9, '#f1f5f9', g, -11.72, 0.45, -9.4); box(4.3, 0.06, 0.95, '#94a3b8', g, -11.72, 0.92, -9.4); ob(-13.85, -9.6, -9.85, -8.95);
  box(1.8, 0.9, 0.9, '#f1f5f9', g, -5.5, 0.45, -9.4); box(1.85, 0.06, 0.95, '#94a3b8', g, -5.5, 0.92, -9.4); ob(-6.4, -4.6, -9.85, -8.95);
  box(1.15, 2.0, 1.4, '#e2e8f0', g, -13.27, 1.0, -6.9); box(0.05, 0.5, 0.06, '#64748b', g, -12.68, 1.3, -6.5); ob(-13.85, -12.7, -7.6, -6.2);
  box(2, 0.08, 1.3, '#c2410c', g, -8.5, 0.76, -5.6); [[-9.35, -6.1], [-7.65, -6.1], [-9.35, -5.1], [-7.65, -5.1]].forEach((q) => { box(0.08, 0.74, 0.08, '#7c2d12', g, q[0], 0.37, q[1]); oc(q[0], q[1], 0.06); });
  // living room
  const sofa = MD.furn('sofa'); sofa.position.set(5, 0, -9.15); sofa.scale.set(1.2, 1, 1); g.add(sofa); ob(3.45, 6.55, -9.85, -8.55);
  const ct = MD.furn('table'); ct.position.set(5, 0, -6.3); g.add(ct); ob(4.25, 5.75, -6.75, -5.85);
  const bs = MD.furn('bookshelf'); bs.position.set(10.2, 0, -9.55); bs.scale.set(1.35, 1, 1); g.add(bs); ob(9.05, 11.35, -9.85, -9.25);
  const tv = MD.furn('tv'); tv.position.set(5, 0, -3.45); tv.rotation.y = Math.PI; g.add(tv); ob(3.95, 6.05, -3.75, -3.15);
  cyl(0.3, 0.9, '#e5e7eb', g, 0, 0.45, -9.2); oc(0, -9.2, 0.32); oc(12.8, -6, 0.25); oc(-1.8, -4.1, 0.33);
  const pen = grp(g, PEN[0], 0, PEN[1]); flat(1.7, 1.7, '#bbf7d0', PEN[0], PEN[1], 0.06); MD.fence(pen, -0.85, -0.85, 0.85, -0.85, '#fbcfe8'); MD.fence(pen, 0.85, -0.85, 0.85, 0.85, '#fbcfe8'); MD.fence(pen, -0.85, -0.85, -0.85, 0.3, '#fbcfe8');
  const ps = W.textSprite('TIME-OUT', { size: 28, h: 0.32, bg: 'rgba(220,38,38,.9)' }); ps.position.set(PEN[0], 1.25, PEN[1] - 0.85); g.add(ps);
  cyl(0.45, 0.08, '#f472b6', g, FLUFF[0], 0.04, FLUFF[1]);
  // bedroom
  box(3.25, 0.5, 2.8, '#a16207', g, -12.22, 0.25, -1.0); box(3.1, 0.18, 2.7, '#ffffff', g, -12.22, 0.55, -1.0); box(2.2, 0.08, 2.72, '#f472b6', g, -11.8, 0.66, -1.0); box(0.15, 1.1, 2.8, '#92400e', g, -13.78, 0.55, -1.0); ob(-13.85, -10.6, -2.4, 0.4);
  box(0.95, 0.6, 0.9, '#b45309', g, -13.37, 0.3, 1.55); ob(-13.85, -12.9, 1.1, 2.0);
  box(1.7, 1.8, 0.55, '#c084fc', g, -6.75, 0.9, -2.57); ob(-7.6, -5.9, -2.85, -2.3);
  const basket = grp(g, -5.0, 0, -1.6); cyl(0.42, 0.5, '#d6b48a', basket, 0, 0.25, 0); cyl(0.36, 0.52, '#a3794f', basket, 0, 0.27, 0);
  const pb = MD.furn('petbed'); pb.position.set(-6, 0, 2.6); pb.scale.setScalar(1.25); g.add(pb);
  // bathroom
  box(3.15, 0.65, 1.35, '#f8fafc', g, -1.27, 0.33, 3.17); box(2.85, 0.06, 1.05, '#7dd3fc', g, -1.27, 0.64, 3.17); ob(-2.85, 0.3, 2.5, 3.85);
  const cur = box(0.06, 1.4, 1.2, '#f9a8d4', g, 0.25, 1.25, 1.95); void cur; box(0.06, 0.06, 2.3, '#94a3b8', g, 0.25, 1.95, 2.6);
  cyl(0.38, 0.45, '#ffffff', g, 3.2, 0.22, -2.2); box(0.7, 0.6, 0.3, '#ffffff', g, 3.2, 0.55, -2.65); oc(3.2, -2.2, 0.42);
  box(1.2, 0.85, 0.55, '#e0f2fe', g, 2.0, 0.42, 3.55); ob(1.4, 2.6, 3.3, 3.85);
  box(0.5, 0.55, 0.75, '#fbcfe8', g, -2.6, 0.28, -0.4); ob(-2.85, -2.35, -0.8, 0.0);
  box(0.05, 0.05, 0.7, '#94a3b8', g, 3.82, 0.97, -0.9);
  // hall
  box(0.95, 0.8, 1.2, '#92400e', g, 13.35, 0.4, -1); ob(12.85, 13.85, -1.6, -0.4); oc(6.5, 3.3, 0.24);
  box(1.4, 0.03, 0.9, '#16a34a', g, 9, 0.06, 3.3);
  // backyard
  oc(-13, -11.6, 0.42); oc(-11.6, -11.6, 0.42); oc(-8, -15, 0.38); oc(8, -12, 0.22);
  [-4.4, 0].forEach((x) => { cyl(0.05, 1.6, '#78350f', g, x, 0.8, -12.2); oc(x, -12.2, 0.08); }); box(4.4, 0.03, 0.03, '#f8fafc', g, -2.2, 1.45, -12.2);
  const dh = grp(g, 12, 0, -15.7); box(2, 1.4, 1.8, '#c2410c', dh, 0, 0.7, 0); const rf = MD.mesh(MD.G.cone4, '#7c2d12', dh, 0, 1.85, 0, 1.6, 0.9, 1.5); rf.rotation.y = Math.PI / 4; box(0.8, 0.9, 0.05, '#3b1d0b', dh, 0, 0.45, 0.91); ob(11, 13, -16.6, -14.8);
  const dn = W.textSprite('\uD83C\uDFE0 HOME', { size: 30, h: 0.36, bg: 'rgba(34,197,94,.92)' }); dn.position.set(12, 2.6, -15.7); g.add(dn);
  const bn = W.textSprite('\uD83C\uDFE0 HOME', { size: 30, h: 0.36, bg: 'rgba(34,197,94,.92)' }); bn.position.set(-6, 1.35, 2.6); g.add(bn);
  flat(3.4, 1.3, '#7c4a1e', -4, -17.3, 0.05); MD.fence(g, -5.7, -16.65, -2.3, -16.65, '#a16207');
  const mud = new T.Mesh(MD.G.circle, MD.M('#6b4423')); mud.rotation.x = -Math.PI / 2; mud.scale.set(MUD_PIT[2] * 1.15, MUD_PIT[2] * 0.85, 1); mud.position.set(MUD_PIT[0], 0.05, MUD_PIT[1]); g.add(mud);
  const ms = W.textSprite('MUD', { size: 26, h: 0.28, bg: 'rgba(107,68,35,.9)' }); ms.position.set(MUD_PIT[0], 0.7, MUD_PIT[1] - 1.1); g.add(ms);
  MD.tree(g, -13.5, -14.5, 1.1); oc(-13.5, -14.5, 0.4); MD.tree(g, 14, -17.5, 1.0); oc(14, -17.5, 0.4);
  [[-14.4, -17.6], [6, -17.9]].forEach((q) => { MD.bush(g, q[0] - 0.6, q[1] - 0.2, 0.9); MD.bush(g, q[0] + 0.7, q[1] - 0.3, 0.8); });
  // front yard
  [[-6, 8.9], [4, 8.9]].forEach((q) => { box(2.6, 0.9, 0.7, '#15803d', g, q[0], 0.45, q[1] + 0.85); MD.bush(g, q[0] - 1.1, q[1] + 0.6, 0.7); });
  oc(12.5, 9.6, 0.22); oc(-12.5, 9.4, 0.42); oc(7, 5, 0.3);
  MD.tree(g, -13.5, 6.5, 1.1); oc(-13.5, 6.5, 0.4); MD.tree(g, 13.6, 6.2, 1.0); oc(13.6, 6.2, 0.4);
  // hide spot + home rings
  ringMat = new T.MeshBasicMaterial({ color: '#a78bfa', transparent: true, opacity: 0.55, depthWrite: false });
  const homeMat = new T.MeshBasicMaterial({ color: '#facc15', transparent: true, opacity: 0.75, depthWrite: false });
  HIDES.forEach((h) => { const r = new T.Mesh(MD.G.ring, h.home ? homeMat : ringMat); r.rotation.x = Math.PI / 2; r.scale.set(h.r, h.r, h.r); r.position.set(h.x, 0.08, h.z); r.renderOrder = 2; g.add(r); });
  // chaos objects
  OBJS = OBJ_DEFS.map((d, i) => {
    const o = { i, id: d[0], type: d[1], sub: d[2], x: d[3], z: d[4], y: d[5], pts: d[6], model: d[7], flag: d[8] || '', reach: 1.5, vs: null };
    o.g = model(d[7]); o.g.position.set(o.x, o.y, o.z); g.add(o.g);
    o.home = { p: o.g.position.clone(), r: o.g.rotation.clone() };
    o.mess = messFor(o); if (o.mess) { o.mess.visible = false; g.add(o.mess); }
    return o;
  });
  DYN = new T.Group(); g.add(DYN);
  return A;
}
function model(k) {
  const g = new T.Group(), box = MD.box, cyl = MD.cyl, sph = MD.sph, ell = MD.ell, cone = MD.cone;
  switch (k) {
    case 'cookie': cyl(0.2, 0.36, '#fde68a', g, 0, 0.18, 0); cyl(0.21, 0.06, '#b45309', g, 0, 0.39, 0); sph(0.05, '#92400e', g, 0, 0.45, 0); break;
    case 'plates': for (let i = 0; i < 5; i++) cyl(0.24, 0.035, i % 2 ? '#ffffff' : '#bfdbfe', g, 0, 0.02 + i * 0.04, 0); break;
    case 'fruit': { const b = MD.mesh(MD.G.hemi, '#f97316', g, 0, 0.18, 0, 0.26, 0.18, 0.26); b.rotation.x = Math.PI; sph(0.08, '#ef4444', g, -0.08, 0.21, 0); sph(0.08, '#22c55e', g, 0.08, 0.22, 0.03); ell(0.05, 0.05, 0.17, '#facc15', g, 0, 0.27, -0.02).rotation.y = 0.6; break; }
    case 'pizza': cyl(0.32, 0.04, '#f59e0b', g, 0, 0.02, 0); cyl(0.27, 0.045, '#fde047', g, 0, 0.025, 0); [[0.1, 0.05], [-0.1, 0.08], [0, -0.12], [0.14, -0.1]].forEach((q) => cyl(0.05, 0.05, '#dc2626', g, q[0], 0.03, q[1])); break;
    case 'bowl': cyl(0.24, 0.1, '#60a5fa', g, 0, 0.05, 0); cyl(0.19, 0.105, '#e0f2fe', g, 0, 0.055, 0); break;
    case 'trash': cyl(0.36, 0.85, '#64748b', g, 0, 0.425, 0); cyl(0.4, 0.07, '#94a3b8', g, 0, 0.88, 0); box(0.18, 0.06, 0.06, '#475569', g, 0, 0.94, 0); break;
    case 'vase': sph(0.17, '#3b82f6', g, 0, 0.18, 0); cyl(0.08, 0.2, '#60a5fa', g, 0, 0.4, 0); [[-0.06, 0], [0.06, 0.03], [0, -0.05]].forEach((q, i) => sph(0.06, ['#f472b6', '#facc15', '#ffffff'][i], g, q[0], 0.55, q[1])); break;
    case 'books': for (let i = 0; i < 6; i++) box(0.13, 0.34, 0.26, ['#ef4444', '#3b82f6', '#22c55e', '#facc15', '#a855f7', '#f97316'][i], g, -0.4 + i * 0.16, 0.17, 0); break;
    case 'lamp': g.add(MD.furn('lamp')); break;
    case 'plant': g.add(MD.furn('plant')); break;
    case 'candy': { const b = MD.mesh(MD.G.hemi, '#f472b6', g, 0, 0.16, 0, 0.24, 0.16, 0.24); b.rotation.x = Math.PI; for (let i = 0; i < 6; i++) sph(0.055, ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#fff'][i], g, Math.cos(i) * 0.12, 0.2, Math.sin(i) * 0.12); break; }
    case 'cake': cyl(0.34, 0.22, '#f9a8d4', g, 0, 0.11, 0); cyl(0.24, 0.18, '#fbcfe8', g, 0, 0.31, 0); [-0.1, 0, 0.1].forEach((x) => { cyl(0.016, 0.14, '#60a5fa', g, x, 0.47, 0); sph(0.03, MD.M('#facc15', { emissive: '#b45309' }), g, x, 0.56, 0); }); break;
    case 'cushion': box(0.75, 0.2, 0.55, '#fde047', g, -0.5, 0.1, 0); box(0.75, 0.2, 0.55, '#a78bfa', g, 0.5, 0.1, 0); break;
    case 'sock': { const c = pick(['#ef4444', '#3b82f6', '#22c55e', '#a855f7']); box(0.12, 0.07, 0.34, c, g, 0, 0.035, 0); box(0.12, 0.07, 0.16, c, g, 0.08, 0.035, 0.16); box(0.125, 0.075, 0.06, '#ffffff', g, 0, 0.036, -0.12); g.scale.setScalar(1.3); break; }
    case 'hsock': { const c = pick(['#f97316', '#ec4899', '#14b8a6']); box(0.12, 0.34, 0.06, c, g, 0, -0.17, 0); box(0.12, 0.08, 0.18, c, g, 0, -0.32, 0.06); box(0.125, 0.06, 0.065, '#ffffff', g, 0, -0.04, 0); break; }
    case 'pillow': ell(0.42, 0.12, 0.28, '#ffffff', g, 0, 0.12, 0); break;
    case 'clock': box(0.32, 0.26, 0.15, '#ef4444', g, 0, 0.13, 0); box(0.22, 0.17, 0.02, '#ffffff', g, 0, 0.14, 0.08); [-0.1, 0.1].forEach((x) => sph(0.06, '#facc15', g, x, 0.29, 0)); break;
    case 'tp': { box(0.3, 0.04, 0.1, '#94a3b8', g, 0, 0.0, -0.05); const r = cyl(0.12, 0.2, '#ffffff', g, 0, 0.12, 0.02); r.rotation.z = Math.PI / 2; break; }
    case 'soap': box(0.22, 0.1, 0.14, '#f9a8d4', g, 0, 0.05, 0); sph(0.04, '#e0f2fe', g, 0.05, 0.13, 0); sph(0.03, '#e0f2fe', g, -0.04, 0.15, 0.02); break;
    case 'towel': box(0.06, 0.6, 0.5, '#22d3ee', g, 0, -0.3, 0); box(0.065, 0.06, 0.5, '#ffffff', g, 0, -0.5, 0); break;
    case 'keys': { const t = MD.mesh(MD.G.torus, MD.M('#facc15', { emissive: '#7a5a00' }), g, 0, 0.05, 0, 0.07, 0.07, 0.07); t.rotation.x = Math.PI / 2; box(0.04, 0.02, 0.2, MD.M('#facc15', { emissive: '#7a5a00' }), g, 0.04, 0.03, 0.14); box(0.04, 0.02, 0.18, '#cbd5e1', g, -0.05, 0.03, 0.13); g.scale.setScalar(1.6); break; }
    case 'shoes': box(0.17, 0.13, 0.36, '#ef4444', g, -0.12, 0.065, 0); box(0.17, 0.13, 0.36, '#ef4444', g, 0.12, 0.065, 0.06); box(0.18, 0.03, 0.37, '#ffffff', g, -0.12, 0.01, 0); break;
    case 'coat': cyl(0.04, 1.7, '#78350f', g, 0, 0.85, 0); cyl(0.25, 0.05, '#78350f', g, 0, 0.03, 0); box(0.42, 0.75, 0.22, '#2563eb', g, 0.12, 1.15, 0.08); cyl(0.17, 0.12, '#dc2626', g, -0.08, 1.72, 0); break;
    case 'mail': [[0, 0], [0.18, 0.1], [-0.15, 0.12], [0.05, -0.15]].forEach((q, i) => { const m = box(0.24, 0.015, 0.16, i % 2 ? '#ffffff' : '#fef3c7', g, q[0], 0.01 + i * 0.005, q[1]); m.rotation.y = i; }); break;
    case 'gnome': cyl(0.14, 0.3, '#3b82f6', g, 0, 0.15, 0); sph(0.11, '#f2c6a0', g, 0, 0.38, 0); cone(0.12, 0.32, '#ef4444', g, 0, 0.6, 0); ell(0.09, 0.1, 0.05, '#ffffff', g, 0, 0.31, 0.08); break;
    case 'birdbath': cyl(0.1, 0.75, '#cbd5e1', g, 0, 0.375, 0); cyl(0.44, 0.1, '#e2e8f0', g, 0, 0.8, 0); cyl(0.37, 0.11, '#60a5fa', g, 0, 0.81, 0); break;
    case 'flowerbed': for (let i = 0; i < 9; i++) { const x = -1.4 + (i % 5) * 0.7, z = i < 5 ? -0.25 : 0.3; cyl(0.02, 0.35, '#16a34a', g, x, 0.17, z); sph(0.1, ['#f472b6', '#facc15', '#a78bfa', '#fb7185', '#ffffff'][i % 5], g, x, 0.38, z); } break;
    case 'mailbox': cyl(0.05, 1.0, '#78350f', g, 0, 0.5, 0); box(0.3, 0.32, 0.5, '#2563eb', g, 0, 1.12, 0); box(0.04, 0.22, 0.06, '#ef4444', g, 0.17, 1.2, 0.1); break;
    case 'pots': [-0.25, 0.25].forEach((x, i) => { cyl(0.16, 0.28, '#c2410c', g, x, 0.14, 0); sph(0.13, i ? '#f472b6' : '#facc15', g, x, 0.38, 0); }); break;
    default: box(0.3, 0.3, 0.3, '#999999', g, 0, 0.15, 0);
  }
  return g;
}
function messFor(o) {
  const g = new T.Group(), box = MD.box, sph = MD.sph;
  if (o.type === 'tip') { for (let i = 0; i < 7; i++) { const a = i * 0.9; box(0.18, 0.06, 0.14, ['#a3a3a3', '#fde68a', '#86efac', '#fca5a5', '#ffffff'][i % 5], g, Math.cos(a) * (0.5 + i * 0.12), 0.04, 0.6 + Math.sin(a) * 0.4).rotation.y = a; } sph(0.08, '#facc15', g, 0.3, 0.06, 0.9); }
  else if (o.type === 'shred') { for (let i = 0; i < 12; i++) box(0.08, 0.01, 0.06, i % 2 ? '#ffffff' : '#fef3c7', g, Math.cos(i * 1.7) * (0.2 + i * 0.05), 0.02, Math.sin(i * 1.7) * (0.2 + i * 0.05)).rotation.y = i; }
  else if (o.type === 'unroll') { const s = box(0.22, 0.01, 2.4, '#ffffff', g, 0, 0.02, 1.2); s.rotation.y = 0.25; }
  else if (o.type === 'dig') { for (let i = 0; i < 6; i++) sph(0.22, '#7c4a1e', g, -1.2 + i * 0.5, 0.06, Math.sin(i) * 0.25).scale.y = 0.4; }
  else return null;
  g.position.set(o.x, 0.02, o.z); return g;
}

/* ======================================================================
   Save data, pet roster, picks
   ====================================================================== */
function cdata() { const s = G.save(); if (!s.chaos || typeof s.chaos !== 'object') s.chaos = { pick: 'f:candy', lv: 1, best: {}, stars: {}, rounds: 0 }; const c = s.chaos; c.best = c.best || {}; c.stars = c.stars || {}; if (!c.lv) c.lv = 1; return c; }
function roster() {
  const s = G.save(), out = [];
  GP.FAMILY.forEach((f) => {
    const own = s.pets.find((p) => p.fam === f.id);
    const look = own ? G.petLook(own) : { sp: f.sp, col: f.col.slice(), eye: f.eye, oneEye: f.oneEye ? 1 : 0, acc: Object.assign({}, f.acc), n: f.name };
    out.push({ key: 'f:' + f.id, name: own ? own.name : f.name, look: Object.assign({}, look, { lv: 7 }), fam: f.id, pid: own ? own.id : 0, sp: f.sp });
  });
  s.pets.filter((p) => !p.fam && GP.SPECIES[p.sp] && GP.SPECIES[p.sp].kind !== 'fish').slice(0, 9).forEach((p) => out.push({ key: 'p:' + p.id, name: p.name, look: Object.assign(G.petLook(p), { lv: 7 }), pid: p.id, sp: p.sp }));
  [['tabby', 'Whiskers'], ['bunny', 'Thumper'], ['parrot', 'Polly']].forEach((q) => { if (!out.some((r) => r.sp === q[0])) { const v = GP.SPECIES[q[0]].vars[0]; out.push({ key: 's:' + q[0], name: q[1], look: { sp: q[0], col: [v[1], v[2]], lv: 7, acc: {}, n: q[1] }, sp: q[0] }); } });
  return out;
}
function myPick() { const r = roster(), c = cdata(); return r.find((q) => q.key === c.pick) || r[0]; }
function pickMsg(pk) { return { key: pk.key, name: pk.name, sp: pk.sp, fam: pk.fam || '', look: pk.look }; }
function cleanPick(m) {
  if (!m || !m.look || !GP.SPECIES[m.look.sp] || GP.SPECIES[m.look.sp].kind === 'fish') return null;
  const l = m.look, hex = (c) => /^#[0-9a-f]{6}$/i.test(c || '');
  const col = Array.isArray(l.col) ? l.col.slice(0, 2).map((c) => hex(c) ? c : '#cccccc') : ['#cccccc', '#ffffff']; while (col.length < 2) col.push('#ffffff');
  const acc = {}; ['head', 'neck', 'face'].forEach((k) => { if (l.acc && GP.ITEMS[l.acc[k]] && GP.ITEMS[l.acc[k]].slot === k) acc[k] = l.acc[k]; });
  const name = GN.cleanName(m.name || 'Pet'), fam = GP.familyById(m.fam) ? m.fam : '';
  return { key: String(m.key || '').slice(0, 24), name, sp: l.sp, fam, look: { sp: l.sp, col, eye: hex(l.eye) ? l.eye : undefined, oneEye: l.oneEye ? 1 : 0, lv: 7, acc, n: name } };
}
function defaultPick(i) { const r = roster(); return cleanPick(pickMsg(r[[0, 2, 1][i % 3]] || r[0])); }

/* ======================================================================
   Host simulation (solo player or online host)
   ====================================================================== */
let CS = null;
const newGid = () => 1 + Math.floor(Math.random() * 1e9);
const TIDY = { knock: 1, tip: 1, spill: 1, unroll: 1, shred: 1, scatter: 1, dig: 1 };
const OWNER_DEFS = [{ name: 'Sam', at: [-7, -7], look: { shirt: '#f472b6', hair: '#3b2414', long: 1 } }, { name: 'Grandma Gigi', at: [8, -1], look: { shirt: '#a78bfa', hair: '#e5e7eb', pants: '#78350f', long: 1 } }];
function freshCS(lvId, gid) {
  const L = lvDef(lvId);
  return { gid: gid || newGid(), ph: 'count', lv: L.id, cd: 3.5, t: L.time, el: 0, heat: 0, team: 0, np: 1, quiet: 0, called: 0, lastX: null, lastZ: null,
    cnt: { knock: 0, steal: 0, sock: 0, prints: 0, confuse: 0, keys: 0, tip: 0, slip: 0, blame: 0, combo: 1, escape: 0, cake: 0 }, gd: L.goals.map(() => 0),
    ob: OBJS.map((o) => (o.flag === 'cake' && !L.cake) || (o.flag === 'nocake' && L.cake) ? 9 : 0), pl: {}, picks: {}, ow: [], of: [],
    ac: { st: '', t: 0, vx: -36, n: 0, left: 0 }, pu: [], puId: 0, pr: [], prN: 0, fx: [], fxId: 0, reason: '' };
}
function mkRec(pl, pk, i) {
  const kit = petKit(pk.sp, pk.fam), sp = SPAWN[i % SPAWN.length];
  return { n: pk.name, pn: GN.cleanName(pl.name || 'Friend'), c: GN.cleanColor(pl.color), lk: pk.look, kit, sc: 0, cb: 0, ct: 0, cm: 1, best: 1, lives: kit.lives, cg: 0, to: 0, imm: 0, hid: 0, home: 0,
    abA: '', abT: 0, abCd: 0, pkT: 0, mud: 0, car: 0, carK: '', carT: 0, tp: 1, tpx: sp[0], tpz: sp[1], x: sp[0], z: sp[1], in: 1, prT: -9, esc: 0 };
}
function mkWalker(kind, i, x, z) { return { kind, i, x, z, yaw: Math.PI, spd: 0, sp: 0, st: kind === 'ow' ? 'chores' : 'patrol', t: 0, dur: 0, tx: x, tz: z, bub: '', bubT: 0, tg: null, vis: 0, lost: 0, room: roomAt(x, z), path: null, pathKey: '', crossing: false, stuck: 0, unstick: 0, wait: 1 + i, ci: -1, arr: false, oi: -1, by: '', hears: [], gone: 0, cool: 0, pi: -1 }; }
function fx(k, o) { const C = CS; C.fxId++; o.id = C.fxId; o.k = k; C.fx.push(o); if (C.fx.length > 30) C.fx.shift(); }
function setSt(e, st, dur) { e.st = st; e.t = 0; e.dur = dur || 0; e.crossing = false; e.pathKey = ''; }
function say(e, text, dur) { e.bub = text; e.bubT = dur || 2.2; }
function hideAt(x, z) { for (const h of HIDES) if (dist(x, z, h.x, h.z) < h.r) return h; return null; }
const okP = (p) => p && p.in && !p.cg && p.to <= 0 && CS && CS.ph === 'play';
const grabbable = (p) => p && p.in && !p.cg && p.to <= 0 && p.imm <= 0 && !p.home && !p.hid;
function los(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.25);
  for (let i = 1; i < n; i++) { const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n; for (const o of WALLS) if (x > o.x0 && x < o.x1 && z > o.z0 && z < o.z1) return false; }
  return true;
}
function visible(e, p, range, fov, chasing) {
  if (!p || !p.in || p.cg || p.to > 0 || p.hid || p.home) return false;
  const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz);
  let R = range * (p.kit.small ? 0.65 : 1) * (p.abA === 'sneak' ? 0.18 : 1); if (chasing) R *= 1.35;
  if (d > R) return false;
  if (!chasing && d > 1.6 && Math.abs(ang(yawOf(dx, dz) - e.yaw)) > fov) return false;
  return los(e.x, e.z, p.x, p.z);
}
function spot(e, range, fov) { let best = null, bd = 1e9; for (const k in CS.pl) { const p = CS.pl[k]; if (visible(e, p, range, fov, false)) { const d = dist(e.x, e.z, p.x, p.z); if (d < bd) { bd = d; best = k; } } } return best; }
function moveEnt(x, z, dx, dz, r, small) { if (small) SMALL.forEach((o) => { o.off = true; }); const res = W.move(A, x, z, dx, dz, r); if (small) SMALL.forEach((o) => { o.off = false; }); return res; }
// walk toward a target, using door waypoints when it is in another room. Bodies turn first and only move the way they face.
function steerTo(e, tx, tz, dt, cap) {
  const ra = roomAt(e.x, e.z), rb = roomAt(tx, tz);
  if (ra !== e.room) { e.room = ra; e.crossing = false; e.pathKey = ''; }
  let wx = tx, wz = tz;
  if (ra !== rb) {
    const key = ra + rb; if (e.pathKey !== key) { e.pathKey = key; e.path = route(ra, rb); e.crossing = false; }
    const d = e.path && e.path[0];
    if (d) { if (!e.crossing && dist(e.x, e.z, d.pre[0], d.pre[1]) < 0.45) e.crossing = true; const q = e.crossing ? d.post : d.pre; wx = q[0]; wz = q[1]; }
  }
  const dx = wx - e.x, dz = wz - e.z, dd = Math.hypot(dx, dz); let want = 0;
  if (e.unstick > 0) { e.unstick -= dt; want = cap * 0.7; }
  else if (dd > 0.08) { e.yaw += ang(yawOf(dx, dz) - e.yaw) * Math.min(1, dt * 9); want = Math.min(cap, dd * 3 + 0.4) * Math.max(0, Math.cos(ang(yawOf(dx, dz) - e.yaw))); }
  e.spd += (want - e.spd) * Math.min(1, dt * 6);
  const r = W.move(A, e.x, e.z, Math.sin(e.yaw) * e.spd * dt, Math.cos(e.yaw) * e.spd * dt, 0.34);
  const moved = Math.hypot(r[0] - e.x, r[1] - e.z); e.x = r[0]; e.z = r[1]; e.sp = moved / Math.max(dt, 1e-3);
  if (want > 0.8 && moved < want * dt * 0.25 && e.unstick <= 0) { e.stuck += dt; if (e.stuck > 0.6) { e.stuck = 0; e.unstick = 0.45; e.yaw += (Math.random() < 0.5 ? 1 : -1) * (1.1 + Math.random()); } } else e.stuck = Math.max(0, e.stuck - dt);
  return dist(e.x, e.z, tx, tz);
}
function halt(e, dt) { e.spd += (0 - e.spd) * Math.min(1, dt * 8); e.sp = 0; }
function addChaos(pid, base, x, z, label, o) {
  const C = CS, p = C && C.pl[pid]; if (!p) return 0; o = o || {};
  let mult = 1;
  if (!o.noCombo) { p.cb = p.ct > 0 ? p.cb + 1 : 1; p.ct = p.kit.comboT || 4.5; mult = 1 + Math.min(4, p.cb - 1) * 0.5; p.cm = mult; p.best = Math.max(p.best, mult); C.cnt.combo = Math.max(C.cnt.combo, mult); }
  const pts = Math.round(base * mult); p.sc += pts; C.team += pts;
  if (!o.noHeat && !C.ac.st) { C.heat = Math.min(100, C.heat + base * 0.14 * lvDef(C.lv).heat); C.quiet = 0; }
  C.lastX = x; C.lastZ = z;
  fx('pts', { pid, x: r2(x), z: r2(z), n: pts, m: mult, t: label || '' });
  if (!o.quiet) hear(x, z, pid, o.oi == null ? -1 : o.oi);
  return pts;
}
function hear(x, z, pid, oi) {
  const r = roomAt(x, z), now = CS.el;
  CS.ow.forEach((e) => {
    if (['chase', 'grab', 'stun', 'slip', 'dizzy', 'keys', 'blame2', 'doorwait'].indexOf(e.st) >= 0) return;
    if (roomAt(e.x, e.z) !== r && dist(e.x, e.z, x, z) > 10) return;
    e.hears = e.hears.filter((t) => now - t < 7); e.hears.push(now);
    if (e.hears.length >= 3) { e.hears = []; setSt(e, 'dizzy', 2.2); say(e, 'Too much chaos!!', 2.2); CS.cnt.confuse++; fx('dizzy', {}); addChaos(pid, 40, e.x, e.z, 'So confused!', { quiet: true }); return; }
    setSt(e, 'inv', 9); e.tx = x; e.tz = z; e.oi = oi; e.by = pid; say(e, pick(['What was that?!', 'Huh?! That noise\u2026', 'Hey! What\u2019s going on?', 'Uh oh\u2026']), 2);
  });
}
function addPuddle(x, z, k, by) { const C = CS; C.puId++; C.pu.push({ x, z, k, by, id: C.puId }); if (C.pu.length > 14) C.pu.shift(); }
function dropKeys(p) { if (!p.car) return; p.car = 0; const i = OBJS.findIndex((o) => o.type === 'keys'); if (i >= 0 && CS.ob[i] === 2) CS.ob[i] = 0; }
function timeout(pid, p, e) {
  p.to = 3; p.tp++; p.tpx = PEN[0]; p.tpz = PEN[1]; p.x = PEN[0]; p.z = PEN[1]; p.cb = 0; p.ct = 0; p.cm = 1; dropKeys(p);
  CS.heat = Math.max(0, CS.heat - 10); say(e, 'Time-out, ' + p.n + '!', 2.2); fx('to', { pid, n: p.n });
}
function netHit(pid, p, e) {
  if (p.lives > 1) { p.lives--; p.imm = 2.5; fx('bonk', { pid, n: p.n }); say(e, 'Huh?! It bounced right out!', 2); setSt(e, 'stun', 1.2); return; }
  p.cg = 1; p.cb = 0; p.ct = 0; p.cm = 1; p.abA = ''; p.abT = 0; dropKeys(p); fx('caught', { pid, n: p.n }); say(e, 'Gotcha, little buddy!', 2.2);
}
function doObj(pid, p, i, viaPounce) {
  const C = CS, o = OBJS[i]; if (!o || C.ob[i] !== 0) return false;
  if (!viaPounce && dist(p.x, p.z, o.x, o.z) > o.reach + 0.8) return false;
  if (o.type === 'keys') { if (viaPounce || p.car) return false; C.ob[i] = 2; p.car = 1; addChaos(pid, o.pts, o.x, o.z, 'Got the keys!', { quiet: true }); return true; }
  C.ob[i] = 1;
  let base = o.pts; if (o.type === 'knock' && p.kit.heavy) base = Math.round(base * 1.25); if (o.type === 'steal' && p.kit.loot) base = Math.round(base * 1.5);
  const c = C.cnt;
  if (o.type === 'knock' || o.type === 'scatter') c.knock++;
  if (o.type === 'tip') c.tip++;
  if (o.type === 'steal') { if (o.sub === 'sock') c.sock++; else c.steal++; if (o.sub === 'cake') c.cake++; p.carK = o.model; p.carT = 2.5; }
  if (o.type === 'dig') p.mud = 14;
  const pu = PUD_AT[o.id]; if (pu) addPuddle(pu[0], pu[1], pu[2], pid);
  addChaos(pid, base, o.x, o.z, o.type === 'steal' ? SAYS[o.sub] : SAYS[o.type], { oi: i });
  return true;
}
function ability(pid, p) {
  const C = CS; if (!okP(p) || p.abCd > 0) return; const ab = p.kit.ab; p.abCd = ABIL[ab].cd;
  if (ab === 'bark') { const R = p.kit.barkR || 6; let n = 0; C.ow.concat(C.of).forEach((e) => { if (e.gone || e.st === 'slip') return; if (dist(e.x, e.z, p.x, p.z) < R) { setSt(e, 'stun', 1.8); say(e, pick(['EEK!', 'Yikes!', 'AAH!']), 1.6); n++; } }); addChaos(pid, 20 + n * 15, p.x, p.z, n ? 'Startled!' : p.kit.abName + '!', { quiet: true }); }
  else if (ab === 'shell') { p.abA = 'shell'; p.abT = ABIL.shell.dur; }
  else if (ab === 'sneak') { p.abA = 'sneak'; p.abT = p.kit.sneakDur || ABIL.sneak.dur; }
  else if (ab === 'pounce') { p.abA = 'pounce'; p.abT = 0.6; p.pkT = 2; }
  else if (ab === 'mimic') {
    C.ow.forEach((e) => { if (['slip', 'stun', 'grab', 'keys', 'dizzy'].indexOf(e.st) >= 0) return; setSt(e, 'door', 10); e.by = pid; say(e, 'Coming! Who\u2019s at the door?', 2); });
    C.of.forEach((e) => { if (e.gone || e.st === 'leave' || e.st === 'net') return; setSt(e, 'patrol'); e.ptx = DOOR_IN[0]; e.ptz = DOOR_IN[1] + 2; e.pi = 0; e.arr = false; say(e, 'Huh? A doorbell?', 1.6); });
    addChaos(pid, 25, p.x, p.z, 'DING DONG!', { quiet: true });
  }
  fx('ab', { pid, ab, x: r2(p.x), z: r2(p.z) });
}
CH.hostAct = function (pid, m) {
  const C = CS;
  if (m.a === 'suggest') { if (pid !== GS.pid && GS.role === 'host') { const q = GS.S && GS.S.players.find((x) => x.pid === pid); G.toast('\uD83D\uDCA1 ' + (q ? q.name : 'A friend') + ' wants to play Animal Chaos! (\u2630 Menu \u2192 ANIMAL CHAOS)'); Snd.fx('join'); } return; }
  if (!C) return;
  const p = C.pl[pid];
  switch (m.a) {
    case 'pick': { const pk = cleanPick(m); if (!pk) return; C.picks[pid] = pk;
      if (C.ph !== 'lobby' && C.ph !== 'over') { const q = GS.S && GS.S.players.find((x) => x.pid === pid); if (!p) C.pl[pid] = mkRec(q || { name: 'Friend' }, pk, Object.keys(C.pl).length); else if (C.ph === 'count') { const fresh = mkRec({ name: p.pn, color: p.c }, pk, 0); Object.assign(p, { n: fresh.n, lk: fresh.lk, kit: fresh.kit, lives: fresh.lives }); } }
      break; }
    case 'act': if (okP(p)) doObj(pid, p, m.o | 0, false); break;
    case 'hidekeys': { if (!okP(p) || !p.car || !hideAt(p.x, p.z)) return; p.car = 0; const ki = OBJS.findIndex((o) => o.type === 'keys'); C.ob[ki] = 3; C.cnt.keys++;
      addChaos(pid, 120, p.x, p.z, 'Keys hidden!', { quiet: true });
      C.ow.forEach((e) => { if (['slip', 'stun', 'dizzy'].indexOf(e.st) >= 0) return; setSt(e, 'keys', 13); e.ci = -1; say(e, 'Wait\u2026 where are my KEYS?!', 2.4); }); break; }
    case 'rescue': { if (!okP(p) || (C.ac.st !== 'here' && C.ac.st !== 'leave') || dist(p.x, p.z, VAN_DOOR[0], VAN_DOOR[1]) > 2.4) return; let n = 0;
      for (const k in C.pl) { const q = C.pl[k]; if (q.cg) { q.cg = 0; q.imm = 3; q.tp++; q.tpx = VAN_DOOR[0] - 0.6 - n * 0.7; q.tpz = VAN_DOOR[1] - 2; n++; fx('free', { pid: k, n: q.n }); } }
      if (n) addChaos(pid, 60 * n, p.x, p.z, 'RESCUE!', { quiet: true, noHeat: true }); break; }
    case 'ab': ability(pid, p); break;
    case 'pk': { if (!okP(p) || p.pkT <= 0) return; p.pkT = 0; const x = +m.x || 0, z = +m.z || 0; if (dist(p.x, p.z, x, z) > 3.5) return;
      OBJS.forEach((o, i) => { if ((o.type === 'knock' || o.type === 'scatter' || o.type === 'tip' || o.type === 'spill') && dist(x, z, o.x, o.z) < 1.9) doObj(pid, p, i, true); }); break; }
    case 'mud': if (okP(p)) p.mud = 14; break;
    case 'pr': { const x = +m.x || 0, z = +m.z || 0; if (!okP(p) || p.mud <= 0 || !inHouse(x, z) || dist(p.x, p.z, x, z) > 2.5 || C.el - p.prT < 0.2) return;
      p.prT = C.el; C.pr.push([r2(x), r2(z), r2(+m.r || 0)]); if (C.pr.length > 60) C.pr.shift(); C.prN++; C.cnt.prints++; p.sc += 4; C.team += 4;
      if (!C.ac.st) { C.heat = Math.min(100, C.heat + 0.5 * lvDef(C.lv).heat); C.quiet = 0; } break; }
    case 'leave': if (p) { p.in = 0; p.left = 1; } break;
    case 'quit': if (pid === GS.pid) over('quit'); break;
  }
};
function over(reason) { const C = CS; if (!C || C.ph === 'over' || C.ph === 'lobby') return; evalGoals(lvDef(C.lv)); C.ph = 'over'; C.reason = reason; sendNow(); }
function goalVal(g) { const C = CS; return g[0] === 'score' ? C.team : g[0] === 'combo' ? C.cnt.combo : (C.cnt[g[0]] || 0); }
function goalNeed(g, np) { return g[0] === 'score' ? Math.round(g[1] * (1 + 0.5 * (Math.max(1, np) - 1)) / 50) * 50 : g[1]; }
function evalGoals(L) { const C = CS; L.goals.forEach((g, i) => { if (!C.gd[i] && goalVal(g) >= goalNeed(g, C.np)) { C.gd[i] = 1; fx('goal', { i }); } }); }
function callAC() { const C = CS; C.called = 1; C.ac = { st: 'arrive', t: 0, vx: -36, n: C.ac.n + 1, left: 30 }; C.heat = 100; fx('ac', {}); }
function escapeReward() {
  const C = CS; let any = false;
  for (const k in C.pl) { const p = C.pl[k]; if (!p.in) continue;
    if (p.cg) { p.cg = 0; p.imm = 3; p.tp++; p.tpx = 12; p.tpz = -13.4; fx('home', { pid: k, n: p.n }); }
    else { any = true; p.esc++; addChaos(k, 150, p.x, p.z, 'ESCAPED!', { quiet: true, noHeat: true, noCombo: true }); } }
  if (any) { C.cnt.escape++; fx('escape', {}); }
}
function acTick(dt, L) {
  const C = CS, a = C.ac; if (!a.st) return; a.t += dt;
  if (a.st === 'arrive') {
    const k = Math.min(1, a.t / 3.2); a.vx = -36 + (VAN_X + 36) * (1 - (1 - k) * (1 - k));
    if (k >= 1) { a.st = 'here'; a.t = 0; a.left = 30; const act = Object.values(C.pl).filter((p) => p.in).length, n = Math.min(3, L.ofc + (act >= 3 ? 1 : 0));
      C.of = []; for (let i = 0; i < n; i++) { const e = mkWalker('of', i, VAN_DOOR[0] + 0.5 + i * 0.8, VAN_DOOR[1] - 1.2); e.yaw = Math.PI; say(e, pick(['Animal Control! Here, little buddies!', 'We got a call about some chaos!', 'Nets ready!']), 2.5); C.of.push(e); } }
  } else if (a.st === 'here') { a.left = Math.max(0, 30 - a.t); if (a.t >= 30) { a.st = 'leave'; a.t = 0; C.of.forEach((e) => { if (!e.gone) { setSt(e, 'leave'); say(e, 'Okay team, pack it up!', 2); } }); } }
  else if (a.st === 'leave') { if ((C.of.every((e) => e.gone) && a.t > 0.5) || a.t > 9) { C.of.forEach((e) => { e.gone = 1; }); a.st = 'drive'; a.t = 0; escapeReward(); } }
  else if (a.st === 'drive') { a.vx = VAN_X + a.t * a.t * 9; if (a.t > 3) { a.st = ''; a.vx = -36; C.of = []; C.heat = 25; C.quiet = 0; } }
}
function slipCheck(e) {
  const C = CS; if (e.gone || e.st === 'slip') return;
  for (let i = 0; i < C.pu.length; i++) { const q = C.pu[i]; if (q.k === 'm') continue;
    if (dist(e.x, e.z, q.x, q.z) < 0.62) { C.pu.splice(i, 1); setSt(e, 'slip', 2.4); say(e, 'WHOOOAAA!', 2.4); C.cnt.slip++; fx('slip', { x: r2(e.x), z: r2(e.z) }); addChaos(q.by, 80, e.x, e.z, 'SLIP!', { quiet: true }); return; } }
}
function afterSearch(e, L) {
  const C = CS;
  if (e.by) { C.cnt.confuse++; addChaos(e.by, 30, e.x, e.z, 'Confused!', { quiet: true }); say(e, pick(['Huh?! Nobody\u2019s here\u2026', 'I could have sworn\u2026', 'Weird\u2026']), 2); }
  const o = OBJS[e.oi];
  if (o && e.oi >= 0 && C.ob[e.oi] === 1 && TIDY[o.type]) { setSt(e, 'tidy', 1.8); say(e, 'Ugh, what a mess\u2026', 1.8); return; }
  blameRoll(e, L);
}
function blameRoll(e, L) {
  if (e.by && CS.pl[e.by] && Math.random() < (L.blame ? 0.7 : 0.35)) { setSt(e, 'blame', 9); say(e, 'Hmm\u2026 I bet I know who did this!', 2); return; }
  setSt(e, 'chores'); e.wait = 0.8; e.by = ''; e.oi = -1;
}
function ownerTick(e, dt, L) {
  e.t += dt; if (e.bubT > 0) { e.bubT -= dt; if (e.bubT <= 0) e.bub = ''; }
  const C = CS, walk = L.ownerSpd * 0.62, run = L.ownerSpd;
  if (e.st === 'stun' || e.st === 'slip' || e.st === 'dizzy') { halt(e, dt); if (e.st === 'dizzy') e.yaw += dt * 7; if (e.t >= e.dur) { setSt(e, 'search', 1.6); say(e, '?', 1.6); } return; }
  if (e.st === 'grab') {
    halt(e, dt); const p = C.pl[e.tg]; if (p) e.yaw += ang(yawOf(p.x - e.x, p.z - e.z) - e.yaw) * Math.min(1, dt * 10);
    if (e.t >= 0.35) { if (p && grabbable(p) && dist(e.x, e.z, p.x, p.z) < 1.15) { if (p.abA === 'shell') { say(e, 'Ow! Hard shell!', 1.6); setSt(e, 'stun', 1.2); } else { timeout(e.tg, p, e); setSt(e, 'chores'); e.wait = 1.6; } } else { say(e, 'Whoa, so quick!', 1.4); setSt(e, 'chase'); } }
    return;
  }
  if (e.st !== 'keys' && e.st !== 'chase' && e.st !== 'blame2' && e.st !== 'doorwait') {
    e.vis -= dt; if (e.vis <= 0) { e.vis = 0.12; const k = spot(e, 7.5, 1.15); if (k) { setSt(e, 'chase'); e.tg = k; e.lost = 0; e.tx = C.pl[k].x; e.tz = C.pl[k].z; say(e, pick(['Hey! Come back here!', 'I see you!', 'Oh no you don\u2019t!', 'Stop right there, ' + C.pl[k].n + '!']), 2); C.heat = Math.min(100, C.heat + (C.ac.st ? 0 : 4 * L.heat)); return; } }
  }
  switch (e.st) {
    case 'chores': {
      if (e.wait > 0) { e.wait -= dt; halt(e, dt); return; }
      if (e.ci < 0 || e.arr) { let n; do { n = Math.floor(Math.random() * CHORES.length); } while (n === e.ci); e.ci = n; e.arr = false; e.t = 0; }
      const c = CHORES[e.ci]; if (steerTo(e, c[0], c[1], dt, walk) < 0.6 || e.t > 15) { e.arr = true; e.wait = 2.5 + Math.random() * 2.5; say(e, c[2], 2.4); }
      return; }
    case 'inv': if (steerTo(e, e.tx, e.tz, dt, run) < 1.1 || e.t > e.dur) { setSt(e, 'search', 2.0); say(e, '?', 2); } return;
    case 'search': halt(e, dt); e.yaw += dt * 2.6; if (e.t >= e.dur) afterSearch(e, L); return;
    case 'tidy': halt(e, dt); if (e.t >= e.dur) { const o = OBJS[e.oi]; if (o && C.ob[e.oi] === 1 && TIDY[o.type]) { C.ob[e.oi] = 0; fx('tidy', { o: e.oi }); } say(e, 'All clean!', 1.4); blameRoll(e, L); } return;
    case 'blame': if (steerTo(e, FLUFF[0], FLUFF[1] + 1.1, dt, walk) < 0.75 || e.t > e.dur) { setSt(e, 'blame2', 2.4); say(e, 'Mr. Fluff! Was it YOU?!', 2.4); } return;
    case 'blame2': halt(e, dt); e.yaw += ang(Math.PI - e.yaw) * Math.min(1, dt * 6); if (e.t >= e.dur) { C.cnt.blame++; fx('blame', {}); addChaos(e.by, 60, FLUFF[0], FLUFF[1], 'Blamed Mr. Fluff!', { quiet: true }); setSt(e, 'chores'); e.wait = 1; e.by = ''; } return;
    case 'keys': { if (e.t >= e.dur) { say(e, 'Phew! I\u2019ll use the spare key.', 2.4); setSt(e, 'chores'); e.wait = 1; return; }
      if (!e.bub) say(e, pick(['My KEYS?!', 'Where are my keys?!', 'Did I leave them in the fridge?', 'Keys, keys, keys\u2026']), 2.2);
      if (e.ci < 0 || e.arr) { e.ci = Math.floor(Math.random() * CHORES.length); e.arr = false; }
      const c = CHORES[e.ci]; if (steerTo(e, c[0], c[1], dt, run * 0.9) < 0.7) e.arr = true; return; }
    case 'door': if (steerTo(e, DOOR_IN[0], DOOR_IN[1], dt, run) < 0.8 || e.t > e.dur) { setSt(e, 'doorwait', 1.8); say(e, 'Hello? \u2026Nobody?!', 1.8); } return;
    case 'doorwait': halt(e, dt); if (e.t >= e.dur) { C.cnt.confuse++; addChaos(e.by, 30, e.x, e.z, 'Confused!', { quiet: true }); setSt(e, 'chores'); e.wait = 0.5; e.by = ''; } return;
    case 'chase': {
      const p = C.pl[e.tg]; if (!p) { setSt(e, 'chores'); return; }
      e.vis -= dt; if (e.vis <= 0) { e.vis = 0.12; if (visible(e, p, 7.5, 1.15, true)) { e.lost = 0; e.tx = p.x; e.tz = p.z; } else e.lost += 0.12; }
      if (e.lost > 1.3 || p.cg || p.to > 0 || p.home || (p.hid && e.lost > 0.2)) { const home = p.home; setSt(e, 'inv', 6); e.oi = -1; e.by = e.tg; say(e, home ? 'Aww, you went home\u2026' : 'Where did you go?!', 2); return; }
      steerTo(e, e.tx, e.tz, dt, Math.min(L.ownerSpd + 0.8, p.kit.spd * 0.85));
      if (grabbable(p) && dist(e.x, e.z, p.x, p.z) < 0.9) { setSt(e, 'grab'); say(e, 'Gotcha!', 1); }
      else if (e.t > 14) { setSt(e, 'search', 1.5); say(e, '*huff huff*', 1.5); }
      return; }
  }
}
function officerTick(e, dt, L) {
  if (e.gone) return;
  e.t += dt; if (e.bubT > 0) { e.bubT -= dt; if (e.bubT <= 0) e.bub = ''; }
  const C = CS; e.cool = Math.max(0, e.cool - dt);
  if (e.st === 'stun' || e.st === 'slip') { halt(e, dt); if (e.t >= e.dur) { setSt(e, 'patrol'); e.pi = -1; } return; }
  if (e.st === 'leave') { if (steerTo(e, VAN_DOOR[0], VAN_DOOR[1], dt, 3.4) < 0.9 || e.t > 12) e.gone = 1; return; }
  if (e.st === 'net') {
    halt(e, dt); const p = C.pl[e.tg]; if (p) e.yaw += ang(yawOf(p.x - e.x, p.z - e.z) - e.yaw) * Math.min(1, dt * 8);
    if (e.t >= 0.5) {
      if (p && grabbable(p) && dist(e.x, e.z, p.x, p.z) < 1.55) { if (p.abA === 'shell') { say(e, 'Boing! It bounced off the shell!', 1.8); setSt(e, 'stun', 1.2); return; } netHit(e.tg, p, e); }
      else say(e, pick(['Missed!', 'Aw, so fast!', 'Slippery little thing!']), 1.4);
      if (e.st === 'net') { setSt(e, 'chase'); e.cool = 0.7; }
    }
    return;
  }
  if (e.st !== 'chase') { e.vis -= dt; if (e.vis <= 0) { e.vis = 0.12; const k = spot(e, 9, 1.2); if (k) { setSt(e, 'chase'); e.tg = k; e.lost = 0; e.tx = C.pl[k].x; e.tz = C.pl[k].z; say(e, pick(['There\u2019s one!', 'Come here, cutie!', 'Freeze, ' + C.pl[k].n + '!']), 1.8); return; } } }
  if (e.st === 'patrol') {
    if (e.pi < 0 || e.arr) { e.pi = Math.floor(Math.random() * PATROL.length); e.arr = false; e.t = 0; if (C.lastX != null && Math.random() < 0.45) { e.ptx = C.lastX; e.ptz = C.lastZ; } else { e.ptx = PATROL[e.pi][0]; e.ptz = PATROL[e.pi][1]; } }
    if (steerTo(e, e.ptx, e.ptz, dt, 2.9) < 0.9 || e.t > 10) { e.arr = true; e.t = 0; }
    return;
  }
  if (e.st === 'chase') {
    const p = C.pl[e.tg]; if (!p) { setSt(e, 'patrol'); e.pi = -1; return; }
    e.vis -= dt; if (e.vis <= 0) { e.vis = 0.12; if (visible(e, p, 9, 1.2, true)) { e.lost = 0; e.tx = p.x; e.tz = p.z; } else e.lost += 0.12; }
    if (p.cg || p.home || p.to > 0 || e.lost > 1.5) { const home = p.home; setSt(e, 'patrol'); e.pi = 0; e.arr = false; e.ptx = e.tx; e.ptz = e.tz; say(e, home ? 'Aw, they made it home!' : 'Lost them\u2026', 1.8); return; }
    steerTo(e, e.tx, e.tz, dt, Math.min(5.4, p.kit.spd * 0.9));
    if (e.cool <= 0 && grabbable(p) && dist(e.x, e.z, p.x, p.z) < 1.25) { setSt(e, 'net'); say(e, '!', 0.6); }
  }
}
function simTick(dt) {
  const C = CS; if (!C || C.ph === 'lobby' || C.ph === 'over') return;
  const L = lvDef(C.lv), S = GS.S, live = {};
  (S ? S.players : []).forEach((pl, i) => {
    live[pl.pid] = 1; let p = C.pl[pl.pid];
    if (!p) { p = C.pl[pl.pid] = mkRec(pl, C.picks[pl.pid] || defaultPick(i), i); }
    if (pl.pid === GS.pid) { if (M) { p.x = M.x; p.z = M.z; } p.in = 1; }
    else { const q = GS.pos[pl.pid]; p.in = q && q.a === 'chaos' && !p.left ? 1 : 0; if (p.in) { p.x = q.x; p.z = q.z; } }
  });
  for (const k in C.pl) if (!live[k]) C.pl[k].in = 0;
  if (C.ph === 'count') { C.cd -= dt; if (C.cd <= 0) { C.ph = 'play'; fx('go', {}); } return; }
  C.t -= dt; C.el += dt; C.quiet += dt;
  for (const k in C.pl) {
    const p = C.pl[k];
    p.ct = Math.max(0, p.ct - dt); if (p.ct <= 0) { p.cb = 0; p.cm = 1; }
    if (p.to > 0) { p.to -= dt; if (p.to <= 0) { p.to = 0; p.imm = 2.5; } }
    p.imm = Math.max(0, p.imm - dt); p.abT = Math.max(0, p.abT - dt); if (p.abT <= 0) p.abA = ''; p.abCd = Math.max(0, p.abCd - dt); p.pkT = Math.max(0, p.pkT - dt);
    p.mud = Math.max(0, p.mud - dt); p.carT = Math.max(0, p.carT - dt);
    const h = p.in && !p.cg && p.to <= 0 ? hideAt(p.x, p.z) : null; p.hid = h ? 1 : 0; p.home = h && h.home ? 1 : 0;
  }
  C.ow.forEach((e) => { ownerTick(e, dt, L); slipCheck(e); });
  acTick(dt, L);
  C.of.forEach((e) => { officerTick(e, dt, L); slipCheck(e); });
  if (!C.ac.st) { if (C.quiet > 4) C.heat = Math.max(0, C.heat - dt * 1.4); if (C.heat >= 100 || (L.acCall && !C.called && C.el >= L.acCall)) callAC(); }
  evalGoals(L);
  const act = Object.keys(C.pl).filter((k) => C.pl[k].in);
  if (act.length && act.every((k) => C.pl[k].cg)) { over('caught'); return; }
  if (C.t <= 0) { C.t = 0; over('time'); }
}
function snap() {
  const C = CS; if (!C) return null;
  if (C.ph === 'lobby') { const picks = {}; for (const k in C.picks) picks[k] = C.picks[k].name; return { gid: C.gid, ph: 'lobby', lv: C.lv, picks }; }
  const L = lvDef(C.lv), pl = {};
  for (const k in C.pl) { const p = C.pl[k]; pl[k] = { n: p.n, pn: p.pn, c: p.c, lk: p.lk, ab: p.kit.ab, abn: p.kit.abName, spd: p.kit.spd, small: p.kit.small, ctm: p.kit.comboT || 4.5, sc: p.sc, cb: p.cb, ct: r2(p.ct), cm: p.cm, best: p.best, lives: p.lives,
    cg: p.cg, to: r2(p.to), imm: p.imm > 0 ? 1 : 0, hid: p.hid, home: p.home, abA: p.abA, abCd: r2(p.abCd), esc: p.esc, mud: p.mud > 0 ? 1 : 0, car: p.car, carK: p.carT > 0 ? p.carK : '', tp: p.tp, tpx: p.tpx, tpz: p.tpz, in: p.in }; }
  return { gid: C.gid, ph: C.ph, lv: C.lv, cd: r2(C.cd), t: r2(Math.max(0, C.t)), heat: Math.round(C.heat), team: C.team, np: C.np, pl, gd: C.gd.slice(), gv: L.goals.map(goalVal), gn: L.goals.map((g) => goalNeed(g, C.np)),
    ob: C.ob.join(''), ow: C.ow.map((e) => [r2(e.x), r2(e.z), r2(e.yaw), e.st, e.bub, r2(e.sp)]), of: C.of.map((e) => [r2(e.x), r2(e.z), r2(e.yaw), e.st, e.bub, r2(e.sp), e.gone]),
    ac: [C.ac.st, r2(C.ac.vx), Math.ceil(C.ac.left || 0)], pu: C.pu.map((q) => [r2(q.x), r2(q.z), q.k, q.id]), prN: C.prN, pr: C.pr.slice(-40), fx: C.fx.slice(-20), reason: C.reason };
}
function sendNow() { if (GS.room && GS.role === 'host' && CS) GS.room.broadcast({ t: 'cs', s: snap() }); }

/* ======================================================================
   Local view (every device): my pet, other pets, owners, officers, van, objects, HUD
   ====================================================================== */
let view = null, M = null, sendT = 0, starting = false, LOB = { gid: 0 }, lastCount = -1, lastPh = '', hudKey = '', mateKey = '', goalKey = '';
const R = { ow: [], of: [], pets: {}, van: null, pud: {}, prints: [], printN: 0, floats: [], fluff: null, coneO: null, coneF: null };
const JOY = { x: 0, y: 0 };
const send = (m) => G.doAct(Object.assign({ k: 'ch' }, m));
function clearDyn() {
  if (DYN) while (DYN.children.length) DYN.remove(DYN.children[0]);
  R.ow = []; R.of = []; R.pets = {}; R.pud = {}; R.prints = []; R.printN = 0; R.floats = []; if (R.van) R.van.g.visible = false;
  if (R.fluff) { R.fluff.P.play('sleep', 3); }
}
function enterLocal(asHost, s) {
  buildArea();
  if (GS.care && GP.Care) GP.Care.close(true);
  if (GP.NPC && GP.NPC.abort) GP.NPC.abort();
  if (GS.panel) { starting = true; G.closePanel(); starting = false; }
  $('scrMenu').classList.add('hidden');
  const ret = GS.chaos ? GS.chaos.ret : { a: GS.me.area === 'chaos' ? 'home' : GS.me.area, x: GS.me.x, z: GS.me.z };
  view = asHost ? snap() : s;
  GS.chaos = { gid: view.gid, host: asHost, ret, fxSeen: view.fx && view.fx.length ? view.fx[view.fx.length - 1].id : 0, done: false, lastRx: performance.now() };
  clearDyn(); OBJS.forEach((o) => { o.vs = null; o.tp = null; });
  const pk = myPick(), sp = SPAWN[0];
  M = { x: sp[0], z: sp[1], yaw: Math.PI, sp: 0, dashT: 0, dashCd: 0, pounceT: 0, abLocal: 0, tp: -1, mudSent: 0, prAcc: 0, side: false, P: null, lk: '', tgt: null, actCd: 0, camSnap: true, wasMud: 0, carKey: '' };
  GS.me.area = 'chaos'; GS.me.sp = 0; GS.goal = null;
  W.setArea('chaos'); lastCount = -1; lastPh = ''; hudKey = mateKey = goalKey = '';
  if (!asHost) send(Object.assign({ a: 'pick' }, pickMsg(pk)));
  document.body.classList.add('inchaos'); if ($('tut')) $('tut').classList.add('hidden'); $('chHud').classList.remove('hidden'); $('chMsg').classList.add('hidden');
  JOY.x = JOY.y = 0; $('chJoy').classList.remove('on');
  const L = lvDef(view.lv); msg(L.icon + ' ' + esc(L.name) + '<small>' + esc(L.intro) + '</small>', 3.2);
}
CH.tick = function (dt) {
  const C = GS.chaos; if (!C) return;
  if (C.host) {
    if (!CS || CS.gid !== C.gid) { CH.exit(); return; }
    simTick(dt); view = snap();
    sendT -= dt; if (GS.room && GS.role === 'host' && sendT <= 0) { sendT = 0.1; GS.room.broadcast({ t: 'cs', s: view }); }
  } else if (!C.done && (GS.role !== 'client' || performance.now() - C.lastRx > 9000)) { showResults(view, 'host'); }
  if (!view || !A) return;
  applyView(dt); localTick(dt); hud(dt); camera(dt);
  if (view.ph === 'over' && !C.done) showResults(view);
};
/* ---------- objects, puddles, prints ---------- */
function objState(o, s, anim) {
  const g = o.g, H = o.home; g.visible = true; if (o.mess) o.mess.visible = false;
  o.tp = H.p.clone(); o.tr = new T.Euler(H.r.x, H.r.y, H.r.z);
  if (s === 9) { g.visible = false; o.tp = null; return; }
  if (s === 0) { if (anim && o.vs === 1) W.fx('sparkle', o.x, 0.7, o.z, 4, 0.6); if (!anim || o.vs === 9) { g.position.copy(H.p); g.rotation.copy(H.r); } return; }
  const t = o.type, k = o.i % 2 ? 1 : -1;
  if (t === 'steal' || t === 'keys' || t === 'shred' || t === 'dig') g.visible = false;
  if (o.mess && (t === 'shred' || t === 'tip' || t === 'unroll' || t === 'dig')) o.mess.visible = true;
  if (t === 'knock') { o.tp.set(o.x + 0.35 * k, 0.12, o.z + 0.55); o.tr.set(0, o.i, 1.45 * k); }
  else if (t === 'scatter') { o.tp.set(o.x + 0.7 * k, 0.05, o.z + 0.9); o.tr.set(0, 0.9 * k, 0); }
  else if (t === 'tip') { o.tp.set(o.x, 0.36, o.z + 0.35); o.tr.set(1.45, 0, 0); }
  else if (t === 'spill') { o.tp.set(o.x + 0.15, o.y + (o.model === 'birdbath' ? 0 : 0.05), o.z + 0.1); o.tr.set(0, 0, o.model === 'birdbath' ? 0.35 : 2.6); }
  else if (t === 'unroll') { o.tr.set(0, 0, 0.4); }
  if (!anim) { g.position.copy(o.tp); g.rotation.copy(o.tr); return; }
  W.fx('dust', o.x, 0.4, o.z, 5, 0.8);
  const snd = { knock: 'crash', scatter: 'bump', tip: 'crash', spill: 'splash', dig: 'dig', unroll: 'throw', shred: 'scrub', keys: s === 3 ? 'treasure' : 'coin', steal: o.sub === 'sock' ? 'catch' : 'eat' }[t];
  if (snd) Snd.fx(snd);
  if (t === 'steal' || t === 'keys') W.fx(o.sub === 'cake' ? 'star' : 'sparkle', o.x, 0.9, o.z, 5, 0.5);
  if (t === 'spill' || o.sub === 'water') W.fx('drop', o.x, 0.9, o.z, 6, 0.6);
}
function animObj(o, dt) {
  if (!o.tp) return; const g = o.g, k = 1 - Math.exp(-dt * 12);
  if (g.position.distanceToSquared(o.tp) > 1e-5) g.position.lerp(o.tp, k);
  g.rotation.x += (o.tr.x - g.rotation.x) * k; g.rotation.y += (o.tr.y - g.rotation.y) * k; g.rotation.z += (o.tr.z - g.rotation.z) * k;
}
const PUDCOL = { w: '#7dd3fc', m: '#6b4423', b: '#facc15' };
function syncPuddles(list) {
  const seen = {};
  list.forEach((q) => { const id = q[3]; seen[id] = 1; if (R.pud[id]) return;
    const g = new T.Group(); g.position.set(q[0], 0.06, q[1]);
    if (q[2] === 'b') { const b = MD.ell(0.08, 0.05, 0.28, '#facc15', g, 0, 0.04, 0); b.rotation.y = 0.8; MD.ell(0.06, 0.04, 0.12, '#fde68a', g, 0.12, 0.03, 0.1); }
    else { const m = new T.Mesh(MD.G.circle, MD.M(PUDCOL[q[2]], { transparent: true, opacity: 0.85 })); m.rotation.x = -Math.PI / 2; m.scale.set(0.62, 0.48, 1); g.add(m); }
    const s = W.textSprite(q[2] === 'm' ? 'MUD' : q[2] === 'b' ? 'PEEL' : 'WET', { size: 22, h: 0.22, bg: q[2] === 'm' ? 'rgba(107,68,35,.9)' : 'rgba(14,165,233,.9)' }); s.position.set(0, 0.5, 0); g.add(s);
    DYN.add(g); R.pud[id] = g; });
  for (const id in R.pud) if (!seen[id]) { DYN.remove(R.pud[id]); delete R.pud[id]; }
}
let printGeo = null;
function syncPrints(v) {
  if (v.prN < R.printN) { R.prints.forEach((m) => DYN.remove(m)); R.prints = []; R.printN = 0; }
  const start = v.prN - v.pr.length;
  if (!printGeo) printGeo = MD.G.circle;
  for (let i = Math.max(R.printN, start); i < v.prN; i++) {
    const q = v.pr[i - start]; if (!q) continue;
    const g = new T.Group(); g.position.set(q[0], 0.07, q[1]); g.rotation.y = q[2];
    const mat = MD.M('#5b3a1e'); const pad = new T.Mesh(printGeo, mat); pad.rotation.x = -Math.PI / 2; pad.scale.set(0.09, 0.08, 1); g.add(pad);
    [-0.07, 0, 0.07].forEach((x) => { const t = new T.Mesh(printGeo, mat); t.rotation.x = -Math.PI / 2; t.scale.setScalar(0.035); t.position.set(x, 0, 0.1); g.add(t); });
    DYN.add(g); R.prints.push(g); if (R.prints.length > 120) DYN.remove(R.prints.shift());
  }
  R.printN = v.prN;
}
/* ---------- people (owners, officers) ---------- */
function coneMat(col) { return new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.16, depthWrite: false, side: T.DoubleSide }); }
function mkPerson(kind, i) {
  const isOf = kind === 'of', def = OWNER_DEFS[i] || OWNER_DEFS[0];
  const ch = MD.person(isOf ? { shirt: '#1d4ed8', pants: '#1e293b', hair: '#111827', cap: '#1e3a8a' } : def.look);
  if (isOf) { const pole = MD.cyl(0.03, 1.3, '#78350f', ch.arms[1], 0, -0.9, 0.35); pole.rotation.x = 1.2; const ring = MD.mesh(MD.G.torus, '#e5e7eb', ch.arms[1], 0, -1.15, 0.95, 0.26, 0.26, 0.26); ring.rotation.x = 0.4; MD.mesh(MD.G.sph, MD.M('#ffffff', { transparent: true, opacity: 0.45 }), ch.arms[1], 0, -1.15, 0.95, 0.24, 0.24, 0.12).rotation.x = 0.4; }
  const cone = new T.Mesh(new T.CircleGeometry(isOf ? 3.2 : 2.8, 18, Math.PI / 2 - 0.62, 1.24), coneMat(isOf ? '#ef4444' : '#facc15')); cone.rotation.x = -Math.PI / 2; cone.position.y = 0.05; cone.renderOrder = 1; ch.g.add(cone);
  const tag = W.textSprite(isOf ? '\uD83D\uDE90 Animal Control' : def.name, { size: 26, h: 0.27, bg: isOf ? 'rgba(29,78,216,.9)' : 'rgba(219,39,119,.9)' }); tag.position.y = 2.25; ch.g.add(tag);
  DYN.add(ch.g);
  return { ch, cone, x: null, z: 0, yaw: 0, bub: null, bubTxt: '', st: '', stT: 0 };
}
function syncPeople(arr, data, kind, dt) {
  while (arr.length < data.length) arr.push(mkPerson(kind, arr.length));
  while (arr.length > data.length) { const r = arr.pop(); DYN.remove(r.ch.g); }
  data.forEach((d, i) => {
    const r = arr[i], g = r.ch.g, gone = d[6];
    g.visible = !gone; if (gone) return;
    if (r.x === null || GS.chaos.host) { r.x = d[0]; r.z = d[1]; r.yaw = d[2]; }
    else { const k = 1 - Math.exp(-dt * 12); r.x += (d[0] - r.x) * k; r.z += (d[1] - r.z) * k; r.yaw += ang(d[2] - r.yaw) * k; }
    g.position.set(r.x, 0, r.z); g.rotation.y = r.yaw;
    if (d[3] !== r.st) { r.st = d[3]; r.stT = 0; if (r.st === 'stun') W.fx('star', r.x, 2.1, r.z, 5, 0.5); if (r.st === 'dizzy') W.fx('star', r.x, 2.1, r.z, 6, 0.6); }
    r.stT += dt;
    const lying = r.st === 'slip', B = r.ch.body;
    g.rotation.x = 0; B.rotation.z = 0;
    if (lying) { r.ch.g.rotation.x = -Math.min(1.35, r.stT * 6); }
    else if (r.st === 'dizzy' || r.st === 'stun') B.rotation.z = Math.sin(r.stT * 9) * 0.12;
    r.ch.anim(dt, lying ? 0 : d[5], r.st === 'grab' || r.st === 'net' || r.st === 'blame2' || r.st === 'keys');
    r.cone.visible = !lying && r.st !== 'stun' && r.st !== 'dizzy' && r.st !== 'leave';
    r.cone.material.opacity = r.st === 'chase' || r.st === 'grab' || r.st === 'net' ? 0.3 : 0.14;
    if (d[4] !== r.bubTxt) {
      r.bubTxt = d[4]; if (r.bub) { r.ch.g.remove(r.bub); r.bub.material.map.dispose(); r.bub.material.dispose(); r.bub = null; }
      if (d[4]) { const big = d[4] === '?' || d[4] === '!'; r.bub = W.textSprite(d[4], { size: big ? 54 : 28, h: big ? 0.6 : 0.34, bg: 'rgba(255,255,255,.96)', color: big ? (d[4] === '!' ? '#dc2626' : '#7c3aed') : '#3a1747', border: kind === 'of' ? '#1d4ed8' : '#f472b6' }); r.bub.position.y = 2.75; r.ch.g.add(r.bub); }
    }
  });
}
function buildVan() {
  const g = new T.Group(), box = MD.box, cyl = MD.cyl, sph = MD.sph;
  box(4.4, 1.7, 2.0, '#ffffff', g, 0, 1.15, 0); box(1.3, 1.25, 1.95, '#ffffff', g, 2.75, 0.92, 0); box(0.05, 0.6, 1.7, '#7dd3fc', g, 3.42, 1.25, 0);
  box(4.42, 0.3, 2.02, '#1d4ed8', g, 0, 0.75, 0); box(0.9, 0.55, 0.05, '#7dd3fc', g, 2.75, 1.3, 1.0);
  [[-1.4, 1], [1.9, 1], [-1.4, -1], [1.9, -1]].forEach((q) => { const w = cyl(0.42, 0.3, '#111827', g, q[0], 0.42, q[1]); w.rotation.x = Math.PI / 2; });
  const red = sph(0.18, MD.M('#ef4444', { emissive: '#7f1d1d' }), g, 0.6, 2.1, 0), blue = sph(0.18, MD.M('#3b82f6', { emissive: '#1e3a8a' }), g, -0.6, 2.1, 0); box(1.6, 0.12, 0.4, '#334155', g, 0, 2.0, 0);
  const sign = new T.Mesh(MD.G.plane, new T.MeshBasicMaterial({ map: W.canvasTex(512, 128, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d4ed8'; c.font = '900 54px "Trebuchet MS",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('\uD83D\uDC3E ANIMAL CONTROL', w / 2, h / 2 + 3); }) }));
  sign.scale.set(3.6, 0.9, 1); sign.position.set(-0.3, 1.45, 1.02); g.add(sign);
  const s2 = W.textSprite('\uD83D\uDD13 RESCUE friends here', { size: 26, h: 0.3, bg: 'rgba(22,163,74,.92)' }); s2.position.set(VAN_DOOR[0] - VAN_X, 2.7, 1.0); s2.visible = false; g.add(s2);
  g.position.set(-36, 0, VAN_Z); DYN.parent.add(g);
  return { g, red, blue, sign2: s2, t: 0, x: -36 };
}
function vanTick(ac, dt) {
  if (!R.van) R.van = buildVan();
  const V = R.van, st = ac[0]; V.g.visible = !!st; if (!st) { V.x = -36; return; }
  V.x += (ac[1] - V.x) * (GS.chaos.host ? 1 : 1 - Math.exp(-dt * 10)); V.g.position.x = V.x; V.t += dt;
  const on = Math.floor(V.t * 6) % 2 === 0; V.red.visible = on || st === 'drive'; V.blue.visible = !on || st === 'drive';
  const anyCaught = view && Object.keys(view.pl).some((k) => view.pl[k].cg);
  V.sign2.visible = anyCaught && (st === 'here' || st === 'leave');
  if ((st === 'arrive' || st === 'here') && Math.floor(V.t * 0.5) !== Math.floor((V.t - dt) * 0.5) && st === 'arrive') Snd.fx('siren');
}
/* ---------- pets ---------- */
function petLookKey(lk) { return JSON.stringify(lk || {}); }
function ensurePet(pid, rec) {
  let r = R.pets[pid]; const key = petLookKey(rec.lk);
  if (r && r.key === key) return r;
  if (r) DYN.remove(r.g);
  const P = MD.pet(rec.lk || { sp: 'schnauzer', col: ['#888888', '#eeeeee'], lv: 7 }); const g = new T.Group(); g.add(P.g);
  const mine = pid === GS.pid;
  const tag = W.textSprite((mine ? '\u2B50 ' : '') + rec.n + (view && view.np > 1 ? ' \u00b7 ' + rec.pn : ''), { size: 24, h: 0.25, bg: mine ? 'rgba(124,58,237,.92)' : 'rgba(40,20,70,.85)', border: rec.c || '#fff' }); tag.position.y = (P.hTop || 0.8) + 0.45; g.add(tag);
  const ringM = new T.Mesh(MD.G.ring, new T.MeshBasicMaterial({ color: mine ? '#facc15' : (rec.c || '#ffffff'), transparent: true, opacity: 0.8, depthWrite: false })); ringM.rotation.x = Math.PI / 2; ringM.scale.setScalar(0.5); ringM.position.y = 0.06; g.add(ringM);
  const carry = new T.Group(); carry.position.y = (P.hTop || 0.8) + 0.05; g.add(carry);
  DYN.add(g);
  r = R.pets[pid] = { g, P, tag, key, icon: null, iconTxt: '', carry, carKey: '', x: rec.tpx, z: rec.tpz, yaw: 0, sp: 0, tp: rec.tp };
  return r;
}
function petIcon(rec) { return rec.cg ? '' : rec.to > 0 ? '\u23F3' : rec.home ? '\uD83C\uDFE0' : rec.hid ? '\uD83D\uDE48' : rec.abA === 'shell' ? '\uD83D\uDEE1\uFE0F' : rec.abA === 'sneak' ? '\uD83D\uDCA8' : rec.mud ? '\uD83D\uDC3E' : ''; }
function syncPets(v, dt) {
  const seen = {};
  for (const pid in v.pl) {
    const rec = v.pl[pid]; if (!rec.in && pid !== GS.pid) { if (R.pets[pid]) R.pets[pid].g.visible = false; continue; }
    seen[pid] = 1; const r = ensurePet(pid, rec), mine = pid === GS.pid;
    if (mine) { M.P = r.P; r.x = M.x; r.z = M.z; r.yaw = M.yaw; r.sp = M.sp; }
    else {
      const q = GS.pos[pid];
      if (q && q.a === 'chaos') { const far = Math.hypot(q.x - r.x, q.z - r.z) > 4 || r.tp !== rec.tp; const k = far ? 1 : 1 - Math.exp(-dt * 10); r.x += (q.x - r.x) * k; r.z += (q.z - r.z) * k; r.yaw += ang(q.r - r.yaw) * k; r.sp = q.m ? 4 : 0; r.tp = rec.tp; }
    }
    r.g.visible = !rec.cg; r.g.position.set(r.x, 0.03, r.z); r.P.g.rotation.y = r.yaw;
    const hidden = rec.hid || rec.abA === 'sneak';
    r.P.g.scale.setScalar(r.P.scale * (rec.hid ? 0.75 : 1));
    r.tag.material.opacity = hidden ? 0.5 : 1;
    if (rec.abA === 'shell') { if (r.P.act !== 'sleep') r.P.play('sleep', 1); }
    else if (r.P.act === 'sleep') r.P.act = null;
    r.P.anim(dt, rec.abA === 'shell' ? 0 : r.sp);
    if (rec.imm && !rec.home) r.P.g.visible = Math.floor(performance.now() / 120) % 2 === 0; else r.P.g.visible = true;
    const ic = petIcon(rec);
    if (ic !== r.iconTxt) { r.iconTxt = ic; if (r.icon) { r.g.remove(r.icon); r.icon = null; } if (ic) { r.icon = W.textSprite(ic, { size: 30, h: 0.34, bg: 'rgba(255,255,255,.9)', border: '#a78bfa' }); r.icon.position.y = (r.P.hTop || 0.8) + 0.85; r.g.add(r.icon); } }
    const ck = rec.car ? 'keys' : rec.carK || '';
    if (ck !== r.carKey) { r.carKey = ck; while (r.carry.children.length) r.carry.remove(r.carry.children[0]); if (ck) { const m = model(ck); m.scale.multiplyScalar(ck === 'keys' ? 0.8 : 0.55); r.carry.add(m); } }
    if (rec.mud && Math.random() < dt * 3) W.fx('dust', r.x, 0.15, r.z, 1, 0.3);
  }
  for (const pid in R.pets) if (!seen[pid] && R.pets[pid].g.visible) R.pets[pid].g.visible = false;
  // Mr. Fluff the cat, who gets blamed for everything
  if (!R.fluff) { const P = MD.pet({ sp: 'tabby', col: ['#e5e7eb', '#9ca3af'], lv: 7, acc: { neck: 'bellcollar' } }); P.g.position.set(FLUFF[0], 0.08, FLUFF[1]); A.g.add(P.g); const t = W.textSprite('Mr. Fluff \uD83D\uDCA4', { size: 24, h: 0.25 }); t.position.set(FLUFF[0], 1.3, FLUFF[1]); A.g.add(t); R.fluff = { P }; P.play('sleep', 3); }
  R.fluff.P.anim(dt, 0); if (!R.fluff.P.act) R.fluff.P.play('sleep', 3);
}
/* ---------- effects ---------- */
function floatText(text, x, z, col) {
  const s = W.textSprite(text, { size: 30, h: 0.34, bg: col || 'rgba(250,204,21,.95)', color: col ? '#fff' : '#3a1747' }); s.position.set(x, 1.6, z); DYN.add(s); R.floats.push({ s, t: 0 });
  if (R.floats.length > 14) { const f = R.floats.shift(); DYN.remove(f.s); }
}
function floats(dt) { R.floats = R.floats.filter((f) => { f.t += dt; f.s.position.y += dt * 0.9; f.s.material.opacity = Math.max(0, 1 - Math.max(0, f.t - 0.8) / 0.5); if (f.t > 1.3) { DYN.remove(f.s); f.s.material.map.dispose(); f.s.material.dispose(); return false; } return true; }); }
function onFx(e) {
  const me = e.pid === GS.pid, v = view, nm = e.n ? esc(e.n) : '';
  switch (e.k) {
    case 'pts': floatText('+' + e.n + (e.m > 1 ? ' x' + e.m : '') + (e.t ? ' ' + e.t : ''), e.x, e.z, me ? null : 'rgba(124,58,237,.92)'); if (me && e.m > 1) Snd.fx('tick'); break;
    case 'goal': { const L = lvDef(v.lv), g = L.goals[e.i]; if (g) msg('\u2705 GOAL!<small>' + esc(goalText(g, v.gn[e.i])) + '</small>', 2.2); Snd.fx('learn'); break; }
    case 'ac': msg('\uD83D\uDEA8 ANIMAL CONTROL!<small>Hide \uD83D\uDE48 or run HOME \uD83C\uDFE0 until they leave!</small>', 3); Snd.fx('siren'); break;
    case 'caught': if (me) { msg('\uD83D\uDE90 CAUGHT!<small>' + (v.np > 1 ? 'A friend can rescue you at the van!' : 'Animal Control got you!') + '</small>', 3); Snd.fx('miss'); } else { G.toast('\uD83D\uDE90 ' + nm + ' was caught! Rescue them at the van door!'); Snd.fx('no'); } break;
    case 'free': if (me) { msg('\uD83D\uDD13 FREE!', 1.6); Snd.fx('cheer'); } else G.toast('\uD83D\uDD13 ' + nm + ' was rescued!'); break;
    case 'home': if (me) G.toast('\uD83C\uDFE0 Animal Control dropped you back home.'); break;
    case 'to': if (me) { msg('\u23F3 TIME-OUT!<small>Wait in the playpen for 3 seconds\u2026</small>', 2.4); Snd.fx('no'); } break;
    case 'bonk': if (me) { msg('\uD83D\uDEE1\uFE0F BONK!<small>The net bounced off! Run!</small>', 1.8); } Snd.fx('bump'); break;
    case 'escape': msg('\uD83C\uDF89 ESCAPED!<small>Animal Control drove away. +150 chaos!</small>', 2.6); Snd.fx('cheer'); break;
    case 'slip': Snd.fx('slip'); W.fx('drop', e.x, 1, e.z, 6, 0.8); W.fx('star', e.x, 1.5, e.z, 4, 0.6); break;
    case 'dizzy': Snd.fx('trick'); break;
    case 'blame': if (R.fluff) R.fluff.P.play('nope', 1.6); Snd.fx('meow'); floatText('Not me! \uD83D\uDE3E', FLUFF[0], FLUFF[1], 'rgba(219,39,119,.92)'); break;
    case 'go': msg('\uD83D\uDCA5 CHAOS TIME!', 1.2); Snd.fx('go'); break;
    case 'ab': {
      const r = R.pets[e.pid];
      if (e.ab === 'bark') { const spc = GP.SPECIES[(v.pl[e.pid] || {}).lk ? v.pl[e.pid].lk.sp : 'schnauzer']; Snd.fx(spc && spc.snd ? spc.snd : 'bark'); shock(e.x, e.z, (v.pl[e.pid] && v.pl[e.pid].abn) || 'BARK'); if (r) r.P.play('jump', 0.4); }
      else if (e.ab === 'mimic') { Snd.fx('door'); floatText('\uD83D\uDD14 DING DONG!', e.x, e.z, 'rgba(37,99,235,.92)'); }
      else if (e.ab === 'shell') Snd.fx('bump');
      else if (e.ab === 'sneak') { Snd.fx('sparkle'); W.fx('sparkle', e.x, 0.6, e.z, 6, 0.6); }
      break; }
  }
}
function shock(x, z, label) {
  const m = new T.Mesh(MD.G.ring, new T.MeshBasicMaterial({ color: '#facc15', transparent: true, opacity: 0.8, depthWrite: false })); m.rotation.x = Math.PI / 2; m.position.set(x, 0.3, z); DYN.add(m);
  const f = { s: m, t: 0, ring: 1 }; R.floats.push({ s: m, t: 0.6 }); let t = 0;
  const step = () => { t += 0.016; m.scale.setScalar(0.5 + t * 14); m.material.opacity = Math.max(0, 0.8 - t * 1.6); if (t < 0.5 && m.parent) requestAnimationFrame(step); }; step(); void f;
  floatText(label + '!', x, z, 'rgba(234,88,12,.92)');
}
function applyView(dt) {
  const v = view, C = GS.chaos;
  if (v.ph === 'lobby') return;
  for (let i = 0; i < OBJS.length; i++) { const s = +v.ob[i] || 0, o = OBJS[i]; if (o.vs !== s) { objState(o, s, o.vs != null); o.vs = s; } animObj(o, dt); }
  syncPuddles(v.pu || []); syncPrints(v);
  syncPeople(R.ow, v.ow, 'ow', dt); syncPeople(R.of, v.of, 'of', dt);
  vanTick(v.ac, dt); syncPets(v, dt);
  (v.fx || []).forEach((e) => { if (e.id > C.fxSeen) { C.fxSeen = e.id; onFx(e); } });
  floats(dt);
}
/* ---------- my pet: movement, mud, prints, targets ---------- */
function findTarget(v, me) {
  if (me.car) { const h = hideAt(M.x, M.z); return h ? { k: 'hide', label: '\uD83D\uDD11 HIDE KEYS', h } : null; }
  if ((v.ac[0] === 'here' || v.ac[0] === 'leave') && dist(M.x, M.z, VAN_DOOR[0], VAN_DOOR[1]) < 2.2 && Object.keys(v.pl).some((k) => v.pl[k].cg)) return { k: 'rescue', label: '\uD83D\uDD13 RESCUE!' };
  let best = null, bd = 1e9;
  OBJS.forEach((o, i) => { if ((+v.ob[i] || 0) !== 0) return; const d = dist(M.x, M.z, o.x, o.z); if (d < o.reach && d < bd) { bd = d; best = o; } });
  return best ? { k: 'obj', o: best, label: VERB[best.type] } : null;
}
function localTick(dt) {
  const v = view, C = GS.chaos, me = v.pl && v.pl[GS.pid];
  if (!me || v.ph === 'lobby') return;
  if (me.tp !== M.tp) { M.tp = me.tp; M.x = me.tpx; M.z = me.tpz; M.dashT = 0; M.pounceT = 0; if (M.tp > 1) M.camSnap = M.camSnap || false; }
  const frozen = C.done || v.ph !== 'play' || me.cg || me.to > 0 || me.abA === 'shell';
  let ix = 0, iz = 0;
  if (!frozen && !GS.panel) {
    const K = G.keys; if (K.KeyW || K.ArrowUp) iz -= 1; if (K.KeyS || K.ArrowDown) iz += 1; if (K.KeyA || K.ArrowLeft) ix -= 1; if (K.KeyD || K.ArrowRight) ix += 1;
    ix += JOY.x; iz += JOY.y;
  }
  let mag = Math.hypot(ix, iz); if (mag > 1) { ix /= mag; iz /= mag; mag = 1; }
  M.dashCd = Math.max(0, M.dashCd - dt); M.abLocal = Math.max(0, M.abLocal - dt); M.actCd -= dt;
  let spd = me.spd * mag;
  if (M.pounceT > 0) { M.pounceT -= dt; spd = me.spd * 2.3; ix = Math.sin(M.yaw); iz = Math.cos(M.yaw); mag = 1; if (M.pounceT <= 0) { send({ a: 'pk', x: r2(M.x), z: r2(M.z) }); Snd.fx('bump'); W.fx('dust', M.x, 0.2, M.z, 7, 0.9); } }
  else if (M.dashT > 0) { M.dashT -= dt; spd = me.spd * 2.2; if (mag < 0.1) { ix = Math.sin(M.yaw); iz = Math.cos(M.yaw); mag = 1; } }
  if (frozen) { spd = 0; M.pounceT = 0; M.dashT = 0; }
  if (spd > 0.05 && mag > 0.05) {
    const r = moveEnt(M.x, M.z, ix * spd * dt, iz * spd * dt, me.small ? 0.2 : 0.3, me.small), moved = dist(r[0], r[1], M.x, M.z);
    M.x = r[0]; M.z = r[1]; M.sp = moved / dt; M.yaw += ang(yawOf(ix, iz) - M.yaw) * Math.min(1, dt * 14);
    if (me.mud && inHouse(M.x, M.z)) { M.prAcc += moved; if (M.prAcc >= 0.8) { M.prAcc = 0; M.side = !M.side; const o = M.side ? 0.09 : -0.09; send({ a: 'pr', x: r2(M.x + Math.cos(M.yaw) * o), z: r2(M.z - Math.sin(M.yaw) * o), r: r2(M.yaw) }); } }
  } else M.sp = 0;
  if (!me.mud && !frozen) { M.mudSent -= dt; const inMud = dist(M.x, M.z, MUD_PIT[0], MUD_PIT[1]) < MUD_PIT[2] || (v.pu || []).some((q) => q[2] === 'm' && dist(M.x, M.z, q[0], q[1]) < 0.75); if (inMud && M.mudSent <= 0) { M.mudSent = 1; send({ a: 'mud' }); } }
  if (me.mud && !M.wasMud) { G.toast('\uD83D\uDC3E Muddy paws! Run inside to leave paw prints!'); Snd.fx('splash'); }
  M.wasMud = me.mud;
  GS.me.x = M.x; GS.me.z = M.z; GS.me.yaw = M.yaw; GS.me.sp = M.sp; GS.me.area = 'chaos';
  M.tgt = frozen ? null : findTarget(v, me);
}
function pressAct() {
  const v = view, me = v && v.pl[GS.pid]; if (!me || !M || GS.chaos.done || v.ph !== 'play' || M.actCd > 0) return;
  const t = M.tgt; if (!t) { Snd.fx('no'); return; } M.actCd = 0.25;
  if (t.k === 'hide') send({ a: 'hidekeys' });
  else if (t.k === 'rescue') send({ a: 'rescue' });
  else { send({ a: 'act', o: t.o.i }); if (M.P) M.P.play(t.o.type === 'steal' ? 'eat' : t.o.type === 'dig' ? 'dig' : 'jump', 0.45); }
}
function pressDash() { const v = view, me = v && v.pl[GS.pid]; if (!me || GS.chaos.done || v.ph !== 'play' || me.cg || me.to > 0 || me.abA === 'shell' || M.dashCd > 0) return; M.dashT = 0.4; M.dashCd = 2.5; Snd.fx('jump'); W.fx('dust', M.x, 0.2, M.z, 5, 0.6); }
function pressAb() {
  const v = view, me = v && v.pl[GS.pid]; if (!me || GS.chaos.done || v.ph !== 'play' || me.cg || me.to > 0) return;
  if (me.abCd > 0.05 || M.abLocal > 0) { Snd.fx('no'); return; }
  send({ a: 'ab' }); M.abLocal = ABIL[me.ab].cd;
  if (me.ab === 'pounce') { M.pounceT = 0.5; if (M.P) M.P.play('jump', 0.5); Snd.fx('jump'); }
}
function camera(dt) {
  const c = W.camera, pf = c.aspect < 0.8 ? 1.25 : 1, h = 9.2 * pf, d = 7.6 * pf, me = view && view.pl && view.pl[GS.pid];
  let x = M.x, z = M.z; if (me && me.cg && R.van) { x = R.van.x; z = VAN_Z - 1.5; }
  const k = M.camSnap ? 1 : 1 - Math.exp(-dt * 6); M.camSnap = false;
  W.camPos.lerp(new T.Vector3(x, h, z + d), k); W.camLook.lerp(new T.Vector3(x, 0.4, z - 0.6), k); c.position.copy(W.camPos); c.lookAt(W.camLook);
}
/* ---------- HUD ---------- */
let msgT = 0;
function msg(html, dur, big) { const e = $('chMsg'); e.innerHTML = html; e.classList.remove('hidden'); e.classList.toggle('big', !!big); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); msgT = dur || 2; }
function fmtT(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function setT(id, s) { const e = $(id); if (e.textContent !== s) e.textContent = s; }
function setH(id, h) { const e = $(id); if (e._h !== h) { e._h = h; e.innerHTML = h; } }
function goalRow(L, v, i) {
  const g = L.goals[i], need = v.gn[i], val = v.gv[i], done = v.gd[i];
  const cnt = g[0] === 'combo' ? 'x' + Math.min(val, need) : need > 1 ? Math.min(val, need) + '/' + need : '';
  return '<div class="chGoal' + (done ? ' on' : '') + '" data-g="' + g[0] + '">' + (done ? '\u2705' : '\u2B1C') + ' ' + esc(goalText(g, need)) + (cnt ? ' <b>' + cnt + '</b>' : '') + '</div>';
}
function hud(dt) {
  const v = view; if (!v || !v.pl) return; const me = v.pl[GS.pid] || {}, L = lvDef(v.lv);
  msgT -= dt; if (msgT <= 0 && !$('chMsg').classList.contains('hidden')) $('chMsg').classList.add('hidden');
  if (v.ph === 'count') { const n = Math.ceil(v.cd); if (n !== lastCount && n >= 1 && n <= 3) { lastCount = n; msg(String(n), 0.9, true); Snd.fx('tick'); } }
  setT('chLv', L.icon + ' ' + L.id + '. ' + L.name);
  setT('chTime', '\u23F1 ' + fmtT(v.ph === 'count' ? L.time : v.t)); $('chTime').classList.toggle('low', v.ph === 'play' && v.t < 15);
  setT('chScore', '\uD83D\uDCA5 ' + (me.sc || 0));
  const cf = me.ct > 0 ? me.ct / (me.ctm || 4.5) : 0; $('chComboF').style.width = (cf * 100).toFixed(1) + '%';
  setT('chComboT', me.cb > 1 ? '\uD83D\uDD25 COMBO x' + me.cm + '  (keep making messes!)' : me.ct > 0 ? 'Quick, another mess for a COMBO!' : 'Make a mess to start a combo');
  $('chComboB').classList.toggle('hot', me.cb > 1);
  const a = v.ac[0]; let ht, hf = v.heat / 100, alert = false;
  if (a === 'arrive') { ht = '\uD83D\uDEA8 Animal Control is coming! HIDE!'; alert = true; hf = 1; }
  else if (a === 'here') { ht = '\uD83D\uDE90 Hide or go HOME! They leave in ' + v.ac[2] + 's'; hf = v.ac[2] / 30; alert = true; }
  else if (a) { ht = '\uD83D\uDE90 Animal Control is leaving\u2026'; hf = 0; }
  else ht = '\uD83D\uDD0A Noise ' + v.heat + '%  \u00b7  100% = Animal Control!';
  setT('chHeatT', ht); $('chHeatF').style.width = (hf * 100).toFixed(1) + '%'; $('chHeatB').classList.toggle('alert', alert);
  const gk = v.lv + '|' + v.gd.join('') + '|' + v.gv.join(',') + '|' + (v.np > 1 ? v.team : '');
  if (gk !== goalKey) { goalKey = gk; setH('chGoals', L.goals.map((g, i) => goalRow(L, v, i)).join('') + (v.np > 1 ? '<div class="chTeam">\uD83E\uDD1D TEAM \uD83D\uDCA5 ' + v.team + '</div>' : '')); }
  const others = Object.keys(v.pl).filter((k) => k !== GS.pid);
  const mk = others.map((k) => { const p = v.pl[k]; return k + p.sc + petIcon(p) + p.cg + p.in; }).join('|');
  if (mk !== mateKey) { mateKey = mk; setH('chMates', others.map((k) => { const p = v.pl[k]; return '<div class="chMate' + (p.cg ? ' cg' : '') + (p.in ? '' : ' off') + '" style="--c:' + esc(p.c) + '"><b>' + esc(p.n) + '</b> ' + (p.cg ? '\uD83D\uDE90' : petIcon(p)) + ' ' + p.sc + '</div>'; }).join('')); }
  let b = '';
  if (me.cg) b = '\uD83D\uDE90 Caught! ' + (v.np > 1 ? 'A friend can tap RESCUE at the van door' : '');
  else if (me.to > 0) b = '\u23F3 Time-out\u2026 ' + Math.ceil(me.to);
  else if (me.home) b = '\uD83C\uDFE0 Safe at home! Nobody can catch you here';
  else if (me.hid) { const h = hideAt(M.x, M.z); b = '\uD83D\uDE48 Hiding ' + (h ? h.n : ''); }
  else if (me.car) b = '\uD83D\uDD11 Now hide the keys in a purple \uD83D\uDFE3 hiding spot!';
  else if (me.abA === 'sneak') b = '\uD83D\uDCA8 Sneaking\u2026 they can barely see you';
  else if (me.abA === 'shell') b = '\uD83D\uDEE1\uFE0F Safe in your shell';
  else if (me.mud) b = '\uD83D\uDC3E Muddy paws! Run inside!';
  else if (v.ph !== 'play' || v.t > L.time - 6) b = '\uD83D\uDC46 Drag anywhere to run';
  else b = '\uD83D\uDCCD ' + ROOMNAME[roomAt(M.x, M.z)] + (me.lives > 1 ? '  \u00b7  \u2764\uFE0F x' + me.lives : '');
  setT('chBadge', b);
  const t = M.tgt;
  setH('chAct', t ? '<b>' + esc(t.label) + '</b>' : '<b>\uD83D\uDC3E</b><small>walk up to stuff</small>'); $('chAct').classList.toggle('dim', !t);
  const ab = ABIL[me.ab] || ABIL.bark, cd = Math.max(me.abCd || 0, M.abLocal);
  setH('chAb', '<b>' + ab.icon + '</b><small>' + (cd > 0.05 ? Math.ceil(cd) + 's' : esc(me.abn || ab.name)) + '</small>'); $('chAb').classList.toggle('cd', cd > 0.05);
  setH('chDash', '<b>\uD83D\uDCA8</b><small>' + (M.dashCd > 0.05 ? Math.ceil(M.dashCd) + 's' : 'DASH') + '</small>'); $('chDash').classList.toggle('cd', M.dashCd > 0.05);
}
/* ---------- lobby ---------- */
function canHost() { return GS.role !== 'client'; }
CH.lobby = function () {
  if (!G.inGame()) return;
  if (GS.mg) { G.toast('Finish the mini game first!', true); return; }
  if (GS.chaos) return;
  if (GS.role === 'host' && (!CS || CS.ph !== 'lobby')) { CS = { gid: newGid(), ph: 'lobby', lv: cdata().lv, picks: {}, pl: {} }; CS.picks[GS.pid] = cleanPick(pickMsg(myPick())); LOB.gid = CS.gid; sendNow(); }
  if (GS.role === 'client') send(Object.assign({ a: 'pick' }, pickMsg(myPick())));
  renderLobby();
};
function renderLobby() {
  const c = cdata(), r = roster(), pk = myPick(), host = canHost(), client = GS.role === 'client', online = G.online();
  let h = G.head('\uD83D\uDCA5 Animal Chaos');
  h += '<p class="sub">Be the pet! Make a mess, confuse your owner, and escape Animal Control.</p>';
  h += '<h3 class="chH">Pick your pet</h3><div class="chRoster">' + r.map((q) => { const k = petKit(q.sp, q.fam); return '<button class="chPet' + (q.key === pk.key ? ' on' : '') + '" data-a="chPick" data-v="' + esc(q.key) + '"><img src="' + G.portrait(q.look) + '" alt=""><b>' + esc(q.name) + '</b><small>' + ABIL[k.ab].icon + ' ' + esc(k.abName) + (k.small ? ' \u00b7 tiny' : '') + '</small></button>'; }).join('') + '</div>';
  const k = petKit(pk.sp, pk.fam);
  h += '<div class="chPick"><b>' + esc(pk.name) + '</b>: ' + esc(k.desc) + '. ' + ABIL[k.ab].icon + ' <b>' + esc(k.abName) + '</b>: ' + esc(ABIL[k.ab].desc) + '.' + (k.perk ? ' <span>\u2B50 ' + esc(k.perk) + '</span>' : '') + '</div>';
  if (client) {
    const lob = LOB.view;
    h += '<p class="sub">\u23F3 Waiting for the host to start' + (lob && lob.ph === 'lobby' ? ' <b>' + esc(lvDef(lob.lv).name) + '</b>' : '') + '\u2026 Your pick is sent automatically.</p>';
    if (!lob || lob.ph !== 'lobby') h += '<button class="btn blue" data-a="chSuggest">\uD83D\uDCA1 ASK THE HOST TO PLAY</button>';
    if (lob && lob.picks) h += '<div class="chPlayers">' + Object.keys(lob.picks).map((pid) => '<span>' + esc(playerName(pid)) + ': <b>' + esc(lob.picks[pid]) + '</b></span>').join('') + '</div>';
  } else {
    h += '<h3 class="chH">Level</h3><div class="chLevels">' + LV.map((L) => { const open = L.id === 1 || (c.stars[L.id - 1] || 0) >= 1 || L.id <= c.lv; const st = c.stars[L.id] || 0; return '<button class="chLv' + (L.id === c.lv ? ' on' : '') + '" data-a="chLv" data-v="' + L.id + '"' + (open ? '' : ' disabled') + '><i>' + (open ? L.icon : '\uD83D\uDD12') + '</i><b>' + L.id + '. ' + esc(L.name) + '</b><small>' + '\u2605'.repeat(st) + '\u2606'.repeat(3 - st) + (c.best[L.id] ? ' \u00b7 best ' + c.best[L.id] : '') + '</small></button>'; }).join('') + '</div>';
    const L = lvDef(c.lv);
    h += '<div class="chPick">' + L.icon + ' <b>' + esc(L.name) + '</b>: ' + esc(L.intro) + '<br>' + L.goals.map((g) => '\u2B1C ' + esc(goalText(g, goalNeed(g, 1)))).join('<br>') + '</div>';
    if (online && G.friends().length) h += '<div class="chPlayers">' + G.friends().map((f) => '<span>' + esc(f.name) + ': <b>' + esc(CS && CS.picks && CS.picks[f.pid] ? CS.picks[f.pid].name : '\u2026picking') + '</b></span>').join('') + '</div>';
    h += '<div class="row"><button class="btn primary big" data-a="chStart">\u25B6 ' + (online && G.friends().length ? 'START FOR EVERYONE' : 'START') + '</button></div>';
  }
  h += '<div class="row"><button class="btn" data-a="chHow">\u2753 HOW TO PLAY</button></div>';
  G.openPanel('chaos', h);
}
function playerName(pid) { const q = GS.S && GS.S.players.find((x) => x.pid === pid); return q ? q.name : 'Friend'; }
function howHtml() {
  return G.head('\u2753 Animal Chaos') + '<ul class="how">' +
    '<li>\uD83D\uDC46 <b>Drag anywhere</b> to run (or WASD / arrow keys).</li>' +
    '<li>\uD83D\uDCA5 Walk up to things and tap the big button: knock things over, steal snacks and socks, tip trash, spill water, unroll toilet paper.</li>' +
    '<li>\uD83D\uDD25 Messes in a row make a <b>COMBO</b> for more points.</li>' +
    '<li>\uD83D\uDC3E Step in <b>mud</b> outside, then run inside to leave paw prints.</li>' +
    '<li>\u2753 Noises make your owner come and look. Hide in a <b>purple circle</b> and they get confused, or even blame Mr. Fluff the cat!</li>' +
    '<li>\u23F3 If your owner grabs you, it is a short time-out in the playpen.</li>' +
    '<li>\uD83D\uDE90 Too much noise brings <b>Animal Control</b>! Hide, DASH away, or run to a gold <b>HOME</b> circle until the van leaves. If their net gets you, the round is over (friends can rescue you at the van).</li>' +
    '<li>\uD83D\uDC15 Dogs BARK to startle people \u00b7 \uD83D\uDC22 tortoises hide in their SHELL \u00b7 \uD83D\uDC00 rats SNEAK and squeeze through \uD83D\uDC2D pet holes \u00b7 \uD83D\uDC31 cats POUNCE \u00b7 \uD83E\uDD9C birds ring the DING DONG doorbell.</li>' +
    '<li>\u2B50 Finish goals to earn stars, coins and unlock new levels.</li></ul><div class="row"><button class="btn primary" data-a="chOpen">\u25C0 BACK</button></div>';
}
function lobbyClosed() { if (starting || GS.chaos) return; if (CS && CS.ph === 'lobby') { const gid = CS.gid; CS = null; if (GS.room && GS.role === 'host') GS.room.broadcast({ t: 'cs', s: { gid, ph: 'none' } }); } }
function startFromLobby(lv) {
  if (GS.role === 'client' || GS.mg || !G.inGame()) return;
  starting = true; if (GS.panel) G.closePanel(); starting = false;
  if (GS.role === 'host' && (!CS || CS.ph !== 'lobby')) { CS = { gid: newGid(), ph: 'lobby', lv, picks: {}, pl: {} }; }
  if (!CS || CS.ph !== 'lobby') CS = { gid: newGid(), ph: 'lobby', lv, picks: {}, pl: {} };
  CS.picks[GS.pid] = cleanPick(pickMsg(myPick()));
  hostStart(lv);
  const c = cdata(); c.rounds = c.rounds || 0; G.persist();
}
function hostStart(lvId) {
  buildArea();
  const prev = CS && CS.ph === 'lobby' ? CS : null, L = lvDef(lvId);
  CS = freshCS(L.id, prev ? prev.gid : null);
  const S = GS.S, players = S && S.players.length ? S.players : [{ pid: GS.pid, name: G.myName(), color: G.prof.color }];
  const TC = G.teamColors ? G.teamColors() : {};
  players.forEach((pl, i) => { const pk = pl.pid === GS.pid ? cleanPick(pickMsg(myPick())) : ((prev && prev.picks[pl.pid]) || defaultPick(i)); CS.pl[pl.pid] = mkRec({ name: pl.name, color: TC[pl.pid] || pl.color }, pk, i); });
  CS.np = Object.keys(CS.pl).length;
  for (let i = 0; i < L.owners; i++) { const d = OWNER_DEFS[i], e = mkWalker('ow', i, d.at[0], d.at[1]); CS.ow.push(e); }
  enterLocal(true);
  sendNow();
}
/* ---------- network: snapshots from the host ---------- */
CH.onState = function (s) {
  if (!s || GS.role !== 'client') return;
  const C = GS.chaos;
  if (s.ph === 'none') { LOB.view = null; if (GS.panel === 'chaos') renderLobby(); if (C && !C.done && C.gid === s.gid) showResults(view, 'host'); return; }
  if (s.ph === 'lobby') { const first = !LOB.view || LOB.view.gid !== s.gid; LOB.view = s; if (C) return; if (first && G.inGame() && !GS.mg && (!GS.panel || GS.panel === 'chaos')) { renderLobby(); send(Object.assign({ a: 'pick' }, pickMsg(myPick()))); G.toast('\uD83D\uDCA5 The host opened Animal Chaos! Pick your pet.'); } else if (GS.panel === 'chaos') renderLobby(); return; }
  if (C && C.gid === s.gid) { view = s; C.lastRx = performance.now(); return; }
  if (C && C.gid !== s.gid) { if (!C.done) return; CH.exit(); }
  if (s.ph === 'over' || !G.inGame() || GS.mg) return;
  LOB.view = null; enterLocal(false, s);
};
/* ---------- results ---------- */
function showResults(v, why) {
  const C = GS.chaos; if (!C || C.done) return; C.done = true;
  JOY.x = JOY.y = 0; $('chJoy').classList.remove('on');
  if (!v || !v.pl) { CH.exit(); G.toast('Animal Chaos ended.'); return; }
  const me = v.pl[GS.pid] || { sc: 0, best: 1, esc: 0 }, L = lvDef(v.lv), nStars = (v.gd || []).reduce((a, b) => a + b, 0);
  const full = why !== 'left' && why !== 'host' && v.reason !== 'quit';
  const coins = full ? Math.min(220, Math.round(me.sc / 20) + 15 * nStars + (me.esc ? 20 : 0)) : Math.min(120, Math.round(me.sc / 20));
  const c = cdata(); c.rounds = (c.rounds || 0) + 1; let newBest = false;
  if (full) { if ((c.best[L.id] || 0) < me.sc) { c.best[L.id] = me.sc; newBest = true; } c.stars[L.id] = Math.max(c.stars[L.id] || 0, nStars); if (nStars >= 1 && L.id < LV.length && c.lv === L.id) c.lv = L.id + 1; }
  if (coins > 0) G.addCoins(coins);
  const pk = myPick(), owned = pk.pid ? G.petById(pk.pid) : null; if (owned && full) G.addXP(owned, 10 + nStars * 8);
  G.persist();
  const title = why === 'host' ? '\uD83D\uDC4B The host ended the game' : v.reason === 'caught' ? '\uD83D\uDE90 Caught by Animal Control!' : (why === 'left' || v.reason === 'quit') ? '\uD83C\uDFF3\uFE0F Round ended' : nStars === 3 ? '\uD83C\uDFC6 TOTAL CHAOS!' : nStars ? '\uD83D\uDCA5 What a mess!' : '\uD83D\uDE3A Nice try!';
  let h = G.head(title);
  h += '<div class="chStars">' + '\u2605'.repeat(nStars) + '<i>' + '\u2606'.repeat(3 - nStars) + '</i></div><p class="sub">' + L.icon + ' ' + esc(L.name) + (v.reason === 'caught' ? ' \u00b7 The net got you this time!' : '') + '</p>';
  h += '<div class="chRes"><div><b>' + me.sc + '</b><small>chaos points' + (newBest ? ' \u00b7 NEW BEST!' : '') + '</small></div><div><b>x' + (me.best || 1) + '</b><small>best combo</small></div><div><b>+' + coins + '</b><small>\uD83E\uDE99 coins</small></div></div>';
  h += '<div class="chGoalsRes">' + L.goals.map((g, i) => goalRow(L, v, i)).join('') + '</div>';
  const ids = Object.keys(v.pl);
  if (ids.length > 1) h += '<div class="chPlayers">' + ids.sort((a, b) => v.pl[b].sc - v.pl[a].sc).map((k, i) => '<span>' + (i === 0 ? '\uD83D\uDC51 ' : '') + esc(v.pl[k].pn) + ' (' + esc(v.pl[k].n) + '): <b>' + v.pl[k].sc + '</b></span>').join('') + '<span>\uD83E\uDD1D Team: <b>' + v.team + '</b></span></div>';
  if (owned && full) h += '<p class="sub small">' + esc(owned.name) + ' earned XP for all that chaos!</p>';
  h += '<div class="row"><button class="btn" data-a="chExit">CONTINUE</button>';
  if (canHost() && why !== 'host') { h += '<button class="btn blue" data-a="chAgain">\u21BB PLAY AGAIN</button>'; if (nStars >= 1 && L.id < LV.length) h += '<button class="btn primary" data-a="chNext">NEXT LEVEL \u25B6</button>'; }
  h += '</div>';
  if (GS.role === 'client' && why !== 'host') h += '<p class="sub small">The host picks the next round.</p>';
  setTimeout(() => { if (GS.chaos && GS.chaos.done) G.openPanel('chres', h); }, v.reason === 'caught' ? 1200 : 500);
  Snd.fx(nStars ? 'level' : 'leave');
}
CH.exit = function () {
  const C = GS.chaos; if (!C) return;
  GS.chaos = null; view = null; JOY.x = JOY.y = 0;
  if (C.host && CS && CS.gid === C.gid) { const gid = CS.gid; CS = null; if (GS.room && GS.role === 'host') GS.room.broadcast({ t: 'cs', s: { gid, ph: 'none' } }); }
  clearDyn(); $('chHud').classList.add('hidden'); $('chMsg').classList.add('hidden'); document.body.classList.remove('inchaos');
  if (GS.panel === 'chres' || GS.panel === 'chaos') { starting = true; G.closePanel(); starting = false; }
  if (!G.inGame()) return;
  const r = C.ret; GS.me.area = r.a; GS.me.x = r.x; GS.me.z = r.z; GS.me.sp = 0;
  W.setArea(r.a); if (r.a === 'home') W.placeHome(G.homeLayout()); G.refreshGate(); W.updateCamera(GS.me.x, GS.me.z, 0, true);
};
CH.abort = function () { if (GS.chaos) CH.exit(); CS = null; LOB.gid = 0; LOB.view = null; };
CH.active = () => !!GS.chaos;
CH.quit = function () {
  const C = GS.chaos; if (!C) return;
  if (C.done) { CH.exit(); return; }
  if (C.host) { if (CS) { CS.reason = 'quit'; over('quit'); } }
  else { send({ a: 'leave' }); showResults(view, 'left'); }
};
CH.key = function (code, down, e) {
  if (!GS.chaos || !down || (e && e.repeat)) return;
  if (code === 'Escape') { if (GS.panel) { if (GS.panel !== 'chres') G.closePanel(); } else if (confirm('Leave Animal Chaos? You keep the coins you earned.')) CH.quit(); return; }
  if (GS.panel) return;
  if (code === 'Space' || code === 'KeyE' || code === 'Enter') pressAct();
  else if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyQ') pressDash();
  else if (code === 'KeyR' || code === 'KeyF') pressAb();
};
const prevClose = G.onPanelClose;
G.onPanelClose = function (was) {
  if (prevClose) prevClose(was);
  if (was === 'chres' && GS.chaos && !starting) CH.exit();
  if ((was === 'chaos' || was === 'chaoshow') && !starting) lobbyClosed();
};
// lobby heartbeat so late joiners and new friends see the open lobby
setInterval(() => { if (CS && CS.ph === 'lobby' && GS.role === 'host' && GS.room) sendNow(); if (CS && CS.ph === 'lobby' && GS.role !== 'host' && !GS.panel) CS = null; }, 1000);
/* ---------- DOM: buttons, joystick, panel actions ---------- */
(function initDom() {
  const el = $('chTouch'), base = $('chJoy'), knob = $('chKnob'); let id = null, ox = 0, oy = 0;
  el.addEventListener('pointerdown', (e) => { Snd.init(); if (id !== null || GS.panel) return; id = e.pointerId; try { el.setPointerCapture(id); } catch (er) { /* ignore */ } ox = e.clientX; oy = e.clientY; base.style.left = ox + 'px'; base.style.top = oy + 'px'; base.classList.add('on'); knob.style.transform = ''; JOY.x = JOY.y = 0; e.preventDefault(); });
  el.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; let dx = e.clientX - ox, dy = e.clientY - oy; const d = Math.hypot(dx, dy), Rr = 55; if (d > Rr) { dx *= Rr / d; dy *= Rr / d; } JOY.x = dx / Rr; JOY.y = dy / Rr; if (Math.hypot(JOY.x, JOY.y) < 0.12) JOY.x = JOY.y = 0; knob.style.transform = 'translate(' + dx.toFixed(0) + 'px,' + dy.toFixed(0) + 'px)'; });
  const up = (e) => { if (e.pointerId !== id) return; id = null; JOY.x = JOY.y = 0; base.classList.remove('on'); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  const btn = (bid, fn) => $(bid).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); Snd.init(); fn(); });
  btn('chAct', pressAct); btn('chDash', pressDash); btn('chAb', pressAb);
  $('chQuit').addEventListener('click', () => { if (!GS.chaos) return; if (GS.chaos.done) { CH.exit(); return; } if (confirm('Leave Animal Chaos? You keep the coins you earned.')) CH.quit(); });
  $('chGoals').addEventListener('click', (e) => { const g = e.target.closest('[data-g]'); if (g && GOALHINT[g.dataset.g]) G.toast('\uD83D\uDCA1 ' + GOALHINT[g.dataset.g]); });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; const a = b.dataset.a, v = b.dataset.v;
    switch (a) {
      case 'chOpen': if (GS.panel === 'games') { starting = true; G.closePanel(); starting = false; } CH.lobby(); break;
      case 'chPick': { const c = cdata(); c.pick = v; G.persist(); if (GS.role === 'client') send(Object.assign({ a: 'pick' }, pickMsg(myPick()))); else if (CS && CS.ph === 'lobby') { CS.picks[GS.pid] = cleanPick(pickMsg(myPick())); sendNow(); } renderLobby(); break; }
      case 'chLv': { const c = cdata(); c.lv = +v || 1; G.persist(); if (CS && CS.ph === 'lobby') { CS.lv = c.lv; sendNow(); } renderLobby(); break; }
      case 'chStart': startFromLobby(cdata().lv); break;
      case 'chHow': starting = true; G.openPanel('chaoshow', howHtml()); starting = false; break;
      case 'chSuggest': send({ a: 'suggest' }); G.toast('\uD83D\uDCA1 You asked the host to play Animal Chaos!'); break;
      case 'chExit': CH.exit(); break;
      case 'chAgain': { const lv = view ? view.lv : cdata().lv; CH.exit(); if (G.online() && G.friends().length) { cdata().lv = lv; CH.lobby(); } else startFromLobby(lv); break; }
      case 'chNext': { const lv = Math.min(LV.length, (view ? view.lv : 1) + 1); cdata().lv = lv; CH.exit(); if (G.online() && G.friends().length) CH.lobby(); else startFromLobby(lv); break; }
    }
  });
})();
/* ---------- test / debug hooks ---------- */
CH.dbg = {
  cs: () => CS, view: () => view, me: () => M, objs: () => OBJS.map((o) => ({ i: o.i, id: o.id, type: o.type, x: o.x, z: o.z })), hides: () => HIDES, LV, roomAt, route,
  tp: (x, z) => { if (M) { M.x = x; M.z = z; GS.me.x = x; GS.me.z = z; } },
  act: pressAct, dash: pressDash, ab: pressAb, joy: (x, y) => { JOY.x = x; JOY.y = y; },
  heat: (h) => { if (CS) CS.heat = h; }, time: (t) => { if (CS) CS.t = t; }, skipCount: () => { if (CS && CS.ph === 'count') CS.cd = 0.01; },
  acLeft: (s) => { if (CS && CS.ac.st === 'here') CS.ac.t = 30 - s; },
  walkable: (x, z, r, small) => { if (small) SMALL.forEach((o) => { o.off = true; }); const ok = W.isFree(A, x, z, r || 0.3); if (small) SMALL.forEach((o) => { o.off = false; }); return ok; }
};
})();
