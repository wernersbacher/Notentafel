import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountStatus, songsHint, fullNote } from '../app/js/core/account-text.js';

const user = { email: 'a@b.de' };
const base = { available: true, user, sync: true, tier: 'free', lastSync: 0, error: '', limit: 10, rejected: 0, invalid: 0 };
const uhr = () => '12:34';

test('Status: Gast und Konto ohne Abgleich haben keinen Text', () => {
  assert.equal(accountStatus({ ...base, user: null }, uhr), null);
  assert.equal(accountStatus({ ...base, sync: false, tier: null }, uhr), null);
  assert.equal(accountStatus({ ...base, sync: false }, uhr).text, 'Die Lieder bleiben auf diesem Gerät. Der Abgleich mit dem Konto gehört zu Pro.');
});

test('Status: abgeglichen, laufend und Fehler', () => {
  assert.deepEqual(accountStatus({ ...base, lastSync: 5 }, uhr), { text: 'Lieder abgeglichen um 12:34 Uhr.', warn: false });
  assert.equal(accountStatus(base, uhr).text, 'Lieder werden abgeglichen …');
  const e = accountStatus({ ...base, error: 'Kein Netz.' }, uhr);
  assert.equal(e.warn, true);
  assert.match(e.text, /^Kein Netz\. Die Lieder bleiben vorgemerkt/);
});

test('Status: Lieder über dem Limit oder abgelehnt warnen', () => {
  const s = accountStatus({ ...base, lastSync: 5, rejected: 2, limit: 10 }, uhr);
  assert.equal(s.warn, true);
  assert.match(s.text, /2 Lieder passen nicht mehr ins Konto \(höchstens 10\)/);
  assert.match(fullNote({ ...base, invalid: 1 }), /Ein Lied nimmt der Server nicht an/);
  assert.match(fullNote({ ...base, rejected: 1, invalid: 1 }), /2 Lieder liegen nur auf diesem Gerät/);
  assert.equal(fullNote(base), '');
});

test('Hinweis unter den Liedern verweist auf oben rechts', () => {
  assert.match(songsHint({ ...base, user: null }), /\(oben rechts\)/);
  assert.match(songsHint(base), /a@b\.de/);
});

test('Hinweis: Gast und Konto ohne Pro nennen die Grenze aus den limits, nicht fest', () => {
  const gast = songsHint({ ...base, user: null, sync: false, songsLimit: 3 });
  assert.match(gast, /^Liegen nur auf diesem Gerät, höchstens 3 Lieder./);
  assert.match(gast, /Pro-Konto \(oben rechts\)/);
  assert.match(songsHint({ ...base, user: null, sync: false, songsLimit: 9 }), /höchstens 9 Lieder/);
  const konto = songsHint({ ...base, sync: false, songsLimit: 3 });
  assert.match(konto, /höchstens 3 Lieder. Der Abgleich mit dem Konto gehört zu Pro./);
  assert.doesNotMatch(konto, /Notenblatt/);
});

test('Hinweis: ohne Grenze keine Zahl, vor dem ersten /me kein Pro-Satz', () => {
  assert.doesNotMatch(songsHint({ ...base, user: null, sync: false, songsLimit: null }), /höchstens/);
  assert.doesNotMatch(songsHint({ ...base, sync: false, tier: undefined, songsLimit: 3 }), /Pro/);
});

test('Hinweis: mit Abgleich liegen die Lieder auch im Konto', () => {
  assert.match(songsHint({ ...base, songsLimit: 50 }), /^Liegen auch in deinem Konto \(a@b\.de\)/);
});
