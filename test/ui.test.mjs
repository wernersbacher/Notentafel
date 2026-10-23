import { test } from 'node:test';
import assert from 'node:assert/strict';

// ui.js liest beim Laden die Elemente aus dom.js; ohne Browser genügt ein leeres Dokument
globalThis.document = { getElementById: () => null, querySelector: () => null };
const { setPressed, status, tempoText } = await import('../app/js/core/ui.js');

// Kleine Element-Attrappe: merkt sich Klassen und Attribute
function fakeNode() {
  const classes = new Set(), attrs = new Map();
  return {
    textContent: '',
    classList: {
      toggle: (c, on) => { if (on) classes.add(c); else classes.delete(c); },
      contains: (c) => classes.has(c)
    },
    setAttribute: (k, v) => attrs.set(k, v),
    attr: (k) => attrs.get(k)
  };
}

test('setPressed: „on“ und aria-pressed gehen zusammen an und aus', () => {
  const b = fakeNode();
  setPressed(b, true);
  assert.ok(b.classList.contains('on'));
  assert.equal(b.attr('aria-pressed'), 'true');
  setPressed(b, false);
  assert.ok(!b.classList.contains('on'));
  assert.equal(b.attr('aria-pressed'), 'false');
});

test('status: setzt den Text und färbt nur warnend rot', () => {
  const n = fakeNode();
  status(n, 'Gespeichert.');
  assert.equal(n.textContent, 'Gespeichert.');
  assert.ok(!n.classList.contains('warn'));
  status(n, 'Speicher voll.', true);
  assert.equal(n.textContent, 'Speicher voll.');
  assert.ok(n.classList.contains('warn'));
});

test('tempoText: dieselbe Schreibweise für Menü und Tempoknopf', () => {
  assert.equal(tempoText(120), '120 pro Minute');
});
