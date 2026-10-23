// Was zu welcher Stufe gehört. Die einzige Stelle im Server; die Dev-Modi im Frontend bekommen eine Kopie davon.
// features (nur Pro): known = bekannte Lieder (Liedersammlung), cloud = Abgleich ins Konto, export = MusicXML und Druck ohne Wasserzeichen.
// limits (null = unbegrenzt). Gast und Konto ohne Pro sind Lite: zum Ausprobieren, im Schulalltag zu klein.
//   songs          so viele eigene Lieder (alle Bereiche zusammen, ohne Papierkorb); bei Pro die Grenze im Konto,
//                  bei Lite nur auf dem Gerät, denn den Abgleich (cloud) gibt es nur mit Pro
//   measures       Takte pro Tafel/Notenblatt (etwa 2 Zeilen)
//   games          offene Spiele je Bereich
//   quizQuestions  Fragen je Quiz-Runde
// Alle Zahlen stehen nur hier, damit sie sich später ohne Code-Änderung anpassen lassen.
const LITE = { features: [], limits: { songs: 3, measures: 8, games: 2, quizQuestions: 5 } };
const TIERS = {
  guest: { features: [...LITE.features], limits: { ...LITE.limits } },
  account: { features: [...LITE.features], limits: { ...LITE.limits } },
  pro: { features: ['known', 'cloud', 'export'], limits: { songs: 50, measures: null, games: null, quizQuestions: null } }
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

// Lite gibt es vorerst nur in der Entwicklung (npm run dev:lite, ?tier=…). In der Produktion gilt für alle Pro, auch ohne Anmeldung,
// solange LITE_AKTIV false ist. Auf true setzen, wenn Lite freigegeben wird: dann zählt wieder tierOf.
const LITE_AKTIV = false;

// Stufe, nach der Funktionen und Grenzen vergeben werden (die Anzeige im Konto liest weiter pro_until)
function effectiveTier(auth) {
  return LITE_AKTIV ? tierOf(auth) : 'pro';
}

module.exports = { TIERS, BETA_END, TRIAL_DAYS, LITE_AKTIV, newUserProUntil, tierOf, effectiveTier };
