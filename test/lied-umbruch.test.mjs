import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layout, widestMeasure } from '../js/lied/layout.js';
import { barsAfter } from '../js/lied/model.js';

const n = (p, v = 4, x = {}) => ({ p, v, ...x });
const quarters = (bars) => Array.from({ length: bars * 4 }, (_, i) => n(['c1', 'd1', 'e1', 'f1'][i % 4]));
const lines = (lay) => lay.systems.map((s) => [s.first, s.end]);

test('ohne Breite: nur Umbrüche von Hand, wie bisher', () => {
  const song = { meter: '4/4', ev: quarters(8) };
  assert.equal(layout(song).systems.length, 1);
});

test('mit Breite: Zeilen enden an Taktstrichen und passen in die Breite', () => {
  const song = { meter: '4/4', ev: quarters(8) };
  const width = 50, lay = layout(song, { autoBar: true, width }), bars = barsAfter(song, true);
  assert.ok(lay.systems.length > 2);
  lay.systems.forEach((s) => {
    assert.ok(s.width <= width + 0.01, 'Zeile ' + s.first + ' zu breit: ' + s.width);
    if (s.end > s.first && s !== lay.systems[lay.systems.length - 1]) assert.equal(bars[s.end - 1], 1, 'Zeile endet nicht am Taktstrich');
  });
});

test('volle Zeilen werden gestreckt, die letzte nicht', () => {
  const song = { meter: '4/4', ev: quarters(5) };
  const width = 50, lay = layout(song, { autoBar: true, width });
  const [first] = lay.systems, last = lay.systems[lay.systems.length - 1];
  assert.ok(first.stretch > 0);
  assert.ok(Math.abs(first.width - width) < 0.01, 'volle Zeile ' + first.width);
  assert.equal(last.stretch, 0);
});

test('Umbrüche von Hand bleiben, automatische kommen dazu', () => {
  const ev = quarters(6);
  ev[3].brk = 1;
  const lay = layout({ meter: '4/4', ev }, { autoBar: true, width: 50 });
  assert.deepEqual(lines(lay)[0], [0, 4]);
  assert.equal(lay.systems[0].stretch, 0); // von Hand umbrochen: nicht strecken
  assert.ok(lay.systems.length > 2);
});

test('ein Takt, der allein nicht passt, wird zwischen zwei Zeichen umbrochen', () => {
  const ev = Array.from({ length: 16 }, () => n('g1', 16));
  const lay = layout({ meter: '4/4', ev }, { autoBar: true, width: 25 });
  assert.ok(lay.systems.length > 1);
  lay.systems.forEach((s) => assert.ok(s.width <= 25.01));
});

test('Balken laufen nicht über einen automatischen Umbruch', () => {
  const ev = Array.from({ length: 16 }, () => n('g1', 16));
  const lay = layout({ meter: '4/4', ev }, { autoBar: true, width: 25 });
  lay.systems.forEach((s) => s.beams.forEach((b) => {
    assert.ok(b.x1 >= 0 && b.x2 <= s.width);
  }));
  const groups = lay.systems.map((s) => s.beams.length).reduce((a, b) => a + b, 0);
  assert.ok(groups >= 4);
});

test('der leere Platz am Ende kommt in eine neue Zeile, wenn die letzte voll ist', () => {
  const song = { meter: '4/4', ev: quarters(2) };
  // Genau so breit, dass zwei Takte passen, der leere Platz aber nicht mehr
  const w2 = layout(song, { autoBar: true }).systems[0];
  const lay = layout(song, { autoBar: true, width: w2.width - 2 });
  const last = lay.systems[lay.systems.length - 1];
  assert.ok(last.ghost);
  assert.ok(last.width <= w2.width - 2 + 0.01);
});

test('widestMeasure: breitester Takt samt Zeilenanfang; mit dieser Breite wird nie mitten im Takt umbrochen', () => {
  const ev = [...quarters(1), ...Array.from({ length: 16 }, () => n('g1', 16)), ...quarters(1)];
  const song = { meter: '4/4', ev }, w = widestMeasure(song, { autoBar: true });
  const lay = layout(song, { autoBar: true, width: w }), bars = barsAfter(song, true);
  lay.systems.slice(0, -1).forEach((s) => assert.equal(bars[s.end - 1], 1));
  assert.ok(lay.systems.every((s) => s.width <= w + 0.01));
});
