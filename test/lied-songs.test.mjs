import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, songOf } from '../js/lied/songs.js';
import { cleanSong, ticks, measureTicks, barsAfter, hasLyrics } from '../js/lied/model.js';

const evOf = (notes) => songOf({ name: 'x', meter: '4/4', notes }).song.ev;

test('songOf: Tonnamen mit Vorzeichen', () => {
  assert.deepEqual(evOf('c1 fis1 b1 es2 as1 des1 his0 ces2 cis1 dis1 eis1 ges1 gis1 ais1'), [
    { p: 'c1', v: 4 }, { p: 'f1', v: 4, acc: 1 }, { p: 'h1', v: 4, acc: -1 }, { p: 'e2', v: 4, acc: -1 },
    { p: 'a1', v: 4, acc: -1 }, { p: 'd1', v: 4, acc: -1 }, { p: 'h0', v: 4, acc: 1 }, { p: 'c2', v: 4, acc: -1 },
    { p: 'c1', v: 4, acc: 1 }, { p: 'd1', v: 4, acc: 1 }, { p: 'e1', v: 4, acc: 1 }, { p: 'g1', v: 4, acc: -1 },
    { p: 'g1', v: 4, acc: 1 }, { p: 'a1', v: 4, acc: 1 }
  ]);
});

test('songOf: Oktaven von der kleinen bis zur dreigestrichenen', () => {
  assert.deepEqual(evOf('a0 c1 c2 c3').map((e) => e.p), ['a0', 'c1', 'c2', 'c3']);
});

test('songOf: Wert gilt weiter, Punkt, Pause', () => {
  assert.deepEqual(evOf('c1 d1:8 e1 r f1:4. g1:8 r:2 a1 h1:16 c2:1'), [
    { p: 'c1', v: 4 }, { p: 'd1', v: 8 }, { p: 'e1', v: 8 }, { v: 8 }, { p: 'f1', v: 4, dot: 1 }, { p: 'g1', v: 8 },
    { v: 2 }, { p: 'a1', v: 2 }, { p: 'h1', v: 16 }, { p: 'c2', v: 1 }
  ]);
  // Der Punkt gilt mit dem Wert weiter
  assert.deepEqual(evOf('c1:2. d1'), [{ p: 'c1', v: 2, dot: 1 }, { p: 'd1', v: 2, dot: 1 }]);
});

test('songOf: Haltebogen, Zeilenumbruch, Taktstrich wird ignoriert', () => {
  assert.deepEqual(evOf('g1:2~ | g1 / a1:4.~ a1:8'), [
    { p: 'g1', v: 2, tie: 1 }, { p: 'g1', v: 2, brk: 1 }, { p: 'a1', v: 4, dot: 1, tie: 1 }, { p: 'a1', v: 8 }
  ]);
});

test('songOf: Name, Taktart und Auftakt', () => {
  assert.deepEqual(songOf({ name: 'A', meter: '3/4', pickup: 8, notes: 'c1' }),
    { name: 'A', song: { meter: '3/4', pickup: 8, key: 0, ev: [{ p: 'c1', v: 4 }] } });
  assert.equal(songOf({ name: 'B', meter: '4/4', notes: 'c1' }).song.pickup, 0);
});

test('songOf: Liedtext je Zeile, ohne Pausen und übergebundene Noten, „_“ lässt aus', () => {
  const { ev } = songOf({ name: 'x', meter: '4/4', notes: 'c1 r d1:2~ / d1:4 e1 f1:2', lyrics: 'Al- le / _ Ent-' }).song;
  assert.deepEqual(ev.map((e) => e.ly), ['Al-', undefined, 'le', undefined, undefined, 'Ent-']);
});

test('songOf: Liedtext muss zu den Noten passen', () => {
  const def = (lyrics) => ({ name: 'x', meter: '4/4', notes: 'c1 d1 / e1 f1', lyrics });
  assert.throws(() => songOf(def('a b c / d')), /Zeile 1: 3 Silben für 2 Noten/);
  assert.throws(() => songOf(def('a b c d')), /1 Zeilen, die Noten 2/);
  assert.throws(() => songOf(def('a b / c Siebzehnbuchstaben')), /zu lang/);
});

test('alle bekannten Lieder haben die erste Strophe als Liedtext', () => {
  for (const def of SONGS) assert.ok(hasLyrics(songOf(def).song), def.name);
});

test('songOf: unbekannte Token werfen einen Fehler mit dem Token', () => {
  for (const tok of ['x1', 'c4', 'c', 'hes1', 'c1:3', 'c1:16.', 'r~', 'c1;4', 'C1']) {
    assert.throws(() => evOf(`c1 ${tok} d1`), (err) => err.message.includes(tok), tok);
  }
});

for (const def of SONGS) {
  test(`Lied „${def.name}“: sauber, Zeilen füllen ganze Takte`, () => {
    const { song } = songOf(def);
    assert.deepEqual(cleanSong(song), song);
    const len = measureTicks(song.meter), pick = song.pickup;
    // Zeilen bis zum Zeilenumbruch
    const lines = [[]];
    song.ev.forEach((e, i) => {
      lines[lines.length - 1].push(i);
      if (e.brk && i < song.ev.length - 1) lines.push([]);
    });
    assert.ok(lines.length > 1);
    const sum = (l) => l.reduce((s, i) => s + ticks(song.ev[i]), 0);
    lines.forEach((l, k) => {
      const t = sum(l), first = k === 0, last = k === lines.length - 1;
      const ok = first ? t > pick && (t - pick) % len === 0 : t % len === 0 || (last && pick > 0 && (t + pick) % len === 0);
      assert.ok(ok, `Zeile ${k + 1}: ${t} Ticks`);
    });
    // Am Ende jeder Zeile ein Taktstrich (beim Auftakt endet die letzte Zeile mitten im Takt)
    const bars = barsAfter(song, true);
    lines.forEach((l, k) => {
      if (pick && k === lines.length - 1) return;
      assert.ok(bars[l[l.length - 1]] > 0, `Zeile ${k + 1} ohne Taktstrich`);
    });
  });
}

test('Ode an die Freude: punktierte Viertel am Ende der Phrasen', () => {
  const { song } = songOf(SONGS.find((s) => s.name === 'Ode an die Freude'));
  const dotted = song.ev.filter((e) => e.dot).map((e) => e.p);
  assert.deepEqual(dotted, ['a1', 'g1', 'g1']);
});
