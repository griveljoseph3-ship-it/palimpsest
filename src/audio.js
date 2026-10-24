// S5 · Audio generato (WebAudio): suono unico per parola, colpi, ambiente.
export class Sfx {
  constructor() { this.ctx = null; this.vol = 0.8; this.music = 0.5; }
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    this.ctx = new C(); this.master = this.ctx.createGain(); this.master.gain.value = this.vol;
    const comp = this.ctx.createDynamicsCompressor(); this.master.connect(comp); comp.connect(this.ctx.destination);
    this.rev = this.ctx.createConvolver(); this.rev.buffer = this.impulse(2.2); const rg = this.ctx.createGain(); rg.gain.value = 0.28; this.rev.connect(rg); rg.connect(this.master);
    this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate); const nd = this.noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.ambient(); this.startMusic();
  }
  impulse(sec) { const r = this.ctx.sampleRate, b = this.ctx.createBuffer(2, r * sec, r); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); } return b; }
  out(g, wet = true) { g.connect(this.master); if (wet) g.connect(this.rev); }
  env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  noise(t, dur, freq, q, peak, type = 'bandpass') { const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); this.env(g, t, 0.005, peak, dur); s.connect(f); f.connect(g); this.out(g); s.start(t, Math.random()); s.stop(t + dur + 0.1); return f; }
  tone(t, type, f0, f1, dur, peak, wet = true) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = this.ctx.createGain(); this.env(g, t, 0.01, peak, dur); o.connect(g); this.out(g, wet); o.start(t); o.stop(t + dur + 0.1); }
  play(name, x = 1) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    switch (name) {
      case 'glass': // FRAGILE: vetro che incrina
        for (let i = 0; i < 6; i++) this.tone(t + i * 0.025 + Math.random() * 0.02, 'sine', 2400 + Math.random() * 3000, 1800, 0.25, 0.08);
        this.noise(t, 0.18, 5200, 3, 0.35); this.noise(t + 0.06, 0.3, 7800, 8, 0.15); break;
      case 'breath': // CAUTO: respiro che arretra
        this.noise(t, 0.7, 700, 1.2, 0.25, 'lowpass').frequency.exponentialRampToValueAtTime(200, t + 0.7); this.tone(t, 'sine', 330, 196, 0.8, 0.12); break;
      case 'electric': { // CONDUTTIVO: elettricità
        const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 110; const m = this.ctx.createOscillator(); m.frequency.value = 37; const mg = this.ctx.createGain(); mg.gain.value = 90; m.connect(mg); mg.connect(o.frequency);
        const g = this.ctx.createGain(); this.env(g, t, 0.005, 0.18, 0.55); const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 400; o.connect(f); f.connect(g); this.out(g); o.start(t); m.start(t); o.stop(t + 0.7); m.stop(t + 0.7);
        for (let i = 0; i < 5; i++) this.noise(t + Math.random() * 0.4, 0.03, 3000, 2, 0.3); break; }
      case 'step': this.noise(t, 0.05, 2200 + Math.random() * 900, 1.4, 0.035 * x); this.noise(t + 0.01, 0.07, 400, 1, 0.03 * x, 'lowpass'); break; // passo sulla carta
      case 'drip': this.tone(t, 'sine', 1400 + Math.random() * 500, 520, 0.09, 0.05 * x); break; // goccia d'inchiostro che cade
      case 'hover': this.tone(t, 'sine', 900, 1100, 0.06, 0.04, false); break;
      case 'open': this.noise(t, 0.4, 1200, 0.8, 0.15).frequency.exponentialRampToValueAtTime(300, t + 0.4); this.tone(t, 'triangle', 220, 110, 0.5, 0.08); break;
      case 'close': this.noise(t, 0.2, 400, 1, 0.1); break;
      case 'confirm': this.tone(t, 'triangle', 440, 880, 0.15, 0.12); this.noise(t + 0.1, 0.35, 900, 0.7, 0.2); break;
      case 'deny': this.tone(t, 'square', 160, 120, 0.18, 0.06, false); break;
      case 'dry': this.noise(t, 1.0, 2500, 0.5, 0.12, 'highpass'); break; // inchiostro che si secca
      case 'swing': this.noise(t, 0.12, 1500 * x, 1.5, 0.18); break;
      case 'heavy': this.noise(t, 0.25, 600, 1, 0.3); this.tone(t, 'sine', 120, 50, 0.3, 0.35, false); break;
      case 'hit': this.noise(t, 0.08, 900, 1, 0.5); this.tone(t, 'sine', 180, 60, 0.15, 0.4, false); this.noise(t + 0.01, 0.05, 3400, 2, 0.22); break; // colpo + carta che si accartoccia
      case 'splat': this.noise(t, 0.22, 420, 0.8, 0.45, 'lowpass').frequency.exponentialRampToValueAtTime(120, t + 0.22); this.tone(t, 'sine', 140, 45, 0.18, 0.3, false); for (let i = 0; i < 4; i++) this.noise(t + 0.04 + Math.random() * 0.12, 0.03, 1500 + Math.random() * 1500, 3, 0.12); break; // macchia che esplode in inchiostro
      case 'break': this.noise(t, 0.6, 1800, 0.6, 0.6); this.tone(t, 'sine', 90, 40, 0.5, 0.5, false); for (let i = 0; i < 8; i++) this.noise(t + 0.05 + Math.random() * 0.4, 0.05, 2000 + Math.random() * 3000, 4, 0.2); break;
      case 'tear': this.noise(t, 0.5, 2600, 0.9, 0.35).frequency.exponentialRampToValueAtTime(900, t + 0.5); break;
      case 'dodge': this.noise(t, 0.2, 2200, 1.2, 0.15).frequency.exponentialRampToValueAtTime(600, t + 0.2); break;
      case 'hurt': this.tone(t, 'sawtooth', 200, 70, 0.3, 0.15); this.noise(t, 0.2, 500, 1, 0.3); break;
      case 'pulse': this.tone(t, 'square', 70, 50, 0.35, 0.2); this.noise(t, 0.3, 4000, 3, 0.2); break;
      case 'warn': this.tone(t, 'sine', 600, 600, 0.12, 0.06, false); break;
      case 'page': this.noise(t, 0.6, 3000, 0.4, 0.2); break;
      case 'gain': this.tone(t, 'sine', 660, 990, 0.12, 0.05, false); break;
      case 'seal': [262, 330, 392, 523].forEach((f, i) => this.tone(t + i * 0.12, 'triangle', f, f, 1.6, 0.1)); break;
      case 'death': this.tone(t, 'sine', 300, 60, 1.4, 0.25); this.noise(t, 1.2, 600, 0.5, 0.25, 'lowpass'); break;
      case 'voice': for (let i = 0; i < 3; i++) this.tone(t + i * 0.07, 'triangle', 300 + Math.random() * 200 * x, 260, 0.06, 0.035, false); break;
    }
  }
  ambient() { // drone di carta e corde basse, sempre morbido
    const t = this.ctx.currentTime; this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.05 * this.music; this.musicGain.connect(this.master); this.musicGain.connect(this.rev);
    [55, 82.4, 110, 164.8].forEach((f, i) => { const o = this.ctx.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (i - 1.5) * 6;
      const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.05 + i * 0.03; const lg = this.ctx.createGain(); lg.gain.value = 0.4; const g = this.ctx.createGain(); g.gain.value = 0.5; lfo.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(this.musicGain); o.start(t); lfo.start(t); });
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.3; const g = this.ctx.createGain(); g.gain.value = 0.25; s.connect(f); f.connect(g); g.connect(this.musicGain); s.start();
  }
  setMusic(v) { this.music = v; if (this.musicGain) this.musicGain.gain.value = 0.05 * v; if (this.mus) this.mus.bus.gain.value = v; }
  // ---------- Musica generata (v2.0): re minore, livelli che entrano ed escono per stato d'animo ----------
  // Nessun file audio: tutto è sintetizzato qui, quindi niente diritti d'autore.
  startMusic() {
    if (!this.ctx || this.mus) return; const c = this.ctx;
    const bus = c.createGain(); bus.gain.value = this.music; bus.connect(this.master); const wet = c.createGain(); wet.gain.value = 0.55; bus.connect(wet); wet.connect(this.rev);
    const L = {}; for (const k of ['pad', 'bass', 'mel', 'perc', 'ost', 'brass', 'box']) { L[k] = c.createGain(); L[k].gain.value = 0; L[k].connect(bus); }
    this.mus = { bus, L, mood: 'calm', next: c.currentTime + 0.15, step: 0, bar: 0, motif: null, last: 62, bpm: 84 };
    this.setMood('calm', true); this.musTimer = setInterval(() => this.musTick(), 60);
  }
  setMood(m, now) { if (!this.mus) return; const M = this.mus; if (M.mood === m && !now) return; M.mood = m;
    const G = { calm: { pad: 0.5, mel: 0.32, bass: 0.18 }, explore: { pad: 0.42, mel: 0.38, bass: 0.3 }, maze: { pad: 0.22, box: 0.42, bass: 0.16 },
      combat: { pad: 0.3, mel: 0.2, bass: 0.45, perc: 0.55, ost: 0.4 }, boss: { pad: 0.28, mel: 0.16, bass: 0.5, perc: 0.7, ost: 0.5, brass: 0.42 }, none: {} }[m] || {};
    const t = this.ctx.currentTime; for (const k in M.L) M.L[k].gain.setTargetAtTime((G[k] || 0) * 0.5, t, now ? 0.05 : 1.2); }
  musTick() { const M = this.mus, c = this.ctx; if (!M || c.state !== 'running') return; const beat = 60 / M.bpm / 2; // ottavi
    while (M.next < c.currentTime + 0.25) { this.musStep(M.next, beat); M.next += beat; M.step++; } }
  musStep(t, e) { const M = this.mus, st = M.step % 8, boss = M.mood === 'boss', fight = boss || M.mood === 'combat';
    if (st === 0) { M.bar++; if (M.bar % 8 === 1) M.motif = null; }
    const prog = boss ? [50, 51, 50, 48] : M.mood === 'maze' ? [50, 50, 46, 45] : [50, 46, 53, 48]; const root = prog[Math.floor((M.bar - 1) / 2) % 4]; // un accordo ogni due battute
    const minor = root === 50 || root === 45 || root === 51 && !boss; const tri = [root, root + (minor ? 3 : 4), root + 7];
    const f = (n) => 440 * Math.pow(2, (n - 69) / 12); const on = (k) => M.L[k].gain.value > 0.004;
    if (st === 0 && M.bar % 2 === 1 && on('pad')) for (const n of tri) this.musPad(f(n + 12), t, e * 16, M.L.pad);
    if (on('bass') && (st === 0 || (fight && st === 4) || (boss && st % 2 === 0 && Math.random() < 0.4))) this.musPluck(f(root - 12), t, e * (fight ? 1.6 : 3.5), 0.5, 'sine', M.L.bass);
    if (on('ost') && fight) { const o = [0, 7, 12, 7, 3, 7, 12, 15][st]; this.musPluck(f(root + o), t, e * 0.9, 0.16, 'triangle', M.L.ost); }
    if (on('perc') && fight) { if (st === 0 || st === 4 || (boss && st === 6)) this.musKick(t); if (st === 2 || st === 6) this.musSnare(t, boss ? 0.35 : 0.22); if (boss && st % 2 === 1) this.musHat(t); }
    if (on('brass') && st === 0 && M.bar % 2 === 1) this.musBrass(f(root - 12 + 7), f(root), t, e * 7, M.L.brass);
    if (on('mel') && (st % 2 === 0)) { // melodia: un motivo di 2 battute ripetuto e variato per frase
      if (!M.motif) { M.motif = []; let n = 0; for (let i = 0; i < 8; i++) { n += [-2, -1, 0, 1, 1, 2, 3][Math.floor(Math.random() * 7)]; M.motif.push(Math.random() < (fight ? 0.45 : 0.3) ? null : n); } }
      const deg = M.motif[(Math.floor(st / 2) + (M.bar % 2) * 4) % 8]; if (deg != null) { const sc = [0, 2, 3, 5, 7, 8, 10]; const d = ((deg % 7) + 7) % 7, oct = Math.floor(deg / 7); let n = 62 + sc[d] + 12 * oct + (M.bar % 4 === 3 ? 0 : 0); if (st === 0) n = tri.map((q) => q + 12).reduce((a, b) => Math.abs(b - n) < Math.abs(a - n) ? b : a); M.last = n; this.musPluck(f(n), t, e * 3, 0.22, 'triangle', M.L.mel); this.musPluck(f(n + 12), t, e * 1.2, 0.05, 'sine', M.L.mel); } }
    if (on('box') && (st === 0 || st === 3 || st === 5) && Math.random() < 0.75) { const n = tri[Math.floor(Math.random() * 3)] + 24 + (Math.random() < 0.3 ? 2 : 0); this.musPluck(f(n), t, e * 6, 0.12, 'sine', M.L.box); this.musPluck(f(n * 1 + 0.07), t + 0.003, e * 4, 0.04, 'triangle', M.L.box); }
  }
  musPluck(fr, t, dur, peak, type, dest) { if (this.mus) this.mus.notes = (this.mus.notes || 0) + 1; const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = fr; const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05); }
  musPad(fr, t, dur, dest) { const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(g); g.connect(dest);
    for (const d of [-7, 7]) { const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = d; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); } }
  musBrass(f0, f1, t, dur, dest) { const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(1200, t + 0.15); lp.frequency.exponentialRampToValueAtTime(350, t + dur); lp.connect(g); g.connect(dest);
    for (const fr of [f0, f1]) { const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); } }
  musKick(t) { const o = this.ctx.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.22); const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); g.connect(this.mus.L.perc); o.start(t); o.stop(t + 0.35); }
  musSnare(t, p) { const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.7; const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(p, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); s.connect(bp); bp.connect(g); g.connect(this.mus.L.perc); s.start(t, Math.random()); s.stop(t + 0.2); }
  musHat(t) { const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000; const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04); s.connect(hp); hp.connect(g); g.connect(this.mus.L.perc); s.start(t, Math.random()); s.stop(t + 0.06); }
  // piccoli accordi narrativi: parola scritta, combinazione scoperta, fase del boss
  sting(kind) { if (!this.ctx) return; const t = this.ctx.currentTime + 0.02, f = (n) => 440 * Math.pow(2, (n - 69) / 12), d = this.ctx.createGain(); d.gain.value = Math.max(0.25, this.music); d.connect(this.master); d.connect(this.rev);
    const seq = { word: [62, 69, 74], combo: [62, 66, 69, 74, 78], phase: [38, 39, 38], secret: [74, 77, 81, 86], victory: [50, 57, 62, 66, 69, 74] }[kind] || [62];
    seq.forEach((n, i) => { const tt = t + i * (kind === 'phase' ? 0.18 : 0.09); if (kind === 'phase') this.musBrass(f(n), f(n + 7), tt, 1.2, d); else { this.musPluck(f(n), tt, 1.4, 0.2, 'triangle', d); this.musPluck(f(n + 12), tt, 0.6, 0.06, 'sine', d); } }); }
  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  tension(on) { if (this.musicGain) this.musicGain.gain.setTargetAtTime((on ? 0.09 : 0.05) * this.music, this.ctx.currentTime, 1.5); }
}
