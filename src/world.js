// S4 · Mondo: stanze-pagina, entità e personaggi disegnati a inchiostro.
import * as THREE from '../vendor/three.module.js';
import { inked, inkMaster, withMask, outlineMat, INK_UNIFORMS } from './art.js';

export const ROOMS = [
  { id: 'intro', cx: 0, cz: 0, w: 12, d: 10, safe: true, title: 'I · La tavola' },
  { id: 'charger', cx: 0, cz: -14, w: 14, d: 12, safe: false, title: 'II · Il Caricatore' },
  { id: 'conduct', cx: 0, cz: -28, w: 12, d: 10, safe: true, title: 'III · La pressa' },
  { id: 'door', cx: 0, cz: -44, w: 16, d: 12, safe: true, title: 'IV · La porta che giudica' },
  { id: 'arena', cx: 0, cz: -62, w: 16, d: 14, safe: false, title: 'V · Il Custode della Fenditura' },
  { id: 'end', cx: 0, cz: -80, w: 12, d: 10, safe: true, title: 'VI · Conseguenza' },
];
export const GAP = 2.4;

function textCanvas(lines, w, h, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  if (opts.bg) { g.fillStyle = opts.bg; g.fillRect(0, 0, w, h); }
  g.fillStyle = opts.color || 'rgba(30,22,16,0.55)'; g.font = opts.font || 'italic 28px Georgia, serif'; g.textBaseline = 'top';
  let y = opts.y0 ?? 20; const lh = opts.lh ?? 40;
  for (const ln of lines) { g.fillText(ln, opts.x0 ?? 24, y);
    if (opts.strike && Math.random() < 0.35) { const tw = g.measureText(ln).width; g.strokeStyle = 'rgba(20,14,10,.75)'; g.lineWidth = 3; g.beginPath(); const sx = 24 + Math.random() * tw * 0.4; g.moveTo(sx, y + 16); for (let x = sx; x < sx + tw * 0.5; x += 12) g.lineTo(x, y + 14 + Math.random() * 6); g.stroke(); }
    y += lh; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const MANUSCRIPT = ['e il Custode chiuse la pagina perché', 'nessuno potesse più cambiarla, e la', 'porta pronunciò il suo verdetto sopra', 'Elara, che non aveva scritto niente', 'di quella riga. Lumi non esisteva', 'ancora: nasce solo dagli errori.', 'La tavola reggeva il passaggio. Era', 'integra, diceva il libro. Integra.', 'Il ponte non conduceva nulla. Il', 'Caricatore era vigile, sempre vigile.'];

export function buildWorld(scene, paper) {
  const walls = []; const g = new THREE.Group(); scene.add(g);
  const floorMat = inkMaster({ color: 0xe9dfc8, texBlend: 1, texScale: 0.12, outline: false });
  const wallMat = inkMaster({ color: 0xd8cbb0, texBlend: 0.9, texScale: 0.3, y0: 0, y1: 1.4 });
  const ol = outlineMat(0.03);
  const addWall = (x0, z0, x1, z1, h = 1.3) => {
    const w = Math.abs(x1 - x0) || 0.3, d = Math.abs(z1 - z0) || 0.3; const geo = withMask(new THREE.BoxGeometry(w, h, d), 0.4);
    const m = new THREE.Mesh(geo, wallMat); m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); const o = new THREE.Mesh(geo, ol); m.add(o); g.add(m);
    walls.push({ minX: Math.min(x0, x1) - (w === 0.3 ? 0.15 : 0), maxX: Math.max(x0, x1) + (w === 0.3 ? 0.15 : 0), minZ: Math.min(z0, z1) - (d === 0.3 ? 0.15 : 0), maxZ: Math.max(z0, z1) + (d === 0.3 ? 0.15 : 0) }); return m;
  };
  ROOMS.forEach((r, i) => {
    const x0 = r.cx - r.w / 2, x1 = r.cx + r.w / 2, zs = r.cz + r.d / 2, zn = r.cz - r.d / 2;
    const fl = new THREE.Mesh(withMask(new THREE.PlaneGeometry(r.w + 0.4, r.d + 0.4).rotateX(-Math.PI / 2), 0), floorMat); fl.position.set(r.cx, 0, r.cz); g.add(fl);
    // manoscritto con cancellature sul pavimento
    const tex = textCanvas(MANUSCRIPT.slice(i % 3, i % 3 + 7), 1024, 512, { strike: true, lh: 66, font: 'italic 40px Georgia, serif', y0: 30 });
    const ms = new THREE.Mesh(new THREE.PlaneGeometry(r.w * 0.8, r.d * 0.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.5 }));
    ms.position.set(r.cx + (i % 2 ? 1 : -1), 0.006, r.cz + 1.2); g.add(ms);
    addWall(x0, zs, x0, zn); addWall(x1, zs, x1, zn);
    const hasS = i > 0, hasN = i < ROOMS.length - 1;
    if (hasS) { addWall(x0, zs, -GAP / 2, zs, 0.45); addWall(GAP / 2, zs, x1, zs, 0.45); } else addWall(x0, zs, x1, zs, 0.45);
    if (hasN) { addWall(x0, zn, -GAP / 2, zn); addWall(GAP / 2, zn, x1, zn);
      const nz = ROOMS[i + 1].cz + ROOMS[i + 1].d / 2; addWall(-GAP / 2 - 0.15, zn, -GAP / 2 - 0.15, nz, 0.7); addWall(GAP / 2 + 0.15, zn, GAP / 2 + 0.15, nz, 0.7);
      const cf = new THREE.Mesh(withMask(new THREE.PlaneGeometry(GAP + 0.3, zn - nz).rotateX(-Math.PI / 2), 0), floorMat); cf.position.set(0, -0.001, (zn + nz) / 2); g.add(cf);
    } else addWall(x0, zn, x1, zn);
  });
  // pozze di luce calda (additive) e scrivania sotto il libro
  const lc = document.createElement('canvas'); lc.width = lc.height = 128; const lg = lc.getContext('2d'); const gr = lg.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,214,150,0.55)'); gr.addColorStop(0.5, 'rgba(255,190,120,0.18)'); gr.addColorStop(1, 'rgba(255,190,120,0)'); lg.fillStyle = gr; lg.fillRect(0, 0, 128, 128);
  const lt = new THREE.CanvasTexture(lc);
  ROOMS.forEach((r, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(r.w * 1.1, r.d * 1.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: lt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 })); m.position.set(r.cx - 1.5, 0.02, r.cz - 0.5); g.add(m); });
  const dc = document.createElement('canvas'); dc.width = dc.height = 256; const dg = dc.getContext('2d'); dg.fillStyle = '#21160f'; dg.fillRect(0, 0, 256, 256); for (let i = 0; i < 160; i++) { dg.strokeStyle = `rgba(${60 + Math.random() * 30},${38 + Math.random() * 20},${24},.35)`; dg.lineWidth = 1 + Math.random() * 2; dg.beginPath(); const y = Math.random() * 256; dg.moveTo(0, y); dg.bezierCurveTo(80, y + Math.random() * 10 - 5, 170, y + Math.random() * 10 - 5, 256, y); dg.stroke(); }
  // lavatura d'inchiostro ai margini di ogni pagina
  const wc = document.createElement('canvas'); wc.width = 512; wc.height = 512; const wg = wc.getContext('2d');
  for (let i = 0; i < 260; i++) { const t = Math.random(), side = Math.floor(Math.random() * 4); let x = side < 2 ? t * 512 : (side === 2 ? 0 : 512), y = side < 2 ? (side === 0 ? 0 : 512) : t * 512; const r = 30 + Math.random() * 70;
    const rg = wg.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(26,18,12,0.22)'); rg.addColorStop(1, 'rgba(26,18,12,0)'); wg.fillStyle = rg; wg.fillRect(x - r, y - r, r * 2, r * 2); }
  for (let i = 0; i < 14; i++) { wg.fillStyle = 'rgba(20,12,8,0.5)'; const x = Math.random() * 512, y = Math.random() < 0.5 ? Math.random() * 40 : 472 + Math.random() * 40; wg.beginPath(); wg.arc(x, y, 2 + Math.random() * 6, 0, 6.3); wg.fill(); }
  const wt = new THREE.CanvasTexture(wc);
  ROOMS.forEach((r) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: wt, transparent: true, depthWrite: false })); m.position.set(r.cx, 0.008, r.cz); g.add(m); });
  const dt = new THREE.CanvasTexture(dc); dt.wrapS = dt.wrapT = THREE.RepeatWrapping; dt.repeat.set(6, 20); dt.colorSpace = THREE.SRGBColorSpace;
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(80, 140).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: dt, color: 0x9a8a7a })); desk.position.set(0, -0.6, -40); g.add(desk);
  const under = new THREE.Mesh(new THREE.BoxGeometry(18.5, 0.58, 96), new THREE.MeshBasicMaterial({ color: 0xcfc3a6 })); under.position.set(0, -0.3, -40); g.add(under); // spessore delle pagine
  // corridoio della prova nella stanza di Elara
  addWall(-5, -38, -5, -46.2);
  // fogli che pendono e rilegatura: dettagli d'atmosfera
  const scraps = new THREE.Group(); g.add(scraps);
  for (let i = 0; i < 26; i++) { const r = ROOMS[i % ROOMS.length]; const side = i % 2 ? 1 : -1;
    const p = new THREE.Mesh(withMask(new THREE.PlaneGeometry(0.5 + Math.random() * 0.5, 0.7 + Math.random() * 0.6), 0.2), inkMaster({ color: 0xf1e8d4, texBlend: 1 }));
    p.material.side = THREE.DoubleSide; p.position.set(r.cx + side * (r.w / 2 - 0.05), 1.6 + Math.random() * 0.6, r.cz + (Math.random() - 0.5) * r.d * 0.8); p.rotation.y = side * Math.PI / 2; p.rotation.z = (Math.random() - 0.5) * 0.4; p.userData.sw = Math.random() * 6; scraps.add(p); }
  return { group: g, walls, scraps, floorMat, wallMat };
}

// ---- entità ----
export function makeBoard() {
  const grp = new THREE.Group();
  const board = inked(new THREE.BoxGeometry(GAP + 0.2, 1.6, 0.18, 6, 4, 1), { color: 0xcdb48a, y0: 0, y1: 1.6, ow: 0.03 }); board.position.y = 0.8; grp.add(board);
  const tear = inked(new THREE.PlaneGeometry(0.5, 1.1), { color: 0x120c0a, outline: false }); tear.position.set(0.3, 0.9, 0.1); tear.rotation.z = 0.2; grp.add(tear);
  grp.userData.body = board; return grp;
}
export function makeCharger() {
  const grp = new THREE.Group(); const body = new THREE.Group(); grp.add(body);
  const core = inked(new THREE.IcosahedronGeometry(0.42, 1), { color: 0x9e2b1c, shift: 0xff5530, ow: 0.02 }); core.position.y = 0.75; body.add(core);
  const armor = inked(new THREE.SphereGeometry(0.85, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), { color: 0xc9b896, y0: 0.2, y1: 1.6 }); armor.position.y = 0.45; armor.scale.set(1, 0.95, 1.25); body.add(armor);
  const horn = inked(new THREE.ConeGeometry(0.16, 0.7, 6), { color: 0x2a211a }); horn.rotation.x = Math.PI / 2.4; horn.position.set(0, 0.9, 0.95); body.add(horn);
  for (const s of [-1, 1]) { const leg = inked(new THREE.CylinderGeometry(0.1, 0.06, 0.5, 5), { color: 0x2a211a }); leg.position.set(s * 0.5, 0.25, 0.3); body.add(leg); const l2 = leg.clone(); l2.position.z = -0.4; body.add(l2); }
  grp.userData = { body, core, armor, r: 0.85, height: 1.6 }; return grp;
}
export function makeCustode() {
  const grp = new THREE.Group(); const body = new THREE.Group(); grp.add(body);
  const core = inked(new THREE.OctahedronGeometry(0.42, 0), { color: 0x9e2b1c, shift: 0xff5530, ow: 0.02 }); core.position.y = 1.5; body.add(core);
  const armor = new THREE.Group(); body.add(armor);
  const torso = inked(new THREE.BoxGeometry(1.4, 1.5, 0.9, 3, 3, 2), { color: 0xbfae8c, y0: 0.6, y1: 2.6 }); torso.position.y = 1.55; armor.add(torso);
  const head = inked(new THREE.BoxGeometry(0.7, 0.55, 0.6), { color: 0xd3c4a2, y0: 2.3, y1: 2.9 }); head.position.y = 2.6; armor.add(head);
  for (const s of [-1, 1]) { const sh = inked(new THREE.BoxGeometry(0.55, 0.35, 0.95), { color: 0x2b221b }); sh.position.set(s * 0.95, 2.15, 0); sh.rotation.z = s * -0.25; armor.add(sh);
    const arm = inked(new THREE.BoxGeometry(0.32, 1.3, 0.32), { color: 0xb5a37f }); arm.position.set(s * 0.95, 1.35, 0.1); armor.add(arm); arm.userData.side = s; armor.userData['arm' + s] = arm; }
  const legs = inked(new THREE.BoxGeometry(1.0, 0.8, 0.6), { color: 0x2b221b }); legs.position.y = 0.4; body.add(legs);
  // occhio: una riga d'inchiostro rigida
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: 0x8a1a10 })); eye.position.set(0, 2.62, 0.31); armor.add(eye);
  grp.userData = { body, core, armor, r: 0.9, height: 2.9, eye }; return grp;
}
export function makePlayer() {
  const grp = new THREE.Group(); const body = new THREE.Group(); grp.add(body);
  const cloak = inked(new THREE.ConeGeometry(0.42, 1.25, 9, 3, true), { color: 0x2c2420, shift: 0x7a1f14, y0: 0, y1: 1.3 }); cloak.position.y = 0.66; cloak.material.side = THREE.DoubleSide; body.add(cloak);
  const torso = inked(new THREE.CapsuleGeometry(0.2, 0.45, 4, 8), { color: 0x3a302a, y0: 0.6, y1: 1.4 }); torso.position.y = 1.05; body.add(torso);
  const head = inked(new THREE.SphereGeometry(0.21, 14, 10), { color: 0xf2e9d6, y0: 1.3, y1: 1.75 }); head.position.y = 1.55; body.add(head);
  const hood = inked(new THREE.ConeGeometry(0.27, 0.45, 9), { color: 0x2c2420 }); hood.position.set(0, 1.72, -0.04); hood.rotation.x = -0.25; body.add(hood);
  const sash = inked(new THREE.TorusGeometry(0.22, 0.04, 5, 12), { color: 0x8a2416, outline: false }); sash.rotation.x = Math.PI / 2; sash.position.y = 0.95; body.add(sash);
  const quillPivot = new THREE.Group(); quillPivot.position.set(0.32, 1.05, 0.05); body.add(quillPivot);
  const quill = inked(new THREE.ConeGeometry(0.06, 1.2, 6), { color: 0x15100c, shift: 0x8a2416 }); quill.rotation.x = Math.PI / 2; quill.position.z = 0.55; quillPivot.add(quill);
  const feather = inked(new THREE.PlaneGeometry(0.22, 0.55), { color: 0xeee4cf, outline: false }); feather.material.side = THREE.DoubleSide; feather.position.set(0, 0.12, -0.15); feather.rotation.x = -0.4; quillPivot.add(feather);
  grp.userData = { body, cloak, head, quillPivot, quill, r: 0.38 }; return grp;
}
export function makeLumi() {
  const grp = new THREE.Group();
  const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 3), new THREE.ShaderMaterial({ uniforms: { uTime: INK_UNIFORMS.uTime },
    vertexShader: `uniform float uTime; varying float vF; void main(){ vec3 p=position; float w=sin(p.y*9.+uTime*4.)*.07+sin(p.x*7.-uTime*3.)*.06; p+=normal*w; vF=pow(1.-abs(normalize(normalMatrix*normal).z),2.); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: `varying float vF; void main(){ gl_FragColor=vec4(mix(vec3(.03,.02,.03),vec3(.55,.12,.08),vF),1.); }` }));
  grp.add(blob); const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), new THREE.MeshBasicMaterial({ color: 0xf3ead6 })); e1.position.set(-0.09, 0.05, 0.24); const e2 = e1.clone(); e2.position.x = 0.09; grp.add(e1, e2);
  grp.userData.blob = blob; return grp;
}
export function makeElaraPage(guilty = true) {
  const grp = new THREE.Group();
  const draw = (state) => { const c = document.createElement('canvas'); c.width = 512; c.height = 768; const g = c.getContext('2d');
    g.fillStyle = '#efe5cf'; g.fillRect(0, 0, 512, 768); g.strokeStyle = '#2a1f16'; g.lineWidth = 6; g.strokeRect(14, 14, 484, 740);
    g.fillStyle = 'rgba(40,28,20,.35)'; g.font = 'italic 22px Georgia'; for (let i = 0; i < 16; i++) g.fillText('elara elara non ha scritto questa riga'.slice(0, 20 + (i * 7) % 18), 40, 360 + i * 24);
    // volto a inchiostro
    g.strokeStyle = '#1b130e'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.ellipse(256, 210, 95, 125, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(200, 200); g.quadraticCurveTo(215, state.eyes, 230, 200); g.moveTo(282, 200); g.quadraticCurveTo(297, state.eyes, 312, 200); g.stroke();
    g.beginPath(); g.moveTo(225, 280); g.quadraticCurveTo(256, 280 + state.mouth, 287, 280); g.stroke();
    g.beginPath(); g.moveTo(170, 120); g.bezierCurveTo(120, 260, 140, 380, 110, 470); g.moveTo(342, 120); g.bezierCurveTo(392, 260, 372, 380, 402, 470); g.stroke();
    if (state.verdict) { g.save(); g.translate(256, 520); g.rotate(-0.08); g.fillStyle = '#8a1a10'; g.font = 'bold 74px Georgia'; g.textAlign = 'center'; g.fillText(state.verdict, 0, 0); g.restore(); }
    if (state.torn) { g.fillStyle = '#120c0a'; g.beginPath(); g.moveTo(330, 0); for (let y = 0; y <= 768; y += 30) g.lineTo(320 + Math.random() * 40, y); g.lineTo(512, 768); g.lineTo(512, 0); g.fill(); }
    if (state.seam) { g.strokeStyle = '#5a1810'; g.lineWidth = 3; for (let y = 40; y < 740; y += 26) { g.beginPath(); g.moveTo(330, y); g.lineTo(350, y + 12); g.stroke(); } }
    return c; };
  const st = { eyes: 190, mouth: -6, verdict: guilty ? 'COLPEVOLE' : '', torn: false, seam: false };
  const tex = new THREE.CanvasTexture(draw(st)); tex.colorSpace = THREE.SRGBColorSpace;
  const page = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.9, 8, 8), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })); page.position.y = 2.0; grp.add(page);
  const frame = inked(new THREE.BoxGeometry(3.0, 0.25, 0.4), { color: 0x2b221b }); frame.position.y = 4.05; grp.add(frame);
  grp.userData = { page, st, redraw: () => { tex.image = draw(st); tex.needsUpdate = true; } }; return grp;
}
export function makePress() {
  const grp = new THREE.Group();
  const base = inked(new THREE.BoxGeometry(1.4, 0.4, 1.4), { color: 0x3a2f27 }); base.position.y = 0.2; grp.add(base);
  const col = inked(new THREE.CylinderGeometry(0.15, 0.15, 2.2, 6), { color: 0x2b221b }); col.position.set(-0.5, 1.2, 0); grp.add(col); const c2 = col.clone(); c2.position.x = 0.5; grp.add(c2);
  const ram = inked(new THREE.BoxGeometry(1.2, 0.5, 1.2), { color: 0x8c7a5c, y0: 0.4, y1: 2.4 }); ram.position.y = 1.9; grp.add(ram);
  grp.userData = { ram }; return grp;
}
export function makeWire(points, w = 0.12) {
  const grp = new THREE.Group(); const segs = [];
  for (let i = 0; i < points.length - 1; i++) { const a = points[i], b = points[i + 1]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, len), new THREE.MeshBasicMaterial({ color: 0x3a2a20 })); m.position.set((a[0] + b[0]) / 2, 0.03, (a[1] + b[1]) / 2); m.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]); grp.add(m); segs.push(m); }
  grp.userData.segs = segs; grp.userData.len = segs.length; return grp;
}
export function makePlate(w = 1.4, d = 1.4, color = 0x9a6a3a) { const m = inked(new THREE.BoxGeometry(w, 0.12, d), { color, shift: 0x3fc1ff, y0: 0, y1: 0.15, ow: 0.02 }); m.position.y = 0.06; return m; }
export function makeGate() { const m = inked(new THREE.BoxGeometry(GAP + 0.2, 1.8, 0.25), { color: 0x6b5a46, y0: 0, y1: 1.8 }); m.position.y = 0.9; return m; }
export function makePillar() { const m = inked(new THREE.CylinderGeometry(0.62, 0.75, 2.6, 10, 4), { color: 0xcbbd9e, y0: 0, y1: 2.6 }); m.position.y = 1.3; return m; }
export function makeSeal() {
  const grp = new THREE.Group(); const disc = inked(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 20), { color: 0x8a1a10, shift: 0xffd27a }); disc.rotation.x = Math.PI / 2; disc.position.y = 1.2; grp.add(disc);
  const stand = inked(new THREE.BoxGeometry(0.3, 1.0, 0.3), { color: 0x2b221b }); stand.position.y = 0.5; grp.add(stand); grp.userData.disc = disc; return grp;
}
export function makeMonolith() { const m = inked(new THREE.CylinderGeometry(0.45, 0.6, 1.2, 6), { color: 0x2b221b, shift: 0x9e2b1c, y0: 0, y1: 1.2 }); m.position.y = 0.6; return m; }
export function makeMite() { const m = inked(new THREE.IcosahedronGeometry(0.3, 1), { color: 0x120c0a, shift: 0x7a1f14, ow: 0.02 }); m.position.y = 0.3; return m; }
export function makeDoc() { const g = new THREE.Group(); const p = inked(new THREE.BoxGeometry(0.5, 0.04, 0.65), { color: 0xf5ecd8, ow: 0.02 }); p.position.y = 0.95; p.rotation.y = 0.3; g.add(p);
  const st = inked(new THREE.CylinderGeometry(0.1, 0.2, 0.9, 6), { color: 0x2b221b }); st.position.y = 0.45; g.add(st); g.userData.paper = p; return g; }
export function makeReader() { const m = inked(new THREE.BoxGeometry(0.7, 1.1, 0.5), { color: 0x4a3a2c, shift: 0x3fc1ff, y0: 0, y1: 1.1 }); m.position.y = 0.55; return m; }
export function makeRelay() { const g = new THREE.Group(); const sup = inked(new THREE.CylinderGeometry(0.18, 0.28, 1.6, 7, 3), { color: 0xb8a684, y0: 0, y1: 1.6 }); sup.position.y = 0.8; g.add(sup);
  const box = inked(new THREE.BoxGeometry(0.6, 0.5, 0.5), { color: 0x3a2a20, shift: 0xff5530 }); box.position.y = 1.85; g.add(box); g.userData = { sup, box }; return g; }
export function makeTether() { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 5, 1, true), new THREE.MeshBasicMaterial({ color: 0x8a1a10 })); return m; }
export function makeShadow() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(20,14,10,.55)'); gr.addColorStop(1, 'rgba(20,14,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); m.position.y = 0.015; return m; }
