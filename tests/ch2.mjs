// Capitolo II completo: parole PESANTE/LEGGERO, Rilegatore, pila, Diga a 2 fasi, 3 pagine nascoste, salvataggio, fine capitolo.
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 }, hasTouch: true })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
const skip = () => E(() => PAL.skipDialog());
const at = (x, z, face = Math.PI) => E(([x, z, f]) => { PAL.P.x = x; PAL.P.z = z; PAL.P.face = f; PAL.P.vx = PAL.P.vz = 0; PAL.P.hp = 5; PAL.ink.v = 100; }, [x, z, face]);
const shot = (n) => pg.screenshot({ path: `/workspace/palimpsest-shots/ch2-${n}.png` });
await pg.goto('http://localhost:8941/?fast'); await W(800); await E(() => PAL.start()); await W(400); await skip();
await E(() => PAL.startChapter2()); await W(1200); await skip(); await W(300);
check('Capitolo II: riva', await E(() => PAL.S.room === 'c2a')); await shot('1-riva');
await at(96.5, 0.4); await E(() => PAL.interact()); await W(300); await skip();
check('scoperta PESANTE', await E(() => PAL.S.discovered.has('weight.heavy')));
await at(103.5, -0.8); await E(() => PAL.applyW('crate', 'weight.heavy')); await W(500);
check('cassa PESANTE apre il cancello', await E(() => PAL.gates.c2g1.open));
await at(100, -10.5); await W(1500); await skip(); console.log(await E(() => [PAL.S.lock, PAL.S.room, PAL.P.x, PAL.P.z, PAL.dlg.active])); check('chiusa', await E(() => PAL.S.room === 'c2b'));
await at(95, -10.2); await E(() => PAL.interact()); await W(300); await skip(); check('scoperta LEGGERO', await E(() => PAL.S.discovered.has('weight.light')));
await at(100, -12.5); await E(() => PAL.applyW('raft', 'weight.light')); await W(700); await skip();
check('zattera riaffiora e compare il Rilegatore', await E(() => PAL.C2.raftUp && PAL.rileg.alive)); await shot('2-rilegatore');
await E(() => { PAL.applyW('rileg', 'state.fragile'); }); 
for (let k = 0; k < 30 && await E(() => PAL.rileg.alive); k++) { await E(() => { const r = PAL.rileg; PAL.P.x = r.x; PAL.P.z = r.z + 1.3; PAL.P.face = Math.PI; PAL.P.hp = 5; PAL.ink.v = 100; if (r.armor && !PAL.grammar.has('rileg', 'state.fragile')) PAL.applyW('rileg', 'state.fragile'); PAL.heavyHit(); }); await W(250); }
await skip(); check('Rilegatore sconfitto', await E(() => !PAL.rileg.alive));
await E(() => { if (!PAL.C2.raftUp) PAL.applyW('raft', 'weight.light'); }); await W(500);
check('cancello della chiusa aperto', await E(() => PAL.gates.c2g2.open));
await at(95.5, -18.5); await E(() => PAL.applyW('stone', 'weight.light')); await W(400); await at(94.5, -18.3); await E(() => PAL.interact()); await W(300); await skip();
check('pagina nascosta II-1 (sasso)', await E(() => PAL.S.secrets.has('c2_stone')));
await at(100, -15.2); await W(400); await at(100, -18); await W(300);
check('si attraversa il canale sulla zattera', await E(() => PAL.P.z < -16.5));
await at(100, -27); await W(1500); await skip(); check('pila', await E(() => PAL.S.room === 'c2c'));
await at(100, -32.5); await E(() => { PAL.applyW('pile', 'state.fragile'); PAL.applyW('pile', 'weight.heavy'); }); await W(1500);
check('FRAGILE + PESANTE: la pila crolla da sola', await E(() => PAL.C2.pileDown && PAL.gates.c2g3.open)); await shot('3-pila');
await at(103.5, -33.6); await E(() => PAL.interact()); await W(300); await skip(); check('pagina nascosta II-2 (pila)', await E(() => PAL.S.secrets.has('c2_pile')));
await at(100, -45); await W(1500); await skip(); await W(2000); check('diga', await E(() => PAL.S.room === 'c2d'));
const saved = await E(() => JSON.parse(localStorage.getItem('pal_save_v1') || 'null')); check('salvataggio capitolo II', saved && saved.chapter === 2 && saved.room === 'c2d');
await shot('4-diga');
check('barra boss della Diga', await E(() => !document.getElementById('bossBar').classList.contains('hidden')));
for (const w of [0, 1, 2]) { await at([94.5, 100, 105.5][w], -50); await E((i) => PAL.applyW('dw' + i, 'weight.heavy'), w); await W(1500); }
check('3 ancore spezzate → fase 2', await E(() => PAL.dweights.every((w) => w.broken) && PAL.damHeart.alive)); await shot('5-fase2');
await at(100, -52.6); await E(() => PAL.heavyHit()); await W(200); check('cuore sigillato senza parola', await E(() => PAL.damHeart.hp === 8));
await E(() => PAL.applyW('dam', 'state.fragile'));
for (let k = 0; k < 20 && await E(() => PAL.damHeart.alive); k++) { await at(100, -52.6); await E(() => { if (!PAL.grammar.has('dam', 'state.fragile')) PAL.applyW('dam', 'state.fragile'); PAL.heavyHit(); }); await W(200); }
await skip(); check('Diga sconfitta', await E(() => !PAL.damHeart.alive && PAL.gates.c2g4.open));
await at(100, -63); await W(1500); for (let k = 0; k < 6; k++) { await skip(); await W(200); }
await at(104.5, -67.5); await E(() => PAL.applyW('stone2', 'weight.light')); await W(400); await E(() => PAL.interact()); await W(300); await skip();
check('pagina nascosta II-3', await E(() => PAL.S.secrets.has('c2_dam')));
await at(100, -70.5); await W(1500); for (let k = 0; k < 10; k++) { await skip(); await W(200); }
check('fine del Capitolo II', await E(() => PAL.S.done && PAL.mem.chapters[2].done && PAL.mem.chapters[2].secrets === 3)); await shot('6-fine');
console.log('ERRORS', errs); if (bad || errs.length) process.exitCode = 1; await b.close();
