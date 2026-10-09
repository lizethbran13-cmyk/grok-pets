/* Grok Pets - NPCs: townsfolk who walk their own pets, shop staff, talk dialogue, friendship, small quests, NPC playdates.
   Everything here is local to each player (nothing is sent over the network), so co-op sync is unaffected. */
(function () {
'use strict';
const GP = window.GP, T = window.THREE, W = GP.W, MD = GP.MD, G = GP.G, Snd = GP.Snd, GN = window.GrokNet;
const GS = G.GS, $ = (id) => document.getElementById(id), esc = GN.esc, TAU = Math.PI * 2, clamp = GP.clamp;
const NPC = GP.NPC = { list: [] };
const ang = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// Every model (people and pets) is built facing +Z, so the yaw that faces a direction (dx, dz) is atan2(dx, dz).
const yawOf = (dx, dz) => Math.atan2(dx, dz);
function turn(o, target, dt, k) { o.yaw += ang(target - o.yaw) * Math.min(1, dt * (k || 7)); }
const sv = () => G.save();
const PD_COOLDOWN = 3600 * 1000; // one real hour per NPC
const QUEST_COINS = 30;

/* ---------------- shared tips (rotating) ---------------- */
const TIPS = [
  'Walk your pets around town. Sometimes they sniff out buried coins and treats!',
  'The Beach Pass costs 400 coins at the gate, and beach treasure is worth way more.',
  'A Mystery Egg can hatch anything, even a legendary Galaxy Cat! Only a 2% chance though\u2026',
  'Fantasy Eggs always hatch something Rare or better, like a Mini Dragon or a Unicorn Pony!',
  'In care mode, swipe DOWN to teach Sit. Three good lessons and it\u2019s learned!',
  'Comfy furniture at home helps your pets stay happy while you\u2019re out.',
  'Come back every day for the daily reward. Day 7 gives Pupcakes!',
  'Pet Show judges love happy, dressed-up pets that know lots of tricks.',
  'In Frisbee Catch, chain your catches for a big combo bonus!',
  'In Treasure Dig, follow the hot and cold hints to find the loot faster.',
  'Favourite foods make pets extra happy. Rats and hamsters love Seed Mix!',
  'Pets you leave at home take naps and get their energy back.'
];

/* ---------------- NPC definitions ---------------- */
const DEFS = [
  { id: 'rosa', name: 'Rosa', role: 'Friendly neighbour', area: 'town', emo: '\uD83D\uDC69', col: '#38bdf8', model: { shirt: '#38bdf8', hair: '#7c2d12', long: 1 },
    pet: { sp: 'retriever', name: 'Goldie', col: ['#e0a84a', '#f3d9a4'], acc: { neck: 'redcollar' } }, speed: 1.25, loop: true, start: 0,
    route: [[7, -6], [8.6, 0, 2.5], [7, 6.5], [0, 8.6], [-7, 6.5, 2], [-8.6, 0], [-7, -6], [0, -8.6, 3]],
    persona: 'Cheerful and chatty. Walks Goldie around the fountain every single day.', gift: 'flower', quest: 'happy',
    greet: ['Hi there! I\u2019m Rosa, and this is Goldie! We walk around the fountain every day.', 'Oh hello! Goldie spotted you from all the way across the plaza!'],
    greetF: ['Hey, it\u2019s you again! Goldie\u2019s tail is going crazy!', 'There\u2019s my favourite neighbour! Lovely day for a walk, right?'],
    greetB: ['My best friend! Goldie saved you the sunniest spot by the fountain.', 'You and {pet} make my whole day, you know that?'],
    tips: ['Goldie goes wild for Meaty Treats. Most dogs do!', 'Don\u2019t mind Old Man Grumbleton. He yells, Brutus barks, nobody ever gets hurt. I think they\u2019re just lonely.', 'If your pet looks sad, a game of fetch fixes almost everything.'] },
  { id: 'marcus', name: 'Marcus', role: 'Sporty dog walker', area: 'town', emo: '\uD83E\uDDD1', col: '#a3e635', model: { shirt: '#a3e635', hair: '#111827' },
    pet: { sp: 'corgi', name: 'Pudding', col: ['#e08a3a', '#ffffff'], acc: { neck: 'redcollar' } }, speed: 1.5, loop: false, start: 3,
    route: [[8.5, -3.5], [12.8, 0], [19, 0], [25, 1], [31, -5, 3], [38, 0], [46, 3, 2.5], [49, -7], [40, -9]],
    persona: 'Energetic and competitive. Training Pudding for the Pet Race.', gift: 'cap', quest: 'games',
    greet: ['Yo! Marcus here. Pudding and I are training for the Pet Race!', 'Hey! Wanna race? Just kidding, Pudding needs a snack break first.'],
    greetF: ['My training buddy! Pudding\u2019s been practising her hurdles.', 'Hey champ! You and {pet} ready to run some laps?'],
    greetB: ['Best buddies! Pudding says you\u2019re the fastest friend she\u2019s got.', 'Team {pet} and Team Pudding, unstoppable!'],
    tips: ['In the Pet Race, grab treats for a speed boost and jump every hurdle!', 'Short legs, big heart. Pudding beat a greyhound once. Okay, it was asleep.'] },
  { id: 'joe', name: 'Grandpa Joe', role: 'Park regular', area: 'town', emo: '\uD83D\uDC74', col: '#a78bfa', model: { shirt: '#a78bfa', hair: '#e5e7eb', pants: '#78350f' },
    pet: { sp: 'tortoise', name: 'Shelly', col: ['#6a7a3a', '#a8a868'], acc: { head: 'flower' } }, speed: 0.85, loop: true, start: 2, petCap: 2.4,
    route: [[26, -6], [24, 6], [30, 11.5], [40, 15, 3], [50.5, 13], [51.5, 1.5], [46, -10, 3], [38, -12], [31, -8]],
    persona: 'Calm and wise. Has walked Shelly around the Pet Park for 40 years.', gift: 'bowtie', quest: 'walk',
    greet: ['Well hello, young one. I\u2019m Joe, and this slowpoke is Shelly. We\u2019re in no hurry.', 'Ah, a new face at the park! Shelly says hello. Slowly.'],
    greetF: ['Good to see you again. Shelly perked right up when she saw you.', 'Back for more stories, eh? Pull up a bench.'],
    greetB: ['My dear friend! Shelly and I were just talking about you. Well, I was talking.', 'You remind me of me when I was young, and {pet} reminds me of Shelly!'],
    tips: ['Tortoises love Veggie Bowls. Shelly has had one every day for 40 years!', 'Patience is the best trick of all. Took Shelly three years to learn Sit.', 'Old Man Grumbleton? Grumpy as a rain cloud. But I once saw his Brutus wag his whole bottom at a Meaty Treat\u2026'] },
  { id: 'kiki', name: 'Coach Kiki', role: 'Mini game host', area: 'town', staff: true, emo: '\uD83E\uDDE2', col: '#facc15', menu: '\uD83C\uDFAE PLAY GAMES',
    persona: 'Super energetic. Runs the mini games at the Pet Park all day.', gift: 'frisbee', quest: 'show',
    greet: ['Hey hey! Coach Kiki here! Ready to play some mini games?', 'Step right up! Frisbee, racing, the Pet Show or treasure digging!'],
    greetF: ['My star player is back! What are we playing today?', 'Woo! {pet} has that winner look today!'],
    greetB: ['My MVP! The crowd goes wild when you and {pet} show up!', 'Best friend AND best player? You\u2019re the total package!'],
    busy: 'Aww, I\u2019m running the games all day! Come play one with me instead!',
    tips: ['Pet Show tip: tap the trick the judges call, fast! Happy, dressed-up pets score extra.', 'Each mini game gives coins AND XP. Higher scores give more!'] },
  { id: 'penny', name: 'Penny', role: 'Pet Shop owner', area: 'shop', staff: true, emo: '\uD83D\uDC69\u200D\uD83D\uDCBC', col: '#f472b6', menu: '\uD83D\uDECD\uFE0F BROWSE',
    persona: 'Bubbly and helpful. Knows every item in the shop by heart.', gift: 'cupcake',
    greet: ['Welcome to the Pet Shop! I\u2019m Penny. Want to browse?', 'Hello hello! Food, toys, outfits, furniture and eggs. Want to browse?'],
    greetF: ['My favourite customer! Want to see what\u2019s new?', 'Back again? {pet} is going to be so spoiled! Want to browse?'],
    greetB: ['Bestie! I always save the cutest outfits for you. Want to browse?', 'You and {pet} light up my shop! Take a look around!'],
    busy: 'I\u2019d love to, but the shop won\u2019t run itself! Maybe after closing time.',
    tips: ['Mystery Eggs are 350 coins at my counter, Fantasy Eggs 1100. Fantasy ones are always Rare or better!', 'Toys and accessories you buy are yours forever. Dress your pet in CARE \u2192 DRESS.'] },
  { id: 'pawla', name: 'Dr. Pawla', role: 'Vet', area: 'vet', staff: true, emo: '\uD83D\uDC69\u200D\u2695\uFE0F', col: '#0ea5e9', menu: '\uD83E\uDE7A OPEN VET',
    persona: 'Gentle and caring. Gives every pet a check-up and a smile.', gift: 'steak',
    greet: ['Hello! I\u2019m Dr. Pawla. Let me take a look at {pet}\u2026', 'Welcome to the clinic! How is {pet} feeling today?'],
    greetF: ['Good to see you two again! Let\u2019s check on {pet}.', 'My favourite patient is here!'],
    greetB: ['Oh, my best visitors! {pet} is the healthiest pet in town thanks to you.', 'You take such good care of {pet}. It shows!'],
    busy: 'Oh, I have patients waiting! But thank you for asking.',
    tips: ['Pets never get sick here, but they do get sad if you forget about them.', 'A Spa Day boosts every need by 40. Great after a long trip!'] },
  { id: 'sam', name: 'Sudsy Sam', role: 'Groomer', area: 'vet', staff: true, emo: '\uD83E\uDDFC', col: '#2dd4bf', menu: '\uD83D\uDEC1 GROOMING',
    persona: 'Goofy and bubbly. Thinks every problem can be solved with more bubbles.', gift: 'scarf',
    greet: ['Bubbles! Bubbles everywhere! I\u2019m Sudsy Sam, the groomer. Want {pet} squeaky clean?', 'Splish splash! Is somebody ready for a bubble bath?'],
    greetF: ['My bubble buddy is back! {pet} looks ready for a spa day.', 'Hey hey! I just got new lavender bubbles!'],
    greetB: ['Best friend alert! I saved the extra-fluffy towels for {pet}.', 'You\u2019re the bubbliest friend I\u2019ve got!'],
    busy: 'Can\u2019t, I\u2019ve got three poodles in the tub! Well\u2026 imaginary poodles. Still busy!',
    tips: ['Fur Dye can turn {pet} pink, mint, lavender, sky or sunny!', 'Brushing and washing in CARE mode keeps fur shiny for free.'] },
  { id: 'hazel', name: 'Hazel', role: 'Adoption Center', area: 'adopt', staff: true, emo: '\uD83D\uDC75', col: '#f59e0b', menu: '\uD83D\uDC3E ADOPT',
    persona: 'Warm and motherly. Wants every pet to find a loving home.', gift: 'bow',
    greet: ['Welcome to the Adoption Center! I\u2019m Hazel. Every pet here is looking for a home.', 'Hello, dear! Have a look around, the little ones love visitors.'],
    greetF: ['Lovely to see you again, dear! The pups were asking about you.', 'Oh, {pet} looks so loved. You\u2019re a wonderful owner.'],
    greetB: ['My dear friend! If every owner was like you, my pens would be empty!', 'Come here, you two! Big hugs for you and {pet}.'],
    busy: 'Oh, these little ones need me right now! Maybe another time, dear.',
    tips: ['The pens change every day, so come back to meet new friends!', 'Your family pets join you for free when you reach their goals. Check the Family Corner!'] }
];
// Old Man Grumbleton: grumpy-funny neighbour with Brutus the bulldog. Friendship only grows with treats for Brutus (secret).
DEFS.push({ id: 'grumble', name: 'Old Man Grumbleton', role: 'Grumpy neighbour', area: 'town', grumpy: true, emo: '\uD83D\uDC74', col: '#78716c',
  model: { shirt: '#78716c', hair: '#f1f5f9', pants: '#57534e', flatcap: '#4b5563', frown: 1, brows: '#f1f5f9', mustache: '#f1f5f9', cane: 1 },
  pet: { sp: 'bulldog', name: 'Brutus', col: ['#d6a66a', '#fff4e6'], acc: { neck: 'redcollar' } }, speed: 0.6, loop: true, start: 0, petCap: 2.6, noLeash: true, petFront: true,
  route: [[-18.6, 9.45, 10, 'sit'], [-16.2, 12.3], [-21.5, 12.6, 3], [-25, 11.5], [-25, 9.7], [-21.5, 10.2]],
  persona: 'Grumpy, loud and secretly lonely. Thinks Brutus is the greatest guard dog alive (Brutus is scared of squirrels).', gift: 'grumpycap' });
const GRUMP = {
  greet: [['What do YOU want?'], ['Get off my lawn!'], ['Brutus, sic \u2019em!', 1], ['Hmph. Another one. Don\u2019t touch my roses.'], ['I was napping. NAPPING!'], ['Do I look like I want company? DO I?'],
    ['Back in my day, nobody bothered anybody!'], ['Brutus! Show this nosy kid the gate!', 1], ['Shoo! Scram! Skedaddle!'], ['If you\u2019re selling cookies, I\u2019m not buying. Unless they\u2019re oatmeal. NO! Not buying!']],
  dog: [['Nice? NICE?! Brutus is a trained guard dog! \u2026He\u2019s scared of squirrels, but still!'], ['Brutus only likes two things: Meaty Treats and squeaky bones. NOT YOU.'], ['Don\u2019t pet him! He drools. VIOLENTLY.'],
    ['Brutus! Show this kid what you think of \u201cnice\u201d!', 1], ['He\u2019s not nice. He\u2019s PERFECT. There\u2019s a difference.']],
  pd: ['Brutus doesn\u2019t do PLAYDATES.', 'A playdate? HA! Brutus only plays with his own shadow. And he\u2019s winning.', 'PLAYDATE?! Get off my lawn!', 'The only date Brutus has is with his nap. Scram!'],
  tier: ['Not welcome', 'Tolerated', 'Hmph', 'Almost liked', 'Secretly fond', 'Grumpy best friend'],
  up: ['', '\u2026Hmph. Brutus didn\u2019t hate that. Doesn\u2019t mean I like you.', 'You again? Brutus wagged. WAGGED. Don\u2019t let it go to your head.', 'Fine. FINE. You can stand on my lawn. Just the edge.', 'I suppose you\u2019re\u2026 not the worst kid in town. Don\u2019t tell anyone I said that.'],
  best: ['Oh, it\u2019s you. \u2026Good to see you, kid. Don\u2019t tell anyone.', 'Brutus! Your buddy\u2019s here! \u2026What? I\u2019m not smiling. It\u2019s gas.', 'Get off my lawn! \u2026Kidding. Heh. Sit down, sit down.'],
  bestDog: ['He IS a nice dog. The nicest. Don\u2019t tell the mailman.', 'Brutus thinks your pet is the coolest. So do I. A little.']
};
const GRUMP_MAX = 15, TREAT_CD = 3600 * 1000;
function pickNR(n, key, list) { // random pick that never repeats the previous one
  let i = Math.floor(Math.random() * list.length); if (list.length > 1 && i === n['last_' + key]) i = (i + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
  n['last_' + key] = i; return list[i];
}
const GIFT_N = { cupcake: 2, steak: 2 };
const QUESTS = {
  happy: { ask: 'Could you show me a really happy pet? Get {pet} to Overjoyed (super happy) and come say hi!', short: 'Bring me an Overjoyed pet',
    base: () => 0, done: (c) => !!c.p && G.mood(c.p) >= 85, prog: (c) => c.p ? Math.round(G.mood(c.p)) + '/85 happiness' : 'no pet with you' },
  games: { ask: 'Training challenge! Play any mini game at the Pet Park today, then come back!', short: 'Play a mini game',
    base: () => sv().stats.games || 0, done: (c, q) => (sv().stats.games || 0) > q.base, prog: () => 'not yet' },
  walk: { ask: 'Take your pets on a nice 100 metre walk around town. Fresh air is good for everyone!', short: 'Walk 100 m with your pets',
    base: () => sv().stats.walk || 0, done: (c, q) => (sv().stats.walk || 0) - q.base >= 100, prog: (c, q) => Math.min(100, Math.round((sv().stats.walk || 0) - q.base)) + '/100 m' },
  show: { ask: 'Enter the Pet Show today and get a ribbon! Show the judges what {pet} can do!', short: 'Enter the Pet Show',
    base: () => sv().stats.shows || 0, done: (c, q) => (sv().stats.shows || 0) > q.base, prog: () => 'not yet' }
};

/* ---------------- state helpers ---------------- */
function today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function st(id) { const s = sv(); s.npc = s.npc || {}; return s.npc[id] = s.npc[id] || { fr: 0, day: '', pd: 0, gift: 0, q: null }; }
const hearts = (id) => Math.min(5, Math.floor(st(id).fr / 3));
const TIER = ['Just met', 'Friendly', 'Pal', 'Good friend', 'Close friend', 'Best friend'];
function ctx() {
  const s = sv(), p = G.petById(s.active[0]) || null;
  return { p, pet: p ? p.name : 'your pet', sp: p ? GP.SPECIES[p.sp] : null };
}
function fill(t, c) { return String(t).replace(/\{pet\}/g, c.pet); }
function petComment(c) {
  const p = c.p; if (!p) return 'No pet with you today? Pick one in PETS and bring them along!';
  const m = G.mood(p), kind = { dog: 'pup', cat: 'kitty', rat: 'rat', bird: 'bird', fish: 'fish', bunny: 'bunny', hamster: 'hamster', tortoise: 'tortoise', hedgehog: 'hedgehog', robodog: 'robot pup', dragon: 'dragon', pony: 'pony' }[c.sp.kind] || 'pet';
  if (p.n.h < 35) return 'I think I hear ' + p.name + '\u2019s tummy rumbling. Snack time?';
  if (p.n.c < 35) return p.name + ' could use a bubble bath. Sudsy Sam at the Vet & Groomer can help!';
  if (p.n.e < 28) return p.name + ' looks sleepy. A nap at home would help.';
  if (m < 45) return p.name + ' seems a bit down. A game of fetch always helps!';
  if (m >= 85) return [p.name + ' looks so happy today!', 'Look at ' + p.name + '\u2019s happy little face!'][Math.floor(Math.random() * 2)];
  if (GP.stage(p.lv) === 'Baby') return 'Aww, baby ' + p.name + ' is so tiny and cute!';
  return p.name + ' is such a good ' + kind + '!';
}

/* ---------------- build ---------------- */
function bubble(n) {
  const s = W.textSprite('\uD83D\uDCAC ' + n.def.name, { size: 34, h: 0.42, bg: 'rgba(255,250,243,.96)', color: '#3a1747', border: n.def.col });
  s.position.set(0, 2.45, 0); s.visible = false; n.ch.g.add(s); n.bub = s;
}
NPC.init = function () {
  const statics = { kiki: [W.gameHost, 30, -11.4, 0], penny: [W.shopKeeper, 9.0, -1, -Math.PI / 2], pawla: [W.vetNpc, -2.5, -4.4, 0], hazel: [W.adoptNpc, 0, 0.5, 0] };
  // groomer next to the grooming tub
  const vA = W.areas.vet, sam = MD.person({ shirt: '#99f6e4', hair: '#a16207', apron: '#38bdf8' }); sam.g.position.set(5.9, 0, -2.5); vA.g.add(sam.g);
  vA.obs.push({ t: 'c', x: 5.9, z: -2.5, r: 0.4 }); statics.sam = [sam, 5.9, -2.5, -0.5];
  DEFS.forEach((d, i) => {
    const A = W.areas[d.area]; const n = { def: d, i, area: d.area, yaw: 0, sp: 0, spd: 0, wait: 0, talk: false, pd: false, wave: 0, blockT: 0, stuckT: 0, gi: 0, ti: i * 3 };
    if (d.staff) {
      const s = statics[d.id]; n.ch = s[0]; n.x = s[1]; n.z = s[2]; n.yaw = n.baseYaw = s[3]; n.reach = d.id === 'kiki' ? 2.9 : 2.7;
    } else {
      n.ch = MD.person(d.model); A.g.add(n.ch.g); n.reach = 2.4;
      n.wi = (d.start + 1) % d.route.length; n.dir = 1; const p0 = d.route[d.start]; n.x = p0[0]; n.z = p0[1];
      const nx = d.route[n.wi]; n.yaw = yawOf(nx[0] - n.x, nx[1] - n.z);
      const P = MD.pet({ sp: d.pet.sp, col: d.pet.col, lv: 7, acc: d.pet.acc }); A.g.add(P.g);
      n.pet = { P, x: n.x - Math.sin(n.yaw) * 1, z: n.z - Math.cos(n.yaw) * 1, yaw: n.yaw, sp: 0, spd: 0, idle: 2 };
      if (!d.noLeash) { const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(6), 3));
        n.leash = new T.Line(geo, new T.LineBasicMaterial({ color: '#7c2d12' })); n.leash.frustumCulled = false; A.g.add(n.leash); }
      if (p0[3] === 'sit') { n.yaw = 0; n.wait = 4; n.sitting = true; n.sitK = 1; n.pet.yaw = 0; }
      n.lastCharge = -1e9;
    }
    n.ch.g.position.set(n.x, 0, n.z); n.ch.g.rotation.y = n.yaw;
    bubble(n); NPC.list.push(n);
  });
  NPC.byId = (id) => NPC.list.find((n) => n.def.id === id);
  const gb = NPC.byId('grumble'); if (gb && st('grumble').fr >= GRUMP_MAX) gb.ch.setSmile(true);
};

/* ---------------- movement ---------------- */
// Steering: the body turns smoothly toward where it wants to go and always moves along the way it faces,
// slowing down (or turning on the spot) when the turn is sharp. So it can never walk backwards or slide sideways.
function steer(o, A, tx, tz, dt, cap, rad, k) {
  const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz);
  let want = 0;
  if (d > 0.12) { turn(o, yawOf(dx, dz), dt, k || 8); want = Math.min(cap, d * 2.6) * Math.max(0, Math.cos(ang(yawOf(dx, dz) - o.yaw))); }
  return advance(o, A, want, dt, rad);
}
function advance(o, A, want, dt, rad) {
  o.spd += (want - o.spd) * Math.min(1, dt * 5);
  if (o.spd < 0.02) { o.spd = Math.max(0, o.spd); o.sp += (0 - o.sp) * Math.min(1, dt * 8); return 0; }
  const fx = Math.sin(o.yaw), fz = Math.cos(o.yaw), r = W.move(A, o.x, o.z, fx * o.spd * dt, fz * o.spd * dt, rad);
  const moved = Math.hypot(r[0] - o.x, r[1] - o.z); o.x = r[0]; o.z = r[1];
  o.sp = moved / Math.max(dt, 1e-3);
  return moved;
}
function blockers(n) {
  const out = []; if (G.inGame() && GS.me.area === n.area) out.push([GS.me.x, GS.me.z]);
  for (const k in GS.av) { const a = GS.av[k]; if (k !== GS.pid && a.init && a.ch.g.visible) out.push([a.x, a.z]); }
  NPC.list.forEach((m) => { if (m !== n && m.area === n.area) out.push([m.x, m.z]); });
  return out;
}
function nextWp(n) {
  const R = n.def.route;
  if (n.def.loop) n.wi = (n.wi + 1) % R.length;
  else { if (n.wi + n.dir >= R.length || n.wi + n.dir < 0) n.dir *= -1; n.wi += n.dir; }
}
function tickWalker(n, dt, A) {
  const me = GS.me, nearMe = G.inGame() && me.area === n.area ? Math.hypot(me.x - n.x, me.z - n.z) : 99;
  const targeted = GS.goal && GS.goal.npc === n;
  if (n.talk || n.pd || targeted) {
    n.sitting = false; advance(n, A, 0, dt, 0.35);
    if (n.pd && GS.npcPd) turn(n, yawOf(GS.npcPd.mx - n.x, GS.npcPd.mz - n.z), dt, 6);
    else if (nearMe < 8) turn(n, yawOf(me.x - n.x, me.z - n.z), dt, 6);
  } else if (n.wait > 0) {
    n.wait -= dt; advance(n, A, 0, dt, 0.35);
    if (n.wait <= 0) n.sitting = false;
    if (n.sitting) turn(n, 0, dt, 3); // sit on the porch bench facing the street
    else if (nearMe < 3.2) turn(n, yawOf(me.x - n.x, me.z - n.z), dt, 4); // glance at the player
    else if (n.lookYaw != null) turn(n, n.lookYaw + Math.sin(W.time * 0.6 + n.i) * 0.5, dt, 2);
  } else {
    const wp = (n.detour && n.detour[0]) || n.def.route[n.wi], dx = wp[0] - n.x, dz = wp[1] - n.z, d = Math.hypot(dx, dz);
    if (d < (n.detour ? 0.5 : 0.6)) {
      if (n.detour) { n.detour.shift(); if (!n.detour.length) n.detour = null; }
      else { const pz = wp[2]; if (pz) n.wait = pz * (0.7 + Math.random() * 0.6); else if (Math.random() < 0.15) n.wait = 1 + Math.random() * 1.5; n.lookYaw = n.yaw; n.sitting = wp[3] === 'sit'; nextWp(n); }
      n.stuckT = 0;
    } else {
      const want0 = yawOf(dx, dz); turn(n, want0, dt, 5);
      const fx = Math.sin(n.yaw), fz = Math.cos(n.yaw), rad = n.detour ? 0.65 : 1.15;
      let blocked = null;
      for (const b of blockers(n)) { const bx = b[0] - n.x, bz = b[1] - n.z, bd = Math.hypot(bx, bz); if (bd < rad && bd > 1e-3 && (bx * fx + bz * fz) / bd > 0.45) { blocked = b; break; } }
      let want = n.def.speed * Math.max(0, Math.cos(ang(want0 - n.yaw)));
      if (blocked) {
        want = 0; n.blockT += dt;
        if (n.blockT > 1.0) { // walk around whatever is in the way (same side for everyone, so two walkers pass each other)
          const route = n.def.route[n.wi];
          if (Math.hypot(route[0] - blocked[0], route[1] - blocked[1]) < 1.4) { n.detour = null; nextWp(n); }
          else {
            n.detour = null;
            for (const sd of [1, -1]) {
              const px = fz * sd, pz = -fx * sd, a = [blocked[0] + px * 1.3 - fx * 0.3, blocked[1] + pz * 1.3 - fz * 0.3], c = [blocked[0] + px * 1.3 + fx * 1.0, blocked[1] + pz * 1.3 + fz * 1.0];
              if (W.isFree(A, a[0], a[1], 0.4) && W.isFree(A, c[0], c[1], 0.4)) { n.detour = [a, c]; break; }
            }
            if (!n.detour) nextWp(n);
          }
          n.blockT = 0;
        }
      } else n.blockT = 0;
      const moved = advance(n, A, want, dt, 0.35);
      if (want > 0.3 && n.spd > 0.3 && moved < n.spd * dt * 0.3) { n.stuckT += dt; if (n.stuckT > 1.2) { n.detour = null; nextWp(n); } if (n.stuckT > 4) { const f = W.freeNear(A, wp[0], wp[1], 0.4); n.x = f[0]; n.z = f[1]; n.stuckT = 0; } }
      else if (moved > 0) n.stuckT = 0;
    }
  }
  n.ch.g.position.set(n.x, 0.05, n.z); n.ch.g.rotation.y = n.yaw;
  if (n.wave > 0) n.wave -= dt;
  n.ch.anim(dt, n.sp, n.wave > 0);
  if (n.sitK != null) { // seated pose blends in once he faces the street
    const want = n.sitting && Math.abs(ang(n.yaw)) < 0.35 ? 1 : 0; n.sitK += (want - n.sitK) * Math.min(1, dt * 5);
    if (n.sitK > 0.01) { n.ch.legs.forEach((l) => { l.rotation.x += (-1.45 - l.rotation.x) * n.sitK; }); n.ch.g.position.y = 0.05 - 0.17 * n.sitK; }
  }
  tickPet(n, dt, A);
}
function tickPet(n, dt, A) {
  const o = n.pet; if (!o) return;
  if (n.pd && GS.npcPd) pdMove(o, 1, dt, A);
  else if (o.charge) chargeStep(n, o, dt, A);
  else {
    const fx = Math.sin(n.yaw), fz = Math.cos(n.yaw), side = 0.55, back = n.def.petFront ? -0.95 : 0.95, tx = n.x - fx * back + fz * side, tz = n.z - fz * back - fx * side;
    const d = Math.hypot(tx - o.x, tz - o.z);
    if (d > 6) { const f = W.freeNear(A, tx, tz, 0.25); o.x = f[0]; o.z = f[1]; o.spd = 0; o.sp = 0; }
    if (d > 0.3) steer(o, A, tx, tz, dt, n.def.petCap || 3.8, 0.2, 9);
    else {
      advance(o, A, 0, dt, 0.2);
      const tgt = n.talk ? yawOf(GS.me.x - o.x, GS.me.z - o.z) : n.yaw; turn(o, tgt, dt, 3);
      if (n.talk || n.wait > 0) { o.idle -= dt; if (o.idle < 0 && !o.P.act) { o.idle = 2.5 + Math.random() * 3; const r = Math.random(); o.P.play(n.talk && r < 0.5 ? 'happy' : r < 0.6 ? 'sniff' : 'sit', r < 0.6 ? 1.4 : 2.2); } }
    }
  }
  o.P.g.position.set(o.x, 0.05, o.z); o.P.g.rotation.y = o.yaw; o.P.anim(dt, o.sp);
  // leash: owner's left hand to the collar
  if (n.leash) {
    n.leash.visible = !(n.pd && GS.npcPd);
    if (n.leash.visible) {
      const pa = n.leash.geometry.attributes.position, hx = n.x - 0.33 * Math.cos(n.yaw), hz = n.z + 0.33 * Math.sin(n.yaw);
      const v = NPC._v || (NPC._v = new T.Vector3()); o.P.att.neck.getWorldPosition(v);
      pa.setXYZ(0, hx, 0.62, hz); pa.setXYZ(1, v.x, v.y, v.z); pa.needsUpdate = true;
    }
  }
}
function tickStaff(n, dt) {
  const me = GS.me, near = G.inGame() && me.area === n.area ? Math.hypot(me.x - n.x, me.z - n.z) : 99;
  let tgt = n.baseYaw;
  if (n.talk || near < 4.5) { const y = yawOf(me.x - n.x, me.z - n.z), off = clamp(ang(y - n.baseYaw), -1.5, 1.5); tgt = n.baseYaw + off; }
  turn(n, tgt, dt, n.talk ? 6 : 3); n.ch.g.rotation.y = n.yaw;
  if (n.wave > 0) n.wave -= dt;
  n.ch.anim(dt, 0, n.wave > 0 || (!n.talk && Math.sin(W.time * 0.7 + n.i) > 0.9));
}
NPC.tick = function (dt) {
  if (!NPC.list.length || !W.cur) return;
  const A = W.cur, free = G.inGame() && G.freeToAct();
  if (GS.npcPd) GS.npcPd.t += dt;
  NPC.list.forEach((n) => {
    if (n.area !== A.id) return;
    if (n.def.staff) tickStaff(n, dt); else tickWalker(n, dt, A);
    n.bub.visible = free && GS.promptNpc !== n && Math.hypot(GS.me.x - n.x, GS.me.z - n.z) <= n.reach; // the TALK prompt replaces the bubble for the main target
  });
  if (GS.npcPd) pdTick(dt);
  grumpTick(dt, A);
};
NPC.nearest = function (x, z) {
  let best = null, bd = 1e9; if (!W.cur) return null;
  NPC.list.forEach((n) => { if (n.area !== W.cur.id) return; const d = Math.hypot(n.x - x, n.z - z); if (d <= n.reach && d < bd) { bd = d; best = n; } });
  return best ? { n: best, d: bd } : null;
};
NPC.hit = function (sx, sy) {
  if (!W.cur) return null;
  for (const n of NPC.list) {
    if (n.area !== W.cur.id) continue;
    if (W.hitObj(sx, sy, n.ch.g)) return n;
    if (n.bub.visible) { const p = W.project(n.x, 2.45, n.z); if (p.vis && Math.hypot(p.x - sx, p.y - sy) < 50) return n; }
  }
  return null;
};

/* ---------------- dialogue ---------------- */
function picHtml(n) {
  let h = '<div id="talkPic" style="background:' + n.def.col + '">' + n.def.emo + '</div>';
  return h;
}
function render(n, text, choices) {
  const d = n.def, h = hearts(d.id), box = $('talkBox');
  box.style.setProperty('--c', d.col);
  $('talkHead').innerHTML = picHtml(n) + '<div id="talkWho"><b>' + esc(d.name) + '</b><small>' + esc(d.role) + '</small><span class="hearts" title="Friendship">' + '\u2665'.repeat(h) + '<i>' + '\u2665'.repeat(5 - h) + '</i> ' + (d.grumpy ? GRUMP.tier : TIER)[h] + '</span></div>' +
    (d.pet ? '<img id="talkPet" src="' + G.portrait({ sp: d.pet.sp, col: d.pet.col, lv: 7, acc: d.pet.acc }) + '" alt="" title="' + esc(d.pet.name) + '">' : '') +
    '<button id="talkX" type="button" aria-label="Close">\u2715</button>';
  $('talkText').textContent = text;
  GS.talk.choices = choices;
  $('talkBtns').innerHTML = choices.map((c, i) => '<button type="button" class="btn ' + (c.cls || '') + '" data-i="' + i + '">' + c.t + '</button>').join('');
  $('talkBtns').dataset.n = choices.length;
}
function menu(n) {
  const d = n.def, out = [];
  if (d.grumpy) return grumpMenu(n);
  if (d.staff) out.push({ t: d.menu, a: browse, cls: 'primary' });
  out.push({ t: '\uD83D\uDCA1 ANY TIPS?', a: tips, cls: 'blue' });
  if (d.quest) { const q = st(d.id).q; if (!q || q.day !== today()) out.push({ t: '\uD83D\uDCCB ANY JOBS?', a: quest, cls: 'green' }); else if (!q.done) out.push({ t: '\uD83D\uDCCB MY JOB', a: quest, cls: 'green' }); }
  out.push({ t: d.staff ? '\uD83D\uDC9E PLAYDATE?' : '\uD83D\uDC9E PLAYDATE!', a: playdate, cls: d.staff ? 'alt' : 'primary' });
  out.push({ t: '\uD83D\uDC4B BYE!', a: () => NPC.close(), cls: 'alt' });
  return out;
}
function say(n, text) { render(n, text, menu(n)); }
function greeting(n) {
  const d = n.def, h = hearts(d.id), c = ctx(), s = st(d.id);
  if (d.grumpy) return grumpGreet(n);
  const pool = h >= 3 ? d.greetB : h >= 1 ? d.greetF : d.greet; let t = fill(pool[n.gi++ % pool.length], c);
  if (d.id === 'pawla' && c.p) t += ' ' + petComment(c);
  else if (Math.random() < 0.65 || !c.p) t += ' ' + fill(petComment(c), c);
  if (h >= 3 && !s.gift && d.gift) { // friendship reward (one time)
    const it = GP.ITEMS[d.gift], inv = sv().inv, uniq = it.cat === 'toy' || it.cat === 'acc';
    s.gift = 1;
    if (uniq && inv[d.gift]) { G.addCoins(60); t += ' We\u2019re such good friends now, here\u2019s 60 coins for you!'; G.toast('\uD83C\uDF81 ' + d.name + ' gave you 60 coins!'); }
    else { inv[d.gift] = (inv[d.gift] || 0) + (GIFT_N[d.gift] || 1); t += ' We\u2019re such good friends now, I got you a ' + it.name + '!'; G.toast('\uD83C\uDF81 ' + d.name + ' gave you a ' + it.icon + ' ' + it.name + '!'); Snd.fx('treasure'); }
  }
  return t;
}
function tips(n) {
  const d = n.def, c = ctx(), all = d.tips.concat(TIPS); let t;
  const k = n.ti++ % (all.length + 1);
  if (k === 2) t = petComment(c); else t = fill(all[k > 2 ? k - 1 : k], c);
  if (hearts(d.id) >= 2 && Math.random() < 0.3) t += ' Just between friends: ' + fill(d.tips[(n.ti + 1) % d.tips.length], c).replace(/^./, (m) => m.toLowerCase());
  say(n, t); Snd.fx('click');
}
function browse(n) {
  const id = n.def.id; NPC.close();
  if (id === 'penny') G.UI.shop('food'); else if (id === 'pawla') G.UI.vet('vet'); else if (id === 'sam') G.UI.vet('groom'); else if (id === 'hazel') G.UI.adopt(null); else if (id === 'kiki') G.UI.games(false);
}
function quest(n) {
  const d = n.def, s = st(d.id), Q = QUESTS[d.quest], c = ctx(), t0 = today();
  if (!s.q || s.q.day !== t0) {
    render(n, fill(Q.ask, c) + ' I\u2019ll give you ' + QUEST_COINS + ' coins!', [
      { t: '\u2705 SURE!', cls: 'green', a: () => { s.q = { day: t0, base: Q.base(), done: 0 }; G.persist(); say(n, 'Yay, thank you! Come back and talk to me when it\u2019s done.'); Snd.fx('sparkle'); G.toast('\uD83D\uDCCB Job: ' + Q.short + ' (' + d.name + ')'); } },
      { t: '\u23F3 MAYBE LATER', cls: 'alt', a: () => say(n, 'No problem! The offer\u2019s open all day.') }]);
    return;
  }
  if (s.q.done) { say(n, 'Thanks again for today! Come back tomorrow for a new job.'); return; }
  if (Q.done(c, s.q)) {
    s.q.done = 1; s.fr += 2; G.addCoins(QUEST_COINS); if (c.p) { G.bump(c.p, 'f', 6); G.addXP(c.p, 6); }
    G.persist(); Snd.fx('treasure'); n.wave = 1.4; G.toast('\uD83C\uDF89 Job done! +' + QUEST_COINS + ' coins \u00b7 ' + d.name + ' \u2665');
    say(n, 'You did it! Here are your ' + QUEST_COINS + ' coins. You\u2019re the best!');
  } else say(n, 'Still working on it? (' + Q.short + ': ' + Q.prog(c, s.q) + ') You\u2019ve got this!');
}
function playdate(n) {
  const d = n.def, s = st(d.id), c = ctx();
  if (d.staff) { say(n, d.busy); return; }
  if (!c.p || !GS.p3[c.p.id]) { say(n, 'Bring a pet along and ' + d.pet.name + ' would love a playdate!'); return; }
  const left = PD_COOLDOWN - (Date.now() - (s.pd || 0));
  if (left > 0) { say(n, d.pet.name + ' is still tuckered out from our last playdate! Come back in ' + Math.max(1, Math.ceil(left / 60000)) + ' min.'); return; }
  NPC.close(true);
  startPd(n, c.p);
}
NPC.talk = function (n) {
  if (!n || GS.talk || GS.npcPd || !G.inGame()) return false;
  if (typeof n === 'string') n = NPC.byId(n); if (!n) return false;
  GS.goal = null; GS.joyReset && GS.joyReset(); GS.me.sp = 0;
  n.talk = true; n.wave = 1.2; GS.talk = { n, t0: performance.now() };
  const s = st(n.def.id), t0 = today(); if (s.day !== t0) { s.day = t0; if (!n.def.grumpy) s.fr += 1; } // chatting never softens Grumbleton
  n.sitting = false;
  say(n, greeting(n)); G.persist();
  $('talk').classList.remove('hidden'); Snd.fx('join');
  return true;
};
NPC.close = function (keep) {
  const t = GS.talk; if (!t) return; GS.talk = null; $('talk').classList.add('hidden');
  if (!keep) { t.n.talk = false; if (!t.n.def.staff) t.n.wait = Math.max(t.n.wait, 0.8); }
};
NPC.choose = function (i) { const t = GS.talk; if (!t || !t.choices || !t.choices[i]) return; t.choices[i].a(t.n); };
(function talkUI() {
  // ignore the tail of the tap that opened the dialogue (TALK button is pressed on pointerdown), so it can't hit a reply by accident
  const fresh = () => !GS.talk || performance.now() - GS.talk.t0 < 450;
  $('talk').addEventListener('pointerdown', (e) => { if (e.target === $('talk')) { e.preventDefault(); if (!fresh()) NPC.close(); } });
  $('talkBox').addEventListener('click', (e) => {
    if (fresh()) return;
    if (e.target.closest('#talkX')) { NPC.close(); return; }
    const b = e.target.closest('#talkBtns [data-i]'); if (b) NPC.choose(+b.dataset.i);
  });
})();

/* ---------------- NPC playdates ---------------- */
function startPd(n, p) {
  const A = W.cur, me = GS.me, f = W.freeNear(A, (n.x + me.x) / 2, (n.z + me.z) / 2, 1.0);
  const ball = MD.sph(0.13, '#d9f99d', null, 0, -5, 0); W.scene.add(ball); ball.visible = false;
  GS.npcPd = { n, id: p.id, t: 0, mx: f[0], mz: f[1], a0: Math.atan2(n.z - me.z, n.x - me.x), ball, ht: 0, k: -1 };
  n.pd = true; n.talk = false; n.wave = 1.2; GS.goal = null;
  G.toast('\uD83D\uDC9E Playdate! ' + p.name + ' & ' + n.def.pet.name); Snd.fx('cheer');
}
function pdSpot(pd, who) {
  const t = pd.t, s = who ? 1 : -1, ax = Math.cos(pd.a0), az = Math.sin(pd.a0);
  if (t < 3.4) { const a = pd.a0 + (t < 0.9 ? 0 : (t - 0.9) * 2.3) + (who ? 0 : Math.PI); return [pd.mx + Math.cos(a) * 1.2, pd.mz + Math.sin(a) * 1.2, 5.5]; }
  if (t < 5) return [pd.mx + s * ax * 0.42, pd.mz + s * az * 0.42, 3];
  return [pd.mx + s * ax * 1.1, pd.mz + s * az * 1.1, 3];
}
function pdMove(o, who, dt, A) {
  const pd = GS.npcPd; if (!pd) return; const sp = pdSpot(pd, who), d = Math.hypot(sp[0] - o.x, sp[1] - o.z);
  if (d > 0.18) steer(o, A, sp[0], sp[1], dt, sp[2], 0.2, 10);
  else {
    advance(o, A, 0, dt, 0.2);
    const other = who ? GS.p3[pd.id] : pd.n.pet; if (other) turn(o, yawOf(other.x - o.x, other.z - o.z), dt, 8);
  }
  if (pd.t > 3.6 && pd.t < 3.7 && o.P.act !== 'sniff') o.P.play('sniff', 1.3);
  if (pd.t > 7.6 && !o.P.act) o.P.play('happy', 0.7);
}
NPC.pdPet = function (o, dt) { pdMove(o, 0, dt, W.cur); };
function pdTick(dt) {
  const pd = GS.npcPd, mine = GS.p3[pd.id], theirs = pd.n.pet;
  if (!mine || !theirs || GS.care || GS.mg || W.cur.id !== pd.n.area) { NPC.abort(); return; }
  // toy toss between the two pets
  if (pd.t >= 5 && pd.t < 7.6) {
    const per = 0.85, k = Math.floor((pd.t - 5) / per), u = ((pd.t - 5) % per) / per, from = k % 2 ? theirs : mine, to = k % 2 ? mine : theirs;
    pd.ball.visible = true; pd.ball.position.set(from.x + (to.x - from.x) * u, 0.35 + Math.sin(u * Math.PI) * 1.1, from.z + (to.z - from.z) * u);
    if (k !== pd.k) { pd.k = k; if (k > 0) { from.P.play('catch', 0.5); Snd.fx('catch'); } }
  } else pd.ball.visible = false;
  pd.ht -= dt;
  if ((pd.t > 3.6 && pd.t < 5 || pd.t > 7.6) && pd.ht <= 0) { pd.ht = 0.45; W.fx('heart', (mine.x + theirs.x) / 2, 0.9, (mine.z + theirs.z) / 2, 2, 0.5); }
  if (pd.t >= 9) finishPd();
}
function cleanupPd() { const pd = GS.npcPd; if (!pd) return; W.scene.remove(pd.ball); GS.npcPd = null; pd.n.pd = false; pd.n.wait = 1.5; }
function finishPd() {
  const pd = GS.npcPd, d = pd.n.def, p = G.petById(pd.id), s = st(d.id);
  cleanupPd();
  s.pd = Date.now(); s.fr += 3;
  if (p) { G.bump(p, 'f', 18); G.addXP(p, 10); }
  sv().active.forEach((id) => { const q = G.petById(id); if (q && q !== p) G.bump(q, 'f', 5); });
  const o = p && GS.p3[p.id]; if (o) W.fx('heart', o.x, o.P.hTop + 0.2, o.z, 6, 0.6);
  Snd.fx('learn'); G.persist();
  G.toast('\uD83D\uDC9E Great playdate! ' + (p ? p.name + ' +18 happiness, +10 XP' : '') + ' \u00b7 ' + d.name + ' \u2665');
}
NPC.abort = function () { if (GS.talk) NPC.close(); if (GS.npcPd) cleanupPd(); };
/* ---------------- Old Man Grumbleton ---------------- */
const isBest = () => st('grumble').fr >= GRUMP_MAX;
function grumpGreet(n) {
  if (isBest()) return pickNR(n, 'best', GRUMP.best);
  const l = pickNR(n, 'greet', GRUMP.greet); if (l[1]) setTimeout(() => startCharge(n), 350); else { n.wave = 1.2; Snd.fx('no'); }
  return l[0];
}
function treatItem() { const inv = sv().inv; return inv.steak > 0 ? 'steak' : inv.bone > 0 ? 'bone' : null; }
function grumpMenu(n) {
  const out = [{ t: '\uD83D\uDC36 NICE DOG?', cls: 'blue', a: () => {
    if (isBest()) { say(n, pickNR(n, 'bdog', GRUMP.bestDog)); n.pet.P.play('happy', 1); return; }
    const l = pickNR(n, 'dog', GRUMP.dog); say(n, l[0]); if (l[1]) setTimeout(() => startCharge(n), 300); else { n.pet.P.play('nope', 0.8); Snd.fx('growl'); pop('GRRR\u2026', n.pet, '#b45309'); }
  } }];
  out.push({ t: '\uD83D\uDC9E PLAYDATE!', cls: 'primary', a: () => { if (isBest()) playdate(n); else { say(n, pickNR(n, 'pd', GRUMP.pd)); n.wave = 1.2; Snd.fx('no'); } } });
  const ti = treatItem(); if (ti) out.push({ t: GP.ITEMS[ti].icon + ' TREAT FOR BRUTUS', cls: 'green', a: () => giveTreat(n) });
  out.push({ t: '\uD83C\uDFC3 OKAY OKAY, BYE!', cls: 'alt', a: () => NPC.close() });
  return out;
}
function giveTreat(n) {
  const s = st('grumble'), ti = treatItem(), inv = sv().inv; if (!ti) { say(n, 'Empty pockets? Typical.'); return; }
  if (isBest()) { say(n, 'You\u2019ll spoil him rotten! \u2026Okay, one more.'); inv[ti]--; if (inv[ti] <= 0) delete inv[ti]; n.pet.P.play('happy', 1.5); G.persist(); return; }
  if (Date.now() - (s.tr || 0) < TREAT_CD) { say(n, 'Brutus already had a treat! You trying to make him round? Come back later.'); return; }
  inv[ti]--; if (inv[ti] <= 0) delete inv[ti];
  s.tr = Date.now(); s.fr = Math.min(GRUMP_MAX, s.fr + 3);
  const o = n.pet; o.charge = null; o.P.play(ti === 'steak' ? 'eat' : 'happy', 1.4); W.fx('heart', o.x, o.P.hTop + 0.2, o.z, 3, 0.4); Snd.fx(ti === 'steak' ? 'eat' : 'squeak'); G.persist();
  if (s.fr >= GRUMP_MAX) {
    n.ch.setSmile(true); n.wave = 0; s.gift = 1; inv.grumpycap = 1; G.persist();
    Snd.fx('learn'); G.toast('\uD83C\uDF81 Old Man Grumbleton gave you his \uD83D\uDE24 Grumpy Cap! (rare)');
    render(n, 'Heh\u2026 heh heh. Alright, kid. You win. Here, take my lucky Grumpy Cap. Brutus, go play!', [{ t: '\uD83C\uDF89 YAY! GO PLAY!', cls: 'primary', a: () => {
      const c = ctx(); NPC.close(true); if (c.p && GS.p3[c.p.id]) { s.pd = Date.now(); startPd(n, c.p); } else { n.talk = false; }
    } }]);
    return;
  }
  say(n, GRUMP.up[hearts('grumble')] || GRUMP.up[1]);
}
// cartoon "charge": growl, run at the player, skid to a stop a little way off, snort. The player hops back. No damage, no coin loss.
function startCharge(n) {
  const o = n.pet; if (!o || o.charge || n.pd || isBest() || GS.care || GS.mg || W.cur.id !== n.area || GS.me.area !== n.area) return false;
  o.charge = { ph: 'growl', t: 0, tt: 0, minD: 99 }; n.lastCharge = performance.now(); n.wave = 1.4; o.P.act = null;
  Snd.fx('growl'); pop('GRRR!', o, '#b45309'); return true;
}
function chargeStep(n, o, dt, A) {
  const c = o.charge, me = GS.me, dx = me.x - o.x, dz = me.z - o.z, d = Math.hypot(dx, dz); c.t += dt; c.tt += dt; c.minD = Math.min(c.minD, d);
  if (c.tt > 5 || GS.mg || GS.care || W.cur.id !== n.area) { o.charge = null; return; } // never get stuck
  if (c.ph === 'growl') { advance(o, A, 0, dt, 0.2); turn(o, yawOf(dx, dz), dt, 10); if (!o.P.act) o.P.play('nope', 0.5); if (c.t > 0.55) { c.ph = 'run'; c.t = 0; Snd.fx('bark'); pop('WOOF! WOOF!', o, '#dc2626'); } }
  else if (c.ph === 'run') {
    turn(o, yawOf(dx, dz), dt, 12);
    const fx = Math.sin(o.yaw), fz = Math.cos(o.yaw), ahead = o.x + fx * 0.4;
    if (d <= 1.7 || c.t > 2.2 || ahead > -14.9) { c.ph = 'skid'; c.t = 0; c.v = Math.max(o.spd, 1); Snd.fx('bump'); if (d < 4) nudge(o); }
    else advance(o, A, 5.5 * Math.max(0, Math.cos(ang(yawOf(dx, dz) - o.yaw))), dt, 0.2);
  } else if (c.ph === 'skid') {
    c.v = Math.max(0, c.v - 14 * dt); o.spd = c.v;
    if (c.v > 0.02) { const fx = Math.sin(o.yaw), fz = Math.cos(o.yaw); const r = W.move(A, o.x, o.z, fx * c.v * dt, fz * c.v * dt, 0.2); if (r[0] > -14.9) { c.v = 0; } else { o.sp = Math.hypot(r[0] - o.x, r[1] - o.z) / Math.max(dt, 1e-3); o.x = r[0]; o.z = r[1]; } }
    else o.sp = 0;
    if (Math.random() < 0.5) W.fx('dust', o.x, 0.1, o.z, 1, 0.3);
    if (c.t > 0.4) { c.ph = 'snort'; c.t = 0; o.spd = 0; o.sp = 0; Snd.fx('snort'); pop('HMPH!', o, '#78716c'); W.fx('dust', o.x + Math.sin(o.yaw) * 0.4, 0.3, o.z + Math.cos(o.yaw) * 0.4, 3, 0.2); o.P.play('shake', 0.6); }
  } else { advance(o, A, 0, dt, 0.2); turn(o, yawOf(dx, dz), dt, 6); if (c.t > 0.9) { NPC.lastChargeMin = c.minD; o.charge = null; o.P.play('sit', 1.2); } }
}
function nudge(o) { const me = GS.me, dx = me.x - o.x, dz = me.z - o.z, d = Math.hypot(dx, dz) || 1; NPC.push = { vx: dx / d, vz: dz / d, t: 0.4 }; GS.goal = null; }
const pops = [];
function pop(text, o, col) {
  const sp = W.textSprite(text, { size: 34, h: 0.36, bg: col || '#dc2626', border: '#fff' }); sp.position.set(o.x, (o.P.hTop || 0.6) + 0.5, o.z); W.cur.g.add(sp); pops.push({ sp, t: 0, area: W.cur });
}
function grumpTick(dt, A) {
  for (let i = pops.length - 1; i >= 0; i--) { const q = pops[i]; q.t += dt; q.sp.position.y += dt * 0.6; q.sp.material.opacity = Math.max(0, 1 - q.t / 1.1); if (q.t > 1.1) { q.area.g.remove(q.sp); q.sp.material.map.dispose(); q.sp.material.dispose(); pops.splice(i, 1); } }
  if (NPC.push) { // the player hops back a couple of steps
    const p = NPC.push, me = GS.me, k = p.t / 0.4, v = 5.5 * k; p.t -= dt;
    if (G.inGame() && !GS.mg) { const r = W.move(W.cur, me.x, me.z, p.vx * v * dt, p.vz * v * dt, 0.36); me.x = r[0]; me.z = r[1]; }
    if (p.t <= 0) NPC.push = null;
  }
  const n = NPC.byId && NPC.byId('grumble'), Y = W.grumpYard; if (!n || A.id !== n.area || !Y || !G.inGame()) return;
  const me = GS.me, inYard = me.area === n.area && me.x > Y[0] && me.x < Y[1] + 0.3 && me.z > Y[2] && me.z < Y[3];
  if (inYard && !n.talk && !GS.talk && !GS.npcPd && G.freeToAct() && performance.now() - n.lastCharge > 5000) startCharge(n);
}
NPC.startCharge = (id) => startCharge(NPC.byId(id || 'grumble'));
NPC.GRUMP_MAX = GRUMP_MAX;
NPC.state = st; NPC.hearts = hearts; NPC.DEFS = DEFS; NPC.PD_COOLDOWN = PD_COOLDOWN;
})();
