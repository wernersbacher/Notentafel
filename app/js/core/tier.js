// Stufe der Nutzerin oder des Nutzers (guest, account, pro) und was dazugehört: plan.has('cloud'), plan.limit('songs').
// Mit Backend kommt beides vom Server (GET /api/me, über shared/auth.js); ohne Backend aus shared/env.js (ENV.tier),
// im Dev zusätzlich per ?tier=guest|account|pro an der Adresse. Fehlt env.js, gilt guest (der sichere Fall).
// Die Tabelle TIERS ist eine Kopie von pb_hooks/tiers.js für die Modi ohne Backend; test/tier.test.mjs vergleicht beide.
import { makeSignal } from './signal.js';
import { loadEnv, initAuth, onAuthChange, currentUser, currentMe, api } from '../../../shared/auth.js';

// features: 'known' = bekannte Lieder, 'cloud' = Abgleich, 'export' = MusicXML und Druck ohne Wasserzeichen
// limits: null = unbegrenzt
export const TIERS = {
  guest: { features: [], limits: { songs: 3, measures: 8, games: 2, quizQuestions: 5 } },
  account: { features: [], limits: { songs: 3, measures: 8, games: 2, quizQuestions: 5 } },
  pro: { features: ['known', 'cloud', 'export'], limits: { songs: 50, measures: null, games: null, quizQuestions: null } }
};

let tier = 'guest';
let backend = false; // true: Stufe, Funktionen und Grenzen kommen vom Server
const tierSignal = makeSignal();

const info = () => (backend && (currentMe() || guestMe)) || TIERS[tier];

export const plan = {
  get tier() { return tier; },
  has: (feature) => info().features.includes(feature),
  // null = unbegrenzt (auch für unbekannte Namen)
  limit(name) {
    const v = (info().limits || {})[name];
    return v === undefined ? null : v;
  }
};

// f(tier) bei jeder Änderung der Stufe (Anmelden, Abmelden). Liefert eine Funktion zum Abmelden.
export const onTier = (f) => tierSignal(f);

function setTier(next) {
  if (!TIERS[next]) next = 'guest';
  if (next === tier) return;
  tier = next;
  tierSignal.emit(tier);
}

// Mit Backend: Stufe vom Server holen, auch ohne Anmeldung (solange Lite nicht freigegeben ist, gilt dort Pro für alle,
// siehe LITE_AKTIV in pb_hooks/tiers.js). Bei einem Fehler gilt guest.
let guestMe = null; // Antwort von /me ohne Anmeldung
async function fromServer() {
  try {
    guestMe = currentUser() ? null : await api('/me');
    const me = currentUser() ? currentMe() || (await api('/me')) : guestMe;
    setTier(me.tier);
  } catch { guestMe = null; setTier('guest'); }
}

// Umgebung lesen und Stufe bestimmen; vor dem Anmelden der Bereiche aufrufen.
// { env, search } nur für Tests: env ersetzt shared/env.js (null = Datei fehlt), search die Adresse (?tier=…)
export async function loadPlan({ env, search } = {}) {
  if (env === undefined) env = await loadEnv();
  backend = !!(env && env.backend);
  if (backend) {
    initAuth(env.backend);
    onAuthChange(fromServer);
    await fromServer();
    return plan;
  }
  let next = env && TIERS[env.tier] ? env.tier : 'guest';
  // Zum Umschalten im Dev; mit Backend wirkungslos (return oben)
  const q = new URLSearchParams(search !== undefined ? search : globalThis.location ? globalThis.location.search : '').get('tier');
  if (q && TIERS[q]) next = q;
  setTier(next);
  return plan;
}

// Hinweis für Tipp-Geräte (kein Hover), wenn eine Lite-Grenze erreicht ist; die Zahl kommt aus plan.limit.
// Mit Pro (nur songs hat dort eine Grenze) heißt es nur, dass nichts mehr hineinpasst.
export function limitText(name) {
  const n = plan.limit(name);
  const lite = plan.tier !== 'pro';
  switch (name) {
    case 'songs': return lite ? 'Lite: höchstens ' + n + ' Lieder – mit Pro mehr.' : 'Es passen höchstens ' + n + ' Lieder.';
    case 'measures': return 'Lite: höchstens ' + n + ' Takte – mit Pro unbegrenzt.';
    case 'quizQuestions': return 'Lite: ' + n + ' Fragen pro Runde – mit Pro unbegrenzt.';
    case 'games': return 'Dieses Spiel gibt es mit Pro.';
    default: return 'Mit Pro unbegrenzt.';
  }
}

// Welche Spiele eines Bereichs sind offen? ids in der Reihenfolge der Kacheln; die ersten limit('games') (null = alle)
// sind offen. Spiele in exempt (z. B. „Lied erraten“, das eine eigene Pro-Funktion ist) zählen nicht mit und bleiben offen.
export function openGames(ids, limit = plan.limit('games'), exempt = []) {
  let left = limit == null ? Infinity : limit;
  return new Set(ids.filter((id) => exempt.includes(id) || left-- > 0));
}
