// Daten eines Kontos als Datei (GET /api/me/export in main.pb.js). Die Datei hat das Sicherungsformat der App
// (exportAll in app/js/core/store.js: kind, version, exportedAt, areas), damit sie sich dort unter Lieder
// importieren lässt; Lieder stehen so da, wie der Abgleich sie auf dem Gerät ablegt (mergeSongs in store.js:
// Inhalt, dazu id, name, savedAt, changedAt). Zusätzlich account (Profil) und trash (gelöschte Lieder, getrennt,
// damit ein Import sie nicht zurückholt). Reine Funktionen, ohne PocketBase; test/export.test.mjs prüft sie.
// PocketBase lädt nur *.pb.js als Handler, diese Datei wird darum nur per require geladen.

const BACKUP = 'musiktafel-lieder';

// Neueste zuerst, wie die App ihre Lieder ablegt
const newestFirst = (a, b) => (b.savedAt || 0) - (a.savedAt || 0);

// Ein Lied so, wie die App es speichert: der Inhalt, darüber id, Name und Zeiten
const local = (s) => ({ ...s.data, id: s.id, name: s.name, savedAt: s.savedAt, changedAt: s.changedAt });

// account: { id, email, name, created, verified, pro_until }
// songs: alle Datensätze des Kontos als { area, id, format, name, savedAt, changedAt, deleted, data }
// Ergebnis: { kind, version, exportedAt, account, areas: { <Bereich>: { format, songs } }, trash }
//   areas  nur Bereiche mit Liedern. Hat ein Bereich Lieder in verschiedenen Formaten, steht das des neuesten unter
//          areas (nur dieses nimmt die App an); die anderen liegen vollständig in other (area, format, Lied)
//   trash  gelöschte Lieder: { area, format, id, name, savedAt, deletedAt, data }
function buildExport(account, songs, now = new Date()) {
  const areas = {}, other = [];
  const live = songs.filter((s) => !s.deleted).sort(newestFirst);
  for (const s of live) {
    // Ein leeres Format (alte Einträge) gehört zum Format des Bereichs
    const part = areas[s.area] || (areas[s.area] = { format: s.format || '', songs: [] });
    if (!part.format) part.format = s.format || '';
    if (!s.format || s.format === part.format) part.songs.push(local(s));
    else other.push({ area: s.area, format: s.format, ...local(s) });
  }
  const trash = songs.filter((s) => s.deleted).sort((a, b) => b.changedAt - a.changedAt)
    .map((s) => ({ area: s.area, format: s.format, id: s.id, name: s.name, savedAt: s.savedAt, deletedAt: s.changedAt, data: s.data }));
  const file = { kind: BACKUP, version: 1, exportedAt: now.toISOString(), account, areas, trash };
  if (other.length) file.other = other;
  return file;
}

// Dateiname des Downloads: musiktafel-konto-JJJJ-MM-TT.json
const exportName = (now = new Date()) => 'musiktafel-konto-' + now.toISOString().slice(0, 10) + '.json';

module.exports = { BACKUP, buildExport, exportName };
