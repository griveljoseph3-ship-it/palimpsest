// Strumento: foto delle presentazioni dei boss — node tools/intro-shots.mjs <base-url> <cartella> [charger|custode|ladro|copista ...]
import { chromium } from 'playwright-core';
const [base, out, ...which] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms);
async function until(fn, ms, tick) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (tick) await E(tick).catch(() => {}); if (await E(fn)) return true; await W(150); } return false; }
await pg.goto(base + '?fast'); await W(1200); await E(() => PAL.start()); for (let i = 0; i < 40; i++) { await E(() => PAL.skipDialog()); if (!(await E(() => PAL.S.lock))) break; await W(200); }
await until(() => PAL.M3 && Object.keys(PAL.M3).length >= 6, 30000);
await E(() => { PAL.SCR.force = true; for (const g in PAL.gates) PAL.gates[g].open = true; PAL.P.inv = 1e9; });
async function shoot(k) { const id = 'intro-' + k; for (let i = 0; i < 260; i++) { if (await E((id) => !!PAL.REGIA.shot && PAL.REGIA.shot.id === id, id)) break; await E(() => PAL.skipDialog()); await W(150); }
  for (const [tt, n] of [[1.5, 'a-largo'], [6.4, 'b-primo-piano']]) { await pg.waitForFunction((x) => !PAL.REGIA.shot || PAL.REGIA.shot.t >= x, tt, { timeout: 60000 }).catch(() => {}); await pg.screenshot({ path: `${out}/${k}-${n}.png` }); }
  await pg.waitForFunction(() => !PAL.REGIA.shot || PAL.REGIA.shot.ended, null, { timeout: 60000 }).catch(() => {}); await W(700); await pg.screenshot({ path: `${out}/${k}-c-nome.png` }); }
for (const k of which) {
  if (k === 'charger') { await E(() => { PAL.tp(0, -19.5); }); await shoot('charger'); }
  if (k === 'custode') { await E(() => { PAL.tp(0, -112); }); await shoot('custode'); }
  if (k === 'ladro') { await E(() => { PAL.tp(40, -19); }); await shoot('ladro'); }
}
console.log(errs.slice(0, 3)); await b.close();
