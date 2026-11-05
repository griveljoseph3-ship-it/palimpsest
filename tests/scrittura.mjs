// La scrittura (v2.4): la parola si scrive in scena prima dell'effetto; lunga la prima volta, breve dopo; un tocco la salta; il gioco riparte
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
async function until(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await E(fn)) return true; await W(100); } return false; }
await pg.goto(BASE + '?fast'); await W(800); await E(() => PAL.start()); for (let i = 0; i < 40; i++) { await E(() => PAL.skipDialog()); if (!(await E(() => PAL.S.lock))) break; await W(200); }
await E(() => { for (const g in PAL.gates) PAL.gates[g].open = true; PAL.P.inv = 1e9; PAL.S.discovered.add('state.fragile'); PAL.S.discovered.add('temperament.cautious'); PAL.tp(0, -23); }); await W(3000); await E(() => PAL.skipDialog());
await E(() => { PAL.charger.x = 0; PAL.charger.z = -27; PAL.SCR.force = true; PAL.face(0, -27); PAL.rewrite('charger', 'state.fragile'); });
check('parte la scena della scrittura (versione lunga la prima volta)', await E(() => PAL.SCR.on && PAL.SCR.long));
check('il mondo è fermo e la parola non ha ancora effetto', await E(() => PAL.isPaused() && !PAL.grammar.has('charger', 'state.fragile')));
check('finita la scena la parola attecchisce e il gioco riparte', await until(() => !PAL.SCR.on && PAL.grammar.has('charger', 'state.fragile') && !PAL.isPaused() && !PAL.S.lock, 20000));
check('stacco sull\'effetto (ripresa dal basso)', await E(() => !!PAL.REGIA.shot && PAL.REGIA.shot.id === 'stacco'));
await W(2500); await E(() => PAL.grammar.resetPhrase('charger'));
await E(() => { PAL.charger.st = 'idle'; PAL.rewrite('charger', 'state.fragile'); });
check('la seconda volta è breve', await E(() => PAL.SCR.on && !PAL.SCR.long));
await until(() => !PAL.SCR.on, 10000); await W(2000); await E(() => PAL.grammar.resetPhrase('charger'));
await E(() => { PAL.SCR.speed = 0.2; PAL.rewrite('charger', 'temperament.cautious'); }); await until(() => window.__scrT > 0.4, 10000);
await pg.mouse.click(683, 512); check('un tocco la salta', await until(() => !PAL.SCR.on && PAL.grammar.has('charger', 'temperament.cautious'), 6000));
console.log('ERRORS', errs); if (bad || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS scrittura'); await b.close();
