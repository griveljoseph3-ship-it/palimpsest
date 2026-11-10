// Presentazione dei boss (v2.4 / v2.6.1): ripresa lunga solo per Custode e Copista; un tocco la salta; non si ripete
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
async function until(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await E(fn)) return true; await W(150); } return false; }
await pg.goto(BASE + '?fast'); await W(800); await E(() => PAL.start()); for (let i = 0; i < 40; i++) { await E(() => PAL.skipDialog()); if (!(await E(() => PAL.S.lock))) break; await W(200); }
await E(() => { PAL.SCR.force = true; for (const g in PAL.gates) PAL.gates[g].open = true; PAL.P.inv = 1e9; PAL.charger.alive = false; PAL.tp(0, -112); });
check('entrando parte la presentazione del Custode', await until(() => PAL.REGIA.shot && PAL.REGIA.shot.id === 'intro-custode', 25000));
check('il gioco è fermo durante la presentazione', await E(() => PAL.S.lock));
check('compare la storia', await until(() => document.getElementById('bossLore').textContent.includes('Ilde lo scrisse') && +getComputedStyle(document.getElementById('bossLore')).opacity > 0.5, 25000));
await W(800); await pg.mouse.click(683, 512);
check('un tocco la salta e compare il nome', await until(() => document.getElementById('bossCard').textContent.includes('CUSTODE') && document.getElementById('bossCard').classList.contains('on'), 15000));
check('poi si gioca', await until(() => !PAL.S.lock || PAL.dlg.active, 15000));
await until(() => !PAL.dlg.active, 15000).then(() => E(() => PAL.skipDialog()));
await E(() => { PAL.S.arenaIntro = false; PAL.S.encounter = null; PAL.tp(0, -90); }); await W(1500);
await E(() => { PAL.S.encounter = null; PAL.tp(0, -112); }); await W(2500);
check('la seconda volta niente presentazione lunga', await E(() => !(PAL.REGIA.shot && PAL.REGIA.shot.id === 'intro-custode' && !PAL.REGIA.shot.ended)));
await E(() => { PAL.charger.alive = true; PAL.charger.st = 'idle'; PAL.charger.mesh.visible = true; PAL.S.encounter = null; PAL.S.discovered.delete('temperament.cautious'); PAL.tp(0, -19.5); }); await W(2500);
check('il Caricatore non ha più la ripresa lunga, solo il nome', await E(() => !(PAL.REGIA.shot && PAL.REGIA.shot.id === 'intro-charger' && !PAL.REGIA.shot.ended)));
console.log('ERRORS', errs); if (bad || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS intro'); await b.close();
