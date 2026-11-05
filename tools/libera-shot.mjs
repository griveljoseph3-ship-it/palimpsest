// Strumento: foto della rivelazione di LIBERA — node tools/libera-shot.mjs <base-url> <file.png>
import { chromium } from 'playwright-core';
const [base, out] = [process.argv[2], process.argv[3]];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms);
await pg.goto(base + '?fast'); await W(800); await E(() => PAL.start()); for (let i = 0; i < 40; i++) { await E(() => PAL.skipDialog()); if (!(await E(() => PAL.S.lock))) break; await W(200); }
await E(() => { for (const g in PAL.gates) PAL.gates[g].open = true; PAL.S.encounter = null; PAL.tp(0, -95.5); }); await W(4000); await E(() => PAL.skipDialog()); await W(1500);
await E(() => PAL.elaraTwist()); await W(5000); await pg.screenshot({ path: out }); console.log(errs); await b.close();
