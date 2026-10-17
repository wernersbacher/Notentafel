// Speicher des Lieds: eigene Schlüssel für das aktuelle Lied, gespeicherte Lieder, Autosave und Einstellungen
import { makeStore, readJSON, writeJSON } from '../core/store.js';
import { cleanSong } from './model.js';

const KEYS = { board: 'notentafel.lied.v1', songs: 'notentafel.lied.songs.v1', auto: 'notentafel.lied.autosave.v1' };
const SETTINGS_KEY = 'notentafel.lied.settings.v1';

// Ein gespeicherter Stand: Taktart, Auftakt, Ereignisse und Name
function pack(song, name, savedAt) {
  const o = { meter: song.meter, pickup: song.pickup, ev: song.ev, name };
  if (savedAt) o.savedAt = savedAt;
  return o;
}
function unpack(d) {
  const song = cleanSong(d);
  return song ? { song, name: typeof d.name === 'string' ? d.name : '', savedAt: d.savedAt || 0 } : null;
}
export const store = makeStore(KEYS, { pack, unpack });

export function cleanLiedSettings(s) {
  s = s || {};
  return {
    autoBar: s.autoBar !== false, // Taktstriche nach der Taktart (Standard: an)
    names: !!s.names, // Notennamen unter den Noten
    autoZ: !!s.autoZ // Zählzeiten nach der Taktart
  };
}
export const loadLiedSettings = () => cleanLiedSettings(readJSON(SETTINGS_KEY));
export const saveLiedSettings = (s) => writeJSON(SETTINGS_KEY, s);
