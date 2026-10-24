// Tavole di Joseph nel gioco (v2.2): ritratti dalle tavole, pavimenti, muri di mattoni, intermezzi a tutto schermo e sfondi dei dialoghi
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
async function until(fn, ms, tick) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (tick) await E(tick); if (await E(fn)) return true; await W(150); } return false; }
const SHOTS = process.env.SHOTS; const shot = (n) => SHOTS ? pg.screenshot({ path: `${SHOTS}/${n}.png` }) : null;
await pg.goto(BASE + '?fast'); await W(800);
check('copertina nel titolo', await E(() => getComputedStyle(document.getElementById('title')).backgroundImage.includes('copertina.jpg')));
await E(() => PAL.start()); await until(() => !PAL.S.lock, 20000, () => PAL.skipDialog());
check('pavimenti dalle tavole caricati', await until(() => Object.keys(PAL.PLATES).length >= 10, 20000));
check('muri con i mattoni', await until(() => PAL.world.wallMat.uniforms.uSkinK.value > 0, 20000));
// ritratto dalla tavola nel dialogo
await E(() => PAL.say([['ilde-lacrime', 'prova']]));
check('ritratto dalla tavola (con volto alternativo)', await until(() => document.getElementById('dFace').src.includes('assets/ritratti/ilde-lacrime.jpg') && document.getElementById('dFace').naturalWidth === 256, 10000));
check('nome giusto per il volto alternativo', await E(() => document.getElementById('dWho').textContent === 'Ilde'));
await until(() => !PAL.dlg.active, 10000, () => PAL.skipDialog());
// sfondo dietro il dialogo
await E(() => PAL.say([['narr', 'uno', 'fiume'], ['narr', 'due', 'fenditura'], ['narr', 'tre']]));
check('sfondo del dialogo: fiume', await until(() => PAL.PLATE.back === 'fiume' && document.getElementById('plate').classList.contains('on') && PAL.PLATE.shown.includes('fiume.jpg'), 10000));
await W(1500); await shot('plate-back'); await E(() => PAL.dlgNext());
await until(() => !PAL.dlg.active, 10000, () => PAL.skipDialog());
check('a fine dialogo lo sfondo sparisce', await until(() => !PAL.PLATE.back && document.getElementById('plate').className === 'hidden', 5000));
// intermezzo a tutto schermo: ferma il gioco, un tocco lo chiude, una volta sola
await E(() => { PAL.PLATE.force = true; window.__pd = 0; PAL.cinePlate('labirinto', 'III · Il labirinto del filo', () => window.__pd++); });
check('intermezzo visibile e gioco in pausa', await until(() => document.getElementById('plate').classList.contains('cine') && document.getElementById('plate').classList.contains('on') && PAL.isPaused(), 10000));
check('didascalia', await E(() => document.querySelector('#plate .pcap').textContent.includes('labirinto')));
await shot('plate-cine'); await W(1200);
await pg.mouse.click(600, 500);
check('un tocco chiude e il gioco riparte', await until(() => window.__pd === 1 && !PAL.isPaused() && document.getElementById('plate').className === 'hidden', 8000));
await E(() => PAL.cinePlate('labirinto', 'x', () => window.__pd++));
check('non si ripete nella stessa partita', await E(() => window.__pd === 2 && !PAL.isPaused()));
await E(() => { PAL.PLATE.force = false; });
// figure di carta dalle tavole
const fig = await E(() => { const a = PAL.spawnMite(0, 2), b2 = PAL.spawnSpitter(1, 2), c = PAL.spawnShield(-1, 2); const r = [a, b2, c].map((o) => !!o.mesh.userData.card && !o.mesh.children[0].visible); for (const o of [a, b2, c]) { o.alive = false; PAL.scene.remove(o.mesh); } return r; });
check('acari, sputacchio e Risguardo sono figure di carta (corpo 3D nascosto)', fig.every(Boolean));
check('Tipografo, giurato e Lumi dalle tavole', await until(() => !!(PAL.tipo.userData.paper && PAL.juror.userData.paper && PAL.lumi.mesh.userData.paper), 10000));
check('nessuna immagine mancante', await E(() => !performance.getEntriesByType('resource').some((r) => r.name.includes('/assets/') && r.responseStatus >= 400)));
console.log('ERRORS', errs); if (bad || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS plates'); await b.close();
