// Stanza CONDUTTIVO (v2.4): botola con serratura elettrica, il Compositore che ricorregge la piastra, 3 scosse, la caduta nel labirinto
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
async function until(fn, ms, tick) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (tick) await E(tick); if (await E(fn)) return true; await W(150); } return false; }
const SHOTS = process.env.SHOTS; const shot = (n) => SHOTS ? pg.screenshot({ path: `${SHOTS}/${n}.png` }) : null;
await pg.goto(BASE + '?fast'); await W(800); await E(() => PAL.start()); await until(() => !PAL.S.lock, 20000, () => PAL.skipDialog());
await E(() => { PAL.gates.board.open = true; PAL.P.inv = 1e9; PAL.tp(0, -49); }); await until(() => PAL.S.room === 'conduct', 15000); await until(() => !PAL.dlg.active, 15000, () => PAL.skipDialog());
check('la botola c\'è ed è chiusa, il Compositore è sveglio', await E(() => PAL.MZ.entryOpen === 0 && PAL.CP.alive && PAL.CP.st !== 'sleep'));
await E(() => PAL.tp(-8.8, -49.6)); await W(1200); await shot('c1-botola-chiusa');
await E(() => { PAL.tp(2, -58); PAL.rewrite('plate', 'element.conductive'); });
check('il Compositore va a ricorreggere la piastra', await until(() => PAL.CP.st === 'fix', 30000, () => { PAL.P.hp = 6; PAL.skipDialog(); }));
check('…e la rimette ISOLANTE', await until(() => !PAL.grammar.has('plate', 'element.conductive'), 60000, () => { PAL.P.hp = 6; PAL.skipDialog(); }));
check('finché lui c\'è la botola resta chiusa', await E(() => PAL.MZ.entryOpen === 0));
// tre scosse: CONDUTTIVO su di lui mentre è sulla piastra quando la pressa batte
for (let i = 0; i < 3; i++) { const n = await E(() => PAL.CP.shocks);
  await until((n) => PAL.CP.shocks > n || !PAL.CP.alive, 40000, () => { PAL.P.hp = 6; PAL.skipDialog(); const c = PAL.CP; if (!c.alive) return; if (c.st !== 'stun') { c.x = 0; c.z = -56; c.st = 'fix'; c.fixT = 0; } if (!PAL.grammar.has('plate', 'element.conductive')) PAL.applyW('plate', 'element.conductive'); if (!PAL.grammar.has('compositore', 'element.conductive') && c.st !== 'stun') PAL.applyW('compositore', 'element.conductive'); }); }
check('dopo tre scosse il Compositore si ferma', await E(() => !PAL.CP.alive && PAL.CP.shocks >= 3));
await W(1200); await shot('c2-fermo'); await until(() => !PAL.dlg.active, 15000, () => PAL.skipDialog());
await E(() => { if (!PAL.grammar.has('plate', 'element.conductive')) PAL.applyW('plate', 'element.conductive'); });
check('l\'impulso apre la botola', await until(() => PAL.MZ.entryOpen >= 1, 40000, () => { PAL.P.hp = 6; PAL.skipDialog(); }));
await E(() => PAL.tp(-8.8, -49.4)); await W(1500); await shot('c3-botola-aperta');
await E(() => PAL.fallInto()); check('ci si cala nel labirinto', await until(() => PAL.S.room === 'maze' && PAL.MZ.active, 30000, () => { if (PAL.MZ.film) PAL.MZ.film.t = 99; PAL.skipDialog(); }));
console.log('ERRORS', errs); if (bad || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS conduttivo'); await b.close();
