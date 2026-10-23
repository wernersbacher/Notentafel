import { test, before, after, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, uninstallDom } from './helpers.mjs';

// Bereich auf der Tafel (Farbnoten und Rhythmus): Halten und Ziehen (input.js), Band und Griffe (board.js), Aufheben
// (state.js, edit.js, range.js) und der Ablaufplan (area.js). jsdom hat kein Layout: Was unter dem Finger liegt, bestimmt der
// Test mit elementFromPoint, die Zeiger kommen als MouseEvent mit pointerId.
let S, settings, useVariant, B, act, area, el, at = null;
before(async () => {
  installDom();
  await (await import('../app/js/core/tier.js')).loadPlan({ env: { backend: null, tier: 'pro' }, search: '' });
  ({ S, settings, useVariant } = await import('../app/js/tafel/state.js'));
  B = await import('../app/js/tafel/board.js');
  act = await import('../app/js/tafel/actions.js');
  area = await import('../app/js/tafel/area.js');
  ({ el } = await import('../app/js/tafel/dom.js'));
  (await import('../app/js/tafel/sidebar.js')).buildCounts();
  (await import('../app/js/tafel/input.js')).initBoardInput();
  document.elementFromPoint = () => at;
});
after(uninstallDom);

const row = (cells = [], x = {}) => Object.assign(cells, { line: false, meter: '' }, x);
const note = (id) => ({ n: id, h: '' });
const beat = (d = 1) => ({ k: 'b', d });

beforeEach(() => {
  mock.timers.enable({ apis: ['setTimeout'] });
  useVariant('mel');
  Object.assign(settings, { lens: true, autoBar: false, autoZ: false, syl: false });
  S.rows = [row([note('C'), note('D'), note('E')]), row([note('F'), note('G')]), row()];
  S.sel = { r: 1, c: 1 }; S.hist = []; S.redo = []; S.quiz = null; S.written = null; S.insertMode = false; S.cap = 0; S.range = null;
  at = null;
  B.renderBoard();
});
afterEach(() => mock.timers.reset());

const cell = (r, c) => B.cellEl(r, c);
const ptr = (target, type, x = 0, y = 0) => {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperty(e, 'pointerId', { value: 1 });
  target.dispatchEvent(e);
};
const marked = () => [...el.grid.querySelectorAll('.cell.rng')].map((c) => c.dataset.r + ',' + c.dataset.c);

test('Tafel: ein Bereich färbt seine Plätze, setzt Griffe an Anfang und Ende und ein ✕; die Markierung rückt an den Anfang', () => {
  act.setRange({ r: 0, c: 1 }, { r: 1, c: 0 });
  assert.deepEqual(S.range, { a: { r: 0, c: 1 }, b: { r: 1, c: 0 } });
  assert.deepEqual(S.sel, { r: 0, c: 1 });
  assert.deepEqual(marked(), ['0,1', '0,2', '1,0']);
  assert.ok(cell(0, 1).querySelector('.rhandle.a'));
  assert.ok(cell(1, 0).querySelector('.rhandle.b'));
  assert.ok(cell(1, 0).querySelector('[data-rclear]'));
  assert.equal(el.grid.querySelectorAll('.rhandle').length, 2);
});

test('setRange: leere Plätze am Zeilenende zählen nicht, die Reihenfolge der Enden ist egal', () => {
  act.setRange({ r: 1, c: 5 }, { r: 0, c: 0 });
  assert.deepEqual(S.range, { a: { r: 0, c: 0 }, b: { r: 1, c: 1 } });
  act.setRange({ r: 2, c: 0 }, { r: 2, c: 3 });
  assert.deepEqual(S.range.b, { r: 1, c: 1 }, 'eine leere Zeile lässt den Bereich unverändert');
});

test('setRows: ganze Zeilen, leere am Rand fallen weg', () => {
  act.setRows(2, 1);
  assert.deepEqual(S.range, { a: { r: 1, c: 0 }, b: { r: 1, c: 1 } });
  act.setRows(0, 2);
  assert.deepEqual(S.range, { a: { r: 0, c: 0 }, b: { r: 1, c: 1 } });
});

test('Ein Ton ändert sich im Bereich, der Bereich bleibt; Einfügen, Rückgängig, ein Tipp auf einen Platz und das ✕ heben ihn auf', () => {
  act.setRange({ r: 0, c: 1 }, { r: 0, c: 2 });
  act.placeNote('A'); // ersetzt den Platz an der Markierung: dieselbe Form der Tafel
  assert.equal(S.rows[0][1].n, 'A');
  assert.deepEqual(S.range, { a: { r: 0, c: 1 }, b: { r: 0, c: 2 } }, 'der Bereich bleibt');
  assert.deepEqual(marked(), ['0,1', '0,2']);
  S.insertMode = true;
  act.placeNote('A'); // ein neuer Platz verschiebt die übrigen
  assert.equal(S.range, null);
  S.insertMode = false;
  act.setRows(0, 0);
  act.undo();
  assert.equal(S.range, null);
  act.setRows(0, 0);
  act.tapCell(1, 0);
  assert.equal(S.range, null);
  act.setRows(0, 0);
  el.grid.querySelector('[data-rclear]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert.equal(S.range, null);
  assert.equal(el.grid.querySelectorAll('.cell.rng').length, 0);
});

test('Halten auf einem Platz markiert ihn, Weiterziehen vergrößert den Bereich', () => {
  ptr(cell(0, 1), 'pointerdown');
  mock.timers.tick(300);
  assert.equal(S.range, null, 'noch zu kurz gehalten');
  mock.timers.tick(200);
  assert.deepEqual(S.range, { a: { r: 0, c: 1 }, b: { r: 0, c: 1 } });
  at = cell(1, 1);
  ptr(el.grid, 'pointermove', 3, 3);
  assert.deepEqual(S.range, { a: { r: 0, c: 1 }, b: { r: 1, c: 1 } });
  ptr(el.grid, 'pointerup');
  assert.deepEqual(marked(), ['0,1', '0,2', '1,0', '1,1']);
});

test('Ein Tipp markiert nur den Platz; Ziehen eines Kreises macht keinen Bereich', () => {
  ptr(cell(0, 1), 'pointerdown');
  mock.timers.tick(100);
  ptr(el.grid, 'pointerup');
  assert.equal(S.range, null);
  assert.deepEqual(S.sel, { r: 0, c: 1 });
  ptr(cell(0, 0), 'pointerdown', 0, 0);
  at = cell(0, 2);
  ptr(el.grid, 'pointermove', 40, 0);
  mock.timers.tick(1000);
  assert.equal(S.range, null);
  ptr(el.grid, 'pointercancel');
});

test('Halten auf einer Zeilennummer markiert die Zeile, ein Tipp klappt sie ein', () => {
  const num = () => el.grid.querySelectorAll('.rnum[data-fold]');
  ptr(num()[0], 'pointerdown');
  mock.timers.tick(500);
  assert.deepEqual(S.range, { a: { r: 0, c: 0 }, b: { r: 0, c: 2 } });
  at = cell(1, 0);
  ptr(el.grid, 'pointermove', 0, 30);
  assert.deepEqual(S.range, { a: { r: 0, c: 0 }, b: { r: 1, c: 1 } });
  ptr(el.grid, 'pointerup');
  act.clearRange();
  ptr(num()[1], 'pointerdown');
  mock.timers.tick(100);
  ptr(el.grid, 'pointerup');
  num()[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert.equal(S.rows[1].fold, true);
});

test('Griffe: das gegriffene Ende folgt dem Finger, das andere bleibt, auch über Kreuz', () => {
  act.setRange({ r: 0, c: 1 }, { r: 0, c: 2 });
  ptr(cell(0, 2).querySelector('.rhandle.b'), 'pointerdown');
  at = cell(1, 1);
  ptr(el.grid, 'pointermove', 0, 30);
  assert.deepEqual(S.range, { a: { r: 0, c: 1 }, b: { r: 1, c: 1 } });
  at = cell(0, 0);
  ptr(el.grid, 'pointermove', 0, 60);
  assert.deepEqual(S.range, { a: { r: 0, c: 0 }, b: { r: 0, c: 1 } });
  ptr(el.grid, 'pointerup');
});

test('Im Spiel (Quiz, Üben) lässt sich kein Bereich markieren', () => {
  S.quiz = { pos: { r: 0, c: 0 }, done: new Set() };
  ptr(cell(0, 1), 'pointerdown');
  mock.timers.tick(600);
  ptr(el.grid, 'pointerup');
  assert.equal(S.range, null);
});

test('Plan: ohne Bereich ab der Markierung, die Schleife wiederholt die ganze Tafel', () => {
  const p = area.plan();
  assert.deepEqual(p.items.map((s) => s.pos), [{ r: 1, c: 1 }]);
  assert.equal(p.again.items.length, 5);
});

test('Plan: mit Bereich nur der Bereich; ein Rhythmus mit Pause behält sie als Stille', () => {
  act.setRange({ r: 0, c: 1 }, { r: 1, c: 0 });
  const p = area.plan();
  assert.deepEqual(p.items.map((s) => [s.pos.r, s.pos.c]), [[0, 1], [0, 2], [1, 0]]);
  assert.equal(p.items[0].t, 0);
  assert.equal(p.again.items.length, 3);
  useVariant('rhy');
  S.rows = [row([beat(1), { k: 'r', d: 1 }, beat(1)], { line: true })];
  S.sel = { r: 0, c: 0 };
  act.setRange({ r: 0, c: 0 }, { r: 0, c: 1 });
  const q = area.plan();
  assert.deepEqual(q.items.map((s) => s.sound), ['clave', '']);
  assert.equal(q.end, 2);
});
