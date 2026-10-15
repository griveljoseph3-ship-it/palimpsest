import { Grammar } from '../src/resolver.js';
import assert from 'node:assert/strict';
const g = new Grammar(); const evs = []; g.on((e) => evs.push(e.type));
g.register('c', 'custode'); g.register('b', 'board'); g.register('p', 'plate');
assert.deepEqual(g.supported('b'), ['state.fragile']);
assert.equal(g.apply('b', 'temperament.cautious').ok, false);
assert.equal(g.apply('p', 'state.fragile').ok, false);
assert.equal(g.comboFor('c', 'state.fragile'), null);
assert.ok(g.apply('c', 'temperament.cautious').ok);
assert.equal(g.comboFor('c', 'state.fragile').id, 'combo.retreat_vulnerable');
const r = g.apply('c', 'state.fragile'); assert.equal(r.combo.id, 'combo.retreat_vulnerable');
assert.equal(g.active('c').length, 2);
g.tick(7.9); assert.ok(g.has('c', 'state.fragile')); g.tick(0.2); assert.ok(!g.has('c', 'state.fragile')); assert.ok(!g.has('c', 'temperament.cautious'));
assert.ok(g.apply('b', 'state.fragile').ok); g.tick(100); assert.ok(g.has('b', 'state.fragile'), 'tavola senza scadenza');
// un valore per slot / refresh
g.apply('c', 'element.conductive'); g.tick(5); assert.equal(g.apply('c', 'element.conductive').refreshed, true); g.tick(5); assert.ok(g.has('c', 'element.conductive'));
// reset phrase non tocca rotture
g.get('c').broken = true; g.resetPhrase('c'); assert.equal(g.active('c').length, 0); assert.equal(g.get('c').broken, true);
assert.equal(g.apply('c', 'state.fragile').ok, false, 'componente rotto');
// snapshot/ricomponi
g.snapshot('z', ['b'], () => ({ open: false })); g.get('b').broken = true; g.resetPhrase('b');
const ex = g.recompose('z'); assert.equal(ex.open, false); assert.equal(g.get('b').broken, false); assert.ok(g.has('b', 'state.fragile'));
assert.ok(evs.includes('expire') && evs.includes('reset') && evs.includes('recompose'));
console.log('S1 OK', evs.length, 'eventi');
