import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeStorage } from './helpers.mjs';

globalThis.localStorage = fakeStorage();
const { S } = await import('../app/js/tafel/state.js');
const { unitCount, colFrs, midOf, geoFrac, spanOf } = await import('../app/js/tafel/board-math.js');

const row = (...cells) => { cells.line = false; cells.meter = ''; return cells; };
const beat = () => ({ n: 'C', h: '' });

test('Tafelmaß Rhythmus: immer cap Schläge, nur bei längerer Zeile mehr, auf ganze Schläge aufgerundet', () => {
  S.variant = 'rhy'; S.cap = 4;
  S.rows = [row(beat())];
  assert.equal(unitCount(), 16);
  S.rows = [row(...Array.from({ length: 6 }, beat))]; // 24 Sechzehntel > 16
  assert.equal(unitCount(), 28);
  assert.equal(unitCount() % 4, 0);
});

test('Tafelmaß Melodie: längste Zeile plus ein freier Schlag, höchstens cap Schläge', () => {
  S.variant = 'mel'; S.cap = 4;
  S.sel = { r: 0, c: 0 };
  S.rows = [row(beat(), beat())];
  assert.equal(unitCount(), 12);
  S.rows = [row(...Array.from({ length: 4 }, beat))];
  assert.equal(unitCount(), 16); // voll: kein weiterer Schlag über cap
});

test('Spaltenbreiten: ganze Schläge sind einen Kreis breit, Achtel verbreitern den Schlag auf zwei', () => {
  S.variant = 'mel';
  const plain = colFrs(8, row(beat(), beat()));
  assert.equal(plain[4] - plain[0], 2);
  assert.equal(plain.length, 9);
  assert.ok(spanOf(beat()) === 4);
  const eighth = colFrs(8, row({ n: 'C', h: '', d: 0.5 }, { n: 'D', h: '', d: 0.5 }));
  assert.ok(eighth[4] - eighth[0] > 2);
});

test('Tafelmaß: Mitte und Anteil innerhalb eines Platzes', () => {
  const geo = { u0: 0, k: 4, P: [0, 0.5, 1, 1.5, 2] };
  assert.equal(midOf(geo), 1);
  assert.equal(geoFrac(geo, 2), 0.5);
  assert.equal(geoFrac(geo, 0), 0);
});
