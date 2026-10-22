// Alles liegt im localStorage des Browsers. Der Kern kennt nur JSON; was in einem Stand steht, weiß der Bereich.
// Mit Konto gleicht cloud.js die gespeicherten Lieder zusätzlich mit dem Server ab; der localStorage bleibt der
// Speicher, aus dem die App liest.
import { makeSignal } from './signal.js';

export function readJSON(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
// Schreibfehler (Speicher voll oder gesperrt) gehen an einen Listener, damit die App es sagen kann; gespeichert
// wird trotzdem nichts, writeJSON liefert weiterhin false.
let onWriteError = () => {};
export const setWriteError = (f) => { onWriteError = f; };
export function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) {
    try { onWriteError(e); } catch (x) { /* ein werfender Listener darf das Speichern nicht abbrechen */ }
    return false;
  }
}

const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

// Jedes gespeicherte Lied hat eine id, die bleibt, auch wenn es umbenannt wird. Vorn steht der Zeitpunkt des Anlegens,
// so sortieren ältere Lieder vor jüngeren (das ältere behält bei gleichem Namen seinen Namen, siehe resolveNames).
const validId = (id) => typeof id === 'string' && /^[0-9a-z]{9,40}$/.test(id);
export const newId = (t = clock()) => t.toString(36).padStart(9, '0') + Math.random().toString(36).slice(2, 10).padEnd(8, '0');
// Neben savedAt (wann der Inhalt gespeichert wurde, steht in der Liste) hat jedes Lied changedAt: wann es zuletzt
// gespeichert, umbenannt oder gelöscht wurde. Beim Abgleich gewinnt der Stand mit dem neueren changedAt.
const changedAt = (s) => s.changedAt || s.savedAt || 0;

// Uhr für alle Zeitstempel der Lieder. Mit Konto stellt cloud.js sie nach der Uhr des Servers, damit ein Gerät mit
// falsch gehender Uhr beim Abgleich nicht immer gewinnt oder immer verliert.
let clock = () => Date.now();
export const setClock = (f) => { clock = f; };

// Speicher mit area (Name beim Abgleich: 'mel', 'rhy', 'lied'), damit cloud.js sie alle findet
export const syncStores = {};
// Wird nach jedem Speichern, Umbenennen oder Löschen eines Lieds aufgerufen: f(area, id). Liefert eine Funktion
// zum Abmelden.
const changed = makeSignal();
export const onSongChange = (f) => changed(f);

// Gleicher Inhalt, egal in welcher Reihenfolge die Schlüssel stehen (der Server sortiert sie um); id, Name und Zeiten zählen nicht
const canon = (v) => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}'
  : JSON.stringify(v);
const META = { id: 0, name: 0, savedAt: 0, changedAt: 0 };
const sameContent = (a, b) => canon({ ...a, ...META }) === canon({ ...b, ...META });

// Freier Name: „Name (2)“, „Name (3)“ …, höchstens 40 Zeichen
function freeName(name, taken) {
  let i = 2, n;
  do { const tail = ' (' + i++ + ')'; n = name.slice(0, 40 - tail.length) + tail; } while (taken(n));
  return n;
}
// Nach dem Zusammenführen können zwei verschiedene Lieder gleich heißen (auf zwei Geräten unabhängig angelegt oder
// umbenannt). Das ältere (kleinere id) behält den Namen; ein jüngeres mit gleichem Inhalt fällt weg, eins mit anderem
// Inhalt heißt danach „Name (2)“. Jedes Gerät kommt so zum selben Ergebnis. Ändert list und liefert die ids der
// geänderten oder weggefallenen Lieder (die gehen beim nächsten Abgleich an den Server).
function resolveNames(list, now) {
  const touched = [], kept = [];
  for (const s of list.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const first = kept.find((k) => sameName(k.name, s.name));
    if (!first) { kept.push(s); continue; }
    touched.push(s.id);
    if (sameContent(first, s)) { list.splice(list.indexOf(s), 1); continue; }
    s.name = freeName(s.name, (n) => list.some((x) => sameName(x.name, n)));
    s.changedAt = now;
    kept.push(s);
  }
  return touched;
}

// Arbeitet Stände vom Server in die gespeicherten Lieder ein (list wie gespeichert).
// remote: [{ id, name, savedAt, changedAt, deleted, data }]. Je id gewinnt der neuere Stand (changedAt); ein gelöschtes
// Lied verschwindet nur, wenn es hier nicht danach noch geändert wurde. ok(entry) prüft einen Stand.
// Ist ein Lied hier „neuer“, aber gleich (Name und Inhalt), übernimmt es die Zeit vom Server: Der hat einen Zeitstempel
// aus der Zukunft gekappt, und sonst nähme dieses Gerät nie wieder Änderungen von anderen an.
// Liefert { list, touched } (touched siehe resolveNames) oder null, wenn sich nichts geändert hat.
export function mergeSongs(list, remote, ok, now) {
  const out = list.map((s) => ({ ...s }));
  let dirty = false;
  for (const r of remote) {
    const i = out.findIndex((s) => s.id === r.id);
    const mine = i < 0 ? -1 : changedAt(out[i]);
    if (r.deleted) {
      if (i >= 0 && mine <= r.changedAt) { out.splice(i, 1); dirty = true; }
      continue;
    }
    if (mine >= r.changedAt) {
      const m = out[i];
      if (mine > r.changedAt && m.name === r.name && sameContent(m, r.data)) { m.changedAt = r.changedAt; dirty = true; }
      continue;
    }
    const s = { ...r.data, id: r.id, name: r.name, savedAt: r.savedAt, changedAt: r.changedAt };
    if (!ok(s)) continue;
    if (i >= 0) out[i] = s; else out.push(s);
    dirty = true;
  }
  const touched = resolveNames(out, now);
  return dirty || touched.length ? { list: out, touched } : null;
}

// Sicherungsdatei: die gespeicherten Lieder aller Bereiche, so wie sie gespeichert sind (mit id, damit ein erneuter
// Import keine Doppel macht). importAll legt sie wie beim Abgleich dazu und liefert, wie viele neu oder neuer waren,
// oder -1, wenn es keine Sicherungsdatei der Musiktafel ist. Bereiche in einem anderen Format bleiben liegen.
const BACKUP = 'musiktafel-lieder';
export function exportAll(now = new Date()) {
  const areas = {};
  for (const a in syncStores) areas[a] = { format: syncStores[a].format, songs: syncStores[a].rawSongs() };
  return { kind: BACKUP, version: 1, exportedAt: now.toISOString(), areas };
}
export function importAll(file) {
  if (!file || file.kind !== BACKUP || !file.areas || typeof file.areas !== 'object') return -1;
  let n = 0;
  for (const a in file.areas) {
    const store = syncStores[a], part = file.areas[a];
    if (store && part && part.format === store.format && Array.isArray(part.songs)) n += store.importSongs(part.songs);
  }
  return n;
}

// Speicher eines Bereichs: aktuelle Tafel, gespeicherte Lieder (neueste zuerst) und ein Autosave-Platz.
// keys = { board, songs, auto }. pack(data, name, savedAt) macht daraus einen speicherbaren Stand,
// unpack(raw) prüft ihn und liefert { name, savedAt, … } oder null. Mit area nimmt der Speicher am Abgleich teil;
// format (z. B. 'tafel.1') sagt dem Server, in welchem Format die Lieder sind. Ändert sich das Format, bekommt es eine
// neue Nummer, und Lieder in einem Format, das diese Version der App nicht kennt, lässt sie beim Abgleich liegen.
export function makeStore(keys, { pack, unpack, area, format }) {
  // Gültige Einträge so, wie sie gespeichert sind. Lieder von vor den ids bekommen hier einmal eine.
  function readSongs() {
    const list = readJSON(keys.songs);
    if (!Array.isArray(list)) return [];
    const out = list.filter((s) => s && typeof s.name === 'string' && unpack(s))
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    if (out.some((s) => !validId(s.id))) {
      out.forEach((s) => { if (!validId(s.id)) s.id = newId(s.savedAt || clock()); });
      writeJSON(keys.songs, out);
    }
    return out;
  }
  const notify = (ok, id) => { if (ok && area) changed.emit(area, id); return ok; };
  const store = {
    area,
    format,
    loadBoard: () => unpack(readJSON(keys.board)),
    saveBoard: (data, name) => writeJSON(keys.board, pack(data, name)),
    // Wie unpack, dazu die id
    loadSongs: () => readSongs().map((s) => ({ ...unpack(s), id: s.id })),
    // Gibt es den Namen schon (ohne Groß/klein)? exceptId: dieses Lied nicht mitzählen (beim Umbenennen)
    songExists: (name, exceptId) => readSongs().some((s) => s.id !== exceptId && sameName(s.name, name)),
    // Speichert unter name; ein Lied mit gleichem Namen (ohne Groß/klein) wird ersetzt und behält seine id
    saveSong(data, name) {
      const list = readSongs(), old = list.find((s) => sameName(s.name, name)), now = clock();
      const entry = { ...pack(data, name, now), id: old ? old.id : newId(now), changedAt: now };
      const rest = list.filter((s) => s !== old);
      rest.unshift(entry);
      return notify(writeJSON(keys.songs, rest), entry.id);
    },
    deleteSong: (id) => notify(writeJSON(keys.songs, readSongs().filter((s) => s.id !== id)), id),
    // Neuer Name, Inhalt und Datum bleiben. Liefert 'ok', 'taken' (ein anderes Lied heißt schon so) oder 'error'.
    renameSong(id, name) {
      const list = readSongs(), s = list.find((x) => x.id === id);
      if (!s) return 'error';
      if (list.some((x) => x !== s && sameName(x.name, name))) return 'taken';
      s.name = name;
      s.changedAt = clock();
      return notify(writeJSON(keys.songs, list), id) ? 'ok' : 'error';
    },
    // Autosave: der Stand, der zuletzt durch Laden oder „Alles löschen“ ersetzt wurde
    loadAuto: () => unpack(readJSON(keys.auto)),
    saveAuto: (data, name) => writeJSON(keys.auto, pack(data, name, clock())),
    // Für den Abgleich: ein gespeichertes Lied so, wie es gespeichert ist (oder undefined), alle ids,
    // und Stände vom Server einarbeiten. merge liefert die ids, die danach an den Server müssen, und failed,
    // wenn das Schreiben nicht geklappt hat (dann hat sich hier nichts geändert).
    rawSong: (id) => readSongs().find((s) => s.id === id),
    songIds: () => readSongs().map((s) => s.id),
    // Alle gespeicherten Lieder so, wie sie gespeichert sind (zum Exportieren)
    rawSongs: () => readSongs(),
    merge(remote, now = clock()) {
      const known = remote.filter((r) => r.deleted || !r.format || r.format === format);
      const m = mergeSongs(readSongs(), known, unpack, now);
      if (!m) return { merged: false, touched: [], failed: false }; // nichts zu ändern
      if (!writeJSON(keys.songs, m.list)) return { merged: false, touched: [], failed: true };
      return { merged: true, touched: m.touched, failed: false };
    },
    // Lieder aus einer exportierten Datei (wie rawSongs) dazulegen: wie beim Abgleich je id der neuere Stand,
    // gleiche Namen werden aufgelöst. Liefert, wie viele Lieder dazugekommen oder neuer geworden sind.
    importSongs(list) {
      // Name höchstens 40 Zeichen wie im Eingabefeld (Grenze des Servers), sonst nähme er das Lied nicht an
      const remote = list.filter((s) => s && validId(s.id) && typeof s.name === 'string')
        .map((s) => ({ id: s.id, name: s.name.slice(0, 40), savedAt: s.savedAt || 0, changedAt: changedAt(s), data: s }));
      const before = new Map(readSongs().map((s) => [s.id, changedAt(s)]));
      const m = mergeSongs(readSongs(), remote, unpack, clock());
      if (!m || !writeJSON(keys.songs, m.list)) return 0;
      const mine = new Set(remote.map((r) => r.id));
      const fresh = m.list.filter((s) => mine.has(s.id) && before.get(s.id) !== changedAt(s)).map((s) => s.id);
      new Set([...fresh, ...m.touched]).forEach((id) => notify(true, id));
      return fresh.length;
    }
  };
  if (area) syncStores[area] = store;
  return store;
}
