import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countsOf, tiedFrom, playPlan } from '../app/js/lied/model.js';
import { layout } from '../app/js/lied/layout.js';
import { n, r } from './helpers.mjs';
// Zählzeiten kurz: gehaltene in Klammern
const show = (zz) => zz.map((cs) => cs.map((c) => (c.held ? '(' + c.t + ')' : c.t)).join(' '));

test('Zählzeiten: 4/4 mit Halben, Achteln und Pausen', () => {
  const s = { meter: '4/4', pickup: 0, ev: [n('c1', 2), n('d1', 8), n('e1', 8), r(4), n('f1', 1)] };
  assert.deepEqual(show(countsOf(s)), ['1 (2)', '3', '+', '4', '1 (2) (3) (4)']);
});

test('Zählzeiten: 6/8 in Achteln, 2/2 in Halben, ohne Taktart keine', () => {
  assert.deepEqual(show(countsOf({ meter: '6/8', ev: [n('c1', 4, { dot: 1 }), n('d1', 8), n('e1', 4)] })), ['1 (2) (3)', '4', '5 (6)']);
  assert.deepEqual(show(countsOf({ meter: '2/2', ev: [n('c1'), n('d1'), n('e1', 2)] })), ['1', '+', '2']);
  assert.deepEqual(countsOf({ meter: '', ev: [n('c1')] }), [[]]);
});

test('Zählzeiten: Auftakt bekommt die letzten Zählzeiten des Takts', () => {
  const s = { meter: '3/4', pickup: 8, ev: [n('g0'), n('c1', 2), n('e1')] };
  assert.deepEqual(show(countsOf(s)), ['3', '1 (2)', '3']);
  const e = { meter: '4/4', pickup: 4, ev: [n('g0', 8), n('c1')] };
  assert.deepEqual(show(countsOf(e)), ['+', '1']);
});

test('Haltebogen: nur zwischen gleichen Tönen samt Vorzeichen; die zweite Note zählt blass', () => {
  assert.equal(tiedFrom(n('c1', 4, { tie: 1 }), n('c1')), true);
  assert.equal(tiedFrom(n('c1', 4, { tie: 1 }), n('d1')), false);
  assert.equal(tiedFrom(n('f1', 4, { tie: 1, acc: 1 }), n('f1')), false);
  assert.equal(tiedFrom(n('f1', 4, { tie: 1, acc: 1 }), n('f1', 4, { acc: 1 })), true);
  assert.equal(tiedFrom(n('c1'), n('c1')), false);
  const s = { meter: '4/4', ev: [n('c1', 2, { tie: 1 }), n('c1', 2)] };
  assert.deepEqual(show(countsOf(s)), ['1 (2)', '(3) (4)']);
});

test('Layout: Zählzeiten stehen unter dem Kopf bzw. an ihrer Stelle danach', () => {
  const { at } = layout({ meter: '4/4', ev: [n('c1', 2), n('d1', 2)] }, { counts: true });
  const [one, two] = at[0].counts;
  assert.equal(one.x, at[0].x);
  assert.ok(two.held && two.x > at[0].x && two.x < at[1].x);
  assert.equal(layout({ meter: '4/4', ev: [n('c1')] }).at[0].counts, undefined);
});

test('Layout: Haltebögen in einer Zeile und über den Umbruch', () => {
  const { systems, at } = layout({ meter: '4/4', ev: [n('g1', 4, { tie: 1 }), n('g1', 4, { tie: 1, brk: 1 }), n('g1', 4)] });
  const [a, b] = systems[0].ties;
  assert.deepEqual(a, { x1: at[0].x + 0.5, x2: at[1].x - 0.5, pos: 2, down: true });
  assert.equal(b.x2, null); // bis zum Zeilenende
  assert.equal(systems[1].ties.length, 1); // Fortsetzung vor der Note
  assert.equal(systems[1].ties[0].x2, at[2].x - 0.5);
  // Hälse nach unten: Bogen oben
  assert.equal(layout({ meter: '', ev: [n('d2', 4, { tie: 1 }), n('d2')] }).systems[0].ties[0].down, false);
});

test('Abspielen: Haltebogen verlängert den Ton, Pausen am Ende fallen weg', () => {
  const p = playPlan({ meter: '4/4', ev: [n('c1', 4, { tie: 1 }), n('c1', 8, { tie: 1 }), n('c1', 8), r(4), n('d1', 2, { tie: 1 }), n('e1'), r(2)] });
  assert.deepEqual(p.items.map((s) => [s.t, s.len, s.sound]), [
    [0, 2, 'piano'], [1, 0.5, ''], [1.5, 0.5, ''], [2, 1, ''], [3, 2, 'piano'], [5, 1, 'piano']
  ]);
  assert.equal(p.end, 6);
});
