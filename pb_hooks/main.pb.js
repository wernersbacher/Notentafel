/// <reference path="../pb_data/types.d.ts" />

// GET /api/me: Stufe, Funktionen und Grenzen des Aufrufers. Ohne gültigen Token: guest.
routerAdd('GET', '/api/me', (e) => {
  // Jeder Handler läuft in eigenem Kontext, gemeinsamer Code wird darum hier geladen
  const { TIERS, tierOf } = require(`${__hooks}/tiers.js`);
  const auth = e.auth;
  const tier = tierOf(auth);
  const user = tier === 'guest' ? null
    : { id: auth.id, email: auth.email(), name: auth.getString('name'), pro_until: auth.getString('pro_until') || null };
  return e.json(200, { tier, features: TIERS[tier].features, limits: TIERS[tier].limits, user });
});

// Neue Konten: Pro bis zum Ende der Beta, danach eine Woche (siehe tiers.js). Läuft auch beim Anlegen in der
// Admin-Oberfläche; ein dort schon eingetragenes pro_until bleibt.
onRecordCreate((e) => {
  const { newUserProUntil } = require(`${__hooks}/tiers.js`);
  if (!e.record.getString('pro_until')) e.record.set('pro_until', newUserProUntil());
  e.next();
}, 'users');

// POST /api/me/logout-all: von allen Geräten abmelden. Ein neuer Schlüssel macht jedes bisher ausgestellte Token
// ungültig, auch das des Aufrufers; die Seite meldet danach lokal ab.
routerAdd('POST', '/api/me/logout-all', (e) => {
  const user = e.auth;
  user.refreshTokenKey();
  $app.save(user);
  return e.noContent(204);
}, $apis.requireAuth('users'));

// GET /api/me/export: alle Daten des Kontos als Datei zum Herunterladen (Profil, Lieder, Papierkorb), siehe export.js.
// Kein Abgleich nötig, auch ohne die Funktion cloud: Es sind die eigenen Daten.
routerAdd('GET', '/api/me/export', (e) => {
  const { buildExport, exportName } = require(`${__hooks}/export.js`);
  const user = e.auth;
  const songs = e.app.findRecordsByFilter('songs', 'user = {:u}', '', 0, 0, { u: user.id }).map((r) => ({
    area: r.getString('area'), id: r.getString('sid'), format: r.getString('format'), name: r.getString('name'),
    savedAt: r.getInt('saved_at'), changedAt: r.getInt('changed_at'), deleted: r.getBool('deleted'),
    data: JSON.parse(r.getString('data') || 'null')
  }));
  const account = {
    id: user.id, email: user.email(), name: user.getString('name'), created: user.getString('created'),
    verified: user.verified(), pro_until: user.getString('pro_until') || null
  };
  const now = new Date();
  const h = e.response.header();
  h.set('Content-Disposition', 'attachment; filename="' + exportName(now) + '"');
  h.set('Cache-Control', 'no-store');
  return e.json(200, buildExport(account, songs, now));
}, $apis.requireAuth('users'));

// POST /api/me/delete { password }: löscht das Konto endgültig, mit allen Liedern darin (songs löscht mit, auch den
// Papierkorb: cascadeDelete in pb_migrations/1761100000_songs.js). Das Passwort wird noch einmal geprüft; über die
// Sammlungs-API geht das Löschen nicht mehr (deleteRule, pb_migrations/1761600000_users_delete_rule.js).
routerAdd('POST', '/api/me/delete', (e) => {
  const user = e.auth;
  const password = (e.requestInfo().body || {}).password;
  if (typeof password !== 'string' || !user.validatePassword(password)) {
    throw new BadRequestError('Das Passwort stimmt nicht.', { password: new ValidationError('validation_invalid_password', 'Das Passwort stimmt nicht.') });
  }
  // Später: ein aktives Abo blockiert das Löschen oder wird hier zuerst gekündigt (Zahlungsdienst, notentafel-5z1.12)
  e.app.delete(user);
  return e.noContent(204);
}, $apis.requireAuth('users'));
