import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeRhythm, meterParts } from '../js/tafel/rhythms.js';
import { midiOf, whiteRange, quizPitches, quizKeys, songRange, makeInterval, comparePitch } from '../js/lied/model.js';
import { makeMelody } from '../js/tafel/theory.js';

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
  assert.deepEqual(cleanGames(null), { which: { count: 3 }, guess: { len: 'row' }, melo: { len: 3, steps: true }, echo: { meter: '4/4', bars: 2, notes: 1, rests: 0, pulse: true, sound: 'clap' }, quiz: { mode: 'rand', ask: 'color', high: false, semis: 0 } });
  assert.deepEqual(cleanGames({ which: { count: 4 }, melo: { len: 9, steps: false }, echo: { meter: '6/8', bars: 9, notes: 3, rests: 2, pulse: false, sound: 'wood' }, quiz: { mode: 'song', ask: 'name', high: 1, semis: 2 } }),
    { which: { count: 4 }, guess: { len: 'row' }, melo: { len: 3, steps: false }, echo: { meter: '6/8', bars: 2, notes: 3, rests: 2, pulse: false, sound: 'wood' }, quiz: { mode: 'song', ask: 'name', high: true, semis: 2 } });
  assert.equal(cleanGames({ echo: { meter: '5/4' } }).echo.meter, '4/4');
  const l = cleanLiedSettings({});
  assert.deepEqual([l.quizMode, l.quizLo, l.quizHi, l.quizSharp, l.quizFlat], ['rand', 'c1', 'c3', false, false]);
  // Tonraum verkehrt herum oder kaputt: wieder c' bis c'''
  assert.deepEqual([cleanLiedSettings({ quizLo: 'g2', quizHi: 'c1' }).quizLo, cleanLiedSettings({ quizLo: 'x' }).quizHi], ['c1', 'c3']);
  assert.deepEqual([cleanLiedSettings({ quizLo: 'a0', quizHi: 'e2' }).quizLo, cleanLiedSettings({ quizLo: 'a0', quizHi: 'e2' }).quizHi], ['a0', 'e2']);
});

test('Melodie-Echo: so viele Töne wie gewählt, mit steps nur Nachbartöne, ohne steps nie zweimal derselbe', () => {
  const rnd = seeded(3), ids = ['C', 'D', 'E', 'F', 'G', 'A', 'H'];
  for (let len = 2; len <= 5; len++) {
    for (let k = 0; k < 40; k++) {
      const s = makeMelody(ids, len, true, rnd), w = makeMelody(ids, len, false, rnd);
      assert.equal(s.length, len);
      assert.equal(w.length, len);
      for (let i = 1; i < len; i++) {
        assert.equal(Math.abs(ids.indexOf(s[i]) - ids.indexOf(s[i - 1])), 1, s.join(' '));
        assert.notEqual(w[i], w[i - 1], w.join(' '));
      }
    }
  }
});

test('Schritt oder Sprung: die Art passt zum Abstand, beide Töne im Tonraum', () => {
  const rnd = seeded(5), whites = whiteRange('c1', 'c3'), seen = new Set();
  for (let k = 0; k < 300; k++) {
    const [a, b, kind] = makeInterval(whites, rnd), d = Math.abs(comparePitch(a, b));
    assert.ok(whites.includes(a) && whites.includes(b));
    assert.equal(kind, d === 0 ? 'same' : d === 1 ? 'step' : 'leap', a + ' ' + b);
    assert.ok(d <= 7);
    seen.add(kind);
  }
  assert.deepEqual([...seen].sort(), ['leap', 'same', 'step']);
  // Zu kleiner Tonraum für einen Sprung: dann derselbe Ton
  assert.deepEqual(makeInterval(['c1', 'd1'], () => 0.9), ['c1', 'c1', 'same']);
});

// Die Spiele öffnen ihre Leiste über core/game.js und zeichnen auf der Tafel; im Test lässt sich nur prüfen, dass die
// Spielabläufe in rhygames.js/echo.js die richtige Spielart öffnen und nach dem Lösen den richtigen Stand spielen.
const tafelSrc = (f) => fs.readFileSync(path.resolve(import.meta.dirname, '../js/tafel', f), 'utf8');

test('Spielarten: „Vom Blatt klatschen“ ist nicht das Rhythmus-Echo', () => {
  const rhy = tafelSrc('rhygames.js');
  // Mit derselben Spielart hielte sich das Echo für das laufende Spiel (gameOn('echo')) und hinge seine Zeile an
  const readKind = rhy.match(/const READ_KIND = '([a-z]+)'/)[1];
  assert.ok(rhy.includes('openGame(READ_KIND'));
  const echoKind = tafelSrc('echo.js').match(/openGame\('([a-z]+)'/)[1];
  assert.equal(echoKind, 'echo'); // eine gespeicherte Spielwahl „echo“ bleibt das Rhythmus-Echo
  assert.notEqual(readKind, echoKind);
  assert.ok(!rhy.includes("gameOn('echo')"));
});

test('Fehler finden: nach dem Lösen spielt die Tafel die richtige Zeile, nicht den Stand mit dem Fehler', () => {
  const src = tafelSrc('rhygames.js'), from = src.indexOf('function fixQuiz()');
  const block = src.slice(from, src.indexOf('/* ----------', from));
  assert.match(block, /solved:\s*playRow/);
  assert.doesNotMatch(block, /solved:\s*play\b/);
});
