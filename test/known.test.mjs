import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fakeStorage } from './helpers.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '..');
const raw = require('../pb_hooks/known.js');

/* ---------- Endpunkt GET /api/known (pb_hooks/known.pb.js) ---------- */
// Die Datei läuft wie in PocketBase: routerAdd, require, __hooks und ForbiddenError gibt es als Globals. Hier ein Ersatz,
// der den Handler einsammelt; so prüft der Test den echten Code samt Feature-Prüfung statt eines Nachbaus.
function endpoint() {
  let handler = null;
  class ForbiddenError extends Error {}
  const ctx = vm.createContext({
    routerAdd: (method, route, h) => { assert.equal(method, 'GET'); assert.equal(route, '/api/known'); handler = h; },
    require, ForbiddenError, __hooks: path.join(ROOT, 'pb_hooks')
  });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'pb_hooks/known.pb.js'), 'utf8'), ctx);
  return { handler, ForbiddenError };
}
// Aufruf mit Fake-Kontext: auth ist null (Gast) oder ein Konto mit pro_until
function call(handler, auth) {
  const headers = {};
  let out = null;
  const e = {
    auth,
    response: { header: () => ({ set: (k, v) => { headers[k] = v; } }) },
    json: (status, body) => { out = { status, body }; return out; }
  };
  const result = handler(e);
  return { result, headers, out };
}
const account = (proUntil) => ({ collection: () => ({ name: 'users' }), getString: (k) => (k === 'pro_until' ? proUntil : '') });

test('known.js: beide Listen mit Namen, Gruppe, Takt, Tempo und Noten', () => {
  assert.equal(raw.MELODIES.length, raw.SONGS.length);
  for (const x of [...raw.MELODIES, ...raw.SONGS]) {
    for (const k of ['name', 'group', 'meter', 'notes']) assert.equal(typeof x[k], 'string', x.name + ': ' + k);
    assert.equal(typeof x.tempo, 'number', x.name);
  }
});

test('GET /api/known: Pro bekommt die Lieder, privat und ohne Cache', () => {
  const { handler } = endpoint();
  const { out, headers } = call(handler, account('2999-01-01 00:00:00.000Z'));
  assert.equal(out.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(out.body)), { mel: raw.MELODIES, lied: raw.SONGS }); // über JSON: der Handler läuft in einem eigenen Kontext
  assert.match(headers['Cache-Control'], /no-store/);
});

test('GET /api/known: Gast, Konto ohne Pro und abgelaufenes Pro bekommen 403 und keine Daten', () => {
  const { handler, ForbiddenError } = endpoint();
  for (const auth of [null, account(''), account('2001-01-01 00:00:00.000Z')]) {
    const sent = [];
    assert.throws(() => handler({ auth, json: (...a) => sent.push(a), response: { header: () => ({ set() {} }) } }), ForbiddenError);
    assert.deepEqual(sent, []);
  }
});

/* ---------- loadKnown (app/js/core/known.js) ---------- */
globalThis.localStorage = fakeStorage();
const { loadPlan } = await import('../app/js/core/tier.js');
const { known, loadKnown, onKnown } = await import('../app/js/core/known.js');

let calls, answer;
globalThis.fetch = async (url) => { calls.push(url); return answer(); };
const ok = () => ({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify({ mel: raw.MELODIES, lied: raw.SONGS })) });
const denied = () => ({ ok: false, status: 403, json: async () => ({}) });
const dev = (tier) => loadPlan({ env: { backend: null, tier }, search: '' });

beforeEach(async () => { calls = []; answer = ok; await dev('guest'); });

test('loadKnown: ohne Pro keine Anfrage und leere Listen', async () => {
  assert.deepEqual(await loadKnown(), { mel: [], lied: [] });
  assert.equal(calls.length, 0);
});

test('loadKnown: mit Pro einmal geholt, nach Gruppen geordnet, danach aus dem Cache', async () => {
  await dev('pro'); // der Stufenwechsel stößt das Laden selbst an
  const d = await loadKnown();
  await loadKnown();
  assert.deepEqual(calls, ['/api/known']);
  assert.equal(d.mel.length, raw.MELODIES.length);
  assert.equal(known(), d);
  const groups = d.lied.map((s) => s.group);
  assert.deepEqual(groups, [...groups].sort((a, b) => groups.indexOf(a) - groups.indexOf(b)), 'Gruppen stehen zusammen');
});

test('loadKnown: 403 ergibt leere Listen, der nächste Aufruf versucht es noch einmal', async () => {
  answer = denied;
  await dev('pro');
  assert.deepEqual(await loadKnown(), { mel: [], lied: [] });
  answer = ok;
  assert.equal((await loadKnown()).lied.length, raw.SONGS.length);
  assert.equal(calls.length, 2);
});

test('loadKnown: Netzfehler und unbrauchbare Antwort ergeben leere Listen', async () => {
  answer = () => { throw new Error('offline'); };
  await dev('pro');
  assert.equal((await loadKnown()).mel.length, 0);
  answer = () => ({ ok: true, status: 200, json: async () => ({ mel: 'x' }) });
  assert.equal((await loadKnown()).mel.length, 0);
});

test('Abmelden leert die Lieder und meldet es', async () => {
  await dev('pro');
  await loadKnown();
  const seen = [];
  const off = onKnown((d) => seen.push(d.mel.length));
  await dev('guest');
  off();
  assert.equal(known().mel.length, 0);
  assert.deepEqual(seen, [0]);
});
