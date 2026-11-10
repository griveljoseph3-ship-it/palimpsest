// Strumento: foto dei modelli da 4 lati (tools/studio.html) — node tools/studio.mjs <cartella> nome1 … (server su :8942)
import { chromium } from 'playwright-core';
const out = process.argv[2]; const names = process.argv.slice(3);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1200, height: 420 } })).newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
for (const n of names) { await pg.goto('http://localhost:8942/tools/studio.html?m=' + n); await pg.waitForFunction(() => window.__done, null, { timeout: 60000 }); console.log(n, JSON.stringify(await pg.evaluate(() => window.__info))); await pg.screenshot({ path: out + '/' + n + '.png' }); }
console.log(errs); await b.close();
