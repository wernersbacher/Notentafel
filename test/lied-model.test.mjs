import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ticks, staffPos, freq, noteName, pitchLabel, measureTicks, barsAfter, drawnBars, cleanSong, parsePitch,
  pickupsFor, gridOffset, gridStarts, stepPitch, badMeasures, splitAtBar, keyAcc, keySignature, keyName, shownAccidentals, transpose, playOrder, playPlan, splitAll, songToMelody,
  canTie, tieValidAt, toggleTieAt, changePitch, swapEvents
} from '../app/js/lied/model.js';
import { n, r } from './helpers.mjs';

test('drawnBars: mit Automatik und Taktart am Ende ein Schlussstrich', () => {
  assert.deepEqual(drawnBars({ meter: '2/4', ev: [n('c1'), n('d1'), r(2)] }, true), [0, 1, 2]);
  // auch, wenn der letzte Takt nicht aufgeht
  assert.deepEqual(drawnBars({ meter: '2/4', ev: [n('c1'), n('d1'), r()] }, true), [0, 1, 2]);
  // Wiederholung am Ende bleibt, von Hand und ohne Taktart kommt nichts dazu
  assert.deepEqual(drawnBars({ meter: '2/4', ev: [n('c1'), n('d1', 4, { bar: 3 })] }, true), [0, 3]);
  assert.deepEqual(drawnBars({ meter: '2/4', ev: [n('c1'), n('d1')] }, false), [0, 0]);
  assert.deepEqual(drawnBars({ meter: '', ev: [n('c1', 1)] }, true), [0]);
});

test('ticks: alle Notenwerte, auch punktiert', () => {
  assert.deepEqual([1, 2, 4, 8, 16].map((v) => ticks({ v })), [32, 16, 8, 4, 2]);
  assert.deepEqual([1, 2, 4, 8].map((v) => ticks({ v, dot: 1 })), [48, 24, 12, 6]);
});

test('staffPos: unterste Linie e\' = 0, oberste f\'\' = 8', () => {
  assert.equal(staffPos('e1'), 0);
  assert.equal(staffPos('c1'), -2);
  assert.equal(staffPos('h1'), 4);
  assert.equal(staffPos('f2'), 8);
  assert.equal(staffPos('a0'), -4);
  assert.equal(staffPos('c3'), 12);
});

test('freq: a\' = 440, Vorzeichen verschieben um einen Halbton', () => {
  assert.equal(freq(n('a1')), 440);
  assert.ok(Math.abs(freq(n('c1')) - 261.63) < 0.01);
  assert.ok(Math.abs(freq(n('f1', 4, { acc: 1 })) - 369.99) < 0.01);
  assert.ok(Math.abs(freq(n('h1', 4, { acc: -1 })) - 466.16) < 0.01);
  assert.equal(freq(n('a1', 4, { acc: 0 })), 440);
});

test('noteName: deutsche Namen mit Oktavstrichen', () => {
  assert.equal(noteName(n('c1')), "c'");
  assert.equal(noteName(n('f1', 4, { acc: 1 })), "fis'");
  assert.equal(noteName(n('h1', 4, { acc: -1 })), "b'");
  assert.equal(noteName(n('e2', 4, { acc: -1 })), "es''");
  assert.equal(noteName(n('a0', 4, { acc: -1 })), 'as');
  assert.equal(noteName(n('d1', 4, { acc: -1 })), "des'");
  assert.equal(noteName(n('h1', 4, { acc: 0 })), "h'");
  assert.equal(noteName(n('g3')), "g'''");
});

test('pitchLabel: musikalische Bezeichnung mit Strichen', () => {
  assert.equal(pitchLabel('a0'), 'a');
  assert.equal(pitchLabel('c1'), "c'");
  assert.equal(pitchLabel('g2'), "g''");
  assert.equal(pitchLabel('h3'), "h'''");
});

test('barsAfter: von Hand, automatisch, Schlussstrich bleibt', () => {
  assert.equal(measureTicks('4/4'), 32);
  assert.equal(measureTicks('6/8'), 24);
  assert.equal(measureTicks('2/2'), 32);
  const song = { meter: '3/4', ev: [n('c1', 2), n('d1'), n('e1', 4, { bar: 1 }), n('f1', 2, { bar: 2 })] };
  assert.deepEqual(barsAfter(song, false), [0, 0, 1, 2]);
  assert.deepEqual(barsAfter(song, true), [0, 1, 0, 2]);
  // Geht der letzte Takt genau auf, steht der Strich auch dahinter
  assert.deepEqual(barsAfter({ meter: '2/4', ev: [n('c1'), n('d1'), r(2)] }, true), [0, 1, 1]);
  // Ohne Taktart keine automatischen Striche
  assert.deepEqual(barsAfter({ meter: '', ev: [n('c1', 1)] }, true), [0]);
});

test('splitAtBar: Note über den Taktstrich wird zu übergebundenen Noten', () => {
  // 4/4, Halbe auf Zählzeit 4: zwei Viertel mit Bogen, Vorzeichen an beiden
  const s = { meter: '4/4', ev: [n('c1'), n('d1'), n('e1'), n('f1', 2, { acc: 1 })] };
  assert.deepEqual(splitAtBar(s, 3), [n('f1', 4, { acc: 1, tie: 1 }), n('f1', 4, { acc: 1 })]);
  // Passt sie, bleibt sie
  assert.deepEqual(splitAtBar(s, 2), [s.ev[2]]);
  // Halbe auf der „und“ von 4: Achtel + punktierte Viertel; Strich und Umbruch ans letzte Stück, Bogen weiter
  const t = { meter: '4/4', ev: [n('c1', 2, { dot: 1 }), n('d1', 8), n('e1', 2, { tie: 1, brk: 1 })] };
  assert.deepEqual(splitAtBar(t, 2), [n('e1', 8, { tie: 1 }), n('e1', 4, { dot: 1, tie: 1, brk: 1 })]);
  // Pausen ohne Bogen; Ganze im 3/4 ab Taktanfang: punktierte Halbe + Viertel
  assert.deepEqual(splitAtBar({ meter: '3/4', ev: [{ v: 1 }] }, 0), [{ v: 2, dot: 1 }, { v: 4 }]);
  // Mit Auftakt (Viertel im 3/4): eine Halbe als Auftakt wird Viertel + Viertel
  assert.deepEqual(splitAtBar({ meter: '3/4', pickup: 8, ev: [n('g0', 2)] }, 0), [n('g0', 4, { tie: 1 }), n('g0')]);
  // Ohne Taktart nichts
  assert.deepEqual(splitAtBar({ meter: '', ev: [n('c1', 1)] }, 0), [n('c1', 1)]);
});

test('barsAfter: ragt eine Note über den Takt, steht der Strich hinter ihr und es wird neu gezählt', () => {
  // 4/4: drei Viertel, dann eine Halbe über die Grenze; danach wieder volle Takte
  const song = { meter: '4/4', ev: [n('c1'), n('d1'), n('e1'), n('f1', 2), n('g1'), n('a1'), n('h1'), n('c2')] };
  assert.deepEqual(barsAfter(song, true), [0, 0, 0, 1, 0, 0, 0, 1]);
  assert.deepEqual(gridStarts(song), [0, 8, 16, 24, 64, 72, 80, 88]);
  assert.deepEqual(badMeasures(song, true), [{ first: 0, last: 3, ticks: 40, want: 32 }]);
  // Ganze im 3/4-Takt ab dem Taktanfang: Strich dahinter, nächster Takt beginnt neu
  assert.deepEqual(barsAfter({ meter: '3/4', ev: [n('c1', 1), n('d1', 2), n('e1')] }, true), [1, 0, 1]);
});

test('cleanSong: prüft und säubert', () => {
  assert.equal(cleanSong(null), null);
  assert.equal(cleanSong({ ev: 'x' }), null);
  const s = cleanSong({ meter: '5/4', ev: [
    n('c1', 4, { acc: 1, dot: 1, bar: 7, brk: true, extra: 1 }), r(16, { dot: 1, acc: 1 }), n('x9'), { v: 3 }, null, n('a0', 1)
  ] });
  assert.equal(s.meter, '');
  assert.deepEqual(s.ev, [
    { p: 'c1', v: 4, dot: 1, acc: 1, bar: 1, brk: 1 },
    { v: 16 },
    { p: 'a0', v: 1 }
  ]);
  assert.deepEqual(cleanSong({ meter: '6/8', ev: [] }), { meter: '6/8', pickup: 0, key: 0, ev: [] });
  assert.equal(cleanSong({ key: 2, ev: [] }).key, 2);
  assert.equal(cleanSong({ key: 9, ev: [] }).key, 0);
  // Auftakt nur, wenn er kürzer als ein Takt ist; Haltebogen nur an Noten und nur, wenn er klingen würde
  assert.equal(cleanSong({ meter: '3/4', pickup: 8, ev: [] }).pickup, 8);
  assert.equal(cleanSong({ meter: '3/4', pickup: 24, ev: [] }).pickup, 0);
  assert.equal(cleanSong({ meter: '', pickup: 8, ev: [] }).pickup, 0);
  assert.deepEqual(cleanSong({ ev: [n('c1', 4, { tie: 1 }), r(4, { tie: 1 })] }).ev, [{ p: 'c1', v: 4 }, { v: 4 }]);
  assert.deepEqual(cleanSong({ ev: [n('c1', 4, { tie: 1 }), n('c1', 4), n('d1', 4, { tie: 1 }), n('e1', 4)] }).ev.map((e) => !!e.tie), [true, false, false, false]);
  assert.deepEqual(parsePitch('h3'), { step: 6, oct: 3 });
  assert.equal(parsePitch('c4'), null);
});

test('Auftakt: Taktraster und automatische Taktstriche zählen nach dem Auftakt', () => {
  assert.deepEqual(pickupsFor('4/4'), [4, 8, 12, 16, 24]);
  assert.deepEqual(pickupsFor('2/4'), [4, 8, 12]);
  assert.deepEqual(pickupsFor(''), []);
  const s = { meter: '4/4', pickup: 8, ev: [n('g0'), n('c1'), n('c1'), n('d1'), n('e1'), n('f1')] };
  assert.equal(gridOffset(s), 24);
  assert.deepEqual(gridStarts(s), [24, 32, 40, 48, 56, 64]);
  assert.deepEqual(barsAfter(s, true), [1, 0, 0, 0, 1, 0]);
  assert.equal(gridOffset({ ...s, meter: '' }), 0);
});

test('stepPitch: stufenweise, begrenzt auf den Tonvorrat', () => {
  assert.equal(stepPitch('c1', 1), 'd1');
  assert.equal(stepPitch('h1', 1), 'c2');
  assert.equal(stepPitch('c1', -1), 'h0');
  assert.equal(stepPitch('e1', 7), 'e2');
  assert.equal(stepPitch('d0', -5), 'c0');
  assert.equal(stepPitch('a3', 9), 'h3');
});

test('Tonart: Vorzeichen der Tonart gelten, ♮ hebt sie auf', () => {
  assert.equal(keyAcc(1, 3), 1); // G-Dur: fis
  assert.equal(keyAcc(1, 0), 0);
  assert.equal(keyAcc(-2, 6), -1); // B-Dur: b und es
  assert.equal(keyAcc(-2, 2), -1);
  assert.deepEqual(keySignature(2), [[3, 1], [0, 1]]);
  assert.equal(keyName(-3), 'Es-Dur');
  const s = { meter: '4/4', key: 1, ev: [n('f1'), n('f1', 4, { acc: 0 }), n('f1')] };
  assert.equal(noteName(s.ev[0], 1), "fis'");
  assert.equal(noteName(s.ev[1], 1), "f'");
  // fis ohne Zeichen (Tonart), f mit ♮, danach fis wieder mit ♯ (im selben Takt)
  assert.deepEqual(shownAccidentals(s, true), [null, 0, 1]);
  assert.ok(Math.abs(freq(s.ev[0], 1) - freq(n('f1', 4, { acc: 1 }))) < 1e-9);
});

test('transpose: Tonart und Noten wandern mit, richtig geschrieben', () => {
  const s = { meter: '4/4', pickup: 0, key: 0, ev: [n('c1'), n('e1'), n('g1'), { v: 4 }, n('f1', 4, { acc: 1 })] };
  // Ganzton höher: D-Dur, d' fis' a' … gis' (eigenes ♯, weil D-Dur kein gis hat)
  const up = transpose(transpose(s, 1), 1);
  assert.equal(up.key, 2);
  assert.deepEqual(up.ev.map((e) => e.p && noteName(e, up.key)), ["d'", "fis'", "a'", undefined, "gis'"]);
  // Halbton höher von C: Des-Dur (weniger Vorzeichen als Cis-Dur)
  const des = transpose(s, 1);
  assert.equal(des.key, -5);
  assert.equal(noteName(des.ev[0], des.key), "des'");
  // Zurück ergibt wieder C-Dur und dieselben Töne
  assert.deepEqual(transpose(des, -1).ev.map((e) => e.p && noteName(e, 0)), ["c'", "e'", "g'", undefined, "fis'"]);
  // Aus dem Tonvorrat heraus: null
  assert.equal(transpose({ ...s, ev: [n('h3')] }, 2), null);
});

test('playOrder: Wiederholung mit und ohne 1./2. Klammer', () => {
  const q = (p, x = {}) => n(p, 4, x);
  // 4/4, zwei Takte, :‖ am Ende von Takt 2: beide Takte zweimal
  const a = { meter: '4/4', ev: [q('c1'), q('d1'), q('e1'), q('f1'), q('g1'), q('a1'), q('h1'), q('c2', { bar: 3 }), q('d2')] };
  assert.deepEqual(playOrder(a), [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 8]);
  // ‖: hinter Takt 1: nur Takt 2 wird wiederholt
  const b = { ...a, ev: a.ev.map((e, i) => (i === 3 ? { ...e, bar: 4 } : e)) };
  assert.deepEqual(playOrder(b), [0, 1, 2, 3, 4, 5, 6, 7, 4, 5, 6, 7, 8]);
  // Mit Klammer: beim zweiten Mal wird Takt 2 (1. Klammer) übersprungen, weiter mit Takt 3 (2. Klammer)
  const c = { ...a, ev: a.ev.map((e, i) => (i === 7 ? { ...e, volta: 1 } : e)) };
  assert.deepEqual(playOrder(c), [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 8]);
  // Abspielplan: Zeiten laufen durch, Position ist der Index
  const plan = playPlan(c);
  assert.deepEqual(plan.items.map((s) => s.pos), [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 8]);
  assert.equal(plan.end, 13);
});

test('cleanSong: Wiederholungsstriche und Klammer', () => {
  const s = cleanSong({ ev: [n('c1', 4, { bar: 5, volta: 1 }), n('d1', 4, { bar: 4, volta: 1 }), n('e1', 4, { bar: 9 })] });
  assert.deepEqual(s.ev.map((e) => [e.bar, e.volta]), [[5, 1], [4, undefined], [1, undefined]]);
});

test('Liedtext: gespeichert nur an Noten, gekürzt; beim Aufteilen am ersten Stück', () => {
  const s = cleanSong({ ev: [n('c1', 4, { ly: '  Al-  ' }), { v: 4, ly: 'x' }, n('d1', 4, { ly: 'x'.repeat(30) })] });
  assert.deepEqual(s.ev.map((e) => e.ly), ['Al-', undefined, 'x'.repeat(16)]);
  const t = { meter: '4/4', ev: [n('c1'), n('d1'), n('e1'), n('f1', 2, { ly: 'Ho' })] };
  assert.deepEqual(splitAtBar(t, 3).map((e) => e.ly), ['Ho', undefined]);
});

test('splitAll: alles, was über einen Taktstrich ragt, wird aufgeteilt', () => {
  const s = splitAll({ meter: '4/4', ev: [n('c1'), n('d1'), n('e1'), n('f1', 2), n('g1', 1)] });
  // Halbe auf der 4: zwei Viertel; die Ganze beginnt dann auf der 2: punktierte Halbe + Viertel
  assert.deepEqual(s.ev.map((e) => [e.p, e.v, !!e.dot, !!e.tie]), [['c1', 4, false, false], ['d1', 4, false, false], ['e1', 4, false, false], ['f1', 4, false, true], ['f1', 4, false, false], ['g1', 2, true, true], ['g1', 4, false, false]]);
});

test('songToMelody: Noten werden Farbpunkte, Takte bleiben in einer Zeile', () => {
  // 4/4 in G-Dur: f' klingt als fis' (Fis), Haltebogen über zwei Viertel wird eine Halbe, a'' liegt außerhalb
  const s = { meter: '4/4', pickup: 0, key: 1, ev: [n('c1'), n('d1', 4, { tie: 1 }), n('d1'), n('f1'), n('c2', 2), n('a2', 2, { bar: 3 }), n('e1', 16), { v: 4 }] };
  const m = songToMelody(s, true);
  assert.equal(m.skipped, 1);
  assert.deepEqual(m.lines, [{ l: 0, m: '4/4' }]);
  assert.deepEqual(m.rows[0], [
    { n: 'C', h: '', d: 1 }, { n: 'D', h: '', d: 2 }, { n: 'Fis', h: '', d: 1 },
    { n: 'C+', h: '', d: 2 }, { k: 'r', d: 2 },
    { n: 'E', h: '', d: 0.5, bar: 3 }, { k: 'r', d: 1 } // Sechzehntel wird Achtel; :‖ steht vor dem nächsten Platz
  ]);
  // Zehn Schläge pro Zeile: drei 4/4-Takte verteilen sich auf zwei Zeilen (2 + 1)
  const long = { meter: '4/4', pickup: 0, key: 0, ev: Array.from({ length: 12 }, () => n('g1')) };
  assert.deepEqual(songToMelody(long, true).rows.map((r) => r.length), [8, 4]);
});

test('Haltebogen: gültig nur mit Folgenote gleicher Tonhöhe und gleichen Vorzeichens', () => {
  assert.equal(canTie(n('c1'), n('c1')), true);
  assert.equal(canTie(n('c1'), n('d1')), false);
  assert.equal(canTie(n('c1'), r()), false);
  assert.equal(canTie(r(), n('c1')), false);
  assert.equal(canTie(n('f1', 4, { acc: 1 }), n('f1')), false);
  assert.equal(canTie(n('f1', 4, { acc: 1 }), n('f1', 4, { acc: 1 })), true);
  assert.equal(tieValidAt([n('c1', 4, { tie: 1 }), n('c1')], 0), true);
  assert.equal(tieValidAt([n('c1', 4, { tie: 1 }), n('d1')], 0), false);
  assert.equal(tieValidAt([n('c1'), n('c1')], 0), false);
});

test('toggleTieAt: einen Bogen nur setzen, wenn er klingen würde', () => {
  // Letzte Note, Pause danach und ein anders klingender Folgeton bekommen keinen Bogen
  const last = [n('c1')];
  assert.equal(toggleTieAt(last, 0), false);
  assert.equal(last[0].tie, undefined);
  const rest = [n('c1'), r()];
  assert.equal(toggleTieAt(rest, 0), false);
  assert.equal(rest[0].tie, undefined);
  const other = [n('c1'), n('d1')];
  assert.equal(toggleTieAt(other, 0), false);
  assert.equal(other[0].tie, undefined);
  // Gleicher Ton: setzen und wieder wegnehmen
  const ok = [n('c1'), n('c1')];
  assert.equal(toggleTieAt(ok, 0), true);
  assert.equal(ok[0].tie, 1);
  assert.equal(toggleTieAt(ok, 0), true);
  assert.equal(ok[0].tie, undefined);
  // Ein (alter) ungültiger Bogen lässt sich wegnehmen
  const stale = [n('c1', 4, { tie: 1 }), n('d1')];
  assert.equal(tieValidAt(stale, 0), false);
  assert.equal(toggleTieAt(stale, 0), true);
  assert.equal(stale[0].tie, undefined);
});

test('changePitch: Ziehen lässt keinen ungültigen Bogen zurück', () => {
  const ev = [n('c1', 4, { tie: 1 }), n('c1'), n('e1', 4, { tie: 1 }), n('e1')];
  // Die Note davor war an c' gebunden; d' passt nicht mehr
  assert.equal(changePitch(ev, 1, 'd1'), true);
  assert.equal(ev[1].p, 'd1');
  assert.equal(ev[0].tie, undefined);
  // Der Bogen der gezogenen Note selbst fällt weg, wenn die Folgenote anders klingt
  const own = [n('c1'), n('e1', 4, { tie: 1 }), n('e1')];
  assert.equal(changePitch(own, 1, 'f1'), true);
  assert.equal(own[1].tie, undefined);
  // Ziehen auf denselben Ton ändert nichts
  assert.equal(changePitch(own, 0, 'c1'), false);
});

test('swapEvents: Tauschen lässt keinen ungültigen Bogen zurück, Marken bleiben', () => {
  const ev = [n('c1', 4, { tie: 1 }), n('c1'), n('d1')];
  assert.equal(swapEvents(ev, 1, 2), true);
  assert.deepEqual(ev.map((e) => e.p), ['c1', 'd1', 'c1']);
  assert.equal(ev[0].tie, undefined); // c' vor d' klingt nicht zusammen
  // Bogen an der tauschenden Note selbst wird geprüft
  const own = [n('c1'), n('e1', 4, { tie: 1 }), n('e1')];
  swapEvents(own, 0, 1);
  assert.deepEqual(own.map((e) => e.p), ['e1', 'c1', 'e1']);
  assert.equal(own[0].tie, undefined);
  // Taktstrich und Umbruch bleiben an ihrer Stelle; der Bogen der getauschten Note passt danach nicht mehr
  const marks = [n('c1', 4, { bar: 1, brk: 1 }), n('d1', 4, { tie: 1 }), n('d1')];
  swapEvents(marks, 0, 1);
  assert.deepEqual(marks[0], { p: 'd1', v: 4, bar: 1, brk: 1 });
  assert.deepEqual(marks[1], { p: 'c1', v: 4 });
});

test('Abspielen: ein ungültiger Bogen verlängert nichts, die Note schlägt neu an', () => {
  // Bogen steht vor einer Pause bzw. vor einem anderen Ton
  const p = playPlan({ meter: '4/4', ev: [n('c1', 4, { tie: 1 }), r(), n('c1'), n('d1', 4, { tie: 1 }), n('e1')] });
  assert.deepEqual(p.items.map((s) => s.sound), ['piano', '', 'piano', 'piano', 'piano']);
});

test('cleanSong: Tuch (cv, cf) und ?-Karten (q) bleiben erhalten, Unsinn fällt weg', () => {
  const s = cleanSong({ meter: '4/4', pickup: 0, ev: [{ p: 'c1', v: 4, q: 1, qn: 2 }, { p: 'd1', v: 4, cv: 1, cf: 1 }, { v: 4, q: 2, qn: 1 }, { p: 'e1', v: 4, q: 7 }] });
  // qn (Karte über dem Notennamen) gibt es nur bei Noten
  assert.deepEqual(s.ev, [{ p: 'c1', v: 4, q: 1, qn: 2 }, { p: 'd1', v: 4, cv: 1, cf: 1 }, { v: 4, q: 2 }, { p: 'e1', v: 4 }]);
});
