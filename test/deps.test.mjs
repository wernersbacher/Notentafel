import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Die Bereiche hängen nicht voneinander ab: core/ kennt keinen Bereich, tafel/ und lied/ nutzen nur sich selbst und core/.
// Nur js/main.js darf alles zusammenführen.
const JS = path.resolve(import.meta.dirname, '../js');
const ALLOWED = { core: ['core'], tafel: ['tafel', 'core'], lied: ['lied', 'core'] };

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.endsWith('.js') ? [path.join(dir, d.name)] : []);
// Ordner unter js/, in dem eine Datei liegt ('' für js/ selbst)
const area = (file) => { const rel = path.relative(JS, file).split(path.sep); return rel.length > 1 ? rel[0] : ''; };

const files = walk(JS);

test('jedes Modul liegt in einem bekannten Ordner', () => {
  for (const f of files) {
    const a = area(f);
    assert.ok(a in ALLOWED || path.basename(f) === 'main.js', path.relative(JS, f) + ' liegt in keinem bekannten Ordner');
  }
});

for (const f of files.filter((x) => area(x))) {
  test(path.relative(JS, f).replaceAll('\\', '/') + ': nur erlaubte Importe', () => {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)'([^']+)'/g)) {
      const target = path.resolve(path.dirname(f), m[1]);
      assert.ok(fs.existsSync(target), m[1] + ' gibt es nicht');
      assert.ok(ALLOWED[area(f)].includes(area(target)), m[1] + ' ist aus ' + area(f) + '/ heraus nicht erlaubt');
    }
  });
}
