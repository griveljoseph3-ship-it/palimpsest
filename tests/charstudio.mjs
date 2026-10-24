// Ritratti dei personaggi: "studio" su carta (stessa pipeline InkMaster + Post del gioco) + scatti in partita.
// uso: node tests/charstudio.mjs <cartella-output> [prefisso]
import { chromium } from 'playwright-core';
import fs from 'fs';
const OUT = process.argv[2] || '/workspace/palimpsest-shots/personaggi'; const PFX = process.argv[3] || 'after'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const PORT = process.env.PORT || 8941;
const pg = await (await b.newContext({ viewport: { width: 1366, height: 1024 } })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(`http://localhost:${PORT}/?fast`); await pg.waitForTimeout(900); await pg.evaluate(() => PAL.start()); await pg.waitForTimeout(500); await pg.evaluate(() => PAL.skipDialog());
const V = await pg.evaluate(() => [...document.querySelectorAll('script[type=module]')].map((s) => s.src).join(' ') + ' ' + (performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes('world.js')) || ''));
const ver = (V.match(/world\.js\?v=([\d.]+)/) || [])[1] || '1.9.0';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
async function studio(name, build, cam, look) {
  if (ONLY && !ONLY.includes(name)) return;
  const url = await pg.evaluate(async ([ver, build, cam, look]) => {
    const THREE = await import(`/vendor/three.module.js?v=${ver}`); const W = await import(`/src/world.js?v=${ver}`); const A = await import(`/src/art.js?v=${ver}`);
    const r = PAL.renderer; const sc = new THREE.Scene(); sc.background = new THREE.Color(0xe9dfc8);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), A.inkMaster({ color: 0xe6dabf, texBlend: 0.9 })); A.withMask(floor.geometry, 0); sc.add(floor);
    const objs = new Function('W', 'THREE', 'sc', build)(W, THREE, sc);
    const c = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 100); c.position.set(...cam); c.lookAt(...look);
    const post = window.__studioPost || (window.__studioPost = new A.Post(r)); const sz = r.getDrawingBufferSize(new THREE.Vector2()); post.setSize(sz.x, sz.y);
    return await new Promise((res) => { let n = 0; const step = () => { requestAnimationFrame(() => { const U = A.INK_UNIFORMS; const lp = U.uLamp.value.clone(), lr = U.uLampR.value; const pl = U.uPL.value.map((v) => v.clone());
      U.uLamp.value.set(look[0], 0, look[2]); U.uLampR.value = 30; U.uPL.value.forEach((v) => v.set(0, -99, 0, 1)); U.uPL.value[0].set(look[0] - 2, 2.5, look[2] + 2.5, 7); U.uPC.value[0].set(0.5, 0.35, 0.2);
      if (objs && objs.tick) objs.tick(n / 30); post.render(sc, c); const d = r.domElement.toDataURL('image/png'); U.uLamp.value.copy(lp); U.uLampR.value = lr; pl.forEach((v, i) => U.uPL.value[i].copy(v));
      if (++n < 3) step(); else res(d); }); }; step(); }); }, [ver, build, cam, look]);
  fs.writeFileSync(`${OUT}/${PFX}-${name}.png`, Buffer.from(url.split(',')[1], 'base64')); console.log('studio', name);
}
await studio('studio-cast', `
  const add=(m,x,ry=0)=>{m.position.x=x; m.rotation.y=ry; sc.add(m); return m;};
  const pl=add(W.makePlayer(),-2.2,0.35); pl.userData.quill.visible=true;
  add(W.makeElara(),-0.7,-0.2);
  const lu=add(W.makeLumi(),0.5,-0.3); lu.position.y=0.9;
  const m1=add(W.makeMite(),1.4,-0.4); const m2=add(W.makeMite(),1.95,-0.6); m2.position.z=0.6;
  const cu=add(W.makeCustode(),4.4,-0.5); cu.scale.setScalar(0.75); cu.position.z=-1.2;
  return { tick(t){} };`, [1.1, 2.6, 12.5], [1.1, 1.2, 0]);
await studio('studio-correttore', `const p=W.makePlayer(); p.rotation.y=0.45; p.userData.quill.visible=true; sc.add(p); const q=W.makePlayer(); q.position.x=1.4; q.rotation.y=Math.PI-0.5; sc.add(q);`, [0.7, 1.6, 6.2], [0.7, 1.0, 0]);
await studio('studio-elara', `const e=W.makeElara(); e.rotation.y=0.3; sc.add(e); const f=W.makeElara(); f.position.x=1.1; f.rotation.y=-1.3; sc.add(f);`, [0.55, 1.3, 5.2], [0.55, 0.85, 0]);
await studio('studio-lumi-acari', `const l=W.makeLumi(); l.position.set(-0.6,0.8,0); l.rotation.y=0.3; sc.add(l); for(let i=0;i<3;i++){const m=W.makeMite(); m.position.set(0.3+i*0.65,0.3,(i%2)*0.4); m.rotation.y=-0.3-i*0.3; if(i==2) m.scale.multiplyScalar(1.45); sc.add(m);} `, [0.5, 1.5, 5.2], [0.5, 0.5, 0]);
await studio('studio-custode', `const c=W.makeCustode(); c.rotation.y=0.35; sc.add(c);`, [0.6, 2.6, 9.0], [0, 1.9, 0]);
await studio('studio-charger', `const c=W.makeCharger(); c.rotation.y=0.5; c.scale.setScalar(1.4); sc.add(c);`, [0.5, 1.8, 5.5], [0, 0.9, 0]);
// in partita
if (ONLY && !ONLY.includes('game')) { console.log('errors', JSON.stringify(errs)); await b.close(); process.exit(0); }
async function shot(name) { await pg.waitForTimeout(1600); await pg.screenshot({ path: `${OUT}/${PFX}-${name}.png` }); console.log('shot', name); }
await pg.evaluate(() => { PAL.tp(0, 4); PAL.P.face = 0.6; }); await shot('game-correttore');
await pg.evaluate(() => { PAL.tp(1.2, -95.8); PAL.P.face = 2.6; }); await pg.waitForTimeout(800); await pg.evaluate(() => PAL.skipDialog()); await shot('game-elara');
await pg.evaluate(() => { PAL.tp(0, -112); }); await pg.waitForTimeout(800); await pg.evaluate(() => PAL.skipDialog()); await shot('game-custode');
await pg.evaluate(() => { PAL.tp(40, -16); }); await pg.waitForTimeout(1500); await pg.evaluate(() => PAL.skipDialog()); await shot('game-acari');
// Ilde nel film iniziale
await pg.goto(`http://localhost:${PORT}/`); await pg.waitForTimeout(800); await pg.click('#bReplayIntro').catch(() => pg.click('#bStart')); await pg.waitForTimeout(1200);
for (const [t, n] of [[5, 'film-ilde'], [30, 'film-elara'], [52, 'film-cast']]) { await pg.evaluate((t) => window.__film && __film.seek(t), t); await pg.waitForTimeout(1500); await pg.screenshot({ path: `${OUT}/${PFX}-${n}.png` }); console.log('shot', n); }
console.log('errors', JSON.stringify(errs)); await b.close();
