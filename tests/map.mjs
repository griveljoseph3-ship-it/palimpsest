// Mappa del labirinto (v2.0): si apre con M solo nel labirinto, mostra solo le celle esplorate e cresce camminando
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
async function until(fn, ms, tick) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (tick) await E(tick); if (await E(fn)) return true; await W(150); } return false; }
await pg.goto(BASE + '?fast'); await W(800); await E(() => PAL.start()); await until(() => !PAL.S.lock, 20000, () => PAL.skipDialog());
await pg.click('#inkLabel', { force: true });
check('fuori dal labirinto il pulsante mappa non c\'è', await E(() => document.getElementById('bMap').classList.contains('hidden')));
await E(() => PAL.enterMaze()); await until(() => PAL.S.room === 'maze' && !PAL.MZ.film && !PAL.S.transit, 20000, () => { if (PAL.MZ.film) PAL.MZ.film.t = 99; PAL.skipDialog(); });
await until(() => !PAL.dlg.active, 20000, () => PAL.skipDialog());
check('nel labirinto il pulsante mappa appare', await until(() => !document.getElementById('bMap').classList.contains('hidden'), 20000));
const s0 = await E(() => PAL.MZ.seen.size); check('all\'ingresso la mappa conosce poche celle', s0 > 0 && s0 < 8);
await E(() => { const [x, z] = [PAL.P.x, PAL.P.z]; window.__path = [[x, z - 5.2], [x, z - 10.4], [x - 5.2, z - 10.4]]; });
for (let i = 0; i < 3; i++) { await E((i) => { const [x, z] = window.__path[i]; PAL.P.x = x; PAL.P.z = z; }, i); await W(400); }
check('camminando la mappa si allarga', await E((s) => PAL.MZ.seen.size > s, s0));
await pg.keyboard.down('KeyM'); await W(80); await pg.keyboard.up('KeyM');
check('M apre la mappa e mette in pausa', await until(() => !document.getElementById('mapPanel').classList.contains('hidden'), 20000));
const ink = await E(() => { const c = document.getElementById('mapCv'), g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] < 60 && d[i + 1] < 50) n++; return n; });
check('la mappa disegna muri a inchiostro', ink > 50);
if (process.env.SHOTS) await pg.screenshot({ path: process.env.SHOTS + '/map.png' });
await W(1500); // un fotogramma intero tra le due pressioni, come farebbe una persona
await pg.keyboard.down('KeyM'); await W(80); await pg.keyboard.up('KeyM');
check('M richiude la mappa', await until(() => document.getElementById('mapPanel').classList.contains('hidden'), 20000));
console.log('ERRORS', errs); if (bad || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS map'); await b.close();
