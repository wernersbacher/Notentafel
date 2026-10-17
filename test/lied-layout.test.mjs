import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layout, beamGroups, spacing, G } from '../js/lied/layout.js';
import { barsAfter } from '../js/lied/model.js';

const n = (p, v = 4, x = {}) => ({ p, v, ...x });
const r = (v = 4, x = {}) => ({ v, ...x });
const song = (ev, meter = '4/4') => ({ meter, ev });

test('spacing: längere Werte bekommen mehr Platz', () => {
  assert.deepEqual([2, 4, 8, 16, 32].map((t) => +spacing(t).toFixed(2)), [1.6, 2.5, 3.4, 4.3, 5.2]);
});

test('Zeilen: Umbruch hinter einem Ereignis, leere Zeile am Ende mit dem leeren Platz', () => {
  const { systems } = layout(song([n('c1'), n('d1', 4, { brk: 1 }), n('e1'), n('f1', 4, { brk: 1 })]));
  assert.deepEqual(systems.map((s) => [s.first, s.end]), [[0, 2], [2, 4], [4, 4]]);
  assert.ok(!systems[0].ghost && !systems[1].ghost && systems[2].ghost);
  // Die Taktart steht nur in der ersten Zeile
  assert.ok(systems[0].meterX > 0);
  assert.equal(systems[1].meterX, undefined);
});

test('leeres Lied: eine Zeile mit dem leeren Platz', () => {
  const { systems } = layout(song([], ''));
  assert.equal(systems.length, 1);
  assert.ok(systems[0].ghost);
  assert.equal(systems[0].meterX, undefined);
});

test('Spalten schließen lückenlos aneinander an, Köpfe stehen von links nach rechts', () => {
  const { systems } = layout(song([n('c1'), n('d1', 8, { acc: 1 }), r(2), n('e1', 1)]), { autoBar: true });
  const its = systems[0].items;
  its.forEach((it, j) => {
    assert.ok(it.l < it.x && it.x < it.r);
    if (j) assert.equal(it.l, its[j - 1].r);
  });
  assert.ok(its[1].accX < its[1].x - G.head / 2);
  assert.equal(systems[0].ghost.l, its[3].r);
});

test('Hälse: unter der Mittellinie nach oben, ab der Mittellinie nach unten, weit außen bis zur Mittellinie', () => {
  const { at } = layout(song([n('g1'), n('h1'), n('a0'), n('c3'), n('e1', 1)]));
  assert.deepEqual(at[0].stem, { up: true, end: 9, x: at[0].x + G.stemX });
  assert.equal(at[1].stem.up, false);
  assert.equal(at[1].stem.end, -3);
  assert.equal(at[2].stem.end, 4);
  assert.equal(at[3].stem.end, 4);
  assert.equal(at[4].stem, undefined); // Ganze ohne Hals
});

test('Hilfslinien und Punkt im Zwischenraum', () => {
  const { at } = layout(song([n('c1', 4, { dot: 1 }), n('a0'), n('a2'), n('f1', 2, { dot: 1 }), r(4, { dot: 1 })]));
  assert.deepEqual(at[0].ledger, [-2]);
  assert.equal(at[0].dot, -1);
  assert.deepEqual(at[1].ledger, [-2, -4]);
  assert.deepEqual(at[2].ledger, [10]);
  assert.equal(at[3].dot, 1);
  assert.equal(at[4].dot, 5);
});

test('Balken: Achtel innerhalb eines Schlags, Pausen und Taktstriche trennen', () => {
  const s = song([n('c1', 8), n('d1', 8), n('e1', 8), n('f1', 8), n('g1', 8), r(8), n('a1', 8), n('h1', 8)]);
  assert.deepEqual(beamGroups(s, barsAfter(s, false)), [[0, 1, 2, 3], [6, 7]]);
  const t = song([n('c1', 8, { bar: 1 }), n('d1', 8)]);
  assert.deepEqual(beamGroups(t, barsAfter(t, false)), []);
  // Punktierte Achtel und Sechzehntel teilen sich einen Schlag
  const d = song([n('c1', 8, { dot: 1 }), n('d1', 16), n('e1', 16), n('f1', 16), n('g1', 8)]);
  assert.deepEqual(beamGroups(d, barsAfter(d, false)), [[0, 1], [2, 3, 4]]);
  // Im 6/8-Takt drei Achtel zusammen
  const six = song([n('c1', 8), n('d1', 8), n('e1', 8), n('f1', 8), n('g1', 8), n('a1', 8)], '6/8');
  assert.deepEqual(beamGroups(six, barsAfter(six, false)), [[0, 1, 2], [3, 4, 5]]);
  // Ein Umbruch trennt
  const b = song([n('c1', 8, { brk: 1 }), n('d1', 8)]);
  assert.deepEqual(beamGroups(b, barsAfter(b, false)), []);
});

test('Balken: gemeinsame Richtung, Fähnchen fallen weg, Sechzehntel bekommen einen zweiten Balken', () => {
  const { systems, at } = layout(song([n('c1', 8, { dot: 1 }), n('d1', 16), n('g2', 8), n('f2', 8)]));
  const [b1, b2] = systems[0].beams;
  assert.equal(b1.up, true);
  // Leicht steigend; der zweite Hals (d') hat genau die volle Länge
  assert.deepEqual([b1.end1, b1.end2], [5.5, -1 + G.stem]);
  assert.deepEqual([at[0].stem.end, at[1].stem.end], [5.5, 6]);
  assert.equal(at[0].flags, undefined);
  assert.deepEqual(b1.sub, [[at[1].stem.x - 1, at[1].stem.x]]);
  assert.equal(b2.up, false);
  assert.deepEqual([b2.end1, b2.end2], [1.5, 8 - G.stem]); // der tiefere Kopf (f'') bestimmt die Höhe
  assert.deepEqual([at[2].stem.end, at[3].stem.end], [b2.end1, b2.end2]);
});

const groups = (s) => beamGroups(s, barsAfter(s, false));
const eighths = (k) => Array.from({ length: k }, () => n('g1', 8));

test('Balken im 4/4-Takt: einfache Achtel pro halbem Takt, Sechzehntel pro Schlag', () => {
  assert.deepEqual(groups(song(eighths(8))), [[0, 1, 2, 3], [4, 5, 6, 7]]);
  // Achtel + zwei Sechzehntel füllen Schlag 2, werden aber nicht mit Schlag 1 zusammengefasst
  assert.deepEqual(groups(song([...eighths(2), n('a1', 16), n('h1', 16), n('c2', 8)])), [[0, 1], [2, 3, 4]]);
  // Schlag 2 und 3 liegen in verschiedenen Takthälften
  assert.deepEqual(groups(song([n('g1'), ...eighths(4), n('g1')])), [[1, 2], [3, 4]]);
});

test('Balken in 2/4, 3/4 und 6/8: pro Schlag', () => {
  assert.deepEqual(groups(song(eighths(4), '2/4')), [[0, 1], [2, 3]]);
  assert.deepEqual(groups(song(eighths(6), '3/4')), [[0, 1], [2, 3], [4, 5]]);
  assert.deepEqual(groups(song([n('c1', 8, { dot: 1 }), n('d1', 16), n('e1', 8), ...eighths(3)], '6/8')), [[0, 1, 2], [3, 4, 5]]);
});

test('Balken im 2/2-Takt: pro Halbe, mit Sechzehnteln pro Viertel', () => {
  assert.deepEqual(groups(song(eighths(4), '2/2')), [[0, 1, 2, 3]]);
  assert.deepEqual(groups(song([...eighths(2), n('a1', 16), n('h1', 16), n('c2', 8)], '2/2')), [[0, 1], [2, 3, 4]]);
});

test('Balken mit Auftakt: zwei Achtel als Auftakt, danach beginnt der neue Takt', () => {
  assert.deepEqual(groups({ meter: '4/4', pickup: 8, ev: eighths(6) }), [[0, 1], [2, 3, 4, 5]]);
});

test('Balken geneigt: höchstens ein Linienabstand, waagerecht bei gleich hohen Enden oder weiter außen liegendem Innenkopf', () => {
  const rise = layout(song([n('c1', 8), n('e1', 8), n('g1', 8), n('h1', 8)], '2/2')).systems[0].beams[0];
  assert.ok(rise.up && rise.end2 > rise.end1 && rise.end2 - rise.end1 <= 2);
  const steep = layout(song([n('c1', 8), n('c2', 8)], '2/4')).systems[0].beams[0];
  assert.equal(steep.end2 - steep.end1, 2);
  // Gleich hohe Enden, tieferer Innenkopf, Hälse nach oben
  const flat = layout(song([n('g1', 8), n('c1', 8), n('g1', 8)], '6/8')).systems[0].beams[0];
  assert.ok(flat.up);
  assert.equal(flat.end1, flat.end2);
  // Innenkopf höher als beide Enden bei Hälsen nach oben
  const inner = layout(song([n('c1', 8), n('a1', 8), n('e1', 8)], '6/8')).systems[0].beams[0];
  assert.ok(inner.up);
  assert.equal(inner.end1, inner.end2);
});

test('Balken: jeder Hals ist mindestens 7 Plätze lang und endet auf der Linie', () => {
  const s = song([n('c1', 8), n('a1', 16), n('e1', 16), n('h1', 8), n('d2', 8), n('a1', 16), n('f2', 16), n('e2', 8), n('a0', 8), n('c2', 8)]);
  const { systems, at } = layout(s);
  groups(s).forEach((idx, k) => {
    const b = systems[0].beams[k];
    idx.forEach((i) => {
      const st = at[i].stem, t = (st.x - b.x1) / (b.x2 - b.x1);
      assert.ok(Math.abs(st.end - at[i].pos) >= G.stem - 1e-9);
      assert.ok(Math.abs(st.end - (b.end1 + t * (b.end2 - b.end1))) < 1e-9);
    });
  });
});

test('Taktstriche: automatisch nach der Taktart', () => {
  const { systems } = layout(song([n('c1', 2), n('d1', 2), n('e1', 1, { bar: 2 })]), { autoBar: true });
  assert.deepEqual(systems[0].bars.map((b) => b.k), [1, 2]);
});

test('Platz über und unter dem System wächst mit hohen und tiefen Tönen', () => {
  const lo = layout(song([n('a0')])).systems[0], hi = layout(song([n('c3', 8)])).systems[0], mid = layout(song([n('h1')])).systems[0];
  assert.equal(mid.top, 2.5);
  assert.ok(lo.bottom > mid.bottom);
  assert.ok(hi.top > mid.top);
});
