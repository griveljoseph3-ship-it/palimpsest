// S1 · Resolver: slot, combinazioni, Ripristina frase, Ricomponi prova (GDD §03, §10).
import { SLOTS, EFFECTS, COMBOS, ENTITY_DEFS } from './data.js?v=1.6.0';

export class Grammar {
  constructor() { this.ents = new Map(); this.listeners = []; this.snapshots = new Map(); }
  on(fn) { this.listeners.push(fn); }
  emit(ev) { for (const f of this.listeners) f(ev); }
  register(id, type, extra = {}) {
    const def = ENTITY_DEFS[type]; if (!def) throw new Error('tipo sconosciuto ' + type);
    const slots = {};
    for (const eff of def.supports) { const s = EFFECTS[eff].slot; slots[s] = SLOTS[s].baseline; }
    const e = { id, type, def, slots, timers: {}, broken: false, ...extra };
    this.ents.set(id, e); return e;
  }
  get(id) { return this.ents.get(id); }
  remove(id) { this.ents.delete(id); }
  supported(id) { const e = this.get(id); return e ? e.def.supports.slice() : []; }
  has(id, eff) { const e = this.get(id); return !!e && e.slots[EFFECTS[eff].slot] === eff; }
  active(id) { const e = this.get(id); if (!e) return []; return Object.values(e.slots).filter((v) => EFFECTS[v]); }
  // Combinazione che si formerebbe applicando eff (per la preview).
  comboFor(id, eff) {
    const act = this.active(id).filter((a) => EFFECTS[a].slot !== EFFECTS[eff].slot);
    for (const c of COMBOS) for (const a of act) if ((c.a === eff && c.b === a) || (c.b === eff && c.a === a)) return c;
    return null;
  }
  combosActive(id) {
    const act = this.active(id);
    return COMBOS.filter((c) => act.includes(c.a) && act.includes(c.b));
  }
  canApply(id, eff) {
    const e = this.get(id);
    if (!e) return { ok: false, reason: 'nessun bersaglio' };
    if (!EFFECTS[eff]) return { ok: false, reason: 'effetto sconosciuto' };
    if (!e.def.supports.includes(eff)) return { ok: false, reason: 'la pagina rifiuta questa parola' };
    if (e.broken && EFFECTS[eff].slot === 'state') return { ok: false, reason: 'componente già rotto' };
    return { ok: true };
  }
  apply(id, eff) {
    const chk = this.canApply(id, eff); if (!chk.ok) return chk;
    const e = this.get(id), slot = EFFECTS[eff].slot;
    const prev = e.slots[slot];
    e.slots[slot] = eff; // un solo valore per slot: sostituisce
    const d = e.def.durations[eff];
    if (d == null) delete e.timers[slot]; else e.timers[slot] = d;
    const combo = this.combosActive(id).find((c) => c.a === eff || c.b === eff) || null;
    const res = { ok: true, id, eff, slot, replaced: prev !== SLOTS[slot].baseline && prev !== eff ? prev : null, refreshed: prev === eff, combo };
    this.emit({ type: 'apply', ...res });
    return res;
  }
  tick(simDt) {
    for (const e of this.ents.values()) for (const slot of Object.keys(e.timers)) {
      e.timers[slot] -= simDt;
      if (e.timers[slot] <= 0) { const old = e.slots[slot]; delete e.timers[slot]; e.slots[slot] = SLOTS[slot].baseline; this.emit({ type: 'expire', id: e.id, eff: old, slot }); }
    }
  }
  // Ripristina frase: valori e timer temporanei; NON salute, rotture, posizione, Inchiostro.
  resetPhrase(id) {
    const e = this.get(id); if (!e) return false;
    const had = this.active(id);
    for (const s of Object.keys(e.slots)) e.slots[s] = SLOTS[s].baseline;
    e.timers = {};
    this.emit({ type: 'reset', id, had });
    return true;
  }
  // Ricomponi prova: snapshot locale di un enigma sicuro (include rotture e dati extra forniti dal gioco).
  snapshot(zone, ids, extra = () => ({})) {
    const data = ids.map((id) => { const e = this.get(id); return { id, slots: { ...e.slots }, timers: { ...e.timers }, broken: e.broken }; });
    this.snapshots.set(zone, { data, extra: structuredClone(extra()) });
  }
  recompose(zone) {
    const s = this.snapshots.get(zone); if (!s) return null;
    for (const d of s.data) { const e = this.get(d.id); if (!e) continue; e.slots = { ...d.slots }; e.timers = { ...d.timers }; e.broken = d.broken; }
    this.emit({ type: 'recompose', zone });
    return structuredClone(s.extra);
  }
}
