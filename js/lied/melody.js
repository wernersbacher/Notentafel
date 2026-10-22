// Lied als Melodie übernehmen und transponieren. Kennt theory.js und measures.js.
import {
  ticks, isNote, parsePitch, makePitch, accOf, keyAcc, SEMI, QUARTER, OCT_MIN, OCT_MAX, KEY_MIN, KEY_MAX
} from './theory.js';
import { barsAfter, tiedFrom } from './measures.js';

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

/* ---------- Transponieren ---------- */
// Grundton (Stufe) der Dur-Tonart k: eine Quinte sind vier Stufen
const rootStep = (k) => ((k * 4) % 7 + 7) % 7;
// Das ganze Lied um semis Halbtöne höher (positiv) oder tiefer. Die Tonart wandert mit (die mit den wenigsten
// Vorzeichen), jede Note um dasselbe Intervall, richtig geschrieben in der neuen Tonart. null, wenn ein Ton aus dem
// Tonvorrat c bis h''' fiele.
export function transpose(song, semis) {
  const k0 = song.key || 0;
  let k = null;
  for (let c = KEY_MIN; c <= KEY_MAX; c++) {
    if (((c - k0 - 7 * semis) % 12 + 12) % 12 === 0 && (k === null || Math.abs(c) < Math.abs(k))) k = c;
  }
  let ds = rootStep(k) - rootStep(k0);
  if (semis > 0 && ds < 0) ds += 7;
  if (semis < 0 && ds > 0) ds -= 7;
  const ev = [];
  for (const e of song.ev) {
    if (!isNote(e)) { ev.push({ ...e }); continue; }
    const { step, oct } = parsePitch(e.p), target = oct * 12 + SEMI[step] + accOf(e, k0) + semis;
    let d = oct * 7 + step + ds;
    let acc = target - (Math.floor(d / 7) * 12 + SEMI[d % 7]);
    // Doppelte Vorzeichen vermeiden: dann den Nachbarton nehmen
    if (acc > 1) { d += 1; acc = target - (Math.floor(d / 7) * 12 + SEMI[d % 7]); }
    if (acc < -1) { d -= 1; acc = target - (Math.floor(d / 7) * 12 + SEMI[d % 7]); }
    const o = Math.floor(d / 7);
    if (o < OCT_MIN || o > OCT_MAX) return null;
    const n = { ...e, p: makePitch(d % 7, o) };
    if (acc === keyAcc(k, d % 7)) delete n.acc; else n.acc = acc;
    ev.push(n);
  }
  return { ...song, key: k, ev };
}
