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

test('Einstellungen: ein bisheriger Stand wird vollständig gelesen und wieder gespeichert', () => {
  assert.equal(useSettings(cleanTafelSettings), settings);
  assert.deepEqual({ ...settings }, OLD);
  settings.tempo = 100;
  persistSettings();
  assert.deepEqual(JSON.parse(store.get('notentafel.settings.v1')), { ...OLD, tempo: 100 });
});

test('Einstellungen: Standardwerte bei fehlenden oder defekten Daten', () => {
  for (const raw of [{}, { theme: 'gibtsnicht', tempo: 999, mode: 5 }]) {
    const c = cleanCoreSettings(raw), t = cleanTafelSettings(raw);
    assert.deepEqual(c, { tempo: 90, mode: '', wake: true });
    assert.deepEqual(t, { theme: 'oktave', lens: true, autoBar: false, autoZ: false, prop: false });
  }
});
