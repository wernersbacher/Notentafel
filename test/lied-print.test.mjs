import { test } from 'node:test';
import assert from 'node:assert/strict';
import { printHTML, PAGE_MM } from '../app/js/lied/print.js';
import { layout } from '../app/js/lied/layout.js';
import { songOf } from '../app/js/lied/songs.js';
import { SONGS } from './helpers.mjs';

const geb = songOf(SONGS.find((s) => s.pickup)).song;
const svgs = (html) => [...html.matchAll(/<svg [^>]*style="width:([\d.]+)mm"/g)].map((m) => +m[1]);

test('Druck: Titel (escaped), ein SVG pro System, ohne Markierung und leeren Platz', () => {
  const html = printHTML(geb, { name: 'A & B' });
  assert.match(html, /^<h1>A &amp; B<\/h1>/);
  assert.equal(svgs(html).length, 2);
  assert.doesNotMatch(html, /class="(cur|caret|ghost|bad)"/);
  assert.doesNotMatch(printHTML(geb), /<h1>/);
});

test('Druck: so breit wie die Seite, nur breiter, wenn ohne Umbruch eine Zeile nicht passt', () => {
  svgs(printHTML(geb)).forEach((w) => assert.ok(Math.abs(w - PAGE_MM) < 0.5, w));
  const long = { meter: '4/4', pickup: 0, ev: Array.from({ length: 64 }, () => ({ p: 'c1', v: 4 })) };
  assert.ok(svgs(printHTML(long, { wrap: false }))[0] > PAGE_MM);
  assert.ok(svgs(printHTML(long, { wrap: true })).length > 1);
});

test('Druck: Notennamen und Zählzeiten nur, wenn eingeschaltet', () => {
  assert.doesNotMatch(printHTML(geb), /class="(nm|cnt)/);
  assert.match(printHTML(geb, { names: true, counts: true }), /class="nm".*class="cnt/);
});

test('layout justify: alle Zeilen außer der letzten reichen bis zur Breite', () => {
  const lay = layout(geb, { autoBar: true, justify: 100, ghost: false });
  const [a, b] = lay.systems;
  assert.ok(Math.abs(a.width - 100) < 0.01, a.width);
  assert.ok(b.width < 100);
  assert.ok(!b.ghost);
});

test('Druck: Wasserzeichen nur, wenn angegeben (Lite), escaped und ohne Einfluss auf die Systeme', () => {
  assert.doesNotMatch(printHTML(geb), /class="wm"/);
  const html = printHTML(geb, { name: 'X', watermark: 'Musiktafel <Lite>' });
  assert.match(html, /^<div class="wm" aria-hidden="true">Musiktafel &lt;Lite&gt;<\/div><h1>X<\/h1>/);
  assert.equal(svgs(html).length, svgs(printHTML(geb, { name: 'X' })).length);
});
