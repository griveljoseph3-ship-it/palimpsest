// Gioco installabile (v2.5): il service worker salva tutti i file; senza internet il gioco si apre e parte
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1366, height: 1024 } }); const pg = await ctx.newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
async function until(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await E(fn).catch(() => false)) return true; await W(300); } return false; }
await pg.goto(BASE); await W(1500);
check('il service worker è attivo', await until(() => navigator.serviceWorker.controller !== null || navigator.serviceWorker.ready.then(() => true), 30000));
check('tutti i file del gioco sono salvati', await until(async () => { const ks = await caches.keys(); const k = ks.find((x) => x.startsWith('palimpsest-')); if (!k) return false; const c = await caches.open(k); return (await c.keys()).length >= 100; }, 90000));
check('il manifest dice tutto schermo e orizzontale', await E(async () => { const m = await (await fetch('manifest.webmanifest')).json(); return m.display === 'fullscreen' && m.orientation === 'landscape'; }));
await ctx.setOffline(true); await pg.reload(); await W(2500);
check('senza internet il titolo si apre', await until(() => !!document.querySelector('#bStart') && typeof PAL === 'object', 20000));
await E(() => PAL.start()); check('…e il gioco parte, con i modelli 3D', await until(() => PAL.S.phase === 'play' && PAL.M3D.caricati.length >= 9, 60000));
console.log('ERRORS', errs); if (bad || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS offline'); await b.close();
