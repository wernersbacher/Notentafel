// Bereich Lied: echtes Notenblatt mit Violinschlüssel. Meldet sich beim Kern an und verdrahtet die Leiste.
import { register, setPlay } from '../core/shell.js';
import { renderToggle, toggleSetting, closeMenu, sortAbc } from '../core/menu.js';
import { confirmTap, delegate, esc, groupedHTML, lockLibrary, toast, downloadFile, onEnter, setPressed } from '../core/ui.js';
import { settings, setTempo } from '../core/settings.js';
import { playPlan, QUARTER } from './model.js';
import { beatsOf, startAt, cutAt, skip } from '../core/plan.js';
import { store } from './storage.js';
import { songOf } from './songs.js';
import { songToMusicXML, fileNameOf } from './musicxml.js';
import { printHTML } from './print.js';
import { L, opts, persistOpts, written, startPractice, endPractice, resetPractice } from './state.js';
import { render, renderSheet, markPlaying, isFolded } from './render.js';
import { buildPanel, buildSteps } from './sidebar.js';
import { initSheetInput } from './input.js';
import { initLiedQuiz } from './quiz.js';
import { initLiedGames } from './games.js';
import { endGame } from '../core/game.js';
import * as act from './actions.js';
import { el } from './dom.js';
import { plan, onTier } from '../core/tier.js';
import { known, loadKnown, onKnown } from '../core/known.js';

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
  el.liedShowLyrics.addEventListener('click', act.toggleLyrics);
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

// Bekannte Lieder im Menü; das gerade geladene ist hervorgehoben. Ohne Pro (Funktion known) zeigt der Abschnitt nur die Karte
// „Mit Pro“, die Lieder selbst kommen vom Server (core/known.js)
export function renderKnown() {
  const locked = !plan.has('known');
  lockLibrary(el.liedSongs, locked);
  el.liedSongs.innerHTML = locked ? '' : groupedHTML(known().lied, (s, i) =>
    '<li class="song one' + (s.name === L.name ? ' current' : '') + '"><span class="name">' + esc(s.name) + '</span>' +
    '<button type="button" class="btn" data-known="' + i + '">Laden</button></li>', sortAbc()
  );
}

// Notengröße: drei Knöpfe, der gewählte ist hervorgehoben
function renderSizes() {
  el.liedSizes.querySelectorAll('[data-size]').forEach((b) => setPressed(b, +b.dataset.size === opts.size));
}

// MusicXML ist Pro: ohne bleibt der Knopf sichtbar, trägt „Mit Pro“ und ist gesperrt (aria-disabled statt disabled,
// damit ein Tipp den Grund zeigt)
export function renderExportLock() {
  const locked = !plan.has('export'), b = el.btnLiedExport;
  b.classList.toggle('locked', locked);
  if (locked) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
  let tag = b.querySelector('.pro-tag');
  if (locked && !tag) { tag = document.createElement('span'); tag.className = 'pro-tag'; tag.textContent = 'Mit Pro'; b.append(tag); }
  else if (!locked && tag) tag.remove();
}

// Lädt das Lied als MusicXML-Datei herunter
// (auch beim Üben das geschriebene Lied, nicht die Übungstafel)
function exportMusicXML() {
  if (!plan.has('export')) { toast('MusicXML gibt es mit Pro.', true); return; }
  const { song, name } = written();
  if (!song.ev.length) { toast('Das Lied ist noch leer.', true); return; }
  const xml = songToMusicXML(song, { name, autoBar: opts.autoBar, tempo: settings.tempo });
  downloadFile(fileNameOf(name), xml, 'application/vnd.recordare.musicxml+xml');
  closeMenu();
  toast('Als MusicXML gespeichert.');
}

// Druckansicht füllen und den Druckdialog öffnen (dort „Als PDF speichern“)
function printSheet() {
  const { song, name } = written();
  if (!song.ev.length) { toast('Das Lied ist noch leer.', true); return; }
  el.printOut.innerHTML = printHTML(song, { name,autoBar: opts.autoBar, names: opts.names, colors: opts.colors, counts: opts.autoZ, lyrics: opts.lyrics, wrap: opts.wrap, size: opts.size, watermark: plan.has('export') ? '' : 'Musiktafel Lite' });
  closeMenu();
  window.print();
}

export function registerLied() {
  buildPanel();
  initControls();
  initLiedQuiz();
  initLiedGames();
  toggleSetting(NAMES, render);
  toggleSetting(COLORS, render);
  toggleSetting(CHECK, render);
  // Dieselben Schalter als Knöpfe in der Leiste
  el.liedShowNames.addEventListener('click', () => { opts.names = !opts.names; persistOpts(); render(); });
  el.liedShowColors.addEventListener('click', () => { opts.colors = !opts.colors; persistOpts(); render(); });
  toggleSetting(WRAP, render);
  delegate(el.liedSongs, '[data-known]', (b) => {
    const s = known().lied[+b.dataset.known];
    if (!s) return;
    closeMenu();
    setPlay(false);
    setTempo(s.tempo);
    act.loadSong(songOf(s));
  });
  el.btnLiedExport.addEventListener('click', exportMusicXML);
  onTier(renderExportLock);
  onKnown(renderKnown); // die Lieder sind da, oder die Stufe hat sich geändert
  el.btnLiedPrint.addEventListener('click', printSheet);
  delegate(el.liedSizes, '[data-size]', (b) => { opts.size = +b.dataset.size; persistOpts(); renderSizes(); render(); });
  register({
    id: 'lied', label: 'Notenblatt', panel: el.panelLied, board: el.sheet,
    enter() { L.insertMode = false; render(); },
    // Das Tonnamen-Quiz gehört zum Notenblatt und endet beim Wechsel
    leave: endGame,
    write: 'Lied schreiben',
    play: { enter: startPractice, leave: endPractice, clear: resetPractice },
    tools: {
      insert: act.toggleInsert,
      gap: act.removeEv,
      del: act.deleteEv,
      brk: act.lineBreak,
      undo: act.undo,
      redo: act.redo,
      addRow: act.addLine,
      // − Zeile (wenn in der Zeile Noten stehen) und Alles löschen muss man zweimal antippen
      delRow: (btn) => { if (act.lastLineHasNotes()) confirmTap(btn, 'Sicher? Nochmal', act.delLine); else act.delLine(); },
      clear: (btn) => confirmTap(btn, 'Sicher? Nochmal tippen', act.clearAll)
    },
    // Ab der Markierung (steht sie hinter der letzten Note, von vorn), mit Zählschlag und Auftakt für den Player
    receive: act.receiveSong,
    plan: () => {
      let p = { ...playPlan(L.song, opts.autoBar), ...beatsOf(L.song.meter), barStart: L.song.pickup / QUARTER };
      // Eingeklappte Zeilen werden übersprungen; was unter dem Tuch liegt, klingt noch nicht
      p = skip(p, (s) => isFolded(s.pos));
      const k = act.coverIndex();
      if (k >= 0) p = cutAt(p, (s) => s.pos >= k);
      return startAt(p, p.items.findIndex((s) => s.pos >= L.sel));
    },
    mark: markPlaying,
    cover: { from: act.coverFrom, card: act.toggleCard, name: act.toggleNameCard, names: act.toggleAllNames, reset: act.resetCover, clear: act.clearCover },
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
        loadKnown(); // hat beim Start nicht geklappt: noch einmal versuchen
        renderExportLock();
      }
    }
  });
}
