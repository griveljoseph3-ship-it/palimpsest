// Borsa e commissioni (v2.1): il Tipografo dà la quest, i 4 caratteri stanno nei vicoli ciechi del labirinto, la consegna compone ILDE e dà il Pennino a punta larga
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
async function until(fn, ms, tick) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (tick) await E(tick); if (await E(fn)) return true; await W(150); } return false; }
const SHOTS = process.env.SHOTS; const shot = (n) => SHOTS ? pg.screenshot({ path: `${SHOTS}/${n}.png` }) : null;
await pg.goto(BASE + '?fast'); await W(800); await E(() => PAL.start()); await until(() => !PAL.S.lock, 20000, () => PAL.skipDialog());
check('la borsa è vuota all\'inizio', await E(() => Object.keys(PAL.PROG.items).length === 0));
// nella pressa: parla con il Tipografo
await E(() => { PAL.breakBoard(); PAL.charger.alive = false; PAL.charger.st = 'dead'; PAL.gates.r1.open = true; PAL.tp(-8.4, -60.6); }); await until(() => PAL.S.room === 'conduct', 20000); await until(() => !PAL.dlg.active, 20000, () => PAL.skipDialog());
check('il Tipografo offre la commissione', await until(() => { const it = PAL.interactables().find((i) => i.label === 'parla' && Math.abs(i.x + 8.4) < 0.1); if (it) { it.fn(); return true; } return false; }, 20000, () => PAL.tp(-8.4, -60.9)));
await shot('q-tipo'); await until(() => PAL.Qs('tipo').step === 1, 20000, () => PAL.skipDialog());
check('commissione attiva: cerca i caratteri', await E(() => PAL.Qs('tipo').step === 1));
// labirinto: i caratteri sono 4, in vicoli ciechi diversi
await E(() => PAL.enterMaze()); await until(() => PAL.S.room === 'maze' && !PAL.MZ.film && !PAL.S.transit, 40000, () => { if (PAL.MZ.film) PAL.MZ.film.t = 99; PAL.skipDialog(); });
check('4 caratteri nel labirinto (I, L, D, E)', await E(() => PAL.LETTERS.list.map((l) => l.ch).join('') === 'ILDE'));
check('ogni carattere sta in un vicolo cieco (3 muri)', await E(() => PAL.LETTERS.list.every((l) => { const { N, C, x0, z0, E } = PAL.MZ; const cx = Math.floor((l.x - x0) / C), cz = Math.floor((l.z - z0) / C), c = E[cz * N + cx]; return (c.n + c.s + c.e + c.w) === 3; })));
for (let i = 0; i < 4; i++) { await E((i) => { const l = PAL.LETTERS.list[i]; PAL.P.hp = 6; PAL.tp(l.x, l.z); }, i); await until((`PAL.LETTERS.list[${i}].got`), 20000); if (i === 0) await shot('q-lettera'); }
check('raccolti 4/4', await E(() => PAL.Qs('tipo').n === 4));
await E(() => PAL.toggleBag(true)); await W(500); await shot('q-borsa');
check('la borsa mostra la commissione con 4/4', await E(() => document.getElementById('bagList').textContent.includes('Tipografo')));
await E(() => PAL.toggleBag(false));
// consegna
await E(() => { PAL.MZ.boss.alive = false; PAL.exitMaze(); }); await until(() => PAL.S.room === 'conduct' && !PAL.S.transit, 40000, () => PAL.skipDialog());
await E(() => PAL.tp(-8.4, -60.9)); await W(600);
check('consegna al Tipografo', await until(() => { const it = PAL.interactables().find((i) => i.label === 'consegna'); if (it) { it.fn(); return true; } return false; }, 20000, () => PAL.tp(-8.4, -60.9)));
check('scena: compone ILDE e dà il Pennino a punta larga', await until(() => PAL.PROG.items.nibwide, 60000, () => PAL.skipDialog())); await shot('q-premio');
check('il diario ricorda il nome', await E(() => PAL.S.journal.some((j) => j.text.includes('Tipografo'))));
console.log('ERRORS', errs); if (bad || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS quest'); await b.close();
