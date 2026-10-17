import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beatsOf, startAt } from '../js/core/plan.js';

test('beatsOf: Zählschlag nach der Taktart', () => {
  assert.deepEqual(beatsOf('3/4'), { beat: 1, perBar: 3 });
  assert.deepEqual(beatsOf('2/2'), { beat: 2, perBar: 2 });
  assert.deepEqual(beatsOf('6/8'), { beat: 0.5, perBar: 6 });
  assert.deepEqual(beatsOf(''), { beat: 1, perBar: 4 });
});

test('startAt: ab der Markierung, Zeiten beginnen bei 0, der Takt läuft weiter', () => {
  const plan = { items: [{ t: 0, len: 1, sound: 'piano', pos: 0 }, { t: 1, len: 1, sound: 'piano', pos: 1 }, { t: 2, len: 2, sound: 'piano', pos: 2 }], end: 4, beat: 1, perBar: 4 };
  const p = startAt(plan, 1);
  assert.deepEqual(p.items.map((s) => [s.t, s.pos]), [[0, 1], [1, 2]]);
  assert.equal(p.end, 3);
  assert.equal(p.barStart, -1);
  // Hinter dem letzten Ton (k = -1) oder ganz vorn: der ganze Plan
  assert.equal(startAt(plan, -1), plan);
  assert.equal(startAt(plan, 0), plan);
});
