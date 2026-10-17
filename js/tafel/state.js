// Laufender Zustand der Tafel. Alle Module der Tafel lesen und ändern diese beiden Objekte direkt.
import { useSettings } from '../core/settings.js';
import { pushState, popState } from '../core/history.js';
import { emptyRows, appendPos, hasNotes, attachLines, packLines } from './model.js';
import { loadBoard, saveBoard, saveAuto, cleanTafelSettings } from './storage.js';

// Gemeinsame Einstellungen samt denen der Tafel, je ein Set für Melodie und Rhythmus (unter mel und rhy)
const all = useSettings(cleanTafelSettings);

// Welche Tafel gerade offen ist: 'mel' (Melodie) oder 'rhy' (Rhythmus)
const variant = all.mode === 'rhy' ? 'rhy' : 'mel';
// Einstellungen der offenen Tafel (theme, lens, autoBar, autoZ, prop); wechselt mit useVariant.
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
  clean: false, // „Fertig“: Markierung und leere Plätze ausgeblendet
  countAt: null, // Platz, unter dem gerade mehrere Zählzeiten getippt werden
  cap: 0 // Plätze pro Zeile, danach wird automatisch umbrochen (0 = noch nicht gezeichnet)
};
// Zeilen werden automatisch umbrochen, wenn sie voll sind (Melodie: MAX_PER_ROW Plätze, Rhythmus: RHY_PER_ROW Schläge)
export const wraps = () => S.cap > 0;
// Breite nach Notenlänge: bei Rhythmus immer (ein Feld pro Schlag), bei Melodie nach der Einstellung
export const propOn = () => settings.prop || S.variant === 'rhy';

// Schaltet auf die Tafel v um: Zustand und Einstellungen (geladen wird in area.js)
export function useVariant(v) {
  S.variant = v;
  settings = all[v];
}

export const curCell = () => S.rows[S.sel.r][S.sel.c];
export const curRow = () => S.rows[S.sel.r];

export const persistBoard = () => saveBoard(S.variant, S.rows, S.name);
// Die bisherige Tafel wandert in den Autosave-Platz ihres Bereichs (nur, wenn etwas darauf steht)
export function stashBoard() {
  if (hasNotes(S.rows)) saveAuto(S.variant, S.rows, S.name);
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
