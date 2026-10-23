import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Die Server-Regeln liegen als CommonJS in pb_hooks/, weil PocketBase sie per require lädt; die Tests nehmen dieselben
// Funktionen, statt sie nachzubauen.
const require = createRequire(import.meta.url);
const { AREAS, MAX_DATA, MAX_CHANGES, refusal, planSync } = require('../pb_hooks/sync.js');
const { DAYS, MAX_TRASH, tooOld, overCap } = require('../pb_hooks/trash.js');
const { TIERS, BETA_END, newUserProUntil } = require('../pb_hooks/tiers.js');

const NOW = 1000000;
// Vorhandenes Lied im Konto, wie es sync.js braucht
const song = (id, changedAt, deleted = false) => ({ id, changedAt, deleted });
// Gültige Änderung vom Gerät; extra überschreibt einzelne Felder
const change = (extra = {}) => ({ area: 'mel', id: 'a00000001', changedAt: 10, savedAt: 10, format: 'tafel.1', name: 'Lied', data: { rows: [] }, ...extra });
// n Lieder mit fortlaufenden ids (nur für die Platzrechnung, die ids selbst sind hier egal)
const many = (n, deleted = false) => Array.from({ length: n }, (_, i) => song('s' + i, 1, deleted));

test('die Grenzen des Abgleichs stehen an einer Stelle', () => {
  assert.deepEqual(AREAS, ['mel', 'rhy', 'lied']);
  assert.equal(MAX_DATA, 200000);
  assert.equal(MAX_CHANGES, 500);
});

test('refusal: gültig ist null, jeder fehlende oder falsche Teil bekommt seinen Grund', () => {
  assert.equal(refusal(change()), null);
  // gelöscht braucht nur area, id, changedAt: Name und Inhalt bleiben im Papierkorb stehen
  assert.equal(refusal({ area: 'mel', id: 'a00000001', changedAt: 10, deleted: true }), null);
  assert.equal(refusal(null), 'area');
  assert.equal(refusal({ ...change(), area: 'x' }), 'area');
  assert.equal(refusal({ ...change(), id: 'kurz' }), 'id');
  assert.equal(refusal({ ...change(), id: 42 }), 'id');
  assert.equal(refusal({ ...change(), changedAt: 1.5 }), 'changedAt');
  assert.equal(refusal({ ...change(), name: '  ' }), 'name');
  assert.equal(refusal({ ...change(), name: 'x'.repeat(41) }), 'name');
  assert.equal(refusal({ ...change(), savedAt: '10' }), 'savedAt');
  assert.equal(refusal({ ...change(), format: 'x'.repeat(21) }), 'format');
  assert.equal(refusal({ ...change(), data: null }), 'data');
  assert.equal(refusal({ ...change(), data: { text: 'x'.repeat(MAX_DATA) } }), 'size');
  // genau an der Spaltengrenze geht noch durch
  assert.equal(refusal({ ...change(), data: { text: 'x'.repeat(MAX_DATA - 11) } }), null);
});

test('planSync: auf dem Server liegt schon ein neuerer Stand, dann wird nichts geschrieben', () => {
  const songs = [song('a00000001', 10)];
  assert.deepEqual(planSync(songs, [change({ changedAt: 9 })], NOW, 50).writes, []);
  assert.deepEqual(planSync(songs, [change({ changedAt: 10 })], NOW, 50).writes, []);
  const [w] = planSync(songs, [change({ changedAt: 11, name: 'Neu' })], NOW, 50).writes;
  assert.equal(w.name, 'Neu');
});

test('planSync: gelöscht, aber nie angekommen, wird übergangen statt im Papierkorb zu landen', () => {
  assert.deepEqual(planSync([], [change({ id: 'b00000001', deleted: true })], NOW, 50), { writes: [], rejected: [], refused: [] });
});

test('planSync: Uhr aus der Zukunft wird auf die Serverzeit gekappt (changedAt und savedAt)', () => {
  const nowMs = 5000;
  const [w] = planSync([], [change({ changedAt: nowMs + 1000, savedAt: nowMs + 2000 })], nowMs, null).writes;
  assert.equal(w.changedAt, nowMs);
  assert.equal(w.savedAt, nowMs);
});

test('planSync: die Schreibvorgänge sind schon normalisiert und sagen, ob sie Platz belegen', () => {
  assert.deepEqual(planSync([], [change({ changedAt: 7 })], NOW, null).writes, [
    { id: 'a00000001', area: 'mel', changedAt: 7, deleted: false, adds: true, frees: false, format: 'tafel.1', name: 'Lied', savedAt: 10, data: { rows: [] } }
  ]);
});

test('planSync: ein neues Lied zählt nur, wenn noch Platz ist, sonst rejected; limit null heißt beliebig viele', () => {
  const plan = planSync(many(50), [change()], NOW, 50);
  assert.deepEqual(plan.rejected, ['a00000001']);
  assert.deepEqual(plan.writes, []);
  assert.equal(planSync(many(50), [change()], NOW, null).writes.length, 1);
});

test('planSync: Löschen gibt sofort Platz frei – die Reihenfolge der Änderungen zählt', () => {
  const del = change({ id: 'b00000001', changedAt: 10, deleted: true });
  const songs = [...many(49), song('b00000001', 1)];
  const add = change({ id: 'n00000001' });
  // erst das neue Lied: kein Platz, es bleibt rejected; das spätere Löschen geht trotzdem durch
  const erst = planSync(songs, [add, del], NOW, 50);
  assert.deepEqual(erst.rejected, ['n00000001']);
  assert.deepEqual(erst.writes.map((w) => w.id), ['b00000001']);
  assert.deepEqual(erst.writes.map((w) => [w.adds, w.frees]), [[false, true]]);
  // erst das Löschen: danach ist Platz für das neue
  const später = planSync(songs, [del, add], NOW, 50);
  assert.deepEqual(später.rejected, []);
  assert.deepEqual(später.writes.map((w) => w.id), ['b00000001', 'n00000001']);
});

test('planSync: ein Lied aus dem Papierkorb zu holen braucht Platz wie ein neues', () => {
  const wieder = change({ id: 'b00000001', changedAt: 10 });
  assert.equal(planSync([...many(49), song('b00000001', 5, true)], [wieder], NOW, 50).writes.length, 1);
  assert.deepEqual(planSync([...many(50), song('b00000001', 5, true)], [wieder], NOW, 50).rejected, ['b00000001']);
  // ein bereits gelöschtes Lied noch einmal zu löschen belegt und befreit nichts
  const [w] = planSync([song('b00000001', 1, true)], [change({ id: 'b00000001', changedAt: 10, deleted: true })], NOW, 50).writes;
  assert.deepEqual([w.adds, w.frees], [false, false]);
});

test('planSync: mehrere Änderungen einer Anfrage – je id gewinnt der spätere, eine ungültige hält den Rest nicht auf', () => {
  const plan = planSync([], [
    change({ changedAt: 5 }),
    change({ changedAt: 7, name: 'Neu' }),
    change({ id: 'kurz', changedAt: 8 }),
    change({ id: 'b00000001', changedAt: 9 })
  ], NOW, null);
  assert.deepEqual(plan.writes.map((w) => [w.id, w.changedAt, w.name]), [
    ['a00000001', 5, 'Lied'], ['a00000001', 7, 'Neu'], ['b00000001', 9, 'Lied']
  ]);
  assert.deepEqual(plan.refused, [{ id: 'kurz', reason: 'id' }]);
  // Löschen und danach neu speichern in einer Anfrage: das spätere Speichern belegt wieder Platz
  const hin = planSync([song('a00000001', 1)], [change({ changedAt: 5, deleted: true }), change({ changedAt: 6 })], NOW, 50);
  assert.deepEqual(hin.writes.map((w) => [w.deleted, w.adds, w.frees]), [[true, false, true], [false, true, false]]);
});

test('planSync: refused trägt die id als String, auch wenn sie kein Lied-Schlüssel ist; ohne id nur den Grund', () => {
  assert.deepEqual(planSync([], [{ area: 'x' }], NOW, null).refused, [{ reason: 'area' }]);
  assert.deepEqual(planSync([], [change({ id: 42 })], NOW, null).refused, [{ id: '42', reason: 'id' }]);
});

test('tooOld: älter als 30 Tage kommt weg, genau an der Grenze noch nicht', () => {
  const ms = DAYS * 24 * 3600 * 1000;
  const line = [{ changedAt: NOW - ms - 1 }, { changedAt: NOW - ms }, { changedAt: NOW }];
  assert.deepEqual(tooOld(line, NOW), [line[0]]);
});

test('overCap: bei absteigend nach changedAt sortierter Liste fallen die ältesten über MAX_TRASH weg', () => {
  const list = Array.from({ length: MAX_TRASH + 2 }, (_, i) => ({ id: i, changedAt: NOW - i }));
  assert.deepEqual(overCap(list).map((s) => s.id), [MAX_TRASH, MAX_TRASH + 1]);
  assert.deepEqual(overCap(list.slice(0, MAX_TRASH)), []); // genau voll: nichts fällt weg
  assert.deepEqual(overCap([1, 2, 3], 2), [3]);
});

test('TIERS: Pro hat known, cloud, export und 50 Lieder, Gast und Konto sind Lite ohne Abgleich', () => {
  assert.deepEqual(TIERS.pro.features, ['known', 'cloud', 'export']);
  assert.deepEqual(TIERS.pro.limits, { songs: 50, measures: null, games: null, quizQuestions: null });
  for (const t of ['guest', 'account']) {
    assert.deepEqual(TIERS[t].features, []);
    assert.deepEqual(TIERS[t].limits, { songs: 3, measures: 8, games: 2, quizQuestions: 5 });
  }
  assert.notStrictEqual(TIERS.guest.limits, TIERS.account.limits);
});

test('newUserProUntil: vor dem Beta-Ende gilt das Beta-Ende, danach eine Woche zum Ausprobieren', () => {
  assert.equal(newUserProUntil(new Date('2027-06-01T00:00:00Z')), BETA_END);
  assert.equal(newUserProUntil(new Date('2027-06-25T00:00:00Z')), '2027-07-02 00:00:00.000Z');
});
