// Scene (v2.1): fuga dal labirinto con l'inchiostro che sale, colpo di scena di Elara (LIBERA), il Custode sale dal pavimento, lettera di Ilde
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
async function until(fn, ms, tick) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (tick) await E(tick); if (await E(fn)) return true; await W(150); } return false; }
const SHOTS = process.env.SHOTS; const shot = (n) => SHOTS ? pg.screenshot({ path: `${SHOTS}/${n}.png` }) : null;
await pg.goto(BASE + '?fast'); await W(800); await E(() => PAL.start()); await until(() => !PAL.S.lock, 20000, () => PAL.skipDialog());
// ---- fuga dal labirinto ----
await E(() => { PAL.S.discovered.add('element.conductive'); PAL.S.discovered.add('shape.bridge'); PAL.enterMaze(); }); await until(() => PAL.S.room === 'maze' && !PAL.MZ.film && !PAL.S.transit, 40000, () => { if (PAL.MZ.film) PAL.MZ.film.t = 99; PAL.skipDialog(); });
await E(() => { PAL.MZ.boss.alive = false; PAL.MZ.boss.dead = true; PAL.P.hp = 6; const p = PAL.MZ.plate; PAL.tp(p.x, p.z + 1.2); PAL.grammar.apply('mzplate', 'element.conductive'); });
check('riaccendere il filo fa salire l\'inchiostro', await until(() => !!PAL.MZ.flood, 20000, () => { PAL.P.hp = 6; PAL.skipDialog(); }));
check('la scala si scrive all\'ingresso (a sud)', await until(() => PAL.MZ.steps[0].visible && PAL.MZ.steps[0].position.z > PAL.MZ.R.cz + PAL.MZ.R.d / 2 - 6, 30000, () => { PAL.P.hp = 6; PAL.skipDialog(); }));
const fz = await E(() => PAL.MZ.flood.z); await W(4000);
check('l\'inchiostro avanza verso sud', await E((z) => PAL.MZ.flood.z > z + 0.5, fz));
check('i muri alle spalle crollano', await until(() => PAL.MZ.flood.fall.some((v) => v > 0.5), 30000, () => { PAL.P.hp = 6; }));
await shot('fuga');
check('restare nell\'inchiostro fa male', await until(() => PAL.P.hp < 6, 20000, () => { PAL.P.inv = 0; PAL.tp(PAL.P.x, PAL.MZ.flood.z - 2); PAL.skipDialog(); }));
check('musica del boss durante la fuga', await E(() => PAL.musicMood() === 'boss'));
await E(() => { const s = PAL.MZ.steps[0]; PAL.P.hp = 6; PAL.tp(s.position.x, s.position.z - 1); });
check('dalla scala si esce alla pressa', await until(() => { const it = PAL.interactables().find((i) => i.label === 'sali'); if (it) it.fn(); return PAL.S.room === 'conduct'; }, 30000, () => { PAL.P.hp = 6; PAL.skipDialog(); }));
// ---- colpo di scena di Elara ----
await E(() => { for (const g of ['board', 'r1', 'r2']) PAL.gates[g].open = true; PAL.charger.alive = false; PAL.charger.st = 'dead'; PAL.S.encounter = null; PAL.tp(0, -80); }); await until(() => PAL.S.room === 'door', 20000); await until(() => !PAL.dlg.active, 20000, () => PAL.skipDialog());
await E(() => { PAL.S.discovered.add('state.fragile'); PAL.rewrite('relay', 'state.fragile'); PAL.tp(5.4, -96.9); PAL.face(5.4, -98.4); PAL.attack(true); });
check('dopo la porta Elara riconosce la voce di Ilde', await until(() => PAL.dlg.active && PAL.dlg.lines.some((l) => l[1].includes('È Ilde')), 40000));
check('sotto COLPEVOLE appare LIBERA', await until(() => PAL.elara.userData.st.verdict === 'LIBERA', 40000, () => { if (PAL.dlg.active) PAL.skipDialog(); }));
await shot('libera');
check('la scena si chiude e restituisce il controllo', await until(() => !PAL.S.lock && !PAL.dlg.active, 40000, () => PAL.skipDialog()));
// ---- il Custode sale dal pavimento ----
await E(() => { PAL.P.hp = 6; PAL.tp(0, -112.6); }); await until(() => PAL.S.room === 'arena', 20000);
check('entrando nell\'arena il Custode sale dal pavimento', await E(() => PAL.custode.rise > 0 && PAL.custode.mesh.position.y < 0));
await W(800); await shot('custode-sale');
// ---- lettera di Ilde: i tre pezzi ----
await E(() => { for (const k of ['lettera1', 'lettera2', 'lettera3']) { const q = PAL.PICKS[k]; if (q) { q.x = PAL.P.x + 1; q.z = PAL.P.z; } else PAL.dropPickup(k, PAL.P.x + 1, PAL.P.z); } }); // il pezzo 1 sta già nel labirinto: lo si porta qui
check('tre pezzi: la lettera si legge sulla pagina illustrata', await until(() => document.getElementById('letterPage') && document.getElementById('letterPage').classList.contains('on'), 30000, () => { PAL.P.hp = 6; PAL.tp(PAL.P.x + (Math.random() - 0.5) * 0.4, PAL.P.z); }));
await shot('lettera');
check('premio della lettera: il Segnalibro di Ilde', await until(() => PAL.PROG.items.segnalibro, 40000, () => PAL.skipDialog()));
console.log('ERRORS', errs); if (bad || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS scenes'); await b.close();
