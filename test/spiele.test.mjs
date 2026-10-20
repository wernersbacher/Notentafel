import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRhythm, meterParts } from '../js/tafel/rhythms.js';
import { midiOf, whiteRange, quizPitches, quizKeys, songRange } from '../js/lied/model.js';

// localStorage-Ersatz für die Einstellungen (vor dem Laden von games.js und lied/storage.js)
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { cleanGames } = await import('../js/tafel/games.js');
const { cleanLiedSettings } = await import('../js/lied/storage.js');

// Gleicher Zufall bei jedem Lauf
function seeded(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}
const notesOf = (cells) => cells.filter((c) => c.k === 'b').map((c) => c.d);
const restsOf = (cells) => cells.filter((c) => c.k === 'r').map((c) => c.d);

test('Rhythmus-Echo: volle Takte, beginnt mit einer Note, kein Zeichen über den Taktstrich', () => {
  const rnd = seeded(1);
  for (const meter of ['2/4', '3/4', '4/4', '2/2', '6/8', '']) {
    const len = meterParts(meter).len;
    for (let bars = 1; bars <= 3; bars++) {
      for (let notes = 1; notes <= 3; notes++) {
        for (let rests = 0; rests <= 3; rests++) {
          for (let k = 0; k < 15; k++) {
            const cells = makeRhythm({ meter, bars, notes, rests }, rnd);
            assert.equal(cells[0].k, 'b', 'beginnt mit einer Note');
            let t = 0;
            cells.forEach((c) => {
              const bar = Math.floor(t / len + 1e-9);
              t += c.d;
              assert.ok(t <= (bar + 1) * len + 1e-9, 'kein Zeichen über den Taktstrich (' + meter + ')');
            });
            assert.equal(t, bars * len);
          }
        }
      }
    }
  }
});

test('Rhythmus-Echo: die Stufen bestimmen die Notenwerte und Pausen', () => {
  const rnd = seeded(7), all = (o) => Array.from({ length: 60 }, () => makeRhythm(o, rnd));
  // leicht, ohne Pausen: nur Viertel, Halbe, punktierte Halbe, Ganze
  all({ meter: '4/4', bars: 2, notes: 1, rests: 0 }).forEach((c) => {
    assert.deepEqual(restsOf(c), []);
    notesOf(c).forEach((d) => assert.ok([1, 2, 3, 4].includes(d)));
  });
  // mittel: Achtel kommen vor (in jedem Rhythmus), Pausen leicht: nur Viertelpausen und mindestens eine
  all({ meter: '4/4', bars: 2, notes: 2, rests: 1 }).forEach((c) => {
    assert.ok(notesOf(c).includes(0.5));
    assert.ok(restsOf(c).length > 0);
    restsOf(c).forEach((d) => assert.equal(d, 1));
    notesOf(c).forEach((d) => assert.ok([0.5, 1, 2, 3, 4].includes(d)));
  });
  // Sechzehntel nur bei „schwer“, und dort selten
  const hard = all({ meter: '4/4', bars: 2, notes: 3, rests: 0 }).concat(all({ meter: '4/4', bars: 2, notes: 3, rests: 0 }));
  const with16 = hard.filter((c) => notesOf(c).includes(0.25)).length;
  assert.ok(with16 > 0 && with16 < hard.length * 0.25, with16 + ' von ' + hard.length);
});

test('Tonnamen-Quiz: Fragen und Knöpfe im Tonraum', () => {
  assert.deepEqual(whiteRange('a0', 'd1'), ['a0', 'h0', 'c1', 'd1']);
  assert.equal(midiOf({ p: 'c1' }), 60);
  assert.equal(midiOf({ p: 'f1' }, 1), 66); // f' in G-Dur klingt als fis'
  // ohne Vorzeichen nur Stammtöne; ♯ nicht auf e und h, ♭ nicht auf c und f, und nie über den Rand hinaus
  assert.equal(quizPitches('c1', 'c3', false, false).length, 15);
  const sharp = quizPitches('c1', 'e1', true, false).map((x) => x.p + x.acc);
  assert.deepEqual(sharp, ['c10', 'c11', 'd10', 'd11', 'e10']);
  const flat = quizPitches('c1', 'e1', false, true).map((x) => x.p + x.acc);
  assert.deepEqual(flat, ['c10', 'd10', 'd1-1', 'e10', 'e1-1']);
  // Knöpfe: Halbtöne zwischen den Stammtönen, mit beiden Namen, wenn beides gewählt ist
  const keys = quizKeys('c1', 'f1', true, true);
  assert.deepEqual(keys.map((k) => k.names.join('/')), ["c'", "cis'/des'", "d'", "dis'/es'", "e'", "f'"]);
  assert.deepEqual(keys.map((k) => k.key), ['60', '61', '62', '63', '64', '65']);
  assert.deepEqual(keys.filter((k) => k.black).map((k) => k.col), [0, 1]);
  assert.equal(quizKeys('c1', 'f1', false, false).length, 4);
  assert.deepEqual(quizKeys('a1', 'h1', false, true).map((k) => k.names.join('/')), ["a'", "b'", "h'"]);
});

test('Tonnamen-Quiz: Tonraum eines Lieds, mit Tonart und Platz für die Halbtöne', () => {
  assert.equal(songRange({ key: 0, ev: [{ v: 4 }] }), null);
  // G-Dur: f'' klingt als fis'', dafür braucht es oben noch g''
  assert.deepEqual(songRange({ key: 1, ev: [{ p: 'g1', v: 4 }, { p: 'f2', v: 4 }] }), { lo: 'g1', hi: 'g2', sharp: true, flat: false });
  // b' unten braucht a' daneben
  assert.deepEqual(songRange({ key: 0, ev: [{ p: 'h1', v: 4, acc: -1 }, { p: 'd2', v: 4 }] }), { lo: 'a1', hi: 'd2', sharp: false, flat: true });
});

test('Einstellungen der Spiele: Standardwerte und Prüfung', () => {
  assert.deepEqual(cleanGames(null), { echo: { bars: 2, notes: 1, rests: 0, pulse: true }, quiz: { mode: 'rand', ask: 'color', high: false, semis: 0 } });
  assert.deepEqual(cleanGames({ echo: { bars: 9, notes: 3, rests: 2, pulse: false }, quiz: { mode: 'song', ask: 'name', high: 1, semis: 2 } }),
    { echo: { bars: 2, notes: 3, rests: 2, pulse: false }, quiz: { mode: 'song', ask: 'name', high: true, semis: 2 } });
  const l = cleanLiedSettings({});
  assert.deepEqual([l.quizMode, l.quizLo, l.quizHi, l.quizSharp, l.quizFlat], ['rand', 'c1', 'c3', false, false]);
  // Tonraum verkehrt herum oder kaputt: wieder c' bis c'''
  assert.deepEqual([cleanLiedSettings({ quizLo: 'g2', quizHi: 'c1' }).quizLo, cleanLiedSettings({ quizLo: 'x' }).quizHi], ['c1', 'c3']);
  assert.deepEqual([cleanLiedSettings({ quizLo: 'a0', quizHi: 'e2' }).quizLo, cleanLiedSettings({ quizLo: 'a0', quizHi: 'e2' }).quizHi], ['a0', 'e2']);
});
