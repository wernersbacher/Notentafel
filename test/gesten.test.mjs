import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pointerDrag } from '../app/js/core/pointer.js';

// Echte Wisch- und Zeigerereignisse lassen sich ohne Browser/DOM nicht nachstellen. Deshalb prüfen diese Tests den
// Quelltext an den Stellen, an denen das Ziehen gegen die Wischgeste abgesichert ist und die Quiz-Eingabe einen
// abgebrochenen Zeiger freigibt – wie bei den Quelltext-Prüfungen in spiele.test.mjs.
const read = (rel) => fs.readFileSync(path.resolve(import.meta.dirname, '..', rel), 'utf8');
const JS = path.resolve(import.meta.dirname, '../app/js');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.endsWith('.js') ? [path.join(dir, d.name)] : []);

test('Breite Tafel: eine Geste auf einem belegten Platz gehört dem Ziehen, in den Lücken bleibt das Wischen', () => {
  const css = read('app/css/tafel.css');
  // Die breite Tafel lässt sich weiter seitlich wischen …
  assert.match(css, /\.grid\.wide\s*\{\s*touch-action:\s*pan-x/);
  // … belegte Plätze (ein Kreis, kein leerer Geist) nehmen an der Geste nicht teil
  const rule = css.match(/\.grid\.wide\s+\.cell:has\(([^{]*?)\)\s*\{\s*touch-action:\s*none/);
  assert.ok(rule, 'Regel für belegte Plätze fehlt');
  assert.match(rule[1], /\.dot:not\(\.ghost\)/);
});

test('Tafel: touchmove auf einem belegten Platz verhindert das Scrollen (Rückfall ohne touch-action)', () => {
  // Das gemeinsame Gerüst hängt den nicht-passiven Schutz an und fragt den Bereich, ob die Geste ihm gehört …
  const core = read('app/js/core/pointer.js');
  const guard = core.match(/addEventListener\('touchmove',\s*\(e\)\s*=>\s*\{([^}]*)\}\s*,\s*\{\s*passive:\s*false\s*\}\)/);
  assert.ok(guard, 'nicht-passiver touchmove-Schutz fehlt');
  assert.match(guard[1], /preventDefault\(\)/);
  assert.match(guard[1], /scroll\(drag\)/);
  // … und die Tafel nur auf belegten Plätzen – sonst ließe sich die breite Tafel nirgends mehr wischen
  const src = read('app/js/tafel/input.js');
  // (ein Griff des markierten Bereichs und eine gehaltene Geste gehören ebenfalls dem Ziehen)
  assert.match(src, /scroll:\s*\(d\)\s*=>\s*d\.kind === 'handle' \|\| d\.held \|\| filled\(S\.rows\[d\.r\]\[d\.c\]\)/);
});

test('Note setzen: ein abgebrochener Zeiger gibt „held“ frei und blockiert die Aufgabe nicht', () => {
  const src = read('app/js/lied/games.js');
  assert.match(src, /try \{ svg\.setPointerCapture\(e\.pointerId\); \} catch/);
  assert.match(src, /const m = svg\.getScreenCTM\(\);\s*\n\s*if \(!m\) return null;/);
  // pointercancel (und das Freigeben im Fehlerfall) räumt held auf und blendet die blasse Note aus
  assert.match(src, /addEventListener\('pointercancel',\s*\(e\)\s*=>\s*\{[^}]*onStaff\.move\(null\)[^}]*release\(e\)/);
  const release = src.match(/const release = \(e\) => \{([\s\S]*?)\n  \};/);
  assert.ok(release, 'Freigabe-Funktion fehlt');
  assert.match(release[1], /try \{ held\.releasePointerCapture\(e\.pointerId\); \} catch/);
  assert.match(release[1], /held = null/);
});

// Gerüst ohne Browser: ein nachgebauter Rahmen sammelt die Listener und ruft sie auf Zuruf; die Ereignisse sind
// kleine Objekte mit genau den Feldern, die das Gerüst liest.
function fakeRoot() {
  const on = new Map();
  const calls = [];
  return {
    calls,
    addEventListener(type, f, opt) { if (!on.has(type)) on.set(type, []); on.get(type).push({ f, opt }); },
    fire(type, e) { for (const { f } of on.get(type) || []) f(e); },
    opts(type) { return (on.get(type) || []).map((l) => l.opt); },
    setPointerCapture(id) { calls.push('capture:' + id); },
    releasePointerCapture(id) { calls.push('release:' + id); }
  };
}
const pev = (type, x = 0, y = 0, id = 1) => ({
  type, pointerId: id, button: 0, clientX: x, clientY: y, prevented: false,
  preventDefault() { this.prevented = true; }
});

test('Gerüst: Tipp bleibt Tipp, erst ab der Schwelle wird gezogen', () => {
  const root = fakeRoot();
  const seen = [];
  pointerDrag(root, {
    threshold: 10,
    start: () => ({}),
    move: (e, d, dragging) => seen.push(dragging),
    end: (e, d, cancel) => seen.push(cancel ? 'cancel' : 'end'),
    scroll: () => false
  });
  root.fire('pointerdown', pev('pointerdown', 0, 0));
  root.fire('pointermove', pev('pointermove', 3, 4)); // 5 px: noch ein Tipp
  root.fire('pointermove', pev('pointermove', 6, 8)); // 10 px: genau die Schwelle zählt
  root.fire('pointerup', pev('pointerup', 6, 8));
  assert.deepEqual(seen, [false, true, 'end']);
  assert.deepEqual(root.calls, ['capture:1', 'release:1']);
});

test('Gerüst: start entscheidet, fremde Zeiger und ein zweiter Finger stören nicht', () => {
  const root = fakeRoot();
  const seen = [];
  const base = { move: (e, d, dragging) => seen.push(dragging), end: (e, d, cancel) => seen.push(cancel ? 'cancel' : 'end'), scroll: () => true };
  let begin = false;
  pointerDrag(root, { ...base, threshold: 10, start: () => (begin ? {} : null) });
  root.fire('pointerdown', pev('pointerdown'));
  root.fire('pointerup', pev('pointerup'));
  assert.deepEqual(root.calls, []); // hier beginnt kein Ziehen
  begin = true;
  root.fire('pointerdown', pev('pointerdown', 0, 0, 1));
  root.fire('pointerdown', pev('pointerdown', 0, 0, 2)); // zweiter Finger: keine neue Aufnahme
  root.fire('pointermove', pev('pointermove', 50, 0, 2)); // fremder Zeiger: kein Fortgang
  root.fire('pointerup', pev('pointerup', 50, 0, 2)); // fremder Zeiger: kein Abschluss
  assert.deepEqual(seen, []);
  assert.deepEqual(root.calls, ['capture:1']);
  root.fire('pointermove', pev('pointermove', 50, 0, 1));
  root.fire('pointercancel', pev('pointercancel', 50, 0, 1));
  assert.deepEqual(seen, [true, 'cancel']);
  assert.deepEqual(root.calls, ['capture:1', 'release:1']);
});

test('Gerüst: touchmove sperrt das Scrollen nur, wenn scroll(d) es sagt, und contextmenu nicht aufklappen', () => {
  const root = fakeRoot();
  let owns = false;
  pointerDrag(root, { threshold: 10, start: () => ({}), move() {}, end() {}, scroll: () => owns });
  const tm = () => pev('touchmove');
  const before = tm(); root.fire('touchmove', before);
  assert.equal(before.prevented, false); // ohne Geste nicht
  root.fire('pointerdown', pev('pointerdown'));
  const tipp = tm(); root.fire('touchmove', tipp);
  assert.equal(tipp.prevented, false);
  owns = true;
  const ziehen = tm(); root.fire('touchmove', ziehen);
  assert.equal(ziehen.prevented, true);
  root.fire('pointerup', pev('pointerup'));
  const after = tm(); root.fire('touchmove', after);
  assert.equal(after.prevented, false);
  assert.deepEqual(root.opts('touchmove'), [{ passive: false }]); // sonst dürfte preventDefault nichts
  const menu = pev('contextmenu'); root.fire('contextmenu', menu);
  assert.equal(menu.prevented, true);
});

test('Zeigeraufnahme in allen Eingabedateien abgesichert', () => {
  for (const f of walk(JS)) {
    const src = fs.readFileSync(f, 'utf8');
    for (const line of src.split('\n').filter((l) => l.includes('.setPointerCapture('))) {
      assert.match(line, /try \{.*setPointerCapture\(.*\)[^}]*\} catch/, path.relative(JS, f) + ': ' + line.trim());
    }
  }
});
