// Personaggi 3D dai modelli di Joseph (v2.3): caricati e puliti, rivestono i personaggi, stanno a terra, si muovono davvero
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
async function until(fn, ms, tick) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (tick) await E(tick); if (await E(fn)) return true; await W(200); } return false; }
await pg.goto(BASE + '?fast'); await W(800); await E(() => PAL.start()); await until(() => !PAL.S.lock, 20000, () => PAL.skipDialog());
check('i modelli usati arrivano e si puliscono', await until(() => PAL.M3D.caricati.length === 10 && PAL.M3D.falliti.length === 0, 60000));
check('protagonista, Caricatore, Custode, Ladro, giurato e Lumi in 3D', await until(() => ['player', 'charger', 'custode', 'ladro', 'juror', 'lumi'].every((k) => PAL.M3[k]), 20000));
check('la vecchia penna gigante è nascosta', await E(() => !PAL.P.mesh.userData.quill.visible));
// a terra: la base di una macchia sta sul pavimento anche se il suo gruppo è sollevato
const g = await E(() => { const o = PAL.spawnMite(0, 0); const m = o.mesh.userData.model; PAL.scene.updateMatrixWorld(true); return { is3d: !!m, y: o.mesh.position.y }; });
check('le macchie sono modelli 3D', g.is3d);
await W(1500);
check('la macchia non fluttua: tra un salto e l\'altro la base tocca il pavimento', await E(() => new Promise((res) => { const o = PAL.swarm[PAL.swarm.length - 1]; const m = o.mesh.userData.model; let lo = 9, n = 0; const f = () => { const v = m.getWorldPosition(m.position.clone()); lo = Math.min(lo, Math.abs(v.y)); if (++n < 40) requestAnimationFrame(f); else res(lo < 0.05); }; requestAnimationFrame(f); })));
await E(() => { for (const m of PAL.swarm) { m.alive = false; PAL.scene.remove(m.mesh); } });
// cammina: la fase del passo avanza e la velocità sale; da fermo torna calmo
await pg.click('#inkLabel', { force: true }); const U = () => PAL.M3.player.userData.anim.U;
await E(() => { PAL.tp(0, 6); const u = PAL.M3.player.userData.anim.U; window.__w = { ph0: u.uPh.value, max: 0 }; const f = () => { window.__w.max = Math.max(window.__w.max, u.uSpd.value); window.__w.ph = u.uPh.value; if (!window.__w.stop) requestAnimationFrame(f); }; requestAnimationFrame(f); });
await pg.keyboard.down('w'); await W(3000);
const w = await E(() => { window.__w.stop = true; return window.__w; }); console.log('passo', JSON.stringify(w));
check('camminando i passi avanzano', w.ph > w.ph0 + 0.5 && w.max > 0.2);
check('il mantello resta indietro (parti esterne trascinate)', await E(() => PAL.M3.player.userData.anim.U.uDrag.value.length() > 0.005));
await pg.keyboard.up('w'); await W(2500);
check('da fermo si calma', await E(() => PAL.M3.player.userData.anim.U.uSpd.value < 0.15));
// v2.5 · scheletro: il protagonista ha le ossa, e quando colpisce il braccio si alza davvero
check('il protagonista ha uno scheletro', await E(() => !!PAL.M3.player.userData.rig && PAL.M3.player.isSkinnedMesh));
await E(() => { window.__arm = 0; PAL.P.st = 'idle'; PAL.attack(true); const B = PAL.M3.player.userData.rig.bones; const f = () => { window.__arm = Math.min(window.__arm, B.shR.rotation.x); if (PAL.P.st === 'heavy') requestAnimationFrame(f); }; requestAnimationFrame(f); });
check('nel colpo forte le braccia salgono sopra la testa', await until(() => window.__arm < -1.5, 15000));
// Lumi rimbalza vicino a te, non vola
check('Lumi sta a terra (rimbalza, non vola)', await E(() => { const m = PAL.M3.lumi; if (!m.parent.visible) return true; const v = m.getWorldPosition(m.position.clone()); return v.y < 0.5; }));
await W(500); console.log('ERRORS', errs); if (bad || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS modelli'); await b.close();
