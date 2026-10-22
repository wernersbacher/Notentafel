// Verdecken: Tuch, ?-Karten, eingeklappte Zeilen und das Aufdecken per Tipp. Jede Aktion merkt sich vorher den Stand
// für „Rückgängig“ und endet mit commit().
import { isNote, isBeat } from './model.js';
import { S, curCell, snap } from './state.js';
import { commit } from './render.js';
import { toast } from '../core/ui.js';
import { select } from './edit.js';

/* ---------- Verdecken ---------- */
// Tuch: ab der Zeile mit cover ist alles abgedeckt; coverFrom merkt, wo es am Anfang lag. ?-Karte: q am Zeichen
// (1 verdeckt, 2 aufgedeckt). Alles hängt an Zeilen und Zeichen und wird mit der Tafel gespeichert.
export const coverRow = () => S.rows.findIndex((row) => row.cover);
const hasContentFrom = (r) => S.rows.slice(r).some((row) => row.some(Boolean));

// Tuch ab der markierten Zeile
export function coverFrom() {
  if (!hasContentFrom(S.sel.r)) { toast('Ab hier steht nichts mehr, das man abdecken könnte.', true); return; }
  snap();
  S.rows.forEach((row) => { delete row.cover; delete row.coverFrom; });
  S.rows[S.sel.r].cover = S.rows[S.sel.r].coverFrom = true;
  commit();
}
// Tipp auf das Tuch: die nächste Zeile kommt hervor, ab ihr geht es beim Abspielen weiter
export function revealRow() {
  const k = coverRow();
  if (k < 0) return;
  snap();
  delete S.rows[k].cover;
  if (hasContentFrom(k + 1)) S.rows[k + 1].cover = true;
  S.sel = { r: k, c: 0 };
  commit();
}
// ?-Karte auf das markierte Zeichen legen oder wieder wegnehmen
export function toggleCard() {
  const cell = curCell();
  if (!isNote(cell) && !isBeat(cell) && !(cell && cell.k)) { toast('Erst ein Zeichen markieren, dann die Karte darauflegen.', true); return; }
  snap();
  if (cell.q) delete cell.q; else cell.q = 1;
  commit();
}
// Tipp auf einen Platz: eine verdeckte Karte wird aufgedeckt und der Platz markiert, sonst wird nur markiert
export function tapCell(r, c) {
  const cell = S.rows[r][c];
  if (!cell || cell.q !== 1) { select(r, c); return; }
  snap();
  cell.q = 2;
  S.sel = { r, c };
  commit();
}
// Tipp auf eine Zeilennummer: die Zeile einklappen (nur noch ein Streifen mit ihrer Nummer) oder wieder aufklappen
export function toggleFold(r) {
  const row = S.rows[r];
  if (!row) return;
  snap();
  if (row.fold) delete row.fold; else row.fold = true;
  commit();
}
// Alles wieder wie am Anfang (z. B. für die nächste Klasse): Tuch an seinen Anfang, alle Karten zu
export function resetCover() {
  snap();
  S.rows.forEach((row) => {
    if (row.coverFrom) row.cover = true; else delete row.cover;
    row.forEach((x) => { if (x && x.q) x.q = 1; });
  });
  commit();
}
// Tuch und alle Karten weg, alle Zeilen aufgeklappt
export function clearCover() {
  snap();
  S.rows.forEach((row) => {
    delete row.cover;
    delete row.coverFrom;
    delete row.fold;
    row.forEach((x) => { if (x) delete x.q; });
  });
  commit();
}
