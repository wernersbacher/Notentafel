/// <reference path="../pb_data/types.d.ts" />

// POST /api/songs/sync: gleicht die gespeicherten Lieder eines Kontos ab. Nur angemeldet und mit der Funktion cloud.
// Body: { since, changes: [...] }
//   changes  was sich auf dem Gerät seit dem letzten Abgleich geändert hat, je Lied (id) gewinnt das neuere changedAt:
//            { area, id, format, name, savedAt, changedAt, data } gespeichert oder umbenannt (holt auch eins aus dem
//            Papierkorb zurück), { area, id, changedAt, deleted: true } gelöscht: Das Lied liegt dann 30 Tage im
//            Papierkorb (Name und Inhalt bleiben), danach löscht es trash.pb.js endgültig
//   since    now aus der letzten Antwort ('' beim ersten Mal)
// Antwort: { now, nowMs, limit, rejected, songs }
//   songs     alle Lieder, die sich seit since geändert haben (auch die eben geschickten und gelöschte, diese ohne data):
//             [{ area, id, format, name, savedAt, changedAt, deleted, data }]
//   rejected  ids neuer Lieder, die nicht mehr ins Konto passten (limit, siehe tiers.js); sie bleiben auf dem Gerät
//   nowMs     Uhrzeit des Servers, danach stellt die App ihre Zeitstempel (Geräte mit falsch gehender Uhr)
routerAdd('POST', '/api/songs/sync', (e) => {
  const { TIERS, tierOf } = require(`${__hooks}/tiers.js`);
  const auth = e.auth;
  const tier = TIERS[tierOf(auth)];
  if (!tier.features.includes('cloud')) throw new ForbiddenError('Abgleich nur mit Pro.');
  const limit = tier.limits.songs;
  const body = e.requestInfo().body || {};
  const since = typeof body.since === 'string' ? body.since : '';
  const changes = Array.isArray(body.changes) ? body.changes : [];
  if (changes.length > 500) throw new BadRequestError('Zu viele Änderungen auf einmal.');
  // Vor dem Schreiben: was ab jetzt geändert wird, kommt beim nächsten Abgleich (noch einmal) mit
  const now = new DateTime().string();
  const nowMs = Date.now();
  // Zeitstempel aus der Zukunft (Uhr des Geräts geht vor) zählen als jetzt, sonst gewönne das Gerät jeden Vergleich
  const clamp = (t) => Math.min(t, nowMs);

  const AREAS = ['mel', 'rhy', 'lied'];
  const valid = (c) => c && AREAS.includes(c.area) && typeof c.id === 'string' && /^[0-9a-z]{9,40}$/.test(c.id)
    && Number.isInteger(c.changedAt) && (c.deleted
      || (typeof c.name === 'string' && c.name.trim() && c.name.length <= 40 && Number.isInteger(c.savedAt)
        && typeof c.format === 'string' && c.format.length <= 20 && c.data && typeof c.data === 'object'));
  const rejected = [];
  e.app.runInTransaction((tx) => {
    const col = tx.findCollectionByNameOrId('songs');
    let active = tx.countRecords(col, $dbx.hashExp({ user: auth.id, deleted: false }));
    for (const c of changes) {
      if (!valid(c)) continue;
      const changedAt = clamp(c.changedAt);
      let rec = null;
      try { rec = tx.findFirstRecordByFilter(col, 'user = {:u} && sid = {:s}', { u: auth.id, s: c.id }); } catch (err) { /* noch nicht da */ }
      if (rec && rec.getInt('changed_at') >= changedAt) continue; // auf dem Server liegt schon ein neuerer Stand
      if (!rec && c.deleted) continue; // nie angekommen, schon wieder gelöscht
      // Ein neues Lied oder eins aus dem Papierkorb braucht Platz im Konto
      const adds = !c.deleted && (!rec || rec.getBool('deleted'));
      if (adds && limit !== null && active >= limit) { rejected.push(c.id); continue; }
      if (adds) active++;
      else if (c.deleted && !rec.getBool('deleted')) active--;
      if (!rec) {
        rec = new Record(col);
        rec.set('user', auth.id);
        rec.set('sid', c.id);
      }
      rec.set('area', c.area);
      rec.set('changed_at', changedAt);
      rec.set('deleted', !!c.deleted);
      if (!c.deleted) {
        rec.set('format', c.format);
        rec.set('name', c.name);
        rec.set('saved_at', clamp(c.savedAt));
        rec.set('data', c.data);
      }
      tx.save(rec);
    }
  });
  require(`${__hooks}/trash.js`).capTrash(e.app, auth.id);

  const filter = since ? 'user = {:u} && updated >= {:since}' : 'user = {:u}';
  const recs = e.app.findRecordsByFilter('songs', filter, 'updated', 0, 0, { u: auth.id, since });
  const songs = recs.map((r) => {
    const deleted = r.getBool('deleted');
    return {
      area: r.getString('area'), id: r.getString('sid'), format: r.getString('format'), name: r.getString('name'),
      savedAt: r.getInt('saved_at'), changedAt: r.getInt('changed_at'), deleted,
      data: deleted ? null : JSON.parse(r.getString('data') || 'null')
    };
  });
  return e.json(200, { now, nowMs, limit, rejected, songs });
}, $apis.requireAuth('users'));
