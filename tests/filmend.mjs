import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 }, hasTouch: true })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:8941/'); await pg.waitForTimeout(700); await pg.tap('#bStart'); await pg.waitForTimeout(1200);
await pg.evaluate(() => __film.seek(__film.len() - 2)); await pg.waitForTimeout(1200); const title = await pg.evaluate(() => document.getElementById('fTitle').classList.contains('on'));
await pg.waitForTimeout(3500); const ph = await pg.evaluate(() => PAL.S.phase); console.log({ title, ph, errs }); process.exitCode = title && ph === 'play' && !errs.length ? 0 : 1; await b.close();
