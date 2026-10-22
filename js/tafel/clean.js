// Gespeicherte Stände der Tafel prüfen. Alle Funktionen hier sind rein; die Zell-Grundbegriffe kommen aus cells.js.
import { MAX_LEN, MAX_ROWS, NOTE_BY, DUR_BY, METERS } from './config.js';
import { trimRow } from './cells.js';

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
  if (c.bar) { o = o || {}; o.bar = [2, 3, 4, 5].includes(c.bar) ? c.bar : 1; }
  // ?-Karte über einem Ton oder Zeichen: 1 verdeckt, 2 aufgedeckt (bleibt eine Karte für „neu abdecken“)
  if (o && (o.n || o.k) && (c.q === 1 || c.q === 2)) o.q = c.q;
  return o;
}
// Zeilen-Eigenschaften line, meter und das Tuch: cover (ab dieser Zeile ist jetzt abgedeckt) und coverFrom (hier lag
// das Tuch am Anfang, dorthin kommt es mit „neu abdecken“), dazu fold (eingeklappt). Gespeichert als lines: pro Zeile
// 0, 1 (nur Linie, älteres Format) oder { l, m, c, f, k, h }. hide (h): die Zeile des Rhythmus-Echos ist noch nicht
// aufgelöst und erscheint leer (siehe board.js).
export function attachLines(rs, lines) {
  rs.forEach((row, r) => {
    const v = Array.isArray(lines) ? lines[r] : 0;
    row.line = v === 1 || !!(v && v.l);
    row.meter = v && METERS.includes(v.m) ? v.m : '';
    if (v && v.c) row.cover = true; else delete row.cover;
    if (v && v.f) row.coverFrom = true; else delete row.coverFrom;
    if (v && v.k) row.fold = true; else delete row.fold;
    if (v && v.h) row.hide = true; else delete row.hide;
  });
  return rs;
}
export function packLines(rs) {
  return rs.map((row) => {
    if (!row.meter && !row.cover && !row.coverFrom && !row.fold && !row.hide) return row.line ? 1 : 0;
    const o = { l: row.line ? 1 : 0, m: row.meter };
    if (row.cover) o.c = 1;
    if (row.coverFrom) o.f = 1;
    if (row.fold) o.k = 1;
    if (row.hide) o.h = 1;
    return o;
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
