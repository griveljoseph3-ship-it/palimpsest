// Strumento: foto delle pose del protagonista (colpo rapido, chiusura, colpo forte) e di camminata — node tools/pose-shots.mjs <base-url> <cartella>
import { chromium } from 'playwright-core';
const [base, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms);
await pg.goto(base + '?fast'); await W(1200); await E(() => PAL.start()); for (let i = 0; i < 40; i++) { await E(() => PAL.skipDialog()); if (!(await E(() => PAL.S.lock))) break; await W(200); }
for (let i = 0; i < 40; i++) { if (await E(() => !!PAL.M3.player)) break; await W(500); }
await E(() => { PAL.tut.on = false; PAL.tp(-2, 4); PAL.face(3, 4); }); await W(2500);
const clip = async (n) => { const r = await E(() => { const v = PAL.P.mesh.getWorldPosition(PAL.camera.position.clone()); v.y += 1; v.project(PAL.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }); await pg.screenshot({ path: `${out}/${n}.png`, clip: { x: r[0] - 200, y: r[1] - 200, width: 400, height: 400 } }); };
await clip('0-fermo');
for (const [n, f, wt] of [['1-rapido', () => { PAL.P.combo = 0; PAL.attack(false); }, 350], ['2-chiusura', () => { PAL.P.combo = 2; PAL.attack(false); PAL.P.combo = 2; }, 400], ['3-forte-carica', () => PAL.attack(true), 450], ['4-forte-colpo', null, 500]]) { if (f) { await E(() => { PAL.P.st = 'idle'; }); await W(300); await E(f); } await W(wt); await clip(n); }
console.log(errs); await b.close();
