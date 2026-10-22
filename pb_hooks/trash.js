// Papierkorb: Gelöschte Lieder bleiben 30 Tage mit Name und Inhalt stehen (zum Wiederherstellen), danach werden sie
// endgültig gelöscht. Damit niemand mit ständigem Anlegen und Löschen die Datenbank füllt, liegen je Konto höchstens
// MAX_TRASH Lieder im Papierkorb; darüber fallen die ältesten sofort weg.
// Die Auswahl steckt in reinen Funktionen (für die Tests); purgeTrash/capTrash holen nur die Datensätze und löschen.
const DAYS = 30;
const MAX_TRASH = 100;

// Was älter als DAYS ist. songs: { changedAt, ... } wie in sync.js; die Objekte gehen unverändert zurück.
function tooOld(songs, nowMs) {
  const before = nowMs - DAYS * 24 * 3600 * 1000;
  return songs.filter((s) => s.changedAt < before);
}
// Bei nach changedAt absteigend sortierter Liste: was über die neuesten max hinausgeht, also die ältesten.
function overCap(songs, max = MAX_TRASH) {
  return songs.slice(max);
}

// Für die reinen Auswahlfunktionen: nur das Feld, der Datensatz hängt fürs Löschen dran
const view = (r) => ({ rec: r, changedAt: r.getInt('changed_at') });

// Was älter als DAYS ist, für alle Konten (täglich aus trash.pb.js)
function purgeTrash(app) {
  const old = tooOld(app.findRecordsByFilter('songs', 'deleted = true', '', 0, 0, {}).map(view), Date.now());
  old.forEach((s) => app.delete(s.rec));
  return old.length;
}
// Höchstens MAX_TRASH im Papierkorb eines Kontos (nach jedem Abgleich)
function capTrash(app, userId) {
  const all = app.findRecordsByFilter('songs', 'user = {:u} && deleted = true', '-changed_at', 0, 0, { u: userId });
  overCap(all.map(view)).forEach((s) => app.delete(s.rec));
}

module.exports = { DAYS, MAX_TRASH, tooOld, overCap, purgeTrash, capTrash };
