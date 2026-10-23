import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fakeStorage, song, n } from './helpers.mjs';

// Wie Konto-Export und App zusammenpassen: pb_hooks/export.js (CommonJS, wie der Server es lädt) baut die Datei,
// importAll aus store.js spielt sie ein. Muss stehen, bevor store.js geladen wird.
globalThis.localStorage = fakeStorage();
const T = await import('../app/js/tafel/storage.js');
const L = await import('../app/js/lied/storage.js');
const { exportAll, importAll } = await import('../app/js/core/store.js');
const require = createRequire(import.meta.url);
const { buildExport, exportName, BACKUP } = require('../pb_hooks/export.js');

const NOW = new Date('2026-10-23T10:00:00.000Z');
const ACCOUNT = { id: 'u1', email: 'a@b.de', name: 'Anna', created: '2026-01-01 10:00:00.000Z', verified: true, pro_until: null };
const tune = (...ids) => { const r = ids.map((x) => ({ n: x, h: '' })); r.line = false; r.meter = ''; return r; };
// Datensatz wie der Server ihn aus der Datenbank liest
const rec = (area, format, id, name, savedAt, extra = {}) =>
  ({ area, format, id, name, savedAt, changedAt: savedAt, deleted: false, data: { rows: [[{ n: name }]] }, ...extra });
const ID = (k) => 'a'.repeat(9 - String(k).length) + k;

test('Aufbau: Sicherungsformat der App, Konto, Bereiche mit Format, neueste zuerst', () => {
  const f = buildExport(ACCOUNT, [
    rec('mel', 'tafel.1', ID(1), 'Alt', 100), rec('mel', 'tafel.1', ID(2), 'Neu', 300),
    rec('lied', 'lied.1', ID(3), 'Lied', 200)
  ], NOW);
  assert.equal(f.kind, BACKUP);
  assert.equal(f.version, 1);
  assert.equal(f.exportedAt, '2026-10-23T10:00:00.000Z');
  assert.deepEqual(f.account, ACCOUNT);
  assert.deepEqual(Object.keys(f.areas).sort(), ['lied', 'mel']);
  assert.equal(f.areas.mel.format, 'tafel.1');
  assert.deepEqual(f.areas.mel.songs.map((s) => s.name), ['Neu', 'Alt']);
  // Lied wie auf dem Gerät: Inhalt plus id, name, savedAt, changedAt
  assert.deepEqual(f.areas.lied.songs, [{ rows: [[{ n: 'Lied' }]], id: ID(3), name: 'Lied', savedAt: 200, changedAt: 200 }]);
  assert.deepEqual(f.trash, []);
  assert.equal(f.other, undefined);
});

test('Papierkorb steht getrennt, mit Inhalt, und nicht unter areas', () => {
  const f = buildExport(ACCOUNT, [
    rec('mel', 'tafel.1', ID(1), 'Da', 100),
    rec('mel', 'tafel.1', ID(2), 'Weg', 150, { deleted: true, changedAt: 400 }),
    rec('rhy', 'tafel.1', ID(3), 'Auch weg', 160, { deleted: true, changedAt: 500 })
  ], NOW);
  assert.deepEqual(f.areas.mel.songs.map((s) => s.name), ['Da']);
  assert.equal(f.areas.rhy, undefined);
  assert.deepEqual(f.trash.map((s) => s.name), ['Auch weg', 'Weg']);
  assert.deepEqual(f.trash[1], { area: 'mel', format: 'tafel.1', id: ID(2), name: 'Weg', savedAt: 150, deletedAt: 400, data: { rows: [[{ n: 'Weg' }]] } });
});

test('Lieder in einem anderen Format landen in other, nicht im Bereich', () => {
  const f = buildExport(ACCOUNT, [
    rec('mel', 'tafel.2', ID(1), 'Neues Format', 300), rec('mel', 'tafel.1', ID(2), 'Altes Format', 100), rec('mel', '', ID(3), 'Ohne', 50)
  ], NOW);
  assert.equal(f.areas.mel.format, 'tafel.2');
  assert.deepEqual(f.areas.mel.songs.map((s) => s.name), ['Neues Format', 'Ohne']);
  assert.deepEqual(f.other.map((s) => [s.name, s.format, s.area]), [['Altes Format', 'tafel.1', 'mel']]);
});

test('leeres Konto: nur Profil, keine Bereiche, leerer Papierkorb', () => {
  const f = buildExport(ACCOUNT, [], NOW);
  assert.deepEqual(f.areas, {});
  assert.deepEqual(f.trash, []);
  assert.deepEqual(f.account, ACCOUNT);
  assert.equal(importAll(JSON.parse(JSON.stringify(f))), 0);
});

test('Dateiname mit Datum', () => {
  assert.equal(exportName(NOW), 'musiktafel-konto-2026-10-23.json');
});

/* ---------- Rundlauf: Server-Datei in die App einspielen ---------- */
// Die Lieder dieses Geräts als Datensätze des Servers
function asServer(extraTrash = []) {
  const out = [];
  for (const area in exportAll().areas) {
    const { format, songs } = exportAll().areas[area];
    for (const { id, name, savedAt, changedAt, ...data } of songs) out.push({ area, format, id, name, savedAt, changedAt, deleted: false, data });
  }
  return out.concat(extraTrash);
}
const names = (store) => store.loadSongs().map((s) => s.name).sort();

test('Rundlauf: importAll legt die Lieder in den richtigen Bereich, ohne Doppel, ohne Papierkorb', () => {
  // Gerät A hat Lieder, aus denen der Server die Datei baut
  globalThis.localStorage = fakeStorage();
  T.stores.mel.saveSong([tune('C', 'D')], 'Melodie');
  T.stores.rhy.saveSong([tune('x')], 'Rhythmus');
  L.store.saveSong(song([n('c1'), n('d1')]), 'Ein Lied');
  const trashed = { area: 'mel', format: 'tafel.1', id: ID(9), name: 'Gelöscht', savedAt: 5, changedAt: 6, deleted: true, data: { rows: [] } };
  const file = JSON.parse(JSON.stringify(buildExport(ACCOUNT, asServer([trashed]), NOW)));
  assert.equal(file.trash.length, 1);

  // Gerät B ist leer
  globalThis.localStorage = fakeStorage();
  assert.equal(importAll(file), 3);
  assert.deepEqual(names(T.stores.mel), ['Melodie']);
  assert.deepEqual(names(T.stores.rhy), ['Rhythmus']);
  assert.deepEqual(names(L.store), ['Ein Lied']);
  assert.equal(L.store.loadSongs()[0].song.ev.length, 2);
  // Erneut einspielen: nichts Neues, keine Doppel
  assert.equal(importAll(file), 0);
  assert.deepEqual(names(T.stores.mel), ['Melodie']);
  assert.deepEqual(names(L.store), ['Ein Lied']);
  // Was im Papierkorb lag, kommt nicht zurück
  assert.ok(!T.stores.mel.songIds().includes(ID(9)));
});
