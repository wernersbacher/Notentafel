// Maße der Tafel: Wie viele Sechzehntel-Spalten eine Zeile hat, wie breit sie sind und wo die Zeichen darin stehen.
// Reine Rechner ohne DOM; board.js setzt daraus das HTML zusammen.
import { rowUnits, units } from './model.js';
import { S } from './state.js';

/* ---------- Breite nach Notenlänge ---------- */
// Jeder Schlag hat ein Feld: Ein Platz belegt so viele Sechzehntel-Spalten, wie er dauert (leer = ein Schlag); eine Halbe
// hält also das nächste Feld frei. Kürzere Zeilen zeigen dahinter blasse Plätze, über die man auch Pausen setzen kann.
export const spanOf = units;
// rowUnits (model.js) zählt einen Platz, der nur einen Strich trägt, mit 0: Er verbreitert die Zeile nicht.
// Auf ganze Schläge (vier Spalten) aufgerundet
export const wholeBeats = (n) => n + (4 - n % 4) % 4;
// Gezählt wird in Spalten. Rhythmus: immer S.cap Schläge (mehr nur, wenn eine ältere Zeile länger ist). Melodie: die
// längste Zeile plus ein freier Schlag, mindestens bis zur Markierung, höchstens S.cap Schläge (außer ältere Zeilen),
// aufgerundet auf ganze Schläge.
export function unitCount() {
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
export function colFrs(cols, row) {
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
export const midOf = (geo) => geo.P[geo.u0] + Math.min(geo.P[geo.u0 + geo.k] - geo.P[geo.u0], 2) / 2;
// geo (nur bei Breite nach Notenlänge): u0 = erste Sechzehntel-Spalte des Platzes, k = Anzahl Spalten, P = aufsummierte
// Spaltenbreiten. Liefert den Anteil des Platzes, der vor Sechzehntel o liegt.
export const geoFrac = (geo, o) => (geo.P[geo.u0 + o] - geo.P[geo.u0]) / (geo.P[geo.u0 + geo.k] - geo.P[geo.u0]);
