// Musica generata (v2.0): parte con il gioco, cambia stato d'animo per stanza e incontro, suona davvero delle note
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
async function until(fn, ms, tick) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (tick) await E(tick); if (await E(fn)) return true; await W(150); } return false; }
await pg.goto(BASE + '?fast'); await W(800); await E(() => PAL.start()); await until(() => !PAL.S.lock, 20000, () => PAL.skipDialog());
check('la musica è partita', await E(() => !!PAL.sfx.mus));
check('suona note vere (melodia/basso)', await until(() => PAL.sfx.mus.notes > 4, 20000));
check('corridoio: esplorazione', await until(() => PAL.sfx.mus.mood === 'explore', 20000));
await E(() => { PAL.gates.board.open = true; PAL.tp(0, -22); }); await until(() => PAL.S.room === 'charger', 20000, () => PAL.skipDialog());
check('Caricatore: combattimento', await until(() => PAL.sfx.mus.mood === 'combat', 20000, () => PAL.skipDialog()));
await E(() => { PAL.charger.alive = false; PAL.charger.st = 'dead'; for (const g of ['r1', 'r2', 'door']) PAL.gates[g].open = true; PAL.S.encounter = null; PAL.tp(0, -112.6); });
check('Custode: musica del boss', await until(() => PAL.sfx.mus.mood === 'boss', 20000, () => PAL.skipDialog()));
await E(() => PAL.sfx.sting('combo')); check('accordo della combinazione senza errori', true);
console.log('ERRORS', errs); if (bad || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS music'); await b.close();
