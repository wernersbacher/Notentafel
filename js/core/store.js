// Alles liegt im localStorage des Browsers. Der Kern kennt nur JSON; was in einem Stand steht, weiß der Bereich.

export function readJSON(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
export function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}

const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

// Speicher eines Bereichs: aktuelle Tafel, gespeicherte Lieder (neueste zuerst) und ein Autosave-Platz.
// keys = { board, songs, auto }. pack(data, name, savedAt) macht daraus einen speicherbaren Stand,
// unpack(raw) prüft ihn und liefert { name, savedAt, … } oder null.
export function makeStore(keys, { pack, unpack }) {
  // Gültige Einträge so, wie sie gespeichert sind
  function readSongs() {
    const list = readJSON(keys.songs);
    if (!Array.isArray(list)) return [];
    return list.filter((s) => s && typeof s.name === 'string' && unpack(s))
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  }
  return {
    loadBoard: () => unpack(readJSON(keys.board)),
    saveBoard: (data, name) => writeJSON(keys.board, pack(data, name)),
    loadSongs: () => readSongs().map(unpack),
    songExists: (name) => readSongs().some((s) => sameName(s.name, name)),
    // Speichert unter name; ein Lied mit gleichem Namen (ohne Groß/klein) wird ersetzt
    saveSong(data, name) {
      const rest = readSongs().filter((s) => !sameName(s.name, name));
      rest.unshift(pack(data, name, Date.now()));
      return writeJSON(keys.songs, rest);
    },
    deleteSong: (name) => writeJSON(keys.songs, readSongs().filter((s) => s.name !== name)),
    // Autosave: der Stand, der zuletzt durch Laden oder „Alles löschen“ ersetzt wurde
    loadAuto: () => unpack(readJSON(keys.auto)),
    saveAuto: (data, name) => writeJSON(keys.auto, pack(data, name, Date.now()))
  };
}
