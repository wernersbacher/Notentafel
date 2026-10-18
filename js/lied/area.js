// Bereich Lied: echtes Notenblatt mit Violinschlüssel. Meldet sich beim Kern an und verdrahtet die Leiste.
import { register } from '../core/shell.js';
import { renderToggle, toggleSetting, closeMenu, sortAbc } from '../core/menu.js';
import { confirmTap, delegate, esc, groupedHTML, toast, downloadFile, onEnter } from '../core/ui.js';
import { settings, setTempo } from '../core/settings.js';
import { playPlan, QUARTER } from './model.js';
import { beatsOf, startAt } from '../core/plan.js';
import { store } from './storage.js';
import { SONGS, songOf } from './songs.js';
import { songToMusicXML, fileNameOf } from './musicxml.js';
import { printHTML } from './print.js';
import { L, opts, persistOpts } from './state.js';
import { render, renderSheet, markPlaying } from './render.js';
import { buildPanel, buildSteps } from './sidebar.js';
import { initSheetInput } from './input.js';
import * as act from './actions.js';
import { el } from './dom.js';

function initControls() {
  delegate(el.liedSteps, '[data-p]', (b) => act.placePitch(b.dataset.p));
  delegate(el.liedValues, '[data-v]', (b) => act.setValue(+b.dataset.v));
  delegate(el.liedValues, '[data-dot]', act.toggleDot);
  delegate(el.liedRests, '[data-rv]', (b) => act.placeRest(+b.dataset.rv));
  el.liedTie.addEventListener('click', act.toggleTie);
  el.liedSharp.addEventListener('click', () => act.setAcc(1));
  el.liedFlat.addEventListener('click', () => act.setAcc(-1));
  el.liedNat.addEventListener('click', () => act.setAcc(0));

  delegate(el.liedMeters, '[data-m]', (b) => act.setMeter(b.dataset.m));
  delegate(el.liedPickups, '[data-pk]', (b) => act.setPickup(+b.dataset.pk));
  // Liedtext: tippen schreibt die Silbe der markierten Note, Eingabe oder „weiter“ springt zur nächsten
  el.liedLyric.addEventListener('focus', act.beginLyric);
  el.liedLyric.addEventListener('input', () => act.setLyric(el.liedLyric.value));
  const nextLyric = () => {
    if (!act.nextLyric()) { el.liedLyric.blur(); return; }
    el.liedLyric.value = L.song.ev[L.sel].ly || '';
    act.beginLyric();
    el.liedLyric.focus();
    el.liedLyric.select();
  };
  onEnter(el.liedLyric, nextLyric);
  el.liedLyricNext.addEventListener('click', nextLyric);
  el.liedKeyDown.addEventListener('click', () => act.stepKey(-1));
  el.liedKeyUp.addEventListener('click', () => act.stepKey(1));
  el.btnTransDown.addEventListener('click', () => act.transposeSong(-1));
  el.btnTransUp.addEventListener('click', () => act.transposeSong(1));
  el.btnToMelody.addEventListener('click', act.sendToMelody);
  // Töne der kleinen und dreigestrichenen Oktave ein- und ausklappen
  el.liedMore.addEventListener('click', () => { opts.allTones = !opts.allTones; persistOpts(); buildSteps(); });
  el.liedBar.addEventListener('click', () => act.toggleBar(1));
  el.liedEnd.addEventListener('click', () => act.toggleBar(2));
  el.liedRepStart.addEventListener('click', () => act.toggleRepeat('start'));
  el.liedRepEnd.addEventListener('click', () => act.toggleRepeat('end'));
  el.liedVolta.addEventListener('click', act.toggleVolta);
  el.liedShowCounts.addEventListener('click', act.toggleAutoZ);
  el.btnAutoBarToggle.addEventListener('click', () => { act.toggleAutoBar(); renderToggle(AUTOBAR); });
  // Taktstriche automatisch oder von Hand, auch in der Leiste (Block 1)
  const setAutoBar = (on) => { if (opts.autoBar !== on) { act.toggleAutoBar(); renderToggle(AUTOBAR); } };
  el.liedBarAuto.addEventListener('click', () => setAutoBar(true));
  el.liedBarHand.addEventListener('click', () => setAutoBar(false));

  initSheetInput();
  // Ändert sich die Breite, wird neu eingeteilt
  let width = 0;
  new ResizeObserver(() => {
    if (el.sheet.hidden || el.sheet.clientWidth === width) return;
    width = el.sheet.clientWidth;
    renderSheet();
  }).observe(el.sheet);
}

const NAMES = { key: 'names', btn: el.btnNamesToggle, state: el.namesToggleState, obj: opts, save: persistOpts };
const AUTOBAR = { key: 'autoBar', btn: el.btnAutoBarToggle, state: el.autoBarToggleState, obj: opts };
const COLORS = { key: 'colors', btn: el.btnColorsToggle, state: el.colorsToggleState, obj: opts, save: persistOpts };
const CHECK = { key: 'check', btn: el.btnCheckToggle, state: el.checkToggleState, obj: opts, save: persistOpts };
const WRAP = { key: 'wrap', btn: el.btnWrapToggle, state: el.wrapToggleState, obj: opts, save: persistOpts };

// Bekannte Lieder im Menü; das gerade geladene ist hervorgehoben
function renderKnown() {
  el.liedSongs.innerHTML = groupedHTML(SONGS, (s, i) =>
    '<li class="song one' + (s.name === L.name ? ' current' : '') + '"><span class="name">' + esc(s.name) + '</span>' +
    '<button type="button" class="btn" data-known="' + i + '">Laden</button></li>', sortAbc()
  );
}

// Notengröße: drei Knöpfe, der gewählte ist hervorgehoben
function renderSizes() {
  el.liedSizes.querySelectorAll('[data-size]').forEach((b) => {
    const on = +b.dataset.size === opts.size;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

// Lädt das Lied als MusicXML-Datei herunter
function exportMusicXML() {
  if (!L.song.ev.length) { toast('Das Lied ist noch leer.', true); return; }
  const xml = songToMusicXML(L.song, { name: L.name, autoBar: opts.autoBar, tempo: settings.tempo });
  downloadFile(fileNameOf(L.name), xml, 'application/vnd.recordare.musicxml+xml');
  closeMenu();
  toast('Als MusicXML gespeichert.');
}

// Druckansicht füllen und den Druckdialog öffnen (dort „Als PDF speichern“)
function printSheet() {
  if (!L.song.ev.length) { toast('Das Lied ist noch leer.', true); return; }
  el.printOut.innerHTML = printHTML(L.song, { name: L.name, autoBar: opts.autoBar, names: opts.names, colors: opts.colors, counts: opts.autoZ, wrap: opts.wrap, size: opts.size });
  closeMenu();
  window.print();
}

export function registerLied() {
  buildPanel();
  initControls();
  toggleSetting(NAMES, render);
  toggleSetting(COLORS, render);
  toggleSetting(CHECK, render);
  // Dieselben Schalter als Knöpfe in der Leiste
  el.liedShowNames.addEventListener('click', () => { opts.names = !opts.names; persistOpts(); render(); });
  el.liedShowColors.addEventListener('click', () => { opts.colors = !opts.colors; persistOpts(); render(); });
  toggleSetting(WRAP, render);
  delegate(el.liedSongs, '[data-known]', (b) => {
    const s = SONGS[+b.dataset.known];
    if (!s) return;
    closeMenu();
    setTempo(s.tempo);
    act.loadSong(songOf(s));
  });
  el.btnLiedExport.addEventListener('click', exportMusicXML);
  el.btnLiedPrint.addEventListener('click', printSheet);
  delegate(el.liedSizes, '[data-size]', (b) => { opts.size = +b.dataset.size; persistOpts(); renderSizes(); render(); });
  register({
    id: 'lied', label: 'Notenblatt', panel: el.panelLied, board: el.sheet,
    enter() { L.insertMode = false; render(); },
    tools: {
      insert: act.toggleInsert,
      gap: act.removeEv,
      del: act.deleteEv,
      brk: act.lineBreak,
      undo: act.undo,
      clear: (btn) => confirmTap(btn, 'Sicher? Nochmal tippen', act.clearAll)
    },
    // Ab der Markierung (steht sie hinter der letzten Note, von vorn), mit Zählschlag und Auftakt für den Player
    receive: act.receiveSong,
    plan: () => {
      const p = { ...playPlan(L.song, opts.autoBar), ...beatsOf(L.song.meter), barStart: L.song.pickup / QUARTER };
      return startAt(p, p.items.findIndex((s) => s.pos >= L.sel));
    },
    mark: markPlaying,
    songs: {
      store,
      texts: { save: 'Lied speichern', songs: 'Gespeicherte Lieder' },
      name: () => L.name,
      data: () => L.song,
      saved(n) { L.name = n; store.saveBoard(L.song, L.name); },
      load: act.loadSong
    },
    menu: {
      open() {
        el.drawer.querySelectorAll('[data-area="lied"]').forEach((sec) => { sec.hidden = false; });
        renderToggle(NAMES);
        renderToggle(COLORS);
        renderToggle(AUTOBAR);
        renderToggle(CHECK);
        renderToggle(WRAP);
        renderSizes();
        renderKnown();
      }
    }
  });
}
