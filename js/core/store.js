// Alles liegt im localStorage des Browsers. Der Kern kennt nur JSON; was in einem Stand steht, weiß der Bereich.
// Mit Konto gleicht cloud.js die gespeicherten Lieder zusätzlich mit dem Server ab; der localStorage bleibt der
// Speicher, aus dem die App liest.

export function readJSON(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
export function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}

const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

// Speicher mit area (Name beim Abgleich: 'mel', 'rhy', 'lied'), damit cloud.js sie alle findet
export const syncStores = {};
// Wird nach jedem Speichern oder Löschen eines Lieds aufgerufen: f(area, name)
let changed = () => {};
export const onSongChange = (f) => { changed = f; };

// Arbeitet Stände vom Server in die gespeicherten Lieder ein (list wie gespeichert, neueste zuerst egal).
// remote: [{ name, savedAt, deleted, data }]. Je Name (ohne Groß/klein) gewinnt der neuere Stand; ein gelöschtes Lied
// verschwindet nur, wenn es hier nicht nach dem Löschen noch einmal gespeichert wurde. ok(data) prüft einen Stand.
// Liefert die neue Liste oder null, wenn sich nichts geändert hat.
export function mergeSongs(list, remote, ok) {
  let out = list.slice(), dirty = false;
  for (const r of remote) {
    const i = out.findIndex((s) => sameName(s.name, r.name));
    const mine = i < 0 ? -1 : out[i].savedAt || 0;
    if (r.deleted) {
      if (i >= 0 && mine <= r.savedAt) { out.splice(i, 1); dirty = true; }
      continue;
    }
    if (mine >= r.savedAt) continue;
    const s = { ...r.data, name: r.name, savedAt: r.savedAt };
    if (!ok(s)) continue;
    if (i >= 0) out[i] = s; else out.push(s);
    dirty = true;
  }
  return dirty ? out : null;
}

// Gleicher Inhalt, egal in welcher Reihenfolge die Schlüssel stehen (der Server sortiert sie um); Name und savedAt zählen nicht
const canon = (v) => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}'
  : JSON.stringify(v);
export const sameContent = (a, b) => canon({ ...a, name: 0, savedAt: 0 }) === canon({ ...b, name: 0, savedAt: 0 });

// Anmelden auf einem Gerät: Die Lieder hier und die im Konto können unabhängig voneinander entstanden sein.
// Damit beim Zusammenführen nichts verloren geht, wird list (wie gespeichert) vorher angepasst:
// - Liegt im Konto ein Lied mit gleichem Namen, aber anderem Inhalt, heißt das hiesige danach „Name (2)“ (oder 3 …).
// - Wurde ein Lied gleichen Namens im Konto gelöscht, gilt das hiesige als neu gespeichert (savedAt = now),
//   sonst würde das alte Löschen es mitnehmen.
// Ausgenommen sind Lieder, die hier seit dem letzten Abgleich mit diesem Konto unverändert sind (known(name) liefert
// das savedAt von damals): Das ist nur ein älterer Stand desselben Lieds, dort gewinnt einfach der neuere.
// Liefert die neue Liste oder null, wenn sich nichts geändert hat.
export function adoptSongs(list, remote, now, known = () => undefined) {
  const out = list.map((s) => ({ ...s })), taken = (n) => out.some((s) => sameName(s.name, n)) || remote.some((r) => sameName(r.name, n));
  let dirty = false;
  for (const r of remote) {
    const s = out.find((x) => sameName(x.name, r.name));
    if (!s || known(s.name) === s.savedAt) continue;
    if (r.deleted) {
      if ((s.savedAt || 0) <= r.savedAt) { s.savedAt = now; dirty = true; }
    } else if (!sameContent(s, r.data)) {
      let i = 2, n;
      do { const tail = ' (' + i++ + ')'; n = s.name.slice(0, 40 - tail.length) + tail; } while (taken(n));
      s.name = n;
      dirty = true;
    }
  }
  return dirty ? out : null;
}

// Speicher eines Bereichs: aktuelle Tafel, gespeicherte Lieder (neueste zuerst) und ein Autosave-Platz.
// keys = { board, songs, auto }. pack(data, name, savedAt) macht daraus einen speicherbaren Stand,
// unpack(raw) prüft ihn und liefert { name, savedAt, … } oder null. Mit area nimmt der Speicher am Abgleich teil.
export function makeStore(keys, { pack, unpack, area }) {
  // Gültige Einträge so, wie sie gespeichert sind
  function readSongs() {
    const list = readJSON(keys.songs);
    if (!Array.isArray(list)) return [];
    return list.filter((s) => s && typeof s.name === 'string' && unpack(s))
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  }
  const store = {
    loadBoard: () => unpack(readJSON(keys.board)),
    saveBoard: (data, name) => writeJSON(keys.board, pack(data, name)),
    loadSongs: () => readSongs().map(unpack),
    songExists: (name) => readSongs().some((s) => sameName(s.name, name)),
    // Speichert unter name; ein Lied mit gleichem Namen (ohne Groß/klein) wird ersetzt
    saveSong(data, name) {
      const rest = readSongs().filter((s) => !sameName(s.name, name));
      rest.unshift(pack(data, name, Date.now()));
      const ok = writeJSON(keys.songs, rest);
      if (ok && area) changed(area, name);
      return ok;
    },
    deleteSong(name) {
      const ok = writeJSON(keys.songs, readSongs().filter((s) => s.name !== name));
      if (ok && area) changed(area, name);
      return ok;
    },
    // Autosave: der Stand, der zuletzt durch Laden oder „Alles löschen“ ersetzt wurde
    loadAuto: () => unpack(readJSON(keys.auto)),
    saveAuto: (data, name) => writeJSON(keys.auto, pack(data, name, Date.now())),
    // Für den Abgleich: ein gespeichertes Lied so, wie es gespeichert ist (oder undefined), alle Namen,
    // und Stände vom Server einarbeiten (true, wenn sich etwas geändert hat)
    rawSong: (name) => readSongs().find((s) => sameName(s.name, name)),
    songNames: () => readSongs().map((s) => s.name),
    merge(remote) {
      const list = mergeSongs(readSongs(), remote, unpack);
      return !!list && writeJSON(keys.songs, list);
    },
    adopt(remote, now, known) {
      const list = adoptSongs(readSongs(), remote, now, known);
      return !!list && writeJSON(keys.songs, list);
    }
  };
  if (area) syncStores[area] = store;
  return store;
}
