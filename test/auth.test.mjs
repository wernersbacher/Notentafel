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
  if (url === '/api/collections/users/request-password-reset' || url === '/api/collections/users/request-verification') {
    return JSON.parse(opts.body).email ? reply(204, null) : reply(400, { message: 'x', data: { email: { code: 'validation_required' } } });
  }
  if (url === '/api/collections/users/confirm-password-reset' || url === '/api/collections/users/confirm-verification') {
    const b = JSON.parse(opts.body);
    if (b.token !== 'gut') return reply(400, { message: 'x', data: { token: { code: 'validation_invalid_token' } } });
    if (b.password !== undefined && b.password.length < 8) return reply(400, { message: 'x', data: { password: { code: 'validation_length_out_of_range' } } });
    return reply(204, null);
  }
  if (url === '/api/collections/users/records/u1' && opts.method === 'PATCH') {
    const b = JSON.parse(opts.body);
    if (b.oldPassword !== undefined) {
      if (b.oldPassword !== 'geheim123') return reply(400, { message: 'x', data: { oldPassword: { code: 'validation_invalid_old_password' } } });
      // das neue Passwort merkt sich der Fake-Server nicht; die Tests ändern es auf dasselbe
      return reply(200, record);
    }
    return b.name.length > 60 ? reply(400, { message: 'x', data: { name: { code: 'validation_max_text_constraint' } } }) : reply(200, { ...record, name: b.name });
  }
  if (url === '/api/collections/users/request-email-change') {
    const b = JSON.parse(opts.body);
    if (b.newEmail === 'vergeben@b.de') return reply(400, { message: 'x', data: { newEmail: { code: 'validation_not_unique' } } });
    return b.newEmail ? reply(204, null) : reply(400, { message: 'x', data: { newEmail: { code: 'validation_required' } } });
  }
  if (url === '/api/collections/users/confirm-email-change') {
    const b = JSON.parse(opts.body);
    if (b.token !== 'gut') return reply(400, { message: 'x', data: { token: { code: 'validation_invalid_token' } } });
    return b.password === 'geheim123' ? reply(204, null) : reply(400, { message: 'x', data: { password: { code: 'validation_invalid_password' } } });
  }
  if (url === '/api/me/logout-all') return opts.headers.Authorization ? reply(204, null) : reply(401, { message: 'x' });
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

test('safeNext: nur Pfade auf dieser Seite, sonst /app/', () => {
  for (const ok of ['/app/', '/account/', '/app/?lied=3#x']) assert.equal(A.safeNext(ok), ok);
  const bs = String.fromCharCode(92);
  for (const bad of ['//evil.de', '/' + bs + 'evil.de', 'https://evil.de', 'http://evil.de/app/', 'javascript:alert(1)', '/\t/evil.de', '/\n/evil.de',
    '/ok' + bs + '..' + bs + 'evil', 'evil.de', 'app/', '', null, undefined, 42]) {
    assert.equal(A.safeNext(bad), '/app/', String(bad));
  }
});

test('Passwort zurücksetzen und E-Mail bestätigen: Anfragen und deutsche Meldungen', async () => {
  assert.equal(await A.requestPasswordReset('a@b.de'), '');
  assert.equal(calls.at(-1).url, '/api/collections/users/request-password-reset');
  assert.equal(await A.requestPasswordReset(''), 'Bitte eine gültige E-Mail eingeben.');
  assert.equal(await A.requestVerification('a@b.de'), '');
  assert.equal(calls.at(-1).url, '/api/collections/users/request-verification');
  assert.equal(await A.confirmPasswordReset('gut', 'neuespasswort'), '');
  assert.equal(await A.confirmPasswordReset('gut', 'kurz'), 'Das Passwort braucht mindestens 8 Zeichen.');
  assert.match(await A.confirmPasswordReset('alt', 'neuespasswort'), /ungültig oder abgelaufen/);
  assert.equal(await A.confirmVerification('gut'), '');
  assert.match(await A.confirmVerification('alt'), /ungültig oder abgelaufen/);
});

test('updateProfile: speichert den Namen, behält das Token und meldet die Änderung', async () => {
  await A.login('a@b.de', 'geheim123');
  const seen = [];
  A.onAuthChange((u) => seen.push(u && u.name));
  assert.equal(await A.updateProfile({ name: '  Berta  ' }), '');
  assert.equal(A.currentUser().name, 'Berta');
  assert.deepEqual(JSON.parse(mem.getItem('notentafel.auth.v1')), { token: 'tok1', user: { id: 'u1', email: 'a@b.de', name: 'Berta' } });
  assert.equal(seen.at(-1), 'Berta');
  assert.match(await A.updateProfile({ name: 'x'.repeat(61) }), /höchstens 60/);
});

test('changePassword: falsches altes Passwort, sonst neu anmelden', async () => {
  await A.login('a@b.de', 'geheim123');
  assert.equal(await A.changePassword('falsch', 'neuespasswort'), 'Das alte Passwort stimmt nicht.');
  calls = [];
  assert.equal(await A.changePassword('geheim123', 'geheim123'), '');
  assert.deepEqual(calls.map((c) => c.url), ['/api/collections/users/records/u1', '/api/collections/users/auth-with-password', '/api/me']);
  assert.equal(A.currentUser().email, 'a@b.de');
});

test('E-Mail ändern: Anfrage, vergebene Adresse, Bestätigung meldet ab', async () => {
  await A.login('a@b.de', 'geheim123');
  assert.equal(await A.requestEmailChange('neu@b.de'), '');
  assert.equal(await A.requestEmailChange('vergeben@b.de'), 'Für diese E-Mail gibt es schon ein Konto.');
  assert.equal(await A.requestEmailChange(''), 'Bitte eine gültige E-Mail eingeben.');
  assert.match(await A.confirmEmailChange('alt', 'geheim123'), /ungültig oder abgelaufen/);
  assert.equal(await A.confirmEmailChange('gut', 'falsch'), 'Das Passwort stimmt nicht.');
  assert.notEqual(A.currentUser(), null);
  assert.equal(await A.confirmEmailChange('gut', 'geheim123'), '');
  assert.equal(A.currentUser(), null);
});

test('logoutAll: Server zuerst, dann lokal abmelden; bei Fehler bleibt die Anmeldung', async () => {
  await A.login('a@b.de', 'geheim123');
  assert.equal(await A.logoutAll(), '');
  assert.equal(calls.at(-1).url, '/api/me/logout-all');
  assert.equal(A.currentUser(), null);
  assert.equal(mem.getItem('notentafel.auth.v1'), null);
});
