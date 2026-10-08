/* Grok Pets - up-close care mode (Nintendogs style): rub, feed, fetch, wash, brush, tricks by gesture, sleep, call, dress */
(function () {
'use strict';
const GP = window.GP, G = GP.G, W = GP.W, MD = GP.MD, Snd = GP.Snd, T = window.THREE;
const $ = (id) => document.getElementById(id);
const esc = window.GrokNet.esc, clamp = GP.clamp;
const C = GP.Care = {};
const GS = G.GS;
const pet = () => GS.care && G.petById(GS.care.id);
const o3 = () => GS.care && G.pet3d(GS.care.id);
const voice = (p) => Snd.fx(GP.SPECIES[p.sp].snd);

function obstacleAt(A, x, z, r) { for (const o of A.obs) { if (o.off) continue; if (o.t === 'b') { if (x > o.x0 - r && x < o.x1 + r && z > o.z0 - r && z < o.z1 + r) return true; } else if (Math.hypot(x - o.x, z - o.z) < o.r + r) return true; } return false; }

C.open = function (id) {
  const s = G.save(); const p = G.petById(id); if (!p) return;
  if (s.active.indexOf(id) < 0) { if (s.active.length >= 3) s.active.pop(); s.active.unshift(id); G.persist(); G.syncLooks(); }
  G.closePanel(); GS.goal = null; GS.joyReset && GS.joyReset();
  GS.care = { id, ready: false, mode: 'hand', t: 0, rubAcc: 0, rubCoins: 0, hearts: 0, fetch: null, sleeping: false, eating: 0, callCd: 0, trickCd: 0, lastTap: 0, cool: {} };
  $('care').classList.remove('hidden'); C.setMode('hand'); renderBtns(); Snd.fx('click');
};
function setup() {
  const c = GS.care, o = o3(); if (!o) return false;
  const A = W.cur, m = GS.me, s = Math.max(0.5, o.P.hTop);
  let sx = m.x + Math.sin(m.yaw) * 1.3, sz = m.z + Math.cos(m.yaw) * 1.3; const f = W.freeNear(A, sx, sz, 0.35); sx = f[0]; sz = f[1];
  const dist = 1.7 + s * 1.5;
  let dir = [0, 1];
  if (!A.w) { const cands = [[0, 1], [1, 0], [-1, 0], [0.7, 0.7], [-0.7, 0.7], [0, -1]]; for (const d of cands) { let ok = true; for (let k = 0.5; k <= 1.01; k += 0.25) if (obstacleAt(A, sx + d[0] * dist * k, sz + d[1] * dist * k, 0.4)) ok = false; if (ok) { dir = d; break; } } }
  c.x = sx; c.z = sz; c.dir = dir; c.s = s; c.dist = dist;
  o.x = sx; o.z = sz; o.yaw = Math.atan2(dir[0], dir[1]); o.P.act = null;
  // player stands behind the camera, out of view
  m.x = sx + dir[0] * 1.0; m.z = sz + dir[1] * 1.0; m.yaw = Math.atan2(-dir[0], -dir[1]);
  W.camOverride = { pos: new T.Vector3(sx + dir[0] * dist, 0.55 + s * 1.05, sz + dir[1] * dist), look: new T.Vector3(sx, s * 0.45, sz) };
  c.ready = true; return true;
}
C.close = function (silent) {
  const c = GS.care; if (!c) return;
  if (c.bowl) W.scene.remove(c.bowl); if (c.fetch && c.fetch.toy) W.scene.remove(c.fetch.toy);
  const o = o3(); if (o) { o.P.act = null; if (o.held) { o.P.att.face.remove(o.held); o.held = null; } }
  GS.care = null; W.camOverride = null; $('care').classList.add('hidden'); $('careCursor').classList.add('hidden');
  G.closePanel(); G.persist(); G.syncLooks();
  if (!silent && G.save().tut === 5) G.toast('Walk to a door to explore! \uD83D\uDEAA');
};
C.setMode = function (mode) {
  const c = GS.care; if (!c) return; c.mode = mode; c.modeAcc = 0;
  const cur = $('careCursor'); cur.textContent = mode === 'sponge' ? '\uD83E\uDDFD' : mode === 'brush' ? '\uD83E\uDEAE' : ''; cur.classList.add('hidden');
  $('careTool').classList.toggle('hidden', mode === 'hand');
  $('careToolT').textContent = mode === 'sponge' ? 'Scrub ' + pet().name + ' with the sponge!' : mode === 'brush' ? 'Brush ' + pet().name + '\u2019s fur!' : mode === 'toy' ? 'Swipe UP or tap a spot to throw the ' + GP.ITEMS[c.toyId].name + '!' : '';
  renderBtns();
};
function renderBtns() {
  const c = GS.care, p = pet(); if (!c || !p) return;
  const B = [['feed', '\uD83C\uDF56', 'FEED'], ['play', '\uD83C\uDFBE', 'PLAY'], ['wash', '\uD83D\uDEC1', 'WASH'], ['brush', '\uD83E\uDEAE', 'BRUSH'], ['tricks', '\u2728', 'TRICKS'], ['sleep', c.sleeping ? '\u2600\uFE0F' : '\uD83D\uDCA4', c.sleeping ? 'WAKE' : 'SLEEP'], ['call', '\uD83D\uDCE3', 'CALL'], ['dress', '\uD83C\uDF80', 'DRESS']];
  $('careBtns').innerHTML = B.map((b) => '<button class="cbtn' + ((c.mode === 'sponge' && b[0] === 'wash') || (c.mode === 'brush' && b[0] === 'brush') || (c.mode === 'toy' && b[0] === 'play') ? ' on' : '') + '" data-c="' + b[0] + '"><i>' + b[1] + '</i><span>' + b[2] + '</span></button>').join('');
}
function meters(p) {
  const L = [['h', '\uD83C\uDF56', 'Food'], ['f', '\uD83D\uDC96', 'Happy'], ['e', '\u26A1', 'Energy'], ['c', '\uD83D\uDEC1', 'Clean']];
  return L.map((q) => '<div class="meter k' + q[0] + '"><i>' + q[1] + '</i><b><em style="width:' + Math.round(p.n[q[0]]) + '%"></em></b><span>' + Math.round(p.n[q[0]]) + '</span></div>').join('');
}
let hudT = 0;
function hud(dt) {
  hudT -= dt; if (hudT > 0) return; hudT = 0.2;
  const p = pet(); if (!p) return; const s = GP.SPECIES[p.sp], ml = G.moodLabel(G.mood(p)), need = GP.levelXP(p.lv);
  $('careName').innerHTML = esc(p.name) + ' <small>\u270F\uFE0F</small>';
  $('careSub').innerHTML = esc(s.name) + ' \u00b7 ' + GP.stage(p.lv) + ' \u00b7 Lv ' + p.lv + ' <span class="xpb"><em style="width:' + (p.lv >= GP.MAX_LV ? 100 : Math.round(p.xp / need * 100)) + '%"></em></span> \u00b7 ' + ml[1] + ' ' + ml[0];
  $('careMeters').innerHTML = meters(p);
  G.tutHud();
}
C.tick = function (dt) {
  const c = GS.care; if (!c) return;
  if (!c.ready && !setup()) return;
  const p = pet(), o = o3(); if (!p || !o) { C.close(true); return; }
  c.t += dt; c.callCd -= dt; c.trickCd -= dt;
  if (W.camOverride) W.updateCamera(0, 0, dt);
  o.P.mood = clamp(G.mood(p) / 100, 0, 1);
  if (c.sleeping) {
    if (o.P.act !== 'sleep') o.P.play('sleep', 3);
    G.bump(p, 'e', dt * 5); if (Math.random() < dt * 1.6) W.fx('zzz', o.x, o.P.hTop * 0.7, o.z, 1, 0.1);
    if (p.n.e >= 100) { c.sleeping = false; o.P.act = null; o.P.play('happy', 1.2); G.toast('\u2600\uFE0F ' + p.name + ' woke up full of energy!'); G.addXP(p, 4); renderBtns(); }
  }
  if (c.eating > 0) { c.eating -= dt; if (Math.random() < dt * 4) Snd.fx('eat'); if (c.eating <= 0) finishEat(); }
  if (c.fetch) fetchTick(dt, o, p);
  else if (!c.sleeping) { // stay on the care spot, facing the camera
    const dx = c.x - o.x, dz = c.z - o.z, d = Math.hypot(dx, dz);
    if (d > 0.05) { const sp = Math.min(4, d * 4); o.x += dx / d * sp * dt; o.z += dz / d * sp * dt; o.sp = sp; } else o.sp = 0;
    const ty = Math.atan2(c.dir[0], c.dir[1]); let a = ty - o.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); o.yaw += a * Math.min(1, dt * 8);
  }
  if (c.rubbing && !o.P.act && c.mode === 'hand') o.P.play('lean', 0.6);
  if (c.mode === 'sponge' && c.rubbing && o.P.act !== 'bath') o.P.play('bath', 0.8);
  o.P.g.position.set(o.x, 0, o.z); o.P.g.rotation.y = o.yaw; o.P.anim(dt, c.fetch ? o.sp : (o.sp || 0));
  hud(dt);
};

/* ---------------- feeding ---------------- */
function feed(foodId) {
  const c = GS.care, p = pet(), o = o3(), s = G.save(); if (!c || !p || !s.inv[foodId]) return;
  if (p.n.h >= 97) { o.P.play('nope', 0.8); G.toast(p.name + ' is full! Try again later.'); return; }
  wake(); s.inv[foodId]--; if (!s.inv[foodId]) delete s.inv[foodId];
  const it = GP.ITEMS[foodId];
  const bowl = new T.Group(); MD.cyl(0.2, 0.08, '#60a5fa', bowl, 0, 0.04, 0); MD.cyl(0.16, 0.03, it.col || '#b45309', bowl, 0, 0.09, 0); for (let i = 0; i < 5; i++) MD.sph(0.035, it.col || '#b45309', bowl, Math.cos(i) * 0.08, 0.11, Math.sin(i) * 0.08);
  const sc = clamp(c.s, 0.6, 1.2); bowl.scale.setScalar(sc);
  bowl.position.set(c.x + c.dir[0] * 0.45 * sc, 0, c.z + c.dir[1] * 0.45 * sc); W.scene.add(bowl); c.bowl = bowl; c.food = foodId;
  c.eating = 2.4; o.P.play('eat', 2.4);
};
function finishEat() {
  const c = GS.care, p = pet(), o = o3(); if (!c || !p) return;
  const it = GP.ITEMS[c.food], fav = it.fav && it.fav.indexOf(GP.SPECIES[p.sp].kind) >= 0;
  G.bump(p, 'h', it.h * (fav ? 1.2 : 1)); G.bump(p, 'f', it.f + (fav ? 8 : 0)); G.addXP(p, 5 + (fav ? 3 : 0)); G.addCoins(2);
  if (c.bowl) { W.scene.remove(c.bowl); c.bowl = null; }
  o.P.play('happy', 1); voice(p); W.fx('heart', o.x, o.P.hTop, o.z, fav ? 6 : 3, 0.5);
  G.toast(fav ? '\uD83D\uDE0B Yum! ' + it.name + ' is ' + p.name + '\u2019s favorite!' : p.name + ' ate the ' + it.name + '!');
  if (G.save().tut === 2) G.tutNext();
  G.persist();
}
/* ---------------- fetch ---------------- */
function throwToy(sx, sy) {
  const c = GS.care, p = pet(), o = o3(); if (!c || !p || c.fetch || c.eating > 0) return;
  wake();
  if (p.n.e < 10) { o.P.play('nope', 0.8); G.toast(p.name + ' is too tired to play. Let her SLEEP first!'); return; }
  const A = W.cur; let tgt = W.rayPlane(sx, sy, 0), dx, dz;
  const back = [-c.dir[0], -c.dir[1]];
  if (!tgt || (tgt.x - c.x) * back[0] + (tgt.z - c.z) * back[1] < 1) { tgt = { x: c.x + back[0] * 3.5, z: c.z + back[1] * 3.5 }; }
  dx = tgt.x - c.x; dz = tgt.z - c.z; let d = Math.hypot(dx, dz); const maxD = 5.5; if (d > maxD) { dx *= maxD / d; dz *= maxD / d; d = maxD; }
  let tx = c.x + dx, tz = c.z + dz;
  for (let k = 1; k > 0.2 && !W.isFree(A, tx, tz, 0.3); k -= 0.1) { tx = c.x + dx * k; tz = c.z + dz * k; }
  if (!W.isFree(A, tx, tz, 0.3)) { const f = W.freeNear(A, tx, tz, 0.3); tx = f[0]; tz = f[1]; }
  const toy = MD.item(c.toyId); toy.scale.setScalar(1.2); W.scene.add(toy);
  const from = new T.Vector3(c.x + c.dir[0] * (c.dist * 0.7), 1.0, c.z + c.dir[1] * (c.dist * 0.7));
  c.fetch = { toy, ph: 'fly', t: 0, from, to: new T.Vector3(tx, 0, tz), dur: 0.5 + Math.hypot(tx - from.x, tz - from.z) * 0.08 };
  Snd.fx('throw');
}
function fetchTick(dt, o, p) {
  const c = GS.care, f = c.fetch; f.t += dt;
  if (f.ph === 'fly') {
    const k = Math.min(1, f.t / f.dur); f.toy.position.set(f.from.x + (f.to.x - f.from.x) * k, f.from.y * (1 - k) + Math.sin(k * Math.PI) * 1.6, f.from.z + (f.to.z - f.from.z) * k); f.toy.rotation.x += dt * 10;
    if (k > 0.25) runTo(o, f.to.x, f.to.z, dt, 5.5);
    if (k >= 1) { f.ph = 'run'; f.toy.position.y = 0; }
  } else if (f.ph === 'run') {
    if (runTo(o, f.to.x, f.to.z, dt, 5.5) < 0.45 || f.t > 6) { f.ph = 'back'; W.scene.remove(f.toy); const held = MD.item(c.toyId); held.scale.setScalar(0.7 / Math.max(0.4, o.P.scale)); held.position.set(0, -0.15, 0.05); o.P.att.face.add(held); o.held = held; Snd.fx('catch'); o.P.play('catch', 0.4); }
  } else if (f.ph === 'back') {
    if (runTo(o, c.x, c.z, dt, 5) < 0.12) {
      if (o.held) { o.P.att.face.remove(o.held); o.held = null; }
      c.fetch = null; o.sp = 0; o.P.play('happy', 1.1); voice(p);
      const it = GP.ITEMS[c.toyId], fav = it.fav && it.fav.indexOf(GP.SPECIES[p.sp].kind) >= 0;
      G.bump(p, 'f', it.f + (fav ? 4 : 0)); G.bump(p, 'e', -3); G.bump(p, 'c', -1); G.addXP(p, 8); G.addCoins(3);
      W.fx('heart', o.x, o.P.hTop, o.z, 4, 0.5);
      if (G.save().tut === 3) G.tutNext();
    }
  }
}
function runTo(o, x, z, dt, sp) {
  const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz);
  if (d > 0.05) { const s = Math.min(sp, d * 5); o.x += dx / d * s * dt; o.z += dz / d * s * dt; o.sp = s; const ty = Math.atan2(dx, dz); let a = ty - o.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); o.yaw += a * Math.min(1, dt * 12); }
  return d;
}
/* ---------------- tricks ---------------- */
function wake() { const c = GS.care; if (c && c.sleeping) { c.sleeping = false; const o = o3(); if (o) o.P.act = null; renderBtns(); } }
C.trick = function (tid) {
  const c = GS.care, p = pet(), o = o3(); if (!c || !p || c.fetch || c.eating > 0) return;
  if (c.trickCd > 0) return; c.trickCd = 0.9;
  wake();
  const t = GP.TRICKS.find((q) => q.id === tid); if (!t) return;
  const prog = p.tricks[tid] || 0, known = prog >= GP.TRICK_NEED;
  if (!known && p.lv < t.lv) { o.P.play('nope', 0.9); G.toast(p.name + ' needs level ' + t.lv + ' to learn ' + t.name + '. Keep caring and playing!'); Snd.fx('no'); return; }
  if (known) {
    o.P.play(tid, tid === 'spin' || tid === 'roll' ? 1.0 : 1.2); Snd.fx('trick'); W.fx('sparkle', o.x, o.P.hTop * 0.8, o.z, 4, 0.5);
    G.bump(p, 'f', 3); G.addXP(p, 3); if ((c.cool[tid] || 0) < 3) { c.cool[tid] = (c.cool[tid] || 0) + 1; G.addCoins(1); }
    G.toast('\u2728 ' + p.name + ': ' + t.name + '!');
    if (G.save().tut === 4) G.tutNext();
    return;
  }
  if (p.n.f < 30) { o.P.play('nope', 0.9); G.toast(p.name + ' is too grumpy to learn. Pet her or play first!'); return; }
  if (p.n.e < 12) { o.P.play('nope', 0.9); G.toast(p.name + ' is too sleepy to learn. Let her SLEEP!'); return; }
  const ok = Math.random() < 0.72 + G.mood(p) / 500;
  if (!ok) { const wrong = ['sniff', 'nope', 'happy'][Math.floor(Math.random() * 3)]; o.P.play(wrong, 0.9); G.toast(p.name + ' tilts her head\u2026 try again!'); G.bump(p, 'e', -1); return; }
  p.tricks[tid] = prog + 1; G.bump(p, 'e', -2); G.addXP(p, 10);
  o.P.play(tid, 1.1); voice(p); W.fx('sparkle', o.x, o.P.hTop * 0.8, o.z, 5, 0.5);
  if (p.tricks[tid] >= GP.TRICK_NEED) {
    const s = G.save(); s.stats.learned++; G.addCoins(30); G.addXP(p, 20); Snd.fx('learn'); W.fx('star', o.x, o.P.hTop, o.z, 10, 0.8);
    G.toast('\uD83C\uDF89 ' + p.name + ' learned ' + t.name + '! +30 coins');
  } else { Snd.fx('trick'); G.toast('\uD83D\uDCDA ' + t.name + ' lesson ' + p.tricks[tid] + '/' + GP.TRICK_NEED + ' \u2014 good job!'); }
  if (G.save().tut === 4) G.tutNext();
  G.persist();
};
/* ---------------- touch: rub / scrub / gestures / throw ---------------- */
(function touchLayer() {
  const el = $('careTouch'), cur = $('careCursor'); let pt = null;
  el.addEventListener('pointerdown', (e) => {
    const c = GS.care; if (!c || !c.ready || GS.panel) return; Snd.init(); e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    const o = o3(); const hit = o && !c.fetch ? W.hitObj(e.clientX, e.clientY, o.P.g) : null;
    pt = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), path: [[e.clientX, e.clientY]], len: 0, onPet: !!hit, acc: 0 };
    if (c.mode !== 'toy') c.rubbing = !!hit;
    if (c.mode === 'sponge' || c.mode === 'brush') { cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px'; cur.classList.remove('hidden'); }
  });
  el.addEventListener('pointermove', (e) => {
    const c = GS.care; if (!pt || e.pointerId !== pt.id || !c) return;
    const dx = e.clientX - pt.x, dy = e.clientY - pt.y, d = Math.hypot(dx, dy); pt.len += d; pt.x = e.clientX; pt.y = e.clientY; pt.path.push([pt.x, pt.y]);
    if (c.mode === 'sponge' || c.mode === 'brush') { cur.style.left = pt.x + 'px'; cur.style.top = pt.y + 'px'; }
    if (c.mode === 'toy' || c.fetch) return;
    const o = o3(); const hit = o ? W.hitObj(pt.x, pt.y, o.P.g) : null;
    if (pt.onPet || hit) { c.rubbing = !!hit; if (hit) { pt.acc += d; if (pt.acc > 34) { pt.acc = 0; stroke(hit.point); } } }
  });
  const up = (e) => {
    const c = GS.care; if (!pt || e.pointerId !== pt.id) return; const P = pt; pt = null; if (!c) return;
    c.rubbing = false; cur.classList.add('hidden');
    const dt = performance.now() - P.t0, dx = P.x - P.x0, dy = P.y - P.y0;
    if (c.mode === 'toy') { if (dy < -40 || P.len < 18) throwToy(P.len < 18 ? P.x : P.x0 + dx * 2.2, P.len < 18 ? P.y : P.y0 + dy * 2.2); return; }
    if (c.mode !== 'hand') return;
    if (P.onPet && P.len < 18 && dt < 400) { boop(); return; }
    if (P.onPet) return;
    if (P.len < 18 && dt < 350) { const now = performance.now(); if (now - c.lastTap < 420 && Math.hypot(P.x - c.lastX, P.y - c.lastY) < 70) { c.lastTap = 0; C.trick('wave'); } else { c.lastTap = now; c.lastX = P.x; c.lastY = P.y; } return; }
    const g = gesture(P.path, P.len, dx, dy); if (g) C.trick(g);
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
})();
function gesture(path, len, dx, dy) {
  let turn = 0;
  for (let i = 2; i < path.length; i++) { const a1 = Math.atan2(path[i - 1][1] - path[i - 2][1], path[i - 1][0] - path[i - 2][0]), a2 = Math.atan2(path[i][1] - path[i - 1][1], path[i][0] - path[i - 1][0]); let d = a2 - a1; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]) > 2) turn += d; }
  if (Math.abs(turn) > 4.4 && len > 140) return 'spin';
  if (len < 50) return null;
  if (Math.abs(dy) > Math.abs(dx) * 1.3 && Math.abs(dy) > 45) return dy > 0 ? 'sit' : 'jump';
  if (Math.abs(dx) > Math.abs(dy) * 1.3 && Math.abs(dx) > 55) return 'roll';
  return null;
}
C.gesture = gesture;
function boop() {
  const c = GS.care, p = pet(), o = o3(); if (!p || !o) return;
  wake(); o.P.play('happy', 0.9); voice(p); W.fx('heart', o.x, o.P.hTop, o.z, 2, 0.4); G.bump(p, 'f', 1);
}
function stroke(pt) {
  const c = GS.care, p = pet(), o = o3(); if (!p || !o) return;
  const x = pt.x, y = pt.y, z = pt.z;
  if (c.mode === 'hand') {
    wake(); c.hearts++; W.fx('heart', x, y + 0.1, z, 1, 0.15); Snd.fx('rub'); G.bump(p, 'f', 0.9);
    if (c.hearts % 5 === 0) G.addXP(p, 1);
    if (c.hearts % 12 === 0 && c.rubCoins < 8) { c.rubCoins++; G.addCoins(1); }
    if (G.save().tut === 1 && c.hearts >= 12) G.tutNext();
  } else if (c.mode === 'sponge') {
    W.fx('bubble', x, y, z, 2, 0.2); Snd.fx('scrub'); G.bump(p, 'c', 1.6); G.bump(p, 'f', 0.2);
    if (p.n.c >= 100) { C.setMode('hand'); o.P.play('shake', 1.2); W.fx('drop', o.x, o.P.hTop, o.z, 10, 0.8); Snd.fx('splash'); G.addXP(p, 6); if (!c.washed) { c.washed = 1; G.addCoins(3); } G.toast('\u2728 ' + p.name + ' is squeaky clean!'); }
  } else if (c.mode === 'brush') {
    W.fx('sparkle', x, y, z, 1, 0.2); Snd.fx('rub'); G.bump(p, 'c', 0.8); G.bump(p, 'f', 0.5); c.modeAcc++;
    if (p.n.c >= 100 || c.modeAcc > 45) { C.setMode('hand'); o.P.play('happy', 1); W.fx('sparkle', o.x, o.P.hTop, o.z, 8, 0.6); G.addXP(p, 5); if (!c.brushed) { c.brushed = 1; G.addCoins(2); } G.toast('\uD83D\uDC96 ' + p.name + '\u2019s fur is so fluffy!'); }
  }
}
C.stroke = stroke; C.feed = feed; C.throwToy = throwToy;

/* ---------------- buttons ---------------- */
$('careBtns').addEventListener('click', (e) => {
  const b = e.target.closest('[data-c]'); if (!b || !GS.care) return; Snd.init(); Snd.fx('click');
  const c = GS.care, p = pet(), s = G.save(), a = b.dataset.c;
  if (c.fetch || c.eating > 0) { G.toast('Wait a moment\u2026'); return; }
  switch (a) {
    case 'feed': { const foods = GP.itemsOf('food').filter((k) => s.inv[k]); if (!foods.length) { G.toast('No food left! Buy some at the Pet Shop.', true); return; } C.setMode('hand'); G.openPanel('food', G.head('\uD83C\uDF56 Feed ' + esc(p.name)) + '<div class="igrid">' + foods.map((k) => { const it = GP.ITEMS[k], fav = it.fav && it.fav.indexOf(GP.SPECIES[p.sp].kind) >= 0; return '<button class="ibtn" data-a="feed" data-v="' + k + '"><i>' + it.icon + '</i><b>' + esc(it.name) + '</b><small>x' + s.inv[k] + (fav ? ' \u00b7 \u2764\uFE0F fave' : '') + '</small></button>'; }).join('') + '</div>'); break; }
    case 'play': { if (c.mode === 'toy') { C.setMode('hand'); return; } const toys = GP.itemsOf('toy').filter((k) => s.inv[k]); if (!toys.length) { G.toast('No toys! Buy one at the Pet Shop.', true); return; } if (toys.length === 1) { c.toyId = toys[0]; C.setMode('toy'); return; } G.openPanel('toy', G.head('\uD83C\uDFBE Pick a toy') + '<div class="igrid">' + toys.map((k) => '<button class="ibtn" data-a="toy" data-v="' + k + '"><i>' + GP.ITEMS[k].icon + '</i><b>' + esc(GP.ITEMS[k].name) + '</b></button>').join('') + '</div>'); break; }
    case 'wash': C.setMode(c.mode === 'sponge' ? 'hand' : 'sponge'); if (c.mode === 'sponge') { wake(); Snd.fx('splash'); } break;
    case 'brush': C.setMode(c.mode === 'brush' ? 'hand' : 'brush'); wake(); break;
    case 'tricks': C.setMode('hand'); G.UI.tricks(p); break;
    case 'sleep': if (c.sleeping) { wake(); o3().P.play('happy', 0.8); } else if (p.n.e >= 95) { G.toast(p.name + ' isn\u2019t sleepy!'); o3().P.play('nope', 0.8); } else { C.setMode('hand'); c.sleeping = true; Snd.fx('zzz'); renderBtns(); } break;
    case 'call': { if (c.callCd > 0) return; c.callCd = 2.5; wake(); const o = o3(); o.P.play('happy', 1); voice(p); W.fx('heart', o.x, o.P.hTop, o.z, 2, 0.3); G.bump(p, 'f', 2); G.addXP(p, 1); G.toast('\uD83D\uDCE3 "' + p.name + '!"'); break; }
    case 'dress': C.setMode('hand'); G.UI.wardrobe(p); break;
  }
});
$('bCareX').addEventListener('click', () => { Snd.fx('click'); C.close(); });
$('careName').addEventListener('click', () => { const p = pet(); if (p) G.UI.petInfo(p); });
$('careToolDone').addEventListener('click', () => { C.setMode('hand'); });
C.key = function (code, e) {
  if (GS.panel) { if (code === 'Escape') G.closePanel(); return; }
  const map = { Escape: 'x', KeyX: 'x', ArrowDown: 'sit', ArrowUp: 'jump', KeyR: 'spin', ArrowLeft: 'roll', ArrowRight: 'roll', KeyQ: 'wave' };
  if (code === 'Escape' || code === 'KeyX') { C.close(); return; }
  if (e.repeat) return;
  if (map[code] && GS.care.mode === 'hand') { C.trick(map[code]); return; }
  if (code === 'Space' && GS.care.mode === 'toy') { throwToy(innerWidth / 2, innerHeight * 0.3); return; }
  if (code === 'Space' && GS.care.mode === 'hand') { boop(); }
};
})();
