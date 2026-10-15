// Playthrough scriptato: node tests/play.mjs <route> <plan> [shots]
import { chromium } from 'playwright-core';
const [route = 'forced', plan = 'controllo', shots = ''] = process.argv.slice(2);
const BASE = process.env.BASE || 'http://localhost:8941/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1366, height: 1024 }, deviceScaleFactor: 1, hasTouch: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const pg = await ctx.newPage(); const errs = [];
pg.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) errs.push(m.text()); }); pg.on('pageerror', (e) => errs.push('PE ' + e.message));
pg.on('requestfailed', (r) => errs.push('REQ ' + r.url()));
pg.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('favicon')) errs.push(r.status() + ' ' + r.url()); });
const E = (f, a) => pg.evaluate(f, a); const W = (ms) => pg.waitForTimeout(ms);
const shot = async (n) => { if (shots) await pg.screenshot({ path: `${shots}/${n}.png` }); };
async function until(fn, ms, label, tick) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (tick) await E(tick); if (await E(fn)) return true; await W(150); } throw new Error('timeout: ' + label + ' ' + JSON.stringify(await E(() => ({ door: [PAL.door.hasDoc, PAL.door.docPlaced, PAL.grammar.has('evplate','element.conductive'), PAL.ink.v, PAL.dlg.active], room: PAL.S.room, p: [PAL.P.x, PAL.P.z], c: [PAL.custode.x, PAL.custode.z, PAL.custode.st], ch: [PAL.charger.x, PAL.charger.z, PAL.charger.st], hp: PAL.P.hp })))); }
const keepAlive = () => { PAL.P.hp = 5; };
await pg.goto(BASE + '?fast'); await W(800); await E(() => PAL.start()); await W(600); await E(() => PAL.skipDialog()); await W(1200);
// I · tavola
await E(() => { PAL.tp(0, -3.4); PAL.face(0, -5); }); await W(300); await E(() => PAL.interact()); await W(200); await E(() => PAL.skipDialog());
if (!await E(() => PAL.rewrite('board', 'state.fragile'))) throw new Error('rewrite board'); await shot('02-board-fragile');
await E(() => { PAL.face(0, -5); PAL.attack(true); }); await until(() => PAL.ENT.board.broken, 4000, 'board break'); await W(300); await shot('03-board-broken');
// II · Caricatore
await E(() => PAL.tp(0, -10)); await until(() => PAL.S.room === 'charger', 3000, 'enter charger'); await E(() => PAL.skipDialog());
await E(() => PAL.rewrite('charger', 'state.fragile'));
const behindPillar = (id, pillars) => `(() => { const e = PAL.${id}; if (e.armorBroken) return; PAL.P.hp=5; PAL.ink.v=Math.max(PAL.ink.v,60); if (e.st!=='idle') return; if (!PAL.grammar.has('${id}','state.fragile')) PAL.rewrite('${id}','state.fragile');
  let best=null; for (const [x,z] of ${JSON.stringify(pillars)}) { const dx=x-e.x, dz=z-e.z, l=Math.hypot(dx,dz); const px=x+dx/l*2.2, pz=z+dz/l*2.2; const d=Math.hypot(px-e.x,pz-e.z); if (d>4.3&&d<10.5&&(!best||d<best.d)) best={px,pz,d}; } if (best) PAL.tp(best.px,best.pz); })()`;
await until(() => PAL.charger.armorBroken, 30000, 'charger armor', behindPillar('charger', [[-3.6, -17], [3.6, -12.5]])); await shot('04-charger-broken');
await W(700); await until(() => !PAL.charger.alive, 15000, 'charger dead', () => { PAL.P.hp = 5; const e = PAL.charger; if (PAL.P.st === 'idle' && e.exposed > 0) { PAL.tp(e.x + 1.3, e.z + 0.5); PAL.face(e.x, e.z); PAL.attack(true); } });
// III · Conduttivo
await E(() => PAL.tp(0, -24.5)); await until(() => PAL.S.room === 'conduct', 3000, 'enter conduct'); await E(() => PAL.skipDialog()); await E(() => PAL.tp(0, -26.3));
await E(() => PAL.rewrite('plate', 'element.conductive')); await shot('05-plate'); await until(() => PAL.gates.r2.open, 6000, 'r2 gate');
// IV · porta di Elara
await E(() => PAL.tp(0, -39.5)); await until(() => PAL.S.room === 'door', 3000, 'enter door'); await E(() => PAL.skipDialog());
if (route === 'forced') { await E(() => PAL.rewrite('relay', 'state.fragile')); await E(() => { PAL.tp(2.7, -47.7); PAL.face(2.7, -49.2); PAL.attack(true); }); }
if (route === 'evidence') { await E(() => PAL.tp(-6.5, -40.3)); await E(() => PAL.interact()); await E(() => PAL.skipDialog()); await E(() => PAL.tp(-1.9, -48.4)); await E(() => PAL.interact()); await E(() => PAL.rewrite('evplate', 'element.conductive')); }
if (route === 'trust') { await E(() => PAL.tp(0, -47.6)); await E(() => PAL.interact()); await E(() => PAL.skipDialog()); await E(() => PAL.choose(0)); await shot('06-defense');
  await until(() => PAL.S.doorRoute === 'trust', 60000, 'defense', () => { PAL.P.hp = 5; const m = PAL.door.mites.find((m) => m.alive); if (m && PAL.P.st === 'idle') { PAL.tp(m.x + 0.8, m.z); PAL.face(m.x, m.z); PAL.attack(false); } }); }
await until(`PAL.S.doorRoute === '${route}'`, 8000, 'door route ' + route); await W(400); await shot('07-door-' + route); await E(() => PAL.skipDialog());
// V · arena
await W(1200); await E(() => PAL.tp(0, -56.3)); await until(() => PAL.S.room === 'arena', 3000, 'enter arena'); await E(() => PAL.skipDialog());
if (plan === 'controllo') { await E(() => PAL.rewrite('custode', 'temperament.cautious')); await shot('08-cauto');
  await until(() => PAL.arena.window > 0, 15000, 'loosen', () => { PAL.P.hp = 5; if (!PAL.grammar.has('custode', 'temperament.cautious')) PAL.rewrite('custode', 'temperament.cautious'); PAL.tp(0, -61.0 + 0.3); });
  await E(() => PAL.tp(0, -68.0)); }
if (plan === 'rottura') { await until(() => PAL.custode.armorBroken, 45000, 'custode armor', behindPillar('custode', [[-4.6, -61], [4.6, -61]])); await shot('08-rottura');
  await until(() => PAL.arena.snapped, 8000, 'snap', () => { PAL.P.hp = 5; const e = PAL.custode; if (PAL.P.st === 'idle' && e.exposed > 0) { PAL.tp(e.x + 1.3, e.z + 0.6); PAL.face(e.x, e.z); PAL.attack(true); } });
  await E(() => PAL.tp(0, -68.0)); }
if (plan === 'ambiente') { await E(() => { PAL.tp(0, -64.5); PAL.rewrite('bridge', 'element.conductive'); }); await shot('08-ponte');
  await until(() => PAL.arena.window > 0 || PAL.S.victory, 20000, 'fold loosen', () => { PAL.P.hp = 5; if (!PAL.grammar.has('bridge', 'element.conductive')) { PAL.tp(0, -64.5); PAL.rewrite('bridge', 'element.conductive'); } PAL.tp(0.2, -68.15); }); }
if (plan === 'azione') { await until(() => PAL.custode.armorBroken, 90000, 'action armor', () => { PAL.P.hp = 5; const e = PAL.custode; if (PAL.P.st === 'idle' && ['stun', 'recover', 'windup', 'swipeWU'].includes(e.st)) { PAL.tp(e.x + 1.4, e.z + 0.6); PAL.face(e.x, e.z); PAL.attack(false); } else if (PAL.P.st === 'idle' && e.st === 'idle') PAL.tp(e.x + 6, Math.max(-67, Math.min(-57, e.z + 2))); });
  await until(() => PAL.arena.snapped, 10000, 'snap2', () => { PAL.P.hp = 5; const e = PAL.custode; if (PAL.P.st === 'idle' && e.exposed > 0) { PAL.tp(e.x + 1.3, e.z + 0.6); PAL.face(e.x, e.z); PAL.attack(true); } });
  await E(() => PAL.tp(0, -68.0)); }
await until(() => PAL.S.victory, 8000, 'victory', () => { PAL.P.hp = 5; if (!PAL.S.victory) PAL.tp(0, -68.1); }); await shot('09-victory-' + plan);
await until(() => PAL.S.room === 'end', 6000, 'end room'); await W(500); await shot('10-consequence');
await until(() => PAL.S.done, 20000, 'done', () => { PAL.skipDialog(); });
const sum = await E(() => ({ route: PAL.S.doorRoute, plan: PAL.S.plan, tele: PAL.Tele.summary(), journal: PAL.S.journal.length, runs: PAL.mem.runs, fps: window.__fps }));
await shot('11-journal');
console.log(JSON.stringify(sum)); console.log('ERRORS', errs.length, errs.slice(0, 8));
if (sum.route !== route || sum.plan !== plan || errs.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS', route, plan);
await b.close();
