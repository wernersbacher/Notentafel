/// <reference path="../pb_data/types.d.ts" />

// POST /api/songs/sync: gleicht die gespeicherten Lieder eines Kontos ab. Nur angemeldet und mit der Funktion cloud.
// Body: { since, changes: [...] }
//   changes  was sich auf dem Gerät seit dem letzten Abgleich geändert hat, je Lied (id) gewinnt das neuere changedAt:
//            { area, id, name, savedAt, changedAt, data } gespeichert oder umbenannt (holt auch ein gelöschtes zurück),
//            { area, id, changedAt, deleted: true } gelöscht; Name und Inhalt bleiben dann auf dem Server stehen
//   since    now aus der letzten Antwort ('' beim ersten Mal)
// Antwort: { now, songs: [{ area, id, name, savedAt, changedAt, deleted, data }] }, alle Lieder, die sich seit since
// geändert haben (auch die eben geschickten und gelöschte, diese ohne data).
routerAdd('POST', '/api/songs/sync', (e) => {
  const { TIERS, tierOf } = require(`${__hooks}/tiers.js`);
  const auth = e.auth;
  if (!TIERS[tierOf(auth)].features.includes('cloud')) throw new ForbiddenError('Abgleich nur mit Pro.');
  const body = e.requestInfo().body || {};
  const since = typeof body.since === 'string' ? body.since : '';
  const changes = Array.isArray(body.changes) ? body.changes : [];
  if (changes.length > 500) throw new BadRequestError('Zu viele Änderungen auf einmal.');
  // Vor dem Schreiben: was ab jetzt geändert wird, kommt beim nächsten Abgleich (noch einmal) mit
  const now = new DateTime().string();

  const AREAS = ['mel', 'rhy', 'lied'];
  const valid = (c) => c && AREAS.includes(c.area) && typeof c.id === 'string' && /^[0-9a-z]{9,40}$/.test(c.id)
    && Number.isInteger(c.changedAt) && (c.deleted
      || (typeof c.name === 'string' && c.name.trim() && c.name.length <= 40 && Number.isInteger(c.savedAt) && c.data && typeof c.data === 'object'));
  e.app.runInTransaction((tx) => {
    const col = tx.findCollectionByNameOrId('songs');
    for (const c of changes) {
      if (!valid(c)) continue;
      let rec = null;
      try { rec = tx.findFirstRecordByFilter(col, 'user = {:u} && sid = {:s}', { u: auth.id, s: c.id }); } catch (err) { /* noch nicht da */ }
      if (rec && rec.getInt('changed_at') >= c.changedAt) continue; // auf dem Server liegt schon ein neuerer Stand
      if (!rec) {
        if (c.deleted) continue; // nie angekommen, schon wieder gelöscht
        rec = new Record(col);
        rec.set('user', auth.id);
        rec.set('sid', c.id);
      }
      rec.set('area', c.area);
      rec.set('changed_at', c.changedAt);
      rec.set('deleted', !!c.deleted);
      if (!c.deleted) {
        rec.set('name', c.name);
        rec.set('saved_at', c.savedAt);
        rec.set('data', c.data);
      }
      tx.save(rec);
    }
  });

  const filter = since ? 'user = {:u} && updated >= {:since}' : 'user = {:u}';
  const recs = e.app.findRecordsByFilter('songs', filter, 'updated', 0, 0, { u: auth.id, since });
  const songs = recs.map((r) => {
    const deleted = r.getBool('deleted');
    return {
      area: r.getString('area'), id: r.getString('sid'), name: r.getString('name'), savedAt: r.getInt('saved_at'),
      changedAt: r.getInt('changed_at'), deleted, data: deleted ? null : JSON.parse(r.getString('data') || 'null')
    };
  });
  return e.json(200, { now, songs });
}, $apis.requireAuth('users'));
