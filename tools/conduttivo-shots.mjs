// Strumento: foto della stanza CONDUTTIVO (botola chiusa, Compositore, botola aperta) — node tools/conduttivo-shots.mjs <base-url> <cartella>
import { chromium } from 'playwright-core';
const [base, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms);
async function until(fn, ms, tick) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (tick) await E(tick); if (await E(fn)) return true; await W(150); } return false; }
await pg.goto(base + '?fast'); await W(1200); await E(() => PAL.start()); await until(() => !PAL.S.lock, 20000, () => PAL.skipDialog());
await until(() => PAL.M3 && PAL.M3.compositore, 30000).catch(() => {});
await E(() => { PAL.gates.board.open = true; PAL.P.inv = 1e9; PAL.tp(0, -49); }); await until(() => PAL.S.room === 'conduct', 15000); await until(() => !PAL.dlg.active, 15000, () => PAL.skipDialog());
const at = async (x, z, n, f) => { await E(([x, z]) => { PAL.tp(x, z); PAL.S.snapCam = true; }, [x, z]); if (f) await E(f); await W(2200); await pg.screenshot({ path: `${out}/${n}.png` }); };
await E(() => { PAL.CP.x = -3.5; PAL.CP.z = -53.5; PAL.CP.st = 'stun'; PAL.CP.t = 99; }); await at(-6.2, -49.6, 'd1-stanza');
await E(() => { PAL.CP.st = 'hunt'; PAL.CP.t = 0; }); await E(() => PAL.compoDown()); await W(1500); await until(() => !PAL.dlg.active, 15000, () => PAL.skipDialog());
await E(() => { PAL.MZ.entryOpen = 1; PAL.hint && PAL.hint(''); }); await at(-6.6, -49.4, 'd2-botola-aperta');
console.log(errs); await b.close();
