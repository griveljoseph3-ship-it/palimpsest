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
    this.ambient();
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
      case 'hover': this.tone(t, 'sine', 900, 1100, 0.06, 0.04, false); break;
      case 'open': this.noise(t, 0.4, 1200, 0.8, 0.15).frequency.exponentialRampToValueAtTime(300, t + 0.4); this.tone(t, 'triangle', 220, 110, 0.5, 0.08); break;
      case 'close': this.noise(t, 0.2, 400, 1, 0.1); break;
      case 'confirm': this.tone(t, 'triangle', 440, 880, 0.15, 0.12); this.noise(t + 0.1, 0.35, 900, 0.7, 0.2); break;
      case 'deny': this.tone(t, 'square', 160, 120, 0.18, 0.06, false); break;
      case 'dry': this.noise(t, 1.0, 2500, 0.5, 0.12, 'highpass'); break; // inchiostro che si secca
      case 'swing': this.noise(t, 0.12, 1500 * x, 1.5, 0.18); break;
      case 'heavy': this.noise(t, 0.25, 600, 1, 0.3); this.tone(t, 'sine', 120, 50, 0.3, 0.35, false); break;
      case 'hit': this.noise(t, 0.08, 900, 1, 0.5); this.tone(t, 'sine', 180, 60, 0.15, 0.4, false); break;
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
  setMusic(v) { this.music = v; if (this.musicGain) this.musicGain.gain.value = 0.05 * v; }
  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  tension(on) { if (this.musicGain) this.musicGain.gain.setTargetAtTime((on ? 0.09 : 0.05) * this.music, this.ctx.currentTime, 1.5); }
}
