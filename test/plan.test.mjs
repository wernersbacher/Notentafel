import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beatsOf, startAt, skip } from '../js/core/plan.js';

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

test('cutAt: bis vor das Tuch, stille Einträge davor fallen weg', async () => {
  const { cutAt } = await import('../js/core/plan.js');
  const items = [
    { t: 0, len: 1, sound: 'bell', pos: 0 }, { t: 1, len: 2, sound: 'bell', pos: 1 },
    { t: 3, len: 1, sound: '', pos: 2 }, { t: 4, len: 1, sound: 'bell', pos: 3 }
  ];
  const plan = { items, end: 5, beat: 1 };
  assert.deepEqual(cutAt(plan, (s) => s.pos >= 3), { items: items.slice(0, 2), end: 3, beat: 1 });
  assert.equal(cutAt(plan, (s) => s.pos >= 9), plan);
  assert.deepEqual(cutAt(plan, () => true).items, []);
});

test('skip: eingeklappte Einträge fallen weg, was danach kommt, rückt nach vorn', () => {
  const plan = { items: [{ t: 0, len: 1, sound: 'piano', pos: 0 }, { t: 1, len: 2, sound: 'piano', pos: 1 }, { t: 3, len: 1, sound: 'piano', pos: 2 }], end: 4 };
  const p = skip(plan, (s) => s.pos === 1);
  assert.deepEqual(p.items.map((s) => [s.t, s.pos]), [[0, 0], [1, 2]]);
  assert.equal(p.end, 2);
  // Nichts eingeklappt: der Plan bleibt
  assert.equal(skip(plan, () => false), plan);
});
