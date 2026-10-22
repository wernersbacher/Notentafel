// Was zu welcher Stufe gehört. Die einzige Stelle im Server; die Dev-Modi im Frontend bekommen später eine Kopie davon.
// limits.songs: so viele Lieder (alle Bereiche zusammen, ohne Papierkorb) passen ins Konto; null = beliebig viele
const TIERS = {
  guest: { features: [], limits: { songs: 5 } },
  account: { features: [], limits: { songs: 5 } },
  pro: { features: ['lied', 'cloud'], limits: { songs: 50 } }
};

// Neue Konten bekommen Pro bis zum Ende der Beta, danach eine Woche zum Ausprobieren (pb_hooks/main.pb.js).
// Von Hand freischalten: in der Admin-Oberfläche (/_/ → users) pro_until auf das gewünschte Datum setzen.
const BETA_END = '2027-06-30 22:00:00.000Z'; // 1. Juli 2027, 0 Uhr deutscher Zeit
const TRIAL_DAYS = 7;

// pro_until für ein neues Konto im Format von PocketBase
function newUserProUntil(now = new Date()) {
  const trial = new Date(now.getTime() + TRIAL_DAYS * 24 * 3600 * 1000);
  const beta = new Date(BETA_END.replace(' ', 'T'));
  return (trial > beta ? trial : beta).toISOString().replace('T', ' ');
}

// Stufe eines angemeldeten Datensatzes (e.auth) oder guest ohne Anmeldung.
// Pro ist, wessen pro_until in der Zukunft liegt (Abo per Webhook oder von Hand in der Admin-Oberfläche gesetzt).
function tierOf(auth) {
  if (!auth || auth.collection().name !== 'users') return 'guest';
  const until = auth.getString('pro_until');
  return until && new Date(until.replace(' ', 'T')) > new Date() ? 'pro' : 'account';
}

module.exports = { TIERS, BETA_END, TRIAL_DAYS, newUserProUntil, tierOf };
