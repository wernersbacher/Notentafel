/// <reference path="../pb_data/types.d.ts" />

// GET /api/me: Stufe, Funktionen und Grenzen des Aufrufers. Ohne gültigen Token: guest.
// Pro ist, wessen pro_until in der Zukunft liegt (Abo per Webhook oder von Hand in der Admin-Oberfläche gesetzt).
routerAdd('GET', '/api/me', (e) => {
  // Jeder Handler läuft in eigenem Kontext, gemeinsamer Code wird darum hier geladen
  const tiers = require(`${__hooks}/tiers.js`);
  const auth = e.auth;
  let tier = 'guest';
  let user = null;
  if (auth && auth.collection().name === 'users') {
    const until = auth.getString('pro_until');
    tier = until && new Date(until.replace(' ', 'T')) > new Date() ? 'pro' : 'account';
    user = { id: auth.id, email: auth.email(), name: auth.getString('name'), pro_until: until || null };
  }
  return e.json(200, { tier, features: tiers[tier].features, limits: tiers[tier].limits, user });
});
