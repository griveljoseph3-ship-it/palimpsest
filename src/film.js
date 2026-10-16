// Prologo cinematografico in-engine: inquadrature, movimenti di camera, personaggi animati, letterbox, sottotitoli e voce narrante.
import * as THREE from '../vendor/three.module.js';
import { inked, INK_UNIFORMS } from './art.js';
import * as W from './world.js';

const ease = (t) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, t) => a.clone().lerp(b, t);

// Il romanzo: ogni inquadratura porta una o due battute.
export const SHOTS = [
  { id: 'casa', subs: ['Quarant’anni fa, in una casa sul fiume, una donna di nome Ilde scriveva ogni notte, a lume di candela.', 'Scriveva un libro per sua figlia. La bambina si chiamava Elara.'],
    cam: [V(9, 7, 11), V(4.5, 4.2, 6.5)], look: [V(0, 1.5, 0), V(0, 1.2, 0)] },
  { id: 'pagina', subs: ['Nel libro, Elara era coraggiosa, libera, innocente.', 'Ogni riga era una promessa che Ilde non sapeva dirle a voce.'],
    cam: [V(-1.2, 3.4, 2.6), V(0.6, 2.6, 1.6)], look: [V(0, 0.3, 0), V(0.3, 0.2, -0.2)] },
  { id: 'errore', subs: ['Poi, l’ultima notte, la mano di Ilde tremò.', 'Una parola sola. Sbagliata. Rossa come una ferita: COLPEVOLE.', 'Ilde non visse abbastanza per correggerla.'],
    cam: [V(0.3, 2.4, 1.4), V(0.2, 1.6, 0.9)], look: [V(0.6, 0.2, 0), V(0.8, 0.15, 0)] },
  { id: 'custode', subs: ['Il libro rimase solo, al buio. E un libro solo crede a tutto ciò che c’è scritto.', 'Dall’inchiostro indurito nacque il Custode: la parte della storia che non vuole più cambiare.'],
    cam: [V(0, 3, 9), V(-3, 2.2, 6)], look: [V(0, 1.6, 0), V(0, 2.4, 0)] },
  { id: 'elara', subs: ['Elara è ancora là dentro, prigioniera della sua pagina.', 'Non chiede di essere salvata. Guarda chi prova a riscriverla. E giudica.'],
    cam: [V(3.5, 2.6, 5.5), V(-2.5, 2.2, 4.8)], look: [V(0, 2, 0), V(0, 2.1, 0)] },
  { id: 'penna', subs: ['Molti anni dopo, qualcuno trova la penna di Ilde.', 'Dopo tanto silenzio, l’inchiostro risponde. Quel qualcuno sei tu.'],
    cam: [V(0, 9, 9), V(2.2, 2.4, 3.6)], look: [V(0, 0.5, 0), V(0, 1.2, 0)] },
  { id: 'lumi', subs: ['Ma ogni errore lascia una macchia. Le macchie si cercano, si uniscono.', 'La chiameranno Lumi. Ricorderà ogni tuo tentativo fallito.'],
    cam: [V(-1, 2.6, 6), V(0.2, 1.9, 4.4)], look: [V(0.4, 0.6, 0), V(0.6, 0.6, 0)] },
  { id: 'fine', subs: ['Il libro ti respingerà. Le pagine si chiuderanno. Le parole si nasconderanno.', 'Apri la porta di Elara. Spezza il Custode. Raggiungi il sigillo.', 'Cancella quella parola. Riscrivi la fine.'],
    cam: [V(0, 2.8, 8.5), V(0, 6, 16)], look: [V(0, 1.5, -4), V(0, 1.2, -6)] },
];
const SUB_T = (s) => Math.max(3.2, s.length * 0.068 + 1.1);
for (const sh of SHOTS) { sh.times = sh.subs.map(SUB_T); sh.dur = sh.times.reduce((a, b) => a + b, 0); }
export const FILM_LEN = SHOTS.reduce((a, s) => a + s.dur, 0);

function bookTex(state) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 640; const g = c.getContext('2d');
  g.fillStyle = '#efe4ca'; g.fillRect(0, 0, 1024, 640); const gr = g.createLinearGradient(452, 0, 572, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(60,40,20,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(452, 0, 120, 640);
  g.fillStyle = 'rgba(30,20,14,.75)'; g.font = 'italic 26px Georgia';
  const L = ['Elara correva sul fiume', 'senza paura del buio,', 'e il buio le cedeva', 'il passo, riga dopo', 'riga. Non aveva colpa', 'di niente: era solo', 'una bambina che', 'imparava a volare.'];
  const n = Math.floor(state.lines); for (let i = 0; i < Math.min(n, 8); i++) g.fillText(L[i], 60, 90 + i * 52);
  g.font = 'italic 24px Georgia'; for (let i = 0; i < 9; i++) g.fillText('~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~'.slice(0, 12 + (i * 5) % 9), 580, 90 + i * 52);
  if (state.verdict > 0) { g.save(); g.globalAlpha = Math.min(1, state.verdict); g.translate(770, 420); g.rotate(-0.07); g.fillStyle = '#8a1a10'; g.font = 'bold 74px Georgia'; g.textAlign = 'center'; g.fillText('COLPEVOLE', 0, 0);
    g.fillStyle = '#16110d'; g.globalAlpha = 0.85 * Math.min(1, state.verdict); g.beginPath(); g.arc(-200, -50, 14, 0, 6.28); g.fill(); g.beginPath(); g.ellipse(-200, -20, 4, 26 * Math.min(1, state.verdict), 0, 0, 6.28); g.fill(); g.restore(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Film {
  constructor(paper) {
    const s = this.scene = new THREE.Scene(); s.background = new THREE.Color(0x0c0907); s.fog = null;
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
    // scrivania
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: 0x3a2a1c, map: paper })); desk.rotation.x = -Math.PI / 2; s.add(desk); this.desk = desk;
    // libro aperto
    this.book = new THREE.Group(); s.add(this.book); this.bookState = { lines: 0, verdict: 0 }; this.tex = bookTex(this.bookState);
    const cover = inked(new THREE.BoxGeometry(4.4, 0.12, 2.9), { color: 0x4a1d14, y0: 0, y1: 0.2 }); cover.position.y = 0.06; this.book.add(cover);
    const pages = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 2.75), [0, 0, 1, 0, 0, 0].map((k) => k ? new THREE.MeshBasicMaterial({ map: this.tex }) : new THREE.MeshBasicMaterial({ color: 0xd9ccb0 }))); pages.position.y = 0.19; this.book.add(pages); this.pages = pages;
    // candela
    const candle = inked(new THREE.CylinderGeometry(0.16, 0.18, 0.9, 10), { color: 0xeee2c4, y0: 0, y1: 0.9 }); candle.position.set(-2.9, 0.45, -0.9); s.add(candle); this.candle = candle;
    this.flame = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc070 })); this.flame.scale.y = 2; this.flame.position.set(-2.9, 1.05, -0.9); s.add(this.flame);
    this.halo = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: 0xff9a40, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })); this.halo.position.copy(this.flame.position); s.add(this.halo);
    // Ilde, l'autrice
    const ilde = this.ilde = new THREE.Group(); s.add(ilde); ilde.position.set(0, 0, -2.6);
    const L = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
    const robe = inked(L([[1.4, 0], [1.3, 0.8], [1.05, 1.8], [0.95, 2.5], [0.7, 3.0], [0.35, 3.2]]), { color: 0x2a211b, y0: 0, y1: 3.2 }); robe.material.side = THREE.DoubleSide; ilde.add(robe);
    const hair = inked(L([[0.6, 0], [0.62, 0.35], [0.5, 0.75], [0, 0.95]], 16), { color: 0x8f877c }); hair.position.set(0, 3.35, 0.05); ilde.add(hair);
    for (let i = 0; i < 5; i++) { const st = inked(new THREE.CylinderGeometry(0.03, 0.02, 1.1, 4), { color: 0x8f877c, outline: false }); st.position.set(-0.45 + i * 0.22, 3.0, -0.35); st.rotation.x = 0.2; ilde.add(st); }
    const head = inked(new THREE.SphereGeometry(0.5, 20, 16), { color: 0xeadfc8, y0: 3, y1: 4.2 }); head.scale.set(0.9, 1.08, 0.95); head.position.set(0, 3.6, 0.2);
    const glasses = inked(new THREE.TorusGeometry(0.12, 0.02, 4, 12), { color: 0x16110d, outline: false }); glasses.position.set(-0.17, 3.62, 0.66); const g2 = glasses.clone(); g2.position.x = 0.17; head.parent; ilde.add(glasses, g2); ilde.add(head); this.ildeHead = head;
    const bun = inked(new THREE.SphereGeometry(0.33, 10, 8), { color: 0xa9a196 }); bun.position.set(0, 4.0, -0.3); ilde.add(bun);
    const shawl = inked(new THREE.TorusGeometry(0.75, 0.2, 6, 16), { color: 0x6b2318, outline: false }); shawl.rotation.x = Math.PI / 2; shawl.position.y = 2.95; ilde.add(shawl);
    this.arm = new THREE.Group(); this.arm.position.set(0.8, 2.7, 0.3); ilde.add(this.arm);
    const fore = inked(new THREE.CylinderGeometry(0.13, 0.16, 2.2, 7), { color: 0x2a211b }); fore.position.set(0, -0.2, 1.0); fore.rotation.x = 1.15; this.arm.add(fore);
    const hand = inked(new THREE.SphereGeometry(0.16, 8, 6), { color: 0xeadfc8 }); hand.position.set(0, -0.65, 1.95); this.arm.add(hand);
    this.pen = new THREE.Group(); hand.add(this.pen);
    const quill = inked(new THREE.ConeGeometry(0.04, 0.9, 6), { color: 0x15100c }); quill.position.y = -0.1; quill.rotation.x = Math.PI; this.pen.add(quill);
    const feather = inked(new THREE.PlaneGeometry(0.2, 0.7), { color: 0xeee4cf, outline: false }); feather.material.side = THREE.DoubleSide; feather.position.y = 0.55; this.pen.add(feather);
    // gocce
    this.drop = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0x0a0605 })); this.drop.visible = false; s.add(this.drop);
    this.blot = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: 0x0a0605, transparent: true, opacity: 0.9 })); this.blot.rotation.x = -Math.PI / 2; this.blot.scale.setScalar(0.001); s.add(this.blot);
    // mondo interno del libro: pavimento-pagina
    this.inner = new THREE.Group(); s.add(this.inner); this.inner.visible = false;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 48), new THREE.MeshBasicMaterial({ color: 0xe6dabf, map: paper })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; this.inner.add(floor);
    for (let i = 0; i < 12; i++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(rand(3, 7), 0.05), new THREE.MeshBasicMaterial({ color: 0x5a4a38, transparent: true, opacity: 0.35 })); r.rotation.x = -Math.PI / 2; r.position.set(rand(-8, 8), 0.02, rand(-9, 6)); this.inner.add(r); }
    this.custode = W.makeCustode(); this.inner.add(this.custode);
    this.elara = W.makeElaraPage(true); this.inner.add(this.elara);
    this.player = W.makePlayer(); this.inner.add(this.player);
    this.lumi = W.makeLumi(); this.inner.add(this.lumi);
    this.drips = []; for (let i = 0; i < 7; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0x0a0605 })); d.visible = false; this.inner.add(d); this.drips.push(d); }
    this.seal = W.makeSeal(); this.inner.add(this.seal);
    this.floatPen = new THREE.Group(); const fq = inked(new THREE.ConeGeometry(0.06, 1.2, 6), { color: 0x15100c }); fq.rotation.x = Math.PI; this.floatPen.add(fq); const ff = inked(new THREE.PlaneGeometry(0.25, 0.8), { color: 0xeee4cf, outline: false }); ff.material.side = THREE.DoubleSide; ff.position.y = 0.8; this.floatPen.add(ff); this.inner.add(this.floatPen);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40), new THREE.MeshBasicMaterial({ color: 0x8a1a10, transparent: true, opacity: 0, side: THREE.DoubleSide })); this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.03; this.inner.add(this.ring);
    this.t = 0; this.done = true;
  }
  resize(w, h) { this.camera.aspect = w / h; this.camera.fov = w < h ? 58 : 36; this.camera.updateProjectionMatrix(); }
  start(ui) { this.ui = ui; this.t = 0; this.done = false; this.lastSub = ''; this.lastShot = -1; }
  at(t) { let a = 0; for (let i = 0; i < SHOTS.length; i++) { const sh = SHOTS[i]; if (t < a + sh.dur) { let b = 0; for (let k = 0; k < sh.times.length; k++) { if (t - a < b + sh.times[k]) return { i, sh, lt: t - a, k }; b += sh.times[k]; } } a += sh.dur; } return null; }
  update(dt) {
    if (this.done) return; this.t += dt; INK_UNIFORMS.uTime.value += dt; const T = INK_UNIFORMS.uTime.value;
    const at = this.at(this.t); if (!at) { this.done = true; return; }
    const { i, sh, lt, k } = at; const p = lt / sh.dur, e = ease(p);
    if (i !== this.lastShot) { this.lastShot = i; this.ui.cut(); }
    const sub = sh.subs[k]; if (sub !== this.lastSub) { this.lastSub = sub; this.ui.sub(sub); }
    const cam = this.camera; cam.position.copy(lerpV(sh.cam[0], sh.cam[1], e)); cam.lookAt(lerpV(sh.look[0], sh.look[1], e));
    const flick = 1 + Math.sin(T * 23) * 0.06 + Math.sin(T * 7.3) * 0.08;
    const desk = i <= 2; this.book.visible = this.ilde.visible = desk; this.desk.visible = desk; this.candle.visible = desk; this.inner.visible = !desk;
    this.flame.visible = this.halo.visible = desk && !(i === 2 && k === 2);
    this.flame.scale.set(flick, 2 * flick, flick); this.halo.lookAt(cam.position); this.halo.scale.setScalar(0.8 * flick);
    INK_UNIFORMS.uLamp.value.set(desk ? -1.2 : 0, 0, desk ? -0.5 : 0); INK_UNIFORMS.uLampR.value = desk ? (this.flame.visible ? 7 * flick : 2.5) : 9;
    // scrittura
    if (i === 0 || i === 1) { this.arm.rotation.z = Math.sin(T * 6) * 0.06; this.arm.rotation.y = Math.sin(T * 1.7) * 0.12 + (i === 1 ? -0.1 : 0); this.ildeHead.rotation.x = 0.3 + Math.sin(T * 0.8) * 0.04; }
    const lines = i === 0 ? 2 + p * 2 : i === 1 ? 4 + p * 4 : 8; const verdict = i === 2 ? Math.max(0, (lt - sh.times[0] + 0.3) * 1.2) : i > 2 ? 1 : 0;
    if (Math.floor(lines) !== Math.floor(this.bookState.lines) || Math.abs(verdict - this.bookState.verdict) > 0.08) { this.bookState.lines = lines; this.bookState.verdict = verdict; this.tex.image = bookTex(this.bookState).image; this.tex.needsUpdate = true; }
    if (i === 2) { const tremble = k === 0 ? Math.sin(T * 40) * 0.05 * ease(lt / 2) : 0; this.arm.rotation.z = tremble; this.arm.rotation.y = 0.1;
      const dl = lt - sh.times[0] + 0.6; this.drop.visible = dl > 0 && dl < 0.6; if (this.drop.visible) this.drop.position.set(0.95, 1.2 - dl * 1.8, 0.35);
      const bs = 0.001; this.blot.scale.setScalar(bs); this.blot.position.set(0.95, 0.27, 0.35);
      if (k === 2) { this.ildeHead.rotation.x = Math.min(1.1, this.ildeHead.rotation.x + dt * 0.4); this.arm.rotation.x = Math.min(0.6, this.arm.rotation.x + dt * 0.3); } }
    else { this.blot.scale.setScalar(i > 2 ? 0.001 : 0.001); this.drop.visible = false; if (i < 2) this.arm.rotation.x = 0; }
    // mondo interno
    const cu = this.custode, el = this.elara, pl = this.player, lu = this.lumi;
    cu.visible = i === 3 || i === 7; el.visible = i === 4 || i === 7; pl.visible = i >= 5; lu.visible = i >= 6; this.seal.visible = i === 7; this.floatPen.visible = i === 5 && k === 0;
    if (i === 3) { const rise = ease(lt / 4); cu.position.set(0, -2.9 + rise * 2.9, 0); cu.rotation.y = 0; cu.userData.armor.rotation.z = Math.sin(T * 30) * 0.01 * (1 - rise); cu.scale.setScalar(1.2);
      const eyeOn = lt > sh.times[0]; cu.userData.eye.material.color.setHex(eyeOn ? 0xff3020 : 0x3a1410); }
    if (i === 4) { el.position.set(0, 0, 0); el.rotation.y = Math.sin(T * 0.4) * 0.08; el.userData.page.rotation.x = Math.sin(T * 1.3) * 0.04;
      const blink = (T % 3.5) < 0.15; if (blink !== el.userData.blink) { el.userData.blink = blink; el.userData.st.eyes = blink ? 200 : 190; el.userData.redraw(); } }
    if (i === 5) { const walk = ease(lt / (sh.times[0])); pl.position.set(0, 0, 6 - walk * 5.2); pl.rotation.y = Math.PI; pl.userData.body.position.y = Math.abs(Math.sin(T * 8)) * 0.06 * (walk < 1 ? 1 : 0);
      this.floatPen.position.set(0, 1.3 + Math.sin(T * 2) * 0.12, 0); this.floatPen.rotation.y = T; this.floatPen.rotation.z = 0.3;
      const r = k === 1 ? lt - sh.times[0] : -1; this.ring.material.opacity = r > 0 ? Math.max(0, 0.8 - r * 0.3) : 0; this.ring.scale.setScalar(r > 0 ? 0.5 + r * 2.5 : 1);
      pl.userData.quill.visible = k === 1; pl.userData.quillPivot.rotation.x = k === 1 ? -0.9 + Math.sin(T * 3) * 0.1 : 0; }
    if (i === 6) { pl.position.set(-1.4, 0, 0.6); pl.rotation.y = 1.1; pl.userData.quill.visible = true; const gather = ease(lt / sh.dur * 1.4);
      this.drips.forEach((d, j) => { d.visible = gather < 0.98; const a = j / 7 * 6.28 + T * 0.3; const r = 2.2 * (1 - gather); d.position.set(1.0 + Math.cos(a) * r, 0.12 + Math.max(0, Math.sin(T * 3 + j)) * 0.3 * (1 - gather), 0.2 + Math.sin(a) * r); });
      lu.position.set(1.0, 0.4 + Math.sin(T * 2) * 0.08, 0.2); lu.scale.setScalar(Math.max(0.01, gather * 1.6)); lu.rotation.y = -0.8; }
    else this.drips.forEach((d) => d.visible = false);
    if (i === 7) { pl.position.set(0, 0, 2); pl.rotation.y = Math.PI; pl.userData.quill.visible = true; lu.position.set(-1, 0.6 + Math.sin(T * 2) * 0.08, 2.4); lu.scale.setScalar(1.2);
      el.position.set(-5, 0, -5); el.rotation.y = 0.5; cu.position.set(2.5, 0, -7); cu.scale.setScalar(1.4); cu.rotation.y = -0.3; cu.userData.eye.material.color.setHex(0xff3020); this.seal.position.set(0, 0, -11); this.seal.rotation.y = T; }
    this.ui.progress(this.t / FILM_LEN);
  }
}
function rand(a, b) { return a + Math.random() * (b - a); }
