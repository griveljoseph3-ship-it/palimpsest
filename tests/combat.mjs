// Sensazione dei colpi (v2.0): catena di 3 colpi, lampo/schiacciamento sul bersaglio, spinta della camera, scia della schivata
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
async function until(fn, ms, tick) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (tick) await E(tick); if (await E(fn)) return true; await W(120); } return false; }
await pg.goto(BASE + '?fast'); await W(800); await E(() => PAL.start()); await W(400); await E(() => PAL.skipDialog());
await until(() => !PAL.S.lock, 20000, () => PAL.skipDialog());
// una macchia robusta (3 vite) davanti al giocatore, nella stanza del Caricatore
await E(() => { PAL.charger.alive = false; PAL.charger.st = 'dead'; PAL.gates.board.open = true; PAL.tp(0, -22); });
await until(() => PAL.S.room === 'charger', 20000); await until(() => !PAL.dlg.active, 20000, () => PAL.skipDialog());
const id = await E(() => { const m = PAL.spawnMite(0, -24.2, true); m.hp = 4; m.lt = 99; PAL.P.face = Math.PI; PAL.P.hp = 6; return PAL.swarm.indexOf(m); });
await pg.click('#inkLabel', { force: true }); // focus della pagina per la tastiera
// tre pressioni di J (vera tastiera, eventi nella pagina): ogni nuova pressione arriva appena il colpo precedente ha colpito
const rec = await E((i) => new Promise((done) => { const R = { maxCombo: 0, flash: false, kick: false }; let presses = 0, wait = 0;
  const key = (t) => dispatchEvent(new KeyboardEvent(t, { code: 'KeyJ' }));
  const tick = () => { const P = PAL.P, m = PAL.swarm[i]; R.maxCombo = Math.max(R.maxCombo, P.st === 'attack' ? P.combo : 0); R.flash ||= PAL.flashes.length > 0; R.kick ||= PAL.KICK.a > 0; P.hp = 6;
    if (m.alive) { m.lt = 99; m.tell = 0; m.lunge = 0; m.x = P.x; m.z = P.z - 1.3; }
    if (wait > 0) { wait--; if (wait === 0) key('keyup'); }
    else if (presses < 3 && (presses === 0 || (P.st === 'attack' && P.hitDone))) { key('keydown'); presses++; wait = 2; }
    if ((presses >= 3 && P.st === 'idle' && wait === 0) || R.frames++ > 400) return done(R); requestAnimationFrame(tick); };
  R.frames = 0; requestAnimationFrame(tick); }), id);
console.log(JSON.stringify(rec)); const maxCombo = rec.maxCombo, sawFlash = rec.flash, sawKick = rec.kick;
await until(() => PAL.P.st === 'idle', 20000);
check('catena: si arriva al terzo colpo (affondo)', maxCombo === 2);
check('lampo/schiacciamento sul bersaglio colpito', sawFlash);
check('la camera spinge nel verso del colpo', sawKick);
check('la macchia robusta cade con la catena', await E((i) => !PAL.swarm[i].alive, id));
// schivata: lascia sagome d'inchiostro
await pg.keyboard.down('Space'); await W(80); await pg.keyboard.up('Space');
check('la schivata lascia una scia di sagome', await until(() => PAL.ghosts.some((g) => g.m.visible), 20000));
// fermo per 1 s: la catena riparte dal primo colpo
await W(1200); await E(() => PAL.attack(false)); check('dopo una pausa la catena riparte da 1', await E(() => PAL.P.combo === 0));
console.log('ERRORS', errs); if (bad || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS combat'); await b.close();
