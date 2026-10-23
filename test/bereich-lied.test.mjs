import { test, before, after, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, uninstallDom, n, song } from './helpers.mjs';

// Bereich im Notenblatt: Halten und Ziehen (input.js), Band und Griffe (sheet.js), Aufheben (state.js, edit.js, range.js).
// jsdom hat kein Layout: Was unter dem Finger liegt, bestimmt der Test mit elementsFromPoint, die Zeiger kommen als MouseEvent.
let L, opts, R, act, SB, el, initSheetInput, under = [];
before(async () => {
  installDom();
  ({ L, opts } = await import('../app/js/lied/state.js'));
  R = await import('../app/js/lied/render.js');
  SB = await import('../app/js/lied/sidebar.js');
  act = await import('../app/js/lied/actions.js');
  ({ el } = await import('../app/js/lied/dom.js'));
  ({ initSheetInput } = await import('../app/js/lied/input.js'));
  SB.buildPanel();
  initSheetInput();
  document.elementsFromPoint = () => under;
});
after(uninstallDom);

// Vier Noten in zwei Zeilen (Umbruch hinter der zweiten)
beforeEach(() => {
  mock.timers.enable({ apis: ['setTimeout'] });
  L.song = song([n('c1'), n('d1', 4, { brk: 1 }), n('e1'), n('f1')], '', 0);
  L.sel = 4; L.hist = []; L.redo = []; L.last = null; L.range = null; L.quiz = null; L.written = null; L.insertMode = false;
  Object.assign(opts, { autoBar: false, autoZ: false, lyrics: true, names: false, colors: false, wrap: true, size: 2 });
  el.sheet.innerHTML = '';
  R.renderSheet();
  under = [];
});
afterEach(() => mock.timers.reset());

const hit = (i) => el.sheet.querySelectorAll('.hit[data-i="' + i + '"]')[1] || el.sheet.querySelector('.hit[data-i="' + i + '"]');
// Das Gerüst liest nur button, pointerId und clientX/Y; jsdom kennt PointerEvent nicht überall, also ein MouseEvent mit pointerId
const ptr = (target, type, x = 0, y = 0) => {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperty(e, 'pointerId', { value: 1 });
  target.dispatchEvent(e);
};

test('Notenblatt: ein Bereich zeichnet Band, zwei Griffe und ein ✕; die Markierung rückt an seinen Anfang', () => {
  act.setRange(1, 2);
  assert.deepEqual(L.range, { a: 1, b: 2 });
  assert.equal(L.sel, 1);
  assert.equal(el.sheet.querySelectorAll('.rband').length, 2, 'ein Band je Zeile (Zeile 1: Note 2, Zeile 2: Note 3)');
  assert.equal(el.sheet.querySelectorAll('.rhandle[data-handle="a"]').length, 1);
  assert.equal(el.sheet.querySelectorAll('.rhandle[data-handle="b"]').length, 1);
  assert.equal(el.sheet.querySelectorAll('[data-rclear]').length, 1);
  assert.equal(el.sheet.querySelectorAll('.rgrip').length, 2, 'zum Anfassen liegt je Griff ein HTML-Feld darüber');
});

test('setRange: begrenzt auf das Lied, a vor b; derselbe Bereich ändert nichts', () => {
  act.setRange(-3, 99);
  assert.deepEqual(L.range, { a: 0, b: 3 });
  const html = el.sheet.innerHTML;
  act.setRange(0, 3);
  assert.equal(el.sheet.innerHTML, html);
  L.song = song([], '', 0);
  L.range = null;
  act.setRange(0, 1);
  assert.equal(L.range, null, 'ohne Zeichen gibt es nichts zu markieren');
});

test('setLines: ganze Notenzeilen, in beliebiger Richtung', () => {
  act.setLines(1, 0);
  assert.deepEqual(L.range, { a: 0, b: 3 });
  act.setLines(1, 1);
  assert.deepEqual(L.range, { a: 2, b: 3 });
});

test('Ein Ton ändert sich im Bereich, der Bereich bleibt; Einfügen, Rückgängig und ein Tipp auf eine Note heben ihn auf', () => {
  act.setRange(1, 2);
  act.placePitch('e1'); // ersetzt die Note an der Markierung (Index 1): dieselbe Form des Lieds
  assert.equal(L.song.ev[1].p, 'e1');
  assert.deepEqual(L.range, { a: 1, b: 2 }, 'der Bereich bleibt');
  assert.equal(el.sheet.querySelectorAll('.rband').length, 2);
  act.setRange(1, 2);
  act.setValue(2); // eine andere Länge ändert auch nur die Note
  assert.deepEqual(L.range, { a: 1, b: 2 });
  act.setRange(0, 1);
  L.insertMode = true;
  act.placePitch('c1'); // eine neue Note verschiebt die Plätze
  assert.equal(L.range, null);
  L.insertMode = false;
  act.setRange(0, 1);
  act.undo();
  assert.equal(L.range, null);
  act.setRange(0, 1);
  act.tapEv(2, false);
  assert.equal(L.range, null);
  assert.equal(L.sel, 2);
  act.setRange(0, 1);
  el.sheet.querySelector('[data-rclear]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert.equal(L.range, null, 'das ✕ hebt ihn auf');
  assert.equal(el.sheet.querySelectorAll('.rband').length, 0);
});

test('Halten auf einer Note markiert sie als Bereich, Weiterziehen vergrößert ihn', () => {
  ptr(hit(1), 'pointerdown');
  mock.timers.tick(300);
  assert.equal(L.range, null, 'noch zu kurz gehalten');
  mock.timers.tick(200);
  assert.deepEqual(L.range, { a: 1, b: 1 });
  under = [hit(3)];
  ptr(el.sheet, 'pointermove', 5, 5);
  assert.deepEqual(L.range, { a: 1, b: 3 });
  under = [hit(0)];
  ptr(el.sheet, 'pointermove', 6, 6);
  assert.deepEqual(L.range, { a: 0, b: 1 });
  ptr(el.sheet, 'pointerup');
  assert.deepEqual(L.range, { a: 0, b: 1 }, 'beim Loslassen bleibt er');
});

test('Ein Tipp (ohne Halten) und Wischen markieren keinen Bereich', () => {
  ptr(hit(1), 'pointerdown', 0, 0);
  mock.timers.tick(100);
  ptr(el.sheet, 'pointerup');
  assert.equal(L.range, null);
  ptr(hit(1), 'pointerdown', 0, 0);
  ptr(el.sheet, 'pointermove', 0, 40); // der Finger wischt: das Blatt scrollt
  mock.timers.tick(1000);
  ptr(el.sheet, 'pointerup');
  assert.equal(L.range, null);
});

test('Halten auf einer Zeilennummer markiert die Zeile, Weiterziehen auf die nächste nimmt sie dazu', () => {
  const nums = () => el.sheet.querySelectorAll('[data-fold]');
  assert.equal(nums().length, 2);
  ptr(nums()[0], 'pointerdown');
  mock.timers.tick(500);
  assert.deepEqual(L.range, { a: 0, b: 1 });
  under = [nums()[1]]; // das Blatt ist nach dem Halten neu gezeichnet
  ptr(el.sheet, 'pointermove', 0, 50);
  assert.deepEqual(L.range, { a: 0, b: 3 });
  ptr(el.sheet, 'pointerup');
});

test('Griffe: der Anfang und das Ende lassen sich ziehen, sie stoßen nicht aneinander', () => {
  act.setRange(1, 2);
  ptr(el.sheet.querySelector('.rgrip[data-handle="b"]'), 'pointerdown');
  under = [hit(3)];
  ptr(el.sheet, 'pointermove', 9, 9);
  assert.deepEqual(L.range, { a: 1, b: 3 });
  ptr(el.sheet, 'pointerup');
  ptr(el.sheet.querySelector('.rgrip[data-handle="a"]'), 'pointerdown');
  under = [hit(0)];
  ptr(el.sheet, 'pointermove', 20, 20);
  assert.deepEqual(L.range, { a: 0, b: 3 });
  under = [hit(3)];
  ptr(el.sheet, 'pointermove', 22, 22);
  assert.deepEqual(L.range, { a: 3, b: 3 });
  ptr(el.sheet, 'pointerup');
});

test('Im Tonnamen-Quiz und beim Üben lässt sich kein Bereich markieren', () => {
  L.quiz = { i: 0, done: new Set() };
  ptr(hit(1), 'pointerdown');
  mock.timers.tick(600);
  ptr(el.sheet, 'pointerup');
  assert.equal(L.range, null);
  L.quiz = null;
});

/* ---------- Ablaufplan ---------- */

test('Plan: ohne Bereich ab der Markierung, die Schleife wiederholt das ganze Stück', async () => {
  const { liedPlan } = await import('../app/js/lied/area.js');
  L.sel = 2;
  const p = liedPlan();
  assert.deepEqual(p.items.map((s) => s.pos), [2, 3]);
  assert.deepEqual(p.again.items.map((s) => s.pos), [0, 1, 2, 3]);
});

test('Plan: mit Bereich nur der Bereich, auch als Schleife; das Tempo bleibt das der Taktart', async () => {
  const { liedPlan } = await import('../app/js/lied/area.js');
  act.setRange(1, 2);
  const p = liedPlan();
  assert.deepEqual(p.items.map((s) => [s.t, s.pos]), [[0, 1], [1, 2]]);
  assert.equal(p.end, 2);
  assert.deepEqual(p.again.items, p.items, 'die Wiederholung ist derselbe Bereich');
  assert.equal(p.perBar, 4);
});

test('Plan: eine eingeklappte Zeile im Bereich wird übersprungen', async () => {
  const { liedPlan } = await import('../app/js/lied/area.js');
  L.song.ev[0].fd = 1; // Zeile 1 (Note 1 und 2) eingeklappt
  R.renderSheet();
  act.setRange(0, 3);
  assert.deepEqual(liedPlan().items.map((s) => s.pos), [2, 3]);
});
