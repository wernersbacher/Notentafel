// Ganze Tafel: Rückgängig, leeren, Plätze tauschen, Lied übernehmen und laden. Jede Aktion merkt sich vorher den
// Stand für „Rückgängig“ und endet mit commit().
import { emptyRows, content, setCell, trimRow, cleanRows, appendPos, packLines } from './model.js';
import { S, snap, restore, redo as redoStep, stashBoard } from './state.js';
import { commit } from './redraw.js';
import { toast } from '../core/ui.js';
import { el } from './dom.js';

/* ---------- Ganze Tafel ---------- */
export function undo() {
  if (restore()) commit();
}
export function redo() {
  if (redoStep()) commit();
}
export function clearAll() {
  snap();
  stashBoard();
  S.rows = emptyRows(S.variant === 'rhy');
  S.name = '';
  S.sel = { r: 0, c: 0 };
  commit();
}
// Tauscht die Inhalte zweier Plätze (Ziehen auf der Tafel); Taktstriche bleiben, wo sie sind
export function swapCells(from, to) {
  snap();
  const src = S.rows[from.r], dst = S.rows[to.r];
  const a = content(src[from.c]), b = content(dst[to.c]);
  setCell(src, from.c, b);
  setCell(dst, to.c, a);
  // Wird der letzte Ton einer Zeile weggezogen, wird die Zeile kürzer statt eine Pause zu behalten
  if (!b && from.c === src.length - 1) trimRow(src);
  S.sel = { r: to.r, c: to.c };
  commit();
}
// Nimmt ein Lied aus dem Bereich Lied als Melodie an ({ name, rows, lines, skipped, cut }, siehe lied/model.js
// songToMelody); die bisherige Tafel wandert in den Autosave-Platz. Der Hinweis nennt, was nicht übernommen wurde.
export function receiveRows({ name, rows, lines, skipped, cut }) {
  const clean = cleanRows(rows, lines);
  if (!clean) { toast('Das Lied ließ sich nicht in Farbnoten umwandeln.', true); return; }
  snap();
  stashBoard();
  S.rows = clean;
  S.name = name || '';
  S.sel = appendPos(S.rows);
  commit();
  const notes = [];
  if (skipped) notes.push(skipped === 1 ? 'Ein Ton liegt außerhalb der Farbpunkte und ist jetzt eine Pause.' : skipped + ' Töne liegen außerhalb der Farbpunkte und sind jetzt Pausen.');
  if (cut) notes.push('Nur die ersten ' + clean.length + ' Zeilen passen auf die Tafel.');
  toast('Als Farbnoten übernommen. ' + (notes.length ? notes.join(' ') : 'Die vorherige Melodie liegt in der Liedersammlung unter „Zuletzt ersetzt“.'), notes.length > 0);
}
// Lädt ein Lied (oder den Autosave). Die bisherige Tafel wandert in den Autosave-Platz;
// beim Laden des Autosaves tauschen beide also die Plätze. song.rows tragen line und meter an den Zeilen.
export function loadSong(song) {
  const rows = cleanRows(song.rows, packLines(song.rows));
  if (!rows) return;
  snap();
  stashBoard();
  S.rows = rows;
  S.name = song.name;
  S.sel = appendPos(S.rows);
  commit();
  el.board.scrollLeft = 0; // jedes geladene Lied beginnt vorn
  toast('„' + (song.name || 'Ohne Namen') + '“ geladen. Die vorherige Tafel liegt in der Liedersammlung unter „Zuletzt ersetzt“.');
}
