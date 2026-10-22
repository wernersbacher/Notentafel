import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeStorage } from './helpers.mjs';

// localStorage-Ersatz; muss stehen, bevor state.js (über settings.js und storage.js) geladen wird
globalThis.localStorage = fakeStorage();
const { S, practiceWritten } = await import('../js/tafel/state.js');

// Zeile mit den Eigenschaften line/meter, wie sie die Tafel am Array trägt
const row = (...cells) => { cells.line = false; cells.meter = ''; return cells; };

test('Quiz: ohne etwas Geschriebenes bleibt die Übungstafel unangetastet', () => {
  const practice = [row({ n: 'C', h: '' })];
  S.rows = practice;
  S.written = { rows: [], name: '', sel: { r: 0, c: 0 }, hist: [] };
  assert.equal(practiceWritten(), false);
  assert.equal(S.rows, practice); // nicht getauscht und keine Kopie
  // Auch eine Tafel nur aus Strichen gibt nichts zum Benennen
  S.written.rows = [row({ bar: 2 })];
  assert.equal(practiceWritten(), false);
  // Ebenso wenig eine eingeklappte Zeile: Sie geht das Quiz nicht durch
  const folded = row({ n: 'D', h: '' });
  folded.fold = true;
  S.written.rows = [folded];
  assert.equal(practiceWritten(), false);
  assert.equal(S.rows, practice);
});

test('Quiz: die geschriebene Melodie kommt als Kopie auf die Übungstafel', () => {
  const practice = [row({ n: 'C', h: '' })];
  S.rows = practice;
  const written = [row({ n: 'D', h: '' })];
  S.written = { rows: written, name: 'Lied', sel: { r: 0, c: 0 }, hist: [] };
  assert.equal(practiceWritten(), true);
  assert.notEqual(S.rows, written);
  assert.deepEqual([...S.rows[0]], [{ n: 'D', h: '' }]);
  assert.equal(S.rows[0].line, false);
});
