// PALIMPSEST · vertical slice. Loop, giocatore, IA, dispositivi, Parole Fluttuanti, storia.
import * as THREE from '../vendor/three.module.js?v=1.9.0';
import { EFFECTS } from './data.js?v=1.9.0';
import { Grammar } from './resolver.js?v=1.9.0';
import { Ink, INK } from './ink.js?v=1.9.0';
import { Input } from './input.js?v=1.9.0';
import { Sfx } from './audio.js?v=1.9.0';
import { Tele } from './telemetry.js?v=1.9.0';
import { paperTexture, INK_UNIFORMS, Traces, Particles, Post, inked } from './art.js?v=1.9.0';
import * as W from './world.js?v=1.9.0';
import * as ST from './story.js?v=1.9.0';
import { Film, FILM_LEN, SHOTS } from './film.js?v=1.9.0';

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
if (!['alta', 'media'].includes(opts.q)) opts.q = 'alta'; // default: Alta (iPad Pro regge DPR 2 + MSAA)
const QL = opts.q === 'alta' ? { pr: Math.min(devicePixelRatio, 2), floor: Math.min(devicePixelRatio, 1.5), samples: 4 } : { pr: Math.min(devicePixelRatio, 1.5), floor: Math.min(devicePixelRatio, 1.0), samples: 2 };
if (navigator.webdriver && !Q.has('msaa')) QL.samples = 0; // test automatici su GPU software: niente MSAA
let pr = QL.pr;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1a130e);
const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 120);
const post = new Post(renderer, QL.samples);
const paper = paperTexture(); INK_UNIFORMS.uPaper.value = paper;
const world = W.buildWorld(scene, paper);
const decor = W.buildDecor(scene); const storyLights = W.buildStory(scene); const traces = new Traces(scene); const particles = new Particles(scene);
function resize() { const w = innerWidth, h = innerHeight; renderer.setPixelRatio(pr); INK_UNIFORMS.uPR.value = pr; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 46 : 34; camera.updateProjectionMatrix(); post.setSize(Math.floor(w * pr), Math.floor(h * pr)); particles.points.material.uniforms.uPR.value = pr; }
addEventListener('resize', resize);

// ---------- sistemi ----------
const grammar = new Grammar(); const ink = new Ink(); const input = new Input(canvas); const sfx = new Sfx();
const mem = ST.loadMem();
const S = { phase: 'title', room: null, deaths: 0, arenaDeaths: 0, arenaProgress: false, doorRoute: null, plan: null, discovered: new Set(), journal: [], lastWord: null, prepared: null,
  encounter: null, time: 0, hitstop: 0, shake: 0, flash: 0, lock: false, done: false, victory: false, tracePos: [], lumiShown: false, secrets: new Set(), roomT: 0, lumiHintT: 0, attempted: new Set(), visionT: 0 };
let now = 0;
particles.onLand = (x, z) => { traces.add(x, z, rnd(0.18, 0.4), Math.random() < 0.5 ? 0 : 1, now); };
function journal(text) { S.journal.push({ t: Math.round(S.time), text }); toastSmall('✒︎ Diario aggiornato'); }

// ---------- giocatore ----------
const P = { mesh: W.makePlayer(), x: 0, z: 6, vx: 0, vz: 0, face: Math.PI, hp: 5, max: 5, st: 'idle', t: 0, inv: 0, cd: 0, atkSeq: 0, atkId: null, hitDone: false, hitAt: 0, r: 0.38, spawn: { x: 0, z: 6 }, dx: 0, dz: 0 };
scene.add(P.mesh); const pShadow = W.makeShadow(); pShadow.scale.setScalar(1.1); scene.add(pShadow);
const trail = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.9, 24, 1, -0.9, 1.8), new THREE.MeshBasicMaterial({ color: 0x120c0a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
trail.rotation.x = -Math.PI / 2; scene.add(trail);

// ---------- entità ----------
const ENT = {}; const circles = [{ x: decor.well.x, z: decor.well.z, r: decor.well.r }]; for (const c of W.buildProps(scene)) circles.push(c);
function matsOf(obj) { const a = []; obj.traverse((o) => { if (o.material && o.material.userData && o.material.userData.ink) a.push(o.material); }); return a; }
function setOutlines(obj, v) { obj.traverse((o) => { if (o.userData && o.userData.outline) o.userData.outline.visible = v; }); }
function setU(mats, k, v) { for (const m of mats) { const u = m.uniforms[k]; if (!u) continue; if (u.value && u.value.isColor) u.value.copy(v); else if (u.value && u.value.isVector2) u.value.copy(v); else u.value = v; } }
function addEnt(id, type, mesh, x, z, extra = {}) {
  mesh.position.x = x; mesh.position.z = z; scene.add(mesh);
  const e = { id, type, mesh, x, z, mats: matsOf(mesh), comp: null, marks: 0, alive: true, echo: null, ...extra };
  e.compMats = e.mats; ENT[id] = e; if (type) grammar.register(id, type); return e;
}
function setComp(e, obj) { e.comp = obj; e.compMats = matsOf(obj); }
// ---------- Capitolo 1: pagine nascoste ----------
const wellEnt = addEnt('well', 'well', new THREE.Group(), decor.well.x, decor.well.z); wellEnt.mesh.userData.height = 1.0; wellEnt.mats = []; for (const m of decor.well.meshes) wellEnt.mats.push(...matsOf(m)); wellEnt.compMats = wellEnt.mats;
const SECRETS = { c1_trap: 'La botola sotto la matita', c1_well: 'Dietro il calamaio', c1_shelf: 'Lo scaffale dell\'archivio', c2_stone: 'Sotto il sasso della chiusa', c2_pile: 'Tra i libri crollati', c2_dam: 'Il sasso dell\'acqua ferma' };
const chapSecrets = (c) => Object.keys(SECRETS).filter((k) => k.startsWith('c' + c + '_'));
const trap = { x: -5.2, z: 4.4, open: false };
const trapMark = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.strokeStyle = 'rgba(60,50,40,.7)'; g.lineWidth = 4; g.setLineDash([14, 8]); g.strokeRect(30, 30, 196, 196); g.setLineDash([]); g.lineWidth = 2; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(40 + i * 15, 220); g.lineTo(60 + i * 15, 40); g.stroke(); } g.fillStyle = 'rgba(60,50,40,.8)'; g.font = 'italic 26px Georgia'; g.fillText('qui suona vuoto', 40, 140);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0 })); m.position.set(trap.x, 0.012, trap.z); scene.add(m); return m; })();
const trapHole = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x0a0605 })); trapHole.position.set(trap.x, 0.014, trap.z); trapHole.visible = false; scene.add(trapHole);
const secretPages = {};
function makeSecretPage(id, x, z) { const p = new THREE.Group(); const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), new THREE.MeshBasicMaterial({ color: 0xf6eedb, side: THREE.DoubleSide })); sheet.position.y = 1.0; p.add(sheet); const glow = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.6 })); glow.position.y = 0.03; p.add(glow); p.position.set(x, 0, z); scene.add(p); secretPages[id] = { mesh: p, x, z, sheet }; }
function foundSecret(id, lines) { if (S.secrets.has(id)) return; S.secrets.add(id); const sp = secretPages[id]; if (sp) { scene.remove(sp.mesh); delete secretPages[id]; } sfx.play('seal'); S.flash = 0.3; { const cs = chapSecrets(id[1]); toast('✦ PAGINA NASCOSTA ' + cs.filter((k) => S.secrets.has(k)).length + '/' + cs.length); } say(lines); journal('Pagina nascosta: ' + SECRETS[id] + '.'); Tele.log('secret_found', { id }); saveGame(); }
function trapUpdate() {
  trapMark.material.opacity = board.broken && !trap.open ? 0.85 : 0;
}
function trySecretsOnHeavy() {
  if (S.room === 'intro' && board.broken && !trap.open && Math.hypot(P.x + Math.sin(P.face) * 1.4 - trap.x, P.z + Math.cos(P.face) * 1.4 - trap.z) < 1.4) { trap.open = true; trapHole.visible = true; sfx.play('tear'); S.shake = 0.5; particles.burst(trap.x, 0.2, trap.z, 30, 4, [0.85, 0.78, 0.62], 0.2); makeSecretPage('c1_trap', trap.x, trap.z); toastSmall('La botola cede: dentro c\'è una pagina'); return true; }
  if (S.room === 'intro' && !wellEnt.broken && grammar.has('well', 'state.fragile') && dist(P, wellEnt) < 2.4) { wellEnt.broken = true; grammar.get('well').broken = true; for (const m of decor.well.meshes) m.visible = false; circles.splice(circles.findIndex((c) => c.x === decor.well.x && c.z === decor.well.z), 1); sfx.play('break'); S.shake = 0.6; particles.burst(wellEnt.x, 0.5, wellEnt.z, 40, 5, [0.05, 0.03, 0.04], 0.2); traces.add(wellEnt.x, wellEnt.z, 2.2, 0, now); makeSecretPage('c1_well', wellEnt.x, wellEnt.z); return true; }
  return false;
}
// ---------- salvataggio e capitoli ----------
const SAVE_KEY = 'pal_save_v1';
const ROOM_ORDER = ['intro', 'charger', 'conduct', 'door', 'arena'];
const C2_ORDER = ['c2a', 'c2b', 'c2c', 'c2d'];
function saveGame() { if (S.phase !== 'play' || S.done) return; if (C2_ORDER.includes(S.room)) { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ chapter: 2, room: S.room, discovered: [...S.discovered], secrets: [...S.secrets], c2: { crate: C2.crateDone, raft: C2.raftUp, rileg: C2.rilegSpawned && !rileg.alive, pile: C2.pileDown }, t: Date.now() })); } catch (e) {} return; }
  const room = S.room === 'archive' || S.room === 'crypt' ? 'conduct' : S.room; if (!ROOM_ORDER.includes(room)) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify({ chapter: 1, archive: AR.done, gateArch: gates.arch.open, shelf: !!shelf.broken, room, discovered: [...S.discovered], doorRoute: S.doorRoute, secrets: [...S.secrets], trap: trap.open, well: !!wellEnt.broken, hasDoc: door.hasDoc, crypt: CR.hatchOpen, t: Date.now() })); } catch (e) {} }
function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } }
function restoreSave(sv) {
  if (sv.chapter === 2) { for (const w of sv.discovered || []) S.discovered.add(w); for (const s of sv.secrets || []) S.secrets.add(s); S.chapter = 2; const i = C2_ORDER.indexOf(sv.room);
    if (i >= 1 || sv.c2.crate) { grammar.apply('crate', 'weight.heavy'); } if (i >= 2) { C2.rilegSpawned = true; rileg.alive = false; rileg.mesh.visible = false; grammar.apply('raft', 'weight.light'); C2.raftUp = true; unsolidRaft(true); openGate('c2g2'); }
    if (i >= 3) collapsePileQuiet(); const r = W.ROOMS.find((q) => q.id === sv.room); P.x = r.cx; P.z = r.cz + r.d / 2 - 1.2; P.spawn = { x: P.x, z: P.z }; return; }
  if (sv.gateArch) openGate('arch'); if (sv.archive) AR.done = true; if (sv.shelf) { shelf.broken = true; grammar.get('shelf').broken = true; shelf.mesh.visible = false; }
  const idx = ROOM_ORDER.indexOf(sv.room); if (idx < 0) return;
  for (const w of sv.discovered || []) S.discovered.add(w); for (const s of sv.secrets || []) S.secrets.add(s);
  if (idx >= 1) { board.broken = true; grammar.get('board').broken = true; board.mesh.visible = false; openGate('board'); }
  if (idx >= 2) { charger.alive = false; charger.st = 'dead'; charger.mesh.visible = false; openGate('r1'); }
  if (idx >= 3) openGate('r2');
  if (idx >= 4 && sv.doorRoute) setRoute(sv.doorRoute);
  if (sv.hasDoc) door.hasDoc = true; if (sv.crypt) { CR.hatchOpen = true; crHatch.visible = true; } if (sv.trap) { trap.open = true; trapHole.visible = true; } if (sv.well) { wellEnt.broken = true; grammar.get('well').broken = true; for (const m of decor.well.meshes) m.visible = false; }
  const r = W.ROOMS[idx]; P.x = r.cx; P.z = r.cz + r.d / 2 - 1.2; P.spawn = { x: P.x, z: P.z };
}
const gates = {};
function addGate(id, x, z, mesh) { const g = { id, mesh, open: false, box: { minX: x - W.GAP / 2 - 0.1, maxX: x + W.GAP / 2 + 0.1, minZ: z - 0.3, maxZ: z + 0.3 } }; if (mesh) { mesh.position.set(x, mesh.position.y, z); scene.add(mesh); } world.walls.push(g.box); gates[id] = g; return g; }
function openGate(id) { const g = gates[id]; if (!g || g.open) return; g.open = true; const i = world.walls.indexOf(g.box); if (i >= 0) world.walls.splice(i, 1); sfx.play('page'); }

// I · tavola
const board = addEnt('board', 'board', W.makeBoard(), 0, -10); setComp(board, board.mesh.userData.body); addGate('board', 0, -10, null);
// II · Caricatore
// ======================= Archivio sommerso (Cap. 1) e Capitolo 2 =======================
const mk = (geo, color, o = {}) => inked(geo, { color, ...o });
function solid(x0, z0, x1, z1) { const b = { minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) }; world.walls.push(b); return b; }
function unsolid(b) { const i = world.walls.indexOf(b); if (i >= 0) world.walls.splice(i, 1); }
function wallMesh(x0, z0, x1, z1, h = 1.3, color = 0xbfae8c) { const m = mk(new THREE.BoxGeometry(Math.abs(x1 - x0) || 0.3, h, Math.abs(z1 - z0) || 0.3), color, { y0: 0, y1: h }); m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); scene.add(m); return m; }
function waterMesh(x0, z0, x1, z1) { const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(x1 - x0), Math.abs(z1 - z0)).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { uTime: INK_UNIFORMS.uTime }, transparent: true,
  vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'uniform float uTime; varying vec2 vU; void main(){ float w=sin(vU.x*40.+uTime*2.)*.5+sin(vU.y*25.-uTime*1.3)*.5; vec3 c=mix(vec3(.08,.12,.16),vec3(.2,.32,.38),w*.5+.5); gl_FragColor=vec4(c,.92); }' }));
  m.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2); scene.add(m); return m; }
const swarm = [];
function spawnMite(x, z, brute) { const m = makeMiteV(brute); scene.add(m); m.position.set(x, 0.3, z); const o = { mesh: m, x, z, alive: true, r: brute ? 0.4 : 0.3, hp: brute ? 2 : 1, brute, room: roomAt(x, z) && roomAt(x, z).id }; swarm.push(o); particles.burst(x, 0.3, z, 12, 3); return o; }
function makeMiteV(brute) { const m = W.makeMite(); if (brute) m.scale.setScalar(1.45); return m; }
// macchie più furbe: aggirano i muri, non si accatastano, scattano quando sono vicine (con preavviso)
function mitePursue(m, tx, tz, dt, group) { let dx = tx - m.x, dz = tz - m.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  let sx = 0, sz = 0; for (const o of group) { if (o === m || !o.alive) continue; const ox = m.x - o.x, oz = m.z - o.z, d = Math.hypot(ox, oz); if (d < 0.9 && d > 1e-3) { sx += ox / d * (0.9 - d); sz += oz / d * (0.9 - d); } }
  m.lt = (m.lt ?? (1 + Math.random() * 2)) - dt; let sp = m.brute ? 1.9 : 2.7;
  if (m.lunge > 0) { m.lunge -= dt; sp = 7.5; dx = m.ldx; dz = m.ldz; } else if (m.tell > 0) { m.tell -= dt; sp = 0.3; if (m.tell <= 0) { m.lunge = 0.28; m.ldx = dx; m.ldz = dz; } }
  else if (l < 3 && m.lt <= 0 && !m.brute) { m.tell = 0.35; m.lt = 2.2 + Math.random() * 1.5; sfx.play('voice', 0.12); }
  const ox = m.x, oz = m.z; m.x += (dx * sp + sx * 3) * dt; m.z += (dz * sp + sz * 3) * dt; const hit = collide(m, m.r, true);
  if (hit && m.lunge <= 0) { const moved = Math.hypot(m.x - ox, m.z - oz); if (moved < sp * dt * 0.4) { m.side = m.side || (Math.random() < 0.5 ? 1 : -1); m.x += -dz * m.side * sp * dt; m.z += dx * m.side * sp * dt; collide(m, m.r, false); } }
  m.mesh.position.set(m.x, 0.3 + (m.tell > 0 ? 0.35 : Math.abs(Math.sin(now * 8 + m.x)) * 0.2), m.z); m.mesh.rotation.y = Math.atan2(dx, dz); }
// fiale d'inchiostro: l'unica cura, rara
const vials = [];
function spawnVial(x, z, fixed) { const g = W.makeInkJar(); g.scale.setScalar(1.3); g.position.set(x, 0, z); scene.add(g); vials.push({ x, z, m: g, alive: true, fixed }); }
function vialsUpdate() { for (const v of vials) { if (!v.alive) continue; v.m.position.y = 0.1 + Math.sin(now * 3 + v.x) * 0.08; v.m.rotation.y += 0.02;
  if (Math.hypot(P.x - v.x, P.z - v.z) < 0.9 && P.hp < P.max && P.st !== 'dead') { v.alive = false; scene.remove(v.m); P.hp = Math.min(P.max, P.hp + 1); renderHP(); sfx.play('seal'); particles.burst(v.x, 0.5, v.z, 18, 3, [0.3, 0.7, 1], 0.15); toastSmall('Fiala d\'inchiostro: +20'); } } }
function miteDrop(m) { gainDrops(m.brute ? 3 : 1); if (Math.random() < (m.brute ? 0.3 : 0.1)) spawnVial(m.x, m.z); }
function swarmUpdate(dt) {
  for (const m of swarm) { if (!m.alive) continue; if (m.room !== S.room) continue; if (S.lock) continue; if (m.aggroR && !mazeAggro(m)) { mazeWander(m, dt); continue; } if (m.boss && copistaAct(m, dt)) continue; mitePursue(m, P.x, P.z, dt, swarm);
    const dx = P.x - m.x, dz = P.z - m.z, l = Math.hypot(dx, dz) || 1;
    if (l < 0.75) { if (damagePlayer(1, m, 'sw' + (m.id || (m.id = Math.random())))) { m.x -= dx / l * 1.2; m.z -= dz / l * 1.2; collide(m, m.r, false); } } }
}
const aliveIn = (room) => swarm.filter((m) => m.alive && m.room === room).length;

// ---------- Archivio sommerso ----------
const AR = { cx: 40, cz: -28, hatch: { x: 8.4, z: -50.8 }, ladder: { x: 40, z: -16.4 }, wave1: false, wave2: false, done: false };
const hatchM = mk(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 16), 0x2b221b); hatchM.position.set(AR.hatch.x, 0.04, AR.hatch.z); scene.add(hatchM);
const ladderM = mk(new THREE.BoxGeometry(1, 2.2, 0.2), 0x6b5a46, { y0: 0, y1: 2.2 }); ladderM.position.set(AR.ladder.x, 1.1, AR.ladder.z + 1.1 - 0.4); scene.add(ladderM);
waterMesh(24.4, -21, 55.6, -27); // pozze d'inchiostro allagate (decoro)
wallMesh(24, -31, 37.6, -31); wallMesh(42.4, -31, 56, -31); solid(24, -31.3, 37.6, -30.7); solid(42.4, -31.3, 56, -30.7);
addGate('arch', 40, -31, W.makeGate());
const bellM = new THREE.Group(); const bellB = mk(new THREE.CylinderGeometry(0.25, 0.6, 0.8, 12, 1, true), 0xb8862f, { shift: 0xffd27a }); bellB.material.side = THREE.DoubleSide; bellB.position.y = 1.3; bellM.add(bellB); const bellP = mk(new THREE.BoxGeometry(0.15, 2, 0.15), 0x2b221b, { y0: 0, y1: 2 }); bellP.position.set(0, 1, -0.3); bellM.add(bellP); bellM.position.set(28, 0, -24); scene.add(bellM); circles.push({ x: 28, z: -24, r: 0.5 });
const apipe = addEnt('apipe', 'apipe', mk(new THREE.CylinderGeometry(0.16, 0.16, 5.5, 8), 0x9a6a3a, { shift: 0x3fc1ff }), 34, -29.2); apipe.mesh.rotation.z = Math.PI / 2; apipe.mesh.position.y = 0.3; apipe.mesh.userData.height = 0.8;
const shelf = addEnt('shelf', 'shelf', (() => { const g = new THREE.Group(); const fr = mk(new THREE.BoxGeometry(2.4, 2.2, 0.6), 0x5a3a22, { y0: 0, y1: 2.2 }); fr.position.y = 1.1; g.add(fr); for (let i = 0; i < 12; i++) { const b = mk(new THREE.BoxGeometry(0.16, 0.5, 0.45), [0x8a2416, 0x2b4a5a, 0xcdbd98][i % 3], { outline: false }); b.position.set(-1 + (i % 6) * 0.38, 0.6 + Math.floor(i / 6) * 0.8, 0.12); g.add(b); } g.userData.height = 2.2; return g; })(), 50, -39.2); setComp(shelf, shelf.mesh); circles.push({ x: 50, z: -39.2, r: 1.1 });
const lecternM = mk(new THREE.BoxGeometry(0.8, 1.1, 0.6), 0x4a3a2c, { y0: 0, y1: 1.1 }); lecternM.position.set(36, 0.55, -39.6); scene.add(lecternM); circles.push({ x: 36, z: -39.6, r: 0.5 });
function archiveUpdate() {
  if (S.room !== 'archive') return;
  if (!AR.wave1) { AR.wave1 = true; S.encounter = 'archive'; ink.encounterEnd(); sfx.tension(true); for (const [x, z] of [[28, -18], [52, -18], [48, -26]]) spawnMite(x, z); say([['narr', 'Sotto la pressa, l\'archivio dove Ilde affogava le versioni scartate. Le macchie si svegliano.'], ['lumi', '…la campana. Suonava quando una pagina era pronta.']]); }
  if (AR.wave1 && !AR.wave2 && gates.arch.open && P.z < -32) { AR.wave2 = true; for (const [x, z] of [[26, -38], [54, -34], [30, -41], [52, -41]]) spawnMite(x, z); }
  if (S.encounter === 'archive' && aliveIn('archive') === 0 && (AR.wave2 || !gates.arch.open)) { endEncounter('archive'); }
}
function ringBell() { bellRung(); sfx.play('pulse'); particles.burst(28, 1.3, -24, 14, 3, [1, 0.85, 0.4], 0.15); if (grammar.has('apipe', 'element.conductive')) { const w = wireFx(28, -24, 40, -31); openGate('arch'); toast('L\'IMPULSO PASSA: LO SCAFFALE SI APRE'); journal('Hai portato il suono della campana attraverso il tubo.'); }
  else { toastSmall('Il suono muore nel tubo isolante…'); hint('Il tubo dell\'archivio accetta una parola che conosci'); } }
function wireFx(x0, z0, x1, z1) { for (let i = 0; i <= 10; i++) { const t = i / 10; setTimeout(() => particles.emit(lerp(x0, x1, t), 0.4, lerp(z0, z1, t), 0, 1, 0, 0.5, 0.25, 0.25, 0.75, 1, 3), i * 40); } }

// ---------- La cripta delle prove: la prova per Elara è nascosta qui (catena di botole) ----------
const CR = { rings: [], hatchOpen: false, solved: false, wrong: {}, docOut: false, guard: false };
const crHatch = mk(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 14), 0x241c16); crHatch.position.set(26.8, 0.035, -42.4); crHatch.visible = false; scene.add(crHatch);
W.sketchFloor(scene, [['~tre volte~', 150, 430, 30, -0.1]], [], 1.6, 34.6, -24.4, 0.4, 0.5); // indizio vicino alla campana
W.sketchWall(scene, 'NON GUARDARE · NON CHIUDERE · TENDI LA MANO', -40, -32.3, 0, 1.0, 1.4);
const CR_H = { eye: { x: -47, z: -31 }, lock: { x: -40, z: -31 }, hand: { x: -33, z: -31 } };
for (const [k, h] of Object.entries(CR_H)) { const m = mk(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 14), 0x2b221b); m.position.set(h.x, 0.035, h.z); scene.add(m); h.m = m; W.sketchFloor(scene, [], [[k, 256, 256, 1.6]], 1.5, -40 + (h.x + 40) / 2, -28 + (h.z + 1.8 + 28) / 2, 0, 0.9); }
const crDoc = W.makeDoc(); crDoc.position.set(-33, -0.4, -33.2); crDoc.visible = false; scene.add(crDoc);
const crLadder = mk(new THREE.BoxGeometry(1, 2.2, 0.2), 0x6b5a46, { y0: 0, y1: 2.2 }); crLadder.position.set(-40, 1.1, -19.6); scene.add(crLadder);
function bellRung() { if (!gates.arch.open || CR.hatchOpen) return; const t = S.time; CR.rings = CR.rings.filter((x) => t - x < 6); CR.rings.push(t);
  if (CR.rings.length >= 3) { CR.hatchOpen = true; crHatch.visible = true; sfx.play('break'); S.shake = 0.3; particles.burst(26.8, 0.3, -42.4, 20, 3, [0.4, 0.3, 0.2], 0.2); say([['lumi', 'Tre rintocchi… qualcosa si è aperto, laggiù nell\'angolo buio.']]); } }
function cryptInteractables(L) {
  if (S.room === 'archive' && CR.hatchOpen) L.push({ x: 26.8, z: -42.4, r: 1.1, label: 'scendi', fn: () => { sfx.play('page'); P.x = -40; P.z = -22.4; P.face = Math.PI; } });
  if (S.room === 'crypt') { L.push({ x: -40, z: -20.8, r: 1.3, label: 'risali', fn: () => { sfx.play('page'); P.x = 26.8; P.z = -40.6; } });
    if (!CR.solved) for (const [k, h] of Object.entries(CR_H)) if (!CR.wrong[k]) L.push({ x: h.x, z: h.z, r: 1.0, label: 'apri', fn: () => cryptHatch(k) });
    if (CR.solved && !door.hasDoc) L.push({ x: -33, z: -33.2, r: 1.4, label: 'prendi', fn: () => { door.hasDoc = true; crDoc.visible = false; ink.interact(); sfx.play('page'); Tele.log('interact', { what: 'evidence' });
      say([['narr', 'Una testimonianza piegata in quattro. In fondo, una firma che non è quella del relè.'], ['lumi', 'Portala a Elara. E corri: la cripta si è accorta di noi.']]); journal('Hai trovato la prova nella cripta, sotto la mano.'); saveGame();
      if (!CR.guard) { CR.guard = true; S.encounter = 'crypt'; sfx.tension(true); for (const [x, z] of [[-48, -24], [-32, -24], [-48, -35], [-32, -35], [-40, -26]]) spawnMite(x, z); } } }); }
}
function cryptHatch(k) { const h = CR_H[k];
  if (k === 'hand') { CR.solved = true; sfx.play('seal'); h.m.visible = false; crDoc.visible = true; crDoc.position.y = 0; particles.burst(h.x, 0.5, h.z, 24, 3, [1, 0.85, 0.4], 0.2); toastSmall('Sotto la mano, un foglio asciutto'); }
  else { CR.wrong[k] = true; h.m.visible = false; sfx.play('hurt'); S.shake = 0.5; P.inv = 0; damagePlayer(1, h, 'crh' + k); for (let i = 0; i < 3; i++) spawnMite(h.x + rnd(-1, 1), h.z + 1.6); toastSmall(k === 'eye' ? 'L\'occhio si apre. E guarda te.' : 'La serratura scatta. Su di te.'); }
}
for (const [x, z] of [[-9.2, -63.2], [53, -17.2], [-49, -22], [13.6, -97.2], [14, -135.6]]) spawnVial(x, z, true);
const XW = { chT: 0, chN: 0, arT: 6 };
function extraWaves(dt) {
  if (S.room === 'charger' && S.encounter === 'charger' && charger.alive && !S.lock) { XW.chT += dt; if (XW.chN === 0 && XW.chT > 4) { XW.chN = 1; spawnMite(-11, -37); spawnMite(11, -37); } if (XW.chN === 1 && charger.armorBroken) { XW.chN = 2; spawnMite(-11, -20); spawnMite(11, -20, true); } }
  if (S.room === 'arena' && S.encounter === 'arena' && custode.alive && custode.st !== 'dead' && !S.lock && !S.victory) { XW.arT -= dt; if (XW.arT <= 0 && aliveIn('arena') < 4) { XW.arT = arena.snapped ? 6 : 9; const a = Math.random() * 6.28; spawnMite(Math.cos(a) * 12, -124 + Math.sin(a) * 10, Math.random() < 0.35); sfx.play('voice', 0.25); } }
}
function cryptUpdate() { if (S.encounter === 'crypt' && aliveIn('crypt') === 0) { endEncounter('crypt'); } }

// ---------- Capitolo 2 ----------
const C2 = { crateDone: false, raftUp: false, rilegSpawned: false, pileDown: false, boss: null, done: false, intro: false };
const X = 100;
// Riva
const lect1 = mk(new THREE.BoxGeometry(0.8, 1.1, 0.6), 0x4a3a2c, { y0: 0, y1: 1.1 }); lect1.position.set(96.5, 0.55, -1); scene.add(lect1); circles.push({ x: 96.5, z: -1, r: 0.5 });
waterMesh(93.2, -4.6, 97, -2.6);
const plateC2 = W.makePlate(1.8, 1.8); plateC2.position.set(103.5, 0.06, -2.6); scene.add(plateC2);
const crate = addEnt('crate', 'crate', mk(new THREE.BoxGeometry(1.3, 1.1, 1.3), 0x9a7a52, { y0: 0, y1: 1.1, shift: 0x3a2a22 }), 103.5, -2.6); crate.mesh.position.y = 0.75; crate.mesh.userData.height = 1.4; circles.push({ x: 103.5, z: -2.6, r: 0.8 });
addGate('c2g1', X, -5, W.makeGate());
// Chiusa: canale d'acqua invalicabile tranne dove sale la zattera
waterMesh(92.2, -14, 107.8, -16.4);
const chanL = solid(92, -16.3, 98.8, -14.1), chanR = solid(101.2, -16.3, 108, -14.1), chanM = solid(98.8, -16.3, 101.2, -14.1);
const raft = addEnt('raft', 'raft', (() => { const g = new THREE.Group(); const d = mk(new THREE.BoxGeometry(2.6, 0.18, 2.4), 0xe8dcc0, { shift: 0x3a2a22 }); g.add(d); for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.04).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5a4a38 })); l.position.set(0, 0.1, -0.8 + i * 0.5); g.add(l); } g.userData.height = 0.6; return g; })(), X, -15.2);
raft.mesh.position.y = -0.25;
const stone = addEnt('stone', 'stone', mk(new THREE.DodecahedronGeometry(0.6, 0), 0x6b6258), 94.5, -19.5); stone.mesh.position.y = 0.45; stone.mesh.userData.height = 1; circles.push({ x: 94.5, z: -19.5, r: 0.6 });
const lect2 = mk(new THREE.BoxGeometry(0.8, 1.1, 0.6), 0x4a3a2c, { y0: 0, y1: 1.1 }); lect2.position.set(95, 0.55, -11.5); scene.add(lect2); circles.push({ x: 95, z: -11.5, r: 0.5 });
addGate('c2g2', X, -21, W.makeGate());
const rileg = addEnt('rileg', 'rileg', (() => { const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
  const coat = mk(new THREE.LatheGeometry([[0.55, 0], [0.5, 0.6], [0.38, 1.3], [0.2, 1.7]].map(([a, b]) => new THREE.Vector2(a, b)), 14), 0x3a3550, { shift: 0xd8cbb0, y0: 0, y1: 1.8 }); body.add(coat);
  const head = mk(new THREE.SphereGeometry(0.28, 12, 10), 0xe8dcc0); head.position.y = 1.95; body.add(head);
  const eyeB = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.03, 6, 12), new THREE.MeshBasicMaterial({ color: 0x16110d })); eyeB.position.set(0, 1.98, 0.26); body.add(eyeB);
  const armor = new THREE.Group(); body.add(armor); for (let i = 0; i < 10; i++) { const t = mk(new THREE.TorusGeometry(0.5 - i * 0.03, 0.025, 4, 18), 0xd8cbb0, { outline: false }); t.rotation.x = Math.PI / 2 + (i % 2 ? 0.25 : -0.25); t.position.y = 0.2 + i * 0.15; armor.add(t); }
  for (const sd of [-1, 1]) { const n = mk(new THREE.ConeGeometry(0.05, 1.3, 5), 0x9a9a9a); n.position.set(sd * 0.55, 1.1, 0.25); n.rotation.x = 1.2; body.add(n); }
  g.userData = { body, armor, height: 2.3, r: 0.55 }; return g; })(), 106, -19, { hp: 4, maxHp: 4, armor: true, st: 'idle', t: 0, cd: 1.5, home: { x: 106, z: -19 } });
rileg.mesh.visible = false; rileg.alive = false; setComp(rileg, rileg.mesh.userData.armor);
// Pila
const pile = addEnt('pile', 'pile', (() => { const g = new THREE.Group(); for (let i = 0; i < 9; i++) { const b = mk(new THREE.BoxGeometry(2.2 - (i % 3) * 0.2, 0.35, 1.5), [0x8a2416, 0x2b4a5a, 0xcdbd98, 0x4a3a2c][i % 4], { y0: 0, y1: 3.2 }); b.position.set((i % 2 ? 0.15 : -0.15), 0.18 + i * 0.36, 0); b.rotation.y = (i % 3 - 1) * 0.12; g.add(b); } g.userData.height = 3.4; return g; })(), X, -35.6); setComp(pile, pile.mesh);
const pileBox = solid(X - 1.3, -36.6, X + 1.3, -34.6);
addGate('c2g3', X, -37, null); // la pila stessa fa da cancello
addGate('c2g4', X, -57, W.makeGate());
// Diga
const damWall = mk(new THREE.BoxGeometry(17.6, 3.2, 1), 0x7a6a56, { y0: 0, y1: 3.2, shift: 0x3fc1ff }); damWall.position.set(X, 1.6, -56.2); scene.add(damWall);
const dweights = [94.5, 100, 105.5].map((x, i) => { const e = addEnt('dw' + i, 'dweight', (() => { const g = new THREE.Group(); const w = mk(new THREE.CylinderGeometry(0.5, 0.6, 0.9, 10), 0x2b221b, { shift: 0x9e2b1c }); w.position.y = 3.3; g.add(w); const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2, 4), new THREE.MeshBasicMaterial({ color: 0xd8cbb0 })); rope.position.y = 4.7; g.add(rope); const anchor = mk(new THREE.TorusGeometry(0.45, 0.12, 6, 14), 0xd8cbb0); anchor.position.y = 0.5; anchor.rotation.x = Math.PI / 2; g.add(anchor); g.userData = { w, anchor, height: 3.8 }; return g; })(), x, -54.3, { drop: -1, broken: false }); return e; });
const damHeart = addEnt('dam', 'dam', mk(new THREE.OctahedronGeometry(0.7, 1), 0x3fc1ff, { shift: 0xffffff }), X, -54.6, { hp: 8, maxHp: 8 }); damHeart.mesh.position.y = 1.5; damHeart.mesh.visible = false; damHeart.alive = false; damHeart.mesh.userData.height = 2.2;
const stone2 = addEnt('stone2', 'stone', mk(new THREE.DodecahedronGeometry(0.6, 0), 0x6b6258), 104.5, -69); stone2.mesh.position.y = 0.45; stone2.mesh.userData.height = 1; circles.push({ x: 104.5, z: -69, r: 0.6 });
const elaraC2 = W.makeElaraPage(true); elaraC2.position.set(X, 0, -71.3); elaraC2.scale.setScalar(0.8); scene.add(elaraC2);
['c2a', 'c2b', 'c2c', 'c2d', 'c2e', 'archive'].forEach(() => {});

function ch2Interactables(L) {
  if (S.room === 'conduct' && S.discovered.has('element.conductive')) L.push({ x: AR.hatch.x, z: AR.hatch.z, r: 1.6, label: 'scendi', fn: () => { sfx.play('page'); P.x = 40; P.z = -19; P.face = Math.PI; P.vx = P.vz = 0; Tele.log('archive_enter'); } });
  if (S.room === 'archive') L.push({ x: AR.ladder.x, z: AR.ladder.z, r: 1.4, label: 'risali', fn: () => { sfx.play('page'); P.x = AR.hatch.x - 1.5; P.z = AR.hatch.z; P.vx = P.vz = 0; } });
  if (S.room === 'archive' && gates.arch.open && !AR.done) L.push({ x: 36, z: -38.6, r: 1.7, label: 'leggi', fn: () => { AR.done = true; ink.interact(); sfx.play('page'); say(ST.ARCHIVE_TEXT); journal('Archivio sommerso: hai letto la prima versione della storia.'); saveGame(); } });
  if (S.room === 'c2a' && !S.discovered.has('weight.heavy')) L.push({ x: 96.5, z: -1, r: 1.8, label: 'leggi', fn: () => { S.discovered.add('weight.heavy'); ink.interact(); sfx.play('page'); say([['narr', 'Una pagina fradicia. La cassa, dice il libro, era LEGGERA come un pensiero.'], ['narr', 'Ma l\'inchiostro sotto è più denso, più vecchio: PESANTE.']], { done: () => hint('Scrivi PESANTE sulla cassa: la piastra cederà') }); journal('Hai trovato la parola PESANTE.'); } });
  if (S.room === 'c2b' && !S.discovered.has('weight.light')) L.push({ x: 95, z: -11.5, r: 1.8, label: 'leggi', fn: () => { S.discovered.add('weight.light'); ink.interact(); sfx.play('page'); say([['narr', 'Sul leggio, una frase annegata: «La zattera affondò, PESANTE di tutto quello che non le avevano detto».'], ['narr', 'Qualcuno ha provato a correggerla a margine: LEGGERO.']], { done: () => hint('Scrivi LEGGERO sulla zattera sommersa') }); journal('Hai trovato la parola LEGGERO.'); } });
}
function ch2Hit(heavy, range, arc) {
  let any = false;
  if (S.room === 'archive' && Math.hypot(P.x - 28, P.z + 24) < 2.2) { ringBell(); any = true; }
  if (S.room === 'archive' && !shelf.broken && dist(P, shelf) < 2.6 && heavy) { if (grammar.has('shelf', 'state.fragile')) { shelf.broken = true; grammar.get('shelf').broken = true; shelf.mesh.visible = false; circles.splice(circles.findIndex((c) => c.x === 50 && c.z === -39.2), 1); sfx.play('break'); S.shake = 0.6; particles.burst(50, 1, -39.2, 40, 5, [0.6, 0.45, 0.3], 0.2); makeSecretPage('c1_shelf', 50, -38.6); } else { sfx.play('deny'); toastSmall('Lo scaffale regge ancora'); } any = true; }
  if (rileg.alive && inArc(rileg, range + 0.5, arc)) { any = true; hitRileg(heavy); }
  if (damHeart.alive && inArc(damHeart, range + 0.8, arc + 0.3)) { any = true; if (grammar.has('dam', 'state.fragile') || grammar.has('dam', 'element.conductive')) { damHeart.hp -= heavy ? 2 : 1; damHeart.hitT = 0.16; sfx.play('hit'); S.hitstop = 0.08; particles.burst(X, 1.5, -54.6, 16, 4, [0.3, 0.7, 0.9], 0.15); if (damHeart.hp <= 0) damDefeated(); } else { sfx.play('deny'); dmgAt(X, 2.5, -54.6, 'PARATO', 'block'); toastSmall('Il cuore è sigillato: FRAGILE o CONDUTTIVO lo aprono'); } }
  if (S.room === 'c2c' && !C2.pileDown && heavy && dist(P, pile) < 2.8) { any = true; if (grammar.has('pile', 'state.fragile')) collapsePile('hit'); else { sfx.play('deny'); toastSmall('La pila oscilla ma regge'); } }
  return any;
}
function hitRileg(heavy) {
  const e = rileg; e.hitT = 0.16; const dx = e.x - P.x, dz = e.z - P.z, l = Math.hypot(dx, dz) || 1; e.x += dx / l * (heavy ? 1.2 : 0.4); e.z += dz / l * (heavy ? 1.2 : 0.4);
  if (e.armor) { if (heavy && grammar.has('rileg', 'state.fragile')) { e.armor = false; e.comp.visible = false; sfx.play('break'); S.shake = 0.6; toast('I FILI SI SPEZZANO'); particles.burst(e.x, 1.2, e.z, 30, 5, [0.85, 0.8, 0.7], 0.15); dmgAt(e.x, 2.6, e.z, '-30', 'big'); e.stun = 2; }
    else { sfx.play('deny'); dmgAt(e.x, 2.6, e.z, 'PARATO', 'block'); toastSmall('I fili ricuciono ogni colpo: rendilo FRAGILE, poi colpo forte'); } return; }
  const d = heavy ? 2 : 1; e.hp -= d; sfx.play('hit'); S.hitstop = 0.06; dmgAt(e.x, 2.6, e.z, '-' + d * 10, heavy ? 'big' : ''); particles.burst(e.x, 1.2, e.z, 12, 4);
  if (e.hp <= 0) { e.alive = false; e.st = 'dead'; e.mesh.visible = false; grammar.resetPhrase('rileg'); sfx.play('break'); toast('IL RILEGATORE SI SCUCE'); traces.add(e.x, e.z, 2.4, 3, now); endEncounter('rileg'); journal('Hai scucito il Rilegatore. Per ora.'); say([['narr', 'Il Rilegatore si disfa in fili. Uno ti resta sulla manica: profuma di carta vecchia e di lavanda.'], ['lumi', 'Lavanda. Come… no. Non ancora.']]); if (C2.raftUp) openGate('c2g2'); }
}
function rilegUpdate(dt) {
  const e = rileg; if (!e.alive || S.room !== 'c2b') return; if (e.hitT > 0) { e.hitT -= dt; setU(e.mats, 'uHit', Math.max(0, e.hitT / 0.16)); if (e.hitT <= 0) setU(e.mats, 'uHit', 0); }
  if (e.stun > 0) { e.stun -= dt; return; }
  const heavyW = grammar.has('rileg', 'weight.heavy'), cautious = grammar.has('rileg', 'temperament.cautious'); const sp = heavyW ? 0.9 : 2.3;
  let tx = P.x, tz = P.z; if (C2.raftUp && !cautious) { tx = X; tz = -13.4; }
  const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1, dp = dist(P, e);
  if (cautious && dp < 4) { e.x -= (P.x - e.x) / dp * sp * dt; e.z -= (P.z - e.z) / dp * sp * dt; }
  else if (d > 1.1) { e.x += dx / d * sp * dt; e.z += dz / d * sp * dt; }
  e.x = clamp(e.x, 92.8, 107.2); e.z = clamp(e.z, -13.6, -9.6 + 0); if (P.z < -16.3) e.z = clamp(e.z, -20.5, -16.6);
  e.mesh.position.set(e.x, 0, e.z); e.mesh.rotation.y = Math.atan2(P.x - e.x, P.z - e.z); e.mesh.userData.body.position.y = Math.abs(Math.sin(now * 6)) * 0.08;
  if (C2.raftUp && Math.hypot(e.x - X, e.z + 13.4) < 1.4) { C2.raftUp = false; grammar.resetPhrase('raft'); unsolidRaft(false); toast('IL RILEGATORE RICUCE LA ZATTERA AL FONDO'); sfx.play('tear'); }
  e.cd -= dt; if (e.cd <= 0 && dp < 2.6) { e.cd = heavyW ? 3 : 1.8; const x = P.x, z = P.z; sfx.play('warn'); ring(x, z, 1.2, heavyW ? 1.1 : 0.75, 0xd8cbb0, () => { if (rileg.alive && Math.hypot(P.x - x, P.z - z) < 1.2) damagePlayer(1, rileg, 'rl' + (++attackCounter)); }); }
}
function unsolidRaft(up) { if (up) { unsolid(chanM); } else if (!world.walls.includes(chanM)) world.walls.push(chanM); }
function collapsePile(by) { if (C2.pileDown) return; C2.pileDown = true; grammar.get('pile').broken = true; unsolid(pileBox); openGate('c2g3'); sfx.play('break'); S.shake = 0.9; input.rumble(1, 1, 300);
  pile.mesh.children.forEach((b, i) => { b.userData.fall = { vx: rnd(-3, 3), vz: rnd(-2, 2), vy: rnd(1, 3), r: rnd(-3, 3) }; }); C2.pileFall = 1.4;
  for (const [x, z] of [[X - 1.6, -34.5], [X + 1.8, -35.5]]) ring(x, z, 1.2, 0.6, 0x8a1a10, () => { if (Math.hypot(P.x - x, P.z - z) < 1.2) damagePlayer(1, { x, z }, 'pile' + x); });
  makeSecretPage('c2_pile', X + 3.5, -33); toast(by === 'combo' ? '✦ FRAGILE + PESANTE: CROLLA DA SOLA' : 'LA PILA CROLLA'); journal('La pila dei libri è crollata' + (by === 'combo' ? ' sotto il suo stesso peso.' : '.')); }
function collapsePileQuiet() { C2.pileDown = true; grammar.get('pile').broken = true; unsolid(pileBox); openGate('c2g3'); pile.mesh.visible = false; }
function damDefeated() { damHeart.alive = false; damHeart.mesh.visible = false; C2.boss.done = true; openGate('c2g4'); endEncounter('dam'); sfx.play('seal'); S.flash = 0.6; S.shake = 1.2; toast('LA DIGA SI ROMPE'); damWall.visible = false; journal('Hai rotto la Diga Rilegata.'); Tele.log('boss_defeated', { id: 'dam' });
  for (let i = 0; i < 80; i++) particles.emit(X + rnd(-8, 8), rnd(0.5, 3), -56, rnd(-1, 1), rnd(0, 3), rnd(2, 6), rnd(1, 2), rnd(0.15, 0.3), 0.25, 0.4, 0.5, 6);
  say([['narr', 'L\'acqua di carta torna a scorrere. Dietro la diga, una pagina che il fiume nascondeva da quarant\'anni.']]); }
function bossC2Update(dt) {
  if (S.room !== 'c2d') return; const B = C2.boss || (C2.boss = { phase: 1, t: 1.5, spawn: 4, done: false });
  if (B.done) return;
  if (!B.started) { B.started = true; S.encounter = 'dam'; ink.encounterEnd(); sfx.tension(true); say([['narr', 'La Diga Rilegata. Tre ancore di filo tengono il fiume fermo dove la storia vuole che resti.'], ['lumi', 'I pesi sopra le ancore… sono solo appesi. Come le parole.']]); hint('Scrivi PESANTE sui pesi appesi: cadranno sulle ancore'); }
  for (const w of dweights) { if (w.drop >= 0 && !w.broken) { w.drop += dt; const y = Math.max(0.6, 3.3 - w.drop * w.drop * 9); w.mesh.userData.w.position.y = y; if (y <= 0.6) { w.broken = true; w.alive = false; grammar.get(w.id).broken = true; w.mesh.userData.anchor.visible = false; sfx.play('break'); S.shake = 0.8; particles.burst(w.x, 0.6, w.z, 30, 5, [0.85, 0.8, 0.7], 0.2); toast('ANCORA SPEZZATA ' + dweights.filter((q) => q.broken).length + '/3'); if (Math.hypot(P.x - w.x, P.z - w.z) < 1.2) damagePlayer(1, w, 'dw' + w.id); } }
    else if (!w.broken && w.drop < 0 && grammar.has(w.id, 'weight.heavy')) { w.drop = 0; sfx.play('warn'); ring(w.x, w.z, 1.2, 0.55, 0x8a1a10); } }
  if (B.phase === 1 && dweights.every((w) => w.broken)) { B.phase = 2; damHeart.alive = true; damHeart.mesh.visible = true; toast('LA DIGA · FASE 2'); hint('Il cuore è esposto: FRAGILE o CONDUTTIVO, poi colpiscilo'); S.shake = 1; Tele.log('boss_phase', { id: 'dam', phase: 2 }); }
  damHeart.mesh.rotation.y += dt * 1.5; if (damHeart.hitT > 0) { damHeart.hitT -= dt; setU(damHeart.mats, 'uHit', Math.max(0, damHeart.hitT / 0.16)); }
  B.t -= dt; if (B.t <= 0 && !S.lock) { B.t = B.phase === 1 ? 2.4 : 1.7; const x = P.x, z = P.z; sfx.play('warn'); ring(x, z, 1.5, 0.95, 0x1b5a7a, () => { particles.burst(x, 0.3, z, 16, 4, [0.25, 0.4, 0.5], 0.18); if (Math.hypot(P.x - x, P.z - z) < 1.5) damagePlayer(1, { x, z }, 'jet' + (++attackCounter)); }); }
  B.spawn -= dt; if (B.spawn <= 0) { B.spawn = B.phase === 1 ? 6 : 4.5; if (aliveIn('c2d') < 4) spawnMite(X + rnd(-7, 7), -51 + rnd(-3, 3)); }
  const v = dweights.filter((w) => !w.broken).length * 2 + (B.phase === 2 ? Math.max(0, damHeart.hp) : 8); $('bossBar').classList.toggle('hidden', S.roomT < 2.6); $('bossBar').querySelector('.bname').textContent = B.phase === 1 ? 'LA DIGA RILEGATA · ANCORE' : 'LA DIGA RILEGATA · CUORE'; setBar($('bossBar').querySelector('.hbar'), v / 14);
}
function ch2Update(dt) {
  archiveUpdate(); cryptUpdate(); vialsUpdate(); swarmUpdate(dt); mazeUpdate(dt); v16Update(dt); extraWaves(dt); rilegUpdate(dt); bossC2Update(dt);
  if (!C2.crateDone && grammar.has('crate', 'weight.heavy')) { C2.crateDone = true; crate.mesh.position.y = 0.6; plateC2.position.y = 0.0; openGate('c2g1'); sfx.play('heavy'); S.shake = 0.4; toast('LA PIASTRA CEDE'); journal('Hai reso PESANTE la cassa: la piastra ha ceduto.'); }
  if (grammar.has('crate', 'weight.light')) crate.mesh.position.y = 0.75 + 0.3 + Math.sin(now * 2) * 0.08;
  const up = grammar.has('raft', 'weight.light'); if (up && !C2.raftUp) { C2.raftUp = true; unsolidRaft(true); sfx.play('page'); toast('LA ZATTERA RIAFFIORA'); if (!C2.rilegSpawned) { C2.rilegSpawned = true; rileg.alive = true; rileg.mesh.visible = true; rileg.x = 106; rileg.z = -10.5; S.encounter = 'rileg'; ink.encounterEnd(); sfx.tension(true); say([['narr', 'Dal fondo del canale sale una figura fatta di fili e colla.'], ['custode', 'Ciò che è affondato resta affondato.'], ['lumi', 'Il Rilegatore. Ricuce tutto quello che apri.']]); hint('Il Rilegatore vuole ricucire la zattera: CAUTO lo tiene lontano, PESANTE lo rallenta, FRAGILE + colpo forte spezza i fili'); } if (!rileg.alive) openGate('c2g2'); }
  if (!up && C2.raftUp) { C2.raftUp = false; unsolidRaft(false); }
  raft.mesh.position.y = lerp(raft.mesh.position.y, C2.raftUp ? 0.12 : -0.25, 0.08); raft.mesh.rotation.z = C2.raftUp ? Math.sin(now * 1.3) * 0.03 : 0;
  if (!stone.floated && grammar.has('stone', 'weight.light')) { stone.floated = true; stone.broken = true; sfx.play('breath'); makeSecretPage('c2_stone', 94.5, -19.5); circles.splice(circles.findIndex((c) => c.x === 94.5 && c.z === -19.5), 1); }
  if (stone.floated && stone.mesh.position.y < 6) stone.mesh.position.y += dt * 1.5;
  if (!stone2.floated && grammar.has('stone2', 'weight.light')) { stone2.floated = true; stone2.broken = true; sfx.play('breath'); makeSecretPage('c2_dam', 104.5, -69); circles.splice(circles.findIndex((c) => c.x === 104.5 && c.z === -69), 1); }
  if (stone2.floated && stone2.mesh.position.y < 6) stone2.mesh.position.y += dt * 1.5;
  if (!C2.pileDown && grammar.has('pile', 'state.fragile') && grammar.has('pile', 'weight.heavy')) collapsePile('combo');
  if (C2.pileFall > 0) { C2.pileFall -= dt; pile.mesh.children.forEach((b) => { const f = b.userData.fall; if (!f) return; f.vy -= 12 * dt; b.position.x += f.vx * dt; b.position.z += f.vz * dt; b.position.y = Math.max(0.18, b.position.y + f.vy * dt); b.rotation.z += f.r * dt; }); }
  if (S.room === 'c2e' && P.z < -69.5 && Math.abs(P.x - X) < 2.6 && !C2.done && !S.lock) { C2.done = true; S.lock = true; say(ST.C2_END, { done: () => { S.lock = false; finishChapter2(); } }); }
}
function startChapter2() {
  S.chapter = 2; for (const w of ['state.fragile', 'temperament.cautious', 'element.conductive']) S.discovered.add(w);
  P.x = X; P.z = 3.4; P.face = Math.PI; P.spawn = { x: X, z: 3.4 }; enterRoom(W.ROOMS.find((r) => r.id === 'c2a'));
  say(ST.C2_INTRO, { done: () => { S.lock = false; } });
}
function finishChapter2() { mem.chapters = mem.chapters || {}; const prev = mem.chapters[2] || {}; mem.chapters[2] = { done: true, secrets: Math.max(['c2_stone', 'c2_pile', 'c2_dam'].filter((s) => S.secrets.has(s)).length, prev.secrets || 0) }; ST.saveMem(mem); try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  S.done = true; Tele.log('chapter_complete', { chapter: 2, t: Math.round(S.time) }); Tele.flush();
  $('jList').innerHTML = S.journal.map((j) => `<p>${j.text}</p>`).join('') + `<p><b>Capitolo II completato.</b><br><b>Pagine nascoste:</b> ${mem.chapters[2].secrets}/3<br><b>Macchie lasciate:</b> ${S.deaths}</p><p class="small">Il Capitolo III è in scrittura.</p>`;
  $('journal').classList.remove('hidden'); $('journal').querySelector('h2').textContent = 'Fine del Capitolo II'; $('journal').querySelector('[data-close]').textContent = 'Torna al titolo'; }

const charger = addEnt('charger', 'charger', W.makeCharger(), 0, -32); charger.mesh.scale.setScalar(1.4); charger.mesh.userData.height = 2.2;
for (const [x, z] of [[-7.2, -34], [7.2, -25]]) { const m = W.makePillar(); m.position.set(x, 1.3, z); scene.add(m); circles.push({ x, z, r: 0.72, pillar: true, mesh: m }); }
addGate('r1', 0, -40, W.makeGate());
// III · pressa e piastra
const press1 = W.makePress(); press1.position.set(-8.8, 0, -56); scene.add(press1); circles.push({ x: -8.8, z: -56, r: 0.9 });
const plate = addEnt('plate', 'plate', W.makePlate(1.5, 1.5), 0, -56);
const wireA = W.makeWire([[-7.2, -56], [-1.6, -56]]); const wireB = W.makeWire([[0, -57.6], [0, -65.2]]); const wireC = W.makeWire([[1.6, -56], [7.2, -61]]); scene.add(wireA, wireB, wireC);
const lantern = W.makeMonolith(); lantern.scale.setScalar(0.6); lantern.position.set(7.8, 0.36, -61.6); scene.add(lantern); circles.push({ x: 7.8, z: -61.6, r: 0.4 });
addGate('r2', 0, -66, W.makeGate());
const devR2 = { t: 0, period: 4 };
// IV · porta di Elara
const elara = W.makeElaraPage(true); elara.position.set(0, 0, -99.4); scene.add(elara); addGate('door', 0, -100, null);
const relay = addEnt('relay', 'relay', W.makeRelay(), 5.4, -98.4); setComp(relay, relay.mesh.userData.sup); circles.push({ x: 5.4, z: -98.4, r: 0.35 });
const relayBoxMats = matsOf(relay.mesh.userData.box);
const evplate = addEnt('evplate', 'evplate', W.makePlate(1.2, 1.2, 0x8c6438), -6.6, -95.2);
const reader = W.makeReader(); reader.position.set(-3.8, 0.55, -98.8); scene.add(reader); circles.push({ x: -3.8, z: -98.8, r: 0.4 });
W.sketchWall(scene, 'LA PROVA? AFFOGATA CON LE VERSIONI SCARTATE', -7.7, -39.3, Math.PI / 2, 0.9, 1.1); W.sketchFloor(scene, [['dove la campana tace…', 60, 120, 30, -0.05]], [['lock', 256, 330, 0.8]], 1.8, -6.3, -40.5, 0.3, 0.6);
const docM = W.makeDoc(); docM.position.set(-13, 0, -78.6); scene.add(docM); docM.visible = false;
const wireD = W.makeWire([[5.4, -97.6], [5.4, -95.2], [-5.2, -95.2]]); const wireE = W.makeWire([[-6.6, -96.6], [-4.4, -98.2]]); scene.add(wireD, wireE);
const door = { hasDoc: false, docPlaced: false, relayT: 0, defense: null, mites: [], open: null };
// V · arena
const monolith = W.makeMonolith(); monolith.position.set(0, 0.6, -124); scene.add(monolith); circles.push({ x: 0, z: -124, r: 0.6 });
const custode = addEnt('custode', 'custode', W.makeCustode(), 0, -120.6, { boss: true });
for (const [x, z] of [[-9.2, -122], [9.2, -122]]) { const m = W.makePillar(); m.position.set(x, 1.3, z); scene.add(m); circles.push({ x, z, r: 0.72, pillar: true, mesh: m }); }
const bridge = addEnt('bridge', 'bridge', W.makePlate(24, 2.8, 0x7d5a36), 0, -133.2);
const press2 = W.makePress(); press2.position.set(-14.2, 0, -133.2); scene.add(press2);
const wireF = W.makeWire([[-14.2, -131.2], [-14.2, -119.6]]); scene.add(wireF);
const hazard = W.makePlate(2.2, 4.4, 0x5a4632); hazard.position.set(-13.2, 0.05, -119.2); scene.add(hazard);
const seal = W.makeSeal(); seal.position.set(0, 0, -137); scene.add(seal);
const tether = W.makeTether(); tether.visible = false; scene.add(tether);
const arena = { t: 0, period: 4, loosenT: 0, window: 0, windowPlan: null, snapped: false, hazardT: 0, warn: false };
// VI · fine
const elara2 = W.makeElaraPage(false); elara2.position.set(-5.2, 0, -165.2); elara2.scale.setScalar(0.75); scene.add(elara2);
// v1.5: Elara in 3D accanto alla sua pagina + luci extra (porta e arena)
const elaraFig = W.makeElara(); elaraFig.position.set(2.6, 0, -98.1); elaraFig.rotation.y = -0.35; scene.add(elaraFig); circles.push({ x: 2.6, z: -98.1, r: 0.5 });
const elaraFig2 = W.makeElara(); elaraFig2.position.set(-3.3, 0, -164.3); elaraFig2.rotation.y = 0.4; scene.add(elaraFig2);
for (const [k, x, z] of [['candle', -1.9, -98.9], ['lamp', 6.5, -96.8], ['lamp', -14.5, -111.5], ['lamp', 14.5, -111.5], ['lamp', -14.5, -136.5], ['lamp', 14.5, -136.5], ['candle', -1.8, -163.8]]) {
  const m = k === 'candle' ? W.makeCandle(0.6) : W.makeLamp(); m.position.set(x, 0, z); scene.add(m);
  storyLights.push({ m, x, y: m.userData.ly, z, r: k === 'lamp' ? 5.2 : 3.4, col: k === 'lamp' ? [1.3, 0.95, 0.55] : [1.2, 0.7, 0.3], ph: Math.random() * 10, kind: k }); }
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
castShadow(-8.8, -56, 1.8, 3.4); castShadow(-14.2, -133.2, 1.8, 3.4); castShadow(0, -124, 1.2, 2.2); castShadow(0.8, -99.2, 3, 5); castShadow(5.4, -98.4, 0.8, 2.5);
const shadows = {}; for (const id of ['charger', 'custode']) { const s = W.makeShadow(); s.scale.setScalar(2.2); scene.add(s); shadows[id] = s; }

// ---------- IA (Caricatore e Custode) ----------
function initAI(e, cfg) { Object.assign(e, { st: 'idle', t: 0, cd: 1.5, vx: 0, vz: 0, face: 0, dir: { x: 0, z: 1 }, armorHP: cfg.armor, armorMax: cfg.armor, armorBroken: false, exposed: 0, atkId: 0, hitPlayer: false, cfg, home: { x: e.x, z: e.z }, push: null, foldStun: false, brokenBy: null }); }
initAI(charger, { speed: 3.4, charge: 13.5, windup: 0.55, chargeT: 1.0, recover: 0.85, armor: 14, r: 1.15, swipeR: 2.0, dmgCharge: 2, dmgSwipe: 1 });
initAI(custode, { speed: 2.9, charge: 14, windup: 0.65, chargeT: 1.1, recover: 1.05, armor: 20, r: 0.95, swipeR: 2.5, dmgCharge: 2, dmgSwipe: 2 });
setComp(charger, charger.mesh.userData.armor); setComp(custode, custode.mesh.userData.armor);
let attackCounter = 0;
function enemyAttack(e) { e.atkId = 'ea' + (++attackCounter); e.hitPlayer = false; }
function damagePlayer(n, from, attackId) {
  if (P.st === 'dead' || S.lock) return false;
  if (P.inv > 0) { if (attackId && P.st === 'dodge') { const g = ink.dodge(attackId); if (g) { Tele.log('dodge_verified', { attackId }); popInk('+' + g); slowmo(0.25); } } return false; }
  if (opts.easy && n > 1) n = 1;
  P.hp -= n; P.inv = 0.6; P.st = 'hurt'; P.t = 0.25; sfx.play('hurt'); S.shake = 0.5; S.hitstop = 0.08; input.rumble(0.6, 0.9, 180);
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
      } else if (d < c.swipeR && e.cd <= 0) { e.st = 'swipeWU'; e.t = 0.4; e.cd = 1.0; }
      else if (d > 4 && d < 11 && e.cd <= 0) { e.st = 'windup'; e.t = c.windup; e.dir = { x: dx / d, z: dz / d }; sfx.play('warn'); ring(e.x + e.dir.x * 2, e.z + e.dir.z * 2, 0.6, c.windup, 0xd04020); }
      else if (!e.boss && d < 5.5) { mvx = -dx / d + (-dz / d) * 0.8; mvz = -dz / d + (dx / d) * 0.8; sp = c.speed * 0.8; } // il Caricatore prende la rincorsa
      else { mvx = dx; mvz = dz;
        if (e.boss) { const nx = e.x + dx / d * 0.3, nz = e.z + dz / d * 0.3; if (Math.hypot(nx, nz + 124) > 9 && Math.hypot(nx, nz + 124) > Math.hypot(e.x, e.z + 124)) { mvx = 0; mvz = 0; } } }
      break; }
    case 'windup': { e.face = Math.atan2(e.dir.x, e.dir.z); if (d > 2) { e.dir.x = lerp(e.dir.x, dx / d, 0.05); e.dir.z = lerp(e.dir.z, dz / d, 0.05); const l = Math.hypot(e.dir.x, e.dir.z); e.dir.x /= l; e.dir.z /= l; }
      if (cautious && Math.random() < 0.02) { e.st = 'idle'; e.cd = 1.5; break; } // meno incline a caricare
      if (e.t <= 0) { e.st = 'charge'; e.t = c.chargeT; enemyAttack(e); sfx.play('heavy'); } break; }
    case 'charge': { e.vx = e.dir.x * c.charge; e.vz = e.dir.z * c.charge; e.x += e.vx * dt; e.z += e.vz * dt;
      if (frame % 2 === 0) particles.emit(e.x, 0.2, e.z, rnd(-1, 1), 1, rnd(-1, 1), 0.5, 0.25, 0.1, 0.08, 0.06, 4);
      if (Math.hypot(P.x - e.x, P.z - e.z) < c.r + P.r + 0.2 && !e.hitPlayer) { e.hitPlayer = true; damagePlayer(c.dmgCharge, e, e.atkId); }
      const hit = collide(e, c.r, true);
      if (hit) { S.shake = 0.6; sfx.play('hit'); particles.burst(e.x + e.dir.x * c.r, 1, e.z + e.dir.z * c.r, 18, 5, [0.85, 0.78, 0.62], 0.2);
        if (hit.pillar && !e.armorBroken) e.armorHP -= fragile ? 5 : 1; if (hit.pillar && e.armorHP <= 0 && !e.armorBroken) breakArmor(e, fragile ? 'fragile' : 'action'); else { e.st = 'stun'; e.t = hit.pillar ? 1.6 : 0.9; if (hit.pillar && fragile) { toastSmall('La corazza si incrina: ancora!'); dmgAt(e.x, 2.6, e.z, '-50', 'big'); } }
        if (hit.pillar) hit.mesh.rotation.z = rnd(-0.06, 0.06); if (hit.support) collapseSupport();
      } else if (e.t <= 0) { e.st = 'recover'; e.t = c.recover; }
      break; }
    case 'recover': case 'stun': if (e.t <= 0) { e.st = 'idle'; e.cd = cautious ? 2.5 : 0.8 + Math.random(); e.foldStun = false; } break;
    case 'swipeWU': e.face = Math.atan2(dx, dz); if (e.t <= 0) { e.st = 'swipe'; e.t = 0.18; enemyAttack(e); sfx.play('swing', 0.6); } break;
    case 'swipe': if (!e.hitPlayer && d < c.swipeR + 0.3) { const a = Math.abs(angDiff(Math.atan2(dx, dz), e.face)); if (a < 1.3) { e.hitPlayer = true; damagePlayer(c.dmgSwipe, e, e.atkId); } }
      if (e.t <= 0) { if (!e.combo && Math.random() < (e.boss ? 0.75 : 0.55)) { e.combo = true; e.st = 'swipeWU'; e.t = 0.28; ring(e.x + Math.sin(e.face) * 1.2, e.z + Math.cos(e.face) * 1.2, 0.5, 0.28, 0xd04020); } else { e.combo = false; e.st = 'recover'; e.t = e.boss ? 0.45 : 0.55; } } break;
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
  let sp = 5.6 * (P.curse && P.curse.on ? 0.5 : 1); if (P.st === 'attack') sp = 2; if (P.st === 'heavy') sp = 0.8; if (P.st === 'hurt') sp = 0;
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
function startAttack(heavy) { const tgt = nearestEnemy(4.5); if (tgt) { P.face = Math.atan2(tgt.x - P.x, tgt.z - P.z); const d = Math.hypot(tgt.x - P.x, tgt.z - P.z), want = (tgt.r || 0.4) + 1.1; if (d > want && d < 3.6 && !tgt.cfg) { const k = Math.min(d - want, 1.6) / d; P.x += (tgt.x - P.x) * k; P.z += (tgt.z - P.z) * k; collide(P, P.r, false); } }
  P.st = heavy ? 'heavy' : 'attack'; P.t = heavy ? 0.8 : 0.32; P.hitAt = heavy ? 0.35 : 0.2; P.hitDone = false; P.atkId = 'pa' + (++P.atkSeq); sfx.play(heavy ? 'heavy' : 'swing', 1); input.rumble(0.2, heavy ? 0.5 : 0.1, 60); }
function nearestEnemy(r) { let b = null, bd = r; for (const e of [charger, custode, ...door.mites, ...swarm.filter((m) => m.room === S.room)]) { if (!e.alive || e.st === 'dead') continue; const d = dist(P, e); if (d < bd) { bd = d; b = e; } } return b; }
function inArc(o, range, arc) { const dx = o.x - P.x, dz = o.z - P.z, d = Math.hypot(dx, dz); if (d > range) return false; return d < 0.6 || Math.abs(angDiff(Math.atan2(dx, dz), P.face)) < arc; }
function doHit(heavy) {
  const range = heavy ? 2.4 : 1.9, arc = heavy ? 1.1 : 0.95; let any = false;
  trail.position.set(P.x, 0.05, P.z); trail.rotation.z = P.face - Math.PI / 2; trail.material.opacity = heavy ? 0.85 : 0.6; trail.scale.setScalar(heavy ? 1.25 : 1);
  if (heavy) { particles.burst(P.x + Math.sin(P.face) * 1.5, 0.2, P.z + Math.cos(P.face) * 1.5, 16, 3); traces.add(P.x + Math.sin(P.face) * 1.6, P.z + Math.cos(P.face) * 1.6, 0.6, 1, now); }
  for (const e of [charger, custode]) {
    if (!e.alive || e.st === 'dead' || !inArc(e, range + e.cfg.r * 0.6, arc)) continue; any = true;
    const g = !heavy ? ink.hit(P.atkId) : 0; if (g && PROG.skills.well) ink.v = Math.min(100, ink.v + Math.round(g * 0.5)); if (g) popInk('+' + g); Tele.log('hit', { target: e.id, heavy });
    if (e.armorBroken && e.exposed > 0) { coreHit(e); continue; }
    const fr = grammar.has(e.id, 'state.fragile'), combo = fr && grammar.has(e.id, 'temperament.cautious');
    if (heavy && !e.armorBroken && (combo || (fr && (e.st === 'stun' || e.st === 'recover')))) { e.armorHP -= (combo ? 6 : 5) * nibMul(); sfx.play('hit'); S.hitstop = 0.1; particles.burst(e.x, 1.2, e.z, 16, 5, [0.85, 0.78, 0.62], 0.18); if (e.armorHP <= 0) breakArmor(e, 'fragile'); continue; }
    const vuln = e.st === 'stun' || e.st === 'recover' || e.st === 'windup' || e.st === 'swipeWU';
    if (vuln && !e.armorBroken) { e.armorHP -= (heavy ? 3 : 1) * nibMul(); sfx.play('hit'); S.hitstop = heavy ? 0.09 : 0.05; particles.burst(e.x, 1.2, e.z, 10, 4, [0.85, 0.78, 0.62], 0.15);
      if (e.armorHP <= 0) breakArmor(e, 'action'); }
    else { sfx.play('deny'); particles.burst(e.x, 1.3, e.z, 4, 2, [0.9, 0.85, 0.7], 0.1); toastSmall('La corazza è integra: attendi un varco'); dmgAt(e.x, (e.mesh.userData.height || 1.6) + 0.3, e.z, 'PARATO', 'block'); }
    const dx = e.x - P.x, dz = e.z - P.z, l = Math.hypot(dx, dz) || 1; if (e.st !== 'charge') { e.vx += dx / l * (heavy ? 4 : 1.5); e.vz += dz / l * (heavy ? 4 : 1.5); }
  }
  for (const m of [...door.mites, ...swarm]) if (m.alive && inArc(m, range + 0.7 + (m.r || 0.3), arc + 0.7)) { if (m.boss) { const dmg = (heavy ? 4 : 1) * nibMul(); m.hp -= dmg; any = true; sfx.play('hit'); S.hitstop = 0.06; particles.burst(m.x, 0.9, m.z, 12, 4); dmgAt(m.x, 2.4, m.z, '-' + Math.round(dmg * 10), heavy ? 'big' : ''); m.hitT = 0.15; if (m.hp > 0) continue; }
    if (!heavy && m.hp > 1) { m.hp--; any = true; sfx.play('hit'); const kx = m.x - P.x, kz = m.z - P.z, kl = Math.hypot(kx, kz) || 1; m.x += kx / kl * 1.2; m.z += kz / kl * 1.2; collide(m, m.r, false); particles.burst(m.x, 0.4, m.z, 8, 3); continue; } m.alive = false; miteDrop(m); any = true; sfx.play('hit'); particles.burst(m.x, 0.4, m.z, 18, 4); traces.add(m.x, m.z, 0.8, 0, now); scene.remove(m.mesh); const g = !heavy ? ink.hit(P.atkId) : 0; if (g && PROG.skills.well) ink.v = Math.min(100, ink.v + Math.round(g * 0.5)); if (g) popInk('+' + g); }
  if (!board.broken && dist(P, board) < 2.4 && heavy) { if (grammar.has('board', 'state.fragile')) breakBoard(); else { sfx.play('deny'); toastSmall('La tavola è integra. Il libro dice: integra.'); } any = true; }
  if (!relay.broken && dist(P, relay) < 2.2 && heavy && !S.doorRoute && !door.defense) { if (grammar.has('relay', 'state.fragile')) forceRelay(); else { sfx.play('deny'); toastSmall('Il supporto del relè regge'); } any = true; }
  if (heavy && trySecretsOnHeavy()) any = true;
  if (ch2Hit(heavy, range, arc)) any = true;
  if (any) input.rumble(0.3, heavy ? 0.7 : 0.3, 80);
}
function coreHit(e) {
  sfx.play('break'); S.hitstop = 0.15; S.flash = 0.35; S.shake = 1; particles.burst(e.x, 1.5, e.z, 50, 7, [0.6, 0.1, 0.06], 0.2); traces.add(e.x, e.z, 2.5, 0, now); input.rumble(1, 1, 300);
  if (!e.boss) { e.st = 'dead'; e.alive = false; e.dying = 0; grammar.resetPhrase(e.id); Tele.log('enemy_defeated', { id: e.id }); endEncounter('charger'); openGate('r1'); gainDrops(10); toast('IL CARICATORE SI SCIOGLIE'); journal('Hai trasferito FRAGILE dalla tavola al Caricatore.'); hint(''); }
  else if (!arena.snapped) { arena.snapped = true; S.plan = e.brokenBy === 'action' ? 'azione' : 'rottura'; e.exposed = 0; e.st = 'stun'; e.t = 4; toast('LEGAME SPEZZATO'); hint(ST.HINTS.seal); Tele.log('arena_plan', { plan: S.plan }); }
}

// ---------- interazioni ----------
function interactables() {
  const L = [];
  if (S.room === 'intro' && !board.broken && !S.discovered.has('state.fragile')) L.push({ x: 0, z: -8.8, r: 2.6, label: 'guarda', fn: () => { S.discovered.add('state.fragile'); const g = ink.interact(); Tele.log('interact', { what: 'board', gain: g }); sfx.play('page');
    say([['narr', 'Una goccia ha morso la tavola. Sotto la parola INTEGRA si vede un\'altra parola, più vecchia.'], ['narr', 'FRAGILE.']], { done: () => hint(ST.HINTS.firstRewrite) }); journal('Hai trovato la parola FRAGILE sotto INTEGRA.'); } });
  for (const [id, sp] of Object.entries(secretPages)) L.push({ x: sp.x, z: sp.z, r: 2.1, label: 'leggi', fn: () => foundSecret(id, ST.SECRET_TEXT[id]) });
  if (false) L.push({ x: -6.5, z: -39.3, r: 1.6, label: 'prendi', fn: () => { door.hasDoc = true; docM.userData.paper.visible = false; ink.interact(); sfx.play('page'); Tele.log('interact', { what: 'evidence' });
    say([['narr', 'Una testimonianza piegata in quattro. In fondo, una firma che non è quella del relè.']]); journal('Hai preso la prova dal corridoio.'); } });
  if (S.room === 'door' && door.hasDoc && !door.docPlaced && !S.doorRoute) L.push({ x: -3.8, z: -98.8, r: 1.7, label: 'inserisci', fn: () => { door.docPlaced = true; ink.interact(); sfx.play('page'); Tele.log('interact', { what: 'reader' }); hint('La prova è nel lettore. Il relè pulsa già: dai alla piastra una strada'); } });
  if (S.room === 'door' && !S.doorRoute && !door.defense) L.push({ x: 0, z: -97.8, r: 2.0, label: 'parla', fn: talkElara });
  if (S.room === 'arena' && (arena.snapped || arena.window > 0) && !S.victory) L.push({ x: 0, z: -136.4, r: 1.8, label: 'tocca', fn: touchSeal });
  cryptInteractables(L); ch2Interactables(L); mazeInteractables(L); v16Interactables(L);
  return L;
}
function nearestInteract() { let b = null, bd = 1e9; for (const it of interactables()) { const d = Math.hypot(P.x - it.x, P.z - it.z); if (d < it.r && d < bd) { bd = d; b = it; } } return b; }
function interact() { const it = nearestInteract(); if (dlg.active && (S.lock || dlg.opt.choices || !it)) { dlgNext(); return; } if (it) { if (dlg.active) endDialog(); it.fn(); } }
function talkElara() {
  const L = ST.elaraDoor(mem).slice(); L.push(['elara', 'Se vuoi passare senza strappare niente, difendimi mentre riscrivo la mia riga. Trenta secondi.']);
  say(L, { choices: [['Affidati a Elara', () => startDefense()], ['Non ora', () => {}]] });
}
function startDefense() { door.defense = { t: 55, spawn: 1 }; S.encounter = 'defense'; ink.encounterEnd(); Tele.log('encounter_start', { id: 'defense' }); toast('DIFENDI ELARA · 55'); sfx.tension(true); $('inkWrap').classList.remove('safe'); }
function touchSeal() {
  if (S.victory) return; S.victory = true; for (const m of swarm) if (m.alive && m.room === 'arena') { m.alive = false; scene.remove(m.mesh); particles.burst(m.x, 0.3, m.z, 10, 3); } if (!S.plan) S.plan = arena.windowPlan || 'controllo';
  Tele.log('arena_plan', { plan: S.plan, final: true }); sfx.play('seal'); S.flash = 0.8; endEncounter('arena'); journal('Il Custode è caduto con il piano: ' + ST.PLAN_TEXT[S.plan] + '.');
  custode.st = 'dead'; custode.dying = 0; tether.visible = false; closePanel(); setTimeout(() => goEnd(), FAST ? 300 : 1800);
}
function breakBoard() { board.broken = true; grammar.get('board').broken = true; openGate('board'); sfx.play('tear'); sfx.play('break'); S.shake = 0.6; S.flash = 0.2; input.rumble(0.8, 1, 200);
  board.mesh.visible = false; for (let i = 0; i < 50; i++) particles.emit(rnd(-1.2, 1.2), rnd(0.2, 1.6), -5, rnd(-3, 3), rnd(1, 5), rnd(-4, 1), rnd(1, 2), rnd(0.15, 0.32), 0.8, 0.7, 0.54, 10);
  traces.add(0, -10, 2.5, 3, now); S.tracePos.push([0, -10]); Tele.log('board_break'); journal('La tavola si è rotta: la prima riscrittura ha cambiato il mondo.'); hint(''); }
function forceRelay() { relay.broken = true; grammar.get('relay').broken = true; relay.mesh.userData.sup.visible = false; relay.mesh.userData.box.position.y = 0.3; relay.mesh.userData.box.rotation.z = 0.7;
  sfx.play('break'); sfx.play('tear'); S.shake = 0.8; elara.userData.st.torn = true; elara.userData.st.eyes = 215; elara.userData.st.mouth = -14; elara.userData.redraw(); setRoute('forced'); }
function setRoute(r) {
  if (S.doorRoute) return; S.doorRoute = r; openGate('door'); door.open = 0; Tele.log('door_route', { door_route: r }); journal(ST.ROUTE_TEXT[r]); sfx.tension(false);
  traces.add(0, -98.4, 2.6, r === 'forced' ? 3 : 0, now); S.tracePos.push([0, -98.4]);
  const L = { forced: [['elara', 'Hai strappato la pagina invece di leggerla. Lo ricorderò.']], evidence: [['elara', 'La prova. Il verdetto si spegne. Questa riga la tengo io.']], trust: [['elara', 'Fatto. Ho una riga mia, adesso. Vai: ti seguo con lo sguardo.']] }[r];
  say(L); hint('');
}

// ---------- Parole Fluttuanti (S3) ----------
const panel = { open: false, target: null, cands: [], words: [], sel: 0, els: [], wasFaded: false };
function zoneSafe() { const r = W.ROOMS.find((x) => x.id === S.room); if (!r) return true; if (S.room === 'door') return !door.defense; return r.safe; }
function visibleWords(id) { return grammar.supported(id).filter((w) => S.discovered.has(w)); }
function candidates() {
  const L = []; for (const e of Object.values(ENT)) { if (!e.type || e.alive === false || e.st === 'dead' || e.broken) continue; if (e.id === 'well' && !board.broken) continue;
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
    if (opts.panel && !isR) b.textContent = { state: 'Stato · ', temperament: 'Temperamento · ', element: 'Elemento · ', weight: 'Peso · ' }[EFFECTS[w].slot] + EFFECTS[w].word;
    b.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); ev.preventDefault(); if (!ink.canSelect()) return; selectWord(i); confirmWord(); });
    b.addEventListener('pointerenter', (ev) => { if (ev.pointerType === 'mouse' && ink.canSelect()) selectWord(i); }); b.addEventListener('focus', () => { if (ink.canSelect()) selectWord(i); });
    b.addEventListener('pointerenter', () => { if (input.mode === 'kb' && ink.canSelect() && panel.sel !== i) selectWord(i); });
    box.appendChild(b); panel.els.push(b); });
  $('words').classList.remove('hidden'); $('words').classList.toggle('sidePanel', !!opts.panel); $('wordTarget').textContent = grammar.get(e.id).def.name + (panel.cands.length > 1 ? '  ▲▼' : '');
  panel.sel = clamp(panel.sel, 0, panel.words.length - 1); selectWord(panel.sel, true);
  $('wordHelp').textContent = input.mode === 'touch' ? 'tocca una parola per scriverla · ✎ per chiudere' : input.mode === 'pad' ? '◀ ▶ parola · ▲ ▼ bersaglio · A scrivi · B chiudi' : '◀ ▶ parola · ▲ ▼ bersaglio · Invio scrivi · Esc chiudi';
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
    if (e.id === 'bridge') { addPv(new THREE.PlaneGeometry(25.5, 5).rotateX(-Math.PI / 2), 0x3fc1ff, 0.12, 0, 0.03, -132.4); addPv(new THREE.PlaneGeometry(2.4, 4.6).rotateX(-Math.PI / 2), 0xd04020, 0.3, -13.2, 0.12, -119.2); }
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
  if (!PROG.skills.nib2 && grammar.active(e.id).some((a) => EFFECTS[a].slot !== EFFECTS[w].slot)) { sfx.play('deny'); toastSmall('Due parole insieme: serve il Pennino d\'acciaio (✦)'); return false; }
  if (e.boss && C3.shieldT > 0 && w === C3.shieldWord) { sfx.play('deny'); toastSmall('«Conosco quel tratto.» Il Custode ha già letto ' + EFFECTS[w].word + ': usa un\'altra parola o il gommino'); dmgAt(e.x, 3.4, e.z, 'IMMUNE', 'block'); return false; }
  if (e.id === 'mzbridge' && MZ.boss && MZ.boss.alive) { sfx.play('deny'); toastSmall('Il Copista sorveglia il vuoto: prima sconfiggilo'); return false; }
  S.wordUse[w] = (S.wordUse[w] || 0) + 1;
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
  if (z === 'door') { door.hasDoc = ex.hasDoc; door.docPlaced = ex.docPlaced;  }
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
    if (grammar.has('plate', 'element.conductive')) { pulseWire(wireB); pulseWire(wireC, 0xffb070); particles.burst(7.8, 0.9, -61.6, 10, 2, [1, 0.6, 0.2], 0.15);
      if (!gates.r2.open && !PROG.mazeDone) mazeHintPulse(); if (!gates.r2.open && PROG.mazeDone) { openGate('r2'); Tele.log('device', { what: 'r2_gate' }); journal('Hai dato una strada all\'impulso: CONDUTTIVO non crea energia, la trasporta.'); toast('IL CANCELLO SI APRE'); hint(''); } } }
  // IV: il relè del giudizio pulsa ogni 3 s
  door.relayT += dt; if (door.relayT > 3) { door.relayT = 0; if (!relay.broken) { pulseWire(wireD, 0xff5530); setU(relayBoxMats, 'uGlow', new THREE.Color(0.6, 0.1, 0.05)); setTimeout(() => setU(relayBoxMats, 'uGlow', BLACK), 250);
      if (grammar.has('evplate', 'element.conductive')) { pulseWire(wireE); if (door.docPlaced && !S.doorRoute && !door.defense) { elara.userData.st.verdict = ''; elara.userData.st.mouth = 10; elara.userData.st.eyes = 185; elara.userData.redraw(); sfx.play('seal'); setRoute('evidence'); } } } }
  // V: pressa dell'arena (stesso ciclo)
  if (S.room === 'arena' && !S.victory) {
    arena.t += dt; const a = arena.t % arena.period; pressAnim(press2, a);
    const cond = grammar.has('bridge', 'element.conductive');
    if (a > 3 && !arena.warn) { arena.warn = true; if (cond) { ring(-13.2, -119.2, 1.6, 1, 0xd04020); ring(0, -133.2, 0.9, 1, 0x3fc1ff); sfx.play('warn'); } }
    if (arena.t >= arena.period) { arena.t -= arena.period; arena.warn = false; sfx.play('pulse'); S.shake = Math.max(S.shake, 0.2);
      if (cond) { pulseWire(wireF, 0xffb070); arena.hazardT = 0.6; foldPulse(); }
      if (grammar.has('custode', 'element.conductive') && Math.abs(custode.z + 133.2) < 3.2 && custode.st !== 'dead') custodeShock(); } }
  if (arena.hazardT > 0) { arena.hazardT -= dt; hazard.material.uniforms.uGlow.value.setRGB(0.8, 0.25, 0.05); if (P.x < -12 && P.z > -121.6 && P.z < -116.8) damagePlayer(1, null, 'hz' + Math.floor(now)); } else hazard.material.uniforms.uGlow.value.setRGB(0, 0, 0);
  for (const w of [wireA, wireB, wireC, wireD, wireE, wireF]) if (w.userData.flash > 0) { w.userData.flash -= dt; if (w.userData.flash <= 0) for (const m of w.userData.segs) m.material.color.set(0x3a2a20); }
}
function foldPulse() { // la piega laterale del ponte sposta il Custode; il ramo secondario alimenta il pericolo
  sfx.play('electric'); for (let x = -12; x <= 12; x += 1.2) particles.emit(x, 0.3, -133.2, 0, rnd(1, 3), rnd(-1, 1), 0.5, 0.2, 0.25, 0.75, 1, 3);
  if (Math.abs(P.z + 133.2) < 1.6 && Math.abs(P.x) < 12.4) { P.vx += 10; damagePlayer(1, { x: P.x - 1, z: P.z }, 'fold' + Math.floor(now)); }
  const c = custode; if (c.alive && c.st !== 'dead' && c.z < -130 && c.z > -136.6 && Math.abs(c.x) < 13.6) {
    const dirX = c.x > 3 ? -1 : 1; c.push = { x: dirX * 8, z: 1.6, t: 0.5 }; c.st = 'stun'; c.t = 2.5; c.foldStun = true; S.shake = 0.7; sfx.play('heavy'); toast('LA PIEGA SPOSTA IL CUSTODE'); Tele.log('device', { what: 'fold_push' }); S.attempted.add('ambiente'); }
}
function custodeShock() { const c = custode; c.st = 'stun'; c.t = 1.6; sfx.play('electric'); particles.burst(c.x, 1.6, c.z, 20, 4, [0.25, 0.75, 1], 0.15); if (dist(P, c) < 2) damagePlayer(1, c, 'shock' + Math.floor(now));
  if (grammar.has('custode', 'state.fragile') && !c.armorBroken) breakArmor(c, 'fragile'); }
function arenaUpdate(dt) {
  const c = custode; const d = Math.hypot(c.x, c.z + 124);
  const eligible = (grammar.has('custode', 'temperament.cautious') || c.foldStun) && !arena.snapped && c.st !== 'dead';
  if (eligible && d > 2.5 && c.st !== 'charge') { arena.loosenT += dt; if (arena.loosenT >= 0.4 && arena.window <= 0) { arena.window = 5; arena.windowPlan = c.foldStun ? 'ambiente' : 'controllo'; S.arenaProgress = true; toast('IL LEGAME SI ALLENTA'); hint(ST.HINTS.seal); sfx.play('tear'); Tele.log('tether_loosened', { plan: arena.windowPlan }); } }
  else arena.loosenT = 0;
  if (arena.window > 0) { arena.window -= dt; if (arena.window <= 0 && !S.victory && !arena.snapped) { hint(ST.HINTS.arena); toastSmall('Il legame si richiude'); } }
  const open = arena.snapped || arena.window > 0; const len = Math.hypot(c.x, c.z + 124);
  tether.visible = !arena.snapped && c.st !== 'dead'; tether.position.set(c.x / 2, 1.3, (c.z - 124) / 2); tether.scale.set(open ? 0.4 : 1, Math.max(0.1, len), open ? 0.4 : 1);
  tether.lookAt(c.x, 1.3, c.z); tether.rotateX(Math.PI / 2); tether.material.color.setHex(open ? 0xd8a080 : 0x8a1a10);
  seal.userData.disc.material.uniforms.uGlow.value.setRGB(open ? 0.5 + 0.3 * Math.sin(now * 6) : 0, open ? 0.3 : 0, open ? 0.1 : 0);
  if (open && !S.victory && Math.hypot(P.x, P.z + 136.8) < 1.3) touchSeal();
}

// ---------- stanze, incontri, morte ----------
function roomAt(x, z) { for (const r of W.ROOMS) if (Math.abs(x - r.cx) <= r.w / 2 - 0.3 && Math.abs(z - r.cz) <= r.d / 2 - 0.5) return r; return null; }
function enterRoom(r) {
  if (S.room === r.id) return; const prev = S.room; S.room = r.id; S.roomT = 0; S.lumiHintT = 0; setTimeout(saveGame, 50); P.spawn = { x: r.cx, z: r.cz + r.d / 2 - 1.2 }; $('room').textContent = r.title; toast(r.title.toUpperCase()); Tele.log('section_enter', { section: r.id, t: Math.round(S.time) });
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
  if (S.room === 'door' && door.defense) door.defense.t = Math.min(40, door.defense.t + 8);
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
  if (ghost.plan === 'rottura') { g.position.set(lerp(0, -8.0, Math.min(1, t * 1.6)), 0, lerp(-124, -122, t)); if (t > 0.62) g.userData.armor.visible = Math.sin(ghost.t * 30) > 0; }
  else if (ghost.plan === 'controllo') g.position.set(lerp(0, 7, t), 0, lerp(-122, -115, t));
  else g.position.set(lerp(0, 5, Math.max(0, t * 2 - 1)), 0, -133.2);
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
  { id: 'pick', room: 'intro', pulse: '.bubble', t: { touch: 'Tocca FRAGILE: la scrivi subito sulla tavola', pad: '◀ ▶ scegli la parola · A la scrive · ▲▼ cambia bersaglio', kb: '◀ ▶ scegli la parola · Invio la scrive · ▲▼ cambia bersaglio' }, done: () => grammar.has('board', 'state.fragile'), back: () => !panel.open ? 2 : -1 },
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
function dmgAt(x, y, z, text, cls = '') { const p = toScreen(x, y, z); if (!p.ok) return; const d = document.createElement('div'); d.className = 'dn ' + cls; d.textContent = text; const sd = Math.random() < 0.5 ? -1 : 1; d.style.left = (p.x + sd * rnd(70, 95)) + 'px'; d.style.top = (p.y - 24) + 'px'; $('dmg').appendChild(d); setTimeout(() => d.remove(), 950); }
const CORE = { charger: 2, custode: 4 };
function enemyHP(e) { const core = CORE[e.id]; const coreLeft = e.alive && e.st !== 'dead' && !(e.boss && arena.snapped) ? core : 0; return { v: Math.max(0, e.armorHP) * (e.armorBroken ? 0 : 1) + coreLeft, max: e.armorMax + core }; }
const ebarEl = {};
function rilegBar() { const e = rileg; let el = ebarEl.rileg; if (!el) { el = ebarEl.rileg = document.createElement('div'); el.className = 'ebar'; el.innerHTML = '<div class="lbl">Il Rilegatore</div><div class="hbar"><div class="trail"></div><div class="fill"></div></div>'; $('ebars').appendChild(el); }
  const p = toScreen(e.x, 2.9, e.z); const vis = e.alive && S.room === 'c2b' && p.ok && !S.done; el.style.display = vis ? 'block' : 'none'; if (vis) { el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; setBar(el.querySelector('.hbar'), ((e.armor ? 3 : 0) + Math.max(0, e.hp)) / (3 + e.maxHp)); } }
function healthUpdate(dt) {
  rilegBar();
  for (const e of [charger, custode]) {
    const h = enemyHP(e); if (e.lastHP === undefined) e.lastHP = h.v;
    if (h.v < e.lastHP) { const d = (e.lastHP - h.v) * 10; dmgAt(e.x, (e.mesh.userData.height || 1.6) + 0.4, e.z, '-' + d, d >= 30 ? 'big' : ''); e.hitT = 0.16;
      if (e.st !== 'charge' && e.alive) { const dx = e.x - P.x, dz = e.z - P.z, l = Math.hypot(dx, dz) || 1; e.vx += dx / l * 5; e.vz += dz / l * 5; } }
    e.lastHP = h.v;
    if (e.hitT > 0) { e.hitT -= dt; setU(e.mats, 'uHit', Math.max(0, e.hitT / 0.16) * 0.85); if (e.hitT <= 0) setU(e.mats, 'uHit', 0); }
    const inRoom = S.room === (e.boss ? 'arena' : 'charger') && S.phase === 'play' && !S.done;
    if (e.boss) { const show = inRoom && !S.victory && S.roomT > 2.6; if (S.room === 'c2d') continue; $('bossBar').classList.toggle('hidden', !show); if (show) setBar($('bossBar').querySelector('.hbar'), h.v / h.max); continue; }
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
    case 'archive': return !gates.arch.open ? 'Obiettivo: fai suonare la campana fino allo scaffale-cancello (il tubo è isolante…)' : !AR.done ? 'Obiettivo: leggi il leggio in fondo all\'archivio · poi risali la scala' : 'Obiettivo: risali la scala e torna alla pressa';
    case 'c2a': return !S.discovered.has('weight.heavy') ? 'Obiettivo: leggi la pagina fradicia sul leggio' : !C2.crateDone ? 'Obiettivo: scrivi PESANTE sulla cassa sulla piastra' : 'Obiettivo: prosegui verso nord';
    case 'c2b': return !S.discovered.has('weight.light') ? 'Obiettivo: leggi il leggio annegato' : !C2.raftUp ? 'Obiettivo: fai riaffiorare la zattera (LEGGERO) per attraversare il canale' : rileg.alive ? 'Obiettivo: ferma il Rilegatore prima che ricucia la zattera' : 'Obiettivo: attraversa il canale verso nord';
    case 'c2c': return !C2.pileDown ? 'Obiettivo: abbatti la pila di libri (una combinazione la fa crollare da sola)' : 'Obiettivo: prosegui verso la diga';
    case 'c2d': return C2.boss && C2.boss.done ? 'Obiettivo: attraversa la diga rotta' : (C2.boss && C2.boss.phase === 2) ? 'Obiettivo: rendi il cuore FRAGILE o CONDUTTIVO e colpiscilo' : 'Obiettivo: fai cadere i 3 pesi sulle ancore (PESANTE)';
    case 'c2e': return 'Obiettivo: raggiungi Elara in fondo alla stanza';
  } return '';
}
function phase2Update(dt) {
  if (S.room !== 'arena' || !arena.snapped || S.victory || !custode.alive) { arena.p2 = false; return; }
  if (!arena.p2) { arena.p2 = true; arena.p2T = 1.2; toast('IL CUSTODE · FASE 2'); $('bossBar').querySelector('.bname').textContent = 'FASE 2 · LEGAME SPEZZATO — TOCCA IL SIGILLO'; S.shake = 0.8; Tele.log('boss_phase', { phase: 2 }); }
  arena.p2T -= dt; if (arena.p2T <= 0 && !S.lock) { arena.p2T = 2.3; const x = P.x, z = P.z; sfx.play('warn');
    ring(x, z, 1.6, 0.9, 0x8a1a10, () => { sfx.play('heavy'); particles.burst(x, 0.3, z, 18, 4, [0.1, 0.05, 0.04], 0.18); traces.add(x, z, 1.2, 0, now); if (Math.hypot(P.x - x, P.z - z) < 1.6) damagePlayer(1, { x, z }, 'wave' + (++attackCounter)); }); }
}
function lightsUpdate() {
  const t = performance.now() / 1000; const px = P.x, pz = P.z;
  const near = storyLights.map((l) => [l, (l.x - px) ** 2 + (l.z - pz) ** 2]).sort((a, b) => a[1] - b[1]).slice(0, 11).map((a) => a[0]);
  const PL = INK_UNIFORMS.uPL.value, PC = INK_UNIFORMS.uPC.value;
  for (let i = 0; i < 12; i++) { PL[i].set(0, -99, 0, 1); PC[i].set(0, 0, 0); }
  near.forEach((l, i) => { const f = l.kind === 'lamp' ? 1 + Math.sin(t * 2 + l.ph) * 0.03 : 0.85 + Math.sin(t * 13 + l.ph) * 0.08 + Math.sin(t * 7.1 + l.ph * 2) * 0.07; PL[i].set(l.x, l.y, l.z, l.r * 1.35 * f); PC[i].set(l.col[0] * f, l.col[1] * f, l.col[2] * f);
    const u = l.m.userData; u.glow.scale.setScalar((l.kind === 'lamp' ? 1.6 : 0.9) * f); if (l.kind === 'candle') u.flame.scale.set(1, 2.2 * f, 1); });
  // la penna del giocatore è sempre una piccola luce d'inchiostro
  const q = P.mesh.userData.nibWorld; if (q) { P.mesh.userData.nib.getWorldPosition(q); PL[11].set(q.x, q.y, q.z, panel.open ? 3.2 : 1.8); const k = panel.open ? 1.4 : 0.6; PC[11].set(1.0 * k, 0.25 * k, 0.15 * k); P.mesh.userData.nibGlow.scale.setScalar(panel.open ? 0.6 : 0.3 + Math.sin(t * 4) * 0.05); if (frame % 75 === 0 && S.phase === 'play') particles.emit(q.x, q.y, q.z, 0, -0.5, 0, 1.4, 0.08, 0.45, 0.06, 0.04, 9); }
}
function lumiGuide(dt) {
  S.roomT += dt; if (S.lock || dlg.active || S.done) return;
  if (S.room === 'intro' && board.broken && S.roomT > 25 && !S.lumiSecretHint && (!trap.open || !wellEnt.broken)) { S.lumiSecretHint = true; showLumiTip('Lumi: "Il pavimento segnato a matita suona vuoto… e il calamaio di Ilde sembra incrinato."'); return; }
  if (S.roomT > 90 && S.roomT - S.lumiHintT > 45) { S.lumiHintT = S.roomT; const g = goalText().replace('Obiettivo: ', ''); if (g) showLumiTip('Lumi: "' + g + '"'); }
}
function showLumiTip(t) { hint(t); sfx.play('voice'); Tele.log('lumi_tip', { room: S.room }); }
function hudUpdate(dt) {
  tutUpdate(dt); healthUpdate(dt); lumiGuide(dt); lightsUpdate(); phase2Update(dt); trapUpdate();
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
  startOpening();
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
function setupTitle() {
  if (pendingChapter === 2) setTimeout(() => { $('title').classList.add('hidden'); startGame(); }, 400);
  const sv = loadSave(); const rn = sv && W.ROOMS.find((r) => r.id === sv.room);
  $('bContinue').classList.toggle('hidden', !sv); if (sv) $('bContinue').textContent = 'Continua · Cap. 1 · ' + (rn ? rn.title : '');
  $('bContinue').onclick = () => { if (S.phase !== 'title') return; pendingSave = loadSave(); startGame(); };
  $('bChapters').onclick = () => { renderChapters(); $('chapters').classList.remove('hidden'); $('title').classList.add('hidden'); };
  $('chClose').onclick = () => { $('chapters').classList.add('hidden'); $('title').classList.remove('hidden'); };
}
const CHAPTERS = [['I', 'La tavola', 'FRAGILE · CAUTO · CONDUTTIVO'], ['II', 'Il fiume di carta', 'PESANTE · LEGGERO'], ['III', 'L\'incendio del frontespizio', 'CIECO · ARDENTE'], ['IV', 'L\'orologio di Ilde', 'LENTO · LEGATO'], ['V', 'La pagina bianca', 'NON SCRITTO']];
function renderChapters() {
  const ch = mem.chapters || {}; $('chList').innerHTML = CHAPTERS.map(([n, t, w], i) => { const done = ch[i + 1] && ch[i + 1].done; const open = i === 0 || (C2_READY && i === 1 && ch[1] && ch[1].done);
    return `<button class="chap ${open ? '' : 'locked'}" data-ch="${i + 1}" ${open ? '' : 'disabled'}><b>Capitolo ${n}</b> · ${t}<small>${open ? (done ? '✔ completato · pagine nascoste ' + ch[i + 1].secrets + '/3' : 'parole: ' + w) : 'in scrittura… (' + w + ')'}</small></button>`; }).join('');
  $('chList').querySelectorAll('.chap:not(.locked)').forEach((b) => b.onclick = () => { $('chapters').classList.add('hidden'); try { localStorage.removeItem(SAVE_KEY); } catch (e) {} if (b.dataset.ch === '2') { pendingChapter = 2; startGame(); } else beginWithIntro(false); });
}
const C2_READY = false;
let pendingSave = null, pendingChapter = sessionStorage.getItem('pal_goto') === 'c2' ? 2 : 0; sessionStorage.removeItem('pal_goto');
function startGame() {
  if (S.phase !== 'title') return;
  $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); sfx.start(); sfx.setVol(opts.vol); sfx.setMusic(opts.mus); S.phase = 'play'; S.lock = true; renderHP();
  if (isTouch) input.mode = 'touch'; Tele.log('session_start', { runs: mem.runs });
  for (const [x, z] of (mem.traces || [])) traces.add(x, z, rnd(0.8, 1.6), 3, -100); // le cancellature delle versioni precedenti
  if (pendingChapter === 2) { pendingChapter = 0; tut.on = false; startChapter2(); return; }
  if (!pendingSave) resetProg(); applySkills(); renderSkills();
  if (pendingSave) { restoreSave(pendingSave); tut.on = false; $('bossBar').querySelector('.bname').textContent = 'IL CUSTODE DELLA FENDITURA'; enterRoom(W.ROOMS[ROOM_ORDER.indexOf(pendingSave.room)] || W.ROOMS[0]); pendingSave = null; S.lock = false; return; }
  enterRoom(W.ROOMS[0]); tut.on = !mem.tutDone; tut.i = 0; tut.t = 0; tut.sx = P.x; tut.sz = P.z;
  say(ST.introLines(mem), { done: () => { S.lock = false; inkDrop(); } });
}
function controlsCard() {
  const d = document.createElement('div'); d.id = 'controls';
  d.innerHTML = input.mode === 'pad' ? '<b>Stick</b> muovi · <b>A</b> guarda/conferma · <b>X</b> colpo · <b>Y</b> colpo forte · <b>B</b> schiva<br><b>RB</b> riscrivi · <b>LB</b> riapplica l\'ultima parola · <b>Select</b> ripristina frase'
    : input.mode === 'touch' ? '<b>Trascina a sinistra</b> per muoverti · <b>◉</b> guarda quando appare<br><b>✎</b> riscrivi · tocca una parola per scriverla' : '<b>WASD</b> muovi · <b>E</b> guarda · <b>J</b>/clic colpo · <b>K</b>/clic destro forte · <b>Spazio</b> schiva<br><b>Q</b> riscrivi · <b>R</b> riapplica · <b>T</b> ripristina · <b>Y</b> ricomponi';
  document.body.appendChild(d); setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 900); }, FAST ? 300 : 6500);
}
function inkDrop() { if (!tut.on) controlsCard();
  for (let i = 0; i < 6; i++) setTimeout(() => particles.emit(0.3 + rnd(-0.05, 0.05), 4, -4.75, 0, -2, 0, 1.2, 0.3, 0.03, 0.02, 0.02, 9), i * 90);
  setTimeout(() => { sfx.play('tear'); traces.add(0.6, -8.6, 1, 0, now); S.shake = 0.3; if (S.room === 'intro' && !S.discovered.has('state.fragile')) hint(ST.HINTS.look); }, 900);
}
function goEnd() {
  const r = W.ROOMS[5]; S.lock = true; $('fade').style.opacity = 1;
  setTimeout(() => { P.x = 0; P.z = r.cz + 1.5; P.face = Math.PI; camera.position.set(0, 14, P.z + 11); $('fade').style.opacity = 0; enterRoom(r); lumi.on = true; lumi.mesh.visible = true; lumi.x = 2; lumi.z = -82;
    const rem = W.makeCustode(); rem.scale.setScalar(0.6); rem.position.set(5.6, 0, -165.6); rem.rotation.y = -0.5; rem.userData.armor.visible = !custode.armorBroken; scene.add(rem);
    if (S.doorRoute === 'forced') { elara2.userData.st.seam = true; elara2.userData.redraw(); }
    say(ST.consequence(S, mem).concat([['narr', 'Elara si volta. La sua schiena si stacca come carta vecchia, e sotto c\'è un tratto più antico.'], ['lumi', 'Quel tratto… lo conosco. L\'ho fatto io, la prima volta che ho riprovato.'], ['narr', 'Poi, per un momento, il libro tace. Nessuno insegue nessuno.']]), { done: endingPage }); elara2.userData.st.torn = true; elara2.userData.redraw(); }, FAST ? 50 : 700);
}
function finish() {
  S.done = true; S.lock = false; Tele.log('slice_complete', { t: Math.round(S.time), door_route: S.doorRoute, plan: S.plan, deaths: S.deaths }); Tele.flush();
  mem.chapters = mem.chapters || {}; mem.chapters[1] = { done: true, secrets: Math.max(chapSecrets(1).filter((k) => S.secrets.has(k)).length, (mem.chapters[1] && mem.chapters[1].secrets) || 0) }; try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  mem.runs++; mem.routes.push(S.doorRoute); mem.plans.push(S.plan); mem.traces = S.tracePos.slice(-60); ST.saveMem(mem);
  $('jList').innerHTML = S.journal.map((j) => `<p>${j.text}</p>`).join('') + `<p><b>Strada della porta:</b> ${ST.ROUTE_TEXT[S.doorRoute] || '—'}<br><b>Piano contro il Custode:</b> ${ST.PLAN_TEXT[S.plan] || '—'}<br><b>Macchie lasciate:</b> ${S.deaths}<br><b>Pagine nascoste:</b> ${chapSecrets(1).filter((k) => S.secrets.has(k)).length}/3</p>${C2_READY ? '<p><button class="pbtn big" id="bToC2">Capitolo II ▸</button></p>' : ''}<p class="small">Rigioca: le pagine ricorderanno questa versione.</p>`;
  { const b2 = $('bToC2'); if (b2) b2.onclick = () => { sessionStorage.setItem('pal_goto', 'c2'); location.reload(); }; }
  $('journal').classList.remove('hidden'); $('journal').querySelector('h2').textContent = 'Fine del frammento'; $('journal').querySelector('[data-close]').textContent = 'Riscrivi di nuovo';
}

// ---------- menu ----------
let paused = false;
function togglePause() { if (S.phase !== 'play') return; paused = !paused; $('pause').classList.toggle('hidden', !paused); if (paused) closePanel(); Tele.log(paused ? 'pause' : 'resume'); }
function applyOpts() { document.body.classList.toggle('contrast', !!opts.contrast); document.body.classList.toggle('big', !!opts.big); post.comp.uniforms.reduce.value = opts.reduce ? 1 : 0; INK_UNIFORMS.uContrast.value = opts.contrast ? 1 : 0; }
function bindUI() {
  $('bStart').onclick = () => beginWithIntro(false); $('fSkip').onclick = endFilm; $('fVoice').onclick = () => { voiceOn = !voiceOn; localStorage.setItem('pal_voice', voiceOn ? '1' : '0'); $('fVoice').textContent = voiceOn ? '🔊 Voce' : '🔇 Voce'; if (!voiceOn && window.speechSynthesis) speechSynthesis.cancel(); else speak($('fSub').textContent); }; $('bReplayIntro').onclick = () => beginWithIntro(true); setupTitle(); if (!mem.runs) $('bReplayIntro').classList.add('hidden'); $('tMem').textContent = mem.runs ? `Versioni già riscritte: ${mem.runs}. Il libro se ne ricorda.` : '';
  input.bindTouch($('stickZone'), $('stickKnob'), $('stickBase'), { attack: $('tAttack'), heavy: $('tHeavy'), dodge: $('tDodge'), rewrite: $('tRewrite'), erase: $('tErase'), quick: $('tQuick'), interact: $('tInteract'), reset: $('tReset') });
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
  playerUpdate(sdt); aiUpdate(charger, sdt); aiUpdate(custode, sdt); devicesUpdate(sdt); if (S.room === 'arena') arenaUpdate(sdt); defenseUpdate(sdt); ch2Update(sdt);
  for (const e of [charger, custode]) { if (!e.alive || e.st === 'dead' || e.st === 'charge' || P.st === 'dodge') continue; const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz), rr = P.r + e.cfg.r; if (d < rr && d > 1e-4) { const k = (rr - d) / d; P.x += dx * k * 0.7; P.z += dz * k * 0.7; e.x -= dx * k * 0.3; e.z -= dz * k * 0.3; collide(P, P.r, false); } }
  const r = roomAt(P.x, P.z); if (r && S.phase === 'play' && !S.lock && r.id !== 'end') enterRoom(r);
}
function defenseUpdate(dt) {
  const D = door.defense; if (!D || S.doorRoute) return; D.t -= dt; D.spawn -= dt;
  if (D.spawn <= 0) { D.spawn = (D.t < 25 ? 0.55 : 0.75) + D.t / 55 * 0.6; D.n = (D.n || 0) + 1; const pts = [[-14, -78], [14, -78], [-14, -97], [14, -92]]; const [x, z] = pts[Math.floor(Math.random() * 4)]; const m = W.makeMite(); scene.add(m); m.position.set(x, 0.3, z); const brute = D.n % 4 === 0; if (brute) m.scale.setScalar(1.45); door.mites.push({ mesh: m, x, z, alive: true, r: brute ? 0.4 : 0.3, hp: brute ? 2 : 1, brute, hunter: D.n % 3 === 0, st: 'idle' }); sfx.play('voice', 0.2); }
  for (const m of door.mites) { if (!m.alive) continue; const l = Math.hypot(0 - m.x, -98 - m.z); if (m.hunter && Math.hypot(P.x - m.x, P.z - m.z) < 6) mitePursue(m, P.x, P.z, dt, door.mites); else mitePursue(m, 0, -98, dt * 0.75, door.mites);
    if (l < 1) { m.alive = false; scene.remove(m.mesh); D.bonus = (D.bonus || 0) + 1; if (D.bonus <= 6) D.t = Math.min(40, D.t + 3); traces.add(m.x, m.z, 0.9, 0, now); toastSmall(D.bonus <= 6 ? 'Una macchia raggiunge Elara: +3 s' : 'Elara resiste…'); elara.userData.st.eyes = 210; elara.userData.redraw(); }
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
  if (u.anim) u.anim(now, sp);
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
  elara.userData.page.position.y = 2 + Math.sin(now * 1.3) * 0.04; for (const f of [elaraFig, elaraFig2]) { const u = f.userData; u.body.position.y = 0.06 + Math.sin(now * 1.6) * 0.05; u.orbit.rotation.y = now * 0.35; u.head.rotation.y = Math.sin(now * 0.5) * 0.25; } elara2.userData.page.rotation.y = Math.sin(now * 0.8) * 0.1;
  if (lumi.on) { lumi.x = lerp(lumi.x, P.x + 1.2, 0.03); lumi.z = lerp(lumi.z, P.z + 0.8, 0.03); lumi.mesh.position.set(lumi.x, 1.2 + Math.sin(now * 2) * 0.15, lumi.z); if (frame % 6 === 0) particles.emit(lumi.x, 1.1, lumi.z, rnd(-0.2, 0.2), -0.3, rnd(-0.2, 0.2), 1, 0.12, 0.05, 0.03, 0.04, 3); }
  for (const l of lumiTraces) l.position.y = 0.25 + Math.sin(now * 1.5 + l.position.x) * 0.06;
  for (let i = waves.length - 1; i >= 0; i--) { const w = waves[i]; w.t += rdt; const k = w.t / 0.55; w.m.scale.setScalar(0.3 + k * w.maxR); w.m.material.opacity = 0.85 * (1 - k); if (k >= 1) { scene.remove(w.m); w.m.geometry.dispose(); w.m.material.dispose(); waves.splice(i, 1); } }
  for (let i = warnRings.length - 1; i >= 0; i--) { const w = warnRings[i]; w.life -= dt; w.m.material.opacity = 0.4 + 0.5 * Math.abs(Math.sin(w.life * 20)); w.m.scale.setScalar(1 + (1 - w.life / w.max) * 0.1); if (w.life <= 0) { scene.remove(w.m); w.m.geometry.dispose(); warnRings.splice(i, 1); if (w.onEnd) w.onEnd(); } }
  decor.quill.position.y = 4.6 + Math.sin(now * 0.9) * 0.15; decor.quill.rotation.z = 0.12 + Math.sin(now * 0.6) * 0.04;
  for (const p of world.scraps.children) p.rotation.z = Math.sin(now * 1.2 + p.userData.sw) * 0.08;
  if (frame % 20 === 0) particles.emit(P.x + rnd(-8, 8), rnd(1, 4), P.z + rnd(-8, 4), rnd(-0.1, 0.1), 0.05, rnd(-0.1, 0.1), 4, 0.06, 0.95, 0.85, 0.6, 0); // pulviscolo di luce
  ghostUpdate(dt); particles.update(dt);
  INK_UNIFORMS.uLamp.value.set(lerp(INK_UNIFORMS.uLamp.value.x, P.x, 0.08), 0, lerp(INK_UNIFORMS.uLamp.value.z, S.room === 'arena' ? lerp(P.z, -124, 0.4) : P.z - 1, 0.08)); INK_UNIFORMS.uLampR.value = S.room === 'arena' ? 16 : S.room === 'c2d' ? 11 : S.room === 'intro' ? 13 : S.room === 'maze' ? 14 : 12;
  // camera semi-isometrica stabile
  const focus = panel.open ? 1 : 0; post.comp.uniforms.focus.value = lerp(post.comp.uniforms.focus.value, focus, 0.12); post.comp.uniforms.sbiadito.value = lerp(post.comp.uniforms.sbiadito.value, ink.faded ? 1 : 0, 0.1);
  const portrait = innerWidth < innerHeight; const far = S.room === 'arena' ? 1.12 : 0.96; const dz = ((portrait ? 13 : 11.5) - focus * 2) * far, dy = ((portrait ? 17.5 : 15) - focus * 2.4) * far;
  const cr = W.ROOMS.find((q) => q.id === S.room); const rcx = cr ? cr.cx : 0; let tx = rcx + (P.x - rcx) * 0.85, tz = P.z - 0.6; if (S.room === 'end') { tx = 0; tz = -161; } if (S.room === 'arena') { tx = P.x * 0.6; tz = lerp(P.z, -124, 0.3); }
  camLook.lerp(tmpV.set(tx, 0.8, tz), 1 - Math.pow(0.004, rdt)); camPos.set(camLook.x, camLook.y + dy, camLook.z + dz);
  if (MZ.film) mazeFilmCamera(rdt); else camera.position.lerp(camPos, 1 - Math.pow(0.002, rdt)); const sh = opts.reduce ? 0 : S.shake * S.shake * 0.3; camera.position.x += rnd(-sh, sh); camera.position.y += rnd(-sh, sh); if (!MZ.film) camera.lookAt(camLook);
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
    if (S.phase === 'play') { if (fps < 48) { lowStreak++; if (lowStreak >= 2) { lowStreak = 0; // prima gli effetti, poi (poco) la risoluzione
        if (post.bloom) { post.bloom = false; Tele.log('quality_drop', { bloom: false }); } else if (pr > QL.floor + 0.01) { pr = Math.max(QL.floor, pr - 0.25); resize(); Tele.log('quality_drop', { pr }); } else if (post.rt.samples > 0 && fps < 38) { post.setSamples(0); Tele.log('quality_drop', { msaa: 0 }); } } } else lowStreak = 0; } }
}

// ---------- avvio + agganci di test ----------
resize(); bindUI(); P.mesh.position.set(P.x, 0, P.z); requestAnimationFrame(loop);

// ================= v1.5 · Il labirinto del filo, transizioni animate, Pennino (albero abilità), gommino =================
const PROG_KEY = 'palimpsest_prog_v1';
const PROG = Object.assign({ drops: 0, skills: {}, mazeDone: false }, (() => { try { return JSON.parse(localStorage.getItem(PROG_KEY) || '{}'); } catch (e) { return {}; } })());
function saveProg() { try { localStorage.setItem(PROG_KEY, JSON.stringify(PROG)); } catch (e) {} renderSkills(); }
function resetProg() { PROG.drops = 0; PROG.skills = {}; PROG.mazeDone = false; saveProg(); P.max = 5; }
const SKILLS = [
  { id: 'nib2', name: 'Pennino d\'acciaio', cost: 12, text: 'Colpi sulla corazza +50%. Prepara le parole composte.' },
  { id: 'heart', name: 'Rilegatura doppia', cost: 10, text: 'Vita massima +1 pagina.' },
  { id: 'well', name: 'Calamaio profondo', cost: 8, text: 'Recuperi più Inchiostro da colpi e schivate.' },
  { id: 'nib3', name: 'Pennino d\'oro', cost: 22, req: 'nib2', text: 'Sblocca il GOMMINO: cancella il 25% di vita, carica e velocità di tutti i nemici nella stanza.' },
];
const nibMul = () => (PROG.skills.nib2 ? 1.5 : 1) * (1 + 0.25 * (S.cursed || 0));
function gainDrops(n) { PROG.drops += n; saveProg(); popInk('+' + n + ' gocce'); }
function renderSkills() {
  const any = SKILLS.some((k) => !PROG.skills[k.id] && PROG.drops >= k.cost && (!k.req || PROG.skills[k.req])); $('bSkills').classList.toggle('has', any);
  $('tErase').classList.toggle('hidden', !PROG.skills.nib3 && !P.curse); $('tErase').classList.toggle('cd', ERASE.cd > 0);
  if ($('skills').classList.contains('hidden')) return;
  $('skDrops').textContent = 'Gocce d\'inchiostro: ' + PROG.drops + ' · si raccolgono sconfiggendo le macchie e i nemici';
  $('skList').innerHTML = SKILLS.map((k) => { const own = PROG.skills[k.id], lock = k.req && !PROG.skills[k.req];
    return `<div class="sk ${own ? 'own' : ''} ${lock ? 'lock' : ''}"><div><b>${k.name}</b><p>${k.text}</p></div><button data-sk="${k.id}" ${own || lock || PROG.drops < k.cost ? 'disabled' : ''}>${own ? 'Scritto' : lock ? 'Bloccato' : k.cost + ' gocce'}</button></div>`; }).join('');
  for (const b of $('skList').querySelectorAll('button[data-sk]')) b.onclick = () => buySkill(b.dataset.sk);
}
function buySkill(id) { const k = SKILLS.find((q) => q.id === id); if (!k || PROG.skills[id] || PROG.drops < k.cost) return; PROG.drops -= k.cost; PROG.skills[id] = true; applySkills(); sfx.play('seal'); toast(k.name.toUpperCase()); journal('Il Pennino ricorda: ' + k.name + '.'); saveProg(); }
function applySkills() { P.max = 5 + (PROG.skills.heart ? 1 : 0); if (P.hp > P.max) P.hp = P.max; renderHP(); }
function openSkills() { if (S.phase !== 'play') return; paused = true; $('skills').classList.remove('hidden'); renderSkills(); }
function closeSkills() { $('skills').classList.add('hidden'); paused = false; }
$('bSkills').onclick = openSkills; $('skClose').onclick = closeSkills;
// GOMMINO: −25% a tutte le statistiche dei nemici della stanza (una volta per nemico, ricarica 25 s)
const ERASE = { cd: 0 };
function useEraser() {
  if (P.curse) { const was = P.curse.on; P.curse = null; $('curseTag').classList.add('hidden'); sfx.play('dry'); inkWave(P.x, P.z, 3, 0x3a2a4a); toast(was ? 'HAI CANCELLATO «LENTO»' : 'PAROLA CANCELLATA PRIMA CHE ATTECCHISSE'); if (!PROG.skills.nib3) { renderSkills(); return; } }
  if (custode.alive && S.room === 'arena' && C3.shieldT > 0) { C3.shieldT = 0; toast('GOMMINO · LA LETTURA DEL CUSTODE SI CANCELLA'); }
  if (!PROG.skills.nib3) return; if (ERASE.cd > 0) { sfx.play('deny'); toastSmall('Il gommino è ancora consumato'); return; }
  ERASE.cd = 25; let n = 0; sfx.play('dry'); S.flash = opts.reduce ? 0 : 0.25; inkWave(P.x, P.z, 9, 0x3a2a4a);
  for (const e of [charger, custode]) { if (!e.alive || e.st === 'dead' || roomAt(e.x, e.z) !== roomAt(P.x, P.z) || e.erased) continue; e.erased = true; n++;
    e.armorHP *= 0.75; e.armorMax *= 0.75; const c = e.cfg = { ...e.cfg }; c.speed *= 0.75; c.charge *= 0.75; c.dmgCharge = Math.max(1, Math.round(c.dmgCharge * 0.75)); c.windup *= 1.25; dmgAt(e.x, 2.8, e.z, '−25%', 'big'); }
  for (const m of [...swarm, ...door.mites]) if (m.alive && Math.hypot(m.x - P.x, m.z - P.z) < 14 && !m.erased) { m.erased = true; n++; m.slow = 0.75; m.hp = Math.max(1, Math.floor((m.hp || 1) * 0.75)); m.mesh.scale.multiplyScalar(0.85); }
  toast(n ? 'GOMMINO · ' + n + ' NEMICI CANCELLATI AL 25%' : 'GOMMINO · NESSUNO DA CANCELLARE'); Tele.log('eraser', { n }); renderSkills();
}
// ---- labirinto ----
const MZ = { built: false, active: false, R: W.ROOMS.find((r) => r.id === 'maze'), N: 17, C: 5.2, EX: 8, walls: [], group: new THREE.Group(), lamps: [], planks: [], steps: [], done: false, bridgeT: -1, stairsT: -1, hintT: 0, entryOpen: 0, guide: new Set() };
scene.add(MZ.group); MZ.group.visible = false;
const mzCell = (x, z) => [MZ.R.cx - MZ.R.w / 2 + (x + 0.5) * MZ.C, MZ.R.cz - MZ.R.d / 2 + (z + 0.5) * MZ.C];
function mzRng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
function buildMaze() {
  if (MZ.built) return; MZ.built = true; const { N, C, R } = MZ; const r = mzRng(1977); const x0 = R.cx - R.w / 2, z0 = R.cz - R.d / 2;
  const E = [...Array(N * N)].map(() => ({ n: true, s: true, e: true, w: true })); const vis = new Array(N * N).fill(false);
  const D = { n: [0, -1, 's'], s: [0, 1, 'n'], e: [1, 0, 'w'], w: [-1, 0, 'e'] };
  const open = (x, z, k) => { const [dx, dz, o] = D[k]; E[z * N + x][k] = false; E[(z + dz) * N + x + dx][o] = false; };
  const EX = MZ.EX; const st = [[EX, N - 1]]; vis[(N - 1) * N + EX] = true;
  while (st.length) { const [cx, cz] = st[st.length - 1]; const nb = Object.keys(D).filter((k) => { const x = cx + D[k][0], z = cz + D[k][1]; return x >= 0 && z >= 0 && x < N && z < N && !vis[z * N + x] && !(x === EX && z === 0); });
    if (!nb.length) { st.pop(); continue; } const k = nb[Math.floor(r() * nb.length)]; open(cx, cz, k); const nx = cx + D[k][0], nz = cz + D[k][1]; vis[nz * N + nx] = true; st.push([nx, nz]); }
  for (let i = 0; i < 24; i++) { const x = 1 + Math.floor(r() * (N - 3)), z = 4 + Math.floor(r() * (N - 6)); open(x, z, r() < 0.5 ? 'e' : 's'); }
  for (let z = 1; z <= 3; z++) for (let x = EX - 2; x <= EX + 2; x++) { if (x < EX + 2) open(x, z, 'e'); if (z < 3) open(x, z, 's'); } // radura del Copista // qualche anello: più strade, più agguati
  open(EX, 1, 'n'); // l'ultima cella (la piastra) si raggiunge solo dalla fenditura
  // muri: un solo InstancedMesh (pochi draw call), collisioni registrate solo quando la zona è attiva
  const segs = [];
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) { const c = E[z * N + x];
    if (z > 0 && c.n) segs.push([x0 + x * C, z0 + z * C, x0 + (x + 1) * C, z0 + z * C]); if (x > 0 && c.w) segs.push([x0 + x * C, z0 + z * C, x0 + x * C, z0 + (z + 1) * C]); }
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0); const n = geo.attributes.position.count; geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(0.4), 3));
  const mat = world.wallMat; const im = new THREE.InstancedMesh(geo, mat, segs.length); const m4 = new THREE.Matrix4(); const H = 1.9;
  segs.forEach(([ax, az, bx, bz], i) => { const w = Math.abs(bx - ax) + 0.5, d = Math.abs(bz - az) + 0.5, h = H + ((i * 37) % 7) * 0.08; m4.makeScale(w, h, d); m4.setPosition((ax + bx) / 2, 0, (az + bz) / 2); im.setMatrixAt(i, m4);
    MZ.walls.push({ minX: Math.min(ax, bx) - 0.25, maxX: Math.max(ax, bx) + 0.25, minZ: Math.min(az, bz) - 0.25, maxZ: Math.max(az, bz) + 0.25 }); });
  im.frustumCulled = false; MZ.group.add(im); MZ.wallIM = im; MZ.wallFinal = segs.map((_, i) => { const m = new THREE.Matrix4(); im.getMatrixAt(i, m); return m; });
  // creste di carta strappata sopra i muri (dettaglio, istanze)
  const cg = new THREE.ConeGeometry(0.18, 0.5, 3); cg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cg.attributes.position.count * 3).fill(0.2), 3));
  const crest = new THREE.InstancedMesh(cg, inkMasterLike(0xefe5cf), segs.length * 3); let ci = 0;
  segs.forEach(([ax, az, bx, bz], i) => { for (let k = 0; k < 3; k++) { const t = (k + 0.5) / 3; m4.makeRotationY(r() * 3); m4.setPosition(ax + (bx - ax) * t, H + 0.2 + ((i * 37) % 7) * 0.08, az + (bz - az) * t); crest.setMatrixAt(ci++, m4); } });
  crest.frustumCulled = false; MZ.group.add(crest); MZ.crest = crest;
  // scritte sul pavimento e frecce d'inchiostro che indicano il filo
  for (let i = 0; i < 18; i++) { const [x, z] = mzCell(Math.floor(r() * N), Math.floor(r() * N)); const t = W.sketchFloor ? null : null; const sp = new THREE.Mesh(new THREE.CircleGeometry(0.6 + r() * 1.2, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1a120c, transparent: true, opacity: 0.35, depthWrite: false })); sp.position.set(x + (r() - 0.5) * 4, 0.012, z + (r() - 0.5) * 4); MZ.group.add(sp); }
  // il filo: cavo che corre dalla piastra finale verso la pressa (si accende alla fine)
  const [px, pz] = mzCell(MZ.EX, 0); MZ.wallSegs = segs;
  MZ.wire = W.makeWire([[px, pz + 1.2], [px, pz - 2.6], [px + 30, pz - 2.6]]); MZ.group.add(MZ.wire);
  // fenditura d'inchiostro davanti alla piastra + ponte da scrivere
  const cz = z0 + C; MZ.chasm = { minX: px - C / 2, maxX: px + C / 2, minZ: cz - 1.3, maxZ: cz + 1.3 };
  const chm = new THREE.Mesh(new THREE.PlaneGeometry(C - 0.4, 2.6).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { uTime: INK_UNIFORMS.uTime }, vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uTime; varying vec2 vU; void main(){ float w=sin(vU.x*30.+uTime*2.)*.5+.5; float e=smoothstep(0.,.18,vU.y)*smoothstep(1.,.82,vU.y); vec3 c=mix(vec3(.02,.015,.012),vec3(.35,.06,.04),w*.25*(1.-e)+(1.-e)*.3); gl_FragColor=vec4(c,1.); }' }));
  chm.position.set(px, 0.015, cz); MZ.group.add(chm);
  MZ.bridgeEnt = addEnt('mzbridge', 'mzbridge', new THREE.Group(), px, cz); MZ.bridgeEnt.mesh.userData.height = 0.6; MZ.group.add(MZ.bridgeEnt.mesh);
  for (let i = 0; i < 9; i++) { const pl = inked(new THREE.BoxGeometry(2.4, 0.14, 0.38), { color: 0xd8cbb0, ow: 0.02 }); pl.position.set(px, -3, cz - 1.25 + i * 0.31); pl.visible = false; MZ.group.add(pl); MZ.planks.push(pl); }
  MZ.plate = addEnt('mzplate', 'mzplate', W.makePlate(1.6, 1.6), px, pz); MZ.group.add(MZ.plate.mesh);
  for (let i = 0; i < 7; i++) { const s = inked(new THREE.BoxGeometry(2.2, 0.3, 0.7), { color: 0xcbbd9e, ow: 0.02 }); s.position.set(px - 1.9 + i * 0.6, -1, pz - 1.2); s.scale.set(0.27, 1, 2.2); s.visible = false; MZ.group.add(s); MZ.steps.push(s); }
  // lampade sentinella (BUIO le spegne): vicino a una lampada accesa le macchie ti vedono da lontano
  for (const [cx2, cz2] of [[3, 13], [13, 11], [4, 7], [11, 6], [1, 2], [15, 2], [7, 8], [8, 14], [2, 10]]) { const [x, z] = mzCell(cx2, cz2); const o = C * 0.3; const lm = W.makeLamp(); lm.position.set(x + o, 0, z + o); MZ.group.add(lm);
    const e = addEnt('mzlamp' + MZ.lamps.length, 'mzlamp', lm, x + o, z + o); e.mesh.userData.height = 2.2; const L = { m: lm, x: x + o, y: lm.userData.ly, z: z + o, r: 6, col: [1.3, 0.55, 0.35], base: [1.3, 0.55, 0.35], ph: r() * 10, kind: 'lamp' }; e.light = L; storyLights.push(L); MZ.lamps.push(e); }
  // macchie del labirinto (risvegliate dalla vicinanza o dalla luce)
  for (let i = 0; i < 34; i++) { let cx2 = Math.floor(r() * N), cz2 = Math.floor(r() * (N - 5)) + 4; if (cz2 >= N - 2 && Math.abs(cx2 - MZ.EX) < 3) cz2 = 6; const [x, z] = mzCell(cx2, cz2); const o = spawnMite(x + (r() - 0.5) * 3, z + (r() - 0.5) * 3, i % 4 === 0); o.room = 'maze'; o.aggroR = 7; o.home = { x: o.x, z: o.z }; o.x = x; o.z = z; o.mesh.position.set(x, 0.3, z); if (i % 4 === 0) { o.scribe = true; const q = W.makeDoc(); q.scale.setScalar(0.5); q.position.y = 0.2; o.mesh.add(q); } }
  for (const [cx2, cz2] of [[0, 15], [16, 9], [0, 5], [16, 0], [12, 4]]) { const [x, z] = mzCell(cx2, cz2); spawnVial(x, z, true); }
  // pagine della guida (Ilde) lungo il percorso
  MZ.notes = [[8, 15, 'enter'], [4, 11, 'buio'], [8, 4, 'ponte']].map(([a, b, id]) => { const [x, z] = mzCell(a, b); const n = W.makeDoc(); n.position.set(x - 1.4, 0, z); MZ.group.add(n); return { x: x - 1.4, z, id }; }); buildMazeExtras(r); buildMazeRich(); spawnCopista();
}
function inkMasterLike(color) { const m = world.wallMat.clone(); m.uniforms = { ...world.wallMat.uniforms, uColor: { value: new THREE.Color(color) } }; return m; }
function mazeActivate(on) { if (MZ.active === on) return; MZ.active = on; MZ.group.visible = on;
  if (on) { world.walls.push(...MZ.walls); if (!MZ.bridged) world.walls.push(MZ.chasm); } else { world.walls = world.walls.filter((w) => !MZ.walls.includes(w) && w !== MZ.chasm); } }
function mazeAggro(m) { const d = Math.hypot(P.x - m.x, P.z - m.z); let R = m.aggroR;
  for (const l of MZ.lamps) if (!grammar.has(l.id, 'light.dark') && Math.hypot(l.x - P.x, l.z - P.z) < 6.5) R = 13; // la luce ti tradisce
  if (P.hidden) R = Math.min(R, 3); if (m.hunting && d < R * 1.6) return true; m.hunting = d < R; return m.hunting; }
function mazeWander(m, dt) { m.wt = (m.wt || 0) - dt; if (m.wt <= 0) { m.wt = 1 + Math.random() * 2; const a = Math.random() * 6.28; m.wdx = Math.sin(a); m.wdz = Math.cos(a); if (Math.hypot(m.x - m.home.x, m.z - m.home.z) > 5) { m.wdx = m.home.x - m.x; m.wdz = m.home.z - m.z; const l = Math.hypot(m.wdx, m.wdz); m.wdx /= l; m.wdz /= l; } }
  m.x += m.wdx * 0.9 * dt; m.z += m.wdz * 0.9 * dt; collide(m, m.r, false); m.mesh.position.set(m.x, 0.3 + Math.abs(Math.sin(now * 3 + m.x)) * 0.08, m.z); m.mesh.rotation.y = Math.atan2(m.wdx, m.wdz); }
function mazeHintPulse() { if (MZ.hintT > 0) return; MZ.hintT = 8; MZ.entryOpen = Math.max(MZ.entryOpen, 0.001); if (S.room === 'conduct') { toast('LA PRESSA SFONDA LA PAGINA'); say([['ilde', 'Il filo non arriva al cancello. La pressa ha sfondato il foglio: le pagine cadute girano in un vortice.'], ['ilde', 'Segui il filo fino alla sua piastra. Poi l\'impulso avrà una strada.']]); journal('Il filo della pressa scende nel labirinto: va riacceso dall\'altra parte.'); } }
// pagina piegata nella stanza della pressa: si spiega e diventa l'ingresso
const entryPage = new THREE.Group(); entryPage.position.set(-8.8, 0.02, -52.2); scene.add(entryPage);
const entryHole = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x0b0806 })); entryHole.scale.setScalar(0.01); entryPage.add(entryHole);
const entryLeaf = new THREE.Group(); entryLeaf.visible = false; const entryWhirl = new THREE.Group(); entryPage.add(entryWhirl); for (let i = 0; i < 18; i++) { const pg = inked(new THREE.PlaneGeometry(0.8, 1.1), { color: 0xfaf3e2 }); pg.material.side = THREE.DoubleSide; pg.userData = { a: i / 18 * Math.PI * 2, r: 0.5 + (i % 6) * 0.3, h: (i % 5) * 0.35 }; entryWhirl.add(pg); } entryWhirl.scale.setScalar(0.01); entryPage.add(entryLeaf); const leafM = inked(new THREE.BoxGeometry(2.8, 0.04, 2.8), { color: 0xefe5cf, ow: 0.02 }); leafM.position.x = 1.4; entryLeaf.position.x = -1.4; entryLeaf.add(leafM);
function zoneTransition(kind, text, mid) { // anima e nasconde il caricamento: pagina che si volta, scala che sale, ponte che si costruisce
  if (S.transit) return; S.transit = true; S.lock = true; const el = $('pageTurn'); $('ptText').textContent = text; el.className = kind; el.classList.remove('hidden'); sfx.play('page');
  setTimeout(() => { try { mid(); } catch (e) { console.error(e); } }, 700);
  setTimeout(() => { el.className = 'hidden'; S.lock = false; S.transit = false; }, 2250); }
function enterMaze() { zoneTransition('turn', 'Il vortice ti trascina giù, fra le pagine cadute.', () => { buildMaze(); mazeActivate(true); startMazeFilm(); const [x, z] = mzCell(MZ.EX, MZ.N - 1); P.x = x; P.z = z + 2; P.face = Math.PI; camera.position.set(P.x, 15, P.z + 12); enterRoom(MZ.R); hint('');
  if (!MZ.guide.has('in')) { MZ.guide.add('in'); MZ.afterFilm = () => say([['ilde', 'Sono Ilde. Ho scritto io queste pareti, tanto tempo fa. Ti guido io.'], ['ilde', 'Le macchie dormono finché non ti sentono. Vicino alle lampade accese ti vedono da lontano.'], ['ilde', 'In fondo, a nord, c\'è la piastra del filo. Scrivici CONDUTTIVO.']]); } }); }
function exitMaze() { zoneTransition('rise', 'La scala si scrive gradino dopo gradino e ti riporta alla pressa.', () => { mazeActivate(false); P.x = 0; P.z = -62.5; P.face = Math.PI; camera.position.set(0, 15, -50); enterRoom(W.ROOMS[2]); openGate('r2'); pulseWire(wireA); pulseWire(wireB); toast('IL CANCELLO SI APRE'); journal('Hai riacceso il filo nel labirinto: l\'impulso ora arriva al cancello.'); }); }
function mazeInteractables(L) {
  if (S.room === 'conduct' && MZ.entryOpen >= 1 && !PROG.mazeDone) L.push({ x: -8.8, z: -52.2, r: 2.2, label: 'tuffati', fn: enterMaze });
  if (S.room !== 'maze') return;
  for (const n of MZ.notes) if (!MZ.guide.has(n.id)) L.push({ x: n.x, z: n.z, r: 1.8, label: 'leggi', fn: () => readGuide(n.id) });
  if (MZ.stairsT >= 1) { const s = MZ.steps[0]; L.push({ x: s.position.x, z: s.position.z - 1, r: 2.4, label: 'sali', fn: exitMaze }); }
}
function readGuide(id) { MZ.guide.add(id); ink.interact(); sfx.play('page');
  if (id === 'enter') say([['ilde', 'Ci sono quattro pagine nascoste qui sotto: un reliquiario, un cristallo, una scritta che vive solo al buio, e una pila che una parola sola non smuove.'], ['ilde', 'Ogni macchia che cancelli lascia gocce d\'inchiostro. Con le gocce riscrivi il tuo Pennino: tocca ✦ in alto.'], ['ilde', 'Il Pennino d\'oro ti darà il GOMMINO. Fidati, servirà contro il Custode.']]);
  if (id === 'buio') { S.discovered.add('light.dark'); say([['ilde', 'Le lampade sentinella sono vanitose: se scrivi BUIO, si spengono per un po\'.'], ['ilde', 'Al buio le macchie non ti vedono. Riscrivi la lampada come fai con gli oggetti.']]); journal('Hai trovato la parola BUIO.'); }
  if (id === 'ponte') { S.discovered.add('shape.bridge'); say([['ilde', 'Davanti alla piastra la pagina è strappata: un vuoto d\'inchiostro.'], ['ilde', 'Ma un vuoto, per il libro, è solo un ponte non ancora scritto. Scrivi PONTE.']]); journal('Hai trovato la parola PONTE.'); } }
function mazeUpdate(dt) {
  entryWhirl.scale.setScalar(Math.max(0.01, MZ.entryOpen || 0)); if (entryWhirl.scale.x > 0.05) entryWhirl.children.forEach((pg) => { const u = pg.userData; const a = u.a + now * (1.6 - u.r * 0.5); pg.position.set(Math.cos(a) * u.r, 0.15 + u.h + Math.sin(now * 3 + u.a) * 0.1, Math.sin(a) * u.r); pg.rotation.set(0.6, -a, 0.3); });
  mazeFilmUpdate(dt);
  if (ERASE.cd > 0) { ERASE.cd -= dt; if (ERASE.cd <= 0) renderSkills(); }
  if (input.pressed('erase') && S.phase === 'play' && !paused && !S.lock) useEraser();
  if (MZ.hintT > 0) MZ.hintT -= dt;
  if (MZ.entryOpen > 0 && MZ.entryOpen < 1) { MZ.entryOpen = Math.min(1, MZ.entryOpen + dt * 0.5); const k = MZ.entryOpen; entryWhirl.scale.setScalar(Math.max(0.01, k)); S.shake = Math.max(S.shake, 0.25 * (1 - k)); entryLeaf.rotation.z = -Math.PI * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2); entryHole.scale.setScalar(Math.max(0.01, k));
    if (frame % 3 === 0) particles.emit(-8.8 + rnd(-1, 1), 0.3, -52.2 + rnd(-1, 1), 0, 1, 0, 1, 0.1, 0.05, 0.04, 0.03, 3); }
  if (S.room === 'conduct' && !PROG.mazeDone && grammar.has('plate', 'element.conductive') && MZ.entryOpen === 0) mazeHintPulse();
  entryPage.visible = !PROG.mazeDone;
  if (!MZ.built) return;
  if (S.room !== 'maze' && MZ.active && !S.transit) mazeActivate(false);
  if (S.room === 'maze' && !MZ.active) mazeActivate(true);
  if (!MZ.active) return;
  P.hidden = MZ.lamps.some((l) => grammar.has(l.id, 'light.dark') && Math.hypot(l.x - P.x, l.z - P.z) < 6);
  for (const l of MZ.lamps) { const dark = grammar.has(l.id, 'light.dark'); l.light.col = dark ? [0, 0, 0] : l.light.base; l.mesh.userData.glow.visible = !dark; }
  // PONTE: le assi arrivano una dopo l'altra dall'alto
  if (!MZ.bridged && grammar.has('mzbridge', 'shape.bridge') && MZ.bridgeT < 0) { MZ.bridgeT = 0; toast('IL PONTE SI SCRIVE'); sfx.play('page'); }
  if (MZ.bridgeT >= 0 && MZ.bridgeT < 1) { MZ.bridgeT = Math.min(1, MZ.bridgeT + dt * 0.45); MZ.planks.forEach((pl, i) => { const t = clamp(MZ.bridgeT * 1.8 - i * 0.09, 0, 1); pl.visible = t > 0; pl.position.y = lerp(4, 0.04, 1 - Math.pow(1 - t, 3)); pl.rotation.z = (1 - t) * 1.4; if (t > 0.95 && !pl.userData.d) { pl.userData.d = 1; particles.burst(pl.position.x, 0.1, pl.position.z, 6, 2); sfx.play('hit', 0.6); } });
    if (MZ.bridgeT >= 1) { MZ.bridged = true; world.walls = world.walls.filter((w) => w !== MZ.chasm); journal('Hai scritto un PONTE sul vuoto.'); } }
  // piastra del filo
  if (!MZ.done && grammar.has('mzplate', 'element.conductive')) { MZ.done = true; PROG.mazeDone = true; saveProg(); pulseWire(MZ.wire); for (const m of swarm) if (m.alive && m.room === 'maze') m.aggroR = 30; toast('IL FILO SI RIACCENDE · SCAPPA'); sfx.tension(true); S.shake = 0.8; MZ.stairsT = 0; say([['ilde', 'Senti? Tutto il labirinto si è svegliato. La scala si sta scrivendo: sali, presto!']]); }
  if (MZ.stairsT >= 0 && MZ.stairsT < 1) { MZ.stairsT = Math.min(1, MZ.stairsT + dt * 0.35); MZ.steps.forEach((s, i) => { const t = clamp(MZ.stairsT * 1.6 - i * 0.08, 0, 1); s.visible = t > 0; s.position.y = lerp(-1, 0.15 + i * 0.3, 1 - Math.pow(1 - t, 3)); if (frame % 4 === 0 && t > 0 && t < 1) particles.emit(s.position.x + rnd(-1, 1), s.position.y, s.position.z, 0, 1.5, 0, 0.8, 0.12, 0.85, 0.78, 0.62, 3); }); }
  if (MZ.wire && MZ.done && frame % 30 === 0) pulseWire(MZ.wire);
}


// ================= v1.6 · prologo giocato, parola ostile LENTO, sostegno del Caricatore, pagine maledette, Elara giudice, Custode in 3 fasi, finale =================
S.wordUse = {}; S.cursed = 0;
const OP = { stage: null, t: 0, R: W.ROOMS.find((r) => r.id === 'open'), built: false, planks: [], subT: 0 };
function opSub(t) { const el = $('opSub'); el.classList.remove('hidden'); el.style.opacity = 1; el.textContent = t; speak(t); }
function buildOpening() { if (OP.built) return; OP.built = true; const R = OP.R;
  OP.leaf = new THREE.Group(); OP.leaf.position.set(R.cx, 0.02, R.cz + 4); scene.add(OP.leaf);
  const lm = inked(new THREE.BoxGeometry(R.w - 0.6, 0.08, 17), { color: 0xf1e8d4, ow: 0.02, texScale: 0.5 }); lm.position.z = 8.5; OP.leaf.add(lm);
  const tx = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d'); g.fillStyle = 'rgba(40,28,20,.8)'; g.font = 'italic 64px Georgia'; g.fillText('E qui il viaggiatore cadde.', 60, 280); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const words = new THREE.Mesh(new THREE.PlaneGeometry(13, 6.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false })); words.position.set(0, 0.06, 9); OP.leaf.add(words);
  OP.chasm = { minX: R.cx - R.w / 2, maxX: R.cx + R.w / 2, minZ: R.cz - 1.8, maxZ: R.cz + 1.8 }; world.walls.push(OP.chasm);
  const ch = new THREE.Mesh(new THREE.PlaneGeometry(R.w - 0.4, 3.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x07050a })); ch.position.set(R.cx, 0.02, R.cz); scene.add(ch);
  const gtx = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d'); g.fillStyle = 'rgba(243,234,214,.85)'; g.font = 'italic 54px Georgia'; g.fillText('Tra le due sponde rimase soltanto ______', 30, 150); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const gw = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: gtx, transparent: true, depthWrite: false })); gw.position.set(R.cx, 0.04, R.cz); scene.add(gw); OP.gapWords = gw;
  for (let i = 0; i < 22; i++) for (const sd of [-1, 1]) { const t = inked(new THREE.ConeGeometry(0.22, 0.6 + Math.random() * 0.5, 3), { color: 0xefe5cf, outline: false }); t.rotation.x = sd * Math.PI / 2; t.position.set(R.cx - 7.6 + i * 0.72, 0.01, R.cz + sd * 1.75); scene.add(t); }
  OP.bridge = addEnt('opbridge', 'opbridge', new THREE.Group(), R.cx, R.cz); OP.bridge.mesh.userData.height = 0.5;
  for (let i = 0; i < 9; i++) { const pl = inked(new THREE.BoxGeometry(3, 0.14, 0.4), { color: 0xd8cbb0, ow: 0.02 }); pl.position.set(R.cx, -3, R.cz - 1.7 + i * 0.42); pl.visible = false; scene.add(pl); OP.planks.push(pl); }
  for (const [x, z, k] of [[-5, 14, 'lamp'], [5, 6, 'candle'], [-5, -6, 'lamp'], [5, -14, 'lamp'], [0, -19, 'candle']]) { const m = k === 'lamp' ? W.makeLamp() : W.makeCandle(0.6); m.position.set(R.cx + x, 0, R.cz + z); scene.add(m); storyLights.push({ m, x: R.cx + x, y: m.userData.ly, z: R.cz + z, r: k === 'lamp' ? 6 : 3.6, col: k === 'lamp' ? [1.3, 0.95, 0.55] : [1.2, 0.7, 0.3], ph: Math.random() * 10, kind: k }); }
}
function startOpening() {
  if (S.phase !== 'title') return; $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); sfx.start(); S.phase = 'play'; S.lock = true; if (isTouch) input.mode = 'touch';
  Tele.log('session_start', { runs: mem.runs, opening: true }); resetProg(); applySkills(); renderSkills(); buildOpening(); enterRoom(OP.R);
  P.x = OP.R.cx; P.z = OP.R.cz + 19; P.face = Math.PI; camera.position.set(P.x, 15, P.z + 12); OP.stage = 'tilt'; OP.t = 0; P.inv = 1e9; opSub('E qui il viaggiatore cadde.');
}
function opUpdate(dt) {
  if (!OP.stage) return; OP.t += dt; const R = OP.R;
  if (frame % 4 === 0) particles.emit(R.cx + rnd(-7, 7), 7, P.z + rnd(-8, 6), rnd(-0.3, 0.3), -0.9, rnd(-0.2, 0.2), 5, rnd(0.12, 0.25), 0.94, 0.9, 0.82, 0);
  if (OP.chasm && frame % 6 === 0) particles.emit(R.cx + rnd(-7.5, 7.5), 0.1, R.cz + (Math.random() < 0.5 ? -1.7 : 1.7), 0, -1.5, 0, 1.2, 0.08, 0.05, 0.03, 0.03, 3);
  if (OP.stage === 'tilt') { const k = clamp((OP.t - 1.2) / 2.6, 0, 1); OP.leaf.rotation.x = -0.32 * Math.sin(k * Math.PI * 0.5) * (k < 1 ? 1 : 1);
    if (OP.t > 1.6) { const sk = clamp((OP.t - 1.6) / 2.4, 0, 1); P.z = lerp(R.cz + 19, R.cz + 2.6, sk * sk); P.x = R.cx + Math.sin(OP.t * 3) * 0.4 * (1 - sk); P.face = Math.PI; if (frame % 3 === 0) particles.emit(P.x, 0.2, P.z, rnd(-1, 1), 0.6, 1, 0.6, 0.15, 0.85, 0.78, 0.62, 3); }
    if (OP.t > 4.2) { OP.stage = 'gap'; OP.t = 0; S.lock = false; S.shake = 0.5; sfx.play('tear'); S.discovered.add('shape.bridge'); opSub('Tra le due sponde rimase soltanto ______.'); hint(input.mode === 'touch' ? 'Tocca ✎ RISCRIVI e poi la parola PONTE' : input.mode === 'pad' ? 'Premi RB e scegli PONTE' : 'Premi Q e scegli PONTE'); $('tRewrite').classList.add('pulse'); } }
  if (OP.stage === 'gap') { OP.leaf.rotation.x = lerp(OP.leaf.rotation.x, 0, 0.05); P.hp = P.max; if (grammar.has('opbridge', 'shape.bridge')) { OP.stage = 'build'; OP.t = 0; hint(''); $('tRewrite').classList.remove('pulse'); opSub('Tra le due sponde rimase soltanto un PONTE.'); sfx.play('page'); } }
  if (OP.stage === 'build') { P.hp = P.max; OP.planks.forEach((pl, i) => { const t = clamp(OP.t * 1.1 - i * 0.1, 0, 1); pl.visible = t > 0; pl.position.y = lerp(4, 0.04, 1 - Math.pow(1 - t, 3)); pl.rotation.z = (1 - t) * 1.2; });
    OP.gapWords.material.opacity = Math.max(0, 1 - OP.t); if (OP.t > 1.9 && OP.chasm) { world.walls = world.walls.filter((w) => w !== OP.chasm); OP.chasm = null; opSub('E il viaggiatore, che non sapeva ancora di scrivere, attraversò.'); }
    if (P.z < R.cz - 8) { OP.stage = 'title'; OP.t = 0; S.lock = true; $('opSub').style.opacity = 0; $('opTitle').classList.remove('hidden'); sfx.play('seal'); } }
  if (OP.stage === 'title' && OP.t > 3.4) { OP.stage = null; $('opTitle').classList.add('hidden'); P.inv = 0;
    zoneTransition('build', 'Capitolo I · La tavola', () => { const r = W.ROOMS[0]; P.x = 0; P.z = r.cz + r.d / 2 - 1.6; P.face = Math.PI; camera.position.set(0, 15, P.z + 12); enterRoom(r); tut.on = !mem.tutDone; tut.i = 0; tut.t = 0; tut.sx = P.x; tut.sz = P.z;
      setTimeout(() => { S.lock = true; say(ST.introLines(mem), { done: () => { S.lock = false; inkDrop(); } }); }, 1600); }); }
}
// ---- parola ostile: LENTO sull'ombra ----
function nearCover() { if (P.hidden || P.st === 'dodge') return true; for (const c of circles) if (c.pillar && Math.hypot(P.x - c.x, P.z - c.z) < c.r + 1.6) return true; return false; }
function curseStart(src) { if (P.curse || P.st === 'dead') return; P.curse = { t: 0, on: false, src }; $('curseTag').classList.remove('hidden', 'on'); sfx.play('warn'); toastSmall(src + ' scrive LENTO sulla tua ombra: copriti (pilastro, buio, schivata)!'); renderSkills(); }
function curseUpdate(dt) { const c = P.curse; const tag = $('curseTag'); if (!c) return;
  if (!c.on) { c.t += dt; tag.textContent = 'LENTO'.slice(0, Math.ceil(c.t / 2.4 * 5)); if (nearCover()) { P.curse = null; tag.classList.add('hidden'); toast('TI SEI COPERTO · LA PAROLA NON ATTECCHISCE'); sfx.play('dry'); renderSkills(); return; }
    if (c.t >= 2.4) { c.on = true; tag.classList.add('on'); tag.textContent = 'LENTO'; toast('SEI LENTO · CANCELLALO COL GOMMINO ◌'); hint('◌ GOMMINO cancella la parola ostile' + (input.mode === 'kb' ? ' (G)' : input.mode === 'pad' ? ' (LT)' : '')); } }
  const p = toScreen(P.x, 0.05, P.z); if (p.ok) { tag.style.left = p.x + 'px'; tag.style.top = (p.y + 18) + 'px'; } }
// ---- pagine maledette ----
const CURSED = {}; function addCursed(id, x, z) { const m = W.makeDoc(); m.position.set(x, 0, z); m.userData.paper.material = m.userData.paper.material.clone(); setU(matsOf(m), 'ColorShift', 0.8); scene.add(m); CURSED[id] = { x, z, m, taken: false }; return CURSED[id]; }
function takeCurse(id) { const c = CURSED[id]; if (!c || c.taken) return; c.taken = true; scene.remove(c.m); S.cursed++; sfx.play('tear'); S.flash = 0.4; S.shake = 0.6;
  for (const e of [charger, custode]) { const cf = e.cfg = { ...e.cfg }; cf.speed *= 1.12; cf.charge *= 1.1; e.armorHP += 3; e.armorMax += 3; }
  for (const m of swarm) if (m.alive) m.aggroR = (m.aggroR || 0) * 1.3 || m.aggroR;
  toast('✠ PAGINA MALEDETTA · ' + S.cursed + ' · più forte, ma il capitolo si indurisce'); journal('Hai preso una pagina maledetta: il tuo pennino morde di più, ma i nemici ti cercano con più rabbia.'); Tele.log('cursed_page', { id, n: S.cursed }); }
// ---- Caricatore: il sostegno che crolla (seconda soluzione) ----
const SUP = { x: 8.2, z: -22.5, fallen: false, t: -1 };
SUP.mesh = (() => { const g = new THREE.Group(); const col = inked(new THREE.CylinderGeometry(0.45, 0.55, 3.2, 8, 3), { color: 0xb8a684, shift: 0x9e2b1c, y0: 0, y1: 3.2 }); col.position.y = 1.6; g.add(col);
  const cr = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.4, 0.05), new THREE.MeshBasicMaterial({ color: 0x1a120c })); cr.position.set(0.3, 1.4, 0.35); cr.rotation.z = 0.3; g.add(cr);
  const balc = inked(new THREE.BoxGeometry(3.4, 0.25, 7), { color: 0x8a6a4a, ow: 0.025 }); balc.position.set(0.9, 3.25, 0); balc.scale.x = 0.55; g.add(balc); g.userData = { col, balc }; g.position.set(SUP.x, 0, SUP.z); scene.add(g); return g; })();
SUP.circle = { x: SUP.x, z: SUP.z, r: 0.6, pillar: true, support: true, mesh: SUP.mesh }; circles.push(SUP.circle);
SUP.ramp = inked(new THREE.BoxGeometry(3.2, 0.25, 7.6), { color: 0x8a6a4a, ow: 0.025 }); SUP.ramp.visible = false; scene.add(SUP.ramp);
function collapseSupport() { if (SUP.fallen) return; SUP.fallen = true; SUP.t = 0; const i = circles.indexOf(SUP.circle); if (i >= 0) circles.splice(i, 1); sfx.play('break'); S.shake = 1.2; S.hitstop = 0.15; particles.burst(SUP.x, 2, SUP.z, 40, 6, [0.85, 0.78, 0.62], 0.25);
  toast('IL SOSTEGNO CROLLA · UNA RAMPA, UN\'ALTRA STRADA'); journal('Hai fatto crollare il ballatoio con la carica del Caricatore: la rampa porta oltre il cancello.'); Tele.log('charger_alt', {});
  setTimeout(() => { openGate('r1'); if (S.encounter === 'charger') endEncounter('charger'); gainDrops(6); hint('Sali sulla rampa: il cancello nord è sfondato'); }, 900); }
// ---- Elara giudice: la contraddizione ----
const VERD = { x: -6.2, z: -95.5, solved: false, tries: 0 }; VERD.mesh = W.makeReader(); VERD.mesh.position.set(VERD.x, 0.55, VERD.z); scene.add(VERD.mesh); circles.push({ x: VERD.x, z: VERD.z, r: 0.4 });
function readVerdict() { ink.interact(); sfx.play('page');
  say([['narr', 'IL VERDETTO. «Elara è COLPEVOLE di aver aperto la Fenditura.»'], ['narr', '«Prova prima: quella notte la piastra della porta era ISOLANTE.»'], ['narr', '«Prova seconda: Elara scrisse una riga, e il suo inchiostro accese da solo il relè.»'], ['narr', '«Prova terza: il relè pulsa ogni tre secondi, da allora.»'], ['narr', 'Una delle tre prove contraddice una regola che conosci già.']],
    { choices: [['La prima è falsa', () => wrongVerdict()], ['La seconda è falsa', () => solveVerdict()], ['La terza è falsa', () => wrongVerdict()]] }); }
function wrongVerdict() { VERD.tries++; sfx.play('deny'); damagePlayer(1, { x: VERD.x, z: VERD.z }, 'verd' + VERD.tries); say([['elara', 'No. Quella è vera. Rileggi: cosa sai dell\'inchiostro e degli impulsi?']]); }
function solveVerdict() { VERD.solved = true; sfx.play('seal'); S.flash = 0.4; elara.userData.st.verdict = ''; elara.userData.redraw();
  say([['you', 'CONDUTTIVO non crea energia: la trasporta. Nessun inchiostro accende un relè da solo.'], ['elara', '…Allora qualcuno ha portato l\'impulso. Non io.'], ['elara', 'Il verdetto non regge. Passa, e cerca chi ha scritto quella riga.']], { done: () => setRoute('evidence') }); journal('Hai trovato la contraddizione nel verdetto di Elara.'); }
// ---- Custode in tre fasi ----
const C3 = { phase: 1, shieldT: 0, shieldWord: null, curseCd: 6 };
function custodeSay(t) { say([['custode', t]]); }
function custodePhases(dt) { if (S.room !== 'arena' || !custode.alive || S.victory) return; const c = custode;
  if (C3.shieldT > 0) { C3.shieldT -= dt; c.mesh.userData.halo.material.color.setRGB(0.2, 0.35, 0.9); if (C3.shieldT <= 0) { c.mesh.userData.halo.material.color.set(0x8a1a10); toastSmall('La lettura del Custode svanisce'); } }
  if (C3.phase === 1 && !c.armorBroken && c.armorHP < c.armorMax * 0.65) { C3.phase = 2; const top = Object.entries(S.wordUse).filter(([w]) => ['state.fragile', 'temperament.cautious', 'element.conductive'].includes(w)).sort((a, b) => b[1] - a[1])[0];
    C3.shieldWord = top ? top[0] : 'state.fragile'; C3.shieldT = 12; grammar.resetPhrase('custode'); custodeSay('Conosco quel tratto. ' + EFFECTS[C3.shieldWord].word + ' non mi tocca più.'); toast('FASE 2 · IMMUNE A ' + EFFECTS[C3.shieldWord].word + ' (12 s) · cambia parola o usa il gommino'); }
  if (C3.phase === 2 && C3.shieldT <= 0 && c.armorHP < c.armorMax * 0.65 && Math.random() < dt / 9) C3.shieldT = 8; // torna a leggerti
  if (C3.phase < 3 && (c.armorBroken || c.armorHP < c.armorMax * 0.3)) { C3.phase = 3; custodeSay('Allora correggo te.'); toast('FASE 3 · IL CUSTODE SCRIVE SU DI TE'); C3.curseCd = 1.5; }
  if (C3.phase === 3 && !arena.snapped) { C3.curseCd -= dt; if (C3.curseCd <= 0 && !P.curse) { C3.curseCd = 11; curseStart('Il Custode'); } }
}
const _touchSeal = touchSeal; touchSeal = function () { if (S.victory) return; say([['narr', 'Il legame si spezza. Dentro il Custode c\'è una sola riga, scritta di fretta:'], ['narr', '«Il viaggiatore non doveva arrivare fin qui, perché se avesse letto ______»'], ['narr', 'La frase finisce lì. Manca una parola.']]); journal('Dentro il Custode: una frase incompleta.'); _touchSeal(); };
// ---- pagina finale ----
function endingPage() { const el = $('endPage'); el.classList.remove('hidden'); const cv = $('endCv'), g = cv.getContext('2d'); g.fillStyle = '#efe5cf'; g.fillRect(0, 0, 900, 1100);
  g.strokeStyle = 'rgba(40,28,20,.25)'; for (let i = 0; i < 26; i++) { g.beginPath(); g.moveTo(60, 120 + i * 36); g.lineTo(840, 120 + i * 36); g.stroke(); }
  const ink = (f) => { g.save(); g.fillStyle = '#16100c'; g.strokeStyle = '#16100c'; g.lineCap = 'round'; f(); g.restore(); };
  ink(() => { g.beginPath(); g.moveTo(450, 330); g.bezierCurveTo(360, 340, 330, 520, 300, 820); g.lineTo(600, 820); g.bezierCurveTo(570, 520, 540, 340, 450, 330); g.fill(); // mantello
    g.beginPath(); g.arc(450, 300, 62, 0, Math.PI * 2); g.fill(); g.fillStyle = '#efe5cf'; g.beginPath(); g.arc(432, 305, 6, 0, 6.3); g.arc(468, 305, 6, 0, 6.3); g.fill();
    g.fillStyle = '#8a2416'; g.fillRect(392, 370, 116, 22); g.fillRect(470, 380, 22, 120);
    g.lineWidth = 9; g.beginPath(); g.moveTo(560, 520); g.lineTo(700, 400); g.stroke(); g.fillStyle = '#d8a63a'; g.beginPath(); g.moveTo(700, 400); g.lineTo(728, 382); g.lineTo(712, 410); g.fill();
    for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(310 + i * 35, 830 + (i % 3) * 14, 6 + (i % 2) * 4, 0, 6.3); g.fill(); } });
  g.save(); g.strokeStyle = 'rgba(22,16,12,.35)'; g.lineWidth = 1.2; for (let i = 0; i < 70; i++) { g.beginPath(); g.moveTo(250 + i * 6, 860); g.lineTo(230 + i * 6, 900); g.stroke(); } g.restore();
  g.save(); g.strokeStyle = 'rgba(22,16,12,.5)'; g.lineWidth = 1.5; for (let i = 0; i < 28; i++) { g.beginPath(); g.moveTo(330 + i * 9, 420 + (i % 3) * 30); g.lineTo(310 + i * 9, 800); g.stroke(); } g.restore();
  g.save(); g.font = 'italic 26px Georgia'; g.fillStyle = 'rgba(40,28,20,.55)'; g.fillText('fig. 1 — il viaggiatore, come doveva essere', 250, 980); g.restore();
  let drip = 0; const dripT = setInterval(() => { drip++; g.fillStyle = '#16100c'; g.beginPath(); g.ellipse(712, 412 + drip * 4, 4, 6, 0, 0, 6.3); g.fill(); if (drip > 30) clearInterval(dripT); }, 90);
  const q = 'A questo punto, il viaggiatore avrebbe dovuto posare la penna.'; let i = 0; $('endQ').innerHTML = ''; sfx.play('page');
  const tick = setInterval(() => { i++; $('endQ').innerHTML = q.slice(0, i - 6) + '<span class="wet">' + q.slice(Math.max(0, i - 6), i) + '</span>'; if (i >= q.length + 6) clearInterval(tick); }, 70);
  const done = () => { el.removeEventListener('pointerdown', done); clearInterval(tick); el.classList.add('hidden'); finish(); }; setTimeout(() => el.addEventListener('pointerdown', done), FAST ? 50 : 2500); if (FAST) setTimeout(done, 1500); window.__endDone = done; }
// ---- dettagli del labirinto, pila di registri (parole composte), pagina maledetta ----
function buildMazeExtras(r) {
  const bg = new THREE.BoxGeometry(1, 1, 1); bg.translate(0, 0.5, 0); bg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(bg.attributes.position.count * 3).fill(0.3), 3));
  const books = new THREE.InstancedMesh(bg, inkMasterLike(0x8a5a3a), 220); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(); const col = new THREE.Color();
  for (let i = 0; i < 220; i++) { const [x, z] = mzCell(Math.floor(r() * MZ.N), Math.floor(r() * MZ.N)); const stack = i % 5; e.set(0, r() * 3, 0); q.setFromEuler(e); m4.compose(v.set(x + (r() < 0.5 ? -1 : 1) * (MZ.C * 0.38), stack * 0.18, z + (r() - 0.5) * MZ.C * 0.7), q, sc.set(0.6 + r() * 0.3, 0.17, 0.8 + r() * 0.2)); books.setMatrixAt(i, m4); books.setColorAt && books.setColorAt(i, col.setHSL(0.03 + r() * 0.08, 0.5, 0.3 + r() * 0.25)); }
  books.frustumCulled = false; MZ.group.add(books);
  for (let i = 0; i < 30; i++) { const [x, z] = mzCell(Math.floor(r() * MZ.N), Math.floor(r() * MZ.N)); const p = inked(new THREE.PlaneGeometry(0.5, 0.65), { color: 0xf3ead6, outline: false }); p.material.side = THREE.DoubleSide; p.position.set(x + (r() - 0.5) * MZ.C * 0.7, 0.9 + r() * 0.6, z - MZ.C * 0.45); p.rotation.z = (r() - 0.5) * 0.5; MZ.group.add(p); }
  const [sx, sz0] = mzCell(14, 7); const sz = sz0 + 2.2; MZ.stack = addEnt('mzstack', 'mzstack', inked(new THREE.BoxGeometry(MZ.C - 0.3, 2.4, 1.2), { color: 0x6b4a2a, shift: 0x8a2416, y0: 0, y1: 2.4 }), sx, sz - 2.2); MZ.stack.mesh.position.y = 1.2; MZ.stack.mesh.userData.height = 2.4; MZ.group.add(MZ.stack.mesh);
  MZ.stackBox = { minX: sx - MZ.C / 2, maxX: sx + MZ.C / 2, minZ: sz - 2.8, maxZ: sz - 1.6 }; MZ.walls.push(MZ.stackBox);
  MZ.notes.push({ x: sx - 1.5, z: sz + 0.6, id: 'pesante' }); { const n = W.makeDoc(); n.position.set(sx - 1.5, 0, sz + 0.6); MZ.group.add(n); }
  const [cx, cz] = mzCell(16, 16); MZ.curseAt = addCursed('mz', cx, cz); MZ.group.attach(MZ.curseAt.m);
}
function v16Interactables(L) {
  for (const [id, c] of Object.entries(CURSED)) if (!c.taken && (id !== 'mz' || MZ.active)) L.push({ x: c.x, z: c.z, r: 1.8, label: 'leggi', fn: () => say([['narr', '✠ Una pagina maledetta. Le righe sono scritte al contrario e scottano.'], ['narr', 'Se la prendi, il tuo pennino morderà di più. Ma il libro se ne accorgerà, e ti renderà il capitolo più duro.']], { choices: [['Prendila', () => takeCurse(id)], ['Lasciala', () => {}]] }) });
  if (S.room === 'door' && !S.doorRoute && !VERD.solved) L.push({ x: VERD.x, z: VERD.z, r: 1.8, label: 'esamina', fn: readVerdict });
  if (S.room === 'maze' && MZ.guide && !MZ.guide.has('pesante')) { /* nota letta tramite mazeInteractables */ }
}
const _readGuide = readGuide; readGuide = function (id) { if (id === 'pesante') { MZ.guide.add(id); ink.interact(); sfx.play('page'); S.discovered.add('weight.heavy'); S.discovered.add('state.fragile');
  say([['ilde', 'Questa pila di registri chiude un passaggio. Da sola una parola non basta.'], ['ilde', 'FRAGILE e PESANTE insieme: crolla sotto il proprio peso. Ma per comporre due parole serve il Pennino d\'acciaio.']]); journal('Hai trovato la parola PESANTE.'); return; } _readGuide(id); };
addCursed('ch', 8.6, -20.2); // sul ballatoio del Caricatore (arrivi dalla rampa o con coraggio)
const INTRO_SWAY = [];

// ---- stanza I: corridoio più luminoso e pieno di dettagli ----
(() => { const sh = new THREE.Group(); scene.add(sh); const bg = new THREE.BoxGeometry(1, 1, 1); bg.translate(0, 0.5, 0); bg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(bg.attributes.position.count * 3).fill(0.3), 3));
  for (const sd of [-1, 1]) { const frame = inked(new THREE.BoxGeometry(0.7, 2.6, 17), { color: 0x5a3e28, ow: 0.025, y0: 0, y1: 2.6 }); frame.position.set(sd * 6.55, 1.3, 0); sh.add(frame); circles.push(...[-6, -2, 2, 6].map((z) => ({ x: sd * 6.4, z, r: 0.45 }))); }
  const n = 300, books = new THREE.InstancedMesh(bg, inkMasterLike(0x9a5a3a), n), m4 = new THREE.Matrix4(), col = new THREE.Color(); let k = 0;
  for (const sd of [-1, 1]) for (let row = 0; row < 3; row++) for (let i = 0; i < 50; i++) { const z = -8.2 + i * 0.33, h = 0.45 + Math.random() * 0.25; m4.makeScale(0.42, h, 0.26 + Math.random() * 0.06); m4.setPosition(sd * 6.15, 0.2 + row * 0.82, z); books.setMatrixAt(k, m4); if (books.setColorAt) books.setColorAt(k, col.setHSL(Math.random() * 0.1, 0.45, 0.25 + Math.random() * 0.3)); k++; }
  books.frustumCulled = false; sh.add(books);
  for (let i = 0; i < 14; i++) { const p = inked(new THREE.PlaneGeometry(0.5, 0.7), { color: 0xf3ead6, outline: false }); p.material.side = THREE.DoubleSide; p.position.set((Math.random() - 0.5) * 10, 2.4 + Math.random() * 0.8, -8 + Math.random() * 16); p.rotation.set(Math.random(), Math.random() * 3, 0); p.userData.sw = Math.random() * 6; sh.add(p); INTRO_SWAY.push(p); }
  for (const [x, z, kd] of [[-5, 7, 'lamp'], [5, 2, 'lamp'], [-5, -3, 'lamp'], [5, -7, 'lamp'], [-3, 8.5, 'candle'], [3, 8.5, 'candle']]) { const m = kd === 'lamp' ? W.makeLamp() : W.makeCandle(0.6); m.position.set(x, 0, z); scene.add(m); storyLights.push({ m, x, y: m.userData.ly, z, r: kd === 'lamp' ? 4.6 : 3.2, col: kd === 'lamp' ? [0.85, 0.65, 0.42] : [1.2, 0.7, 0.3], ph: Math.random() * 10, kind: kd }); }
})();
function v16Update(dt) {
  if (S.room === 'intro') for (const p of INTRO_SWAY) { p.rotation.z = Math.sin(now * 1.3 + p.userData.sw) * 0.25; p.position.y += Math.sin(now * 0.8 + p.userData.sw) * 0.002; }
  opUpdate(dt); curseUpdate(dt); custodePhases(dt); zoneUpdate(); mazeRichUpdate(dt); copistaUpdate();
  if (SUP.t >= 0 && SUP.t < 1) { SUP.t = Math.min(1, SUP.t + dt * 1.2); const k = SUP.t * SUP.t; SUP.mesh.userData.col.rotation.z = -k * 1.45; SUP.mesh.userData.col.position.set(k * 1.5, 1.6 - k * 1.1, 0); SUP.mesh.userData.balc.rotation.z = -k * 0.42; SUP.mesh.userData.balc.position.y = 3.25 - k * 1.6; }
  if (MZ.active && MZ.stack && !MZ.stack.broken && grammar.has('mzstack', 'state.fragile') && grammar.has('mzstack', 'weight.heavy')) { MZ.stack.broken = true; MZ.walls.splice(MZ.walls.indexOf(MZ.stackBox), 1); world.walls = world.walls.filter((w) => w !== MZ.stackBox); sfx.play('break'); S.shake = 1; particles.burst(MZ.stack.x, 1, MZ.stack.z, 40, 6, [0.5, 0.35, 0.2], 0.2); MZ.stack.mesh.visible = false; toast('LA PILA CROLLA SOTTO IL SUO PESO'); gainDrops(8); journal('Due parole insieme: la pila di registri è crollata.'); }
  if (MZ.active) for (const m of swarm) if (m.scribe && m.alive && m.room === 'maze' && m.hunting && !P.curse && Math.hypot(m.x - P.x, m.z - P.z) < 5) { m.scd = (m.scd || 0) - dt; if (m.scd <= 0) { m.scd = 14; curseStart('Uno scrivano'); } }
}



function trimRoom(oldR, newR) { const inOld = (x, z) => Math.abs(x - oldR.cx) <= oldR.w / 2 + 0.6 && Math.abs(z - oldR.cz) <= oldR.d / 2 + 0.6, inNew = (x, z) => Math.abs(x - newR.cx) <= newR.w / 2 - 0.25 && Math.abs(z - newR.cz) <= newR.d / 2 - 0.25;
  const out = (x, z) => inOld(x, z) && !inNew(x, z) && !(Math.abs(x - newR.cx) < 2 && Math.abs(z - newR.cz) > newR.d / 2 - 1); const v = new THREE.Vector3(), m4 = new THREE.Matrix4(), zero = new THREE.Matrix4().makeScale(0, 0, 0); const skip = new Set(Object.values(ENT).map((e) => e.mesh)); skip.add(P.mesh);
  const visit = (o) => { if (skip.has(o)) return; if (o.isInstancedMesh) { let ch = false; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); v.setFromMatrixPosition(m4).applyMatrix4(o.matrixWorld); if (out(v.x, v.z)) { o.setMatrixAt(i, zero); ch = true; } } if (ch) o.instanceMatrix.needsUpdate = true; return; }
    o.getWorldPosition(v); if (o.parent && (o.parent === scene || o.parent === world.group) && out(v.x, v.z) && v.y < 6) { o.visible = false; return; } for (const c of o.children) if (c.isInstancedMesh) visit(c); };
  scene.updateMatrixWorld(true); for (const o of [...scene.children]) { if (o === world.group) { for (const c of o.children) visit(c); continue; } visit(o); }
  for (let i = circles.length - 1; i >= 0; i--) if (out(circles[i].x, circles[i].z)) circles.splice(i, 1);
  for (let i = storyLights.length - 1; i >= 0; i--) { const l = storyLights[i]; if (out(l.x, l.z)) { l.m.visible = false; storyLights.splice(i, 1); } } }
trimRoom({ cx: 0, cz: 0, w: 24, d: 20 }, W.ROOMS[0]); trimRoom({ cx: 0, cz: -28, w: 28, d: 24 }, W.ROOMS[1]);
// stanza II più densa: casse, scaffali rovesciati, colonne spezzate (ostacoli bassi che il Caricatore sfonda solo se FRAGILE… restano)
(() => { for (const [x, z, w, d, h, ry] of [[-6.5, -21, 1.6, 1.2, 1.0, 0.3], [-8.4, -29, 1.2, 2.6, 0.7, 0], [5.8, -35.2, 2.2, 1.0, 0.9, -0.4], [-3.5, -36, 1.2, 1.2, 1.2, 0.8], [3.4, -19.8, 1.0, 1.0, 0.8, 0.2], [8.6, -30.5, 1.0, 2.2, 1.1, 0]]) {
    const m = inked(new THREE.BoxGeometry(w, h, d), { color: 0x7a5a3a, shift: 0x8a2416, y0: 0, y1: h, ow: 0.025 }); m.position.set(x, h / 2, z); m.rotation.y = ry; scene.add(m); circles.push({ x, z, r: Math.max(w, d) * 0.45 }); }
  for (let i = 0; i < 26; i++) { const p = inked(new THREE.PlaneGeometry(0.55, 0.75), { color: 0xf1e8d4, outline: false }); p.rotation.set(-Math.PI / 2, 0, Math.random() * 3); p.position.set((Math.random() - 0.5) * 18, 0.02, -28 + (Math.random() - 0.5) * 16); scene.add(p); }
  for (const [x, z] of [[-9.2, -24], [9.2, -34]]) { const c = W.makeCandle(0.7); c.position.set(x, 0, z); scene.add(c); storyLights.push({ m: c, x, y: c.userData.ly, z, r: 3.6, col: [1.2, 0.7, 0.3], ph: Math.random() * 10, kind: 'candle' }); } })();
// ================= v1.7 · una zona alla volta: ogni oggetto statico appartiene a una stanza (layer); si disegnano solo la stanza attuale e le vicine =================
const ZONE = { ready: false, active: '' };
(() => { const box = new THREE.Box3(), v = new THREE.Vector3(), sz = new THREE.Vector3(); const skip = new Set([MZ.group, P.mesh, lumi.mesh]); for (const e of Object.values(ENT)) skip.add(e.mesh);
  const assign = (o) => { if (skip.has(o) || o.isInstancedMesh || o.isLight || o.isCamera) return false; box.setFromObject(o); if (box.isEmpty()) return false; box.getSize(sz); box.getCenter(v);
    const r = roomAt(v.x, v.z); if (!r || sz.x > r.w + 1 || sz.z > r.d + 1) return false; const L = W.ROOMS.indexOf(r) + 1; if (L > 30) return false; o.traverse((c) => c.layers.set(L)); return true; };
  for (const o of [...scene.children]) { if (o === world.group) { for (const c of [...o.children]) assign(c); continue; } assign(o); }
  ZONE.ready = true; })();
function zoneNeighbors(id) { const r = W.ROOMS.find((q) => q.id === id); if (!r) return []; const ch = W.ROOMS.filter((q) => (q.chain || 'c1') === (r.chain || 'c1')); const i = ch.indexOf(r); const out = [r, ch[i - 1], ch[i + 1]];
  if (id === 'charger' || id === 'conduct') out.push(...W.ROOMS.filter((q) => q.id === 'archive' || q.id === 'crypt')); if (id === 'archive' || id === 'crypt') out.push(...W.ROOMS.filter((q) => q.id === 'charger' || q.id === 'conduct'));
  return out.filter(Boolean); }
function zoneUpdate() { const id = S.room || 'intro'; if (ZONE.active === id) return; ZONE.active = id; camera.layers.disableAll(); camera.layers.enable(0); for (const r of zoneNeighbors(id)) camera.layers.enable(W.ROOMS.indexOf(r) + 1); }


// ================= v1.7 · labirinto più ricco: reliquiario, cristallo (FRAGILE+CONDUTTIVO), scrittura nel buio, pagine del labirinto =================
const MZS = { found: new Set(), items: [] };
const MZ_LORE = {
  reliq: ['«Ilde scriveva i muri di notte. Diceva che un labirinto è solo una frase che non vuole finire.»'],
  crystal: ['«Il Custode non è nato cattivo. Era una correzione: qualcuno lo scrisse per fermare chi cambiava le storie.»'],
  dark: ['Nel buio, sul muro, compare una scritta che la luce nascondeva:', '«Il viaggiatore è già passato di qui. Più di una volta.»'],
  stack: ['Sotto i registri crollati, un foglio piegato: «Elara non ha mai toccato il relè. Ma qualcuno voleva un colpevole.»'],
};
function mazePage(id, x, z) { if (MZS.found.has(id)) return; MZS.found.add(id); sfx.play('seal'); S.flash = 0.3; gainDrops(5); toast('✦ PAGINA DEL LABIRINTO ' + MZS.found.size + '/4'); say(MZ_LORE[id].map((t) => ['narr', t])); journal('Pagina del labirinto: ' + MZ_LORE[id].join(' ')); particles.burst(x, 1, z, 30, 4, [1, 0.85, 0.5], 0.2); Tele.log('maze_page', { id }); }
function buildMazeRich() {
  const [rx, rz] = mzCell(1, 12); const rel = inked(new THREE.BoxGeometry(1.2, 1.4, 1.2), { color: 0xd8cbb0, shift: 0x8a2416, y0: 0, y1: 1.4 }); rel.position.y = 0.7;
  MZS.reliq = addEnt('mzreliq', 'mzreliq', rel, rx, rz); MZS.reliq.mesh.userData.height = 1.6; MZ.group.add(MZS.reliq.mesh); MZ.walls.push(MZS.reliqBox = { minX: rx - 0.6, maxX: rx + 0.6, minZ: rz - 0.6, maxZ: rz + 0.6 });
  const [cx, cz] = mzCell(12, 13); const cr = inked(new THREE.OctahedronGeometry(0.8, 0), { color: 0x2a4a6a, shift: 0x3fc1ff, y0: 0, y1: 2 }); cr.position.y = 1.2;
  MZS.crystal = addEnt('mzcrystal', 'mzcrystal', cr, cx, cz); MZS.crystal.mesh.userData.height = 2; MZ.group.add(MZS.crystal.mesh); MZ.walls.push(MZS.crystalBox = { minX: cx - 0.7, maxX: cx + 0.7, minZ: cz - 0.7, maxZ: cz + 0.7 });
  const cpad = inked(new THREE.CylinderGeometry(1.1, 1.3, 0.25, 8), { color: 0x3a2a20, ow: 0.02 }); cpad.position.set(cx, 0.12, cz); MZ.group.add(cpad);
  // scritta nel buio fra due lampade sentinella
  const a = MZ.lamps[2], b = MZ.lamps[6]; MZS.darkAt = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d'); g.fillStyle = 'rgba(140,220,255,.95)'; g.font = 'italic 70px Georgia'; g.fillText('il viaggiatore è già passato di qui', 20, 150);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; MZS.darkText = new THREE.Mesh(new THREE.PlaneGeometry(8, 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  MZS.darkText.position.set(MZS.darkAt.x, 0.03, MZS.darkAt.z); MZ.group.add(MZS.darkText);
  // dettagli: tubi d'inchiostro che gocciolano, fogli che volano
  for (let i = 0; i < 12; i++) { const [x, z] = mzCell((i * 7) % MZ.N, (i * 5 + 2) % MZ.N); const o = MZ.C * 0.42; const pipe = inked(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 8), { color: 0x2b221b, ow: 0.015 }); pipe.position.set(x + o, 1.3, z + o); MZ.group.add(pipe); MZS.items.push({ x: x + o, z: z + o, ph: i }); }
}
function mazeRichUpdate(dt) { if (!MZ.active || !MZS.reliq) return;
  if (!MZS.reliq.broken && grammar.has('mzreliq', 'state.fragile') && P.st === 'heavy' && P.hitDone && dist(P, MZS.reliq) < 2.6) { MZS.reliq.broken = true; MZS.reliq.mesh.visible = false; world.walls = world.walls.filter((w) => w !== MZS.reliqBox); sfx.play('break'); S.shake = 0.6; particles.burst(MZS.reliq.x, 0.8, MZS.reliq.z, 30, 5, [0.85, 0.78, 0.62], 0.2); mazePage('reliq', MZS.reliq.x, MZS.reliq.z); }
  if (!MZS.crystal.broken && grammar.has('mzcrystal', 'state.fragile') && grammar.has('mzcrystal', 'element.conductive')) { MZS.crystal.broken = true; MZS.crystal.mesh.visible = false; world.walls = world.walls.filter((w) => w !== MZS.crystalBox); sfx.play('glass'); sfx.play('electric'); S.flash = 0.5; particles.burst(MZS.crystal.x, 1.2, MZS.crystal.z, 50, 7, [0.3, 0.8, 1], 0.2); mazePage('crystal', MZS.crystal.x, MZS.crystal.z); }
  else if (!MZS.crystal.broken) MZS.crystal.mesh.rotation.y += dt * 0.8;
  const bothDark = grammar.has(MZ.lamps[2].id, 'light.dark') && grammar.has(MZ.lamps[6].id, 'light.dark'); MZS.darkText.material.opacity = lerp(MZS.darkText.material.opacity, bothDark ? 0.9 : 0, 0.05);
  if (bothDark && MZS.darkText.material.opacity > 0.7 && Math.hypot(P.x - MZS.darkAt.x, P.z - MZS.darkAt.z) < 6) mazePage('dark', MZS.darkAt.x, MZS.darkAt.z);
  if (MZ.stack && MZ.stack.broken && !MZS.found.has('stack')) mazePage('stack', MZ.stack.x, MZ.stack.z);
  if (frame % 10 === 0) for (const it of MZS.items) if (Math.hypot(it.x - P.x, it.z - P.z) < 14) { particles.emit(it.x, 2.4, it.z, 0, -2.5, 0, 1, 0.08, 0.04, 0.03, 0.03, 3); if (Math.random() < 0.04) traces.add(it.x + rnd(-0.3, 0.3), it.z + rnd(-0.3, 0.3), 0.5, 0, now); }
}


// ================= v1.8 · film in-engine: le pagine si compongono nel labirinto · mini-boss Il Copista =================
const FILM_T = FAST ? 1.6 : 8;
function startMazeFilm() { MZ.film = { t: 0, rnd: MZ.wallFinal.map(() => [Math.random(), Math.random(), Math.random(), Math.random()]) }; MZ.crest.visible = false; S.lock = true; dlg.skip && dlg.skip(); document.body.classList.add('filming'); opSub('Le pagine cadute si ricordano di essere state un labirinto.'); sfx.play('page'); }
const _fm = { p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p0: new THREE.Vector3(), q0: new THREE.Quaternion(), s0: new THREE.Vector3(), e: new THREE.Euler(), m: new THREE.Matrix4() };
function mazeFilmUpdate(dt) { const F = MZ.film; if (!F) return; F.t += dt; S.lock = true; const T = F.t / FILM_T * 8; const R = MZ.R, im = MZ.wallIM;
  if (!F.s2 && T > 3) { F.s2 = 1; opSub('Ogni foglio si piega, si squadra, diventa un muro.'); sfx.play('heavy'); }
  if (!F.s3 && T > 5.6) { F.s3 = 1; opSub('E il labirinto si richiude intorno a te.'); sfx.play('seal'); S.shake = 0.6; }
  MZ.wallFinal.forEach((fm, i) => { const r = F.rnd[i]; fm.decompose(_fm.p, _fm.q, _fm.s); const d = Math.hypot(_fm.p.x - R.cx, _fm.p.z - R.cz) / 62; const k = clamp((T - 0.4 - d * 4.2 - r[3] * 0.6) / 1.3, 0, 1), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    _fm.p0.set(_fm.p.x + (r[0] - 0.5) * 50, 18 + r[1] * 30, _fm.p.z + (r[2] - 0.5) * 50); _fm.e.set(r[0] * 6, r[1] * 6, r[2] * 6); _fm.q0.setFromEuler(_fm.e); _fm.s0.set(1.3, 0.04, 1.7);
    _fm.p0.lerp(_fm.p, e); _fm.q0.slerp(_fm.q, e); const sq = clamp(e * 1.4 - 0.4, 0, 1); _fm.s0.set(lerp(1.3, _fm.s.x, sq), lerp(0.04, _fm.s.y, sq), lerp(1.7, _fm.s.z, sq));
    _fm.m.compose(_fm.p0, _fm.q0, _fm.s0); im.setMatrixAt(i, _fm.m); });
  im.instanceMatrix.needsUpdate = true;
  if (frame % 2 === 0) particles.emit(R.cx + rnd(-40, 40), rnd(10, 30), R.cz + rnd(-40, 40), 0, -3, 0, 2, 0.3, 0.94, 0.9, 0.82, 0);
  if ((F.t > 1 && (input.pressed('attack') || input.pressed('interact'))) || F.t >= FILM_T) endMazeFilm(); }
function mazeFilmCamera(rdt) { const F = MZ.film, R = MZ.R; const T = F.t / FILM_T * 8; const a = 0.5 + T * 0.18; const hi = tmpV.set(R.cx + Math.sin(a) * 40, 52 - T * 2, R.cz + Math.cos(a) * 40);
  const b = clamp((T - 6.4) / 1.6, 0, 1); camera.position.copy(hi).lerp(camPos, b * b); camera.lookAt(lerp(R.cx, camLook.x, b), 0, lerp(R.cz, camLook.z, b)); }
function endMazeFilm() { const im = MZ.wallIM; MZ.wallFinal.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; MZ.crest.visible = true; MZ.film = null; S.lock = false; document.body.classList.remove('filming'); $('opSub').style.opacity = 0; camera.position.copy(camPos); if (MZ.afterFilm) { const f = MZ.afterFilm; MZ.afterFilm = null; setTimeout(f, 300); } }
// Il Copista: guardiano della radura davanti al vuoto
function spawnCopista() { const [x, z] = mzCell(MZ.EX, 2); const o = spawnMite(x, z, true); o.room = 'maze'; o.boss = true; o.hp = o.maxHp = 40; o.r = 0.95; o.aggroR = 8; o.home = { x, z }; o.mesh.scale.setScalar(3.1); o.summonT = 5; o.writeT = 8;
  const q = W.makeDoc(); q.scale.setScalar(0.6); q.position.set(0, 0.3, -0.2); o.mesh.add(q); for (const sd of [-1, 1]) { const h = inked(new THREE.ConeGeometry(0.06, 0.4, 5), { color: 0xe8dcc0, outline: false }); h.position.set(sd * 0.15, 0.35, 0.1); h.rotation.z = sd * -0.5; o.mesh.add(h); }
  MZ.boss = o; const bar = document.createElement('div'); bar.id = 'miniBar'; bar.innerHTML = '<div class="bname">IL COPISTA</div><div class="hbar"><i></i></div>'; bar.style.display = 'none'; document.body.appendChild(bar); }
function copistaAct(m, dt) { if (!m.engaged) { m.engaged = true; say([['narr', 'Il Copista alza la testa dal suo registro. Ricopia tutto: anche te.']]); sfx.tension(true); }
  m.summonT -= dt; m.writeT -= dt; if (m.hitT > 0) m.hitT -= dt;
  if (m.summonT <= 0) { m.summonT = m.hp < m.maxHp / 2 ? 5 : 7.5; for (let i = 0; i < (m.hp < m.maxHp / 2 ? 3 : 2); i++) { const a = Math.random() * 6.28; const c = spawnMite(m.x + Math.sin(a) * 2, m.z + Math.cos(a) * 2, false); c.room = 'maze'; c.aggroR = 30; c.home = { x: c.x, z: c.z }; } particles.burst(m.x, 1, m.z, 20, 4); sfx.play('voice', 0.2); toastSmall('Il Copista ricopia le sue macchie'); }
  if (m.writeT <= 0) { m.writeT = 11; if (!P.curse) curseStart('Il Copista'); }
  return false; }
function copistaUpdate() { const m = MZ.boss; const bar = $('miniBar'); if (!m || !bar) return; const show = m.alive && m.engaged && S.room === 'maze'; bar.style.display = show ? 'block' : 'none'; if (show) bar.querySelector('i').style.width = (Math.max(0, m.hp) / m.maxHp * 100) + '%';
  if (!m.alive && !m.dead) { m.dead = true; sfx.play('break'); S.shake = 1; S.flash = 0.4; toast('IL COPISTA È CANCELLATO'); gainDrops(15); spawnVial(m.x, m.z, true); journal('Hai sconfitto il Copista: il vuoto davanti alla piastra si può scrivere.'); sfx.tension(false); hint('Ora scrivi PONTE sul vuoto'); } }

window.PAL = { MZS,  ZONE, scene, renderer, camera,  OP, C3, startOpening, takeCurse, curseStart, collapseSupport, endingPage,  MZ, PROG, buildMaze, enterMaze, exitMaze, buySkill, useEraser, zoneTransition,  CR, vials, door, XW, tut, TUT, mem, C2, AR, rileg, dweights, damHeart, swarm, shelf, startChapter2: () => startChapter2(), lightHit: () => doHit(false), trap, wellEnt, breakBoard: () => breakBoard(), applyW: (id, w) => applyWord(ENT[id], w, 'panel'), damage: (n, f) => damagePlayer(n, f, 'test' + Math.random()), heavyHit: () => doHit(true), S, P, ENT, grammar, ink, Tele, mem, door, arena, gates, input, panel, dlg, custode, charger,
  start: startGame, begin: beginWithIntro, tp: (x, z) => { P.x = x; P.z = z; P.vx = P.vz = 0; }, face: (x, z) => { P.face = Math.atan2(x - P.x, z - P.z); },
  open: (id) => openPanel(id), select: (eff) => { const i = panel.words.indexOf(eff); if (i >= 0) selectWord(i); return i; }, confirm: confirmWord, close: closePanel,
  rewrite(id, eff) { if (panel.open) closePanel(); openPanel(id); if (!panel.open) return false; const i = panel.words.indexOf(eff); if (i < 0) { closePanel(); return false; } selectWord(i); const ok = ink.canSelect(); confirmWord(); closePanel(); return ok && grammar.has(id, eff); },
  interact, skipDialog: () => { let k = 0; while (dlg.active && !dlg.opt.choices && k++ < 50) { dlg.ch = 1e9; dlgNext(); } if (dlg.active && dlg.opt.choices) { dlg.i = dlg.lines.length - 1; dlg.ch = 1e9; } },
  choose: (i) => { if (dlg.active && dlg.opt.choices) pickChoice(i); }, attack: (heavy) => startAttack(heavy), quick: quickReapply, reset: resetPhrase, recompose,
  info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, pr, fps: window.__fps }), kill: () => { P.inv = 0; P.hp = 1; damagePlayer(5, null, null); }, room: () => S.room };
if (Q.has('autostart')) startGame();
