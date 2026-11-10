// Strumento: una foto per ogni schermata/stanza principale — node tools/giro-shots.mjs <base-url> <cartella> <prefisso>
import { chromium } from 'playwright-core';
const [base, out, tag] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms);
await pg.goto(base + '?fast'); await W(3500); await pg.screenshot({ path: `${out}/${tag}-0-titolo.png` });
await E(() => PAL.start()); for (let i = 0; i < 40; i++) { await E(() => PAL.skipDialog()); if (!(await E(() => PAL.S.lock))) break; await W(200); }
await W(3000); await E(() => { if (PAL.tut) PAL.tut.on = false; for (const g in PAL.gates) PAL.gates[g].open = true; PAL.P.inv = 1e9; if (PAL.CP) { PAL.CP.alive = false; PAL.CP.ent.mesh.visible = false; } });
const go = async (n, x, z) => { await E(([x, z]) => { PAL.S.encounter = null; PAL.tp(x, z); PAL.S.snapCam = true; }, [x, z]); await W(3500); for (let i = 0; i < 8; i++) { await E(() => PAL.skipDialog()); await W(150); } await W(1200); await pg.screenshot({ path: `${out}/${tag}-${n}.png` }); };
await go('1-tavola', 0, 2); await go('2-caricatore', 0, -22); await go('3-pressa', 0, -52); await go('4-tribunale', 0, -84); await go('5-arena', 0, -114);
await E(() => PAL.togglePause && PAL.togglePause()); await W(600); await pg.screenshot({ path: `${out}/${tag}-6-pausa.png` });
console.log(errs.slice(0, 3)); await b.close();
