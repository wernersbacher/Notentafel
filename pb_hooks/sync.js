// Regeln von POST /api/songs/sync, ohne PocketBase: songs.pb.js liest nur den Body und spielt ein, was hier
// herauskommt; test/cloud.test.mjs und test/sync.test.mjs nehmen dieselben Funktionen. PocketBase lädt nur *.pb.js
// als Handler, diese Datei wird darum nur per require geladen.

// Die drei Bereiche der App; ein Lied gehört genau zu einem
const AREAS = ['mel', 'rhy', 'lied'];
// Grenze der data-Spalte (maxSize in pb_migrations/1761100000_songs.js): Größeres nimmt die Datenbank nicht an
const MAX_DATA = 200000;
// So viele Änderungen darf ein Gerät in einem Aufruf schicken; mehr deutet auf einen kaputten Client
const MAX_CHANGES = 500;

// Warum eine Änderung nicht angenommen wird (null: gültig). Der Grund geht als refused zurück und bleibt dort,
// statt still zu verschwinden.
function refusal(c) {
  if (!c || typeof c !== 'object' || !AREAS.includes(c.area)) return 'area';
  if (typeof c.id !== 'string' || !/^[0-9a-z]{9,40}$/.test(c.id)) return 'id';
  if (!Number.isInteger(c.changedAt)) return 'changedAt';
  if (c.deleted) return null;
  if (typeof c.name !== 'string' || !c.name.trim() || c.name.length > 40) return 'name';
  if (!Number.isInteger(c.savedAt)) return 'savedAt';
  if (typeof c.format !== 'string' || c.format.length > 20) return 'format';
  if (!c.data || typeof c.data !== 'object') return 'data';
  if (JSON.stringify(c.data).length > MAX_DATA) return 'size';
  return null;
}

// Plant einen Abgleich, ohne etwas zu schreiben.
//   songs    die vorhandenen Lieder des Kontos als { id, changedAt, deleted } (auch die im Papierkorb)
//   changes  der Body des Abgleichs
//   nowMs    Uhrzeit des Servers
//   limit    Grenze aus tiers.js (null = beliebig viele)
// Ergebnis { writes, rejected, refused }:
//   writes   die anzunehmenden Änderungen in der Reihenfolge der Anfrage, schon normalisiert; adds/frees sagen,
//            ob die Änderung Platz belegt oder frei gibt
//   rejected ids neuer Lieder, für die im Konto kein Platz mehr war
//   refused  { id, reason } wie refusal
function planSync(songs, changes, nowMs, limit) {
  const rejected = [];
  const refused = [];
  // id so, wie der Client sie zum Zuordnen schicken kann, auch wenn sie kein gültiger Lied-Schlüssel ist
  const refuse = (c, reason) => refused.push(c && c.id !== undefined && c.id !== null ? { id: String(c.id), reason } : { reason });
  // Zeitstempel aus der Zukunft (Uhr des Geräts geht vor) zählen als jetzt, sonst gewönne das Gerät jeden Vergleich
  const clamp = (t) => Math.min(t, nowMs);

  const byId = new Map(songs.map((s) => [s.id, s]));
  let active = songs.filter((s) => !s.deleted).length;
  const writes = [];
  for (const c of changes) {
    const reason = refusal(c);
    if (reason) { refuse(c, reason); continue; }
    const changedAt = clamp(c.changedAt);
    const rec = byId.get(c.id);
    if (rec && rec.changedAt >= changedAt) continue; // auf dem Server liegt schon ein neuerer Stand
    if (!rec && c.deleted) continue; // nie angekommen, schon wieder gelöscht
    // Ein neues Lied oder eins aus dem Papierkorb braucht Platz im Konto
    const adds = !c.deleted && (!rec || rec.deleted);
    if (adds && limit !== null && active >= limit) { rejected.push(c.id); continue; }
    const frees = !!c.deleted && !rec.deleted; // Löschen gibt Platz frei
    const w = { id: c.id, area: c.area, changedAt, deleted: !!c.deleted, adds, frees };
    if (!c.deleted) Object.assign(w, { format: c.format, name: c.name, savedAt: clamp(c.savedAt), data: c.data });
    writes.push(w);
    // Spätere Änderungen derselben Anfrage sehen schon diesen Stand (sie liegen in derselben Transaktion)
    byId.set(c.id, { id: c.id, changedAt, deleted: w.deleted });
    if (adds) active++;
    else if (frees) active--;
  }
  return { writes, rejected, refused };
}

module.exports = { AREAS, MAX_DATA, MAX_CHANGES, refusal, planSync };
