// iPad reale emulato: touch via CDP (eventi touch veri + compatibilità mouse), 60+ s di gioco.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1366, height: 1024 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const cdp = await ctx.newCDPSession(pg); const E = (f, a) => pg.evaluate(f, a); const W = (ms) => pg.waitForTimeout(ms);
let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i + 1 })) });
const center = async (sel) => { const r = await (await pg.$(sel)).boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; };
const tapSel = async (sel) => { const [x, y] = await center(sel); await touch('touchStart', [[x, y]]); await W(90); await touch('touchEnd', []); };
await pg.goto(BASE); await W(800);
await tapSel('#bStart'); await W(1500);
check('prologo visibile', await E(() => !document.getElementById('cine').classList.contains('hidden')));
for (let k = 0; k < 3; k++) { await touch('touchStart', [[683, 600]]); await W(60); await touch('touchEnd', []); await W(500); }
check('il tocco fa avanzare il prologo', await E(() => window.__cine.scene() >= 1));
await tapSel('#cSkip'); await W(1500);
check('Salta chiude il prologo e avvia il gioco', await E(() => PAL.S.phase === 'play'));
for (let k = 0; k < 4; k++) { await touch('touchStart', [[683, 900]]); await W(60); await touch('touchEnd', []); await W(400); } // avanza i dialoghi
const t0 = Date.now(); let hiddenSeen = 0, samples = 0, moves = 0, attacks = 0;
while (Date.now() - t0 < 65000) {
  // stick: trascina in avanti per 1,2 s mentre il pollice destro preme "colpo"
  const z0 = await E(() => PAL.P.z);
  await touch('touchStart', [[250, 700]]); await W(60); await touch('touchMove', [[250, 630]]); await W(500);
  const [ax, ay] = await center('#tAttack'); await touch('touchMove', [[250, 630], [ax, ay]]); await W(120); await touch('touchMove', [[250, 630]]); await W(500);
  await touch('touchEnd', []); const z1 = await E(() => PAL.P.z); if (z1 < z0 - 0.3) moves++;
  const st0 = await E(() => PAL.Tele.summary().dodge || 0); await tapSel('#tDodge'); await W(400); if ((await E(() => PAL.Tele.summary().dodge || 0)) > st0) attacks++;
  // il giocatore torna indietro per restare nella stanza
  await touch('touchStart', [[250, 700]]); await W(60); await touch('touchMove', [[250, 770]]); await W(1100); await touch('touchEnd', []);
  samples++; if (await E(() => document.getElementById('touch').classList.contains('hidden'))) hiddenSeen++;
  if (await E(() => PAL.dlg.active)) await E(() => PAL.skipDialog());
}
console.log({ samples, hiddenSeen, moves, attacks });
check('comandi touch sempre visibili per 65 s', hiddenSeen === 0 && samples > 8);
check('lo stick muove ogni volta', moves >= samples - 1);
check('il pulsante schiva risponde ogni volta', attacks >= samples - 1);
check('modalità resta touch', await E(() => PAL.input.mode === 'touch'));
check('obiettivo della stanza visibile', (await E(() => document.getElementById('goal').textContent)).startsWith('Obiettivo'));
await pg.screenshot({ path: '/workspace/palimpsest-shots/13-touch-60s.png' });
console.log('ERRORS', errs); if (bad || errs.length) process.exitCode = 1; await b.close();
