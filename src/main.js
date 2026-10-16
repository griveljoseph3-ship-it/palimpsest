// PALIMPSEST · vertical slice. Loop, giocatore, IA, dispositivi, Parole Fluttuanti, storia.
import * as THREE from '../vendor/three.module.js';
import { EFFECTS } from './data.js';
import { Grammar } from './resolver.js';
import { Ink, INK } from './ink.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { Tele } from './telemetry.js';
import { paperTexture, INK_UNIFORMS, Traces, Particles, Post } from './art.js';
import * as W from './world.js';
import * as ST from './story.js';
import { Film, FILM_LEN, SHOTS } from './film.js';

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search); const FAST = Q.has('fast');
const OPT_KEY = 'pal.options';
const opts = Object.assign({ vol: 0.8, mus: 0.5, pauseFull: false, reduce: false, contrast: false, big: false, panel: false, easy: false, q: 'auto' }, JSON.parse(localStorage.getItem(OPT_KEY) || '{}'));
const saveOpts = () => localStorage.setItem(OPT_KEY, JSON.stringify(opts));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const lerp = (a, b, t) => a + (b - a) * t; const rnd = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const BLACK = new THREE.Color(0, 0, 0);

// ---------- render ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.info.autoReset = false;
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let pr = opts.q === 'low' ? 0.9 : opts.q === 'high' ? Math.min(devicePixelRatio, 2) : Math.min(devicePixelRatio, isTouch ? 1.25 : 1.5);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1a130e);
const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 120);
const post = new Post(renderer);
const paper = paperTexture(); INK_UNIFORMS.uPaper.value = paper;
const world = W.buildWorld(scene, paper);
const decor = W.buildDecor(scene); const traces = new Traces(scene); const particles = new Particles(scene);
function resize() { const w = innerWidth, h = innerHeight; renderer.setPixelRatio(pr); renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 46 : 34; camera.updateProjectionMatrix(); post.setSize(Math.floor(w * pr), Math.floor(h * pr)); particles.points.material.uniforms.uPR.value = pr; }
addEventListener('resize', resize);

// ---------- sistemi ----------
const grammar = new Grammar(); const ink = new Ink(); const input = new Input(canvas); const sfx = new Sfx();
const mem = ST.loadMem();
const S = { phase: 'title', room: null, deaths: 0, arenaDeaths: 0, arenaProgress: false, doorRoute: null, plan: null, discovered: new Set(), journal: [], lastWord: null, prepared: null,
  encounter: null, time: 0, hitstop: 0, shake: 0, flash: 0, lock: false, done: false, victory: false, tracePos: [], lumiShown: false, attempted: new Set(), visionT: 0 };
let now = 0;
particles.onLand = (x, z) => { traces.add(x, z, rnd(0.18, 0.4), Math.random() < 0.5 ? 0 : 1, now); };
function journal(text) { S.journal.push({ t: Math.round(S.time), text }); toastSmall('✒︎ Diario aggiornato'); }

// ---------- giocatore ----------
const P = { mesh: W.makePlayer(), x: 0, z: 3, vx: 0, vz: 0, face: Math.PI, hp: 5, max: 5, st: 'idle', t: 0, inv: 0, cd: 0, atkSeq: 0, atkId: null, hitDone: false, hitAt: 0, r: 0.38, spawn: { x: 0, z: 3 }, dx: 0, dz: 0 };
scene.add(P.mesh); const pShadow = W.makeShadow(); pShadow.scale.setScalar(1.1); scene.add(pShadow);
const trail = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.9, 24, 1, -0.9, 1.8), new THREE.MeshBasicMaterial({ color: 0x120c0a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
trail.rotation.x = -Math.PI / 2; scene.add(trail);

// ---------- entità ----------
const ENT = {}; const circles = [{ x: decor.well.x, z: decor.well.z, r: decor.well.r }];
function matsOf(obj) { const a = []; obj.traverse((o) => { if (o.material && o.material.userData && o.material.userData.ink) a.push(o.material); }); return a; }
function setOutlines(obj, v) { obj.traverse((o) => { if (o.userData && o.userData.outline) o.userData.outline.visible = v; }); }
function setU(mats, k, v) { for (const m of mats) { const u = m.uniforms[k]; if (!u) continue; if (u.value && u.value.isColor) u.value.copy(v); else if (u.value && u.value.isVector2) u.value.copy(v); else u.value = v; } }
function addEnt(id, type, mesh, x, z, extra = {}) {
  mesh.position.x = x; mesh.position.z = z; scene.add(mesh);
  const e = { id, type, mesh, x, z, mats: matsOf(mesh), comp: null, marks: 0, alive: true, echo: null, ...extra };
  e.compMats = e.mats; ENT[id] = e; if (type) grammar.register(id, type); return e;
}
function setComp(e, obj) { e.comp = obj; e.compMats = matsOf(obj); }
const gates = {};
function addGate(id, x, z, mesh) { const g = { id, mesh, open: false, box: { minX: x - W.GAP / 2 - 0.1, maxX: x + W.GAP / 2 + 0.1, minZ: z - 0.3, maxZ: z + 0.3 } }; if (mesh) { mesh.position.set(x, mesh.position.y, z); scene.add(mesh); } world.walls.push(g.box); gates[id] = g; return g; }
function openGate(id) { const g = gates[id]; if (!g || g.open) return; g.open = true; const i = world.walls.indexOf(g.box); if (i >= 0) world.walls.splice(i, 1); sfx.play('page'); }

// I · tavola
const board = addEnt('board', 'board', W.makeBoard(), 0, -5); setComp(board, board.mesh.userData.body); addGate('board', 0, -5, null);
// II · Caricatore
const charger = addEnt('charger', 'charger', W.makeCharger(), 0, -16);
for (const [x, z] of [[-3.6, -17], [3.6, -12.5]]) { const m = W.makePillar(); m.position.set(x, 1.3, z); scene.add(m); circles.push({ x, z, r: 0.72, pillar: true, mesh: m }); }
addGate('r1', 0, -20, W.makeGate());
// III · pressa e piastra
const press1 = W.makePress(); press1.position.set(-4.4, 0, -28); scene.add(press1); circles.push({ x: -4.4, z: -28, r: 0.9 });
const plate = addEnt('plate', 'plate', W.makePlate(1.5, 1.5), 0, -28);
const wireA = W.makeWire([[-3.6, -28], [-0.8, -28]]); const wireB = W.makeWire([[0, -28.8], [0, -32.6]]); const wireC = W.makeWire([[0.8, -28], [3.6, -30.5]]); scene.add(wireA, wireB, wireC);
const lantern = W.makeMonolith(); lantern.scale.setScalar(0.6); lantern.position.set(3.9, 0.36, -30.8); scene.add(lantern); circles.push({ x: 3.9, z: -30.8, r: 0.4 });
addGate('r2', 0, -33, W.makeGate());
const devR2 = { t: 0, period: 4 };
// IV · porta di Elara
const elara = W.makeElaraPage(true); elara.position.set(0, 0, -49.7); scene.add(elara); addGate('door', 0, -50, null);
const relay = addEnt('relay', 'relay', W.makeRelay(), 2.7, -49.2); setComp(relay, relay.mesh.userData.sup); circles.push({ x: 2.7, z: -49.2, r: 0.35 });
const relayBoxMats = matsOf(relay.mesh.userData.box);
const evplate = addEnt('evplate', 'evplate', W.makePlate(1.2, 1.2, 0x8c6438), -3.3, -47.6);
const reader = W.makeReader(); reader.position.set(-1.9, 0.55, -49.4); scene.add(reader); circles.push({ x: -1.9, z: -49.4, r: 0.4 });
const docM = W.makeDoc(); docM.position.set(-6.5, 0, -39.3); scene.add(docM);
const wireD = W.makeWire([[2.7, -48.8], [2.7, -47.6], [-2.6, -47.6]]); const wireE = W.makeWire([[-3.3, -48.3], [-2.2, -49.1]]); scene.add(wireD, wireE);
const door = { hasDoc: false, docPlaced: false, relayT: 0, defense: null, mites: [], open: null };
// V · arena
const monolith = W.makeMonolith(); monolith.position.set(0, 0.6, -62); scene.add(monolith); circles.push({ x: 0, z: -62, r: 0.6 });
const custode = addEnt('custode', 'custode', W.makeCustode(), 0, -60.3, { boss: true });
for (const [x, z] of [[-4.6, -61], [4.6, -61]]) { const m = W.makePillar(); m.position.set(x, 1.3, z); scene.add(m); circles.push({ x, z, r: 0.72, pillar: true, mesh: m }); }
const bridge = addEnt('bridge', 'bridge', W.makePlate(12, 1.4, 0x7d5a36), 0, -66.6);
const press2 = W.makePress(); press2.position.set(-7.1, 0, -66.6); scene.add(press2);
const wireF = W.makeWire([[-7.1, -65.6], [-7.1, -59.8]]); scene.add(wireF);
const hazard = W.makePlate(2.2, 4.4, 0x5a4632); hazard.position.set(-6.6, 0.05, -59.6); scene.add(hazard);
const seal = W.makeSeal(); seal.position.set(0, 0, -68.5); scene.add(seal);
const tether = W.makeTether(); tether.visible = false; scene.add(tether);
const arena = { t: 0, period: 4, loosenT: 0, window: 0, windowPlan: null, snapped: false, hazardT: 0, warn: false };
// VI · fine
const elara2 = W.makeElaraPage(false); elara2.position.set(-2.6, 0, -82.6); elara2.scale.setScalar(0.75); scene.add(elara2);
const lumi = { mesh: W.makeLumi(), on: false, x: 0, z: 0 }; scene.add(lumi.mesh); lumi.mesh.visible = false;
const lumiTraces = [];
const warnRings = []; const waves = [];
function inkWave(x, z, maxR = 3.5, color = 0x0d0907) { const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false })); m.position.set(x, 0.035, z); scene.add(m); waves.push({ m, t: 0, maxR }); }
function ring(x, z, r, life, color = 0x8a1a10, onEnd) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.85, r, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false })); m.position.set(x, 0.03, z); scene.add(m);
  warnRings.push({ m, life, max: life, onEnd });
}
function castShadow(x, z, w, l) { const m = W.makeShadow(); m.scale.set(w, 1, l); m.rotation.y = -0.9; m.position.set(x + 0.55 * l / 2, 0.014, z - 0.45 * l / 2); scene.add(m); return m; }
for (const c of circles) if (c.pillar) castShadow(c.x, c.z, 1.5, 4.2);
castShadow(-4.4, -28, 1.8, 3.4); castShadow(-7.1, -66.6, 1.8, 3.4); castShadow(0, -62, 1.2, 2.2); castShadow(0.4, -49.6, 3, 5); castShadow(2.7, -49.2, 0.8, 2.5);
const shadows = {}; for (const id of ['charger', 'custode']) { const s = W.makeShadow(); s.scale.setScalar(2.2); scene.add(s); shadows[id] = s; }

// ---------- IA (Caricatore e Custode) ----------
function initAI(e, cfg) { Object.assign(e, { st: 'idle', t: 0, cd: 1.5, vx: 0, vz: 0, face: 0, dir: { x: 0, z: 1 }, armorHP: cfg.armor, armorMax: cfg.armor, armorBroken: false, exposed: 0, atkId: 0, hitPlayer: false, cfg, home: { x: e.x, z: e.z }, push: null, foldStun: false, brokenBy: null }); }
initAI(charger, { speed: 2.6, charge: 11, windup: 0.8, chargeT: 1.0, recover: 1.3, armor: 6, r: 0.85, swipeR: 1.9, dmgCharge: 1, dmgSwipe: 1 });
initAI(custode, { speed: 2.4, charge: 12, windup: 0.9, chargeT: 1.1, recover: 1.4, armor: 14, r: 0.95, swipeR: 2.3, dmgCharge: 2, dmgSwipe: 1 });
setComp(charger, charger.mesh.userData.armor); setComp(custode, custode.mesh.userData.armor);
let attackCounter = 0;
function enemyAttack(e) { e.atkId = 'ea' + (++attackCounter); e.hitPlayer = false; }
function damagePlayer(n, from, attackId) {
  if (P.st === 'dead' || S.lock) return false;
  if (P.inv > 0) { if (attackId && P.st === 'dodge') { const g = ink.dodge(attackId); if (g) { Tele.log('dodge_verified', { attackId }); popInk('+' + g); slowmo(0.25); } } return false; }
  if (opts.easy && n > 1) n = 1;
  P.hp -= n; P.inv = 0.9; P.st = 'hurt'; P.t = 0.25; sfx.play('hurt'); S.shake = 0.5; S.hitstop = 0.08; input.rumble(0.6, 0.9, 180);
  if (from) { const dx = P.x - from.x, dz = P.z - from.z, l = Math.hypot(dx, dz) || 1; P.vx = dx / l * 9; P.vz = dz / l * 9; }
  particles.burst(P.x, 1, P.z, 14, 4); renderHP(); S.shake = 0.8; dmgAt(P.x, 1.8, P.z, '-' + n * 20, 'player'); const hu = $('hurt'); hu.classList.remove('on'); void hu.offsetWidth; hu.classList.add('on'); try { navigator.vibrate && navigator.vibrate(140); } catch (e) {}
  if (P.hp <= 0) die(); return true;
}
function breakArmor(e, by) {
  if (e.armorBroken) return; e.armorBroken = true; e.brokenBy = by; e.comp.visible = false; e.exposed = 3; e.st = 'stun'; e.t = 3; grammar.get(e.id).broken = true;
  sfx.play('break'); S.shake = 0.8; S.hitstop = 0.12; S.flash = 0.25; input.rumble(1, 1, 260);
  for (let i = 0; i < 40; i++) particles.emit(e.x, 1.2, e.z, rnd(-6, 6), rnd(2, 8), rnd(-6, 6), rnd(0.8, 1.6), rnd(0.12, 0.3), 0.85, 0.78, 0.62, 12);
  particles.burst(e.x, 1.2, e.z, 30, 6); traces.add(e.x, e.z, 3, 3, now); S.tracePos.push([e.x, e.z]);
  const bx = e.x, bz = e.z;
  ring(bx, bz, 1.5, 0.5, 0x8a1a10, () => { sfx.play('heavy'); particles.burst(bx, 0.3, bz, 20, 4, [0.8, 0.72, 0.58], 0.18); if (Math.hypot(P.x - bx, P.z - bz) < 1.5) damagePlayer(1, { x: bx, z: bz }, 'frag' + e.id + attackCounter); });
  inkWave(e.x, e.z, 5, 0x5a1810); toast(e.boss ? 'CORAZZA INCRINATA' : 'CORAZZA ROTTA'); hint(ST.HINTS.core);
  if (e.boss) { S.arenaProgress = true; S.attempted.add(by === 'action' ? 'azione' : 'rottura'); }
  Tele.log('component_break', { id: e.id, by });
}
function aiUpdate(e, dt) {
  if (!e.alive || e.st === 'dead') return;
  const c = e.cfg, dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz) || 0.001; const cautious = grammar.has(e.id, 'temperament.cautious');
  const fragile = grammar.has(e.id, 'state.fragile'); e.t -= dt; e.cd -= dt; if (e.exposed > 0) e.exposed -= dt;
  const engaged = S.room === (e.boss ? 'arena' : 'charger') && P.st !== 'dead' && !S.lock;
  let mvx = 0, mvz = 0, sp = c.speed;
  if (e.push) { const k = Math.min(1, dt / 0.4); e.x += e.push.x * k; e.z += e.push.z * k; e.push.t -= dt; if (e.push.t <= 0) e.push = null; }
  switch (e.st) {
    case 'idle': {
      if (!engaged) { const hx = e.home.x - e.x, hz = e.home.z - e.z; if (Math.hypot(hx, hz) > 0.3) { mvx = hx; mvz = hz; } break; }
      e.face = Math.atan2(dx, dz);
      if (cautious) { // cerca posizioni raggiungibili a 3–4 m dal giocatore
        const tx = P.x - dx / d * 3.5, tz = P.z - dz / d * 3.5; mvx = tx - e.x; mvz = tz - e.z; sp = c.speed * 1.5;
        if (Math.hypot(mvx, mvz) < 0.3) { mvx = mvz = 0; }
        if (d < 1.4 && e.cd <= 0) { e.st = 'swipeWU'; e.t = 0.55; e.cd = 1.6; }
      } else if (d < c.swipeR && e.cd <= 0) { e.st = 'swipeWU'; e.t = 0.5; e.cd = 1.4; }
      else if (d > 4 && d < 11 && e.cd <= 0) { e.st = 'windup'; e.t = c.windup; e.dir = { x: dx / d, z: dz / d }; sfx.play('warn'); ring(e.x + e.dir.x * 2, e.z + e.dir.z * 2, 0.6, c.windup, 0xd04020); }
      else if (!e.boss && d < 5.5) { mvx = -dx / d + (-dz / d) * 0.8; mvz = -dz / d + (dx / d) * 0.8; sp = c.speed * 0.8; } // il Caricatore prende la rincorsa
      else { mvx = dx; mvz = dz;
        if (e.boss) { const nx = e.x + dx / d * 0.3, nz = e.z + dz / d * 0.3; if (Math.hypot(nx, nz + 62) > 4.5) { mvx = 0; mvz = 0; } } }
      break; }
    case 'windup': { e.face = Math.atan2(e.dir.x, e.dir.z); if (d > 2) { e.dir.x = lerp(e.dir.x, dx / d, 0.05); e.dir.z = lerp(e.dir.z, dz / d, 0.05); const l = Math.hypot(e.dir.x, e.dir.z); e.dir.x /= l; e.dir.z /= l; }
      if (cautious && Math.random() < 0.02) { e.st = 'idle'; e.cd = 1.5; break; } // meno incline a caricare
      if (e.t <= 0) { e.st = 'charge'; e.t = c.chargeT; enemyAttack(e); sfx.play('heavy'); } break; }
    case 'charge': { e.vx = e.dir.x * c.charge; e.vz = e.dir.z * c.charge; e.x += e.vx * dt; e.z += e.vz * dt;
      if (frame % 2 === 0) particles.emit(e.x, 0.2, e.z, rnd(-1, 1), 1, rnd(-1, 1), 0.5, 0.25, 0.1, 0.08, 0.06, 4);
      if (Math.hypot(P.x - e.x, P.z - e.z) < c.r + P.r + 0.2 && !e.hitPlayer) { e.hitPlayer = true; damagePlayer(c.dmgCharge, e, e.atkId); }
      const hit = collide(e, c.r, true);
      if (hit) { S.shake = 0.6; sfx.play('hit'); particles.burst(e.x + e.dir.x * c.r, 1, e.z + e.dir.z * c.r, 18, 5, [0.85, 0.78, 0.62], 0.2);
        if (hit.pillar && (fragile || e.armorHP <= 0) && !e.armorBroken) breakArmor(e, fragile ? 'fragile' : 'action'); else { e.st = 'stun'; e.t = hit.pillar ? 1.6 : 0.9; }
        if (hit.pillar) hit.mesh.rotation.z = rnd(-0.06, 0.06);
      } else if (e.t <= 0) { e.st = 'recover'; e.t = c.recover; }
      break; }
    case 'recover': case 'stun': if (e.t <= 0) { e.st = 'idle'; e.cd = cautious ? 2.5 : 0.8 + Math.random(); e.foldStun = false; } break;
    case 'swipeWU': e.face = Math.atan2(dx, dz); if (e.t <= 0) { e.st = 'swipe'; e.t = 0.18; enemyAttack(e); sfx.play('swing', 0.6); } break;
    case 'swipe': if (!e.hitPlayer && d < c.swipeR + 0.3) { const a = Math.abs(angDiff(Math.atan2(dx, dz), e.face)); if (a < 1.3) { e.hitPlayer = true; damagePlayer(c.dmgSwipe, e, e.atkId); } }
      if (e.t <= 0) { e.st = 'recover'; e.t = 0.6; } break;
  }
  const ml = Math.hypot(mvx, mvz); if (ml > 0.05) { e.vx = lerp(e.vx, mvx / ml * sp, 0.15); e.vz = lerp(e.vz, mvz / ml * sp, 0.15); } else if (e.st !== 'charge') { e.vx *= 0.8; e.vz *= 0.8; }
  if (e.st !== 'charge') { e.x += e.vx * dt; e.z += e.vz * dt; collide(e, c.r, false); }
  const R = W.ROOMS.find((r) => r.id === (e.boss ? 'arena' : 'charger')); e.x = clamp(e.x, R.cx - R.w / 2 + c.r, R.cx + R.w / 2 - c.r); e.z = clamp(e.z, R.cz - R.d / 2 + c.r, R.cz + R.d / 2 - c.r); // resta nella sua pagina
  if (e.armorBroken && (e.st === 'stun' || e.st === 'recover') && e.exposed <= 0) e.exposed = 0.05; // il nucleo resta scoperto nei varchi
}
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
function collide(o, r, report) {
  let hit = null;
  for (const w of world.walls) { const cx = clamp(o.x, w.minX, w.maxX), cz = clamp(o.z, w.minZ, w.maxZ); const dx = o.x - cx, dz = o.z - cz, d = Math.hypot(dx, dz);
    if (d < r) { if (d > 1e-4) { o.x = cx + dx / d * r; o.z = cz + dz / d * r; } else { o.z += r; } hit = hit || { wall: true }; } }
  for (const c of circles) { const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz), rr = r + c.r; if (d < rr && d > 1e-4) { o.x = c.x + dx / d * rr; o.z = c.z + dz / d * rr; hit = c.pillar ? c : (hit || { wall: true }); } }
  return report ? hit : null;
}

// ---------- azioni del giocatore ----------
function playerUpdate(dt) {
  P.inv -= dt; P.cd -= dt; P.t -= dt;
  if (P.st === 'dead') return;
  const ctl = !S.lock && !panel.open && S.phase === 'play' && !paused;
  const mx = ctl ? input.move.x : 0, mz = ctl ? input.move.y : 0; const ml = Math.hypot(mx, mz);
  let sp = 5.6; if (P.st === 'attack') sp = 2; if (P.st === 'heavy') sp = 0.8; if (P.st === 'hurt') sp = 0;
  if (P.st === 'dodge') { P.x += P.dx * 13 * dt; P.z += P.dz * 13 * dt; if (P.t <= 0) P.st = 'idle'; }
  else { const acc = ml > 0.1 ? 0.22 : 0.3; if (P.st === 'hurt') { P.vx *= 0.85; P.vz *= 0.85; } else { P.vx = lerp(P.vx, mx * sp, acc); P.vz = lerp(P.vz, mz * sp, acc); } P.x += P.vx * dt; P.z += P.vz * dt;
    if (ml > 0.15 && P.st !== 'heavy') P.face = lerpAng(P.face, Math.atan2(mx, mz), 0.25); }
  collide(P, P.r, false);
  if (P.st === 'hurt' && P.t <= 0) P.st = 'idle';
  if ((P.st === 'attack' || P.st === 'heavy') && !P.hitDone && P.t <= P.hitAt) { P.hitDone = true; doHit(P.st === 'heavy'); }
  if ((P.st === 'attack' || P.st === 'heavy') && P.t <= 0) P.st = 'idle';
}
function playerActions() { // input a fronte d'onda letti ogni frame (non perdere pressioni brevi)
  if (S.lock || panel.open || S.phase !== 'play' || paused || P.st === 'dead' || (dlg.active && dlg.opt.choices)) { if (dlg.active && !dlg.opt.choices && input.pressed('interact')) dlgNext(); return; }
  const mx = input.move.x, mz = input.move.y, ml = Math.hypot(mx, mz);
  if (input.pressed('dodge') && P.cd <= 0 && P.st !== 'dodge' && P.st !== 'hurt') { P.dx = ml > 0.1 ? mx / ml : Math.sin(P.face); P.dz = ml > 0.1 ? mz / ml : Math.cos(P.face); P.st = 'dodge'; P.t = 0.22; P.inv = 0.32; P.cd = 0.5; sfx.play('dodge'); Tele.log('dodge'); }
  else if (input.pressed('attack') && (P.st === 'idle' || (P.st === 'attack' && P.t < 0.12))) startAttack(false);
  else if (input.pressed('heavy') && P.st === 'idle') startAttack(true);
  if (input.pressed('interact')) interact();
  if (input.pressed('rewrite')) openPanel();
  if (input.pressed('quick')) quickReapply();
  if (input.pressed('reset')) resetPhrase();
  if (input.pressed('recompose')) recompose();
}
function lerpAng(a, b, t) { return a + angDiff(b, a) * t; }
function startAttack(heavy) { const tgt = nearestEnemy(4); if (tgt) P.face = Math.atan2(tgt.x - P.x, tgt.z - P.z);
  P.st = heavy ? 'heavy' : 'attack'; P.t = heavy ? 0.8 : 0.32; P.hitAt = heavy ? 0.35 : 0.2; P.hitDone = false; P.atkId = 'pa' + (++P.atkSeq); sfx.play(heavy ? 'heavy' : 'swing', 1); input.rumble(0.2, heavy ? 0.5 : 0.1, 60); }
function nearestEnemy(r) { let b = null, bd = r; for (const e of [charger, custode, ...door.mites]) { if (!e.alive || e.st === 'dead') continue; const d = dist(P, e); if (d < bd) { bd = d; b = e; } } return b; }
function inArc(o, range, arc) { const dx = o.x - P.x, dz = o.z - P.z, d = Math.hypot(dx, dz); if (d > range) return false; return d < 0.6 || Math.abs(angDiff(Math.atan2(dx, dz), P.face)) < arc; }
function doHit(heavy) {
  const range = heavy ? 2.4 : 1.9, arc = heavy ? 1.1 : 0.95; let any = false;
  trail.position.set(P.x, 0.05, P.z); trail.rotation.z = P.face - Math.PI / 2; trail.material.opacity = heavy ? 0.85 : 0.6; trail.scale.setScalar(heavy ? 1.25 : 1);
  if (heavy) { particles.burst(P.x + Math.sin(P.face) * 1.5, 0.2, P.z + Math.cos(P.face) * 1.5, 16, 3); traces.add(P.x + Math.sin(P.face) * 1.6, P.z + Math.cos(P.face) * 1.6, 0.6, 1, now); }
  for (const e of [charger, custode]) {
    if (!e.alive || e.st === 'dead' || !inArc(e, range + e.cfg.r * 0.6, arc)) continue; any = true;
    const g = !heavy ? ink.hit(P.atkId) : 0; if (g) popInk('+' + g); Tele.log('hit', { target: e.id, heavy });
    if (e.armorBroken && e.exposed > 0) { coreHit(e); continue; }
    const fr = grammar.has(e.id, 'state.fragile'), combo = fr && grammar.has(e.id, 'temperament.cautious');
    if (heavy && !e.armorBroken && (combo || (fr && (e.st === 'stun' || e.st === 'recover')))) { breakArmor(e, 'fragile'); continue; }
    const vuln = e.st === 'stun' || e.st === 'recover' || e.st === 'windup' || e.st === 'swipeWU';
    if (vuln && !e.armorBroken) { e.armorHP -= heavy ? 3 : 1; sfx.play('hit'); S.hitstop = heavy ? 0.09 : 0.05; particles.burst(e.x, 1.2, e.z, 10, 4, [0.85, 0.78, 0.62], 0.15);
      if (e.armorHP <= 0) breakArmor(e, 'action'); }
    else { sfx.play('deny'); particles.burst(e.x, 1.3, e.z, 4, 2, [0.9, 0.85, 0.7], 0.1); toastSmall('La corazza è integra: attendi un varco'); dmgAt(e.x, (e.mesh.userData.height || 1.6) + 0.3, e.z, 'PARATO', 'block'); }
    const dx = e.x - P.x, dz = e.z - P.z, l = Math.hypot(dx, dz) || 1; if (e.st !== 'charge') { e.vx += dx / l * (heavy ? 4 : 1.5); e.vz += dz / l * (heavy ? 4 : 1.5); }
  }
  for (const m of door.mites) if (m.alive && inArc(m, range, arc + 0.3)) { m.alive = false; any = true; sfx.play('hit'); particles.burst(m.x, 0.4, m.z, 18, 4); traces.add(m.x, m.z, 0.8, 0, now); scene.remove(m.mesh); const g = !heavy ? ink.hit(P.atkId) : 0; if (g) popInk('+' + g); }
  if (!board.broken && dist(P, board) < 2.4 && heavy) { if (grammar.has('board', 'state.fragile')) breakBoard(); else { sfx.play('deny'); toastSmall('La tavola è integra. Il libro dice: integra.'); } any = true; }
  if (!relay.broken && dist(P, relay) < 2.2 && heavy && !S.doorRoute && !door.defense) { if (grammar.has('relay', 'state.fragile')) forceRelay(); else { sfx.play('deny'); toastSmall('Il supporto del relè regge'); } any = true; }
  if (any) input.rumble(0.3, heavy ? 0.7 : 0.3, 80);
}
function coreHit(e) {
  sfx.play('break'); S.hitstop = 0.15; S.flash = 0.35; S.shake = 1; particles.burst(e.x, 1.5, e.z, 50, 7, [0.6, 0.1, 0.06], 0.2); traces.add(e.x, e.z, 2.5, 0, now); input.rumble(1, 1, 300);
  if (!e.boss) { e.st = 'dead'; e.alive = false; e.dying = 0; grammar.resetPhrase(e.id); Tele.log('enemy_defeated', { id: e.id }); endEncounter('charger'); openGate('r1'); toast('IL CARICATORE SI SCIOGLIE'); journal('Hai trasferito FRAGILE dalla tavola al Caricatore.'); hint(''); }
  else if (!arena.snapped) { arena.snapped = true; S.plan = e.brokenBy === 'action' ? 'azione' : 'rottura'; e.exposed = 0; e.st = 'stun'; e.t = 4; toast('LEGAME SPEZZATO'); hint(ST.HINTS.seal); Tele.log('arena_plan', { plan: S.plan }); }
}

// ---------- interazioni ----------
function interactables() {
  const L = [];
  if (S.room === 'intro' && !board.broken && !S.discovered.has('state.fragile')) L.push({ x: 0, z: -4.4, r: 2.6, label: 'guarda', fn: () => { S.discovered.add('state.fragile'); const g = ink.interact(); Tele.log('interact', { what: 'board', gain: g }); sfx.play('page');
    say([['narr', 'Una goccia ha morso la tavola. Sotto la parola INTEGRA si vede un\'altra parola, più vecchia.'], ['narr', 'FRAGILE.']], { done: () => hint(ST.HINTS.firstRewrite) }); journal('Hai trovato la parola FRAGILE sotto INTEGRA.'); } });
  if (S.room === 'door' && !door.hasDoc && !S.doorRoute) L.push({ x: -6.5, z: -39.3, r: 1.6, label: 'prendi', fn: () => { door.hasDoc = true; docM.userData.paper.visible = false; ink.interact(); sfx.play('page'); Tele.log('interact', { what: 'evidence' });
    say([['narr', 'Una testimonianza piegata in quattro. In fondo, una firma che non è quella del relè.']]); journal('Hai preso la prova dal corridoio.'); } });
  if (S.room === 'door' && door.hasDoc && !door.docPlaced && !S.doorRoute) L.push({ x: -1.9, z: -49.4, r: 1.7, label: 'inserisci', fn: () => { door.docPlaced = true; ink.interact(); sfx.play('page'); Tele.log('interact', { what: 'reader' }); hint('La prova è nel lettore. Il relè pulsa già: dai alla piastra una strada'); } });
  if (S.room === 'door' && !S.doorRoute && !door.defense) L.push({ x: 0, z: -48.9, r: 2.0, label: 'parla', fn: talkElara });
  if (S.room === 'arena' && (arena.snapped || arena.window > 0) && !S.victory) L.push({ x: 0, z: -68.2, r: 1.8, label: 'tocca', fn: touchSeal });
  return L;
}
function nearestInteract() { let b = null, bd = 1e9; for (const it of interactables()) { const d = Math.hypot(P.x - it.x, P.z - it.z); if (d < it.r && d < bd) { bd = d; b = it; } } return b; }
function interact() { const it = nearestInteract(); if (dlg.active && (S.lock || dlg.opt.choices || !it)) { dlgNext(); return; } if (it) { if (dlg.active) endDialog(); it.fn(); } }
function talkElara() {
  const L = ST.elaraDoor(mem).slice(); L.push(['elara', 'Se vuoi passare senza strappare niente, difendimi mentre riscrivo la mia riga. Trenta secondi.']);
  say(L, { choices: [['Affidati a Elara', () => startDefense()], ['Non ora', () => {}]] });
}
function startDefense() { door.defense = { t: 30, spawn: 1 }; S.encounter = 'defense'; ink.encounterEnd(); Tele.log('encounter_start', { id: 'defense' }); toast('DIFENDI ELARA · 30'); sfx.tension(true); $('inkWrap').classList.remove('safe'); }
function touchSeal() {
  if (S.victory) return; S.victory = true; if (!S.plan) S.plan = arena.windowPlan || 'controllo';
  Tele.log('arena_plan', { plan: S.plan, final: true }); sfx.play('seal'); S.flash = 0.8; endEncounter('arena'); journal('Il Custode è caduto con il piano: ' + ST.PLAN_TEXT[S.plan] + '.');
  custode.st = 'dead'; custode.dying = 0; tether.visible = false; closePanel(); setTimeout(() => goEnd(), FAST ? 300 : 1800);
}
function breakBoard() { board.broken = true; grammar.get('board').broken = true; openGate('board'); sfx.play('tear'); sfx.play('break'); S.shake = 0.6; S.flash = 0.2; input.rumble(0.8, 1, 200);
  board.mesh.visible = false; for (let i = 0; i < 50; i++) particles.emit(rnd(-1.2, 1.2), rnd(0.2, 1.6), -5, rnd(-3, 3), rnd(1, 5), rnd(-4, 1), rnd(1, 2), rnd(0.15, 0.32), 0.8, 0.7, 0.54, 10);
  traces.add(0, -5, 2.5, 3, now); S.tracePos.push([0, -5]); Tele.log('board_break'); journal('La tavola si è rotta: la prima riscrittura ha cambiato il mondo.'); hint(''); }
function forceRelay() { relay.broken = true; grammar.get('relay').broken = true; relay.mesh.userData.sup.visible = false; relay.mesh.userData.box.position.y = 0.3; relay.mesh.userData.box.rotation.z = 0.7;
  sfx.play('break'); sfx.play('tear'); S.shake = 0.8; elara.userData.st.torn = true; elara.userData.st.eyes = 215; elara.userData.st.mouth = -14; elara.userData.redraw(); setRoute('forced'); }
function setRoute(r) {
  if (S.doorRoute) return; S.doorRoute = r; openGate('door'); door.open = 0; Tele.log('door_route', { door_route: r }); journal(ST.ROUTE_TEXT[r]); sfx.tension(false);
  traces.add(0, -49.2, 2.6, r === 'forced' ? 3 : 0, now); S.tracePos.push([0, -49.2]);
  const L = { forced: [['elara', 'Hai strappato la pagina invece di leggerla. Lo ricorderò.']], evidence: [['elara', 'La prova. Il verdetto si spegne. Questa riga la tengo io.']], trust: [['elara', 'Fatto. Ho una riga mia, adesso. Vai: ti seguo con lo sguardo.']] }[r];
  say(L); hint('');
}

// ---------- Parole Fluttuanti (S3) ----------
const panel = { open: false, target: null, cands: [], words: [], sel: 0, els: [], wasFaded: false };
function zoneSafe() { const r = W.ROOMS.find((x) => x.id === S.room); if (!r) return true; if (S.room === 'door') return !door.defense; return r.safe; }
function visibleWords(id) { return grammar.supported(id).filter((w) => S.discovered.has(w)); }
function candidates() {
  const L = []; for (const e of Object.values(ENT)) { if (!e.type || e.alive === false || e.st === 'dead' || e.broken) continue;
    const d = dist(P, e); if (d > 10) continue; if (!visibleWords(e.id).length) continue; const a = Math.abs(angDiff(Math.atan2(e.x - P.x, e.z - P.z), P.face)); L.push({ e, score: d + a * 1.5 }); }
  return L.sort((a, b) => a.score - b.score).map((x) => x.e);
}
function openPanel(forceId) {
  if (panel.open) { closePanel(); return; }
  panel.cands = forceId ? [ENT[forceId]] : candidates();
  if (!panel.cands.length || !panel.cands[0] || !visibleWords(panel.cands[0].id).length) { sfx.play('deny'); toastSmall(S.discovered.size ? 'Nessuna pagina da riscrivere qui' : 'Non conosci ancora nessuna parola'); return; }
  panel.target = panel.cands[0]; panel.open = true; panel.openedFrame = frame; panel.armed = false; panel.wasFaded = false; panel.sel = 0; ink.openPanel(zoneSafe()); sfx.play('open'); input.rumble(0.15, 0, 50);
  Tele.log('rewrite_open', { target: panel.target.id, ink: Math.round(ink.v), safe: ink.safe }); buildBubbles();
  if (ink.faded) { panel.wasFaded = true; $('words').classList.add('faded'); sfx.play('dry'); Tele.log('ink_faded', { ink: Math.round(ink.v) }); }
}
function buildBubbles() {
  const box = $('bubbles'); box.innerHTML = ''; panel.els = []; const e = panel.target; panel.words = visibleWords(e.id);
  if (grammar.active(e.id).length) panel.words = panel.words.concat(['reset']);
  panel.words.forEach((w, i) => { const b = document.createElement('div'); const isR = w === 'reset';
    b.className = 'bubble ' + (isR ? 'reset' : EFFECTS[w].slot) + (opts.panel ? ' side' : '') + (!isR && grammar.has(e.id, w) ? ' active' : '');
    b.textContent = isR ? 'ripristina' : EFFECTS[w].word; b.style.animationDelay = i * 0.06 + 's';
    if (opts.panel && !isR) b.textContent = { state: 'Stato · ', temperament: 'Temperamento · ', element: 'Elemento · ' }[EFFECTS[w].slot] + EFFECTS[w].word;
    b.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); ev.preventDefault(); if (!ink.canSelect()) return; if (panel.sel === i && panel.armed) confirmWord(); else { selectWord(i); panel.armed = true; } });
    b.addEventListener('pointerenter', () => { if (input.mode === 'kb' && ink.canSelect() && panel.sel !== i) selectWord(i); });
    box.appendChild(b); panel.els.push(b); });
  $('words').classList.remove('hidden'); $('words').classList.toggle('sidePanel', !!opts.panel); $('wordTarget').textContent = grammar.get(e.id).def.name + (panel.cands.length > 1 ? '  ▲▼' : '');
  panel.sel = clamp(panel.sel, 0, panel.words.length - 1); selectWord(panel.sel, true);
  $('wordHelp').textContent = input.mode === 'touch' ? 'tocca per vedere · tocca di nuovo per scrivere · ✎ per chiudere' : input.mode === 'pad' ? '◀ ▶ parola · ▲ ▼ bersaglio · A scrivi · B chiudi' : '◀ ▶ parola · ▲ ▼ bersaglio · Invio scrivi · Esc chiudi';
}
const pv = { group: new THREE.Group(), lit: [] }; scene.add(pv.group);
function selectWord(i, silent) {
  panel.sel = i; panel.els.forEach((b, j) => b.classList.toggle('sel', j === i)); const w = panel.words[i]; const e = panel.target;
  clearPreview();
  if (w === 'reset') { $('pvText').textContent = 'Ripristina la frase: valori e timer tornano all\'originale. Rotture e Inchiostro restano.'; $('pvCombo').textContent = ''; return; }
  $('pvText').textContent = EFFECTS[w].preview; const c = grammar.has(e.id, w) ? null : grammar.comboFor(e.id, w); $('pvCombo').textContent = c ? c.text : ''; showPreview(e, w, c);
  if (!silent) { sfx.play('hover'); input.rumble(0.08, 0, 25); Tele.log('word_preview', { target: e.id, eff: w }); }
  if (c) { Tele.log('combo_preview', { combo: c.id }); sfx.play(EFFECTS[w].sound); }
}
function addPv(geo, color, opacity, x, y, z) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })); m.position.set(x, y, z); pv.group.add(m); return m; }
function showPreview(e, w, combo) {
  if (w === 'state.fragile') { setU(e.compMats, 'uCrack', 0.6); setU(e.compMats, 'uGlow', new THREE.Color(0.25, 0.2, 0.15)); pv.lit.push(() => { setU(e.compMats, 'uGlow', BLACK); });
    addPv(new THREE.RingGeometry(1.35, 1.5, 32).rotateX(-Math.PI / 2), 0xf0e0c0, 0.6, e.x, 0.04, e.z); }
  if (w === 'temperament.cautious') { const dx = e.x - P.x, dz = e.z - P.z, l = Math.hypot(dx, dz) || 1; const tx = P.x + dx / l * 3.5, tz = P.z + dz / l * 3.5;
    addPv(new THREE.CircleGeometry(e.cfg.r, 24).rotateX(-Math.PI / 2), 0x3a2a22, 0.4, tx, 0.04, tz); const ar = addPv(new THREE.ConeGeometry(0.3, 0.8, 3).rotateX(Math.PI / 2), 0xf0e0c0, 0.9, (e.x + tx) / 2, 0.3, (e.z + tz) / 2); ar.lookAt(tx, 0.3, tz); }
  if (w === 'element.conductive') { const segs = { plate: [wireB, wireC], evplate: [wireE], bridge: [wireF] }[e.id] || []; for (const s of segs) for (const m of s.userData.segs) { m.material.color.set(0x3fc1ff); pv.lit.push(() => m.material.color.set(0x3a2a20)); }
    if (e.id === 'bridge') { addPv(new THREE.PlaneGeometry(13, 3.5).rotateX(-Math.PI / 2), 0x3fc1ff, 0.12, 0, 0.03, -66.2); addPv(new THREE.PlaneGeometry(2.4, 4.6).rotateX(-Math.PI / 2), 0xd04020, 0.3, -6.6, 0.12, -59.6); }
    if (e.id === 'custode') addPv(new THREE.RingGeometry(2.8, 3, 32).rotateX(-Math.PI / 2), 0x3fc1ff, 0.4, e.x, 0.04, e.z);
    setU(e.compMats, 'uGlow', new THREE.Color(0.05, 0.25, 0.4)); pv.lit.push(() => setU(e.compMats, 'uGlow', BLACK)); }
  if (combo) addPv(new THREE.RingGeometry(1.7, 1.85, 6).rotateX(-Math.PI / 2), 0xf0b48a, 0.8, e.x, 0.05, e.z);
}
function clearPreview() { for (const f of pv.lit) f(); pv.lit = []; while (pv.group.children.length) { const c = pv.group.children[0]; pv.group.remove(c); c.geometry.dispose(); c.material.dispose(); } }
function closePanel() { if (!panel.open) return; panel.open = false; ink.closePanel(); clearPreview(); $('words').classList.add('hidden'); $('words').classList.remove('faded'); sfx.play('close'); }
function panelUpdate(dtReal) {
  if (!panel.open) return;
  if (!panel.target || panel.target.broken || panel.target.alive === false) { closePanel(); return; }
  const r = ink.tick(dtReal);
  if (ink.faded && !panel.wasFaded) { panel.wasFaded = true; $('words').classList.add('faded'); sfx.play('dry'); Tele.log('ink_faded', { ink: Math.round(ink.v) }); }
  if (r === 'autoclose') { const w = panel.words[panel.sel]; if (w && w !== 'reset') { S.prepared = w; Tele.log('faded_autoclose', { prepared: w }); } closePanel(); renderPrepared(); return; }
  const fresh = panel.openedFrame === frame;
  if (ink.canSelect() && !fresh) {
    if (input.pressed('right')) selectWord((panel.sel + 1) % panel.words.length);
    if (input.pressed('left')) selectWord((panel.sel - 1 + panel.words.length) % panel.words.length);
    if ((input.pressed('up') || input.pressed('down')) && panel.cands.length > 1) { const i = panel.cands.indexOf(panel.target); panel.target = panel.cands[(i + (input.pressed('up') ? 1 : -1) + panel.cands.length) % panel.cands.length]; panel.sel = 0; buildBubbles(); }
    if (input.pressed('confirm') || input.pressed('interact')) { confirmWord(); return; }
  }
  if (!fresh && (input.pressed('back') || input.pressed('rewrite'))) { const w = panel.words[panel.sel]; if (ink.faded && w && w !== 'reset') { S.prepared = w; renderPrepared(); } closePanel(); return; }
  const e = panel.target; const v = new THREE.Vector3(e.x, (e.mesh.userData.height || 1.4) + 0.6, e.z).project(camera);
  const sx = (v.x * 0.5 + 0.5) * innerWidth, sy = (-v.y * 0.5 + 0.5) * innerHeight; const n = panel.words.length;
  $('wordTarget').style.left = sx + 'px'; $('wordTarget').style.top = (sy - 70) + 'px';
  if (!opts.panel) panel.els.forEach((b, i) => { const a = (n === 1 ? 0 : (i / (n - 1) - 0.5) * 2.2) - Math.PI / 2; const R = n > 2 ? 150 : 125; b.style.left = clamp(sx + Math.cos(a) * R * 1.3, 90, innerWidth - 90) + 'px'; b.style.top = clamp(sy + Math.sin(a) * R * 0.6 + 10, 70, innerHeight - 220) + 'px'; });
}
function confirmWord() {
  const w = panel.words[panel.sel], e = panel.target; if (!w || !ink.canSelect()) return;
  if (w === 'reset') { doReset(e); closePanel(); return; }
  if (applyWord(e, w, 'panel')) { const b = panel.els[panel.sel]; if (b) b.classList.add('ripple'); if (FAST) closePanel(); else setTimeout(closePanel, 130); }
}
function applyWord(e, w, via) {
  const chk = grammar.canApply(e.id, w); if (!chk.ok) { sfx.play('deny'); toastSmall(chk.reason); Tele.log('rewrite_denied', { target: e.id, eff: w, reason: chk.reason }); return false; }
  const safe = zoneSafe();
  if (via === 'quick' && !safe && ink.v < INK.confirmCost) { sfx.play('deny'); toastSmall('Inchiostro secco: colpisci o schiva per recuperarlo'); return false; }
  const res = grammar.apply(e.id, w); if (via === 'quick') { if (!safe) ink.v = Math.max(0, ink.v - INK.confirmCost); } else ink.confirm();
  S.lastWord = w; S.prepared = null; renderPrepared();
  if (e.boss) S.attempted.add({ 'state.fragile': 'rottura', 'temperament.cautious': 'controllo', 'element.conductive': 'ambiente' }[w]);
  if (e.id === 'bridge') S.attempted.add('ambiente');
  e.echo = 0; e.marks++; setU(e.mats, 'uMarks', e.marks); sfx.play(EFFECTS[w].sound); sfx.play('confirm'); input.rumble(0.5, 0.8, 120); S.flash = opts.reduce ? 0 : 0.12;
  traces.add(e.x + rnd(-0.5, 0.5), e.z + rnd(-0.5, 0.5), rnd(1.2, 1.8), Math.floor(rnd(0, 3)), now); S.tracePos.push([e.x, e.z]);
  for (let i = 0; i < 14; i++) particles.emit(e.x + rnd(-0.5, 0.5), (e.mesh.userData.height || 1.2) * rnd(0.5, 1), e.z + rnd(-0.5, 0.5), rnd(-0.6, 0.6), rnd(0, 1.5), rnd(-0.6, 0.6), rnd(1, 2), rnd(0.1, 0.22), 0.04, 0.03, 0.03, 7);
  showWordFloat(e, EFFECTS[w].word); inkWave(e.x, e.z, 3.2, w === 'element.conductive' ? 0x1b5a7a : w === 'temperament.cautious' ? 0x2a2440 : 0x0d0907);
  Tele.log(via === 'quick' ? 'quick_reapply' : 'rewrite_confirm', { target: e.id, eff: w, combo: res.combo ? res.combo.id : null, ink: Math.round(ink.v) });
  if (res.combo) toast('✦ ' + EFFECTS[res.combo.a].word + ' + ' + EFFECTS[res.combo.b].word);
  if (e.id === 'board') hint(ST.HINTS.heavy);
  if (e.id === 'charger' && w === 'state.fragile') hint(ST.HINTS.pillar);
  const name = grammar.get(e.id).def.name; if (!S.journal.some((j) => j.text === 'Hai scritto ' + EFFECTS[w].word + ' su: ' + name + '.')) journal('Hai scritto ' + EFFECTS[w].word + ' su: ' + name + '.');
  return true;
}
function quickReapply() {
  const w = S.prepared || S.lastWord; if (!w) { sfx.play('deny'); toastSmall('Nessuna parola pronta'); return; }
  const c = candidates().find((e) => grammar.supported(e.id).includes(w)); if (!c) { sfx.play('deny'); toastSmall('Nessun bersaglio accetta ' + EFFECTS[w].word); return; }
  if (applyWord(c, w, 'quick')) tut.quick = true;
}
function resetPhrase() { const c = candidates().find((e) => grammar.active(e.id).length); if (!c) { sfx.play('deny'); toastSmall('Niente da ripristinare qui'); return; } doReset(c); }
function doReset(e) { grammar.resetPhrase(e.id); sfx.play('close'); traces.add(e.x, e.z, 1.2, 3, now); toastSmall('Frase ripristinata: ' + grammar.get(e.id).def.name); Tele.log('reset_phrase', { target: e.id }); }
function recompose() {
  if (!zoneSafe() || (S.room === 'door' && S.doorRoute)) { sfx.play('deny'); toastSmall('Qui non si può ricomporre'); return; }
  const z = S.room; const ex = grammar.recompose(z); if (!ex) { sfx.play('deny'); toastSmall('Niente da ricomporre'); return; }
  if (z === 'intro' && board.broken) { board.broken = false; board.mesh.visible = true; gates.board.open = false; world.walls.push(gates.board.box); if (dist(P, board) < 1) P.z = -3.5; }
  if (z === 'door') { door.hasDoc = ex.hasDoc; door.docPlaced = ex.docPlaced; docM.userData.paper.visible = !door.hasDoc; }
  sfx.play('page'); S.flash = 0.3; toastSmall('Prova ricomposta'); Tele.log('recompose', { zone: z });
}
function showWordFloat(e, word) { const d = document.createElement('div'); d.className = 'bubble'; d.textContent = word; d.style.pointerEvents = 'none'; document.body.appendChild(d);
  const v = new THREE.Vector3(e.x, (e.mesh.userData.height || 1.4) + 0.4, e.z).project(camera); d.style.left = (v.x * 0.5 + 0.5) * innerWidth + 'px'; d.style.top = (-v.y * 0.5 + 0.5) * innerHeight + 'px';
  d.animate([{ transform: 'translate(-50%,-50%) scale(1.3)', opacity: 1 }, { transform: 'translate(-50%,-160%) scale(.9)', opacity: 0 }], { duration: 1200, easing: 'ease-out' }).onfinish = () => d.remove(); }

// ---------- dispositivi ----------
function pulseWire(w, color = 0x3fc1ff) { for (const m of w.userData.segs) m.material.color.set(color); w.userData.flash = 0.35; }
function pressAnim(p, k) { p.userData.ram.position.y = k > 3 ? 0.65 + (k - 3) * 1.25 : Math.min(1.9, 0.65 + k * 4); }
function devicesUpdate(dt) {
  // III: impulso ogni 4 s di simulazione, anticipazione di 1 s
  devR2.t += dt; pressAnim(press1, devR2.t % devR2.period);
  if (devR2.t >= devR2.period) { devR2.t -= devR2.period; if (S.room === 'conduct') sfx.play('pulse'); pulseWire(wireA);
    if (grammar.has('plate', 'element.conductive')) { pulseWire(wireB); pulseWire(wireC, 0xffb070); particles.burst(3.9, 0.9, -30.8, 10, 2, [1, 0.6, 0.2], 0.15);
      if (!gates.r2.open) { openGate('r2'); Tele.log('device', { what: 'r2_gate' }); journal('Hai dato una strada all\'impulso: CONDUTTIVO non crea energia, la trasporta.'); toast('IL CANCELLO SI APRE'); hint(''); } } }
  // IV: il relè del giudizio pulsa ogni 3 s
  door.relayT += dt; if (door.relayT > 3) { door.relayT = 0; if (!relay.broken) { pulseWire(wireD, 0xff5530); setU(relayBoxMats, 'uGlow', new THREE.Color(0.6, 0.1, 0.05)); setTimeout(() => setU(relayBoxMats, 'uGlow', BLACK), 250);
      if (grammar.has('evplate', 'element.conductive')) { pulseWire(wireE); if (door.docPlaced && !S.doorRoute && !door.defense) { elara.userData.st.verdict = ''; elara.userData.st.mouth = 10; elara.userData.st.eyes = 185; elara.userData.redraw(); sfx.play('seal'); setRoute('evidence'); } } } }
  // V: pressa dell'arena (stesso ciclo)
  if (S.room === 'arena' && !S.victory) {
    arena.t += dt; const a = arena.t % arena.period; pressAnim(press2, a);
    const cond = grammar.has('bridge', 'element.conductive');
    if (a > 3 && !arena.warn) { arena.warn = true; if (cond) { ring(-6.6, -59.6, 1.6, 1, 0xd04020); ring(0, -66.6, 0.9, 1, 0x3fc1ff); sfx.play('warn'); } }
    if (arena.t >= arena.period) { arena.t -= arena.period; arena.warn = false; sfx.play('pulse'); S.shake = Math.max(S.shake, 0.2);
      if (cond) { pulseWire(wireF, 0xffb070); arena.hazardT = 0.6; foldPulse(); }
      if (grammar.has('custode', 'element.conductive') && Math.abs(custode.z + 66.6) < 3.2 && custode.st !== 'dead') custodeShock(); } }
  if (arena.hazardT > 0) { arena.hazardT -= dt; hazard.material.uniforms.uGlow.value.setRGB(0.8, 0.25, 0.05); if (P.x < -5.3 && P.z > -62.1 && P.z < -57.2) damagePlayer(1, null, 'hz' + Math.floor(now)); } else hazard.material.uniforms.uGlow.value.setRGB(0, 0, 0);
  for (const w of [wireA, wireB, wireC, wireD, wireE, wireF]) if (w.userData.flash > 0) { w.userData.flash -= dt; if (w.userData.flash <= 0) for (const m of w.userData.segs) m.material.color.set(0x3a2a20); }
}
function foldPulse() { // la piega laterale del ponte sposta il Custode; il ramo secondario alimenta il pericolo
  sfx.play('electric'); for (let x = -6; x <= 6; x += 0.8) particles.emit(x, 0.3, -66.6, 0, rnd(1, 3), rnd(-1, 1), 0.5, 0.2, 0.25, 0.75, 1, 3);
  if (Math.abs(P.z + 66.6) < 0.8 && Math.abs(P.x) < 6.2) { P.vx += 10; damagePlayer(1, { x: P.x - 1, z: P.z }, 'fold' + Math.floor(now)); }
  const c = custode; if (c.alive && c.st !== 'dead' && c.z < -63.8 && c.z > -68.6 && Math.abs(c.x) < 6.8) {
    const dirX = c.x > 3 ? -1 : 1; c.push = { x: dirX * 5.5, z: 1.2, t: 0.5 }; c.st = 'stun'; c.t = 2.5; c.foldStun = true; S.shake = 0.7; sfx.play('heavy'); toast('LA PIEGA SPOSTA IL CUSTODE'); Tele.log('device', { what: 'fold_push' }); S.attempted.add('ambiente'); }
}
function custodeShock() { const c = custode; c.st = 'stun'; c.t = 1.6; sfx.play('electric'); particles.burst(c.x, 1.6, c.z, 20, 4, [0.25, 0.75, 1], 0.15); if (dist(P, c) < 2) damagePlayer(1, c, 'shock' + Math.floor(now));
  if (grammar.has('custode', 'state.fragile') && !c.armorBroken) breakArmor(c, 'fragile'); }
function arenaUpdate(dt) {
  const c = custode; const d = Math.hypot(c.x, c.z + 62);
  const eligible = (grammar.has('custode', 'temperament.cautious') || c.foldStun) && !arena.snapped && c.st !== 'dead';
  if (eligible && d > 2.5 && c.st !== 'charge') { arena.loosenT += dt; if (arena.loosenT >= 0.4 && arena.window <= 0) { arena.window = 5; arena.windowPlan = c.foldStun ? 'ambiente' : 'controllo'; S.arenaProgress = true; toast('IL LEGAME SI ALLENTA'); hint(ST.HINTS.seal); sfx.play('tear'); Tele.log('tether_loosened', { plan: arena.windowPlan }); } }
  else arena.loosenT = 0;
  if (arena.window > 0) { arena.window -= dt; if (arena.window <= 0 && !S.victory && !arena.snapped) { hint(ST.HINTS.arena); toastSmall('Il legame si richiude'); } }
  const open = arena.snapped || arena.window > 0; const len = Math.hypot(c.x, c.z + 62);
  tether.visible = !arena.snapped && c.st !== 'dead'; tether.position.set(c.x / 2, 1.3, (c.z - 62) / 2); tether.scale.set(open ? 0.4 : 1, Math.max(0.1, len), open ? 0.4 : 1);
  tether.lookAt(c.x, 1.3, c.z); tether.rotateX(Math.PI / 2); tether.material.color.setHex(open ? 0xd8a080 : 0x8a1a10);
  seal.userData.disc.material.uniforms.uGlow.value.setRGB(open ? 0.5 + 0.3 * Math.sin(now * 6) : 0, open ? 0.3 : 0, open ? 0.1 : 0);
  if (open && !S.victory && Math.hypot(P.x, P.z + 68.4) < 1.3) touchSeal();
}

// ---------- stanze, incontri, morte ----------
function roomAt(x, z) { for (const r of W.ROOMS) if (Math.abs(x - r.cx) <= r.w / 2 - 0.3 && Math.abs(z - r.cz) <= r.d / 2 - 0.5) return r; return null; }
function enterRoom(r) {
  if (S.room === r.id) return; const prev = S.room; S.room = r.id; P.spawn = { x: r.cx, z: r.cz + r.d / 2 - 1.2 }; $('room').textContent = r.title; toast(r.title.toUpperCase()); Tele.log('section_enter', { section: r.id, t: Math.round(S.time) });
  $('inkWrap').classList.toggle('safe', zoneSafe());
  if (r.id === 'intro') grammar.snapshot('intro', ['board'], () => ({}));
  if (r.id === 'charger' && !S.discovered.has('temperament.cautious') && charger.alive) { S.discovered.add('temperament.cautious'); S.encounter = 'charger'; ink.encounterEnd(); Tele.log('encounter_start', { id: 'charger' }); sfx.tension(true);
    say([['narr', 'Il Caricatore è VIGILE. Sempre vigile. Ma anche la vigilanza è solo una parola.'], ['narr', 'Sotto, scritta a matita: CAUTO.']]); hint(ST.HINTS.charger); journal('Hai trovato la parola CAUTO.'); }
  if (r.id === 'conduct' && !S.discovered.has('element.conductive')) { S.discovered.add('element.conductive'); grammar.snapshot('conduct', ['plate'], () => ({}));
    say([['narr', 'La piastra di rame dice ISOLANTE. Qualcuno ha cancellato male: si legge ancora CONDUTTIVO.']]); hint(ST.HINTS.press); journal('Hai trovato la parola CONDUTTIVO.'); }
  if (r.id === 'door' && prev !== 'door' && !S.doorRoute) { grammar.snapshot('door', ['relay', 'evplate'], () => ({ hasDoc: door.hasDoc, docPlaced: door.docPlaced })); say(ST.elaraDoor(mem).slice(0, 2)); hint(ST.HINTS.door); }
  if (r.id === 'arena' && S.encounter !== 'arena' && !S.victory) { S.encounter = 'arena'; ink.encounterEnd(); sfx.tension(true); say(ST.custodeLines(S.arenaDeaths, mem)); hint(ST.HINTS.arena); Tele.log('encounter_start', { id: 'arena' }); }
}
function endEncounter(id) { S.encounter = null; ink.encounterEnd(); sfx.tension(false); Tele.log('encounter_end', { id }); popInk('Inchiostro pieno'); }
function die() {
  P.st = 'dead'; P.t = 1.4; S.deaths++; mem.deaths++; sfx.play('death'); closePanel(); S.shake = 0.6; Tele.log('death', { room: S.room, deaths: S.deaths });
  traces.add(P.x, P.z, 1.6, 0, now); traces.add(P.x, P.z, 1.1, 3, now); S.tracePos.push([P.x, P.z]); inkWave(P.x, P.z, 4);
  for (let i = 0; i < 30; i++) particles.emit(P.x + rnd(-0.3, 0.3), rnd(0.2, 1.6), P.z + rnd(-0.3, 0.3), rnd(-1, 1), rnd(0, 2), rnd(-1, 1), rnd(0.8, 1.6), rnd(0.12, 0.25), 0.04, 0.03, 0.03, 5);
  const lt = W.makeLumi(); lt.scale.setScalar(0.45); lt.position.set(P.x, 0.25, P.z); scene.add(lt); lumiTraces.push(lt); // la traccia d'inchiostro dell'errore
  if (S.room === 'arena' && !S.arenaProgress) S.arenaDeaths++;
  setTimeout(respawn, FAST ? 150 : 1500);
}
function respawn() {
  P.hp = P.max; renderHP(); P.x = P.spawn.x; P.z = P.spawn.z; P.vx = P.vz = 0; P.st = 'idle'; P.inv = 1.2; P.mesh.visible = true; P.face = Math.PI;
  for (const e of [charger, custode]) if (e.alive && e.st !== 'dead' && ((S.room === 'charger' && e === charger) || (S.room === 'arena' && e === custode))) { grammar.resetPhrase(e.id); e.x = e.home.x; e.z = e.home.z; e.st = 'idle'; e.cd = 2; e.push = null; e.foldStun = false; }
  ink.encounterEnd(); arena.window = 0; arena.t = 0;
  if (S.room === 'arena') { say(ST.custodeLines(S.arenaDeaths, mem)); if (S.arenaDeaths >= 3 && !S.lumiShown) lumiVision(); }
  if (S.room === 'door' && door.defense) door.defense.t = Math.min(30, door.defense.t + 5);
}
function lumiVision() {
  S.lumiShown = true; const plan = ['rottura', 'controllo', 'ambiente'].find((p) => !S.attempted.has(p)) || 'rottura';
  lumi.on = true; lumi.mesh.visible = true; lumi.x = P.x; lumi.z = P.z - 1; Tele.log('lumi_vision', { plan });
  say([['lumi', 'Sono la macchia che resta quando sbagli. Ne hai lasciate tre. Guarda cosa ricordano.']], { done: () => {
    $('vision').classList.remove('hidden'); $('visionText').textContent = ST.LUMI_VISION[plan]; S.lock = true; S.visionT = 4; ghostStart(plan); } });
}
const ghost = { mesh: null, t: 0, plan: null };
function ghostStart(plan) { const g = W.makeCustode(); g.traverse((o) => { if (o.material) o.material = new THREE.MeshBasicMaterial({ color: 0x120c0a, transparent: true, opacity: 0.45 }); }); scene.add(g); ghost.mesh = g; ghost.t = 0; ghost.plan = plan; }
function ghostUpdate(dt) { if (!ghost.mesh) return; ghost.t += dt; const t = Math.min(1, ghost.t / 4), g = ghost.mesh;
  if (ghost.plan === 'rottura') { g.position.set(lerp(0, -4.0, Math.min(1, t * 1.6)), 0, lerp(-62, -61, t)); if (t > 0.62) g.userData.armor.visible = Math.sin(ghost.t * 30) > 0; }
  else if (ghost.plan === 'controllo') g.position.set(lerp(0, 3.5, t), 0, lerp(-61, -57.5, t));
  else g.position.set(lerp(0, 5, Math.max(0, t * 2 - 1)), 0, -66.6);
  if (ghost.t >= 4) { scene.remove(ghost.mesh); ghost.mesh = null; } }

// ---------- dialoghi ----------
const dlg = { active: false, lines: [], i: 0, t: 0, opt: {}, choiceI: 0, full: '', ch: 0 };
function say(lines, o = {}) { if (!lines.length) { if (o.done) o.done(); return; } dlg.lines = lines.slice(); dlg.i = 0; dlg.opt = o; dlg.active = true; dlg.choiceI = 0; showLine(); }
function showLine() {
  const [who, text] = dlg.lines[dlg.i]; $('dialog').classList.remove('hidden'); $('dWho').textContent = ST.WHO[who] || who; $('dText').textContent = ''; dlg.full = text; dlg.ch = 0; dlg.t = 0;
  $('dialog').dataset.who = who; sfx.play('voice', who === 'custode' ? 0.3 : who === 'lumi' ? 1.6 : 1); renderChoices(false);
}
function renderChoices(show) { let box = $('dChoices'); if (box) box.remove(); if (!show || !dlg.opt.choices) return; box = document.createElement('div'); box.id = 'dChoices';
  dlg.opt.choices.forEach(([lab], i) => { const b = document.createElement('button'); b.className = 'pbtn' + (i === dlg.choiceI ? ' sel' : ''); b.textContent = lab; b.onpointerdown = (e) => { e.stopPropagation(); pickChoice(i); }; box.appendChild(b); }); $('dialog').appendChild(box); }
function pickChoice(i) { const fn = dlg.opt.choices[i][1]; Tele.log('choice', { label: dlg.opt.choices[i][0] }); endDialog(); fn(); }
function dlgNext() {
  if (dlg.ch < dlg.full.length) { dlg.ch = dlg.full.length; $('dText').textContent = dlg.full; return; }
  if (dlg.i < dlg.lines.length - 1) { dlg.i++; showLine(); return; }
  if (dlg.opt.choices) { if (!$('dChoices')) { renderChoices(true); return; } pickChoice(dlg.choiceI); return; }
  endDialog();
}
function endDialog() { dlg.active = false; renderChoices(false); $('dialog').classList.add('hidden'); const d = dlg.opt.done; dlg.opt = {}; if (d) d(); }
function dlgUpdate(dt) {
  if (!dlg.active) return; dlg.t += dt; const speed = FAST ? 400 : 45; const n = Math.min(dlg.full.length, Math.floor(dlg.t * speed)); if (n > dlg.ch) { dlg.ch = n; $('dText').textContent = dlg.full.slice(0, n); }
  if ($('dChoices')) { if (input.pressed('left') || input.pressed('up')) { dlg.choiceI = 0; renderChoices(true); } if (input.pressed('right') || input.pressed('down')) { dlg.choiceI = dlg.opt.choices.length - 1; renderChoices(true); } if (input.pressed('confirm')) pickChoice(dlg.choiceI); return; }
  if (input.pressed('confirm') && (S.lock || dlg.opt.choices)) { dlgNext(); return; }
  if (dlg.ch >= dlg.full.length && dlg.opt.choices && dlg.i === dlg.lines.length - 1) { renderChoices(true); return; }
  const auto = FAST ? 0.3 : 2.4 + dlg.full.length * 0.04; if (dlg.ch >= dlg.full.length && dlg.t > auto + dlg.full.length / speed) dlgNext();
}
$('dialog').addEventListener('pointerdown', () => { if (!$('dChoices')) dlgNext(); });

// ---------- HUD ----------
function setBar(el, f) { f = Math.max(0, Math.min(1, f)); if (el._f === f) return; const fi = el.querySelector('.fill'), tr = el.querySelector('.trail'); const down = el._f !== undefined && f < el._f; el._f = f; fi.style.width = (f * 100) + '%'; tr.style.transition = down ? 'width .55s ease-in .35s' : 'none'; tr.style.width = (f * 100) + '%'; if (down) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); } }
function renderHP() { setBar($('phpBar'), P.hp / P.max); $('phpNum').textContent = Math.max(0, P.hp * 20) + ' / ' + P.max * 20; $('hp').innerHTML = ''; for (let i = 0; i < P.max; i++) { const d = document.createElement('i'); if (i >= P.hp) d.className = 'off'; $('hp').appendChild(d); } }
function renderPrepared() { const w = S.prepared || S.lastWord; $('prepared').classList.toggle('hidden', !w); if (w) { $('prepWord').textContent = EFFECTS[w].word; $('tQuickW').textContent = EFFECTS[w].word.slice(0, 7); $('prepared').firstChild.textContent = S.prepared ? 'preparata' : 'ultima'; } }
let persistHint = '', tempHintT = 0;
function hint(t) { persistHint = t; if (tempHintT <= 0) $('hint').textContent = t; }
function toastSmall(t) { $('hint').textContent = t; tempHintT = 2.6; }
let toastT = 0; function toast(t) { $('toast').textContent = t; $('toast').classList.add('on'); toastT = 2.2; }
function popInk(t) { const d = document.createElement('div'); d.textContent = t; d.className = 'inkpop'; document.body.appendChild(d); d.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-20px)' }], { duration: 900 }).onfinish = () => d.remove(); sfx.play('gain'); }
// ---------- tutorial interattivo (touch / controller / tastiera) ----------
const TUT = [
  { id: 'move', room: 'intro', pulse: '#stickBase', t: { touch: 'Trascina il pollice sinistro per muoverti', pad: 'Muoviti con lo stick sinistro', kb: 'Muoviti con W A S D' }, done: () => Math.hypot(P.x - tut.sx, P.z - tut.sz) > 1.5 },
  { id: 'look', room: 'intro', pulse: '#tInteract', t: { touch: 'Avvicinati alla tavola lacerata e tocca ◉ GUARDA', pad: 'Avvicinati alla tavola lacerata e premi A', kb: 'Avvicinati alla tavola lacerata e premi E' }, done: () => S.discovered.has('state.fragile') },
  { id: 'open', room: 'intro', pulse: '#tRewrite', t: { touch: 'Tocca ✎ RISCRIVI: le parole appaiono sopra il bersaglio più vicino (la tavola)', pad: 'Premi RB per RISCRIVERE: le parole appaiono sopra il bersaglio più vicino', kb: 'Premi Q per RISCRIVERE: le parole appaiono sopra il bersaglio più vicino' }, done: () => panel.open || grammar.has('board', 'state.fragile') },
  { id: 'pick', room: 'intro', pulse: '.bubble', t: { touch: 'Tocca FRAGILE una volta: vedi l’anteprima. Toccala di nuovo: la scrivi sulla tavola', pad: '◀ ▶ scegli la parola (vedi l’anteprima) · A la scrive · ▲▼ cambia bersaglio', kb: '◀ ▶ scegli la parola (vedi l’anteprima) · Invio la scrive · ▲▼ cambia bersaglio' }, done: () => grammar.has('board', 'state.fragile'), back: () => !panel.open ? 2 : -1 },
  { id: 'ink', room: 'intro', pulse: '#inkWrap', t: { all: 'La barra INCHIOSTRO in alto: il menu aperto e ogni parola la consumano. Qui sei in zona sicura, quindi è gratis' }, timer: 6 },
  { id: 'heavy', room: 'intro', pulse: '#tHeavy', t: { touch: 'Ora che è FRAGILE: colpo forte ⟰ e la tavola si rompe', pad: 'Ora che è FRAGILE: colpo forte con Y', kb: 'Ora che è FRAGILE: colpo forte con K' }, done: () => board.broken },
  { id: 'quick', room: 'charger', pulse: '#tQuick', t: { touch: 'Riscrittura rapida ↻: riscrive l’ultima parola sul bersaglio più vicino, senza aprire il menu. Provala sul Caricatore', pad: 'Riscrittura rapida con LB: riscrive l’ultima parola sul bersaglio più vicino. Provala sul Caricatore', kb: 'Riscrittura rapida con R: riscrive l’ultima parola sul bersaglio più vicino. Provala sul Caricatore' }, done: () => tut.quick || !charger.alive || charger.armorBroken },
  { id: 'inkfight', room: 'charger', pulse: '#inkWrap', t: { all: 'Fuori dalle zone sicure l’inchiostro costa. Per ricaricarlo: colpisci i nemici e schiva all’ultimo' }, timer: 6 },
];
const tut = { i: 0, t: 0, sx: 0, sz: 0, quick: false, on: false };
function tutUpdate(dt) {
  const el = $('tut'); document.querySelectorAll('.tutPulse').forEach((x) => x.classList.remove('tutPulse'));
  if (!tut.on || tut.i >= TUT.length || S.phase !== 'play' || S.done) { el.classList.add('hidden'); return; }
  const st = TUT[tut.i]; if (st.room && S.room !== st.room) { el.classList.add('hidden'); return; }
  if (dlg.active && dlg.lock) { el.classList.add('hidden'); return; }
  tut.t += dt; const mode = input.mode === 'pad' ? 'pad' : input.mode === 'kb' && !isTouch ? 'kb' : (input.mode === 'kb' ? 'kb' : 'touch');
  const txt = st.t.all || st.t[mode]; if ($('tutText').textContent !== txt) $('tutText').textContent = txt; $('tutStep').textContent = 'Tutorial ' + (tut.i + 1) + '/' + TUT.length;
  el.classList.remove('hidden'); const pe = document.querySelector(st.pulse); if (pe) pe.classList.add('tutPulse');
  const fin = (st.done && st.done()) || (st.timer && tut.t > st.timer);
  if (!fin && st.back) { const b = st.back(); if (b >= 0) { tut.i = b; tut.t = 0; return; } }
  if (fin) { tut.i++; tut.t = 0; sfx.play('gain'); Tele.log('tutorial_step', { step: st.id }); if (tut.i === TUT.length) { mem.tutDone = true; ST.saveMem(mem); } }
}
// ---------- vita e danni leggibili ----------
const _pv = new THREE.Vector3();
function toScreen(x, y, z) { _pv.set(x, y, z).project(camera); return { x: (_pv.x * 0.5 + 0.5) * innerWidth, y: (-_pv.y * 0.5 + 0.5) * innerHeight, ok: _pv.z < 1 && Math.abs(_pv.x) < 1.1 && Math.abs(_pv.y) < 1.1 }; }
function dmgAt(x, y, z, text, cls = '') { const p = toScreen(x, y, z); if (!p.ok) return; const d = document.createElement('div'); d.className = 'dn ' + cls; d.textContent = text; d.style.left = (p.x + rnd(-20, 20)) + 'px'; d.style.top = p.y + 'px'; $('dmg').appendChild(d); setTimeout(() => d.remove(), 950); }
const CORE = { charger: 2, custode: 4 };
function enemyHP(e) { const core = CORE[e.id]; const coreLeft = e.alive && e.st !== 'dead' && !(e.boss && arena.snapped) ? core : 0; return { v: Math.max(0, e.armorHP) * (e.armorBroken ? 0 : 1) + coreLeft, max: e.armorMax + core }; }
const ebarEl = {};
function healthUpdate(dt) {
  for (const e of [charger, custode]) {
    const h = enemyHP(e); if (e.lastHP === undefined) e.lastHP = h.v;
    if (h.v < e.lastHP) { const d = (e.lastHP - h.v) * 10; dmgAt(e.x, (e.mesh.userData.height || 1.6) + 0.4, e.z, '-' + d, d >= 30 ? 'big' : ''); e.hitT = 0.16;
      if (e.st !== 'charge' && e.alive) { const dx = e.x - P.x, dz = e.z - P.z, l = Math.hypot(dx, dz) || 1; e.vx += dx / l * 5; e.vz += dz / l * 5; } }
    e.lastHP = h.v;
    if (e.hitT > 0) { e.hitT -= dt; setU(e.mats, 'uHit', Math.max(0, e.hitT / 0.16) * 0.85); if (e.hitT <= 0) setU(e.mats, 'uHit', 0); }
    const inRoom = S.room === (e.boss ? 'arena' : 'charger') && S.phase === 'play' && !S.done;
    if (e.boss) { const show = inRoom && !S.victory; $('bossBar').classList.toggle('hidden', !show); if (show) setBar($('bossBar').querySelector('.hbar'), h.v / h.max); continue; }
    let el = ebarEl[e.id]; if (!el) { el = ebarEl[e.id] = document.createElement('div'); el.className = 'ebar'; el.innerHTML = '<div class="lbl">' + grammar.get(e.id).def.name + '</div><div class="hbar"><div class="trail"></div><div class="fill"></div></div>'; $('ebars').appendChild(el); }
    const p = toScreen(e.x, (e.mesh.userData.height || 1.6) + 0.9, e.z); const vis = inRoom && e.alive && e.st !== 'dead' && p.ok;
    el.style.display = vis ? 'block' : 'none'; if (vis) { el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; setBar(el.querySelector('.hbar'), h.v / h.max); }
  }
}
function goalText() {
  switch (S.room) {
    case 'intro': return !S.discovered.has('state.fragile') ? 'Obiettivo: guarda la tavola lacerata' : !board.broken ? (grammar.has('board', 'state.fragile') ? 'Obiettivo: rompi la tavola con un colpo forte' : 'Obiettivo: scrivi FRAGILE sulla tavola (✎)') : 'Obiettivo: prosegui verso nord';
    case 'charger': return charger.alive ? (charger.armorBroken ? 'Obiettivo: colpisci il nucleo rosso' : 'Obiettivo: rompi la corazza del Caricatore (FRAGILE + pilastro)') : 'Obiettivo: prosegui verso nord';
    case 'conduct': return gates.r2.open ? 'Obiettivo: prosegui verso nord' : 'Obiettivo: fai passare l\'impulso della pressa fino al cancello (CONDUTTIVO sulla piastra)';
    case 'door': return S.doorRoute ? 'Obiettivo: attraversa la porta' : door.defense ? 'Obiettivo: difendi Elara dalle macchie' : 'Obiettivo: apri la porta che giudica (3 modi: forza il relè · porta la prova · parla con Elara)';
    case 'arena': return S.victory ? '' : (arena.snapped || arena.window > 0) ? 'Obiettivo: tocca il sigillo rosso a nord, ora!' : 'Obiettivo: spezza il legame tra il Custode e il nucleo, poi tocca il sigillo';
    case 'end': return 'La storia ricorda come l\'hai riscritta';
  } return '';
}
function hudUpdate(dt) {
  tutUpdate(dt); healthUpdate(dt);
  if (frame % 10 === 0) { const g = goalText(); if ($('goal').textContent !== g) { $('goal').textContent = g; $('goal').classList.remove('flash'); void $('goal').offsetWidth; $('goal').classList.add('flash'); } }
  $('inkFill').style.width = ink.v + '%'; $('inkNum').textContent = Math.round(ink.v); $('inkWrap').classList.toggle('low', ink.v < 25 && !zoneSafe());
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('on'); }
  const it = S.phase === 'play' && !panel.open && !S.lock ? nearestInteract() : null; $('tInteract').classList.toggle('hidden', !it); if (it) $('tInteractL').textContent = it.label;
  $('touch').classList.toggle('hidden', !((isTouch || input.mode === 'touch') && S.phase === 'play' && !S.done));
  if (tempHintT > 0) { tempHintT -= dt; if (tempHintT <= 0) $('hint').textContent = persistHint; }
  else if (it && input.mode !== 'touch') $('hint').textContent = (input.mode === 'pad' ? 'A' : 'E') + ' · ' + it.label; else $('hint').textContent = persistHint;
}

// ---------- intro e fine ----------
let introPlaying = false;
function beginWithIntro(force) {
  if (S.phase !== 'title' || introPlaying) return; sfx.start(); sfx.setVol(opts.vol); sfx.setMusic(opts.mus);
  if (mem.runs > 0 && !force) { startGame(); return; }
  introPlaying = true; $('title').classList.add('hidden'); Tele.log('intro_start'); playFilm();
}
const film = new Film(paper); film.resize(innerWidth, innerHeight); addEventListener('resize', () => film.resize(innerWidth, innerHeight));
let voiceOn = localStorage.getItem('pal_voice') !== '0', itVoice = null;
function pickVoice() { if (!window.speechSynthesis) return; const vs = speechSynthesis.getVoices(); itVoice = vs.find((v) => /it[-_]IT/i.test(v.lang) && /Alice|Federica|Luca|Google/i.test(v.name)) || vs.find((v) => /^it/i.test(v.lang)) || null; }
if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text) { if (!voiceOn || !window.speechSynthesis) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/’/g, "'")); u.lang = 'it-IT'; if (itVoice) u.voice = itVoice; u.rate = 0.95; u.pitch = 0.95; u.volume = opts.vol; speechSynthesis.speak(u); } catch (e) {} }
function playFilm() {
  const el = $('film'); el.classList.remove('hidden'); $('fTitle').classList.remove('on'); $('fVoice').textContent = voiceOn ? '🔊 Voce' : '🔇 Voce';
  if (!window.speechSynthesis) $('fVoice').classList.add('hidden');
  film.start({ sub: (t) => { $('fSub').textContent = t; speak(t); if (/Riscrivi la fine/.test(t)) $('fTitle').classList.add('on'); }, cut: () => { const f = $('fFade'); f.style.transition = 'none'; f.style.opacity = 1; void f.offsetWidth; f.style.transition = 'opacity .7s'; f.style.opacity = 0; }, progress: (x) => { $('fProg').firstChild.style.width = (x * 100).toFixed(1) + '%'; } });
  window.__film = { seek: (x) => { film.t = x; }, len: () => FILM_LEN, skip: endFilm, t: () => film.t, shot: () => film.lastShot };
}
let filmEnding = false;
function endFilm() { if (!introPlaying || filmEnding) return; filmEnding = true; film.done = true; if (window.speechSynthesis) speechSynthesis.cancel(); $('fFade').style.opacity = 1;
  setTimeout(() => { $('film').classList.add('hidden'); $('fSub').textContent = ''; introPlaying = false; filmEnding = false; Tele.log('intro_end', { t: Math.round(film.t) }); startGame(); }, 700); }
function startGame() {
  if (S.phase !== 'title') return;
  $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); sfx.start(); sfx.setVol(opts.vol); sfx.setMusic(opts.mus); S.phase = 'play'; S.lock = true; renderHP();
  if (isTouch) input.mode = 'touch'; Tele.log('session_start', { runs: mem.runs });
  for (const [x, z] of (mem.traces || [])) traces.add(x, z, rnd(0.8, 1.6), 3, -100); // le cancellature delle versioni precedenti
  enterRoom(W.ROOMS[0]); tut.on = !mem.tutDone; tut.i = 0; tut.t = 0; tut.sx = P.x; tut.sz = P.z;
  say(ST.introLines(mem), { done: () => { S.lock = false; inkDrop(); } });
}
function controlsCard() {
  const d = document.createElement('div'); d.id = 'controls';
  d.innerHTML = input.mode === 'pad' ? '<b>Stick</b> muovi · <b>A</b> guarda/conferma · <b>X</b> colpo · <b>Y</b> colpo forte · <b>B</b> schiva<br><b>RB</b> riscrivi · <b>LB</b> riapplica l\'ultima parola · <b>Select</b> ripristina frase'
    : input.mode === 'touch' ? '<b>Trascina a sinistra</b> per muoverti · <b>◉</b> guarda quando appare<br><b>✎</b> riscrivi · tocca una parola per vederla, toccala di nuovo per scriverla' : '<b>WASD</b> muovi · <b>E</b> guarda · <b>J</b>/clic colpo · <b>K</b>/clic destro forte · <b>Spazio</b> schiva<br><b>Q</b> riscrivi · <b>R</b> riapplica · <b>T</b> ripristina · <b>Y</b> ricomponi';
  document.body.appendChild(d); setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 900); }, FAST ? 300 : 6500);
}
function inkDrop() { if (!tut.on) controlsCard();
  for (let i = 0; i < 6; i++) setTimeout(() => particles.emit(0.3 + rnd(-0.05, 0.05), 4, -4.75, 0, -2, 0, 1.2, 0.3, 0.03, 0.02, 0.02, 9), i * 90);
  setTimeout(() => { sfx.play('tear'); traces.add(0.3, -4.3, 1, 0, now); S.shake = 0.3; if (S.room === 'intro' && !S.discovered.has('state.fragile')) hint(ST.HINTS.look); }, 900);
}
function goEnd() {
  const r = W.ROOMS[5]; S.lock = true; $('fade').style.opacity = 1;
  setTimeout(() => { P.x = 0; P.z = r.cz + 1.5; P.face = Math.PI; camera.position.set(0, 14, P.z + 11); $('fade').style.opacity = 0; enterRoom(r); lumi.on = true; lumi.mesh.visible = true; lumi.x = 2; lumi.z = -82;
    const rem = W.makeCustode(); rem.scale.setScalar(0.6); rem.position.set(2.8, 0, -82.8); rem.rotation.y = -0.5; rem.userData.armor.visible = !custode.armorBroken; scene.add(rem);
    if (S.doorRoute === 'forced') { elara2.userData.st.seam = true; elara2.userData.redraw(); }
    say(ST.consequence(S, mem), { done: finish }); }, FAST ? 50 : 700);
}
function finish() {
  S.done = true; S.lock = false; Tele.log('slice_complete', { t: Math.round(S.time), door_route: S.doorRoute, plan: S.plan, deaths: S.deaths }); Tele.flush();
  mem.runs++; mem.routes.push(S.doorRoute); mem.plans.push(S.plan); mem.traces = S.tracePos.slice(-60); ST.saveMem(mem);
  $('jList').innerHTML = S.journal.map((j) => `<p>${j.text}</p>`).join('') + `<p><b>Strada della porta:</b> ${ST.ROUTE_TEXT[S.doorRoute] || '—'}<br><b>Piano contro il Custode:</b> ${ST.PLAN_TEXT[S.plan] || '—'}<br><b>Macchie lasciate:</b> ${S.deaths}</p><p class="small">Rigioca: le pagine ricorderanno questa versione.</p>`;
  $('journal').classList.remove('hidden'); $('journal').querySelector('h2').textContent = 'Fine del frammento'; $('journal').querySelector('[data-close]').textContent = 'Riscrivi di nuovo';
}

// ---------- menu ----------
let paused = false;
function togglePause() { if (S.phase !== 'play') return; paused = !paused; $('pause').classList.toggle('hidden', !paused); if (paused) closePanel(); Tele.log(paused ? 'pause' : 'resume'); }
function applyOpts() { document.body.classList.toggle('contrast', !!opts.contrast); document.body.classList.toggle('big', !!opts.big); post.comp.uniforms.reduce.value = opts.reduce ? 1 : 0; INK_UNIFORMS.uContrast.value = opts.contrast ? 1 : 0; }
function bindUI() {
  $('bStart').onclick = () => beginWithIntro(false); $('fSkip').onclick = endFilm; $('fVoice').onclick = () => { voiceOn = !voiceOn; localStorage.setItem('pal_voice', voiceOn ? '1' : '0'); $('fVoice').textContent = voiceOn ? '🔊 Voce' : '🔇 Voce'; if (!voiceOn && window.speechSynthesis) speechSynthesis.cancel(); else speak($('fSub').textContent); }; $('bReplayIntro').onclick = () => beginWithIntro(true); if (!mem.runs) $('bReplayIntro').classList.add('hidden'); $('tMem').textContent = mem.runs ? `Versioni già riscritte: ${mem.runs}. Il libro se ne ricorda.` : '';
  input.bindTouch($('stickZone'), $('stickKnob'), $('stickBase'), { attack: $('tAttack'), heavy: $('tHeavy'), dodge: $('tDodge'), rewrite: $('tRewrite'), quick: $('tQuick'), interact: $('tInteract'), reset: $('tReset') });
  $('bJournal').onclick = () => { $('jList').innerHTML = S.journal.map((j) => `<p>${j.text}</p>`).join('') || '<p>Ancora niente.</p>'; $('journal').classList.toggle('hidden'); };
  document.querySelectorAll('[data-close]').forEach((b) => b.onclick = () => { b.closest('.panel').classList.add('hidden'); if (S.done) location.reload(); });
  $('bPause').onclick = togglePause; $('pResume').onclick = togglePause; $('pRecompose').onclick = () => { togglePause(); recompose(); };
  $('pRestart').onclick = () => location.reload();
  $('pTele').onclick = () => { const blob = new Blob([JSON.stringify(Tele.all(), null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'palimpsest-telemetria.json'; a.click(); };
  const bind = (id, k, f) => { const el = $(id); if (el.type === 'checkbox') { el.checked = !!opts[k]; el.onchange = () => { opts[k] = el.checked; saveOpts(); if (f) f(); }; } else { el.value = opts[k]; el.oninput = el.onchange = () => { opts[k] = el.type === 'range' ? +el.value : el.value; saveOpts(); if (f) f(); }; } };
  bind('oVol', 'vol', () => sfx.setVol(opts.vol)); bind('oMus', 'mus', () => sfx.setMusic(opts.mus)); bind('oPauseFull', 'pauseFull'); bind('oReduce', 'reduce', applyOpts); bind('oContrast', 'contrast', applyOpts); bind('oBig', 'big', applyOpts); bind('oPanel', 'panel'); bind('oEasy', 'easy'); bind('oQ', 'q', () => location.reload());
  applyOpts();
}

// ---------- loop ----------
let last = performance.now(), acc = 0, frame = 0; const STEP = 1 / 60; let fpsAcc = 0, fpsN = 0, lowStreak = 0, slowT = 0;
const camPos = new THREE.Vector3(0, 14, 14), camLook = new THREE.Vector3(0, 0.8, 2), tmpV = new THREE.Vector3();
function slowmo(t) { slowT = t; }
function step(sdt) {
  S.time += sdt; now += sdt; grammar.tick(sdt);
  playerUpdate(sdt); aiUpdate(charger, sdt); aiUpdate(custode, sdt); devicesUpdate(sdt); if (S.room === 'arena') arenaUpdate(sdt); defenseUpdate(sdt);
  for (const e of [charger, custode]) { if (!e.alive || e.st === 'dead' || e.st === 'charge' || P.st === 'dodge') continue; const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz), rr = P.r + e.cfg.r; if (d < rr && d > 1e-4) { const k = (rr - d) / d; P.x += dx * k * 0.7; P.z += dz * k * 0.7; e.x -= dx * k * 0.3; e.z -= dz * k * 0.3; collide(P, P.r, false); } }
  const r = roomAt(P.x, P.z); if (r && S.phase === 'play' && !S.lock && r.id !== 'end') enterRoom(r);
}
function defenseUpdate(dt) {
  const D = door.defense; if (!D || S.doorRoute) return; D.t -= dt; D.spawn -= dt;
  if (D.spawn <= 0) { D.spawn = 2.2; const pts = [[-7, -39], [7, -39], [-7, -48.5], [7, -46]]; const [x, z] = pts[Math.floor(Math.random() * 4)]; const m = W.makeMite(); scene.add(m); m.position.set(x, 0.3, z); door.mites.push({ mesh: m, x, z, alive: true, r: 0.3, st: 'idle' }); sfx.play('voice', 0.2); }
  for (const m of door.mites) { if (!m.alive) continue; const dx = 0 - m.x, dz = -49 - m.z, l = Math.hypot(dx, dz); m.x += dx / l * 1.6 * dt; m.z += dz / l * 1.6 * dt; m.mesh.position.set(m.x, 0.3 + Math.abs(Math.sin(now * 8 + m.x)) * 0.2, m.z);
    if (l < 1) { m.alive = false; scene.remove(m.mesh); D.t = Math.min(30, D.t + 3); traces.add(m.x, m.z, 0.9, 0, now); toastSmall('Una macchia raggiunge Elara: +3 s'); elara.userData.st.eyes = 210; elara.userData.redraw(); }
    else if (Math.hypot(P.x - m.x, P.z - m.z) < 0.7) damagePlayer(1, m, 'mite' + m.x.toFixed(2)); }
  $('room').textContent = 'Difendi Elara · ' + Math.ceil(Math.max(0, D.t));
  if (D.t <= 0) { for (const m of door.mites) if (m.alive) { m.alive = false; scene.remove(m.mesh); particles.burst(m.x, 0.3, m.z, 10, 3); } door.defense = null; endEncounter('defense'); $('room').textContent = W.ROOMS[3].title;
    elara.userData.st.verdict = ''; elara.userData.st.mouth = 12; elara.userData.st.eyes = 190; elara.userData.redraw(); setRoute('trust'); }
}
const cBlue = new THREE.Color(), cHot = new THREE.Color(0.8, 0.2, 0.05), cDim = new THREE.Color(0.1, 0.02, 0), cEcho = new THREE.Color(0.3, 0.22, 0.12), vH = new THREE.Vector2();
function visualUpdate(dt, rdt) {
  INK_UNIFORMS.uTime.value += rdt;
  const u = P.mesh.userData, sp = Math.hypot(P.vx, P.vz); P.mesh.position.set(P.x, 0, P.z); P.mesh.rotation.y = P.face;
  u.body.rotation.x = lerp(u.body.rotation.x, sp * 0.03 + (P.st === 'dodge' ? 0.5 : 0), 0.2); u.body.position.y = Math.abs(Math.sin(now * 11)) * 0.05 * Math.min(1, sp / 4);
  u.cloak.scale.set(1 + Math.sin(now * 9) * 0.03 * sp / 5, 1, 1 + sp * 0.03); const sq = P.st === 'heavy' && P.t > P.hitAt ? 0.9 : 1; u.body.scale.set(2 - sq, sq, 2 - sq);
  if (P.st === 'attack') u.quillPivot.rotation.y = lerp(1.6, -1.6, clamp(1 - (P.t - 0.05) / 0.27, 0, 1)); else if (P.st === 'heavy') { u.quillPivot.rotation.x = P.t > P.hitAt ? -1.2 : 0.6; u.quillPivot.rotation.y = 0; } else { u.quillPivot.rotation.y = lerp(u.quillPivot.rotation.y, 0.3, 0.2); u.quillPivot.rotation.x = lerp(u.quillPivot.rotation.x, 0, 0.2); }
  if (!P.mats) P.mats = matsOf(P.mesh); setU(P.mats, 'DissolveAmount', P.st === 'dead' ? clamp(1.05 - P.t / 1.4 * 1.05, 0, 1.05) : 0);
  const wantOl = P.st !== 'dead'; if (P.olOn !== wantOl) { P.olOn = wantOl; setOutlines(P.mesh, wantOl); }
  if (P.st === 'dead') P.mesh.visible = P.t > -0.1; else P.mesh.visible = !(P.inv > 0 && P.st !== 'dodge' && Math.sin(now * 40) < -0.3);
  if (P.st === 'dodge' && frame % 2 === 0) particles.emit(P.x, 0.5, P.z, 0, 0.5, 0, 0.4, 0.3, 0.06, 0.04, 0.04, 0);
  if (sp > 3 && frame % 9 === 0) traces.add(P.x + rnd(-0.1, 0.1), P.z, 0.12, 1, now);
  pShadow.position.set(P.x, 0.015, P.z); trail.material.opacity *= 0.82;
  for (const e of [charger, custode]) { const m = e.mesh; m.position.set(e.x, 0, e.z); m.rotation.y = lerpAng(m.rotation.y, e.face, 0.2); shadows[e.id].position.set(e.x, 0.015, e.z); const b = m.userData.body;
    if (e.st === 'dead') { if (!e.olOff) { e.olOff = true; setOutlines(m, false); } e.dying = (e.dying || 0) + dt; setU(e.mats, 'DissolveAmount', Math.min(1.05, e.dying * 0.7)); if (frame % 3 === 0 && e.dying < 1.5) particles.emit(e.x + rnd(-0.6, 0.6), rnd(0.3, 2), e.z + rnd(-0.6, 0.6), 0, rnd(0.5, 2), 0, 1.2, 0.2, 0.05, 0.03, 0.03, -1); if (e.dying > 1.6) { m.visible = false; shadows[e.id].visible = false; } continue; }
    const caut = grammar.has(e.id, 'temperament.cautious'), frag = grammar.has(e.id, 'state.fragile'), cond = grammar.has(e.id, 'element.conductive'); const pvOn = panel.open && panel.target === e;
    b.rotation.x = lerp(b.rotation.x, e.st === 'windup' ? -0.2 : e.st === 'charge' ? 0.25 : caut ? -0.15 : 0, 0.15); b.scale.y = e.st === 'windup' ? 0.92 + Math.sin(now * 50) * 0.02 : lerp(b.scale.y, 1, 0.2);
    if (e.boss) { const a1 = e.comp.userData['arm1'], a2 = e.comp.userData['arm-1']; a1.rotation.x = lerp(a1.rotation.x, e.st === 'swipeWU' ? -1.6 : e.st === 'swipe' ? 1.2 : Math.sin(now * 2) * 0.1, 0.3); a2.rotation.x = lerp(a2.rotation.x, e.st === 'swipe' ? 0.6 : Math.sin(now * 2 + 1) * 0.1, 0.3); m.userData.eye.material.color.setHex(e.st === 'windup' || e.st === 'swipeWU' ? 0xff3010 : 0x8a1a10); }
    if (!pvOn) { setU(e.compMats, 'uCrack', frag ? 0.75 : clamp(1 - e.armorHP / e.armorMax, 0, 0.8)); setU(e.compMats, 'uGlow', cond ? cBlue.setRGB(0.05, 0.2 + 0.1 * Math.sin(now * 10), 0.35) : BLACK); }
    setU(e.mats, 'ColorShift', caut ? 0.35 : 0);
    setU(matsOf(m.userData.core), 'uGlow', e.exposed > 0 || e.armorBroken ? cHot : cDim); m.userData.core.rotation.y += dt * 2;
    if (frag && frame % 14 === 0) particles.emit(e.x + rnd(-0.5, 0.5), 1.2, e.z + rnd(-0.5, 0.5), 0, 0, 0, 1.5, 0.15, 0.04, 0.03, 0.03, 6);
  }
  // eco di riscrittura: 0–0,12 s increspatura, 0,12–0,35 s linea che ridisegna il componente
  for (const e of Object.values(ENT)) { if (e.echo == null) continue; e.echo += dt; const t = e.echo; const bb = e.mesh.userData.height || 1.6;
    if (t < 0.12) { const s = 1 + Math.sin(t / 0.12 * Math.PI) * 0.06; e.mesh.scale.set(s, 1 / s, s); }
    else if (t < 0.35) { e.mesh.scale.set(1, 1, 1); setU(e.mats, 'uH', vH.set(0, bb)); setU(e.mats, 'uRedraw', (t - 0.12) / 0.23); setU(e.mats, 'uGlow', cEcho); }
    else { e.mesh.scale.set(1, 1, 1); setU(e.mats, 'uRedraw', -1); setU(e.mats, 'uGlow', BLACK); e.echo = null; } }
  if (!(panel.open && panel.target === board)) setU(board.compMats, 'uCrack', grammar.has('board', 'state.fragile') ? 0.85 : 0.1);
  if (!(panel.open && panel.target === relay)) setU(relay.compMats, 'uCrack', grammar.has('relay', 'state.fragile') ? 0.85 : 0);
  for (const pl of [plate, evplate, bridge]) { const c = grammar.has(pl.id, 'element.conductive'); if (!(panel.open && panel.target === pl) && pl.echo == null) setU(pl.mats, 'uGlow', c ? cBlue.setRGB(0.05, 0.22 + 0.08 * Math.sin(now * 8), 0.4) : BLACK); setU(pl.mats, 'ColorShift', c ? 0.5 : 0); }
  for (const g of Object.values(gates)) if (g.mesh && g.open && g.mesh.position.y > -2) g.mesh.position.y -= dt * 2;
  if (door.open != null && door.open < 1) { door.open = Math.min(1, door.open + dt * 0.6); elara.rotation.y = door.open * (S.doorRoute === 'forced' ? 1.5 : 1.2); elara.position.x = -door.open * 1.3; }
  if (frame % 240 === 0 && S.room === 'door') { const st = elara.userData.st, e0 = st.eyes; st.eyes = 200; elara.userData.redraw(); setTimeout(() => { st.eyes = e0; elara.userData.redraw(); }, 140); }
  elara.userData.page.position.y = 2 + Math.sin(now * 1.3) * 0.04; elara2.userData.page.rotation.y = Math.sin(now * 0.8) * 0.1;
  if (lumi.on) { lumi.x = lerp(lumi.x, P.x + 1.2, 0.03); lumi.z = lerp(lumi.z, P.z + 0.8, 0.03); lumi.mesh.position.set(lumi.x, 1.2 + Math.sin(now * 2) * 0.15, lumi.z); if (frame % 6 === 0) particles.emit(lumi.x, 1.1, lumi.z, rnd(-0.2, 0.2), -0.3, rnd(-0.2, 0.2), 1, 0.12, 0.05, 0.03, 0.04, 3); }
  for (const l of lumiTraces) l.position.y = 0.25 + Math.sin(now * 1.5 + l.position.x) * 0.06;
  for (let i = waves.length - 1; i >= 0; i--) { const w = waves[i]; w.t += rdt; const k = w.t / 0.55; w.m.scale.setScalar(0.3 + k * w.maxR); w.m.material.opacity = 0.85 * (1 - k); if (k >= 1) { scene.remove(w.m); w.m.geometry.dispose(); w.m.material.dispose(); waves.splice(i, 1); } }
  for (let i = warnRings.length - 1; i >= 0; i--) { const w = warnRings[i]; w.life -= dt; w.m.material.opacity = 0.4 + 0.5 * Math.abs(Math.sin(w.life * 20)); w.m.scale.setScalar(1 + (1 - w.life / w.max) * 0.1); if (w.life <= 0) { scene.remove(w.m); w.m.geometry.dispose(); warnRings.splice(i, 1); if (w.onEnd) w.onEnd(); } }
  decor.quill.position.y = 4.6 + Math.sin(now * 0.9) * 0.15; decor.quill.rotation.z = 0.12 + Math.sin(now * 0.6) * 0.04;
  for (const p of world.scraps.children) p.rotation.z = Math.sin(now * 1.2 + p.userData.sw) * 0.08;
  if (frame % 20 === 0) particles.emit(P.x + rnd(-8, 8), rnd(1, 4), P.z + rnd(-8, 4), rnd(-0.1, 0.1), 0.05, rnd(-0.1, 0.1), 4, 0.06, 0.95, 0.85, 0.6, 0); // pulviscolo di luce
  ghostUpdate(dt); particles.update(dt);
  INK_UNIFORMS.uLamp.value.set(lerp(INK_UNIFORMS.uLamp.value.x, P.x, 0.08), 0, lerp(INK_UNIFORMS.uLamp.value.z, S.room === 'arena' ? lerp(P.z, -62, 0.4) : P.z - 1, 0.08)); INK_UNIFORMS.uLampR.value = S.room === 'arena' ? 13 : 11;
  // camera semi-isometrica stabile
  const focus = panel.open ? 1 : 0; post.comp.uniforms.focus.value = lerp(post.comp.uniforms.focus.value, focus, 0.12); post.comp.uniforms.sbiadito.value = lerp(post.comp.uniforms.sbiadito.value, ink.faded ? 1 : 0, 0.1);
  const portrait = innerWidth < innerHeight; const far = S.room === 'arena' ? 1.25 : 1.08; const dz = ((portrait ? 13 : 11.5) - focus * 2) * far, dy = ((portrait ? 17.5 : 15) - focus * 2.4) * far;
  let tx = P.x * 0.85, tz = P.z - 0.6; if (S.room === 'end') { tx = 0; tz = -80.5; } if (S.room === 'arena') { tx = P.x * 0.6; tz = lerp(P.z, -62, 0.3); }
  camLook.lerp(tmpV.set(tx, 0.8, tz), 1 - Math.pow(0.004, rdt)); camPos.set(camLook.x, camLook.y + dy, camLook.z + dz);
  camera.position.lerp(camPos, 1 - Math.pow(0.002, rdt)); const sh = opts.reduce ? 0 : S.shake * S.shake * 0.3; camera.position.x += rnd(-sh, sh); camera.position.y += rnd(-sh, sh); camera.lookAt(camLook);
  S.shake = Math.max(0, S.shake - rdt * 2.2); S.flash = Math.max(0, S.flash - rdt * 2); post.comp.uniforms.flash.value = opts.reduce ? 0 : S.flash * 0.5;
}
function loop() {
  requestAnimationFrame(loop); const t = performance.now(); const rawDt = Math.min(0.25, (t - last) / 1000); const rdt = Math.min(0.1, rawDt); last = t; frame++;
  try {
    if (introPlaying) { input.poll(); if (input.pressed('pause') || input.pressed('back')) endFilm(); film.update(rdt); if (film.done) endFilm(); renderer.info.reset(); post.render(film.scene, film.camera); return; }
    input.poll();
    if (input.pressed('pause') && S.phase === 'play' && !panel.open) togglePause();
    if (S.phase === 'play' && !paused) {
      if (S.visionT > 0) { S.visionT -= rdt; if (S.visionT <= 0) { $('vision').classList.add('hidden'); S.lock = false; } }
      let scale = panel.open ? (opts.pauseFull ? 0 : INK.worldScale) : 1; if (S.hitstop > 0) { S.hitstop -= rdt; scale *= 0.08; } if (slowT > 0) { slowT -= rdt; scale *= 0.4; }
      playerActions();
      acc += rdt * scale; let n = 0; while (acc >= STEP && n < 6) { step(STEP); acc -= STEP; n++; } if (n === 6) acc = 0;
      panelUpdate(rawDt); dlgUpdate(rdt); hudUpdate(rdt); visualUpdate(rdt * scale, rdt);
    } else if (S.phase === 'title') { INK_UNIFORMS.uTime.value += rdt; camera.position.set(Math.sin(t / 4000) * 2.5, 7.5, 6.5); camera.lookAt(0, 0.8, -3); particles.update(rdt); if (frame % 8 === 0) particles.emit(rnd(-5, 5), 3.5, rnd(-5, 2), 0, -0.4, 0, 3, 0.07, 0.95, 0.85, 0.6, 0); }
  } catch (err) { console.error(err); }
  renderer.info.reset(); post.render(scene, camera);
  fpsAcc += rdt; fpsN++; if (fpsAcc > 2) { const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; window.__fps = fps;
    if (opts.q === 'auto' && S.phase === 'play') { if (fps < 50) { lowStreak++; if (lowStreak >= 2 && pr > 0.75) { pr = Math.max(0.75, pr - 0.15); resize(); lowStreak = 0; Tele.log('quality_drop', { pr }); } else if (lowStreak >= 3 && post.enabled && fps < 40) { post.enabled = false; lowStreak = 0; Tele.log('quality_drop', { post: false }); } } else lowStreak = 0; } }
}

// ---------- avvio + agganci di test ----------
resize(); bindUI(); P.mesh.position.set(P.x, 0, P.z); requestAnimationFrame(loop);
window.PAL = { tut, TUT, damage: (n, f) => damagePlayer(n, f, 'test' + Math.random()), heavyHit: () => doHit(true), S, P, ENT, grammar, ink, Tele, mem, door, arena, gates, input, panel, dlg, custode, charger,
  start: startGame, begin: beginWithIntro, tp: (x, z) => { P.x = x; P.z = z; P.vx = P.vz = 0; }, face: (x, z) => { P.face = Math.atan2(x - P.x, z - P.z); },
  open: (id) => openPanel(id), select: (eff) => { const i = panel.words.indexOf(eff); if (i >= 0) selectWord(i); return i; }, confirm: confirmWord, close: closePanel,
  rewrite(id, eff) { if (panel.open) closePanel(); openPanel(id); if (!panel.open) return false; const i = panel.words.indexOf(eff); if (i < 0) { closePanel(); return false; } selectWord(i); const ok = ink.canSelect(); confirmWord(); closePanel(); return ok && grammar.has(id, eff); },
  interact, skipDialog: () => { let k = 0; while (dlg.active && !dlg.opt.choices && k++ < 50) { dlg.ch = 1e9; dlgNext(); } if (dlg.active && dlg.opt.choices) { dlg.i = dlg.lines.length - 1; dlg.ch = 1e9; } },
  choose: (i) => { if (dlg.active && dlg.opt.choices) pickChoice(i); }, attack: (heavy) => startAttack(heavy), quick: quickReapply, reset: resetPhrase, recompose,
  info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, pr, fps: window.__fps }), kill: () => { P.inv = 0; P.hp = 1; damagePlayer(5, null, null); }, room: () => S.room };
if (Q.has('autostart')) startGame();
