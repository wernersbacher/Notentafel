import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Jede lokale Datei, die eine Seite per href oder src einbindet, muss es geben: /shared/... und /legal.css aus dem
// Container-Layout (site/ ist die Wurzel), alles andere relativ zur Seite.
const ROOT = path.resolve(import.meta.dirname, '..');
const pages = ['site/index.html', 'site/imprint/index.html', 'site/privacy/index.html', 'site/login/index.html', 'site/account/index.html', 'app/index.html'];

for (const page of pages) {
  test(`${page}: lokale Dateien sind da`, () => {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    for (const [, ref] of html.matchAll(/\b(?:href|src)="([^"#?]+)[^"]*"/g)) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(ref) || ref === './' || /\/$/.test(ref)) continue;
      const abs = ref.startsWith('/shared/') ? path.join(ROOT, ref)
        : ref.startsWith('/') ? path.join(ROOT, 'site', ref)
        : path.join(ROOT, path.dirname(page), ref);
      assert.ok(fs.existsSync(abs), `${page} verweist auf ${ref}, die Datei fehlt`);
    }
  });
}
