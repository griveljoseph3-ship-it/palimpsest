import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 }, hasTouch: true })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
await pg.goto((process.env.BASE || 'http://localhost:8941/') + '?fast'); await W(800); await E(() => PAL.start()); await W(400); await E(() => PAL.skipDialog());
await E(() => PAL.tp(0, -80)); await W(1500); await E(() => PAL.skipDialog()); await E(() => { PAL.P.x = 0; PAL.P.z = -96.5; PAL.interact(); }); await W(300); await E(() => PAL.skipDialog()); await E(() => PAL.choose(0)); await W(500);
let out = 0, maxN = 0, wallHits = 0;
for (let k = 0; k < 60; k++) { const r = await E(() => { PAL.P.hp = 5; const ms = PAL.door.mites.filter((m) => m.alive); return { n: ms.length, out: ms.filter((m) => Math.abs(m.x) > 15.85 || m.z > -76.1 || m.z < -99.9).length, def: !!PAL.door.defense }; }); out += r.out; maxN = Math.max(maxN, r.n); if (!r.def && k > 3) break; await W(500); }
check('difesa avviata con molte macchie', maxN >= 4); check('nessuna macchia fuori dai muri', out === 0);
console.log('max', maxN, 'out', out, 'ERRORS', errs); if (bad || errs.length) process.exitCode = 1; await b.close();
