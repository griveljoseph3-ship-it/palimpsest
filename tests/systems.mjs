// Test di sistema: input reale (tastiera + touch), Sbiadito, riscrittura veloce, reset, ricomponi, Lumi, memoria.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1366, height: 1024 }, hasTouch: true });
const pg = await ctx.newPage(); const errs = [];
pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); if (m.text().startsWith('INKDBG')) console.log(m.text()); }); pg.on('pageerror', (e) => errs.push('PE ' + e.message));
const E = (f, a) => pg.evaluate(f, a); const W = (ms) => pg.waitForTimeout(ms); const ok = []; const bad = [];
const check = (name, v) => { (v ? ok : bad).push(name); console.log(v ? 'OK ' : 'XX ', name); };
await pg.goto(BASE + '?fast'); await W(700);
// tastiera: avvio con click, movimento WASD, interazione E, riscrittura Q + frecce + Invio, colpo forte K
await pg.click('#bStart'); await W(800); await E(() => window.__cine && window.__cine.finish()); await W(1200); await E(() => PAL.skipDialog()); await W(300);
const z0 = await E(() => PAL.P.z); await pg.keyboard.down('KeyW'); await W(1500); await pg.keyboard.up('KeyW'); const z1 = await E(() => PAL.P.z);
check('tastiera: W muove in avanti', z1 < z0 - 1);
await E(() => PAL.tp(0, -3.4)); await pg.keyboard.press('KeyE'); await W(200); await E(() => PAL.skipDialog());
check('interazione E rivela FRAGILE', await E(() => PAL.S.discovered.has('state.fragile')));
await E(() => PAL.face(0, -5)); await pg.keyboard.press('KeyQ'); await W(300);
check('Q apre le Parole Fluttuanti', await E(() => PAL.panel.open && document.querySelectorAll('.bubble').length >= 1));
check('preview visibile', (await E(() => document.getElementById('pvText').textContent)).includes('impatto forte'));
check('zona sicura: Inchiostro non scende', await E(async () => { const v = PAL.ink.v; await new Promise((r) => setTimeout(r, 800)); return PAL.ink.v === v; }));
await pg.keyboard.press('Enter'); await W(400);
check('Invio conferma FRAGILE', await E(() => PAL.grammar.has('board', 'state.fragile') && !PAL.panel.open));
check('traccia persistente creata', await E(() => PAL.ENT.board.marks === 1));
await pg.keyboard.press('KeyT'); await W(450); check('T ripristina la frase', await E(() => !PAL.grammar.has('board', 'state.fragile')));
await pg.keyboard.press('KeyR'); await W(450); check('R riapplica l\'ultima parola', await E(() => PAL.grammar.has('board', 'state.fragile')));
await E(() => PAL.face(0, -5)); await pg.keyboard.press('KeyK'); await W(1200); check('K colpo forte rompe la tavola', await E(() => PAL.ENT.board.broken));
await pg.keyboard.press('KeyY'); await W(300); check('Y ricomponi prova ripristina la tavola', await E(() => !PAL.ENT.board.broken && !PAL.grammar.has('board', 'state.fragile')));
await E(() => PAL.rewrite('board', 'state.fragile'));
// touch: pulsanti a ventaglio
await E(() => { PAL.input.mode = 'touch'; }); await W(200);
check('controlli touch visibili', await E(() => !document.getElementById('touch').classList.contains('hidden')));
await E(() => { PAL.tp(0, -3.4); PAL.face(0, -5); }); await pg.tap('#tRewrite'); await W(300);
check('touch: ✎ apre il pannello', await E(() => PAL.panel.open));
const bb = await pg.$('.bubble'); await bb.tap(); await W(200); await bb.tap().catch(() => {}); await W(400);
check('touch: doppio tocco scrive', await E(() => !PAL.panel.open));
await pg.tap('#tHeavy'); await W(1200); check('touch: colpo forte rompe la tavola', await E(() => PAL.ENT.board.broken));
// stick virtuale
const zA = await E(() => { PAL.tp(0, 2); return PAL.P.z; }); await pg.touchscreen.tap(200, 700); // reset stato
await E(() => { const z = document.getElementById('stickZone'); const r = z.getBoundingClientRect(); const fire = (t, x, y) => z.dispatchEvent(new PointerEvent(t, { pointerId: 7, clientX: x, clientY: y, bubbles: true })); fire('pointerdown', 200, 700); fire('pointermove', 200, 640); window.__fire = fire; });
await W(800); await E(() => window.__fire('pointerup', 200, 640)); const zB = await E(() => PAL.P.z); check('stick virtuale muove', zB < zA - 1);
// Sbiadito in combattimento + riscrittura veloce della parola preparata
await E(() => { PAL.S.discovered.add('temperament.cautious'); PAL.tp(0, -10); }); await W(1500); await E(() => PAL.skipDialog());
console.log(await E(() => { PAL.ink.v = 30; PAL.tp(0, -12); PAL.face(0, -16); PAL.open('charger'); return JSON.stringify({open: PAL.panel.open, room: PAL.S.room, safe: PAL.ink.safe, ch: PAL.charger.st, alive: PAL.charger.alive, dlg: PAL.dlg.active, lock: PAL.S.lock}); }));
check('combattimento: consumo nella finestra protetta (1,5/s)', await E(async () => { const v = PAL.ink.v; await new Promise((r) => setTimeout(r, 1000)); const d = v - PAL.ink.v; console.log('INKDBG', v, PAL.ink.v, PAL.panel.open, PAL.P.st, PAL.P.hp); return d > 1.0 && d < 2.2; }));
await E(() => PAL.select('temperament.cautious'));
await W(7000); check('Sbiadito sotto 25 e chiusura automatica', await E(() => !PAL.panel.open && PAL.Tele.summary().ink_faded >= 1));
check('parola preparata disponibile', await E(() => PAL.S.prepared === 'temperament.cautious'));
await E(() => { PAL.ink.v = 40; PAL.face(PAL.charger.x, PAL.charger.z); }); await pg.keyboard.press('KeyR'); await W(450);
check('riscrittura veloce applica CAUTO al Caricatore', await E(() => PAL.grammar.has('charger', 'temperament.cautious')));
// recupero Inchiostro: colpo rapido +12 una volta per attack_event_id
await E(() => { PAL.ink.v = 10; const c = PAL.charger; PAL.tp(c.x + 1.2, c.z); PAL.face(c.x, c.z); PAL.attack(false); }); await W(900);
check('colpo rapido valido: +12 Inchiostro', await E(() => PAL.ink.v >= 21 && PAL.ink.v <= 23));
// Lumi: tre morti nell'arena senza progresso
await E(() => { PAL.charger.alive = false; PAL.charger.st = 'dead'; for (const g of ['r1', 'r2', 'door']) { PAL.gates[g].open = true; } PAL.tp(0, -56.3); }); await W(1500); await E(() => PAL.skipDialog());
for (let i = 0; i < 3; i++) { await E(() => PAL.kill()); await W(900); await E(() => PAL.skipDialog()); }
await W(500); await E(() => PAL.skipDialog()); await W(800);
check('Lumi offre la Visione dopo 3 morti', await E(() => PAL.Tele.summary().lumi_vision === 1));
check('tracce di Lumi persistenti (3)', await E(() => PAL.S.deaths === 3));
await pg.screenshot({ path: '/workspace/palimpsest-shots/12-lumi-vision.png' });
await W(4500); check('Visione dura 4 s e restituisce il controllo', await E(() => !PAL.S.lock));
// memoria tra versioni
await E(() => { localStorage.setItem('pal.memory', JSON.stringify({ runs: 1, deaths: 2, routes: ['forced'], plans: ['rottura'], traces: [[0, -5], [1, -14]] })); });
await pg.reload(); await W(700); check('il titolo ricorda la versione precedente', (await E(() => document.getElementById('tMem').textContent)).includes('1'));
await E(() => PAL.start()); await W(300); const l = await E(() => document.getElementById('dText').textContent + '|' + PAL.dlg.lines.map((x) => x[1]).join(' '));
check('il Libro cita le cancellature precedenti', l.includes('cancellature'));
await E(() => { PAL.skipDialog(); PAL.S.discovered.add('state.fragile'); PAL.tp(0, -39.5); PAL.ENT.board.broken = true; for (const g of ['board', 'r1', 'r2']) PAL.gates[g].open = true; }); await W(1500);
check('Elara ricorda di essere stata strappata', await E(() => PAL.dlg.lines.some((x) => x[1].includes('strappata'))));
check('telemetria solo locale salvata', await E(() => PAL.Tele.all().length > 10));
console.log('ERRORS', errs); console.log(`RISULTATO ${ok.length} ok, ${bad.length} falliti`, bad);
if (bad.length || errs.length) process.exitCode = 1; await b.close();
