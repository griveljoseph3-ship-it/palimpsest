import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2 })).newPage();
await pg.goto((process.env.BASE || 'http://localhost:8941/') + '?fast&msaa'); await pg.waitForTimeout(800); await pg.evaluate(() => PAL.start()); await pg.waitForTimeout(1500); await pg.evaluate(() => { PAL.skipDialog(); PAL.tp(0, -28); }); await pg.waitForTimeout(6000);
await pg.screenshot({ path: '/tmp/q131.png', clip: { x: 300, y: 200, width: 420, height: 320 } }); console.log(await pg.evaluate(() => PAL.info())); await b.close();
