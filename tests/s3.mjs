import { Ink } from '../src/ink.js'; import assert from 'node:assert/strict';
const k = new Ink(); k.openPanel(false); for (let i = 0; i < 40; i++) k.tick(0.1); // 4s protetti
assert.ok(Math.abs(k.v - 94) < 1e-6, k.v); k.tick(1); assert.ok(Math.abs(k.v - 91) < 1e-6);
assert.equal(k.scale, 0.3); k.closePanel(); assert.equal(k.scale, 1);
assert.equal(k.hit('a1'), 12); assert.equal(k.hit('a1'), 0); assert.equal(k.dodge('e1'), 18); assert.equal(k.dodge('e1'), 0);
assert.equal(k.v, 100); k.v = 26; k.openPanel(false); let r; let t = 0; while (!r && t < 10) { r = k.tick(0.05); t += 0.05; }
assert.equal(r, 'autoclose'); assert.ok(k.events.includes('faded')); assert.ok(t > 2.5 && t < 3.5, t);
k.v = 10; k.openPanel(true); k.tick(5); assert.equal(k.v, 10); assert.equal(k.canSelect(), true);
k.closePanel(); k.encounterEnd(); assert.equal(k.v, 100); console.log('S3 ink OK');
