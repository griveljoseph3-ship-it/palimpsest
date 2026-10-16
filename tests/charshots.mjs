import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:8941/?fast'); await pg.waitForTimeout(800); await pg.evaluate(() => PAL.start()); await pg.waitForTimeout(400); await pg.evaluate(() => PAL.skipDialog());
await pg.evaluate(() => { PAL.tp(0, -57.8); }); await pg.waitForTimeout(4000); await pg.evaluate(() => PAL.skipDialog()); await pg.waitForTimeout(500);
await pg.screenshot({ path: '/workspace/palimpsest-shots/22-custode-new.png' });
await pg.goto('http://localhost:8941/'); await pg.waitForTimeout(700); await pg.click('#bReplayIntro').catch(() => pg.click('#bStart')); await pg.waitForTimeout(1200); await pg.evaluate(() => __film.seek(5)); await pg.waitForTimeout(1500);
await pg.screenshot({ path: '/workspace/palimpsest-shots/23-ilde-new.png' }); await pg.evaluate(() => __film.seek(52)); await pg.waitForTimeout(1500); await pg.screenshot({ path: '/workspace/palimpsest-shots/24-film-custode-new.png' });
console.log(errs); await b.close();
