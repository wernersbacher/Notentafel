import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Einfacher localStorage-Ersatz; muss stehen, bevor storage.js geladen wird
const store = new Map();
// Schlüssel, deren Schreiben gerade scheitern soll (Speicher voll oder gesperrt)
let failKey = null;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { if (k === failKey) throw new Error('voll'); store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
  clear: () => store.clear()
};
const S = await import('../js/tafel/storage.js');
const { setWriteError } = await import('../js/core/store.js');

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

test('deleteSong entfernt ein Lied (über seine id)', () => {
  S.saveSong('mel', [tune('C')], 'Lied');
  S.saveSong('mel', [tune('D')], 'Bleibt');
  S.deleteSong('mel', S.loadSongs('mel').find((s) => s.name === 'Lied').id);
  assert.deepEqual(S.loadSongs('mel').map((s) => s.name), ['Bleibt']);
});

test('jedes Lied hat eine id; Ersetzen unter gleichem Namen behält sie', () => {
  S.saveSong('mel', [tune('C')], 'Lied');
  S.saveSong('mel', [tune('D')], 'Anderes');
  const [a, b] = S.loadSongs('mel');
  assert.match(a.id, /^[0-9a-z]{17}$/);
  assert.notEqual(a.id, b.id);
  const id = S.loadSongs('mel').find((s) => s.name === 'Lied').id;
  S.saveSong('mel', [tune('E')], 'LIED');
  assert.equal(S.loadSongs('mel').find((s) => s.name === 'LIED').id, id);
});

test('renameSong: neuer Name, id, Inhalt und Datum bleiben; belegter Name geht nicht', () => {
  S.saveSong('mel', [tune('C')], 'Lied');
  S.saveSong('mel', [tune('D')], 'Anderes');
  const before = S.loadSongs('mel').find((s) => s.name === 'Lied');
  assert.equal(S.renameSong('mel', before.id, 'anderes'), 'taken');
  assert.equal(S.renameSong('mel', before.id, 'LIED'), 'ok'); // nur Groß/klein geändert: erlaubt
  assert.equal(S.renameSong('mel', before.id, 'Neu'), 'ok');
  const after = S.loadSongs('mel').find((s) => s.id === before.id);
  assert.equal(after.name, 'Neu');
  assert.equal(after.savedAt, before.savedAt);
  assert.deepEqual(after.rows, before.rows);
  assert.equal(S.renameSong('mel', 'gibtesnicht0', 'X'), 'error');
});

test('Lieder von vor den ids bekommen beim ersten Lesen eine, die dann bleibt', () => {
  store.set('notentafel.songs.v1', JSON.stringify([{ name: 'Alt', savedAt: 5, rows: [[{ n: 'C' }]] }, { name: 'Älter', savedAt: 2, rows: [[{ n: 'D' }]] }]));
  const ids = S.loadSongs('mel').map((s) => s.id);
  assert.ok(ids.every((id) => /^[0-9a-z]{17}$/.test(id)));
  assert.ok(ids[1] < ids[0]); // das ältere sortiert vorn
  assert.deepEqual(S.loadSongs('mel').map((s) => s.id), ids);
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

test('Verdecken: Tuch an der Zeile, eingeklappte Zeilen und ?-Karten bleiben beim Speichern erhalten', () => {
  const rows = [tune('C', 'D'), tune('E'), tune('F')];
  rows[0][1].q = 1; rows[1][0].q = 2;
  rows[1].coverFrom = true; rows[2].cover = true; rows[0].fold = true;
  S.saveSong('mel', rows, 'Lied');
  const [s] = S.loadSongs('mel');
  assert.deepEqual(s.rows, rows);
  assert.equal(s.rows[0].cover, undefined);
  assert.equal(s.rows[2].cover, true);
  assert.equal(s.rows[1].coverFrom, true);
  assert.equal(s.rows[0].fold, true);
});

test('merge: Schreibfehler meldet failed, die gespeicherte Liste bleibt unverändert', () => {
  S.saveSong('mel', [tune('C')], 'Lied');
  const key = 'notentafel.songs.v1', before = store.get(key);
  const remote = [{ id: 'a00000001', name: 'Vom Server', format: 'tafel.1', savedAt: 9, changedAt: 9, data: { rows: [[{ n: 'D', h: '' }]], lines: [], name: 'Vom Server', savedAt: 9 } }];
  failKey = key;
  try {
    assert.deepEqual(S.stores.mel.merge(remote), { merged: false, touched: [], failed: true });
  } finally { failKey = null; }
  assert.equal(store.get(key), before);
  assert.deepEqual(S.loadSongs('mel').map((s) => s.name), ['Lied']);
  // Nichts zu ändern ist kein Fehler
  assert.deepEqual(S.stores.mel.merge([]), { merged: false, touched: [], failed: false });
});

test('setWriteError: wird bei fehlgeschlagenem Speichern aufgerufen, ein werfender Listener bricht nichts', () => {
  const seen = [];
  setWriteError((e) => { seen.push(e); });
  failKey = 'notentafel.songs.v1';
  try {
    assert.equal(S.saveSong('mel', [tune('C')], 'Lied'), false);
  } finally { failKey = null; }
  assert.equal(seen.length, 1);

  setWriteError(() => { throw new Error('kaputt'); });
  failKey = 'notentafel.songs.v1';
  try {
    assert.equal(S.saveSong('mel', [tune('C')], 'Lied'), false); // der Wurf kommt nicht an
  } finally { failKey = null; setWriteError(() => {}); }
});
