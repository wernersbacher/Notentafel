// Laufender Zustand der App. Alle Module lesen und ändern diese beiden Objekte direkt.
import { HISTORY } from './config.js';
import { emptyRows, hasNotes, attachLines, packLines } from './model.js';
import { loadSettings, saveSettings, loadBoard, saveBoard, saveAuto } from './storage.js';

export const settings = loadSettings();

const saved = loadBoard(settings.mode);
export const S = {
  // Ohne gespeicherten Stand startet die Tafel leer
  rows: saved ? saved.rows : emptyRows(),
  name: saved ? saved.name : '',
  sel: { r: 0, c: 0 }, // markierter Platz
  hist: [], // Rückgängig-Verlauf (als JSON)
  // Markierung und Rückgängig-Verlauf der gerade nicht sichtbaren Tafel (nur bis zum Schließen der App)
  parked: {},
  insertMode: false,
  clean: false, // „Fertig“: Markierung und leere Plätze ausgeblendet
  countAt: null // Platz, unter dem gerade mehrere Zählzeiten getippt werden
};

export const curCell = () => S.rows[S.sel.r][S.sel.c];
export const curRow = () => S.rows[S.sel.r];

export const persistSettings = () => saveSettings(settings);
export const persistBoard = () => saveBoard(settings.mode, S.rows, S.name);
// Die bisherige Tafel wandert in den Autosave-Platz ihres Bereichs (nur, wenn etwas darauf steht)
export function stashBoard() {
  if (hasNotes(S.rows)) saveAuto(settings.mode, S.rows, S.name);
}

// Merkt sich den Stand vor einer Änderung für „Rückgängig“
export function snap() {
  S.hist.push(JSON.stringify({ rows: S.rows, lines: packLines(S.rows), sel: S.sel, name: S.name }));
  if (S.hist.length > HISTORY) S.hist.shift();
}
// Holt den letzten gemerkten Stand zurück; false, wenn es keinen gibt
export function restore() {
  const s = S.hist.pop();
  if (!s) return false;
  const d = JSON.parse(s);
  S.rows = attachLines(d.rows, d.lines);
  S.sel = d.sel;
  S.name = d.name || '';
  S.countAt = null;
  return true;
}
