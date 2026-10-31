import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1180, height: 820 } })).newPage(); const L = [];
pg.on('pageerror', (e) => L.push('PE ' + e.message)); pg.on('console', (m) => L.push(m.type() + ' ' + m.text().slice(0, 200)));
pg.on('response', (r) => { if (r.status() >= 300) L.push(r.status() + ' ' + r.url()); }); pg.on('requestfailed', (r) => L.push('FAIL ' + r.url() + ' ' + r.failure().errorText));
await pg.goto(process.argv[2]); await pg.waitForTimeout(15000); console.log(L.join("\n")); console.log(pg.url()); console.log((await pg.content()).slice(0,1500)); await pg.screenshot({path:"/workspace/prova3d/dbg.png"}); await b.close();
