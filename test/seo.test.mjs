import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Adressen der Website: pb_hooks/seo.js (CommonJS, wie der Server es lädt)
const require = createRequire(import.meta.url);
const { PAGES, MOVED, baseUrl, fillAppUrl, robotsTxt, sitemapXml } = require('../pb_hooks/seo.js');

// Kleine Anfrage wie e.request: header.get, tls, host
const req = (host, { proto = '', tls = false } = {}) => ({ host, tls, header: { get: (k) => (k === 'X-Forwarded-Proto' ? proto : '') } });

test('baseUrl: eingestellte Adresse ohne Slash am Ende', () => {
  assert.equal(baseUrl('https://musiktafel.example/', req('x:8090')), 'https://musiktafel.example');
  assert.equal(baseUrl('https://musiktafel.example///', req('x:8090')), 'https://musiktafel.example');
});

test('baseUrl: ohne Einstellung Schema und Host der Anfrage', () => {
  assert.equal(baseUrl('', req('localhost:8082')), 'http://localhost:8082');
  assert.equal(baseUrl('', req('musiktafel.example', { tls: true })), 'https://musiktafel.example');
  assert.equal(baseUrl('', req('musiktafel.example', { proto: 'https' })), 'https://musiktafel.example');
});

test('fillAppUrl: ersetzt jeden Platzhalter', () => {
  const html = '<link href="{{APP_URL}}/"><meta content="{{APP_URL}}/assets/og.png">';
  assert.equal(fillAppUrl(html, 'https://a.example'), '<link href="https://a.example/"><meta content="https://a.example/assets/og.png">');
  assert.equal(fillAppUrl('ohne', 'https://a.example'), 'ohne');
});

test('robotsTxt: sperrt Konto, Anmeldung und API, nennt die Sitemap', () => {
  const t = robotsTxt('https://a.example');
  for (const p of ['/account/', '/login/', '/api/', '/_/']) assert.ok(t.includes('Disallow: ' + p + '\n'), p);
  assert.ok(t.startsWith('User-agent: *\n'));
  assert.ok(t.includes('Sitemap: https://a.example/sitemap.xml\n'));
  assert.ok(!t.includes('{{'));
});

test('sitemapXml: Landing, Impressum und Datenschutz mit absoluten Adressen', () => {
  const x = sitemapXml('https://a.example');
  assert.deepEqual([...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]),
    ['https://a.example/', 'https://a.example/imprint/', 'https://a.example/privacy/']);
  assert.deepEqual(PAGES, ['/', '/imprint/', '/privacy/']);
});

test('MOVED: alte Adressen zeigen auf die neuen Ordner', () => {
  assert.deepEqual(MOVED, { '/impressum.html': '/imprint/', '/datenschutz.html': '/privacy/' });
});
