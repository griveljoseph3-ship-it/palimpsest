// Tutorial (v2.5): parte a ogni nuova partita; catena di tre colpi sul manichino; schivata della goccia; si può saltare
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
async function until(fn, ms, tick) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (tick) await E(tick); if (await E(fn)) return true; await W(150); } return false; }
const SHOTS = process.env.SHOTS; const shot = (n) => SHOTS ? pg.screenshot({ path: `${SHOTS}/${n}.png` }) : null;
await pg.goto(BASE + '?fast'); await W(800); await E(() => { localStorage.setItem('pal.memory', JSON.stringify({ runs: 1, deaths: 0, routes: [], plans: [], traces: [], tutDone: true })); }); await pg.reload(); await W(800);
await E(() => PAL.start()); await until(() => !PAL.S.lock, 20000, () => PAL.skipDialog());
check('il tutorial parte anche se l\'avevi già fatto (nuova partita)', await E(() => PAL.tut.on && PAL.tut.i === 0));
check('il manichino è nella prima stanza', await until(() => PAL.DUMMY.g.visible, 5000));
await E(() => PAL.tp(0, 6.5)); check('passo 1: muoversi', await until(() => PAL.tut.i >= 1, 15000, () => PAL.P.x += 0.4));
await E(() => { PAL.tp(2.8, 5.4); PAL.face(2.8, 3.8); }); await W(500); await shot('t1-manichino');
check('passo 2: tre colpi sul manichino', await until(() => PAL.tut.i >= 2, 30000, () => { if (PAL.P.st === 'idle') { PAL.face(2.8, 3.8); PAL.attack(false); } }));
await E(() => PAL.tp(2.8, 9)); check('passo 3: arriva la goccia', await until(() => !!PAL.DUMMY.blob, 20000));
await shot('t2-goccia');
check('schivandola il passo è fatto', await until(() => PAL.tut.i >= 3, 30000, () => { const q = PAL.DUMMY.blob; if (q && Math.hypot(PAL.P.x - q.x, PAL.P.z - q.z) < 1.6 && PAL.P.st !== 'dodge') PAL.dodge(); }));
await pg.click('#tutSkip', { force: true }); check('«Salta il tutorial» lo chiude', await until(() => !PAL.tut.on && document.getElementById('tut').classList.contains('hidden'), 5000));
console.log('ERRORS', errs); if (bad || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS tutorial2'); await b.close();
