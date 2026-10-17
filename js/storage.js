// Alles liegt im localStorage des Browsers. Jede Funktion bekommt den Bereich ('mel' oder 'rhy') mitgegeben.
import { THEME_BY, TEMPO } from './config.js';
import { cleanRows, packLines } from './model.js';

const SETTINGS_KEY = 'notentafel.settings.v1';
// Melodie und Rhythmus haben je eine eigene Tafel, eigene gespeicherte Lieder und einen eigenen Autosave-Platz.
// Die Melodie behält die alten Schlüssel, damit bisherige Stände dort weiterleben.
const KEYS = {
  mel: { board: 'notentafel.v1', songs: 'notentafel.songs.v1', auto: 'notentafel.autosave.v1' },
  rhy: { board: 'notentafel.rhy.v1', songs: 'notentafel.rhy.songs.v1', auto: 'notentafel.rhy.autosave.v1' }
};

function readJSON(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}
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

/* ---------- Aktuelle Tafel ---------- */
export const loadBoard = (mode) => unpack(readJSON(KEYS[mode].board));
export const saveBoard = (mode, rows, name) => writeJSON(KEYS[mode].board, pack(rows, name));

/* ---------- Gespeicherte Lieder, neueste zuerst ---------- */
// Gültige Einträge so, wie sie gespeichert sind
function readSongs(mode) {
  const list = readJSON(KEYS[mode].songs);
  if (!Array.isArray(list)) return [];
  return list.filter((s) => s && typeof s.name === 'string' && cleanRows(s.rows))
    .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}
const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();
export const loadSongs = (mode) => readSongs(mode).map(unpack);
export const songExists = (mode, name) => readSongs(mode).some((s) => sameName(s.name, name));
// Speichert unter name; ein Lied mit gleichem Namen (ohne Groß/klein) wird ersetzt
export function saveSong(mode, rows, name) {
  const rest = readSongs(mode).filter((s) => !sameName(s.name, name));
  rest.unshift(pack(rows, name, Date.now()));
  return writeJSON(KEYS[mode].songs, rest);
}
export const deleteSong = (mode, name) => writeJSON(KEYS[mode].songs, readSongs(mode).filter((s) => s.name !== name));

/* ---------- Autosave: die Tafel, die zuletzt durch Laden oder „Alles löschen“ ersetzt wurde ---------- */
export const loadAuto = (mode) => unpack(readJSON(KEYS[mode].auto));
export const saveAuto = (mode, rows, name) => writeJSON(KEYS[mode].auto, pack(rows, name, Date.now()));

/* ---------- Einstellungen ---------- */
export function loadSettings() {
  const s = readJSON(SETTINGS_KEY) || {};
  return {
    theme: THEME_BY[s.theme] ? s.theme : 'oktave',
    tempo: (s.tempo >= TEMPO.min && s.tempo <= TEMPO.max) ? s.tempo : TEMPO.start,
    lens: s.lens !== false, // Notenzeichen unter den Tönen anzeigen
    mode: s.mode === 'rhy' ? 'rhy' : 'mel', // Bereich der Leiste: Melodie oder Rhythmus
    autoBar: !!s.autoBar, // Taktstriche nach der Taktart
    autoZ: !!s.autoZ, // Zählzeiten nach der Taktart
    prop: !!s.prop, // Breite nach Notenlänge
    wake: s.wake !== false // Bildschirm anlassen
  };
}
export const saveSettings = (settings) => writeJSON(SETTINGS_KEY, settings);
