import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, uninstallDom } from './helpers.mjs';

// Leiste im DOM: Akkordeon der Blöcke, „?“-Erklärungen und der Grund bei grauen Knöpfen (lock, explainLocked).
let settings, el, lock, explainLocked, side;
before(async () => {
  installDom();
  await (await import('../app/js/core/tier.js')).loadPlan({ env: { backend: null, tier: 'pro' }, search: '' });
  ({ settings } = await import('../app/js/core/settings.js'));
  ({ el } = await import('../app/js/core/dom.js'));
  ({ lock, explainLocked } = await import('../app/js/core/ui.js'));
  (await import('../app/js/core/parts.js')).initParts();
  (await import('../app/js/core/blocks.js')).initBlocks();
  side = document.querySelector('.side');
  explainLocked(side);
});
after(uninstallDom);

const block = (key) => document.querySelector('[data-block="' + key + '"]');
const head = (key) => block(key).querySelector('.bhead');
const isOpen = (key) => block(key).classList.contains('open');

test('Akkordeon: ein Block öffnet sich, die anderen desselben Bereichs klappen zu, andere Bereiche bleiben', () => {
  assert.equal(settings.accordion, true);
  assert.ok(isOpen('mel-notes') && isOpen('rhy-notes') && isOpen('lied-notes'));
  head('mel-setup').click();
  assert.ok(isOpen('mel-setup'));
  assert.ok(!isOpen('mel-notes'), 'der vorige Block ist zu');
  assert.ok(isOpen('rhy-notes'), 'ein anderer Bereich bleibt offen');
  assert.deepEqual(settings.open.filter((k) => k.startsWith('mel-')), ['mel-setup']);
  head('mel-setup').click(); // schließen: nichts anderes geht auf
  assert.ok(!isOpen('mel-setup') && !isOpen('mel-notes'));
});

test('Akkordeon aus: Blöcke klappen einzeln auf und zu', () => {
  settings.accordion = false;
  head('mel-notes').click();
  head('mel-setup').click();
  assert.ok(isOpen('mel-notes') && isOpen('mel-setup'));
  head('mel-notes').click();
  assert.ok(!isOpen('mel-notes') && isOpen('mel-setup'));
  settings.accordion = true;
});

test('„?“: zeigt und verbirgt den Erklärtext des Blocks', () => {
  const btn = block('rhy-notes').querySelector('.bhelp'), text = block('rhy-notes').querySelector('.bhelptext');
  assert.equal(text.hidden, true);
  btn.click();
  assert.equal(text.hidden, false);
  assert.equal(btn.getAttribute('aria-expanded'), 'true');
  btn.click();
  assert.equal(text.hidden, true);
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
});

test('lock: grauer Knopf mit Grund, frei ohne Grund', () => {
  lock(el.btnDel, 'Hier steht nichts.');
  assert.equal(el.btnDel.disabled, true);
  assert.equal(el.btnDel.dataset.why, 'Hier steht nichts.');
  lock(el.btnDel, false);
  assert.equal(el.btnDel.disabled, false);
  assert.ok(!('why' in el.btnDel.dataset));
});

test('explainLocked: ein Tipp auf die Stelle eines grauen Knopfs blendet seinen Grund ein, daneben nichts', () => {
  lock(el.btnUndo, 'Es gibt noch nichts zurückzunehmen.');
  el.btnUndo.getBoundingClientRect = () => ({ left: 10, right: 60, top: 10, bottom: 60, width: 50, height: 50 });
  el.toast.hidden = true;
  const tap = (x, y) => side.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
  tap(200, 200);
  assert.equal(el.toast.hidden, true, 'außerhalb des Knopfs bleibt es still');
  tap(30, 30);
  assert.equal(el.toast.hidden, false);
  assert.equal(el.toast.textContent, 'Es gibt noch nichts zurückzunehmen.');
  lock(el.btnUndo, false);
  el.toast.hidden = true;
  tap(30, 30);
  assert.equal(el.toast.hidden, true, 'ohne Grund kein Hinweis');
});
