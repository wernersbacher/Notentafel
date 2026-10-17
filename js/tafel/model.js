// Datenmodell der Tafel. Alle Funktionen hier sind rein: Sie arbeiten nur auf den übergebenen Zeilen.
//
// Die Tafel ist ein Array von Zeilen, jede Zeile ein Array von Plätzen. Ein Platz ist
//   null              leer (ein stiller Schlag innerhalb der Zeile)
//   { n, h, d? }      bunter Punkt; d nur, wenn ein Notenwert darunter ergänzt wurde (sonst ein Schlag)
//   { k: 'b', d }     eigenständiges Notenzeichen ohne Tonhöhe (klingt wie Klanghölzer)
//   { k: 'r', d }     Pause
// Jeder Platz kann zusätzlich bar tragen: 1 = Taktstrich davor, 2 = Schlussstrich davor; ein leerer Platz damit ist z. B. { bar: 1 }.
// Noten und Pausen können z tragen: von Hand getippte Zählzeiten, mit Leerzeichen getrennt (z. B. '1 2' oder '+').
// Zeilen-Eigenschaften stehen direkt am Zeilen-Array: line (Notenlinie) und meter (Taktart, z. B. '3/4').
import { MAX_LEN, MAX_ROWS, START_ROWS, NOTE_BY, DUR_BY, METERS } from './config.js';

export const isNote = (c) => !!(c && c.n);
export const isBeat = (c) => !!(c && c.k === 'b');
export const isRest = (c) => !!(c && c.k === 'r');
export const filled = (c) => isNote(c) || !!(c && c.k);
export const sounds = (c) => isNote(c) || isBeat(c);
export const dur = (c) => (c && c.d) || 1;

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
// Automatischer Umbruch: Hat Zeile r mehr als cap Plätze, rutscht der Überhang an den Anfang der nächsten Zeile
// (die neu angelegt wird, wenn es keine gibt, mit derselben Notenlinie), und so weiter. false, wenn die Tafel schon
// MAX_ROWS Zeilen hat und nichts mehr nach unten rutschen kann (der Überhang bleibt dann stehen).
export function reflow(rows, r, cap) {
  for (let i = r; i < rows.length && rows[i].length > cap; i++) {
    if (i + 1 >= rows.length) {
      if (rows.length >= MAX_ROWS) return false;
      rows.push(newRow(rows[i].line));
    }
    rows[i + 1].unshift(...rows[i].splice(cap));
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
// Leere Plätze am Zeilenende fallen weg (ein leerer Platz mit Taktstrich bleibt)
export function trimRow(row) {
  while (row.length && !row[row.length - 1]) row.pop();
}
// Letztes Zeichen der Zeile (-1, wenn keins); bis dorthin läuft z. B. die Notenlinie
export function lineSpan(row) {
  let last = -1;
  row.forEach((x, c) => { if (filled(x)) last = c; });
  return last;
}
// Zwei Achtel hintereinander bekommen einen gemeinsamen Balken – bunte Punkte untereinander, eigenständige Notenzeichen untereinander.
// b[c] = 1: Achtel mit Balken zur nächsten, 2: Achtel am Ende eines Balkens.
export function beams(row) {
  const b = [];
  const eighth = (x) => x && x.d === 0.5 && (isNote(x) || isBeat(x));
  for (let c = 0; c + 1 < row.length; c++) {
    const a = row[c], z = row[c + 1];
    if (eighth(a) && eighth(z) && isNote(a) === isNote(z)) { b[c] = 1; b[c + 1] = 2; c++; }
  }
  return b;
}

/* ---------- Gespeicherte Stände prüfen ---------- */
function cleanCell(c) {
  if (!c) return null;
  let o = null;
  if (c.n != null) {
    if (NOTE_BY[c.n]) {
      o = { n: c.n, h: (c.h === 'r' || c.h === 'l') ? c.h : '' };
      if (DUR_BY[c.d]) o.d = c.d;
    }
  } else if (DUR_BY[c.d]) o = { k: c.k === 'b' ? 'b' : 'r', d: c.d };
  if (o && typeof c.z === 'string' && /^[1-6+]( [1-6+]){0,5}$/.test(c.z)) o.z = c.z;
  if (c.bar) { o = o || {}; o.bar = c.bar === 2 ? 2 : 1; }
  return o;
}
// Zeilen-Eigenschaften line und meter. Gespeichert als lines: pro Zeile 0, 1 (nur Linie, älteres Format) oder { l, m }.
export function attachLines(rs, lines) {
  rs.forEach((row, r) => {
    const v = Array.isArray(lines) ? lines[r] : 0;
    row.line = v === 1 || !!(v && v.l);
    row.meter = v && METERS.includes(v.m) ? v.m : '';
  });
  return rs;
}
export function packLines(rs) {
  return rs.map((row) => {
    if (!row.meter) return row.line ? 1 : 0;
    return { l: row.line ? 1 : 0, m: row.meter };
  });
}
// Prüft gespeicherte Zeilen und liefert eine saubere Kopie (oder null).
// Ältere Stände hatten immer 8 Plätze pro Zeile; leere Plätze hinter dem letzten Ton fallen weg.
export function cleanRows(raw, lines) {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_ROWS) return null;
  if (raw.some((row) => !Array.isArray(row) || row.length > MAX_LEN)) return null;
  const rs = raw.map((row) => row.map(cleanCell));
  let lastRow = -1;
  rs.forEach((row, r) => { if (row.some(Boolean)) lastRow = r; });
  rs.forEach((row, r) => {
    if (r > lastRow) row.length = 0;
    else if (r === lastRow) trimRow(row);
  });
  return attachLines(rs, lines);
}
