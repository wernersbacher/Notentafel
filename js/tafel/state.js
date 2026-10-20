// Laufender Zustand der Tafel. Alle Module der Tafel lesen und ändern diese beiden Objekte direkt.
import { useSettings } from '../core/settings.js';
import { pushState, popState } from '../core/history.js';
import { emptyRows, appendPos, hasNotes, attachLines, packLines } from './model.js';
import { loadBoard, saveBoard, saveAuto, cleanTafelSettings } from './storage.js';

// Gemeinsame Einstellungen samt denen der Tafel, je ein Set für Melodie und Rhythmus (unter mel und rhy)
const all = useSettings(cleanTafelSettings);

// Welche Tafel gerade offen ist: 'mel' (Melodie) oder 'rhy' (Rhythmus)
const variant = all.mode === 'rhy' ? 'rhy' : 'mel';
// Einstellungen der offenen Tafel (lens, autoBar, autoZ, syl); wechselt mit useVariant.
// Gespeichert wird mit persistSettings aus dem Kern, denn das Set hängt im gemeinsamen Objekt.
export let settings = all[variant];
const saved = loadBoard(variant);
export const S = {
  variant,
  // Ohne gespeicherten Stand startet die Tafel leer
  rows: saved ? saved.rows : emptyRows(variant === 'rhy'),
  name: saved ? saved.name : '',
  sel: appendPos(saved ? saved.rows : []), // markierter Platz, am Anfang hinter dem letzten Ton
  hist: [], // Rückgängig-Verlauf (als JSON)
  // Markierung und Rückgängig-Verlauf der gerade nicht sichtbaren Tafel (nur bis zum Schließen der App)
  parked: {},
  insertMode: false,
  countAt: null, // Platz, unter dem gerade mehrere Zählzeiten getippt werden
  quiz: null, // Tonnamen-Quiz durch die Melodie: { pos (gefragter Platz), done (benannte Plätze als 'r,c') }, siehe quiz.js
  written: null, // beim Üben und Spielen: die geschriebene Tafel { rows, name, sel, hist }, die so lange wartet
  cap: 0 // Plätze pro Zeile, danach wird automatisch umbrochen (0 = noch nicht gezeichnet)
};
// Zeilen werden automatisch umbrochen, wenn sie voll sind (Melodie: MAX_PER_ROW Plätze, Rhythmus: RHY_PER_ROW Schläge)
export const wraps = () => S.cap > 0;

// Schaltet auf die Tafel v um: Zustand und Einstellungen (geladen wird in area.js)
export function useVariant(v) {
  S.variant = v;
  settings = all[v];
}

export const curCell = () => S.rows[S.sel.r][S.sel.c];
export const curRow = () => S.rows[S.sel.r];

// Die Übungstafel wird nie gespeichert
export const persistBoard = () => { if (!S.written) saveBoard(S.variant, S.rows, S.name); };
// Die bisherige Tafel wandert in den Autosave-Platz ihres Bereichs (nur, wenn etwas darauf steht)
export function stashBoard() {
  if (!S.written && hasNotes(S.rows)) saveAuto(S.variant, S.rows, S.name);
}

/* ---------- Üben und Spielen ---------- */
// Eine neue, leere Übungstafel; die geschriebene Tafel wartet so lange unberührt in S.written
export function startPractice() {
  if (S.written) return;
  S.written = { rows: S.rows, name: S.name, sel: S.sel, hist: S.hist };
  Object.assign(S, { rows: emptyRows(S.variant === 'rhy'), name: '', sel: { r: 0, c: 0 }, hist: [], insertMode: false, countAt: null });
}
// Die Übungstafel wieder leer (beim Wählen eines Spiels)
export function clearPractice() {
  if (S.written) Object.assign(S, { rows: emptyRows(S.variant === 'rhy'), sel: { r: 0, c: 0 }, hist: [] });
}
// Legt eine Kopie der geschriebenen Tafel auf die Übungstafel (zum Durchgehen im Tonnamen-Quiz), ohne Tuch und Karten
export function practiceWritten() {
  if (!S.written) return;
  const src = S.written.rows;
  S.rows = attachLines(JSON.parse(JSON.stringify(src)), packLines(src));
  S.rows.forEach((row) => {
    delete row.cover; delete row.coverFrom; delete row.hide;
    row.forEach((x) => { if (x) delete x.q; });
  });
  S.sel = { r: 0, c: 0 };
}
export function endPractice() {
  if (!S.written) return;
  Object.assign(S, S.written, { written: null, insertMode: false, countAt: null });
}

// Merkt sich den Stand vor einer Änderung für „Rückgängig“
export function snap() {
  pushState(S.hist, { rows: S.rows, lines: packLines(S.rows), sel: S.sel, name: S.name });
}
// Holt den letzten gemerkten Stand zurück; false, wenn es keinen gibt
export function restore() {
  const d = popState(S.hist);
  if (!d) return false;
  S.rows = attachLines(d.rows, d.lines);
  S.sel = d.sel;
  S.name = d.name || '';
  S.countAt = null;
  return true;
}
