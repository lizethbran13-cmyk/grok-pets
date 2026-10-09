/* Grok Pets - menus & panels: starter, pets + collection book, bag + gifts, shop, adoption, eggs, vet, map, decorating, tricks, wardrobe */
(function () {
'use strict';
const GP = window.GP, G = GP.G, W = GP.W, MD = GP.MD, Snd = GP.Snd, T = window.THREE, GN = window.GrokNet;
const $ = (id) => document.getElementById(id);
const esc = GN.esc, GS = G.GS, clamp = GP.clamp;
const UI = G.UI = {};
const sv = () => G.save();
const head = (t) => G.head(t);
const rb = (r) => '<span class="rar" style="--c:' + GP.RARITY[r].col + '">' + GP.RARITY[r].name + '</span>';

/* ---------------- 3D portraits (small offscreen renderer) ---------------- */
let PR = null; const pcache = {};
G.portraitInit = function () {
  try {
    const cv = document.createElement('canvas'); cv.width = cv.height = 160;
    const r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(160, 160, false); r.outputEncoding = T.sRGBEncoding; r.setClearColor(0x000000, 0);
    const sc = new T.Scene(); sc.add(new T.HemisphereLight(0xffffff, 0x9a8a70, 0.95)); const d = new T.DirectionalLight(0xffffff, 0.6); d.position.set(2, 3, 4); sc.add(d);
    PR = { r, sc, cam: new T.PerspectiveCamera(30, 1, 0.05, 50), cv };
  } catch (e) { PR = null; }
};
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
G.portrait = function (look) {
  const key = look.sp + look.col.join() + (look.eye || '') + (look.oneEye ? 1 : 0) + GP.stage(look.lv || 1) + JSON.stringify(look.acc || {});
  if (pcache[key]) return pcache[key]; if (!PR) return BLANK;
  const P = MD.pet(Object.assign({}, look, { lv: 7 })); P.g.rotation.y = 0.55; P.anim(0.01, 0); PR.sc.add(P.g); P.g.updateMatrixWorld(true);
  const bb = new T.Box3().setFromObject(P.g), c = bb.getCenter(new T.Vector3()), sz = bb.getSize(new T.Vector3()), R = Math.max(sz.x, sz.y, sz.z) * 0.62;
  const dist = R / Math.tan(15 * Math.PI / 180) * 1.05; PR.cam.position.set(c.x + dist * 0.12, c.y + dist * 0.22, c.z + dist); PR.cam.lookAt(c);
  PR.r.render(PR.sc, PR.cam); PR.sc.remove(P.g);
  let url = BLANK; try { url = PR.cv.toDataURL('image/png'); } catch (e) { /* ignore */ }
  pcache[key] = url; return url;
};
const spLook = (sp, vi) => { const s = GP.SPECIES[sp]; return { sp, col: [s.vars[vi || 0][1], s.vars[vi || 0][2]], lv: 7, acc: {} }; };
const famLook = (f) => ({ sp: f.sp, col: f.col, eye: f.eye, oneEye: f.oneEye, lv: 7, acc: f.acc });
const img = (look, cls) => '<img class="' + (cls || 'pic') + '" src="' + G.portrait(look) + '" alt="">';

/* ---------------- tutorial ---------------- */
G.tutNext = function () { const s = sv(); if (s.tut >= 1 && s.tut < 6) { s.tut++; G.persist(); Snd.fx('sparkle'); if (s.tut === 6) G.toast('\uD83C\uDF89 Tutorial done! Have fun with your pets!'); } };
G.tutHud = function () {
  const s = sv(), el = $('tut'); const p = G.petById(s.active[0]) || s.pets[0]; let t = '';
  if (p && s.tut >= 1 && s.tut < 6 && !GS.mg) {
    const n = esc(p.name);
    if (GS.care) t = ['', '\uD83D\uDC4B Meet ' + n + '! <b>Drag your finger on ' + n + '</b> to pet her.', n + ' is hungry! Tap <b>\uD83C\uDF56 FEED</b> and pick some food.', 'Playtime! Tap <b>\uD83C\uDFBE PLAY</b>, then <b>swipe up</b> to throw the ball.', 'Teach a trick! <b>Swipe DOWN</b> on the screen (not on ' + n + ') to teach SIT.', 'Great job! Tap <b>\u2715</b> to leave, then walk out the door to explore town.'][s.tut];
    else t = s.tut === 5 ? 'Walk to the green <b>EXIT</b> mat to go outside and explore!' : 'Tap <b>\u2764\uFE0F CARE</b> to look after ' + n + '.';
  }
  if (el.dataset.t !== t) { el.dataset.t = t; el.innerHTML = t; }
  el.classList.toggle('hidden', !t || !!GS.panel);
  el.classList.toggle('incare', !!GS.care);
};

/* ---------------- starter ---------------- */
let starterSel = 'candy';
UI.starter = function () {
  const draw = () => { $('starterList').innerHTML = GP.FAMILY.map((f) => '<button class="stcard' + (f.id === starterSel ? ' on' : '') + '" data-a="starter" data-v="' + f.id + '">' + img(famLook(f)) + '<b>' + esc(f.name) + '</b><small>' + esc(GP.SPECIES[f.sp].name) + '</small></button>').join(''); const f = GP.familyById(starterSel); $('starterBlurb').textContent = f.blurb; $('bStarterGo').textContent = 'START WITH ' + f.name.toUpperCase(); };
  UI._starterDraw = draw; draw(); $('scrStarter').classList.remove('hidden');
};
$('bStarterGo').onclick = () => { Snd.init(); Snd.fx('buy'); G.chooseStarter(starterSel); };

/* ---------------- pets + collection book ---------------- */
UI.pets = function (tab) {
  GS.petsTab = tab || GS.petsTab || 'mine'; const s = sv(); let h = head('\uD83D\uDC3E Your Pets');
  h += '<div class="tabs"><button class="' + (GS.petsTab === 'mine' ? 'on' : '') + '" data-a="petsTab" data-v="mine">MY PETS (' + s.pets.length + ')</button><button class="' + (GS.petsTab === 'book' ? 'on' : '') + '" data-a="petsTab" data-v="book">PET BOOK</button></div>';
  if (GS.petsTab === 'mine') {
    h += '<p class="sub">Walking with you: <b>' + s.active.length + '/3</b>. Pets left at home play in your house.</p>';
    const list = s.pets.slice().sort((a, b) => (s.active.indexOf(a.id) < 0) - (s.active.indexOf(b.id) < 0));
    h += list.map((p) => {
      const sp = GP.SPECIES[p.sp], act = s.active.indexOf(p.id) >= 0, ml = G.moodLabel(G.mood(p));
      return '<div class="prow">' + img(G.petLook(p)) + '<div class="pinfo"><b>' + esc(p.name) + '</b> ' + (p.fam ? rb('family') : rb(sp.r)) + '<small>' + esc(sp.name) + ' \u00b7 ' + GP.stage(p.lv) + ' \u00b7 Lv ' + p.lv + ' \u00b7 ' + ml[1] + ' ' + ml[0] + '</small><i class="mini big">' + ['h', 'f', 'e', 'c'].map((k) => '<em class="k' + k + '" style="width:' + Math.round(p.n[k]) + '%"></em>').join('') + '</i></div>' +
        '<div class="pbtns"><button class="btn small green" data-a="care" data-v="' + p.id + '">CARE</button><button class="btn small ' + (act ? 'alt' : 'blue') + '" data-a="walk" data-v="' + p.id + '">' + (act ? 'HOME' : 'WALK') + '</button><button class="btn small" data-a="info" data-v="' + p.id + '">INFO</button></div></div>';
    }).join('');
  } else {
    const owned = {}; s.pets.forEach((p) => { owned[p.sp] = 1; });
    h += '<p class="sub">Discovered <b>' + Object.keys(owned).length + '/' + GP.SPECIES_ORDER.length + '</b> kinds of pets</p><div class="book">';
    h += GP.SPECIES_ORDER.map((k) => { const sp = GP.SPECIES[k], have = owned[k]; return '<div class="bcard' + (have ? '' : ' locked') + '">' + img(spLook(k, 0), 'pic' + (have ? '' : ' sil')) + '<b>' + (have || s.seen[k] ? esc(sp.name) : '???') + '</b>' + rb(sp.r) + '<small>' + (sp.egg ? 'From eggs' : 'Adopt: ' + sp.price + ' \uD83E\uDE99') + '</small></div>'; }).join('');
    h += '</div><h3>\u2665 Family</h3><div class="book">' + GP.FAMILY.map((f) => { const have = s.pets.some((p) => p.fam === f.id), r = f.test(s); return '<div class="bcard' + (have ? '' : ' locked') + '">' + img(famLook(f), 'pic' + (have ? '' : ' sil')) + '<b>' + esc(f.name) + '</b>' + rb('family') + '<small>' + (have ? 'In your family!' : esc(f.goal) + ' (' + Math.min(r[0], r[1]) + '/' + r[1] + ')') + '</small></div>'; }).join('') + '</div>';
  }
  G.openPanel('pets', h);
};
UI.petInfo = function (p) {
  const sp = GP.SPECIES[p.sp], s = sv(), act = s.active.indexOf(p.id) >= 0, need = GP.levelXP(p.lv);
  let h = head('\uD83D\uDCCB ' + esc(p.name)) + '<div class="infohead">' + img(G.petLook(p), 'pic big') + '<div><div class="row"><input id="renameIn" maxlength="12" value="' + esc(p.name) + '"><button class="btn small primary" data-a="rename" data-v="' + p.id + '">SAVE</button></div>';
  h += '<p class="sub">' + esc(sp.name) + ' ' + (p.fam ? rb('family') : rb(sp.r)) + '<br>' + GP.stage(p.lv) + ' \u00b7 Level ' + p.lv + (p.lv < GP.MAX_LV ? ' (' + Math.floor(p.xp) + '/' + need + ' XP)' : ' MAX') + '<br>Walked ' + Math.round(p.walk || 0) + ' m</p></div></div>';
  h += '<h3>Tricks</h3><div class="tlist">' + GP.TRICKS.map((t) => { const n = p.tricks[t.id] || 0; return '<span class="' + (n >= GP.TRICK_NEED ? 'on' : '') + '">' + t.icon + ' ' + t.name + ' ' + (n >= GP.TRICK_NEED ? '\u2714' : p.lv < t.lv ? '(Lv ' + t.lv + ')' : n + '/' + GP.TRICK_NEED) + '</span>'; }).join('') + '</div>';
  if (p.fam) h += '<p class="sub fam">\u2665 ' + esc(GP.familyById(p.fam).blurb) + '</p>';
  h += '<div class="btnrow"><button class="btn green" data-a="care" data-v="' + p.id + '">CARE</button><button class="btn ' + (act ? 'alt' : 'blue') + '" data-a="walk" data-v="' + p.id + '">' + (act ? 'SEND HOME' : 'WALK WITH ME') + '</button></div>';
  G.openPanel('info', h);
};
UI.tricks = function (p) {
  let h = head('\u2728 ' + esc(p.name) + '\u2019s Tricks') + '<p class="sub">Use gestures on the screen (not on your pet), or tap a button. 3 good lessons = trick learned!</p>';
  h += GP.TRICKS.map((t) => { const n = p.tricks[t.id] || 0, known = n >= GP.TRICK_NEED, lock = !known && p.lv < t.lv; return '<div class="trow' + (known ? ' known' : '') + '"><i>' + t.icon + '</i><div><b>' + t.name + '</b><small>' + t.gest + (known ? ' \u00b7 Learned!' : lock ? ' \u00b7 Needs level ' + t.lv : ' \u00b7 Lessons ' + n + '/' + GP.TRICK_NEED) + '</small></div><button class="btn small ' + (known ? 'green' : 'primary') + '" data-a="trick" data-v="' + t.id + '"' + (lock ? ' disabled' : '') + '>' + (known ? 'DO IT' : 'TEACH') + '</button></div>'; }).join('');
  G.openPanel('tricks', h);
};
UI.wardrobe = function (p) {
  const s = sv(); let h = head('\uD83C\uDF80 Dress ' + esc(p.name));
  [['head', 'Head'], ['neck', 'Neck'], ['face', 'Face']].forEach((q) => {
    const own = GP.itemsOf('acc').filter((k) => GP.ITEMS[k].slot === q[0] && s.inv[k]);
    h += '<h3>' + q[1] + '</h3><div class="igrid"><button class="ibtn' + (!p.acc[q[0]] ? ' on' : '') + '" data-a="wear" data-v="' + q[0] + '|"><i>\u274C</i><b>None</b></button>' + own.map((k) => '<button class="ibtn' + (p.acc[q[0]] === k ? ' on' : '') + '" data-a="wear" data-v="' + q[0] + '|' + k + '"><i>' + GP.ITEMS[k].icon + '</i><b>' + esc(GP.ITEMS[k].name) + '</b></button>').join('') + '</div>';
    if (!own.length) h += '<p class="sub small">Buy ' + q[1].toLowerCase() + ' accessories at the Pet Shop!</p>';
  });
  GS.wardPet = p.id; G.openPanel('ward', h);
};

/* ---------------- bag + gifts ---------------- */
UI.bag = function (tab) {
  GS.bagTab = tab || GS.bagTab || 'food'; const s = sv(), fr = G.friends(); let h = head('\uD83C\uDF92 Bag \u00b7 \uD83E\uDE99 ' + s.coins);
  const tabs = [['food', 'FOOD'], ['toy', 'TOYS'], ['acc', 'STYLE'], ['furn', 'HOME']]; if (fr.length) tabs.push(['gift', '\uD83C\uDF81 GIFT']);
  if (GS.bagTab === 'gift' && !fr.length) GS.bagTab = 'food';
  h += '<div class="tabs">' + tabs.map((t) => '<button class="' + (GS.bagTab === t[0] ? 'on' : '') + '" data-a="bagTab" data-v="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
  if (GS.bagTab === 'gift') {
    GS.giftTo = fr.some((f) => f.pid === GS.giftTo) ? GS.giftTo : fr[0].pid;
    h += '<p class="sub">Send a gift to a friend. It makes both of your pets happy!</p><div class="plist">' + fr.map((f) => '<button class="pchip' + (f.pid === GS.giftTo ? ' on' : '') + '" style="--c:' + esc(f.color) + '" data-a="giftTo" data-v="' + f.pid + '"><i></i>' + esc(f.name) + '</button>').join('') + '</div><div class="igrid">';
    h += [20, 50].map((n) => '<button class="ibtn" data-a="gift" data-v="coins|' + n + '"' + (s.coins < n ? ' disabled' : '') + '><i>\uD83E\uDE99</i><b>' + n + ' coins</b></button>').join('');
    h += GP.itemsOf('food').filter((k) => s.inv[k]).map((k) => '<button class="ibtn" data-a="gift" data-v="' + k + '|1"><i>' + GP.ITEMS[k].icon + '</i><b>' + esc(GP.ITEMS[k].name) + '</b><small>you have ' + s.inv[k] + '</small></button>').join('') + '</div>';
  } else {
    const ks = GP.itemsOf(GS.bagTab).filter((k) => s.inv[k]);
    const placed = (k) => s.home.filter((f) => f.id === k).length;
    h += ks.length ? '<div class="igrid">' + ks.map((k) => '<div class="ibtn ro"><i>' + GP.ITEMS[k].icon + '</i><b>' + esc(GP.ITEMS[k].name) + '</b><small>' + (GS.bagTab === 'food' ? 'x' + s.inv[k] : GS.bagTab === 'furn' ? placed(k) + '/' + s.inv[k] + ' placed' : 'owned') + '</small></div>').join('') + '</div>' : '<p class="empty">Nothing here yet. Visit the Pet Shop in town!</p>';
    h += '<p class="sub small">' + { food: 'Feed pets in CARE mode.', toy: 'Play fetch in CARE mode.', acc: 'Dress pets in CARE \u2192 DRESS.', furn: 'Decorate at home with the DECOR button.' }[GS.bagTab] + '</p>';
  }
  G.openPanel('bag', h);
};

/* ---------------- map ---------------- */
const DEST = [['home', '\uD83C\uDFE0', 'Your Home', 'home', null], ['yard', '\uD83C\uDF33', 'Your Yard', 'town', [3, -26]], ['plaza', '\u26F2', 'Town Plaza', 'town', [0, -7]], ['shop', '\uD83D\uDECD\uFE0F', 'Pet Shop', 'shop', null], ['vet', '\uD83E\uDE7A', 'Vet & Groomer', 'vet', null], ['adopt', '\uD83D\uDC3E', 'Adoption Center', 'adopt', null], ['park', '\uD83C\uDFAE', 'Pet Park', 'town', [30, -4]], ['beach', '\uD83C\uDFD6\uFE0F', 'Beach', 'town', [64, 0]]];
UI.map = function () {
  const open = !W.gateObs.off ? false : true;
  G.openPanel('map', head('\uD83D\uDDFA\uFE0F Go to\u2026') + DEST.map((d) => { const lock = d[0] === 'beach' && !open; return '<button class="areaBtn" data-a="goto" data-v="' + d[0] + '"' + (lock ? ' disabled' : '') + '><span class="ai">' + d[1] + '</span><span><b>' + d[2] + '</b><small>' + (lock ? 'Unlock with a Beach Pass at the park gate' : '') + '</small></span></button>'; }).join(''));
};

/* ---------------- shop ---------------- */
UI.shop = function (cat) {
  GS.shopCat = cat || GS.shopCat || 'food'; const s = sv(); cat = GS.shopCat;
  let h = head('\uD83D\uDECD\uFE0F Pet Shop \u00b7 \uD83E\uDE99 ' + s.coins) + '<div class="tabs">' + Object.keys(GP.CATS).map((k) => '<button class="' + (k === cat ? 'on' : '') + '" data-a="shopTab" data-v="' + k + '">' + GP.CATS[k].toUpperCase() + '</button>').join('') + '</div>';
  h += '<div class="igrid shop">' + GP.itemsOf(cat).filter((k) => !GP.ITEMS[k].secret).map((k) => {
    const it = GP.ITEMS[k], own = s.inv[k] || 0, uniq = cat === 'toy' || cat === 'acc', done = uniq && own;
    const sub = cat === 'food' ? '+' + it.h + ' food' + (it.fav ? ' \u00b7 \u2764\uFE0F ' + it.fav.map((x) => ({ dog: 'dogs', cat: 'cats', rat: 'rats', hamster: 'hamsters', bird: 'birds', bunny: 'bunnies', tortoise: 'tortoises', pony: 'ponies', fish: 'fish', dragon: 'dragons', hedgehog: 'hedgehogs', robodog: 'robots' })[x]).join(', ') : '') + (own ? ' \u00b7 have ' + own : '') : cat === 'toy' ? (it.note || '+' + it.f + ' fun per fetch') : cat === 'acc' ? it.slot + ' \u00b7 style +' + it.style : cat === 'furn' ? 'comfort +' + it.comfort + (own ? ' \u00b7 own ' + own : '') : it.desc;
    return '<div class="ibtn sh"><i>' + it.icon + '</i><b>' + esc(it.name) + '</b><small>' + esc(sub) + '</small>' + (done ? '<button class="btn small alt" disabled>OWNED</button>' : '<button class="btn small primary" data-a="buy" data-v="' + k + '"' + (s.coins < it.price ? ' disabled' : '') + '>\uD83E\uDE99 ' + it.price + '</button>') + '</div>';
  }).join('') + '</div>';
  if (cat === 'egg') h += '<p class="sub small">Mystery Egg odds: Common 45% \u00b7 Uncommon 30% \u00b7 Rare 15% \u00b7 Epic 8% \u00b7 Legendary 2%</p>';
  G.openPanel('shop', h);
};
function buy(k) {
  const it = GP.ITEMS[k], s = sv(); if (!it || it.secret) return;
  if ((it.cat === 'toy' || it.cat === 'acc') && s.inv[k]) return;
  if (!G.spend(it.price)) return;
  if (it.cat === 'egg') { G.persist(); hatch(k === 'fegg'); return; }
  s.inv[k] = (s.inv[k] || 0) + (it.cat === 'food' ? 1 : 1); Snd.fx('buy'); G.toast('Bought ' + it.name + '!' + (it.cat === 'furn' ? ' Place it at home with DECOR.' : it.cat === 'acc' ? ' Dress a pet in CARE \u2192 DRESS.' : ''));
  G.persist(); UI.shop(it.cat);
}
function rollSpecies(fancy) {
  const pool = GP.SPECIES_ORDER.filter((k) => !fancy || ['rare', 'epic', 'legendary'].indexOf(GP.SPECIES[k].r) >= 0);
  const wt = (k) => { const r = GP.SPECIES[k].r, n = pool.filter((q) => GP.SPECIES[q].r === r).length; return (fancy ? { rare: 40, epic: 45, legendary: 15 }[r] : GP.RARITY[r].w) / n; };
  let tot = pool.reduce((a, k) => a + wt(k), 0), x = Math.random() * tot; for (const k of pool) { x -= wt(k); if (x <= 0) return k; } return pool[0];
}
function hatch(fancy) {
  const sp = rollSpecies(fancy), vi = Math.floor(Math.random() * 3), p = G.makePet(sp, vi, G.randName()); G.addPet(p); sv().stats.hatched++; G.persist();
  GS.namePet = p.id;
  G.openPanel('hatch', head(fancy ? '\uD83D\uDC8E Fantasy Egg' : '\uD83E\uDD5A Mystery Egg') + '<div class="egg" id="eggAnim">' + (fancy ? '\uD83D\uDC8E' : '\uD83E\uDD5A') + '</div><div id="hatchOut" class="hidden">' + img(G.petLook(p), 'pic big') + '<div class="big">It\u2019s a ' + esc(GP.SPECIES[sp].name) + '!</div>' + rb(GP.SPECIES[sp].r) + nameBox(p) + '</div>');
  Snd.fx('hatch');
  setTimeout(() => { const e = $('eggAnim'), o = $('hatchOut'); if (e) e.classList.add('hidden'); if (o) o.classList.remove('hidden'); if (GS.panel === 'hatch') W.fx && Snd.fx('learn'); }, 1500);
}
function nameBox(p) { return '<p class="sub">Give your new pet a name:</p><div class="row"><input id="petNameIn" maxlength="12" value="' + esc(p.name) + '"><button class="btn primary" data-a="nameGo" data-v="' + p.id + '">DONE</button></div>'; }
UI.hatch = hatch;

/* ---------------- adoption ---------------- */
UI.adopt = function (sp) {
  const s = sv();
  if (!sp) {
    const list = GP.SPECIES_ORDER.filter((k) => !GP.SPECIES[k].egg);
    G.openPanel('adopt', head('\uD83D\uDC3E Adopt a Pet \u00b7 \uD83E\uDE99 ' + s.coins) + '<p class="sub">Pick a friend to take home! Rare fantasy pets hatch from eggs.</p><div class="book">' + list.map((k) => { const x = GP.SPECIES[k]; return '<button class="bcard" data-a="adoptSp" data-v="' + k + '">' + img(spLook(k, 0)) + '<b>' + esc(x.name) + '</b>' + rb(x.r) + '<small>\uD83E\uDE99 ' + x.price + '</small></button>'; }).join('') + '</div><div class="btnrow"><button class="btn blue" data-a="shopTab" data-v="egg">\uD83E\uDD5A EGGS</button></div>');
    return;
  }
  const x = GP.SPECIES[sp]; if (!x || x.egg) return; GS.adoptSp = sp; GS.adoptVi = GS.adoptVi && GS.adoptSp === sp ? GS.adoptVi : 0; const vi = GS.adoptVi || 0;
  G.openPanel('adopt1', head('\uD83D\uDC3E ' + esc(x.name)) + img(spLook(sp, vi), 'pic big') + '<div>' + rb(x.r) + '</div><p class="sub">Choose a color:</p><div class="btnrow">' + x.vars.map((v, i) => '<button class="vbtn' + (i === vi ? ' on' : '') + '" data-a="adoptVar" data-v="' + i + '"><i style="background:' + v[1] + ';box-shadow:inset -10px -6px 0 ' + v[2] + '"></i>' + esc(v[0]) + '</button>').join('') + '</div><div class="btnrow"><button class="btn alt" data-a="adoptBack">BACK</button><button class="btn primary" data-a="adoptGo"' + (s.coins < x.price ? ' disabled' : '') + '>ADOPT \u00b7 \uD83E\uDE99 ' + x.price + '</button></div>');
};
UI.family = function () {
  const s = sv(); let h = head('\u2665 Family Corner') + '<p class="sub">Five very special pets. Reach each goal and they\u2019ll join your family for free!</p>';
  h += GP.FAMILY.map((f) => { const have = s.pets.some((p) => p.fam === f.id), r = f.test(s), ready = !have && r[0] >= r[1]; return '<div class="prow">' + img(famLook(f)) + '<div class="pinfo"><b>' + esc(f.name) + '</b> ' + rb('family') + '<small>' + esc(f.blurb) + '</small><small>' + (have ? '\u2714 In your family' : '\uD83C\uDFAF ' + esc(f.goal) + ' (' + Math.min(r[0], r[1]) + '/' + r[1] + ')') + '</small></div>' + (ready ? '<div class="pbtns"><button class="btn small primary" data-a="claim" data-v="' + f.id + '">WELCOME!</button></div>' : '') + '</div>'; }).join('');
  G.openPanel('family', h);
};
UI.familyPop = function (f) { G.openPanel('fampop', head('\uD83D\uDC96 Someone special!') + img(famLook(f), 'pic big') + '<div class="big">' + esc(f.name) + ' wants to join your family!</div><p class="sub">' + esc(f.blurb) + '</p><div class="btnrow"><button class="btn primary" data-a="claim" data-v="' + f.id + '">WELCOME ' + esc(f.name.toUpperCase()) + '!</button></div>'); Snd.fx('learn'); };

/* ---------------- vet & groomer ---------------- */
const DYES = [['Pink', '#f9a8d4'], ['Mint', '#99f6e4'], ['Lavender', '#c4b5fd'], ['Sky', '#7dd3fc'], ['Sunny', '#fcd34d']];
UI.vet = function (tab) {
  const s = sv(); GS.vetTab = tab || GS.vetTab || 'vet'; if (!G.petById(GS.vetPet)) GS.vetPet = s.active[0] || (s.pets[0] && s.pets[0].id);
  const p = G.petById(GS.vetPet); if (!p) return;
  let h = head('\uD83E\uDE7A Vet & Groomer \u00b7 \uD83E\uDE99 ' + s.coins) + '<div class="tabs"><button class="' + (GS.vetTab === 'vet' ? 'on' : '') + '" data-a="vetTab" data-v="vet">VET</button><button class="' + (GS.vetTab === 'groom' ? 'on' : '') + '" data-a="vetTab" data-v="groom">GROOMER</button></div>';
  h += '<div class="plist">' + s.pets.map((q) => '<button class="pchip' + (q.id === p.id ? ' on' : '') + '" data-a="vetPet" data-v="' + q.id + '">' + esc(q.name) + '</button>').join('') + '</div>';
  if (GS.vetTab === 'vet') {
    const tips = []; if (p.n.h < 50) tips.push('\uD83C\uDF56 ' + p.name + ' is hungry. Feed her in CARE.'); if (p.n.f < 50) tips.push('\uD83D\uDC96 Needs more fun: play fetch, pet her or play mini games.'); if (p.n.e < 40) tips.push('\uD83D\uDCA4 Tired. Use SLEEP in CARE or leave her at home to nap.'); if (p.n.c < 50) tips.push('\uD83D\uDEC1 A bit dirty. WASH or BRUSH in CARE, or get a bath here.');
    h += '<div class="vetcard">' + img(G.petLook(p)) + '<div><b>Dr. Pawla says:</b><p>' + (tips.length ? tips.map(esc).join('<br>') : esc(p.name) + ' is happy and healthy! \uD83C\uDF1F') + '</p></div></div>';
    h += svc('spa', '\uD83D\uDC86 Spa Day', 'All needs +40', 60) + svc('treat', '\uD83C\uDF6C Vitamin Treat', 'Energy +60', 30);
  } else {
    h += svc('bath', '\uD83D\uDEC1 Bubble Bath', 'Clean to 100% + happy', 25);
    h += '<h3>\uD83C\uDFA8 Fur Dye \u00b7 \uD83E\uDE99 80</h3><div class="btnrow">' + GP.SPECIES[p.sp].vars.map((v) => [v[0], v[1]]).concat(DYES).map((d, i) => '<button class="vbtn" data-a="dye" data-v="' + i + '"' + (s.coins < 80 ? ' disabled' : '') + '><i style="background:' + d[1] + '"></i>' + esc(d[0]) + '</button>').join('') + '</div>';
  }
  G.openPanel('vet', h);
};
function svc(id, name, desc, price) { return '<div class="trow"><i>' + name.split(' ')[0] + '</i><div><b>' + name.split(' ').slice(1).join(' ') + '</b><small>' + desc + '</small></div><button class="btn small primary" data-a="svc" data-v="' + id + '"' + (sv().coins < price ? ' disabled' : '') + '>\uD83E\uDE99 ' + price + '</button></div>'; }
function doSvc(id) {
  const p = G.petById(GS.vetPet); if (!p) return; const price = { spa: 60, treat: 30, bath: 25 }[id]; if (!G.spend(price)) return;
  if (id === 'spa') ['h', 'f', 'e', 'c'].forEach((k) => G.bump(p, k, 40)); if (id === 'treat') G.bump(p, 'e', 60); if (id === 'bath') { G.bump(p, 'c', 100); G.bump(p, 'f', 5); }
  G.addXP(p, 5); Snd.fx(id === 'bath' ? 'splash' : 'sparkle'); G.toast('\u2728 ' + p.name + ' feels great!'); G.persist(); UI.vet();
}

/* ---------------- mini game stand ---------------- */
UI.games = function (beach) {
  const s = sv(), host = GS.role === 'host', client = GS.role === 'client', lead = G.leadPet();
  GS.mgMode = GS.mgMode || 'vs';
  let h = head(beach ? '\uD83C\uDFD6\uFE0F Beach Dig' : '\uD83C\uDFAE Mini Games');
  if (!lead) { G.openPanel('games', h + '<p class="empty">You need a pet first!</p>'); return; }
  h += '<p class="sub">Playing with <b>' + esc(lead.name) + '</b> (your first walking pet). ' + (beach ? 'Beach treasure is worth more!' : '') + '</p>';
  if (host && G.friends().length) h += '<div class="tabs"><button class="' + (GS.mgMode === 'vs' ? 'on' : '') + '" data-a="mgMode" data-v="vs">\u2694\uFE0F VERSUS</button><button class="' + (GS.mgMode === 'team' ? 'on' : '') + '" data-a="mgMode" data-v="team">\uD83E\uDD1D TEAM UP</button></div><p class="sub small">' + (GS.mgMode === 'vs' ? 'Everyone plays at once. Highest score wins +30 bonus coins!' : 'Add your scores together. Reach the team goal for +25 coins each!') + '</p>';
  const list = beach ? GP.GAMES.filter((g) => g.id === 'dig') : GP.GAMES;
  h += list.map((g) => '<div class="gcard' + (GS.suggest === g.id && host ? ' sug' : '') + '" style="--c:' + g.col + '"><i>' + g.icon + '</i><div><b>' + g.name + '</b><small>' + g.desc + '</small><small>Best: ' + (s.best[g.id] || 0) + (GS.suggest === g.id && host ? ' \u00b7 \uD83D\uDCA1 a friend picked this!' : '') + '</small></div>' +
    (client ? '<button class="btn small blue" data-a="mgSuggest" data-v="' + g.id + '">SUGGEST</button>' : '<button class="btn small primary" data-a="mgPlay" data-v="' + g.id + '">' + (host && G.friends().length ? 'START ALL' : 'PLAY') + '</button>') + '</div>').join('');
  if (!beach) h += '<div class="gcard" style="--c:#f97316"><i>\uD83D\uDCA5</i><div><b>Animal Chaos</b><small>Be the pet! Make a mess, confuse your owner and escape Animal Control.' + (G.online() ? ' Co-op for friends!' : '') + '</small></div><button class="btn small primary" data-a="chOpen">' + (client ? 'OPEN' : 'PLAY') + '</button></div>';
  if (client) h += '<p class="sub small">The host starts mini games for everyone. Tap SUGGEST to ask for one!</p>';
  G.openPanel('games', h);
};
UI.gate = function () {
  const s = sv(); if (W.gateObs.off) return;
  G.openPanel('gate', head('\uD83C\uDFD6\uFE0F The Beach') + '<p class="sub">Sandy walks, seashells, and a treasure dig spot where pets find extra coins!</p><div class="big">Beach Pass \u00b7 \uD83E\uDE99 400</div><div class="btnrow"><button class="btn primary" data-a="gateBuy"' + (s.coins < 400 ? ' disabled' : '') + '>BUY BEACH PASS</button></div>' + (s.coins < 400 ? '<p class="sub small">Earn coins with mini games, daily rewards and pet care.</p>' : ''));
};

/* ---------------- decorating ---------------- */
UI.decor = function () {
  if (GS.me.area !== 'home') return;
  if (GS.role === 'client') { G.toast('You\u2019re visiting a friend\u2019s home. Only the host can decorate here!', true); return; }
  const s = sv(), placed = (k) => s.home.filter((f) => f.id === k).length;
  const ks = GP.itemsOf('furn').filter((k) => s.inv[k]);
  let h = head('\uD83D\uDECB\uFE0F Decorate') + '<p class="sub">Home comfort: <b>' + G.comfort() + '</b> \u2014 more comfy homes keep resting pets happier!</p>';
  h += ks.length ? '<div class="igrid">' + ks.map((k) => { const free = s.inv[k] - placed(k); return '<button class="ibtn" data-a="decorPick" data-v="' + k + '"' + (free <= 0 ? ' disabled' : '') + '><i>' + GP.ITEMS[k].icon + '</i><b>' + esc(GP.ITEMS[k].name) + '</b><small>' + (free > 0 ? free + ' to place' : 'all placed') + '</small></button>'; }).join('') + '</div>' : '<p class="empty">No furniture yet. Buy some at the Pet Shop!</p>';
  h += '<p class="sub small">Tip: tap furniture in your house while decorating to move, turn or store it.</p><div class="btnrow"><button class="btn green" data-a="decorStart">DECORATE MODE</button></div>';
  G.openPanel('decor', h);
};
let ghost = null;
function decorBar() {
  const d = GS.decor, bar = $('decorBar'); if (!d) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  const it = d.id ? GP.ITEMS[d.id] : null;
  $('decorT').textContent = it ? (d.x == null ? 'Tap the floor to put the ' + it.name + ' there' : d.ok ? 'Looks good! Tap PLACE.' : 'Can\u2019t go there. Tap another spot.') : d.sel != null ? 'Selected: ' + GP.ITEMS[sv().home[d.sel].id].name : 'Tap furniture to move it, or DONE.';
  $('dRot').classList.toggle('hidden', !it && d.sel == null); $('dPlace').classList.toggle('hidden', !it); $('dPlace').disabled = !(it && d.ok);
  $('dMove').classList.toggle('hidden', d.sel == null || !!it); $('dStore').classList.toggle('hidden', d.sel == null || !!it);
}
function clearGhost() { if (ghost) { W.scene.remove(ghost); ghost = null; } }
function showGhost() {
  clearGhost(); const d = GS.decor; if (!d || !d.id || d.x == null) return;
  ghost = new T.Group(); const m = MD.furn(d.id); m.rotation.y = d.r * Math.PI / 2; ghost.add(m);
  const it = GP.ITEMS[d.id], w = (d.r % 2 ? it.d : it.w), dd = (d.r % 2 ? it.w : it.d);
  const ring = new T.Mesh(MD.G.box, new T.MeshBasicMaterial({ color: d.ok ? '#22c55e' : '#ef4444', transparent: true, opacity: 0.45 })); ring.scale.set(w + 0.1, 0.04, dd + 0.1); ring.position.y = 0.04; ghost.add(ring);
  ghost.position.set(d.x, 0, d.z); W.scene.add(ghost);
}
function revalidate() { const d = GS.decor; if (!d || !d.id || d.x == null) return; d.ok = W.canPlace(d.id, d.x, d.z, d.r, sv().home, d.fi, GS.me.x, GS.me.z); }
UI.decorTap = function (x, y) {
  const d = GS.decor; if (!d) return;
  if (d.id) { const p = W.rayPlane(x, y, 0); if (!p) return; d.x = Math.round(p.x * 2) / 2; d.z = Math.round(p.z * 2) / 2; revalidate(); showGhost(); decorBar(); Snd.fx('click'); return; }
  const A = W.areas.home; let hit = null;
  for (const m of A.furnMeshes || []) { const h = W.hitObj(x, y, m); if (h && (!hit || h.distance < hit.d)) hit = { m, d: h.distance }; }
  d.sel = hit ? hit.m.userData.fi : null; decorBar(); if (hit) Snd.fx('click');
};
function decorAction(a) {
  const d = GS.decor, s = sv(); if (!d) return;
  if (a === 'rot') { if (d.id) { d.r = (d.r + 1) % 4; revalidate(); showGhost(); } else if (d.sel != null) { const f = s.home[d.sel]; const nr = ((f.r || 0) + 1) % 4; if (W.canPlace(f.id, f.x, f.z, nr, s.home, d.sel, GS.me.x, GS.me.z)) { f.r = nr; W.placeHome(s.home); } else G.toast('No room to turn it here.', true); } }
  else if (a === 'place' && d.id && d.ok) { if (d.fi != null) s.home.splice(d.fi, 1, { id: d.id, x: d.x, z: d.z, r: d.r }); else s.home.push({ id: d.id, x: d.x, z: d.z, r: d.r }); W.placeHome(s.home); clearGhost(); Snd.fx('buy'); GS.decor = { id: null, sel: null }; G.persist(); G.syncLooks(); }
  else if (a === 'move' && d.sel != null) { const f = s.home[d.sel]; GS.decor = { id: f.id, r: f.r || 0, fi: d.sel, x: f.x, z: f.z }; revalidate(); showGhost(); }
  else if (a === 'store' && d.sel != null) { s.home.splice(d.sel, 1); W.placeHome(s.home); GS.decor = { id: null, sel: null }; Snd.fx('click'); G.persist(); G.syncLooks(); }
  else if (a === 'done') { clearGhost(); GS.decor = null; G.persist(); G.syncLooks(); }
  decorBar();
}
['dRot', 'dPlace', 'dMove', 'dStore', 'dDone'].forEach((id) => { $(id).addEventListener('click', (e) => { e.stopPropagation(); Snd.init(); decorAction({ dRot: 'rot', dPlace: 'place', dMove: 'move', dStore: 'store', dDone: 'done' }[id]); }); });
UI.decorAction = decorAction;
G.decorTick = function () { if (GS.decor && (GS.me.area !== 'home' || !G.inGame() || GS.mg || GS.care)) { clearGhost(); GS.decor = null; decorBar(); } };

/* ---------------- delegated panel buttons ---------------- */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; Snd.init(); Snd.fx('click');
  const a = b.dataset.a, v = b.dataset.v, s = sv();
  switch (a) {
    case 'close': if (GS.mg && (GS.panel === 'mgres' || GS.panel === 'mgwait')) G.mgExit(); else G.closePanel(); break; // X on mini game results/wait = leave, never strand the player in the arena
    case 'care': G.closePanel(); if (GS.care && GS.care.id !== +v) GP.Care.close(true); if (!GS.care) GP.Care.open(+v); break;
    case 'starter': starterSel = v; UI._starterDraw(); break;
    case 'petsTab': UI.pets(v); break;
    case 'walk': { const id = +v, i = s.active.indexOf(id); if (i >= 0) { if (GS.care && GS.care.id === id) GP.Care.close(true); s.active.splice(i, 1); } else { if (s.active.length >= 3) { G.toast('You can walk with 3 pets at a time. Send one home first!', true); break; } s.active.push(id); } G.persist(); G.syncLooks(); if (GS.panel === 'info') UI.petInfo(G.petById(id)); else UI.pets(); break; }
    case 'info': UI.petInfo(G.petById(+v)); break;
    case 'rename': { const p = G.petById(+v), n = $('renameIn').value.trim(); if (p && n) { p.name = GN.cleanName(n); G.persist(); G.syncLooks(); G.toast('Renamed to ' + p.name + '!'); UI.petInfo(p); } break; }
    case 'nameGo': { const p = G.petById(+v), el = $('petNameIn'), n = el && el.value.trim(); if (p && n) p.name = GN.cleanName(n); G.persist(); G.syncLooks(); G.closePanel(); if (p) G.toast('\uD83D\uDC96 Welcome home, ' + p.name + '!' + (s.active.indexOf(p.id) >= 0 ? ' She\u2019s walking with you.' : ' She\u2019s waiting at home.')); break; }
    case 'feed': G.closePanel(); GP.Care.feed(v); break;
    case 'toy': G.closePanel(); if (GS.care) { GS.care.toyId = v; GP.Care.setMode('toy'); } break;
    case 'trick': G.closePanel(); GP.Care.trick(v); break;
    case 'wear': { const p = G.petById(GS.wardPet); if (!p) break; const q = v.split('|'); if (q[1]) p.acc[q[0]] = q[1]; else delete p.acc[q[0]]; G.persist(); G.syncLooks(); UI.wardrobe(p); break; }
    case 'bagTab': UI.bag(v); break;
    case 'giftTo': GS.giftTo = v; UI.bag('gift'); break;
    case 'gift': { const q = v.split('|'), n = +q[1], fr = G.friends().find((f) => f.pid === GS.giftTo); if (!fr) break;
      if (q[0] === 'coins') { if (s.coins < n) break; s.coins -= n; } else { if (!s.inv[q[0]]) break; s.inv[q[0]]--; if (!s.inv[q[0]]) delete s.inv[q[0]]; }
      G.doAct({ k: 'gift', to: fr.pid, item: q[0], n }); s.stats.gifts++; s.active.forEach((id) => { const p = G.petById(id); if (p) G.bump(p, 'f', 5); });
      G.toast('\uD83C\uDF81 Gift sent to ' + fr.name + '!'); Snd.fx('buy'); G.persist(); UI.bag('gift'); break; }
    case 'goto': { const d = DEST.find((q) => q[0] === v); if (!d) break; G.closePanel(); G.travel(d[3], false, d[4]); break; }
    case 'shopTab': UI.shop(v); break;
    case 'buy': buy(v); break;
    case 'adoptSp': GS.adoptVi = 0; UI.adopt(v); break;
    case 'adoptVar': GS.adoptVi = +v; UI.adopt(GS.adoptSp); break;
    case 'adoptBack': UI.adopt(null); break;
    case 'adoptGo': { const x = GP.SPECIES[GS.adoptSp]; if (!x || !G.spend(x.price)) break; const p = G.makePet(GS.adoptSp, GS.adoptVi || 0, G.randName()); G.addPet(p); Snd.fx('learn'); G.openPanel('name', head('\uD83D\uDC96 Adopted!') + img(G.petLook(p), 'pic big') + nameBox(p)); break; }
    case 'claim': { const p = G.claimFamily(v); if (p) { G.openPanel('name', head('\uD83D\uDC96 Welcome, ' + esc(p.name) + '!') + img(G.petLook(p), 'pic big') + '<p class="sub">' + esc(GP.familyById(v).blurb) + '</p>' + nameBox(p)); } else G.closePanel(); break; }
    case 'vetTab': UI.vet(v); break;
    case 'vetPet': GS.vetPet = +v; UI.vet(); break;
    case 'svc': doSvc(v); break;
    case 'dye': { const p = G.petById(GS.vetPet); if (!p || !G.spend(80)) break; const opts = GP.SPECIES[p.sp].vars.map((x) => [x[0], x[1], x[2]]).concat(DYES.map((d) => [d[0], d[1], MD.shade(d[1], 0.55)])); const o = opts[+v]; if (o) { p.col = [o[1], o[2] || p.col[1]]; } Snd.fx('sparkle'); G.toast('\uD83C\uDFA8 ' + p.name + ' has a new look!'); G.persist(); G.syncLooks(); UI.vet(); break; }
    case 'mgMode': GS.mgMode = v; UI.games(); break;
    case 'mgPlay': if (GS.role === 'host' && G.friends().length) { G.closePanel(); G.doAct({ k: 'mgstart', id: v, mode: GS.mgMode }); GS.suggest = null; } else G.startGame(v); break;
    case 'mgSuggest': G.doAct({ k: 'suggest', id: v }); G.toast('Suggestion sent to the host!'); G.closePanel(); break;
    case 'mgdone': G.mgExit(); break;
    case 'mgagain': { const id = GS.mg && GS.mg.id; G.mgExit(); if (id) G.startGame(id); break; }
    case 'gateBuy': if (G.spend(400)) { s.beach = true; G.persist(); G.refreshGate(); G.syncLooks(); Snd.fx('learn'); G.toast('\uD83C\uDFD6\uFE0F The beach is open! Walk through the gate.'); G.closePanel(); } break;
    case 'decorPick': G.closePanel(); GS.decor = { id: v, r: 0, x: null, z: null, ok: false }; decorBar(); break;
    case 'decorStart': G.closePanel(); GS.decor = { id: null, sel: null }; decorBar(); break;
  }
});
G.onPanelClose = function (was) { if (was === 'hatch' || was === 'name') G.syncLooks(); };

/* daily pens lineup */
G.pensLineup = function () { const d = new Date(), r = GP.rng(d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate()); const list = GP.SPECIES_ORDER.filter((k) => !GP.SPECIES[k].egg); for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = list[i]; list[i] = list[j]; list[j] = t; } return list.slice(0, 6); };
})();
