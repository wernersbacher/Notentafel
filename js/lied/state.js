// Laufender Zustand des Lieds. Alle Module des Lieds lesen und ändern diese Objekte direkt.
import { pushState, popState } from '../core/history.js';
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
  insertMode: false,
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
export function startPractice() {
  if (L.written) return;
  L.written = { song: L.song, name: L.name, sel: L.sel, hist: L.hist };
  Object.assign(L, { song: emptySong(), name: '', sel: 0, hist: [], last: null });
}
// Die Übungstafel wieder leer (beim Wählen eines Spiels)
export function clearPractice() {
  if (L.written) Object.assign(L, { song: emptySong(), sel: 0, hist: [], last: null });
}
// Legt eine Kopie des geschriebenen Lieds auf die Übungstafel (zum Durchgehen im Tonnamen-Quiz)
export function practiceWritten() {
  if (L.written) Object.assign(L, { song: cleanSong(JSON.parse(JSON.stringify(L.written.song))), sel: 0, last: null });
}
export function endPractice() {
  if (!L.written) return;
  Object.assign(L, L.written, { last: null, written: null });
}

export function snap() {
  pushState(L.hist, { song: L.song, sel: L.sel, name: L.name });
}
export function restore() {
  const d = popState(L.hist);
  if (!d) return false;
  L.song = cleanSong(d.song);
  L.sel = Math.min(d.sel, L.song.ev.length);
  L.name = d.name || '';
  L.last = null;
  return true;
}
