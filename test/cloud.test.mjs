import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeStorage } from './helpers.mjs';

// Mehrere Geräte: jedes hat seinen eigenen localStorage, use(dev) schaltet um. Muss stehen, bevor storage.js geladen wird.
// failKey: dieser Schlüssel scheitert beim Schreiben (Speicher voll oder gesperrt), bis der Test es zurücksetzt.
let mem = fakeStorage();
globalThis.localStorage = mem;
// Zeit läuft bei jedem Aufruf weiter, damit jede Änderung einen neueren Stand hat. skew: wie weit die Uhr des
// gerade benutzten Geräts falsch geht; der Server hat immer die richtige Zeit.
let clock = 1000, skew = 0;
Date.now = () => ++clock + skew;
const serverNow = () => ++clock;
const YEAR = 365 * 24 * 3600 * 1000;

const T = await import('../js/tafel/storage.js');
const L = await import('../js/lied/storage.js');
const C = await import('../js/core/cloud.js');
// Den verzögerten Abgleich nach dem Speichern schalten die Tests ab und rufen sync() selbst auf
const realTimeout = setTimeout;
globalThis.setTimeout = (f, ms, ...a) => (ms === C.SYNC_DELAY ? 0 : realTimeout(f, ms, ...a));
const { mergeSongs, newId } = await import('../js/core/store.js');
const LIMIT = 50;

/* ---------- Nachgebauter Server: Konten wie PocketBase, Abgleich wie pb_hooks/songs.pb.js ---------- */
let server;
function resetServer() {
  server = { users: new Map(), tokens: new Map(), songs: [], tick: 0, online: true, calls: [], since: [], changes: [], limit: LIMIT, meFails: false };
}
// Wie PocketBase JSON-Felder zurückgibt: Schlüssel sortiert
const resort = (v) => Array.isArray(v) ? v.map(resort)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, resort(v[k])])) : v;
// Warum der Server eine Änderung nicht annimmt (null: gültig), wie refusal in pb_hooks/songs.pb.js
const AREAS = ['mel', 'rhy', 'lied'], MAX_DATA = 200000;
function refusal(c) {
  if (!c || typeof c !== 'object' || !AREAS.includes(c.area)) return 'area';
  if (typeof c.id !== 'string' || !/^[0-9a-z]{9,40}$/.test(c.id)) return 'id';
  if (!Number.isInteger(c.changedAt)) return 'changedAt';
  if (c.deleted) return null;
  if (typeof c.name !== 'string' || !c.name.trim() || c.name.length > 40) return 'name';
  if (!Number.isInteger(c.savedAt)) return 'savedAt';
  if (typeof c.format !== 'string' || c.format.length > 20) return 'format';
  if (!c.data || typeof c.data !== 'object') return 'data';
  if (JSON.stringify(c.data).length > MAX_DATA) return 'size';
  return null;
}
function handle(method, path, auth, body) {
  const uid = server.tokens.get(auth);
  if (method === 'POST' && path === '/collections/users/records') {
    if (!body.password || body.password.length < 8) return [400, { message: 'x', data: { password: { code: 'validation_min_text_constraint' } } }];
    if (server.users.has(body.email)) return [400, { message: 'x', data: { email: { code: 'validation_not_unique' } } }];
    server.users.set(body.email, { id: 'u' + server.users.size, email: body.email, password: body.password });
    return [200, {}];
  }
  if (method === 'POST' && path === '/collections/users/auth-with-password') {
    const u = server.users.get(body.identity);
    if (!u || u.password !== body.password) return [400, { message: 'Failed to authenticate.', data: {} }];
    const token = 'tok' + server.tokens.size;
    server.tokens.set(token, u.id);
    return [200, { token, record: { id: u.id, email: u.email } }];
  }
  if (!uid) return [401, { message: 'The request requires valid record authorization token.', data: {} }];
  if (method === 'POST' && path === '/collections/users/auth-refresh') {
    const u = [...server.users.values()].find((x) => x.id === uid);
    return [200, { token: auth, record: { id: u.id, email: u.email } }];
  }
  if (method === 'GET' && path === '/me') {
    if (server.meFails) return [500, { message: 'Kaputt' }]; // Anmeldung gelingt, das Konto ist aber nicht erreichbar
    return [200, { tier: 'pro', features: ['lied', 'cloud'], limits: {} }];
  }
  if (method === 'DELETE' && path.startsWith('/collections/users/records/')) {
    const id = path.split('/').pop();
    for (const [k, u] of server.users) if (u.id === id) server.users.delete(k);
    server.songs = server.songs.filter((s) => s.user !== id);
    for (const [t, u] of server.tokens) if (u === id) server.tokens.delete(t);
    return [204, null];
  }
  if (method === 'POST' && path === '/songs/sync') {
    const now = ++server.tick, nowMs = serverNow(), rejected = [], refused = [];
    const clamp = (t) => Math.min(t, nowMs);
    let active = server.songs.filter((s) => s.user === uid && !s.deleted).length;
    for (const c of body.changes) {
      const reason = refusal(c);
      if (reason) { refused.push(c && c.id !== undefined ? { id: String(c.id), reason } : { reason }); continue; }
      const changedAt = clamp(c.changedAt);
      let rec = server.songs.find((s) => s.user === uid && s.id === c.id);
      if (rec && rec.changedAt >= changedAt) continue;
      if (!rec && c.deleted) continue;
      const adds = !c.deleted && (!rec || rec.deleted);
      if (adds && active >= server.limit) { rejected.push(c.id); continue; }
      if (adds) active++;
      else if (c.deleted && !rec.deleted) active--;
      if (!rec) server.songs.push(rec = { user: uid, id: c.id });
      Object.assign(rec, { area: c.area, changedAt, deleted: !!c.deleted, updated: ++server.tick });
      if (!c.deleted) Object.assign(rec, { format: c.format, name: c.name, savedAt: clamp(c.savedAt), data: resort(c.data) });
    }
    const since = body.since === '' ? 0 : +body.since;
    const songs = server.songs.filter((s) => s.user === uid && s.updated >= since)
      .map(({ area, id, format, name, savedAt, changedAt, deleted, data }) => ({ area, id, format, name, savedAt, changedAt, deleted, data: deleted ? null : data }));
    return [200, { now: String(now), nowMs, limit: server.limit, rejected, refused, songs: JSON.parse(JSON.stringify(songs)) }];
  }
  return [404, { message: 'Not found' }];
}
globalThis.fetch = async (url, opts = {}) => {
  if (!server.online) throw new TypeError('Failed to fetch');
  const path = url.replace(/^\/api/, '');
  server.calls.push(path);
  const body = opts.body ? JSON.parse(opts.body) : null;
  if (path === '/songs/sync') { server.since.push(body.since); server.changes.push(body.changes); } // was der Abgleich mitgeschickt hat
  const [status, data] = handle(opts.method || 'GET', path, opts.headers && opts.headers.Authorization, body);
  return { ok: status < 300, status, json: async () => data };
};

/* ---------- Geräte ---------- */
const devices = new Map();
// Wechselt auf das Gerät name (neu: leerer Speicher) und startet die App dort wie nach dem Laden der Seite
async function use(name, deviceSkew = 0) {
  skew = deviceSkew;
  if (!devices.has(name)) devices.set(name, fakeStorage());
  mem = devices.get(name);
  globalThis.localStorage = mem;
  await C.initCloud('/api');
}
const tune = (...ids) => { const r = ids.map((n) => ({ n, h: '' })); r.line = false; r.meter = ''; return r; };
const notes = (s) => s.rows.flat().map((x) => x.n).join(' ');
// Gespeicherte Melodien als { Name: 'Töne' }
const mel = () => Object.fromEntries(T.loadSongs('mel').map((s) => [s.name, notes(s)]));
const idOf = (name) => T.loadSongs('mel').find((s) => s.name === name).id;
// Namen der Lieder im Konto, ohne gelöschte
const account = (area = 'mel') => server.songs.filter((s) => s.area === area && !s.deleted).map((s) => s.name).sort();

beforeEach(() => {
  skew = 0;
  resetServer();
  devices.clear();
  mem = fakeStorage();
  globalThis.localStorage = mem;
});

/* ---------- Zusammenführen (ohne Server) ---------- */
const ok = () => true;
test('mergeSongs: je id gewinnt der neuere Stand, der Name kommt mit', () => {
  const local = [{ id: 'a00000001', name: 'A', savedAt: 5, changedAt: 5, rows: 1 }, { id: 'b00000001', name: 'B', savedAt: 9, changedAt: 9, rows: 1 }];
  const m = mergeSongs(local, [
    { id: 'a00000001', name: 'A neu', savedAt: 5, changedAt: 7, data: { rows: 1 } }, // umbenannt
    { id: 'b00000001', name: 'B', savedAt: 3, changedAt: 3, data: { rows: 2 } }, // älter: bleibt
    { id: 'c00000001', name: 'C', savedAt: 1, changedAt: 1, data: { rows: 3 } } // neu
  ], ok, 100);
  assert.deepEqual(m.list.map((s) => [s.id, s.name, s.rows]), [['a00000001', 'A neu', 1], ['b00000001', 'B', 1], ['c00000001', 'C', 3]]);
  assert.deepEqual(m.touched, []);
  assert.equal(mergeSongs(local, [{ id: 'a00000001', name: 'X', savedAt: 5, changedAt: 5, data: { rows: 9 } }], ok, 100), null);
});

test('mergeSongs: Löschen nur, wenn das Lied hier nicht danach geändert wurde; ungültige Stände werden übergangen', () => {
  const local = [{ id: 'a00000001', name: 'A', savedAt: 5 }, { id: 'b00000001', name: 'B', savedAt: 9 }];
  const m = mergeSongs(local, [{ id: 'a00000001', changedAt: 6, deleted: true }, { id: 'b00000001', changedAt: 8, deleted: true }], ok, 100);
  assert.deepEqual(m.list.map((s) => s.name), ['B']);
  assert.equal(mergeSongs([], [{ id: 'x00000001', name: 'X', savedAt: 1, changedAt: 1, data: { kaputt: true } }], (s) => !s.kaputt, 100), null);
});

test('mergeSongs: zwei Lieder mit gleichem Namen – das ältere behält ihn, das jüngere wird umbenannt', () => {
  const local = [{ id: 'b00000001', name: 'Lied', savedAt: 9, changedAt: 9, rows: [1] }];
  const m = mergeSongs(local, [
    { id: 'a00000001', name: 'LIED', savedAt: 5, changedAt: 5, data: { rows: [2] } },
    { id: 'c00000001', name: 'Lied (2)', savedAt: 5, changedAt: 5, data: { rows: [3] } } // schon belegt: weiter mit (3)
  ], ok, 100);
  assert.deepEqual(m.list.map((s) => [s.id, s.name]).sort(), [['a00000001', 'LIED'], ['b00000001', 'Lied (3)'], ['c00000001', 'Lied (2)']]);
  assert.equal(m.list.find((s) => s.id === 'b00000001').changedAt, 100);
  assert.deepEqual(m.touched, ['b00000001']);
});

test('mergeSongs: gleicher Name und gleicher Inhalt – das jüngere fällt weg', () => {
  const local = [{ id: 'b00000001', name: 'Gleich', savedAt: 9, rows: [{ a: 1, b: 2 }] }];
  const m = mergeSongs(local, [{ id: 'a00000001', name: 'gleich', savedAt: 2, changedAt: 2, data: { rows: [{ b: 2, a: 1 }] } }], ok, 100);
  assert.deepEqual(m.list.map((s) => s.id), ['a00000001']);
  assert.deepEqual(m.touched, ['b00000001']);
});

test('mergeSongs: lange Namen bleiben beim Umbenennen bei 40 Zeichen', () => {
  const long = 'x'.repeat(40);
  const m = mergeSongs([{ id: 'b00000001', name: long, savedAt: 1, rows: 1 }], [{ id: 'a00000001', name: long, savedAt: 2, changedAt: 2, data: { rows: 2 } }], ok, 9);
  assert.equal(m.list.find((s) => s.id === 'b00000001').name, 'x'.repeat(36) + ' (2)');
});

test('newId: später angelegt sortiert weiter hinten', () => {
  assert.ok(newId(1000) < newId(2000));
  assert.ok(newId(35) < newId(36));
});

/* ---------- Mit Server: mehrere Geräte ---------- */
test('ohne Backend passiert nichts, gespeichert wird wie immer', async () => {
  mem = fakeStorage();
  globalThis.localStorage = mem;
  await C.initCloud(null);
  T.saveSong('mel', [tune('C')], 'Lied');
  await C.sync();
  assert.deepEqual(server.calls, []);
  assert.deepEqual(mel(), { Lied: 'C' });
  assert.equal(C.cloudInfo().available, false);
});

test('Konto anlegen: Fehler werden verständlich gemeldet', async () => {
  await use('tablet');
  assert.equal(await C.register('a@b.de', 'kurz'), 'Das Passwort braucht mindestens 8 Zeichen.');
  assert.equal(await C.register('a@b.de', 'geheim123'), '');
  assert.equal(C.cloudInfo().user.email, 'a@b.de');
  C.logout();
  assert.equal(await C.register('a@b.de', 'geheim123'), 'Für diese E-Mail gibt es schon ein Konto.');
  assert.equal(await C.login('a@b.de', 'falsch999'), 'E-Mail oder Passwort stimmt nicht.');
  server.online = false;
  assert.equal(await C.login('a@b.de', 'geheim123'), 'Keine Verbindung zum Server.');
  assert.equal(C.cloudInfo().user, null);
});

test('Lieder vom Gerät landen beim ersten Anmelden im Konto und kommen auf einem neuen Gerät an, mit derselben id', async () => {
  await use('tablet');
  T.saveSong('mel', [tune('C', 'D')], 'Kuckuck');
  T.saveSong('rhy', [tune('D')], 'Rhythmus');
  L.store.saveSong({ meter: '4/4', pickup: 0, key: 0, ev: [] }, 'Notenblatt');
  const id = idOf('Kuckuck');
  assert.equal(await C.register('a@b.de', 'geheim123'), '');
  assert.deepEqual(account('mel'), ['Kuckuck']);
  assert.deepEqual(account('rhy'), ['Rhythmus']);
  assert.deepEqual(account('lied'), ['Notenblatt']);

  await use('laptop');
  assert.deepEqual(mel(), {});
  assert.equal(await C.login('a@b.de', 'geheim123'), '');
  assert.deepEqual(mel(), { Kuckuck: 'C D' });
  assert.equal(idOf('Kuckuck'), id);
  assert.deepEqual(T.loadSongs('rhy').map((s) => s.name), ['Rhythmus']);
  assert.deepEqual(L.store.loadSongs().map((s) => s.name), ['Notenblatt']);
});

test('Lieder von vor den ids: bekommen beim Anmelden eine und gehen ins Konto', async () => {
  await use('tablet');
  mem.setItem('notentafel.songs.v1', JSON.stringify([{ name: 'Alt', savedAt: 5, rows: [[{ n: 'C' }]], lines: [] }]));
  await C.register('a@b.de', 'geheim123');
  assert.deepEqual(account(), ['Alt']);
  await use('laptop');
  await C.login('a@b.de', 'geheim123');
  assert.deepEqual(mel(), { Alt: 'C' });
});

test('erstes Anmelden: gleicher Name, anderer Inhalt hier und im Konto – beide bleiben, das ältere behält den Namen', async () => {
  await use('tablet');
  T.saveSong('mel', [tune('C')], 'Lied'); // zuerst angelegt
  await C.register('a@b.de', 'geheim123');
  C.logout();

  await use('laptop');
  T.saveSong('mel', [tune('G', 'A')], 'LIED');
  T.saveSong('mel', [tune('E')], 'Nur hier');
  await C.login('a@b.de', 'geheim123');
  assert.deepEqual(mel(), { Lied: 'C', 'LIED (2)': 'G A', 'Nur hier': 'E' });
  assert.deepEqual(account(), ['LIED (2)', 'Lied', 'Nur hier']);

  await use('tablet');
  await C.login('a@b.de', 'geheim123');
  assert.deepEqual(mel(), { Lied: 'C', 'LIED (2)': 'G A', 'Nur hier': 'E' });
});

test('erstes Anmelden: gleicher Name mit gleichem Inhalt wird nicht verdoppelt', async () => {
  await use('tablet');
  T.saveSong('mel', [tune('C', 'D')], 'Lied');
  await C.register('a@b.de', 'geheim123');
  await use('laptop');
  T.saveSong('mel', [tune('C', 'D')], 'Lied');
  await C.login('a@b.de', 'geheim123');
  assert.deepEqual(mel(), { Lied: 'C D' });
  assert.deepEqual(account(), ['Lied']);
});

test('Umbenennen kommt auf dem anderen Gerät an: dasselbe Lied, kein Doppel', async () => {
  await use('tablet');
  T.saveSong('mel', [tune('C')], 'Alt');
  await C.register('a@b.de', 'geheim123');
  await use('laptop');
  await C.login('a@b.de', 'geheim123');
  const id = idOf('Alt');
  assert.equal(T.renameSong('mel', id, 'Neu'), 'ok');
  await C.sync();
  await use('tablet');
  assert.deepEqual(mel(), { Neu: 'C' });
  assert.equal(idOf('Neu'), id);
  assert.deepEqual(account(), ['Neu']);
});

test('umbenannt auf einem, offline geändert auf dem anderen: der neuere Stand des Lieds gewinnt ganz', async () => {
  await use('tablet');
  T.saveSong('mel', [tune('C')], 'Alt');
  await C.register('a@b.de', 'geheim123');
  await use('laptop');
  await C.login('a@b.de', 'geheim123');
  server.online = false;
  await use('tablet');
  T.renameSong('mel', idOf('Alt'), 'Neu'); // früher
  await use('laptop');
  T.saveSong('mel', [tune('D')], 'Alt'); // später
  server.online = true;
  await use('tablet');
  await use('laptop');
  await use('tablet');
  assert.deepEqual(mel(), { Alt: 'D' });
});

test('Ändern, Löschen und neu Speichern kommen auf dem anderen Gerät an', async () => {
  await use('tablet');
  await C.register('a@b.de', 'geheim123');
  await use('laptop');
  await C.login('a@b.de', 'geheim123');

  await use('tablet');
  T.saveSong('mel', [tune('C')], 'Eins');
  T.saveSong('mel', [tune('D')], 'Zwei');
  await C.sync();
  await use('laptop');
  assert.deepEqual(mel(), { Eins: 'C', Zwei: 'D' });

  T.saveSong('mel', [tune('E', 'F')], 'eins'); // ersetzt (ohne Groß/klein)
  T.deleteSong('mel', idOf('Zwei'));
  await C.sync();
  await use('tablet');
  assert.deepEqual(mel(), { eins: 'E F' });

  T.saveSong('mel', [tune('A')], 'Zwei'); // nach dem Löschen wieder gespeichert: ein neues Lied
  await C.sync();
  await use('laptop');
  assert.deepEqual(mel(), { eins: 'E F', Zwei: 'A' });
});

test('Löschen ist auf dem Server nur ein Vermerk: Name und Inhalt bleiben zum Wiederherstellen', async () => {
  await use('tablet');
  await C.register('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('C', 'D')], 'Weg');
  await C.sync();
  const id = idOf('Weg');
  T.deleteSong('mel', id);
  await C.sync();
  const rec = server.songs.find((s) => s.id === id);
  assert.equal(rec.deleted, true);
  assert.equal(rec.name, 'Weg');
  assert.deepEqual(rec.data.rows.flat().map((x) => x.n), ['C', 'D']);
  assert.deepEqual(mel(), {});
});

test('Wiederherstellen auf dem Server (deleted aus) bringt das Lied auf die Geräte zurück', async () => {
  await use('tablet');
  await C.register('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('C')], 'Weg');
  await C.sync();
  T.deleteSong('mel', idOf('Weg'));
  await C.sync();
  const rec = server.songs.find((s) => s.name === 'Weg');
  Object.assign(rec, { deleted: false, changedAt: Date.now(), updated: ++server.tick });
  await C.sync();
  assert.deepEqual(mel(), { Weg: 'C' });
});

test('beide Geräte ändern dasselbe Lied: der neuere Stand gewinnt, egal wer zuerst abgleicht', async () => {
  await use('tablet');
  await C.register('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('C')], 'Lied');
  await C.sync();
  await use('laptop');
  await C.login('a@b.de', 'geheim123');

  server.online = false; // beide offline
  await use('tablet');
  T.saveSong('mel', [tune('D')], 'Lied'); // älter
  await use('laptop');
  T.saveSong('mel', [tune('E')], 'Lied'); // neuer
  server.online = true;
  await C.sync(); // der neuere zuerst
  await use('tablet'); // der ältere danach: wird vom Server abgelehnt und durch den neueren ersetzt
  assert.deepEqual(mel(), { Lied: 'E' });
  await use('laptop');
  assert.deepEqual(mel(), { Lied: 'E' });
});

test('Löschen auf einem Gerät nimmt ein danach geändertes Lied auf dem anderen nicht mit', async () => {
  await use('tablet');
  await C.register('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('C')], 'Lied');
  await C.sync();
  await use('laptop');
  await C.login('a@b.de', 'geheim123');

  server.online = false;
  await use('tablet');
  T.deleteSong('mel', idOf('Lied')); // früher
  await use('laptop');
  T.saveSong('mel', [tune('G')], 'Lied'); // später
  server.online = true;
  await use('tablet'); // das Löschen kommt zuerst an
  assert.deepEqual(mel(), {});
  assert.deepEqual(account(), []);
  await use('laptop'); // das spätere Speichern setzt sich durch
  assert.deepEqual(mel(), { Lied: 'G' });
  assert.deepEqual(account(), ['Lied']);
  await use('tablet');
  assert.deepEqual(mel(), { Lied: 'G' });
});

test('offline gespeichert: bleibt vorgemerkt, auch über ein Neuladen, und geht beim nächsten Abgleich raus', async () => {
  await use('tablet');
  await C.register('a@b.de', 'geheim123');
  server.online = false;
  T.saveSong('mel', [tune('C')], 'Offline');
  await C.sync();
  assert.equal(C.cloudInfo().error, 'Keine Verbindung zum Server.');
  assert.deepEqual(account(), []);
  await use('tablet'); // Seite neu geladen, noch offline: angemeldet bleiben
  assert.equal(C.cloudInfo().user.email, 'a@b.de');
  server.online = true;
  await C.sync();
  assert.deepEqual(account(), ['Offline']);
  assert.equal(C.cloudInfo().error, '');
});

test('abgemeldet: Lieder bleiben auf dem Gerät, gespeichert wird nur lokal, beim Anmelden kommt alles nach', async () => {
  await use('tablet');
  await C.register('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('C')], 'Vorher');
  await C.sync();
  C.logout();
  assert.deepEqual(mel(), { Vorher: 'C' });
  T.saveSong('mel', [tune('D')], 'Ohne Konto');
  await C.sync();
  assert.deepEqual(account(), ['Vorher']);
  await C.login('a@b.de', 'geheim123');
  assert.deepEqual(account(), ['Ohne Konto', 'Vorher']);
  assert.deepEqual(mel(), { Vorher: 'C', 'Ohne Konto': 'D' });
});

test('wieder angemeldet: woanders geänderter Stand ersetzt den alten hier, ohne Doppel', async () => {
  await use('tablet');
  T.saveSong('mel', [tune('C')], 'Lied');
  await C.register('a@b.de', 'geheim123');
  C.logout();
  await use('laptop');
  await C.login('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('D')], 'Lied');
  T.renameSong('mel', idOf('Lied'), 'Lied neu');
  await C.sync();
  await use('tablet');
  await C.login('a@b.de', 'geheim123');
  assert.deepEqual(mel(), { 'Lied neu': 'D' });
  assert.deepEqual(account(), ['Lied neu']);
});

test('wieder angemeldet: woanders gelöscht, hier unverändert – ist auch hier weg', async () => {
  await use('tablet');
  T.saveSong('mel', [tune('C')], 'Lied');
  await C.register('a@b.de', 'geheim123');
  C.logout();
  await use('laptop');
  await C.login('a@b.de', 'geheim123');
  T.deleteSong('mel', idOf('Lied'));
  await C.sync();
  await use('tablet');
  await C.login('a@b.de', 'geheim123');
  assert.deepEqual(mel(), {});
  assert.deepEqual(account(), []);
});

test('anderes Konto auf demselben Gerät: Lieder beider Konten bleiben, gleiche Namen werden aufgelöst', async () => {
  await use('tablet');
  await C.register('b@b.de', 'geheim123');
  T.saveSong('mel', [tune('G')], 'Lied'); // zuerst angelegt
  await C.sync();
  C.logout();
  await use('laptop');
  T.saveSong('mel', [tune('C')], 'Lied');
  await C.register('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('D')], 'Lied');
  await C.sync();
  await use('tablet');
  await C.login('a@b.de', 'geheim123');
  assert.deepEqual(mel(), { Lied: 'G', 'Lied (2)': 'D' });
  await use('laptop');
  assert.deepEqual(mel(), { Lied: 'G', 'Lied (2)': 'D' });
});

test('ungültiges Token: abgemeldet, die Lieder bleiben', async () => {
  await use('tablet');
  await C.register('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('C')], 'Lied');
  await C.sync();
  server.tokens.clear();
  await use('tablet');
  assert.equal(C.cloudInfo().user, null);
  assert.deepEqual(mel(), { Lied: 'C' });
});

test('Konto löschen: Lieder im Konto weg, auf dem Gerät bleiben sie', async () => {
  await use('tablet');
  await C.register('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('C')], 'Lied');
  await C.sync();
  assert.equal(await C.deleteAccount(), '');
  assert.equal(C.cloudInfo().user, null);
  assert.deepEqual(server.songs, []);
  assert.deepEqual(mel(), { Lied: 'C' });
});

/* ---------- Abmelden und Ummelden während eines laufenden Abgleichs ---------- */
// Liefert die Antwort des nächsten POST /songs/sync erst nach release() aus (die Anfrage selbst geht sofort raus)
function holdSync() {
  let release;
  const gate = new Promise((r) => { release = r; });
  let armed = true;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    const res = await realFetch(url, opts);
    if (armed && url.endsWith('/songs/sync')) { armed = false; await gate; }
    return res;
  };
  return { release, restore: () => { globalThis.fetch = realFetch; } };
}

test('Abmelden während eines laufenden Abgleichs: die Antwort danach ändert nichts mehr und wirft nicht', async () => {
  await use('tablet');
  await C.register('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('C')], 'Lied');
  await C.sync();
  const hold = holdSync();
  try {
    const p = C.sync();
    C.logout();
    hold.release();
    await p; // vor dem Fix: TypeError, weil acc kein pending mehr hat
  } finally {
    hold.restore();
  }
  assert.equal(C.cloudInfo().user, null);
  assert.deepEqual(mel(), { Lied: 'C' });
  assert.deepEqual(server.songs.filter((s) => !s.deleted).map((s) => s.name), ['Lied']);
});

test('Ummelden während eines laufenden Abgleichs: die Antwort des alten Kontos landet nicht im neuen Zustand', async () => {
  await use('laptop');
  await C.register('b@b.de', 'geheim123'); // Konto B (u0)
  C.logout();
  await use('tablet');
  await C.register('a@b.de', 'geheim123'); // Konto A (u1)
  T.saveSong('mel', [tune('C')], 'Hier');
  await C.sync();
  // Ein Lied, das nur im Konto A liegt (von einem anderen Gerät) – es steht in der nächsten Antwort
  server.songs.push({ user: 'u1', id: newId(), area: 'mel', format: 'tafel.1', name: 'Nur A', savedAt: 1, changedAt: 1, deleted: false, data: { rows: [[{ n: 'G', h: '' }]], lines: [] }, updated: ++server.tick });
  const hold = holdSync();
  try {
    const p = C.sync(); // Antwort kommt erst nach der Ummeldung an
    C.logout();
    const loginP = C.login('b@b.de', 'geheim123');
    hold.release();
    assert.equal(await loginP, '');
    await p;
  } finally {
    hold.restore();
  }
  assert.equal(C.cloudInfo().user.email, 'b@b.de');
  assert.deepEqual(mel(), { Hier: 'C' }); // „Nur A“ gehört zu A und bleibt draußen
  assert.deepEqual(server.songs.filter((s) => s.user === 'u0' && !s.deleted).map((s) => s.name), ['Hier']);
});

/* ---------- Anmelden und Abmelden mit halbem Erfolg ---------- */
test('halbe Anmeldung: scheitert /me, bleibt kein Token gespeichert und die Ansicht zeigt das Abmelden', async () => {
  await use('tablet');
  await C.register('a@b.de', 'geheim123');
  C.logout();
  let emitted = 0;
  C.onCloudChange(() => emitted++);
  server.meFails = true;
  assert.equal(await C.login('a@b.de', 'geheim123'), 'Das hat nicht geklappt (500).');
  assert.equal(C.cloudInfo().user, null);
  assert.ok(emitted > 0); // die Kontoansicht wird sofort aktualisiert
  assert.equal(mem.getItem('notentafel.konto.v1').includes('token'), false);

  server.meFails = false;
  assert.equal(await C.login('a@b.de', 'geheim123'), '');
  assert.equal(C.cloudInfo().user.email, 'a@b.de');
  assert.ok(mem.getItem('notentafel.konto.v1').includes('token'));
});

test('Abmelden nach einem Abgleichfehler räumt error und lastSync auf', async () => {
  await use('tablet');
  T.saveSong('mel', [tune('C')], 'Lied');
  await C.register('a@b.de', 'geheim123');
  assert.ok(C.cloudInfo().lastSync > 0);
  server.online = false;
  T.saveSong('mel', [tune('D')], 'Neu');
  await C.sync();
  assert.equal(C.cloudInfo().error, 'Keine Verbindung zum Server.');
  C.logout();
  assert.equal(C.cloudInfo().error, '');
  assert.equal(C.cloudInfo().lastSync, 0);
});

test('Bereiche bleiben getrennt: gleicher Name in Melodie und Rhythmus', async () => {
  await use('tablet');
  await C.register('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('C')], 'Lied');
  T.saveSong('rhy', [tune('D')], 'Lied');
  await C.sync();
  await use('laptop');
  await C.login('a@b.de', 'geheim123');
  assert.deepEqual(mel(), { Lied: 'C' });
  assert.deepEqual(T.loadSongs('rhy').map(notes), ['D']);
});

/* ---------- Grenze: höchstens LIMIT Lieder im Konto ---------- */
// n Melodien „Lied 0“ … auf dem gerade benutzten Gerät
const fill = (n, prefix = 'Lied ') => { for (let i = 0; i < n; i++) T.saveSong('mel', [tune('C')], prefix + i); };

test('Konto voll: was nicht mehr passt, bleibt auf dem Gerät und ist als solches erkennbar', async () => {
  await use('tablet');
  fill(LIMIT - 1);
  await C.register('a@b.de', 'geheim123');
  assert.equal(account().length, LIMIT - 1);
  assert.equal(C.accountFull(), false);
  T.saveSong('mel', [tune('D')], 'Passt noch');
  await C.sync();
  assert.equal(C.accountFull(), true);
  T.saveSong('mel', [tune('E')], 'Zu viel');
  await C.sync();
  assert.equal(account().length, LIMIT);
  assert.ok(!account().includes('Zu viel'));
  assert.equal(mel()['Zu viel'], 'E'); // auf dem Gerät ist es da
  assert.equal(C.localOnly('mel', idOf('Zu viel')), true);
  assert.equal(C.localOnly('mel', idOf('Passt noch')), false);
  assert.equal(C.cloudInfo().rejected, 1);
  assert.equal(C.cloudInfo().limit, LIMIT);
});

test('Konto voll: nach dem Löschen eines Lieds rückt das liegengebliebene nach', async () => {
  await use('tablet');
  fill(LIMIT);
  await C.register('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('E')], 'Zu viel');
  await C.sync();
  assert.equal(C.cloudInfo().rejected, 1);
  T.deleteSong('mel', idOf('Lied 0'));
  await C.sync();
  assert.ok(account().includes('Zu viel'));
  assert.equal(C.cloudInfo().rejected, 0);
  assert.equal(C.localOnly('mel', idOf('Zu viel')), false);
});

test('Konto voll: Löschen auf einem anderen Gerät schafft auch hier Platz', async () => {
  await use('tablet');
  fill(LIMIT);
  await C.register('a@b.de', 'geheim123');
  await use('laptop');
  await C.login('a@b.de', 'geheim123');
  await use('tablet');
  T.saveSong('mel', [tune('E')], 'Zu viel');
  await C.sync();
  assert.equal(C.cloudInfo().rejected, 1);
  await use('laptop');
  T.deleteSong('mel', idOf('Lied 3'));
  await C.sync();
  await use('tablet');
  assert.ok(account().includes('Zu viel'));
  assert.equal(C.cloudInfo().rejected, 0);
  assert.equal(mel()['Lied 3'], undefined);
});

test('erstes Anmelden mit mehr Liedern, als ins Konto passen: die übrigen bleiben auf dem Gerät', async () => {
  await use('tablet');
  fill(30, 'Konto ');
  await C.register('a@b.de', 'geheim123');
  await use('laptop');
  fill(25, 'Laptop ');
  await C.login('a@b.de', 'geheim123');
  assert.equal(account().length, LIMIT);
  assert.equal(T.loadSongs('mel').length, 55);
  assert.equal(C.cloudInfo().rejected, 5);
  // auf dem Tablet kommen nur die an, die ins Konto gepasst haben
  await use('tablet');
  assert.equal(T.loadSongs('mel').length, LIMIT);
});

/* ---------- Der Server nimmt ein Lied nicht an (refused) ---------- */
// Ein Lied, wie es nur über eine kaputte Sicherungsdatei hereinkäme: Name über 40 Zeichen
const longName = (id, name, savedAt) => ({ id, name, savedAt, changedAt: savedAt, rows: [[{ n: 'C', h: '' }]], lines: [] });

test('ungültiges Lied: bleibt lokal, wird als solches gemeldet und nicht noch einmal geschickt', async () => {
  await use('tablet');
  mem.setItem('notentafel.songs.v1', JSON.stringify([longName('aaaaaaaab', 'x'.repeat(45), 5)]));
  assert.equal(await C.register('a@b.de', 'geheim123'), '');
  assert.deepEqual(account(), []);
  assert.equal(C.localOnly('mel', 'aaaaaaaab'), true);
  assert.equal(C.cloudInfo().invalid, 1);
  assert.equal(C.cloudInfo().rejected, 0);
  const n = server.changes.length;
  await C.sync();
  assert.deepEqual(server.changes[n], []); // nicht wieder als pending vorgemerkt
  assert.equal(C.cloudInfo().invalid, 1);
  assert.equal(C.localOnly('mel', 'aaaaaaaab'), true);
});

test('eine ungültige Änderung hält die übrigen nicht auf', async () => {
  await use('tablet');
  mem.setItem('notentafel.songs.v1', JSON.stringify([
    longName('aaaaaaaab', 'x'.repeat(45), 5),
    longName('aaaaaaaac', 'Gut', 6)
  ]));
  assert.equal(await C.register('a@b.de', 'geheim123'), '');
  assert.deepEqual(account(), ['Gut']); // das gültige Lied ist trotzdem im Konto
  assert.equal(C.localOnly('mel', 'aaaaaaaab'), true);
  assert.equal(C.localOnly('mel', 'aaaaaaaac'), false);
  assert.equal(C.cloudInfo().invalid, 1);
  assert.equal(C.cloudInfo().rejected, 0);
});

/* ---------- Geräte mit falsch gehender Uhr ---------- */
test('Uhr geht ein Jahr vor: das Gerät gewinnt nicht für immer', async () => {
  await use('tablet');
  await C.register('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('C')], 'Lied');
  await C.sync();
  await use('vorgehend', YEAR);
  await C.login('a@b.de', 'geheim123'); // lernt die Uhr des Servers
  T.saveSong('mel', [tune('D')], 'Lied');
  await C.sync();
  await use('tablet');
  assert.deepEqual(mel(), { Lied: 'D' });
  T.saveSong('mel', [tune('E')], 'Lied'); // später, mit richtiger Uhr
  await C.sync();
  await use('vorgehend', YEAR);
  assert.deepEqual(mel(), { Lied: 'E' });
});

test('Uhr ging vor, bevor das Gerät den Server kannte: der Server kappt, das Gerät übernimmt die Zeit', async () => {
  await use('vorgehend', YEAR);
  T.saveSong('mel', [tune('C')], 'Lied'); // Zeitstempel ein Jahr in der Zukunft
  await C.register('a@b.de', 'geheim123');
  await use('tablet');
  await C.login('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('E')], 'Lied');
  await C.sync();
  await use('vorgehend', YEAR);
  assert.deepEqual(mel(), { Lied: 'E' });
});

test('Uhr geht ein Jahr nach: Änderungen des Geräts gehen trotzdem nicht verloren', async () => {
  await use('tablet');
  await C.register('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('C')], 'Lied');
  await C.sync();
  await use('nachgehend', -YEAR);
  await C.login('a@b.de', 'geheim123');
  server.online = false;
  await use('tablet');
  T.saveSong('mel', [tune('D')], 'Lied'); // früher
  await use('nachgehend', -YEAR);
  T.saveSong('mel', [tune('E')], 'Lied'); // später, aber nach der eigenen Uhr ein Jahr früher
  server.online = true;
  await use('tablet');
  await use('nachgehend', -YEAR);
  await use('tablet');
  assert.deepEqual(mel(), { Lied: 'E' });
});

/* ---------- Kein Platz im Speicher des Geräts ---------- */
const VOLL = 'Auf dem Gerät ist kein Platz mehr für die Lieder vom Server.';

test('Abgleich ohne Platz im Gerät: since rückt nicht vor, das Lied kommt beim nächsten Mal an', async () => {
  await use('tablet');
  await C.register('a@b.de', 'geheim123');
  await use('laptop');
  assert.equal(await C.login('a@b.de', 'geheim123'), '');
  await use('tablet');
  T.saveSong('mel', [tune('G')], 'Vom Tablet');
  await C.sync();
  const last = C.cloudInfo().lastSync;
  devices.get('laptop').failKey = 'notentafel.songs.v1';
  await use('laptop'); // der Abgleich scheitert beim Schreiben des Liedspeichers
  assert.equal(C.cloudInfo().error, VOLL);
  assert.equal(C.cloudInfo().lastSync, last); // nicht gesetzt
  assert.deepEqual(mel(), {});
  const n = server.since.length, alt = server.since[n - 1];
  mem.failKey = null;
  await C.sync();
  assert.equal(server.since[n], alt); // mit demselben alten since noch einmal geholt
  assert.deepEqual(mel(), { 'Vom Tablet': 'G' });
  assert.equal(C.cloudInfo().error, '');
});

test('Anmelden ohne Platz im Gerät: angemeldet, aber since bleibt leer und lastSync 0', async () => {
  await use('tablet');
  await C.register('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('G')], 'Vom Tablet');
  await C.sync();
  await use('laptop');
  C.logout(); // frisch: kein Konto, lastSync 0
  mem.failKey = 'notentafel.songs.v1';
  assert.equal(await C.login('a@b.de', 'geheim123'), ''); // die Anmeldung selbst klappt
  assert.equal(C.cloudInfo().user.email, 'a@b.de');
  assert.equal(C.cloudInfo().error, VOLL);
  assert.equal(C.cloudInfo().lastSync, 0);
  assert.deepEqual(mel(), {});
  mem.failKey = null;
  await C.sync();
  assert.deepEqual(mel(), { 'Vom Tablet': 'G' });
  assert.equal(C.cloudInfo().error, '');
});

/* ---------- Format ---------- */
test('Lieder in einem Format, das diese Version nicht kennt, bleiben liegen', async () => {
  await use('tablet');
  await C.register('a@b.de', 'geheim123');
  server.songs.push({ user: 'u0', id: newId(), area: 'mel', format: 'tafel.9', name: 'Zukunft', savedAt: 1, changedAt: 1, deleted: false, data: { neu: true }, updated: ++server.tick });
  server.songs.push({ user: 'u0', id: newId(), area: 'mel', format: 'tafel.1', name: 'Heute', savedAt: 1, changedAt: 1, deleted: false, data: { rows: [[{ n: 'C', h: '' }]], lines: [] }, updated: ++server.tick });
  await C.sync();
  assert.deepEqual(mel(), { Heute: 'C' });
});

test('beim Hochladen geht das Format jedes Bereichs mit', async () => {
  await use('tablet');
  T.saveSong('mel', [tune('C')], 'M');
  L.store.saveSong({ meter: '4/4', pickup: 0, key: 0, ev: [] }, 'N');
  await C.register('a@b.de', 'geheim123');
  assert.equal(server.songs.find((s) => s.name === 'M').format, 'tafel.1');
  assert.equal(server.songs.find((s) => s.name === 'N').format, 'lied.1');
});

/* ---------- Exportieren und Importieren ---------- */
test('Import: Lieder aus einer exportierten Datei kommen dazu, ohne Doppel, und gehen ins Konto', async () => {
  await use('tablet');
  T.saveSong('mel', [tune('C')], 'Eins');
  T.saveSong('mel', [tune('D')], 'Zwei');
  const file = T.stores.mel.rawSongs();
  await use('laptop');
  T.saveSong('mel', [tune('G')], 'Zwei'); // anderes Lied, gleicher Name, später angelegt
  await C.register('a@b.de', 'geheim123');
  assert.equal(T.stores.mel.importSongs(file), 2);
  assert.deepEqual(mel(), { Eins: 'C', Zwei: 'D', 'Zwei (2)': 'G' });
  assert.equal(T.stores.mel.importSongs(file), 0); // noch einmal: nichts Neues
  await C.sync();
  assert.deepEqual(account(), ['Eins', 'Zwei', 'Zwei (2)']);
});

test('Sicherungsdatei: alle Bereiche hin und zurück, fremde Dateien werden abgelehnt', async () => {
  const { exportAll, importAll } = await import('../js/core/store.js');
  await use('tablet');
  T.saveSong('mel', [tune('C')], 'M');
  T.saveSong('rhy', [tune('D')], 'R');
  L.store.saveSong({ meter: '3/4', pickup: 0, key: 0, ev: [] }, 'N');
  const file = JSON.parse(JSON.stringify(exportAll()));
  assert.equal(file.kind, 'musiktafel-lieder');
  await use('neu');
  assert.equal(importAll(file), 3);
  assert.deepEqual(mel(), { M: 'C' });
  assert.deepEqual(T.loadSongs('rhy').map((s) => s.name), ['R']);
  assert.equal(L.store.loadSongs()[0].song.meter, '3/4');
  assert.equal(importAll(file), 0);
  assert.equal(importAll({ irgendwas: 1 }), -1);
  file.areas.mel.format = 'tafel.9';
  T.deleteSong('mel', idOf('M'));
  assert.equal(importAll(file), 0); // Format unbekannt: Melodien bleiben liegen
});
