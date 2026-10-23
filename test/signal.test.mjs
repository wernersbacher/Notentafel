import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSignal } from '../app/js/core/signal.js';

test('Signal: alle Angemeldeten werden mit den Argumenten aufgerufen, in der Reihenfolge der Anmeldung', () => {
  const s = makeSignal(), seen = [];
  s((...a) => seen.push(['a', ...a]));
  s((...a) => seen.push(['b', ...a]));
  s.emit('mel', 'id1');
  assert.deepEqual(seen, [['a', 'mel', 'id1'], ['b', 'mel', 'id1']]);
});

test('Signal: Abmelden wirkt, zweimal abmelden ist harmlos', () => {
  const s = makeSignal(), seen = [];
  const offA = s(() => seen.push('a')), offB = s(() => seen.push('b'));
  s.emit();
  offA();
  offA();
  s.emit();
  offB();
  s.emit();
  assert.deepEqual(seen, ['a', 'b', 'b']);
});

test('Signal: ohne Angemeldete tut emit nichts', () => {
  const s = makeSignal();
  assert.doesNotThrow(() => s.emit('x'));
  const off = s(() => {});
  off();
  assert.doesNotThrow(() => s.emit());
});

test('Signal: Ab- und Anmelden während eines Durchlaufs wirkt erst beim nächsten', () => {
  const s = makeSignal(), seen = [];
  const offB = s(() => seen.push('b'));
  let added = false;
  s(() => {
    seen.push('a');
    offB(); // abgemeldet, obwohl er in diesem Durchlauf noch drankommt
    if (!added) { added = true; s(() => seen.push('neu')); }
  });
  s.emit();
  assert.deepEqual(seen, ['b', 'a']); // die Kopie des Durchlaufs bleibt gültig, „neu“ noch nicht dabei
  s.emit();
  assert.deepEqual(seen, ['b', 'a', 'a', 'neu']);
});

test('Signal: clear meldet alle ab', () => {
  const s = makeSignal(), seen = [];
  s(() => seen.push('a'));
  s.clear();
  s.emit();
  assert.deepEqual(seen, []);
});
