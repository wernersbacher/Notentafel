// Darstellung der Tafel
import { MAX_LEN, NOTE_BY, DUR_BY } from './config.js';
import { isNote, isBeat, isRest, dur, beams, lineSpan, hasMeter } from './model.js';
import { autoMarks, barAt } from './theory.js';
import { S, settings } from './state.js';
import { colorStyle, noteLabel, noteSym, restSym, meterHTML } from './symbols.js';
import { el } from './dom.js';

const NO_MARKS = { b: {}, z: [] };

// Alle Zeilen haben so viele Plätze wie die längste Zeile plus einen freien Platz.
// Kürzere Zeilen zeigen dahinter blasse Plätze, über die man auch Pausen setzen kann.
function colCount() {
  let n = S.sel.c + 1;
  S.rows.forEach((row) => { n = Math.max(n, row.length + 1); });
  return Math.min(n, MAX_LEN);
}

/* ---------- Breite nach Notenlänge ---------- */
// Ein Platz belegt so viele Achtel-Spalten, wie er dauert (leer = ein Schlag).
const spanOf = (x) => Math.round(dur(x) * 2);
const rowUnits = (row) => row.reduce((u, x) => u + spanOf(x), 0);
// Gezählt wird in Spalten: die längste Zeile plus ein freier Schlag, mindestens bis zur Markierung,
// aufgerundet auf ganze Schläge.
function unitCount() {
  let n = 0;
  S.rows.forEach((row, r) => {
    const extra = r === S.sel.r && S.sel.c >= row.length ? (S.sel.c - row.length + 1) * 2 : 2;
    n = Math.max(n, rowUnits(row) + extra);
  });
  return n + n % 2;
}
// Breite der Spalten einer Zeile in --L, aufsummiert (P[u] = Breite aller Spalten vor u). Ein Schlag ist einen Kreis breit (2 × 1).
// Beginnt in der Zeile auf diesem Schlag eine Achtel oder ein Zeichen zwischen den Schlägen, wird er zwei Kreise breit (2 × 2).
function colFrs(cols, row) {
  const wide = [], P = [0];
  let u = 0;
  row.forEach((x) => {
    const k = spanOf(x);
    if (k === 1 || u % 2) wide[u >> 1] = true;
    u += k;
  });
  for (u = 0; u < cols; u++) P.push(P[u] + (wide[u >> 1] ? 2 : 1));
  return P;
}
// geo (nur bei Breite nach Notenlänge): u0 = erste Achtel-Spalte des Platzes, k = Anzahl Spalten, P = aufsummierte Spaltenbreiten.
// Liefert den Anteil des Platzes, der vor Achtel o liegt.
const geoFrac = (geo, o) => (geo.P[geo.u0 + o] - geo.P[geo.u0]) / (geo.P[geo.u0 + geo.k] - geo.P[geo.u0]);

/* ---------- Ein Platz ---------- */
function countsHTML(zz, geo) {
  if (!zz || !zz.length) return '<span class="zz"></span>';
  // Mit Breite nach Notenlänge stehen gehaltene Zählzeiten an ihrer Stelle, sonst alle zusammen unter dem Zeichen
  return '<span class="zz' + (!geo && zz.length > 4 ? ' many' : '') + '">' + zz.map((x) => {
    if (geo && x.o) return '<span class="held at" style="--t:' + geoFrac(geo, x.o).toFixed(4) + '">' + x.t + '</span>';
    return '<span' + (x.held ? ' class="held"' : '') + '>' + x.t + '</span>';
  }).join('') + '</span>';
}
// beam: 1 = Achtel mit Balken zur nächsten, 2 = Achtel am Ende eines Balkens.
// line: Lage auf der Notenlinie der Zeile ('first', 'mid', 'last', 'one' oder leer). meter: Taktart vor dem Platz.
// marks: automatische Taktstriche und Zählzeiten der Zeile.
function cellHTML(cell, r, c, { beyond, beam, line, meter, marks, geo }) {
  const isSel = S.sel.r === r && S.sel.c === c;
  const where = 'Zeile ' + (r + 1) + ', Platz ' + (c + 1);
  let dot, label, len = '', stackCls = '';
  if (isNote(cell)) {
    const n = NOTE_BY[cell.n];
    dot = '<div class="dot' + (n.up ? ' up' : '') + '" style="' + colorStyle(n) + '">' + noteLabel(n) + '</div>';
    label = where + ': ' + n.n + (cell.d ? ', ' + DUR_BY[cell.d].n : '') + (cell.h === 'r' ? ', rechts' : cell.h === 'l' ? ', links' : '');
    if (cell.d) len = noteSym(cell.d, beam);
  } else if (isBeat(cell)) {
    dot = '<div class="dot beat">' + noteSym(cell.d, beam) + '</div>';
    label = where + ': ' + DUR_BY[cell.d].n;
    if (beam === 1) stackCls = ' bbeam';
  } else if (isRest(cell)) {
    dot = '<div class="dot rest">' + restSym(cell.d) + '</div>';
    label = where + ': ' + DUR_BY[cell.d].p;
  } else {
    dot = '<div class="dot ghost"></div>';
    label = where + ': leer';
  }
  const a = marks || NO_MARKS;
  const bar = barAt(cell, c, a, settings.autoBar);
  const zz = settings.autoZ ? a.z[c] : (cell && cell.z ? cell.z.split(' ').map((t) => ({ t })) : null);
  if (bar) label += bar === 2 ? ', Schlussstrich davor' : ', Taktstrich davor';
  if (zz && zz.length) label += ', gezählt ' + zz.map((x) => x.t === '+' ? 'und' : x.t).join(' ');
  const hand = (isNote(cell) && cell.h) ? '<span class="hand ' + cell.h + '">' + cell.h + '</span>' : '<span class="hand"></span>';
  // Der Kreis vorn ist immer 2fr breit; --f ist sein Anteil am ganzen Platz
  const span = geo ? ' style="grid-column:span ' + geo.k + ';--f:' + (2 / (geo.P[geo.u0 + geo.k] - geo.P[geo.u0])).toFixed(4) + '"' : '';
  return '<div class="cell' + (isSel ? ' sel' : '') + (beyond ? ' beyond' : '') +
    (line ? ' line-' + line : '') + (meter ? ' has-meter' : '') + '"' + span + ' data-r="' + r + '" data-c="' + c + '" role="button" tabindex="0" aria-label="' + label + '">' +
    '<div class="stack' + stackCls + '">' + (meter ? '<span class="meter" aria-label="Taktart ' + meter + '">' + meterHTML(meter) + '</span>' : '') +
    (bar ? '<span class="barline' + (bar === 2 ? ' final' : '') + '"></span>' : '') + dot +
    '<span class="len' + (beam === 1 && isNote(cell) ? ' beam' : '') + '">' + len + '</span>' + countsHTML(zz, geo) + hand + '</div></div>';
}

/* ---------- Eine Zeile ---------- */
// P: Spaltenbreiten (nur bei Breite nach Notenlänge), cols: Plätze bzw. Achtel-Spalten der Tafel
function rowHTML(row, r, cols, P, marks) {
  const prop = !!P, b = beams(row), last = row.line ? lineSpan(row) : -1;
  // Steht direkt hinter dem letzten Zeichen ein Takt- oder Schlussstrich, läuft die Linie bis dorthin
  const toBar = last >= 0 && barAt(row[last + 1], last + 1, marks, settings.autoBar) > 0;
  let cells = '';
  // u: belegte Achtel-Spalten (nur bei Breite nach Notenlänge); leere Plätze hinter dem Zeilenende sind
  // einen Schlag breit, nach einer einzelnen Achtel erst eine halbe, damit sie wieder auf den Schlägen stehen
  for (let c = 0, u = 0; prop ? u < cols && c < MAX_LEN : c < cols; c++) {
    const beyond = c >= row.length;
    let geo = null;
    if (prop) {
      geo = { u0: u, k: beyond ? (u % 2 ? 1 : 2) : spanOf(row[c]), P };
      u += geo.k;
    }
    const line = c > last ? '' : last === 0 ? (toBar ? 'first' : 'one') : c === 0 ? 'first' : c === last && !toBar ? 'last' : 'mid';
    cells += cellHTML(row[c] || null, r, c, { beyond, beam: b[c], line, meter: c === 0 ? row.meter : '', marks, geo });
  }
  const tpl = prop ? ' style="--tpl:' + P.slice(1).map((x, u) => 'calc(var(--L) * ' + (x - P[u]) + ')').join(' ') + '"' : '';
  return '<div class="row"' + tpl + '><span class="rownum">' + (r + 1) + '</span>' + cells + '</div>';
}

export function renderBoard() {
  const grid = el.grid, prop = settings.prop, cols = prop ? unitCount() : colCount();
  grid.classList.toggle('prop', prop);
  const Ps = prop ? S.rows.map((row) => colFrs(cols, row)) : null;
  if (prop) grid.style.setProperty('--fr', Math.max(...Ps.map((P) => P[cols])));
  grid.style.setProperty('--rows', S.rows.length);
  grid.style.setProperty('--cols', cols);
  // Steht irgendwo eine Taktart, bekommt die Spalte vor den Plätzen in allen Zeilen Platz dafür
  grid.classList.toggle('meters', hasMeter(S.rows));
  grid.classList.toggle('inserting', S.insertMode);
  grid.classList.toggle('clean', S.clean);
  grid.classList.toggle('nolen', !settings.lens);
  const auto = autoMarks(S.rows, settings.autoBar || settings.autoZ);
  // Platz für Zählzeiten nur, wenn welche zu sehen sind
  grid.classList.toggle('counts', settings.autoZ ? auto.any : S.rows.some((row) => row.some((x) => x && x.z)));
  grid.innerHTML = S.rows.map((row, r) => rowHTML(row, r, cols, Ps && Ps[r], auto.rows[r])).join('');
  // Passt die Tafel nicht mehr in die Breite, darf man sie seitlich wischen
  grid.classList.toggle('wide', el.board.scrollWidth > el.board.clientWidth + 1);
}

export const cellEl = (r, c) => el.grid.querySelector('.cell[data-r="' + r + '"][data-c="' + c + '"]');

// Hebt beim Abspielen den gerade klingenden Platz hervor (pos = null: keinen)
export function markPlaying(pos) {
  const old = el.grid.querySelector('.cell.playing');
  if (old) old.classList.remove('playing');
  const cur = pos && cellEl(pos.r, pos.c);
  if (cur) cur.classList.add('playing');
}
