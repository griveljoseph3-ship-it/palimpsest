import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1024, height: 1366 }, hasTouch: true, isMobile: true })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:8941/'); await pg.waitForTimeout(700); await pg.tap('#bStart'); await pg.waitForTimeout(1500); await pg.evaluate(() => __film.seek(40)); await pg.waitForTimeout(1500);
await pg.screenshot({ path: '/workspace/palimpsest-shots/17-film-portrait.png' }); await pg.tap('#fSkip'); await pg.waitForTimeout(2000); await pg.evaluate(() => PAL.skipDialog()); await pg.waitForTimeout(800);
await pg.screenshot({ path: '/workspace/palimpsest-shots/18-tut-portrait.png' }); console.log(errs); await b.close();
