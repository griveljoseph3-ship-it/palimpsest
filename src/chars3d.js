// v1.9.0-prova3d · Personaggi 3D: avvolgono i personaggi procedurali di chars.js.
// Gli agganci di gioco (body, armor, core, quillPivot, nib, eye, halo...) restano gli stessi: si nascondono solo i pezzi
// disegnati a mano e al loro posto si mette il modello 3D. Se il modello non c'è, resta il vecchio personaggio.
import * as THREE from '../vendor/three.module.js?v=1.9.0-prova3d';
import * as CH from './chars.js?v=1.9.0-prova3d';
import { makeModel, has } from './modelli.js?v=1.9.0-prova3d';
export { makeLumi, makeCopistaExtras } from './chars.js?v=1.9.0-prova3d';

const hideAll = (grp, keep = []) => { for (const c of grp.children) if (!keep.includes(c)) c.visible = false; };
const RED = new THREE.Color(0.5, 0.05, 0.02), BLACK = new THREE.Color(0, 0, 0);
// larghezza/profondità del modello normalizzato (altezza 1)
const dims = (m) => { const b = m.geometry.boundingBox; return { w: b.max.x - b.min.x, d: b.max.z - b.min.z }; };

// Il Correttore (giocatore): modello al posto di mantello/cappuccio/sciarpa; la penna procedurale resta per i colpi
export function makePlayer() {
  const g = CH.makePlayer(); if (!has('correttore')) return g; const u = g.userData;
  hideAll(u.body, [u.quillPivot]); const wrap = new THREE.Group(); u.body.add(wrap); const m = makeModel('correttore', 1.92, { ow: 0.016 }); wrap.add(m);
  const base = m.scale.x; const orig = u.anim;
  u.anim = (t, sp = 0) => { orig(t, sp); const k = Math.min(1, sp / 5); m.scale.set(base, base * (1 + Math.sin(t * 2.1) * 0.008), base); // respiro
    wrap.rotation.z = Math.sin(t * 1.7) * 0.015 + Math.sin(t * 11) * 0.03 * k; wrap.rotation.y = Math.sin(t * 5.5) * 0.06 * k; };
  Object.assign(u, { cloak: wrap, model: m, is3d: true }); return g;
}

// Elara (17 anni)
export function makeElara() {
  const g = CH.makeElara(); if (!has('elara')) return g; const u = g.userData; hideAll(u.body);
  const m = makeModel('elara', 1.62, { ow: 0.01 }); u.body.add(m); Object.assign(u, { model: m, is3d: true }); return g;
}

// Le macchie / acari d'inchiostro (tav. 019/028): il modello "macchia"; restano il bagliore degli occhi (bianco → rosso quando scatta)
export function makeMite() {
  const m = CH.makeMite(); if (!has('macchia')) return m; const u = m.userData;
  m.material.visible = false; if (u.outline) { u.outline.visible = false; delete u.outline; }
  hideAll(m, [u.eyeGlow]); u.eyeGlow.position.set(0, 0.1, 0.27);
  const md = makeModel('macchia', 0.66, { outline: false }); md.position.y = -0.3; m.add(md); const base = md.scale.x, seed = Math.random() * 10;
  const orig = u.anim; u.anim = (t, o) => { orig(t, o); const angry = o && (o.tell > 0 || o.lunge > 0 || o.boss); const b = Math.abs(Math.sin(t * 4 + seed));
    md.position.y = -0.3 + b * 0.035; md.scale.set(base * (1 + (1 - b) * 0.05), base * (1 - (1 - b) * 0.05), base * (1 + (1 - b) * 0.05)); md.rotation.z = Math.sin(t * 2.6 + seed) * 0.06;
    md.material.uniforms.uGlow.value.copy(angry ? RED : BLACK); };
  Object.assign(u, { model: md, is3d: true }); return m;
}

// Il Custode della Fenditura: modello del golem di libri; nucleo rosso spostato davanti al petto; la "corazza" (componente) resta come gruppo
export function makeCustode() {
  const g = CH.makeCustode(); if (!has('custode')) return g; const u = g.userData; const H = 3.3 / 1.12;
  hideAll(u.body, [u.core, u.armor]); hideAll(u.armor);
  const m = makeModel('custode', H, { ow: 0.02 }); u.body.add(m); const d = dims(m);
  u.core.position.set(0, H * 0.6, d.d * H * 0.5 + 0.05); u.core.scale.setScalar(0.7);
  Object.assign(u, { model: m, is3d: true }); return g;
}

// Il Caricatore (DA CONFERMARE con Joseph: foglio "acaro_inchiostro", scarabeo col guscio di piastre di carta)
export function makeCharger() {
  const g = CH.makeCharger(); if (!has('caricatore')) return g; const u = g.userData; const H = 1.3;
  hideAll(u.body, [u.core, u.armor]); hideAll(u.armor); for (const c of u.body.children) if (c.isSprite) c.visible = true; // bagliore degli occhi
  const m = makeModel('caricatore', H, { ow: 0.014 }); u.body.add(m); const d = dims(m);
  u.core.position.set(0, H * 0.8, -d.d * H * 0.3); u.core.scale.setScalar(0.42); // nucleo sul dorso
  Object.assign(u, { model: m, is3d: true }); return g;
}

// Il Rilegatore (DA CONFERMARE: foglio "blob con maschera a becco"); i fili color crema (componente) restano e si allargano sul modello
export function makeRilegatore() {
  const g = CH.makeRilegatore(); if (!has('rilegatore')) return g; const u = g.userData; const H = 2.05;
  hideAll(u.body, [u.armor]); const m = makeModel('rilegatore', H, { ow: 0.016 }); u.body.add(m); const d = dims(m);
  const k = Math.max(1, (Math.max(d.w, d.d) * H / 2) / 0.6 * 0.9); u.armor.scale.set(k, 1, k * Math.min(1, d.d / d.w + 0.15)); u.armor.rotation.x = 0;
  Object.assign(u, { model: m, is3d: true }); return g;
}

// Statue della "galleria" (personaggi senza nome sicuro, o senza un posto nel Capitolo 1): solo da guardare
export function makeStatue(n, h) { const m = makeModel(n, h, { ow: 0.012 }); if (!m) return null; const g = new THREE.Group(); g.add(m); g.userData = { model: m, is3d: true, name: n }; return g; }
