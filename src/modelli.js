// v2.3 · Personaggi 3D dai modelli di Joseph (assets/modelli/*.glb, compressi meshopt + webp).
// I modelli non hanno scheletro: li pulisco al caricamento (pezzetti staccati, base piatta, piedi a terra) e li muovo io
// con il vertex shader (ANIM_GLSL in art.js) guidato da quanto e come si spostano davvero nel gioco.
// Se un modello non arriva, resta il personaggio di prima (nessun errore).
import * as THREE from '../vendor/three.module.js?v=2.6.0-prova';
import { GLTFLoader } from '../vendor/GLTFLoader.js?v=2.6.0-prova';
import { MeshoptDecoder } from '../vendor/meshopt_decoder.module.js?v=2.6.0-prova';
import { MeshoptSimplifier } from '../vendor/meshopt_simplifier.module.js?v=2.6.0-prova';
import { inkMaster, outlineMat, withMask, animUniforms } from './art.js?v=2.6.0-prova';

// come si muove ciascuno: kind 0 bipede · 1 rimbalza · 2 zampe a onda; stride/swing in frazioni dell'altezza; step = metri per passo (a 1 m di altezza)
export const RIG = {
  correttore: { kind: 0, stride: 0.12, swing: 0.035, step: 0.55, flutter: 1, rig: true },
  elara: { kind: 0, stride: 0.12, swing: 0.06, step: 0.5, flutter: 0.6, rig: true },
  elara_bambina: { kind: 0, stride: 0.09, swing: 0.06, step: 0.45, flutter: 0.6 },
  ilde: { kind: 0, stride: 0.06, swing: 0.04, step: 0.4, flutter: 0.5 },
  figura_velata: { kind: 0, stride: 0.035, swing: 0.02, step: 0.35, flutter: 1.4 }, // il velo striscia e si gonfia più dei piedi
  custode: { kind: 0, stride: 0.13, swing: 0.1, step: 0.42, flutter: 0.25, heavy: true, rig: true },
  creatura_spine: { kind: 0, stride: 0.12, swing: 0.1, step: 0.45, flutter: 1.5, heavy: true, rig: true },
  robot: { kind: 0, stride: 0.1, swing: 0.09, step: 0.5, flutter: 0.1, heavy: true, rig: true },
  caricatore: { kind: 2, stride: 0.16, step: 0.3, flutter: 0.35 },
  macchia: { kind: 1, flutter: 1.2, hop: 0.32, hopRate: 7 },
  blob_tentacoli: { kind: 1, flutter: 1.4, hop: 0.38, hopRate: 6 },
  rilegatore: { kind: 1, flutter: 0.8, hop: 0.12, hopRate: 4.5 },
};
export const NOMI = Object.keys(RIG);
// si scaricano solo quelli che il gioco usa adesso (Ilde, Elara bambina e il robot entreranno con la storia nuova)
export const USATI = ['correttore', 'macchia', 'caricatore', 'custode', 'rilegatore', 'creatura_spine', 'elara', 'figura_velata', 'blob_tentacoli', 'robot']; // robot = il Compositore
const LOD = {}; // (provato su macchia: le colature aperte non si semplificano; meglio niente contorno per le macchie, vedi miteMesh)
const CLEAN_BASE = new Set(['creatura_spine']); // ha una pozza piatta sotto i piedi
const M = {}; export const STATO = { caricati: [], falliti: [], ms: 0, tris: {} };
export const has = (n) => !!M[n];

// pulizia: attributi float, nodo applicato, via i pezzetti staccati e la base piatta, piedi a y=0, centro in x/z, altezza 1
function bake(root, n) {
  root.updateMatrixWorld(true); let mesh = null; root.traverse((o) => { if (o.isMesh && !mesh) mesh = o; }); if (!mesh) return null;
  const src = mesh.geometry; const pos = src.attributes.position, nor = src.attributes.normal, uv = src.attributes.uv, V = pos.count;
  const P = new Float32Array(V * 3), N = new Float32Array(V * 3), U = new Float32Array(V * 2); const v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  for (let i = 0; i < V; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); P.set([v.x, v.y, v.z], i * 3); if (nor) { v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); N.set([v.x, v.y, v.z], i * 3); } if (uv) U.set([uv.getX(i), uv.getY(i)], i * 2); }
  let I = src.index ? Array.from(src.index.array) : [...Array(V).keys()];
  let y0 = Infinity, y1 = -Infinity; for (let i = 0; i < V; i++) { y0 = Math.min(y0, P[i * 3 + 1]); y1 = Math.max(y1, P[i * 3 + 1]); } const H0 = y1 - y0;
  // 1) componenti connesse (saldando i vertici doppi delle cuciture UV): via quelle minuscole
  const par = new Int32Array(V).map((_, i) => i); const find = (a) => { while (par[a] !== a) a = par[a] = par[par[a]]; return a; }; const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
  const key = new Map(), q = H0 / 4000, weld = new Uint32Array(V); for (let i = 0; i < V; i++) { const k = Math.round(P[i * 3] / q) + ',' + Math.round(P[i * 3 + 1] / q) + ',' + Math.round(P[i * 3 + 2] / q); const j = key.get(k); if (j === undefined) { key.set(k, i); weld[i] = i; } else { uni(i, j); weld[i] = j; } }
  for (let t = 0; t < I.length; t += 3) { uni(I[t], I[t + 1]); uni(I[t], I[t + 2]); }
  const cnt = new Map(); for (let t = 0; t < I.length; t += 3) { const r = find(I[t]); cnt.set(r, (cnt.get(r) || 0) + 1); } const big = Math.max(...cnt.values());
  let J = []; for (let t = 0; t < I.length; t += 3) if (cnt.get(find(I[t])) >= big * 0.004) J.push(I[t], I[t + 1], I[t + 2]);
  // 2) base piatta (solo dove serve): triangoli tutti nel 2,5% più basso e orizzontali
  if (CLEAN_BASE.has(n)) { const lim = y0 + H0 * 0.06, K = []; for (let t = 0; t < J.length; t += 3) { const a = J[t], b = J[t + 1], c = J[t + 2]; const low = P[a * 3 + 1] < lim && P[b * 3 + 1] < lim && P[c * 3 + 1] < lim; if (!low) K.push(a, b, c); } J = K; }
  // 3) LOD per i personaggi numerosi
  if (LOD[n] && J.length / 3 > LOD[n]) { try { const [idx] = MeshoptSimplifier.simplify(new Uint32Array(J.map((i) => weld[i])), P, 3, LOD[n] * 3, 0.5); /* sulla forma saldata: le cuciture della texture non bloccano la semplificazione */ J = Array.from(idx); } catch (e) { STATO.falliti.push(n + ' LOD: ' + e.message); /* resta il modello intero */ } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); if (nor) g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); if (uv) g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.setIndex(J);
  // piedi a terra: il punto più basso RIMASTO (non quello dei pezzetti tolti), centro sotto ai piedi, altezza 1
  const used = new Uint8Array(V); for (const i of J) used[i] = 1; const bb = new THREE.Box3(); for (let i = 0; i < V; i++) if (used[i]) bb.expandByPoint(v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]));
  const h = bb.max.y - bb.min.y; g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2); g.scale(1 / h, 1 / h, 1 / h);
  if (!nor) g.computeVertexNormals(); withMask(g, 1); g.computeBoundingBox(); g.computeBoundingSphere();
  // mezza larghezza «del corpo» (95% dei vertici): serve allo shader per sapere cos'è esterno (mantello, piume, spine)
  const rs = []; const p2 = g.attributes.position; for (let i = 0; i < V; i += 3) if (used[i]) rs.push(Math.hypot(p2.getX(i), p2.getZ(i))); rs.sort((a, b) => a - b); const hw = rs[Math.floor(rs.length * 0.95)] || 0.3;
  const map = mesh.material && mesh.material.map; if (map) { map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; }
  STATO.tris[n] = J.length / 3; const out = { geo: g, map, hw }; if (RIG[n] && RIG[n].rig) autoRig(out); return out;
}

let loading = null;
export function loadModels(base = 'assets/modelli/', names = USATI) {
  if (loading) return loading; const t0 = performance.now(); const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const one = (n) => new Promise((res) => { loader.load(base + n + '.glb?v=2.3.0', (gl) => { try { const r = bake(gl.scene, n); if (r) { M[n] = r; STATO.caricati.push(n); for (const f of (WAIT[n] || [])) f(); delete WAIT[n]; } else STATO.falliti.push(n); } catch (e) { STATO.falliti.push(n + ' ' + e.message); } res(); },
    undefined, (e) => { STATO.falliti.push(n + ' ' + (e && e.message || 'errore')); res(); }); });
  loading = (async () => { try { await MeshoptDecoder.ready; await MeshoptSimplifier.ready; } catch (e) { STATO.falliti.push('decoder ' + e.message); return STATO; } await Promise.all(names.map(one)); STATO.ms = Math.round(performance.now() - t0); return STATO; })();
  return loading;
}
const WAIT = {}; // chi aspetta un modello: quando arriva, il personaggio si «riveste»
export function whenModel(n, f) { if (M[n]) f(); else (WAIT[n] = WAIT[n] || []).push(f); }

// ---- v2.5 · scheletro automatico per chi cammina su due gambe ----
// Ossa messe in base alle proporzioni del modello (alto 1): bacino, schiena, petto, testa, spalle e gomiti, anche e ginocchia.
// Ogni vertice segue 1-4 ossa con pesi morbidi (braccio se è di lato all'altezza del busto, gamba se è sotto il bacino, altrimenti il tronco).
const BONES = ['hips', 'spine', 'chest', 'head', 'shL', 'elL', 'shR', 'elR', 'hipL', 'knL', 'hipR', 'knR'];
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function autoRig(d) { const g = d.geo, P = g.attributes.position, V = P.count;
  const band = []; for (let i = 0; i < V; i++) { const y = P.getY(i); if (y > 0.66 && y < 0.8) band.push(Math.abs(P.getX(i))); } band.sort((a, b) => a - b);
  const sw = band.length ? band[Math.floor(band.length * 0.9)] : 0.2, sx = sw * 0.72, hx = Math.max(0.05, sx * 0.38);
  const J = { hips: [0, 0.47, 0], spine: [0, 0.6, 0], chest: [0, 0.73, 0], head: [0, 0.86, 0], shL: [-sx, 0.77, 0], elL: [-sx * 1.08, 0.6, 0], shR: [sx, 0.77, 0], elR: [sx * 1.08, 0.6, 0], hipL: [-hx, 0.46, 0], knL: [-hx, 0.25, 0], hipR: [hx, 0.46, 0], knR: [hx, 0.25, 0] };
  const SI = new Uint16Array(V * 4), SW = new Float32Array(V * 4), ix = Object.fromEntries(BONES.map((b, i) => [b, i]));
  for (let i = 0; i < V; i++) { const x = P.getX(i), y = P.getY(i), ax = Math.abs(x), L = x < 0; const w = {};
    const arm = sm(sx * 0.5, sx * 0.85, ax) * sm(0.36, 0.47, y) * (1 - sm(0.8, 0.88, y));
    const leg = (1 - sm(0.38, 0.5, y)) * (1 - arm), tor = Math.max(0, 1 - arm - leg);
    if (arm > 0) { const lo = 1 - sm(0.56, 0.66, y); w[L ? 'elL' : 'elR'] = arm * lo; w[L ? 'shL' : 'shR'] = arm * (1 - lo); }
    if (leg > 0) { const r = Math.min(1, Math.max(0, 0.5 + x / (hx * 2.4))), kn = 1 - sm(0.2, 0.32, y); for (const [sd, f] of [['L', 1 - r], ['R', r]]) { if (f <= 0) continue; w['kn' + sd] = (w['kn' + sd] || 0) + leg * f * kn; w['hip' + sd] = (w['hip' + sd] || 0) + leg * f * (1 - kn); } }
    if (tor > 0) { const hs = [['hips', 0.47], ['spine', 0.6], ['chest', 0.73], ['head', 0.86]]; let k = 0; while (k < 3 && y > hs[k + 1][1]) k++; const [a, ya] = hs[k], [b, yb] = hs[Math.min(3, k + 1)]; const t = b === a ? 0 : Math.min(1, Math.max(0, (y - ya) / (yb - ya))); const tt = y < 0.47 ? 0 : t;
      w[a] = (w[a] || 0) + tor * (1 - tt); if (b !== a) w[b] = (w[b] || 0) + tor * tt; }
    const top = Object.entries(w).filter(([, v]) => v > 0.001).sort((p, q) => q[1] - p[1]).slice(0, 4); const sum = top.reduce((s2, [, v]) => s2 + v, 0) || 1;
    top.forEach(([b, v], k) => { SI[i * 4 + k] = ix[b]; SW[i * 4 + k] = v / sum; }); if (!top.length) { SI[i * 4] = 0; SW[i * 4] = 1; } }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4)); d.joints = J; }
const PARENT = { spine: 'hips', chest: 'spine', head: 'chest', shL: 'chest', elL: 'shL', shR: 'chest', elR: 'shR', hipL: 'hips', knL: 'hipL', hipR: 'hips', knR: 'hipR' };
function makeSkeleton(J) { const bones = {}; for (const b of BONES) { bones[b] = new THREE.Bone(); bones[b].name = b; }
  for (const b of BONES) { const p = PARENT[b], j = J[b], pj = p ? J[p] : [0, 0, 0]; bones[b].position.set(j[0] - pj[0], j[1] - pj[1], j[2] - pj[2]); if (p) bones[p].add(bones[b]); }
  return { bones, list: BONES.map((b) => bones[b]), skeleton: new THREE.Skeleton(BONES.map((b) => bones[b])) }; }
// posa di camminata/respiro sullo scheletro (le azioni del gioco si aggiungono dopo con a.pose)
function walkPose(R, a, t) { const B = R.bones, s = a.spd, ph = a.U.uPh.value, sw = Math.sin(ph), heavy = a.rig.heavy ? 1.25 : 1;
  for (const b of R.list) b.rotation.set(0, 0, 0); B.hips.position.y = R.J.hips[1] + Math.abs(Math.cos(ph)) * 0.022 * s - (a.rig.heavy ? 0.012 * s : 0);
  B.hipL.rotation.x = sw * 0.5 * s * heavy; B.hipR.rotation.x = -sw * 0.5 * s * heavy; B.knL.rotation.x = Math.max(0, sw) * 0.7 * s; B.knR.rotation.x = Math.max(0, -sw) * 0.7 * s;
  B.shL.rotation.x = -sw * 0.42 * s; B.shR.rotation.x = sw * 0.42 * s; B.elL.rotation.x = -0.25 * s; B.elR.rotation.x = -0.25 * s;
  B.shL.rotation.z = -0.08; B.shR.rotation.z = 0.08; B.spine.rotation.y = sw * 0.09 * s; B.spine.rotation.x = 0.07 * s + (a.rig.heavy ? 0.06 : 0); B.hips.rotation.y = -sw * 0.05 * s;
  B.chest.rotation.x = Math.sin(t * 2.1 + a.U.uSeed.value) * 0.025; B.head.rotation.y = Math.sin(t * 0.7 + a.U.uSeed.value) * 0.12 * (1 - s); B.head.rotation.x = -0.05 * s; }
// Mesh a inchiostro con il colore del modello: stessi effetti del gioco (lampo del colpo, dissolvenza, crepe, bagliore, luci) + movimento
export const LIVE = [];
const SHADOW_GEO = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), SHADOW_MAT = new THREE.MeshBasicMaterial({ color: 0x0b0806, transparent: true, opacity: 0.38, depthWrite: false }); // modelli vivi da animare ogni fotogramma
export function makeModel(n, height, o = {}) {
  const d = M[n]; if (!d) return null; const rig = { ...RIG[n], ...o }; const U = animUniforms({ ...rig, hw: d.hw });
  const mat = inkMaster({ color: 0xffffff, map: d.map, y0: 0, y1: height, texBlend: o.texBlend ?? 0.12, anim: U });
  let m, R = null; if (d.joints && o.rig !== false) { m = new THREE.SkinnedMesh(d.geo, mat); R = makeSkeleton(d.joints); R.J = d.joints; m.add(R.bones.hips); m.scale.setScalar(height); m.updateMatrixWorld(true); m.bind(R.skeleton); U.uKind.value = 3; m.boundingSphere = d.geo.boundingSphere.clone(); m.boundingSphere.radius *= 1.6; } // sfera un po' più grande: con le braccia alzate resta dentro, e fuori schermo non si disegna
  else { m = new THREE.Mesh(d.geo, mat); m.scale.setScalar(height); } m.userData.model3d = n; m.userData.rig = R;
  if (o.outline !== false) { let ol; if (R) { ol = new THREE.SkinnedMesh(d.geo, outlineMat((o.ow ?? 0.012) / height, U)); ol.bind(R.skeleton, m.bindMatrix); ol.boundingSphere = m.boundingSphere; } else ol = new THREE.Mesh(d.geo, outlineMat((o.ow ?? 0.012) / height, U)); ol.renderOrder = -1; m.add(ol); m.userData.outline = ol; }
  let shadow = null; if (o.shadow !== false) { shadow = new THREE.Mesh(SHADOW_GEO, SHADOW_MAT); shadow.scale.setScalar(d.hw * 1.35); shadow.position.y = 0.004 / height; shadow.renderOrder = -2; m.add(shadow); } // ombra a terra: il personaggio «poggia»
  m.userData.anim = { U, rig, height, shadow, ground: o.ground !== false, last: null, vel: new THREE.Vector2(), drag: new THREE.Vector2(), hopT: Math.random() * 3, spd: 0, base: 0, hit: 0 };
  LIVE.push(m); return m;
}

// ---- animazione di tutti i modelli vivi: velocità vera → passi, rimbalzi, inclinazione, parti che restano indietro ----
const _v2 = new THREE.Vector2(), _w = new THREE.Vector3(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _l = new THREE.Vector3();
export function animateModels(dt) {
  if (dt <= 0) return;
  for (let i = LIVE.length - 1; i >= 0; i--) { const m = LIVE[i], a = m.userData.anim; if (!m.parent) { if (a.dropT > 2) LIVE.splice(i, 1); a.dropT = (a.dropT || 0) + dt; continue; } a.dropT = 0;
    let vis = true; for (let o = m; o; o = o.parent) if (!o.visible) { vis = false; break; } if (!vis) { a.last = null; continue; }
    m.parent.matrixWorld.decompose(_p, _q, _s); m.getWorldPosition(_w);
    if (!a.last) a.last = _w.clone(); const dx = _w.x - a.last.x, dz = _w.z - a.last.z; a.last.copy(_w); let sp = Math.hypot(dx, dz) / dt; if (sp > 25) sp = 0; a.sp = sp; // teletrasporto: niente passi
    // velocità nel sistema del modello (avanti = +z)
    _l.set(dx / dt, 0, dz / dt); if (sp === 0) _l.set(0, 0, 0); _l.applyQuaternion(_q.clone().invert()); a.vel.lerp(_v2.set(_l.x, _l.z), Math.min(1, dt * 10)); // vel.x = di lato, vel.y = avanti (asse z del modello)
    const r = a.rig, H = a.height * _s.y, run = r.kind === 1 ? 3 : (r.heavy ? 3 : 5); a.spd += (Math.min(1, sp / run) - a.spd) * Math.min(1, dt * 8);
    const U = a.U; U.uSpd.value = a.spd;
    U.uPh.value += (sp * dt) / Math.max(0.2, (r.step || 0.5) * H) * Math.PI; // un passo ogni «step» metri: i piedi non scivolano
    // le parti esterne restano indietro (molla) e scattano a ogni appoggio
    const k = 0.03 / Math.max(0.6, H) * (r.flutter ?? 1); a.drag.lerp(_v2.set(-a.vel.x * k, -a.vel.y * k), Math.min(1, dt * 5)); if (a.drag.length() > 0.075) a.drag.setLength(0.075);
    U.uDrag.value.copy(a.drag); U.uLean.value.set(a.vel.x, a.vel.y).multiplyScalar(0.012 / Math.max(0.6, H)).clampLength(0, 0.07);
    let lift = 0, sq = 0;
    if (r.kind === 1) { // rimbalzo: salta mentre si muove, respira da fermo; schiaccia quando atterra
      a.hopT += dt * (r.hopRate || 6) * (0.35 + a.spd); const ph = a.hopT % Math.PI, up = Math.sin(ph);
      lift = up * (r.hop || 0.3) * a.spd * H * 0.35; sq = a.spd > 0.05 ? (up > 0.5 ? 0.08 * a.spd * up : -0.16 * a.spd * Math.pow(1 - up * 2, 2)) : Math.sin(a.hopT * 0.6) * 0.03;
    } else if (r.heavy) { sq = -Math.pow(Math.abs(Math.cos(U.uPh.value)), 8) * 0.04 * a.spd; } // passo pesante: si schiaccia sull'appoggio
    if (a.hit > 0) { a.hit = Math.max(0, a.hit - dt * 5); sq -= a.hit * 0.18; } // colpito: schiacciato
    U.uSq.value = sq;
    if (m.userData.rig) { walkPose(m.userData.rig, a, a.time = (a.time || 0) + dt); if (a.pose) a.pose(m.userData.rig.bones, a); } // scheletro: passi, braccia, poi l'azione del gioco
    // mai fluttuare: la base del modello sta sul pavimento (anche se il gruppo del personaggio è sollevato), più l'eventuale salto
    if (a.ground) { const gy = _w.y - m.position.y * _s.y; const want = gy > 0 ? -gy / _s.y : 0; m.position.y = want + lift / _s.y; }
    else m.position.y = lift / _s.y;
    if (a.shadow) { a.shadow.position.y = (0.004 - lift) / (a.height * _s.y); const k = 1 - Math.min(0.5, lift / Math.max(0.3, H)); a.shadow.scale.setScalar(m.geometry.boundingSphere ? a.U.uHW.value * 1.35 * k : 1); } // l'ombra resta a terra anche quando salta
  }
}
export function hitModel(m) { if (m && m.userData.anim) m.userData.anim.hit = 1; }
