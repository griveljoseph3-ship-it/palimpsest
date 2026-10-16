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
  { id: 'archive', cx: 40, cz: -28, w: 16, d: 14, safe: false, chain: 'arch', title: 'III½ · Archivio sommerso' },
  { id: 'c2a', cx: 100, cz: 0, w: 14, d: 10, safe: true, chain: 'c2', title: 'II·1 · La riva' },
  { id: 'c2b', cx: 100, cz: -15, w: 16, d: 12, safe: false, chain: 'c2', title: 'II·2 · La chiusa' },
  { id: 'c2c', cx: 100, cz: -31, w: 14, d: 12, safe: true, chain: 'c2', title: 'II·3 · La pila dei libri' },
  { id: 'c2d', cx: 100, cz: -49, w: 18, d: 16, safe: false, chain: 'c2', title: 'II·4 · La Diga Rilegata' },
  { id: 'c2e', cx: 100, cz: -67, w: 12, d: 10, safe: true, chain: 'c2', title: 'II·5 · Acqua ferma' },
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
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(80, 140).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: dt, color: 0x9a8a7a })); desk.position.set(0, -0.6, -40); g.add(desk);
  const under = new THREE.Mesh(new THREE.BoxGeometry(18.5, 0.58, 96), new THREE.MeshBasicMaterial({ color: 0x5e5244 })); under.position.set(0, -0.3, -40); g.add(under);
  const desk2 = desk.clone(); desk2.position.set(100, -0.6, -35); g.add(desk2); const desk3 = desk.clone(); desk3.position.set(40, -0.6.toFixed ? -0.6 : -0.6, -28); desk3.scale.set(0.4, 1, 0.2); g.add(desk3);
  const under2 = new THREE.Mesh(new THREE.BoxGeometry(20.5, 0.58, 82), under.material); under2.position.set(100, -0.3, -34); g.add(under2); const under3 = new THREE.Mesh(new THREE.BoxGeometry(17, 0.58, 15), under.material); under3.position.set(40, -0.3, -28); g.add(under3); // spessore delle pagine
  // corridoio della prova nella stanza di Elara
  addWall(-5, -38.2, -5, -46.2, 0.6);
  // fogli che pendono e rilegatura: dettagli d'atmosfera
  const scraps = new THREE.Group(); g.add(scraps);
  for (let i = 0; i < 26; i++) { const r = ROOMS[i % ROOMS.length]; const side = i % 2 ? 1 : -1;
    const p = new THREE.Mesh(withMask(new THREE.PlaneGeometry(0.5 + Math.random() * 0.5, 0.5 + Math.random() * 0.25), 0.2), inkMaster({ color: 0xf1e8d4, texBlend: 1 }));
    p.material.side = THREE.DoubleSide; p.position.set(r.cx + side * (r.w / 2 - 0.17), 0.7 + Math.random() * 0.15, r.cz + (Math.random() - 0.5) * r.d * 0.8); p.rotation.y = side * Math.PI / 2; p.rotation.z = (Math.random() - 0.5) * 0.4; p.userData.sw = Math.random() * 6; scraps.add(p); }
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
  const core = inked(new THREE.IcosahedronGeometry(0.38, 1), { color: 0x9e2b1c, shift: 0xff5530, ow: 0.02 }); core.position.set(0, 0.8, -0.1); body.add(core);
  const armor = new THREE.Group(); body.add(armor);
  for (let i = 0; i < 3; i++) { const sh = inked(new THREE.SphereGeometry(0.78 - i * 0.08, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), { color: i === 1 ? 0xd2c3a0 : 0xbfae8a, y0: 0.2, y1: 1.5, ow: 0.03 });
    sh.scale.set(1, 0.85, 0.75); sh.position.set(0, 0.45 + i * 0.05, -0.55 + i * 0.5); sh.rotation.x = -0.35 + i * 0.25; armor.add(sh); }
  const head = inked(new THREE.BoxGeometry(0.7, 0.45, 0.45), { color: 0x2a211a }); head.position.set(0, 0.6, 0.95); body.add(head);
  for (const s of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff5530 })); eye.position.set(s * 0.18, 0.68, 1.18); body.add(eye);
    const horn = inked(new THREE.ConeGeometry(0.09, 0.55, 5), { color: 0xe8dcc0 }); horn.rotation.x = Math.PI / 2.3; horn.rotation.z = s * -0.4; horn.position.set(s * 0.28, 0.82, 1.2); body.add(horn);
    for (const z of [0.5, -0.1, -0.6]) { const leg = inked(new THREE.CylinderGeometry(0.07, 0.04, 0.55, 5), { color: 0x2a211a, ow: 0.02 }); leg.position.set(s * 0.62, 0.22, z); leg.rotation.z = s * 0.5; body.add(leg); } }
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
  const cloak = inked(lathe([[0.46, 0], [0.5, 0.06], [0.4, 0.45], [0.3, 0.9], [0.22, 1.25], [0.14, 1.38]], 16), { color: 0x241d19, shift: 0x7a1f14, y0: 0, y1: 1.4 }); cloak.material.side = THREE.DoubleSide; body.add(cloak);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const fr = inked(new THREE.ConeGeometry(0.07, 0.22, 4), { color: 0x16110d, outline: false }); fr.position.set(Math.sin(a) * 0.46, -0.05, Math.cos(a) * 0.46); fr.rotation.x = Math.PI; body.add(fr); }
  const head = inked(new THREE.SphereGeometry(0.2, 16, 12), { color: 0x14100d, y0: 1.3, y1: 1.75 }); head.position.y = 1.5; body.add(head);
  const hood = inked(lathe([[0.27, 0], [0.28, 0.15], [0.2, 0.36], [0.03, 0.52]], 14), { color: 0x2c2420 }); hood.position.set(0, 1.33, -0.03); hood.rotation.x = -0.18; body.add(hood);
  for (const sd of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0xf6e3b0 })); e.position.set(sd * 0.07, 1.52, 0.18); body.add(e); }
  const scarf = inked(new THREE.TorusGeometry(0.19, 0.06, 6, 14), { color: 0x8a2416, outline: false }); scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.3; body.add(scarf);
  const tail = inked(new THREE.PlaneGeometry(0.14, 0.6, 1, 4), { color: 0x8a2416, outline: false }); tail.material.side = THREE.DoubleSide; tail.position.set(0.1, 1.05, -0.22); tail.rotation.x = 0.35; body.add(tail);
  const sash = inked(new THREE.TorusGeometry(0.33, 0.03, 5, 14), { color: 0x5a1810, outline: false }); sash.rotation.x = Math.PI / 2; sash.position.y = 0.72; body.add(sash);
  const quillPivot = new THREE.Group(); quillPivot.position.set(0.32, 1.0, 0.05); body.add(quillPivot);
  const quill = inked(new THREE.ConeGeometry(0.05, 1.2, 6), { color: 0x15100c, shift: 0x8a2416 }); quill.rotation.x = Math.PI / 2; quill.position.z = 0.55; quillPivot.add(quill);
  const feather = inked(new THREE.PlaneGeometry(0.22, 0.55, 1, 3), { color: 0xeee4cf, outline: false }); feather.material.side = THREE.DoubleSide; feather.position.set(0, 0.12, -0.15); feather.rotation.x = -0.4; quillPivot.add(feather);
  grp.userData = { body, cloak, head, quillPivot, quill, tail, r: 0.38 }; return grp;
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
    if (state.verdict) { g.save(); g.translate(256, 625); g.rotate(-0.08); g.fillStyle = '#8a1a10'; g.font = 'bold 74px Georgia'; g.textAlign = 'center'; g.fillText(state.verdict, 0, 0); g.restore(); }
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

// ---- decorazioni: capolettera, penna gigante, calamaio, crepe dell'arena ----
function decal(scene, tex, w, h, x, z, rot = 0, opacity = 1) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity })); m.rotation.y = rot; m.position.set(x, 0.01, z); scene.add(m); return m; }
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
  const well = inked(new THREE.CylinderGeometry(0.55, 0.7, 0.8, 12), { color: 0x1a1410, shift: 0x3a1a40 }); well.position.set(4.2, 0.4, -3.2); scene.add(well);
  const lip = inked(new THREE.TorusGeometry(0.35, 0.08, 6, 14), { color: 0x2b221b }); lip.rotation.x = Math.PI / 2; lip.position.set(4.2, 0.82, -3.2); scene.add(lip); out.well = { x: 4.2, z: -3.2, r: 0.75, meshes: [well, lip] };
  for (let i = 0; i < 5; i++) { const ball = inked(new THREE.IcosahedronGeometry(0.22 + Math.random() * 0.12, 1), { color: 0xeee4cf, ow: 0.02 }); ball.position.set(-4.6 + Math.random() * 1.6, 0.2, -3.5 + Math.random() * 2.5); ball.rotation.set(Math.random() * 3, Math.random() * 3, 0); scene.add(ball); }
  // crepe d'inchiostro che partono dal nucleo dell'arena
  const k = document.createElement('canvas'); k.width = k.height = 512; const kg = k.getContext('2d'); kg.strokeStyle = 'rgba(20,12,8,.8)'; kg.lineCap = 'round';
  for (let i = 0; i < 11; i++) { let x = 256, y = 256, a = i / 11 * Math.PI * 2 + Math.random() * 0.3; kg.lineWidth = 5; kg.beginPath(); kg.moveTo(x, y); for (let s = 0; s < 14; s++) { a += (Math.random() - 0.5) * 0.7; x += Math.cos(a) * 16; y += Math.sin(a) * 16; kg.lineTo(x, y); kg.lineWidth = Math.max(1, 5 - s * 0.35); } kg.stroke(); }
  decal(scene, new THREE.CanvasTexture(k), 9, 9, 0, -62, 0, 0.75);
  // segni di cancellatura sul pavimento della porta: "COLPEVOLE" riscritto mille volte
  const d = document.createElement('canvas'); d.width = 1024; d.height = 256; const dg = d.getContext('2d'); dg.font = 'bold 54px Georgia'; dg.fillStyle = 'rgba(138,26,16,.35)';
  for (let i = 0; i < 9; i++) { dg.save(); dg.translate(60 + i * 110, 130 + Math.sin(i) * 40); dg.rotate((Math.random() - 0.5) * 0.5); dg.fillText('COLPEVOLE', -60, 0); dg.strokeStyle = 'rgba(20,12,8,.6)'; dg.lineWidth = 4; dg.beginPath(); dg.moveTo(-70, -16); dg.lineTo(260, -10); dg.stroke(); dg.restore(); }
  decal(scene, new THREE.CanvasTexture(d), 9, 2.2, 0.5, -46.2, 0, 0.8);
  return out;
}
