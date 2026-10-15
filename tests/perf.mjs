import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs=[]; pg.on('pageerror', e=>errs.push(e.message));
await pg.goto('http://localhost:8941/?fast'); await pg.waitForTimeout(800); await pg.evaluate(() => PAL.start()); await pg.waitForTimeout(400); await pg.evaluate(() => PAL.skipDialog());
for (const [x,z] of [[0,2],[0,-14],[0,-28],[0,-44],[0,-58]]) { await pg.evaluate(([x,z])=>PAL.tp(x,z),[x,z]); await pg.waitForTimeout(1500); console.log(x,z, JSON.stringify(await pg.evaluate(()=>PAL.info()))); }
console.log(errs); await b.close();
