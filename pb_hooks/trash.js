// Papierkorb: Gelöschte Lieder bleiben 30 Tage mit Name und Inhalt stehen (zum Wiederherstellen), danach werden sie
// endgültig gelöscht. Damit niemand mit ständigem Anlegen und Löschen die Datenbank füllt, liegen je Konto höchstens
// MAX_TRASH Lieder im Papierkorb; darüber fallen die ältesten sofort weg.
const DAYS = 30;
const MAX_TRASH = 100;

// Was älter als DAYS ist, für alle Konten (täglich aus trash.pb.js)
function purgeTrash(app) {
  const before = Date.now() - DAYS * 24 * 3600 * 1000;
  const old = app.findRecordsByFilter('songs', 'deleted = true && changed_at < {:t}', '', 0, 0, { t: before });
  old.forEach((r) => app.delete(r));
  return old.length;
}
// Höchstens MAX_TRASH im Papierkorb eines Kontos (nach jedem Abgleich)
function capTrash(app, userId) {
  const over = app.findRecordsByFilter('songs', 'user = {:u} && deleted = true', '-changed_at', 0, MAX_TRASH, { u: userId });
  over.forEach((r) => app.delete(r));
}

module.exports = { DAYS, MAX_TRASH, purgeTrash, capTrash };
