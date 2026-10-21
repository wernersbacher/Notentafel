/// <reference path="../pb_data/types.d.ts" />

// POST /api/songs/sync: gleicht die gespeicherten Lieder eines Kontos ab. Nur angemeldet und mit der Funktion cloud.
// Body: { since, changes: [{ area, name, savedAt, deleted, data }] }
//   changes  was sich auf dem Gerät seit dem letzten Abgleich geändert hat; je Bereich und Name (ohne Groß/klein)
//            gewinnt der Stand mit dem neueren savedAt, ein gelöschtes Lied kommt mit deleted und ohne data
//   since    now aus der letzten Antwort ('' beim ersten Mal)
// Antwort: { now, songs: [{ area, name, savedAt, deleted, data }] }, alle Einträge, die sich seit since geändert haben
// (auch die eben geschickten und gelöschte).
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
  const valid = (c) => c && AREAS.includes(c.area) && typeof c.name === 'string' && c.name.trim() && c.name.length <= 40
    && Number.isInteger(c.savedAt) && (c.deleted ? true : c.data && typeof c.data === 'object');
  e.app.runInTransaction((tx) => {
    const col = tx.findCollectionByNameOrId('songs');
    for (const c of changes) {
      if (!valid(c)) continue;
      const key = c.name.toLowerCase();
      let rec = null;
      try { rec = tx.findFirstRecordByFilter(col, 'user = {:u} && area = {:a} && key = {:k}', { u: auth.id, a: c.area, k: key }); } catch (err) { /* noch nicht da */ }
      if (rec && rec.getInt('saved_at') >= c.savedAt) continue; // auf dem Server liegt schon ein neuerer Stand
      if (!rec) {
        rec = new Record(col);
        rec.set('user', auth.id);
        rec.set('area', c.area);
        rec.set('key', key);
      }
      rec.set('name', c.name);
      rec.set('saved_at', c.savedAt);
      rec.set('deleted', !!c.deleted);
      rec.set('data', c.deleted ? null : c.data);
      tx.save(rec);
    }
  });

  const filter = since ? 'user = {:u} && updated >= {:since}' : 'user = {:u}';
  const recs = e.app.findRecordsByFilter('songs', filter, 'updated', 0, 0, { u: auth.id, since });
  const songs = recs.map((r) => ({
    area: r.getString('area'), name: r.getString('name'), savedAt: r.getInt('saved_at'), deleted: r.getBool('deleted'),
    data: r.getBool('deleted') ? null : JSON.parse(r.getString('data') || 'null')
  }));
  return e.json(200, { now, songs });
}, $apis.requireAuth('users'));
