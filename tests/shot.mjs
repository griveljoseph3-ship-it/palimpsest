import { chromium } from 'playwright-core';
const [x = '0', z = '-58', name = 'look', w = '1366', h = '1024'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: true })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await pg.goto('http://localhost:8941/?fast'); await pg.waitForTimeout(800); await pg.evaluate(() => PAL.start()); await pg.waitForTimeout(400); await pg.evaluate(() => PAL.skipDialog());
await pg.evaluate(([x, z]) => { PAL.S.discovered.add('state.fragile'); PAL.S.discovered.add('temperament.cautious'); PAL.S.discovered.add('element.conductive'); PAL.tp(+x, +z); }, [x, z]);
await pg.waitForTimeout(3500); await pg.evaluate(() => PAL.skipDialog()); if (process.env.OPEN) await pg.evaluate((id) => PAL.open(id), process.env.OPEN);
await pg.waitForTimeout(1200); await pg.screenshot({ path: `/workspace/palimpsest-shots/${name}.png` }); console.log(errs); await b.close();
