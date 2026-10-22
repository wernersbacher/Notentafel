// Gemeinsame Helfer für die Tests: ein localStorage-Ersatz und die kleinen Lied-Bausteine.
// Diese Datei hat beim Import keine Seiteneffekte (node --test lädt sie als Datei ohne Testfälle mit).

// In-Memory-localStorage wie im Browser: setItem speichert den Wert als String, getItem gibt null für fehlende
// Schlüssel. failKey: dieser Schlüssel scheitert beim Schreiben (Speicher voll oder gesperrt). Er lässt sich am
// zurückgegebenen Objekt umstellen, damit ein Test das Scheitern an- und wieder abschalten kann.
export function fakeStorage({ failKey = null } = {}) {
  const mem = new Map();
  const storage = {
    failKey,
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { if (k === storage.failKey) throw new Error('voll'); mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); },
    clear: () => mem.clear()
  };
  return storage;
}

// Lied-Bausteine: Note mit Tonhöhe p und Wert v, Pause, Lied aus Ereignissen (pickup 0 = kein Auftakt)
export const n = (p, v = 4, x = {}) => ({ p, v, ...x });
export const r = (v = 4, x = {}) => ({ v, ...x });
export const song = (ev, meter = '4/4', pickup = 0) => ({ meter, pickup, ev });
