// Konto und Abgleich der gespeicherten Lieder mit dem Server (PocketBase, siehe pb_hooks/songs.pb.js).
// Ohne Backend (npm start) oder ohne Anmeldung passiert hier nichts, die App speichert wie immer nur im Browser.
// Mit Konto bleibt der localStorage der Speicher, aus dem die App liest. Jedes Speichern und Löschen merkt sich
// cloud.js (pending) und schickt es kurz danach an den Server; die Antwort bringt mit, was sich auf anderen Geräten
// geändert hat. Je Lied gewinnt der neuere Stand.
import { readJSON, writeJSON, syncStores, onSongChange } from './store.js';

const KEY = 'notentafel.konto.v1';
// acc = { token, user: { id, email }, since, pending: [{ area, name, at }] }; leer, wenn niemand angemeldet ist
let acc = {};
let base = null; // Adresse der API, null ohne Backend
let me = null; // Antwort von /api/me: { tier, features, … }
let running = null, again = false, timer = null;
let lastSync = 0, error = '';
const listeners = new Set();

const persist = () => writeJSON(KEY, acc);

// Welcher Stand jedes Lieds zuletzt mit dem Konto übereinstimmte: { user, songs: { 'mel/name': savedAt } }.
// Bleibt beim Abmelden liegen, damit beim erneuten Anmelden ein inzwischen woanders geänderter Stand nicht als
// eigenes Lied gilt (siehe adoptSongs).
const KNOWN = 'notentafel.konto.abgleich.v1';
const knownKey = (area, name) => area + '/' + name.toLowerCase();
function remember(songs) {
  const k = readJSON(KNOWN);
  const known = k && k.user === acc.user.id ? k : { user: acc.user.id, songs: {} };
  for (const s of songs) {
    if (s.deleted) delete known.songs[knownKey(s.area, s.name)];
    else known.songs[knownKey(s.area, s.name)] = s.savedAt;
  }
  writeJSON(KNOWN, known);
}
// f(merged) nach jeder Änderung am Zustand; merged: Lieder vom Server sind hinzugekommen oder haben sich geändert
export const onCloudChange = (f) => { listeners.add(f); };
const emit = (merged) => listeners.forEach((f) => f(!!merged));

const loggedIn = () => !!acc.token;
const canSync = () => loggedIn() && !!me && me.features.includes('cloud');
export const cloudInfo = () => ({
  available: !!base, user: loggedIn() ? acc.user : null, sync: canSync(), tier: me && me.tier, busy: !!running, lastSync, error
});

/* ---------- Anfragen ---------- */
class ApiError extends Error {
  constructor(status, data) { super((data && data.message) || 'Fehler ' + status); this.status = status; this.data = data || {}; }
}
async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (acc.token) headers.Authorization = acc.token;
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}
// Fehlermeldung für die Oberfläche; ohne Antwort vom Server liegt es meist am Netz
function message(err) {
  if (!(err instanceof ApiError)) return 'Keine Verbindung zum Server.';
  const d = err.data.data || {};
  if (d.email && d.email.code === 'validation_not_unique') return 'Für diese E-Mail gibt es schon ein Konto.';
  if (d.email) return 'Bitte eine gültige E-Mail eingeben.';
  if (d.password) return 'Das Passwort braucht mindestens 8 Zeichen.';
  if (err.status === 400 && /authenticate/i.test(err.message)) return 'E-Mail oder Passwort stimmt nicht.';
  if (err.status === 429) return 'Zu viele Versuche, bitte kurz warten.';
  return 'Das hat nicht geklappt (' + err.status + ').';
}
// Token abgelaufen oder Konto weg: abmelden, die Lieder auf dem Gerät bleiben
function dropLogin() {
  acc = {};
  me = null;
  persist();
}

/* ---------- Anmelden ---------- */
// Nach dem Anmelden: erst holen, was im Konto liegt, dann die Lieder dieses Geräts dazulegen (adopt sorgt dafür,
// dass dabei keins verloren geht) und alle hochschicken
async function start(auth) {
  acc = { token: auth.token, user: { id: auth.record.id, email: auth.record.email }, since: '', pending: [] };
  persist();
  me = await api('/me');
  if (!canSync()) { emit(); return; }
  const res = await api('/songs/sync', { method: 'POST', body: { since: '', changes: [] } });
  const now = Date.now(), k = readJSON(KNOWN), known = k && k.user === acc.user.id ? k.songs : {};
  for (const area in syncStores) {
    const store = syncStores[area], remote = res.songs.filter((s) => s.area === area);
    store.adopt(remote, now, (name) => known[knownKey(area, name)]);
    store.merge(remote);
    store.songNames().forEach((name) => acc.pending.push({ area, name, at: now }));
  }
  remember(res.songs);
  acc.since = res.now;
  persist();
  emit(true);
  await sync();
}
// Liefert '' oder eine Fehlermeldung
export async function login(email, password) {
  try {
    await start(await api('/collections/users/auth-with-password', { method: 'POST', body: { identity: email, password } }));
    return '';
  } catch (err) { return message(err); }
}
export async function register(email, password) {
  try {
    await api('/collections/users/records', { method: 'POST', body: { email, password, passwordConfirm: password } });
  } catch (err) { return message(err); }
  return login(email, password);
}
export function logout() {
  clearTimeout(timer);
  dropLogin();
  emit();
}
// Löscht das Konto samt den Liedern darin auf dem Server. Die Lieder auf diesem Gerät bleiben.
export async function deleteAccount() {
  try { await api('/collections/users/records/' + acc.user.id, { method: 'DELETE' }); } catch (err) { return message(err); }
  logout();
  return '';
}

/* ---------- Abgleich ---------- */
function queue(area, name) {
  if (!loggedIn()) return;
  const key = name.toLowerCase();
  acc.pending = (acc.pending || []).filter((p) => p.area !== area || p.name.toLowerCase() !== key);
  acc.pending.push({ area, name, at: Date.now() });
  persist();
  clearTimeout(timer);
  timer = setTimeout(sync, 800);
}
// Schickt, was noch aussteht, und arbeitet ein, was vom Server kommt. Läuft schon ein Abgleich, folgt gleich danach ein weiterer.
export function sync() {
  if (!base || !loggedIn()) return Promise.resolve();
  if (running) { again = true; return running; }
  running = run().finally(() => {
    running = null;
    if (again) { again = false; return sync(); }
  });
  return running;
}
async function run() {
  try {
    // Beim Start offline gewesen: Stufe jetzt holen
    if (!me) me = await api('/me');
  } catch (err) {
    if (err.status === 401) dropLogin();
    error = message(err);
    emit();
    return;
  }
  if (!canSync()) return;
  const sent = acc.pending.slice();
  // Was gerade da ist, nicht was beim Speichern da war: ein inzwischen gelöschtes Lied geht als gelöscht raus
  const changes = sent.filter((p) => syncStores[p.area]).map((p) => {
    const s = syncStores[p.area].rawSong(p.name);
    return s ? { area: p.area, name: s.name, savedAt: s.savedAt, data: s } : { area: p.area, name: p.name, savedAt: p.at, deleted: true };
  });
  let res;
  try {
    res = await api('/songs/sync', { method: 'POST', body: { since: acc.since || '', changes } });
  } catch (err) {
    if (err.status === 401) dropLogin();
    error = message(err);
    emit();
    return;
  }
  let merged = false;
  for (const area in syncStores) {
    if (syncStores[area].merge(res.songs.filter((s) => s.area === area))) merged = true;
  }
  remember(res.songs);
  acc.since = res.now;
  acc.pending = acc.pending.filter((p) => !sent.includes(p));
  persist();
  lastSync = Date.now();
  error = '';
  emit(merged);
}

/* ---------- Start ---------- */
// backend: Adresse der API (aus js/env.js) oder null. Ein gemerktes Token wird erneuert; danach wird abgeglichen.
let wired = false;
export async function initCloud(backend) {
  base = backend || null;
  acc = readJSON(KEY) || {};
  me = null;
  if (!base) { emit(); return; }
  onSongChange(queue);
  if (!wired && typeof window !== 'undefined') {
    wired = true;
    // Wieder online oder zurück in der App: holen, was andere Geräte inzwischen gespeichert haben
    window.addEventListener('online', () => sync());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });
  }
  if (loggedIn()) {
    try {
      const auth = await api('/collections/users/auth-refresh', { method: 'POST' });
      acc.token = auth.token;
      persist();
      me = await api('/me');
    } catch (err) {
      if (err.status === 401 || err.status === 404) dropLogin();
      else error = message(err); // offline: angemeldet bleiben, später noch einmal
    }
  }
  emit();
  await sync();
}
