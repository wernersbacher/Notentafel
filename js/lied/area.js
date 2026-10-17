// Bereich Lied: echtes Notenblatt mit Violinschlüssel. Meldet sich beim Kern an und verdrahtet die Leiste.
import { register } from '../core/shell.js';
import { renderToggle, toggleSetting } from '../core/menu.js';
import { confirmTap, popover, delegate } from '../core/ui.js';
import { playPlan } from './model.js';
import { store } from './storage.js';
import { L, opts, persistOpts } from './state.js';
import { render, renderSheet, markPlaying } from './render.js';
import { buildPanel, fillTaktPop } from './sidebar.js';
import * as act from './actions.js';
import { el } from './dom.js';

let taktPop;

function initControls() {
  delegate(el.liedSteps, '[data-step]', (b) => act.placePitch(+b.dataset.step));
  delegate(el.liedValues, '[data-v]', (b) => act.setValue(+b.dataset.v));
  delegate(el.liedValues, '[data-dot]', act.toggleDot);
  el.liedRest.addEventListener('click', act.placeRest);
  el.liedTie.addEventListener('click', act.toggleTie);
  el.liedSharp.addEventListener('click', () => act.setAcc(1));
  el.liedFlat.addEventListener('click', () => act.setAcc(-1));
  el.liedNat.addEventListener('click', () => act.setAcc(0));
  el.liedUp.addEventListener('click', () => act.shift(1));
  el.liedDown.addEventListener('click', () => act.shift(-1));

  taktPop = popover(el.liedTaktPop, el.liedTakt, { onOpen: fillTaktPop });
  delegate(el.liedTaktPop, '[data-m]', (b) => act.setMeter(b.dataset.m));
  delegate(el.liedTaktPop, '[data-bar]', (b) => act.toggleBar(+b.dataset.bar));
  delegate(el.liedTaktPop, '[data-pk]', (b) => act.setPickup(+b.dataset.pk));
  delegate(el.liedTaktPop, '[data-auto]', act.toggleAutoBar);
  delegate(el.liedTaktPop, '[data-autoz]', act.toggleAutoZ);

  // Antippen auf dem Notenblatt markiert den Platz darunter
  el.sheet.addEventListener('click', (e) => {
    const hit = e.target.closest('[data-i]');
    if (hit) act.select(+hit.dataset.i);
  });
  // Ändert sich die Breite, wird neu eingeteilt
  let width = 0;
  new ResizeObserver(() => {
    if (el.sheet.hidden || el.sheet.clientWidth === width) return;
    width = el.sheet.clientWidth;
    renderSheet();
  }).observe(el.sheet);
}

const NAMES = { key: 'names', btn: el.btnNamesToggle, state: el.namesToggleState, obj: opts, save: persistOpts };

export function registerLied() {
  buildPanel();
  initControls();
  toggleSetting(NAMES, render);
  register({
    id: 'lied', label: 'Lied', panel: el.panelLied, board: el.sheet,
    enter() { L.insertMode = false; L.clean = false; render(); },
    leave: () => taktPop.close(),
    tools: {
      insert: act.toggleInsert,
      del: act.deleteEv,
      brk: act.lineBreak,
      done: act.toggleClean,
      undo: act.undo,
      clear: (btn) => confirmTap(btn, 'Sicher? Nochmal tippen', act.clearAll)
    },
    plan: () => playPlan(L.song),
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
      }
    }
  });
}
