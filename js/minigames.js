/* Grok Pets - 4 mini games in 3D: Frisbee Catch, Pet Race, Pet Show, Treasure Dig. Same seed online = same layout for everyone. */
(function () {
'use strict';
const GP = window.GP, G = GP.G, W = GP.W, MD = GP.MD, Snd = GP.Snd, T = window.THREE;
const $ = (id) => document.getElementById(id);
const esc = window.GrokNet.esc, clamp = GP.clamp, TAU = Math.PI * 2;
const MG = GP.MG = {};
let R = null; // running game
MG.active = () => !!R;

function arena() { const A = W.areas.arena; while (A.g.children.length) A.g.remove(A.g.children[0]); A.ground = []; return A; }
function plane(A, w, d, col, x, z, y) { const m = new T.Mesh(MD.G.plane, MD.M(col)); m.rotation.x = -Math.PI / 2; m.scale.set(w, d, 1); m.position.set(x || 0, y || 0, z || 0); A.g.add(m); A.ground.push(m); return m; }
function setCam(px, py, pz, lx, ly, lz, dt) { const k = dt == null ? 1 : 1 - Math.exp(-dt * 6); W.camPos.lerp(new T.Vector3(px, py, pz), k); W.camLook.lerp(new T.Vector3(lx, ly, lz), k); W.camera.position.copy(W.camPos); W.camera.lookAt(W.camLook); }
function btns(list) { $('mgBtns').innerHTML = list.map((b) => '<button class="mgb ' + (b[2] || '') + '" data-m="' + b[0] + '">' + b[1] + '</button>').join(''); }
function msg(t, dur) { const el = $('mgMsg'); el.innerHTML = t; el.classList.remove('hidden'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); clearTimeout(msg.t); if (dur) msg.t = setTimeout(() => el.classList.add('hidden'), dur * 1000); }
function sub(t) { $('mgSub').innerHTML = t || ''; $('mgSub').classList.toggle('hidden', !t); }

MG.start = function (id, o) {
  MG.stop(true);
  const A = arena(); W.setArea('arena');
  const rnd = GP.rng(o.seed), pet = MD.pet(o.look); A.g.add(pet.g);
  R = { id, o, A, rnd, pet, t: 0, phase: 'count', cd: 3.4, score: 0, prog: 0, done: false, input: { x: 0, z: 0 }, joy: null, tap: null, g: null };
  const gm = GP.gameById(id); $('mgTitle').textContent = gm.icon + ' ' + gm.name; $('mgHud').classList.remove('hidden'); $('mgMsg').classList.add('hidden'); sub('');
  R.g = GAMES[id](R);
  W.camPos.copy(W.camera.position); R.g.cam(0, true);
  msg('3', 0); Snd.fx('tick');
  board();
};
MG.stop = function (silent) { if (!R) return; R = null; $('mgHud').classList.add('hidden'); $('mgBtns').innerHTML = ''; sub(''); $('mgMsg').classList.add('hidden'); const A = W.areas.arena; while (A.g.children.length) A.g.remove(A.g.children[0]); void silent; };
MG.abort = function () { MG.stop(true); };
function finish(extra) { if (!R || R.done) return; R.done = true; R.phase = 'end'; R.endT = 1.4; R.extra = extra || {}; report(true); msg(extra && extra.big ? extra.big : 'FINISH!', 0); Snd.fx('cheer'); }
function report(done) { if (R && R.o.onScore) R.o.onScore(Math.round(R.score), R.prog, done); }
let boardT = 0;
function board() {
  if (!R) return; const others = R.o.others ? R.o.others() : [];
  $('mgScore').textContent = R.g.scoreText ? R.g.scoreText() : String(Math.round(R.score));
  $('mgTime').textContent = R.g.timeText ? R.g.timeText() : '';
  $('mgBoard').innerHTML = others.map((q) => '<div class="ob" style="--c:' + esc(q.color) + '"><b>' + esc(q.name) + '</b> ' + q.score + (q.done ? ' \u2714' : q.left ? ' (left)' : '') + '<i style="width:' + Math.round(q.prog * 100) + '%"></i></div>').join('');
}
MG.tick = function (dt) {
  if (!R) return; R.t += dt;
  if (R.phase === 'count') {
    const before = Math.ceil(R.cd); R.cd -= dt; const now = Math.ceil(R.cd);
    if (now !== before) { if (now > 0) { msg(String(now), 0); Snd.fx('tick'); } else { msg('GO!', 0.7); Snd.fx('go'); R.phase = 'play'; } }
  } else if (R.phase === 'play') R.g.update(dt);
  else if (R.phase === 'end') { R.endT -= dt; if (R.endT <= 0 && !R.reported) { R.reported = true; const ex = R.extra; G.mgFinished(R.id, Math.round(R.score), ex); } }
  R.g.anim(dt); R.g.cam(dt);
  boardT -= dt; if (boardT <= 0) { boardT = 0.25; board(); if (R.phase === 'play') report(false); }
};
MG.key = function (code, down, e) {
  if (!R) return; if (code === 'Escape' && down) { quit(); return; }
  if (R.g.key) R.g.key(code, down, e);
};
function quit() { if (!R) return; if (R.phase === 'end') return; if (confirm('Leave this mini game? You keep the coins you earned so far.')) { R.phase = 'end'; R.endT = 0.01; R.extra = R.g.result ? R.g.result(true) : {}; R.done = true; report(true); } }
$('mgQuit').addEventListener('click', () => { Snd.fx('click'); quit(); });
$('mgBtns').addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-m]'); if (!b || !R) return; e.preventDefault(); Snd.init(); if (R.g.btn && R.phase === 'play') R.g.btn(b.dataset.m); });
(function touch() {
  const el = $('mgTouch'); let p = null;
  el.addEventListener('pointerdown', (e) => { if (!R) return; Snd.init(); e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } p = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), fired: false }; R.joy = { x: 0, y: 0, on: false }; });
  el.addEventListener('pointermove', (e) => {
    if (!p || e.pointerId !== p.id || !R) return; p.x = e.clientX; p.y = e.clientY; const dx = p.x - p.x0, dy = p.y - p.y0, d = Math.hypot(dx, dy);
    if (d > 14) { R.joy.on = true; R.joy.x = clamp(dx / 60, -1, 1); R.joy.y = clamp(dy / 60, -1, 1); }
    if (!p.fired && d > 40 && R.g.swipe && R.phase === 'play') { p.fired = R.g.swipe(dx, dy); if (p.fired) { p.x0 = p.x; p.y0 = p.y; p.fired = false; p.cool = true; } }
  });
  const up = (e) => { if (!p || e.pointerId !== p.id || !R) return; const P = p; p = null; R.joy = null; if (Math.hypot(P.x - P.x0, P.y - P.y0) < 14 && performance.now() - P.t0 < 450 && !P.cool && R.g.tap && R.phase === 'play') R.g.tap(P.x, P.y); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
})();
function moveInput() { const k = G.keys; let x = 0, z = 0; if (k.KeyA || k.ArrowLeft) x -= 1; if (k.KeyD || k.ArrowRight) x += 1; if (k.KeyW || k.ArrowUp) z -= 1; if (k.KeyS || k.ArrowDown) z += 1; if (R.joy && R.joy.on) { x += R.joy.x; z += R.joy.y; } const m = Math.hypot(x, z); if (m > 1) { x /= m; z /= m; } return { x, z, m: Math.min(1, m) }; }
function turnTo(o, ty, dt, k) { let a = ty - o.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); o.rotation.y += a * Math.min(1, dt * (k || 10)); }

const GAMES = {};
/* ============================ FRISBEE CATCH ============================ */
GAMES.frisbee = function (R) {
  const A = R.A, rnd = R.rnd, s = G.save(), P = R.pet, hasF = !!s.inv.frisbee;
  W.scene.background = new T.Color('#a8e6ff');
  plane(A, 200, 200, '#7ed36f', 0, 0); plane(A, 16, 18, '#8fe07d', 0, 4, 0.01);
  for (let i = 0; i < 4; i++) { const ln = plane(A, 16, 0.08, '#ffffff', 0, -4 + i * 5.3, 0.02); void ln; }
  [[-10, -6], [10, -2], [-11, 8], [11, 10], [-6, -12], [7, -13]].forEach((q) => MD.tree(A.g, q[0], q[1], 1.2));
  const thrower = MD.person({ shirt: G.prof.color, hair: '#3b2414' }); thrower.g.position.set(0, 0, 15); thrower.g.rotation.y = Math.PI; A.g.add(thrower.g);
  const g = { x: 0, z: 9, sp: 0, discs: [], next: 1.2, left: 45, catches: 0, combo: 0, best: 0, golden: 0, missed: 0 };
  P.g.position.set(0, 0, 9); P.g.rotation.y = Math.PI;
  const catchR = hasF ? 1.5 : 1.2, speed = 7.6;
  sub('Run under the frisbees! ' + (hasF ? '(Your Frisbee toy gives wider catches!)' : '') + (('ontouchstart' in window) ? ' Drag to run, or tap a spot.' : ' WASD / arrows to run.'));
  btns([]);
  function throwDisc() {
    const gold = rnd() < 0.12;
    const T0 = 1.65 + rnd() * 0.6 - Math.min(0.4, (45 - g.left) * 0.008);
    let tx, tz, tries = 0;
    do { tx = -6 + rnd() * 12; tz = -3 + rnd() * 13; tries++; } while (tries < 20 && Math.hypot(tx - g.x, tz - g.z) > speed * T0 * 0.85);
    const m = new T.Group(); MD.cyl(0.32, 0.06, gold ? MD.M('#facc15', { emissive: '#7a5a00' }) : '#3ff0ff', m, 0, 0, 0); MD.cyl(0.2, 0.065, gold ? '#fde68a' : '#ff4fd8', m, 0, 0.003, 0); A.g.add(m);
    const sh = new T.Mesh(MD.G.ring, new T.MeshBasicMaterial({ color: gold ? '#facc15' : '#ff4fd8', transparent: true, opacity: 0.9 })); sh.rotation.x = Math.PI / 2; sh.position.set(tx, 0.04, tz); A.g.add(sh);
    g.discs.push({ m, sh, t: 0, T: T0, fx: 0.4, fz: 14.6, tx, tz, gold, caught: false });
    thrower.armT = 0.3; Snd.fx('throw');
  }
  return {
    update(dt) {
      g.left -= dt; if (g.left <= 0) { g.left = 0; R.prog = 1; finish(this.result()); return; } R.prog = 1 - g.left / 45;
      const mi = moveInput();
      if (mi.m > 0.05) { R.tap = null; } else if (R.tap) { const dx = R.tap.x - g.x, dz = R.tap.z - g.z, d = Math.hypot(dx, dz); if (d < 0.2) R.tap = null; else { mi.x = dx / d; mi.z = dz / d; mi.m = Math.min(1, d * 2); } }
      g.sp = speed * mi.m; g.x = clamp(g.x + mi.x * g.sp * dt, -7.5, 7.5); g.z = clamp(g.z + mi.z * g.sp * dt, -4, 12.5);
      if (mi.m > 0.05) turnTo(P.g, Math.atan2(mi.x, mi.z), dt);
      g.next -= dt; if (g.next <= 0 && g.discs.filter((d) => !d.caught).length < 2) { throwDisc(); g.next = Math.max(0.95, 1.6 - (45 - g.left) * 0.014) + rnd() * 0.3; }
      for (let i = g.discs.length - 1; i >= 0; i--) {
        const d = g.discs[i]; d.t += dt; const k = Math.min(1, d.t / d.T);
        if (d.caught) { d.m.position.set(g.x, P.hTop + 0.15, g.z); d.life -= dt; if (d.life <= 0) { A.g.remove(d.m); g.discs.splice(i, 1); } continue; }
        const x = d.fx + (d.tx - d.fx) * k, z = d.fz + (d.tz - d.fz) * k, y = 1.6 * (1 - k) + Math.sin(k * Math.PI) * 3.2 * (1 - k * 0.3);
        d.m.position.set(x, Math.max(0.05, y), z); d.m.rotation.y += dt * 14; d.sh.scale.setScalar(0.3 + k * 0.5); d.sh.material.opacity = 0.4 + k * 0.6;
        if (y < 1.5 && k > 0.55 && Math.hypot(x - g.x, z - g.z) < catchR) {
          d.caught = true; d.life = 0.5; A.g.remove(d.sh); g.catches++; g.combo++; g.best = Math.max(g.best, g.combo);
          const pts = (d.gold ? 3 : 1) + (g.combo >= 6 ? 2 : g.combo >= 3 ? 1 : 0); R.score += pts; if (d.gold) g.golden++;
          P.play('catch', 0.5); Snd.fx('catch'); W.fx('star', g.x, P.hTop + 0.4, g.z, d.gold ? 8 : 3, 0.5);
          msg((d.gold ? '\u2B50 GOLDEN +' : '+') + pts + (g.combo >= 3 ? ' \u00b7 COMBO x' + g.combo : ''), 0.7);
        } else if (k >= 1) { A.g.remove(d.m); A.g.remove(d.sh); g.discs.splice(i, 1); g.combo = 0; g.missed++; Snd.fx('miss'); W.fx('dust', d.tx, 0.2, d.tz, 3, 0.4); }
      }
    },
    anim(dt) { P.g.position.set(g.x, 0, g.z); P.anim(dt, g.sp); thrower.armT = Math.max(0, (thrower.armT || 0) - dt); thrower.anim(dt, 0, thrower.armT > 0); },
    cam(dt, snap) { setCam(g.x * 0.45, 9.5, g.z + 9.5, g.x * 0.5, 0, g.z - 2, snap ? null : dt); },
    tap(x, y) { const p = W.rayPlane(x, y, 0); if (p) R.tap = { x: clamp(p.x, -7.5, 7.5), z: clamp(p.z, -4, 12.5) }; },
    timeText: () => '\u23F1 ' + Math.ceil(g.left), scoreText: () => '\uD83E\uDD4F ' + R.score,
    result() { return { coins: R.score * 2 + 5, lines: ['Catches: ' + g.catches + ' \u00b7 Best combo: ' + g.best + (g.golden ? ' \u00b7 Golden: ' + g.golden : '')] }; }
  };
};
/* ============================ PET RACE ============================ */
GAMES.race = function (R) {
  const A = R.A, rnd = R.rnd, P = R.pet, LEN = 260, LANES = [-2, 0, 2];
  W.scene.background = new T.Color('#bfe8ff');
  plane(A, 200, 400, '#7ed36f', 0, -150); const track = plane(A, 7, LEN + 40, '#e8a865', 0, -LEN / 2 + 10, 0.01); void track;
  [-1, 1].forEach((sd) => plane(A, 0.2, LEN + 40, '#ffffff', sd * 3.5, -LEN / 2 + 10, 0.02));
  [-1, 1].forEach((sd) => plane(A, 0.1, LEN + 40, '#fff7ed', sd * 1, -LEN / 2 + 10, 0.02));
  const fin = plane(A, 7, 1.2, '#111827', 0, -LEN, 0.03); const fin2 = new T.Mesh(MD.G.plane, new T.MeshBasicMaterial({ map: W.canvasTex(128, 32, (c) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? '#fff' : '#111'; c.fillRect(i * 8, j * 8, 8, 8); } }) })); fin2.rotation.x = -Math.PI / 2; fin2.scale.set(7, 1.2, 1); fin2.position.set(0, 0.035, -LEN); A.g.add(fin2); void fin;
  const arch = new T.Group(); [-3.8, 3.8].forEach((x) => MD.cyl(0.2, 4, '#ff4fd8', arch, x, 2, 0)); MD.box(8, 0.8, 0.3, '#ff4fd8', arch, 0, 4.2, 0); arch.position.z = -LEN; A.g.add(arch);
  for (let z = 0; z > -LEN - 20; z -= 14) { MD.tree(A.g, -7 - rnd() * 4, z, 1.1); MD.tree(A.g, 7 + rnd() * 4, z - 7, 1.1); if (rnd() < 0.5) MD.flowers(A.g, -4.5, z - 3); }
  const obs = [], treats = [];
  for (let z = -22; z > -LEN + 10; z -= 11 + rnd() * 6) {
    const kind = rnd(), lane = Math.floor(rnd() * 3);
    if (kind < 0.42) { const m = new T.Group(); MD.box(1.6, 0.08, 0.1, '#ef4444', m, 0, 0.5, 0); [-0.75, 0.75].forEach((x) => MD.box(0.08, 0.55, 0.08, '#fff', m, x, 0.27, 0)); m.position.set(LANES[lane], 0, z); A.g.add(m); obs.push({ t: 'hurdle', lane, z, m }); }
    else if (kind < 0.75) { const l2 = (lane + 1 + Math.floor(rnd() * 2)) % 3; [lane, rnd() < 0.4 ? l2 : -1].forEach((L) => { if (L < 0) return; const m = new T.Group(); MD.cone(0.4, 1, '#f97316', m, 0, 0.5, 0); MD.cyl(0.42, 0.08, '#fff', m, 0, 0.55, 0); m.position.set(LANES[L], 0, z); A.g.add(m); obs.push({ t: 'cone', lane: L, z, m }); }); }
    else { const m = new T.Mesh(MD.G.circle, MD.M('#3b82f6', { transparent: true, opacity: 0.75 })); m.rotation.x = -Math.PI / 2; m.scale.set(0.9, 0.7, 1); m.position.set(LANES[lane], 0.04, z); A.g.add(m); obs.push({ t: 'puddle', lane, z, m }); }
    if (rnd() < 0.85) { const tl = Math.floor(rnd() * 3), tz = z - 5; if (!obs.some((o) => o.lane === tl && Math.abs(o.z - tz) < 2)) { const m = MD.item('bone'); m.scale.setScalar(1.4); m.position.set(LANES[tl], 0.4, tz); A.g.add(m); treats.push({ lane: tl, z: tz, m, got: false }); } }
  }
  const g = { z: 0, lane: 1, x: 0, sp: 0, jumpT: 0, slowT: 0, boostT: 0, time: 0, treats: 0, bumps: 0, finished: false };
  P.g.position.set(0, 0, 0); P.g.rotation.y = Math.PI;
  sub(('ontouchstart' in window) ? 'Swipe or tap \u25C0 \u25B6 to switch lanes, JUMP over hurdles. Grab bones for speed!' : '\u2190 \u2192 switch lanes, SPACE / \u2191 to jump. Grab bones for speed!');
  btns([['left', '\u25C0'], ['jump', 'JUMP', 'big'], ['right', '\u25B6']]);
  const act = (a) => { if (a === 'left' && g.lane > 0) { g.lane--; Snd.fx('click'); } else if (a === 'right' && g.lane < 2) { g.lane++; Snd.fx('click'); } else if (a === 'jump' && g.jumpT <= 0) { g.jumpT = 0.62; Snd.fx('jump'); } };
  return {
    update(dt) {
      g.time += dt; if (g.time > 60) { finish(this.result()); return; }
      const target = g.slowT > 0 ? 4 : g.boostT > 0 ? 14.5 : 11; g.sp += (target - g.sp) * Math.min(1, dt * 3);
      g.slowT -= dt; g.boostT -= dt; g.jumpT -= dt;
      g.z -= g.sp * dt; g.x += (LANES[g.lane] - g.x) * Math.min(1, dt * 12);
      R.prog = clamp(-g.z / LEN, 0, 1);
      const air = g.jumpT > 0;
      for (const o of obs) {
        if (o.hit || Math.abs(o.z - g.z) > 0.45 || Math.abs(LANES[o.lane] - g.x) > 0.9) continue;
        if (o.t === 'cone' || (o.t === 'hurdle' && !air)) { o.hit = true; g.slowT = 0.8; g.bumps++; Snd.fx('bump'); P.play('nope', 0.6); msg('Oops!', 0.5); if (o.t === 'hurdle') o.m.rotation.x = -1.2; }
        else if (o.t === 'puddle' && !air) { o.hit = true; g.slowT = 0.4; Snd.fx('splash'); W.fx('drop', g.x, 0.4, g.z, 5, 0.6); }
      }
      for (const t of treats) { if (t.got || Math.abs(t.z - g.z) > 0.7 || Math.abs(LANES[t.lane] - g.x) > 0.9) continue; t.got = true; t.m.visible = false; g.treats++; g.boostT = 1.3; Snd.fx('coin'); W.fx('sparkle', g.x, 0.8, g.z, 3, 0.4); }
      R.score = Math.max(0, Math.round(g.treats * 5 + R.prog * 120));
      if (g.z <= -LEN) { g.finished = true; R.score = Math.max(20, Math.round(300 - g.time * 8)) + g.treats * 5; finish(this.result()); }
    },
    anim(dt) { const k = g.jumpT > 0 ? Math.sin((1 - g.jumpT / 0.62) * Math.PI) : 0; P.g.position.set(g.x, k * 1.15, g.z); P.anim(dt, g.sp * 0.6); for (const t of treats) if (!t.got) t.m.rotation.y += dt * 3; },
    cam(dt, snap) { setCam(g.x * 0.4, 3.8, g.z + 6.5, g.x * 0.6, 0.8, g.z - 7, snap ? null : dt); },
    swipe(dx, dy) { if (Math.abs(dx) > Math.abs(dy)) act(dx > 0 ? 'right' : 'left'); else if (dy < 0) act('jump'); else return false; return true; },
    tap() { act('jump'); },
    btn: act,
    key(code, down) { if (!down || R.phase !== 'play') return; if (code === 'ArrowLeft' || code === 'KeyA') act('left'); else if (code === 'ArrowRight' || code === 'KeyD') act('right'); else if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') act('jump'); },
    timeText: () => '\u23F1 ' + g.time.toFixed(1) + 's', scoreText: () => '\uD83C\uDFC1 ' + Math.round(R.prog * 100) + '% \u00b7 \uD83E\uDDB4 ' + g.treats,
    result() { return { coins: Math.round(R.score / 2.5), title: g.finished ? 'Finished in ' + g.time.toFixed(1) + 's!' : 'Score: ' + R.score, lines: ['Bones: ' + g.treats + ' \u00b7 Bumps: ' + g.bumps, 'Score: ' + R.score] }; }
  };
};
/* ============================ PET SHOW ============================ */
GAMES.show = function (R) {
  const A = R.A, rnd = R.rnd, P = R.pet, pd = R.o.pet;
  W.scene.background = new T.Color('#2a1446');
  plane(A, 60, 60, '#3b1d5a', 0, 0);
  const st = MD.cyl(4.2, 0.5, '#b45309', A.g, 0, 0.25, -1); st.scale.z = 0.6; MD.cyl(4.3, 0.05, '#facc15', A.g, 0, 0.5, -1).scale.z = 0.62;
  MD.box(10, 6, 0.3, '#be123c', A.g, 0, 3, -4); for (let i = 0; i < 9; i++) MD.box(0.12, 6, 0.4, '#9f1239', A.g, -4.5 + i * 1.12, 3, -3.8);
  const sign = new T.Mesh(MD.G.plane, new T.MeshBasicMaterial({ map: W.canvasTex(512, 128, (c) => { c.fillStyle = '#facc15'; c.fillRect(0, 0, 512, 128); c.fillStyle = '#7c2d12'; c.font = '900 72px Trebuchet MS'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PET SHOW', 256, 68); }) })); sign.scale.set(4, 1, 1); sign.position.set(0, 5.2, -3.6); A.g.add(sign);
  const spot = new T.Mesh(MD.G.circle, new T.MeshBasicMaterial({ color: '#fff7ae', transparent: true, opacity: 0.35 })); spot.rotation.x = -Math.PI / 2; spot.position.set(0, 0.52, -1); spot.scale.setScalar(1.6); A.g.add(spot);
  const table = MD.box(6, 0.9, 1, '#1e3a8a', A.g, 0, 0.45, 4.5); void table;
  const judges = [0, 1, 2].map((i) => { const j = MD.person({ shirt: ['#f43f5e', '#22c55e', '#3b82f6'][i], hair: ['#111', '#a16207', '#9ca3af'][i], long: i === 0 }); j.g.position.set(-2 + i * 2, 0, 5.4); j.g.rotation.y = Math.PI; A.g.add(j.g); return j; });
  const cards = judges.map((j) => { const s = W.textSprite(' ', { size: 60, h: 0.6 }); s.visible = false; s.position.set(j.g.position.x, 2.6, 4.9); A.g.add(s); return s; });
  for (let i = 0; i < 14; i++) { const a = MD.person({ shirt: ['#facc15', '#a855f7', '#f97316', '#14b8a6'][i % 4], hair: '#3b2414' }); a.g.position.set(-8 + (i % 7) * 2.6, 0, 8 + Math.floor(i / 7) * 1.6); a.g.rotation.y = Math.PI; a.g.scale.setScalar(0.9); A.g.add(a.g); judges.push(a); }
  const accStyle = ['head', 'neck', 'face'].reduce((a, k) => a + (pd.acc[k] && GP.ITEMS[pd.acc[k]] ? GP.ITEMS[pd.acc[k]].style : 0), 0);
  const style = Math.round(pd.n.f / 100 * 20 + pd.n.c / 100 * 10 + Math.min(12, accStyle * 1.5) + Math.min(8, pd.lv * 0.6));
  const known = GP.TRICKS.filter((t) => (pd.tricks[t.id] || 0) >= GP.TRICK_NEED).map((t) => t.id);
  const calls = []; for (let i = 0; i < 8; i++) { const pool = []; GP.TRICKS.forEach((t) => { const w = known.indexOf(t.id) >= 0 ? 3 : 1; for (let k = 0; k < w; k++) pool.push(t.id); }); calls.push(pool[Math.floor(rnd() * pool.length)]); }
  const g = { ph: 'walk', t: 0, i: -1, win: 0, wt: 0, pts: 0, perfect: 0, x: -3.5, lastOk: null, style, tricks: 0 };
  P.g.position.set(-3.5, 0.5, -1); P.g.rotation.y = Math.PI / 2;
  sub('Strut your stuff! Style: happiness, cleanness, accessories & level.');
  btns([]);
  const bubble = W.textSprite(' ', { size: 52, h: 0.7 }); bubble.visible = false; bubble.position.set(0, 3.2, -1); A.g.add(bubble);
  function nextCall() {
    g.i++; if (g.i >= calls.length) { g.ph = 'judge'; g.t = 0; btns([]); sub(''); bubble.visible = false; return; }
    const t = GP.TRICKS.find((q) => q.id === calls[g.i]); g.win = Math.max(1.6, 2.6 - g.i * 0.12); g.wt = 0; g.answered = false;
    A.g.remove(bubble.__s || bubble); const nb = W.textSprite(t.icon + ' ' + t.name.toUpperCase() + '!', { size: 52, h: 0.75, bg: 'rgba(255,255,255,.95)', color: '#7c2d12', border: '#facc15' }); nb.position.set(0, 3.0, -1); A.g.add(nb); bubble.__s = nb;
    $('mgSub').innerHTML = '<span class="ring" style="animation-duration:' + g.win + 's"></span> Tap <b>' + t.name + '</b>!';
    Snd.fx('tick');
  }
  function answer(id) {
    if (g.ph !== 'tricks' || g.answered) return; g.answered = true; const want = calls[g.i];
    if (id !== want) { msg('\uD83D\uDE35 Oops!', 0.6); P.play('nope', 0.7); Snd.fx('miss'); }
    else { const isK = known.indexOf(id) >= 0, fast = g.wt < g.win * 0.6, pts = isK ? (fast ? 12 : 8) : 4; g.pts += pts; g.tricks++; if (isK && fast) g.perfect++; R.score = g.style + g.pts; P.play(id, 1.0); Snd.fx(isK ? 'trick' : 'click'); W.fx('sparkle', 0, 1.4, -1, 4, 0.7); msg(isK ? (fast ? '\uD83C\uDF1F PERFECT +' + pts : 'GOOD +' + pts) : 'Wobbly\u2026 +' + pts + '<small>Learn it in CARE for more!</small>', 0.8); }
    g.gap = 0.75;
  }
  return {
    update(dt) {
      g.t += dt;
      if (g.ph === 'walk') { g.x = Math.min(0, -3.5 + g.t * 1.4); R.score = Math.round(g.style * Math.min(1, g.t / 2.5)); if (g.t > 2.8) { g.ph = 'tricks'; R.score = g.style; msg('Style: ' + g.style + '/50', 1.2); Snd.fx('cheer'); btns(GP.TRICKS.map((t) => [t.id, t.icon + '<small>' + t.name + '</small>', known.indexOf(t.id) >= 0 ? 'known' : ''])); g.gap = 1.4; } return; }
      if (g.ph === 'tricks') {
        if (g.gap > 0) { g.gap -= dt; if (g.gap <= 0) nextCall(); return; }
        g.wt += dt; R.prog = (g.i + Math.min(1, g.wt / g.win)) / calls.length;
        if (g.wt >= g.win && !g.answered) { g.answered = true; msg('\u23F0 Too slow!', 0.6); Snd.fx('miss'); g.gap = 0.6; }
        return;
      }
      if (g.ph === 'judge') {
        R.prog = 1;
        if (!g.shown && g.t > 0.6) { g.shown = true; const tot = R.score, base = tot / 146 * 10; cards.forEach((c, i) => { const v = clamp(Math.round(base + (rnd() - 0.5) * 2), 1, 10); const s = W.textSprite(String(v), { size: 70, h: 0.8, bg: '#ffffff', color: '#1e3a8a', border: '#1e3a8a' }); s.position.copy(c.position); A.g.add(s); }); Snd.fx('cheer'); }
        if (g.t > 2.6) finish(this.result());
      }
    },
    anim(dt) { if (g.ph === 'walk') { P.g.position.set(g.x, 0.5, -1); P.g.rotation.y = Math.PI / 2; P.anim(dt, 1.4); } else { P.g.position.set(0, 0.5, -1); turnTo(P.g, 0, dt, 6); P.anim(dt, 0); } judges.forEach((j, i) => j.anim(dt, 0, g.ph === 'judge' && i > 2 && Math.sin(R.t * 6 + i) > 0)); },
    cam(dt, snap) { setCam(0, 3.4, 8.2, 0, 1.3, -1, snap ? null : dt); },
    btn(id) { answer(id); },
    key(code, down) { if (!down) return; const m = { Digit1: 'sit', Digit2: 'jump', Digit3: 'spin', Digit4: 'wave', Digit5: 'roll', ArrowDown: 'sit', ArrowUp: 'jump', KeyR: 'spin', KeyQ: 'wave', ArrowLeft: 'roll', ArrowRight: 'roll' }; if (m[code]) answer(m[code]); },
    timeText: () => g.ph === 'walk' ? 'Runway' : g.ph === 'tricks' ? 'Trick ' + Math.max(1, g.i + 1) + '/8' : 'Judging\u2026', scoreText: () => '\uD83C\uDFC6 ' + R.score,
    result() { const sc = R.score, rib = sc >= 105 ? 'Gold' : sc >= 75 ? 'Silver' : 'Bronze'; return { ribbon: rib, coins: Math.round(sc / 2) + { Gold: 30, Silver: 15, Bronze: 5 }[rib], title: { Gold: '\uD83E\uDD47', Silver: '\uD83E\uDD48', Bronze: '\uD83E\uDD49' }[rib] + ' ' + rib + ' Ribbon! (' + sc + ' pts)', lines: ['Style ' + g.style + '/50 \u00b7 Tricks ' + g.pts + ' (' + g.perfect + ' perfect)', known.length < 5 ? 'Tip: tricks your pet has learned score up to 3x more!' : 'Your pet knows every trick. Superstar!'] }; }
  };
};
/* ============================ TREASURE DIG ============================ */
GAMES.dig = function (R) {
  const A = R.A, rnd = R.rnd, P = R.pet, N = 7, SP = 1.6, beach = !!R.o.beach, mult = beach ? 1.5 : 1;
  W.scene.background = new T.Color(beach ? '#9fe0ff' : '#b8e8ff');
  plane(A, 200, 200, beach ? '#f5dfa8' : '#7ed36f', 0, 0); plane(A, N * SP + 1.2, N * SP + 1.2, beach ? '#ecd18f' : '#e9cf8f', 0, 0, 0.01);
  if (beach) { const sea = plane(A, 200, 80, '#38bdf8', 0, -56, 0.02); void sea; MD.palm(A.g, -8, -3); MD.palm(A.g, 8, 2); } else { MD.tree(A.g, -8, -4, 1.2); MD.tree(A.g, 8, -2, 1.2); MD.bush(A.g, -7, 6); MD.bush(A.g, 7, 7); }
  const tiles = []; const pos = (i) => (i - (N - 1) / 2) * SP;
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) { const m = MD.mesh(MD.G.hemi, beach ? '#e2c27e' : '#c99a5b', A.g, pos(x), 0.0, pos(z), 0.55, 0.18, 0.55); tiles.push({ x, z, m, dug: false, item: null }); }
  const LOOT = [['gem', 40, '\uD83D\uDC8E Gem!'], ['gold', 60, '\uD83C\uDF1F Golden Bone!'], ['coins', 25, '\uD83E\uDE99 Coin pile!'], ['coins', 25, '\uD83E\uDE99 Coin pile!'], ['bone', 15, '\uD83E\uDDB4 Bone!'], ['bone', 15, '\uD83E\uDDB4 Bone!'], ['boot', 0, '\uD83D\uDC62 An old boot\u2026'], ['boot', 0, '\uD83E\uDD6B A tin can\u2026']];
  const idx = tiles.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
  LOOT.forEach((l, i) => { tiles[idx[i] === 24 ? idx[i + 10] : idx[i]].item = l; });
  const g = { x: 0, z: 0, sp: 0, digs: 10, left: 75, found: 0, digT: 0, warm: '' };
  P.g.position.set(0, 0, 0);
  sub(('ontouchstart' in window) ? 'Tap a mound to walk there (or drag). Follow the sniff meter, then DIG!' : 'WASD to walk, SPACE to dig. Follow the sniff meter!');
  btns([['dig', '\u26CF\uFE0F DIG', 'big dig']]);
  const cur = () => { const x = Math.round(g.x / SP + (N - 1) / 2), z = Math.round(g.z / SP + (N - 1) / 2); return tiles.find((t) => t.x === clamp(x, 0, N - 1) && t.z === clamp(z, 0, N - 1)); };
  function sniff() { const c = cur(); let best = 99; tiles.forEach((t) => { if (!t.dug && t.item && t.item[1] > 0) best = Math.min(best, Math.max(Math.abs(t.x - c.x), Math.abs(t.z - c.z))); }); return best; }
  function dig() {
    if (g.digT > 0 || g.digs <= 0) return; const t = cur(); if (t.dug) { msg('Already dug here!', 0.6); return; }
    g.digT = 0.8; P.play('dig', 0.8); Snd.fx('dig');
    setTimeout(() => {
      if (!R || R.id !== 'dig') return; t.dug = true; g.digs--; t.m.scale.y = 0.02; t.m.material = MD.M('#7c5a32');
      const hole = new T.Mesh(MD.G.circle, MD.M('#5b3a1e')); hole.rotation.x = -Math.PI / 2; hole.scale.setScalar(0.42); hole.position.set(pos(t.x), 0.03, pos(t.z)); A.g.add(hole);
      if (t.item) { const v = Math.round(t.item[1] * mult); R.score += v; if (v) g.found++; msg(t.item[2] + (v ? ' +' + v : ''), 0.9); Snd.fx(v ? 'treasure' : 'junk');
        const it = new T.Group(); if (t.item[0] === 'gem') MD.mesh(MD.G.cone4, MD.M('#22d3ee', { emissive: '#0e7490' }), it, 0, 0.3, 0, 0.25, 0.5, 0.25); else if (t.item[0] === 'coins') { for (let i = 0; i < 4; i++) MD.cyl(0.18, 0.05, MD.M('#facc15', { emissive: '#7a5a00' }), it, 0, 0.05 + i * 0.06, 0); } else if (t.item[0] === 'boot') MD.box(0.3, 0.35, 0.5, '#57534e', it, 0, 0.18, 0); else { const b = MD.item('bone'); if (t.item[0] === 'gold') b.traverse((q) => { if (q.isMesh) q.material = MD.M('#facc15', { emissive: '#7a5a00' }); }); b.scale.setScalar(1.6); it.add(b); }
        it.position.set(pos(t.x), 0.2, pos(t.z)); A.g.add(it); t.shown = it; W.fx(v ? 'star' : 'dust', pos(t.x), 0.6, pos(t.z), v ? 8 : 3, 0.6);
      } else { msg('Nothing here\u2026', 0.6); W.fx('dust', pos(t.x), 0.3, pos(t.z), 3, 0.4); }
      R.prog = 1 - g.digs / 10;
      const left = tiles.filter((q) => !q.dug && q.item && q.item[1] > 0).length;
      if (g.digs <= 0 || !left) finish(this_.result());
    }, 800);
  }
  const this_ = {
    update(dt) {
      g.left -= dt; g.digT -= dt; if (g.left <= 0) { finish(this_.result()); return; }
      const mi = moveInput(); if (mi.m > 0.05) R.tap = null; else if (R.tap) { const dx = R.tap.x - g.x, dz = R.tap.z - g.z, d = Math.hypot(dx, dz); if (d < 0.08) { R.tap = null; } else { mi.x = dx / d; mi.z = dz / d; mi.m = Math.min(1, d * 2.5); } }
      if (g.digT > 0) mi.m = 0;
      g.sp = 4.5 * mi.m; const lim = pos(N - 1) + 0.3; g.x = clamp(g.x + mi.x * g.sp * dt, -lim, lim); g.z = clamp(g.z + mi.z * g.sp * dt, -lim, lim);
      if (mi.m > 0.05) turnTo(P.g, Math.atan2(mi.x, mi.z), dt);
      const s = sniff(); const w = s === 0 ? ['\uD83D\uDD25\uD83D\uDD25 RIGHT HERE!', 'hot'] : s === 1 ? ['\uD83D\uDD25 HOT!', 'hot'] : s === 2 ? ['\u2600\uFE0F Warm', 'warm'] : s === 3 ? ['\uD83C\uDF24\uFE0F Cool', 'cool'] : ['\u2744\uFE0F Cold', 'cold'];
      if (g.warm !== w[0]) { g.warm = w[0]; $('mgSub').innerHTML = '<span class="sniff ' + w[1] + '">\uD83D\uDC43 ' + w[0] + '</span>'; }
      P.mood = s <= 1 ? 1 : s === 2 ? 0.6 : 0.2;
      tiles.forEach((t) => { if (t.shown) t.shown.rotation.y += dt * 2; });
    },
    anim(dt) { P.g.position.set(g.x, 0, g.z); if (!P.act && g.sp < 0.1 && Math.random() < dt * 0.5) P.play('sniff', 1); P.anim(dt, g.sp); },
    cam(dt, snap) { setCam(g.x * 0.5, 9.5, g.z * 0.5 + 9, g.x * 0.5, 0, g.z * 0.5 - 0.5, snap ? null : dt); },
    tap(x, y) { const p = W.rayPlane(x, y, 0); if (!p) return; const tx = clamp(Math.round(p.x / SP + (N - 1) / 2), 0, N - 1), tz = clamp(Math.round(p.z / SP + (N - 1) / 2), 0, N - 1); R.tap = { x: pos(tx), z: pos(tz) }; },
    btn(a) { if (a === 'dig') dig(); },
    key(code, down) { if (down && (code === 'Space' || code === 'Enter' || code === 'KeyE')) dig(); },
    timeText: () => '\u23F1 ' + Math.ceil(g.left) + ' \u00b7 \u26CF\uFE0F ' + g.digs + ' digs', scoreText: () => '\uD83D\uDC8E ' + R.score,
    result() { return { coins: Math.round(R.score * 0.8) + 5, lines: ['Treasures found: ' + g.found + (beach ? ' \u00b7 Beach bonus x1.5!' : '')] }; },
    _dig: dig, _tiles: tiles, _g: g
  };
  return this_;
};
MG.debug = () => R && { id: R.id, phase: R.phase, score: R.score, prog: R.prog, g: R.g };
})();
