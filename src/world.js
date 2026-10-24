// S4 · Mondo: stanze-pagina, entità e personaggi disegnati a inchiostro.
import * as THREE from '../vendor/three.module.js?v=2.2.0';
import { inked, inkMaster, withMask, outlineMat, INK_UNIFORMS } from './art.js?v=2.2.0';

export const ROOMS = [
  { id: 'intro', cx: 0, cz: 0, w: 14, d: 20, safe: true, title: 'I · La tavola' },
  { id: 'charger', cx: 0, cz: -28, w: 20, d: 18, safe: false, title: 'II · Il Caricatore' },
  { id: 'conduct', cx: 0, cz: -56, w: 24, d: 20, safe: true, title: 'III · La pressa' },
  { id: 'door', cx: 0, cz: -88, w: 32, d: 24, safe: true, title: 'IV · La porta che giudica' },
  { id: 'arena', cx: 0, cz: -124, w: 32, d: 28, safe: false, title: 'V · Il Custode della Fenditura' },
  { id: 'end', cx: 0, cz: -160, w: 24, d: 20, safe: true, title: 'VI · Conseguenza' },
  { id: 'archive', cx: 40, cz: -28, w: 32, d: 28, safe: false, chain: 'arch', title: 'III½ · Archivio sommerso' },
  { id: 'crypt', cx: -40, cz: -28, w: 24, d: 18, safe: false, chain: 'crypt', title: 'III⅓ · La cripta delle prove' },
  { id: 'c2a', cx: 100, cz: 0, w: 14, d: 10, safe: true, chain: 'c2', title: 'II·1 · La riva' },
  { id: 'c2b', cx: 100, cz: -15, w: 16, d: 12, safe: false, chain: 'c2', title: 'II·2 · La chiusa' },
  { id: 'c2c', cx: 100, cz: -31, w: 14, d: 12, safe: true, chain: 'c2', title: 'II·3 · La pila dei libri' },
  { id: 'c2d', cx: 100, cz: -49, w: 18, d: 16, safe: false, chain: 'c2', title: 'II·4 · La Diga Rilegata' },
  { id: 'c2e', cx: 100, cz: -67, w: 12, d: 10, safe: true, chain: 'c2', title: 'II·5 · Acqua ferma' },
  { id: 'open', cx: -220, cz: 90, w: 16, d: 44, safe: true, chain: 'open', title: 'Prologo · E qui il viaggiatore cadde' },
  { id: 'maze', cx: -220, cz: -56, w: 97, d: 97, safe: false, chain: 'maze', title: 'III · Il labirinto del filo' },
];
export const GAP = 2.8;
// Scala condivisa delle stanze (v1.4): ogni coordinata di design del Capitolo 1 passa da qui.
export const RS = 2;
export function F(x, z) { if (x >= 85) return [x, z]; if (x >= 25 && x <= 60) return [40 + (x - 40) * RS, -28 + (z + 28) * RS]; if (x <= -25 && x >= -60) return [-40 + (x + 40) * RS, -28 + (z + 28) * RS]; return [x * RS, z * RS]; }

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
  /* v2.2: muri di carta-mattoni dalla tavola 023 di Joseph (arriva dopo il primo fotogramma; prima restano di carta liscia) */
  new THREE.TextureLoader().load('assets/texture/mattoni.jpg', (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; wallMat.uniforms.uSkin.value = t; wallMat.uniforms.uSkinK.value = 0.8; });
  wallMat.uniforms.uSkinS.value = 0.42;
  const ol = outlineMat(0.03);
  const addWall = (x0, z0, x1, z1, h = 1.3) => {
    const w = Math.abs(x1 - x0) || 0.3, d = Math.abs(z1 - z0) || 0.3; const geo = withMask(new THREE.BoxGeometry(w, h, d), 0.4);
    const m = new THREE.Mesh(geo, wallMat); m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); const o = new THREE.Mesh(geo, ol); m.add(o); g.add(m);
    walls.push({ minX: Math.min(x0, x1) - (w === 0.3 ? 0.15 : 0), maxX: Math.max(x0, x1) + (w === 0.3 ? 0.15 : 0), minZ: Math.min(z0, z1) - (d === 0.3 ? 0.15 : 0), maxZ: Math.max(z0, z1) + (d === 0.3 ? 0.15 : 0) }); return m;
  };
  ROOMS.forEach((r) => {
    const chain = ROOMS.filter((q) => (q.chain || 'c1') === (r.chain || 'c1')); const i = chain.indexOf(r); const gi = ROOMS.indexOf(r);
    const x0 = r.cx - r.w / 2, x1 = r.cx + r.w / 2, zs = r.cz + r.d / 2, zn = r.cz - r.d / 2;
    const fl = new THREE.Mesh(withMask(new THREE.PlaneGeometry(r.w + 0.4, r.d + 0.4).rotateX(-Math.PI / 2), 0), floorMat); fl.position.set(r.cx, 0, r.cz); g.add(fl);
    // manoscritto con cancellature sul pavimento
    const tex = textCanvas(MANUSCRIPT.slice(gi % 3, gi % 3 + 7), 1024, 512, { strike: false, lh: 66, font: 'italic 40px Georgia, serif', y0: 30, color: 'rgba(60,44,30,0.8)' });
    const ms = new THREE.Mesh(new THREE.PlaneGeometry(r.w * 0.42, r.d * 0.26).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.2 }));
    ms.position.set(r.cx + (gi % 2 ? 1 : -1) * r.w * 0.24, 0.006, r.cz + r.d * 0.3); g.add(ms);
    addWall(x0, zs, x0, zn); addWall(x1, zs, x1, zn);
    const hasS = i > 0, hasN = i < chain.length - 1, c = r.cx;
    if (hasS) { addWall(x0, zs, c - GAP / 2, zs, 0.45); addWall(c + GAP / 2, zs, x1, zs, 0.45); } else addWall(x0, zs, x1, zs, 0.45);
    if (hasN) { addWall(x0, zn, c - GAP / 2, zn); addWall(c + GAP / 2, zn, x1, zn);
      const nz = chain[i + 1].cz + chain[i + 1].d / 2; addWall(c - GAP / 2 - 0.15, zn, c - GAP / 2 - 0.15, nz, 0.7); addWall(c + GAP / 2 + 0.15, zn, c + GAP / 2 + 0.15, nz, 0.7);
      const cf = new THREE.Mesh(withMask(new THREE.PlaneGeometry(GAP + 0.3, zn - nz).rotateX(-Math.PI / 2), 0), floorMat); cf.position.set(c, -0.001, (zn + nz) / 2); g.add(cf);
    } else addWall(x0, zn, x1, zn);
  });
  // pozze di luce calda (additive) e scrivania sotto il libro
  const lc = document.createElement('canvas'); lc.width = lc.height = 128; const lg = lc.getContext('2d'); const gr = lg.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,214,150,0.55)'); gr.addColorStop(0.5, 'rgba(255,190,120,0.18)'); gr.addColorStop(1, 'rgba(255,190,120,0)'); lg.fillStyle = gr; lg.fillRect(0, 0, 128, 128);
  const lt = new THREE.CanvasTexture(lc);
  ROOMS.forEach((r, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(r.w * 1.1, r.d * 1.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: lt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.18 })); m.position.set(r.cx - 1.5, 0.02, r.cz - 0.5); g.add(m); });
  const dc = document.createElement('canvas'); dc.width = dc.height = 256; const dg = dc.getContext('2d'); dg.fillStyle = '#21160f'; dg.fillRect(0, 0, 256, 256); for (let i = 0; i < 160; i++) { dg.strokeStyle = `rgba(${60 + Math.random() * 30},${38 + Math.random() * 20},${24},.35)`; dg.lineWidth = 1 + Math.random() * 2; dg.beginPath(); const y = Math.random() * 256; dg.moveTo(0, y); dg.bezierCurveTo(80, y + Math.random() * 10 - 5, 170, y + Math.random() * 10 - 5, 256, y); dg.stroke(); }
  // lavatura d'inchiostro ai margini di ogni pagina
  const wc = document.createElement('canvas'); wc.width = 512; wc.height = 512; const wg = wc.getContext('2d');
  for (let i = 0; i < 260; i++) { const t = Math.random(), side = Math.floor(Math.random() * 4); let x = side < 2 ? t * 512 : (side === 2 ? 0 : 512), y = side < 2 ? (side === 0 ? 0 : 512) : t * 512; const r = 30 + Math.random() * 70;
    const rg = wg.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(26,18,12,0.22)'); rg.addColorStop(1, 'rgba(26,18,12,0)'); wg.fillStyle = rg; wg.fillRect(x - r, y - r, r * 2, r * 2); }
  for (let i = 0; i < 14; i++) { wg.fillStyle = 'rgba(20,12,8,0.5)'; const x = Math.random() * 512, y = Math.random() < 0.5 ? Math.random() * 40 : 472 + Math.random() * 40; wg.beginPath(); wg.arc(x, y, 2 + Math.random() * 6, 0, 6.3); wg.fill(); }
  const wt = new THREE.CanvasTexture(wc);
  ROOMS.forEach((r) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: wt, transparent: true, depthWrite: false })); m.position.set(r.cx, 0.008, r.cz); g.add(m); });
  const dt = new THREE.CanvasTexture(dc); dt.wrapS = dt.wrapT = THREE.RepeatWrapping; dt.repeat.set(6, 20); dt.colorSpace = THREE.SRGBColorSpace;
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(130, 240).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: dt, color: 0x9a8a7a })); desk.position.set(0, -0.6, -80); g.add(desk);
  const under = new THREE.Mesh(new THREE.BoxGeometry(34.5, 0.58, 186), new THREE.MeshBasicMaterial({ color: 0x5e5244 })); under.position.set(0, -0.3, -77); g.add(under);
  const desk2 = desk.clone(); desk2.position.set(100, -0.6, -35); desk2.scale.set(0.5, 1, 0.6); g.add(desk2); const desk3 = desk.clone(); desk3.position.set(40, -0.6.toFixed ? -0.6 : -0.6, -28); desk3.scale.set(0.5, 1, 0.3); g.add(desk3);
  const under2 = new THREE.Mesh(new THREE.BoxGeometry(20.5, 0.58, 82), under.material); under2.position.set(100, -0.3, -34); g.add(under2); const under3 = new THREE.Mesh(new THREE.BoxGeometry(33, 0.58, 29), under.material); under3.position.set(40, -0.3, -28); g.add(under3); const under4 = new THREE.Mesh(new THREE.BoxGeometry(25, 0.58, 19), under.material); under4.position.set(-40, -0.3, -28); g.add(under4); const desk4 = desk3.clone(); desk4.position.x = -40; g.add(desk4); // spessore delle pagine
  // corridoio della prova nella stanza di Elara
  addWall(-10, -76.4, -10, -92.4, 0.6);
  // fogli che pendono e rilegatura: dettagli d'atmosfera
  const scraps = new THREE.Group(); g.add(scraps);
  for (let i = 0; i < 26; i++) { const r = ROOMS[i % ROOMS.length]; const side = i % 2 ? 1 : -1;
    const p = new THREE.Mesh(withMask(new THREE.PlaneGeometry(0.5 + Math.random() * 0.5, 0.5 + Math.random() * 0.25), 0.2), inkMaster({ color: 0xf1e8d4, texBlend: 1 }));
    p.material.side = THREE.DoubleSide; p.position.set(r.cx + side * (r.w / 2 - 0.17), 0.7 + Math.random() * 0.15, r.cz + (Math.random() - 0.5) * r.d * 0.8); p.rotation.y = side * Math.PI / 2; p.rotation.z = (Math.random() - 0.5) * 0.4; p.userData.sw = Math.random() * 6; scraps.add(p); }
  return { group: g, walls, scraps, floorMat, wallMat };
}

// ---- entità ----
let _rad = null; const radTex = () => { if (_rad) return _rad; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); _rad = new THREE.CanvasTexture(c); return _rad; };
export function makeBoard() {
  const grp = new THREE.Group();
  const board = inked(new THREE.BoxGeometry(GAP + 0.2, 1.6, 0.18, 6, 4, 1), { color: 0xcdb48a, y0: 0, y1: 1.6, ow: 0.03 }); board.position.y = 0.8; grp.add(board);
  const tear = inked(new THREE.PlaneGeometry(0.5, 1.1), { color: 0x120c0a, outline: false }); tear.position.set(0.3, 0.9, 0.1); tear.rotation.z = 0.2; grp.add(tear);
  grp.userData.body = board; return grp;
}
export function makeCharger() {
  const grp = new THREE.Group(); const body = new THREE.Group(); grp.add(body);
  const core = inked(new THREE.IcosahedronGeometry(0.38, 1), { color: 0x9e2b1c, shift: 0xff5530, ow: 0.02 }); core.position.set(0, 0.8, -0.1); body.add(core);
  const armor = new THREE.Group(); body.add(armor);
  for (let i = 0; i < 3; i++) { const sh = inked(new THREE.SphereGeometry(0.78 - i * 0.08, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), { color: i === 1 ? 0xd2c3a0 : 0xbfae8a, y0: 0.2, y1: 1.5, ow: 0.03 });
    sh.scale.set(1, 0.85, 0.75); sh.position.set(0, 0.45 + i * 0.05, -0.55 + i * 0.5); sh.rotation.x = -0.35 + i * 0.25; armor.add(sh); }
  const head = inked(new THREE.BoxGeometry(0.7, 0.45, 0.45), { color: 0x2a211a }); head.position.set(0, 0.6, 0.95); body.add(head);
  for (const s of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff5530 })); eye.position.set(s * 0.18, 0.68, 1.18); body.add(eye);
    const horn = inked(new THREE.ConeGeometry(0.09, 0.55, 5), { color: 0xe8dcc0 }); horn.rotation.x = Math.PI / 2.3; horn.rotation.z = s * -0.4; horn.position.set(s * 0.28, 0.82, 1.2); body.add(horn);
    for (const z of [0.5, -0.1, -0.6]) { const leg = inked(new THREE.CylinderGeometry(0.07, 0.04, 0.55, 5), { color: 0x2a211a, ow: 0.02 }); leg.position.set(s * 0.62, 0.22, z); leg.rotation.z = s * 0.5; body.add(leg); } }
  // più minaccioso: mandibole, spine dorsali, occhi incandescenti, crepe rosse
  for (const sd of [-1, 1]) { const md = inked(new THREE.ConeGeometry(0.07, 0.5, 5), { color: 0xe8dcc0, ow: 0.02 }); md.position.set(sd * 0.2, 0.42, 1.3); md.rotation.set(Math.PI / 2, 0, sd * 0.6); body.add(md);
    const eg = new THREE.Sprite(new THREE.SpriteMaterial({ map: radTex(), color: 0xff3a20, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); eg.scale.setScalar(0.22); eg.position.set(sd * 0.18, 0.68, 1.22); body.add(eg); }
  for (let i = 0; i < 6; i++) { const sp = inked(new THREE.ConeGeometry(0.08, 0.38 - Math.abs(i - 2.5) * 0.04, 5), { color: 0x2a211a, ow: 0.02 }); sp.position.set(0, 1.12 - Math.abs(i - 2.5) * 0.05, -0.75 + i * 0.32); sp.rotation.x = -0.35; armor.add(sp); }
  for (let i = 0; i < 4; i++) { const cr = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.5), new THREE.MeshBasicMaterial({ color: 0xc8321e })); cr.position.set(-0.45 + i * 0.3, 0.98 - Math.abs(i - 1.5) * 0.08, -0.1 + (i % 2) * 0.3); cr.rotation.y = (i - 1.5) * 0.4; armor.add(cr); }
  grp.userData = { body, core, armor, r: 0.85, height: 1.6 }; return grp;
}
const lathe = (pts, seg = 18) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
export function makeCustode() {
  // Il Custode: una statua d'inchiostro indurito, curva, coperta di pagine incollate come armatura.
  const grp = new THREE.Group(); const body = new THREE.Group(); grp.add(body);
  const core = inked(new THREE.OctahedronGeometry(0.42, 1), { color: 0x9e2b1c, shift: 0xff5530, ow: 0.02 }); core.position.set(0, 1.55, 0.05); body.add(core);
  const armor = new THREE.Group(); body.add(armor);
  // busto massiccio a goccia rovesciata, inclinato in avanti
  const torso = inked(lathe([[0, 0], [0.55, 0.05], [0.8, 0.45], [0.95, 0.95], [0.9, 1.3], [0.6, 1.55], [0, 1.62]], 20), { color: 0xcdbd98, shift: 0x9e2b1c, y0: 0.7, y1: 2.6 });
  torso.position.y = 0.85; torso.rotation.x = 0.18; torso.scale.set(1.15, 1, 0.85); armor.add(torso);
  // pagine incollate sul petto (armatura a scaglie)
  for (let i = 0; i < 9; i++) { const pg = inked(new THREE.PlaneGeometry(0.42, 0.55), { color: 0xd8cbb0, outline: true, ow: 0.015 }); pg.material.side = THREE.DoubleSide;
    const a = (i % 3 - 1) * 0.55, row = Math.floor(i / 3); pg.position.set(Math.sin(a) * 0.98, 1.25 + row * 0.38, Math.cos(a) * 0.82 + 0.08); pg.rotation.set(-0.2 + row * 0.05, a, (Math.random() - 0.5) * 0.35); armor.add(pg); }
  // testa: cappuccio a punta con una sola riga rossa
  const head = inked(lathe([[0, 0], [0.38, 0.05], [0.42, 0.3], [0.3, 0.6], [0, 0.85]], 14), { color: 0x2a201a, y0: 2.3, y1: 3.2 }); head.position.set(0, 2.35, 0.25); armor.add(head);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const sp = inked(new THREE.ConeGeometry(0.09, 0.55, 4), { color: 0xefe5cf, ow: 0.02 }); sp.position.set(Math.cos(a) * 0.3, 2.95, 0.25 + Math.sin(a) * 0.3); sp.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); armor.add(sp); }
  // spalle sferiche schiacciate e braccia lunghe con pugni enormi
  for (const sd of [-1, 1]) { const sh = inked(new THREE.SphereGeometry(0.5, 14, 10), { color: 0xe6d8b8, shift: 0x9e2b1c }); sh.scale.set(1, 0.8, 1); sh.position.set(sd * 1.05, 2.15, 0.05); armor.add(sh);
    const arm = new THREE.Group(); arm.position.set(sd * 1.15, 2.05, 0.1); armor.add(arm); arm.userData.side = sd; armor.userData['arm' + sd] = arm;
    const up = inked(lathe([[0.22, 0], [0.26, -0.4], [0.2, -0.9], [0.17, -1.1]], 10), { color: 0xb5a37f }); arm.add(up);
    const fist = inked(new THREE.DodecahedronGeometry(0.36, 0), { color: 0xbfae8c, shift: 0x9e2b1c }); fist.position.y = -1.3; fist.scale.set(1, 1.1, 1); arm.add(fist); }
  // gambe corte e pesanti
  for (const sd of [-1, 1]) { const lg = inked(lathe([[0.3, 0], [0.34, 0.4], [0.26, 0.85]], 10), { color: 0x1d1611 }); lg.position.set(sd * 0.42, 0, 0); body.add(lg); }
  // catene d'inchiostro che pendono
  for (let i = 0; i < 4; i++) { const ch = inked(new THREE.TorusGeometry(0.09, 0.025, 4, 8), { color: 0x120c0a, outline: false }); ch.position.set(-0.5 + i * 0.33, 0.95 - (i % 2) * 0.1, 0.72); ch.rotation.y = i % 2 ? Math.PI / 2 : 0; armor.add(ch); }
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0x8a1a10 })); eye.position.set(0, 2.62, 0.62); armor.add(eye);
  const halo = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.45, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8a1a10, transparent: true, opacity: 0.7, depthWrite: false })); halo.position.y = 0.03; grp.add(halo);
  body.scale.setScalar(1.2); grp.userData.halo = halo; Object.assign(grp.userData, { body, core, armor, r: 0.9, height: 3.4, eye }); return grp;
}
export function makePlayer() {
  // Il Correttore: mantello d'inchiostro che si sfrangia, cappuccio, volto in ombra con due punti di luce, sciarpa rossa.
  const grp = new THREE.Group(); const body = new THREE.Group(); grp.add(body);
  const cloak = inked(lathe([[0.46, 0], [0.5, 0.06], [0.4, 0.45], [0.3, 0.9], [0.22, 1.25], [0.14, 1.38]], 16), { color: 0x1a1512, shift: 0x7a1f14, y0: 0, y1: 1.4 }); cloak.material.side = THREE.DoubleSide; body.add(cloak); /* v2.2: più nero, come nelle tavole 036/038/058 */
  for (let i = 0; i < 13; i++) { const a = i / 13 * Math.PI * 2, L = 0.16 + ((i * 7) % 5) * 0.05; const fr = inked(new THREE.ConeGeometry(0.06, L, 4), { color: 0x100c0a, outline: false }); fr.position.set(Math.sin(a) * 0.47, 0.02 - L / 2 + 0.06, Math.cos(a) * 0.47); fr.rotation.set(Math.PI + Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25); body.add(fr); } // orlo sfrangiato irregolare
  const head = inked(new THREE.SphereGeometry(0.2, 16, 12), { color: 0x14100d, y0: 1.3, y1: 1.75 }); head.position.y = 1.5; body.add(head);
  const hood = inked(lathe([[0.27, 0], [0.28, 0.15], [0.2, 0.36], [0.03, 0.52]], 14), { color: 0x2c2420 }); hood.position.set(0, 1.33, -0.03); hood.rotation.x = -0.18; body.add(hood);
  for (const sd of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffc23a })); e.position.set(sd * 0.07, 1.52, 0.18); body.add(e); // occhi dorati che brillano nel cappuccio
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: radTex(), color: 0xffa020, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); gl.scale.setScalar(0.17); gl.position.set(sd * 0.07, 1.52, 0.2); body.add(gl); }
  const collar = inked(new THREE.TorusGeometry(0.19, 0.06, 6, 14), { color: 0x9a2a18, outline: false }); collar.rotation.x = Math.PI / 2; collar.position.y = 1.3; body.add(collar);
  // sciarpa rossa lunga in tre tratti snodati: si gonfia all'indietro quando corri (animata in main.js)
  const scarfMat = inked(new THREE.PlaneGeometry(0.15, 0.42).translate(0, -0.21, 0), { color: 0x9a2a18, outline: false }).material; scarfMat.side = THREE.DoubleSide; const scarf = [];
  for (const [sx, n] of [[0.1, 3], [-0.05, 2]]) { let par = body, y0 = 1.28; for (let k = 0; k < n; k++) { const pv = new THREE.Group(); pv.position.set(k ? 0 : sx, k ? -0.44 : y0, k ? 0 : -0.2); par.add(pv); const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.21 - k * 0.03, 0.46).translate(0, -0.23, 0), scarfMat); pv.add(seg); pv.userData.k = k; pv.userData.side = sx; scarf.push(pv); par = pv; } }
  const tail = scarf[0];
  const sash = inked(new THREE.TorusGeometry(0.33, 0.03, 5, 14), { color: 0x5a1810, outline: false }); sash.rotation.x = Math.PI / 2; sash.position.y = 0.72; body.add(sash);
  // dettagli: mantellina a strati, cintura con borse e boccetta, libro sulla schiena, stivali
  const capelet = inked(lathe([[0.42, 0], [0.38, 0.16], [0.24, 0.3]], 16), { color: 0x3a2c24, shift: 0x7a1f14 }); capelet.material.side = THREE.DoubleSide; capelet.position.y = 1.02; body.add(capelet);
  for (const sd of [-1, 1]) { const pouch = inked(new THREE.BoxGeometry(0.13, 0.15, 0.08), { color: 0x6b4a2a, ow: 0.015 }); pouch.position.set(sd * 0.3, 0.66, 0.16); pouch.rotation.y = sd * 0.5; body.add(pouch);
    const boot = inked(new THREE.SphereGeometry(0.1, 8, 6), { color: 0x120c0a, outline: false }); boot.scale.set(1, 0.6, 1.5); boot.position.set(sd * 0.13, 0.05, 0.12); body.add(boot); }
  const vial = inked(new THREE.CylinderGeometry(0.045, 0.05, 0.14, 8), { color: 0x1b2a3a, shift: 0x3fc1ff, ow: 0.012 }); vial.position.set(-0.24, 0.62, -0.2); body.add(vial);
  const vialInk = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: 0x8a1a10 })); vialInk.position.set(-0.24, 0.6, -0.2); body.add(vialInk);
  const book = inked(new THREE.BoxGeometry(0.34, 0.44, 0.1), { color: 0x6b2318, ow: 0.02 }); book.position.set(0, 1.05, -0.3); book.rotation.x = 0.15; body.add(book);
  const pages = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.07), new THREE.MeshBasicMaterial({ color: 0xefe5cf })); pages.position.set(0.03, 1.05, -0.3); pages.rotation.x = 0.15; body.add(pages);
  // LA PENNA: stilografica-piuma con pennino d'oro, fusto laccato, goccia d'inchiostro e bagliore
  const quillPivot = new THREE.Group(); quillPivot.position.set(0.34, 1.0, 0.05); body.add(quillPivot);
  const quill = new THREE.Group(); quill.scale.setScalar(1.7); quillPivot.add(quill);
  const barrel = inked(new THREE.CylinderGeometry(0.045, 0.055, 0.62, 10).rotateX(Math.PI / 2), { color: 0x120c0a, shift: 0x8a2416, ow: 0.015 }); barrel.position.z = 0.42; quill.add(barrel);
  for (const z of [0.16, 0.7]) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.014, 6, 14), new THREE.MeshBasicMaterial({ color: 0xd8a63a })); band.position.z = z; quill.add(band); }
  const grip = inked(new THREE.CylinderGeometry(0.05, 0.034, 0.18, 10).rotateX(Math.PI / 2), { color: 0x8a2416, ow: 0.012 }); grip.position.z = 0.82; quill.add(grip);
  const nibGeo = new THREE.ConeGeometry(0.036, 0.22, 4).rotateX(Math.PI / 2); nibGeo.scale(1.7, 0.4, 1.25); const nibM = new THREE.Mesh(nibGeo, new THREE.MeshBasicMaterial({ color: 0xe8be55 })); nibM.position.z = 1.01; quill.add(nibM);
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.02, 0.12), new THREE.MeshBasicMaterial({ color: 0x120c0a })); slit.position.set(0, 0.012, 1.04); quill.add(slit);
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0x8a1a10 })); drop.scale.y = 1.4; drop.position.set(0, -0.04, 1.12); quill.add(drop);
  const nibGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })(), color: 0xff5a30, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); nibGlow.scale.setScalar(0.35); nibGlow.position.z = 1.1; quill.add(nibGlow);
  // fondello del cappuccio con fermaglio d'oro: legge subito come una stilografica
  const cap = inked(new THREE.CylinderGeometry(0.058, 0.05, 0.3, 12).rotateX(Math.PI / 2), { color: 0x120c0a, shift: 0x8a2416, ow: 0.015 }); cap.position.z = -0.02; quill.add(cap);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 6), new THREE.MeshBasicMaterial({ color: 0xd8a63a })); finial.scale.z = 0.6; finial.position.z = -0.17; quill.add(finial);
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.3), new THREE.MeshBasicMaterial({ color: 0xe8be55 })); clip.position.set(0, 0.068, 0.02); quill.add(clip);
  const clipEnd = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), new THREE.MeshBasicMaterial({ color: 0xe8be55 })); clipEnd.position.set(0, 0.07, 0.17); quill.add(clipEnd);
  const nib = new THREE.Object3D(); nib.position.z = 1.12; quill.add(nib);
  grp.userData = { body, cloak, head, quillPivot, quill, tail, scarf, nib, nibGlow, nibWorld: new THREE.Vector3(), r: 0.38 }; return grp;
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
    // ritratto a inchiostro: capelli come una macchia che cola, volto pallido, spalle
    g.fillStyle = '#e8dcc0'; g.fillRect(30, 30, 452, 470); g.strokeStyle = 'rgba(40,28,20,.25)'; g.lineWidth = 1; for (let i = 0; i < 70; i++) { g.beginPath(); g.moveTo(30 + i * 7, 30); g.lineTo(30, 30 + i * 7); g.stroke(); }
    g.fillStyle = '#1b130e'; g.beginPath(); g.moveTo(256, 60); g.bezierCurveTo(120, 60, 110, 200, 120, 300); g.bezierCurveTo(125, 400, 90, 470, 110, 500); g.lineTo(402, 500); g.bezierCurveTo(420, 470, 387, 400, 392, 300); g.bezierCurveTo(402, 200, 392, 60, 256, 60); g.fill();
    for (let i = 0; i < 6; i++) { g.fillRect(118 + i * 55, 480, 7, 30 + (i * 17) % 40); g.beginPath(); g.arc(121 + i * 55, 512 + (i * 17) % 40, 6, 0, 6.3); g.fill(); }
    g.fillStyle = '#f3e9d4'; g.beginPath(); g.ellipse(256, 230, 78, 100, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(215, 320); g.lineTo(297, 320); g.lineTo(330, 420); g.lineTo(182, 420); g.fill();
    g.fillStyle = '#1b130e'; g.beginPath(); g.moveTo(180, 175); g.quadraticCurveTo(256, 120, 334, 175); g.quadraticCurveTo(300, 130, 256, 132); g.quadraticCurveTo(205, 132, 180, 175); g.fill();
    g.fillStyle = 'rgba(180,90,70,.25)'; g.beginPath(); g.arc(212, 262, 16, 0, 6.3); g.arc(300, 262, 16, 0, 6.3); g.fill();
    g.strokeStyle = '#1b130e'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(205, 225); g.quadraticCurveTo(222, state.eyes + 30, 240, 225); g.moveTo(272, 225); g.quadraticCurveTo(290, state.eyes + 30, 307, 225); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.moveTo(256, 235); g.lineTo(250, 268); g.lineTo(260, 270); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.moveTo(236, 295); g.quadraticCurveTo(256, 295 + state.mouth, 276, 295); g.stroke();
    g.fillStyle = '#8a2416'; g.beginPath(); g.moveTo(190, 405); g.lineTo(322, 405); g.lineTo(300, 430); g.lineTo(212, 430); g.fill();
    if (state.verdict) { g.save(); g.translate(256, 625); g.rotate(-0.08); g.fillStyle = state.vcol || '#8a1a10'; g.font = 'bold 74px Georgia'; g.textAlign = 'center'; g.fillText(state.verdict, 0, 0); g.restore(); }
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
// unisce i pezzi a tinta unita (MeshBasicMaterial) di un oggetto in una sola mesh a colori per vertice: molte meno draw call
export function mergeBasic(root) { const parts = []; root.updateMatrix(); const inv = new THREE.Matrix4().copy(root.matrix).invert(); root.updateMatrixWorld(true);
  root.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshBasicMaterial && !o.material.transparent && !o.material.map) parts.push(o); });
  if (parts.length < 2) return; const pos = [], col = [], m = new THREE.Matrix4(), c = new THREE.Color();
  for (const o of parts) { let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); m.multiplyMatrices(inv, o.matrixWorld); g.applyMatrix4(m); c.copy(o.material.color); const a = g.attributes.position.array; for (let i = 0; i < a.length; i += 3) { pos.push(a[i], a[i + 1], a[i + 2]); col.push(c.r, c.g, c.b); } o.parent.remove(o); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const merged = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true })); root.add(merged); return merged; }
export function makeMite() { const m = inked(new THREE.IcosahedronGeometry(0.3, 1), { color: 0x120c0a, shift: 0x7a1f14, ow: 0.02 }); m.position.y = 0.3;
  const sg = new THREE.ConeGeometry(0.06, 0.32, 4); const sm = new THREE.MeshBasicMaterial({ color: 0x1b120e }); for (let i = 0; i < 9; i++) { const a = i * 2.4, b = Math.acos(1 - 2 * (i + 0.5) / 9); const d = new THREE.Vector3(Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)); const sp = new THREE.Mesh(sg, sm); sp.position.copy(d).multiplyScalar(0.32); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); m.add(sp); }
  for (const sd of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff3a20 })); e.position.set(sd * 0.1, 0.06, 0.26); m.add(e); }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 4, 10, Math.PI), new THREE.MeshBasicMaterial({ color: 0xc8321e })); mouth.position.set(0, -0.08, 0.27); mouth.rotation.z = Math.PI; m.add(mouth); const lg = new THREE.CylinderGeometry(0.02, 0.012, 0.34, 4); const lm = new THREE.MeshBasicMaterial({ color: 0x0c0806 });
  for (let i = 0; i < 6; i++) { const sd = i < 3 ? -1 : 1, k = i % 3; const leg = new THREE.Mesh(lg, lm); leg.position.set(sd * 0.3, -0.16, -0.12 + k * 0.13); leg.rotation.set((k - 1) * 0.4, 0, sd * 1.0); m.add(leg); }
  const jg = new THREE.ConeGeometry(0.035, 0.22, 4); const jm = new THREE.MeshBasicMaterial({ color: 0xe8dcc0 });
  for (const sd of [-1, 1]) { const j = new THREE.Mesh(jg, jm); j.position.set(sd * 0.08, -0.06, 0.36); j.rotation.set(Math.PI / 2, 0, sd * 0.55); m.add(j);
    const eg = new THREE.Sprite(new THREE.SpriteMaterial({ map: radTex(), color: 0xff3a20, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })); eg.scale.setScalar(0.16); eg.position.set(sd * 0.1, 0.07, 0.3); m.add(eg); }
  m.scale.setScalar(1.15); { const sc = m.scale.clone(), py = m.position.y; m.scale.set(1, 1, 1); m.position.set(0, 0, 0); mergeBasic(m); m.scale.copy(sc); m.position.y = py; } return m; }
export function makeDoc() { const g = new THREE.Group(); const p = inked(new THREE.BoxGeometry(0.5, 0.04, 0.65), { color: 0xf5ecd8, ow: 0.02 }); p.position.y = 0.95; p.rotation.y = 0.3; g.add(p);
  const st = inked(new THREE.CylinderGeometry(0.1, 0.2, 0.9, 6), { color: 0x2b221b }); st.position.y = 0.45; g.add(st); g.userData.paper = p; return g; }
export function makeReader() { // leggio d'inchiostro con libro aperto (prima era una scatola scura)
  const g = new THREE.Group(); g.position.y = 0.55; const o = -0.55;
  const base = inked(new THREE.CylinderGeometry(0.32, 0.4, 0.12, 10), { color: 0x2b221b, ow: 0.02 }); base.position.y = o + 0.06; g.add(base);
  const post = inked(new THREE.CylinderGeometry(0.06, 0.09, 0.85, 8), { color: 0x6b4a2a, ow: 0.02 }); post.position.y = o + 0.5; g.add(post);
  const top = inked(new THREE.BoxGeometry(0.7, 0.06, 0.5), { color: 0x6b4a2a, shift: 0x3fc1ff, ow: 0.02 }); top.position.set(0, o + 1.0, 0); top.rotation.x = 0.45; g.add(top);
  const lip = inked(new THREE.BoxGeometry(0.7, 0.08, 0.04), { color: 0x4a3a2c, outline: false }); lip.position.set(0, o + 0.92, 0.24); lip.rotation.x = 0.45; g.add(lip);
  for (const sd of [-1, 1]) { const pg = inked(new THREE.BoxGeometry(0.3, 0.03, 0.4), { color: 0xf3ead6, ow: 0.012 }); pg.position.set(sd * 0.16, o + 1.05, -0.01); pg.rotation.set(0.45, 0, sd * -0.08); g.add(pg); }
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.005, 0.28), new THREE.MeshBasicMaterial({ color: 0x8a1a10 })); mark.position.set(0, o + 1.075, 0.04); mark.rotation.x = 0.45; g.add(mark);
  return g; }
export function makeRelay() { const g = new THREE.Group(); const sup = inked(new THREE.CylinderGeometry(0.18, 0.28, 1.6, 7, 3), { color: 0xb8a684, y0: 0, y1: 1.6 }); sup.position.y = 0.8; g.add(sup);
  const box = inked(new THREE.BoxGeometry(0.6, 0.5, 0.5), { color: 0x3a2a20, shift: 0xff5530 }); box.position.y = 1.85; g.add(box); g.userData = { sup, box }; return g; }
export function makeTether() { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 5, 1, true), new THREE.MeshBasicMaterial({ color: 0x8a1a10 })); return m; }
export function makeShadow() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(14,9,6,.82)'); gr.addColorStop(1, 'rgba(20,14,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); m.position.y = 0.015; return m; }

// ---- decorazioni: capolettera, penna gigante, calamaio, crepe dell'arena ----
function decal(scene, tex, w, h, x, z, rot = 0, opacity = 1) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity })); m.rotation.y = rot; [x, z] = F(x, z); m.position.set(x, 0.01, z); scene.add(m); return m; }
export function buildDecor(scene) {
  const out = {};
  // capolettera miniato: la prima lettera della storia
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.strokeStyle = 'rgba(138,26,16,.85)'; g.lineWidth = 6; g.strokeRect(40, 40, 432, 432); g.lineWidth = 2; g.strokeRect(56, 56, 400, 400);
  for (let i = 0; i < 26; i++) { g.beginPath(); const a = i / 26 * Math.PI * 2; g.moveTo(256 + Math.cos(a) * 150, 256 + Math.sin(a) * 150); g.bezierCurveTo(256 + Math.cos(a + 0.4) * 230, 256 + Math.sin(a + 0.4) * 230, 256 + Math.cos(a + 0.8) * 120, 256 + Math.sin(a + 0.8) * 120, 256 + Math.cos(a + 1) * 190, 256 + Math.sin(a + 1) * 190); g.strokeStyle = 'rgba(30,20,14,.35)'; g.stroke(); }
  g.fillStyle = '#8a1a10'; g.font = 'bold italic 360px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('C', 256, 280);
  g.fillStyle = 'rgba(20,14,10,.75)'; g.font = 'italic 34px Georgia'; g.fillText("'era una volta", 256, 470);
  decal(scene, new THREE.CanvasTexture(c), 3.6, 3.6, -3.4, 1.6, 0.08, 0.9);
  // penna gigante che pende sopra la tavola e gocciola
  const quill = new THREE.Group(); const shaft = inked(new THREE.ConeGeometry(0.12, 4.2, 8), { color: 0x15100c, ow: 0.03 }); shaft.rotation.x = Math.PI; quill.add(shaft);
  const vane = inked(new THREE.PlaneGeometry(0.9, 2.6, 1, 6), { color: 0xf1e8d4, ow: 0.02 }); vane.material.side = THREE.DoubleSide; vane.position.set(0.35, 0.9, 0); vane.rotation.z = -0.15; quill.add(vane);
  quill.position.set(0.3, 4.6, -4.75); quill.rotation.z = 0.12; quill.visible = false; out.quill = quill;
  // calamaio
  const well = inked(new THREE.CylinderGeometry(0.55, 0.7, 0.8, 12), { color: 0x1a1410, shift: 0x3a1a40 }); well.position.set(...[F(4.2, -3.2)].map(([a, b]) => [a, 0.4, b])[0]); scene.add(well);
  const lip = inked(new THREE.TorusGeometry(0.35, 0.08, 6, 14), { color: 0x2b221b }); lip.rotation.x = Math.PI / 2; lip.position.set(well.position.x, 0.82, well.position.z); scene.add(lip); out.well = { x: well.position.x, z: well.position.z, r: 0.75, meshes: [well, lip] };
  for (let i = 0; i < 5; i++) { const ball = inked(new THREE.IcosahedronGeometry(0.22 + Math.random() * 0.12, 1), { color: 0xeee4cf, ow: 0.02 }); { const [bx, bz] = F(-4.6 + Math.random() * 1.6, -3.5 + Math.random() * 2.5); ball.position.set(bx, 0.2, bz); } ball.rotation.set(Math.random() * 3, Math.random() * 3, 0); scene.add(ball); }
  // crepe d'inchiostro che partono dal nucleo dell'arena
  const k = document.createElement('canvas'); k.width = k.height = 512; const kg = k.getContext('2d'); kg.strokeStyle = 'rgba(20,12,8,.8)'; kg.lineCap = 'round';
  for (let i = 0; i < 11; i++) { let x = 256, y = 256, a = i / 11 * Math.PI * 2 + Math.random() * 0.3; kg.lineWidth = 5; kg.beginPath(); kg.moveTo(x, y); for (let s = 0; s < 14; s++) { a += (Math.random() - 0.5) * 0.7; x += Math.cos(a) * 16; y += Math.sin(a) * 16; kg.lineTo(x, y); kg.lineWidth = Math.max(1, 5 - s * 0.35); } kg.stroke(); }
  decal(scene, new THREE.CanvasTexture(k), 14, 14, 0, -62, 0, 0.75);
  // segni di cancellatura sul pavimento della porta: "COLPEVOLE" riscritto mille volte
  const d = document.createElement('canvas'); d.width = 1024; d.height = 256; const dg = d.getContext('2d'); dg.font = 'bold 54px Georgia'; dg.fillStyle = 'rgba(138,26,16,.35)';
  for (let i = 0; i < 9; i++) { dg.save(); dg.translate(60 + i * 110, 130 + Math.sin(i) * 40); dg.rotate((Math.random() - 0.5) * 0.5); dg.fillText('COLPEVOLE', -60, 0); dg.strokeStyle = 'rgba(20,12,8,.6)'; dg.lineWidth = 4; dg.beginPath(); dg.moveTo(-70, -16); dg.lineTo(260, -10); dg.stroke(); dg.restore(); }
  decal(scene, new THREE.CanvasTexture(d), 9, 2.2, 0.5, -46.2, 0, 0.8);
  return out;
}

// ======================= Racconto visivo: grafia di Ilde, schizzi, note a margine, luci =======================
function inkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round'; return [c, g]; }
function scrawl(g, text, x, y, size, rot = 0, color = 'rgba(28,18,12,.85)') { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = color; g.font = `italic ${size}px "Segoe Script","Brush Script MT","Apple Chancery",Georgia,cursive`; g.fillText(text, 0, 0); g.restore(); }
const SKETCH = {
  girl(g, x, y, s) { g.beginPath(); g.arc(x, y, 18 * s, 0, 6.3); g.moveTo(x - 14 * s, y - 8 * s); g.bezierCurveTo(x - 30 * s, y + 30 * s, x - 22 * s, y + 50 * s, x - 34 * s, y + 70 * s); g.moveTo(x + 14 * s, y - 8 * s); g.bezierCurveTo(x + 30 * s, y + 30 * s, x + 22 * s, y + 50 * s, x + 34 * s, y + 70 * s);
    g.moveTo(x, y + 18 * s); g.lineTo(x - 26 * s, y + 90 * s); g.lineTo(x + 26 * s, y + 90 * s); g.closePath(); g.moveTo(x - 10 * s, y + 90 * s); g.lineTo(x - 12 * s, y + 120 * s); g.moveTo(x + 10 * s, y + 90 * s); g.lineTo(x + 12 * s, y + 120 * s); g.stroke(); },
  river(g, x, y, w) { for (let k = 0; k < 4; k++) { g.beginPath(); for (let i = 0; i <= w; i += 8) g.lineTo(x + i, y + k * 14 + Math.sin(i * 0.05 + k) * 6); g.stroke(); } },
  boat(g, x, y, s) { g.beginPath(); g.moveTo(x - 50 * s, y); g.quadraticCurveTo(x, y + 30 * s, x + 50 * s, y); g.closePath(); g.moveTo(x, y); g.lineTo(x, y - 60 * s); g.lineTo(x + 35 * s, y - 15 * s); g.lineTo(x, y - 12 * s); g.stroke(); },
  eye(g, x, y, s) { g.beginPath(); g.moveTo(x - 50 * s, y); g.quadraticCurveTo(x, y - 35 * s, x + 50 * s, y); g.quadraticCurveTo(x, y + 35 * s, x - 50 * s, y); g.stroke(); g.beginPath(); g.arc(x, y, 12 * s, 0, 6.3); g.fill(); },
  lock(g, x, y, s) { g.strokeRect(x - 30 * s, y, 60 * s, 50 * s); g.beginPath(); g.arc(x, y, 22 * s, Math.PI, 0); g.stroke(); g.beginPath(); g.arc(x, y + 22 * s, 6 * s, 0, 6.3); g.fill(); },
  beetle(g, x, y, s) { g.beginPath(); g.ellipse(x, y, 40 * s, 26 * s, 0, 0, 6.3); g.moveTo(x - 40 * s, y); g.lineTo(x + 40 * s, y); for (const k of [-1, 1]) for (let i = 0; i < 3; i++) { g.moveTo(x - 20 * s + i * 20 * s, y + k * 24 * s); g.lineTo(x - 30 * s + i * 22 * s, y + k * 46 * s); } g.stroke(); },
  hand(g, x, y, s) { g.beginPath(); g.moveTo(x - 25 * s, y + 40 * s); g.lineTo(x - 25 * s, y); for (let i = 0; i < 4; i++) { g.lineTo(x - 22 * s + i * 14 * s, y - 40 * s); g.lineTo(x - 15 * s + i * 14 * s, y); } g.lineTo(x + 30 * s, y + 10 * s); g.lineTo(x + 25 * s, y + 40 * s); g.stroke(); },
  lavender(g, x, y, s) { g.beginPath(); g.moveTo(x, y + 60 * s); g.lineTo(x, y - 20 * s); g.stroke(); for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(x + (i % 2 ? 6 : -6) * s, y - 20 * s + i * 9 * s, 5 * s, 3 * s, 0.5, 0, 6.3); g.fill(); } },
};
function noteTex(lines, sketches, opts = {}) {
  const [c, g] = inkCanvas(512, 512); if (opts.paper) { g.fillStyle = 'rgba(244,236,216,.92)'; g.fillRect(8, 8, 496, 496); g.strokeStyle = 'rgba(120,90,60,.4)'; g.strokeRect(12, 12, 488, 488); }
  g.strokeStyle = 'rgba(28,18,12,.8)'; g.fillStyle = 'rgba(28,18,12,.8)'; g.lineWidth = 3;
  for (const [k, x, y, s] of sketches || []) SKETCH[k](g, x, y, s);
  (lines || []).forEach(([t, x, y, sz, rot, red], i) => { scrawl(g, t, x, y, sz || 34, rot || 0, red ? 'rgba(138,26,16,.9)' : 'rgba(28,18,12,.85)'); if (t.startsWith('~')) { g.strokeStyle = 'rgba(28,18,12,.8)'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x + t.length * 14, y - 14); g.stroke(); } });
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 7, 0, 6.3); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function floorNote(scene, tex, w, x, z, rot, op = 0.55) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: op })); m.rotation.y = rot; [x, z] = F(x, z); m.position.set(x, 0.011, z); scene.add(m); return m; }
function wallNote(scene, tex, x, z, side, y = 0.75, w = 0.9) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w), inkMaster({ color: 0xf1e8d4, texBlend: 0.3 })); m.material = new THREE.MeshBasicMaterial({ map: tex, transparent: true }); { [x, z] = F(x, z); const r = ROOMS.find((q) => Math.abs(x - q.cx) <= q.w / 2 + 0.5 && Math.abs(z - q.cz) <= q.d / 2 + 0.5); if (r && x < 85) x = r.cx + Math.sign(x - r.cx) * (r.w / 2 - 0.18); } m.position.set(x, y, z); m.rotation.y = side; m.rotation.z = (Math.random() - 0.5) * 0.15; scene.add(m); return m; }
// fonti di luce visibili
const glowTex = (() => { const [c, g] = inkCanvas(64, 64); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
function glowSprite(color, size) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.setScalar(size); return s; }
export function makeCandle(h = 0.6) { const g = new THREE.Group(); const c = inked(new THREE.CylinderGeometry(0.09, 0.11, h, 8), { color: 0xefe3c4, y0: 0, y1: h, ow: 0.02 }); c.position.y = h / 2; g.add(c);
  const drip = inked(new THREE.SphereGeometry(0.05, 6, 4), { color: 0xefe3c4, outline: false }); drip.position.set(0.08, h * 0.7, 0.02); drip.scale.y = 1.8; g.add(drip);
  const dish = inked(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 12), { color: 0x6b4a2a, ow: 0.02 }); dish.position.y = 0.025; g.add(dish);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd28a })); flame.scale.y = 2.2; flame.position.y = h + 0.1; g.add(flame);
  const glow = glowSprite(0xffa040, 0.9); glow.position.y = h + 0.12; g.add(glow); g.userData = { flame, glow, ly: h + 0.15 }; return g; }
export function makeLamp() { const g = new THREE.Group(); const pole = inked(new THREE.CylinderGeometry(0.04, 0.06, 1.7, 6), { color: 0x2b221b, ow: 0.02 }); pole.position.y = 0.85; g.add(pole);
  const foot = inked(new THREE.CylinderGeometry(0.25, 0.3, 0.08, 10), { color: 0x2b221b }); foot.position.y = 0.04; g.add(foot);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe2a8 })); globe.position.y = 1.8; g.add(globe);
  const cap = inked(new THREE.ConeGeometry(0.26, 0.18, 10), { color: 0x2b221b }); cap.position.y = 2.02; g.add(cap);
  const glow = glowSprite(0xffb860, 1.6); glow.position.y = 1.8; g.add(glow); g.userData = { flame: globe, glow, ly: 1.8 }; return g; }
export function makeInkJar() { const g = new THREE.Group(); const jar = inked(new THREE.CylinderGeometry(0.16, 0.2, 0.32, 10), { color: 0x1b2a3a, shift: 0x3fc1ff, ow: 0.02 }); jar.position.y = 0.16; g.add(jar);
  const ink = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x6fe0ff })); ink.position.y = 0.33; g.add(ink);
  const glow = glowSprite(0x3fc1ff, 0.9); glow.position.y = 0.4; g.add(glow); g.userData = { flame: ink, glow, ly: 0.45 }; return g; }
// note per stanza: [x, z, rot, linee, schizzi]
const NOTES = [
  [-4.4, 3.4, -0.3, [['prima riga:', 40, 90, 34], ['«C\'era una ragazza', 40, 140, 34], ['che non sapeva nuotare»', 40, 190, 34]], [['girl', 380, 360, 0.7]]],
  [4.6, 2.6, 0.4, [['~bugiarda~', 60, 100, 44, 0, 1], ['testimone', 60, 170, 40]], []],
  [-5, -10.5, 0.2, [['lo scrissi VIGILE', 30, 90, 34], ['perché io non lo ero', 30, 140, 34]], [['beetle', 330, 330, 1.6]]],
  [5.2, -18.6, -0.3, [['ogni carica', 40, 90, 34], ['è una mia paura', 40, 140, 34]], []],
  [4.6, -24.6, 0.3, [['il rame', 60, 90, 36], ['porta la voce', 60, 140, 36], ['più lontano di me', 60, 190, 36]], []],
  [-5.6, -31.6, -0.2, [['4 secondi:', 40, 100, 40, 0, 1], ['il tempo di un respiro', 40, 160, 34]], []],
  [5.6, -39.4, -0.4, [['Elara aveva 16 anni', 30, 90, 34], ['io 40.', 30, 140, 34], ['Chi doveva salvare chi?', 30, 200, 34]], [['hand', 380, 360, 1.2]]],
  [-1.5, -43.5, 0.1, [['~mi dispiace~', 80, 120, 44]], []],
  [5.8, -58.2, 0.3, [['IL CUSTODE', 40, 90, 40, 0, 1], ['sono io, quando', 40, 150, 34], ['non voglio ricordare', 40, 200, 34]], [['eye', 370, 360, 1.6]]],
  [-6, -66.2, -0.3, [['la piega del ponte', 30, 90, 34], ['l\'ho disegnata storta', 30, 140, 34], ['apposta', 30, 190, 34]], []],
  [3.6, -80.8, 0.2, [['fine?', 140, 160, 60, 0, 1]], []],
  [44.5, -23.5, -0.3, [['qui affogo', 40, 90, 34], ['le versioni sbagliate', 40, 140, 34]], [['river', 40, 260, 420]]],
  [-43, -25, 0.2, [['le prove', 60, 100, 38], ['non si bruciano.', 60, 150, 38], ['si nascondono.', 60, 200, 38, 0, 1]], [['lock', 380, 360, 1.1]]],
  [-3.8, -1.6, 0.2, [['La tavola doveva reggere.', 30, 80, 38], ['Doveva.', 60, 130, 44, 0, 1], ['Elara, 7 anni', 300, 470, 30, -0.1]], [['girl', 380, 280, 1.1]]],
  [3.4, 2.6, -0.4, [['~integra', 40, 120, 40], ['(non è vero)', 60, 180, 32]], [['hand', 330, 330, 1.4]]],
  [-4.2, -10.5, 0.5, [['Il Caricatore ha gli occhi', 20, 70, 32], ['di mio padre. Sempre vigile.', 20, 115, 32]], [['beetle', 260, 330, 2]]],
  [4.5, -19, -0.3, [['corri, Elara', 60, 420, 38, 0.1, 1]], [['eye', 260, 220, 2.2]]],
  [-3.5, -24.6, 0.1, [['il rame ricorda', 40, 90, 36], ['ogni scossa', 70, 140, 36]], [['river', 40, 260, 420]]],
  [3.8, -41.5, 0.3, [['COLPEVOLE?', 40, 100, 48, -0.1, 1], ['~no', 80, 170, 40], ['~sì', 200, 170, 40], ['non posso.', 120, 240, 40]], [['girl', 400, 330, 0.8]]],
  [-5.5, -47.5, -0.2, [['la porta guarda', 40, 80, 34], ['come guardava lei', 40, 130, 34]], [['eye', 260, 320, 2.6]]],
  [-5.5, -57.5, 0.4, [['Ho chiuso la storia', 30, 80, 36], ['perché nessuno', 30, 125, 36], ['la riaprisse.', 30, 170, 36]], [['lock', 330, 320, 2.2]]],
  [5.6, -66.5, -0.5, [['- I.', 380, 470, 32]], [['hand', 250, 240, 2.2]]],
  [35, -32, 0.2, [['versione 1', 30, 80, 34], ['~versione 2', 30, 130, 34], ['~versione 3', 30, 180, 34]], [['boat', 330, 360, 2]]],
  [96, 2, 0.3, [['notte del 12 marzo', 30, 90, 36, 0, 1]], [['river', 30, 260, 450], ['boat', 260, 230, 1.5]]],
  [105.5, -11, -0.2, [['l\'ho tirata fuori io', 20, 90, 34], ['dall\'acqua', 60, 140, 34]], [['girl', 380, 320, 0.9]]],
  [94.5, -28, 0.4, [['lavanda', 60, 100, 40]], [['lavender', 300, 300, 2.4]]],
  [92.5, -44, 0.1, [['ogni diga è una bugia', 20, 90, 34], ['che regge', 80, 140, 34]], [['river', 30, 300, 440]]],
  [105, -64.5, -0.2, [['perdonami', 120, 260, 48, -0.05, 1]], [['hand', 260, 400, 1.2]]],
];
const WALL_NOTES = [[-5.82, 0.5, Math.PI / 2, 'non cancellare'], [5.82, -2, -Math.PI / 2, 'E. ama il fiume'], [-6.82, -14, Math.PI / 2, 'vigile vigile vigile'], [5.82, -28, -Math.PI / 2, '4 secondi'], [-7.82, -42, Math.PI / 2, 'giudica tu'], [7.82, -60, -Math.PI / 2, 'NON APRIRE'], [92.82, -15, Math.PI / 2, 'peso = colpa?'], [106.82, -31, -Math.PI / 2, 'troppi libri'], [32.82, -26, Math.PI / 2, 'archivio']];
export function sketchFloor(scene, lines, sketches, w, x, z, rot = 0, op = 0.85) { return floorNote(scene, noteTex(lines, sketches), w, x, z, rot, op); }
export function sketchWall(scene, text, x, z, side, y = 0.8, w = 0.9) { return wallNote(scene, noteTex([[text, 40, 270, 46, -0.08, true]], [], { paper: true }), x, z, side, y, w); }

// v1.4 · oggetti di scena nelle stanze grandi: pile di libri, fogli appallottolati, rotoli, calamai (instanced: pochi draw call)
export function buildProps(scene) {
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const slots = { book0: [], book1: [], book2: [], ball: [], scroll: [], sheet: [], pool: [] }; const solids = [];
  for (const r of ROOMS) { if (r.chain === 'c2') continue;
    const n = Math.round((r.w + r.d) * 0.55);
    for (let k = 0; k < n; k++) { const side = Math.floor(rnd() * 4); const t = rnd() * 0.84 + 0.08; let x, z;
      if (side < 2) { x = r.cx - r.w / 2 + t * r.w; z = side === 0 ? r.cz - r.d / 2 + 0.75 : r.cz + r.d / 2 - 0.75; if (Math.abs(x - r.cx) < GAP / 2 + 1.6) continue; }
      else { z = r.cz - r.d / 2 + t * r.d; x = side === 2 ? r.cx - r.w / 2 + 0.75 : r.cx + r.w / 2 - 0.75; }
      const kind = rnd();
      if (kind < 0.45) { const h = 2 + Math.floor(rnd() * 5); let y = 0; for (let i = 0; i < h; i++) { const th = 0.12 + rnd() * 0.08; slots['book' + Math.floor(rnd() * 3)].push([x + (rnd() - 0.5) * 0.12, y + th / 2, z + (rnd() - 0.5) * 0.12, rnd() * 3, 0.55 + rnd() * 0.25, th, 0.4 + rnd() * 0.15]); y += th; } if (h > 3) solids.push({ x, z, r: 0.45 }); }
      else if (kind < 0.7) { for (let i = 0; i < 3; i++) { const s = 0.16 + rnd() * 0.12; slots.ball.push([x + (rnd() - 0.5) * 1.1, s * 0.8, z + (rnd() - 0.5) * 1.1, rnd() * 3, s, s, s]); } }
      else if (kind < 0.85) { slots.scroll.push([x, 0.1, z, rnd() * 3, 1, 1, 1]); slots.scroll.push([x + 0.3, 0.1, z + 0.2, rnd() * 3, 0.8, 1, 0.8]); }
      else { for (let i = 0; i < 4; i++) slots.sheet.push([x + (rnd() - 0.5) * 2, 0.012 + i * 0.002, z + (rnd() - 0.5) * 2, rnd() * 6.28, 1, 1, 1]); } }
    // interno: fogli sparsi, cartacce e pozze d'inchiostro (piatti, non bloccano il passo)
    const ni = Math.round(r.w * r.d / 16);
    for (let k = 0; k < ni; k++) { const x = r.cx + (rnd() - 0.5) * (r.w - 2), z = r.cz + (rnd() - 0.5) * (r.d - 2); if (Math.abs(x - r.cx) < 1.6) continue; const kind = rnd();
      if (kind < 0.55) { const c = 2 + Math.floor(rnd() * 4); for (let i = 0; i < c; i++) slots.sheet.push([x + (rnd() - 0.5) * 1.6, 0.012 + i * 0.002, z + (rnd() - 0.5) * 1.6, rnd() * 6.28, 1, 1, 1]); }
      else if (kind < 0.8) { slots.ball.push([x, 0.15, z, rnd() * 3, 0.18, 0.18, 0.18]); slots.ball.push([x + 0.4, 0.12, z - 0.2, rnd() * 3, 0.14, 0.14, 0.14]); }
      else { const sz = 0.4 + rnd() * 0.8; slots.pool.push([x, 0.008, z, rnd() * 6.28, sz, 1, sz * (0.6 + rnd() * 0.5)]); } } }
  const geos = { book0: new THREE.BoxGeometry(1, 1, 1), book1: new THREE.BoxGeometry(1, 1, 1), book2: new THREE.BoxGeometry(1, 1, 1), ball: new THREE.IcosahedronGeometry(1, 1), scroll: new THREE.CylinderGeometry(0.09, 0.09, 0.7, 8).rotateZ(Math.PI / 2), sheet: new THREE.PlaneGeometry(0.42, 0.56).rotateX(-Math.PI / 2), pool: new THREE.CircleGeometry(0.5, 14).rotateX(-Math.PI / 2) };
  const cols = { book0: 0x8a2416, book1: 0x2b4a5a, book2: 0x5a3a22, ball: 0xeee4cf, scroll: 0xe2d6b8, sheet: 0xf3ead6, pool: 0x5a4636 };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  for (const k of Object.keys(slots)) { const L = slots[k]; if (!L.length) continue; withMask(geos[k], k === 'sheet' || k === 'pool' ? 0 : 0.6);
    const mesh = new THREE.InstancedMesh(geos[k], inkMaster({ color: cols[k], y0: 0, y1: 1 }), L.length);
    L.forEach(([x, y, z, ry, sx, sy, sz], i) => { e.set(0, ry, 0); q.setFromEuler(e); m4.compose(v.set(x, y, z), q, sc.set(sx, sy, sz)); mesh.setMatrixAt(i, m4); });
    mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false; scene.add(mesh); }
  return solids;
}
export const LIGHTS = [
  // [tipo, x, z]  (v1.4: più luci per le stanze grandi)
  ['lamp', -5.4, 3.8], ['candle', 5.3, -1.5], ['candle', -5.7, -9.8], ['jar', 6.3, -18.6], ['jar', 0, -9.2], ['lamp', 5.3, -24], ['candle', -5.3, -24.2],
  ['candle', -7.2, -43.4], ['jar', 7.3, -43.6], ['candle', 0, -38.6], ['candle', -7.3, -63.6], ['candle', 7.3, -63.6], ['lamp', 0, -55.8], ['jar', -5.3, -75.8], ['jar', 5.3, -75.8],
  ['lamp', 40, -22.6], ['jar', -44.2, -24], ['jar', -35.8, -24], ['candle', -44.2, -31.8], ['candle', -35.8, -31.8],
  ['candle', -5.2, -4.2], ['candle', 5.2, 4.2], ['jar', 2.2, -4.4], ['lamp', -6.2, -19.4], ['lamp', 6.2, -9.0], ['candle', 5.3, -32.3], ['jar', -3.2, -30.8],
  ['lamp', -7.2, -38.6], ['lamp', 7.2, -38.6], ['candle', -3.6, -49.4], ['candle', 3.8, -49.4], ['lamp', -7.2, -68.4], ['lamp', 7.2, -68.4], ['jar', -7.2, -56], ['jar', 7.2, -56],
  ['candle', -4.8, -84.2], ['candle', 4.8, -84.2], ['jar', 33, -22], ['candle', 47, -22], ['jar', 47, -34.5], ['candle', 33, -34.5],
  ['lamp', 93.6, 4.2], ['candle', 106.2, 4.2], ['jar', 93, -20.5], ['lamp', 107.2, -9.6], ['candle', 93.6, -36.5], ['candle', 106.4, -36.5], ['lamp', 91.6, -41.6], ['lamp', 108.4, -41.6], ['jar', 92, -55.5], ['jar', 108, -55.5], ['candle', 95, -71.4], ['candle', 105, -71.4],
];
export function buildStory(scene) {
  for (const [x, z, r, lines, sk] of NOTES) floorNote(scene, noteTex(lines, sk), 3.2, x, z, r, 0.85);
  for (const [x, z, side, t] of WALL_NOTES) wallNote(scene, noteTex([[t, 40, 270, 52, -0.1, t === t.toUpperCase()]], [], { paper: true }), x, z, side, 0.78, 0.75);
  const out = []; for (let [k, x, z] of LIGHTS) { [x, z] = F(x, z); const m = k === 'candle' ? makeCandle(0.4 + Math.random() * 0.4) : k === 'lamp' ? makeLamp() : makeInkJar(); m.position.set(x, 0, z); scene.add(m);
    const col = k === 'jar' ? [0.25, 0.75, 1.2] : k === 'lamp' ? [1.3, 0.95, 0.55] : [1.2, 0.7, 0.3]; out.push({ m, x, y: m.userData.ly, z, r: k === 'lamp' ? 4.6 : k === 'jar' ? 2.8 : 3.4, col, ph: Math.random() * 10, kind: k }); }
  return out;
}

// ELARA in 3D: una ragazza fatta di carta e inchiostro, accanto alla sua pagina.
export function makeElara() {
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
  const dress = inked(lathe([[0.5, 0], [0.47, 0.1], [0.36, 0.55], [0.24, 0.95], [0.17, 1.15], [0.12, 1.22]], 18), { color: 0xefe5cf, shift: 0x8a2416, y0: 0, y1: 1.25, texScale: 0.6 }); dress.material.side = THREE.DoubleSide; body.add(dress);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const fr = inked(new THREE.ConeGeometry(0.06, 0.2, 3), { color: 0xd8cbb0, outline: false }); fr.position.set(Math.sin(a) * 0.48, 0.02, Math.cos(a) * 0.48); fr.rotation.set(Math.PI, a, 0); body.add(fr); }
  const lines = new THREE.Group(); body.add(lines); for (let i = 0; i < 6; i++) { const r = 0.45 - i * 0.045; const ln = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 3, 30), new THREE.MeshBasicMaterial({ color: 0x3a2a20 })); ln.rotation.x = Math.PI / 2; ln.position.y = 0.12 + i * 0.13; lines.add(ln); }
  const sash = inked(new THREE.TorusGeometry(0.2, 0.035, 6, 16), { color: 0x8a2416, outline: false }); sash.rotation.x = Math.PI / 2; sash.position.y = 0.92; body.add(sash);
  const ribbon = inked(new THREE.PlaneGeometry(0.08, 0.45, 1, 3), { color: 0x8a2416, outline: false }); ribbon.material.side = THREE.DoubleSide; ribbon.position.set(0.09, 0.7, 0.2); ribbon.rotation.set(-0.15, 0, 0.12); body.add(ribbon);
  const collar = inked(new THREE.TorusGeometry(0.12, 0.03, 6, 14), { color: 0xf6efe0, ow: 0.012 }); collar.rotation.x = Math.PI / 2; collar.position.y = 1.2; body.add(collar);
  const neck = inked(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 8), { color: 0xf3e9d4, outline: false }); neck.position.y = 1.27; body.add(neck);
  const head = inked(new THREE.SphereGeometry(0.17, 18, 14), { color: 0xf6eddb, y0: 1.25, y1: 1.6, ow: 0.018 }); head.scale.set(0.92, 1.05, 0.95); head.position.y = 1.45; body.add(head);
  const hair = inked(new THREE.SphereGeometry(0.19, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), { color: 0x120c0a, ow: 0.018 }); hair.position.set(0, 1.47, -0.02); hair.rotation.x = -0.25; body.add(hair);
  const back = inked(lathe([[0.17, 0], [0.2, -0.25], [0.18, -0.55], [0.1, -0.7]], 14), { color: 0x120c0a, outline: false }); back.position.set(0, 1.5, -0.06); back.scale.z = 0.7; body.add(back);
  for (let i = 0; i < 7; i++) { const a = -1.2 + i * 0.4; const len = 0.12 + (i * 37 % 5) * 0.05; const d = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, len, 4), new THREE.MeshBasicMaterial({ color: 0x120c0a })); d.position.set(Math.sin(a + Math.PI) * 0.15, 0.8 - len / 2, Math.cos(a + Math.PI) * 0.1 - 0.05); body.add(d);
    const dr = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), new THREE.MeshBasicMaterial({ color: 0x120c0a })); dr.scale.y = 1.4; dr.position.set(d.position.x, 0.8 - len, d.position.z); body.add(dr); }
  for (const sd of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: 0x1b130e })); ey.scale.set(1, 0.7, 0.5); ey.position.set(sd * 0.06, 1.47, 0.15); body.add(ey);
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.008, 0.01), new THREE.MeshBasicMaterial({ color: 0x1b130e })); br.position.set(sd * 0.06, 1.515, 0.155); br.rotation.z = sd * -0.15; body.add(br);
    const ch = new THREE.Mesh(new THREE.CircleGeometry(0.025, 8), new THREE.MeshBasicMaterial({ color: 0xd88a70, transparent: true, opacity: 0.45 })); ch.position.set(sd * 0.085, 1.42, 0.16); body.add(ch);
    const arm = new THREE.Group(); arm.position.set(sd * 0.17, 1.14, 0); arm.rotation.set(-0.5, 0, sd * 0.18); body.add(arm);
    const sl = inked(lathe([[0.05, 0], [0.07, -0.25], [0.09, -0.45]], 10), { color: 0xe6dcc6, ow: 0.012 }); arm.add(sl);
    const hand = inked(new THREE.SphereGeometry(0.04, 8, 6), { color: 0xf6eddb, outline: false }); hand.position.y = -0.48; arm.add(hand); }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.01), new THREE.MeshBasicMaterial({ color: 0x8a2416 })); mouth.position.set(0, 1.38, 0.16); body.add(mouth);
  // libro di sentenze stretto al petto
  const bk = inked(new THREE.BoxGeometry(0.26, 0.32, 0.06), { color: 0x6b2318, ow: 0.015 }); bk.position.set(0, 0.92, 0.3); bk.rotation.x = -0.3; body.add(bk);
  const bp = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.29, 0.065), new THREE.MeshBasicMaterial({ color: 0xefe5cf })); bp.position.set(0.012, 0.92, 0.3); bp.rotation.x = -0.3; body.add(bp);
  // alone e fogli che le girano intorno
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radTex(), color: 0xffe2b0, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(1.6, 2.4, 1); glow.position.y = 0.95; g.add(glow);
  const orbit = new THREE.Group(); g.add(orbit); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const sh = inked(new THREE.PlaneGeometry(0.16, 0.2), { color: 0xf3ead6, outline: false }); sh.material.side = THREE.DoubleSide; sh.position.set(Math.cos(a) * 0.75, 0.6 + (i % 3) * 0.35, Math.sin(a) * 0.75); sh.rotation.set(0.4, a, 0.3); orbit.add(sh); }
  g.userData = { body, orbit, head }; return g;
}
