// Test di sistema: input reale (tastiera + touch), Sbiadito, riscrittura veloce, reset, ricomponi, Lumi, memoria.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1366, height: 1024 }, hasTouch: true });
const pg = await ctx.newPage(); const errs = [];
pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); if (m.text().startsWith('INKDBG')) console.log(m.text()); }); pg.on('pageerror', (e) => errs.push('PE ' + e.message));
const E = (f, a) => pg.evaluate(f, a); const W = (ms) => pg.waitForTimeout(ms); const ok = []; const bad = [];
const check = (name, v) => { (v ? ok : bad).push(name); console.log(v ? 'OK ' : 'XX ', name); };
const hold = async (k) => { await pg.keyboard.down(k); await pg.waitForTimeout(350); await pg.keyboard.up(k); };
// attende una condizione invece di un tempo fisso (il rendering software dei test è lento e irregolare)
async function until(fn, ms = 6000, tick) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (tick) await E(tick); if (await E(fn)) return true; await W(150); } return false; }
const settle = () => until(() => !PAL.S.lock && !PAL.dlg.active && !PAL.S.transit, 15000, () => { if (PAL.dlg.active && !PAL.dlg.opt.choices) PAL.skipDialog(); });
await pg.goto(BASE + '?fast'); await W(700);
// tastiera: avvio con click, movimento WASD, interazione E, riscrittura Q + frecce + Invio, colpo forte K
await pg.click('#bStart'); await W(800); for (let i = 0; i < 150 && await E(() => PAL.OP.stage !== 'gap'); i++) await W(200); await E(() => PAL.rewrite('opbridge', 'shape.bridge')); for (let i = 0; i < 100 && await E(() => !!PAL.OP.chasm); i++) await W(200); await E(() => PAL.tp(PAL.OP.R.cx, PAL.OP.R.cz - 9)); for (let i = 0; i < 150 && await E(() => PAL.S.room !== 'intro' || PAL.S.transit); i++) await W(200); await W(2500); await settle(); await W(400); await settle();
await E(() => { window.__z0 = PAL.P.z; }); await pg.keyboard.down('KeyW'); const moved = await until(() => PAL.P.z < window.__z0 - 1, 8000, null); await pg.keyboard.up('KeyW');
check('tastiera: W muove in avanti', moved);
await settle(); await E(() => PAL.tp(0, -8.4)); await hold('KeyE');
check('interazione E rivela FRAGILE', await until(() => PAL.S.discovered.has('state.fragile'))); await settle();
await E(() => PAL.face(0, -10)); await hold('KeyQ'); await until(() => PAL.panel.open);
check('Q apre le Parole Fluttuanti', await E(() => PAL.panel.open && document.querySelectorAll('.bubble').length >= 1));
check('preview visibile', (await E(() => document.getElementById('pvText').textContent)).includes('impatto forte'));
check('zona sicura: Inchiostro non scende', await E(async () => { const v = PAL.ink.v; await new Promise((r) => setTimeout(r, 800)); return PAL.ink.v === v; }));
await hold('Enter');
check('Invio conferma FRAGILE', await until(() => PAL.grammar.has('board', 'state.fragile') && !PAL.panel.open));
check('traccia persistente creata', await E(() => PAL.ENT.board.marks === 1));
await hold('KeyT'); check('T ripristina la frase', await until(() => !PAL.grammar.has('board', 'state.fragile')));
await hold('KeyR'); check('R riapplica l\'ultima parola', await until(() => PAL.grammar.has('board', 'state.fragile')));
await E(() => { PAL.tp(0, -8.4); PAL.face(0, -10); }); await hold('KeyK'); check('K colpo forte rompe la tavola', await until(() => PAL.ENT.board.broken));
await hold('KeyY'); await until(() => !PAL.ENT.board.broken); check('Y ricomponi prova ripristina la tavola', await E(() => !PAL.ENT.board.broken && !PAL.grammar.has('board', 'state.fragile')));
await E(() => PAL.rewrite('board', 'state.fragile'));
// touch: pulsanti a ventaglio
await E(() => { PAL.input.mode = 'touch'; }); await W(200);
check('controlli touch visibili', await E(() => !document.getElementById('touch').classList.contains('hidden')));
await E(() => { PAL.tp(0, -8.4); PAL.face(0, -10); PAL.reset(); }); await until(() => !PAL.grammar.has('board', 'state.fragile')); await pg.tap('#tRewrite');
check('touch: ✎ apre il pannello', await until(() => PAL.panel.open && document.querySelectorAll('#bubbles .bubble').length > 0));
await W(600); await pg.tap('#bubbles .bubble');
check('touch: un solo tocco scrive', await until(() => !PAL.panel.open && PAL.grammar.has('board', 'state.fragile')));
await E(() => { PAL.tp(0, -8.4); PAL.face(0, -10); }); await pg.tap('#tHeavy'); check('touch: colpo forte rompe la tavola', await until(() => PAL.ENT.board.broken));
// stick virtuale
const zA = await E(() => { PAL.tp(0, 4); return PAL.P.z; }); await pg.touchscreen.tap(200, 700); // reset stato
await E(() => { const z = document.getElementById('stickZone'); const r = z.getBoundingClientRect(); const fire = (t, x, y) => z.dispatchEvent(new PointerEvent(t, { pointerId: 7, clientX: x, clientY: y, bubbles: true })); fire('pointerdown', 200, 700); fire('pointermove', 200, 640); window.__fire = fire; });
await until(() => PAL.P.z < 2.5, 10000); await E(() => window.__fire('pointerup', 200, 640)); const zB = await E(() => PAL.P.z); console.log('STICK',zA,zB); check('stick virtuale muove', zB < zA - 1);
// Sbiadito in combattimento + riscrittura veloce della parola preparata
await E(() => { PAL.S.discovered.add('temperament.cautious'); PAL.tp(0, -20); }); await until(() => PAL.S.room === 'charger', 20000); await settle();
console.log(await E(() => { PAL.ink.v = 30; PAL.tp(0, -24); PAL.face(0, -32); PAL.open('charger'); return JSON.stringify({open: PAL.panel.open, room: PAL.S.room, safe: PAL.ink.safe, ch: PAL.charger.st, alive: PAL.charger.alive, dlg: PAL.dlg.active, lock: PAL.S.lock}); }));
check('combattimento: consumo nella finestra protetta (1,5/s)', await E(async () => { const v = PAL.ink.v, t = PAL.ink.t; await new Promise((r) => setTimeout(r, 1500)); const rate = (v - PAL.ink.v) / (PAL.ink.t - t); console.log('INKDBG', v, PAL.ink.v, rate.toFixed(2)); return PAL.ink.t - t > 0.3 && rate > 1.3 && rate < 1.7; })); // misurato sul tempo reale del gioco
await E(() => PAL.select('temperament.cautious'));
for (let i=0;i<60 && !(await E(() => !PAL.panel.open && PAL.Tele.summary().ink_faded >= 1));i++) await W(300); check('Sbiadito sotto 25 e chiusura automatica', await E(() => !PAL.panel.open && PAL.Tele.summary().ink_faded >= 1));
check('parola preparata disponibile', await E(() => PAL.S.prepared === 'temperament.cautious'));
await E(() => { PAL.ink.v = 40; PAL.face(PAL.charger.x, PAL.charger.z); }); await hold('KeyR'); await W(450);
check('riscrittura veloce applica CAUTO al Caricatore', await E(() => PAL.grammar.has('charger', 'temperament.cautious')));
// recupero Inchiostro: colpo rapido +12 una volta per attack_event_id
await E(() => { PAL.ink.v = 10; PAL.grammar.resetPhrase('charger'); }); await until(() => PAL.Tele.summary().hit >= 1 && PAL.P.st === 'idle', 30000, () => { if (PAL.P.st === 'idle' && PAL.ink.v < 15) { const c = PAL.charger; PAL.tp(c.x + 1.6, c.z); PAL.face(c.x, c.z); PAL.attack(false); } }); // riprova finché il colpo va a segno
check('colpo rapido valido: +12 Inchiostro', await E(() => PAL.ink.v >= 21 && PAL.ink.v <= 23));
// Lumi: tre morti nell'arena senza progresso
await E(() => { PAL.charger.alive = false; PAL.charger.st = 'dead'; for (const g of ['r1', 'r2', 'door']) { PAL.gates[g].open = true; } PAL.tp(0, -112.6); }); await W(1500); await E(() => PAL.skipDialog());
for (let i = 0; i < 3; i++) { await E(() => PAL.kill()); await W(900); await E(() => PAL.skipDialog()); }
await W(500); await E(() => PAL.skipDialog()); await W(800);
check('Lumi offre la Visione dopo 3 morti', await E(() => PAL.Tele.summary().lumi_vision === 1));
check('tracce di Lumi persistenti (3)', await E(() => PAL.S.deaths === 3));
await pg.screenshot({ path: '/workspace/palimpsest-shots/12-lumi-vision.png' });
for (let i=0;i<100 && await E(()=>PAL.S.lock);i++) await W(300); console.log('LOCK', await E(()=>JSON.stringify({l:PAL.S.lock,ph:PAL.S.phase,d:PAL.dlg.active,st:PAL.P.st}))); check('Visione dura 4 s e restituisce il controllo', await E(() => !PAL.S.lock));
// memoria tra versioni
await E(() => { localStorage.setItem('pal.memory', JSON.stringify({ runs: 1, deaths: 2, routes: ['forced'], plans: ['rottura'], traces: [[0, -5], [1, -14]] })); });
await pg.reload(); await W(700); check('il titolo ricorda la versione precedente', (await E(() => document.getElementById('tMem').textContent)).includes('1'));
await E(() => PAL.start()); await W(300); const l = await E(() => document.getElementById('dText').textContent + '|' + PAL.dlg.lines.map((x) => x[1]).join(' '));
check('il Libro cita le cancellature precedenti', l.includes('cancellature'));
await E(() => { PAL.skipDialog(); PAL.S.discovered.add('state.fragile'); PAL.tp(0, -79); PAL.ENT.board.broken = true; for (const g of ['board', 'r1', 'r2']) PAL.gates[g].open = true; }); await W(1500);
check('Elara ricorda di essere stata strappata', await E(() => PAL.dlg.lines.some((x) => x[1].includes('strappata'))));
check('telemetria solo locale salvata', await E(() => PAL.Tele.all().length > 10));
console.log('ERRORS', errs); console.log(`RISULTATO ${ok.length} ok, ${bad.length} falliti`, bad);
if (bad.length || errs.length) process.exitCode = 1; await b.close();
