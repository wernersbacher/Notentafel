import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, uninstallDom } from './helpers.mjs';

// MusicXML-Knopf: ohne Pro gesperrt mit „Mit Pro“, mit Pro frei (area.js, renderExportLock)
let A, el, loadPlan;
before(async () => {
  installDom();
  ({ loadPlan } = await import('../app/js/core/tier.js'));
  ({ el } = await import('../app/js/lied/dom.js'));
  A = await import('../app/js/lied/area.js');
});
after(uninstallDom);

const tier = (t) => loadPlan({ env: { backend: null, tier: t }, search: '' });

test('Export-Knopf: ohne Pro gesperrt und mit sichtbarem Hinweis', async () => {
  await tier('guest');
  A.renderExportLock();
  assert.equal(el.btnLiedExport.getAttribute('aria-disabled'), 'true');
  assert.equal(el.btnLiedExport.querySelectorAll('.pro-tag').length, 1);
  assert.equal(el.btnLiedExport.querySelector('.pro-tag').textContent, 'Mit Pro');
  A.renderExportLock(); // doppelt aufgerufen: kein zweiter Hinweis
  assert.equal(el.btnLiedExport.querySelectorAll('.pro-tag').length, 1);
});

test('Export-Knopf: mit Pro frei, Hinweis weg', async () => {
  await tier('pro');
  A.renderExportLock();
  assert.equal(el.btnLiedExport.hasAttribute('aria-disabled'), false);
  assert.equal(el.btnLiedExport.querySelector('.pro-tag'), null);
  assert.equal(el.btnLiedExport.classList.contains('locked'), false);
});
