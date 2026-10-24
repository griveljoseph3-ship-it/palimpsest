// Boss (v2.0): il Copista ha attacchi propri (riga, macchie, pozze), si stanca, ha la fase 2; il Custode disegna la corsia di carica e mette in scena le fasi
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
async function until(fn, ms, tick) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (tick) await E(tick); if (await E(fn)) return true; await W(150); } return false; }
const SHOTS = process.env.SHOTS; const shot = (n) => SHOTS ? pg.screenshot({ path: `${SHOTS}/${n}.png` }) : null;
await pg.goto(BASE + '?fast'); await W(800); await E(() => PAL.start()); await until(() => !PAL.S.lock, 20000, () => PAL.skipDialog());
// ---- Copista ----
await E(() => PAL.enterMaze()); await until(() => PAL.S.room === 'maze' && !PAL.MZ.film && !PAL.S.transit, 20000, () => { if (PAL.MZ.film) PAL.MZ.film.t = 99; PAL.skipDialog(); });
await E(() => { const m = PAL.MZ.boss; PAL.P.hp = 6; PAL.tp(m.x, m.z + 5); });
check('il Copista si accorge di te (momento del boss)', await until(() => PAL.MZ.boss.engaged, 20000, () => { PAL.P.hp = 6; PAL.skipDialog(); }));
check('scritta del boss sullo schermo', await E(() => document.getElementById('bossCard').classList.contains('on')));
await shot('copista-intro');
check('riga d\'inchiostro: la corsia appare prima del colpo', await until(() => PAL.MZ.boss.st === 'lineWU' && PAL.lanes.length > 0, 20000, () => { PAL.P.hp = 6; PAL.skipDialog(); const m = PAL.MZ.boss; if (m.st === 'walk') { m.atkT = Math.min(m.atkT, 0.1); PAL.tp(m.x, m.z + 5); } }));
await shot('copista-line');
check('dopo la riga il Copista è stanco (vulnerabile)', await until(() => PAL.MZ.boss.st === 'tired' || PAL.MZ.boss.tired, 30000, () => { PAL.P.hp = 6; }));
const hp0 = await E(() => PAL.MZ.boss.hp); await E(() => { const m = PAL.MZ.boss; PAL.tp(m.x, m.z + 1.6); PAL.face(m.x, m.z); PAL.attack(false); }); await until(() => PAL.P.st === 'idle', 20000);
check('colpo sul Copista stanco fa più danno', await E((h) => h - PAL.MZ.boss.hp > 1.2, hp0));
await E(() => { const m = PAL.MZ.boss; m.st = 'walk'; m.tired = false; m.atkT = 0.05; PAL.tp(m.x + 1.5, m.z + 1.5); });
check('macchie lanciate lasciano pozze che rallentano', await until(() => PAL.pools.length > 0, 20000, () => { PAL.P.hp = 6; const m = PAL.MZ.boss; if (m.st === 'walk') { m.atkT = 0.05; PAL.tp(m.x + 1.5, m.z + 1.5); } }));
await E(() => { const q = PAL.pools[0]; PAL.tp(q.x, q.z); }); await W(300); check('nella pozza si è rallentati', await E(() => PAL.P.slow < 1));
await E(() => { PAL.MZ.boss.hp = PAL.MZ.boss.maxHp * 0.4; }); check('fase 2 sotto metà vita', await until(() => PAL.MZ.boss.p2, 20000, () => { PAL.P.hp = 6; })); await shot('copista-p2');
await E(() => { PAL.MZ.boss.hp = 0; PAL.MZ.boss.alive = false; }); await until(() => PAL.MZ.boss.dead, 20000);
// ---- Custode ----
await E(() => { PAL.exitMaze(); }); await until(() => PAL.S.room === 'conduct' && !PAL.S.transit, 20000, () => PAL.skipDialog());
await E(() => { PAL.charger.alive = false; PAL.charger.st = 'dead'; for (const g of ['board', 'r1', 'r2', 'door']) PAL.gates[g].open = true; PAL.S.encounter = null; PAL.tp(0, -112.6); });
await until(() => PAL.S.room === 'arena', 20000); await until(() => !PAL.dlg.active, 20000, () => PAL.skipDialog());
check('Custode: la carica disegna la sua corsia a terra', await until(() => PAL.custode.st === 'windup' && PAL.lanes.length > 0, 20000, () => { PAL.P.hp = 6; const c = PAL.custode; if (c.st === 'idle') { c.cd = 0; PAL.tp(c.x, c.z + 7); } }));
await shot('custode-lane');
await E(() => { PAL.custode.armorHP = PAL.custode.armorMax * 0.6; PAL.S.wordUse['state.fragile'] = 3; });
check('Custode fase 2 messa in scena (scritta + camera)', await until(() => PAL.C3.phase === 2 && document.getElementById('bossCard').textContent.includes('FASE 2'), 20000, () => { PAL.P.hp = 6; PAL.skipDialog(); }));
await shot('custode-p2');
await E(() => { PAL.P.hp = 6; PAL.P.inv = 0; PAL.tp(14, -124); PAL.tideStart(); }); // lontano dai pilastri: l'onda deve colpire
check('onda d\'inchiostro: parte e attraversa l\'arena', await until(() => PAL.tides.length > 0 && PAL.tides[0].t > 0, 30000, () => { PAL.P.inv = 0; PAL.skipDialog(); }));
check('onda d\'inchiostro: ferisce chi resta allo scoperto', await until(() => PAL.P.hp < 6, 40000, () => { PAL.tp(14, -124); PAL.skipDialog(); }));
await shot('custode-tide');
console.log('ERRORS', errs); if (bad || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS boss'); await b.close();
