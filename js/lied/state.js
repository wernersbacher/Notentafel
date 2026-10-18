// Laufender Zustand des Lieds. Alle Module des Lieds lesen und ändern diese Objekte direkt.
import { pushState, popState } from '../core/history.js';
import { emptySong, cleanSong } from './model.js';
import { store, loadLiedSettings, saveLiedSettings } from './storage.js';

// Einstellungen nur für Lied: autoBar, names, colors, autoZ, check, size, wrap, allTones
export const opts = loadLiedSettings();
export const persistOpts = () => saveLiedSettings(opts);

const saved = store.loadBoard();
export const L = {
  song: saved ? saved.song : emptySong(),
  name: saved ? saved.name : '',
  sel: saved ? saved.song.ev.length : 0, // markierter Platz: Index in song.ev, song.ev.length ist der Platz am Ende
  hist: [], // Rückgängig-Verlauf (als JSON)
  insertMode: false,
  last: null, // der zuletzt gesetzte Ton; auf ihn wirken Vorzeichen und Bogen, bis man woanders hin tippt
  pen: { v: 4, dot: 0 } // vorgewählter Notenwert für die nächsten Töne und Pausen
};

export const persistSong = () => store.saveBoard(L.song, L.name);
// Das bisherige Lied wandert in den Autosave-Platz (nur, wenn etwas darin steht)
export function stashSong() {
  if (L.song.ev.length) store.saveAuto(L.song, L.name);
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
