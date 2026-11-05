// Strumento: primi piani dei personaggi nel gioco — node tools/personaggi-shots.mjs <base-url> <cartella> <prefisso>
import { chromium } from 'playwright-core';
const [base, out, tag] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms);
await pg.goto(base + '?fast'); await W(1200); await E(() => PAL.start()); for (let i = 0; i < 40; i++) { await E(() => PAL.skipDialog()); if (!(await E(() => PAL.S.lock))) break; await W(200); }
for (let i = 0; i < 40; i++) { if (await E(() => !PAL.M3 || Object.keys(PAL.M3).length >= 6)) break; await W(500); }
async function snap(name, expr, dy, size) { await W(300); const r = await E(([g, dy]) => { const o = eval(g); if (!o) return null; const v = o.getWorldPosition(PAL.camera.position.clone()); v.y += dy; v.project(PAL.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [expr, dy]); if (!r) return; const s = size;
  await pg.screenshot({ path: `${out}/${tag}-${name}.png`, clip: { x: Math.max(0, Math.min(1366 - s, r[0] - s / 2)), y: Math.max(0, Math.min(1024 - s, r[1] - s / 2)), width: s, height: s } }); }
async function go(x, z) { await E(([x, z]) => { for (const g in PAL.gates) PAL.gates[g].open = true; PAL.S.encounter = null; PAL.P.inv = 1e9; PAL.tp(x, z); }, [x, z]); await W(3500); for (let i = 0; i < 6; i++) { await E(() => PAL.skipDialog()); await W(200); } }
await go(0, 3); await W(1000); await snap('1-protagonista', 'PAL.P.mesh', 0.9, 320);
await go(0, -24); await E(() => { PAL.charger.x = 0; PAL.charger.z = -29; }); await W(1500); await snap('2-caricatore', 'PAL.charger.mesh', 1, 480);
await E(() => { const a = PAL.spawnMite(-1.5, -22); const c = PAL.spawnSpitter(1.5, -22); }); await W(2500); await snap('3-macchie', 'PAL.swarm[PAL.swarm.length-1].mesh', 0.3, 380);
await E(() => { for (const m of PAL.swarm) { m.alive = false; PAL.scene.remove(m.mesh); } });
await go(-3.9, -80.8); await W(1000); await snap('4-giurato', 'PAL.juror', 1, 360);
await go(2.6, -95.3); await W(1000); await snap('5-elara', 'PAL.elara || null', 1, 360);
await go(0, -112.5); for (let i = 0; i < 25; i++) { await E(() => PAL.skipDialog()); await W(300); } await E(() => { PAL.custode.rise = 0; PAL.custode.x = 0; PAL.custode.z = -118; }); await W(2500); await snap('6-custode', 'PAL.custode.mesh', 1.6, 560);
await go(40, -19); for (let i = 0; i < 40; i++) { await E(() => PAL.skipDialog()); if (await E(() => PAL.LD.alive && PAL.LD.st !== 'rise')) break; await W(300); } await W(1500); await snap('7-ladro', 'PAL.LD.ent.mesh', 1.2, 460);
console.log(tag, errs.slice(0, 3)); await b.close();
