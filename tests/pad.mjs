// Controller simulato (Gamepad API): stick, A, RB, frecce, X/Y.
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1366, height: 1024 } });
await ctx.addInitScript(() => { const pad = { connected: true, id: 'Sim', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), vibrationActuator: { playEffect: () => Promise.resolve() } };
  window.__pad = pad; navigator.getGamepads = () => [pad]; window.__press = (i, ms = 450) => { pad.buttons[i].pressed = true; setTimeout(() => { pad.buttons[i].pressed = false; }, ms); }; });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const E = (f, a) => pg.evaluate(f, a); const W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
await pg.goto('http://localhost:8941/?fast'); await W(700); await E(() => PAL.start()); await W(400); await E(() => PAL.skipDialog()); await W(300);
const z0 = await E(() => PAL.P.z); await E(() => { __pad.axes[1] = -1; }); await W(1200); await E(() => { __pad.axes[1] = 0; }); check('stick sinistro muove', (await E(() => PAL.P.z)) < z0 - 1);
check('modalità controller rilevata', await E(() => PAL.input.mode === 'pad'));
await E(() => { PAL.tp(0, -6.8); PAL.face(0, -5); __press(0); }); await W(500); await E(() => PAL.skipDialog()); check('A interagisce', await E(() => PAL.S.discovered.has('state.fragile')));
await E(() => __press(5)); await W(500); check('RB apre le parole', await E(() => PAL.panel.open));
await E(() => __press(0)); await W(500); check('A conferma', await E(() => PAL.grammar.has('board', 'state.fragile')));
await E(() => { PAL.face(0, -5); __press(3); }); await W(1300); check('Y colpo forte rompe', await E(() => PAL.ENT.board.broken));
await E(() => __press(1)); await W(300); check('B schiva', await E(() => PAL.Tele.summary().dodge >= 1));
await E(() => __press(9)); await W(400); check('Start pausa', await E(() => !document.getElementById('pause').classList.contains('hidden')));
console.log('ERRORS', errs); if (bad || errs.length) process.exitCode = 1; await b.close();
