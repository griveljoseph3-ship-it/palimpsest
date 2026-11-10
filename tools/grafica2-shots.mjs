// Strumento (giro grafico parte 2): foto di caricamento, titolo, oggetti di scena, HUD, pausa, opzioni, luci, titoli di coda
// node tools/grafica2-shots.mjs <base-url> <cartella> <prefisso>
import { chromium } from 'playwright-core';
const [base, out, tag] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1366, height: 1024 } }); const errs = [];
const shot = (pg, n) => pg.screenshot({ path: `${out}/${tag}-${n}.png` });
// 1) caricamento: pagina senza ?fast, foto subito
{ const pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message)); await pg.goto(base + '?shots', { waitUntil: 'commit' }); await pg.waitForTimeout(700); await shot(pg, '00-caricamento'); await pg.waitForTimeout(1500); await shot(pg, '00b-caricamento'); await pg.close(); }
const pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms);
await pg.goto(base + '?fast'); await W(3500); await shot(pg, '01-titolo');
await E(() => PAL.start()); for (let i = 0; i < 40; i++) { await E(() => PAL.skipDialog()); if (!(await E(() => PAL.S && PAL.S.lock))) break; await W(200); }
await W(2500); await E(() => { if (PAL.tut) PAL.tut.on = false; for (const g in PAL.gates) PAL.gates[g].open = true; PAL.P && (PAL.P.inv = 1e9); if (PAL.CP) { PAL.CP.alive = false; PAL.CP.ent.mesh.visible = false; } });
const perf = {};
const go = async (n, x, z, fx, fz) => { await E(([x, z, fx, fz]) => { PAL.S.encounter = null; PAL.tp(x, z); if (fx !== null) PAL.face(fx, fz); PAL.S.snapCam = true; }, [x, z, fx ?? null, fz ?? null]); await W(3500); for (let i = 0; i < 8; i++) { await E(() => PAL.skipDialog()); await W(150); } await W(1200); perf[n] = await E(() => PAL.info()); await shot(pg, n); };
await go('02-hud-tavola', 0, 2);
await go('03-pilastri-caricatore', -4.6, -31.5, -7.2, -34);
await go('04-pressa-barili', -5.8, -59, -8.8, -56);
await go('05-barili-tipografia', -2, -50, -2.8, -47.2);
await go('06-arena-pilastro-lampade', -10.5, -118, -9.2, -122);
await go('07-candele-caricatore', 6.5, -32, 9.2, -34);
await E(() => document.getElementById('bPause').click()); await W(800); await shot(pg, '08-pausa');
await E(() => { const o = document.getElementById('pOptions'); if (o) o.click(); else document.querySelector('#pause h3') && document.querySelector('#pause h3').scrollIntoView(); }); await W(800); await shot(pg, '09-opzioni');
if (await E(() => !!PAL.credits)) { await E(() => { document.getElementById('bPause').click(); PAL.credits(null); }); await W(4500); await shot(pg, '10-titoli-di-coda'); await W(7000); await shot(pg, '10b-titoli-di-coda'); }
console.log(JSON.stringify(perf)); console.log('errori', errs.slice(0, 5)); await b.close();
