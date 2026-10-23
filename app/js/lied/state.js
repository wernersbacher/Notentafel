// Laufender Zustand des Lieds. Alle Module des Lieds lesen und ändern diese Objekte direkt.
import { makePractice } from '../core/practice.js';
import { makeUndo } from '../core/undo.js';
import { emptySong, cleanSong } from './model.js';
import { store, loadLiedSettings, saveLiedSettings } from './storage.js';

// Einstellungen nur für Lied: autoBar, names, colors, autoZ, lyrics, check, size, wrap, allTones und die des
// Tonnamen-Quiz (quizMode, quizLo, quizHi, quizSharp, quizFlat) und der Notenwerte (valLevel, valRests)
export const opts = loadLiedSettings();
export const persistOpts = () => saveLiedSettings(opts);

const saved = store.loadBoard();
export const L = {
  song: saved ? saved.song : emptySong(),
  name: saved ? saved.name : '',
  sel: 0, // markierter Platz: Index in song.ev, song.ev.length ist der Platz am Ende (beim Start: der Anfang)
  hist: [], // Rückgängig-Verlauf (als JSON)
  redo: [], // zurückgenommene Stände, die „Wiederholen“ wiederherstellt (als JSON)
  insertMode: false,
  range: null, // markierter Bereich zum Abspielen und Wiederholen: { a, b } (Indizes in song.ev, beide eingeschlossen, a <= b)
  last: null, // der zuletzt gesetzte Ton; auf ihn wirken Vorzeichen und Bogen, bis man woanders hin tippt
  pen: { v: 4, dot: 0 }, // vorgewählter Notenwert für die nächsten Töne und Pausen
  quiz: null, // Tonnamen-Quiz durch das Lied: { i (gefragte Note), done (benannte Noten) }, siehe quiz.js
  written: null // beim Üben und Spielen: das geschriebene Lied { song, name, sel, hist }, das so lange wartet
};

// Die Übungstafel wird nie gespeichert
export const persistSong = () => { if (!L.written) store.saveBoard(L.song, L.name); };
// Das bisherige Lied wandert in den Autosave-Platz (nur, wenn etwas darin steht)
export function stashSong() {
  if (!L.written && L.song.ev.length) store.saveAuto(L.song, L.name);
}

/* ---------- Üben und Spielen ---------- */
// Das geschriebene Lied, auch während geübt wird
export const written = () => L.written || L;
// Eine neue, leere Übungstafel; das geschriebene Lied bleibt unberührt liegen
export const { startPractice, resetPractice, practiceWritten, endPractice } = makePractice({
  state: L,
  fields: ['song', 'sel', 'hist', 'redo'],
  fresh: () => ({ song: emptySong(), sel: 0, hist: [], redo: [], last: null, range: null }),
  // Legt eine Kopie des geschriebenen Lieds auf die Übungstafel (zum Durchgehen im Tonnamen-Quiz)
  copy: (w) => {
    Object.assign(L, { song: cleanSong(JSON.parse(JSON.stringify(w.song))), sel: 0, last: null, range: null });
    return true;
  }
});

// Merkt sich den Stand vor einer Änderung für „Rückgängig“
const undo = makeUndo({
  state: L,
  snapshot: () => ({ song: L.song, sel: L.sel, name: L.name }),
  apply: (d) => {
    L.song = cleanSong(d.song);
    L.sel = Math.min(d.sel, L.song.ev.length);
    L.name = d.name || '';
    L.last = null;
  }
});
// Jede Änderung, auch Rückgängig und Wiederholen, hebt den markierten Bereich auf: seine Indizes stimmen danach nicht mehr
export const snap = () => { L.range = null; undo.snap(); };
export const restore = () => { L.range = null; return undo.restore(); };
export const redo = () => { L.range = null; return undo.redo(); };
