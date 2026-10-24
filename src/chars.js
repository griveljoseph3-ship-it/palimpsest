// Personaggi 3D ridisegnati sulle tavole ufficiali (docs/concept-art): Correttore (tav. 036/039/058), Elara (031/057/071),
// Lumi (048), Acari d'inchiostro (019/028), Custode (040/049), Rilegatore con maschera a becco (010/034), Copista (068/070).
// Tutto procedurale e leggero: le parti con lo stesso materiale sono fuse in una sola geometria (meno draw call su iPad).
import * as THREE from '../vendor/three.module.js?v=1.9.0';
import { inked, INK_UNIFORMS } from './art.js?v=1.9.0';

const V3 = THREE.Vector3;
const lathe = (pts, seg = 18, p0 = 0, pl = Math.PI * 2) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg, p0, pl);
let _rad = null; const radTex = () => { if (_rad) return _rad; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); _rad = new THREE.CanvasTexture(c); return _rad; };
const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
const glow = (color, sx, sy, op = 0.7) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radTex(), color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.set(sx, sy, 1); return s; };
// pseudo-casuale deterministico (le tavole non cambiano a ogni caricamento)
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// Trasforma una geometria (posizione, rotazione XYZ, scala) e la restituisce.
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
export function xf(geo, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
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
function raggedHem(geo, top, depth, freq = 13, seed = 1) {
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
  cg.scale(1, 1, 0.82); const cloak = inked(cg, { color: BLACK, shift: 0x7a1f14, y0: 0, y1: 1.45, ow: 0.03 }); cloak.material.side = THREE.DoubleSide; body.add(cloak);
  // fili d'inchiostro che colano dall'orlo e dalla mantellina (un solo mesh)
  const fr = merge([...strands(46, 0.38, 0.45, 0.5, 0.32, 0.58, 0.022, 3, Math.PI * 2, 0, 0.82), ...strands(22, 0.42, 0.47, 1.08, 0.2, 0.42, 0.02, 7, Math.PI * 2, 0, 0.82)]);
  const fringe = new THREE.Mesh(fr, basic(DEEP)); body.add(fringe);
  // mantellina sulle spalle, sfrangiata
  const capG = raggedHem(lathe([[0.52, 0], [0.5, 0.1], [0.43, 0.22], [0.26, 0.32]], 24), 0.14, 0.12, 9, 5); capG.scale(1, 1, 0.85); capG.translate(0, 1.0, 0);
  const capelet = inked(capG, { color: 0x252020, shift: 0x7a1f14, y0: 1, y1: 1.4, ow: 0.022 }); capelet.material.side = THREE.DoubleSide; body.add(capelet);
  // cappuccio a punta, piegato all'indietro, con bordo attorno al volto nero
  const hg = lathe([[0.25, 0], [0.28, 0.14], [0.26, 0.3], [0.19, 0.42], [0.1, 0.5], [0.02, 0.56]], 18, 0.7, Math.PI * 2 - 1.4); { const p = hg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) - (y / 0.56) ** 2 * 0.2); } hg.computeVertexNormals(); }
  const hood = inked(hg, { color: 0x2a2320, y0: 1.3, y1: 2, ow: 0.025 }); hood.material.side = THREE.DoubleSide; hood.position.set(0, 1.32, -0.02); body.add(hood);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), basic(0x030201)); head.scale.set(0.95, 1.15, 0.7); head.position.set(0, 1.5, 0.06); body.add(head);
    const eyes = new THREE.Mesh(merge([xf(new THREE.SphereGeometry(0.03, 8, 6), [-0.062, 1.53, 0.17], [0, 0, 0.15], [1.3, 0.75, 0.5]), xf(new THREE.SphereGeometry(0.03, 8, 6), [0.062, 1.53, 0.17], [0, 0, -0.15], [1.3, 0.75, 0.5])]), basic(0xffd45a)); body.add(eyes);
  const eyeGlow = glow(0xffb030, 0.24, 0.09, 0.28); eyeGlow.position.set(0, 1.53, 0.2); body.add(eyeGlow);
  // sciarpa rossa: due giri attorno al collo + due code sfrangiate (una sulla spalla, una sulla schiena)
  const RED = 0x8a2416;
  const scarf = inked(merge([xf(new THREE.TorusGeometry(0.22, 0.085, 7, 18), [0, 1.36, 0.01], [Math.PI / 2 + 0.12, 0, 0], [1, 0.9, 1]), xf(new THREE.TorusGeometry(0.3, 0.07, 6, 20), [0, 1.27, 0], [Math.PI / 2 - 0.12, 0.2, 0.08], [1, 0.85, 1])]), { color: RED, shift: 0xc8321e, y0: 1.1, y1: 1.4, ow: 0.018 }); body.add(scarf);
  const tail = new THREE.Group(); tail.position.set(0.17, 1.3, 0.19); body.add(tail);
  const t1 = inked(ribbonGeo(0.15, 0.72, 0.12, 0.14, 8, 2), { color: RED, outline: false }); t1.material.side = THREE.DoubleSide; t1.rotation.set(-0.15, 0.35, 0.18); tail.add(t1);
  const tail2 = new THREE.Group(); tail2.position.set(-0.12, 1.3, -0.24); body.add(tail2);
  const t2 = inked(ribbonGeo(0.17, 0.9, -0.22, 0.16, 9, 5), { color: 0x7a1f14, outline: false }); t2.material.side = THREE.DoubleSide; t2.rotation.set(0.25, 0.2, -0.1); tail2.add(t2);
  const rs = new THREE.Mesh(merge([...strands(7, 0, 0.06, -0.66, 0.1, 0.22, 0.012, 4, Math.PI * 2)].map((g) => g)), basic(0x6a160e)); t1.add(rs);
  // cintura, borse, boccetta, tracolla, stivali (un mesh marrone)
  const leather = inked(merge([xf(new THREE.TorusGeometry(0.38, 0.03, 4, 22), [0, 0.74, 0], [Math.PI / 2, 0, 0], [1, 0.82, 1]),
    xf(new THREE.BoxGeometry(0.13, 0.15, 0.08), [0.27, 0.64, 0.22], [0, 0.6, 0]), xf(new THREE.BoxGeometry(0.11, 0.13, 0.07), [-0.3, 0.65, 0.17], [0, -0.7, 0]),
    xf(new THREE.BoxGeometry(0.06, 0.95, 0.03), [0, 1.0, -0.3], [0.12, 0, 0.62]), xf(new THREE.BoxGeometry(0.2, 0.18, 0.09), [0.22, 0.7, -0.29], [0, 0.4, 0])]), { color: 0x5a3e26, ow: 0.012 }); body.add(leather);
  const vial = inked(new THREE.CylinderGeometry(0.04, 0.045, 0.14, 8), { color: 0x1b2a3a, shift: 0x3fc1ff, ow: 0.012 }); vial.position.set(-0.36, 0.64, -0.08); body.add(vial);
  const boots = new THREE.Mesh(merge([xf(new THREE.SphereGeometry(0.1, 8, 6), [-0.13, 0.05, 0.14], 0, [1, 0.6, 1.5]), xf(new THREE.SphereGeometry(0.1, 8, 6), [0.13, 0.05, 0.14], 0, [1, 0.6, 1.5])]), basic(0x0c0806)); body.add(boots);
  // LA PENNA (stessa forma e stessi punti d'aggancio di prima: nib, nibGlow, quill, quillPivot)
  const quillPivot = new THREE.Group(); quillPivot.position.set(0.36, 1.0, 0.05); body.add(quillPivot);
  const quill = new THREE.Group(); quill.scale.setScalar(1.7); quillPivot.add(quill);
  const barrel = inked(new THREE.CylinderGeometry(0.045, 0.055, 0.62, 10).rotateX(Math.PI / 2), { color: 0x120c0a, shift: 0x8a2416, ow: 0.015 }); barrel.position.z = 0.42; quill.add(barrel);
  const gold = basic(0xd8a63a);
  quill.add(new THREE.Mesh(merge([xf(new THREE.TorusGeometry(0.056, 0.014, 6, 14), [0, 0, 0.16]), xf(new THREE.TorusGeometry(0.056, 0.014, 6, 14), [0, 0, 0.7]), xf(new THREE.SphereGeometry(0.05, 10, 6), [0, 0, -0.17], 0, [1, 1, 0.6])]), gold));
  const grip = inked(new THREE.CylinderGeometry(0.05, 0.034, 0.18, 10).rotateX(Math.PI / 2), { color: 0x8a2416, ow: 0.012 }); grip.position.z = 0.82; quill.add(grip);
  const nibGeo = new THREE.ConeGeometry(0.036, 0.22, 4).rotateX(Math.PI / 2); nibGeo.scale(1.7, 0.4, 1.25); const nibM = new THREE.Mesh(merge([xf(nibGeo, [0, 0, 1.01]), xf(new THREE.BoxGeometry(0.018, 0.012, 0.3), [0, 0.068, 0.02]), xf(new THREE.SphereGeometry(0.018, 6, 4), [0, 0.07, 0.17])]), basic(0xe8be55)); quill.add(nibM);
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.02, 0.12), basic(0x120c0a)); slit.position.set(0, 0.012, 1.04); quill.add(slit);
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), basic(0x8a1a10)); drop.scale.y = 1.4; drop.position.set(0, -0.04, 1.12); quill.add(drop);
  const nibGlow = glow(0xff5a30, 0.35, 0.35, 1); nibGlow.position.z = 1.1; quill.add(nibGlow);
  const cap = inked(new THREE.CylinderGeometry(0.058, 0.05, 0.3, 12).rotateX(Math.PI / 2), { color: 0x120c0a, shift: 0x8a2416, ow: 0.015 }); cap.position.z = -0.02; quill.add(cap);
  const nib = new THREE.Object3D(); nib.position.z = 1.12; quill.add(nib);
  // movimento secondario: code della sciarpa e frange seguono la corsa
  const anim = (t, sp = 0) => { const k = Math.min(1, sp / 5); tail.rotation.x = -0.1 - k * 0.5 + Math.sin(t * 3.1) * (0.06 + k * 0.08); tail.rotation.z = Math.sin(t * 2.3) * 0.05;
    tail2.rotation.x = 0.15 + k * 0.85 + Math.sin(t * 2.7 + 1) * (0.07 + k * 0.12); tail2.rotation.z = Math.sin(t * 1.9) * 0.08;
    fringe.rotation.x = k * 0.06 + Math.sin(t * 5) * 0.012; fringe.scale.y = 1 + Math.sin(t * 2.2) * 0.02; eyeGlow.material.opacity = 0.25 + Math.sin(t * 1.7) * 0.06; };
  grp.userData = { body, cloak, head, quillPivot, quill, tail, nib, nibGlow, nibWorld: new THREE.Vector3(), r: 0.38, anim }; return grp;
}
