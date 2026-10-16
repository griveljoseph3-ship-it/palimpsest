// Audit visivo: ogni stanza da 2 punti, iPad landscape. BASE e TAG da argv.
import { chromium } from 'playwright-core';
const [BASE = 'http://localhost:8941/', TAG = 'after'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(BASE + '?fast'); await pg.waitForTimeout(800); await pg.evaluate(() => PAL.start()); await pg.waitForTimeout(400); await pg.evaluate(() => PAL.skipDialog());
const spots = [['intro-a', 0, 2], ['intro-b', 3, -3], ['charger-a', 0, -12], ['charger-b', -4, -17], ['conduct-a', 0, -26], ['conduct-b', 4, -31], ['door-a', 0, -40], ['door-b', -3, -45], ['arena-a', 0, -54], ['arena-b', 5, -62]];
for (const [n, x, z] of spots) { await pg.evaluate(([x, z]) => { PAL.tp(x, z); PAL.P.hp = 5; }, [x, z]); await pg.waitForTimeout(1800); await pg.evaluate(() => PAL.skipDialog()); await pg.waitForTimeout(300);
  await pg.screenshot({ path: `/workspace/palimpsest-shots/audit/${TAG}-${n}.png` }); }
console.log(TAG, errs); await b.close();
