import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoMarks, meterInfo, countSlots, barAt, openMeasureAt } from '../js/tafel/theory.js';
import { attachLines } from '../js/tafel/model.js';

const q = { n: 'C', h: '' };          // Punkt ohne Notenwert: ein Schlag
const n = (d) => ({ n: 'C', h: '', d });
const p = (d) => ({ k: 'r', d });
const row = (meter, ...cells) => { cells.meter = meter; return cells; };
// Nur die Haupt-Zählzeit jedes Zeichens
const heads = (a) => Array.from(a.z, (z) => z && z[0].t);

test('meterInfo und countSlots', () => {
  assert.deepEqual(meterInfo('4/4'), { n: 4, unit: 1, len: 4 });
  assert.deepEqual(meterInfo('6/8'), { n: 6, unit: 0.5, len: 3 });
  assert.deepEqual(meterInfo('2/2'), { n: 2, unit: 2, len: 4 });
  assert.equal(countSlots([row('4/4')], 0, n(2)), 2);
  assert.equal(countSlots([row('6/8')], 0, n(1)), 2);
  assert.equal(countSlots([row('2/2')], 0, n(1)), 1);
  assert.equal(countSlots([row('')], 0, n(4)), 4);
});

test('ausgeschaltet: keine Marken', () => {
  assert.deepEqual(autoMarks([row('4/4', q)], false), { rows: [], any: false });
});

test('4/4: Zählzeiten und Taktstriche', () => {
  const res = autoMarks([row('4/4', q, q, q, q, q, q)], true);
  const [a] = res.rows;
  assert.equal(res.any, true);
  assert.deepEqual(heads(a), ['1', '2', '3', '4', '1', '2']);
  assert.deepEqual(a.b, { 4: 1 }); // zweiter Takt geht nicht auf: kein Strich am Ende
  // Takt geht genau am Zeilenende auf: Strich hinter dem letzten Zeichen
  const [b] = autoMarks([row('4/4', q, q, q, q)], true).rows;
  assert.deepEqual(b.b, { 4: 1 });
});

test('4/4: gehaltene Zählzeiten, Achtel mit „+“, leere Plätze zählen einen Schlag', () => {
  const [a] = autoMarks([row('4/4', n(2), n(0.5), n(0.5), null, n(4))], true).rows;
  assert.deepEqual(a.z[0], [{ t: '1' }, { t: '2', held: true, o: 2 }]);
  assert.deepEqual(a.z[1], [{ t: '3' }]);
  assert.deepEqual(a.z[2], [{ t: '+' }]);
  assert.equal(a.z[3], undefined);
  assert.equal(a.z[4][0].t, '1');
  assert.deepEqual(a.b, { 4: 1, 5: 1 });
});

test('3/4: zählt über die Zeilen hinweg', () => {
  const rows = [row('3/4', q, q, q, q), row('', q, q, n(3))];
  const [a, b] = autoMarks(rows, true).rows;
  assert.deepEqual(heads(a), ['1', '2', '3', '1']);
  assert.deepEqual(a.b, { 3: 1 });
  assert.deepEqual(heads(b), ['2', '3', '1']);
  assert.deepEqual(b.b, { 2: 1, 3: 1 });
  assert.deepEqual(b.z[2].map((z) => z.t), ['1', '2', '3']);
});

test('6/8: in Achteln gezählt (1–6)', () => {
  const [a] = autoMarks([row('6/8', n(0.5), n(0.5), n(0.5), n(1), n(0.5), n(3))], true).rows;
  assert.deepEqual(heads(a), ['1', '2', '3', '4', '6', '1']);
  assert.deepEqual(a.z[3], [{ t: '4' }, { t: '5', held: true, o: 1 }]);
  assert.deepEqual(a.z[5].map((z) => z.t), ['1', '2', '3', '4', '5', '6']);
  assert.deepEqual(a.b, { 5: 1, 6: 1 });
});

test('2/2: in Halben gezählt', () => {
  const [a] = autoMarks([row('2/2', q, q, n(2), n(4))], true).rows;
  assert.deepEqual(heads(a), ['1', '+', '2', '1']);
  assert.deepEqual(a.z[3], [{ t: '1' }, { t: '2', held: true, o: 4 }]);
  assert.deepEqual(a.b, { 3: 1, 4: 1 });
});

test('neue Taktart beginnt wieder bei 1, Zeilen davor bleiben leer', () => {
  const rows = [row('', q, q), row('4/4', q, q, q), row('3/4', q, q, q, p(1))];
  const [x, a, b] = autoMarks(rows, true).rows;
  assert.deepEqual(x, { b: {}, z: [] });
  assert.deepEqual(heads(a), ['1', '2', '3']);
  assert.deepEqual(a.b, {});
  assert.deepEqual(heads(b), ['1', '2', '3', '1']);
  assert.deepEqual(b.b, { 3: 1 });
});

test('barAt: Schlussstrich bleibt, Automatik ersetzt Taktstriche von Hand', () => {
  const a = { b: { 2: 1 }, z: [] };
  assert.equal(barAt({ bar: 2 }, 0, a, true), 2);
  assert.equal(barAt({ bar: 1 }, 0, a, true), 0);
  assert.equal(barAt(null, 2, a, true), 1);
  assert.equal(barAt({ bar: 1 }, 0, a, false), 1);
  assert.equal(barAt(null, 2, a, false), 0);
});

test('openMeasureAt: Anfang des angefangenen Takts am Zeilenende', () => {
  const b = (d) => ({ k: 'b', d });
  // 4/4: ein voller Takt, dann zwei Viertel angefangen (ab Platz 4)
  const rows = attachLines([[b(1), b(1), b(2), b(1), b(1)], [b(2)]], [{ l: 1, m: '4/4' }, 0]);
  assert.equal(openMeasureAt(rows, 0), 3);
  // Die zweite Zeile zählt weiter: zwei Viertel + Halbe = voller Takt, nichts angefangen
  assert.equal(openMeasureAt(rows, 1), 1);
  // Ohne Taktart: nichts angefangen
  assert.equal(openMeasureAt(attachLines([[b(1), b(1)]], [0]), 0), 2);
  // Takt beginnt am Zeilenanfang: 0
  assert.equal(openMeasureAt(attachLines([[b(1), b(1)]], [{ l: 1, m: '4/4' }]), 0), 0);
});
