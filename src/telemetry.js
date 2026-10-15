// S6 · Telemetria SOLO locale (GDD §15): niente rete. Esportabile da Opzioni.
const KEY = 'pal.telemetry';
export const Tele = {
  sid: Math.random().toString(36).slice(2, 8), t0: performance.now(), buf: [],
  log(type, data = {}) { const e = { t: +((performance.now() - this.t0) / 1000).toFixed(2), sid: this.sid, type, ...data }; this.buf.push(e); if (this.buf.length % 10 === 0) this.flush(); return e; },
  flush() { try { const old = JSON.parse(localStorage.getItem(KEY) || '[]'); localStorage.setItem(KEY, JSON.stringify(old.concat(this.buf).slice(-3000))); this.buf = []; } catch (e) {} },
  all() { this.flush(); try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } },
  clear() { this.buf = []; localStorage.removeItem(KEY); },
  summary() { const a = this.all().filter((e) => e.sid === this.sid); const c = {}; for (const e of a) c[e.type] = (c[e.type] || 0) + 1; return c; },
};
addEventListener('pagehide', () => Tele.flush());
