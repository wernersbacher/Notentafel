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

test('Spiele: die Einstellungen stehen zugeklappt hinter „Einstellungen“ unter dem Startknopf und bleiben gemerkt (auf der Tafel, nicht in der Leiste)', async () => {
  await import('../app/js/tafel/dom.js'); // fügt Hinweis und Startknopf der Spiele ein
  await import('../app/js/lied/dom.js');
  (await import('../app/js/core/game.js')).initGamePicks();
  const plays = [...document.querySelectorAll('#gameIntro .gslot > .play')];
  assert.equal(plays.length, 3);
  assert.equal(document.querySelectorAll('.side .play').length, 0, 'in der Leiste bleibt nichts von den Spielen');
  for (const play of plays) {
    assert.ok(!play.classList.contains('opts-open'), 'am Anfang zu');
    for (const sec of play.querySelectorAll(':scope > .game')) {
      const go = sec.querySelector(':scope > .gamego');
      assert.ok(go.nextElementSibling.classList.contains('gopt'), sec.dataset.game + ': der Knopf folgt dem Startknopf');
    }
  }
  const rhy = document.getElementById('rhyPlay');
  assert.ok(document.getElementById('echoMeter').closest('.gopts'), 'die Einstellungen für alle Spiele liegen im zuklappbaren Teil');
  assert.ok(document.getElementById('whichCount').closest('.gopts'), 'ebenso die des einzelnen Spiels');
  const btn = rhy.querySelector('.gopt');
  btn.click();
  assert.ok(rhy.classList.contains('opts-open'));
  assert.equal(btn.getAttribute('aria-expanded'), 'true');
  assert.ok(settings.open.includes('rhy-play-opts'));
  btn.click();
  assert.ok(!rhy.classList.contains('opts-open'));
  assert.ok(!settings.open.includes('rhy-play-opts'));
});

test('Spielwahl: beim Üben zuerst die Galerie auf der Tafel, ein Tipp öffnet die Karte des Spiels, „Alle Spiele“ führt zurück', async () => {
  const { shellState } = await import('../app/js/core/shell-state.js');
  shellState.area = { id: 'rhy', play: { clear() {} }, enter() {} };
  settings.play.rhy = true;
  side.dataset.area = 'rhy';
  const intro = document.getElementById('gameIntro');
  const gallery = intro.querySelector('.gallery'), card = intro.querySelector('.gcard');
  // der Bereichswechsel (onShow) setzt die Ansicht auf die Galerie; hier über die Wahl im Hintergrund angestoßen
  document.querySelector('.gamepick[data-area="rhy"] [data-game="which"]').click();
  assert.equal(intro.hidden, false);
  assert.equal(card.hidden, false);
  assert.equal(card.querySelector('.gintro h2').textContent, "Welcher war's?");
  assert.equal(document.getElementById('rhyPlay').hidden, false, 'der Abschnitt des offenen Bereichs');
  assert.equal(document.getElementById('melPlay').hidden, true);
  card.querySelector('[data-act="back"]').click();
  assert.equal(gallery.hidden, false);
  assert.equal(card.hidden, true);
  const tiles = [...gallery.querySelectorAll('.gcardtile')];
  assert.deepEqual(tiles.map((t) => t.dataset.game), ['echo', 'which', 'read', 'build', 'fix']);
  assert.ok(tiles.every((t) => t.querySelector('.gdesc').textContent.length > 10), 'jede Kachel erklärt ihr Spiel');
  tiles[0].click();
  assert.equal(card.hidden, false);
  assert.equal(card.querySelector('.gintro h2').textContent, 'Rhythmus-Echo');
  assert.equal(document.querySelector('.gamepick[data-area="rhy"] [data-game="echo"]').getAttribute('aria-pressed'), 'true');
  delete settings.play.rhy;
  shellState.area = null;
});

test('Umwandeln: das Feld klappt auf und schließt sich nach einem Tipp auf eine Umwandlung', async () => {
  (await import('../app/js/core/convert.js')).initConvert();
  assert.equal(el.convertPop.hidden, true);
  el.btnConvert.click();
  assert.equal(el.convertPop.hidden, false);
  assert.equal(el.btnConvert.getAttribute('aria-expanded'), 'true');
  document.getElementById('btnToLiedSide').click();
  assert.equal(el.convertPop.hidden, true);
  assert.equal(el.btnConvert.getAttribute('aria-expanded'), 'false');
});

test('Notenblatt: die Anzeige-Schalter stehen als eigene Reihe über den Blöcken, nicht im Block „Takt & Tonart“', () => {
  const row = document.querySelector('#panelLied > .showrow');
  assert.ok(row, 'Reihe Anzeige im Panel');
  for (const id of ['liedShowNames', 'liedShowColors', 'liedShowCounts', 'liedShowLyrics']) {
    const b = document.getElementById(id);
    assert.ok(row.contains(b), id + ' gehört in die Reihe');
    assert.ok(!block('lied-setup').contains(b), id + ' nicht mehr im Block „Takt & Tonart“');
  }
  assert.ok(row.compareDocumentPosition(block('lied-setup')) & Node.DOCUMENT_POSITION_FOLLOWING, 'die Reihe steht vor den Blöcken');
});
