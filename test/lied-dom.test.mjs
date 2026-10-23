import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, uninstallDom, n, r, song } from './helpers.mjs';

// DOM-Tests für das Lied: Taktart, Tonart und Auftakt (meter.js), Notenblatt (render.js), Leiste (sidebar.js) und
// melody.js. Die Module lesen ihre Elemente beim Import aus der echten index.html; deshalb erst das DOM, dann import().
let L, opts, M, R, SB, MEL, SF, MODEL, el, storage;
before(async () => {
  ({ storage } = installDom());
  ({ L, opts } = await import('../app/js/lied/state.js'));
  M = await import('../app/js/lied/meter.js');
  R = await import('../app/js/lied/render.js');
  SB = await import('../app/js/lied/sidebar.js');
  MEL = await import('../app/js/lied/melody.js');
  SF = await import('../app/js/songformat.js');
  MODEL = await import('../app/js/lied/model.js');
  ({ el } = await import('../app/js/lied/dom.js'));
  SB.buildPanel();
});
after(uninstallDom);

// Ausgangszustand: vier Noten ohne Taktart, Markierung am Ende, Verlauf leer, Optionen wie nach dem ersten Start
beforeEach(() => {
  storage.clear();
  L.song = song([n('c1'), n('d1'), n('e1'), n('f1')], '', 0);
  L.sel = 4; L.hist = []; L.last = null; L.insertMode = false; L.quiz = null; L.written = null; L.pen = { v: 4, dot: 0 };
  Object.assign(opts, { autoBar: true, autoZ: false, lyrics: true, names: false, colors: false, wrap: true, size: 2, allTones: false });
  el.toast.hidden = true; el.toast.textContent = ''; el.toast.className = '';
  el.sheet.innerHTML = '';
  SB.buildSteps();
});

const on = (b) => b.classList.contains('on');
const savedSong = () => JSON.parse(storage.getItem('notentafel.lied.v1'));

/* ---------- meter.js ---------- */

test('setMeter: Taktart setzen, ein unpassender Auftakt fällt weg, Notenblatt wird neu gezeichnet', () => {
  L.song.meter = '4/4'; L.song.pickup = 8;
  M.setMeter('3/4');
  assert.equal(L.song.meter, '3/4');
  assert.equal(L.song.pickup, 8); // eine Viertel passt auch im Dreivierteltakt
  M.setMeter('');
  assert.equal(L.song.pickup, 0); // ohne Taktart gibt es keinen Auftakt
  assert.equal(L.hist.length, 2);
  assert.ok(el.sheet.querySelector('svg.score'), 'commit zeichnet das Notenblatt neu');
  assert.equal(savedSong().meter, '', 'und speichert');
});

test('setMeter: dieselbe Taktart ist keine Änderung (kein Verlaufseintrag)', () => {
  L.song.meter = '4/4';
  M.setMeter('4/4');
  assert.equal(L.hist.length, 0);
});

test('stepKey: Tonart schrittweise, an den Grenzen passiert nichts', () => {
  M.stepKey(1);
  assert.equal(L.song.key, 1);
  M.stepKey(-1); M.stepKey(-1);
  assert.equal(L.song.key, -1);
  const len = L.hist.length;
  L.song.key = MODEL.KEY_MAX;
  M.stepKey(1);
  assert.equal(L.song.key, MODEL.KEY_MAX);
  L.song.key = MODEL.KEY_MIN;
  M.stepKey(-1);
  assert.equal(L.song.key, MODEL.KEY_MIN);
  assert.equal(L.hist.length, len, 'außerhalb des Bereichs wird nichts gemerkt');
});

test('transposeSong: verschiebt Lied samt Tonart und meldet die neue Tonart', () => {
  M.transposeSong(2);
  assert.equal(L.song.key, 2); // D-Dur
  assert.equal(L.song.ev[0].p, 'd1');
  assert.equal(L.hist.length, 1);
  assert.equal(el.toast.textContent, 'Jetzt in ' + MODEL.keyName(2) + '.');
  assert.equal(el.toast.hidden, false);
});

test('transposeSong: liegt ein Ton danach außerhalb des Tonvorrats, bleibt alles und eine Warnung erscheint', () => {
  L.song = song([n('h3')]);
  M.transposeSong(1);
  assert.equal(L.song.ev[0].p, 'h3');
  assert.equal(L.hist.length, 0);
  assert.match(el.toast.textContent, /Höher geht es nicht/);
  assert.ok(el.toast.classList.contains('warn'));
  L.song = song([n('c0')]);
  M.transposeSong(-1);
  assert.match(el.toast.textContent, /Tiefer geht es nicht/);
  assert.equal(L.song.ev[0].p, 'c0');
});

test('setPickup: setzt den Auftakt, derselbe Wert merkt nichts', () => {
  L.song.meter = '4/4';
  M.setPickup(8);
  assert.equal(L.song.pickup, 8);
  M.setPickup(8);
  assert.equal(L.hist.length, 1);
});

test('toggleBar: Strich hinter dem Zeichen vor der Markierung; ohne Zeichen davor passiert nichts', () => {
  L.sel = 2;
  M.toggleBar(1);
  assert.equal(L.song.ev[1].bar, 1);
  M.toggleBar(1);
  assert.equal(L.song.ev[1].bar, undefined);
  M.toggleBar(2);
  assert.equal(L.song.ev[1].bar, 2);
  M.toggleBar(1); // anderer Strich ersetzt den bisherigen
  assert.equal(L.song.ev[1].bar, 1);
  L.sel = 0;
  const len = L.hist.length;
  M.toggleBar(1);
  assert.equal(L.hist.length, len);
});

test('toggleRepeat: Anfang und Ende ergeben zusammen :‖:, ohne Ende fällt die Klammer weg', () => {
  L.sel = 2;
  const bar = () => L.song.ev[1].bar;
  M.toggleRepeat('start'); assert.equal(bar(), 4);
  M.toggleRepeat('end'); assert.equal(bar(), 5);
  L.song.ev[1].volta = 1;
  M.toggleRepeat('start'); assert.equal(bar(), 3);
  assert.equal(L.song.ev[1].volta, 1);
  M.toggleRepeat('end'); assert.equal(bar(), undefined);
  assert.equal(L.song.ev[1].volta, undefined);
});

test('toggleVolta: nur an einem Wiederholungsende', () => {
  L.sel = 2;
  M.toggleVolta();
  assert.equal(L.song.ev[1].volta, undefined);
  assert.equal(L.hist.length, 0);
  L.song.ev[1].bar = 3;
  M.toggleVolta(); assert.equal(L.song.ev[1].volta, 1);
  M.toggleVolta(); assert.equal(L.song.ev[1].volta, undefined);
});

test('Schalter für Taktstriche, Zählzeiten und Liedtext: Option wechselt, Hinweis nur wenn etwas fehlt', () => {
  M.toggleAutoBar(); // war an, jetzt aus: kein Hinweis
  assert.equal(opts.autoBar, false);
  assert.equal(el.toast.textContent, '');
  M.toggleAutoBar(); // wieder an, aber keine Taktart
  assert.equal(opts.autoBar, true);
  assert.match(el.toast.textContent, /Wähle zuerst eine Taktart.*Taktstriche/);
  M.toggleAutoZ();
  assert.equal(opts.autoZ, true);
  assert.match(el.toast.textContent, /Zählzeiten/);
  opts.lyrics = false;
  M.toggleLyrics();
  assert.equal(opts.lyrics, true);
  assert.match(el.toast.textContent, /noch keinen Liedtext/);
  // Mit Taktart bzw. mit Text gibt es keinen Hinweis
  el.toast.textContent = '';
  L.song.meter = '4/4';
  opts.autoZ = false;
  M.toggleAutoZ();
  assert.equal(opts.autoZ, true);
  assert.equal(el.toast.textContent, '');
  opts.lyrics = false; L.song.ev[0].ly = 'Hal';
  M.toggleLyrics();
  assert.equal(el.toast.textContent, '');
});

test('Schalter speichern die Optionen (neu geladene Einstellungen haben sie noch)', () => {
  M.toggleAutoZ();
  const raw = storage.getItem('notentafel.lied.settings.v1');
  assert.ok(raw, 'Einstellungen wurden geschrieben');
  assert.equal(JSON.parse(raw).autoZ, true);
});

/* ---------- melody.js ---------- */

test('melody.js: reicht songToMelody aus songformat.js unverändert weiter', () => {
  assert.equal(MEL.songToMelody, SF.songToMelody);
  assert.equal(MODEL.songToMelody, SF.songToMelody);
});

test('melody.js: transpose lässt das Lied unberührt und Pausen stehen', () => {
  const s = song([n('c1'), r(), n('e1')], '4/4');
  const copy = JSON.parse(JSON.stringify(s));
  const t = MEL.transpose(s, 2);
  assert.deepEqual(s, copy);
  assert.equal(t.key, 2);
  assert.deepEqual(t.ev.map((e) => e.p), ['d1', undefined, 'f1']);
  assert.equal(t.ev[2].acc, undefined, 'fis steht in D-Dur schon im Vorzeichen');
});

test('melody.js: transpose hin und zurück ergibt dieselben Töne, außerhalb des Tonvorrats null', () => {
  const s = song([n('c1'), n('g1'), n('a1', 8, { acc: 1 })]);
  const back = MEL.transpose(MEL.transpose(s, 5), -5);
  assert.deepEqual(back.ev.map((e) => [e.p, e.acc ?? 0]), s.ev.map((e) => [e.p, e.acc ?? 0]));
  assert.equal(back.key, 0);
  assert.equal(MEL.transpose(song([n('h3')]), 1), null);
  assert.equal(MEL.transpose(song([n('c0')]), -1), null);
});

test('melody.js: eine Oktave höher oder tiefer bleibt in der Tonart, ab 12 Halbtönen wandert die Oktave mit', () => {
  const t = MEL.transpose(song([n('c2'), n('e2')], '4/4'), 12);
  assert.equal(t.key, 0);
  assert.deepEqual(t.ev.map((e) => e.p), ['c3', 'e3']);
  const u = MEL.transpose(song([n('c2'), n('e2')], '4/4'), -12);
  assert.deepEqual(u.ev.map((e) => e.p), ['c1', 'e1']);
  const v = MEL.transpose(song([n('c1')], '4/4'), 13);
  assert.deepEqual(v.ev.map((e) => [e.p, e.acc ?? 0]), MEL.transpose(MEL.transpose(song([n('c1')], '4/4'), 12), 1).ev.map((e) => [e.p, e.acc ?? 0]));
});

/* ---------- render.js ---------- */

test('render: zeichnet für jedes Zeichen eine Gruppe und die Markierung', () => {
  L.song = song([n('c1'), r(), n('e1')], '4/4');
  L.sel = 1;
  R.render();
  const svg = el.sheet.querySelector('svg.score');
  assert.ok(svg);
  assert.equal(svg.getAttribute('aria-label'), 'Notenblatt');
  assert.deepEqual([...svg.querySelectorAll('.ev')].map((g) => g.dataset.i), ['0', '1', '2']);
  assert.ok(svg.querySelector('.cur'), 'die Markierung ist zu sehen');
  assert.ok(!svg.classList.contains('clean'));
});

test('render: ein leeres Lied zeichnet Notenlinien ohne Zeichen', () => {
  L.song = song([]); L.sel = 0;
  R.render();
  assert.ok(el.sheet.querySelector('svg.score'));
  assert.equal(el.sheet.querySelectorAll('.ev').length, 0);
});

test('render: im Tonnamen-Quiz ohne Markierung, Namen nur bei benannten Noten', () => {
  L.quiz = { i: 1, done: new Set([0]) };
  R.render();
  const svg = el.sheet.querySelector('svg.score');
  assert.ok(svg.classList.contains('clean'));
  assert.equal(svg.querySelector('.cur'), null);
  assert.equal(svg.querySelectorAll('.nm').length, 1, 'nur die schon benannte Note trägt ihren Namen');
});

test('render: Notennamen und Zählzeiten folgen den Optionen', () => {
  L.song = song([n('c1'), n('d1'), n('e1'), n('f1')], '4/4');
  opts.names = true; opts.autoZ = true;
  R.render();
  assert.equal(el.sheet.querySelectorAll('.nm').length, 4);
  assert.ok(el.sheet.querySelectorAll('.cnt').length > 0);
  opts.names = false; opts.autoZ = false;
  R.render();
  assert.equal(el.sheet.querySelectorAll('.nm').length, 0);
  assert.equal(el.sheet.querySelectorAll('.cnt').length, 0);
});

test('render: Liedtext erscheint nur mit eingeschalteter Option', () => {
  L.song = song([n('c1', 4, { ly: 'Hal-' }), n('d1', 4, { ly: 'lo' })], '4/4');
  R.render();
  assert.ok(el.sheet.querySelectorAll('.ly').length > 0);
  opts.lyrics = false;
  R.render();
  assert.equal(el.sheet.querySelectorAll('.ly').length, 0);
});

test('render: viele Takte brechen in mehrere Zeilen um, lastLineStart zeigt auf die letzte', () => {
  const ev = [];
  for (let i = 0; i < 40; i++) ev.push(n('c1', 4));
  L.song = song(ev, '4/4'); L.sel = 40;
  R.render();
  assert.ok(el.sheet.querySelectorAll('.lnum:not(.fnum)').length > 1, 'mehr als eine Zeile');
  assert.ok(R.lastLineStart() > 0 && R.lastLineStart() < 40);
  assert.equal(R.isFolded(0), false);
});

test('render: beim Üben mit leerer Übungstafel bleibt das Blatt ganz leer', () => {
  L.written = { song: song([n('c1')]), name: '', sel: 1, hist: [] };
  L.song = song([]); L.sel = 0;
  R.render();
  assert.equal(el.sheet.innerHTML, '');
  assert.equal(R.lastLineStart(), 0);
});

test('commit: speichert das Lied und zeichnet neu, die Übungstafel wird nie gespeichert', () => {
  L.song.ev.push(n('g1'));
  R.commit();
  assert.equal(savedSong().ev.length, 5);
  assert.equal(el.sheet.querySelectorAll('.ev').length, 5);
  storage.clear();
  L.written = { song: song([n('c1')]), name: '', sel: 1, hist: [] };
  L.song.ev.push(n('a1'));
  R.commit();
  assert.equal(storage.getItem('notentafel.lied.v1'), null);
  assert.equal(el.sheet.querySelectorAll('.ev').length, 6);
});

test('markPlaying: hebt das klingende Zeichen hervor und nimmt es wieder weg', () => {
  R.render();
  R.markPlaying(1);
  assert.deepEqual([...el.sheet.querySelectorAll('.ev.playing')].map((g) => g.dataset.i), ['1']);
  assert.equal(el.sheet.querySelectorAll('.playbar').length, 1);
  R.markPlaying(2);
  assert.deepEqual([...el.sheet.querySelectorAll('.ev.playing')].map((g) => g.dataset.i), ['2']);
  assert.equal(el.sheet.querySelectorAll('.playbar').length, 1);
  R.markPlaying(null);
  assert.equal(el.sheet.querySelectorAll('.ev.playing').length, 0);
  assert.equal(el.sheet.querySelectorAll('.playbar').length, 0);
});

/* ---------- sidebar.js ---------- */

test('buildSteps: sonst c\' bis h\'\' (14 Töne), mit allTones c bis h\'\'\' (28)', () => {
  assert.equal(el.liedSteps.querySelectorAll('[data-p]').length, 14);
  assert.equal(el.liedMore.getAttribute('aria-expanded'), 'false');
  opts.allTones = true;
  SB.buildSteps();
  assert.equal(el.liedSteps.querySelectorAll('[data-p]').length, 28);
  assert.equal(el.liedMore.getAttribute('aria-expanded'), 'true');
});

test('buildPanel: Taktarten (mit „ohne“), Notenwerte samt Punkt und Pausen', () => {
  assert.deepEqual([...el.liedMeters.querySelectorAll('[data-m]')].map((b) => b.dataset.m), [''].concat(MODEL.METERS));
  assert.equal(el.liedValues.querySelectorAll('[data-v]').length, MODEL.VALUES.length);
  assert.equal(el.liedValues.querySelectorAll('[data-dot]').length, 1);
  assert.equal(el.liedRests.querySelectorAll('[data-rv]').length, MODEL.VALUES.length);
  assert.equal(el.liedMeters.querySelector('[data-m="3/4"]').getAttribute('aria-label'), 'Taktart 3/4');
  assert.equal(el.liedMeters.querySelector('[data-m=""]').getAttribute('aria-label'), 'ohne Taktart');
});

test('renderSidebar: ohne markierte Note sind Bogen, Vorzeichen und Liedtext gesperrt', () => {
  L.sel = 4;
  SB.renderSidebar();
  for (const b of [el.liedTie, el.liedSharp, el.liedFlat, el.liedNat, el.liedLyric]) assert.equal(b.disabled, true);
  assert.equal(el.liedLyric.placeholder, 'erst eine Note antippen');
});

test('renderSidebar: markierte Note gibt Vorzeichen frei und zeigt das gesetzte', () => {
  L.song.ev[1].acc = 1;
  L.sel = 1;
  SB.renderSidebar();
  assert.equal(el.liedSharp.disabled, false);
  assert.ok(on(el.liedSharp));
  assert.ok(!on(el.liedFlat));
  assert.equal(el.liedSharp.getAttribute('aria-pressed'), 'true');
  assert.equal(el.liedLyric.disabled, false);
});

test('renderSidebar: Liedtext der Note im Feld, „Weiter“ nur wenn noch eine Note folgt', () => {
  L.song.ev[1].ly = 'Hal-';
  L.sel = 1; SB.renderSidebar();
  assert.equal(el.liedLyric.value, 'Hal-');
  L.sel = 2; SB.renderSidebar();
  assert.equal(el.liedLyric.value, '');
  assert.equal(el.liedLyricNext.disabled, false);
  L.sel = 3; SB.renderSidebar();
  assert.equal(el.liedLyricNext.disabled, true, 'keine Note mehr dahinter');
});

test('renderSidebar: Taktart, Tonart und Auftakt in Knöpfen und Anzeige', () => {
  L.song.meter = '3/4'; L.song.key = 2; L.song.pickup = 8;
  SB.renderSidebar();
  assert.ok(on(el.liedMeters.querySelector('[data-m="3/4"]')));
  assert.ok(!on(el.liedMeters.querySelector('[data-m="4/4"]')));
  assert.equal(el.liedKeyName.textContent, MODEL.keyName(2) + ' · 2♯');
  assert.ok(on(el.liedPickups.querySelector('[data-pk="8"]')));
  assert.equal(el.liedPickups.querySelector('[data-pk="0"]').getAttribute('aria-pressed'), 'false');
  L.song.key = -3; SB.renderSidebar();
  assert.equal(el.liedKeyName.textContent, MODEL.keyName(-3) + ' · 3♭');
  L.song.key = 0; SB.renderSidebar();
  assert.equal(el.liedKeyName.textContent, MODEL.keyName(0));
});

test('renderSidebar: Auftakte passen zur Taktart (ohne Taktart nur „ohne“)', () => {
  L.song.meter = '';
  SB.renderSidebar();
  assert.equal(el.liedPickups.querySelectorAll('[data-pk]').length, 1);
  L.song.meter = '4/4';
  SB.renderSidebar();
  assert.equal(el.liedPickups.querySelectorAll('[data-pk]').length, 1 + MODEL.pickupsFor('4/4').length);
});

test('renderSidebar: Tonartknöpfe sperren an den Grenzen', () => {
  L.song.key = MODEL.KEY_MIN; SB.renderSidebar();
  assert.equal(el.liedKeyDown.disabled, true);
  assert.equal(el.liedKeyUp.disabled, false);
  L.song.key = MODEL.KEY_MAX; SB.renderSidebar();
  assert.equal(el.liedKeyUp.disabled, true);
  assert.equal(el.liedKeyDown.disabled, false);
});

test('renderSidebar: Striche hinter dem Zeichen vor der Markierung; Taktstrich von Hand nur ohne Automatik', () => {
  L.sel = 0; SB.renderSidebar();
  assert.equal(el.liedEnd.disabled, true, 'davor steht nichts');
  L.sel = 2; L.song.ev[1].bar = 3; // Wiederholungsende
  SB.renderSidebar();
  assert.equal(el.liedEnd.disabled, false);
  assert.equal(el.liedBar.disabled, true, 'Automatik an: keine Taktstriche von Hand');
  assert.ok(on(el.liedRepEnd));
  assert.ok(!on(el.liedRepStart));
  assert.equal(el.liedVolta.disabled, false);
  opts.autoBar = false; L.song.ev[1].bar = 1;
  SB.renderSidebar();
  assert.equal(el.liedBar.disabled, false);
  assert.ok(on(el.liedBar));
  assert.equal(el.liedVolta.disabled, true);
  assert.ok(on(el.liedBarHand) && !on(el.liedBarAuto));
});

test('renderSidebar: Notenwert der Feder und Punkt', () => {
  L.pen = { v: 2, dot: 1 };
  SB.renderSidebar();
  assert.ok(on(el.liedValues.querySelector('[data-v="2"]')));
  assert.ok(!on(el.liedValues.querySelector('[data-v="4"]')));
  assert.ok(on(el.liedValues.querySelector('[data-dot]')));
  L.pen = { v: 16, dot: 0 };
  SB.renderSidebar();
  assert.equal(el.liedValues.querySelector('[data-dot]').disabled, !MODEL.canDot(16));
});

test('renderSidebar: Anzeige-Schalter folgen den Optionen, Rückgängig dem Verlauf', () => {
  opts.names = true; opts.colors = false; opts.autoZ = true; opts.lyrics = false;
  SB.renderSidebar();
  assert.ok(on(el.liedShowNames) && !on(el.liedShowColors) && on(el.liedShowCounts) && !on(el.liedShowLyrics));
  assert.equal(el.btnUndo.disabled, true);
  L.hist.push('{}');
  SB.renderSidebar();
  assert.equal(el.btnUndo.disabled, false);
  L.sel = 0;
  SB.renderSidebar();
  assert.equal(el.btnBreak.disabled, true);
  assert.equal(el.btnDel.disabled, false);
  L.sel = 4;
  SB.renderSidebar();
  assert.equal(el.btnDel.disabled, true, 'am Ende gibt es nichts zu löschen');
});
