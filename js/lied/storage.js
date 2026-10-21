// Speicher des Lieds: eigene Schlüssel für das aktuelle Lied, gespeicherte Lieder, Autosave und Einstellungen
import { makeStore, readJSON, writeJSON } from '../core/store.js';
import { cleanSong, parsePitch, comparePitch } from './model.js';

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
export const store = makeStore(KEYS, { pack, unpack, area: 'lied' });

export function cleanLiedSettings(s) {
  s = s || {};
  // Tonraum der Zufallsnote im Tonnamen-Quiz: zwei Stammtöne, der untere tiefer als der obere (Standard c' bis c''')
  const white = (p) => typeof p === 'string' && !!parsePitch(p);
  const range = white(s.quizLo) && white(s.quizHi) && comparePitch(s.quizLo, s.quizHi) < 0;
  return {
    quizMode: s.quizMode === 'song' ? 'song' : 'rand', // Tonnamen-Quiz: Zufallsnote oder Lied durchgehen
    quizLo: range ? s.quizLo : 'c1',
    quizHi: range ? s.quizHi : 'c3',
    quizSharp: !!s.quizSharp, // Zufallsnoten auch mit ♯
    quizFlat: !!s.quizFlat, // Zufallsnoten auch mit ♭
    valLevel: [1, 2, 3].includes(s.valLevel) ? s.valLevel : 1, // Notenwerte: leicht, mittel (+ Achtel), schwer (+ 16tel, punktiert)
    valRests: !!s.valRests, // Notenwerte: auch Pausen
    autoBar: s.autoBar !== false, // Taktstriche nach der Taktart (Standard: an)
    names: !!s.names, // Notennamen unter den Noten
    colors: !!s.colors, // Notenköpfe in den Farben der Töne (wie die Farbnoten)
    autoZ: !!s.autoZ, // Zählzeiten nach der Taktart
    lyrics: s.lyrics !== false, // Liedtext unter den Noten (Standard: an)
    check: s.check !== false, // Takte prüfen (Standard: an)
    size: [1, 2, 3].includes(s.size) ? s.size : 1, // Notengröße: normal, groß, sehr groß
    wrap: s.wrap !== false, // Zeilen automatisch umbrechen (Standard: an)
    allTones: !!s.allTones // in der Leiste auch die Töne der kleinen und dreigestrichenen Oktave
  };
}
export const loadLiedSettings = () => cleanLiedSettings(readJSON(SETTINGS_KEY));
export const saveLiedSettings = (s) => writeJSON(SETTINGS_KEY, s);
