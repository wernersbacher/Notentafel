import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, uninstallDom, song, n, r } from './helpers.mjs';

// Lite-Grenzen (Bead notentafel-8yi.3): Länge der Tafel und des Notenblatts, Liedgrenze, offene Spiele, Quiz-Runde.
// Die Module lesen ihre Elemente aus index.html, deshalb erst das DOM, dann import().
let storage, tier, CONFIG, M, ST, T, L, G, Q, ui, el;
const as = (t) => tier.loadPlan({ env: { backend: null, tier: t }, search: '' });

before(async () => {
  ({ storage } = installDom());
  tier = await import('../app/js/core/tier.js');
  CONFIG = await import('../app/js/tafel/config.js');
  M = await import('../app/js/lied/measures.js');
  ST = await import('../app/js/core/store.js');
  T = await import('../app/js/tafel/storage.js');
  L = await import('../app/js/lied/storage.js');
  ({ el } = await import('../app/js/core/dom.js'));
  ui = await import('../app/js/core/ui.js');
  G = await import('../app/js/core/game.js');
  Q = await import('../app/js/core/quiz.js');
});
after(uninstallDom);
beforeEach(async () => { storage.clear(); await as('guest'); });

/* ---------- Tafel: Zeilen aus Takten ---------- */
test('rowsFor: Takte werden über MAX_PER_ROW zu Zeilen, null und große Werte gelten als MAX_ROWS', () => {
  assert.equal(CONFIG.rowsFor(8), 3); // 8 Takte à 4 Schläge = 32 Schläge, 10 pro Zeile
  assert.equal(CONFIG.rowsFor(1), 1); // mindestens eine Zeile
  assert.equal(CONFIG.rowsFor(null), CONFIG.MAX_ROWS);
  assert.equal(CONFIG.rowsFor(1000), CONFIG.MAX_ROWS);
});

test('maxRows folgt der Stufe: Lite 3 Zeilen, Pro MAX_ROWS', async () => {
  assert.equal(CONFIG.maxRows(), 3);
  assert.match(CONFIG.fullText(), /3 Zeilen.*8 Takte/);
  await as('pro');
  assert.equal(CONFIG.maxRows(), CONFIG.MAX_ROWS);
  assert.doesNotMatch(CONFIG.fullText(), /Lite/);
});

test('Tafel: reflow stoppt bei maxRows(), geladene Stände bleiben ganz', async () => {
  const MODEL = await import('../app/js/tafel/model.js');
  const mk = () => {
    const rows = Array.from({ length: 3 }, () => Object.assign([], { line: false, meter: '' }));
    rows[2].push(...Array.from({ length: 12 }, () => ({ n: 'C', h: '', q: 1 })));
    return rows;
  };
  const lite = mk();
  assert.equal(MODEL.reflow(lite, 2, 10), false, 'Lite: unter der dritten Zeile gibt es keine vierte');
  assert.equal(lite.length, 3);
  await as('pro');
  const pro = mk();
  assert.equal(MODEL.reflow(pro, 2, 10), true);
  assert.equal(pro.length, 4);
  // Ein Stand mit 8 Zeilen lässt sich auch unter Lite laden
  await as('guest');
  const { cleanRows } = await import('../app/js/tafel/clean.js');
  assert.equal(cleanRows(Array.from({ length: 8 }, () => [{ n: 'C' }])).length, 8);
});

/* ---------- Notenblatt: Takte zählen ---------- */
test('measureCount: angefangene Takte zählen, Auftakt nicht, ohne Taktart gilt 4/4', () => {
  assert.equal(M.measureCount(song([])), 0);
  assert.equal(M.measureCount(song([n('c1', 4)])), 1);
  assert.equal(M.measureCount(song([n('c1', 1), n('c1', 4)])), 2);
  const acht = Array.from({ length: 8 }, () => n('c1', 1)); // 8 ganze Noten = 8 Takte
  assert.equal(M.measureCount(song(acht)), 8);
  assert.equal(M.measureCount(song([...acht, r(16)])), 9);
  assert.equal(M.measureCount(song(acht, '')), 8, 'ohne Taktart wie 4/4');
  // Auftakt (eine Viertel) und dann zwei volle Takte: der Auftakt ist kein Takt
  assert.equal(M.measureCount(song([n('c1', 4), n('c1', 1), n('c1', 1)], '4/4', 8)), 2);
  assert.equal(M.measureCount(song([n('c1', 4)], '4/4', 8)), 0);
  assert.equal(M.measureCount(song([n('c1', 2), n('c1', 4), n('c1', 2), n('c1', 4)], '3/4')), 2);
  // eine Halbe, die über den Taktstrich ragt, beginnt den nächsten Takt
  assert.equal(M.measureCount(song([n('c1', 2), n('c1', 2), n('c1', 4)], '3/4')), 3);
});

test('measuresFull: erst wenn die Grenze erreicht und der letzte Takt voll ist', () => {
  const acht = Array.from({ length: 8 }, () => n('c1', 1));
  assert.equal(M.measuresFull(song(acht), 8), true);
  assert.equal(M.measuresFull(song([...acht.slice(1), n('c1', 4)]), 8), false, 'achter Takt nicht voll');
  assert.equal(M.measuresFull(song(acht), 9), false);
  assert.equal(M.measuresFull(song(acht), null), false);
});

test('Notenblatt: place() nimmt einen Ton zurück, der einen neunten Takt anfinge', async () => {
  const E = await import('../app/js/lied/edit.js');
  const { L: st } = await import('../app/js/lied/state.js');
  const SB = await import('../app/js/lied/sidebar.js');
  SB.buildPanel();
  SB.buildSteps();
  st.song = song(Array.from({ length: 8 }, () => n('c1', 1)));
  st.sel = 8;
  st.hist = [];
  E.placePitch('d1');
  assert.equal(st.song.ev.length, 8, 'Lite: abgelehnt');
  assert.equal(st.hist.length, 0, 'und nicht im Verlauf');
  assert.match(el.toast.textContent, /Lite: höchstens 8 Takte/);
  // Ein Stand, der schon darüber liegt, bleibt; nur kein weiterer Takt
  st.song = song(Array.from({ length: 10 }, () => n('c1', 1)));
  st.sel = 3;
  E.placePitch('d1'); // ersetzt einen Ton, kein neuer Takt
  assert.equal(st.song.ev[3].p, 'd1');
  await as('pro');
  st.song = song(Array.from({ length: 8 }, () => n('c1', 1)));
  st.sel = 8;
  E.placePitch('d1');
  assert.equal(st.song.ev.length, 9);
});

/* ---------- Lieder ---------- */
const tune = (...ids) => { const x = ids.map((id) => ({ n: id, h: '' })); x.line = false; x.meter = ''; return x; };

test('songTotal zählt alle Bereiche; songRoom rechnet die Grenze ab', () => {
  assert.equal(ST.songRoom(null), Infinity);
  T.stores.mel.saveSong([tune('C')], 'A');
  L.store.saveSong(song([n('c1')]), 'B');
  assert.equal(ST.songTotal(), 2);
  assert.equal(ST.songRoom(3), 1);
  assert.equal(ST.songRoom(2), 0);
  assert.equal(ST.songRoom(1), 0, 'Bestand über der Grenze bleibt, es kommt nichts dazu');
  assert.equal(T.stores.mel.songExists('a'), true, 'gleicher Name (ohne Groß/klein) ersetzt und zählt nicht neu');
});

test('importAll nimmt nur so viele neue Lieder, wie hineinpassen', () => {
  T.stores.mel.saveSong([tune('C')], 'A');
  L.store.saveSong(song([n('c1')]), 'B');
  const file = JSON.parse(JSON.stringify(ST.exportAll()));
  storage.clear();
  T.stores.rhy.saveSong([tune('x')], 'Schon da');
  const info = {};
  assert.equal(ST.importAll(file, 1, info), 1);
  assert.equal(info.skipped, 1);
  assert.equal(ST.songTotal(), 2);
  // Ohne Grenze kommt alles
  storage.clear();
  assert.equal(ST.importAll(file, null, info), 2);
  assert.equal(info.skipped, 0);
  // Vorhandene Lieder zählen bei room 0 nicht als neu
  assert.equal(ST.importAll(file, 0, info), 0);
  assert.equal(info.skipped, 0);
  // Bestand: nichts dazu, beide übersprungen
  storage.clear();
  T.stores.mel.saveSong([tune('C')], 'X');
  assert.equal(ST.importAll(file, 0, info), 0);
  assert.equal(info.skipped, 2);
  assert.equal(ST.songTotal(), 1);
});

test('limitText: Lite nennt die Zahl aus dem Plan, Pro die Liedgrenze ohne „Lite“', async () => {
  assert.equal(tier.limitText('songs'), 'Lite: höchstens 3 Lieder – mit Pro mehr.');
  assert.match(tier.limitText('quizQuestions'), /5 Fragen/);
  await as('pro');
  assert.equal(tier.limitText('songs'), 'Es passen höchstens 50 Lieder.');
});

/* ---------- Spiele ---------- */
test('openGames: die ersten N Kacheln sind offen, Ausnahmen zählen nicht, null öffnet alle', () => {
  const ids = ['quiz', 'melo', 'updown', 'guess'];
  assert.deepEqual([...tier.openGames(ids, 2, ['guess'])], ['quiz', 'melo', 'guess']);
  assert.deepEqual([...tier.openGames(['echo', 'which', 'read', 'build', 'fix'], 2)], ['echo', 'which']);
  assert.equal(tier.openGames(ids, null).size, 4);
  assert.equal(tier.openGames(ids, 0).size, 0);
});

const pick = (area) => document.querySelector('.gamepick[data-area="' + area + '"]');
const tile = (area, g) => pick(area).querySelector('[data-game="' + g + '"]');

test('Spielauswahl: gesperrte Kacheln wählen nichts und zeigen den Pro-Hinweis; Lied erraten nur mit Pro', async () => {
  const { settings } = await import('../app/js/core/settings.js');
  settings.game.mel = 'updown';
  settings.game.rhy = 'echo';
  G.initGamePicks();
  assert.equal(tile('mel', 'quiz').hasAttribute('aria-disabled'), false);
  assert.equal(tile('mel', 'melo').hasAttribute('aria-disabled'), false);
  assert.equal(tile('mel', 'updown').getAttribute('aria-disabled'), 'true');
  assert.equal(tile('mel', 'guess').getAttribute('aria-disabled'), 'true', 'Lied erraten braucht die bekannten Lieder (Pro), zählt aber nicht zu den offenen Spielen');
  assert.equal(pick('mel').closest('.play').dataset.game, 'quiz', 'die gemerkte, gesperrte Wahl fällt auf die erste offene zurück');
  assert.equal(tile('rhy', 'build').getAttribute('aria-disabled'), 'true');
  tile('mel', 'updown').click();
  assert.equal(settings.game.mel, 'updown', 'Wahl unverändert');
  assert.equal(pick('mel').closest('.play').dataset.game, 'quiz');
  assert.match(el.toast.textContent, /Pro/);
  tile('mel', 'melo').click();
  assert.equal(pick('mel').closest('.play').dataset.game, 'melo');
  // Pro: alles offen (onTier zeichnet neu)
  await as('pro');
  assert.equal(tile('mel', 'updown').hasAttribute('aria-disabled'), false);
  assert.equal(tile('mel', 'guess').hasAttribute('aria-disabled'), false);
  assert.equal(tile('rhy', 'build').hasAttribute('aria-disabled'), false);
  assert.equal(pick('mel').closest('.play').dataset.game, 'melo');
});

/* ---------- Quiz ---------- */
function fakeQuiz() {
  return { layout: 'row', sound: 'bell', keys: [{ key: 'a', html: 'a', label: 'a' }], next: () => ({ ok: new Set(['a']), f: 440 }), solved() {}, stop() {}, hear() {} };
}
// Beantwortet Fragen und tippt „Weiter“, bis die Runde endet oder max Fragen gestellt waren; liefert die Zahl der Fragen
function round(max) {
  Q.startQuiz(fakeQuiz());
  let asked = 0;
  while (G.gameOn('quiz') && asked < max) {
    asked++;
    Q.quizAnswer('a');
    const next = el.gameBar.querySelector('[data-act="next"]');
    if (!next) break;
    next.click();
  }
  return asked;
}

test('Quiz: Lite beendet die Runde nach quizQuestions Fragen mit Hinweis, Pro läuft weiter', async () => {
  assert.equal(round(20), 5);
  assert.equal(G.gameOn('quiz'), false);
  assert.match(el.toast.textContent, /5 Fragen/);
  await as('pro');
  ui.toast('');
  assert.equal(round(8), 8);
  assert.equal(G.gameOn('quiz'), true, 'Pro: keine Grenze');
  G.endGame();
});
