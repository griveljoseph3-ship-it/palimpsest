import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, h, tag] of [[1366, 1024, 'l'], [1024, 1366, 'p']]) {
  const pg = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: true })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto((process.env.BASE || 'http://localhost:8941/') + ''); await pg.waitForTimeout(700); await pg.click('#bStart'); 
  for (let i = 0; i < 7; i++) { await pg.waitForTimeout(3600); if (tag === 'l' || i === 3) await pg.screenshot({ path: `/workspace/palimpsest-shots/cine-${tag}-${i + 1}.png` }); await pg.evaluate(() => { window.__cine.next(); window.__cine.next(); }); }
  await pg.waitForTimeout(2500); console.log(tag, await pg.evaluate(() => PAL.S.phase), errs);
}
await b.close();
