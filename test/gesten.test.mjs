import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Echte Wisch- und Zeigerereignisse lassen sich ohne Browser/DOM nicht nachstellen. Deshalb prüfen diese Tests den
// Quelltext an den Stellen, an denen das Ziehen gegen die Wischgeste abgesichert ist und die Quiz-Eingabe einen
// abgebrochenen Zeiger freigibt – wie bei den Quelltext-Prüfungen in spiele.test.mjs.
const read = (rel) => fs.readFileSync(path.resolve(import.meta.dirname, '..', rel), 'utf8');
const JS = path.resolve(import.meta.dirname, '../js');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.endsWith('.js') ? [path.join(dir, d.name)] : []);

test('Breite Tafel: eine Geste auf einem belegten Platz gehört dem Ziehen, in den Lücken bleibt das Wischen', () => {
  const css = read('css/tafel.css');
  // Die breite Tafel lässt sich weiter seitlich wischen …
  assert.match(css, /\.grid\.wide\s*\{\s*touch-action:\s*pan-x/);
  // … belegte Plätze (ein Kreis, kein leerer Geist) nehmen an der Geste nicht teil
  const rule = css.match(/\.grid\.wide\s+\.cell:has\(([^{]*?)\)\s*\{\s*touch-action:\s*none/);
  assert.ok(rule, 'Regel für belegte Plätze fehlt');
  assert.match(rule[1], /\.dot:not\(\.ghost\)/);
});

test('Tafel: touchmove auf einem belegten Platz verhindert das Scrollen (Rückfall ohne touch-action)', () => {
  const src = read('js/tafel/input.js');
  const guard = src.match(/addEventListener\('touchmove',\s*\(e\)\s*=>\s*\{([^}]*)\}\s*,\s*\{\s*passive:\s*false\s*\}\)/);
  assert.ok(guard, 'nicht-passiver touchmove-Schutz fehlt');
  assert.match(guard[1], /preventDefault\(\)/);
  // Nur auf belegten Plätzen – sonst ließe sich die breite Tafel nirgends mehr wischen
  assert.match(guard[1], /filled\(S\.rows\[drag\.r\]\[drag\.c\]\)/);
});

test('Note setzen: ein abgebrochener Zeiger gibt „held“ frei und blockiert die Aufgabe nicht', () => {
  const src = read('js/lied/games.js');
  assert.match(src, /try \{ svg\.setPointerCapture\(e\.pointerId\); \} catch/);
  assert.match(src, /const m = svg\.getScreenCTM\(\);\s*\n\s*if \(!m\) return null;/);
  // pointercancel (und das Freigeben im Fehlerfall) räumt held auf und blendet die blasse Note aus
  assert.match(src, /addEventListener\('pointercancel',\s*\(e\)\s*=>\s*\{[^}]*onStaff\.move\(null\)[^}]*release\(e\)/);
  const release = src.match(/const release = \(e\) => \{([\s\S]*?)\n  \};/);
  assert.ok(release, 'Freigabe-Funktion fehlt');
  assert.match(release[1], /try \{ held\.releasePointerCapture\(e\.pointerId\); \} catch/);
  assert.match(release[1], /held = null/);
});

test('Zeigeraufnahme in allen Eingabedateien abgesichert', () => {
  for (const f of walk(JS)) {
    const src = fs.readFileSync(f, 'utf8');
    for (const line of src.split('\n').filter((l) => l.includes('.setPointerCapture('))) {
      assert.match(line, /try \{.*setPointerCapture\(.*\)[^}]*\} catch/, path.relative(JS, f) + ': ' + line.trim());
    }
  }
});
