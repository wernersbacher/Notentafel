import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, uninstallDom } from './helpers.mjs';

// Startbildschirm (start.js): drei Bereiche mit sechs Kacheln, ein Tipp wählt Bereich und Hälfte.
let initStart, showStart, settings, el;
const areas = [
  { id: 'rhy', label: 'Rhythmus', write: 'Rhythmus schreiben', play: {} },
  { id: 'mel', label: 'Farbnoten', write: 'Melodie schreiben', play: {} },
  { id: 'lied', label: 'Notenblatt', write: 'Lied schreiben', play: {} }
];
before(async () => {
  installDom();
  ({ settings } = await import('../app/js/core/settings.js'));
  ({ initStart, showStart } = await import('../app/js/core/start.js'));
  ({ el } = await import('../app/js/core/dom.js'));
});
after(uninstallDom);

test('Start: drei Bereiche mit zusammen sechs Kacheln, die Spiele stehen auf „Üben und Spielen“', () => {
  showStart(areas);
  assert.equal(el.start.hidden, false);
  assert.equal(el.start.querySelectorAll('.sarea').length, 3);
  assert.equal(el.start.querySelectorAll('.stile').length, 6);
  const play = el.start.querySelector('.stile[data-area="rhy"][data-part="play"] .stext').textContent;
  assert.match(play, /Rhythmus-Echo/);
});

test('Start: ein Tipp wählt Bereich und Hälfte und blendet den Start aus', () => {
  const calls = [];
  initStart(areas, (id) => calls.push(['area', id]), (play) => calls.push(['play', play]));
  el.start.querySelector('.stile[data-area="mel"][data-part="play"]').click();
  assert.deepEqual(calls, [['area', 'mel'], ['play', true]]);
  assert.equal(el.start.hidden, true);
  showStart(areas);
  el.start.querySelector('.stile[data-area="lied"][data-part="write"]').click();
  assert.deepEqual(calls.slice(2), [['area', 'lied'], ['play', false]]);
});

test('Start: der Titel oben links öffnet ihn wieder, die letzte Wahl trägt „zuletzt“', () => {
  settings.mode = 'rhy';
  settings.play = { rhy: true };
  el.btnStart.click();
  assert.equal(el.start.hidden, false);
  const last = el.start.querySelectorAll('.slast');
  assert.equal(last.length, 1);
  assert.equal(last[0].parentElement.dataset.area + last[0].parentElement.dataset.part, 'rhyplay');
});
