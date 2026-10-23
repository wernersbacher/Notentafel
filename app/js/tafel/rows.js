// Zeilen: Umbruch, Zeile anhängen und entfernen. Jede Aktion merkt sich vorher den Stand für „Rückgängig“ und endet
// mit commit().
import { MAX_ROWS } from './config.js';
import { newRow, canStepDown, appendPos } from './model.js';
import { S, curRow, snap } from './state.js';
import { render, commit } from './redraw.js';

/* ---------- Zeilen ---------- */
// Umbruch: Die Markierung und alles dahinter rutscht in eine neue Zeile darunter.
// Steht dahinter nichts und ist die nächste Zeile leer, springt die Markierung nur dorthin.
export function lineBreak() {
  if (canStepDown(S.rows, S.sel)) { S.sel = { r: S.sel.r + 1, c: 0 }; render(); return; }
  if (S.rows.length >= MAX_ROWS) return;
  snap();
  const rest = curRow().splice(S.sel.c);
  rest.line = curRow().line;
  S.rows.splice(S.sel.r + 1, 0, rest);
  S.sel = { r: S.sel.r + 1, c: 0 };
  commit();
}
export function addRow() {
  if (S.rows.length >= MAX_ROWS) return;
  snap();
  S.rows.push(newRow(S.variant === 'rhy'));
  commit();
}
export function delRow() {
  if (S.rows.length <= 1) return;
  snap();
  S.rows.pop();
  if (S.sel.r >= S.rows.length) S.sel = appendPos(S.rows);
  commit();
}
export const lastRowHasNotes = () => S.rows[S.rows.length - 1].some(Boolean);
