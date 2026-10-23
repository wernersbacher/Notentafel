import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fakeStorage } from './helpers.mjs';

globalThis.localStorage = fakeStorage();
const { plan, loadPlan, onTier, TIERS } = await import('../app/js/core/tier.js');

const dev = (tier, search = '') => loadPlan({ env: { backend: null, tier }, search });

beforeEach(() => dev('guest'));

test('guest und account: nichts freigeschaltet, Lite-Grenzen', async () => {
  for (const t of ['guest', 'account']) {
    await dev(t);
    assert.equal(plan.tier, t);
    for (const f of ['known', 'cloud', 'export']) assert.equal(plan.has(f), false);
    assert.equal(plan.limit('songs'), 3);
    assert.equal(plan.limit('measures'), 8);
    assert.equal(plan.limit('games'), 2);
    assert.equal(plan.limit('quizQuestions'), 5);
  }
});

test('pro: alle Funktionen, null heißt unbegrenzt', async () => {
  await dev('pro');
  assert.equal(plan.tier, 'pro');
  for (const f of ['known', 'cloud', 'export']) assert.equal(plan.has(f), true);
  assert.equal(plan.has('gibtsnicht'), false);
  assert.equal(plan.limit('songs'), 50);
  assert.equal(plan.limit('measures'), null);
  assert.equal(plan.limit('games'), null);
  assert.equal(plan.limit('quizQuestions'), null);
  assert.equal(plan.limit('gibtsnicht'), null);
});

test('?tier schaltet ohne Backend um, unbekannte Werte werden ignoriert', async () => {
  await dev('pro', '?tier=guest');
  assert.equal(plan.tier, 'guest');
  assert.equal(plan.has('cloud'), false);
  await dev('guest', '?x=1&tier=pro');
  assert.equal(plan.tier, 'pro');
  await dev('pro', '?tier=admin');
  assert.equal(plan.tier, 'pro');
});

test('fehlende env.js: guest ohne Backend', async () => {
  await dev('pro');
  await loadPlan({ env: null, search: '' });
  assert.equal(plan.tier, 'guest');
  await loadPlan({ env: { backend: null, tier: 'quatsch' }, search: '' });
  assert.equal(plan.tier, 'guest');
});

test('mit Backend gilt ?tier nicht; ohne Anmeldung ist es guest', async () => {
  globalThis.localStorage = fakeStorage();
  await dev('pro');
  await loadPlan({ env: { backend: '/api', tier: null }, search: '?tier=pro' });
  assert.equal(plan.tier, 'guest');
  assert.equal(plan.has('cloud'), false);
});

test('mit Backend fragt auch der Gast den Server: solange Lite nicht freigegeben ist, antwortet er mit Pro', async () => {
  globalThis.localStorage = fakeStorage();
  const pro = TIERS.pro;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ tier: 'pro', features: pro.features, limits: pro.limits, user: null }) });
  await loadPlan({ env: { backend: '/api', tier: null }, search: '' });
  assert.equal(plan.tier, 'pro');
  assert.equal(plan.has('known'), true);
  assert.equal(plan.limit('measures'), null);
  delete globalThis.fetch;
});

test('onTier meldet Wechsel, nicht Gleichstand', async () => {
  const seen = [];
  const off = onTier((t) => seen.push(t));
  await dev('guest');
  await dev('pro');
  await dev('pro');
  await dev('account');
  off();
  await dev('guest');
  assert.deepEqual(seen, ['pro', 'account']);
});

test('TIERS im Frontend stimmt mit pb_hooks/tiers.js überein', () => {
  const server = createRequire(import.meta.url)('../pb_hooks/tiers.js').TIERS;
  assert.deepEqual(Object.keys(TIERS).sort(), Object.keys(server).sort());
  for (const t of Object.keys(server)) {
    assert.deepEqual(TIERS[t].features, server[t].features, t + ': features');
    assert.deepEqual(TIERS[t].limits, server[t].limits, t + ': limits');
  }
});
