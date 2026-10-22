// Gemeinsames Format zwischen Tafel und Lied: die Tafel als Lied (rowsToSong) und das Lied als Melodie auf der Tafel
// (songToMelody). Beide Richtungen gehören zusammen; deshalb liegt dieses Modul ganz oben unter js/ und nicht in einem
// Bereich. Die Bereiche hängen weiterhin nicht voneinander ab: tafel/ und lied/ importieren von hier nur, um die beiden
// Funktionen aus ihren bisherigen Stellen (tafel/model.js, lied/melody.js) unverändert weiterzureichen, und dieses Modul
// liest aus beiden Bereichen (Zellbegriffe aus tafel/cells.js, Tonhöhen und Takte aus lied/theory.js und lied/measures.js).
import { isNote, parsePitch, accOf, ticks, QUARTER } from './lied/theory.js';
import { barsAfter, tiedFrom } from './lied/measures.js';
import * as tafelCell from './tafel/cells.js';

/* ---------- Ins Lied übernehmen ---------- */
// Tonhöhe im Lied ('c1' = c') und Vorzeichen zu jedem bunten Punkt
const LIED_PITCH = { C: ['c1'], D: ['d1'], E: ['e1'], F: ['f1'], G: ['g1'], A: ['a1'], H: ['h1'],
  'C+': ['c2'], 'D+': ['d2'], 'E+': ['e2'], 'F+': ['f2'], Fis: ['f1', 1], B: ['h1', -1],
  Cis: ['c1', 1], Dis: ['d1', 1], Gis: ['g1', 1], 'Cis+': ['c2', 1], 'Dis+': ['d2', 1] };
// Länge in Schlägen als Notenwert im Lied [v, dot]
const LIED_VALUE = { 0.25: [16], 0.5: [8], 1: [4], 1.5: [4, 1], 2: [2], 3: [2, 1], 4: [1] };
// Die Tafel als Lied (Format wie in lied/model.js): bunte Punkte werden Noten auf ihrer Tonhöhe, eigenständige
// Notenzeichen Noten auf der Mittellinie (h'), Pausen und leere Plätze Pausen. Ein Platz mit nur einem Strich ist kein
// Schlag und wird übergangen. Jede Zeile endet mit einem Umbruch, das letzte Zeichen mit einem Schlussstrich; die
// Taktart ist die erste der Tafel.
export function rowsToSong(rows) {
  const ev = [];
  rows.forEach((row) => {
    if (!row.some(Boolean)) return;
    const first = ev.length; // wo die Zeile beginnt: ein Strich allein darf keinen Umbruch an die Zeile davor hängen
    row.forEach((c) => {
      // Ein Platz, der nur einen Strich trägt (z. B. der Schlussstrich am Zeilenende), ist kein Schlag: Er wird kein Ton
      // und keine Pause, sonst klänge an jedem Zeilenende eine Viertelpause.
      if (!tafelCell.filled(c) && c && c.bar) return;
      const [v, dot] = LIED_VALUE[tafelCell.dur(c)] || [4];
      const o = tafelCell.isNote(c) ? { p: LIED_PITCH[c.n][0], v } : tafelCell.isBeat(c) ? { p: 'h1', v } : { v };
      if (tafelCell.isNote(c) && LIED_PITCH[c.n][1]) o.acc = LIED_PITCH[c.n][1];
      if (dot) o.dot = 1;
      ev.push(o);
    });
    if (ev.length > first) ev[ev.length - 1].brk = 1;
  });
  if (ev.length) { delete ev[ev.length - 1].brk; ev[ev.length - 1].bar = 2; }
  return { meter: (rows.find((row) => row.meter) || {}).meter || '', pickup: 0, key: 0, ev };
}

/* ---------- Als Melodie übernehmen ---------- */
// Farbnoten zu Stufe (0 = c) und Vorzeichen, je Oktave: c'–h' mit allen Halbtönen, c''–f'' mit Cis und Dis
// (Des wie Cis, Es wie Dis, Ges wie Fis, As wie Gis, Ais wie B)
const MEL_IDS = [
  { '0:0': 'C', '0:1': 'Cis', '1:-1': 'Cis', '1:0': 'D', '1:1': 'Dis', '2:-1': 'Dis', '2:0': 'E', '3:0': 'F', '3:1': 'Fis', '4:-1': 'Fis',
    '4:0': 'G', '4:1': 'Gis', '5:-1': 'Gis', '5:0': 'A', '5:1': 'B', '6:-1': 'B', '6:0': 'H' },
  { '0:0': 'C+', '0:1': 'Cis+', '1:-1': 'Cis+', '1:0': 'D+', '1:1': 'Dis+', '2:-1': 'Dis+', '2:0': 'E+', '3:0': 'F+' }
];
const MEL_BEATS = [0.5, 1, 1.5, 2, 3, 4];
const MEL_PER_ROW = 10; // Schläge pro Zeile der Melodie (wie MAX_PER_ROW in tafel/config.js)
const MEL_ROWS = 8;     // Zeilen der Tafel (wie MAX_ROWS)
// Nächste Länge, die die Melodie kennt (gleich weit: die längere)
const melBeats = (b) => MEL_BEATS.reduce((a, x) => (Math.abs(x - b) < Math.abs(a - b) || (Math.abs(x - b) === Math.abs(a - b) && x > a) ? x : a));
// Das Lied als Melodie (Format der Tafel: rows mit Plätzen, lines mit Taktart; siehe tafel/model.js). Jede Note wird ein
// Farbpunkt mit Notenwert, übergebundene Noten werden zu einer langen zusammengefasst, wenn es die Länge gibt. Töne
// außerhalb des Vorrats (c'–f'' mit Halbtönen) werden Pausen gleicher Länge, andere Längen gerundet. Takte bleiben zusammen in
// einer Zeile (höchstens 10 Schläge), ein Umbruch beginnt eine neue; Schluss- und Wiederholungsstriche kommen mit.
// Liefert { rows, lines, skipped (Töne als Pause), cut (Zeilen, die nicht mehr auf die Tafel passten) }.
export function songToMelody(song, autoBar = true) {
  const ev = song.ev, bars = barsAfter(song, autoBar), units = [];
  let skipped = 0;
  for (let i = 0; i < ev.length; i++) {
    const e = ev[i];
    let beats = ticks(e) / QUARTER, j = i;
    if (isNote(e)) {
      let more = beats, k = i;
      while (k + 1 < ev.length && tiedFrom(ev[k], ev[k + 1])) { k++; more += ticks(ev[k]) / QUARTER; }
      if (k > i && MEL_BEATS.includes(more)) { beats = more; j = k; }
    }
    const d = melBeats(beats);
    let cell = { k: 'r', d };
    if (isNote(e)) {
      const { step, oct } = parsePitch(e.p), id = (MEL_IDS[oct - 1] || {})[step + ':' + accOf(e, song.key || 0)];
      if (id) cell = { n: id, h: '', d }; else skipped++;
    }
    units.push({ cell, beats: d, bar: bars[j], brk: !!ev[j].brk });
    i = j;
  }
  // Takte (bis zu einem Strich oder Umbruch) zu Zeilen
  const rows = [[]];
  let beatsInRow = 0, chunk = [], chunkBeats = 0;
  const flush = (brk) => {
    if (chunk.length) {
      if (beatsInRow && beatsInRow + chunkBeats > MEL_PER_ROW) { rows.push([]); beatsInRow = 0; }
      rows[rows.length - 1].push(...chunk);
      beatsInRow += chunkBeats;
    }
    chunk = []; chunkBeats = 0;
    if (brk && rows[rows.length - 1].length) { rows.push([]); beatsInRow = 0; }
  };
  units.forEach((u) => {
    chunk.push(u); chunkBeats += u.beats;
    if (u.bar || u.brk) flush(u.brk);
  });
  flush(false);
  if (!rows[rows.length - 1].length) rows.pop();
  // Striche: im Lied hinter einem Zeichen, auf der Tafel vor dem nächsten Platz (am Zeilenende ein leerer Platz mit Strich)
  const out = rows.slice(0, MEL_ROWS).map((us) => {
    const cells = us.map((u) => ({ ...u.cell }));
    us.forEach((u, k) => {
      if (!u.bar || (u.bar === 1 && autoBar)) return;
      if (k + 1 < cells.length) cells[k + 1].bar = u.bar; else cells.push({ bar: u.bar });
    });
    return cells.slice(0, 32);
  });
  return { rows: out, lines: out.map((_, r) => (r === 0 && song.meter ? { l: 0, m: song.meter } : 0)), skipped, cut: Math.max(0, rows.length - MEL_ROWS) };
}
