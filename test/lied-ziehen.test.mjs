import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changePitch } from '../js/lied/model.js';

// Einfacher localStorage-Ersatz; muss stehen, bevor state.js geladen wird
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};
const { L, snap, restore } = await import('../js/lied/state.js');

const n = (p, v = 4, x = {}) => ({ p, v, ...x });
const song = (ev) => ({ meter: '4/4', pickup: 0, key: 0, ev });
// Wie dragPitch: beim ersten echten Schritt den Stand für „Rückgängig“ merken, dann die Tonhöhe ändern
const drag = (i, p) => {
  if (L.song.ev[i].p === p) return;
  snap();
  changePitch(L.song.ev, i, p);
};

test('Ziehen der Tonhöhe: Abbruch nimmt den Stand zurück, Loslassen behält ihn', () => {
  // pointercancel (cancelDrag in actions.js): Der gemerkte Stand kommt zurück, die Vorschau ist weg
  L.hist = [];
  L.song = song([n('c1')]);
  drag(0, 'e1');
  assert.equal(L.song.ev[0].p, 'e1'); // so weit sieht man die Vorschau
  restore();
  assert.equal(L.song.ev[0].p, 'c1');
  assert.deepEqual(L.hist, []); // kein „Rückgängig“-Schritt übrig
  // pointerup (endDrag in actions.js): nichts wird zurückgenommen, der Stand bleibt für „Rückgängig“
  L.song = song([n('c1')]);
  drag(0, 'e1');
  assert.equal(L.song.ev[0].p, 'e1');
  assert.equal(JSON.parse(L.hist[0]).song.ev[0].p, 'c1');
});
