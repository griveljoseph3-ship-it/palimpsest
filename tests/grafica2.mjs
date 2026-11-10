// v2.6 · giro grafico parte 2: oggetti a penna, HUD/pausa/opzioni nello stile del titolo, pulviscolo e aloni, caricamento, titoli di coda
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1366, height: 1024 } }); const errs = []; let bad = 0; const check = (n, v) => { console.log(v ? 'OK ' : 'XX ', n); if (!v) bad++; };
let pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message));
let E = (f, a) => pg.evaluate(f, a); const W = (ms) => pg.waitForTimeout(ms);
async function until(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await E(fn).catch(() => false)) return true; await W(300); } return false; }
// 1) schermata di caricamento (senza ?fast): si vede subito, poi se ne va da sola
await pg.goto(BASE + '?prova', { waitUntil: 'domcontentloaded' });
check('caricamento: si vede subito, con barra e scritta', await E(() => { const l = document.getElementById('loading'); return !!l && !!document.getElementById('lFill') && getComputedStyle(l).display !== 'none'; }));
check('caricamento: non blocca i tocchi', await E(() => getComputedStyle(document.getElementById('loading')).pointerEvents === 'none'));
check('caricamento: se ne va quando il gioco è pronto', await until(() => !document.getElementById('loading'), 40000));
check('titolo: c\'è il pulsante dei titoli di coda', await E(() => !!document.getElementById('bCredits')));
await pg.close();
// 2) nel gioco
pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message)); E = (f, a) => pg.evaluate(f, a);
await pg.goto(BASE + '?fast'); await W(1500);
check('con ?fast niente schermata di caricamento', await E(() => !document.getElementById('loading')));
await E(() => PAL.start()); for (let i = 0; i < 40; i++) { await E(() => PAL.skipDialog()); if (!(await E(() => PAL.S.lock))) break; await W(200); }
const pr = await E(() => PAL.props26());
check('pilastri a penna (tratteggio cilindrico + mattoni)', pr.pillars.length >= 4 && pr.pillars.every((v) => v === 1));
check('presse a penna (legno della tavola 062)', pr.press.length === 2 && pr.press.every((v) => v === 2));
check('barili d\'inchiostro a penna (3, con contorno)', pr.barrels === 3 && pr.barrelPen === 1);
check('pulviscolo e aloni nella scena', await E(() => !!PAL.scene.getObjectByName('pulviscolo') && !!PAL.scene.getObjectByName('aloni')));
await E(() => { PAL.tut.on = false; PAL.P.inv = 1e9; PAL.S.encounter = null; PAL.tp(6.5, -32); PAL.S.snapCam = true; }); await W(2500);
check('aloni accesi vicino alle candele', await until(() => PAL.halos.n >= 2, 8000));
check('stanza col Caricatore sotto 120 draw call', await E(() => PAL.info().calls <= 120));
// 3) HUD e pausa nello stile del titolo
check('HUD: pulsanti d\'inchiostro con bordo crema', await E(() => { const s = getComputedStyle(document.querySelector('#topBtns button')); return s.backgroundColor.includes('0.82') && s.borderTopColor.includes('243, 234, 214'); }));
await E(() => document.getElementById('bPause').click()); await W(400);
check('pausa: tavola sullo sfondo e pulsante rosso «Riprendi»', await E(() => getComputedStyle(document.getElementById('pause')).backgroundImage.includes('copertina2') && getComputedStyle(document.getElementById('pResume')).backgroundColor === 'rgb(138, 26, 16)'));
check('pausa: il gioco è fermo', await E(() => PAL.isPaused()));
await E(() => document.getElementById('pOptions').click()); await W(300);
check('opzioni: pagina a parte con 3 schede (suono, gioco, vista)', await E(() => !document.getElementById('pOpts').classList.contains('hidden') && document.getElementById('pMain').classList.contains('hidden') && document.querySelectorAll('#pOpts section').length === 3));
check('opzioni: le scelte funzionano ancora (difficoltà)', await E(() => { const s = document.getElementById('oDiff'); s.value = 'storia'; s.dispatchEvent(new Event('change')); return JSON.parse(localStorage.getItem('pal.options')).diff === 'storia'; }));
await E(() => document.getElementById('pOptBack').click()); await W(200);
check('opzioni: «Indietro» torna alla pausa', await E(() => !document.getElementById('pMain').classList.contains('hidden')));
await E(() => document.getElementById('pResume').click()); await W(200); check('Riprendi chiude la pausa', await E(() => !PAL.isPaused()));
// 4) titoli di coda
await E(() => { window.__crDone = 0; PAL.credits(() => { window.__crDone++; }, true); }); await W(1500);
check('titoli di coda: Joseph Grivel autore e autore delle tavole', await E(() => { const t = document.getElementById('crRoll').textContent; return /Un gioco di\s*Joseph Grivel/i.test(t) && /Tavole di concept art\s*Joseph Grivel/i.test(t) && /three\.js/.test(t); }));
check('titoli di coda: scorrono', await until(() => PAL.CRED.y < innerHeight * 0.5, 15000));
check('titoli di coda: tavole di Joseph dentro', await E(() => document.querySelectorAll('#crRoll .plates img').length >= 6));
await E(() => document.getElementById('crSkip').click()); await W(300);
check('titoli di coda: «Salta» chiude e va avanti', await E(() => window.__crDone === 1 && document.getElementById('credits').classList.contains('hidden')));
console.log('ERRORS', errs); if (bad || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS grafica2'); await b.close();
