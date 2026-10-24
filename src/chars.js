// Personaggi 3D ridisegnati sulle tavole ufficiali (docs/concept-art): Correttore (tav. 036/039/058), Elara (031/057/071),
// Lumi (048), Acari d'inchiostro (019/028), Custode (040/049), Rilegatore con maschera a becco (010/034), Copista (068/070).
// Tutto procedurale e leggero: le parti con lo stesso materiale sono fuse in una sola geometria (meno draw call su iPad).
import * as THREE from '../vendor/three.module.js?v=1.9.0';
import { inked, INK_UNIFORMS } from './art.js?v=1.9.0';

const V3 = THREE.Vector3;
export const lathe = (pts, seg = 18, p0 = 0, pl = Math.PI * 2) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg, p0, pl);
let _rad = null; const radTex = () => { if (_rad) return _rad; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); _rad = new THREE.CanvasTexture(c); return _rad; };
export const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
const glow = (color, sx, sy, op = 0.7) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radTex(), color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.set(sx, sy, 1); return s; };
// pseudo-casuale deterministico (le tavole non cambiano a ogni caricamento)
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// Trasforma una geometria (posizione, rotazione XYZ, scala) e la restituisce.
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
export function xf(geo, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  if (!Array.isArray(r)) r = [0, 0, 0];
  _q.setFromEuler(_e.set(r[0], r[1], r[2])); _m.compose(new V3(...p), _q, new V3(...(typeof s === 'number' ? [s, s, s] : s))); geo.applyMatrix4(_m); return geo;
}
// Fonde più geometrie in una sola (solo posizione + normali: è tutto ciò che servono InkMaster e contorno).
export function merge(geos) {
  let n = 0; const parts = geos.map((g) => { const q = g.index ? g.toNonIndexed() : g; if (!q.attributes.normal) q.computeVertexNormals(); n += q.attributes.position.count; return q; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const q of parts) { pos.set(q.attributes.position.array, o * 3); nor.set(q.attributes.normal.array, o * 3); o += q.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.computeBoundingSphere(); return g;
}
// Orlo strappato: alza i vertici bassi di una lathe con un profilo a denti irregolari (stoffa sfilacciata delle tavole).
export function raggedHem(geo, top, depth, freq = 13, seed = 1) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y > top) continue; const a = Math.atan2(x, z);
    const j = Math.abs(Math.sin(a * freq + seed)) * 0.6 + Math.abs(Math.sin(a * freq * 2.3 + seed * 3)) * 0.4; const w = 1 - y / top; p.setY(i, y + j * depth * w);
    const k = 1 + 0.05 * Math.sin(a * 17 + y * 9 + seed); p.setX(i, x * k); p.setZ(i, z * k); }
  p.needsUpdate = true; geo.computeVertexNormals(); return geo;
}
// Ciuffi/fili d'inchiostro che pendono: coni sottili sparsi su un anello.
function strands(n, r0, r1, yTop, lenMin, lenMax, thick, seed = 1, arc = Math.PI * 2, a0 = 0, sz = 1) {
  const out = []; for (let i = 0; i < n; i++) { const a = a0 + (i + hash(i + seed) * 0.8) / n * arc; const r = r0 + (r1 - r0) * hash(i * 3 + seed); const L = lenMin + (lenMax - lenMin) * hash(i * 7 + seed);
    const y = yTop - hash(i * 5 + seed) * 0.12; out.push(xf(new THREE.ConeGeometry(thick * (0.6 + hash(i + 9) * 0.8), L, 3, 1).rotateX(Math.PI), [Math.sin(a) * r, y - L / 2, Math.cos(a) * r * sz], [Math.cos(a) * 0.08, 0, -Math.sin(a) * 0.08])); }
  return out;
}
// Striscia di stoffa (sciarpa, nastro) con estremità sfrangiata e curvatura; pivot in alto.
function ribbonGeo(w, h, bend = 0.2, fray = 0.12, segs = 8, seed = 1) {
  const g = new THREE.PlaneGeometry(w, h, 3, segs); g.translate(0, -h / 2, 0); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const t = -y / h; p.setZ(i, Math.sin(t * Math.PI * 0.9) * bend + x * 0.15 * Math.sin(t * 3));
    if (t > 0.98) p.setY(i, y - hash(x * 50 + seed) * fray); p.setX(i, x * (1 - t * 0.25)); }
  p.needsUpdate = true; g.computeVertexNormals(); return g;
}

// ============================ IL CORRETTORE (giocatore) ============================
// Tavole 036/039/058: alto, cappuccio a punta con il volto nero e due occhi gialli, mantello sfilacciato che cola fino a terra,
// sciarpa rossa avvolta e sfrangiata, cintura con borse e boccetta, tracolla sulla schiena, la penna come lancia.
export function makePlayer() {
  const grp = new THREE.Group(); const body = new THREE.Group(); grp.add(body);
  const BLACK = 0x1c1715, DEEP = 0x100c0a;
  const cg = raggedHem(lathe([[0.45, 0], [0.45, 0.08], [0.42, 0.4], [0.39, 0.8], [0.4, 1.05], [0.43, 1.17], [0.35, 1.26], [0.2, 1.32], [0.08, 1.35]], 28), 0.45, 0.24, 11, 2);
  cg.scale(1, 1, 0.82);
  // fili d'inchiostro che colano dall'orlo e dalla mantellina (un solo mesh)
  const fr = merge([...strands(46, 0.38, 0.45, 0.5, 0.32, 0.58, 0.022, 3, Math.PI * 2, 0, 0.82), ...strands(22, 0.42, 0.47, 1.08, 0.2, 0.42, 0.02, 7, Math.PI * 2, 0, 0.82)]);
  const fringe = new THREE.Mesh(merge([fr, xf(new THREE.SphereGeometry(0.1, 8, 6), [-0.13, 0.05, 0.14], 0, [1, 0.6, 1.5]), xf(new THREE.SphereGeometry(0.1, 8, 6), [0.13, 0.05, 0.14], 0, [1, 0.6, 1.5])]), basic(DEEP)); body.add(fringe);
  // mantellina sulle spalle, sfrangiata
  const capG = raggedHem(lathe([[0.52, 0], [0.5, 0.1], [0.43, 0.22], [0.26, 0.32]], 24), 0.14, 0.12, 9, 5); capG.scale(1, 1, 0.85); capG.translate(0, 1.0, 0);
  // cappuccio a punta, piegato all'indietro, con bordo attorno al volto nero
  const hg = lathe([[0.25, 0], [0.28, 0.14], [0.26, 0.3], [0.19, 0.42], [0.1, 0.5], [0.02, 0.56]], 18, 0.7, Math.PI * 2 - 1.4); { const p = hg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) - (y / 0.56) ** 2 * 0.2); } hg.computeVertexNormals(); }
  hg.translate(0, 1.32, -0.02);
  // mantello + mantellina + cappuccio in un solo mesh (2 draw call invece di 6)
  const cloak = inked(merge([cg, capG, hg]), { color: BLACK, shift: 0x7a1f14, y0: 0, y1: 1.95, ow: 0.026 }); cloak.material.side = THREE.DoubleSide; body.add(cloak);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), basic(0x030201)); head.scale.set(0.95, 1.15, 0.7); head.position.set(0, 1.5, 0.06); body.add(head);
    const eyes = new THREE.Mesh(merge([xf(new THREE.SphereGeometry(0.03, 8, 6), [-0.062, 1.53, 0.17], [0, 0, 0.15], [1.3, 0.75, 0.5]), xf(new THREE.SphereGeometry(0.03, 8, 6), [0.062, 1.53, 0.17], [0, 0, -0.15], [1.3, 0.75, 0.5])]), basic(0xffd45a)); body.add(eyes);
  const eyeGlow = glow(0xffb030, 0.24, 0.09, 0.28); eyeGlow.position.set(0, 1.53, 0.2); body.add(eyeGlow);
  // sciarpa rossa: due giri attorno al collo + due code sfrangiate (una sulla spalla, una sulla schiena)
  const RED = 0x8a2416;
  const scarf = inked(merge([xf(new THREE.TorusGeometry(0.22, 0.085, 7, 18), [0, 1.36, 0.01], [Math.PI / 2 + 0.12, 0, 0], [1, 0.9, 1]), xf(new THREE.TorusGeometry(0.3, 0.07, 6, 20), [0, 1.27, 0], [Math.PI / 2 - 0.12, 0.2, 0.08], [1, 0.85, 1])]), { color: RED, shift: 0xc8321e, y0: 1.1, y1: 1.4, outline: false }); body.add(scarf);
  const tail = new THREE.Group(); tail.position.set(0.17, 1.3, 0.19); body.add(tail);
  const t1 = inked(ribbonGeo(0.15, 0.72, 0.12, 0.14, 8, 2), { color: RED, outline: false }); t1.material.side = THREE.DoubleSide; t1.rotation.set(-0.15, 0.35, 0.18); tail.add(t1);
  const tail2 = new THREE.Group(); tail2.position.set(-0.12, 1.3, -0.24); body.add(tail2);
  const t2 = inked(ribbonGeo(0.17, 0.9, -0.22, 0.16, 9, 5), { color: 0x7a1f14, outline: false }); t2.material.side = THREE.DoubleSide; t2.rotation.set(0.25, 0.2, -0.1); tail2.add(t2);
  // cintura, borse, boccetta, tracolla, stivali (un mesh marrone)
  const leather = inked(merge([xf(new THREE.TorusGeometry(0.38, 0.03, 4, 22), [0, 0.74, 0], [Math.PI / 2, 0, 0], [1, 0.82, 1]),
    xf(new THREE.BoxGeometry(0.13, 0.15, 0.08), [0.27, 0.64, 0.22], [0, 0.6, 0]), xf(new THREE.BoxGeometry(0.11, 0.13, 0.07), [-0.3, 0.65, 0.17], [0, -0.7, 0]),
    xf(new THREE.BoxGeometry(0.06, 0.95, 0.03), [0, 1.0, -0.3], [0.12, 0, 0.62]), xf(new THREE.BoxGeometry(0.2, 0.18, 0.09), [0.22, 0.7, -0.29], [0, 0.4, 0]), xf(new THREE.CylinderGeometry(0.04, 0.045, 0.14, 8), [-0.36, 0.64, -0.08])]), { color: 0x5a3e26, outline: false }); body.add(leather); // boccetta inclusa
  // LA PENNA (stessa forma e stessi punti d'aggancio di prima: nib, nibGlow, quill, quillPivot)
  const quillPivot = new THREE.Group(); quillPivot.position.set(0.36, 1.0, 0.05); body.add(quillPivot);
  const quill = new THREE.Group(); quill.scale.setScalar(1.7); quillPivot.add(quill);
  const barrel = inked(merge([xf(new THREE.CylinderGeometry(0.045, 0.055, 0.62, 10).rotateX(Math.PI / 2), [0, 0, 0.42]), xf(new THREE.CylinderGeometry(0.058, 0.05, 0.3, 12).rotateX(Math.PI / 2), [0, 0, -0.02])]), { color: 0x120c0a, shift: 0x8a2416, ow: 0.012 }); quill.add(barrel);
  const gold = basic(0xd8a63a);
  quill.add(new THREE.Mesh(merge([xf(new THREE.TorusGeometry(0.056, 0.014, 6, 14), [0, 0, 0.16]), xf(new THREE.TorusGeometry(0.056, 0.014, 6, 14), [0, 0, 0.7]), xf(new THREE.SphereGeometry(0.05, 10, 6), [0, 0, -0.17], 0, [1, 1, 0.6])]), gold));
  const grip = inked(new THREE.CylinderGeometry(0.05, 0.034, 0.18, 10).rotateX(Math.PI / 2), { color: 0x8a2416, outline: false }); grip.position.z = 0.82; quill.add(grip);
  const nibGeo = new THREE.ConeGeometry(0.036, 0.22, 4).rotateX(Math.PI / 2); nibGeo.scale(1.7, 0.4, 1.25); const nibM = new THREE.Mesh(merge([xf(nibGeo, [0, 0, 1.01]), xf(new THREE.BoxGeometry(0.018, 0.012, 0.3), [0, 0.068, 0.02]), xf(new THREE.SphereGeometry(0.018, 6, 4), [0, 0.07, 0.17])]), basic(0xe8be55)); quill.add(nibM);
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), basic(0x8a1a10)); drop.scale.y = 1.4; drop.position.set(0, -0.04, 1.12); quill.add(drop);
  const nibGlow = glow(0xff5a30, 0.35, 0.35, 1); nibGlow.position.z = 1.1; quill.add(nibGlow);
  const nib = new THREE.Object3D(); nib.position.z = 1.12; quill.add(nib);
  // movimento secondario: code della sciarpa e frange seguono la corsa
  const anim = (t, sp = 0) => { const k = Math.min(1, sp / 5); tail.rotation.x = -0.1 - k * 0.5 + Math.sin(t * 3.1) * (0.06 + k * 0.08); tail.rotation.z = Math.sin(t * 2.3) * 0.05;
    tail2.rotation.x = 0.15 + k * 0.85 + Math.sin(t * 2.7 + 1) * (0.07 + k * 0.12); tail2.rotation.z = Math.sin(t * 1.9) * 0.08;
    fringe.rotation.x = k * 0.06 + Math.sin(t * 5) * 0.012; fringe.scale.y = 1 + Math.sin(t * 2.2) * 0.02; eyeGlow.material.opacity = 0.25 + Math.sin(t * 1.7) * 0.06; };
  grp.userData = { body, cloak, head, quillPivot, quill, tail, nib, nibGlow, nibWorld: new THREE.Vector3(), r: 0.38, anim }; return grp;
}

// ============================ ELARA ============================
// Tavole 031/057/071: caschetto nero con frangia, abito lungo color crema a vita alta con pieghe, maniche lunghe a sbuffo,
// fiocco rosso al collo, biglietto appuntato sul petto, stivaletti neri, macchie d'inchiostro blu sull'orlo.
export function makeElara() {
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
  const CREAM = 0xebe1c9, SKIN = 0xf5ead7, HAIR = 0x110b09, RED = 0x8a2416;
  // abito: gonna con pieghe verticali + corpetto
  const dg = lathe([[0.36, 0.13], [0.355, 0.2], [0.3, 0.5], [0.22, 0.82], [0.16, 0.94], [0.15, 0.98], [0.16, 1.08], [0.155, 1.18], [0.08, 1.25]], 30);
  { const p = dg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 0.95) continue; const a = Math.atan2(p.getX(i), p.getZ(i)); const k = 1 + 0.045 * Math.sin(a * 14) * (1 - y / 0.95); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k * 0.86); } dg.computeVertexNormals(); }
  const dress = inked(dg, { color: CREAM, shift: RED, y0: 0, y1: 1.25, texScale: 0.6, ow: 0.016 }); dress.material.side = THREE.DoubleSide; body.add(dress);
  // cucitura in vita, colletto alto, stivaletti (scuri)
  const darks = new THREE.Mesh(merge([xf(new THREE.TorusGeometry(0.153, 0.007, 4, 24), [0, 0.95, 0], [Math.PI / 2, 0, 0], [1, 0.86, 1]),
    xf(new THREE.SphereGeometry(0.075, 8, 6), [-0.08, 0.06, 0.05], 0, [0.9, 0.85, 1.4]), xf(new THREE.SphereGeometry(0.075, 8, 6), [0.08, 0.06, 0.05], 0, [0.9, 0.85, 1.4]),
    xf(new THREE.CylinderGeometry(0.05, 0.055, 0.12, 8), [-0.08, 0.12, 0.02]), xf(new THREE.CylinderGeometry(0.05, 0.055, 0.12, 8), [0.08, 0.12, 0.02])]), basic(0x1b130e)); body.add(darks);
  // tratti a matita delle pieghe (tavola 071): linee sottili dalla vita all'orlo, un solo mesh
  const folds = []; for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2 + hash(i) * 0.2; const y0 = 0.9 - hash(i + 1) * 0.15, y1 = 0.15 + hash(i + 2) * 0.08; const r0 = 0.165 + (0.9 - y0) * 0.55, r1 = 0.37;
    const p0 = new V3(Math.sin(a) * r0, y0, Math.cos(a) * r0 * 0.86), p1 = new V3(Math.sin(a) * r1, y1, Math.cos(a) * r1 * 0.86); const d = p1.clone().sub(p0); const L = d.length();
    const c = new THREE.BoxGeometry(0.004, L, 0.004); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.normalize())); c.translate((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2); folds.push(c); }
  body.add(new THREE.Mesh(merge(folds), basic(0x8a7a62)));
  const collar = inked(new THREE.CylinderGeometry(0.06, 0.075, 0.07, 12), { color: CREAM, outline: false }); collar.position.y = 1.27; body.add(collar);
  // macchie d'inchiostro blu sull'orlo (come nella tavola 071)
  const stains = new THREE.Mesh(merge([0, 1, 2, 3].map((i) => { const a = 0.4 + i * 1.3 + hash(i) * 0.5; const y = 0.2 + hash(i + 4) * 0.25; const r = 0.35 - (y - 0.13) * 0.28; return xf(new THREE.CircleGeometry(0.035 + hash(i + 2) * 0.03, 7), [Math.sin(a) * r * 1.02, y, Math.cos(a) * r * 0.88], [0, a, 0]); })), basic(0x2c4a80, { transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })); body.add(stains);
  // braccia lungo i fianchi: manica a sbuffo, polsino, mano
  // braccia lungo i fianchi (manica a sbuffo, polsino, mano): due mesh in tutto
  const slv = [], hnd = []; for (const sd of [-1, 1]) { const at = (g) => xf(xf(g, [0, 0, 0], [-0.08, 0, sd * 0.13]), [sd * 0.155, 1.17, 0]);
    slv.push(at(lathe([[0.05, -0.45], [0.075, -0.4], [0.06, -0.32], [0.07, -0.06], [0.045, 0.02], [0.02, 0.04]], 10))); hnd.push(at(xf(new THREE.SphereGeometry(0.038, 8, 6), [0, -0.49, 0], 0, [0.8, 1.2, 0.8]))); }
  body.add(inked(merge(slv), { color: 0xe4d9c0, ow: 0.012 })); body.add(inked(merge(hnd), { color: SKIN, outline: false }));
  // testa e volto (occhi grandi e tristi, sopracciglia inclinate, guance)
  const head = inked(new THREE.SphereGeometry(0.165, 18, 14), { color: SKIN, y0: 1.25, y1: 1.62, ow: 0.016 }); head.scale.set(0.95, 1.04, 0.95); head.position.y = 1.44; body.add(head);
  const face = new THREE.Group(); head.add(face);
  face.add(new THREE.Mesh(merge([-1, 1].flatMap((sd) => [xf(new THREE.SphereGeometry(0.026, 8, 6), [sd * 0.058, 0.0, 0.148], 0, [1, 1.15, 0.5]), xf(new THREE.BoxGeometry(0.055, 0.008, 0.01), [sd * 0.06, 0.05, 0.155], [0, 0, sd * -0.22])]).concat([xf(new THREE.BoxGeometry(0.035, 0.007, 0.01), [0, -0.075, 0.152])])), basic(0x3a1a12)));
  face.add(new THREE.Mesh(merge([-1, 1].map((sd) => xf(new THREE.CircleGeometry(0.025, 8), [sd * 0.088, -0.045, 0.142], [0, sd * 0.5, 0]))), basic(0xd88a70, { transparent: true, opacity: 0.4 })));
  // caschetto: calotta + lati e nuca tagliati dritti all'altezza del mento, frangia sulla fronte, punte irregolari
  const PI = Math.PI, back = new THREE.SphereGeometry(0.19, 24, 12, PI / 2 + 0.66, PI * 2 - 1.32, 0, PI * 0.68);
  const fringeG = new THREE.SphereGeometry(0.186, 16, 6, PI / 2 - 0.74, 1.48, 0, PI * 0.36);
  for (const [geo, fq, amp] of [[back, 23, 0.03], [fringeG, 37, 0.008]]) { const p = geo.attributes.position; let ymin = 1; for (let i = 0; i < p.count; i++) ymin = Math.min(ymin, p.getY(i)); for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < ymin + 0.01) { const a = Math.atan2(p.getX(i), p.getZ(i)); p.setY(i, y - Math.abs(Math.sin(a * fq)) * amp); } } geo.computeVertexNormals(); }
  const hair = inked(merge([xf(back, [0, 0.02, -0.01], 0, [1.12, 1.05, 1.08]), xf(fringeG, [0, 0.025, 0.01], 0, [1.04, 1.0, 1.04])]), { color: HAIR, y0: 1.25, y1: 1.65, ow: 0.016 }); hair.material.side = THREE.DoubleSide; head.add(hair);
  // fiocco rosso: due asole, nodo, due code
  const bow = inked(merge([xf(new THREE.TorusGeometry(0.035, 0.013, 5, 10), [-0.04, 0, 0], [0, 0, 0.3], [1.2, 0.75, 0.6]), xf(new THREE.TorusGeometry(0.035, 0.013, 5, 10), [0.04, 0, 0], [0, 0, -0.3], [1.2, 0.75, 0.6]),
    xf(new THREE.SphereGeometry(0.018, 6, 5), [0, 0, 0.005]), xf(new THREE.BoxGeometry(0.022, 0.13, 0.008), [-0.025, -0.07, 0], [0, 0, -0.3]), xf(new THREE.BoxGeometry(0.022, 0.13, 0.008), [0.025, -0.07, 0], [0, 0, 0.3])]), { color: RED, shift: 0xc8321e, ow: 0.007 });
  bow.position.set(0, 1.235, 0.1); bow.rotation.x = -0.15; bow.scale.setScalar(1.45); body.add(bow);
  // biglietto appuntato sul petto (la sua "riga")
  const note = inked(new THREE.BoxGeometry(0.09, 0.1, 0.005), { color: 0xf6efdf, outline: false }); note.position.set(0.055, 1.05, 0.145); note.rotation.set(-0.12, 0.05, 0.08); body.add(note);
  // fogli che le girano intorno (un solo mesh) e alone tenue
  const glowS = glow(0xffe2b0, 1.4, 2.2, 0.14); glowS.position.y = 0.95; g.add(glowS);
  const orbit = new THREE.Group(); g.add(orbit);
  const sheets = inked(merge([0, 1, 2, 3, 4].map((i) => { const a = i / 5 * PI * 2; return xf(new THREE.PlaneGeometry(0.15, 0.19), [Math.cos(a) * 0.75, 0.6 + (i % 3) * 0.35, Math.sin(a) * 0.75], [0.4, a, 0.3]); })), { color: 0xf3ead6, outline: false }); sheets.material.side = THREE.DoubleSide; orbit.add(sheets);
  g.userData = { body, orbit, head, hair, bow }; return g;
}

// ============================ LUMI ============================
// Tavola 048: una goccia d'inchiostro con la punta piegata, occhi grandi che guardano in su, sopracciglia preoccupate,
// macchia rossa e blu sul fondo. Tratteggio a penna nel materiale (shader proprio, con l'ondeggiare di prima).
export function makeLumi() {
  const grp = new THREE.Group();
  const lg = lathe([[0, -0.27], [0.13, -0.255], [0.23, -0.18], [0.28, -0.04], [0.27, 0.08], [0.21, 0.2], [0.13, 0.31], [0.06, 0.42], [0.015, 0.5], [0, 0.53]], 22, Math.PI);
  { const p = lg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 0.1) p.setX(i, p.getX(i) + (y - 0.1) ** 2 * 0.5); } lg.computeVertexNormals(); }
  const blob = new THREE.Mesh(lg, new THREE.ShaderMaterial({ uniforms: { uTime: INK_UNIFORMS.uTime },
    vertexShader: `uniform float uTime; varying float vF; varying vec3 vP; varying float vL; void main(){ vec3 p=position; float w=sin(p.y*9.+uTime*4.)*.035+sin(p.x*7.-uTime*3.)*.03; p+=normal*w*smoothstep(.45,.1,p.y); vP=position;
      vec3 n=normalize(normalMatrix*normal); vF=pow(1.-abs(n.z),2.); vL=dot(n,normalize(vec3(-.4,.7,.6))); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: `varying float vF; varying vec3 vP; varying float vL; void main(){
      vec2 sp=gl_FragCoord.xy; float h=step(.55,fract((sp.x+sp.y)*.11)); float h2=step(.6,fract((sp.x-sp.y)*.09));
      float tone=clamp(vL*.5+.5,0.,1.); vec3 c=mix(vec3(.03,.025,.025),vec3(.2,.19,.19),tone*tone);
      c*=mix(1.,.62,h*(1.-tone)); c*=mix(1.,.75,h2*smoothstep(.5,.1,tone));
      float red=smoothstep(.12,.0,length(vP.xy-vec2(-.17,-.13))-.04); c=mix(c,vec3(.62,.1,.07),red*.75);
      float blue=smoothstep(.1,.0,length(vP.xy-vec2(.15,-.2))-.03); c=mix(c,vec3(.25,.33,.5),blue*.55);
      c=mix(c,vec3(.02,.015,.015),vF*.7); gl_FragColor=vec4(c,1.); }` }));
  grp.add(blob);
  // occhi: bianchi grandi + pupille che guardano in alto + sopracciglia preoccupate
  const whites = new THREE.Mesh(merge([-1, 1].map((sd) => xf(new THREE.SphereGeometry(0.068, 12, 8), [sd * 0.085, 0.02, 0.255], 0, [1, 1.05, 0.6]))), basic(0xf3ead6)); grp.add(whites);
  const pupils = new THREE.Mesh(merge([...[-1, 1].map((sd) => xf(new THREE.SphereGeometry(0.032, 8, 6), [sd * 0.08, 0.05, 0.29], 0, [1, 1, 0.5])),
    ...[-1, 1].map((sd) => xf(new THREE.BoxGeometry(0.075, 0.012, 0.01), [sd * 0.088, 0.12, 0.275], [0, 0, -sd * 0.35]))]), basic(0x0c0806)); grp.add(pupils);
  grp.userData.blob = blob; grp.userData.eyes = whites; return grp;
}

// ============================ ACARI D'INCHIOSTRO ============================
// Tavole 019/028: palle d'inchiostro pelose, nere, con due occhi bianchi luminosi e colature che pendono sotto.
// Prima: ~25 draw call per acaro; ora 6. Gli occhi diventano rossi quando l'acaro sta per scattare (telegrafo leggibile).
export function makeMite() {
  const bg = new THREE.SphereGeometry(0.3, 16, 12); { const p = bg.attributes.position; const v = new V3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const d = v.clone().normalize();
    const n = Math.sin(d.x * 13 + d.y * 7) * Math.sin(d.z * 11 - d.y * 5) * 0.06 + Math.sin(d.x * 31 + d.z * 23) * 0.025; let k = 1 + n; if (d.y < -0.4) k *= 1 + (-0.4 - d.y) * 0.25; v.multiplyScalar(k); v.y *= 0.95; p.setXYZ(i, v.x, v.y, v.z); } bg.computeVertexNormals(); }
  const m = inked(bg, { color: 0x0d0907, shift: 0x7a1f14, ow: 0.022 }); m.position.y = 0.3;
  // pelo/inchiostro arruffato + due riccioli in testa
  const fur = []; for (let i = 0; i < 64; i++) { const a = i * 2.39996, b = Math.acos(1 - 2 * (i + 0.5) / 64); if (Math.cos(b) < -0.5) continue; const d = new V3(Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)); if (d.z > 0.55 && Math.abs(d.y) < 0.45) continue;
    const L = 0.05 + hash(i) * 0.1; const c = new THREE.ConeGeometry(0.013, L, 3); c.translate(0, L / 2, 0); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d)); c.translate(d.x * 0.28, d.y * 0.28, d.z * 0.28); fur.push(c); }
  { const c = new THREE.TorusGeometry(0.05, 0.007, 3, 10, Math.PI * 1.4); xf(c, [0.05, 0.37, -0.04], [0, Math.PI / 2, 0.5]); fur.push(c); }
  const furM = new THREE.Mesh(merge(fur), basic(0x0c0806)); m.add(furM);
  // colature d'inchiostro sotto il corpo
  const dr = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + hash(i) * 0.5, r = 0.12 + hash(i + 3) * 0.12, L = 0.05 + hash(i + 7) * 0.12; dr.push(xf(new THREE.CylinderGeometry(0.008, 0.024, L, 4), [Math.sin(a) * r, -0.24 - L / 2, Math.cos(a) * r]));
    dr.push(xf(new THREE.SphereGeometry(0.02, 5, 4), [Math.sin(a) * r, -0.24 - L, Math.cos(a) * r], 0, [1, 1.5, 1])); }
  const drips = new THREE.Mesh(merge(dr), basic(0x0c0806)); m.add(drips);
  const eyeMat = basic(0xfff4dc); const eyes = new THREE.Mesh(merge([-1, 1].map((sd) => xf(new THREE.SphereGeometry(0.06, 10, 8), [sd * 0.105, 0.05, 0.25], 0, [1, 1.1, 0.55]))), eyeMat); m.add(eyes);
  const eg = glow(0xfff0d0, 0.34, 0.15, 0.35); eg.position.set(0, 0.05, 0.3); m.add(eg);
  const seed = Math.random() * 10; const WHITE = new THREE.Color(0xfff4dc), REDC = new THREE.Color(0xff3a20);
  m.userData.anim = (t, o) => { const angry = o && (o.tell > 0 || o.lunge > 0 || o.boss); eyeMat.color.copy(angry ? REDC : WHITE); eg.material.color.setHex(angry ? 0xff3a20 : 0xfff0d0);
    const bl = ((t + seed) % 4.2) < 0.12; eyes.scale.y = bl ? 0.15 : 1; drips.scale.y = 1 + Math.sin(t * 3.3 + seed) * 0.18; furM.rotation.y = Math.sin(t * 2 + seed) * 0.06; };
  m.userData.eyes = eyes; m.userData.eyeGlow = eg;
  m.scale.setScalar(1.15); return m;
}

// ============================ IL CUSTODE ============================
// Tavole 040/049 (e 037): golem fatto di libri e tavole chiodate, elmo-libro aperto con una corona di pennini,
// fessura degli occhi rossa, spallacci a pile di pagine, catene in vita, pugni squadrati, palla al piede sulla catena.
// Stessi agganci di gameplay: body, armor (componente FRAGILE), armor.userData.arm1/arm-1, core, eye, halo.
export function makeCustode() {
  const grp = new THREE.Group(); const body = new THREE.Group(); grp.add(body);
  const WOOD = 0x4e4036, PAGE = 0xd6c8a8, IRON = 0x2a2522, STAIN = 0x7a1f14;
  const core = inked(new THREE.OctahedronGeometry(0.34, 1), { color: 0x9e2b1c, shift: 0xff5530, ow: 0.02 }); core.position.set(0, 1.72, 0.08); body.add(core);
  // gambe a blocchi (restano anche quando la corazza si rompe)
  const legs = []; for (const sd of [-1, 1]) legs.push(xf(new THREE.BoxGeometry(0.44, 0.42, 0.44), [sd * 0.36, 0.86, 0], [0, 0, sd * 0.04]), xf(new THREE.BoxGeometry(0.5, 0.48, 0.5), [sd * 0.38, 0.42, 0.02]),
    xf(new THREE.BoxGeometry(0.56, 0.2, 0.72), [sd * 0.39, 0.1, 0.1]), xf(new THREE.BoxGeometry(0.54, 0.08, 0.54), [sd * 0.38, 0.62, 0.02]));
  body.add(inked(merge(legs), { color: 0x3a2f28, shift: STAIN, y0: 0, y1: 1.1, ow: 0.022 }));
  const armor = new THREE.Group(); body.add(armor);
  // busto: petto squadrato, ventre, elmo a scatola; coperte scure dei libri sugli spallacci
  const plates = [xf(new THREE.BoxGeometry(1.34, 0.86, 0.86), [0, 1.78, 0], [0.1, 0, 0]), xf(new THREE.BoxGeometry(1.05, 0.5, 0.72), [0, 1.18, 0.02]),
    xf(new THREE.BoxGeometry(0.74, 0.62, 0.68), [0, 2.52, 0.12], [0.08, 0, 0]), xf(new THREE.BoxGeometry(0.7, 0.12, 0.5), [0, 2.25, 0.05])];
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) plates.push(xf(new THREE.BoxGeometry(0.62 - k * 0.06, 0.07, 0.72 - k * 0.04), [sd * (0.86 + k * 0.03), 2.2 - k * 0.2, 0.04], [0, 0, sd * (-0.35 - k * 0.08)]));
  // elmo-libro: due coperte a V sopra l'elmo
  plates.push(xf(new THREE.BoxGeometry(0.06, 0.46, 0.7), [-0.22, 2.92, 0.12], [0, 0, 0.75]), xf(new THREE.BoxGeometry(0.06, 0.46, 0.7), [0.22, 2.92, 0.12], [0, 0, -0.75]));
  armor.add(inked(merge(plates), { color: WOOD, shift: STAIN, y0: 0.7, y1: 3.2, ow: 0.03 }));
  // blocchi di pagine color crema (spallacci, visiera del libro, fascia del petto)
  const pages = []; for (const sd of [-1, 1]) for (let k = 0; k < 2; k++) pages.push(xf(new THREE.BoxGeometry(0.55 - k * 0.06, 0.12, 0.66 - k * 0.04), [sd * (0.88 + k * 0.03), 2.1 - k * 0.2, 0.04], [0, 0, sd * (-0.38 - k * 0.08)]));
  pages.push(xf(new THREE.BoxGeometry(0.03, 0.4, 0.64), [-0.13, 2.92, 0.12], [0, 0, 0.5]), xf(new THREE.BoxGeometry(0.03, 0.4, 0.64), [0.13, 2.92, 0.12], [0, 0, -0.5]), xf(new THREE.BoxGeometry(1.1, 0.1, 0.05), [0, 2.02, 0.45], [0.1, 0, 0]));
  armor.add(inked(merge(pages), { color: PAGE, y0: 0.7, y1: 3.2, ow: 0.016 }));
  // macchie rosse sulle tavole (come le pennellate della tavola 040)
  const st = []; [[0.35, 1.9, 0.44, 0.22, 0.18], [-0.4, 1.6, 0.44, 0.16, 0.2], [0.2, 1.22, 0.39, 0.18, 0.12], [0.42, 1.12, 0.38, 0.1, 0.14]].forEach(([x, y, z, w, h], i) => st.push(xf(new THREE.CircleGeometry(1, 7), [x, y, z], [0.1, 0, hash(i) * 3], [w, h, 1])));
  armor.add(new THREE.Mesh(merge(st), basic(STAIN, { side: THREE.DoubleSide })));
  // corona di pennini sull'elmo
  const nibs = []; for (let i = 0; i < 9; i++) { const a = (i - 4) * 0.11; const L = 0.62 - Math.abs(i - 4) * 0.06; const c = new THREE.ConeGeometry(0.055, L, 4); c.scale(1, 1, 0.45); xf(c, [(i - 4) * 0.085 + Math.sin(a) * L / 2, 3.08 + L / 2 * Math.cos(a), 0.0 + (i % 2) * 0.14], [0.1 - (i % 2) * 0.2, 0, -a]); nibs.push(c); }
  armor.add(inked(merge(nibs), { color: IRON, y0: 2.8, y1: 3.6, ow: 0.016 }));
  // catene e borchie (ferro scuro)
  const ch = []; for (const [yy, sag] of [[1.06, 0.05], [1.26, 0.09]]) for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; ch.push(xf(new THREE.TorusGeometry(0.07, 0.022, 4, 8), [Math.sin(a) * 0.6, yy - Math.max(0, Math.cos(a)) * sag, Math.cos(a) * 0.43], [0, a + Math.PI / 2 + (i % 2) * Math.PI / 2, 0])); }
  for (const y of [1.6, 1.95]) ch.push(xf(new THREE.BoxGeometry(1.3, 0.025, 0.02), [0, y, 0.44 + (y - 1.78) * 0.1], [0.1, 0, 0]));
  ch.push(xf(new THREE.BoxGeometry(0.66, 0.15, 0.04), [0, 2.52, 0.45], [0.08, 0, 0]));
  [[-0.55, 2.1], [0.55, 2.1], [-0.55, 1.45], [0.55, 1.45], [-0.3, 2.74], [0.3, 2.74], [-0.3, 2.3], [0.3, 2.3]].forEach(([x, y]) => ch.push(xf(new THREE.SphereGeometry(0.035, 5, 4), [x, y, y > 2.2 ? 0.48 : 0.46])));
  armor.add(new THREE.Mesh(merge(ch), basic(0x15100c)));
  // braccia: spallaccio, braccio a fasce, guanto, pugno squadrato; la sinistra trascina la palla al piede
  for (const sd of [-1, 1]) { const arm = new THREE.Group(); arm.position.set(sd * 0.98, 2.08, 0.06); armor.add(arm); arm.userData.side = sd; armor.userData['arm' + sd] = arm;
    arm.add(inked(merge([xf(new THREE.BoxGeometry(0.36, 0.55, 0.36), [0, -0.35, 0]), xf(new THREE.BoxGeometry(0.44, 0.12, 0.44), [0, -0.66, 0]), xf(new THREE.BoxGeometry(0.46, 0.55, 0.46), [0, -0.98, 0.02]),
      xf(new THREE.BoxGeometry(0.5, 0.42, 0.5), [0, -1.42, 0.04]), xf(new THREE.BoxGeometry(0.14, 0.2, 0.3), [-sd * 0.27, -1.36, 0.1])]), { color: 0x45392f, shift: STAIN, y0: 0.6, y1: 2.2, ow: 0.022 }));
    if (sd < 0) { const links = []; for (let i = 0; i < 2; i++) links.push(xf(new THREE.TorusGeometry(0.07, 0.022, 4, 8), [0, -1.66 - i * 0.1, 0.05], [0, (i % 2) * Math.PI / 2, 0]));
      arm.add(new THREE.Mesh(merge(links), basic(0x15100c)));
      const ball = inked(new THREE.IcosahedronGeometry(0.32, 1), { color: 0x2c3440, shift: 0x3fc1ff, y0: 0, y1: 0.7, ow: 0.02 }); ball.position.set(0, -1.86, 0.05); arm.add(ball); } }
  const eye = new THREE.Mesh(merge([-1, 1].map((sd) => xf(new THREE.BoxGeometry(0.15, 0.055, 0.02), [sd * 0.13, 0, 0], [0, 0, sd * 0.12]))), basic(0x8a1a10)); eye.position.set(0, 2.52, 0.48); armor.add(eye);
  const eg = glow(0xff3010, 0.7, 0.25, 0.45); eg.position.set(0, 2.52, 0.55); armor.add(eg);
  const halo = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.45, 40).rotateX(-Math.PI / 2), basic(0x8a1a10, { transparent: true, opacity: 0.7, depthWrite: false })); halo.position.y = 0.03; grp.add(halo);
  body.scale.setScalar(1.12); grp.userData.halo = halo; Object.assign(grp.userData, { body, core, armor, r: 0.9, height: 3.4, eye }); return grp;
}

// ============================ IL RILEGATORE ============================
// Tavole 010/034: figura curva avvolta in un mantello scuro, maschera di carta bianca a punta con un lungo becco-ago,
// occhi tristi. I fili color crema che lo avvolgono sono il suo componente (FRAGILE + colpo forte li spezza).
export function makeRilegatore() {
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
  const prof = [[0.62, 0], [0.63, 0.1], [0.56, 0.6], [0.46, 1.1], [0.33, 1.45], [0.14, 1.64], [0.02, 1.7]];
  const cg = raggedHem(lathe(prof, 24), 0.35, 0.16, 9, 4); const coat = inked(cg, { color: 0x2a2830, shift: 0xd8cbb0, y0: 0, y1: 1.8, ow: 0.028 }); coat.material.side = THREE.DoubleSide; coat.rotation.x = 0.22; body.add(coat);
  body.add(new THREE.Mesh(merge(strands(28, 0.5, 0.6, 0.35, 0.18, 0.4, 0.025, 11)), basic(0x141218)));
  // testa: cappuccio + maschera a punta + becco-ago
  const head = new THREE.Group(); head.position.set(0, 1.58, 0.42); head.rotation.x = 0.35; body.add(head);
  const hood = inked(lathe([[0.27, 0], [0.29, 0.14], [0.24, 0.3], [0.12, 0.42], [0, 0.46]], 16, 0.8, Math.PI * 2 - 1.6), { color: 0x23212a, ow: 0.02 }); hood.material.side = THREE.DoubleSide; hood.position.set(0, -0.12, -0.08); head.add(hood);
  const mg = new THREE.ConeGeometry(0.24, 0.62, 4, 1); mg.rotateY(Math.PI / 4); mg.scale(1, 1, 0.38); const mask = inked(mg, { color: 0xeee6d2, y0: 1.4, y1: 2.2, ow: 0.016 }); mask.position.set(0, 0.06, 0.12); head.add(mask);
  const beak = inked(new THREE.ConeGeometry(0.045, 0.95, 8).rotateX(Math.PI / 2 + 0.5), { color: 0xd9cfb8, ow: 0.012 }); beak.position.set(0, -0.12, 0.6); head.add(beak);
  head.add(new THREE.Mesh(merge([-1, 1].flatMap((sd) => [xf(new THREE.SphereGeometry(0.04, 8, 6), [sd * 0.075, 0.02, 0.2], 0, [1.2, 0.7, 0.4]), xf(new THREE.BoxGeometry(0.08, 0.01, 0.01), [sd * 0.075, 0.07, 0.205], [0, 0, sd * -0.35])])), basic(0x120c0a)));
  // i fili (componente) + aghi nelle mani
  const armor = new THREE.Group(); body.add(armor); armor.rotation.x = 0.22;
  for (let i = 0; i < 10; i++) { const y = 0.2 + i * 0.14; let r = 0.6; for (let k = 1; k < prof.length; k++) if (y <= prof[k][1]) { const [r0, y0] = prof[k - 1], [r1, y1] = prof[k]; r = r0 + (r1 - r0) * (y - y0) / (y1 - y0); break; }
    const t = inked(new THREE.TorusGeometry(r + 0.02, 0.012, 4, 22), { color: 0xd8cbb0, outline: false }); t.rotation.x = Math.PI / 2 + (i % 2 ? 0.3 : -0.25) * (0.6 + hash(i) * 0.6); t.rotation.y = hash(i + 3) * 3; t.position.y = y; armor.add(t); }
  for (const sd of [-1, 1]) { const n = inked(new THREE.ConeGeometry(0.04, 1.2, 5), { color: 0x9a9a9a, ow: 0.012 }); n.position.set(sd * 0.55, 1.0, 0.35); n.rotation.x = 1.2; body.add(n); }
  g.userData = { body, armor, height: 2.3, r: 0.55 }; return g;
}

// ============================ IL COPISTA (aggiunte al grande acaro) ============================
// Tavole 068/070: bestia d'inchiostro irsuta con aculei lunghi, occhi rossi, che regge un registro aperto macchiato.
export function makeCopistaExtras() {
  const g = new THREE.Group(); const sp = [];
  for (let i = 0; i < 16; i++) { const a = -1.3 + (i / 15) * 2.6, up = 0.5 + hash(i) * 0.5; const d = new V3(Math.sin(a) * 0.7, up, -0.35 - hash(i + 5) * 0.4).normalize(); const L = 0.18 + hash(i + 2) * 0.22;
    const c = new THREE.ConeGeometry(0.03, L, 4); c.translate(0, L / 2, 0); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d)); c.translate(d.x * 0.26, d.y * 0.26, d.z * 0.26); sp.push(c); }
  g.add(inked(merge(sp), { color: 0x0d0907, ow: 0.01 }));
  const book = new THREE.Group(); book.position.set(0, -0.04, 0.3); book.rotation.x = -0.5; g.add(book);
  book.add(inked(merge([xf(new THREE.BoxGeometry(0.24, 0.02, 0.3), [-0.12, 0, 0], [0, 0, 0.25]), xf(new THREE.BoxGeometry(0.24, 0.02, 0.3), [0.12, 0, 0], [0, 0, -0.25])]), { color: 0x3a2a20, ow: 0.008 }));
  book.add(inked(merge([xf(new THREE.BoxGeometry(0.22, 0.03, 0.28), [-0.11, 0.022, 0], [0, 0, 0.25]), xf(new THREE.BoxGeometry(0.22, 0.03, 0.28), [0.11, 0.022, 0], [0, 0, -0.25])]), { color: 0xd8cbb0, ow: 0.006 }));
  const spots = []; for (let i = 0; i < 7; i++) { const sd = i % 2 ? 1 : -1; spots.push(xf(new THREE.SphereGeometry(0.018 + hash(i) * 0.015, 5, 4), [sd * (0.05 + hash(i + 1) * 0.12), 0.04 + 0.12 * 0.25 * (0.05 + hash(i + 1) * 0.12) / 0.12, -0.1 + hash(i + 3) * 0.2], 0, [1, 0.3, 1])); }
  book.add(new THREE.Mesh(merge(spots), basic(0x7a1410)));
  return g;
}

// ============================ ILDE (prologo, alla scrivania) ============================
// Tavole 009/045/051: capelli grigi raccolti in una crocchia con una matita infilata, occhiali tondi, scialle scuro
// sfrangiato con i bordi rossi sopra un abito grigio. Restituisce i pezzi da aggiungere al gruppo di Ilde del film.
export function makeIldeParts() {
  const g = new THREE.Group();
  const robe = inked(lathe([[1.4, 0], [1.3, 0.8], [1.05, 1.8], [0.95, 2.5], [0.7, 3.0], [0.35, 3.2]], 24), { color: 0x45403b, y0: 0, y1: 3.2 }); robe.material.side = THREE.DoubleSide; g.add(robe);
  const sp = [[1.3, 0], [1.22, 0.5], [1.08, 1.0], [0.92, 1.4], [0.68, 1.7], [0.42, 1.86]]; const P0 = 0.55, PL = Math.PI * 2 - 1.1;
  const sg = raggedHem(lathe(sp, 28, P0, PL), 0.5, 0.35, 8, 3); sg.translate(0, 1.36, 0);
  const shawl = inked(sg, { color: 0x1f1a17, shift: 0x7a1f14, y0: 1.3, y1: 3.3, ow: 0.03 }); shawl.material.side = THREE.DoubleSide; g.add(shawl);
  const bands = merge([P0, P0 + PL - 0.14].map((a) => { const b = raggedHem(lathe(sp.map(([r, y]) => [r * 1.015, y]), 3, a, 0.14), 0.5, 0.35, 8, 3); b.translate(0, 1.36, 0); return b; }));
  const band = inked(bands, { color: 0x7a1f14, outline: false }); band.material.side = THREE.DoubleSide; g.add(band);
  const hair = inked(lathe([[0.56, 0], [0.6, 0.3], [0.5, 0.68], [0.25, 0.9], [0, 0.95]], 18), { color: 0xa39d94 }); hair.position.set(0, 3.38, 0.05); g.add(hair);
  const bun = inked(new THREE.SphereGeometry(0.3, 12, 9), { color: 0xb2aca2 }); bun.position.set(0, 4.15, -0.2); g.add(bun);
  const pencil = inked(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 6), { color: 0x2a221c, ow: 0.01 }); pencil.position.set(0.15, 4.25, -0.2); pencil.rotation.z = -1.05; g.add(pencil);
  const strandsM = new THREE.Mesh(merge([0, 1, 2, 3, 4, 5].map((i) => xf(new THREE.CylinderGeometry(0.015, 0.005, 0.5 + hash(i) * 0.3, 3), [-0.45 + i * 0.18, 3.4, 0.35 - Math.abs(i - 2.5) * 0.1], [0.3, 0, (i - 2.5) * 0.15]))), basic(0x8f877c)); g.add(strandsM);
  return g;
}
export function makeIldeFace() { // occhiali tondi con ponte, naso, occhi socchiusi (figli della testa, raggio 0,5)
  const g = new THREE.Group();
  g.add(new THREE.Mesh(merge([xf(new THREE.TorusGeometry(0.13, 0.018, 4, 16), [-0.18, 0.02, 0.47]), xf(new THREE.TorusGeometry(0.13, 0.018, 4, 16), [0.18, 0.02, 0.47]), xf(new THREE.BoxGeometry(0.1, 0.02, 0.02), [0, 0.05, 0.5]),
    xf(new THREE.BoxGeometry(0.11, 0.015, 0.015), [-0.17, -0.0, 0.48], [0, 0, 0.12]), xf(new THREE.BoxGeometry(0.11, 0.015, 0.015), [0.17, -0.0, 0.48], [0, 0, -0.12]), xf(new THREE.BoxGeometry(0.16, 0.012, 0.012), [0, -0.27, 0.45])]), basic(0x16110d)));
  const nose = inked(new THREE.ConeGeometry(0.06, 0.18, 6), { color: 0xe2d4ba, outline: false }); nose.position.set(0, -0.08, 0.5); nose.rotation.x = 0.4; g.add(nose);
  return g;
}

// ============================ IL CARICATORE ============================
// Stessa forma di prima (guscio a tre piastre, testa scura, corna, mandibole, sei zampe, spine e crepe rosse),
// ma con le parti dello stesso materiale fuse: ~16 draw call invece di ~48. Agganci invariati: body, core, armor.
export function makeCharger() {
  const grp = new THREE.Group(); const body = new THREE.Group(); grp.add(body);
  const core = inked(new THREE.IcosahedronGeometry(0.38, 1), { color: 0x9e2b1c, shift: 0xff5530, ow: 0.02 }); core.position.set(0, 0.8, -0.1); body.add(core);
  const armor = new THREE.Group(); body.add(armor);
  armor.add(inked(merge([0, 1, 2].map((i) => xf(new THREE.SphereGeometry(0.78 - i * 0.08, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), [0, 0.45 + i * 0.05, -0.55 + i * 0.5], [-0.35 + i * 0.25, 0, 0], [1, 0.85, 0.75]))), { color: 0xc8b995, y0: 0.2, y1: 1.5, ow: 0.03 }));
  armor.add(inked(merge([0, 1, 2, 3, 4, 5].map((i) => xf(new THREE.ConeGeometry(0.08, 0.38 - Math.abs(i - 2.5) * 0.04, 5), [0, 1.12 - Math.abs(i - 2.5) * 0.05, -0.75 + i * 0.32], [-0.35, 0, 0]))), { color: 0x2a211a, outline: false }));
  armor.add(new THREE.Mesh(merge([0, 1, 2, 3].map((i) => xf(new THREE.BoxGeometry(0.03, 0.02, 0.5), [-0.45 + i * 0.3, 0.98 - Math.abs(i - 1.5) * 0.08, -0.1 + (i % 2) * 0.3], [0, (i - 1.5) * 0.4, 0]))), basic(0xc8321e)));
  const head = inked(new THREE.BoxGeometry(0.7, 0.45, 0.45), { color: 0x2a211a, outline: false }); head.position.set(0, 0.6, 0.95); body.add(head);
  const legs = [], bone = [], eyes = [];
  for (const s of [-1, 1]) { eyes.push(xf(new THREE.SphereGeometry(0.07, 8, 6), [s * 0.18, 0.68, 1.18]));
    bone.push(xf(new THREE.ConeGeometry(0.09, 0.55, 5), [s * 0.28, 0.82, 1.2], [Math.PI / 2.3, 0, s * -0.4]), xf(new THREE.ConeGeometry(0.07, 0.5, 5), [s * 0.2, 0.42, 1.3], [Math.PI / 2, 0, s * 0.6]));
    for (const z of [0.5, -0.1, -0.6]) legs.push(xf(new THREE.CylinderGeometry(0.07, 0.04, 0.55, 5), [s * 0.62, 0.22, z], [0, 0, s * 0.5]));
  }
  const eg = glow(0xff3a20, 0.6, 0.22, 0.8); eg.position.set(0, 0.68, 1.22); body.add(eg);
  body.add(inked(merge(legs), { color: 0x2a211a, outline: false })); body.add(inked(merge(bone), { color: 0xe8dcc0, ow: 0.015 })); body.add(new THREE.Mesh(merge(eyes), basic(0xff5530)));
  grp.userData = { body, core, armor, r: 0.85, height: 1.6 }; return grp;
}
