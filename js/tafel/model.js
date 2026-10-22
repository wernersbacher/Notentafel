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
import { MAX_LEN, MAX_ROWS, START_ROWS, NOTE_BY, DUR_BY, METERS, DOTTED } from './config.js';

export const isNote = (c) => !!(c && c.n);
export const isBeat = (c) => !!(c && c.k === 'b');
export const isRest = (c) => !!(c && c.k === 'r');
export const filled = (c) => isNote(c) || !!(c && c.k);
export const sounds = (c) => isNote(c) || isBeat(c);
export const dur = (c) => (c && c.d) || 1;
// Länge eines Platzes in Sechzehnteln (so viele Spalten belegt er auf der Tafel; ein Schlag sind vier)
export const units = (c) => Math.round(dur(c) * 4);
// Belegte Zeit eines Platzes: Ein Platz, der nur einen Strich trägt, ist keine Zeit, sondern eine Markierung – er zählt
// nichts (sonst schöbe er beim Umbrechen einen Geisterschlag in die Zeile). Ein leerer Platz bleibt ein stiller Schlag.
export const cellUnits = (c) => (!filled(c) && c && c.bar ? 0 : units(c));
// Belegte Sechzehntel einer Zeile bzw. bis zum Platz c: die eine Zählung für Zeilenbreite, Umbruch und volle Zeile
export const rowUnits = (row) => row.reduce((u, c) => u + cellUnits(c), 0);
export const rowUnitsAt = (row, c) => rowUnits(row.slice(0, c + 1));
// Ist die Zeile bis zum Platz c voll? cap Schläge je Zeile (ein Schlag sind vier Sechzehntel).
export const rowFullAt = (row, c, cap) => rowUnitsAt(row, c) >= 4 * cap;
// Passt ein neues Zeichen noch ans Ende der Zeile?
export const fitsInRow = (row, v, cap) => rowUnits(row) + units(v) <= 4 * cap;
// Breite der Tafel in --L: die breiteste Zeile; ohne Zeilen der CSS-Standard (--fr: 2 statt -Infinity)
export const widest = (widths) => (widths.length ? Math.max(...widths) : 2);

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
// Achtel und Sechzehntel hintereinander bekommen einen gemeinsamen Balken, solange sie im selben Schlag liegen (zwei
// Achtel, vier Sechzehntel, eine Achtel und zwei Sechzehntel …; beat: Länge eines Schlags in Vierteln, im 6/8-Takt 1,5)
// – bunte Punkte untereinander, eigenständige Notenzeichen untereinander. Gezählt wird vom Zeilenanfang (dort beginnt ein
// Takt). b[c] = 1: mit Balken zur nächsten, 2: am Ende eines Balkens.
export function beams(row, beat = 1) {
  const b = [], at = [];
  const short = (x) => !!(x && x.d < 1 && (isNote(x) || isBeat(x)));
  row.reduce((t, x, c) => { at[c] = t; return t + dur(x); }, 0);
  for (let c = 0; c < row.length; c++) {
    if (!short(row[c])) continue;
    const end = (Math.floor(at[c] / beat + 1e-9) + 1) * beat + 1e-9;
    let k = c;
    while (short(row[k + 1]) && isNote(row[k + 1]) === isNote(row[c]) && at[k + 1] + row[k + 1].d <= end) k++;
    if (k > c) { for (let j = c; j < k; j++) b[j] = 1; b[k] = 2; }
    c = k;
  }
  return b;
}
// Zweiter Balken der Sechzehntel in einer Balkengruppe (b aus beams): s[c] = 1 durchgehend zur nächsten Sechzehntel,
// 3 kurzer Ansatz nach rechts, 4 nach links (eine einzelne Sechzehntel neben Achteln)
export function subBeams(row, b) {
  const s = [], sixteenth = (c) => !!(b[c] && row[c] && row[c].d === 0.25);
  for (let c = 0; c < row.length; c++) {
    if (!sixteenth(c)) continue;
    if (b[c] === 1 && sixteenth(c + 1)) s[c] = 1;
    else if (!(b[c - 1] === 1 && sixteenth(c - 1))) s[c] = b[c] === 1 ? 3 : 4;
  }
  return s;
}

// Rhythmussprache unter einem Notenzeichen: Viertel ta, Halbe taja, punktierte Halbe tajaja, Ganze tajajaja; jede
// Achtel ti (zwei mit Balken verbindet auf der Tafel ein Bogen); Sechzehntel ti ri ti ri – ri steht auf der zweiten
// Sechzehntel einer Achtel (odd). Pausen und leere Plätze: nichts.
const SYL = { 1: 'ta', 1.5: 'tai', 2: 'taja', 3: 'tajaja', 4: 'tajajaja' };
// Verteilt auf die Schläge (bei Breite nach Notenlänge): [Silbe, Abstand in Sechzehnteln] – Halbe ta (Schlag 1) ja
// (Schlag 2), punktierte Halbe ta ja ja, Ganze ta ja ja ja; alles andere eine Silbe am Anfang
export function syllableParts(c, beam, odd) {
  if ((isBeat(c) || isNote(c)) && c.d === 1.5) return [['ta', 0], ['i', 4]]; // punktierte Viertel: ta (i auf dem Schlag danach)
  const n = isBeat(c) || (isNote(c) && c.d) ? Math.round(c.d) : 0;
  if (n < 2) { const s = syllable(c, beam, odd); return s ? [[s, 0]] : []; }
  return Array.from({ length: n }, (_, k) => [k ? 'ja' : 'ta', k * 4]);
}
export function syllable(c, beam, odd) {
  if (!(isBeat(c) || (isNote(c) && c.d))) return '';
  if (c.d === 0.5) return 'ti';
  if (c.d === 0.25) return odd ? 'ri' : 'ti';
  return SYL[c.d] || '';
}

/* ---------- Abspielen ---------- */
// Reihenfolge, in der die Plätze erklingen ([{ r, c }]), Wiederholungen ausgeschrieben: An einem :‖ geht es einmal zurück
// zum letzten ‖: (sonst zum Anfang). Ein leerer Platz am Zeilenende, der nur einen Strich trägt, ist kein Schlag.
export function playOrderRows(rows) {
  const seq = [];
  rows.forEach((row, r) => row.forEach((x, c) => {
    seq.push({ r, c, bar: x && x.bar ? x.bar : 0, mark: !filled(x) && !!(x && x.bar) && c === row.length - 1 });
  }));
  const order = [], done = new Set();
  let k = 0, start = 0;
  while (k < seq.length) {
    const s = seq[k];
    if ((s.bar === 3 || s.bar === 5) && !done.has(k)) { done.add(k); k = start; continue; }
    if (s.bar === 4 || s.bar === 5) start = k;
    if (!s.mark) order.push({ r: s.r, c: s.c });
    k++;
  }
  return order;
}

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
      if (!filled(c) && c && c.bar) return;
      const [v, dot] = LIED_VALUE[dur(c)] || [4];
      const o = isNote(c) ? { p: LIED_PITCH[c.n][0], v } : isBeat(c) ? { p: 'h1', v } : { v };
      if (isNote(c) && LIED_PITCH[c.n][1]) o.acc = LIED_PITCH[c.n][1];
      if (dot) o.dot = 1;
      ev.push(o);
    });
    if (ev.length > first) ev[ev.length - 1].brk = 1;
  });
  if (ev.length) { delete ev[ev.length - 1].brk; ev[ev.length - 1].bar = 2; }
  return { meter: (rows.find((row) => row.meter) || {}).meter || '', pickup: 0, key: 0, ev };
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
