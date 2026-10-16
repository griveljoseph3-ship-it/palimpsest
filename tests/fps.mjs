import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs=[]; pg.on('pageerror', e=>errs.push(e.message)); pg.on('console', m => m.type()==='error' && errs.push(m.text()));
await pg.goto('http://localhost:8941/?fast'); await pg.waitForTimeout(800); await pg.evaluate(() => PAL.start()); await pg.waitForTimeout(6000);
console.log(await pg.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(n / 3); }; requestAnimationFrame(f); })), errs); await b.close();
