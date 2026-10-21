import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mehrere Geräte: jedes hat seinen eigenen localStorage, use(dev) schaltet um. Muss stehen, bevor storage.js geladen wird.
let mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: (k) => { mem.delete(k); },
  clear: () => mem.clear()
};
// Zeit läuft bei jedem Aufruf weiter, damit jedes Speichern einen neueren Stand hat
let clock = 1000;
Date.now = () => ++clock;
// Den verzögerten Abgleich nach dem Speichern schalten die Tests ab und rufen sync() selbst auf
const realTimeout = setTimeout;
globalThis.setTimeout = (f, ms, ...a) => (ms === 800 ? 0 : realTimeout(f, ms, ...a));

const T = await import('../js/tafel/storage.js');
const L = await import('../js/lied/storage.js');
const C = await import('../js/core/cloud.js');
const { mergeSongs, adoptSongs, sameContent } = await import('../js/core/store.js');

/* ---------- Nachgebauter Server: Konten wie PocketBase, Abgleich wie pb_hooks/songs.pb.js ---------- */
let server;
function resetServer() {
  server = { users: new Map(), tokens: new Map(), songs: [], tick: 0, online: true, calls: [] };
}
// Wie PocketBase JSON-Felder zurückgibt: Schlüssel sortiert
const resort = (v) => Array.isArray(v) ? v.map(resort)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, resort(v[k])])) : v;
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
  if (method === 'GET' && path === '/me') return [200, { tier: 'pro', features: ['lied', 'cloud'], limits: {} }];
  if (method === 'DELETE' && path.startsWith('/collections/users/records/')) {
    const id = path.split('/').pop();
    for (const [k, u] of server.users) if (u.id === id) server.users.delete(k);
    server.songs = server.songs.filter((s) => s.user !== id);
    for (const [t, u] of server.tokens) if (u === id) server.tokens.delete(t);
    return [204, null];
  }
  if (method === 'POST' && path === '/songs/sync') {
    const now = ++server.tick;
    for (const c of body.changes) {
      const key = c.name.toLowerCase();
      let rec = server.songs.find((s) => s.user === uid && s.area === c.area && s.key === key);
      if (rec && rec.savedAt >= c.savedAt) continue;
      if (!rec) server.songs.push(rec = { user: uid, area: c.area, key });
      Object.assign(rec, { name: c.name, savedAt: c.savedAt, deleted: !!c.deleted, data: c.deleted ? null : resort(c.data), updated: ++server.tick });
    }
    const since = body.since === '' ? 0 : +body.since;
    const songs = server.songs.filter((s) => s.user === uid && s.updated >= since)
      .map(({ area, name, savedAt, deleted, data }) => ({ area, name, savedAt, deleted, data }));
    return [200, { now: String(now), songs: JSON.parse(JSON.stringify(songs)) }];
  }
  return [404, { message: 'Not found' }];
}
globalThis.fetch = async (url, opts = {}) => {
  if (!server.online) throw new TypeError('Failed to fetch');
  const path = url.replace(/^\/api/, '');
  server.calls.push(path);
  const [status, data] = handle(opts.method || 'GET', path, opts.headers && opts.headers.Authorization, opts.body ? JSON.parse(opts.body) : null);
  return { ok: status < 300, status, json: async () => data };
};

/* ---------- Geräte ---------- */
const devices = new Map();
// Wechselt auf das Gerät name (neu: leerer Speicher) und startet die App dort wie nach dem Laden der Seite
async function use(name) {
  if (!devices.has(name)) devices.set(name, new Map());
  mem = devices.get(name);
  await C.initCloud('/api');
}
const tune = (...ids) => { const r = ids.map((n) => ({ n, h: '' })); r.line = false; r.meter = ''; return r; };
const notes = (s) => s.rows.flat().map((x) => x.n).join(' ');
// Gespeicherte Melodien als { Name: 'Töne' }
const mel = () => Object.fromEntries(T.loadSongs('mel').map((s) => [s.name, notes(s)]));
const account = (area = 'mel') => server.songs.filter((s) => s.area === area && !s.deleted).map((s) => s.name).sort();

beforeEach(() => {
  resetServer();
  devices.clear();
  mem = new Map();
});

/* ---------- Zusammenführen (ohne Server) ---------- */
test('mergeSongs: neuerer Stand gewinnt, älterer bleibt liegen', () => {
  const ok = () => true;
  const local = [{ name: 'A', savedAt: 5, rows: 1 }, { name: 'B', savedAt: 9, rows: 1 }];
  const out = mergeSongs(local, [
    { name: 'a', savedAt: 7, data: { rows: 2 } }, // neuer: ersetzt, Name wie vom Server
    { name: 'B', savedAt: 3, data: { rows: 2 } }, // älter: bleibt
    { name: 'C', savedAt: 1, data: { rows: 3 } } // neu
  ], ok);
  assert.deepEqual(out.map((s) => [s.name, s.rows]), [['a', 2], ['B', 1], ['C', 3]]);
  assert.equal(mergeSongs(local, [{ name: 'A', savedAt: 5, data: { rows: 9 } }], ok), null);
});

test('mergeSongs: Löschen nur, wenn das Lied hier nicht neuer ist; ungültige Stände werden übergangen', () => {
  const local = [{ name: 'A', savedAt: 5 }, { name: 'B', savedAt: 9 }];
  const out = mergeSongs(local, [{ name: 'A', savedAt: 6, deleted: true }, { name: 'B', savedAt: 8, deleted: true }], () => true);
  assert.deepEqual(out.map((s) => s.name), ['B']);
  assert.equal(mergeSongs([], [{ name: 'X', savedAt: 1, data: { kaputt: true } }], (s) => !s.kaputt), null);
});

test('adoptSongs: gleicher Name mit anderem Inhalt wird umbenannt, gleicher Inhalt nicht', () => {
  const local = [{ name: 'Lied', savedAt: 1, rows: [1] }, { name: 'Gleich', savedAt: 1, rows: [{ a: 1, b: 2 }] }];
  const remote = [
    { name: 'lied', savedAt: 2, data: { rows: [2] } },
    { name: 'Lied (2)', savedAt: 2, data: { rows: [3] } }, // schon belegt: weiter mit (3)
    { name: 'Gleich', savedAt: 2, data: { rows: [{ b: 2, a: 1 }], name: 'Gleich', savedAt: 2 } }
  ];
  const out = adoptSongs(local, remote, 50);
  assert.deepEqual(out.map((s) => s.name), ['Lied (3)', 'Gleich']);
  assert.equal(adoptSongs(local.slice(1), remote, 50), null);
  assert.ok(sameContent({ rows: [{ a: 1, b: 2 }], name: 'x' }, { name: 'y', savedAt: 3, rows: [{ b: 2, a: 1 }] }));
});

test('adoptSongs: lange Namen bleiben beim Umbenennen bei 40 Zeichen', () => {
  const long = 'x'.repeat(40);
  const out = adoptSongs([{ name: long, savedAt: 1, rows: 1 }], [{ name: long, savedAt: 2, data: { rows: 2 } }], 9);
  assert.equal(out[0].name, 'x'.repeat(36) + ' (2)');
});

test('adoptSongs: im Konto gelöschtes Lied gilt hier als neu gespeichert', () => {
  const out = adoptSongs([{ name: 'A', savedAt: 3, rows: 1 }], [{ name: 'A', savedAt: 5, deleted: true }], 77);
  assert.equal(out[0].savedAt, 77);
});

/* ---------- Mit Server: mehrere Geräte ---------- */
test('ohne Backend passiert nichts, gespeichert wird wie immer', async () => {
  mem = new Map();
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

test('Lieder vom Gerät landen beim ersten Anmelden im Konto und kommen auf einem neuen Gerät an', async () => {
  await use('tablet');
  T.saveSong('mel', [tune('C', 'D')], 'Kuckuck');
  T.saveSong('rhy', [tune('D')], 'Rhythmus');
  L.store.saveSong({ meter: '4/4', pickup: 0, key: 0, ev: [] }, 'Notenblatt');
  assert.equal(await C.register('a@b.de', 'geheim123'), '');
  assert.deepEqual(account('mel'), ['Kuckuck']);
  assert.deepEqual(account('rhy'), ['Rhythmus']);
  assert.deepEqual(account('lied'), ['Notenblatt']);

  await use('laptop');
  assert.deepEqual(mel(), {});
  assert.equal(await C.login('a@b.de', 'geheim123'), '');
  assert.deepEqual(mel(), { Kuckuck: 'C D' });
  assert.deepEqual(T.loadSongs('rhy').map((s) => s.name), ['Rhythmus']);
  assert.deepEqual(L.store.loadSongs().map((s) => s.name), ['Notenblatt']);
});

test('erstes Anmelden: gleicher Name, anderer Inhalt hier und im Konto – beide bleiben erhalten', async () => {
  await use('tablet');
  T.saveSong('mel', [tune('C')], 'Lied');
  await C.register('a@b.de', 'geheim123');
  C.logout();

  await use('laptop');
  T.saveSong('mel', [tune('G', 'A')], 'LIED'); // neuer als das im Konto, darf es trotzdem nicht überschreiben
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

test('erstes Anmelden: ein im Konto früher gelöschtes Lied nimmt das hiesige nicht mit', async () => {
  await use('tablet');
  await C.register('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('C')], 'Lied');
  await C.sync();
  T.deleteSong('mel', 'Lied');
  await C.sync();
  assert.deepEqual(account(), []);

  await use('laptop');
  // Wird vor dem Löschen auf dem Tablet gespeichert, ist also älter als das Löschen im Konto
  mem.set('notentafel.songs.v1', JSON.stringify([{ name: 'Lied', savedAt: 1, rows: [[{ n: 'G' }]], lines: [] }]));
  await C.login('a@b.de', 'geheim123');
  assert.deepEqual(mel(), { Lied: 'G' });
  assert.deepEqual(account(), ['Lied']);
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
  T.deleteSong('mel', 'Zwei');
  await C.sync();
  await use('tablet');
  assert.deepEqual(mel(), { eins: 'E F' });

  T.saveSong('mel', [tune('A')], 'Zwei'); // nach dem Löschen wieder gespeichert
  await C.sync();
  await use('laptop');
  assert.deepEqual(mel(), { eins: 'E F', Zwei: 'A' });
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
  T.deleteSong('mel', 'Lied'); // früher
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

/* ---------- Wieder anmelden auf einem Gerät, das schon einmal mit dem Konto abgeglichen hat ---------- */
test('adoptSongs: seit dem letzten Abgleich unverändert ist kein eigenes Lied', () => {
  const local = [{ name: 'Lied', savedAt: 5, rows: 1 }, { name: 'Weg', savedAt: 6, rows: 1 }];
  const remote = [{ name: 'Lied', savedAt: 9, data: { rows: 2 } }, { name: 'Weg', savedAt: 9, deleted: true }];
  assert.equal(adoptSongs(local, remote, 50, (n) => ({ Lied: 5, Weg: 6 })[n]), null);
  // hier nach dem Abgleich geändert: dann doch beide behalten bzw. nicht löschen lassen
  const out = adoptSongs(local, remote, 50, () => 1);
  assert.deepEqual(out.map((s) => [s.name, s.savedAt]), [['Lied (2)', 5], ['Weg', 50]]);
});

test('wieder angemeldet: woanders geänderter Stand ersetzt den alten hier, ohne Doppel', async () => {
  await use('tablet');
  T.saveSong('mel', [tune('C')], 'Lied');
  await C.register('a@b.de', 'geheim123');
  C.logout();
  await use('laptop');
  await C.login('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('D')], 'Lied');
  await C.sync();
  await use('tablet');
  await C.login('a@b.de', 'geheim123');
  assert.deepEqual(mel(), { Lied: 'D' });
  assert.deepEqual(account(), ['Lied']);
});

test('wieder angemeldet: woanders gelöscht, hier unverändert – ist auch hier weg', async () => {
  await use('tablet');
  T.saveSong('mel', [tune('C')], 'Lied');
  await C.register('a@b.de', 'geheim123');
  C.logout();
  await use('laptop');
  await C.login('a@b.de', 'geheim123');
  T.deleteSong('mel', 'Lied');
  await C.sync();
  await use('tablet');
  await C.login('a@b.de', 'geheim123');
  assert.deepEqual(mel(), {});
  assert.deepEqual(account(), []);
});

test('wieder angemeldet: hier abgemeldet geändert und woanders auch – beide bleiben', async () => {
  await use('tablet');
  T.saveSong('mel', [tune('C')], 'Lied');
  await C.register('a@b.de', 'geheim123');
  C.logout();
  T.saveSong('mel', [tune('E')], 'Lied'); // abgemeldet geändert
  await use('laptop');
  await C.login('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('D')], 'Lied'); // später, im Konto
  await C.sync();
  await use('tablet');
  await C.login('a@b.de', 'geheim123');
  assert.deepEqual(mel(), { Lied: 'D', 'Lied (2)': 'E' });
  assert.deepEqual(account(), ['Lied', 'Lied (2)']);
});

test('anderes Konto auf demselben Gerät: was zum ersten Konto abgeglichen war, zählt nicht', async () => {
  await use('tablet');
  await C.register('b@b.de', 'geheim123');
  T.saveSong('mel', [tune('G')], 'Lied');
  await C.sync();
  C.logout();
  await use('laptop');
  T.saveSong('mel', [tune('C')], 'Lied');
  await C.register('a@b.de', 'geheim123');
  T.saveSong('mel', [tune('D')], 'Lied');
  await C.sync();
  await use('tablet');
  await C.login('a@b.de', 'geheim123');
  assert.deepEqual(mel(), { Lied: 'D', 'Lied (2)': 'G' });
});
