// Menü (Slide-in) in zwei Gruppen: oben der offene Bereich (Lieder speichern und laden, seine eigenen Abschnitte und
// darunter seine Einstellungen), unten die Einstellungen für alle Bereiche (Tempo, Bildschirm anlassen).
// Eigene Abschnitte eines Bereichs tragen im HTML data-area und werden von ihm selbst eingeblendet.
import { settings, persistSettings } from './settings.js';
import { current, saveAs, closeSavePop } from './shell.js';
import { stopPlay } from './player.js';
import { esc, confirmTap, disarm, isArmed, delegate, onEnter } from './ui.js';
import { el } from './dom.js';
import { updateWake } from './wake.js';

function hint(text, warn) {
  el.saveHint.textContent = text;
  el.saveHint.classList.toggle('warn', !!warn);
}
const dateOf = (t) => new Date(t).toLocaleDateString('de-DE');
const dateTimeOf = (t) => new Date(t).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });

/* ---------- Listen ---------- */
// Die gespeicherten Lieder des offenen Bereichs, so wie sie gerade angezeigt werden
let shown = [];
function renderSongs() {
  disarm();
  const s = current().songs;
  shown = s.store.loadSongs();
  if (!shown.length) {
    el.songs.innerHTML = '<li><p class="empty">Noch keine Lieder gespeichert.</p></li>';
    return;
  }
  const name = s.name();
  el.songs.innerHTML = shown.map((x, i) =>
    '<li class="song' + (x.name === name ? ' current' : '') + '">' +
    '<span class="name">' + esc(x.name) + '<span class="date">' + (x.savedAt ? dateOf(x.savedAt) : '') + '</span></span>' +
    '<button type="button" class="btn" data-load="' + i + '">Laden</button>' +
    '<button type="button" class="btn danger" data-del="' + i + '">Löschen</button></li>'
  ).join('');
}
function renderAuto() {
  const a = current().songs.store.loadAuto();
  el.autoSec.hidden = !a;
  if (!a) return;
  el.autosave.innerHTML = '<span class="name">' + esc(a.name || 'Ohne Namen') + '<span class="date">' + (a.savedAt ? dateTimeOf(a.savedAt) : '') + '</span></span>' +
    '<button type="button" class="btn" data-auto>Laden</button>';
}

/* ---------- Einstellungen ---------- */
// An/Aus-Schalter im Menü; renderToggle und toggleSetting nutzen auch die Bereiche für ihre eigenen Schalter.
// t = { key, btn, state }; liegt die Einstellung nicht in den gemeinsamen, kommen obj und save (zum Speichern) dazu.
export function renderToggle(t) {
  const on = (t.obj || settings)[t.key];
  t.btn.classList.toggle('on', on);
  t.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  t.state.textContent = on ? 'an' : 'aus';
}
// apply setzt die Einstellung um, nachdem sie umgeschaltet und gespeichert wurde
export function toggleSetting(t, apply) {
  t.btn.addEventListener('click', () => {
    const obj = t.obj || settings;
    obj[t.key] = !obj[t.key];
    (t.save || persistSettings)();
    renderToggle(t);
    apply();
  });
}
const WAKE = { key: 'wake', btn: el.btnWakeToggle, state: el.wakeToggleState };
const COUNT_IN = { key: 'countIn', btn: el.btnCountInToggle, state: el.countInToggleState };
const METRO = { key: 'metro', btn: el.btnMetroToggle, state: el.metroToggleState };
function renderTempo() { el.tempoOut.textContent = settings.tempo + ' pro Minute'; }

/* ---------- Öffnen und schließen ---------- */
function openMenu() {
  const a = current(), s = a.songs;
  stopPlay();
  closeSavePop();
  hint('');
  el.menuAreaTitle.textContent = a.label;
  el.menuSettingsTitle.textContent = 'Einstellungen für ' + a.label;
  el.menuSettings.hidden = !a.menu;
  el.saveSec.hidden = el.songsSec.hidden = !s;
  el.autoSec.hidden = true;
  if (s) {
    el.songName.value = s.name();
    el.saveTitle.textContent = s.texts.save;
    el.songsTitle.textContent = s.texts.songs;
    renderSongs();
    renderAuto();
  }
  el.drawer.querySelectorAll('[data-area]').forEach((sec) => { sec.hidden = true; });
  if (a.menu) a.menu.open();
  renderToggle(WAKE);
  renderToggle(COUNT_IN);
  renderToggle(METRO);
  el.tempo.value = settings.tempo;
  renderTempo();
  el.backdrop.hidden = false;
  el.drawer.inert = false;
  el.drawer.classList.add('open');
  el.btnClose.focus();
}
export function closeMenu() {
  disarm();
  el.songName.blur();
  el.drawer.classList.remove('open');
  el.drawer.inert = true;
  el.backdrop.hidden = true;
}
function loadFromMenu(song) {
  closeMenu();
  current().songs.load(song);
}
function saveSong() {
  saveAs(el.songName, el.btnSave, (text, warn) => { if (!warn) renderSongs(); hint(text, warn); });
}

export function initMenu() {
  el.btnMenu.addEventListener('click', openMenu);
  el.btnClose.addEventListener('click', closeMenu);
  el.backdrop.addEventListener('click', closeMenu);

  el.btnSave.addEventListener('click', saveSong);
  onEnter(el.songName, saveSong);
  el.songName.addEventListener('input', () => { if (isArmed(el.btnSave)) disarm(); });

  delegate(el.songs, '[data-load]', (b) => { const s = shown[+b.dataset.load]; if (s) loadFromMenu(s); });
  delegate(el.songs, '[data-del]', (b) => {
    const victim = shown[+b.dataset.del];
    if (!victim) return;
    confirmTap(b, 'Sicher?', () => {
      current().songs.store.deleteSong(victim.name);
      renderSongs();
      hint('„' + victim.name + '“ gelöscht.');
    });
  });
  delegate(el.autosave, '[data-auto]', () => {
    const a = current().songs.store.loadAuto();
    if (a) loadFromMenu(a);
  });

  toggleSetting(WAKE, updateWake);
  toggleSetting(COUNT_IN, () => {});
  toggleSetting(METRO, () => {});
  el.tempo.addEventListener('input', () => {
    settings.tempo = +el.tempo.value;
    renderTempo();
    persistSettings();
  });
}
