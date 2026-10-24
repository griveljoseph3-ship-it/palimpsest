import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 }, hasTouch: true })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto((process.env.BASE || 'http://localhost:8941/') + ''); await pg.waitForTimeout(700); await pg.click('#bStart'); await pg.waitForTimeout(1500);
const pts = process.argv.slice(2).map(Number); console.log('len', await pg.evaluate(() => __film.len()));
for (const x of pts) { await pg.evaluate((x) => __film.seek(x), x); await pg.waitForTimeout(1600); await pg.screenshot({ path: `/workspace/palimpsest-shots/film-${String(x).padStart(3, '0')}.png` }); console.log(x, await pg.evaluate(() => [__film.shot(), document.getElementById('fSub').textContent.slice(0, 50)])); }
console.log(errs); await b.close();
