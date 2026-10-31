// v1.9.0-prova3d · Personaggi 3D dai fogli di Joseph (assets/modelli/*.glb, meshopt + webp).
// Si caricano PRIMA di costruire il mondo; se un file non arriva resta il personaggio procedurale (fallback).
// ?3d=0 nell'indirizzo = gioco con i vecchi personaggi (per confronto).
import * as THREE from '../vendor/three.module.js?v=1.9.0-prova3d';
import { GLTFLoader } from '../vendor/GLTFLoader.js?v=1.9.0-prova3d';
import { MeshoptDecoder } from '../vendor/meshopt_decoder.module.js?v=1.9.0-prova3d';
import { inkMaster, outlineMat, withMask } from './art.js?v=1.9.0-prova3d';

export const NOMI = ['correttore', 'elara', 'ilde', 'custode', 'macchia', 'caricatore', 'rilegatore', 'elara_bambina', 'robot', 'figura_velata', 'creatura_spine', 'blob_tentacoli'];
const M = {}; export const STATO = { caricati: [], falliti: [], ms: 0 };
export const has = (n) => !!M[n];

// geometria "piatta": attributi float, trasformazioni del nodo applicate, piedi a y=0, centro in x/z, altezza 1
function bake(root) {
  root.updateMatrixWorld(true); let mesh = null; root.traverse((o) => { if (o.isMesh && !mesh) mesh = o; }); if (!mesh) return null;
  const src = mesh.geometry, g = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) { const a = src.attributes[k]; if (!a) continue; const n = a.count, s = a.itemSize, f = new Float32Array(n * s);
    for (let i = 0; i < n; i++) { f[i * s] = a.getX(i); if (s > 1) f[i * s + 1] = a.getY(i); if (s > 2) f[i * s + 2] = a.getZ(i); } g.setAttribute(k, new THREE.BufferAttribute(f, s)); }
  if (src.index) g.setIndex(Array.from(src.index.array));
  g.applyMatrix4(mesh.matrixWorld); g.computeBoundingBox(); const b = g.boundingBox, h = b.max.y - b.min.y;
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); g.scale(1 / h, 1 / h, 1 / h);
  if (!g.attributes.normal) g.computeVertexNormals(); g.normalizeNormals(); withMask(g, 1); g.computeBoundingBox(); g.computeBoundingSphere();
  const map = mesh.material && mesh.material.map; if (map) { map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; }
  return { geo: g, map };
}

export async function loadModels(base = 'assets/modelli/', timeoutMs = 25000) {
  const t0 = performance.now(); const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const one = (n) => new Promise((res) => { const to = setTimeout(() => { STATO.falliti.push(n + ' (tempo scaduto)'); res(); }, timeoutMs);
    loader.load(base + n + '.glb?v=1.9.0-prova3d', (gl) => { clearTimeout(to); try { const r = bake(gl.scene); if (r) { M[n] = r; STATO.caricati.push(n); } else STATO.falliti.push(n); } catch (e) { STATO.falliti.push(n + ' ' + e.message); } res(); },
      undefined, (e) => { clearTimeout(to); STATO.falliti.push(n + ' ' + (e && e.message || 'errore')); res(); }); });
  try { await MeshoptDecoder.ready; await Promise.all(NOMI.map(one)); } catch (e) { STATO.falliti.push('decoder ' + e.message); }
  STATO.ms = Math.round(performance.now() - t0); return STATO;
}

// Mesh a inchiostro con la texture del disegno: stessi effetti del gioco (colpo, dissolvenza, crepe, bagliore, luci).
export function makeModel(n, height, o = {}) {
  const d = M[n]; if (!d) return null; const mat = inkMaster({ color: 0xffffff, map: d.map, y0: 0, y1: height, texBlend: o.texBlend ?? 0.12 });
  mat.side = THREE.DoubleSide; const m = new THREE.Mesh(d.geo, mat); m.scale.setScalar(height); m.userData.model3d = n;
  if (o.outline !== false) { const ol = new THREE.Mesh(d.geo, outlineMat((o.ow ?? 0.012) / height)); ol.renderOrder = -1; m.add(ol); m.userData.outline = ol; }
  if (o.rotY) m.rotation.y = o.rotY; return m;
}
