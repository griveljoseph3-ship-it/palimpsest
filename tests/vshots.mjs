// node tests/vshots.mjs <prefix>  → screenshot visivi (giocatore, Caricatore, Elara, difesa, Custode)
import { chromium } from 'playwright-core';
const pre = process.argv[2] || 'v';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 }, hasTouch: true })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms);
const S = (n) => pg.screenshot({ path: `/workspace/palimpsest-shots/${pre}-${n}.png` });
await pg.goto((process.env.BASE || 'http://localhost:8941/') + '?fast'); await W(800); await E(() => PAL.start()); await W(400); await E(() => PAL.skipDialog());
await E(() => { PAL.tp(-3, 2); PAL.face(0, -10); }); await W(1500); await E(() => PAL.skipDialog()); await S('1-player');
await E(() => PAL.tp(0, -22)); await W(1500); await E(() => PAL.skipDialog()); await E(() => { PAL.P.hp = 5; PAL.tp(PAL.charger.x + 3, PAL.charger.z + 3); }); await W(800); await S('2-charger');
await E(() => PAL.tp(0, -80)); await W(1500); await E(() => PAL.skipDialog()); await E(() => { PAL.tp(0, -94); PAL.face(0, -100); }); await W(1200); await S('3-elara');
await E(() => { PAL.P.x = 0; PAL.P.z = -96.5; PAL.interact(); }); await W(300); await E(() => PAL.skipDialog()); await E(() => PAL.choose(0)); await W(500);
await E(() => { PAL.P.hp = 5; }); await W(3500); await E(() => { PAL.P.hp = 5; }); await S('4-mites');
await E(() => { PAL.P.hp = 5; PAL.tp(0, -112); }); await W(3000); await E(() => PAL.skipDialog()); await W(800); await S('5-custode');
console.log('ERR', errs); await b.close();
