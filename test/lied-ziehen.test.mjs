import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changePitch } from '../js/lied/model.js';
import { fakeStorage, n } from './helpers.mjs';

// Einfacher localStorage-Ersatz; muss stehen, bevor state.js geladen wird
globalThis.localStorage = fakeStorage();
const { L, snap, restore } = await import('../js/lied/state.js');

// Mit Tonart, anders als in den übrigen Lied-Tests
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
