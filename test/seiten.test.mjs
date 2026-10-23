import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Jede lokale Datei, die eine Seite per href oder src einbindet, muss es geben: /shared/... und /legal.css aus dem
// Container-Layout (site/ ist die Wurzel), alles andere relativ zur Seite. Absolute Adressen mit {{APP_URL}} (canonical,
// og:image) werden nicht geladen, aber der Pfad dahinter muss es geben.
const ROOT = path.resolve(import.meta.dirname, '..');
const pages = ['site/index.html', 'site/imprint/index.html', 'site/privacy/index.html', 'site/login/index.html', 'site/account/index.html', 'app/index.html'];

for (const page of pages) {
  test(`${page}: lokale Dateien sind da`, () => {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const refs = [...html.matchAll(/\b(?:href|src)="([^"#?]+)[^"]*"/g), ...html.matchAll(/\bcontent="(\{\{APP_URL\}\}[^"#?]*)"/g)];
    for (const [, raw] of refs) {
      const ref = raw.replace('{{APP_URL}}', '');
      if (/^[a-z][a-z0-9+.-]*:/i.test(ref) || ref === './' || /\/$/.test(ref)) continue;
      const abs = ref.startsWith('/shared/') ? path.join(ROOT, ref)
        : ref.startsWith('/') ? path.join(ROOT, 'site', ref)
        : path.join(ROOT, path.dirname(page), ref);
      assert.ok(fs.existsSync(abs), `${page} verweist auf ${ref}, die Datei fehlt`);
    }
  });
}

// Jede Seite hat Titel, Favicon und (außer der App) eine Beschreibung; Login und Konto sind für Suchmaschinen gesperrt
for (const page of pages) {
  test(`${page}: Titel, Beschreibung und Favicon`, () => {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.match(html, /<link rel="icon" href="\/shared\/favicon\.svg"/);
    if (page !== 'app/index.html') assert.match(html, /<meta name="description" content="[^"]{20,}"/);
    if (/login|account/.test(page)) assert.match(html, /<meta name="robots" content="noindex"/);
  });
}

test('Landing: Open Graph, Twitter-Karte, canonical und Bilder', () => {
  const html = fs.readFileSync(path.join(ROOT, 'site/index.html'), 'utf8');
  for (const m of ['og:title', 'og:description', 'og:url', 'og:image']) assert.match(html, new RegExp(`property="${m}"`));
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /rel="canonical" href="\{\{APP_URL\}\}\/"/);
  for (const f of ['site/assets/og.png', 'site/assets/apple-touch-icon.png', 'shared/favicon.svg']) assert.ok(fs.existsSync(path.join(ROOT, f)), f + ' fehlt');
});

test('Impressum und Datenschutz sind aus der Fußzeile jeder Website-Seite verlinkt', () => {
  for (const page of ['site/index.html', 'site/login/index.html', 'site/account/index.html']) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    assert.match(html, /<footer[^>]*>[\s\S]*href="\/imprint\/"[\s\S]*href="\/privacy\/"/, page);
  }
});
