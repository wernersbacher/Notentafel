import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeStorage } from './helpers.mjs';

// Muss stehen, bevor auth.js geladen wird: localStorage und ein Fenster für das storage-Ereignis
let mem = fakeStorage();
globalThis.localStorage = mem;
const windowEvents = {};
globalThis.window = { addEventListener: (type, f) => { windowEvents[type] = f; } };
const A = await import('../shared/auth.js');

// Kleiner Server: ein Konto, Anmeldung und /me
let calls, meFails;
globalThis.fetch = async (url, opts = {}) => {
  calls.push({ url, auth: opts.headers && opts.headers.Authorization });
  const reply = (status, data) => ({ ok: status < 300, status, json: async () => data });
  const record = { id: 'u1', email: 'a@b.de', name: 'Anna Beispiel' };
  if (url === '/api/collections/users/auth-with-password') {
    const b = JSON.parse(opts.body);
    return b.password === 'geheim123' ? reply(200, { token: 'tok1', record }) : reply(400, { message: 'Failed to authenticate.', data: {} });
  }
  if (url === '/api/me') return meFails ? reply(500, { message: 'Kaputt' }) : reply(200, { tier: 'pro', features: ['cloud'], limits: {} });
  if (url === '/api/collections/users/auth-refresh') {
    return opts.headers.Authorization === 'tok1' ? reply(200, { token: 'tok2', record }) : reply(401, { message: 'x' });
  }
  return reply(404, { message: 'Not found' });
};

beforeEach(() => {
  calls = [];
  meFails = false;
  mem = fakeStorage();
  globalThis.localStorage = mem;
  A.initAuth('/api');
});

test('initials: aus dem Namen, sonst aus der E-Mail', () => {
  assert.equal(A.initials({ name: 'Anna Beispiel', email: 'x@y.de' }), 'AB');
  assert.equal(A.initials({ name: 'Anna Maria von Beispiel', email: 'x@y.de' }), 'AB');
  assert.equal(A.initials({ name: ' anna ', email: 'x@y.de' }), 'A');
  assert.equal(A.initials({ name: 'Ökonom Ärger', email: '' }), 'ÖÄ');
  assert.equal(A.initials({ email: 'max.mustermann@y.de' }), 'MM');
  assert.equal(A.initials({ name: '', email: 'lehrer@y.de' }), 'L');
  assert.equal(A.initials({ email: '' }), '?');
  assert.equal(A.initials(null), '');
});

test('login und logout schreiben auth.v1 und melden onAuthChange', async () => {
  const seen = [];
  const off = A.onAuthChange((u) => seen.push(u && u.email));
  assert.equal(await A.login('a@b.de', 'falsch'), 'E-Mail oder Passwort stimmt nicht.');
  assert.equal(mem.getItem('notentafel.auth.v1'), null);
  assert.equal(await A.login('a@b.de', 'geheim123'), '');
  assert.deepEqual(JSON.parse(mem.getItem('notentafel.auth.v1')), { token: 'tok1', user: { id: 'u1', email: 'a@b.de', name: 'Anna Beispiel' } });
  assert.equal(A.currentUser().email, 'a@b.de');
  assert.equal(A.currentMe().tier, 'pro');
  A.logout();
  assert.equal(mem.getItem('notentafel.auth.v1'), null);
  assert.equal(A.currentUser(), null);
  assert.deepEqual(seen, ['a@b.de', null]);
  off();
  A.logout();
  assert.equal(seen.length, 2);
});

test('login: scheitert /me, bleibt nichts gespeichert und es wird nichts gemeldet', async () => {
  let n = 0;
  const off = A.onAuthChange(() => n++);
  meFails = true;
  assert.equal(await A.login('a@b.de', 'geheim123'), 'Das hat nicht geklappt (500).');
  assert.equal(mem.getItem('notentafel.auth.v1'), null);
  assert.equal(A.currentUser(), null);
  assert.equal(n, 0);
  off();
});

test('Das gespeicherte Token geht bei Anfragen mit', async () => {
  await A.login('a@b.de', 'geheim123');
  await A.api('/me');
  assert.equal(calls.at(-1).auth, 'tok1');
});

test('Migration aus konto.v1: Token und Konto wandern, der Abgleichstand bleibt ohne Token', () => {
  mem.setItem('notentafel.konto.v1', JSON.stringify({ token: 'alt', user: { id: 'u9', email: 'k@l.de' }, since: '7', pending: [], offset: 5 }));
  A.initAuth('/api');
  assert.deepEqual(A.currentUser(), { id: 'u9', email: 'k@l.de', name: '' });
  assert.deepEqual(JSON.parse(mem.getItem('notentafel.auth.v1')), { token: 'alt', user: { id: 'u9', email: 'k@l.de', name: '' } });
  assert.deepEqual(JSON.parse(mem.getItem('notentafel.konto.v1')), { since: '7', pending: [], offset: 5, userId: 'u9' });
  // Nach dem Abmelden lebt die Anmeldung aus dem alten Schlüssel nicht wieder auf
  A.logout();
  A.initAuth('/api');
  assert.equal(A.currentUser(), null);
});

test('Migration: ein alter Stand ohne Token ändert nichts, auth.v1 hat Vorrang', () => {
  mem.setItem('notentafel.konto.v1', JSON.stringify({ since: '', offset: 5 }));
  A.initAuth('/api');
  assert.equal(A.currentUser(), null);
  assert.equal(mem.getItem('notentafel.auth.v1'), null);
  mem.setItem('notentafel.auth.v1', JSON.stringify({ token: 'neu', user: { id: 'u1', email: 'a@b.de' } }));
  mem.setItem('notentafel.konto.v1', JSON.stringify({ token: 'alt', user: { id: 'u9', email: 'k@l.de' } }));
  A.initAuth('/api');
  assert.equal(A.currentUser().id, 'u1');
});

test('storage-Ereignis: Anmeldung in anderem Tab wird gelesen und gemeldet', () => {
  const seen = [];
  const off = A.onAuthChange((u) => seen.push(u && u.id));
  mem.setItem('notentafel.auth.v1', JSON.stringify({ token: 't', user: { id: 'u1', email: 'a@b.de' } }));
  windowEvents.storage({ key: 'notentafel.auth.v1' });
  assert.equal(A.currentUser().id, 'u1');
  mem.removeItem('notentafel.auth.v1');
  windowEvents.storage({ key: 'notentafel.auth.v1' });
  windowEvents.storage({ key: 'woanders' });
  assert.deepEqual(seen, ['u1', null]);
  off();
});

test('refresh: erneuert das Token; bei 401 wird abgemeldet', async () => {
  await A.login('a@b.de', 'geheim123');
  assert.equal((await A.refresh()).tier, 'pro');
  assert.equal(JSON.parse(mem.getItem('notentafel.auth.v1')).token, 'tok2');
  // tok2 kennt der Testserver nicht: 401
  await assert.rejects(A.refresh(), (e) => e.status === 401);
  assert.equal(A.currentUser(), null);
  assert.equal(mem.getItem('notentafel.auth.v1'), null);
});
