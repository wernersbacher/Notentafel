// Datenmodell der Tafel. Alle Funktionen hier sind rein: Sie arbeiten nur auf den übergebenen Zeilen.
//
// Die Tafel ist ein Array von Zeilen, jede Zeile ein Array von Plätzen. Ein Platz ist
//   null              leer (ein stiller Schlag innerhalb der Zeile)
//   { n, h, d? }      bunter Punkt; d nur, wenn ein Notenwert darunter ergänzt wurde (sonst ein Schlag)
//   { k: 'b', d }     eigenständiges Notenzeichen ohne Tonhöhe (klingt wie Klanghölzer)
//   { k: 'r', d }     Pause
// Jeder Platz kann zusätzlich bar tragen (davor): 1 Taktstrich, 2 Schlussstrich, 3 Wiederholung Ende :‖, 4 Wiederholung
// Anfang ‖:, 5 beides :‖:; ein leerer Platz damit ist z. B. { bar: 1 } (am Zeilenende: der Strich hinter dem letzten Zeichen).
// Noten und Pausen können z tragen: von Hand getippte Zählzeiten, mit Leerzeichen getrennt (z. B. '1 2' oder '+').
// Zeilen-Eigenschaften stehen direkt am Zeilen-Array: line (Notenlinie) und meter (Taktart, z. B. '3/4').
//
// Dies ist die Fassade: Die Grundbegriffe der Zellen liegen in cells.js, Balken und Rhythmussprache in beams.js, die
// Abspielreihenfolge in play.js und das Prüfen gespeicherter Stände in clean.js. rowsToSong kommt aus dem gemeinsamen
// songformat.js (oberste Schicht, verbindet Tafel und Lied). Alles wird hier gesammelt, damit alle bestehenden Importe
// aus './model.js' unverändert bleiben.
import { MAX_ROWS, START_ROWS, DOTTED } from './config.js';
import { cellUnits, filled, isBeat, isNote, rowUnits } from './cells.js';

export * from './cells.js';
export * from './beams.js';
export * from './play.js';
export * from './clean.js';
export { rowsToSong } from '../songformat.js';

// Leere Tafel; line: alle Zeilen mit Notenlinie (Rhythmus)
export function emptyRows(line = false) {
  const rs = [];
  for (let i = 0; i < START_ROWS; i++) rs.push(newRow(line));
  return rs;
}
export function newRow(line = false) {
  const row = [];
  row.line = line;
  row.meter = '';
  return row;
}
// Automatischer Umbruch: Hat Zeile r mehr als cap Schläge (cap × 4 Sechzehntel; ein Strich-Platz zählt nichts), rutscht
// der Überhang an den Anfang der nächsten Zeile (die neu angelegt wird, wenn es keine gibt, mit derselben Notenlinie), und
// so weiter. Ein Zeichen, das selbst nicht mehr ganz hineinpasst, rutscht mit. false, wenn die Tafel schon MAX_ROWS
// Zeilen hat und nichts mehr nach unten rutschen kann (der Überhang bleibt dann stehen).
export function reflow(rows, r, cap) {
  const max = 4 * cap;
  for (let i = r; i < rows.length && rowUnits(rows[i]) > max; i++) {
    // Schnitt vor dem ersten Platz, der über die Zeile hinausreicht; das erste Zeichen bleibt in jedem Fall stehen
    let u = 0, cut = rows[i].length;
    for (let c = 0; c < rows[i].length; c++) {
      if (u + cellUnits(rows[i][c]) > max) { cut = Math.max(1, c); break; }
      u += cellUnits(rows[i][c]);
    }
    if (i + 1 >= rows.length) {
      if (rows.length >= MAX_ROWS) return false;
      rows.push(newRow(rows[i].line));
    }
    rows[i + 1].unshift(...rows[i].splice(cut));
  }
  return true;
}
export const hasNotes = (rows) => rows.some((row) => row.some(filled));
export const hasMeter = (rows) => rows.some((row) => row.meter);

// Platz hinter dem letzten Ton der letzten beschriebenen Zeile (Startposition)
export function appendPos(rows) {
  for (let r = rows.length - 1; r >= 0; r--) if (rows[r].some(Boolean)) return { r, c: rows[r].length };
  return { r: 0, c: 0 };
}
// Umbruch ohne neue Zeile: Hinter der Markierung steht nichts und die nächste Zeile ist leer
export function canStepDown(rows, sel) {
  return sel.c >= rows[sel.r].length && sel.r + 1 < rows.length && rows[sel.r + 1].length === 0;
}
// Gibt es für „löschen“ etwas zu tun? Ein Platz an der Markierung, sonst ein Zeichen davor (auch am Ende der Zeile darüber)
export function canCloseGap(rows, sel) {
  const row = rows[sel.r];
  return sel.c < row.length || row.length > 0 || (sel.r > 0 && rows[sel.r - 1].length > 0);
}
// Platz, den der Punkt ändert: der markierte, wenn er einen Notenwert mit Punkt-Möglichkeit hat (Halbe, Viertel oder schon
// punktiert), sonst – wenn dort nichts steht – der davor (gerade gesetzt). null, wenn keiner passt.
export function dotTargetIn(rows, sel) {
  const row = rows[sel.r], here = row[sel.c], before = row[sel.c - 1];
  const ok = (x) => !!(x && DOTTED[x.d] && (isNote(x) || isBeat(x)));
  return ok(here) ? here : !filled(here) && ok(before) ? before : null;
}
// Setzt einen Platz; liegt er hinter dem Zeilenende, wird die Lücke mit Pausen aufgefüllt
export function put(row, c, v) {
  while (row.length < c) row.push(null);
  row[c] = v;
}
// Ersetzt den Inhalt eines Platzes; ein Taktstrich davor bleibt stehen
export function setCell(row, c, v) {
  const prev = row[c];
  if (prev && prev.bar) { v = v || {}; v.bar = prev.bar; }
  put(row, c, v);
}
// Inhalt eines Platzes ohne Taktstrich (zum Verschieben)
export function content(c) {
  if (!filled(c)) return null;
  const o = {};
  for (const k in c) if (k !== 'bar') o[k] = c[k];
  return o;
}
// Letztes Zeichen der Zeile (-1, wenn keins); bis dorthin läuft z. B. die Notenlinie
export function lineSpan(row) {
  let last = -1;
  row.forEach((x, c) => { if (filled(x)) last = c; });
  return last;
}
