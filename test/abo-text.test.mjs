import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aboText } from '../site/account/abo-text.js';

process.env.TZ = 'Europe/Berlin'; // das Datum soll in deutscher Zeit stimmen, egal wo der Test läuft

const BETA = '2027-06-30 22:00:00.000Z';
const pro = { tier: 'pro', features: ['lied', 'cloud'], limits: { songs: 50 }, beta_end: BETA };
const konto = { tier: 'account', features: [], limits: { songs: 5 }, beta_end: BETA };
const jetzt = new Date('2026-10-23T10:00:00Z');

test('Abo: Pro in der Beta', () => {
  const t = aboText({ ...pro, user: { pro_until: BETA } }, jetzt);
  assert.equal(t.stufe, 'Pro');
  assert.deepEqual(t.umfang, ['Notenblatt', 'Lieder auf allen Geräten', 'bis zu 50 Lieder im Konto']);
  assert.equal(t.bis, '30.06.2027 (Beta, kostenlos)');
  assert.match(t.beta, /^Pro ist in der Beta kostenlos\./);
  assert.equal(t.hinweis, '');
});

test('Abo: Pro mit anderem Datum ist keine Beta', () => {
  const t = aboText({ ...pro, user: { pro_until: '2026-11-15 23:00:00.000Z' } }, jetzt);
  assert.equal(t.bis, '15.11.2026');
  assert.equal(t.beta, '');
});

test('Abo: Zeitzone, 30.06.2027 22:00Z ist der 30.06. und nicht der 1.7.', () => {
  assert.equal(aboText({ ...pro, user: { pro_until: '2027-06-30 22:00:00.000Z' }, beta_end: null }, jetzt).bis, '30.06.2027');
});

test('Abo: abgelaufen oder nie Pro, Stufe Konto', () => {
  const alt = aboText({ ...konto, user: { pro_until: '2026-10-01 22:00:00.000Z' } }, jetzt);
  assert.equal(alt.stufe, 'Konto');
  assert.deepEqual(alt.umfang, ['bis zu 5 Lieder im Konto']);
  assert.equal(alt.bis, '');
  assert.match(alt.hinweis, /^Dein Pro ist am 01\.10\.2026 abgelaufen\. Notenblatt/);
  const neu = aboText({ ...konto, user: { pro_until: null } }, jetzt);
  assert.doesNotMatch(neu.hinweis, /abgelaufen/);
  assert.match(neu.hinweis, /gehören zu Pro/);
});
