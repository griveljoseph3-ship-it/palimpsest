import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1194, height: 834 } })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms);
await pg.goto((process.env.BASE || 'http://localhost:8941/') + '?fast'); await W(800); await E(() => PAL.start()); await W(800); await E(() => PAL.skipDialog());
const info = [];
for (const [n, x, z] of [['intro', 0, 4], ['charger', 0, -22], ['conduct', 0, -50], ['door', 0, -80], ['arena', 0, -114], ['archive', 40, -18], ['crypt', -40, -22]]) {
  await E(([x, z]) => { PAL.tp(x, z); PAL.P.inv = 99; }, [x, z]); await W(1500); await E(() => PAL.skipDialog()); await W(2500);
  await pg.screenshot({ path: `/workspace/palimpsest-shots/v14-${n}.png` }); info.push([n, await E(() => { const i = PAL.info(); return [i.calls, i.tris, PAL.S.room]; })]);
}
console.log(JSON.stringify(info), errs); await b.close();
