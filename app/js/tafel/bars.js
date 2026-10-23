// Takt: Taktstriche, Wiederholungen, Zählzeiten, Zeilenstrich und Taktart. Jede Aktion merkt sich vorher den Stand
// für „Rückgängig“ und endet mit commit().
import { filled, put, trimRow } from './model.js';
import { countSlots } from './theory.js';
import { S, curCell, curRow, snap } from './state.js';
import { commit } from './redraw.js';
import { advance } from './edit.js';

/* ---------- Takt ---------- */
// Taktstrich (kind 1) oder Schlussstrich (kind 2) vor dem markierten Platz setzen, umstellen oder entfernen
export function toggleBar(kind) {
  snap();
  const row = curRow(), cell = curCell();
  if (cell && cell.bar === kind) {
    delete cell.bar;
    if (!filled(cell)) row[S.sel.c] = null;
    trimRow(row);
  } else if (cell) cell.bar = kind;
  else put(row, S.sel.c, { bar: kind });
  commit();
}
// Wiederholungszeichen vor dem markierten Platz: which 'start' (‖:) oder 'end' (:‖) an- oder abschalten; beide zusammen
// ergeben :‖: (5). Ein Takt- oder Schlussstrich an der Stelle wird dabei ersetzt.
export function toggleRepeat(which) {
  snap();
  const row = curRow(), cell = curCell(), b = cell && cell.bar;
  let start = b === 4 || b === 5, end = b === 3 || b === 5;
  if (which === 'start') start = !start; else end = !end;
  const kind = start && end ? 5 : start ? 4 : end ? 3 : 0;
  if (kind && cell) cell.bar = kind;
  else if (kind) put(row, S.sel.c, { bar: kind });
  else if (cell) {
    delete cell.bar;
    if (!filled(cell)) row[S.sel.c] = null;
    trimRow(row);
  }
  commit();
}
// Zählzeit von Hand. Dauert das Zeichen mehrere Zählzeiten (z. B. eine Halbe im 4/4-Takt),
// bleibt die Markierung stehen, bis alle getippt sind; ein neuer Anfang ersetzt die alten Zählzeiten.
export function placeCount(t) {
  const cell = curCell();
  if (!filled(cell)) return;
  snap();
  const more = S.countAt && S.countAt.r === S.sel.r && S.countAt.c === S.sel.c && cell.z;
  const z = more ? cell.z.split(' ') : [];
  z.push(t);
  cell.z = z.join(' ');
  if (z.length >= countSlots(S.rows, S.sel.r, cell)) { S.countAt = null; advance(); }
  else S.countAt = { r: S.sel.r, c: S.sel.c };
  commit();
}
export function clearCount() {
  const cell = curCell();
  if (!cell || !cell.z) return;
  snap();
  delete cell.z;
  S.countAt = null;
  commit();
}
export function toggleLine() {
  snap();
  curRow().line = !curRow().line;
  commit();
}
// Taktart der markierten Zeile ('' = ohne)
export function setMeter(m) {
  if (curRow().meter === m) return;
  snap();
  curRow().meter = m;
  commit();
}
