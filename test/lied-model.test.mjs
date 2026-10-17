import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ticks, staffPos, freq, noteName, nearestPitch, shiftOct, measureTicks, barsAfter, cleanSong, parsePitch,
  pickupsFor, gridOffset, gridStarts, stepPitch
} from '../js/lied/model.js';

const n = (p, v = 4, x = {}) => ({ p, v, ...x });
const r = (v = 4, x = {}) => ({ v, ...x });

test('ticks: alle Notenwerte, auch punktiert', () => {
  assert.deepEqual([1, 2, 4, 8, 16].map((v) => ticks({ v })), [32, 16, 8, 4, 2]);
  assert.deepEqual([1, 2, 4, 8].map((v) => ticks({ v, dot: 1 })), [48, 24, 12, 6]);
});

test('staffPos: unterste Linie e\' = 0, oberste f\'\' = 8', () => {
  assert.equal(staffPos('e1'), 0);
  assert.equal(staffPos('c1'), -2);
  assert.equal(staffPos('h1'), 4);
  assert.equal(staffPos('f2'), 8);
  assert.equal(staffPos('a0'), -4);
  assert.equal(staffPos('c3'), 12);
});

test('freq: a\' = 440, Vorzeichen verschieben um einen Halbton', () => {
  assert.equal(freq(n('a1')), 440);
  assert.ok(Math.abs(freq(n('c1')) - 261.63) < 0.01);
  assert.ok(Math.abs(freq(n('f1', 4, { acc: 1 })) - 369.99) < 0.01);
  assert.ok(Math.abs(freq(n('h1', 4, { acc: -1 })) - 466.16) < 0.01);
  assert.equal(freq(n('a1', 4, { acc: 0 })), 440);
});

test('noteName: deutsche Namen', () => {
  assert.equal(noteName(n('c1')), 'C');
  assert.equal(noteName(n('f1', 4, { acc: 1 })), 'Fis');
  assert.equal(noteName(n('h1', 4, { acc: -1 })), 'B');
  assert.equal(noteName(n('e2', 4, { acc: -1 })), 'Es');
  assert.equal(noteName(n('a0', 4, { acc: -1 })), 'As');
  assert.equal(noteName(n('d1', 4, { acc: -1 })), 'Des');
  assert.equal(noteName(n('h1', 4, { acc: 0 })), 'H');
});

test('nearestPitch: Oktave am nächsten am vorigen Ton', () => {
  assert.equal(nearestPitch(0, null), 'c1');
  assert.equal(nearestPitch(4, 'f1'), 'g1'); // eine Stufe hoch
  assert.equal(nearestPitch(0, 'a1'), 'c2'); // Terz hoch statt Sexte runter
  assert.equal(nearestPitch(4, 'c1'), 'g0'); // Quarte runter statt Quinte hoch
  assert.equal(nearestPitch(6, 'c0'), 'h0'); // am unteren Rand bleibt es im Tonvorrat
});

test('shiftOct: bleibt im Tonvorrat', () => {
  assert.equal(shiftOct('c1', 1), 'c2');
  assert.equal(shiftOct('c1', -1), 'c0');
  assert.equal(shiftOct('c0', -1), 'c0');
  assert.equal(shiftOct('h3', 1), 'h3');
});

test('barsAfter: von Hand, automatisch, Schlussstrich bleibt', () => {
  assert.equal(measureTicks('4/4'), 32);
  assert.equal(measureTicks('6/8'), 24);
  assert.equal(measureTicks('2/2'), 32);
  const song = { meter: '3/4', ev: [n('c1', 2), n('d1'), n('e1', 4, { bar: 1 }), n('f1', 2, { bar: 2 })] };
  assert.deepEqual(barsAfter(song, false), [0, 0, 1, 2]);
  assert.deepEqual(barsAfter(song, true), [0, 1, 0, 2]);
  // Geht der letzte Takt genau auf, steht der Strich auch dahinter
  assert.deepEqual(barsAfter({ meter: '2/4', ev: [n('c1'), n('d1'), r(2)] }, true), [0, 1, 1]);
  // Ohne Taktart keine automatischen Striche
  assert.deepEqual(barsAfter({ meter: '', ev: [n('c1', 1)] }, true), [0]);
});

test('cleanSong: prüft und säubert', () => {
  assert.equal(cleanSong(null), null);
  assert.equal(cleanSong({ ev: 'x' }), null);
  const s = cleanSong({ meter: '5/4', ev: [
    n('c1', 4, { acc: 1, dot: 1, bar: 7, brk: true, extra: 1 }), r(16, { dot: 1, acc: 1 }), n('x9'), { v: 3 }, null, n('a0', 1)
  ] });
  assert.equal(s.meter, '');
  assert.deepEqual(s.ev, [
    { p: 'c1', v: 4, dot: 1, acc: 1, bar: 1, brk: 1 },
    { v: 16 },
    { p: 'a0', v: 1 }
  ]);
  assert.deepEqual(cleanSong({ meter: '6/8', ev: [] }), { meter: '6/8', pickup: 0, ev: [] });
  // Auftakt nur, wenn er kürzer als ein Takt ist; Haltebogen nur an Noten
  assert.equal(cleanSong({ meter: '3/4', pickup: 8, ev: [] }).pickup, 8);
  assert.equal(cleanSong({ meter: '3/4', pickup: 24, ev: [] }).pickup, 0);
  assert.equal(cleanSong({ meter: '', pickup: 8, ev: [] }).pickup, 0);
  assert.deepEqual(cleanSong({ ev: [n('c1', 4, { tie: 1 }), r(4, { tie: 1 })] }).ev, [{ p: 'c1', v: 4, tie: 1 }, { v: 4 }]);
  assert.deepEqual(parsePitch('h3'), { step: 6, oct: 3 });
  assert.equal(parsePitch('c4'), null);
});

test('Auftakt: Taktraster und automatische Taktstriche zählen nach dem Auftakt', () => {
  assert.deepEqual(pickupsFor('4/4'), [4, 8, 12, 16, 24]);
  assert.deepEqual(pickupsFor('2/4'), [4, 8, 12]);
  assert.deepEqual(pickupsFor(''), []);
  const s = { meter: '4/4', pickup: 8, ev: [n('g0'), n('c1'), n('c1'), n('d1'), n('e1'), n('f1')] };
  assert.equal(gridOffset(s), 24);
  assert.deepEqual(gridStarts(s), [24, 32, 40, 48, 56, 64]);
  assert.deepEqual(barsAfter(s, true), [1, 0, 0, 0, 1, 0]);
  assert.equal(gridOffset({ ...s, meter: '' }), 0);
});

test('stepPitch: stufenweise, begrenzt auf den Tonvorrat', () => {
  assert.equal(stepPitch('c1', 1), 'd1');
  assert.equal(stepPitch('h1', 1), 'c2');
  assert.equal(stepPitch('c1', -1), 'h0');
  assert.equal(stepPitch('e1', 7), 'e2');
  assert.equal(stepPitch('d0', -5), 'c0');
  assert.equal(stepPitch('a3', 9), 'h3');
});
