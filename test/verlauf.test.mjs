import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pushState, popState } from '../app/js/core/history.js';
import { makeUndo } from '../app/js/core/undo.js';
import { byGroup } from '../app/js/core/groups.js';

test('Verlauf: zuletzt gemerkter Stand kommt zuerst zurück, ein leerer Verlauf liefert null', () => {
  const h = [];
  pushState(h, { a: 1 });
  pushState(h, { a: 2 });
  assert.deepEqual(popState(h), { a: 2 });
  assert.deepEqual(popState(h), { a: 1 });
  assert.equal(popState(h), null);
});

test('Verlauf: der Stand wird als Kopie gemerkt, spätere Änderungen am Original verändern ihn nicht', () => {
  const h = [], s = { rows: [1] };
  pushState(h, s);
  s.rows.push(2);
  assert.deepEqual(popState(h), { rows: [1] });
});

test('Verlauf: nach 60 Schritten fällt der älteste weg', () => {
  const h = [];
  for (let i = 0; i < 70; i++) pushState(h, i);
  assert.equal(h.length, 60);
  assert.equal(popState(h), 69);
  while (h.length > 1) popState(h);
  assert.equal(popState(h), 10);
});

test('Rückgängig: snap merkt den Stand vor der Änderung, restore setzt ihn um; ohne Verlauf false', () => {
  const state = { hist: [], v: 1 };
  const u = makeUndo({ state, snapshot: () => ({ v: state.v }), apply: (d) => { state.v = d.v; } });
  assert.equal(u.restore(), false);
  u.snap(); state.v = 2;
  u.snap(); state.v = 3;
  assert.equal(u.restore(), true);
  assert.equal(state.v, 2);
  assert.equal(u.restore(), true);
  assert.equal(state.v, 1);
  assert.equal(u.restore(), false);
  assert.equal(state.v, 1);
});

test('Wiederholen: redo stellt zurückgenommene Schritte wieder her, ein neuer Schritt verwirft sie', () => {
  const state = { hist: [], redo: [], v: 1 };
  const u = makeUndo({ state, snapshot: () => ({ v: state.v }), apply: (d) => { state.v = d.v; } });
  assert.equal(u.redo(), false);
  u.snap(); state.v = 2;
  u.snap(); state.v = 3;
  u.restore(); u.restore();
  assert.equal(state.v, 1);
  assert.equal(u.redo(), true);
  assert.equal(state.v, 2);
  assert.equal(u.redo(), true);
  assert.equal(state.v, 3);
  assert.equal(u.redo(), false);
  u.restore();
  assert.equal(state.v, 2);
  u.snap(); state.v = 9; // neuer Schritt
  assert.equal(state.redo.length, 0);
  assert.equal(u.redo(), false);
  assert.equal(u.restore(), true);
  assert.equal(state.v, 2);
});

test('Gruppen: Lieder stehen in der Reihenfolge der Gruppen, innerhalb einer Gruppe stabil', () => {
  const list = [
    { id: 'w1', group: 'Weihnachten' }, { id: 'k1', group: 'Kinderlieder' },
    { id: 'w2', group: 'Weihnachten' }, { id: 'f1', group: 'Frühling' }, { id: 'k2', group: 'Kinderlieder' }
  ];
  assert.deepEqual(byGroup(list).map((x) => x.id), ['k1', 'k2', 'f1', 'w1', 'w2']);
  assert.equal(list[0].id, 'w1'); // Eingabe bleibt unverändert
});
