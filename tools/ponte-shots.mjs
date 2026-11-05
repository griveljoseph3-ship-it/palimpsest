// Strumento: foto del PONTE dell'apertura mentre il viaggiatore attraversa — node tools/ponte-shots.mjs <base-url> <prefisso>
import { chromium } from 'playwright-core';
const [base, out] = [process.argv[2], process.argv[3]];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms);
async function until(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await E(fn)) return true; await W(200); } return false; }
await pg.goto(base + '?fast'); await W(800); await E(() => PAL.begin(true)); await until(() => PAL.OP.stage === 'gap', 30000); await W(800);
await E(() => { PAL.face(PAL.OP.R.cx, PAL.OP.R.cz - 5); PAL.rewrite('opbridge', 'shape.bridge'); }); await until(() => PAL.OP.stage === 'build' && !PAL.OP.chasm, 20000);
await E(() => { PAL.tp(PAL.OP.R.cx, PAL.OP.R.cz + 2.2); }); await pg.click('#inkLabel', { force: true }).catch(() => {});
await pg.keyboard.down('w'); for (let i = 0; i < 40; i++) { if (await E(() => PAL.P.z < PAL.OP.R.cz + 0.3)) break; await W(150); } await pg.keyboard.up('w'); await W(1200);
await pg.screenshot({ path: out + '-ponte.png' }); console.log(errs); await b.close();
