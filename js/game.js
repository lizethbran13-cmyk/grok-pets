/* Grok Pets - core: save, pets, needs, world, co-op netcode (host-authoritative), HUD, panels */
(function () {
'use strict';
const GP = window.GP, GN = window.GrokNet, W = GP.W, MD = GP.MD, Snd = GP.Snd, T = window.THREE;
const $ = (id) => document.getElementById(id);
const esc = GN.esc;
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || (('ontouchstart' in window) && navigator.maxTouchPoints > 0);
const TAU = Math.PI * 2;
const clamp = GP.clamp;
const G = GP.G = {};

/* ======================================================================
   Save
   ====================================================================== */
const SAVE_KEY = 'grokPets_v1';
function freshSave() {
  return { v: 1, name: '', color: GN.COLORS[0], muted: false, coins: 200, pets: [], active: [], nextId: 1,
    inv: { kibble: 6, ball: 1, petbed: 1, rug: 1 },
    home: [{ id: 'petbed', x: 5.5, z: -3.6, r: 0 }, { id: 'rug', x: -4.5, z: -1.5, r: 0 }],
    beach: false, daily: { last: '', streak: 0 }, stats: { walk: 0, games: 0, learned: 0, adopted: 0, shows: 0, gold: 0, hatched: 0, gifts: 0, playdates: 0 },
    famClaimed: {}, tut: 0, lastT: Date.now(), best: {}, seen: {} };
}
let save = freshSave();
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.v === 1) save = Object.assign(freshSave(), s, { stats: Object.assign(freshSave().stats, s.stats || {}) }); } catch (e) { /* ignore */ }
if (!save.name) { const gp = GN.savedProfile(); if (gp.hasName) { save.name = gp.name; save.color = gp.color; } }
let saveT = 0;
function persist(now) { save.lastT = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } saveT = now || performance.now(); }
G.save = () => save; G.persist = persist;
const prof = { name: save.name, color: GN.cleanColor(save.color) };
Snd.setMuted(!!save.muted);
function myName() { return GN.cleanName(prof.name || 'Player'); }

/* ======================================================================
   Pets
   ====================================================================== */
const NAMES = ['Biscuit', 'Mochi', 'Peanut', 'Sprinkles', 'Daisy', 'Pickles', 'Noodle', 'Cookie', 'Bubbles', 'Pepper', 'Maple', 'Waffles', 'Coco', 'Ziggy', 'Pumpkin', 'Bean', 'Sunny', 'Twix', 'Nugget', 'Rosie', 'Taco', 'Muffin', 'Pixel', 'Ollie'];
G.randName = () => { const used = save.pets.map((p) => p.name); const free = NAMES.filter((n) => used.indexOf(n) < 0); return (free.length ? free : NAMES)[Math.floor(Math.random() * (free.length || NAMES.length))]; };
function makePet(sp, vi, name, fam) {
  const s = GP.SPECIES[sp], f = fam ? GP.familyById(fam) : null;
  const p = { id: save.nextId++, sp, name: GN.cleanName(name || s.name).slice(0, 12), vi: vi || 0, col: f ? f.col.slice() : [s.vars[vi || 0][1], s.vars[vi || 0][2]],
    lv: 1, xp: 0, n: { h: 70, f: 75, e: 85, c: 80 }, tricks: {}, acc: f ? Object.assign({}, f.acc) : {}, born: Date.now(), walk: 0 };
  if (f) { p.fam = f.id; if (f.eye) p.eye = f.eye; if (f.oneEye) p.oneEye = 1; }
  return p;
}
G.addPet = function (p, makeActive) {
  save.pets.push(p); save.seen[p.sp] = 1; save.stats.adopted++;
  if (makeActive !== false && save.active.length < 3) save.active.push(p.id);
  persist(); syncLooks(); return p;
};
const petById = (id) => save.pets.find((p) => p.id === id);
G.petById = petById;
G.petLook = function (p) { return { sp: p.sp, col: p.col, eye: p.eye, oneEye: p.oneEye, lv: p.lv, acc: p.acc, n: p.name, id: p.id }; };
function lookKey(l) { return l.sp + l.col.join() + (l.eye || '') + (l.oneEye ? 1 : 0) + GP.stage(l.lv) + JSON.stringify(l.acc || {}); }
G.mood = (p) => (p.n.h + p.n.f * 2 + p.n.e + p.n.c) / 5;
G.moodLabel = (m) => m >= 85 ? ['Overjoyed', '\uD83E\uDD29'] : m >= 65 ? ['Happy', '\uD83D\uDE0A'] : m >= 45 ? ['Okay', '\uD83D\uDE42'] : m >= 28 ? ['Needs care', '\uD83E\uDD7A'] : ['Sad', '\uD83D\uDE22'];
G.needIcon = (p) => p.n.h < 30 ? '\uD83C\uDF56' : p.n.e < 22 ? '\uD83D\uDCA4' : p.n.c < 28 ? '\uD83D\uDEC1' : p.n.f < 30 ? '\uD83D\uDC94' : '';
G.bump = function (p, k, v) { p.n[k] = clamp(p.n[k] + v, 5, 100); };
G.addXP = function (p, amt) {
  const m = G.mood(p), mult = m >= 60 ? 1 : m >= 35 ? 0.6 : 0.3;
  if (p.lv >= GP.MAX_LV) return;
  p.xp += amt * mult;
  while (p.lv < GP.MAX_LV && p.xp >= GP.levelXP(p.lv)) {
    p.xp -= GP.levelXP(p.lv); const oldStage = GP.stage(p.lv); p.lv++;
    const c = 15 + p.lv * 5; G.addCoins(c);
    const nt = GP.TRICKS.find((t) => t.lv === p.lv);
    G.toast('\u2B50 ' + p.name + ' reached level ' + p.lv + '! +' + c + ' coins' + (nt ? ' \u00b7 can learn ' + nt.name + '!' : ''));
    if (GP.stage(p.lv) !== oldStage) G.toast('\uD83C\uDF31 ' + p.name + ' grew into a' + (GP.stage(p.lv) === 'Adult' ? 'n Adult' : ' Kid') + '!');
    Snd.fx('level'); const o = GS.p3[p.id]; if (o) W.fx('star', o.x, o.P.hTop + 0.3, o.z, 8, 0.8);
  }
  syncLooks();
};
G.addCoins = function (n) { save.coins = Math.max(0, Math.round(save.coins + n)); GS.coinFlash = 1; if (n > 0) Snd.fx('coin'); };
G.spend = function (n) { if (save.coins < n) { G.toast('Not enough coins! Play mini games or care for your pets to earn more.', true); Snd.fx('no'); return false; } save.coins -= n; persist(); return true; };
function comfort() { let c = 0; const seen = {}; save.home.forEach((f) => { const it = GP.ITEMS[f.id]; if (it && !seen[f.id]) { c += it.comfort || 1; seen[f.id] = 1; } }); return c; }
G.comfort = comfort;
// slow real-time needs. Pets get sad, never sick or worse.
function decay(p, sec, active, floor) {
  const fl = floor || 8, cf = 1 - Math.min(0.4, comfort() * 0.025);
  p.n.h = Math.max(Math.min(p.n.h, fl), p.n.h - sec * 0.0028);
  p.n.f = Math.max(Math.min(p.n.f, fl), p.n.f - sec * 0.0023 * (active ? 1 : cf));
  p.n.c = Math.max(Math.min(p.n.c, fl), p.n.c - sec * 0.0016);
  if (active) p.n.e = Math.max(Math.min(p.n.e, fl), p.n.e - sec * 0.0015); else p.n.e = Math.min(100, p.n.e + sec * 0.02);
}
(function offline() { const sec = clamp((Date.now() - (save.lastT || Date.now())) / 1000, 0, 3 * 86400); if (sec > 60) save.pets.forEach((p) => decay(p, sec, false, 22)); })();

/* ======================================================================
   Globals
   ====================================================================== */
const GS = G.GS = { role: null, room: null, pid: GN.pid(), S: null, ui: 'title', me: { area: 'home', x: -4.5, z: 4, yaw: Math.PI, sp: 0 }, pos: {}, av: {}, p3: {}, rp: {}, hp: {},
  evSeen: 0, panel: null, care: null, mg: null, mgSeen: 0, goal: null, dirty: false, lastSend: 0, lastPos: 0, lastPosSent: '', connecting: false, inWorld: false, walkAcc: 0, findAcc: 0, find: null, decT: 0, lookKey: '', suggest: null };
const S_ = () => GS.S;
function newSession() { return { v: 1, gid: 0, players: [], looks: {}, home: { layout: [], pets: [] }, beach: false, mg: null, ev: [], evId: 0, pd: {} }; }
function touch() { GS.dirty = true; }
function pushEv(e) { const S = S_(); S.evId++; e.id = S.evId; S.ev.push(e); if (S.ev.length > 30) S.ev.shift(); touch(); }
function playerInfo(pid) { const S = S_(); const p = S && S.players.find((q) => q.pid === pid); return p || { pid, name: pid === GS.pid ? myName() : 'Friend', color: '#ffffff' }; }
G.online = () => GS.role === 'host' || GS.role === 'client';
G.friends = () => { const S = S_(); return S ? S.players.filter((p) => p.pid !== GS.pid) : []; };

/* ======================================================================
   Host / solo authority
   ====================================================================== */
function hostAct(pid, m) {
  const S = S_(); if (!S || !m) return; const isHostMe = pid === GS.pid;
  switch (m.k) {
    case 'ch': if (GP.Chaos) GP.Chaos.hostAct(pid, m); break;
    case 'look': if (Array.isArray(m.pets)) { S.looks[pid] = m.pets.slice(0, 3).map(cleanLook).filter(Boolean); touch(); } break;
    case 'gift': { const to = S.players.find((p) => p.pid === m.to); if (!to || to.pid === pid) return; const it = m.item === 'coins' ? 'coins' : GP.ITEMS[m.item] && GP.ITEMS[m.item].cat === 'food' ? m.item : null; if (!it) return; pushEv({ type: 'gift', to: to.pid, from: pid, by: playerInfo(pid).name, item: it, n: clamp(+m.n || 1, 1, 100) }); break; }
    case 'playdate': {
      const now = Date.now(); if (S.pd[pid] && now - S.pd[pid] < 45000) return;
      const all = {}; S.players.forEach((p) => { all[p.pid] = p.pid === GS.pid ? myPos() : GS.pos[p.pid]; });
      const me = all[pid]; if (!me) return;
      const pids = S.players.map((p) => p.pid).filter((q) => all[q] && all[q].a === me.a && Math.hypot(all[q].x - me.x, all[q].z - me.z) < 7);
      if (pids.length < 2) return;
      pids.forEach((q) => { S.pd[q] = now; });
      pushEv({ type: 'playdate', pids, names: pids.map((q) => playerInfo(q).name) }); break;
    }
    case 'suggest': if (!isHostMe && GP.gameById(m.id)) pushEv({ type: 'suggest', id: m.id, by: playerInfo(pid).name }); break;
    case 'mgstart': {
      if (!isHostMe || !GP.gameById(m.id) || (S.mg && S.mg.phase === 'play')) return;
      S.gid++; S.mg = { gid: S.gid, id: m.id, mode: m.mode === 'team' ? 'team' : 'vs', seed: (Math.random() * 1e9) | 0, players: S.players.map((p) => p.pid), names: {}, scores: {}, prog: {}, done: {}, phase: 'play', res: null };
      S.players.forEach((p) => { S.mg.names[p.pid] = p.name; });
      pushEv({ type: 'mg', gid: S.gid }); break;
    }
    case 'mgs': {
      const mg = S.mg; if (!mg || mg.gid !== m.gid || mg.phase !== 'play' || mg.players.indexOf(pid) < 0) return;
      mg.scores[pid] = Math.max(0, Math.round(+m.s || 0)); mg.prog[pid] = clamp(+m.p || 0, 0, 1); if (m.d) mg.done[pid] = 1;
      touch(); checkMg(); break;
    }
  }
}
function cleanLook(l) {
  if (!l || !GP.SPECIES[l.sp] || !Array.isArray(l.col)) return null;
  const col = l.col.slice(0, 2).map((c) => /^#[0-9a-f]{6}$/i.test(c) ? c : '#cccccc'); const acc = {};
  ['head', 'neck', 'face'].forEach((k) => { if (l.acc && GP.ITEMS[l.acc[k]] && GP.ITEMS[l.acc[k]].slot === k) acc[k] = l.acc[k]; });
  return { sp: l.sp, col, eye: /^#[0-9a-f]{6}$/i.test(l.eye || '') ? l.eye : undefined, oneEye: l.oneEye ? 1 : 0, lv: clamp(+l.lv || 1, 1, 20), acc, n: GN.cleanName(l.n), id: +l.id || 0 };
}
function checkMg() {
  const S = S_(), mg = S && S.mg; if (!mg || mg.phase !== 'play') return;
  const live = mg.players.filter((p) => S.players.some((q) => q.pid === p));
  if (!live.every((p) => mg.done[p])) return;
  mg.phase = 'over';
  const sc = live.map((p) => ({ pid: p, s: mg.scores[p] || 0 })).sort((a, b) => b.s - a.s);
  const goal = GP.gameById(mg.id).goal * Math.max(1, live.length) * 0.8;
  const total = sc.reduce((a, b) => a + b.s, 0);
  mg.res = mg.mode === 'vs' ? { win: sc.length && sc[0].s > 0 ? sc.filter((x) => x.s === sc[0].s).map((x) => x.pid) : [], rank: sc } : { total, goal: Math.round(goal), ok: total >= goal, rank: sc };
  pushEv({ type: 'mgover', gid: mg.gid });
}
function doAct(m) {
  if (!GS.S) return;
  if (GS.role === 'client') { if (GS.room) GS.room.send(Object.assign({ t: 'act' }, m)); }
  else hostAct(GS.pid, m);
}
G.doAct = doAct;
function syncLooks() {
  const S = S_(); if (!S) return;
  const looks = save.active.map(petById).filter(Boolean).map(G.petLook);
  const key = JSON.stringify(looks); if (key !== GS.lookKey || !S.looks[GS.pid]) { GS.lookKey = key; doAct({ k: 'look', pets: looks }); }
  if (GS.role !== 'client') {
    const home = { layout: save.home.map((f) => Object.assign({}, f)), pets: save.pets.filter((p) => save.active.indexOf(p.id) < 0).slice(0, 14).map(G.petLook) };
    const hk = JSON.stringify(home) + !!save.beach; if (hk !== GS.hostHomeKey || GS.hostHomeS !== S) { GS.hostHomeKey = hk; GS.hostHomeS = S; S.home = home; S.beach = !!save.beach; touch(); }
  }
}
G.syncLooks = syncLooks;

/* ======================================================================
   Sessions & networking
   ====================================================================== */
function playersFromRoom() {
  const S = S_(), r = GS.room; if (!S) return;
  S.players = r ? r.players().map((p) => ({ pid: p.pid, name: p.name, color: p.color, host: p.host })) : [{ pid: GS.pid, name: myName(), color: prof.color, host: true }];
  for (const k in S.looks) if (!S.players.some((p) => p.pid === k)) delete S.looks[k];
  checkMg(); touch();
}
function startSolo() {
  leaveSession(true);
  GS.role = 'solo'; GS.S = newSession(); playersFromRoom(); GS.lookKey = ''; syncLooks(); enterWorld();
}
function hostOnline(code) {
  leaveSession(true);
  GS.role = 'host'; GS.connecting = true; GS.ui = 'online'; setOnlineMsg('Opening a room\u2026', true);
  const room = GS.room = GN.createRoom({ role: 'host', code: code || undefined, name: myName(), color: prof.color, autoCode: !code, rejoin: !!code, max: 3, pid: GS.pid });
  room.on('status', (t) => { if (GS.connecting) setOnlineMsg(t, true); });
  room.on('open', () => { if (GS.room !== room) return; GS.connecting = false; GS.S = newSession(); GS.evSeen = 0; playersFromRoom(); GS.lookKey = ''; syncLooks(); enterWorld(); Snd.fx('join'); G.toast('Room ' + room.code + ' is open! Friends join with this code.'); });
  room.on('players', () => { if (GS.room === room) playersFromRoom(); });
  room.on('join', (p) => { if (GS.room !== room || !GS.S) return; G.toast(p.name + ' joined your town!'); Snd.fx('join'); GS.lastSend = 0; });
  room.on('leave', (p) => { if (GS.room !== room || !GS.S) return; G.toast(p.name + ' went home', true); Snd.fx('leave'); delete GS.pos[p.pid]; playersFromRoom(); });
  room.on('message', (d, from) => {
    if (!d || typeof d !== 'object' || GS.room !== room) return;
    if (d.t === 'act') hostAct(from, d);
    else if (d.t === 'pos') GS.pos[from] = { a: String(d.a).slice(0, 10), x: +d.x || 0, z: +d.z || 0, r: +d.r || 0, m: d.m ? 1 : 0 };
  });
  room.on('error', (e) => { if (GS.room !== room) return; GS.connecting = false; if (!GS.S) { GS.ui = 'online'; setOnlineMsg(e.title + ': ' + e.message); GS.role = null; GS.room = null; } else G.toast(e.title, true); });
  room.start();
}
function joinOnline(code) {
  code = GN.normalizeCode(code);
  if (!GN.validCode(code)) { GS.ui = 'online'; setOnlineMsg('Enter the 5-letter room code.'); return; }
  leaveSession(true);
  GS.role = 'client'; GS.connecting = true; GS.ui = 'online'; setOnlineMsg('Joining room ' + code + '\u2026', true);
  const room = GS.room = GN.createRoom({ role: 'join', code, name: myName(), color: prof.color, pid: GS.pid, rejoin: !!GS.fromHub });
  room.on('status', (t) => { if (GS.connecting) setOnlineMsg(t, true); });
  room.on('open', () => { setOnlineMsg('Connected! Walking over\u2026', true); Snd.fx('join'); });
  room.on('message', (d) => {
    if (!d || GS.room !== room) return;
    if (d.t === 'st' && d.s) applyState(d.s);
    else if (d.t === 'pp' && d.p) { for (const k in d.p) if (k !== GS.pid) GS.pos[k] = d.p[k]; for (const k in GS.pos) if (!d.p[k]) delete GS.pos[k]; }
    else if (d.t === 'cs' && GP.Chaos) GP.Chaos.onState(d.s);
  });
  room.on('join', (p) => { if (GS.S) { G.toast(p.name + ' joined!'); Snd.fx('join'); } });
  room.on('leave', (p) => { if (GS.S && !p.host) { G.toast(p.name + ' went home', true); Snd.fx('leave'); } });
  room.on('reconnecting', () => G.toast('Lost the host \u2014 reconnecting\u2026', true));
  room.on('reconnected', () => { G.toast('Reconnected!'); GS.lookKey = ''; });
  room.on('error', (e) => {
    if (GS.room !== room) return;
    GS.connecting = false;
    if (e.code === 'hostleft' && GS.S) { takeOver(); return; }
    leaveSession(true); GS.ui = 'online'; setOnlineMsg(e.title + ': ' + e.message);
  });
  room.start();
}
function applyState(s) {
  const first = !GS.S;
  GS.S = s; GS.connecting = false;
  if (first) { GS.evSeen = s.evId; GS.mgSeen = s.mg ? s.mg.gid : 0; GS.lookKey = ''; enterWorld(true); }
  if (!s.looks[GS.pid]) GS.lookKey = '';
  const hk = JSON.stringify((s.home && s.home.layout) || []);
  if (hk !== GS.homeKey) { GS.homeKey = hk; if (!first && GS.me.area === 'home') W.placeHome(homeLayout()); }
  if (!!s.beach !== GS.beachSeen) { GS.beachSeen = !!s.beach; refreshGate(); }
  syncLooks();
}
function takeOver() {
  const r = GS.room; GS.room = null; GS.role = 'solo'; try { if (r) r.leave(); } catch (e) { /* ignore */ }
  const old = S_(); GS.S = newSession(); GS.pos = {}; playersFromRoom(); GS.lookKey = ''; syncLooks();
  if (GS.mg && GP.MG.active()) GS.mg.solo = true;
  W.placeHome(save.home); refreshGate(); GS.homeKey = null;
  GS.evSeen = 0; void old;
  G.toast('The host left. You\u2019re back in your own town!', true); Snd.fx('leave');
  if (GS.me.area === 'home') travel('home', true);
}
function leaveSession(silent) {
  if (GP.Chaos) GP.Chaos.abort();
  const r = GS.room; GS.room = null;
  if (r) { try { r.leave(); } catch (e) { /* ignore */ } }
  if (GP.MG && GP.MG.active()) GP.MG.abort();
  if (GS.care) GP.Care.close(true);
  if (GP.NPC) GP.NPC.abort();
  GS.S = null; GS.role = null; GS.connecting = false; GS.pos = {}; GS.goal = null; GS.inWorld = false; GS.mg = null;
  closePanel(); $('scrMenu').classList.add('hidden');
  for (const k in GS.av) W.scene.remove(GS.av[k].ch.g); GS.av = {};
  clearPets(); Snd.music(false);
  if (!silent) GS.ui = 'title';
}
function netTick(now) {
  if (!GS.room || !GS.S) return;
  if (GS.role === 'host') {
    if ((GS.dirty && now - GS.lastSend > 80) || now - GS.lastSend > 1000) { GS.room.broadcast({ t: 'st', s: GS.S }); GS.lastSend = now; GS.dirty = false; }
    if (now - GS.lastPos > 100) { GS.lastPos = now; const p = Object.assign({}, GS.pos); p[GS.pid] = myPos(); GS.room.broadcast({ t: 'pp', p }); }
  } else if (GS.role === 'client') {
    const p = myPos(), key = p.a + p.x + ',' + p.z + p.m;
    if (now - GS.lastPos > 100 && (key !== GS.lastPosSent || now - GS.lastPos > 900)) { GS.lastPos = now; GS.lastPosSent = key; GS.room.send(Object.assign({ t: 'pos' }, p)); }
  }
}
function myPos() { const m = GS.me; return { a: GS.mg ? 'arena' : m.area, x: +m.x.toFixed(2), z: +m.z.toFixed(2), r: +m.yaw.toFixed(2), m: m.sp > 0.1 ? 1 : 0 }; }

/* ======================================================================
   World flow
   ====================================================================== */
function homeLayout() { return GS.role === 'client' && GS.S ? (GS.S.home.layout || []) : save.home; }
G.homeLayout = homeLayout;
function enterWorld(asGuest) {
  GS.ui = 'game'; GS.inWorld = true;
  W.placeHome(homeLayout()); refreshGate();
  if (asGuest) travel('town', true, [2, -24]);
  else travel('home', true);
  Snd.music(true);
  checkDaily();
  if (save.tut > 0 && save.tut < 6 && save.pets.length) setTimeout(() => { if (GS.inWorld && !GS.care && !GS.panel && !GS.chaos && save.active.length && save.tut > 0 && save.tut < 6) GP.Care.open(save.active[0]); }, 400);
}
function refreshGate() { const open = !!(save.beach || (GS.S && GS.S.beach)); W.gateObs.off = open; W.gateBar.visible = !open; }
G.refreshGate = refreshGate;
function travel(area, instant, at) {
  const A = W.areas[area]; if (!A) return;
  const go = () => {
    if (area === 'home') W.placeHome(homeLayout());
    const sp = at || A.spawn; const f = W.freeNear(A, sp[0], sp[1], 0.4);
    GS.me.area = area; GS.me.x = f[0]; GS.me.z = f[1]; GS.me.yaw = Math.PI; GS.goal = null; GS.find = null;
    W.setArea(area); clearPets(); W.updateCamera(GS.me.x, GS.me.z, 0, true); GS.lastPos = 0;
  };
  if (instant) { go(); return; }
  Snd.fx('door'); $('fade').classList.add('on');
  setTimeout(() => { go(); $('fade').classList.remove('on'); G.toast('\u2192 ' + (A.label || area)); }, 260);
}
G.travel = travel;
const EXITS = { home: [0, -29.6], shop: [-12.8, -2], vet: [-10, 12.6], adopt: [10, 12.6] };

/* ======================================================================
   Pets in the 3D world
   ====================================================================== */
function clearPets() {
  for (const k in GS.p3) { W.scene.remove(GS.p3[k].P.g); } GS.p3 = {};
  for (const k in GS.rp) GS.rp[k].forEach((o) => W.scene.remove(o.P.g)); GS.rp = {};
  for (const k in GS.hp) W.scene.remove(GS.hp[k].P.g); GS.hp = {};
}
function petTag(o, name, col) {
  if (o.tagName === name) return; if (o.tag) o.P.g.remove(o.tag);
  o.tag = W.textSprite(name, { size: 30, h: 0.26 / o.P.scale, bg: 'rgba(40,20,70,.75)', border: col || '#ffd23f' }); o.tag.position.y = o.P.h + 0.35 / o.P.scale; o.P.g.add(o.tag); o.tagName = name;
}
function needTag(o, icon) {
  if (o.needI === icon) return; if (o.need) o.P.g.remove(o.need); o.need = null; o.needI = icon;
  if (icon) { o.need = W.textSprite(icon, { size: 40, h: 0.4 / o.P.scale, bg: 'rgba(255,255,255,.92)', border: '#ff6b86' }); o.need.position.y = o.P.h + 0.8 / o.P.scale; o.P.g.add(o.need); }
}
function ensurePet3d(map, key, look, x, z) {
  let o = map[key]; const lk = lookKey(look);
  if (o && o.key !== lk) { const keep = o; W.scene.remove(o.P.g); o = map[key] = Object.assign({}, keep, { P: MD.pet(look), key: lk, tag: null, tagName: null, need: null, needI: null }); W.scene.add(o.P.g); o.P.g.position.set(o.x, 0, o.z); return o; }
  if (!o) { const f = W.freeNear(W.cur, x, z, 0.25); o = map[key] = { P: MD.pet(look), key: lk, x: f[0], z: f[1], yaw: 0, sp: 0, idle: Math.random() * 3, stuck: 0, tgt: null }; W.scene.add(o.P.g); o.P.g.position.set(o.x, 0, o.z); }
  return o;
}
G.pet3d = (id) => GS.p3[id];
function followStep(o, tx, tz, dt, speedCap, A) {
  const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz);
  if (d > 16) { const f = W.freeNear(A, tx, tz, 0.25); o.x = f[0]; o.z = f[1]; o.sp = 0; return; }
  if (d > 0.35) {
    // turn first, then move: pets only move while facing (close to) the way they go, so they never walk backwards or slide sideways
    const ty = Math.atan2(dx, dz); let a = ty - o.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); o.yaw += a * Math.min(1, dt * 10);
    const al = Math.cos(Math.atan2(Math.sin(ty - o.yaw), Math.cos(ty - o.yaw))), face = clamp((al - 0.72) / 0.23, 0, 1);
    const sp = Math.min(speedCap, d * 2.6 + 0.6) * face, nx = o.x + dx / d * sp * dt, nz = o.z + dz / d * sp * dt;
    const r = W.move(A, o.x, o.z, nx - o.x, nz - o.z, 0.22); const moved = Math.hypot(r[0] - o.x, r[1] - o.z);
    o.x = r[0]; o.z = r[1]; o.sp = moved / Math.max(dt, 1e-3);
    if (face > 0.5 && moved < sp * dt * 0.3) { o.stuck += dt; if (o.stuck > 1.2 && d > 2.5) { const f = W.freeNear(A, tx, tz, 0.25); o.x = f[0]; o.z = f[1]; o.stuck = 0; } } else if (face > 0.5) o.stuck = 0;
  } else o.sp = 0;
}
function updateMyPets(dt) {
  const A = W.cur, m = GS.me, live = {};
  const fx = Math.sin(m.yaw), fz = Math.cos(m.yaw);
  save.active.forEach((id, i) => {
    const p = petById(id); if (!p) return; live[id] = 1;
    const o = ensurePet3d(GS.p3, id, G.petLook(p), m.x - fx * 1.4, m.z - fz * 1.4);
    o.P.mood = clamp(G.mood(p) / 100, 0, 1);
    petTag(o, p.name, prof.color);
    if (GS.care && GS.care.id === id) { o.tag.visible = false; if (o.need) o.need.visible = false; o.P.g.position.set(o.x, 0, o.z); o.P.g.rotation.y = o.yaw; return; }
    needTag(o, G.needIcon(p)); if (o.need) o.need.visible = true;
    if (GS.npcPd && GS.npcPd.id === id && GP.NPC) GP.NPC.pdPet(o, dt); // playdate with a townsperson's pet
    else if (GS.find && GS.find.pet === id) { // walk-find: run to the sparkle and dig
      const f = GS.find; followStep(o, f.x, f.z, dt, 6, A);
      if (Math.hypot(f.x - o.x, f.z - o.z) < 0.6) { if (!f.dig) { f.dig = 1.3; o.P.play('dig', 1.3); Snd.fx('dig'); } }
      if (f.dig) { f.dig -= dt; if (Math.random() < 0.3) W.fx('dust', f.x, 0.2, f.z, 1, 0.5); if (f.dig <= 0) finishFind(p, o); }
    } else {
      const side = i === 0 ? 0 : (i === 1 ? 0.9 : -0.9), back = 1.3 + (i > 0 ? 0.5 : 0);
      const tx = m.x - fx * back + fz * side, tz = m.z - fz * back - fx * side;
      followStep(o, tx, tz, dt, Math.max(7, m.sp * 1.4) * (p.n.e < 15 ? 0.75 : 1), A);
      if (o.sp < 0.1) { o.idle -= dt; if (o.idle < 0 && !o.P.act) { o.idle = 4 + Math.random() * 5; const r = Math.random(); o.P.play(G.mood(p) > 70 && r < 0.4 ? 'happy' : r < 0.7 ? 'sniff' : 'sit', r < 0.7 ? 1.4 : 2.4); } let a = Math.atan2(m.x - o.x, m.z - o.z) - o.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); o.yaw += a * Math.min(1, dt * 2); }
    }
    o.P.g.position.set(o.x, 0, o.z); o.P.g.rotation.y = o.yaw; o.P.anim(dt, o.sp);
    o.tag.visible = !GS.care;
  });
  for (const k in GS.p3) if (!live[k]) { W.scene.remove(GS.p3[k].P.g); delete GS.p3[k]; }
}
// pets that stay home wander around the house
function updateHomePets(dt) {
  const A = W.cur, live = {};
  if (A.id !== 'home') { for (const k in GS.hp) { W.scene.remove(GS.hp[k].P.g); delete GS.hp[k]; } return; }
  const list = GS.role === 'client' ? (GS.S.home.pets || []) : save.pets.filter((p) => save.active.indexOf(p.id) < 0).slice(0, 14).map(G.petLook);
  const beds = homeLayout().filter((f) => f.id === 'petbed' || f.id === 'cushion' || f.id === 'beanbag');
  list.forEach((l, i) => {
    const key = 'h' + (l.id || i); live[key] = 1;
    const o = ensurePet3d(GS.hp, key, l, -6 + (i % 6) * 2.4, -3 + Math.floor(i / 6) * 2);
    petTag(o, l.n, '#a78bfa');
    const own = GS.role !== 'client' ? petById(l.id) : null;
    if (!o.tgt || Math.hypot(o.tgt[0] - o.x, o.tgt[1] - o.z) < 0.4) {
      o.wait = (o.wait || 0) - dt;
      if (o.wait <= 0) {
        const sleepy = own && own.n.e < 55 && beds.length;
        if (sleepy) { const b = beds[i % beds.length]; o.tgt = [b.x + (Math.random() - 0.5) * 0.4, b.z + (Math.random() - 0.5) * 0.3]; o.nap = true; }
        else { o.tgt = [-8 + Math.random() * 16, -5 + Math.random() * 9.5]; o.nap = false; }
        o.wait = 3 + Math.random() * 5;
      } else if (o.nap && o.P.act !== 'sleep') o.P.play('sleep', 3);
    }
    if (o.tgt && Math.hypot(o.tgt[0] - o.x, o.tgt[1] - o.z) >= 0.4) { if (o.P.act === 'sleep') o.P.act = null; followStep(o, o.tgt[0], o.tgt[1], dt, 1.6, A); if (o.sp < 0.05) o.tgt = null; }
    else o.sp = 0;
    if (o.nap && o.P.act === 'sleep' && Math.random() < dt * 0.6) W.fx('zzz', o.x, o.P.hTop + 0.2, o.z, 1, 0.1);
    o.P.g.position.set(o.x, 0, o.z); o.P.g.rotation.y = o.yaw; o.P.anim(dt, o.sp);
  });
  for (const k in GS.hp) if (!live[k]) { W.scene.remove(GS.hp[k].P.g); delete GS.hp[k]; }
}
function updateRemotePets(dt) {
  const S = S_(), A = W.cur, seen = {};
  S.players.forEach((pl) => {
    if (pl.pid === GS.pid) return; const pos = GS.pos[pl.pid], av = GS.av[pl.pid], looks = S.looks[pl.pid] || [];
    if (!pos || pos.a !== GS.me.area || !av || !av.init) { if (GS.rp[pl.pid]) { GS.rp[pl.pid].forEach((o) => W.scene.remove(o.P.g)); delete GS.rp[pl.pid]; } return; }
    seen[pl.pid] = 1; const map = GS.rp[pl.pid] = GS.rp[pl.pid] || [];
    while (map.length > looks.length) W.scene.remove(map.pop().P.g);
    const fx = Math.sin(av.yaw), fz = Math.cos(av.yaw);
    looks.forEach((l, i) => {
      const holder = {}; holder.k = map[i]; const mm = {}; if (map[i]) mm.x = map[i];
      const o = ensurePet3d(mm, 'x', l, av.x - fx * 1.4, av.z - fz * 1.4); map[i] = o;
      petTag(o, l.n, av.color);
      const side = i === 0 ? 0 : (i === 1 ? 0.9 : -0.9), back = 1.3 + (i > 0 ? 0.5 : 0);
      followStep(o, av.x - fx * back + fz * side, av.z - fz * back - fx * side, dt, 8, A);
      if (o.pd > 0) { o.pd -= dt; if (!o.P.act) o.P.play('happy', 0.8); }
      o.P.g.position.set(o.x, 0, o.z); o.P.g.rotation.y = o.yaw; o.P.anim(dt, o.sp);
    });
  });
  for (const k in GS.rp) if (!seen[k]) { GS.rp[k].forEach((o) => W.scene.remove(o.P.g)); delete GS.rp[k]; }
}
// walks: distance with pets out in town earns happiness, XP and surprise finds
function walkTick(dist) {
  if (!save.active.length || GS.me.area !== 'town' || GS.care) return;
  save.stats.walk += dist; GS.walkAcc += dist; GS.findAcc += dist;
  if (GS.walkAcc >= 25) { GS.walkAcc = 0; save.active.forEach((id) => { const p = petById(id); if (!p) return; p.walk = (p.walk || 0) + 25; G.bump(p, 'f', 2.5); G.bump(p, 'c', -0.6); G.addXP(p, 3); }); }
  const beach = GS.me.x > 56.5;
  if (!GS.find && GS.findAcc >= (beach ? 45 : 80)) {
    GS.findAcc = 0; const id = save.active[Math.floor(Math.random() * save.active.length)], o = GS.p3[id]; if (!o) return;
    const a = GS.me.yaw + (Math.random() - 0.5) * 1.6, f = W.freeNear(W.cur, GS.me.x + Math.sin(a) * 3, GS.me.z + Math.cos(a) * 3, 0.3);
    GS.find = { pet: id, x: f[0], z: f[1], dig: 0, beach }; W.fx('sparkle', f[0], 0.4, f[1], 6, 0.6);
    const p = petById(id); G.toast('\uD83D\uDC43 ' + p.name + ' smells something!'); Snd.fx(GP.SPECIES[p.sp].snd);
  }
}
function finishFind(p, o) {
  const f = GS.find; GS.find = null; const r = Math.random();
  if (r < 0.08) { const opts = GP.itemsOf('acc').filter((k) => !save.inv[k] && GP.ITEMS[k].price <= 110); if (opts.length) { const k = opts[Math.floor(Math.random() * opts.length)]; save.inv[k] = 1; G.toast('\u2728 ' + p.name + ' dug up a ' + GP.ITEMS[k].name + '!'); Snd.fx('treasure'); W.fx('star', f.x, 0.6, f.z, 8); persist(); return; } }
  if (r < 0.35) { const foods = ['kibble', 'seeds', 'veggie', 'fishsnack', 'cupcake']; const k = foods[Math.floor(Math.random() * foods.length)]; save.inv[k] = (save.inv[k] || 0) + 1; G.toast('\uD83C\uDF81 ' + p.name + ' found a ' + GP.ITEMS[k].name + '!'); Snd.fx('treasure'); }
  else { const c = f.beach ? 12 + Math.floor(Math.random() * 24) : 5 + Math.floor(Math.random() * 14); G.addCoins(c); G.toast('\uD83E\uDE99 ' + p.name + ' dug up ' + c + ' coins!'); W.fx('coin', f.x, 0.5, f.z, 5); }
  G.bump(p, 'f', 4); G.addXP(p, 4); o.P.play('happy', 1); persist();
}

/* ======================================================================
   Events
   ====================================================================== */
function processEvents() {
  const S = S_(); if (!S) return;
  for (const e of S.ev) {
    if (e.id <= GS.evSeen) continue; GS.evSeen = e.id;
    if (e.type === 'gift' && e.to === GS.pid) {
      if (e.item === 'coins') { G.addCoins(e.n); G.toast('\uD83C\uDF81 ' + e.by + ' sent you ' + e.n + ' coins!'); }
      else { save.inv[e.item] = (save.inv[e.item] || 0) + e.n; G.toast('\uD83C\uDF81 ' + e.by + ' sent you a ' + GP.ITEMS[e.item].name + '!'); }
      save.active.forEach((id) => { const p = petById(id); if (p) G.bump(p, 'f', 8); }); Snd.fx('buy'); persist();
    } else if (e.type === 'playdate' && e.pids.indexOf(GS.pid) >= 0) {
      save.stats.playdates++;
      save.active.forEach((id) => { const p = petById(id); if (!p) return; G.bump(p, 'f', 20); G.addXP(p, 12); const o = GS.p3[id]; if (o) { o.P.play('happy', 2); W.fx('heart', o.x, o.P.hTop, o.z, 6, 0.6); } });
      for (const k in GS.rp) if (e.pids.indexOf(k) >= 0) GS.rp[k].forEach((o) => { o.pd = 2; W.fx('heart', o.x, o.P.hTop, o.z, 4, 0.6); });
      G.addCoins(10); G.toast('\uD83D\uDC9E Playdate with ' + e.names.filter((n) => n !== myName()).join(' & ') + '! +20 happiness, +10 coins'); Snd.fx('cheer'); persist();
    } else if (e.type === 'suggest' && GS.role === 'host') { GS.suggest = e.id; G.toast('\uD83D\uDCA1 ' + e.by + ' wants to play ' + GP.gameById(e.id).name + '! (Mini Game Stand)'); Snd.fx('join'); }
    else if (e.type === 'mg') { /* handled in mgTick */ }
    else if (e.type === 'mgover') { if (GS.mg && GS.mg.gid === e.gid) G.mgOnlineResult(); }
  }
}
function mgTick() {
  const S = S_(), mg = S && S.mg; if (!mg || !G.online()) return;
  if (mg.phase === 'play' && mg.gid !== GS.mgSeen && mg.players.indexOf(GS.pid) >= 0) {
    GS.mgSeen = mg.gid;
    G.startGame(mg.id, { gid: mg.gid, seed: mg.seed, mode: mg.mode });
  }
}

/* ======================================================================
   Mini games glue
   ====================================================================== */
G.leadPet = function () { let p = petById(save.active[0]); if (!p && save.pets.length) { save.active = [save.pets[0].id]; p = save.pets[0]; } return p; };
G.startGame = function (id, net) {
  const p = G.leadPet(); if (!p) return;
  if (GS.chaos && GP.Chaos) GP.Chaos.exit();
  closePanel(); if (GS.care) GP.Care.close(true); $('scrMenu').classList.add('hidden'); if (GP.NPC) GP.NPC.abort();
  GS.mg = { id, gid: net ? net.gid : 0, mode: net ? net.mode : 'solo', ret: { a: GS.me.area, x: GS.me.x, z: GS.me.z }, sent: 0, last: '', finished: false, solo: !net };
  GS.joyReset && GS.joyReset();
  W.setArea('arena'); clearPets();
  GP.MG.start(id, { seed: net ? net.seed : (Math.random() * 1e9) | 0, pet: p, look: G.petLook(p), mode: GS.mg.mode, beach: GS.me.x > 56 && GS.me.area === 'town',
    onScore: (s, prog, done) => { const m = GS.mg; if (!m || m.solo || !G.online()) return; const k = s + '|' + Math.round(prog * 50) + '|' + (done ? 1 : 0); const now = performance.now(); if (k !== m.last && (done || now - m.sent > 250)) { m.last = k; m.sent = now; doAct({ k: 'mgs', gid: m.gid, s, p: prog, d: done ? 1 : 0 }); } },
    others: () => { const S = S_(), m = GS.mg; if (!S || !S.mg || !m || m.solo || S.mg.gid !== m.gid) return []; return S.mg.players.filter((q) => q !== GS.pid).map((q) => ({ name: S.mg.names[q] || 'Friend', color: (S.players.find((x) => x.pid === q) || {}).color || '#fff', score: S.mg.scores[q] || 0, prog: S.mg.prog[q] || 0, done: !!S.mg.done[q], left: !S.players.some((x) => x.pid === q) })); }
  });
};
// local game over: reward the player, then show results (online: wait for everyone)
G.mgFinished = function (id, score, extra) {
  const m = GS.mg; if (!m || m.finished) return; m.finished = true; m.score = score;
  const p = G.leadPet(), gm = GP.gameById(id);
  const coins = Math.round(extra && extra.coins != null ? extra.coins : score / 2);
  G.addCoins(coins); if (p) { G.addXP(p, 15 + Math.min(25, Math.round(score / 10))); G.bump(p, 'f', 10); G.bump(p, 'e', -8); }
  save.stats.games++; if (id === 'show') { save.stats.shows++; if (extra && extra.ribbon === 'Gold') save.stats.gold++; }
  const best = save.best[id] || 0, isBest = score > best; if (isBest) save.best[id] = score; persist();
  m.reward = { coins, isBest, extra: extra || {} };
  if (m.solo || !G.online()) showMgResult(); else { m.wait = true; GS.waitT = 0.5; renderWait(); }
};
function showMgResult(online) {
  const m = GS.mg, gm = GP.gameById(m.id), r = m.reward; let html = head(gm.icon + ' ' + gm.name);
  html += '<div class="big">' + (r.extra.title ? esc(r.extra.title) : 'Score: ' + m.score) + '</div>';
  if (r.extra.lines) html += r.extra.lines.map((l) => '<p class="sub">' + esc(l) + '</p>').join('');
  html += '<div class="reward">\uD83E\uDE99 +' + r.coins + ' coins' + (r.isBest ? ' \u00b7 \uD83C\uDFC6 NEW BEST!' : '') + '</div>';
  if (online) html += online;
  html += '<div class="btnrow"><button class="btn primary" data-a="mgdone">' + (m.solo ? 'BACK TO THE PARK' : 'CONTINUE') + '</button>' + (m.solo ? '<button class="btn blue" data-a="mgagain">PLAY AGAIN</button>' : '') + '</div>';
  openPanel('mgres', html);
  Snd.fx(m.score > 0 ? 'cheer' : 'miss');
}
function renderWait() {
  const m = GS.mg; if (!m || !m.wait) return; const S = S_(); if (!S || !S.mg || S.mg.gid !== m.gid) { m.wait = false; showMgResult(); return; }
  // the round may already be over (the 'mgover' event can arrive while our own FINISH! banner is still showing) -> show results now
  if (S.mg.phase !== 'play') { G.mgOnlineResult(); return; }
  const rows = S.mg.players.map((q) => { const pl = S.players.find((x) => x.pid === q); return '<div class="lrow"><b>' + esc(S.mg.names[q] || 'Friend') + '</b><span>' + (S.mg.scores[q] || 0) + (S.mg.done[q] ? ' \u2714' : pl ? ' \u2026playing' : ' (left)') + '</span></div>'; }).join('');
  openPanel('mgwait', head('\u23F3 Waiting for friends') + '<p class="sub">You scored <b>' + m.score + '</b>! Let\u2019s see how your friends do\u2026</p><div class="lboard">' + rows + '</div><div class="btnrow"><button class="btn" data-a="mgdone">LEAVE (KEEP COINS)</button></div>');
}
G.mgOnlineResult = function () {
  const m = GS.mg, S = S_(); if (!m || !S || !S.mg || S.mg.gid !== m.gid || !m.finished || m.resShown) return;
  m.wait = false; m.resShown = true; const res = S.mg.res; let extra = '';
  if (res) {
    const rows = res.rank.map((x, i) => '<div class="lrow' + (x.pid === GS.pid ? ' me' : '') + '"><b>' + (i + 1) + '. ' + esc(S.mg.names[x.pid] || 'Friend') + '</b><span>' + x.s + '</span></div>').join('');
    if (S.mg.mode === 'vs') { const won = res.win.indexOf(GS.pid) >= 0; extra = '<h3>' + (won ? '\uD83E\uDD47 You won! +30 bonus coins' : '\uD83D\uDC4F Nice try!') + '</h3><div class="lboard">' + rows + '</div>'; if (won) G.addCoins(30); }
    else { extra = '<h3>' + (res.ok ? '\uD83E\uDD1D Team goal reached! +25 coins each' : 'Team total ' + res.total + ' / ' + res.goal) + '</h3><div class="lboard">' + rows + '</div>'; if (res.ok) G.addCoins(25); }
    persist();
  }
  showMgResult(extra);
};
G.mgExit = function () {
  const m = GS.mg; GS.mg = null; GP.MG.stop(); closePanel();
  if (m) { W.setArea(m.ret.a); GS.me.area = m.ret.a; GS.me.x = m.ret.x; GS.me.z = m.ret.z; W.updateCamera(GS.me.x, GS.me.z, 0, true); }
  W.placeHome(homeLayout()); refreshGate();
};

/* ======================================================================
   Interaction
   ====================================================================== */
function inGame() { return GS.ui === 'game' && GS.inWorld && GS.S; }
G.inGame = inGame;
function freeToAct() { return inGame() && !GS.panel && !GS.care && !GS.mg && !GS.chaos && !GS.talk && !GS.npcPd && $('scrMenu').classList.contains('hidden'); }
// townsperson / shop staff within talking range (null if none)
function nearestNpc() { return GP.NPC && W.cur ? GP.NPC.nearest(GS.me.x, GS.me.z) : null; }
function npcFirst(h, nn) { return nn && (!h || nn.d < Math.hypot(h.x - GS.me.x, h.z - GS.me.z)); }
function nearestHot() {
  if (!W.cur) return null; let best = null, bd = 1e9;
  for (const h of W.cur.hots) { if (h.id === 'gate' && W.gateObs.off) continue; const d = Math.hypot(h.x - GS.me.x, h.z - GS.me.z); if (d <= h.reach && d < bd) { bd = d; best = h; } }
  return best;
}
function interact(h) {
  if (!h) return; GS.goal = null; Snd.fx('click');
  switch (h.kind) {
    case 'door': travel(h.to); if (save.tut === 5) { save.tut = 6; persist(); } break;
    case 'exit': travel('town', false, EXITS[W.cur.id]); if (save.tut === 5) { save.tut = 6; persist(); } break;
    case 'shelf': G.UI.shop(h.cat); break;
    case 'adopt': G.UI.adopt(null); break;
    case 'pen': G.UI.adopt(h.sp); break;
    case 'family': G.UI.family(); break;
    case 'vet': if (h.id === 'vet_desk' && GP.NPC && GP.NPC.talk('pawla')) break; G.UI.vet(h.tab); break;
    case 'stand': G.UI.games(h.beach); break;
    case 'gate': G.UI.gate(); break;
  }
}
function pressAct() {
  Snd.init(); if (!freeToAct()) return;
  const h = nearestHot(), nn = nearestNpc(); if (npcFirst(h, nn)) { GP.NPC.talk(nn.n); return; } if (h) { interact(h); return; }
  if (save.active.length) GP.Care.open(nearestActivePet()); else G.toast('Walk up to a door or sign, or pick a pet to walk with in PETS.');
}
function nearestActivePet() { let best = save.active[0], bd = 1e9; save.active.forEach((id) => { const o = GS.p3[id]; if (o) { const d = Math.hypot(o.x - GS.me.x, o.z - GS.me.z); if (d < bd) { bd = d; best = id; } } }); return best; }
G.interact = interact;

/* ======================================================================
   Panels
   ====================================================================== */
function openPanel(name, html) { GS.panel = name; $('pnlCard').innerHTML = html; $('pnl').classList.remove('hidden'); $('pnlCard').scrollTop = 0; GS.joyReset && GS.joyReset(); }
function closePanel() { const was = GS.panel; GS.panel = null; $('pnl').classList.add('hidden'); if (was && G.onPanelClose) G.onPanelClose(was); }
function head(title) { return '<div class="pnlHead"><h2>' + title + '</h2><button class="xbtn" data-a="close" aria-label="Close">\u2715</button></div>'; }
G.openPanel = openPanel; G.closePanel = closePanel; G.head = head;
G.toast = function (t, bad) {
  const el = document.createElement('div'); el.className = 'toast' + (bad ? ' bad' : ''); el.textContent = t;
  const box = $('toasts'); box.appendChild(el); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), 3400);
};
function setOnlineMsg(t, ok) { const el = $('onlineMsg'); el.textContent = t || ''; el.classList.toggle('ok', !!ok); }

/* daily reward */
function today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function checkDaily() {
  if (!save.pets.length || save.tut < 6) return;
  const t = today(); if (save.daily.last === t) return;
  const y = new Date(Date.now() - 86400000), ys = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
  const streak = save.daily.last === ys ? Math.min(7, save.daily.streak + 1) : 1;
  const coins = 40 + streak * 10, gift = streak >= 7 ? 'cupcake' : streak >= 3 ? 'steak' : 'kibble';
  save.daily = { last: t, streak }; G.addCoins(coins); save.inv[gift] = (save.inv[gift] || 0) + (streak >= 7 ? 2 : 1); persist();
  if (GS.chaos || GS.panel === 'chaos') { G.toast('\uD83C\uDF1E Daily reward: +' + coins + ' coins!'); return; }
  setTimeout(() => openPanel('daily', head('\uD83C\uDF1E Daily Reward') + '<div class="streak">' + [1, 2, 3, 4, 5, 6, 7].map((d) => '<span class="' + (d <= streak ? 'on' : '') + '">' + d + '</span>').join('') + '</div><p class="sub">Day ' + streak + ' streak! Come back tomorrow for more.</p><div class="reward">\uD83E\uDE99 +' + coins + ' coins &nbsp; ' + GP.ITEMS[gift].icon + ' +' + (streak >= 7 ? 2 : 1) + ' ' + GP.ITEMS[gift].name + '</div><div class="btnrow"><button class="btn primary" data-a="close">YAY!</button></div>'), 700);
}
/* family unlocks */
let famT = 0;
function checkFamily(dt) {
  famT -= dt; if (famT > 0 || save.tut < 6 || GS.panel || GS.care || GS.mg) return; famT = 3;
  for (const f of GP.FAMILY) {
    if (save.famClaimed[f.id] || save.pets.some((p) => p.fam === f.id)) continue;
    const r = f.test(save); if (r[0] >= r[1]) { G.UI.familyPop(f); return; }
  }
}
G.claimFamily = function (fid) {
  const f = GP.familyById(fid); if (!f || save.famClaimed[fid] || save.pets.some((p) => p.fam === fid)) return;
  const r = f.test(save); if (r[0] < r[1]) return;
  save.famClaimed[fid] = 1; const p = G.addPet(makePet(f.sp, 0, f.name, f.id), true); Snd.fx('learn'); G.toast('\uD83D\uDC96 ' + p.name + ' joined your family!');
  return p;
};
G.makePet = makePet;

/* ======================================================================
   Input
   ====================================================================== */
const keys = Object.create(null);
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
G.keys = keys;
addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return;
  keys[e.code] = true;
  if (e.code === 'KeyM') { toggleMute(); return; }
  if (!inGame()) return;
  if (GS.mg) { GP.MG.key(e.code, true, e); return; }
  if (GS.chaos) { GP.Chaos.key(e.code, true, e); return; }
  if (GS.care) { GP.Care.key(e.code, e); return; }
  if (GS.talk) { if (e.code === 'Escape') GP.NPC.close(); return; }
  if (e.code === 'Escape') { if (GS.panel) closePanel(); else $('scrMenu').classList.toggle('hidden'); return; }
  if (e.repeat) return;
  if (GS.panel) { if (e.code === 'Enter' && GS.panel === 'daily') closePanel(); return; }
  if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') { e.preventDefault(); pressAct(); }
  else if (e.code === 'KeyC') { if (save.active.length) GP.Care.open(nearestActivePet()); }
  else if (e.code === 'KeyP') G.UI.pets();
  else if (e.code === 'KeyB') G.UI.bag();
  else if (e.code === 'KeyV') G.UI.map();
  else if (e.code === 'KeyF' && GS.me.area === 'home') G.UI.decor();
});
addEventListener('keyup', (e) => { keys[e.code] = false; if (GS.mg) GP.MG.key(e.code, false, e); });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
(function joystick() {
  if (!IS_TOUCH) document.body.classList.add('kbd');
  const zone = $('joyzone'), base = $('joybase'), knob = $('joyknob'), R = 52;
  const home = () => { base.style.left = ''; base.style.top = ''; knob.style.transform = ''; };
  zone.addEventListener('pointerdown', (e) => {
    Snd.init(); if (joy.id !== null) return; joy.id = e.pointerId; try { zone.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    const r = zone.getBoundingClientRect(); joy.ox = e.clientX; joy.oy = e.clientY; base.style.left = (e.clientX - r.left) + 'px'; base.style.top = (e.clientY - r.top) + 'px'; joy.x = joy.y = 0; $('joyhint').classList.add('hidden'); e.preventDefault();
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joy.id) return; let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
    joy.x = dx / R; joy.y = dy / R; if (Math.hypot(joy.x, joy.y) < 0.12) { joy.x = joy.y = 0; } knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  });
  const up = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; home(); };
  zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up); zone.addEventListener('lostpointercapture', up);
  GS.joyReset = () => { joy.id = null; joy.x = joy.y = 0; home(); };
})();
G.joy = joy;
(function taps() {
  const cv = $('c'); let down = null;
  cv.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; Snd.init(); });
  cv.addEventListener('pointerup', (e) => {
    if (!down) return; const d = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null;
    if (d < 16 && dt < 600) tapAt(e.clientX, e.clientY);
  });
})();
function tapAt(x, y) {
  if (GS.decor && inGame() && !GS.panel && !GS.care && !GS.mg) { G.UI.decorTap(x, y); return; }
  if (!freeToAct()) return;
  // tap one of my pets -> care
  for (const id of save.active) { const o = GS.p3[id]; if (o && W.hitObj(x, y, o.P.g)) { GP.Care.open(id); return; } }
  const tn = GP.NPC && GP.NPC.hit(x, y);
  if (tn) { const d = Math.hypot(tn.x - GS.me.x, tn.z - GS.me.z); if (d <= tn.reach) GP.NPC.talk(tn); else GS.goal = { x: tn.x, z: tn.z, npc: tn, best: 1e9, stuck: 0 }; return; }
  let best = null, bd = 50;
  for (const h of W.cur.hots) { if (h.id === 'gate' && W.gateObs.off) continue; const p = W.project(h.x, 0.8, h.z), d = Math.hypot(p.x - x, p.y - y); if (p.vis && d < bd) { bd = d; best = h; } }
  if (best) { const d = Math.hypot(best.x - GS.me.x, best.z - GS.me.z); if (d <= best.reach) interact(best); else GS.goal = { x: best.x, z: best.z, hot: best, best: 1e9, stuck: 0 }; return; }
  const r = W.pick(x, y); if (r && r.point) GS.goal = { x: r.point.x, z: r.point.z, best: 1e9, stuck: 0 };
}
function holdBtn(el, fn) { el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); }); }
holdBtn($('bAct'), pressAct);
holdBtn($('bCare'), () => { Snd.init(); if (!freeToAct()) return; if (save.active.length) GP.Care.open(nearestActivePet()); else G.UI.pets(); });
$('bPets').onclick = () => { Snd.init(); Snd.fx('click'); G.UI.pets(); };
$('bBag').onclick = () => { Snd.init(); Snd.fx('click'); G.UI.bag(); };
$('bMap').onclick = () => { Snd.init(); Snd.fx('click'); G.UI.map(); };
$('bDecor').onclick = () => { Snd.init(); Snd.fx('click'); G.UI.decor(); };
$('bPlaydate').onclick = () => { Snd.init(); doAct({ k: 'playdate' }); };
$('bMenu').onclick = () => { Snd.init(); $('menuSub').textContent = G.online() && GS.room ? 'Room code: ' + GS.room.code + ' \u00b7 ' + S_().players.length + '/3 players' : 'Playing solo'; $('bSkipTut').classList.toggle('hidden', save.tut >= 6); $('scrMenu').classList.remove('hidden'); };
$('bMute').onclick = () => { Snd.init(); toggleMute(); };
$('coinPill').onclick = () => { if (freeToAct()) G.UI.bag(); };
function toggleMute() { const m = !Snd.isMuted(); Snd.setMuted(m); save.muted = m; persist(); $('bMute').style.opacity = m ? 0.45 : 1; $('bMute').innerHTML = m ? '\uD83D\uDD07' : '\uD83D\uDD0A'; }
G.toggleMute = toggleMute;
$('bMute').style.opacity = Snd.isMuted() ? 0.45 : 1; $('bMute').innerHTML = Snd.isMuted() ? '\uD83D\uDD07' : '\uD83D\uDD0A';

/* ======================================================================
   Title / online / starter
   ====================================================================== */
(function titleUI() {
  const ni = $('nameIn'); ni.value = prof.name;
  ni.addEventListener('input', () => { prof.name = ni.value.trim() ? GN.cleanName(ni.value) : ''; save.name = prof.name; persist(); });
  const row = $('colorRow');
  const draw = () => { row.innerHTML = GN.COLORS.map((c) => '<button type="button" data-c="' + c + '" style="background:' + c + '" class="' + (c === prof.color ? 'on' : '') + '" aria-label="color"></button>').join(''); };
  draw(); row.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; prof.color = b.dataset.c; save.color = prof.color; persist(); draw(); Snd.init(); Snd.fx('click'); });
  const need = () => { if (!prof.name) { prof.name = 'Lizeth'; ni.value = prof.name; save.name = prof.name; persist(); } GN.saveProfile(prof.name, prof.color); };
  const then = (fn) => { if (!save.pets.length) { GS.afterStarter = fn; GS.ui = 'starter'; G.UI.starter(); } else fn(); };
  $('bSolo').onclick = () => { Snd.init(); need(); then(startSolo); };
  $('bOnline').onclick = () => { Snd.init(); need(); then(() => { GS.ui = 'online'; setOnlineMsg(''); }); };
  $('bHow').onclick = () => $('scrHow').classList.remove('hidden');
  $('bChaos').onclick = () => { Snd.init(); need(); then(() => { startSolo(); setTimeout(() => GP.Chaos.lobby(), 80); }); };
  $('bHowBack').onclick = () => $('scrHow').classList.add('hidden');
  $('bOnlineBack').onclick = () => { leaveSession(); GS.ui = 'title'; };
  $('bHost').onclick = () => { Snd.init(); need(); hostOnline(); };
  const ci = $('codeIn'); ci.addEventListener('input', () => { ci.value = GN.normalizeCode(ci.value); });
  ci.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('bJoin').click(); });
  $('bJoin').onclick = () => { Snd.init(); need(); joinOnline(ci.value); };
  $('bResume').onclick = () => $('scrMenu').classList.add('hidden');
  $('bMenuChaos').onclick = () => { $('scrMenu').classList.add('hidden'); if (GS.mg) { G.toast('Finish the mini game first!', true); return; } if (GS.care) GP.Care.close(true); GP.Chaos.lobby(); };
  $('bMenuHow').onclick = () => { $('scrMenu').classList.add('hidden'); $('scrHow').classList.remove('hidden'); };
  $('bSkipTut').onclick = () => { save.tut = 6; persist(); $('scrMenu').classList.add('hidden'); G.toast('Tutorial skipped. Have fun!'); };
  $('bQuit').onclick = () => { persist(); leaveSession(); };
  $('arcadeLink').href = GN.hubUrl();
})();
G.chooseStarter = function (fid) {
  const f = GP.familyById(fid); if (!f || save.pets.length) return;
  const p = makePet(f.sp, 0, f.name, f.id); p.n = { h: 55, f: 60, e: 90, c: 75 };
  save.famClaimed[fid] = 1; save.pets.push(p); save.active = [p.id]; save.seen[p.sp] = 1; save.tut = 1;
  if (f.sp === 'rat') save.inv.seeds = 4; if (f.sp === 'tortoise') save.inv.veggie = 4;
  persist(); $('scrStarter').classList.add('hidden');
  const fn = GS.afterStarter || startSolo; GS.afterStarter = null; GS.ui = 'title'; fn();
};

/* ======================================================================
   Frame loop
   ====================================================================== */
function renderScreens() {
  let scr = null;
  if (GS.ui === 'title') scr = 'scrTitle'; else if (GS.ui === 'online') scr = 'scrOnline'; else if (GS.ui === 'starter') scr = 'scrStarter';
  ['scrTitle', 'scrOnline', 'scrStarter'].forEach((id) => $(id).classList.toggle('hidden', id !== scr));
  const ig = inGame();
  $('hud').classList.toggle('hidden', !ig || !!GS.mg || !!GS.chaos || !!GS.care || !!GS.talk || !!GS.npcPd);
  if (!ig && GP.NPC && (GS.talk || GS.npcPd)) GP.NPC.abort();
  if (!ig && GS.panel) closePanel();
  if (scr === 'scrTitle') $('titleFoot').textContent = save.pets.length ? save.pets.length + ' pet' + (save.pets.length > 1 ? 's' : '') + ' \u00b7 ' + save.coins + ' coins \u00b7 solo or with friends' : '18 kinds of pets \u00b7 4 mini games \u00b7 play with friends';
}
function updateMe(dt) {
  const m = GS.me; let ix = 0, iz = 0;
  if (freeToAct()) {
    if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1; if (keys.KeyW || keys.ArrowUp) iz -= 1; if (keys.KeyS || keys.ArrowDown) iz += 1;
    if (joy.id !== null) { ix += joy.x; iz += joy.y; }
  } else GS.goal = null;
  let mag = Math.hypot(ix, iz);
  if (mag > 0.05) GS.goal = null;
  else if (GS.goal) {
    const g = GS.goal; if (g.npc) { g.x = g.npc.x; g.z = g.npc.z; }
    const dx = g.x - m.x, dz = g.z - m.z, d = Math.hypot(dx, dz), stop = g.npc ? g.npc.reach - 0.4 : g.hot ? Math.max(0.6, g.hot.reach - 0.3) : 0.2;
    if (d <= stop) { const h = g.hot, n = g.npc; GS.goal = null; if (n) GP.NPC.talk(n); else if (h) interact(h); }
    else { ix = dx / d; iz = dz / d; mag = 1; if (d < g.best - 0.05) { g.best = d; g.stuck = 0; } else { g.stuck += dt; if (g.stuck > 0.6) GS.goal = null; } }
  }
  if (mag > 1) { ix /= mag; iz /= mag; mag = 1; }
  const sp = (W.cur.id === 'town' ? 6.2 : 4.6) * mag;
  if (mag > 0.05) {
    const r = W.move(W.cur, m.x, m.z, ix * sp * dt, iz * sp * dt, 0.36), moved = Math.hypot(r[0] - m.x, r[1] - m.z);
    m.x = r[0]; m.z = r[1]; m.sp = moved / Math.max(dt, 1e-3); walkTick(moved);
    const ty = Math.atan2(ix, iz); let d = ty - m.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); m.yaw += d * Math.min(1, dt * 12);
  } else m.sp = 0;
}
function ensureAvatar(pid, color, name, isMe) {
  let a = GS.av[pid];
  if (a && a.color !== color) { W.scene.remove(a.ch.g); a = null; }
  if (!a) { const ch = MD.person({ shirt: color, hair: ['#3b2414', '#111827', '#7c2d12'][pid.charCodeAt(0) % 3], long: pid.charCodeAt(1) % 2 }); W.scene.add(ch.g); a = GS.av[pid] = { ch, color, x: 0, z: 0, yaw: 0, init: false, tag: null, name: null }; }
  if (a.name !== name) { if (a.tag) a.ch.g.remove(a.tag); a.tag = W.textSprite(isMe ? name + ' (you)' : name, { size: 36, h: isMe ? 0.34 : 0.42, bg: 'rgba(40,20,70,.85)', border: color }); a.tag.position.set(0, 2.35, 0); a.ch.g.add(a.tag); a.name = name; }
  return a;
}
function teamColors(S) { const out = {}, used = {}; S.players.forEach((p) => { let c = GN.cleanColor(p.pid === GS.pid ? prof.color : p.color); if (used[c]) c = GN.COLORS.find((q) => !used[q]) || c; used[c] = 1; out[p.pid] = c; }); return out; }
G.teamColors = () => teamColors(S_());
function updateAvatars(dt) {
  const S = S_(), TC = teamColors(S), mates = S.players.filter((p) => p.pid !== GS.pid);
  const me = ensureAvatar(GS.pid, TC[GS.pid] || prof.color, myName(), true);
  me.tag.visible = mates.length > 0; me.ch.g.visible = !GS.care;
  me.ch.g.position.set(GS.me.x, 0, GS.me.z); me.ch.g.rotation.y = GS.me.yaw; me.ch.anim(dt, GS.me.sp);
  const live = {}; live[GS.pid] = 1;
  mates.forEach((p) => {
    live[p.pid] = 1; const pos = GS.pos[p.pid], a = ensureAvatar(p.pid, TC[p.pid] || GN.cleanColor(p.color), p.name, false);
    if (!pos || pos.a !== GS.me.area) { a.ch.g.visible = false; a.init = false; return; }
    if (!a.init) { a.x = pos.x; a.z = pos.z; a.yaw = pos.r; a.init = true; }
    const k = 1 - Math.exp(-dt * 12), ox = a.x, oz = a.z;
    a.x += (pos.x - a.x) * k; a.z += (pos.z - a.z) * k; let d = pos.r - a.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); a.yaw += d * k;
    a.ch.g.visible = true; a.ch.g.position.set(a.x, 0, a.z); a.ch.g.rotation.y = a.yaw;
    a.ch.anim(dt, pos.m ? 4 : Math.hypot(a.x - ox, a.z - oz) / Math.max(dt, 1e-3));
  });
  for (const k in GS.av) if (!live[k]) { W.scene.remove(GS.av[k].ch.g); delete GS.av[k]; }
}
function friendNear() { const S = S_(); return S.players.some((p) => { if (p.pid === GS.pid) return false; const q = GS.pos[p.pid]; return q && q.a === GS.me.area && Math.hypot(q.x - GS.me.x, q.z - GS.me.z) < 6; }); }
let promptKey = '', hudT = 0;
function updateHUD(dt) {
  const S = S_();
  GS.coinFlash = Math.max(0, (GS.coinFlash || 0) - dt * 2);
  $('coinN').textContent = save.coins; $('coinPill').style.transform = GS.coinFlash > 0 ? 'scale(' + (1 + GS.coinFlash * 0.15) + ')' : '';
  $('areaN').textContent = W.cur.zone ? W.cur.zone(GS.me.x, GS.me.z) : W.cur.label;
  const online = G.online() && GS.room; $('roomPill').classList.toggle('hidden', !online); if (online) $('roomN').textContent = GS.room.code + ' \u00b7 ' + S.players.length + '/3';
  const h0 = freeToAct() ? nearestHot() : null, nn = freeToAct() ? nearestNpc() : null, act = $('bAct'), pr = $('prompt');
  GS.promptNpc = npcFirst(h0, nn) ? nn.n : null;
  const h = npcFirst(h0, nn) ? { id: 'npc_' + nn.n.def.id, kind: 'npc', label: 'TALK', name: nn.n.def.name, x: nn.n.x, z: nn.n.z, py: 2.95 } : h0;
  const label = h ? h.label : 'CARE';
  if ($('actT').textContent !== label) $('actT').textContent = label;
  act.className = h ? (h.kind === 'door' || h.kind === 'exit' ? 'door' : h.kind === 'npc' ? 'talk' : '') : 'dim';
  $('bCare').classList.toggle('hidden', !h);
  if (h) { const p = W.project(h.x, h.py || 1.9, h.z), k = h.id + label; if (k !== promptKey) { promptKey = k; pr.innerHTML = (h.kind === 'npc' ? '\uD83D\uDCAC ' : '') + '<b>' + label + '</b> ' + esc(h.name); } pr.style.left = Math.round(p.x) + 'px'; pr.style.top = Math.round(p.y) + 'px'; pr.classList.remove('hidden'); }
  else { pr.classList.add('hidden'); promptKey = ''; }
  $('bDecor').classList.toggle('hidden', GS.me.area !== 'home');
  $('bPlaydate').classList.toggle('hidden', !(G.online() && friendNear()));
  hudT -= dt; if (hudT <= 0) {
    hudT = 0.4;
    $('petChips').innerHTML = save.active.map(petById).filter(Boolean).map((p) => '<button class="pchip2" data-a="care" data-v="' + p.id + '"><img src="' + G.portrait(G.petLook(p)) + '" alt=""><span><b>' + esc(p.name) + '</b><i class="mini">' + ['h', 'f', 'e', 'c'].map((k) => '<em class="k' + k + '" style="width:' + Math.round(p.n[k]) + '%"></em>').join('') + '</i></span>' + (G.needIcon(p) ? '<u>' + G.needIcon(p) + '</u>' : '') + '</button>').join('');
    const TC = teamColors(S), mates = S.players.filter((p) => p.pid !== GS.pid);
    $('mates').innerHTML = mates.map((p) => '<div class="mate" style="--c:' + esc(TC[p.pid] || p.color) + '">' + esc(p.name) + ' \u00b7 ' + esc(GS.pos[p.pid] ? areaLabel(GS.pos[p.pid]) : '\u2026') + '</div>').join('');
    G.tutHud();
  }
}
function areaLabel(q) { const A = W.areas[q.a]; if (!A) return q.a === 'arena' ? 'mini game' : q.a; return A.zone ? A.zone(q.x, q.z) : A.label; }
let last = performance.now(), titleT = 0, decayAcc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const S = S_();
  if (S) { processEvents(); mgTick(); if (GS.mg && GS.mg.wait) { GS.waitT = (GS.waitT || 0) - dt; if (GS.waitT <= 0) { GS.waitT = 0.5; renderWait(); } } }
  renderScreens();
  W.tickFx(dt);
  if (inGame()) {
    decayAcc += dt; if (decayAcc >= 1) { save.pets.forEach((p) => decay(p, decayAcc, save.active.indexOf(p.id) >= 0 && !(GS.care && GS.care.sleeping && GS.care.id === p.id))); decayAcc = 0; }
    if (GS.chaos) GP.Chaos.tick(dt);
    else if (GS.mg) { GP.MG.tick(dt); }
    else {
      updateMe(dt); updateAvatars(dt); updateMyPets(dt); updateHomePets(dt); updateRemotePets(dt);
      if (GS.care) GP.Care.tick(dt); else updateHUD(dt);
      W.updateCamera(GS.me.x, GS.me.z, dt);
      checkFamily(dt);
    }
    if (now - saveT > 5000) { persist(now); syncLooks(); }
    if (GS.role !== 'client' && S && S.beach !== !!save.beach) { S.beach = !!save.beach; touch(); }
    refreshGate(); G.decorTick();
  } else {
    titleT += dt;
    if (!W.cur || W.cur.id !== 'town') W.setArea('town');
    W.updateCamera(Math.sin(titleT * 0.12) * 10 + 4, -6 + Math.cos(titleT * 0.09) * 8, dt);
    titleDemo(dt);
  }
  netTick(now);
  W.render();
}
// title backdrop: Candy and friends playing in the plaza
const demo = [];
function titleDemo(dt) {
  if (!demo.length) { [['schnauzer', ['#8e939c', '#eceef1'], { neck: 'pinkcollar' }], ['tortoise', ['#8d6b3c', '#b59a68'], { head: 'flower' }], ['rat', ['#fbfbfb', '#ffe4ec'], {}], ['unicorn', ['#fdf4ff', '#f472b6'], {}], ['tabby', ['#e8923a', '#fff1dc'], { head: 'partyhat' }]].forEach((q, i) => { const P = MD.pet({ sp: q[0], col: q[1], lv: 7, acc: q[2], eye: q[0] === 'rat' ? '#d9466f' : undefined }); W.areas.town.g.add(P.g); demo.push({ P, a: i * 1.25, r: 5 + (i % 2) }); }); }
  demo.forEach((d) => { d.a += dt * 0.35; d.P.g.position.set(Math.cos(d.a) * d.r + 4, 0.05, Math.sin(d.a) * d.r * 0.8 - 2); d.P.g.rotation.y = -d.a; d.P.anim(dt, 3); });
  demo.forEach((d) => { d.P.g.visible = !inGame(); });
}

/* ---------------- boot ---------------- */
G.boot = function () {
  W.init($('c')); W.build(); if (GP.NPC) GP.NPC.init(); W.setArea('town');
  G.portraitInit(); W.fillPens(G.pensLineup());
  addEventListener('resize', () => W.resize());
  addEventListener('pagehide', () => persist());
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
  requestAnimationFrame(frame);
  (function fromHub() {
    const prm = GN.params(); if (!prm) return;
    GS.fromHub = true; prof.name = prm.name; prof.color = prm.color; $('nameIn').value = prm.name;
    const go = () => { if (prm.mode === 'host') hostOnline(prm.code); else { $('codeIn').value = prm.code; joinOnline(prm.code); } };
    if (!save.pets.length) { GS.afterStarter = go; GS.ui = 'starter'; G.UI.starter(); } else go();
  })();
};
G.startSolo = startSolo; G.hostOnline = hostOnline; G.joinOnline = joinOnline; G.leaveSession = leaveSession;
G.freeToAct = freeToAct; G.nearestHot = nearestHot; G.pressAct = pressAct; G.myName = myName; G.prof = prof;
G.renderWait = renderWait; G.showMgResult = showMgResult;

/* test hooks */
window.__gp = {
  G, GS, W, GP, save: () => save, state: () => GS.S,
  tp(x, z) { GS.me.x = x; GS.me.z = z; GS.goal = null; },
  go(area, at) { closePanel(); travel(area, true, at); },
  hot(id) { const h = W.cur.hots.find((q) => q.id === id); if (!h) return 'nohot'; const f = W.freeNear(W.cur, h.x, h.z, 0.36); GS.me.x = f[0]; GS.me.z = f[1]; if (Math.hypot(h.x - f[0], h.z - f[1]) > h.reach) return 'far'; interact(h); return GS.panel || 'none'; },
  panel: () => GS.panel, care: () => GS.care, mg: () => GS.mg, talk: () => GS.talk, npcPd: () => GS.npcPd,
  netDebug: () => ({ role: GS.role, code: GS.room && GS.room.code, players: GS.S ? GS.S.players.map((p) => p.name) : [], pos: GS.pos, area: GS.me.area, looks: GS.S ? GS.S.looks : {} })
};
})();
