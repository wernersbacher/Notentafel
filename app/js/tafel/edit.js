// Markierung, Zeichen setzen und Entfernen. Jede Aktion merkt sich vorher den Stand für „Rückgängig“ und endet mit commit().
import { MAX_LEN, maxRows, fullText, DOTTED } from './config.js';
import { isNote, isBeat, filled, rowFullAt, fitsInRow, canCloseGap, dotTargetIn, newRow, reflow, put, setCell, trimRow } from './model.js';
import { openMeasureAt } from './theory.js';
import { S, wraps, curCell, curRow, snap } from './state.js';
import { render, commit } from './redraw.js';
import { toast } from '../core/ui.js';
import { stopPlay } from '../core/player.js';

// Ist die Zeile mit dem Platz c voll? Gezählt wird in Schlägen (S.cap Schläge je Zeile = S.cap × 4 Sechzehntel): ein
// leerer Platz zählt einen Schlag, ein Platz mit nur einem Strich nichts – dieselbe Zählung wie beim Umbruch (rowUnits).
function fullAt(row, c) {
  return wraps() && rowFullAt(row, c, S.cap);
}
// Passt ein neues Zeichen am Ende der Zeile nicht mehr hinein (z. B. eine Ganze nach drei
// Schlägen in einer Zeile mit vier Feldern), kommt es gleich an den Anfang der nächsten Zeile
function makeRoom(v) {
  const row = curRow();
  if (!wraps() || S.sel.c < row.length || !row.some(Boolean)) return;
  if (fitsInRow(row, v, S.cap)) return;
  nextLine();
}
// Weiter in der nächsten Zeile. Ein Takt geht nicht über zwei Zeilen: Ist am Ende der Zeile ein Takt angefangen
// (und beginnt er nicht schon am Zeilenanfang), wandert er ganz in die nächste Zeile, und es geht hinter ihm weiter.
// Die nächste Zeile wird dafür angelegt (oder eine leere genutzt); bei maxRows() Zeilen bleibt alles, wie es ist.
function nextLine() {
  const r = S.sel.r, row = curRow(), open = openMeasureAt(S.rows, r);
  const move = open > 0 && open < row.length ? row.splice(open) : [];
  let next = S.rows[r + 1];
  if (move.length && next && next.some(Boolean)) next = null; // nicht vor eine beschriebene Zeile schieben
  if (!next) {
    if (S.rows.length >= maxRows()) {
      row.push(...move);
      toast(fullText(), true);
      return false;
    }
    next = newRow(row.line);
    S.rows.splice(r + 1, 0, next);
  }
  next.unshift(...move);
  S.sel = { r: r + 1, c: move.length };
  return true;
}
// Ein Platz weiter in derselben Zeile – auch beim Austauschen, damit man mehrere Töne am Stück korrigieren kann.
// Bei Rhythmus geht es am Ende einer vollen Zeile in der nächsten weiter (die angelegt wird, wenn es keine gibt);
// sonst bleibt die Markierung am Ende einer vollen Zeile stehen. Nur bars.js braucht es mit (Zählzeiten), nach außen
// gibt die Fassade es nicht weiter.
export function advance() {
  if (fullAt(curRow(), S.sel.c)) { nextLine(); return; }
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
  makeRoom(v);
  setCell(curRow(), S.sel.c, keepCount(curCell(), v));
  advance();
  commit();
}

/* ---------- Markierung ---------- */
// Beendet Abspielen und Schritt für Schritt: weiter geht es ab der neuen Markierung (z. B. eine Stelle mehrmals üben)
export function select(r, c) {
  stopPlay();
  S.range = null;
  S.sel = { r, c };
  S.countAt = null;
  render();
}
export function toggleInsert() { S.insertMode = !S.insertMode; render(); }

/* ---------- Zeichen setzen ---------- */
// Fügt an der Markierung ein; der Rest der Zeile rückt einen Platz weiter
// Bei Rhythmus rutscht, was nicht mehr in die Zeile passt, in die nächste.
function insertCell(v) {
  const row = curRow();
  if (row.length >= MAX_LEN || (wraps() && rowFullAt(row, row.length - 1, S.cap) && !reflowRoom())) {
    toast(wraps() ? 'Die Tafel ist voll. Entferne zuerst einen Ton.' : 'Die Zeile ist voll (' + MAX_LEN + ' Plätze). Entferne zuerst einen Ton oder mach einen Umbruch.', true);
    return;
  }
  snap();
  if (S.sel.c >= row.length) put(row, S.sel.c, v);
  else row.splice(S.sel.c, 0, v);
  if (wraps()) reflow(S.rows, S.sel.r, S.cap);
  advance();
  commit();
}
// Ist unten noch Platz für ein Zeichen, das beim Einfügen aus der Zeile rutscht?
function reflowRoom() {
  const test = S.rows.map((row) => row.slice());
  test[S.sel.r].push(null);
  return reflow(test, S.sel.r, S.cap);
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
  if (S.variant === 'mel') {
    if (!isNote(prev)) { toast('Hier kommt der Notenwert unter einen bunten Punkt. Notenzeichen ohne Punkt gibt es unter „Rhythmus“.', true); return; }
  } else if (S.insertMode) { insertCell({ k: 'b', d }); return; }
  snap();
  if (isNote(prev)) { prev.d = d; advance(); commit(); }
  else replaceCur({ k: 'b', d });
}
// Punkt: macht aus dem Notenwert an der Markierung (steht dort nichts, aus dem davor) den punktierten oder nimmt den
// Punkt wieder weg (Halbe ↔ punktierte Halbe, Viertel ↔ punktierte Viertel)
export function toggleDot() {
  const x = dotTargetIn(S.rows, S.sel);
  if (!x) { toast('Einen Punkt bekommen nur Halbe und Viertel: zuerst den Notenwert setzen, dann den Punkt.', true); return; }
  snap();
  x.d = DOTTED[x.d];
  commit();
}
export function placeRest(d) {
  if (S.insertMode) { insertCell({ k: 'r', d }); return; }
  snap();
  replaceCur({ k: 'r', d });
}
// Setzt die Hand (nochmal dieselbe nimmt sie weg) und springt wie beim Notenwert zum nächsten Platz
export function setHand(h) {
  const cell = curCell();
  if (!isNote(cell)) return;
  snap();
  cell.h = cell.h === h ? '' : h;
  advance();
  commit();
}

/* ---------- Entfernen ---------- */
// Löschen wie die Löschtaste: Steht die Markierung auf einem Platz, verschwindet er und der Rest der Zeile rückt nach
// vorne (mehrmals tippen löscht nach rechts). Steht sie hinter dem letzten Zeichen, verschwindet das Zeichen davor und die
// Markierung rückt nach (wie die Rücktaste); am Anfang einer leeren Zeile geht es am Ende der Zeile darüber weiter.
export function closeGap() {
  if (!canCloseGap(S.rows, S.sel)) return;
  snap();
  let row = curRow();
  if (S.sel.c < row.length) row.splice(S.sel.c, 1);
  else {
    if (!row.length) { S.sel = { r: S.sel.r - 1, c: 0 }; row = curRow(); }
    row.pop();
    trimRow(row);
    S.sel = { r: S.sel.r, c: row.length };
  }
  commit();
}
// Entfernen: Der Platz wird leer (ein stiller Schlag), der Rest der Zeile bleibt stehen
export function deleteCell() {
  const row = curRow();
  if (!filled(row[S.sel.c])) return;
  snap();
  setCell(row, S.sel.c, null);
  // Ein entfernter Ton am Zeilenende hinterlässt keine Pause
  if (S.sel.c === row.length - 1) trimRow(row);
  commit();
}
