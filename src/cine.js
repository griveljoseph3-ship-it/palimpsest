// Prologo illustrato: scene a inchiostro che si disegnano da sole, testo narrato, saltabile.
const INK = '#16110d', RED = '#8a1a10';
const P = (d, w = 4, c = INK, delay = 0, dur = 1.6) => `<path class="ink" d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round" style="--d:${delay}s;--t:${dur}s"/>`;
const T = (x, y, txt, size = 40, c = INK, delay = 0, extra = '') => `<text class="fade" x="${x}" y="${y}" font-size="${size}" fill="${c}" text-anchor="middle" font-family="Georgia,serif" style="--d:${delay}s" ${extra}>${txt}</text>`;
const drip = (x, y, delay) => `<circle class="drip" cx="${x}" cy="${y}" r="6" fill="${INK}" style="--d:${delay}s"/>`;
const blob = (x, y, r, delay, c = INK) => `<circle class="fade" cx="${x}" cy="${y}" r="${r}" fill="${c}" style="--d:${delay}s"/>`;
export const SCENES = [
  { svg: P('M120 380 Q400 330 400 380 Q400 330 680 380 L680 140 Q400 90 400 140 Q400 90 120 140 Z', 5) + P('M400 140 L400 380', 4, INK, 0.8) +
      [0, 1, 2, 3, 4, 5].map((i) => P(`M150 ${180 + i * 30} Q260 ${170 + i * 30} 370 ${178 + i * 30}`, 2, '#6b5a46', 1 + i * 0.15, 0.8) + P(`M430 ${178 + i * 30} Q540 ${170 + i * 30} 650 ${180 + i * 30}`, 2, '#6b5a46', 1.1 + i * 0.15, 0.8)).join(''),
    text: "C'era una volta una storia già finita. Un libro chiuso, scritto con un inchiostro che non doveva muoversi mai più." },
  { svg: P('M520 60 L330 330', 7, INK, 0) + P('M520 60 Q600 90 560 180 Q520 200 470 160', 3, INK, 0.4) + drip(330, 340, 1.2) + drip(330, 340, 2.2) +
      T(400, 430, 'INTEGRA', 54, INK, 0.8) + P('M300 418 L500 412', 6, RED, 1.8, 0.5) + T(400, 480, 'FRAGILE', 46, RED, 2.4),
    text: 'Poi una goccia è caduta. Tu sei chi tiene la penna: puoi cambiare una parola, e il mondo cambia con lei.' },
  { svg: P('M140 120 L380 100 L390 400 L150 420 Z', 4) + P('M420 100 L660 120 L650 420 L410 400 Z', 4, INK, 0.3) +
      [0, 1, 2, 3, 4].map((i) => P(`M170 ${150 + i * 50} L360 ${145 + i * 50}`, 2, '#6b5a46', 0.6 + i * 0.1, 0.5) + P(`M165 ${152 + i * 50} Q260 ${140 + i * 50} 365 ${150 + i * 50}`, 5, INK, 1.4 + i * 0.2, 0.4)).join('') +
      P('M450 150 Q560 300 630 160 M450 330 Q540 200 630 360', 5, RED, 1.2, 1.2),
    text: 'Ma il libro non vuole essere corretto. Le pagine si oppongono, le parole si nascondono, e tutto ricorda le versioni precedenti.' },
  { svg: P('M290 60 L510 60 L510 440 L290 440 Z', 5) + P('M400 120 m-60 0 a60 80 0 1 0 120 0 a60 80 0 1 0 -120 0', 4, INK, 0.6) +
      P('M370 115 q10 -10 20 0 M410 115 q10 -10 20 0', 4, INK, 1.2, 0.5) + P('M380 160 q20 8 40 0', 4, INK, 1.4, 0.5) + P('M340 90 Q300 220 320 330 M460 90 Q500 220 480 330', 3, INK, 1, 1) +
      T(400, 300, 'COLPEVOLE', 44, RED, 2, 'transform="rotate(-5 400 300)"') + T(400, 490, 'Elara', 30, INK, 2.4, 'font-style="italic"'),
    text: 'Elara è una pagina. Non devi convincerla: ti guarda e giudica come riscrivi. Sopra di lei, un relè ha scritto COLPEVOLE.' },
  { svg: `<g class="wob">${blob(400, 250, 90, 0.2)}${blob(330, 300, 40, 0.6)}${blob(470, 310, 30, 0.8)}${blob(400, 350, 50, 0.5)}</g>` + blob(370, 235, 12, 1.2, '#efe5cf') + blob(430, 235, 12, 1.2, '#efe5cf') +
      drip(400, 400, 1.4) + drip(350, 380, 2.0) + drip(450, 380, 2.6) + [0, 1, 2].map((i) => blob(160 + i * 50, 440, 12 + i * 4, 1.6 + i * 0.3)).join('') + T(400, 490, 'Lumi', 30, INK, 2, 'font-style="italic"'),
    text: 'Lumi è la macchia che resta quando sbagli e riprovi. Ogni tentativo fallito la fa crescere. Lumi ricorda tutto, e a volte ti mostra cosa è andato storto.' },
  { svg: P('M330 120 L470 120 L470 330 L330 330 Z', 6) + P('M355 60 L445 60 L445 120 L355 120 Z', 5, INK, 0.4) + P('M375 90 L425 90', 6, RED, 0.9, 0.4) +
      P('M300 140 L330 150 M500 140 L470 150 M340 330 L340 420 M460 330 L460 420', 6, INK, 0.7) + P('M470 260 Q560 300 600 380', 4, RED, 1.4, 1) + `<polygon class="fade" points="600,350 630,400 600,450 570,400" fill="${INK}" style="--d:2s"/>` + T(400, 480, 'il Custode', 30, INK, 2.2, 'font-style="italic"'),
    text: 'Il Custode è la parte della storia che si è irrigidita. È legato a un nucleo e non vuole più essere modificato.' },
  { svg: `<circle class="fade" cx="400" cy="220" r="80" fill="${RED}" style="--d:.2s"/>` + P('M350 220 L450 220 M400 170 L400 270', 6, '#efe5cf', 0.8, 0.6) + P('M150 420 Q280 380 400 420 Q520 460 650 420', 4, INK, 1.2) +
      T(400, 360, 'porta · Custode · sigillo', 30, INK, 1.6, 'font-style="italic"'),
    text: 'Il tuo scopo: attraversa le pagine, apri la porta di Elara, spezza il legame del Custode e tocca il sigillo. Come farlo lo scegli tu. Ogni scelta resta scritta.' },
];
export function playIntro(input, sfx) {
  return new Promise((resolve) => {
    const root = document.getElementById('cine'); const art = document.getElementById('cArt'), txt = document.getElementById('cText'), dots = document.getElementById('cDots');
    root.classList.remove('hidden'); let i = -1, t0 = 0, typing = null, full = '', done = false, raf = 0, shown = 0;
    dots.innerHTML = SCENES.map(() => '<i></i>').join('');
    const finish = () => { if (done) return; done = true; cancelAnimationFrame(raf); clearInterval(typing); root.classList.add('out'); setTimeout(() => { root.classList.add('hidden'); root.classList.remove('out'); resolve(); }, 600); };
    const show = (k) => { i = k; if (i >= SCENES.length) { finish(); return; } t0 = performance.now(); full = SCENES[i].text; shown = 0;
      art.innerHTML = `<svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet"><g filter="url(#inkEdge)">${SCENES[i].svg}</g></svg>`;
      [...dots.children].forEach((d, j) => d.classList.toggle('on', j <= i)); txt.textContent = ''; clearInterval(typing);
      typing = setInterval(() => { shown = Math.min(full.length, shown + 1); txt.textContent = full.slice(0, shown); if (shown % 3 === 0 && sfx) sfx.play('voice', 0.8); if (shown >= full.length) clearInterval(typing); }, 32);
      if (sfx) sfx.play('page'); };
    const next = () => { if (done) return; if (shown < full.length) { shown = full.length; txt.textContent = full; clearInterval(typing); return; } show(i + 1); };
    root.onpointerdown = (e) => { if (e.target.id === 'cSkip') return; next(); };
    document.getElementById('cSkip').onpointerdown = (e) => { e.stopPropagation(); finish(); };
    const loop = () => { if (done) return; raf = requestAnimationFrame(loop); input.poll();
      if (input.pressed('confirm') || input.pressed('attack') || input.pressed('interact')) next(); if (input.pressed('pause') || input.pressed('back')) finish();
      if (shown >= full.length && performance.now() - t0 > full.length * 32 + 4500) show(i + 1); };
    show(0); loop();
    window.__cine = { next, finish, scene: () => i };
  });
}
