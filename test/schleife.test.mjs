import { test, before, after, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, uninstallDom } from './helpers.mjs';
import { within } from '../app/js/core/plan.js';

/* ---------- within: ein markierter Bereich als Ablaufplan ---------- */

const it = (t, len, pos, sound = 'piano') => ({ t, len, sound, f: 440, pos });

test('within: nur die Einträge im Bereich, lückenlos ab 0, der Takt läuft weiter', () => {
  const plan = { items: [it(0, 1, 0), it(1, 1, 1), it(2, 2, 2), it(4, 1, 3)], end: 5, beat: 1, perBar: 4, barStart: 0 };
  const w = within(plan, (s) => s.pos >= 1 && s.pos <= 2);
  assert.deepEqual(w.items.map((s) => [s.t, s.pos]), [[0, 1], [1, 2]]);
  assert.equal(w.end, 3);
  assert.equal(w.barStart, -1); // Eintrag 1 begann bei Schlag 1 des Plans
  assert.equal(w.perBar, 4);
  assert.equal(plan.items[1].t, 1, 'der Ausgangsplan bleibt unberührt');
});

test('within: eine Wiederholung spielt dieselbe Stelle nicht doppelt; Plätze der Tafel sind { r, c }', () => {
  // 0 1 2 | zurück | 0 1 2 3: der Bereich 1 … 3 klingt je Stelle einmal, in der Reihenfolge des Plans
  const plan = { items: [it(0, 1, 0), it(1, 1, 1), it(2, 1, 2), it(3, 1, 0), it(4, 1, 1), it(5, 1, 2), it(6, 1, 3)], end: 7 };
  assert.deepEqual(within(plan, (s) => s.pos >= 1 && s.pos <= 3).items.map((s) => s.pos), [1, 2, 3]);
  const tafel = { items: [it(0, 1, { r: 0, c: 0 }), it(1, 1, { r: 0, c: 1 }), it(2, 1, { r: 0, c: 0 })], end: 3 };
  assert.deepEqual(within(tafel, (s) => s.pos.c === 0).items.map((s) => s.t), [0]);
});

test('within: liegt nichts im Bereich, bleibt der Plan leer', () => {
  const w = within({ items: [it(0, 1, 0)], end: 1 }, () => false);
  assert.deepEqual(w.items, []);
  assert.equal(w.end, 0);
});

test('within: eine Pause im Bereich bleibt als Stille erhalten (die Schleife behält ihren Takt)', () => {
  const plan = { items: [it(0, 1, 0), it(1, 1, 1, ''), it(2, 1, 2)], end: 3 };
  const w = within(plan, (s) => s.pos <= 1);
  assert.equal(w.end, 2);
  assert.equal(w.items[1].sound, '');
});

/* ---------- Player: Schleife ---------- */

let P, settings, marks, now;
// In kleinen Schritten, damit currentTime und die Timer zusammen laufen (die Verzögerungen rechnen mit currentTime)
const advance = (ms) => { for (let t = 0; t < ms; t += 10) { now += 0.01; mock.timers.tick(10); } };

before(async () => {
  installDom();
  // Ein Web-Audio-Ersatz, der alles annimmt; currentTime bestimmt der Test
  const fake = (extra = {}) => new Proxy({ ...extra }, {
    get: (t, k) => (k === 'currentTime' ? now : k in t ? t[k] : ['gain', 'frequency', 'Q', 'detune'].includes(k) ? (t[k] = fake({ value: 0 })) : () => fake()),
    set: (t, k, v) => { t[k] = v; return true; }
  });
  window.AudioContext = class { constructor() { return fake({ state: 'running', destination: fake() }); } };
  ({ settings } = await import('../app/js/core/settings.js'));
  P = await import('../app/js/core/player.js');
});
after(uninstallDom);
beforeEach(() => {
  mock.timers.enable({ apis: ['setTimeout'] });
  now = 0; marks = [];
  Object.assign(settings, { tempo: 120, step: false, countIn: false, metro: false, loop: false });
});
afterEach(() => { P.stopPlay(); mock.timers.reset(); });
const cycle = () => ({ items: [it(0, 1, 'a'), it(1, 1, 'b')], end: 2, beat: 1, perBar: 4 });
const mark = (p) => marks.push(p);

test('ohne Schleife läuft der Plan einmal und endet', () => {
  const p = cycle();
  P.togglePlay(() => ({ ...p, again: p }), mark);
  advance(4000);
  assert.deepEqual(marks, ['a', 'b', null]);
  assert.equal(P.playingPos(), null);
});

test('mit Schleife beginnt der Plan immer wieder von vorn, bis der Stopp kommt', () => {
  settings.loop = true;
  const p = cycle();
  P.togglePlay(() => ({ ...p, again: p }), mark);
  advance(5200); // fünf Durchläufe zu je einer Sekunde (120 Schläge je Minute)
  assert.deepEqual(marks.slice(0, 10), ['a', 'b', 'a', 'b', 'a', 'b', 'a', 'b', 'a', 'b']);
  assert.ok(!marks.includes(null), 'es läuft noch');
  P.togglePlay(() => p, mark);
  assert.equal(marks[marks.length - 1], null);
  const n = marks.length;
  advance(5000);
  assert.equal(marks.length, n, 'nach dem Stopp kommt nichts mehr');
});

test('Schleife ausschalten: der laufende Durchlauf klingt noch aus, dann ist Schluss', () => {
  settings.loop = true;
  const p = cycle();
  P.togglePlay(() => ({ ...p, again: p }), mark);
  advance(2500);
  settings.loop = false;
  advance(4000);
  assert.equal(marks[marks.length - 1], null);
  assert.ok(marks.length < 12);
});

test('ein Plan ohne again (die Spiele) läuft auch mit Schleife nur einmal', () => {
  settings.loop = true;
  P.togglePlay(() => cycle(), mark);
  advance(4000);
  assert.deepEqual(marks, ['a', 'b', null]);
});

test('ein ganz kurzer Bereich (eine Note) wird ohne Lücke und ohne Flut vorgeplant', () => {
  settings.loop = true;
  const one = { items: [it(0, 0.25, 'x')], end: 0.25, beat: 1, perBar: 4 };
  P.togglePlay(() => ({ ...one, again: one }), mark);
  advance(2000); // bei 120 Schlägen je Minute ein Durchlauf alle 0,125 s
  assert.ok(marks.length >= 14 && marks.length <= 18, 'etwa 16 Durchläufe, waren ' + marks.length);
  P.togglePlay(() => one, mark);
});
