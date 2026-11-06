// Strumento: foto di un colpo su una macchia (subito dopo l'impatto) — node tools/colpi-shots.mjs <base-url> <file-prefisso>
import { chromium } from 'playwright-core';
const [base, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms);
await pg.goto(base + '?fast'); await W(1200); await E(() => PAL.start()); for (let i = 0; i < 40; i++) { await E(() => PAL.skipDialog()); if (!(await E(() => PAL.S.lock))) break; await W(200); }
await W(3000); await E(() => { if (PAL.tut) PAL.tut.on = false; window.__fxSlow = 10; PAL.P.inv = 1e9; PAL.tp(0, 4); }); await W(2500);
for (const [n, heavy] of [['rapido', false], ['forte', true]]) {
  await E(([heavy]) => { const m = PAL.spawnMite(1.5, 4, true); m.hp = heavy ? 1 : 9; m.room = 'zzz'; PAL.face(1.5, 4); PAL.attack(heavy); }, [heavy]);
  await pg.waitForFunction(() => PAL.S.hitstop > 0 || document.querySelectorAll('.dn').length > 0, null, { timeout: 8000 }).catch(() => {}); await W(450); await pg.screenshot({ path: `${out}-${n}.png`, clip: { x: 283, y: 212, width: 800, height: 600 } }); await W(2500);
  await E(() => { for (const m of PAL.swarm) { m.alive = false; PAL.scene.remove(m.mesh); } }); }
console.log(errs); await b.close();
