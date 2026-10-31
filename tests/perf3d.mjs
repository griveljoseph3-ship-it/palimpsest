// confronto draw call / triangoli / fps: personaggi 3D (default) contro ?3d=0 (vecchi procedurali)
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const spots = [['intro+galleria', 0, 2], ['Caricatore', 0, -24], ['porta+Elara', 0, -92], ['arena Custode', 0, -112], ['c2b Rilegatore', 100, -12]];
for (const q of ['', '&3d=0']) {
  const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  const t0 = Date.now(); await pg.goto('http://localhost:8941/?fast' + q); await pg.waitForFunction(() => window.PAL, null, { timeout: 60000 }); const load = Date.now() - t0;
  await pg.evaluate(() => PAL.start()); await pg.waitForTimeout(400); await pg.evaluate(() => PAL.skipDialog());
  console.log('\n### ' + (q ? 'VECCHI (3d=0)' : 'MODELLI 3D') + ' caricamento ' + load + ' ms', q ? '' : JSON.stringify(await pg.evaluate(() => PAL.M3D)));
  for (const [n, x, z] of spots) { await pg.evaluate(([x, z]) => PAL.tp(x, z), [x, z]); await pg.waitForTimeout(2500); console.log(n.padEnd(16), JSON.stringify(await pg.evaluate(() => PAL.info()))); }
  console.log('errori:', errs); await pg.close(); }
await b.close();
