// Nemico nuovo (v2.0): lo Sputacchio mira (corsia), sputa, la goccia si schiva o si rimanda indietro con un colpo
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
async function until(fn, ms, tick) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (tick) await E(tick); if (await E(fn)) return true; await W(120); } return false; }
await pg.goto(BASE + '?fast'); await W(800); await E(() => PAL.start()); await until(() => !PAL.S.lock, 20000, () => PAL.skipDialog());
await E(() => { PAL.charger.alive = false; PAL.charger.st = 'dead'; PAL.gates.board.open = true; PAL.tp(0, -22); }); await until(() => PAL.S.room === 'charger', 20000); await until(() => !PAL.dlg.active, 20000, () => PAL.skipDialog());
const id = await E(() => { const o = PAL.spawnSpitter(0, -28.5); o.spT = 1.2; PAL.P.hp = 6; return PAL.swarm.indexOf(o); });
check('prima di sputare mostra la corsia di mira', await until(() => PAL.lanes.length > 0, 20000, () => { PAL.P.hp = 6; }));
check('sputa una goccia d\'inchiostro', await until(() => PAL.shots.length > 0, 20000, () => { PAL.P.hp = 6; }));
// la goccia colpisce chi resta fermo
const hp0 = await E(() => { PAL.P.hp = 6; PAL.P.inv = 0; return PAL.P.hp; });
check('la goccia ferisce chi non si muove', await until(() => PAL.P.hp < 6 || PAL.shots.length === 0, 20000) && await E(() => PAL.P.hp < 6));
// rimandarla indietro: colpo quando la goccia è vicina
await E((i) => { const o = PAL.swarm[i]; o.spT = 0.05; o.hp = 2; PAL.P.hp = 6; PAL.P.inv = 0; }, id);
const back = await E(() => new Promise((done) => { let t = 0; const f = () => { t++; const q = PAL.shots.find((s) => !s.back); if (q && Math.hypot(q.x - PAL.P.x, q.z - PAL.P.z) < 2.6 && PAL.P.st === 'idle') { PAL.P.face = Math.atan2(q.x - PAL.P.x, q.z - PAL.P.z); PAL.attack(false); } if (PAL.shots.some((s) => s.back)) return done(true); if (t > 600) return done(false); PAL.P.hp = 6; requestAnimationFrame(f); }; f(); }));
check('un colpo rimanda indietro la goccia', back);
check('la goccia rimandata colpisce lo Sputacchio', await until(`!PAL.swarm[${id}].alive || PAL.swarm[${id}].hp < 2`, 20000));
console.log('ERRORS', errs); if (bad || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS enemies'); await b.close();
