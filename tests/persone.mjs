// Storia più chiara (v2.5): inizio che spiega chi sei e cosa cerchi; «Persone» nella borsa che si aggiornano con le scoperte
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
async function until(fn, ms, tick) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (tick) await E(tick); if (await E(fn)) return true; await W(150); } return false; }
const SHOTS = process.env.SHOTS; const shot = (n) => SHOTS ? pg.screenshot({ path: `${SHOTS}/${n}.png` }) : null;
await pg.goto(BASE + '?fast'); await W(800); await E(() => PAL.start());
check('l\'inizio dice di chi è il libro, cosa sai fare e cosa cerchi', await until(() => PAL.dlg.active && PAL.dlg.lines.some((l) => l[1].includes('libro di Ilde')) && PAL.dlg.lines.some((l) => l[1].includes('COLPEVOLE')), 20000));
await until(() => !PAL.S.lock, 20000, () => PAL.skipDialog());
await E(() => PAL.say([['ilde', 'prova']])); await until(() => !PAL.dlg.active, 8000, () => PAL.skipDialog());
check('chi ti parla finisce in «Persone»', await E(() => !!(PAL.PROG.people || {}).ilde));
await E(() => PAL.toggleBag(true)); await W(800);
check('la borsa mostra Ilde con la sua scheda', await E(() => document.getElementById('bag').textContent.includes('La voce che ti guida')));
await shot('p1-persone'); await E(() => PAL.toggleBag(false));
await E(() => { PAL.S.twistSeen = true; PAL.meet('ilde'); });
check('dopo la rivelazione la scheda si aggiorna (senza svelare prima)', await E(() => (PAL.PROG.people || {}).ilde.includes('madre di Elara')));
console.log('ERRORS', errs); if (bad || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS persone'); await b.close();
