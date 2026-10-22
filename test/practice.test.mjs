import { test } from 'node:test';
import assert from 'node:assert/strict';

// Die beiden Bereiche nutzen dieselben core-Bausteine (practice.js, undo.js) – hier einmal für beide geprüft.
// localStorage-Ersatz; muss stehen, bevor die Zustände (über settings.js und storage.js) geladen werden
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const lied = await import('../js/lied/state.js');
const tafel = await import('../js/tafel/state.js');

// Lied mit einer Viertelnote
const song = (p = 'c1') => ({ meter: '4/4', pickup: 0, key: 0, ev: [{ p, v: 4 }] });
// Zeile mit den Eigenschaften line/meter, wie sie die Tafel am Array trägt
const row = (...cells) => { cells.line = false; cells.meter = ''; return cells; };

test('Lied: Üben und Spielen über die gemeinsame Fabrik', () => {
  const { L } = lied;
  L.song = song();
  L.name = 'Testlied';
  L.sel = 1;
  L.hist = [];
  L.insertMode = true;
  L.last = { p: 'c1', v: 4 };
  const writtenSong = L.song;

  lied.startPractice();
  assert.ok(L.written); // das geschriebene Lied wartet
  assert.equal(L.written.song, writtenSong);
  assert.equal(L.written.name, 'Testlied');
  assert.equal(L.song.ev.length, 0); // leere Übungstafel
  assert.equal(L.name, '');
  assert.equal(L.sel, 0);
  assert.equal(L.hist.length, 0);
  assert.equal(L.insertMode, false); // beim Üben zurückgesetzt
  assert.equal(L.last, null);

  // Ein zweites startPractice lässt die laufende Übung stehen
  const practice = L.song;
  L.insertMode = true;
  lied.startPractice();
  assert.equal(L.song, practice);
  assert.equal(L.insertMode, true);

  // Eine Kopie des geschriebenen Lieds auf die Übungstafel; written bleibt erhalten
  L.song = song('d1');
  L.name = 'Übung';
  assert.equal(lied.practiceWritten(), true);
  assert.notEqual(L.song, writtenSong);
  assert.deepEqual(L.song.ev, [{ p: 'c1', v: 4 }]);
  assert.equal(L.sel, 0);
  assert.equal(L.last, null);
  assert.equal(L.written.song, writtenSong);

  // Leeren lässt den Namen stehen
  L.name = 'Übung';
  lied.resetPractice();
  assert.equal(L.name, 'Übung');
  assert.equal(L.song.ev.length, 0);

  // Beenden holt das geschriebene Lied zurück
  lied.endPractice();
  assert.equal(L.written, null);
  assert.equal(L.song, writtenSong);
  assert.equal(L.name, 'Testlied');
  assert.equal(L.sel, 1);
  assert.equal(L.last, null);
  assert.equal(L.insertMode, false);
});

test('Tafel: Üben und Spielen über die gemeinsame Fabrik', () => {
  const { S } = tafel;
  S.variant = 'mel';
  const writtenRows = [row({ n: 'C', h: '' })];
  S.rows = writtenRows;
  S.name = 'Melodie';
  S.sel = { r: 0, c: 1 };
  S.hist = [];
  S.insertMode = true;
  S.countAt = { r: 0, c: 0 };

  tafel.startPractice();
  assert.ok(S.written);
  assert.equal(S.written.rows, writtenRows);
  assert.equal(S.written.name, 'Melodie');
  assert.notEqual(S.rows, writtenRows);
  assert.equal(S.name, '');
  assert.deepEqual(S.sel, { r: 0, c: 0 });
  assert.equal(S.hist.length, 0);
  assert.equal(S.insertMode, false); // beim Üben zurückgesetzt
  assert.equal(S.countAt, null);

  // Eine Kopie der geschriebenen Tafel auf die Übungstafel; written bleibt erhalten
  S.rows = [row({ n: 'E', h: '' })];
  S.name = 'Übung';
  assert.equal(tafel.practiceWritten(), true);
  assert.notEqual(S.rows, writtenRows);
  assert.deepEqual([...S.rows[0]], [{ n: 'C', h: '' }]);
  assert.deepEqual(S.sel, { r: 0, c: 0 });
  assert.equal(S.written.rows, writtenRows);

  // Leeren lässt den Namen stehen
  tafel.resetPractice();
  assert.equal(S.name, 'Übung');
  assert.notEqual(S.rows, writtenRows);

  // Beenden holt die geschriebene Tafel zurück
  tafel.endPractice();
  assert.equal(S.written, null);
  assert.equal(S.rows, writtenRows);
  assert.equal(S.name, 'Melodie');
  assert.deepEqual(S.sel, { r: 0, c: 1 });
  assert.equal(S.insertMode, false);
  assert.equal(S.countAt, null);
});

test('Tafel: ohne etwas zu benennen bleibt die Übungstafel unangetastet', () => {
  const { S } = tafel;
  const practice = [row({ n: 'C', h: '' })];
  S.rows = practice;
  S.sel = { r: 0, c: 0 };
  const folded = row({ n: 'D', h: '' });
  folded.fold = true;
  // Nur ein Taktstrich, eine eingeklappte und eine leere Zeile: nichts zum Benennen
  S.written = { rows: [row({ bar: 2 }), folded, []], name: '', sel: { r: 0, c: 0 }, hist: [] };
  assert.equal(tafel.practiceWritten(), false);
  assert.equal(S.rows, practice); // nicht getauscht und keine Kopie
  S.written = null;
});

test('Rückgängig: beide Bereiche über die gemeinsame Fabrik', () => {
  const { L } = lied;
  L.song = song();
  L.name = 'Alt';
  L.sel = 1;
  L.hist = [];
  lied.snap();
  L.song = song('d1');
  L.song.ev.push({ p: 'e1', v: 4 });
  L.name = 'Neu';
  assert.equal(lied.restore(), true);
  assert.deepEqual(L.song.ev, [{ p: 'c1', v: 4 }]);
  assert.equal(L.name, 'Alt');
  assert.equal(L.sel, 1);
  assert.equal(L.last, null);
  assert.equal(lied.restore(), false); // nichts mehr im Verlauf

  const { S } = tafel;
  S.written = null;
  S.rows = [row({ n: 'C', h: '' })];
  S.name = 'Alt';
  S.sel = { r: 0, c: 1 };
  S.countAt = { r: 0, c: 0 };
  S.hist = [];
  tafel.snap();
  S.rows[0].push({ n: 'D', h: '' });
  S.name = 'Neu';
  S.countAt = { r: 0, c: 1 };
  assert.equal(tafel.restore(), true);
  assert.equal(S.rows[0].length, 1);
  assert.equal(S.rows[0].line, false);
  assert.equal(S.name, 'Alt');
  assert.deepEqual(S.sel, { r: 0, c: 1 });
  assert.equal(S.countAt, null);
  assert.equal(tafel.restore(), false);
});
