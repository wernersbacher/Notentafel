import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanRows, attachLines, packLines, beams, subBeams, put, setCell, appendPos, canStepDown, emptyRows, reflow, canCloseGap, syllable, syllableParts, rowsToSong, playOrderRows, dotTargetIn, units, cellUnits, rowUnits, rowFullAt, fitsInRow, widest } from '../app/js/tafel/model.js';
import { MAX_LEN, MAX_ROWS } from '../app/js/tafel/config.js';

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

test('beams und subBeams: Sechzehntel in Gruppen von einem Schlag, zweiter Balken zwischen Sechzehnteln', () => {
  const s = { k: 'b', d: 0.25 }, e = { k: 'b', d: 0.5 }, q = { k: 'b', d: 1 };
  const four = beams([s, s, s, s, s]);
  assert.deepEqual(four, [1, 1, 1, 2]);
  assert.deepEqual(subBeams([s, s, s, s, s], four), [1, 1, 1]);
  // Achtel und zwei Sechzehntel (ti tiri): ein Balken über alle, der zweite nur über den Sechzehnteln
  const mix = beams([e, s, s, q]);
  assert.deepEqual(mix, [1, 1, 2]);
  assert.deepEqual(subBeams([e, s, s, q], mix), [, 1]);
  // Sechzehntel, Achtel, Sechzehntel: die einzelnen Sechzehntel bekommen kurze Ansätze
  const syn = beams([s, e, s]);
  assert.deepEqual(syn, [1, 1, 2]);
  assert.deepEqual(subBeams([s, e, s], syn), [3, , 4]);
  // Eine einzelne Sechzehntel hat keinen Balken
  assert.deepEqual(subBeams([s, q], beams([s, q])), []);
});

test('beams: kein Balken über eine Schlaggrenze, im 6/8-Takt drei Achtel zusammen', () => {
  const e = { k: 'b', d: 0.5 }, dq = { k: 'b', d: 1.5 };
  // punktierte Viertel, dann Achtel (allein, sie endet auf dem Schlag), dann zwei Achtel im nächsten Schlag
  assert.deepEqual(beams([dq, e, e, e]), [, , 1, 2]);
  assert.deepEqual(beams([e, e, e, e, e, e], 1.5), [1, 1, 2, 1, 1, 2]);
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

test('emptyRows: Rhythmus startet mit Notenlinie in jeder Zeile', () => {
  assert.ok(emptyRows(true).every((row) => row.line === true && row.length === 0));
  assert.ok(emptyRows().every((row) => !row.line));
  assert.deepEqual(packLines(emptyRows(true)), [1, 1, 1]);
});

test('reflow: was nicht mehr in die Zeile passt, rutscht an den Anfang der nächsten', () => {
  const b = (d) => ({ k: 'b', d });
  const rows = emptyRows(true);
  rows[0].push(b(1), b(1), b(1), b(2), b(0.5));
  rows[1].push(b(4));
  // Vier Schläge je Zeile: Nach drei Vierteln passt die Halbe nicht mehr hinein. Früher zählte reflow Plätze und ließ
  // sie stehen; seit der einheitlichen Zählung in Schlägen (wie fullAt/makeRoom) rutscht sie mit – und die Ganze, die
  // in der nächsten Zeile nun über vier Schläge hinausreicht, rutscht gleich weiter.
  assert.equal(reflow(rows, 0, 4), true);
  assert.deepEqual([...rows[0]], [b(1), b(1), b(1)]);
  assert.deepEqual([...rows[1]], [b(2), b(0.5)]);
  assert.deepEqual([...rows[2]], [b(4)]);
  // Am Ende der Tafel kommt eine neue Zeile mit derselben Notenlinie dazu
  const one = emptyRows(true).slice(0, 1);
  one[0].push(b(1), b(1), b(1));
  assert.equal(reflow(one, 0, 2), true);
  assert.equal(one.length, 2);
  assert.equal(one[1].line, true);
  assert.deepEqual([...one[1]], [b(1)]);
});

test('rowUnits: ein Platz, der nur einen Strich trägt, zählt keinen Schlag', () => {
  const b = (d) => ({ k: 'b', d });
  assert.equal(rowUnits([b(1), b(0.5), { bar: 2 }]), 6);
  assert.equal(cellUnits({ bar: 2 }), 0);
  assert.equal(cellUnits(null), 4); // leerer Platz: ein stiller Schlag
  assert.equal(units({ bar: 2 }), 4); // als sichtbarer Platz bleibt er einen Schlag breit
});

test('Zeilenumbruch: reflow, rowFullAt und fitsInRow zählen dieselbe Einheit (Schläge)', () => {
  const b = (d) => ({ k: 'b', d });
  // Zwei Schläge je Zeile. Zwei Viertel und ein Strich sind genau voll; der Strich selbst zählt dabei nicht.
  const full = [b(1), b(1), { bar: 2 }];
  assert.equal(rowFullAt(full, full.length - 1, 2), true);
  assert.equal(fitsInRow(full, b(1), 2), false);
  // Ohne den Strich ist eine Zeile mit einer Viertel noch nicht voll (der Strich schob früher einen Geisterschlag)
  assert.equal(rowFullAt([b(1), { bar: 2 }], 1, 2), false);
  // reflow schneidet an derselben Grenze: Der Strich bleibt bei seinen zwei Schlägen, das dritte Zeichen rutscht
  const rows = emptyRows(true);
  rows[0].push(b(1), b(1), { bar: 2 }, b(1));
  assert.equal(reflow(rows, 0, 2), true);
  assert.deepEqual([...rows[0]], [b(1), b(1), { bar: 2 }]);
  assert.deepEqual([...rows[1]], [b(1)]);
});

test('widest: leere Zeilenliste ergibt eine endliche Breite (CSS-Standard 2 statt -Infinity)', () => {
  assert.equal(widest([]), 2);
  assert.ok(Number.isFinite(widest([])));
  assert.equal(widest([2, 5, 3]), 5);
});

test('canCloseGap: löschen geht auf einem Platz, hinter dem letzten Zeichen und am Anfang einer leeren Zeile', () => {
  const rows = emptyRows(true);
  rows[0].push({ k: 'b', d: 1 });
  assert.equal(canCloseGap(rows, { r: 0, c: 0 }), true); // auf dem Zeichen
  assert.equal(canCloseGap(rows, { r: 0, c: 1 }), true); // dahinter: das Zeichen davor
  assert.equal(canCloseGap(rows, { r: 1, c: 0 }), true); // leere Zeile: Ende der Zeile darüber
  assert.equal(canCloseGap(rows, { r: 2, c: 0 }), false); // darüber auch leer
  assert.equal(canCloseGap(emptyRows(), { r: 0, c: 0 }), false);
});

test('syllable: Rhythmussprache ta, ti ti, taja, tajaja, tajajaja', () => {
  const b = (d) => ({ k: 'b', d });
  assert.equal(syllable(b(1)), 'ta');
  assert.equal(syllable(b(0.5), 1), 'ti');
  assert.equal(syllable(b(0.5), 2), 'ti');
  assert.equal(syllable(b(0.5)), 'ti');
  assert.equal(syllable(b(2)), 'taja');
  assert.equal(syllable(b(3)), 'tajaja');
  assert.equal(syllable(b(4)), 'tajajaja');
  assert.equal(syllable({ k: 'r', d: 1 }), '');
  assert.equal(syllable(null), '');
});

test('rowsToSong: Melodie und Rhythmus als Lied', () => {
  const rows = attachLines([[{ n: 'C', h: '' }, { n: 'Fis', h: 'r', d: 2 }, null], [{ k: 'b', d: 0.5 }, { k: 'r', d: 1 }, { n: 'C+', h: '', d: 3 }], []], [{ l: 0, m: '3/4' }, 0, 0]);
  assert.deepEqual(rowsToSong(rows), {
    meter: '3/4', pickup: 0, key: 0,
    ev: [{ p: 'c1', v: 4 }, { p: 'f1', v: 2, acc: 1 }, { v: 4, brk: 1 }, { p: 'h1', v: 8 }, { v: 4 }, { p: 'c2', v: 2, dot: 1, bar: 2 }]
  });
  assert.deepEqual(rowsToSong(emptyRows()).ev, []);
});

test('rowsToSong: ein Strich am Zeilenende wird kein Ton und keine Pause', () => {
  // Die Schlussstrich-Zelle hinter der letzten Note ist kein Schlag: Früher wurde daraus eine hörbare Viertelpause
  const rows = attachLines([[{ n: 'C', h: '' }, { bar: 2 }], [{ n: 'D', h: '' }, { bar: 1 }]], [0, 0]);
  assert.deepEqual(rowsToSong(rows).ev, [{ p: 'c1', v: 4, brk: 1 }, { p: 'd1', v: 4, bar: 2 }]);
  // Eine Zeile nur aus Strichen erzeugt nichts und hängt keinen Umbruch an die Zeile davor
  const marks = attachLines([[{ n: 'C', h: '' }], [{ bar: 2 }], [{ n: 'D', h: '' }], [{ bar: 1 }]], [0, 0, 0, 0]);
  assert.deepEqual(rowsToSong(marks).ev, [{ p: 'c1', v: 4, brk: 1 }, { p: 'd1', v: 4, bar: 2 }]);
  assert.deepEqual(rowsToSong(attachLines([[{ bar: 2 }]], [0])).ev, []);
  // Ein leerer Platz bleibt dagegen eine Pause (ein stiller Schlag)
  assert.deepEqual(rowsToSong(attachLines([[{ n: 'C', h: '' }, null, { bar: 2 }]], [0])).ev, [{ p: 'c1', v: 4 }, { v: 4, bar: 2 }]);
});

test('syllableParts: Silben auf die Schläge verteilt', () => {
  const b = (d) => ({ k: 'b', d });
  assert.deepEqual(syllableParts(b(1)), [['ta', 0]]);
  assert.deepEqual(syllableParts(b(2)), [['ta', 0], ['ja', 4]]);
  assert.deepEqual(syllableParts(b(3)), [['ta', 0], ['ja', 4], ['ja', 8]]);
  assert.deepEqual(syllableParts(b(4)), [['ta', 0], ['ja', 4], ['ja', 8], ['ja', 12]]);
  assert.deepEqual(syllableParts(b(0.5), 1), [['ti', 0]]);
  assert.deepEqual(syllableParts(b(1.5)), [['ta', 0], ['i', 4]]);
  // Sechzehntel: ti auf der Achtel, ri dazwischen
  assert.deepEqual(syllableParts(b(0.25), 1, false), [['ti', 0]]);
  assert.deepEqual(syllableParts(b(0.25), 1, true), [['ri', 0]]);
  assert.deepEqual(syllableParts({ k: 'r', d: 2 }), []);
});

test('playOrderRows: Wiederholungen auf der Tafel', () => {
  const b = (x = {}) => ({ k: 'b', d: 1, ...x });
  // Zeile 1: a b | ‖: c d :‖ (Ende als Strich-Platz am Zeilenende), Zeile 2: e
  const rows = attachLines([[b(), b(), b({ bar: 4 }), b(), { bar: 3 }], [b()]], [0, 0]);
  assert.deepEqual(playOrderRows(rows).map((p) => p.r + ':' + p.c), ['0:0', '0:1', '0:2', '0:3', '0:2', '0:3', '1:0']);
  // Ohne ‖: vom Anfang; :‖ vor einem Platz mitten in der Zeile
  const rows2 = attachLines([[b(), b(), b({ bar: 3 })]], [0]);
  assert.deepEqual(playOrderRows(rows2).map((p) => p.c), [0, 1, 0, 1, 2]);
});

test('dotTargetIn: Punkt für die Note an der Markierung oder die gerade gesetzte davor', () => {
  const b = (d) => ({ k: 'b', d });
  const rows = attachLines([[b(2), b(1), b(0.5)]], [0]);
  assert.equal(dotTargetIn(rows, { r: 0, c: 0 }), rows[0][0]); // Halbe an der Markierung
  assert.equal(dotTargetIn(rows, { r: 0, c: 2 }), null); // Achtel: kein Punkt
  rows[0].pop();
  assert.equal(dotTargetIn(rows, { r: 0, c: 2 }), rows[0][1]); // dahinter leer: die Viertel davor
  assert.equal(dotTargetIn(attachLines([[{ k: 'r', d: 2 }]], [0]), { r: 0, c: 1 }), null); // Pausen nicht
});
