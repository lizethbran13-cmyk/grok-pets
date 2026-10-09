/* Grok Pets - tiny WebAudio sfx + cheerful music loop */
(function () {
'use strict';
const GP = window.GP;
GP.Snd = (() => {
  let ctx = null, master = null, sfx = null, mus = null, muted = false, musOn = false, nextBar = 0, bar = 0, timer = 0;
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
    mus = ctx.createGain(); mus.gain.value = 0.13; mus.connect(master);
    if (musOn) music(true);
  }
  function tone(f, dur, type, vol, delay, bus, f2) {
    if (!ctx) return;
    const t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, delay, hp) {
    if (!ctx) return; const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(); s.buffer = b; const g = ctx.createGain(); g.gain.value = vol || 0.08; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 1500;
    s.connect(f); f.connect(g); g.connect(sfx); s.start(ctx.currentTime + (delay || 0));
  }
  const FX = {
    click() { tone(880, 0.05, 'square', 0.04); },
    coin() { tone(mf(83), 0.08, 'square', 0.06); tone(mf(88), 0.16, 'square', 0.06, 0.07); },
    buy() { [76, 79, 84].forEach((m, i) => tone(mf(m), 0.12, 'triangle', 0.1, i * 0.07)); },
    no() { tone(220, 0.18, 'sawtooth', 0.06); tone(170, 0.25, 'sawtooth', 0.06, 0.12); },
    eat() { for (let i = 0; i < 4; i++) noise(0.05, 0.1, i * 0.14, 2500); },
    bark() { tone(420, 0.09, 'sawtooth', 0.09, 0, null, 260); tone(460, 0.1, 'sawtooth', 0.08, 0.16, null, 280); },
    meow() { tone(600, 0.35, 'triangle', 0.1, 0, null, 900); tone(900, 0.2, 'triangle', 0.07, 0.3, null, 500); },
    squeak() { tone(1400, 0.07, 'sine', 0.08, 0, null, 2000); tone(1600, 0.08, 'sine', 0.08, 0.1, null, 2200); },
    tweet() { tone(2000, 0.06, 'sine', 0.07, 0, null, 2800); tone(2400, 0.08, 'sine', 0.07, 0.09, null, 3000); },
    bubble() { tone(300, 0.1, 'sine', 0.1, 0, null, 900); tone(400, 0.1, 'sine', 0.08, 0.12, null, 1100); },
    chirp() { tone(700, 0.08, 'triangle', 0.07, 0, null, 500); },
    beep() { tone(990, 0.07, 'square', 0.05); tone(1320, 0.09, 'square', 0.05, 0.08); },
    roar() { tone(180, 0.35, 'sawtooth', 0.09, 0, null, 360); noise(0.3, 0.05, 0, 400); },
    neigh() { tone(700, 0.35, 'sawtooth', 0.05, 0, null, 1100); tone(1000, 0.2, 'triangle', 0.05, 0.3, null, 600); },
    rub() { tone(mf(84), 0.08, 'sine', 0.04); },
    scrub() { noise(0.12, 0.06, 0, 3000); },
    splash() { noise(0.35, 0.12, 0, 800); },
    sparkle() { [88, 91, 95].forEach((m, i) => tone(mf(m), 0.1, 'sine', 0.05, i * 0.05)); },
    throw() { tone(400, 0.2, 'sine', 0.06, 0, null, 900); },
    catch() { tone(mf(79), 0.08, 'square', 0.07); tone(mf(86), 0.12, 'square', 0.07, 0.08); },
    miss() { tone(330, 0.2, 'triangle', 0.07, 0, null, 180); },
    trick() { [72, 76, 79].forEach((m, i) => tone(mf(m), 0.12, 'triangle', 0.09, i * 0.08)); },
    learn() { [72, 76, 79, 84, 88].forEach((m, i) => tone(mf(m), 0.18, 'square', 0.07, i * 0.09)); },
    level() { [67, 72, 76, 79, 84].forEach((m, i) => tone(mf(m), 0.2, 'square', 0.08, i * 0.1)); tone(mf(91), 0.6, 'triangle', 0.1, 0.55); },
    dig() { noise(0.18, 0.12, 0, 600); },
    treasure() { [79, 84, 88, 91].forEach((m, i) => tone(mf(m), 0.16, 'square', 0.08, i * 0.07)); },
    junk() { tone(200, 0.25, 'square', 0.06, 0, null, 120); },
    hatch() { noise(0.15, 0.1, 0, 2000); noise(0.15, 0.1, 0.25, 2000); [72, 79, 84, 91].forEach((m, i) => tone(mf(m), 0.25, 'triangle', 0.1, 0.5 + i * 0.1)); },
    cheer() { noise(0.9, 0.06, 0, 1200); [60, 64, 67, 72].forEach((m, i) => tone(mf(m + 12), 0.25, 'square', 0.06, i * 0.1)); },
    door() { tone(300, 0.25, 'sine', 0.07, 0, null, 600); },
    join() { tone(mf(76), 0.1, 'square', 0.06); tone(mf(83), 0.15, 'square', 0.06, 0.1); },
    leave() { tone(mf(70), 0.12, 'square', 0.05); tone(mf(63), 0.2, 'square', 0.05, 0.12); },
    jump() { tone(300, 0.15, 'square', 0.06, 0, null, 700); },
    bump() { tone(140, 0.2, 'sawtooth', 0.08, 0, null, 80); },
    tick() { tone(1200, 0.03, 'square', 0.04); },
    go() { tone(mf(84), 0.4, 'square', 0.08); },
    zzz() { tone(220, 0.5, 'sine', 0.04, 0, null, 180); }
  };
  // bouncy major-key loop
  const CH = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], MEL = [[76, 0], [79, 1], [81, 2], [79, 3], [76, 4], [72, 6], [74, 7]];
  function schedule() {
    if (!ctx || !musOn) return;
    while (nextBar < ctx.currentTime + 0.6) {
      const bt = 0.22, ch = CH[bar % 4];
      for (let i = 0; i < 8; i++) { const t = nextBar + i * bt - ctx.currentTime; if (t < 0) continue; tone(mf(ch[0] - 12), bt * 0.8, 'triangle', i % 2 ? 0.25 : 0.4, t, mus); if (i % 2 === 1) tone(mf(ch[1 + (i >> 1) % 2]), bt * 0.5, 'square', 0.12, t, mus); }
      if (bar % 2 === 0) MEL.forEach((n) => { const t = nextBar + n[1] * bt - ctx.currentTime; if (t >= 0) tone(mf(n[0] - (bar % 8 >= 4 ? 2 : 0)), bt * 0.9, 'square', 0.1, t, mus); });
      nextBar += 8 * bt; bar++;
    }
  }
  function music(on) { musOn = on; if (on && ctx) { if (nextBar < ctx.currentTime) nextBar = ctx.currentTime + 0.1; clearInterval(timer); timer = setInterval(schedule, 200); } else clearInterval(timer); }
  return {
    init, fx(n) { if (FX[n] && ctx && !muted) try { FX[n](); } catch (e) { /* ignore */ } }, music,
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.7; }, isMuted: () => muted
  };
})();
})();
