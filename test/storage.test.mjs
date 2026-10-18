import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Einfacher localStorage-Ersatz; muss stehen, bevor storage.js geladen wird
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
  clear: () => store.clear()
};
const S = await import('../js/tafel/storage.js');

beforeEach(() => store.clear());

const tune = (...ids) => { const r = ids.map((n) => ({ n, h: '' })); r.line = false; r.meter = ''; return r; };

test('saveSong/loadSongs: Rundreise mit Zeilen-Eigenschaften', () => {
  const rows = [tune('C', 'D'), tune('E')];
  rows[0].meter = '3/4'; rows[1].line = true;
  assert.equal(S.saveSong('mel', rows, 'Lied'), true);
  const [s] = S.loadSongs('mel');
  assert.equal(s.name, 'Lied');
  assert.ok(s.savedAt > 0);
  assert.deepEqual(s.rows, rows);
  assert.equal(s.rows[0].meter, '3/4');
  assert.equal(s.rows[1].line, true);
  assert.deepEqual(S.loadSongs('rhy'), []); // Bereiche sind getrennt
});

test('saveSong: gleicher Name ohne Groß/klein ersetzt', () => {
  S.saveSong('mel', [tune('C')], 'Lied');
  S.saveSong('mel', [tune('G')], 'Anderes');
  S.saveSong('mel', [tune('D')], 'LIED');
  const songs = S.loadSongs('mel');
  assert.deepEqual(songs.map((s) => s.name).sort(), ['Anderes', 'LIED']);
  assert.equal(songs.find((s) => s.name === 'LIED').rows[0][0].n, 'D');
  assert.equal(S.songExists('mel', 'lied'), true);
});

test('deleteSong entfernt ein Lied', () => {
  S.saveSong('mel', [tune('C')], 'Lied');
  S.deleteSong('mel', 'Lied');
  assert.deepEqual(S.loadSongs('mel'), []);
});

test('saveBoard/loadBoard und Autosave', () => {
  S.saveBoard('rhy', [tune('C')], 'Tafel');
  assert.equal(S.loadBoard('rhy').name, 'Tafel');
  assert.equal(S.loadBoard('mel'), null);
  S.saveAuto('mel', [tune('E')], 'Alt');
  assert.equal(S.loadAuto('mel').rows[0][0].n, 'E');
});

test('defekte Daten ergeben leere Liste bzw. nichts', () => {
  store.set('notentafel.songs.v1', '{kaputt');
  assert.deepEqual(S.loadSongs('mel'), []);
  store.set('notentafel.songs.v1', '{"a":1}');
  assert.deepEqual(S.loadSongs('mel'), []);
  store.set('notentafel.songs.v1', JSON.stringify([null, { name: 'x', rows: 'nein' }, { name: 'ok', rows: [[{ n: 'C' }]] }]));
  assert.deepEqual(S.loadSongs('mel').map((s) => s.name), ['ok']);
  store.set('notentafel.v1', 'nicht json');
  assert.equal(S.loadBoard('mel'), null);
});

test('Verdecken: Tuch an der Zeile und ?-Karten bleiben beim Speichern erhalten', () => {
  const rows = [tune('C', 'D'), tune('E'), tune('F')];
  rows[0][1].q = 1; rows[1][0].q = 2;
  rows[1].coverFrom = true; rows[2].cover = true;
  S.saveSong('mel', rows, 'Lied');
  const [s] = S.loadSongs('mel');
  assert.deepEqual(s.rows, rows);
  assert.equal(s.rows[0].cover, undefined);
  assert.equal(s.rows[2].cover, true);
  assert.equal(s.rows[1].coverFrom, true);
});
