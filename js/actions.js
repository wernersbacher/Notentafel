// Alles, was die Tafel verändert. Jede Aktion merkt sich vorher den Stand für „Rückgängig“ und endet mit commit().
import { MAX_LEN, MAX_ROWS } from './config.js';
import { isNote, isBeat, filled, emptyRows, appendPos, canStepDown, put, setCell, content, trimRow, cleanRows, packLines } from './model.js';
import { countSlots } from './theory.js';
import { S, settings, curCell, curRow, snap, restore, stashBoard, persistBoard } from './state.js';
import { songExists, saveSong } from './storage.js';
import { render, commit } from './render.js';
import { toast, confirmTap } from './ui.js';

// Ein Platz weiter in derselben Zeile – auch beim Austauschen, damit man mehrere Töne am Stück korrigieren kann.
// Am Ende einer vollen Zeile bleibt die Markierung stehen.
function advance() {
  if (S.sel.c + 1 < MAX_LEN) { S.sel = { r: S.sel.r, c: S.sel.c + 1 }; return; }
  toast('Die Zeile ist voll (' + MAX_LEN + ' Plätze). Mit „Umbruch“ geht es in der nächsten Zeile weiter.', true);
}
// Von Hand getippte Zählzeiten bleiben stehen, wenn ein Zeichen durch ein anderes ersetzt wird
function keepCount(prev, v) {
  if (filled(prev) && prev.z) v.z = prev.z;
  return v;
}
// Ersetzt den markierten Platz und springt weiter
function replaceCur(v) {
  setCell(curRow(), S.sel.c, keepCount(curCell(), v));
  advance();
  commit();
}

/* ---------- Markierung ---------- */
export function select(r, c) {
  S.sel = { r, c };
  S.countAt = null;
  S.clean = false;
  render();
}
export function toggleInsert() { S.insertMode = !S.insertMode; S.clean = false; render(); }
export function toggleClean() { S.clean = !S.clean; render(); }
// Blendet nach „Fertig“ alles wieder ein, z. B. sobald man auf der Tafel zieht
export function unclean() { if (S.clean) { S.clean = false; render(); } }

/* ---------- Zeichen setzen ---------- */
// Fügt an der Markierung ein; der Rest der Zeile rückt einen Platz weiter
function insertCell(v) {
  const row = curRow();
  if (row.length >= MAX_LEN) {
    toast('Die Zeile ist voll (' + MAX_LEN + ' Plätze). Entferne zuerst einen Ton oder mach einen Umbruch.', true);
    return;
  }
  snap();
  if (S.sel.c >= row.length) put(row, S.sel.c, v);
  else row.splice(S.sel.c, 0, v);
  advance();
  commit();
}
// Bunter Punkt. Beim Austauschen bleiben r/l und ein Notenwert erhalten, damit der Rhythmus stimmt
// (auch wenn vorher ein eigenständiges Notenzeichen dort stand).
export function placeNote(id) {
  if (S.insertMode) { insertCell({ n: id, h: '' }); return; }
  snap();
  const prev = curCell(), v = { n: id, h: isNote(prev) ? prev.h : '' };
  if ((isNote(prev) || isBeat(prev)) && prev.d) v.d = prev.d;
  replaceCur(v);
}
// Notenwert: Auf einem bunten Punkt kommt er darunter, sonst wird das Notenzeichen eigenständig eingesetzt.
// Im Bereich Melodie gibt es nur Notenwerte unter bunten Punkten.
export function placeValue(d) {
  const prev = curCell();
  if (settings.mode === 'mel') {
    if (!isNote(prev)) { toast('Hier kommt der Notenwert unter einen bunten Punkt. Notenzeichen ohne Punkt gibt es unter „Rhythmus“.', true); return; }
  } else if (S.insertMode) { insertCell({ k: 'b', d }); return; }
  snap();
  if (isNote(prev)) { prev.d = d; advance(); commit(); }
  else replaceCur({ k: 'b', d });
}
export function placeRest(d) {
  if (S.insertMode) { insertCell({ k: 'r', d }); return; }
  snap();
  replaceCur({ k: 'r', d });
}
export function setHand(h) {
  const cell = curCell();
  if (!isNote(cell)) return;
  snap();
  cell.h = cell.h === h ? '' : h;
  commit();
}

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

/* ---------- Entfernen ---------- */
// Entfernt den Platz an der Markierung; der Rest der Zeile rückt nach vorne
function closeGap() {
  const row = curRow();
  if (S.sel.c >= row.length) return;
  snap();
  row.splice(S.sel.c, 1);
  commit();
}
export function deleteCell() {
  if (S.insertMode) { closeGap(); return; }
  const row = curRow();
  if (!filled(row[S.sel.c])) return;
  snap();
  setCell(row, S.sel.c, null);
  // Ein entfernter Ton am Zeilenende hinterlässt keine Pause
  if (S.sel.c === row.length - 1) trimRow(row);
  commit();
}

/* ---------- Zeilen ---------- */
// Umbruch: Die Markierung und alles dahinter rutscht in eine neue Zeile darunter.
// Steht dahinter nichts und ist die nächste Zeile leer, springt die Markierung nur dorthin.
export function lineBreak() {
  if (canStepDown(S.rows, S.sel)) { S.sel = { r: S.sel.r + 1, c: 0 }; S.clean = false; render(); return; }
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
  S.rows.push([]);
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

/* ---------- Ganze Tafel ---------- */
export function undo() {
  if (restore()) commit();
}
export function clearAll() {
  snap();
  stashBoard();
  S.rows = emptyRows();
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
  toast('„' + (song.name || 'Ohne Namen') + '“ geladen. Die vorherige Tafel liegt im Menü unter „Zuletzt ersetzt“.');
}
// Speichert die Tafel unter dem Namen aus input (im Menü oder in der Leiste). Gleicher Name heißt ersetzen,
// dafür muss btn ein zweites Mal getippt werden. report(text, warn) meldet das Ergebnis.
export function saveAs(input, btn, report) {
  const n = input.value.trim();
  if (!n) { report('Bitte zuerst einen Namen eingeben.', true); input.focus(); return; }
  const doSave = () => {
    if (!saveSong(settings.mode, S.rows, n)) { report('Speichern hat nicht geklappt (Speicher voll oder gesperrt).', true); return; }
    S.name = n;
    persistBoard();
    report('Gespeichert: „' + n + '“');
  };
  if (songExists(settings.mode, n)) confirmTap(btn, 'Ersetzen?', doSave);
  else doSave();
}
