import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, uninstallDom } from './helpers.mjs';

// DOM-Tests für die Tafel (Melodie und Rhythmus): Darstellung (board.js), Leiste (sidebar.js) und Neuzeichnen
// (redraw.js). Die Module lesen ihre Elemente beim Import aus der echten index.html; deshalb erst das DOM, dann import().
let S, settings, useVariant, B, SB, RD, CONFIG, MODEL, el, storage;
before(async () => {
  ({ storage } = installDom());
  // Diese Tests gehen von der vollen Tafel (MAX_ROWS Zeilen) aus; die Lite-Grenze prüft lite-limits.test.mjs
  await (await import('../app/js/core/tier.js')).loadPlan({ env: { backend: null, tier: 'pro' }, search: '' });
  ({ S, settings, useVariant } = await import('../app/js/tafel/state.js'));
  B = await import('../app/js/tafel/board.js');
  SB = await import('../app/js/tafel/sidebar.js');
  RD = await import('../app/js/tafel/redraw.js');
  CONFIG = await import('../app/js/tafel/config.js');
  MODEL = await import('../app/js/tafel/model.js');
  ({ el } = await import('../app/js/tafel/dom.js'));
  SB.buildCounts();
  SB.renderPalette();
});
after(uninstallDom);

// Zeile mit den Eigenschaften line/meter, wie sie die Tafel am Array trägt
const row = (cells = [], x = {}) => Object.assign(cells, { line: false, meter: '' }, x);
const note = (id, x = {}) => ({ n: id, h: '', ...x });
const beat = (d = 1) => ({ k: 'b', d });
const rest = (d = 1) => ({ k: 'r', d });

// Ausgangszustand: Melodie-Tafel mit drei Zeilen, Markierung vorn, alle Optionen aus
beforeEach(() => {
  storage.clear();
  useVariant('mel');
  Object.assign(settings, { lens: true, autoBar: false, autoZ: false, syl: false });
  S.rows = [row([note('C'), note('D'), note('E')]), row(), row()];
  S.sel = { r: 0, c: 1 };
  S.hist = []; S.redo = []; S.quiz = null; S.written = null; S.insertMode = false; S.cap = 0;
  el.grid.innerHTML = ''; el.grid.className = ''; el.grid.removeAttribute('style');
});

const cell = (r, c) => B.cellEl(r, c);
const label = (r, c) => cell(r, c).getAttribute('aria-label');
const on = (b) => b.classList.contains('on');

/* ---------- board.js ---------- */

test('renderBoard: ein Platz je Zeichen mit Zeile, Platz und Name im Sprachtext', () => {
  B.renderBoard();
  assert.equal(label(0, 0), 'Zeile 1, Platz 1: C');
  assert.equal(label(0, 2), 'Zeile 1, Platz 3: E');
  assert.equal(el.grid.querySelectorAll('.row').length, 3);
  assert.equal(cell(0, 0).querySelector('.dot').textContent, 'C');
  assert.equal(cell(0, 0).getAttribute('role'), 'button');
});

test('renderBoard: nur der markierte Platz trägt .sel', () => {
  B.renderBoard();
  assert.deepEqual([...el.grid.querySelectorAll('.cell.sel')].map((c) => [c.dataset.r, c.dataset.c]), [['0', '1']]);
  S.sel = { r: 0, c: 2 };
  B.renderBoard();
  assert.deepEqual([...el.grid.querySelectorAll('.cell.sel')].map((c) => [c.dataset.r, c.dataset.c]), [['0', '2']]);
});

test('renderBoard: Zeilennummer nur am ersten Platz, Rahmenwerte für das Raster', () => {
  B.renderBoard();
  assert.equal(cell(0, 0).querySelector('.rnum').textContent, '1');
  assert.equal(cell(0, 1).querySelector('.rnum'), null);
  assert.equal(el.grid.style.getPropertyValue('--rows'), '3');
  // längste Zeile (3 Töne = 12 Sechzehntel) plus ein freier Schlag
  assert.equal(el.grid.style.getPropertyValue('--cols'), '16');
  assert.ok(el.grid.classList.contains('prop'));
  assert.equal(S.cap, CONFIG.MAX_PER_ROW);
});

test('renderBoard: hohe Töne tragen Pfeil und Klasse up, Halbtöne ihren Namen', () => {
  S.rows = [row([note('C+'), note('Fis')]), row(), row()];
  B.renderBoard();
  assert.ok(cell(0, 0).querySelector('.dot').classList.contains('up'));
  assert.equal(label(0, 0), 'Zeile 1, Platz 1: hohes C');
  assert.equal(label(0, 1), 'Zeile 1, Platz 2: Fis');
});

test('renderBoard: Notenlänge und Hand stehen im Sprachtext', () => {
  S.rows = [row([note('C', { d: 2, h: 'r' }), note('D', { d: 0.5, h: 'l' })]), row(), row()];
  B.renderBoard();
  assert.equal(label(0, 0), 'Zeile 1, Platz 1: C, Halbe, rechts');
  assert.equal(label(0, 1), 'Zeile 1, Platz 2: D, Achtel, links');
  assert.ok(cell(0, 0).querySelector('.hand.r'));
});

test('renderBoard: Pausen, Schläge und leere Plätze', () => {
  useVariant('rhy');
  S.variant = 'rhy';
  S.rows = [row([beat(1), rest(2), beat(0.5), beat(0.5)], { line: true }), row([], { line: true }), row([], { line: true })];
  S.sel = { r: 0, c: 0 };
  B.renderBoard();
  assert.equal(label(0, 0), 'Zeile 1, Platz 1: Viertel');
  assert.equal(label(0, 1), 'Zeile 1, Platz 2: Halbe Pause');
  assert.equal(label(0, 2), 'Zeile 1, Platz 3: Achtel');
  assert.ok(cell(0, 0).querySelector('.dot.beat'));
  assert.ok(cell(0, 1).querySelector('.dot.rest'));
  assert.ok(el.grid.classList.contains('rhy'));
  assert.equal(el.grid.style.getPropertyValue('--cols'), String(CONFIG.RHY_PER_ROW * 4));
  // Hinter dem Zeilenende folgen leere Plätze (nur Anzeige, markiert als beyond)
  const ghost = [...el.grid.querySelectorAll('.row')[1].querySelectorAll('.cell')];
  assert.ok(ghost.length > 0 && ghost.every((c) => c.classList.contains('beyond')));
  assert.match(ghost[0].getAttribute('aria-label'), /leer$/);
  S.variant = 'mel'; useVariant('mel');
});

test('renderBoard: Taktart steht am Zeilenanfang, Klasse meters an der Tafel', () => {
  assert.ok(!el.grid.classList.contains('meters'));
  S.rows[0].meter = '3/4';
  B.renderBoard();
  assert.ok(el.grid.classList.contains('meters'));
  assert.equal(cell(0, 0).querySelector('.meter').getAttribute('aria-label'), 'Taktart 3/4');
  assert.equal(cell(0, 1).querySelector('.meter'), null);
  assert.ok(cell(0, 0).classList.contains('has-meter'));
});

test('renderBoard: Taktstrich von Hand und Zählzeiten kommen in den Sprachtext', () => {
  S.rows[0][1].bar = 1;
  S.rows[0][2].z = '1 +';
  B.renderBoard();
  assert.match(label(0, 1), /, Taktstrich davor$/);
  assert.ok(cell(0, 1).querySelector('.barline'));
  assert.match(label(0, 2), /, gezählt 1 und$/);
  assert.ok(el.grid.classList.contains('counts'));
  S.rows[0][1].bar = 2; S.rows[0][2].bar = 5;
  B.renderBoard();
  assert.match(label(0, 1), /Schlussstrich davor/);
  assert.match(label(0, 2), /Wiederholung endet und beginnt davor/);
  assert.ok(cell(0, 2).querySelector('.barline.rep-end.rep-start'));
});

test('renderBoard: automatische Taktstriche und Zählzeiten nach der Taktart', () => {
  S.rows = [row([note('C'), note('D'), note('E'), note('F'), note('G'), note('A'), note('H'), note('C+')], { meter: '4/4' }), row(), row()];
  settings.autoBar = true; settings.autoZ = true;
  B.renderBoard();
  assert.match(label(0, 4), /Taktstrich davor/);
  assert.match(label(0, 0), /gezählt 1$/);
  assert.match(label(0, 1), /gezählt 2$/);
  assert.ok(el.grid.classList.contains('counts'));
  settings.autoZ = false; settings.autoBar = false;
  B.renderBoard();
  assert.doesNotMatch(label(0, 4), /Taktstrich/);
  assert.ok(!el.grid.classList.contains('counts'));
});

test('renderBoard: verdeckte ?-Karte zeigt nichts vom Zeichen, aufgedeckt ist sie weg', () => {
  S.rows[0][1].q = 1;
  B.renderBoard();
  assert.equal(label(0, 1), 'Zeile 1, Platz 2: verdeckt (antippen deckt auf)');
  assert.ok(cell(0, 1).classList.contains('quiz'));
  assert.ok(cell(0, 1).querySelector('.qcard'));
  S.rows[0][1].q = 2;
  B.renderBoard();
  assert.ok(!cell(0, 1).classList.contains('quiz'));
  assert.equal(cell(0, 1).querySelector('.qcard'), null);
});

test('renderBoard: Tuch ab der Deckzeile mit Hinweis, „nächste Zeile“ nur wenn noch etwas darunter liegt', () => {
  S.rows[2].push(note('G'));
  S.rows[1].cover = true;
  B.renderBoard();
  let cloth = el.grid.querySelector('.cloth');
  assert.ok(cloth);
  assert.equal(cloth.style.gridRow, '2 / 4');
  assert.match(cloth.getAttribute('aria-label'), /Antippen deckt die nächste Zeile auf/);
  S.rows[1].cover = false;
  S.rows[2].cover = true; // darunter nichts mehr
  B.renderBoard();
  cloth = el.grid.querySelector('.cloth');
  assert.equal(cloth.getAttribute('aria-label'), 'Abgedeckt. Antippen deckt auf.');
  S.rows[2].cover = false;
  B.renderBoard();
  assert.equal(el.grid.querySelector('.cloth'), null);
});

test('renderBoard: eingeklappte Zeile bleibt als Zeile mit Hinweis', () => {
  S.rows[0].fold = true;
  B.renderBoard();
  const r0 = el.grid.querySelector('.row');
  assert.ok(r0.classList.contains('folded'));
  assert.match(r0.getAttribute('aria-label'), /Zeile 1 eingeklappt/);
  assert.equal(r0.querySelectorAll('.cell').length, 4); // 3 Töne + leerer Platz dahinter
});

test('renderBoard: Quiz, Übungstafel und Einfügen schalten Klassen der Tafel', () => {
  B.renderBoard();
  assert.ok(!el.grid.classList.contains('clean'));
  S.quiz = { pos: { r: 0, c: 0 }, done: new Set(), ask: 'color' };
  B.renderBoard();
  assert.ok(el.grid.classList.contains('clean'));
  S.quiz = null;
  S.written = { rows: [], name: '', sel: { r: 0, c: 0 }, hist: [] };
  S.rows = [row(), row(), row()];
  B.renderBoard();
  assert.ok(el.grid.classList.contains('clean'));
  assert.ok(el.grid.classList.contains('blankboard'), 'leere Übungstafel');
  S.written = null; S.insertMode = true;
  B.renderBoard();
  assert.ok(el.grid.classList.contains('inserting'));
  assert.ok(!el.grid.classList.contains('clean'));
});

test('renderBoard: Tonnamen-Quiz verbirgt den Namen, bis der Punkt benannt ist', () => {
  S.quiz = { pos: { r: 0, c: 0 }, done: new Set(['0,1']), ask: 'color' };
  B.renderBoard();
  assert.equal(label(0, 0), 'Zeile 1, Platz 1: Farbpunkt');
  assert.equal(label(0, 1), 'Zeile 1, Platz 2: D');
  S.quiz.ask = 'name';
  B.renderBoard();
  assert.ok(cell(0, 0).querySelector('.dot.plain'), 'Namen zeigen, Farbe tippen: Buchstabe auf weißem Punkt');
  assert.ok(!cell(0, 1).querySelector('.dot.plain'));
});

test('renderBoard: Einstellung lens schaltet die Notenzeichen (nolen)', () => {
  B.renderBoard();
  assert.ok(!el.grid.classList.contains('nolen'));
  settings.lens = false;
  B.renderBoard();
  assert.ok(el.grid.classList.contains('nolen'));
});

test('renderBoard: eine leere Tafel ohne Zeilen zeichnet ohne Fehler', () => {
  S.rows = [];
  S.sel = { r: 0, c: 0 };
  B.renderBoard();
  assert.equal(el.grid.querySelectorAll('.row').length, 0);
  assert.equal(el.grid.style.getPropertyValue('--rows'), '0');
  assert.equal(el.grid.style.getPropertyValue('--fr'), '2');
});

test('renderBoard: Rhythmus-Echo (hide) zeigt statt der Zeichen eine leere Linie mit Schlussstrich', () => {
  useVariant('rhy'); S.variant = 'rhy';
  S.rows = [row([beat(1), beat(1), beat(0.5), beat(0.5), beat(1)], { line: true, meter: '2/4', hide: true }), row([], { line: true }), row([], { line: true })];
  B.renderBoard();
  const r0 = el.grid.querySelector('.row');
  assert.ok(r0.classList.contains('blank'));
  assert.equal(r0.querySelectorAll('.dot.rest').length, 4, 'vier unsichtbare Viertelpausen für 4 Schläge');
  assert.ok(r0.querySelector('.barline'), 'Taktstrich und Schlussstrich bleiben');
  S.variant = 'mel'; useVariant('mel');
});

test('cellEl: findet Plätze, sonst null', () => {
  B.renderBoard();
  assert.equal(cell(0, 2).dataset.c, '2');
  assert.equal(cell(2, 5), null);
});

test('markPlaying: hebt den klingenden Platz hervor, null und leere Zeilen heben nichts hervor', () => {
  B.renderBoard();
  B.markPlaying({ r: 0, c: 1 });
  assert.deepEqual([...el.grid.querySelectorAll('.cell.playing')].map((c) => c.dataset.c), ['1']);
  B.markPlaying({ r: 0, c: 2 });
  assert.deepEqual([...el.grid.querySelectorAll('.cell.playing')].map((c) => c.dataset.c), ['2']);
  B.markPlaying(null);
  assert.equal(el.grid.querySelectorAll('.cell.playing').length, 0);
  S.rows[1].hide = true;
  B.renderBoard();
  B.markPlaying({ r: 1, c: 0 });
  assert.equal(el.grid.querySelectorAll('.cell.playing').length, 0, 'im Rhythmus-Echo verrät nichts, wo Zeichen stehen');
});

/* ---------- sidebar.js ---------- */

test('renderPalette: 7 Grundtöne, 4 hohe, 2 Halbtöne; die weiteren Halbtöne klappen auf und zu', () => {
  const ids = () => [...el.palette.querySelectorAll('button.note')].map((b) => b.dataset.id);
  SB.renderPalette();
  assert.deepEqual(ids(), ['C', 'D', 'E', 'F', 'G', 'A', 'H', 'C+', 'D+', 'E+', 'F+', 'Fis', 'B']);
  const more = el.palette.querySelector('[data-more]');
  assert.equal(more.getAttribute('aria-expanded'), 'false');
  SB.toggleMoreSemis();
  assert.equal(ids().length, 13 + CONFIG.MORE_SEMIS.length);
  assert.equal(el.palette.querySelector('[data-more]').getAttribute('aria-expanded'), 'true');
  assert.match(el.palette.querySelector('[data-more]').textContent, /weniger Halbtöne/);
  SB.toggleMoreSemis();
  assert.equal(ids().length, 13);
});

test('renderPalette: jeder Ton trägt Namen im Sprachtext und seine Farbe', () => {
  SB.renderPalette();
  const hohes = el.palette.querySelector('[data-id="C+"]');
  assert.equal(hohes.getAttribute('aria-label'), 'hohes C');
  assert.ok(hohes.classList.contains('up'));
  assert.ok(el.palette.querySelector('[data-id="D"]').style.cssText.length > 0);
});

test('buildCounts: Knöpfe 1 bis 6 und „+“ (und) und Löschen', () => {
  const z = [...el.counts.querySelectorAll('[data-z]')];
  assert.deepEqual(z.map((b) => b.dataset.z), CONFIG.COUNTS);
  assert.equal(el.counts.querySelector('[data-z="+"]').getAttribute('aria-label'), 'Zählzeit und');
  assert.equal(el.counts.querySelector('[data-z="3"]').getAttribute('aria-label'), 'Zählzeit 3');
  assert.ok(el.counts.querySelector('[data-zclear]'));
});

test('renderSidebar: Hand-Knöpfe nur bei einer Note, gedrückt nach der Hand der Note', () => {
  S.rows[0][1].h = 'r';
  S.sel = { r: 0, c: 1 };
  SB.renderSidebar();
  assert.equal(el.btnR.disabled, false);
  assert.ok(on(el.btnR) && !on(el.btnL));
  S.sel = { r: 1, c: 0 }; // leerer Platz
  SB.renderSidebar();
  assert.equal(el.btnR.disabled, true);
  assert.equal(el.btnL.disabled, true);
  assert.ok(!on(el.btnR));
});

test('renderSidebar: Wertknöpfe zeigen den Wert des markierten Platzes (punktiert als Grundwert mit Punkt)', () => {
  S.rows[0][1].d = 2;
  SB.renderSidebar();
  const onD = (box) => [...box.querySelectorAll('[data-d].on')].map((b) => b.dataset.d);
  assert.deepEqual(onD(el.valuesMel), ['2']);
  assert.equal(el.valuesMel.querySelectorAll('[data-d]').length, CONFIG.VALUE_BTNS.length);
  assert.equal(el.values.querySelectorAll('[data-d]').length, CONFIG.RHY_VALUE_BTNS.length);
  assert.ok(!on(el.valuesMel.querySelector('[data-dot]')));
  S.rows[0][1].d = 3; // punktierte Halbe
  SB.renderSidebar();
  assert.deepEqual(onD(el.valuesMel), ['2']);
  assert.ok(on(el.valuesMel.querySelector('[data-dot]')));
  assert.equal(el.valuesMel.querySelector('[data-d="2"]').getAttribute('aria-label'), 'Halbe');
  assert.equal(el.restsMel.querySelector('[data-d="2"]').getAttribute('aria-label'), 'Halbe Pause');
});

test('renderSidebar: Pausenwert leuchtet nur bei einer Pause', () => {
  S.rows[0][1] = rest(2);
  SB.renderSidebar();
  assert.deepEqual([...el.restsMel.querySelectorAll('.on')].map((b) => b.dataset.d), ['2']);
  assert.equal(el.valuesMel.querySelectorAll('[data-d].on').length, 0);
});

test('renderSidebar: Takt- und Schlussstrich, Wiederholungen, Automatik', () => {
  S.rows[0][1].bar = 1;
  SB.renderSidebar();
  assert.ok(on(el.btnBar) && el.btnBar.getAttribute('aria-pressed') === 'true');
  assert.equal(el.btnBar.disabled, false);
  assert.ok(!on(el.btnEnd));
  S.rows[0][1].bar = 5;
  SB.renderSidebar();
  assert.ok(on(el.btnRepStart) && on(el.btnRepEnd) && on(el.btnRepStartMel) && on(el.btnRepEndMel));
  S.rows[0][1].bar = 2;
  SB.renderSidebar();
  assert.ok(on(el.btnEnd) && on(el.btnEndMel));
  settings.autoBar = true;
  SB.renderSidebar();
  assert.equal(el.btnBar.disabled, true, 'Taktstriche von Hand nur ohne Automatik');
  assert.ok(!on(el.btnBar));
  assert.ok(on(el.btnAutoBar) && on(el.btnAutoBarMel));
});

test('renderSidebar: Taktart des markierten Platzes ist in beiden Leisten gedrückt (geerbt von der Zeile darüber)', () => {
  // Die Taktart-Knöpfe baut controls.js beim Start; hier dasselbe Muster ohne die Verdrahtung
  const html = ['', ...CONFIG.METERS].map((m) => '<button type="button" class="btn" data-m="' + m + '"></button>').join('');
  el.rhyMeters.innerHTML = el.melMeters.innerHTML = html;
  const pressed = (box) => [...box.querySelectorAll('[data-m]')].filter(on).map((b) => b.dataset.m);
  SB.renderSidebar();
  assert.deepEqual(pressed(el.melMeters), ['']);
  S.rows[0].meter = '3/4';
  S.sel = { r: 1, c: 0 }; // Zeile darunter erbt die Taktart
  SB.renderSidebar();
  assert.deepEqual(pressed(el.melMeters), ['3/4']);
  assert.deepEqual(pressed(el.rhyMeters), ['3/4']);
  el.rhyMeters.innerHTML = el.melMeters.innerHTML = '';
});

test('renderSidebar: Zählzeiten-Knöpfe aus bei Automatik oder leerem Platz, Löschen nur wenn eine Zählzeit da ist', () => {
  S.sel = { r: 0, c: 1 };
  SB.renderSidebar();
  assert.equal(el.counts.querySelector('[data-z="1"]').disabled, false);
  assert.equal(el.counts.querySelector('[data-zclear]').disabled, true);
  S.rows[0][1].z = '1';
  SB.renderSidebar();
  assert.equal(el.counts.querySelector('[data-zclear]').disabled, false);
  settings.autoZ = true;
  SB.renderSidebar();
  assert.equal(el.counts.querySelector('[data-z="1"]').disabled, true);
  assert.equal(el.counts.querySelector('[data-zclear]').disabled, true);
  settings.autoZ = false;
  S.sel = { r: 1, c: 0 };
  SB.renderSidebar();
  assert.equal(el.counts.querySelector('[data-z="1"]').disabled, true, 'auf einem leeren Platz gibt es nichts zu zählen');
});

test('renderSidebar: Werkzeuge Löschen, Lücke, Umbruch, Rückgängig, Zeilen', () => {
  S.sel = { r: 0, c: 1 };
  SB.renderSidebar();
  assert.equal(el.btnDel.disabled, false);
  assert.equal(el.btnUndo.disabled, true);
  S.hist.push('{}');
  S.sel = { r: 1, c: 0 };
  SB.renderSidebar();
  assert.equal(el.btnDel.disabled, true, 'leerer Platz');
  assert.equal(el.btnUndo.disabled, false);
  assert.equal(el.btnRedo.disabled, true);
  assert.equal(el.btnAddRow.disabled, false);
  assert.equal(el.btnDelRow.disabled, false);
  S.rows = [row([note('C')])];
  S.sel = { r: 0, c: 0 };
  SB.renderSidebar();
  assert.equal(el.btnDelRow.disabled, true, 'eine Zeile muss bleiben');
  S.rows = Array.from({ length: CONFIG.MAX_ROWS }, () => row());
  S.sel = { r: CONFIG.MAX_ROWS - 1, c: 0 };
  SB.renderSidebar();
  assert.equal(el.btnAddRow.disabled, true, 'höchstens MAX_ROWS Zeilen');
  assert.equal(el.btnBreak.disabled, true, 'in der letzten Zeile gibt es keinen Umbruch mehr');
  S.insertMode = true;
  SB.renderSidebar();
  assert.ok(on(el.btnIns));
});

test('renderSidebar: Rhythmussprache und Zählzeit-Automatik folgen den Einstellungen', () => {
  settings.syl = true; settings.autoZ = true;
  SB.renderSidebar();
  assert.ok(on(el.btnSyl) && on(el.btnAutoZ) && on(el.btnAutoZMel));
  settings.syl = false; settings.autoZ = false;
  SB.renderSidebar();
  assert.ok(!on(el.btnSyl) && !on(el.btnAutoZ));
});

/* ---------- redraw.js ---------- */

test('render: zeichnet Tafel und Leiste und hebt nichts hervor, solange nichts spielt', () => {
  RD.render();
  assert.equal(el.grid.querySelectorAll('.cell').length > 0, true);
  assert.equal(el.grid.querySelectorAll('.cell.playing').length, 0);
  assert.equal(el.btnDel.disabled, false);
});

test('render: im Tonnamen-Quiz leuchtet der gefragte Punkt', () => {
  S.quiz = { pos: { r: 0, c: 2 }, done: new Set(), ask: 'color' };
  RD.render();
  assert.deepEqual([...el.grid.querySelectorAll('.cell.playing')].map((c) => c.dataset.c), ['2']);
});

test('commit: speichert die Tafel und zeichnet neu; die Übungstafel wird nie gespeichert', () => {
  S.rows[0].push(note('G'));
  RD.commit();
  const saved = JSON.parse(storage.getItem('notentafel.v1'));
  assert.equal(saved.rows[0].length, 4);
  assert.equal(el.grid.querySelectorAll('.row')[0].querySelectorAll('.cell:not(.beyond)').length, 4);
  storage.clear();
  S.written = { rows: [], name: '', sel: { r: 0, c: 0 }, hist: [] };
  RD.commit();
  assert.equal(storage.getItem('notentafel.v1'), null);
  S.written = null;
});

test('hasMeter und appendPos (Tafelmodell) passen zur gezeichneten Tafel', () => {
  assert.equal(MODEL.hasMeter(S.rows), false);
  assert.deepEqual(MODEL.appendPos(S.rows), { r: 0, c: 3 });
});
