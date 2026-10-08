/* Grok Pets - 3D world: renderer, town + interiors, collisions, hot spots, camera, fx */
(function () {
'use strict';
const GP = window.GP, T = window.THREE, MD = GP.MD, TAU = Math.PI * 2;
const W = GP.W = {};
const { box, ell, sph, cyl, cone, grp, mesh, M, G } = MD;

/* ---------------- canvas helpers ---------------- */
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.anisotropy = 4; return t; }
W.canvasTex = canvasTex;
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
W.rr = rr;
W.textSprite = function (text, opts) {
  opts = opts || {};
  const fs = opts.size || 44, pad = 16, c = document.createElement('canvas'), g = c.getContext('2d');
  const font = '800 ' + fs + 'px "Trebuchet MS",system-ui,sans-serif';
  g.font = font; const tw = Math.ceil(g.measureText(text).width) + pad * 2; c.width = Math.max(tw, fs * 1.4); c.height = Math.round(fs + pad * 1.4);
  g.font = font; rr(g, 3, 3, c.width - 6, c.height - 6, c.height / 2 - 3); g.fillStyle = opts.bg || 'rgba(40,20,70,.85)'; g.fill();
  g.lineWidth = 5; g.strokeStyle = opts.border || '#fff'; g.stroke();
  g.fillStyle = opts.color || '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new T.CanvasTexture(c); tex.minFilter = T.LinearFilter;
  const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, depthTest: opts.depth !== false ? false : false, transparent: true }));
  const hh = opts.h || 0.42; sp.scale.set(hh * c.width / c.height, hh, 1); sp.renderOrder = 20; return sp;
};
function signPlane(text, w, h, bg, fg) {
  const t = canvasTex(512, Math.round(512 * h / w), (g, cw, ch) => { g.fillStyle = bg; rr(g, 4, 4, cw - 8, ch - 8, 30); g.fill(); g.lineWidth = 10; g.strokeStyle = '#fff'; g.stroke(); g.fillStyle = fg || '#fff'; g.font = '900 ' + Math.round(ch * 0.5) + 'px "Trebuchet MS",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cw / 2, ch / 2 + 4); });
  const m = new T.Mesh(G.plane, new T.MeshBasicMaterial({ map: t, transparent: true })); m.scale.set(w, h, 1); return m;
}
function tileTex(a, b, n) { const t = canvasTex(128, 128, (g) => { g.fillStyle = a; g.fillRect(0, 0, 128, 128); g.fillStyle = b; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64); }); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(n, n); return t; }
function woodTex() { const t = canvasTex(256, 256, (g) => { g.fillStyle = '#e2b47a'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#d9a868' : '#e8bd86'; g.fillRect(0, i * 32, 256, 30); g.fillStyle = 'rgba(120,70,30,.25)'; g.fillRect((i * 97) % 256, i * 32, 3, 30); } }); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(4, 4); return t; }

/* ---------------- renderer ---------------- */
W.init = function (canvas) {
  const r = W.renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const sc = W.scene = new T.Scene(); sc.background = new T.Color('#a8e6ff');
  W.camera = new T.PerspectiveCamera(50, 1, 0.3, 260);
  sc.add(new T.HemisphereLight(0xffffff, 0xa89880, 0.68));
  const sun = new T.DirectionalLight(0xffffff, 0.5); sun.position.set(8, 16, 10); sc.add(sun);
  W.areas = {}; W.cur = null; W.ray = new T.Raycaster(); W.time = 0; W.fxList = []; W.camOverride = null;
  W.camPos = new T.Vector3(0, 10, 10); W.camLook = new T.Vector3();
  W.resize();
};
W.resize = function () { const w = innerWidth, h = innerHeight; W.renderer.setSize(w, h, false); W.camera.aspect = w / h; W.camera.updateProjectionMatrix(); };
W.render = function () { W.renderer.render(W.scene, W.camera); };

/* ---------------- areas ---------------- */
function newArea(id, o) { const A = Object.assign({ id, g: new T.Group(), walk: [], obs: [], hots: [], ground: [], spawn: [0, 0], cam: { h: 10, d: 11 }, bg: '#a8e6ff', fog: null }, o); A.g.visible = false; W.scene.add(A.g); W.areas[id] = A; return A; }
function hot(A, o) { const h = Object.assign({ reach: 1.8, h: 1.6 }, o); A.hots.push(h); return h; }
function rect(A, x0, x1, z0, z1) { A.walk.push([x0, x1, z0, z1]); }
function obsB(A, x0, x1, z0, z1, tag) { const o = { t: 'b', x0, x1, z0, z1, tag }; A.obs.push(o); return o; }
function obsC(A, x, z, r, tag) { const o = { t: 'c', x, z, r, tag }; A.obs.push(o); return o; }
function ground(A, w, d, col, x, z, top, tex) {
  const m = new T.Mesh(G.box, tex ? new T.MeshLambertMaterial({ map: tex }) : M(col)); m.scale.set(w, 0.1, d); m.position.set(x, top - 0.05, z); A.g.add(m); A.ground.push(m); return m;
}
function marker(A, h, text, col) { const s = W.textSprite(text, { size: 40, h: 0.62, bg: col || 'rgba(255,79,216,.92)' }); s.position.set(h.x, h.h + 0.6, h.z); A.g.add(s); h.sign = s; return s; }

W.isFree = function (A, x, z, r) {
  r = r || 0.35;
  let inW = false; for (const q of A.walk) if (x >= q[0] + r * 0.5 && x <= q[1] - r * 0.5 && z >= q[2] + r * 0.5 && z <= q[3] - r * 0.5) { inW = true; break; }
  if (!inW) return false;
  for (const o of A.obs) { if (o.off) continue; if (o.t === 'b') { if (x > o.x0 - r && x < o.x1 + r && z > o.z0 - r && z < o.z1 + r) return false; } else if (Math.hypot(x - o.x, z - o.z) < o.r + r) return false; }
  return true;
};
W.move = function (A, x, z, dx, dz, r) {
  if (W.isFree(A, x + dx, z + dz, r)) return [x + dx, z + dz];
  if (W.isFree(A, x + dx, z, r)) return [x + dx, z];
  if (W.isFree(A, x, z + dz, r)) return [x, z + dz];
  if (!W.isFree(A, x, z, r)) { // unstick
    for (let k = 1; k < 12; k++) for (let a = 0; a < 8; a++) { const nx = x + Math.cos(a * TAU / 8) * k * 0.3, nz = z + Math.sin(a * TAU / 8) * k * 0.3; if (W.isFree(A, nx, nz, r)) return [nx, nz]; }
  }
  return [x, z];
};
W.freeNear = function (A, x, z, r) { if (W.isFree(A, x, z, r)) return [x, z]; for (let k = 1; k < 20; k++) for (let a = 0; a < 12; a++) { const nx = x + Math.cos(a * TAU / 12) * k * 0.3, nz = z + Math.sin(a * TAU / 12) * k * 0.3; if (W.isFree(A, nx, nz, r)) return [nx, nz]; } return [x, z]; };

W.setArea = function (id) {
  for (const k in W.areas) W.areas[k].g.visible = k === id;
  W.cur = W.areas[id]; W.scene.background = new T.Color(W.cur.bg);
  W.scene.fog = W.cur.fog ? new T.Fog(W.cur.bg, W.cur.fog[0], W.cur.fog[1]) : null;
  W.fxList.forEach((f) => W.scene.remove(f.s)); W.fxList = [];
};

/* ---------------- TOWN (yard, plaza, park, beach) ---------------- */
function buildTown() {
  const A = newArea('town', { spawn: [0, -28], cam: { h: 10.5, d: 11.5 }, fog: [45, 120] }), g = A.g;
  const grass = new T.Mesh(G.plane, M('#86d97a')); grass.rotation.x = -Math.PI / 2; grass.scale.set(260, 260, 1); grass.position.set(20, 0, 0); g.add(grass); A.ground.push(grass);
  // yard
  ground(A, 28, 26, '#9ae38c', 0, -33, 0.02);
  MD.fence(g, -14, -46, 14, -46); MD.fence(g, -14, -46, -14, -20); MD.fence(g, 14, -46, 14, -20); MD.fence(g, -14, -20, -3, -20); MD.fence(g, 3, -20, 14, -20);
  rect(A, -14, 14, -46, -20); rect(A, -2.6, 2.6, -21, -11);
  // house
  const hs = grp(g, 0, 0, -37);
  box(12, 4, 10, '#fde7c4', hs, 0, 2, 0); const roof = mesh(G.cone4, '#e85d75', hs, 0, 5.4, 0, 9.4, 2.8, 7.6); roof.rotation.y = Math.PI / 4; roof.scale.set(9.4, 2.8, 7.6);
  box(1.8, 2.6, 0.2, '#9a5b2e', hs, 0, 1.3, 5.02); sph(0.08, '#facc15', hs, 0.6, 1.3, 5.15);
  [-3.6, 3.6].forEach((x) => { box(1.8, 1.4, 0.15, '#bae6fd', hs, x, 2.3, 5.03); box(2, 0.15, 0.25, '#fff', hs, x, 1.55, 5.05); });
  obsB(A, -6, 6, -42, -32);
  const dh = grp(g, -9, 0, -26); box(1.6, 1.2, 1.6, '#c2410c', dh, 0, 0.6, 0); const dr = mesh(G.cone4, '#7c2d12', dh, 0, 1.6, 0, 1.4, 0.8, 1.4); dr.rotation.y = Math.PI / 4; box(0.7, 0.8, 0.05, '#3b1d0b', dh, 0, 0.4, 0.81); obsB(A, -9.9, -8.1, -26.9, -25.1);
  MD.tree(g, 10, -43, 1.2); obsC(A, 10, -43, 0.5); MD.tree(g, -11, -42, 1); obsC(A, -11, -42, 0.5);
  [[-10, -22], [9, -23], [11, -30], [-12, -33]].forEach((q) => MD.flowers(g, q[0], q[1]));
  const yb = sph(0.15, '#d9f99d', g, 5, 0.17, -24);
  const h0 = hot(A, { id: 'door_home', kind: 'door', to: 'home', x: 0, z: -31.3, name: 'Your Home', label: 'ENTER' }); marker(A, Object.assign({}, h0, { h: 4.6 }), '\uD83C\uDFE0 HOME');
  // path + plaza
  ground(A, 5, 10, '#e7d7b5', 0, -16, 0.035);
  ground(A, 26, 25, '#efe3cc', 0, 0.5, 0.05, tileTex('#efe3cc', '#e4d4b6', 13));
  rect(A, -13, 13, -12, 13);
  const fo = grp(g, 0, 0, 0); cyl(3, 0.6, '#94a3b8', fo, 0, 0.3, 0); const wt = cyl(2.6, 0.08, '#60a5fa', fo, 0, 0.58, 0); cyl(0.4, 1.6, '#cbd5e1', fo, 0, 0.8, 0); cyl(1, 0.2, '#94a3b8', fo, 0, 1.5, 0); W.fountainWater = wt; obsC(A, 0, 0, 3);
  sph(0.5, M('#bfdbfe', { transparent: true, opacity: 0.7 }), fo, 0, 1.9, 0);
  [[-9, -9], [9, -9], [-9, 10], [9, 10]].forEach((q) => { MD.lampPost(g, q[0], q[1]); obsC(A, q[0], q[1], 0.2); });
  MD.bench(g, -6, -10.5, 0); MD.bench(g, 6, -10.5, 0);
  // shops
  function shop(cx, cz, w, d, col, roofCol, text, face, door) {
    const b = grp(g, cx, 0, cz); box(w, 4.2, d, col, b, 0, 2.1, 0); box(w + 0.4, 0.5, d + 0.4, roofCol, b, 0, 4.4, 0);
    const s = signPlane(text, Math.min(w - 1, 7), 1.2, roofCol); b.add(s);
    if (face === 'x') { s.position.set(w / 2 + 0.03, 3.3, 0); s.rotation.y = Math.PI / 2; box(0.2, 2.6, 1.8, '#5b3a1e', b, w / 2 + 0.02, 1.3, door); [-1, 1].forEach((sd) => box(0.15, 1.4, 1.6, '#bae6fd', b, w / 2 + 0.02, 2.2, sd * 3.4)); }
    else { s.position.set(0, 3.3, -d / 2 - 0.03); s.rotation.y = Math.PI; box(1.8, 2.6, 0.2, '#5b3a1e', b, door, 1.3, -d / 2 - 0.02); [-1, 1].forEach((sd) => box(1.4, 1.4, 0.15, '#bae6fd', b, sd * 3, 2.2, -d / 2 - 0.02)); }
    const aw = box(face === 'x' ? 1.2 : w - 0.6, 0.15, face === 'x' ? d - 0.6 : 1.2, roofCol, b, face === 'x' ? w / 2 + 0.6 : 0, 3.0, face === 'x' ? 0 : -d / 2 - 0.6);
    aw.rotation[face === 'x' ? 'z' : 'x'] = face === 'x' ? -0.3 : 0.3;
    obsB(A, cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2);
  }
  shop(-21, -2, 12, 12, '#fff1f2', '#ec4899', 'PET SHOP', 'x', 0); rect(A, -15.3, -12.9, -4, 0);
  const hS = hot(A, { id: 'door_shop', kind: 'door', to: 'shop', x: -14.3, z: -2, name: 'Pet Shop', label: 'ENTER' }); marker(A, Object.assign({}, hS, { h: 4.9 }), '\uD83D\uDECD\uFE0F PET SHOP');
  shop(-10, 19.5, 10, 9, '#ecfeff', '#0ea5e9', 'VET & GROOM', 'z', 0); rect(A, -12, -8, 12.9, 15.3);
  const hV = hot(A, { id: 'door_vet', kind: 'door', to: 'vet', x: -10, z: 14.4, name: 'Vet & Groomer', label: 'ENTER' }); marker(A, Object.assign({}, hV, { h: 4.9 }), '\uD83E\uDE7A VET & GROOM', 'rgba(14,165,233,.92)');
  shop(10, 19.5, 10, 9, '#fefce8', '#f59e0b', 'ADOPTION', 'z', 0); rect(A, 8, 12, 12.9, 15.3);
  const hA = hot(A, { id: 'door_adopt', kind: 'door', to: 'adopt', x: 10, z: 14.4, name: 'Adoption Center', label: 'ENTER' }); marker(A, Object.assign({}, hA, { h: 4.9 }), '\uD83D\uDC3E ADOPTION', 'rgba(245,158,11,.95)');
  // town edge hedges
  for (let x = -30; x <= -14; x += 2.2) MD.bush(g, x, -14 + (x % 3), 1.1);
  for (let x = -26; x <= 26; x += 3) if (Math.abs(x) > 16 || Math.abs(x) < 4) MD.bush(g, x, 26, 1.2);
  // park
  ground(A, 9, 6, '#e7d7b5', 16.5, 0, 0.035); rect(A, 12.5, 21, -3, 3);
  ground(A, 36, 36, '#7ed36f', 38, 0, 0.025); rect(A, 20, 56, -18, 18);
  const arch = grp(g, 20.5, 0, 0); [-3.4, 3.4].forEach((z) => { cyl(0.25, 3.6, '#16a34a', arch, 0, 1.8, z); obsC(A, 20.5, z, 0.3); }); const asg = signPlane('PET PARK', 6, 1, '#16a34a'); asg.position.set(0, 3.9, 0); asg.rotation.y = -Math.PI / 2; arch.add(asg);
  const pondM = cyl(4.4, 0.06, '#38bdf8', g, 45, 0.04, 9); pondM.scale.z = 3.2; cyl(4.8, 0.05, '#a3a38a', g, 45, 0.02, 9).scale.z = 3.6; obsB(A, 41, 49.2, 6, 12);
  for (let i = 0; i < 3; i++) { const lp = cyl(0.45, 0.02, '#22c55e', g, 43 + i * 1.8, 0.1, 8 + (i % 2)); }
  [[26, 14], [36, -15], [50, -14], [53, 3], [24, -14], [52, 15], [32, 16]].forEach((q) => { MD.tree(g, q[0], q[1], 1.1); obsC(A, q[0], q[1], 0.55); });
  MD.bench(g, 38, -16.6, 0); MD.bench(g, 44, -16.6, 0);
  // game stand
  const gs = grp(g, 30, 0, -11); box(4, 1.1, 1.6, '#7c3aed', gs, 0, 0.55, 0); for (let i = 0; i < 6; i++) box(0.68, 0.15, 2, i % 2 ? '#fff' : '#ff4fd8', gs, -1.7 + i * 0.68, 2.85, 0.1); [-1.8, 1.8].forEach((x) => cyl(0.08, 2.8, '#fff', gs, x, 1.4, 0.6)); const gsg = signPlane('MINI GAMES', 3.6, 0.8, '#ff4fd8'); gsg.position.set(0, 2.2, 0.82); gs.add(gsg);
  const gnpc = MD.person({ shirt: '#facc15', hair: '#7c2d12', cap: '#ff4fd8' }); gnpc.g.position.set(0, 0, -0.4); gs.add(gnpc.g); W.gameHost = gnpc;
  obsB(A, 28, 32, -12, -10);
  const hG = hot(A, { id: 'stand', kind: 'stand', x: 30, z: -8.8, reach: 2.4, name: 'Mini Game Stand', label: 'PLAY' }); marker(A, Object.assign({}, hG, { h: 3.6 }), '\uD83C\uDFAE MINI GAMES', 'rgba(124,58,237,.95)');
  // sandbox + agility
  const sb = cyl(2.6, 0.12, '#f2d59a', g, 35, 0.06, 8); for (let i = 0; i < 4; i++) box(0.3, 0.3, 0.3, '#fb923c', g, 33.5 + i, 0.25, 6.2).rotation.y = i;
  [[40, -4], [43, -4], [46, -4]].forEach((q, i) => { const h = grp(g, q[0], 0, q[1]); [-0.7, 0.7].forEach((x) => cyl(0.05, 0.9, '#fff', h, x, 0.45, 0)); box(1.4, 0.06, 0.06, i % 2 ? '#ef4444' : '#3b82f6', h, 0, 0.55 + i * 0.1, 0); });
  const ring = mesh(G.torus, '#facc15', g, 50, 1.1, -6, 0.6, 0.6, 0.6); ring.rotation.y = Math.PI / 2; cyl(0.05, 0.6, '#fff', g, 50, 0.3, -6);
  [[24, 9], [29, 4], [48, -10], [27, -3]].forEach((q) => MD.flowers(g, q[0], q[1]));
  // beach gate + beach
  const gate = grp(g, 56, 0, 0); [-3.2, 3.2].forEach((z) => box(0.4, 2.4, 0.4, '#a16207', gate, 0, 1.2, z)); const gbar = box(0.25, 1.4, 6, '#fbbf24', gate, 0, 0.9, 0); W.gateBar = gbar;
  const gsign = signPlane('BEACH', 3, 0.8, '#0ea5e9'); gsign.position.set(-0.25, 2.8, 0); gsign.rotation.y = -Math.PI / 2; gate.add(gsign);
  W.gateObs = obsB(A, 55.6, 56.4, -3.2, 3.2, 'gate');
  for (let z = -18; z <= 18; z += 1.5) if (Math.abs(z) > 3.4) MD.bush(g, 56.4, z, 0.8);
  const hB = hot(A, { id: 'gate', kind: 'gate', x: 54.7, z: 0, reach: 2.4, name: 'Beach Gate', label: 'OPEN' }); W.gateSign = marker(A, Object.assign({}, hB, { h: 3.4 }), '\uD83C\uDFD6\uFE0F BEACH', 'rgba(14,165,233,.95)');
  rect(A, 55, 58, -3, 3);
  ground(A, 24, 40, '#f5dfa8', 68, 0, 0.045); rect(A, 56.5, 76, -19, 19);
  const sea = new T.Mesh(G.plane, M('#38bdf8', { transparent: true, opacity: 0.92 })); sea.rotation.x = -Math.PI / 2; sea.scale.set(80, 80, 1); sea.position.set(118, 0.08, 0); g.add(sea); W.sea = sea;
  const foam = new T.Mesh(G.plane, M('#e0f2fe')); foam.rotation.x = -Math.PI / 2; foam.scale.set(1.2, 40, 1); foam.position.set(78.2, 0.07, 0); g.add(foam);
  [[62, -14], [70, 13], [74, -8], [60, 12], [66, -2]].forEach((q) => { MD.palm(g, q[0], q[1]); obsC(A, q[0], q[1], 0.35); });
  const um = grp(g, 66, 0, 7); cyl(0.05, 2.4, '#fff', um, 0, 1.2, 0); const top = mesh(G.cone, '#f43f5e', um, 0, 2.4, 0, 1.4, 0.6, 1.4); box(1.8, 0.05, 0.9, '#3b82f6', um, 0.8, 0.07, 1.2);
  for (let i = 0; i < 9; i++) { const sh = mesh(G.hemi, ['#fecdd3', '#fde68a', '#fff'][i % 3], g, 60 + (i * 7.3) % 15, 0.05, -16 + (i * 11.7) % 32, 0.12, 0.08, 0.12); }
  hot(A, { id: 'door_beachdig', kind: 'stand', x: 70, z: -4, reach: 2.4, name: 'Beach Dig Spot', label: 'DIG', beach: true });
  const bdg = grp(g, 70, 0, -6); box(1.6, 1.2, 0.2, '#fbbf24', bdg, 0, 0.6, 0); const bds = signPlane('DIG HERE!', 2.2, 0.6, '#ea580c'); bds.position.set(0, 1.5, 0.12); bdg.add(bds); obsB(A, 69.2, 70.8, -6.2, -5.8);
  // world border trees
  for (let a = 0; a < 40; a++) { const x = -40 + (a * 9.3) % 130, z = a % 2 ? -52 - (a % 5) : 32 + (a % 4); MD.tree(g, x, z, 1.3, a % 3 ? '#16a34a' : '#15803d'); }
  // ambient townsfolk walking their pets: see npc.js
  A.label = 'Town'; A.zone = function (x, z) { return z < -19 ? 'Your Yard' : x > 56.5 ? 'Beach' : x > 19.5 ? 'Pet Park' : 'Town Plaza'; };
}

/* ---------------- interiors ---------------- */
function room(id, w, d, floorTex, wallCol, o) {
  const A = newArea(id, Object.assign({ cam: { h: 9.5, d: 9 }, bg: '#f3d7ec' }, o)), g = A.g;
  const fl = new T.Mesh(G.box, new T.MeshLambertMaterial({ map: floorTex })); fl.scale.set(w, 0.1, d); fl.position.y = -0.05; g.add(fl); A.ground.push(fl);
  box(w + 0.4, 3.2, 0.3, wallCol, g, 0, 1.6, -d / 2 - 0.15);
  [-1, 1].forEach((s) => box(0.3, 3.2, d + 0.3, MD.shade(wallCol, -0.08), g, s * (w / 2 + 0.15), 1.6, 0));
  box(w + 0.6, 0.3, 0.3, MD.shade(wallCol, -0.15), g, 0, 0.15, d / 2 + 0.15);
  box(w + 0.4, 0.2, 0.32, '#ffffff', g, 0, 3.2, -d / 2 - 0.15);
  rect(A, -w / 2, w / 2, -d / 2, d / 2 - 0.1);
  const mat = box(2, 0.03, 1, '#16a34a', g, 0, 0.015, d / 2 - 0.55); mat.renderOrder = 1;
  const ex = hot(A, { id: 'exit_' + id, kind: 'exit', x: 0, z: d / 2 - 0.6, reach: 1.4, name: 'to Town', label: 'EXIT' });
  const es = W.textSprite('\u2B07 EXIT', { size: 36, h: 0.48, bg: 'rgba(22,163,74,.95)' }); es.position.set(0, 1.2, d / 2 - 0.5); g.add(es); A.exitSprite = es;
  A.spawn = [0, d / 2 - 1.6]; A.w = w; A.d = d;
  return A;
}
function windowOn(g, x, y, z) { box(1.8, 1.2, 0.08, '#bae6fd', g, x, y, z); box(1.9, 0.1, 0.12, '#fff', g, x, y, z + 0.02); box(0.1, 1.3, 0.12, '#fff', g, x, y, z + 0.02); }
function buildHome() {
  const fT = woodTex();
  const A = room('home', 18, 12, fT, '#fde7c4'), g = A.g;
  const carpet = box(8.7, 0.02, 11.7, '#d8ccfa', g, 4.5, 0.01, 0); carpet.renderOrder = 1;
  box(0.25, 2.4, 4.4, '#f5d9b0', g, 0, 1.2, -3.8); box(0.25, 2.4, 4.4, '#f5d9b0', g, 0, 1.2, 3.8); box(0.25, 0.4, 3.2, '#f5d9b0', g, 0, 2.2, 0);
  obsB(A, -0.2, 0.2, -6, -1.6); obsB(A, 0.2 - 0.4, 0.2, 1.6, 6);
  windowOn(g, -4.5, 1.9, -5.95); windowOn(g, 4.5, 1.9, -5.95);
  const l1 = W.textSprite('LIVING ROOM', { size: 34, h: 0.42, bg: 'rgba(180,83,9,.9)' }); l1.position.set(-4.5, 3.0, -5.6); g.add(l1);
  const l2 = W.textSprite('PET ROOM', { size: 34, h: 0.42, bg: 'rgba(124,58,237,.9)' }); l2.position.set(4.5, 3.0, -5.6); g.add(l2);
  A.spawn = [-0.0, 3.6]; A.label = 'Your Home';
  A.zone = (x) => x < 0 ? 'Living Room' : 'Pet Room';
  A.furn = grp(g); A.furnObs = [];
  A.hots[0].x = -4.5; A.g.children.forEach((c) => { if (c.isMesh && c.scale.x === 2 && Math.abs(c.position.z - 5.45) < 0.01) c.position.x = -4.5; });
  A.g.children.forEach((c) => { if (c.isSprite && Math.abs(c.position.z - 5.5) < 0.01) c.position.x = -4.5; });
  A.spawn = [-4.5, 4.0];
}
W.placeHome = function (layout) {
  const A = W.areas.home; while (A.furn.children.length) A.furn.remove(A.furn.children[0]);
  A.obs = A.obs.filter((o) => o.tag !== 'furn'); A.furnMeshes = [];
  (layout || []).forEach((f, i) => {
    const it = GP.ITEMS[f.id]; if (!it) return;
    const m = MD.furn(f.id); m.position.set(f.x, 0, f.z); m.rotation.y = (f.r || 0) * Math.PI / 2; m.userData.fi = i; A.furn.add(m); A.furnMeshes.push(m);
    if (it.solid) { const sw = (f.r || 0) % 2 ? it.d : it.w, sd = (f.r || 0) % 2 ? it.w : it.d; obsB(A, f.x - sw / 2, f.x + sw / 2, f.z - sd / 2, f.z + sd / 2, 'furn'); }
  });
};
W.canPlace = function (id, x, z, r, layout, skip, px, pz) {
  const it = GP.ITEMS[id], sw = r % 2 ? it.d : it.w, sd = r % 2 ? it.w : it.d;
  if (x - sw / 2 < -8.9 || x + sw / 2 > 8.9 || z - sd / 2 < -5.9 || z + sd / 2 > 5.9) return false;
  if (x + sw / 2 > -0.3 && x - sw / 2 < 0.3) return false; // divider + doorway
  if (z + sd / 2 > 4.4 && x - sw / 2 < -2.9 && x + sw / 2 > -6.1) return false; // exit mat
  if (!it.flat && px != null && Math.abs(px - x) < sw / 2 + 0.5 && Math.abs(pz - z) < sd / 2 + 0.5) return false;
  for (let i = 0; i < layout.length; i++) {
    if (i === skip) continue; const f = layout[i], o = GP.ITEMS[f.id]; if (!o) continue;
    if (!!o.flat !== !!it.flat) continue;
    const ow = f.r % 2 ? o.d : o.w, od = f.r % 2 ? o.w : o.d;
    if (Math.abs(f.x - x) < (ow + sw) / 2 - 0.05 && Math.abs(f.z - z) < (od + sd) / 2 - 0.05) return false;
  }
  return true;
};
function shelf(g, x, z, label, items, col, ry) {
  const s = grp(g, x, 0, z); s.rotation.y = ry || 0;
  box(4, 2.3, 0.14, col, s, 0, 1.15, -0.28); box(3.8, 2.1, 0.04, MD.shade(col, 0.55), s, 0, 1.15, -0.19);
  [-1, 1].forEach((k) => box(0.14, 2.3, 0.7, col, s, k * 1.95, 1.15, 0)); box(4, 0.12, 0.7, col, s, 0, 2.3, 0);
  for (let r = 0; r < 3; r++) box(3.8, 0.06, 0.6, MD.shade(col, -0.2), s, 0, 0.3 + r * 0.7, 0.02);
  const n = Math.max(1, Math.ceil(items.length / 3));
  items.forEach((id, i) => { const row = Math.floor(i / n), c = i % n; const m = MD.item(id); m.position.set(n === 1 ? 0 : -1.5 + c * (3 / (n - 1)), 0.33 + (2 - row) * 0.7, 0.06); s.add(m); });
  const lb = signPlane(label, 3, 0.55, MD.shade(col, -0.3)); lb.position.set(0, 2.6, 0.36); s.add(lb);
  return s;
}
function buildShop() {
  const A = room('shop', 20, 14, tileTex('#fff7ed', '#fde2e4', 10), '#fce7f3', { bg: '#f3d7ec' }), g = A.g;
  shelf(g, -6, -6.3, 'FOOD', GP.itemsOf('food'), '#f97316'); obsB(A, -8, -4, -7, -5.9);
  shelf(g, 0, -6.3, 'TOYS', GP.itemsOf('toy'), '#22c55e'); obsB(A, -2, 2, -7, -5.9);
  shelf(g, 6, -6.3, 'ACCESSORIES', GP.itemsOf('acc').slice(0, 12), '#a855f7'); obsB(A, 4, 8, -7, -5.9);
  hot(A, { id: 'shelf_food', kind: 'shelf', cat: 'food', x: -6, z: -5.0, reach: 2.2, name: 'Food Shelf', label: 'SHOP' });
  hot(A, { id: 'shelf_toy', kind: 'shelf', cat: 'toy', x: 0, z: -5.0, reach: 2.2, name: 'Toy Shelf', label: 'SHOP' });
  hot(A, { id: 'shelf_acc', kind: 'shelf', cat: 'acc', x: 6, z: -5.0, reach: 2.2, name: 'Accessories', label: 'SHOP' });
  // furniture showroom (west)
  const fr = grp(g, -7.6, 0, 0.5); box(4, 0.2, 5.2, '#e9d5ff', fr, 0, 0.1, 0); const s1 = MD.furn('sofa'); s1.scale.setScalar(0.7); s1.position.set(0.2, 0.2, -1.4); s1.rotation.y = Math.PI / 2; fr.add(s1); const s2 = MD.furn('lamp'); s2.scale.setScalar(0.7); s2.position.set(0.5, 0.2, 1.2); fr.add(s2); const s3 = MD.furn('petbed'); s3.scale.setScalar(0.8); s3.position.set(0.4, 0.2, 0.2); fr.add(s3);
  const fl = signPlane('FURNITURE', 2.6, 0.55, '#7c3aed'); fl.position.set(0.3, 2.3, -1.9); fl.rotation.y = Math.PI / 2; fr.add(fl);
  obsB(A, -9.6, -5.6, -2.1, 3.1);
  hot(A, { id: 'shelf_furn', kind: 'shelf', cat: 'furn', x: -4.9, z: 0.5, reach: 2.2, name: 'Furniture', label: 'SHOP' });
  // counter + eggs (east)
  const ct = grp(g, 7.6, 0, -1); box(1.4, 1.1, 3.4, '#ec4899', ct, 0, 0.55, 0); box(1.6, 0.1, 3.6, '#fff', ct, 0, 1.12, 0);
  const e1 = MD.item('egg'); e1.position.set(0, 1.17, -0.8); ct.add(e1); const e2 = MD.item('fegg'); e2.position.set(0, 1.17, 0.6); ct.add(e2);
  const kp = MD.person({ shirt: '#f472b6', hair: '#1f2937', apron: '#fff', long: 1 }); kp.g.position.set(9.0, 0, -1); kp.g.rotation.y = -Math.PI / 2; g.add(kp.g); W.shopKeeper = kp;
  obsB(A, 6.9, 10, -2.7, 0.7);
  hot(A, { id: 'counter', kind: 'shelf', cat: 'egg', x: 5.9, z: -1, reach: 2.2, name: 'Egg Counter', label: 'SHOP' });
  // adoption corner (south-east)
  const pen = grp(g, 6.6, 0, 4.2); box(5.2, 0.03, 3.6, '#bbf7d0', pen, 0, 0.015, 0);
  MD.fence(pen, -2.6, -1.8, 2.6, -1.8, '#fbcfe8'); MD.fence(pen, -2.6, -1.8, -2.6, 1.8, '#fbcfe8'); MD.fence(pen, -2.6, 1.8, 2.6, 1.8, '#fbcfe8');
  const pl = signPlane('ADOPT ME!', 2.6, 0.6, '#f59e0b'); pl.position.set(0, 1.5, -1.9); pen.add(pl);
  obsB(A, 4.0, 9.6, 2.4, 6.0); A.penG = pen;
  hot(A, { id: 'shop_adopt', kind: 'adopt', x: 3.0, z: 4.2, reach: 2.2, name: 'Adoption Corner', label: 'ADOPT' });
  A.label = 'Pet Shop'; A.zone = () => 'Pet Shop';
}
function buildVet() {
  const A = room('vet', 14, 10, tileTex('#ecfeff', '#cffafe', 8), '#e0f2fe', { bg: '#cdeaf5' }), g = A.g;
  const ct = grp(g, -2.5, 0, -3.6); box(4, 1.1, 1, '#0ea5e9', ct, 0, 0.55, 0); box(4.2, 0.1, 1.2, '#fff', ct, 0, 1.12, 0); const cr = signPlane('+', 0.8, 0.8, '#ef4444'); cr.position.set(0, 2.4, -1.25); ct.add(cr);
  const vn = MD.person({ shirt: '#f8fafc', hair: '#7c2d12', long: 1 }); vn.g.position.set(-2.5, 0, -4.4); g.add(vn.g); W.vetNpc = vn;
  obsB(A, -4.5, -0.5, -5, -3.1);
  hot(A, { id: 'vet_desk', kind: 'vet', x: -2.5, z: -2.4, reach: 2.2, name: 'Dr. Pawla (Vet)', label: 'TALK' });
  const tub = grp(g, 4, 0, -2.8); box(2.4, 0.9, 1.4, '#f8fafc', tub, 0, 0.45, 0); box(2.1, 0.1, 1.1, '#7dd3fc', tub, 0, 0.88, 0); for (let i = 0; i < 6; i++) sph(0.15, '#ffffff', tub, -0.8 + i * 0.32, 0.98, (i % 2) * 0.3 - 0.15);
  obsB(A, 2.8, 5.2, -3.5, -2.1);
  hot(A, { id: 'groom', kind: 'vet', tab: 'groom', x: 4, z: -1.3, reach: 2.0, name: 'Grooming Tub', label: 'GROOM' });
  [-5, -4, -3].forEach((x) => { box(0.8, 0.5, 0.8, '#38bdf8', g, x, 0.25, 2); box(0.8, 0.7, 0.15, '#38bdf8', g, x, 0.7, 2.35); }); obsB(A, -5.4, -2.6, 1.6, 2.5);
  windowOn(g, 2, 2, -4.95);
  A.label = 'Vet & Groomer'; A.zone = () => 'Vet & Groomer';
}
function buildAdopt() {
  const A = room('adopt', 18, 12, tileTex('#fefce8', '#fef3c7', 9), '#fef9c3', { bg: '#f5ead0' }), g = A.g;
  A.pens = [];
  for (let i = 0; i < 6; i++) {
    const x = -7.5 + i * 3, pg = grp(g, x, 0, -4.4);
    box(2.6, 0.04, 2.2, i % 2 ? '#bbf7d0' : '#bfdbfe', pg, 0, 0.02, 0); MD.fence(pg, -1.3, 1.1, -0.5, 1.1, '#fde68a'); MD.fence(pg, 0.5, 1.1, 1.3, 1.1, '#fde68a');
    A.pens.push({ g: pg, x, z: -4.4 });
    obsB(A, x - 1.3, x + 1.3, -5.6, -3.2);
    hot(A, { id: 'pen' + i, kind: 'pen', pen: i, x, z: -2.6, reach: 1.5, name: 'Pen', label: 'ADOPT' });
  }
  const fam = grp(g, 6.5, 0, 2.5); cyl(1.6, 0.03, '#fbcfe8', fam, 0, 0.015, 0); const fs = signPlane('\u2665 FAMILY \u2665', 2.8, 0.6, '#ec4899'); fs.position.set(0, 1.6, -1.2); fam.add(fs);
  hot(A, { id: 'family', kind: 'family', x: 6.5, z: 2.5, reach: 2.2, name: 'Family Corner', label: 'LOOK' });
  const inc = grp(g, -6.5, 0, 2.5); box(2, 0.9, 1.2, '#f59e0b', inc, 0, 0.45, 0); const d = mesh(G.hemi, new T.MeshLambertMaterial({ color: '#fef3c7', transparent: true, opacity: 0.5 }), inc, 0, 0.9, 0, 0.9, 0.8, 0.5); const e1 = MD.item('egg'); e1.position.set(-0.3, 0.9, 0); inc.add(e1); const e2 = MD.item('fegg'); e2.position.set(0.35, 0.9, 0); inc.add(e2);
  obsB(A, -7.5, -5.5, 1.9, 3.1);
  hot(A, { id: 'incubator', kind: 'shelf', cat: 'egg', x: -6.5, z: 3.8, reach: 1.8, name: 'Egg Incubator', label: 'EGGS' });
  const an = MD.person({ shirt: '#f59e0b', hair: '#111827' }); an.g.position.set(0, 0, 0.5); g.add(an.g); W.adoptNpc = an; obsC(A, 0, 0.5, 0.4);
  A.label = 'Adoption Center'; A.zone = () => 'Adoption Center';
}
W.build = function () { buildTown(); buildHome(); buildShop(); buildVet(); buildAdopt(); newArea('arena', { bg: '#a8e6ff' }); };

/* ---------------- pens: show today's adoptable pets ---------------- */
W.fillPens = function (list) {
  const A = W.areas.adopt; A.pens.forEach((p, i) => { if (p.pet) p.g.remove(p.pet.g); p.pet = null; const sp = list[i]; A.hots[i + 1].sp = sp; if (!sp) return; const s = GP.SPECIES[sp]; const pet = MD.pet({ sp, col: [s.vars[0][1], s.vars[0][2]], lv: 1 }); pet.g.rotation.y = 0.3; p.g.add(pet.g); p.pet = pet; A.hots[i + 1].name = s.name; });
  const S = W.areas.shop; if (S.penPets) S.penPets.forEach((p) => S.penG.remove(p.g)); S.penPets = [];
  list.slice(0, 3).forEach((sp, i) => { const s = GP.SPECIES[sp]; const pet = MD.pet({ sp, col: [s.vars[1][1], s.vars[1][2]], lv: 1 }); pet.g.position.set(-1.5 + i * 1.5, 0, 0.2); S.penG.add(pet.g); S.penPets.push(pet); });
};

/* ---------------- camera ---------------- */
W.updateCamera = function (x, z, dt, snap, yawHint) {
  const A = W.cur, c = W.camera;
  if (W.camOverride) { const o = W.camOverride; const k = snap ? 1 : 1 - Math.exp(-dt * 6); W.camPos.lerp(o.pos, k); W.camLook.lerp(o.look, k); c.position.copy(W.camPos); c.lookAt(W.camLook); return; }
  const pf = c.aspect < 0.8 ? 1.22 : 1, h = A.cam.h * pf, d = A.cam.d * pf;
  let tx = x, tz = z;
  if (A.w) { tx = GP.clamp(x, -A.w / 2 + 3, A.w / 2 - 3); tz = Math.min(z, A.d / 2 - 2.5); }
  const want = new T.Vector3(tx, h, tz + d), look = new T.Vector3(tx, 0.6, tz - 0.5);
  const k = snap ? 1 : 1 - Math.exp(-dt * 5);
  W.camPos.lerp(want, k); W.camLook.lerp(look, k); c.position.copy(W.camPos); c.lookAt(W.camLook);
};

/* ---------------- picking ---------------- */
const v2 = new T.Vector2();
W.pick = function (sx, sy, extra) {
  v2.set(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1); W.ray.setFromCamera(v2, W.camera);
  const objs = (extra || []).concat(W.cur.ground);
  const hits = W.ray.intersectObjects(objs, true); if (!hits.length) return null;
  return hits[0];
};
W.rayPlane = function (sx, sy, y) { v2.set(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1); W.ray.setFromCamera(v2, W.camera); const p = new T.Plane(new T.Vector3(0, 1, 0), -(y || 0)), out = new T.Vector3(); return W.ray.ray.intersectPlane(p, out) ? out : null; };
W.hitObj = function (sx, sy, obj) { v2.set(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1); W.ray.setFromCamera(v2, W.camera); const h = W.ray.intersectObject(obj, true).filter((q) => !q.object.isSprite && !q.object.userData.noHit && q.object.visible); return h.length ? h[0] : null; };
W.project = function (x, y, z) { const v = new T.Vector3(x, y, z).project(W.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, vis: v.z < 1 && v.z > -1 }; };

/* ---------------- fx sprites ---------------- */
const fxTex = {};
function fxTexture(kind) {
  if (fxTex[kind]) return fxTex[kind];
  const t = canvasTex(64, 64, (g) => {
    g.translate(32, 32);
    if (kind === 'heart') { g.fillStyle = '#ff4f8b'; g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(-34, -2, -18, -30, 0, -12); g.bezierCurveTo(18, -30, 34, -2, 0, 22); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke(); }
    else if (kind === 'bubble') { g.fillStyle = 'rgba(200,240,255,.5)'; g.beginPath(); g.arc(0, 0, 24, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-8, -8, 6, 0, TAU); g.fill(); }
    else if (kind === 'sparkle' || kind === 'star') { g.fillStyle = kind === 'star' ? '#ffd23f' : '#fff7ae'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 9 : 28; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); }
    else if (kind === 'zzz') { g.fillStyle = '#c7d2fe'; g.font = '900 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeStyle = '#312e81'; g.lineWidth = 6; g.strokeText('Z', 0, 0); g.fillText('Z', 0, 0); }
    else if (kind === 'coin') { g.fillStyle = '#facc15'; g.beginPath(); g.arc(0, 0, 24, 0, TAU); g.fill(); g.strokeStyle = '#a16207'; g.lineWidth = 5; g.stroke(); g.fillStyle = '#a16207'; g.font = '900 28px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 0, 2); }
    else if (kind === 'note') { g.fillStyle = '#a78bfa'; g.beginPath(); g.arc(-6, 14, 10, 0, TAU); g.fill(); g.fillRect(2, -22, 6, 38); g.fillRect(2, -22, 18, 8); }
    else if (kind === 'dust') { g.fillStyle = 'rgba(214,180,120,.85)'; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill(); }
    else if (kind === 'drop') { g.fillStyle = '#7dd3fc'; g.beginPath(); g.moveTo(0, -24); g.quadraticCurveTo(20, 6, 0, 22); g.quadraticCurveTo(-20, 6, 0, -24); g.fill(); }
  });
  t.minFilter = T.LinearFilter; fxTex[kind] = t; return t;
}
W.fx = function (kind, x, y, z, n, spread) {
  n = n || 1; spread = spread == null ? 0.4 : spread;
  for (let i = 0; i < n; i++) {
    if (W.fxList.length > 90) { const o = W.fxList.shift(); W.scene.remove(o.s); }
    const s = new T.Sprite(new T.SpriteMaterial({ map: fxTexture(kind), transparent: true, depthWrite: false })); s.renderOrder = 15;
    const sz = kind === 'zzz' ? 0.35 : kind === 'dust' ? 0.4 : 0.28; s.scale.set(sz, sz, 1);
    s.position.set(x + (Math.random() - 0.5) * spread, y + Math.random() * spread * 0.5, z + (Math.random() - 0.5) * spread);
    W.scene.add(s);
    const up = kind === 'dust' ? 0.6 : kind === 'drop' ? -1.5 : 1.1;
    W.fxList.push({ s, t: 0, life: kind === 'zzz' ? 1.6 : 1.1, vx: (Math.random() - 0.5) * 0.6, vy: up * (0.7 + Math.random() * 0.6), vz: (Math.random() - 0.5) * 0.6, sz, kind });
  }
};
W.tickFx = function (dt) {
  W.time += dt;
  for (let i = W.fxList.length - 1; i >= 0; i--) {
    const f = W.fxList[i]; f.t += dt;
    if (f.t >= f.life) { W.scene.remove(f.s); f.s.material.dispose(); W.fxList.splice(i, 1); continue; }
    f.s.position.x += f.vx * dt; f.s.position.y += f.vy * dt; f.s.position.z += f.vz * dt;
    if (f.kind === 'zzz') f.s.position.x += Math.sin(f.t * 4) * dt * 0.3;
    const k = f.t / f.life; f.s.material.opacity = k > 0.6 ? (1 - k) / 0.4 : 1; const sc = f.sz * (f.kind === 'bubble' ? 0.7 + k * 0.6 : 1); f.s.scale.set(sc, sc, 1);
  }
  if (W.sea) W.sea.position.y = 0.08 + Math.sin(W.time * 1.2) * 0.03;
  if (W.fountainWater) W.fountainWater.rotation.y += dt * 0.5;
  if (GP.NPC && GP.NPC.tick) GP.NPC.tick(dt); // townsfolk, shop staff and their pets
};
})();
