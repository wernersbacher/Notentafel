// Speicher des Lieds: eigene Schlüssel für das aktuelle Lied, gespeicherte Lieder, Autosave und Einstellungen
import { makeStore, readJSON, writeJSON } from '../core/store.js';
import { cleanSong } from './model.js';

const KEYS = { board: 'notentafel.lied.v1', songs: 'notentafel.lied.songs.v1', auto: 'notentafel.lied.autosave.v1' };
const SETTINGS_KEY = 'notentafel.lied.settings.v1';

// Ein gespeicherter Stand: Taktart, Auftakt, Ereignisse und Name
function pack(song, name, savedAt) {
  const o = { meter: song.meter, pickup: song.pickup, key: song.key || 0, ev: song.ev, name };
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
    colors: !!s.colors, // Notenköpfe in den Farben der Töne (wie die Farbnoten)
    autoZ: !!s.autoZ, // Zählzeiten nach der Taktart
    check: s.check !== false, // Takte prüfen (Standard: an)
    size: [1, 2, 3].includes(s.size) ? s.size : 1, // Notengröße: normal, groß, sehr groß
    wrap: s.wrap !== false, // Zeilen automatisch umbrechen (Standard: an)
    allTones: !!s.allTones // in der Leiste auch die Töne der kleinen und dreigestrichenen Oktave
  };
}
export const loadLiedSettings = () => cleanLiedSettings(readJSON(SETTINGS_KEY));
export const saveLiedSettings = (s) => writeJSON(SETTINGS_KEY, s);
