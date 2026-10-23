// Anmeldung für alle Seiten der Musiktafel (Landing, Konto, App): Anfragen an die API (PocketBase, ohne SDK),
// Anmelden, Registrieren, Abmelden, Daten herunterladen, Konto löschen, Passwort zurücksetzen, E-Mail bestätigen, Profil und Sicherheit. Das Token liegt im localStorage und gilt damit auf jeder Seite
// derselben Domain. Der Abgleich der Lieder ist Sache der App (app/js/core/cloud.js), er hört auf onAuthChange.
// Diese Datei hängt von nichts unter app/ ab.
const KEY = 'notentafel.auth.v1';
const OLD_KEY = 'notentafel.konto.v1'; // früher hielt cloud.js hier auch das Token

let base = null; // Adresse der API, null ohne Backend
let auth = null; // { token, user: { id, email, name } } oder null
let me = null; // Antwort von /api/me: { tier, features, limits, … }
const listeners = new Set();
let wired = false;

/* ---------- Speicher ---------- */
// localStorage kann fehlen oder werfen (privates Fenster, gesperrt): dann bleibt die Anmeldung nur im Speicher
function read(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch { /* nichts zu tun */ }
}
const userOf = (r) => ({ id: r.id, email: r.email, name: r.name || '' });
const valid = (a) => !!(a && a.token && a.user && a.user.id);

// Beim ersten Mal nach dem Update: Token und Konto aus dem alten Schlüssel übernehmen, ohne neue Anmeldung.
// Im alten Schlüssel bleibt der Abgleichstand; das Token fliegt dort raus, damit eine Abmeldung nicht wieder
// auflebt. Die Konto-id merkt sich cloud.js dort als userId, so gibt es keinen erneuten Erst-Abgleich.
function migrate() {
  const old = read(OLD_KEY);
  if (!old || !old.token || !old.user || !old.user.id) return null;
  const a = { token: old.token, user: { id: old.user.id, email: old.user.email, name: old.user.name || '' } };
  write(KEY, a);
  const { token, user, ...rest } = old;
  write(OLD_KEY, { ...rest, userId: user.id });
  return a;
}
function load() {
  const stored = read(KEY);
  auth = valid(stored) ? stored : stored ? null : migrate();
  me = null;
}

/* ---------- Zustand ---------- */
export const currentUser = () => (auth ? auth.user : null);
// Antwort von /api/me, solange sie seit dem Anmelden oder Erneuern bekannt ist
export const currentMe = () => me;
export const hasBackend = () => !!base;

// f(user) bei jeder Änderung der Anmeldung (angemeldet, abgemeldet, anderes Konto, neuer Name), auch wenn sie
// auf einer anderen Seite oder in einem anderen Tab passiert ist. Liefert eine Funktion zum Abmelden.
export function onAuthChange(f) {
  listeners.add(f);
  return () => listeners.delete(f);
}
const notify = () => listeners.forEach((f) => f(currentUser()));

// Backend-Adresse und gespeicherte Anmeldung laden. Ohne Backend (null) bleibt alles abgemeldet.
export function initAuth(backend) {
  base = backend || null;
  load();
  if (!wired && typeof window !== 'undefined') {
    wired = true;
    // Anmeldung oder Abmeldung in einem anderen Tab (oder auf einer anderen Seite)
    window.addEventListener('storage', (e) => {
      if (e.key !== KEY && e.key !== null) return;
      load();
      notify();
    });
  }
}
// shared/env.js ({ backend, tier }); ohne die Datei null
export const loadEnv = () => import('./env.js').then((m) => m.ENV, () => null);
// Adresse der API aus shared/env.js; ohne die Datei gibt es kein Backend
export const loadBackend = () => loadEnv().then((env) => (env ? env.backend : null));

function set(next) {
  auth = next;
  write(KEY, next);
}

/* ---------- Anfragen ---------- */
export class ApiError extends Error {
  constructor(status, data) { super((data && data.message) || 'Fehler ' + status); this.status = status; this.data = data || {}; }
}
// token: nimmt dieses statt des gespeicherten (beim Anmelden, bevor es gespeichert wird)
export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const t = token || (auth && auth.token);
  if (t) headers.Authorization = t;
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}
// Meldung beim Anmelden mit unbestätigter E-Mail; die Anmeldeseite erkennt daran, dass sie die Mail erneut anbietet
export const NOT_VERIFIED = 'Bitte bestätige zuerst deine E-Mail-Adresse. Den Link dazu haben wir dir geschickt.';
// Fehlermeldung für die Oberfläche; ohne Antwort vom Server liegt es meist am Netz
export function message(err) {
  if (!(err instanceof ApiError)) return 'Keine Verbindung zum Server.';
  const d = err.data.data || {};
  if (d.token) return 'Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.';
  if (d.oldPassword) return 'Das alte Passwort stimmt nicht.';
  // bestätigt man eine neue E-Mail, ist das Passwort das des Kontos, nicht ein neues
  if (d.password && d.password.code === 'validation_invalid_password') return 'Das Passwort stimmt nicht.';
  const mail = d.email || d.newEmail;
  if (mail && mail.code === 'validation_not_unique') return 'Für diese E-Mail gibt es schon ein Konto.';
  if (mail && mail.code === 'validation_not_in_invalid') return 'Diese Adresse kannst du nicht verwenden, zum Beispiel weil es schon deine ist.';
  if (mail) return 'Bitte eine gültige E-Mail eingeben.';
  if (d.name) return 'Der Name darf höchstens 60 Zeichen haben.';
  if (d.password) return 'Das Passwort braucht mindestens 8 Zeichen.';
  // richtiges Passwort, aber die E-Mail ist noch nicht bestätigt (PocketBase antwortet dann 403, bei falschem Passwort 400)
  if (err.status === 403 && /authenticate/i.test(err.message)) return NOT_VERIFIED;
  if (err.status === 400 && /authenticate/i.test(err.message)) return 'E-Mail oder Passwort stimmt nicht.';
  if (err.status === 429) return 'Zu viele Versuche, bitte kurz warten.';
  return 'Das hat nicht geklappt (' + err.status + ').';
}

/* ---------- Anmelden ---------- */
// Liefert '' oder eine Fehlermeldung. Das Token wird erst gespeichert, wenn der Server das Konto bestätigt (/me).
// Sonst bliebe nach einem Fehler ein gültiges Token gespeichert, die Seite zeigte aber kein Konto (und nach dem
// Neuladen wäre man still angemeldet).
export async function login(email, password) {
  try {
    const r = await api('/collections/users/auth-with-password', { method: 'POST', body: { identity: email, password } });
    const info = await api('/me', { token: r.token });
    me = info;
    set({ token: r.token, user: userOf(r.record) });
  } catch (err) { return message(err); }
  notify();
  return '';
}
// Legt das Konto an und schickt die Bestätigungsmail, meldet aber nicht an: ein Konto gilt erst nach dem Link
// aus der Mail. Liefert '' oder eine Fehlermeldung. Schlägt nur der Versand fehl, ist das Konto trotzdem da; die
// Seite bietet dann „Mail erneut senden“ an.
export async function register(email, password) {
  try {
    await api('/collections/users/records', { method: 'POST', body: { email, password, passwordConfirm: password } });
  } catch (err) { return message(err); }
  await requestVerification(email);
  return '';
}
// Schickt die Mail zum Zurücksetzen. Die Antwort ist immer 204, auch bei unbekannter E-Mail; nur Netz- und
// Formatfehler kommen zurück, so verrät die Seite nicht, welche Konten es gibt.
export async function requestPasswordReset(email) {
  try { await api('/collections/users/request-password-reset', { method: 'POST', body: { email } }); } catch (err) { return message(err); }
  return '';
}
// Neues Passwort mit dem Token aus der Mail setzen; danach ist man nirgends angemeldet, das Token ist verbraucht
export async function confirmPasswordReset(token, password) {
  try {
    await api('/collections/users/confirm-password-reset', { method: 'POST', body: { token, password, passwordConfirm: password } });
  } catch (err) { return message(err); }
  return '';
}
// Schickt die Bestätigungsmail erneut (auch hier immer 204)
export async function requestVerification(email) {
  try { await api('/collections/users/request-verification', { method: 'POST', body: { email } }); } catch (err) { return message(err); }
  return '';
}
export async function confirmVerification(token) {
  try { await api('/collections/users/confirm-verification', { method: 'POST', body: { token } }); } catch (err) { return message(err); }
  return '';
}
// Ziel nach dem Anmelden aus ?next=: nur Pfade auf dieser Seite, sonst /app/. Abgelehnt werden //host, /\host
// (Browser lesen \ wie /), Steuerzeichen (Tab und Zeilenumbruch fallen beim Auflösen weg) und alles mit Schema.
export function safeNext(next) {
  const fallback = '/app/';
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  return next;
}
export function logout() {
  me = null;
  set(null);
  notify();
}
// Löscht das Konto samt den Liedern darin auf dem Server (endgültig, auch den Papierkorb), das Passwort wird noch
// einmal geprüft. Die Lieder auf diesem Gerät bleiben. Liefert '' oder eine Meldung.
export async function deleteAccount(password) {
  try { await api('/me/delete', { method: 'POST', body: { password } }); } catch (err) { return message(err); }
  logout();
  return '';
}
// Lädt alle Daten des Kontos als Datei herunter (GET /me/export: Profil, Lieder, Papierkorb). Mit dem Token geholt
// und über einen Link im Dokument gespeichert, weil ein einfacher Link keinen Header mitschicken kann.
// Liefert '' oder eine Meldung; der Dateiname kommt vom Server.
export async function downloadExport() {
  try {
    const res = await fetch(base + '/me/export', { headers: { Authorization: auth.token } });
    if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
    const name = /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') || '');
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = name ? name[1] : 'musiktafel-konto.json';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (err) { return message(err); }
  return '';
}
/* ---------- Profil und Sicherheit ---------- */
// Anzeigename ändern; danach steht er im gespeicherten Konto und die Kopfleiste zieht nach. Liefert '' oder eine Meldung.
export async function updateProfile({ name }) {
  try {
    const r = await api('/collections/users/records/' + auth.user.id, { method: 'PATCH', body: { name: name.trim() } });
    set({ token: auth.token, user: userOf(r) });
  } catch (err) { return message(err); }
  notify();
  return '';
}
// Passwort ändern (das alte ist nötig). Der Server macht dabei alle Token ungültig, auch dieses; darum wird gleich
// mit dem neuen Passwort neu angemeldet.
export async function changePassword(oldPassword, password) {
  const email = auth.user.email;
  try {
    await api('/collections/users/records/' + auth.user.id, { method: 'PATCH', body: { oldPassword, password, passwordConfirm: password } });
  } catch (err) { return message(err); }
  return login(email, password);
}
// Schickt den Link zum Bestätigen der neuen Adresse an diese; die alte gilt, bis er benutzt wurde
export async function requestEmailChange(newEmail) {
  try { await api('/collections/users/request-email-change', { method: 'POST', body: { newEmail } }); } catch (err) { return message(err); }
  return '';
}
// Neue Adresse mit dem Token aus der Mail und dem Passwort bestätigen; danach sind alle Token ungültig, also
// wird hier abgemeldet (auch wenn die Seite nur ein altes Token kannte)
export async function confirmEmailChange(token, password) {
  try { await api('/collections/users/confirm-email-change', { method: 'POST', body: { token, password } }); } catch (err) { return message(err); }
  if (auth) logout();
  return '';
}
// Von allen Geräten abmelden: der Server macht jedes Token ungültig, danach auch hier abmelden
export async function logoutAll() {
  try { await api('/me/logout-all', { method: 'POST' }); } catch (err) { return message(err); }
  logout();
  return '';
}

// Token erneuern und das Konto holen (liefert /api/me). Ist das Token abgelaufen, das Konto weg oder nicht bestätigt (401, 403, 404),
// wird abgemeldet und der Fehler weitergegeben; bei anderen Fehlern (offline) bleibt man angemeldet.
export async function refresh() {
  try {
    const r = await api('/collections/users/auth-refresh', { method: 'POST' });
    const user = userOf(r.record), changed = !auth || JSON.stringify(user) !== JSON.stringify(auth.user);
    set({ token: r.token, user });
    if (changed) notify();
    me = await api('/me');
    return me;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403 || err.status === 404) && auth) logout();
    throw err;
  }
}

// Ein oder zwei Großbuchstaben fürs Avatar-Rund: aus dem Namen, sonst aus dem Teil der E-Mail vor dem @
export function initials(user) {
  if (!user) return '';
  const src = (user.name || '').trim() || String(user.email || '').split('@')[0];
  const words = src.split(/[\s._-]+/).filter(Boolean).map((w) => Array.from(w)[0]);
  if (!words.length) return '?';
  return (words.length > 1 ? words[0] + words[words.length - 1] : words[0]).toLocaleUpperCase('de');
}
