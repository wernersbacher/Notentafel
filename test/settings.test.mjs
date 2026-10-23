import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeStorage } from './helpers.mjs';

// Einfacher localStorage-Ersatz mit einem Stand aus der Zeit vor der Aufteilung in Kern und Bereiche.
// Er muss stehen, bevor settings.js geladen wird, denn das liest die Einstellungen beim Laden.
const OLD = { theme: 'original', tempo: 120, lens: false, mode: 'rhy', autoBar: true, autoZ: true, prop: true, wake: false };
globalThis.localStorage = fakeStorage();
globalThis.localStorage.setItem('notentafel.settings.v1', JSON.stringify(OLD));
const { settings, useSettings, persistSettings, cleanCoreSettings } = await import('../app/js/core/settings.js');
const { cleanTafelSettings } = await import('../app/js/tafel/storage.js');

// Die Einstellungen der Tafel aus dem alten Stand; sie galten für Melodie und Rhythmus zusammen
const TAFEL = { lens: false, autoBar: true, autoZ: true, syl: false };

test('Einstellungen: ein bisheriger Stand wird gelesen, Melodie und Rhythmus übernehmen beide die alten Tafel-Einstellungen', () => {
  assert.equal(useSettings(cleanTafelSettings), settings);
  assert.deepEqual(JSON.parse(JSON.stringify(settings)), { tempo: 120, mode: 'rhy', wake: false, countIn: false, metro: false, songSort: 'group', step: false, stepSound: false, stepHide: false, topHidden: false, play: {}, game: {}, ui: 1, open: ['mel-notes', 'rhy-notes', 'lied-notes'], mel: TAFEL, rhy: TAFEL });
  assert.notEqual(settings.mel, settings.rhy);
  settings.tempo = 100;
  settings.rhy.lens = true;
  persistSettings();
  const saved = JSON.parse(globalThis.localStorage.getItem('notentafel.settings.v1'));
  assert.deepEqual(saved, { tempo: 100, mode: 'rhy', wake: false, countIn: false, metro: false, songSort: 'group', step: false, stepSound: false, stepHide: false, topHidden: false, play: {}, game: {}, ui: 1, open: ['mel-notes', 'rhy-notes', 'lied-notes'], mel: TAFEL, rhy: { ...TAFEL, lens: true } });
});

test('Einstellungen: Melodie und Rhythmus behalten getrennt gespeicherte Werte', () => {
  const t = cleanTafelSettings({ theme: 'original', mel: { theme: 'oktave', prop: true }, rhy: { lens: false } });
  assert.deepEqual(t.mel, { lens: true, autoBar: false, autoZ: false, syl: false });
  assert.deepEqual(t.rhy, { lens: false, autoBar: false, autoZ: false, syl: false });
});

test('Einstellungen: Standardwerte bei fehlenden oder defekten Daten', () => {
  for (const raw of [{}, { theme: 'gibtsnicht', tempo: 999, mode: 5 }]) {
    const c = cleanCoreSettings(raw), t = cleanTafelSettings(raw);
    assert.deepEqual(c, { tempo: 90, mode: '', wake: true, countIn: false, metro: false, songSort: 'group', step: false, stepSound: false, stepHide: false, topHidden: false, play: {}, game: {}, ui: 1, open: ['mel-notes', 'rhy-notes', 'lied-notes'] });
    const d = { lens: true, autoBar: false, autoZ: false, syl: false };
    assert.deepEqual(t, { mel: d, rhy: d });
  }
});

test('Einstellungen: welche Bereiche gerade üben (Üben und Spielen)', () => {
  assert.deepEqual(cleanCoreSettings({ play: { rhy: true, mel: 'ja', lied: false } }).play, { rhy: true });
  assert.deepEqual(cleanCoreSettings({ play: [true] }).play, {});
  assert.deepEqual(cleanCoreSettings({ game: { rhy: 'which', mel: 5, lied: 'X!' } }).game, { rhy: 'which' });
});

test('Größe der Oberfläche: frei wählbar, gerundet und begrenzt', async () => {
  const { clampUi } = await import('../app/js/core/settings.js');
  assert.equal(clampUi(1.234), 1.23);
  assert.equal(clampUi(0.1), 0.5);
  assert.equal(clampUi(5), 2);
  assert.equal(clampUi('x'), 1);
  assert.equal(clampUi(1.1 - 0.05), 1.05);
});
