// Seitenleiste (Slide-in) für Liedersammlung und Einstellungen; früher ein gemeinsames Menü, jetzt zwei Knöpfe. Gruppen: oben der offene Bereich (Lieder speichern und laden, seine eigenen Abschnitte und
// darunter seine Einstellungen), unten die Einstellungen für alle Bereiche (Tempo, Bildschirm anlassen).
// Eigene Abschnitte eines Bereichs tragen im HTML data-area und werden von ihm selbst eingeblendet.
// Die Abschnitte liegen in menu-songs.js und menu-settings.js; diese Datei öffnet und schließt die Leiste und führt sie zusammen.
import { settings } from './settings.js';
import { current, closeSavePop, playing } from './shell.js';
import { stopPlay } from './player.js';
import { disarm } from './ui.js';
import { el } from './dom.js';
import {
  hint, backupHint, clearRenaming, initSongs, renderSongs, refreshSongs, renderAuto, renderSort, sortAbc, searchAll
} from './menu-songs.js';
import { renderToggle, toggleSetting, applyUiScale, renderTempo, WAKE, initSettings } from './menu-settings.js';
// Wie bisher aus menu.js erreichbar, weil die Bereiche und account.js von hier importieren
export { refreshSongs, sortAbc, renderToggle, toggleSetting };

/* ---------- Öffnen und schließen ---------- */
// mode 'songs' (Liedersammlung) oder 'settings' (Einstellungen): beide nutzen dieselbe Seitenleiste, jeder zeigt nur
// seine Abschnitte (data-part im HTML)
function openMenu(mode) {
  const a = current(), s = a.songs;
  el.drawer.dataset.mode = mode;
  el.drawerTitle.textContent = mode === 'songs' ? 'Liedersammlung' : 'Einstellungen';
  stopPlay();
  closeSavePop();
  hint('');
  backupHint('');
  clearRenaming();
  el.menuAreaTitle.textContent = a.label;
  el.menuSettingsTitle.textContent = 'Einstellungen für ' + a.label;
  el.menuSettings.hidden = !a.menu;
  el.saveSec.hidden = el.songsSec.hidden = !s;
  // Die Übungstafel wird nicht gespeichert; Laden wechselt zurück zum Schreiben
  if (playing()) el.saveSec.hidden = true;
  el.autoSec.hidden = true;
  if (s) {
    el.songName.value = s.name();
    el.saveTitle.textContent = s.texts.save;
    el.songsTitle.textContent = s.texts.songs;
    renderSongs();
    renderAuto();
  }
  el.drawer.querySelectorAll('[data-area]').forEach((sec) => { sec.hidden = true; });
  el.drawer.querySelectorAll('.songsearch').forEach((i) => { i.value = ''; });
  if (a.menu) a.menu.open();
  searchAll();
  renderSort();
  renderToggle(WAKE);
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
  el.drawer.querySelectorAll('.songsearch').forEach((i) => i.blur());
  el.drawer.classList.remove('open');
  el.drawer.inert = true;
  el.backdrop.hidden = true;
}

export function initMenu() {
  applyUiScale();
  el.btnSongs.addEventListener('click', () => openMenu('songs'));
  el.btnSettings.addEventListener('click', () => openMenu('settings'));
  el.btnClose.addEventListener('click', closeMenu);
  el.backdrop.addEventListener('click', closeMenu);

  initSongs(closeMenu);
  initSettings();
}
