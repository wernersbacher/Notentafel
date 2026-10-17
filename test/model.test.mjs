import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanRows, attachLines, packLines, beams, put, setCell, appendPos, canStepDown } from '../js/model.js';
import { MAX_LEN, MAX_ROWS } from '../js/config.js';

const C = { n: 'C', h: '' };
const nulls = (k) => Array(k).fill(null);
// Nur die Plätze, ohne die Zeilen-Eigenschaften line/meter am Array
const cells = (row) => [...row];

test('cleanRows: ungültige Eingaben ergeben null', () => {
  assert.equal(cleanRows(null), null);
  assert.equal(cleanRows('x'), null);
  assert.equal(cleanRows([]), null);
  assert.equal(cleanRows([[C], 'x']), null);
  assert.equal(cleanRows(Array.from({ length: MAX_ROWS + 1 }, () => [])), null);
  assert.equal(cleanRows([nulls(MAX_LEN + 1)]), null);
  assert.ok(cleanRows([nulls(MAX_LEN)]));
});

test('cleanRows: leere Plätze am Ende der letzten beschriebenen Zeile fallen weg', () => {
  const rs = cleanRows([[C, null, null], [], [null, null]]);
  assert.deepEqual(rs.map((r) => r.length), [1, 0, 0]);
});

test('cleanRows: älterer Stand mit 8 Plätzen pro Zeile', () => {
  const rs = cleanRows([[C, C, ...nulls(6)], nulls(8), nulls(8)]);
  assert.deepEqual(cells(rs[0]), [C, C]);
  assert.equal(rs[1].length, 0);
  assert.equal(rs[2].length, 0);
});

test('cleanRows: ungültige Töne, Dauern und Zählzeiten werden verworfen', () => {
  const row = cells(cleanRows([[
    { n: 'X' },                       // unbekannter Ton → leer
    { n: 'D', h: 'q', d: 7 },         // falsche Hand und Dauer fallen weg
    { n: 'E', h: 'r', d: 0.5, z: '1 +' },
    { k: 'r', d: 7 },                 // Pause ohne gültige Dauer → leer
    { k: 'x', d: 2 },                 // unbekannte Art → Pause
    { k: 'b', d: 1, z: '7' },         // Zählzeit 7 gibt es nicht
    { k: 'b', d: 1, z: 2 },           // keine Zeichenkette
    C
  ]])[0]);
  assert.deepEqual(row, [
    null,
    { n: 'D', h: '' },
    { n: 'E', h: 'r', d: 0.5, z: '1 +' },
    null,
    { k: 'r', d: 2 },
    { k: 'b', d: 1 },
    { k: 'b', d: 1 },
    C
  ]);
});

test('cleanRows: Taktstrich bleibt erhalten, auch auf leerem oder ungültigem Platz', () => {
  const row = cells(cleanRows([[{ bar: 1 }, { n: 'X', bar: 2 }, { n: 'C', h: '', bar: 'ja' }, { bar: 1 }]])[0]);
  assert.deepEqual(row, [{ bar: 1 }, { bar: 2 }, { n: 'C', h: '', bar: 1 }, { bar: 1 }]);
});

test('cleanRows: Zeilen-Eigenschaften im alten (1) und neuen ({ l, m }) Format', () => {
  const rs = cleanRows([[C], [C], [C], [C]], [1, { l: 0, m: '3/4' }, { l: 1, m: '5/4' }]);
  assert.deepEqual(rs.map((r) => [r.line, r.meter]), [[true, ''], [false, '3/4'], [true, ''], [false, '']]);
  const ohne = cleanRows([[C]]);
  assert.equal(ohne[0].line, false);
  assert.equal(ohne[0].meter, '');
});

test('packLines/attachLines: Rundreise', () => {
  const rs = [[C], [C], [C], []];
  rs[0].line = true;
  rs[1].meter = '6/8';
  rs[2].line = true; rs[2].meter = '2/2';
  const packed = packLines(rs);
  assert.deepEqual(packed, [1, { l: 0, m: '6/8' }, { l: 1, m: '2/2' }, 0]);
  const back = attachLines([[], [], [], []], JSON.parse(JSON.stringify(packed)));
  assert.deepEqual(back.map((r) => [r.line, r.meter]), [[true, ''], [false, '6/8'], [true, '2/2'], [false, '']]);
});

test('beams: zwei Achtel bekommen einen Balken', () => {
  const e = { n: 'C', h: '', d: 0.5 };
  assert.deepEqual(beams([e, e]), [1, 2]);
  assert.deepEqual(beams([C, e, e, C]), [, 1, 2]);
});

test('beams: Punkt und eigenständiges Notenzeichen nicht gemischt, Pausen ohne Balken', () => {
  const e = { n: 'C', h: '', d: 0.5 }, b = { k: 'b', d: 0.5 }, r = { k: 'r', d: 0.5 };
  assert.deepEqual(beams([e, b]), []);
  assert.deepEqual(beams([b, b]), [1, 2]);
  assert.deepEqual(beams([r, r]), []);
});

test('beams: drei Achtel – nur die ersten beiden bekommen einen Balken', () => {
  const e = { n: 'C', h: '', d: 0.5 };
  assert.deepEqual(beams([e, e, e]), [1, 2]);
  assert.deepEqual(beams([e, e, e, e]), [1, 2, 1, 2]);
});

test('put füllt Lücken mit leeren Plätzen, setCell behält den Taktstrich', () => {
  const row = [];
  put(row, 2, C);
  assert.deepEqual(row, [null, null, C]);
  const r2 = [{ n: 'C', h: '', bar: 1 }];
  setCell(r2, 0, { n: 'D', h: '' });
  assert.deepEqual(r2[0], { n: 'D', h: '', bar: 1 });
  setCell(r2, 0, null);
  assert.deepEqual(r2[0], { bar: 1 });
});

test('appendPos: hinter dem letzten Ton der letzten beschriebenen Zeile', () => {
  assert.deepEqual(appendPos([[], [], []]), { r: 0, c: 0 });
  assert.deepEqual(appendPos([[C], [C, null, C], []]), { r: 1, c: 3 });
});

test('canStepDown: nur am Zeilenende und wenn die nächste Zeile leer ist', () => {
  const rows = [[C, C], [], [C]];
  assert.equal(canStepDown(rows, { r: 0, c: 2 }), true);
  assert.equal(canStepDown(rows, { r: 0, c: 1 }), false);
  assert.equal(canStepDown(rows, { r: 1, c: 0 }), false); // nächste Zeile nicht leer
  assert.equal(canStepDown(rows, { r: 2, c: 1 }), false); // letzte Zeile
});
