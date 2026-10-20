import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shownAccidentals, badMeasures } from '../js/lied/model.js';
import { layout } from '../js/lied/layout.js';
import { sheetSVG } from '../js/lied/sheet.js';

const n = (p, v = 4, x = {}) => ({ p, v, ...x });
const r = (v = 4, x = {}) => ({ v, ...x });
const song = (ev, meter = '4/4', pickup = 0) => ({ meter, pickup, ev });
const shown = (ev, autoBar = false, meter = '4/4') => shownAccidentals(song(ev, meter), autoBar);

/* ---------- Vorzeichen ---------- */
test('Vorzeichen: im Takt nicht wiederholt, ohne Vorzeichen danach ein ♮', () => {
  assert.deepEqual(shown([n('f1', 4, { acc: 1 }), n('f1', 4, { acc: 1 }), n('f1'), n('f1')]), [1, null, 0, null]);
  assert.deepEqual(shown([n('h1', 4, { acc: -1 }), r(), n('h1', 4, { acc: 1 })]), [-1, null, 1]);
  // Ohne Vorzeichen bleibt ohne
  assert.deepEqual(shown([n('c1'), n('c1')]), [null, null]);
});

test('Vorzeichen: nach einem automatischen Taktstrich beginnt alles neu', () => {
  const ev = [n('f1', 2, { acc: 1 }), n('f1', 2, { acc: 1 }), n('f1', 2, { acc: 1 }), n('f1', 2)];
  assert.deepEqual(shown(ev, true), [1, null, 1, 0]);
  // Ohne automatische Striche läuft der Takt weiter
  assert.deepEqual(shown(ev, false), [1, null, null, 0]);
});

test('Vorzeichen: nach einem Takt- oder Schlussstrich von Hand beginnt alles neu', () => {
  assert.deepEqual(shown([n('f1', 4, { acc: 1, bar: 1 }), n('f1', 4, { acc: 1 }), n('f1', 4, { bar: 2 }), n('f1')]), [1, 1, 0, null]);
  // Von Hand gesetzte Taktstriche sind mit Automatik ausgeblendet und zählen dann auch nicht
  assert.deepEqual(shown([n('f1', 4, { acc: 1, bar: 1 }), n('f1', 4, { acc: 1 })], true), [1, null]);
});

test('Vorzeichen: eine andere Oktave ist unabhängig', () => {
  assert.deepEqual(shown([n('f1', 4, { acc: 1 }), n('f2'), n('f2', 4, { acc: 1 }), n('f1', 4, { acc: 1 })]), [1, null, 1, null]);
});

test('Vorzeichen: hinter einem Haltebogen keins, auch über den Taktstrich', () => {
  assert.deepEqual(shown([n('f1', 4, { acc: 1, tie: 1 }), n('f1', 4, { acc: 1 }), n('f1')]), [1, null, 0]);
  const ev = [n('c1', 2), n('f1', 2, { acc: 1, tie: 1 }), n('f1', 4, { acc: 1 }), n('f1', 4, { acc: 1 })];
  // Die gehaltene Note zeigt nichts und ändert nichts: die nächste braucht das ♯ wieder
  assert.deepEqual(shown(ev, true), [null, 1, null, 1]);
});

test('Vorzeichen: ein ausdrückliches ♮ steht immer da', () => {
  assert.deepEqual(shown([n('f1', 4, { acc: 0 }), n('f1', 4, { acc: 0 }), n('f1')]), [0, 0, null]);
  assert.deepEqual(shown([n('h1', 4, { acc: -1 }), n('h1', 4, { acc: 0 }), n('h1')]), [-1, 0, null]);
});

test('Vorzeichen: ein Zeilenumbruch ohne Strich setzt nichts zurück', () => {
  assert.deepEqual(shown([n('f1', 4, { acc: 1, brk: 1 }), n('f1', 4, { acc: 1 }), n('f1')]), [1, null, 0]);
});

/* ---------- Takt-Prüfung ---------- */
test('Takt-Prüfung: volle Takte sind in Ordnung', () => {
  assert.deepEqual(badMeasures(song([n('c1', 1), n('d1', 2), n('e1'), n('f1'), n('g1')]), true), []);
  assert.deepEqual(badMeasures(song([n('c1', 4, { dot: 1 }), n('d1', 8), n('e1', 2, { bar: 1 }), n('f1')]), false), []);
});

test('Takt-Prüfung: zu kurzer Takt mit einem Strich von Hand', () => {
  const s = song([n('c1'), n('d1', 4, { bar: 1 }), n('e1', 1, { bar: 1 }), n('f1')]);
  assert.deepEqual(badMeasures(s, false), [{ first: 0, last: 1, ticks: 16, want: 32 }]);
});

test('Takt-Prüfung: eine Note über die Grenze macht den Takt zu lang, danach wird neu gezählt', () => {
  // 16 + 24 = 40: die punktierte Halbe ragt über die Grenze, der Strich kommt hinter sie
  const s = song([n('c1', 2), n('d1', 2, { dot: 1 }), n('e1'), n('f1', 2), n('g1'), n('a1', 1)]);
  assert.deepEqual(badMeasures(s, true), [{ first: 0, last: 1, ticks: 40, want: 32 }]);
});

test('Takt-Prüfung: Auftakt richtig und falsch', () => {
  assert.deepEqual(badMeasures(song([n('g0'), n('c1', 2, { dot: 1 }), n('d1')], '3/4', 8), true), []);
  assert.deepEqual(badMeasures(song([n('g0', 4, { bar: 1 }), n('c1', 2, { dot: 1, bar: 1 }), n('d1')], '3/4', 8), false), []);
  const wrong = song([n('g0', 2, { bar: 1 }), n('c1', 2, { dot: 1, bar: 1 }), n('d1')], '3/4', 8);
  assert.deepEqual(badMeasures(wrong, false), [{ first: 0, last: 0, ticks: 16, want: 8 }]);
});

test('Takt-Prüfung: der Schlusstakt wird nicht geprüft', () => {
  // Strich hinter dem letzten Ereignis
  assert.deepEqual(badMeasures(song([n('c1', 1), n('d1', 2, { bar: 2 })]), true), []);
  assert.deepEqual(badMeasures(song([n('c1', 1, { bar: 1 }), n('d1', 4, { bar: 1 })]), false), []);
  // Alles nach dem letzten Strich
  assert.deepEqual(badMeasures(song([n('c1', 1), n('d1')]), true), []);
  // Ohne Striche gibt es nur einen Abschnitt, den letzten
  assert.deepEqual(badMeasures(song([n('c1', 2, { dot: 1 }), n('d1', 2)]), true), []);
});

test('Takt-Prüfung: ohne Taktart nichts', () => {
  assert.deepEqual(badMeasures(song([n('c1', 4, { bar: 1 }), n('d1', 4, { bar: 1 }), n('e1')], ''), false), []);
});

/* ---------- Layout und Zeichnen ---------- */
test('Layout: Platz und Zeichen nur für gezeichnete Vorzeichen', () => {
  const { at } = layout(song([n('f1', 4, { acc: 1 }), n('f1', 4, { acc: 1 }), n('f1'), n('g1', 4, { acc: 0 })]));
  assert.ok(at[0].accX != null && at[0].acc === 1);
  assert.equal(at[1].accX, undefined);
  assert.equal(at[1].acc, undefined);
  assert.ok(at[2].accX != null && at[2].acc === 0);
  assert.ok(at[3].accX != null && at[3].acc === 0);
  // Die Spalte ohne Vorzeichen ist schmaler
  assert.ok(at[1].r - at[1].l < at[0].r - at[0].l);
});

test('Layout: Takt-Prüfung nur mit check, über einen Umbruch in zwei Stücken', () => {
  // Halbe + Viertel, Umbruch, dann eine Halbe über die Grenze: der zu volle Takt liegt in beiden Systemen
  const ev = [n('c1', 2), n('d1', 4, { brk: 1 }), n('e1', 2), n('f1'), n('g1')];
  assert.deepEqual(layout(song(ev), { autoBar: true }).systems.map((s) => s.bad), [[], []]);
  const { systems, at } = layout(song(ev), { autoBar: true, check: true });
  assert.deepEqual(systems[0].bad, [{ x1: at[0].l, x2: at[1].r }]);
  // Im zweiten System endet das Stück kurz vor dem Taktstrich
  const bar = systems[1].bars[0].x;
  assert.equal(systems[1].bad.length, 1);
  assert.equal(systems[1].bad[0].x1, at[2].l);
  assert.ok(systems[1].bad[0].x2 < bar && systems[1].bad[0].x2 > at[2].x);
});

test('Zeichnen: Rechteck der Klasse bad vor den Notenlinien', () => {
  const s = song([n('c1'), n('d1', 4, { bar: 1 }), n('e1', 1, { bar: 1 }), n('f1')]);
  const { svg } = sheetSVG(s, layout(s, { check: true }), { width: 40, clean: true });
  const i = svg.indexOf('class="bad"');
  assert.ok(i > 0 && svg.indexOf('rx="0.6"', i) > 0);
  assert.equal(svg.split('class="bad"').length, 2);
  // Vor allen Linien und Köpfen, also hinter den Noten
  assert.ok(!svg.slice(0, i).includes('<line') && !svg.slice(0, i).includes('<path'));
  assert.match(svg.slice(i - 12, i + 80), /y="-0\.6".*height="5\.2"/);
});

test('Zeichnen: Zeilennummern, eine eingeklappte Zeile zeigt nur ihre Nummer', () => {
  const s = song([n('c1'), n('d1', 4, { brk: 1 }), n('e1', 4, { fd: 1 }), n('f1')]);
  const { svg } = sheetSVG(s, layout(s), { width: 40, clean: true, nums: true });
  assert.match(svg, /class="lnum"[^>]*>1</);
  assert.match(svg, /data-fold="0,2"/);
  // Zeile 2: nur Knopf mit Pfeil, keine Zeichen, aber ihre Tippflächen bleiben (für das Tuch)
  assert.match(svg, />2 ▸</);
  assert.match(svg, /aria-label="Zeile 2 eingeklappt/);
  assert.ok(!svg.includes('class="ev" data-i="2"') && !svg.includes('class="ev" data-i="3"'));
  assert.ok(svg.includes('class="hit" ') && svg.includes('data-i="3"'));
  // Ohne nums (Druck): keine Nummern, nichts eingeklappt
  const plain = sheetSVG(s, layout(s), { width: 40, clean: true }).svg;
  assert.ok(!plain.includes('lnum') && plain.includes('class="ev" data-i="2"'));
});

test('mit Schlussstrich enden die Notenlinien dort; erst am leeren Platz dahinter laufen sie bis zum Rand', () => {
  const s = { meter: '2/4', ev: [{ p: 'c1', v: 4 }, { p: 'd1', v: 4 }] };
  const lay = layout(s, { autoBar: true }), sys = lay.systems[0], fin = sys.bars[sys.bars.length - 1];
  assert.equal(fin.k, 2);
  const ends = (o) => [...sheetSVG(s, lay, { width: 40, ...o }).svg.matchAll(/<line x1="0" y1="0" x2="([\d.]+)"/g)].map((m) => +m[1]);
  assert.ok(Math.abs(ends({ sel: 0 })[0] - fin.x) < 0.1, 'endet am Schlussstrich');
  assert.ok(!sheetSVG(s, lay, { width: 40, sel: 0 }).svg.includes('class="ghost"'));
  assert.equal(ends({ sel: 2 })[0], 40, 'beim Weiterschreiben bis zum Rand');
  assert.ok(Math.abs(ends({ sel: 2, clean: true })[0] - fin.x) < 0.1, 'nach „fertig“ wieder am Schlussstrich');
});
