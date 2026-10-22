// Konto und Abgleich der gespeicherten Lieder mit dem Server (PocketBase, siehe pb_hooks/songs.pb.js).
// Ohne Backend (npm start) oder ohne Anmeldung passiert hier nichts, die App speichert wie immer nur im Browser.
// Mit Konto bleibt der localStorage der Speicher, aus dem die App liest. Jedes Speichern und Löschen merkt sich
// cloud.js (pending) und schickt es kurz danach an den Server; die Antwort bringt mit, was sich auf anderen Geräten
// geändert hat. Ein Lied erkennt der Abgleich an seiner id (siehe store.js); je Lied gewinnt der neuere Stand.
// Ins Konto passen nur so viele Lieder, wie der Server sagt (limit); was darüber hinausgeht, lehnt er ab, und es
// bleibt nur auf diesem Gerät (rejected), bis wieder Platz ist. Was der Server gar nicht annimmt (refused, z. B. Name
// zu lang oder Inhalt zu groß), bleibt ebenfalls hier, geht aber nicht von selbst wieder raus.
import { readJSON, writeJSON, syncStores, onSongChange, setClock } from './store.js';

const KEY = 'notentafel.konto.v1';
// acc = { token, user: { id, email }, since, pending: [{ area, id, at }], rejected: [{ area, id, why? }], limit, offset }
// rejected: Lieder nur auf diesem Gerät; why 'refused' = nimmt der Server nicht an, sonst (auch alte Einträge ohne why)
// über dem Limit und rücken beim Löschen nach.
// ohne Anmeldung steht nur offset darin
let acc = {};
let base = null; // Adresse der API, null ohne Backend
let me = null; // Antwort von /api/me: { tier, features, limits, … }
let running = null, again = false, timer = null;
let lastSync = 0, error = '';
// Sitzungsgeneration: Abmelden, Anmelden und Neuladen machen laufende Abgleiche ungültig. Eine Antwort, die erst
// danach ankommt, darf nichts mehr in den Zustand schreiben (siehe run und start).
let session = 0;
const listeners = new Set();

const persist = () => writeJSON(KEY, acc);

// Uhr nach dem Server: offset ist, wie weit die Uhr des Geräts nachgeht (zuletzt gemessen, bleibt beim Abmelden)
const now = () => Date.now() + (acc.offset || 0);
function setOffset(serverMs) {
  if (!Number.isFinite(serverMs)) return;
  acc.offset = serverMs - Date.now();
  setClock(now);
}

// f(merged) nach jeder Änderung am Zustand; merged: Lieder vom Server sind hinzugekommen oder haben sich geändert
export const onCloudChange = (f) => { listeners.add(f); };
const emit = (merged) => listeners.forEach((f) => f(!!merged));

const loggedIn = () => !!acc.token;
const canSync = () => loggedIn() && !!me && me.features.includes('cloud');
function limit() {
  const l = acc.limit !== undefined ? acc.limit : me && me.limits && me.limits.songs;
  return typeof l === 'number' ? l : null;
}
const localCount = () => Object.values(syncStores).reduce((n, s) => n + s.songIds().length, 0);
// Lieder im Konto: alle hier, außer denen, die nicht mehr hineingepasst haben
const accountCount = () => localCount() - (acc.rejected || []).length;
export const cloudInfo = () => {
  const rej = canSync() ? acc.rejected || [] : [];
  return {
    available: !!base, user: loggedIn() ? acc.user : null, sync: canSync(), tier: me && me.tier, busy: !!running, lastSync, error,
    limit: canSync() ? limit() : null,
    rejected: rej.filter((r) => r.why !== 'refused').length, // über dem Limit: rücken beim Löschen nach
    invalid: rej.filter((r) => r.why === 'refused').length // nimmt der Server nicht an
  };
};
// Liegt das Lied nur auf diesem Gerät (weil es nicht mehr ins Konto gepasst hat oder der Server es nicht annimmt)?
export const localOnly = (area, id) => canSync() && (acc.rejected || []).some((r) => r.area === area && r.id === id);
// Ist das Konto voll? Dann landet ein neues Lied nur auf diesem Gerät.
export const accountFull = () => canSync() && limit() !== null && accountCount() >= limit();

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
  session++; // laufende Abgleiche dürfen nichts mehr schreiben
  acc = { offset: acc.offset };
  me = null;
  error = '';
  lastSync = 0;
  persist();
}

/* ---------- Anmelden ---------- */
// Nach dem Anmelden: erst holen, was im Konto liegt, dann alle Lieder dieses Geräts hochschicken. Was der Server
// schon im selben oder einem neueren Stand hat, lässt er liegen; verschiedene Lieder mit gleichem Namen bleiben beide
// (siehe resolveNames in store.js).
async function start(auth) {
  const my = ++session; // ein Abgleich für ein anderes Konto ist ab jetzt ungültig
  acc = { token: auth.token, user: { id: auth.record.id, email: auth.record.email }, since: '', pending: [], rejected: [], offset: acc.offset };
  me = null;
  // Das Token wird erst gespeichert, wenn der Server das Konto bestätigt. Sonst bliebe nach einem Fehler ein
  // gültiges Token gespeichert, die App zeigte aber kein Konto (und nach dem Neuladen wäre man still angemeldet).
  try {
    me = await api('/me');
  } catch (err) {
    if (my !== session) return;
    dropLogin();
    emit();
    throw err;
  }
  if (my !== session) return;
  persist();
  if (!canSync()) { emit(); return; }
  let res;
  try {
    res = await api('/songs/sync', { method: 'POST', body: { since: '', changes: [] } });
  } catch (err) {
    if (my !== session) return;
    // Angemeldet bleiben; was hier liegt, geht beim nächsten Abgleich mit
    error = message(err);
    emit();
    return;
  }
  if (my !== session) return;
  setOffset(res.nowMs);
  acc.limit = res.limit;
  // Diese Anfrage schickt keine Änderungen, es kann also nichts abgelehnt werden; dieselbe Auswertung wie in run()
  keepLocal([], res);
  const { failed } = mergeAll(res.songs);
  const t = now();
  for (const area in syncStores) syncStores[area].songIds().forEach((id) => mark(area, id, t));
  if (failed) {
    // Nicht alles ließ sich speichern: since bleibt leer, der nächste Abgleich holt die Lieder des Servers erneut.
    // Angemeldet bleibt man, der Aufrufer bekommt '' (die Anmeldung selbst hat geklappt).
    persist();
    error = 'Auf dem Gerät ist kein Platz mehr für die Lieder vom Server.';
    emit();
    return;
  }
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
// Merkt ein Lied für den nächsten Abgleich vor (at: wann, zählt beim Löschen)
function mark(area, id, at) {
  acc.pending = (acc.pending || []).filter((p) => p.area !== area || p.id !== id);
  acc.pending.push({ area, id, at });
}
// Lieder, die nicht ins Konto gepasst haben, beim nächsten Abgleich noch einmal versuchen (es ist Platz geworden).
// Ungültige (refused) nicht: die nimmt der Server nicht an, bis das Lied geändert oder gelöscht wird.
function retryRejected() {
  (acc.rejected || []).filter((r) => r.why !== 'refused').forEach((r) => mark(r.area, r.id, now()));
  acc.rejected = (acc.rejected || []).filter((r) => r.why === 'refused');
}
// Was der Server abgelehnt hat, ist nicht im Konto und bleibt hier: rejected (über dem Limit, rückt nach) und
// refused (nimmt er nicht an, z. B. Name zu lang oder Inhalt zu groß). sent ist, was mit dieser Anfrage rausging.
function keepLocal(sent, res) {
  const over = new Set(res.rejected || []);
  const bad = new Set((res.refused || []).map((r) => r.id));
  acc.pending = (acc.pending || []).filter((p) => !sent.includes(p));
  acc.rejected = (acc.rejected || [])
    .concat(sent.filter((p) => over.has(p.id)).map(({ area, id }) => ({ area, id })))
    .concat(sent.filter((p) => bad.has(p.id)).map(({ area, id }) => ({ area, id, why: 'refused' })));
}
function queue(area, id) {
  if (!loggedIn()) return;
  const store = syncStores[area];
  // Gelöscht: Platz im Konto für Lieder, die nur hier liegen
  if (store && !store.rawSong(id)) {
    acc.rejected = (acc.rejected || []).filter((r) => r.area !== area || r.id !== id);
    retryRejected();
  }
  mark(area, id, now());
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
  const my = session; // nach jedem await: wurde inzwischen ab- oder umgemeldet?
  try {
    // Beim Start offline gewesen: Stufe jetzt holen
    if (!me) me = await api('/me');
  } catch (err) {
    if (my !== session) return;
    if (err.status === 401) dropLogin();
    else error = message(err);
    emit();
    return;
  }
  if (my !== session) return;
  if (!canSync()) return;
  const sent = acc.pending.slice();
  // Was gerade da ist, nicht was beim Speichern da war: ein inzwischen gelöschtes Lied geht als gelöscht raus
  const changes = sent.filter((p) => syncStores[p.area]).map((p) => {
    const store = syncStores[p.area], s = store.rawSong(p.id);
    if (!s) return { area: p.area, id: p.id, changedAt: p.at, deleted: true };
    const { id, name, savedAt, changedAt, ...data } = s;
    return { area: p.area, id, format: store.format, name, savedAt, changedAt: changedAt || savedAt, data };
  }).sort((a, b) => !!b.deleted - !!a.deleted); // Löschen zuerst: macht Platz im Konto für Lieder, die nachrücken
  let res;
  try {
    res = await api('/songs/sync', { method: 'POST', body: { since: acc.since || '', changes } });
  } catch (err) {
    if (my !== session) return;
    if (err.status === 401) dropLogin();
    else error = message(err);
    emit();
    return;
  }
  if (my !== session) return;
  setOffset(res.nowMs);
  acc.limit = res.limit;
  keepLocal(sent, res);
  const before = localCount();
  const { merged, failed } = mergeAll(res.songs);
  // Woanders gelöscht: Platz für Lieder, die nur hier liegen (ungültige rücken nicht nach)
  if (localCount() < before && (acc.rejected || []).some((r) => r.why !== 'refused')) { retryRejected(); again = true; }
  // Was es hier nicht mehr gibt oder was der Server inzwischen hat, liegt nicht mehr nur hier
  const there = new Set(res.songs.filter((s) => !s.deleted).map((s) => s.id));
  acc.rejected = [...new Map(acc.rejected.map((r) => [r.area + '/' + r.id, r])).values()]
    .filter((r) => !there.has(r.id) && syncStores[r.area] && syncStores[r.area].rawSong(r.id));
  if (failed) {
    // Lieder des Servers ließen sich nicht speichern: since nicht vorrücken (sonst kämen sie nie wieder),
    // lastSync und error stehen lassen. Was der Server angenommen hat (sent), ist trotzdem raus.
    persist();
    error = 'Auf dem Gerät ist kein Platz mehr für die Lieder vom Server.';
    emit();
    return;
  }
  acc.since = res.now;
  persist();
  lastSync = Date.now();
  error = '';
  emit(merged);
}

// Lieder vom Server in alle Bereiche einarbeiten. Was dabei umbenannt wurde oder wegfiel (gleicher Name), ist
// vorgemerkt und geht gleich mit einem weiteren Abgleich raus. merged: true, wenn sich hier etwas geändert hat;
// failed: true, wenn ein Bereich das Ergebnis nicht speichern konnte (dann fehlt es hier bis zum nächsten Abgleich).
function mergeAll(songs) {
  let merged = false, failed = false;
  for (const area in syncStores) {
    const m = syncStores[area].merge(songs.filter((s) => s.area === area), now());
    if (m.merged) merged = true;
    if (m.failed) failed = true;
    m.touched.forEach((id) => mark(area, id, now()));
    if (m.touched.length && running) again = true;
  }
  return { merged, failed };
}

/* ---------- Start ---------- */
// backend: Adresse der API (aus js/env.js) oder null. Ein gemerktes Token wird erneuert; danach wird abgeglichen.
let wired = false;
export async function initCloud(backend) {
  const my = ++session; // ein Neuladen macht laufende Abgleiche ungültig
  base = backend || null;
  acc = readJSON(KEY) || {};
  me = null;
  setClock(now);
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
      if (my !== session) return;
      acc.token = auth.token;
      persist();
      me = await api('/me');
      if (my !== session) return;
    } catch (err) {
      if (my !== session) return;
      // Token abgelaufen oder Konto weg: abmelden, die Ansicht sofort aktualisieren
      if (err.status === 401 || err.status === 404) { dropLogin(); emit(); return; }
      error = message(err); // offline: angemeldet bleiben, später noch einmal
    }
  }
  if (my !== session) return;
  emit();
  await sync();
}
