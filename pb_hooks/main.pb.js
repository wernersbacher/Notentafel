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
