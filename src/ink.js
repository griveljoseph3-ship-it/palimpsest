// S3 · Inchiostro Vivo (GDD §04). Valori esatti, configurabili.
export const INK = { max: 100, worldScale: 0.3, rate: 3, protectedRate: 1.5, protectedTime: 4, fadedBelow: 25, fadedClose: 2.5,
  confirmCost: 8, gainHit: 12, gainDodge: 18, gainInteract: 25 };
export class Ink {
  constructor(cfg = INK) { this.c = cfg; this.v = cfg.max; this.open = false; this.t = 0; this.faded = false; this.fadedT = 0; this.safe = false;
    this.seenHit = new Set(); this.seenDodge = new Set(); this.events = []; }
  openPanel(safe) { this.open = true; this.t = 0; this.safe = safe; this.faded = false; this.fadedT = 0; this.check(); }
  closePanel() { this.open = false; this.faded = false; }
  check() { if (this.open && !this.safe && this.v < this.c.fadedBelow && !this.faded) { this.faded = true; this.fadedT = 0; this.events.push('faded'); } }
  // dtReal: secondi reali. Ritorna 'autoclose' quando lo Sbiadito scade.
  tick(dtReal) {
    if (!this.open) return null;
    if (!this.safe) { const r = this.t < this.c.protectedTime ? this.c.protectedRate : this.c.rate; this.v = Math.max(0, this.v - r * dtReal); }
    this.t += dtReal; this.check();
    if (this.faded) { this.fadedT += dtReal; if (this.fadedT >= this.c.fadedClose) { this.closePanel(); return 'autoclose'; } }
    return null;
  }
  get scale() { return this.open ? this.c.worldScale : 1; }
  canSelect() { return this.open && !this.faded; }
  confirm() { if (!this.safe) this.v = Math.max(0, this.v - this.c.confirmCost); this.check(); }
  gain(n) { this.v = Math.min(this.c.max, this.v + n); }
  hit(attackEventId) { if (this.seenHit.has(attackEventId)) return 0; this.seenHit.add(attackEventId); this.gain(this.c.gainHit); return this.c.gainHit; }
  dodge(enemyAttackId) { if (this.seenDodge.has(enemyAttackId)) return 0; this.seenDodge.add(enemyAttackId); this.gain(this.c.gainDodge); return this.c.gainDodge; }
  interact() { this.gain(this.c.gainInteract); return this.c.gainInteract; }
  encounterEnd() { this.v = this.c.max; this.seenHit.clear(); this.seenDodge.clear(); }
}
