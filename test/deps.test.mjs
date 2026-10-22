import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Die Bereiche hängen nicht voneinander ab: core/ kennt keinen Bereich, tafel/ und lied/ nutzen nur sich selbst und core/.
// Ganz oben unter js/ liegen main.js (führt alles zusammen) und songformat.js (verbindet Tafel und Lied; tafel/ und lied/
// reichen seine Funktionen nur weiter). Sie dürfen aus beiden Bereichen lesen, die Bereiche dürfen sie importieren.
const JS = path.resolve(import.meta.dirname, '../js');
const ROOT = ['main.js', 'songformat.js'];
const ALLOWED = { core: ['core'], tafel: ['tafel', 'core'], lied: ['lied', 'core'] };
// Aus js/ selbst dürfen nur die Bereiche holen, und nur das, was für beide gedacht ist (nie main.js); core bleibt unten
const SHARED = ['songformat.js'];

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.endsWith('.js') ? [path.join(dir, d.name)] : []);
// Ordner unter js/, in dem eine Datei liegt ('' für js/ selbst)
const area = (file) => { const rel = path.relative(JS, file).split(path.sep); return rel.length > 1 ? rel[0] : ''; };

const files = walk(JS);

test('jedes Modul liegt in einem bekannten Ordner', () => {
  for (const f of files) {
    const a = area(f);
    assert.ok(a in ALLOWED || (a === '' && ROOT.includes(path.basename(f))), path.relative(JS, f) + ' liegt in keinem bekannten Ordner');
  }
});

for (const f of files.filter((x) => area(x))) {
  test(path.relative(JS, f).replaceAll('\\', '/') + ': nur erlaubte Importe', () => {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)'([^']+)'/g)) {
      const target = path.resolve(path.dirname(f), m[1]);
      assert.ok(fs.existsSync(target), m[1] + ' gibt es nicht');
      const from = area(f), to = area(target);
      const ok = to === ''
        ? SHARED.includes(path.basename(target)) && from !== 'core'
        : ALLOWED[from].includes(to);
      assert.ok(ok, m[1] + ' ist aus ' + from + '/ heraus nicht erlaubt');
    }
  });
}
