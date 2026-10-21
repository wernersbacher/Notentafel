// Speicher der Tafel. Melodie und Rhythmus haben je eine eigene Tafel, eigene gespeicherte Lieder und einen eigenen Autosave-Platz.
// Jede Funktion bekommt den Bereich ('mel' oder 'rhy') mitgegeben. Die Melodie behält die alten Schlüssel,
// damit bisherige Stände dort weiterleben.
import { makeStore } from '../core/store.js';
import { cleanRows, packLines } from './model.js';

const KEYS = {
  mel: { board: 'notentafel.v1', songs: 'notentafel.songs.v1', auto: 'notentafel.autosave.v1' },
  rhy: { board: 'notentafel.rhy.v1', songs: 'notentafel.rhy.songs.v1', auto: 'notentafel.rhy.autosave.v1' }
};

// Ein gespeicherter Stand: Zeilen samt Zeilen-Eigenschaften und Name
function pack(rows, name, savedAt) {
  const o = { rows, lines: packLines(rows), name };
  if (savedAt) o.savedAt = savedAt;
  return o;
}
function unpack(d) {
  const rows = d && cleanRows(d.rows, d.lines);
  return rows ? { rows, name: typeof d.name === 'string' ? d.name : '', savedAt: d.savedAt || 0 } : null;
}
export const stores = { mel: makeStore(KEYS.mel, { pack, unpack, area: 'mel' }), rhy: makeStore(KEYS.rhy, { pack, unpack, area: 'rhy' }) };

/* ---------- Aktuelle Tafel ---------- */
export const loadBoard = (mode) => stores[mode].loadBoard();
export const saveBoard = (mode, rows, name) => stores[mode].saveBoard(rows, name);

/* ---------- Gespeicherte Lieder, neueste zuerst ---------- */
export const loadSongs = (mode) => stores[mode].loadSongs();
export const songExists = (mode, name) => stores[mode].songExists(name);
export const saveSong = (mode, rows, name) => stores[mode].saveSong(rows, name);
export const deleteSong = (mode, name) => stores[mode].deleteSong(name);

/* ---------- Autosave: die Tafel, die zuletzt durch Laden oder „Alles löschen“ ersetzt wurde ---------- */
export const loadAuto = (mode) => stores[mode].loadAuto();
export const saveAuto = (mode, rows, name) => stores[mode].saveAuto(rows, name);

/* ---------- Einstellungen der Tafel (im gemeinsamen Speicherplatz der Einstellungen) ---------- */
// Melodie und Rhythmus haben je eigene Einstellungen unter mel und rhy. Ältere Stände hatten nur ein gemeinsames Set
// direkt in den Einstellungen; das übernehmen dann beide.
export function cleanTafelSettings(s) {
  const own = (v) => cleanVariant(s[v] && typeof s[v] === 'object' ? s[v] : s);
  return { mel: own('mel'), rhy: own('rhy') };
}
function cleanVariant(s) {
  return {
    lens: s.lens !== false, // Notenzeichen unter den Tönen anzeigen
    autoBar: !!s.autoBar, // Taktstriche nach der Taktart
    autoZ: !!s.autoZ, // Zählzeiten nach der Taktart
    syl: !!s.syl // Rhythmussprache (ta, ti-ti, taja …) unter den Notenzeichen
  };
}
