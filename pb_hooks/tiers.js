// Was zu welcher Stufe gehört. Die einzige Stelle im Server; die Dev-Modi im Frontend bekommen später eine Kopie davon.
const TIERS = {
  guest: { features: [], limits: { songs: 5 } },
  account: { features: [], limits: { songs: 5 } },
  pro: { features: ['lied', 'cloud'], limits: { songs: null } }
};

// Neue Konten bekommen vorerst Pro bis zu diesem Tag (pb_hooks/main.pb.js). Soll es später eine Lite-Stufe geben,
// fällt das weg; wer schon ein Konto hat, behält sein pro_until, bis es in der Admin-Oberfläche geändert wird.
const NEW_USER_PRO_UNTIL = '2099-12-31 23:59:59.000Z';

// Stufe eines angemeldeten Datensatzes (e.auth) oder guest ohne Anmeldung.
// Pro ist, wessen pro_until in der Zukunft liegt (Abo per Webhook oder von Hand in der Admin-Oberfläche gesetzt).
function tierOf(auth) {
  if (!auth || auth.collection().name !== 'users') return 'guest';
  const until = auth.getString('pro_until');
  return until && new Date(until.replace(' ', 'T')) > new Date() ? 'pro' : 'account';
}

module.exports = { TIERS, NEW_USER_PRO_UNTIL, tierOf };
