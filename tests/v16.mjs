// v1.6: prologo giocato, LENTO, sostegno, verdetto, Custode a fasi, finale
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 }, hasTouch: true })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
const S = (n) => pg.screenshot({ path: `/workspace/palimpsest-shots/v16-${n}.png` });
async function until(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await E(fn)) return true; await W(200); } return false; }
await pg.goto((process.env.BASE || 'http://localhost:8941/') + '?fast'); await W(800); await E(() => PAL.begin(true)); await W(1500); await S('1-fall');
check('il viaggiatore scivola fino al vuoto', await until(() => PAL.OP.stage === 'gap', 30000)); await W(500); await S('2-gap');
check('non si può cadere nel vuoto', await E(() => { PAL.tp(PAL.OP.R.cx, PAL.OP.R.cz + 2.5); return true; }) && (await E(() => PAL.P.z > PAL.OP.R.cz)));
check('PONTE si scrive', await E(() => { PAL.face(PAL.OP.R.cx, PAL.OP.R.cz - 5); return PAL.rewrite('opbridge', 'shape.bridge'); }));
check('il ponte si costruisce', await until(() => PAL.OP.stage === 'build' && !PAL.OP.chasm, 20000)); await S('3-bridge');
await E(() => PAL.tp(PAL.OP.R.cx, PAL.OP.R.cz - 9)); check('appare il titolo', await until(() => PAL.OP.stage === 'title', 5000)); await W(800); await S('4-title');
check('si arriva al corridoio I', await until(() => PAL.S.room === 'intro', 30000)); await W(2500); await E(() => PAL.skipDialog()); await W(500); await S('5-corridor');
// LENTO: coprirsi, poi cancellare
await E(() => { PAL.tp(0, 0); PAL.curseStart('Test'); }); await W(400); await E(() => PAL.tp(-7.2 * 2, -34 * 1)); 
await E(() => { PAL.P.curse = null; PAL.tp(0, 2); PAL.curseStart('Test'); }); check('LENTO attecchisce se resti scoperto', await until(() => PAL.P.curse && PAL.P.curse.on, 20000)); await S('6-lento');
await E(() => PAL.useEraser()); check('il gommino cancella LENTO', await E(() => !PAL.P.curse));
// sostegno del Caricatore
await E(() => PAL.tp(0, -22)); await W(1500); await E(() => PAL.skipDialog()); await E(() => PAL.collapseSupport()); check('il sostegno crolla e apre la strada', await until(() => PAL.gates.r1.open, 8000)); await W(800); await S('7-support');
// verdetto di Elara
await E(() => PAL.tp(0, -80)); await W(1500); await E(() => PAL.skipDialog()); await E(() => PAL.tp(-6.2, -94)); await W(300); await E(() => PAL.interact()); await W(300);
for (let i = 0; i < 8; i++) { await E(() => PAL.dlg.active && !PAL.dlg.opt.choices && PAL.interact()); await W(150); }
await E(() => PAL.skipDialog && 0); await E(() => PAL.choose(1)); await W(400); for (let i = 0; i < 6; i++) { await E(() => PAL.skipDialog()); await W(200); }
check('contraddizione trovata: porta aperta', await until(() => PAL.S.doorRoute === 'evidence', 6000)); await S('8-verdict');
// Custode a fasi
await E(() => { PAL.tp(0, -112); }); await W(2500); await E(() => PAL.skipDialog()); await E(() => { PAL.S.wordUse['state.fragile'] = 3; PAL.custode.armorHP = PAL.custode.armorMax * 0.5; });
check('fase 2: immune alla parola più usata', await until(() => PAL.C3.phase === 2 && PAL.C3.shieldWord === 'state.fragile', 6000)); await E(() => PAL.skipDialog());
check('immune davvero', await E(() => !PAL.rewrite('custode', 'state.fragile')));
await E(() => { PAL.custode.armorHP = PAL.custode.armorMax * 0.2; }); check('fase 3: «Allora correggo te» e LENTO', await until(() => { PAL.P.hp = 5; return PAL.C3.phase === 3 && !!PAL.P.curse; }, 15000)); await E(() => PAL.skipDialog()); await S('9-custode');
await E(() => { PAL.endingPage(); }); await W(4000); await S('10-ending'); await E(() => window.__endDone());
console.log('ERRORS', errs); if (bad || errs.length) process.exitCode = 1; await b.close();
