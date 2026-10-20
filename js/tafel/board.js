// Darstellung der Tafel
import { MAX_LEN, MAX_PER_ROW, RHY_PER_ROW, NOTE_BY, DUR_BY } from './config.js';
import { isNote, isBeat, isRest, units, beams, subBeams, lineSpan, hasMeter, syllable, syllableParts } from './model.js';
import { autoMarks, barAt, meterOf } from './theory.js';
import { meterParts } from './rhythms.js';
import { S, settings, wraps } from './state.js';
import { sideCollapsed } from '../core/shell.js';
import { follow } from '../core/ui.js';
import { stepHides } from '../core/player.js';
import { colorStyle, noteLabel, upArrow, noteSym, restSym, meterHTML } from './symbols.js';
import { el } from './dom.js';

const NO_MARKS = { b: {}, z: [] };
// Klassen der Striche vor einem Platz: Schluss, Wiederholung Ende, Anfang, beides
const BAR_CLS = { 2: ' final', 3: ' final rep-end', 4: ' final rep-start', 5: ' final rep-end rep-start' };


/* ---------- Breite nach Notenlänge ---------- */
// Jeder Schlag hat ein Feld: Ein Platz belegt so viele Sechzehntel-Spalten, wie er dauert (leer = ein Schlag); eine Halbe
// hält also das nächste Feld frei. Kürzere Zeilen zeigen dahinter blasse Plätze, über die man auch Pausen setzen kann.
const spanOf = units;
const rowUnits = (row) => row.reduce((u, x) => u + spanOf(x), 0);
// Auf ganze Schläge (vier Spalten) aufgerundet
const wholeBeats = (n) => n + (4 - n % 4) % 4;
// Gezählt wird in Spalten. Rhythmus: immer S.cap Schläge (mehr nur, wenn eine ältere Zeile länger ist). Melodie: die
// längste Zeile plus ein freier Schlag, mindestens bis zur Markierung, höchstens S.cap Schläge (außer ältere Zeilen),
// aufgerundet auf ganze Schläge.
function unitCount() {
  if (S.variant === 'rhy') {
    let n = 4 * S.cap;
    S.rows.forEach((row) => { if (rowUnits(row) > n) n = rowUnits(row) + 4; });
    return wholeBeats(n);
  }
  let n = 0;
  S.rows.forEach((row, r) => {
    const extra = r === S.sel.r && S.sel.c >= row.length ? (S.sel.c - row.length + 1) * 4 : 4;
    const u = rowUnits(row);
    n = Math.max(n, u > 4 * S.cap ? u + 4 : Math.min(u + extra, 4 * S.cap));
  });
  return wholeBeats(n);
}
// Breite der Spalten einer Zeile in --L, aufsummiert (P[u] = Breite aller Spalten vor u). Ein Schlag ist einen Kreis breit (4 × ½).
// Melodie: Beginnt in der Zeile auf diesem Schlag eine Achtel oder ein Zeichen zwischen den Schlägen, wird er zwei Kreise
// breit (4 × 1), damit die bunten Kreise nebeneinander passen. Rhythmus: Ein Schlag bleibt ein Feld, zwei Achtel teilen
// es sich; beginnt auf ihm eine Sechzehntel, wird er zwei Felder breit (die Sechzehntel stehen dann so weit auseinander
// wie sonst zwei Achtel).
function colFrs(cols, row) {
  const wide = [], P = [0], share = S.variant === 'rhy';
  let u = 0;
  row.forEach((x) => {
    const k = spanOf(x);
    if (share ? k === 1 || u % 2 : k < 4 || u % 4) wide[u >> 2] = true;
    u += k;
  });
  for (u = 0; u < cols; u++) P.push(P[u] + (wide[u >> 2] ? 1 : 0.5));
  return P;
}
// Mitte des Zeichens eines Platzes in --L: Ab einem Schlag Breite steht es vorn in seinem Platz (einen Kreis breit),
// in einem schmaleren Platz (Achtel, Sechzehntel im geteilten Feld) mittig darüber
const midOf = (geo) => geo.P[geo.u0] + Math.min(geo.P[geo.u0 + geo.k] - geo.P[geo.u0], 2) / 2;
// geo (nur bei Breite nach Notenlänge): u0 = erste Sechzehntel-Spalte des Platzes, k = Anzahl Spalten, P = aufsummierte
// Spaltenbreiten. Liefert den Anteil des Platzes, der vor Sechzehntel o liegt.
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
// marks: automatische Taktstriche und Zählzeiten der Zeile. Der erste Platz trägt die Zeilennummer (auf Höhe des Kreises).
// endBar: Taktstrich hinter dem Platz (letztes Zeichen einer vollen Zeile, hinter dem kein leerer Platz mehr kommt).
// Balken an einem verdeckten Achtel (?-Karte): beamCut – der Balken dieses Platzes endet in der Mitte, weil das Achtel
// danach verdeckt ist; beamIn – das Achtel davor ist verdeckt, sein Balken fehlt, also kommt die Hälfte bis hierher.
// bw: wie weit der Balken reicht (bis zum Hals des nächsten Zeichens, als Anteil eines Kreises); sub: zweiter Balken der
// Sechzehntel (siehe subBeams); odd: zweite Sechzehntel einer Achtel (Silbe ri); gin: in einer Balkengruppe, aber nicht
// am Anfang (kein eigenes Silbenfeld); reach: so weit reicht das Silbenfeld am Anfang einer Gruppe (in Platzbreiten).
function cellHTML(cell, r, c, { beyond, beam, line, meter, marks, geo, endBar, beamCut, beamIn, bw, sub, odd, gin, reach: greach }) {
  const isSel = S.sel.r === r && S.sel.c === c;
  const where = 'Zeile ' + (r + 1) + ', Platz ' + (c + 1);
  let dot, label, len = '', stackCls = '';
  if (isNote(cell)) {
    const n = NOTE_BY[cell.n];
    // Tonnamen-Quiz durch die Melodie: der Buchstabe erscheint erst, wenn der Punkt benannt ist; andersherum (Namen
    // zeigen, Farbe tippen) steht der Buchstabe auf weißem Punkt, die Farbe erscheint erst mit der Antwort
    const ask = S.quiz && !S.quiz.done.has(r + ',' + c), byName = ask && S.quiz.ask === 'name';
    dot = '<div class="dot' + (n.up ? ' up' : '') + (byName ? ' plain' : '') + '" style="' + colorStyle(n) + '">' + (ask && !byName ? upArrow(n) : noteLabel(n)) + '</div>';
    label = where + ': ' + (ask && !byName ? 'Farbpunkt' : n.n) + (cell.d ? ', ' + DUR_BY[cell.d].n : '') + (cell.h === 'r' ? ', rechts' : cell.h === 'l' ? ', links' : '');
    if (cell.d) len = noteSym(cell.d, beam);
  } else if (isBeat(cell)) {
    dot = '<div class="dot beat' + (cell.d < 4 ? ' stem' : '') + '">' + noteSym(cell.d, beam) + '</div>';
    label = where + ': ' + DUR_BY[cell.d].n;
    if (beam === 1) stackCls = ' bbeam' + (beamCut ? ' bhalf' : '');
    // Rhythmussprache steht in der Zeile unter dem Zeichen (die bei eigenständigen Notenzeichen sonst leer ist);
    // mit Breite nach Notenlänge auf die Schläge verteilt (Halbe: ta unter Schlag 1, ja unter Schlag 2)
    // Jede Silbengruppe liegt auf einem Farbfeld: ta, ti, ta ja (ja …) einer langen Note und ti ti zweier Achtel mit Balken
    // (das Feld der ersten reicht bis zur Mitte der zweiten, eine halbe Feldbreite weiter; die zweite hat keins).
    // Die Farbe zeigt den Notenwert (Klasse d1, d05, d2, d3, d4).
    if (settings.syl && S.variant === 'rhy') {
      const parts = geo ? syllableParts(cell, beam, odd) : [[syllable(cell, beam, odd), 0]];
      len = parts.map(([t, o]) => o ? '<span class="syl at" style="--t:' + geoFrac(geo, o).toFixed(4) + '">' + t + '</span>' : '<span class="syl">' + t + '</span>').join('');
      const reach = parts.length > 1 ? geoFrac(geo, parts[parts.length - 1][1]) : greach || 0;
      if (parts.length && !gin) len += '<span class="sgrp d' + String(cell.d).replace('.', '') + '" style="--w:' + reach.toFixed(4) + '"></span>';
    }
  } else if (isRest(cell)) {
    // Halbe liegen auf der Linie, die Ganze hängt darunter (das stellt das Zeichen selbst ein)
    dot = '<div class="dot rest">' + restSym(cell.d, !!line) + '</div>';
    label = where + ': ' + DUR_BY[cell.d].p;
  } else {
    dot = '<div class="dot ghost"></div>';
    label = where + ': leer';
  }
  const a = marks || NO_MARKS;
  const bar = barAt(cell, c, a, settings.autoBar);
  const zz = settings.autoZ ? a.z[c] : (cell && cell.z ? cell.z.split(' ').map((t) => ({ t })) : null);
  if (bar) label += [', Taktstrich davor', ', Schlussstrich davor', ', Wiederholung endet davor', ', Wiederholung beginnt davor', ', Wiederholung endet und beginnt davor'][bar - 1];
  if (zz && zz.length) label += ', gezählt ' + zz.map((x) => x.t === '+' ? 'und' : x.t).join(' ');
  const hand = (isNote(cell) && cell.h) ? '<span class="hand ' + cell.h + '">' + cell.h + '</span>' : '<span class="hand"></span>';
  // Der Kreis vorn ist immer 2fr breit; --f ist sein Anteil am ganzen Platz
  // Eine Achtel im geteilten Feld (Rhythmus) ist schmaler als ihr Zeichen: --f > 1, das Zeichen steht mittig über ihr
  const fr = geo ? 2 / (geo.P[geo.u0 + geo.k] - geo.P[geo.u0]) : 1;
  const span = geo ? ' style="grid-column:span ' + geo.k + ';--f:' + fr.toFixed(4) + '"' : '';
  // ?-Karte: verdeckt liegt sie über dem Zeichen; aufgedeckt ist nichts mehr zu sehen (sie bleibt für „neu abdecken“ gemerkt)
  const q = cell && cell.q;
  if (q === 1) label = where + ': verdeckt (antippen deckt auf)';
  return '<div class="cell' + (isSel ? ' sel' : '') + (q === 1 ? ' quiz' : '') + (beyond ? ' beyond' : '') + (fr > 1 ? ' half' : '') +
    (line ? ' line-' + line : '') + (meter ? ' has-meter' : '') + '"' + span + ' data-r="' + r + '" data-c="' + c + '" role="button" tabindex="0" aria-label="' + label + '">' +
    '<div class="stack' + stackCls + '"' + (bw ? ' style="--bw:' + bw.toFixed(4) + '"' : '') + '>' + (c === 0 ? '<span class="rnum" data-fold="' + r + '" aria-hidden="true">' + (r + 1) + '</span>' : '') + (meter ? '<span class="meter" aria-label="Taktart ' + meter + '">' + meterHTML(meter) + '</span>' : '') +
    (bar ? '<span class="barline' + (BAR_CLS[bar] || '') + '"></span>' : '') + (endBar ? '<span class="barline after"></span>' : '') + dot +
    '<span class="len' + (beam === 1 && isNote(cell) ? ' beam' : '') + '">' + len + '</span>' + countsHTML(zz, geo) + hand +
    (beamIn && isBeat(cell) ? '<span class="hbeam"></span>' : '') + (sub && isBeat(cell) ? '<span class="bm2 s' + sub + '"></span>' : '') + (q === 1 ? '<span class="qcard" aria-hidden="true">?</span>' : '') + '</div></div>';
}

/* ---------- Eine Zeile ---------- */
// P: aufsummierte Spaltenbreiten, cols: Achtel-Spalten der Tafel
function rowHTML(row, r, cols, P, marks) {
  // Rhythmus: die Notenlinie läuft wie im Lied über die ganze Zeile, sobald das erste Zeichen darin steht – oder eine
  // eigene Taktart (z. B. Rhythmus legen: Linie und Taktart stehen schon, bevor der erste Baustein liegt)
  const full = row.line && S.variant === 'rhy';
  // Taktart vorn: die eigene der Zeile, sonst die geltende (aus einer Zeile darüber), sobald in der Zeile etwas steht –
  // so steht sie nach jedem Umbruch wieder am Zeilenanfang
  const meter = row.meter || (row.some(Boolean) ? meterOf(S.rows, r) : '');
  const b = beams(row, meter === '6/8' ? 1.5 : 1), sub = subBeams(row, b), span = row.line ? lineSpan(row) : -1;
  const last = full && (span >= 0 || row.meter) ? Infinity : full ? -1 : span;
  // Steht direkt hinter dem letzten Zeichen ein Takt- oder Schlussstrich, läuft die Linie bis dorthin
  const toBar = last >= 0 && barAt(row[last + 1], last + 1, marks, settings.autoBar) > 0;
  // Erst alle Plätze ausmessen (Balken und Silbenfelder reichen bis zu einem späteren Platz).
  // u: belegte Sechzehntel-Spalten; leere Plätze hinter dem Zeilenende sind einen Schlag breit, nach einer einzelnen
  // Achtel oder Sechzehntel nur bis zum nächsten Schlag, damit sie wieder auf den Schlägen stehen
  const geos = [];
  for (let u = 0, c = 0; u < cols && c < MAX_LEN; c++) {
    const geo = { u0: u, k: c >= row.length ? (u % 4 ? 4 - u % 4 : 4) : spanOf(row[c]), P };
    geos.push(geo);
    u += geo.k;
  }
  const widthOf = (g) => P[g.u0 + g.k] - P[g.u0];
  let cells = '';
  geos.forEach((geo, c) => {
    const beyond = c >= row.length;
    // Über die ganze Zeile: jeder Platz trägt ein volles Stück (mit Taktart beginnt die Linie schon vor ihr)
    const line = c > last ? '' : full ? (c === 0 && meter ? 'first' : 'mid') : last === 0 ? (toBar ? 'first' : 'one') : c === 0 ? 'first' : c === last && !toBar ? 'last' : 'mid';
    // Füllt die Zeile alle Spalten, kommt hinter dem letzten Zeichen kein leerer Platz, der den Taktstrich tragen könnte
    const endBar = c === row.length - 1 && geo.u0 + geo.k >= cols && barAt(null, c + 1, marks, settings.autoBar) === 1;
    const hid = (k) => !!(row[k] && row[k].q === 1);
    // Balken bis zum Hals des nächsten Zeichens (ein Kreis ist 2 --L); das Silbenfeld am Anfang einer Gruppe bis zur
    // Mitte ihres letzten Zeichens
    const bw = b[c] === 1 && geos[c + 1] ? (midOf(geos[c + 1]) - midOf(geo)) / 2 : 0;
    const gin = c > 0 && b[c - 1] === 1;
    let end = c;
    while (b[end] === 1 && geos[end + 1]) end++;
    const reach = !gin && end > c ? (midOf(geos[end]) - midOf(geo)) / widthOf(geo) : 0;
    cells += cellHTML(row[c] || null, r, c, { beyond, beam: b[c], line, meter: c === 0 ? meter : '', marks, geo, endBar,
      beamCut: b[c] === 1 && hid(c + 1), beamIn: c > 0 && b[c - 1] === 1 && hid(c - 1) && !hid(c),
      bw, sub: sub[c], odd: geo.u0 % 2 === 1, gin, reach });
  });
  // Feste Rasterzeile, damit das Tuch (das mehrere Zeilen überdeckt) die Zeilen nicht verschiebt
  const tpl = ' style="grid-area:' + (r + 1) + ' / 1;--tpl:' + P.slice(1).map((x, u) => 'calc(var(--L) * ' + (x - P[u]) + ')').join(' ') + '"';
  // Eingeklappt: die Plätze bleiben (die Zeile behält ihre Höhe), zu sehen ist nur die Nummer; ein Tipp darauf klappt auf
  const fold = row.fold ? ' folded" data-fold="' + r + '" role="button" aria-label="Zeile ' + (r + 1) + ' eingeklappt. Antippen klappt sie auf.' : '';
  return '<div class="row' + (row.hide ? ' blank' : '') + fold + '"' + tpl + '><span class="rownum"></span>' + cells + '</div>';
}

// Rhythmus-Echo, noch nicht aufgelöst (hide): Statt der Zeichen steht eine leere Notenlinie mit Taktart, Takt- und
// Schlussstrichen. Die Plätze sind unsichtbare Viertelpausen, damit alle Takte gleich breit sind und die Abstände nichts
// über den Rhythmus verraten.
function blankRow(row, meter) {
  const len = meterParts(meter).len, n = Math.round(row.filter(isBeatOrRest).reduce((u, x) => u + spanOf(x), 0) / 4);
  const b = [];
  for (let i = 0; i < n; i++) b.push(i && i % len === 0 ? { k: 'r', d: 1, bar: 1 } : { k: 'r', d: 1 });
  b.push({ bar: 2 });
  b.line = row.line;
  b.meter = row.meter;
  b.hide = true;
  return b;
}
const isBeatOrRest = (x) => isBeat(x) || isRest(x);

export function renderBoard() {
  S.cap = S.variant === 'rhy' ? RHY_PER_ROW : MAX_PER_ROW;
  const grid = el.grid, cols = unitCount();
  grid.classList.add('prop');
  grid.classList.toggle('rhy', S.variant === 'rhy');
  const rows = S.rows.map((row, r) => row.hide ? blankRow(row, meterOf(S.rows, r)) : row);
  const Ps = rows.map((row) => colFrs(cols, row));
  grid.style.setProperty('--fr', Math.max(...Ps.map((P) => P[cols])));
  grid.style.setProperty('--rows', S.rows.length);
  grid.style.setProperty('--cols', cols);
  // Steht irgendwo eine Taktart, bekommt die Spalte vor den Plätzen in allen Zeilen Platz dafür
  grid.classList.toggle('meters', hasMeter(S.rows));
  grid.classList.toggle('inserting', S.insertMode);
  grid.classList.toggle('clean', sideCollapsed() || !!S.quiz || !!S.written); // eingeklappte Leiste, Quiz, Übungstafel: ohne Markierung und leere Plätze
  grid.classList.toggle('blankboard', !!S.written && !S.rows.some((row) => row.some(Boolean))); // leere Übungstafel: ohne Zeilennummern
  grid.classList.toggle('nolen', !settings.lens && !(settings.syl && S.variant === 'rhy'));
  const auto = autoMarks(rows, settings.autoBar || settings.autoZ);
  // Platz für Zählzeiten nur, wenn welche zu sehen sind
  grid.classList.toggle('counts', settings.autoZ ? auto.any : S.rows.some((row) => row.some((x) => x && x.z)));
  // Tuch: deckt ab seiner Zeile alles bis unten ab; ein Tipp darauf deckt die nächste Zeile auf (liegt darunter nichts
  // mehr, heißt es nur „aufdecken“, z. B. beim Rhythmus-Echo)
  const k = S.rows.findIndex((row) => row.cover), more = S.rows.slice(k + 1).some((row) => row.some(Boolean));
  const cloth = k < 0 ? '' : '<div class="cloth" style="grid-row:' + (k + 1) + ' / ' + (S.rows.length + 1) + '" role="button" tabindex="0" aria-label="Abgedeckt. Antippen deckt ' + (more ? 'die nächste Zeile ' : '') + 'auf.">' +
    '<span class="clothtip">▼ antippen: ' + (more ? 'nächste Zeile aufdecken' : 'aufdecken') + '</span></div>';
  grid.innerHTML = rows.map((row, r) => rowHTML(row, r, cols, Ps[r], auto.rows[r])).join('') + cloth;
  // Passt die Tafel nicht mehr in die Breite, darf man sie seitlich wischen
  grid.classList.toggle('wide', el.board.scrollWidth > el.board.clientWidth + 1);
}

export const cellEl = (r, c) => el.grid.querySelector('.cell[data-r="' + r + '"][data-c="' + c + '"]');

// Hebt beim Abspielen den gerade klingenden Platz hervor (pos = null: keinen). Schritt für Schritt mit „nur bis zur
// Note zeigen“: alles dahinter ist ausgeblendet (die Zeilennummern und Taktarten bleiben)
export function markPlaying(pos) {
  const old = el.grid.querySelector('.cell.playing');
  if (old) old.classList.remove('playing');
  el.grid.querySelectorAll('.cell.ahead').forEach((x) => x.classList.remove('ahead'));
  // In einer leeren Zeile des Rhythmus-Echos leuchtet nichts (sonst sähe man, wo die Zeichen stehen)
  const cur = pos && !(S.rows[pos.r] && S.rows[pos.r].hide) && cellEl(pos.r, pos.c);
  if (!cur) return;
  cur.classList.add('playing');
  follow(cur, el.board);
  if (!stepHides()) return;
  el.grid.querySelectorAll('.cell').forEach((x) => {
    const r = +x.dataset.r, c = +x.dataset.c;
    if (r > pos.r || (r === pos.r && c > pos.c)) x.classList.add('ahead');
  });
}
