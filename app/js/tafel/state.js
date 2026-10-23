// Laufender Zustand der Tafel. Alle Module der Tafel lesen und ändern diese beiden Objekte direkt.
import { useSettings } from '../core/settings.js';
import { makePractice } from '../core/practice.js';
import { makeUndo } from '../core/undo.js';
import { emptyRows, appendPos, hasNotes, isNote, attachLines, packLines } from './model.js';
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
  redo: [], // zurückgenommene Stände, die „Wiederholen“ wiederherstellt (als JSON)
  // Markierung und Rückgängig-Verlauf der gerade nicht sichtbaren Tafel (nur bis zum Schließen der App)
  parked: {},
  insertMode: false,
  countAt: null, // Platz, unter dem gerade mehrere Zählzeiten getippt werden
  quiz: null, // Tonnamen-Quiz durch die Melodie: { pos (gefragter Platz), done (benannte Plätze als 'r,c') }, siehe quiz.js
  written: null, // beim Üben und Spielen: die geschriebene Tafel { rows, name, sel, hist }, die so lange wartet
  cap: 0 // Plätze pro Zeile, danach wird automatisch umbrochen (0 = noch nicht gezeichnet)
};
// Zeilen werden automatisch umbrochen, wenn sie voll sind (Melodie: MAX_PER_ROW, Rhythmus: RHY_PER_ROW Schläge)
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
export const { startPractice, resetPractice, practiceWritten, endPractice } = makePractice({
  state: S,
  fields: ['rows', 'sel', 'hist', 'redo'],
  fresh: () => ({ rows: emptyRows(S.variant === 'rhy'), sel: { r: 0, c: 0 }, hist: [], redo: [] }),
  // Legt eine Kopie der geschriebenen Tafel auf die Übungstafel (zum Durchgehen im Tonnamen-Quiz), ohne Tuch und Karten.
  // false, wenn darin nichts zu benennen ist: Dann bleibt die Übungstafel unangetastet (das Quiz prüft es damit vor dem
  // Umschalten, sonst wäre sie schon getauscht, wenn es die Leer-Meldung zeigt).
  copy: (w) => {
    if (!w.rows.some((row) => !row.fold && row.some(isNote))) return false;
    const src = w.rows;
    S.rows = attachLines(JSON.parse(JSON.stringify(src)), packLines(src));
    S.rows.forEach((row) => {
      delete row.cover; delete row.coverFrom; delete row.hide;
      row.forEach((x) => { if (x) delete x.q; });
    });
    S.sel = { r: 0, c: 0 };
    return true;
  }
});

// Merkt sich den Stand vor einer Änderung für „Rückgängig“
export const { snap, restore, redo } = makeUndo({
  state: S,
  snapshot: () => ({ rows: S.rows, lines: packLines(S.rows), sel: S.sel, name: S.name }),
  apply: (d) => {
    S.rows = attachLines(d.rows, d.lines);
    S.sel = d.sel;
    S.name = d.name || '';
    S.countAt = null;
  }
});
