// v2.1: contrattacco dopo la schivata perfetta (danno doppio) e il Risguardo (scudo di copertina che para di fronte)
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
async function until(fn, ms, tick) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (tick) await E(tick); if (await E(fn)) return true; await W(150); } return false; }
await pg.goto(BASE + '?fast'); await W(800); await E(() => PAL.start()); await until(() => !PAL.S.lock, 20000, () => PAL.skipDialog());
await E(() => { PAL.charger.alive = false; PAL.charger.st = 'dead'; PAL.gates.board.open = true; PAL.tp(0, -22); }); await until(() => PAL.S.room === 'charger', 20000); await until(() => !PAL.dlg.active, 20000, () => PAL.skipDialog());
// scudo: di fronte para, di spalle fa male, il colpo forte lo spezza (tutto nello stesso fotogramma, per non dipendere dalla lentezza del browser)
const r = await E(() => { const m = PAL.spawnShield(0, -25); m.faceA = 0; m.lt = 99; const out = {};
  PAL.P.x = 0; PAL.P.z = -23.4; PAL.P.face = Math.PI; m.x = 0; m.z = -25; m.faceA = 0; const h0 = m.hp; PAL.P.combo = 0; PAL.lightHit(); out.front = m.hp === h0 && m.shield;
  PAL.P.x = 0; PAL.P.z = -26.6; PAL.P.face = 0; m.x = 0; m.z = -25; m.faceA = 0; PAL.lightHit(); out.back = m.hp < h0;
  PAL.P.x = 0; PAL.P.z = -23.4; PAL.P.face = Math.PI; m.x = 0; m.z = -25; m.faceA = 0; PAL.heavyHit(); out.broken = !m.shield; return out; });
check('il Risguardo para i colpi di fronte', r.front); check('colpito alle spalle prende danno', r.back); check('il colpo forte spezza lo scudo', r.broken);
// contrattacco: schivata perfetta → il colpo successivo fa il doppio
const c = await E(() => { const m = PAL.spawnMite(0, -24.6, true); m.hp = 10; m.lt = 99; PAL.P.x = 0; PAL.P.z = -23.4; PAL.P.face = Math.PI; m.x = 0; m.z = -24.6;
  PAL.P.st = 'dodge'; PAL.P.inv = 0.3; PAL.damage(1, m); PAL.P.st = 'idle'; const armed = PAL.P.riposteT > 0; PAL.P.combo = 0; const h0 = m.hp; PAL.lightHit(); return { armed, dmg: h0 - m.hp, after: PAL.P.riposteT }; });
check('la schivata perfetta prepara il contrattacco', c.armed); check('il contrattacco fa danno doppio', c.dmg === 2); check('il contrattacco si consuma', c.after <= 0);
console.log('ERRORS', errs); if (bad || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS shield'); await b.close();
