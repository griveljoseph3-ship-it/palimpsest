// Strumento: foto della scena della scrittura (FRAGILE sul Caricatore) — node tools/scrittura-shots.mjs <base-url> <cartella>
import { chromium } from 'playwright-core';
const [base, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms);
await pg.goto(base + '?fast'); await W(1200); await E(() => PAL.start()); for (let i = 0; i < 40; i++) { await E(() => PAL.skipDialog()); if (!(await E(() => PAL.S.lock))) break; await W(200); }
await E(() => { for (const g in PAL.gates) PAL.gates[g].open = true; PAL.P.inv = 1e9; PAL.S.discovered.add('state.fragile'); PAL.tp(0, -23); }); await W(3500); await E(() => PAL.skipDialog());
await E(() => { PAL.charger.x = 0; PAL.charger.z = -27; PAL.charger.st = 'idle'; if (PAL.SCR) { PAL.SCR.force = true; PAL.SCR.speed = 0.2; } PAL.face(0, -27); PAL.rewrite('charger', 'state.fragile'); });
for (const [tt, n] of [[0.6, 'a-occhi'], [1.2, 'b-scrive'], [1.75, 'c-scrive2'], [2.4, 'd-accesa']]) { await pg.waitForFunction((x) => !PAL.SCR.on || (performance.now() > 0 && window.__scrT >= x), tt, { timeout: 60000 }).catch(() => {}); await pg.screenshot({ path: `${out}/${n}.png` }); }
await pg.waitForFunction(() => !PAL.SCR.on, null, { timeout: 60000 }); await W(400); await pg.screenshot({ path: `${out}/e-stacco.png` });
await W(2500); console.log(JSON.stringify(await E(() => ({ fragile: PAL.grammar.has('charger', 'state.fragile'), lock: PAL.S.lock, paused: PAL.isPaused ? PAL.isPaused() : null }))), errs); await b.close();
