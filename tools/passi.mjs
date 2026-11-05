// Strumento: foto dei modelli (tools/passi.html) — node tools/passi.mjs <cartella> nome1 nome2 … (server su :8942)
import { chromium } from 'playwright-core';
const out = process.argv[2]; const names = process.argv.slice(3);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1500, height: 380 } })).newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
for (const n of names) { await pg.goto('http://localhost:8942/tools/passi.html?m=' + n); await pg.waitForFunction(() => window.__done, null, { timeout: 120000 }); console.log(n, JSON.stringify(await pg.evaluate(() => window.__info))); await pg.screenshot({ path: out + '/' + n + '.png' }); }
console.log(errs.slice(0, 5)); await b.close();
