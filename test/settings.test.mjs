import { test } from 'node:test';
import assert from 'node:assert/strict';

// Einfacher localStorage-Ersatz mit einem Stand aus der Zeit vor der Aufteilung in Kern und Bereiche.
// Er muss stehen, bevor settings.js geladen wird, denn das liest die Einstellungen beim Laden.
const OLD = { theme: 'original', tempo: 120, lens: false, mode: 'rhy', autoBar: true, autoZ: true, prop: true, wake: false };
const store = new Map([['notentafel.settings.v1', JSON.stringify(OLD)]]);
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); }
};
const { settings, useSettings, persistSettings, cleanCoreSettings } = await import('../js/core/settings.js');
const { cleanTafelSettings } = await import('../js/tafel/storage.js');

// Die Einstellungen der Tafel aus dem alten Stand; sie galten für Melodie und Rhythmus zusammen
const TAFEL = { theme: 'original', lens: false, autoBar: true, autoZ: true, syl: false };

test('Einstellungen: ein bisheriger Stand wird gelesen, Melodie und Rhythmus übernehmen beide die alten Tafel-Einstellungen', () => {
  assert.equal(useSettings(cleanTafelSettings), settings);
  assert.deepEqual(JSON.parse(JSON.stringify(settings)), { tempo: 120, mode: 'rhy', wake: false, countIn: false, metro: false, mel: TAFEL, rhy: TAFEL });
  assert.notEqual(settings.mel, settings.rhy);
  settings.tempo = 100;
  settings.rhy.lens = true;
  persistSettings();
  const saved = JSON.parse(store.get('notentafel.settings.v1'));
  assert.deepEqual(saved, { tempo: 100, mode: 'rhy', wake: false, countIn: false, metro: false, mel: TAFEL, rhy: { ...TAFEL, lens: true } });
});

test('Einstellungen: Melodie und Rhythmus behalten getrennt gespeicherte Werte', () => {
  const t = cleanTafelSettings({ theme: 'original', mel: { theme: 'oktave', prop: true }, rhy: { lens: false } });
  assert.deepEqual(t.mel, { theme: 'oktave', lens: true, autoBar: false, autoZ: false, syl: false });
  assert.deepEqual(t.rhy, { theme: 'oktave', lens: false, autoBar: false, autoZ: false, syl: false });
});

test('Einstellungen: Standardwerte bei fehlenden oder defekten Daten', () => {
  for (const raw of [{}, { theme: 'gibtsnicht', tempo: 999, mode: 5 }]) {
    const c = cleanCoreSettings(raw), t = cleanTafelSettings(raw);
    assert.deepEqual(c, { tempo: 90, mode: '', wake: true, countIn: false, metro: false });
    const d = { theme: 'oktave', lens: true, autoBar: false, autoZ: false, syl: false };
    assert.deepEqual(t, { mel: d, rhy: d });
  }
});
