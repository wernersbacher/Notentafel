/// <reference path="../pb_data/types.d.ts" />

// POST /api/songs/sync: gleicht die gespeicherten Lieder eines Kontos ab. Nur angemeldet und mit der Funktion cloud.
// Body: { since, changes: [...] }
//   changes  was sich auf dem Gerät seit dem letzten Abgleich geändert hat, je Lied (id) gewinnt das neuere changedAt:
//            { area, id, format, name, savedAt, changedAt, data } gespeichert oder umbenannt (holt auch eins aus dem
//            Papierkorb zurück), { area, id, changedAt, deleted: true } gelöscht: Das Lied liegt dann 30 Tage im
//            Papierkorb (Name und Inhalt bleiben), danach löscht es trash.pb.js endgültig
//   since    now aus der letzten Antwort ('' beim ersten Mal)
// Antwort: { now, nowMs, limit, rejected, refused, songs }
//   songs     alle Lieder, die sich seit since geändert haben (auch die eben geschickten und gelöschte, diese ohne data):
//             [{ area, id, format, name, savedAt, changedAt, deleted, data }]
//   rejected  ids neuer Lieder, die nicht mehr ins Konto passten (limit, siehe tiers.js); sie bleiben auf dem Gerät
//   refused   [{ id, reason }] Änderungen, die der Server nicht annimmt und die deshalb nicht ins Konto kommen:
//             reason ist 'area', 'id', 'changedAt', 'name', 'savedAt', 'format', 'data' (fehlt oder falsch),
//             'size' (Inhalt größer als die data-Spalte erlaubt) oder 'save' (Speichern scheiterte).
//             Eine solche Änderung hält die übrigen nicht auf; sie werden trotzdem gespeichert.
//   nowMs     Uhrzeit des Servers, danach stellt die App ihre Zeitstempel (Geräte mit falsch gehender Uhr)
// Was angenommen wird, entscheidet planSync (sync.js); hier bleibt nur Body lesen, einspielen und antworten.
routerAdd('POST', '/api/songs/sync', (e) => {
  const { TIERS, effectiveTier } = require(`${__hooks}/tiers.js`);
  const { MAX_CHANGES, planSync } = require(`${__hooks}/sync.js`);
  const auth = e.auth;
  const tier = TIERS[effectiveTier(auth)];
  if (!tier.features.includes('cloud')) throw new ForbiddenError('Abgleich nur mit Pro.');
  const limit = tier.limits.songs;
  const body = e.requestInfo().body || {};
  const since = typeof body.since === 'string' ? body.since : '';
  const changes = Array.isArray(body.changes) ? body.changes : [];
  if (changes.length > MAX_CHANGES) throw new BadRequestError('Zu viele Änderungen auf einmal.');
  // Vor dem Schreiben: was ab jetzt geändert wird, kommt beim nächsten Abgleich (noch einmal) mit
  const now = new DateTime().string();
  const nowMs = Date.now();

  let plan;
  e.app.runInTransaction((tx) => {
    const col = tx.findCollectionByNameOrId('songs');
    const existing = tx.findRecordsByFilter(col, 'user = {:u}', '', 0, 0, { u: auth.id })
      .map((r) => ({ id: r.getString('sid'), changedAt: r.getInt('changed_at'), deleted: r.getBool('deleted') }));
    plan = planSync(existing, changes, nowMs, limit);
    for (const w of plan.writes) {
      let rec = null;
      try { rec = tx.findFirstRecordByFilter(col, 'user = {:u} && sid = {:s}', { u: auth.id, s: w.id }); } catch (err) { /* noch nicht da */ }
      if (!rec) {
        rec = new Record(col);
        rec.set('user', auth.id);
        rec.set('sid', w.id);
      }
      rec.set('area', w.area);
      rec.set('changed_at', w.changedAt);
      rec.set('deleted', w.deleted);
      if (!w.deleted) {
        rec.set('format', w.format);
        rec.set('name', w.name);
        rec.set('saved_at', w.savedAt);
        rec.set('data', w.data);
      }
      try {
        tx.save(rec);
      } catch (err) {
        // Eine kaputte Änderung darf die übrigen nicht mitreißen (sonst rollt die ganze Transaktion zurück
        // und der Abgleich bliebe für dieses Gerät für immer stecken)
        plan.refused.push({ id: w.id, reason: 'save' });
      }
    }
  });
  // Anders als früher zählt planSync den Platz schon für alle geplanten Änderungen, nicht erst nach erfolgreichem
  // Speichern: scheitert ein save, gilt für die übrigen Änderungen desselben Aufrufs trotzdem der geplante Stand
  // (ein gescheitertes Anlegen hält so Platz frei, ein gescheitertes Löschen gibt so keinen frei). Betroffen ist
  // nur dieser eine Aufruf; der nächste rechnet wieder anhand der Datenbank.
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
  return e.json(200, { now, nowMs, limit, rejected: plan.rejected, refused: plan.refused, songs });
}, $apis.requireAuth('users'));
