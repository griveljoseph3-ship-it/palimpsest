// Labirinto del filo: ingresso a pagina, PONTE, CONDUTTIVO, scala, Pennino e gommino
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 }, hasTouch: true })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
const S = (n) => pg.screenshot({ path: `/workspace/palimpsest-shots/m-${n}.png` });
async function until(fn, ms) { ms *= 3; const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await E(fn)) return true; await W(200); } return false; }
await pg.goto('http://localhost:8941/?fast'); await W(800); await E(() => PAL.start()); await W(400); await E(() => PAL.skipDialog());
await E(() => PAL.tp(0, -49)); await until(() => PAL.S.room === 'conduct', 4000); await E(() => PAL.skipDialog()); await E(() => PAL.tp(0, -54.3));
await E(() => PAL.rewrite('plate', 'element.conductive')); await W(1500); await E(() => PAL.skipDialog());
check('cancello chiuso finché il labirinto non è fatto', await E(() => !PAL.gates.r2.open));
check('la pagina si spiega', await until(() => PAL.MZ.entryOpen >= 1, 12000));
await E(() => { PAL.tp(8.6, -49.5); }); await W(400); await S('1-page'); await E(() => PAL.enterMaze()); await W(400); await S('2-transition');
check('entrato nel labirinto', await until(() => PAL.S.room === 'maze' && PAL.MZ.active, 8000)); await W(1500); await E(() => PAL.skipDialog()); await W(600); await S('3-maze');
check('muri del labirinto nelle collisioni', await E(() => PAL.MZ.walls.length > 80));
check('macchie nel labirinto', await E(() => PAL.swarm.filter((m) => m.room === 'maze' && m.alive).length >= 20));
// Pennino: compra e usa il gommino
await E(() => { PAL.PROG.drops = 40; PAL.buySkill('nib2'); PAL.buySkill('nib3'); }); check('Pennino d\'oro sblocca il gommino', await E(() => PAL.PROG.skills.nib3 && !document.getElementById('tErase').classList.contains('hidden')));
await E(() => { const m = PAL.swarm.find((q) => q.room === 'maze' && q.alive); PAL.tp(m.x + 2, m.z); }); await W(300); await E(() => PAL.useEraser()); check('gommino colpisce i nemici vicini', await E(() => PAL.swarm.some((m) => m.erased)));
await E(() => { document.getElementById('bSkills').click(); }); await W(500); await S('4-skills'); await E(() => document.getElementById('skClose').click());
// fenditura → PONTE
const [cx, cz] = await E(() => [PAL.MZ.bridgeEnt.x, PAL.MZ.bridgeEnt.z]);
await E(([x, z]) => { PAL.P.hp = 5; PAL.tp(x, z + 3.5); PAL.face(x, z); }, [cx, cz]); await W(300);
check('la fenditura blocca', await E(() => PAL.MZ.chasm && !PAL.MZ.bridged));
await E(() => { PAL.S.discovered.add('shape.bridge'); }); check('PONTE si scrive', await E(() => PAL.rewrite('mzbridge', 'shape.bridge')));
check('il ponte si costruisce', await until(() => { PAL.P.hp = 5; return PAL.MZ.bridged; }, 15000)); await S('5-bridge');
await E(([x, z]) => { PAL.tp(x, z - 3.6); }, [cx, cz]); await W(300);
check('piastra CONDUTTIVO', await E(() => PAL.rewrite('mzplate', 'element.conductive')));
check('la scala si forma', await until(() => { PAL.P.hp = 5; return PAL.MZ.stairsT >= 1; }, 20000)); await E(() => PAL.skipDialog()); await S('6-stairs');
await E(() => PAL.exitMaze()); check('tornato alla pressa con il cancello aperto', await until(() => PAL.S.room === 'conduct' && PAL.gates.r2.open && !PAL.MZ.active, 8000));
console.log('ERRORS', errs); if (bad || errs.length) process.exitCode = 1; await b.close();
