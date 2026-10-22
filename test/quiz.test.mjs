import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeStorage } from './helpers.mjs';

// core/quiz.js liest beim Laden die Elemente aus dom.js; für die Fabriken genügt ein leeres Dokument. game.js hängt sich
// dabei mit addEventListener an die Spielleiste, also braucht jedes Element die Methode.
globalThis.localStorage = fakeStorage();
const noopEl = () => ({ addEventListener() {} });
globalThis.document = { getElementById: noopEl, querySelector: () => null };
const { answerOf, randomQuiz, songQuiz } = await import('../js/core/quiz.js');

// Die richtige Antwort einer Frage, so wie die Engine sie prüft
const firstOf = (r) => r.ok.values().next().value;

test('answerOf: Schlüssel als String, Ton unverändert', () => {
  assert.deepEqual(answerOf(42, 440), { ok: new Set(['42']), f: 440 });
  assert.deepEqual(answerOf('Fis', undefined), { ok: new Set(['Fis']), f: undefined });
});

test('randomQuiz: Kandidaten jedes Mal neu, dieselbe Frage nicht zweimal, Zeichnung ungelöst', () => {
  const log = [];
  let calls = 0, stops = 0;
  const all = ['a', 'b', 'c'];
  const q = randomQuiz({
    layout: 'row', sound: 'bell', keys: [{ key: 'a' }],
    candidates: () => { calls++; return all.slice(); },
    same: (a, b) => a === b,
    draw: (x, solved) => log.push('draw:' + x + ':' + solved),
    answer: (x) => { log.push('answer:' + x); return { ok: new Set([x]), f: 1 }; },
    stop: () => { stops++; }
  });
  assert.equal(q.layout, 'row');
  assert.equal(q.sound, 'bell');
  assert.deepEqual(q.keys, [{ key: 'a' }]);
  const rand = Math.random;
  Math.random = () => 0; // nimmt immer den ersten verbliebenen Kandidaten
  try {
    let last = null;
    for (let i = 0; i < 12; i++) {
      const r = q.next(), x = firstOf(r);
      assert.notEqual(x, last); // die aktuelle Frage ist ausgeschlossen
      assert.deepEqual(log.slice(-2), ['draw:' + x + ':false', 'answer:' + x]); // draw vor answer, zunächst ungelöst
      last = x;
    }
    assert.equal(calls, 12); // candidates() wird bei jedem next() neu geholt
    q.solved();
    assert.equal(log.at(-1), 'draw:' + last + ':true'); // die zuletzt gezeigte Frage mit Lösung
    q.stop();
    assert.equal(stops, 1);
  } finally {
    Math.random = rand;
  }
});

test('songQuiz: der Reihe nach, step() überspringt Stellen, gelöst wird die zuletzt gezeigte', () => {
  const log = [];
  const items = ['1', '2', '3', '4'];
  let stops = 0;
  const q = songQuiz({
    layout: 'piano', sound: 'piano', keys: [],
    done: 'Geschafft.',
    items: () => items,
    step: (x) => x !== '2',
    draw: (x) => log.push('draw:' + x),
    answer: (x) => { log.push('answer:' + x); return { ok: new Set([x]), f: 1 }; },
    solve: (x) => log.push('solve:' + x),
    stop: () => { stops++; }
  });
  assert.equal(q.done, 'Geschafft.');
  assert.equal(firstOf(q.next()), '1');
  assert.equal(firstOf(q.next()), '3'); // '2' übersprungen
  assert.deepEqual(log, ['draw:1', 'answer:1', 'draw:3', 'answer:3']); // draw vor answer
  q.solved();
  assert.deepEqual(log.slice(-1), ['solve:3']); // die zuletzt gezeigte Stelle
  assert.equal(firstOf(q.next()), '4');
  assert.equal(q.next(), null); // am Ende nichts mehr
  q.stop();
  assert.equal(stops, 1);
});
