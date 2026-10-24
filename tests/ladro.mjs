// Boss Ladro d'inchiostro (v2.1): emerge, beve l'Inchiostro con il filo, la schivata lo strappa, CONDUTTIVO risale il filo,
// scrive la tua parola contro di te e ruba l'ultima, la sacca gonfia restituisce; da morto lascia volto + lettera; il giurato ritrova la faccia
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const E = (f, a) => pg.evaluate(f, a), W = (ms) => pg.waitForTimeout(ms); let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
async function until(fn, ms, tick) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (tick) await E(tick); if (await E(fn)) return true; await W(150); } return false; }
const SHOTS = process.env.SHOTS; const shot = (n) => SHOTS ? pg.screenshot({ path: `${SHOTS}/${n}.png` }) : null;
await pg.goto(BASE + '?fast'); await W(800); await E(() => PAL.start()); await until(() => !PAL.S.lock, 20000, () => PAL.skipDialog());
await E(() => { for (const w of ['state.fragile', 'temperament.cautious', 'element.conductive']) PAL.S.discovered.add(w); PAL.PROG.skills.nib2 = true; PAL.S.wordUse['state.fragile'] = 3; PAL.tp(40, -19); });
check('nell\'archivio il Ladro emerge dalle pozze', await until(() => PAL.LD.alive && PAL.LD.st !== 'rise' && PAL.LD.st !== 'sleep', 40000, () => { PAL.skipDialog(); PAL.P.hp = 6; }));
check('scritta del boss', await E(() => document.getElementById('bossCard').textContent.includes('LADRO')));
await shot('ladro-intro');
// il filo beve l'inchiostro
await E(() => { PAL.ink.v = 100; PAL.LD.st = 'stalk'; PAL.LD.t = 0; PAL.LD.sack = 0; PAL.tp(PAL.LD.x, PAL.LD.z > -23 ? PAL.LD.z - 5 : PAL.LD.z + 5); });
check('il filo si attacca (dopo la corsia di avviso)', await until(() => PAL.LD.st === 'siphon', 30000, () => { PAL.P.hp = 6; const L = PAL.LD; if (L.st === 'stalk') { L.t = 0; PAL.tp(L.x, L.z > -23 ? L.z - 5 : L.z + 5); } }));
await shot('ladro-filo');
check('il filo beve il tuo Inchiostro e riempie la sacca', await until(() => PAL.ink.v < 95 && PAL.LD.sack > 3, 20000, () => { PAL.P.hp = 6; PAL.tp(PAL.LD.x, PAL.LD.z > -23 ? PAL.LD.z - 5 : PAL.LD.z + 5); }));
// CONDUTTIVO mentre beve: l'impulso risale il filo
const hp0 = await E(() => PAL.LD.hp); await E(() => PAL.S.wordUse['state.fragile'] = 3);
await E(() => { if (PAL.LD.st !== 'siphon') { PAL.LD.st = 'siphon'; PAL.LD.t = 3; PAL.LD.sid = 'x'; } PAL.LD.sack = 40; PAL.ink.v = 60; PAL.applyW('ladro', 'element.conductive'); });
check('CONDUTTIVO mentre beve: scossa, danno e inchiostro restituito', await until((`PAL.LD.hp < ${hp0} && PAL.LD.st === 'stun'`), 20000, () => { PAL.P.hp = 6; }));
await E(() => PAL.grammar.resetPhrase('ladro'));
// lancia la tua parola più usata (FRAGILE) e ruba l'ultima
await E(() => { PAL.S.lastWord = 'state.fragile'; PAL.LD.sack = 60; PAL.LD.st = 'stalk'; PAL.LD.t = 0; PAL.tp(PAL.LD.x, PAL.LD.z > -23 ? PAL.LD.z - 5 : PAL.LD.z + 5); });
check('con la sacca piena ti scrive FRAGILE e ruba la parola', await until(() => PAL.P.fragileT > 0 && PAL.S.stolenWord === 'state.fragile', 30000, () => { PAL.P.hp = 6; }));
check('la sacca è gonfia (vulnerabile)', await E(() => PAL.LD.st === 'gorged'));
await shot('ladro-gonfio');
await E(() => { for (const m of PAL.swarm) if (m.room === 'archive' && m.alive) { m.alive = false; PAL.scene.remove(m.mesh); } }); // senza macchie vicine la mira assistita punta il Ladro
const ink0 = await E(() => { PAL.ink.v = 20; return 20; }); await E(() => { const L = PAL.LD; L.st = 'gorged'; L.t = 6; /* il browser dei test è lento: la finestra resta aperta abbastanza */ PAL.tp(L.x + (L.x > 40 ? -2.2 : 2.2), L.z); PAL.face(L.x, L.z); /* dal lato verso il centro della stanza */ PAL.attack(false); });
check('colpire la sacca gonfia restituisce inchiostro e la parola', await until(() => PAL.ink.v > 25 && PAL.S.lastWord === 'state.fragile', 20000, () => { PAL.P.hp = 6; }));
// sconfitta
await E(() => { PAL.LD.hp = 1; PAL.LD.st = 'gorged'; PAL.LD.t = 3; const L = PAL.LD; PAL.tp(L.x + (L.x > 40 ? -2.2 : 2.2), L.z); PAL.face(L.x, L.z); /* dal lato verso il centro della stanza */ PAL.P.st = 'idle'; PAL.attack(false); });
check('il Ladro si svuota e lascia la Sacca', await until(() => !PAL.LD.alive && PAL.PROG.items.sacca, 20000, () => { PAL.P.hp = 6; PAL.skipDialog(); }));
check('lascia il volto del giurato e un pezzo di lettera', await E(() => ['volto', 'lettera3'].every((k) => PAL.PICKS[k] || (PAL.PROG.quests.picked || {})[k])));
await W(1200); await shot('ladro-vinto');
await E(() => { if (PAL.PICKS.volto) PAL.tp(PAL.PICKS.volto.x, PAL.PICKS.volto.z); }); await until(() => !PAL.PICKS.volto, 20000);
check('raccolto il volto: commissione al passo «restituisci»', await E(() => PAL.Qs('giuria').step === 2));
// il giurato nel tribunale
await E(() => { for (const g of ['board', 'r1', 'r2']) PAL.gates[g].open = true; PAL.S.encounter = null; PAL.tp(-3.9, -82.4); }); await until(() => PAL.S.room === 'door', 20000); await until(() => !PAL.dlg.active, 20000, () => PAL.skipDialog());
check('restituisci il volto al giurato', await until(() => { const it = PAL.interactables().find((i) => i.label === 'restituisci'); if (it) { it.fn(); return true; } return false; }, 20000, () => PAL.tp(-3.9, -82.4)));
check('premio: Inchiostro di seppia', await until(() => PAL.PROG.items.seppia, 40000, () => PAL.skipDialog())); await shot('giurato');
await E(() => { PAL.ink.v = 10; PAL.S.lock = false; }); await W(3000); check('la seppia ricarica l\'inchiostro sotto metà', await E(() => PAL.ink.v > 10.5));
console.log('ERRORS', errs); if (bad || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS ladro'); await b.close();
