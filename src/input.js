// S2 · Input: controller (Gamepad API) e touch col pollice primari; tastiera/mouse secondari.
const BTN = ['attack', 'heavy', 'dodge', 'interact', 'rewrite', 'quick', 'reset', 'recompose', 'pause', 'left', 'right', 'up', 'down', 'confirm', 'back'];
export class Input {
  constructor(el) {
    this.move = { x: 0, y: 0 }; this.down = {}; this.prev = {}; this.virt = {}; this.virtMove = null; this.mode = 'touch';
    this.keys = new Set(); this.touchMove = { x: 0, y: 0 }; this.touchBtn = {}; this.mouseBtn = {}; this.pointer = null;
    addEventListener('keydown', (e) => { if (e.repeat) return; this.keys.add(e.code); this.mode = 'kb'; if (['Space', 'Tab'].includes(e.code)) e.preventDefault(); });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    el.addEventListener('mousedown', (e) => { if (e.button === 0) this.mouseBtn.attack = true; if (e.button === 2) this.mouseBtn.heavy = true; this.mode = 'kb'; });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseBtn.attack = false; if (e.button === 2) this.mouseBtn.heavy = false; });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    this.rumbleOK = true;
  }
  // Stick virtuale a comparsa (metà sinistra) e pulsanti a ventaglio sotto il pollice destro.
  bindTouch(stickZone, knob, base, buttons) {
    let id = null, ox = 0, oy = 0; const R = 60;
    stickZone.addEventListener('pointerdown', (e) => { if (id !== null) return; id = e.pointerId; ox = e.clientX; oy = e.clientY; this.mode = 'touch';
      base.style.display = 'block'; base.style.left = ox + 'px'; base.style.top = oy + 'px'; knob.style.transform = 'translate(-50%,-50%)'; stickZone.setPointerCapture(id); });
    stickZone.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; let dx = e.clientX - ox, dy = e.clientY - oy; const l = Math.hypot(dx, dy);
      if (l > R) { dx *= R / l; dy *= R / l; } this.touchMove = { x: dx / R, y: dy / R }; knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`; });
    const end = (e) => { if (e.pointerId !== id) return; id = null; this.touchMove = { x: 0, y: 0 }; base.style.display = 'none'; };
    stickZone.addEventListener('pointerup', end); stickZone.addEventListener('pointercancel', end);
    for (const [name, b] of Object.entries(buttons)) {
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.touchBtn[name] = true; this.mode = 'touch'; b.classList.add('on'); });
      const up = () => { this.touchBtn[name] = false; b.classList.remove('on'); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    }
  }
  pad() { const gs = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of gs) if (g && g.connected) return g; return null; }
  rumble(weak, strong, ms) {
    const g = this.pad(); try { if (g && g.vibrationActuator) g.vibrationActuator.playEffect('dual-rumble', { duration: ms, weakMagnitude: weak, strongMagnitude: strong }); } catch (e) {}
    try { if (navigator.vibrate && this.mode === 'touch') navigator.vibrate(Math.round(ms * (strong > 0.5 ? 1 : 0.5))); } catch (e) {}
  }
  poll() {
    this.prev = this.down; const d = {}; const k = this.keys; let mx = 0, my = 0;
    if (k.has('KeyA') || k.has('ArrowLeft')) mx -= 1; if (k.has('KeyD') || k.has('ArrowRight')) mx += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) my -= 1; if (k.has('KeyS') || k.has('ArrowDown')) my += 1;
    d.attack = k.has('KeyJ') || this.mouseBtn.attack; d.heavy = k.has('KeyK') || this.mouseBtn.heavy; d.dodge = k.has('Space') || k.has('ShiftLeft');
    d.interact = k.has('KeyE'); d.rewrite = k.has('KeyQ') || k.has('Tab'); d.quick = k.has('KeyR'); d.reset = k.has('KeyT'); d.recompose = k.has('KeyY');
    d.pause = k.has('Escape') || k.has('KeyP'); d.left = k.has('ArrowLeft') || k.has('KeyA'); d.right = k.has('ArrowRight') || k.has('KeyD');
    d.up = k.has('ArrowUp') || k.has('KeyW'); d.down = k.has('ArrowDown') || k.has('KeyS'); d.confirm = k.has('Enter') || k.has('KeyE') || k.has('KeyJ'); d.back = k.has('Escape') || k.has('KeyQ') || k.has('Backspace');
    const g = this.pad();
    if (g) {
      const b = (i) => !!(g.buttons[i] && g.buttons[i].pressed); const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
      if (Math.hypot(ax, ay) > 0.2) { mx = ax; my = ay; this.mode = 'pad'; }
      const any = g.buttons.some((x) => x.pressed); if (any) this.mode = 'pad';
      d.attack ||= b(2); d.heavy ||= b(3); d.dodge ||= b(1) || b(7); d.interact ||= b(0); d.rewrite ||= b(5); d.quick ||= b(4);
      d.reset ||= b(8); d.recompose ||= b(11); d.pause ||= b(9); d.left ||= b(14) || ax < -0.6; d.right ||= b(15) || ax > 0.6; d.up ||= b(12); d.down ||= b(13);
      d.confirm ||= b(0); d.back ||= b(1) || b(5);
    }
    if (Math.hypot(this.touchMove.x, this.touchMove.y) > 0.05) { mx = this.touchMove.x; my = this.touchMove.y; }
    for (const n of BTN) d[n] ||= !!this.touchBtn[n] || !!this.virt[n];
    if (this.virtMove) { mx = this.virtMove.x; my = this.virtMove.y; }
    const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
    this.move = { x: mx, y: my }; this.down = d;
  }
  pressed(n) { return !!this.down[n] && !this.prev[n]; }
  held(n) { return !!this.down[n]; }
}
