// Menü (Slide-in): Lieder speichern und laden, Farben, Notenzeichen, Breite nach Notenlänge, Tempo, Bildschirm anlassen
import { THEMES, NOTE_BY, SWATCHES } from './config.js';
import { MELODIES, melodyRows } from './melodies.js';
import { S, settings, persistSettings } from './state.js';
import { loadSongs, deleteSong, loadAuto } from './storage.js';
import { render } from './render.js';
import { renderPalette } from './sidebar.js';
import { stopPlay } from './player.js';
import { closeSavePop } from './controls.js';
import { loadSong, saveAs } from './actions.js';
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
  shown = loadSongs(settings.mode);
  if (!shown.length) {
    el.songs.innerHTML = '<li><p class="empty">Noch keine Lieder gespeichert.</p></li>';
    return;
  }
  el.songs.innerHTML = shown.map((s, i) =>
    '<li class="song' + (s.name === S.name ? ' current' : '') + '">' +
    '<span class="name">' + esc(s.name) + '<span class="date">' + (s.savedAt ? dateOf(s.savedAt) : '') + '</span></span>' +
    '<button type="button" class="btn" data-load="' + i + '">Laden</button>' +
    '<button type="button" class="btn danger" data-del="' + i + '">Löschen</button></li>'
  ).join('');
}
function renderMelodies() {
  el.melodies.innerHTML = MELODIES.map((m, i) =>
    '<li class="song one' + (m.name === S.name ? ' current' : '') + '"><span class="name">' + esc(m.name) + '</span>' +
    '<button type="button" class="btn" data-melody="' + i + '">Laden</button></li>'
  ).join('');
}
function renderAuto() {
  const a = loadAuto(settings.mode);
  el.autoSec.hidden = !a;
  if (!a) return;
  el.autosave.innerHTML = '<span class="name">' + esc(a.name || 'Ohne Namen') + '<span class="date">' + (a.savedAt ? dateTimeOf(a.savedAt) : '') + '</span></span>' +
    '<button type="button" class="btn" data-auto>Laden</button>';
}

/* ---------- Einstellungen ---------- */
function renderThemes() {
  el.themes.innerHTML = THEMES.map((t) => {
    const sw = SWATCHES.map((id) => '<span style="--c:' + (t.colors[id] || NOTE_BY[id].bg) + '"></span>').join('');
    return '<button type="button" class="btn theme' + (t.id === settings.theme ? ' on' : '') + '" data-theme="' + t.id +
      '" aria-pressed="' + (t.id === settings.theme) + '">' + t.name +
      '<span class="desc">' + t.desc + '</span><span class="swatches">' + sw + '</span></button>';
  }).join('');
}
// An/Aus-Schalter im Menü für eine Einstellung; apply setzt sie um (sonst neu zeichnen)
const TOGGLES = [
  { key: 'lens', btn: el.btnLensToggle, state: el.lensToggleState },
  { key: 'prop', btn: el.btnPropToggle, state: el.propToggleState },
  { key: 'wake', btn: el.btnWakeToggle, state: el.wakeToggleState, apply: updateWake }
];
function renderToggle(t) {
  const on = settings[t.key];
  t.btn.classList.toggle('on', on);
  t.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  t.state.textContent = on ? 'an' : 'aus';
}
function renderTempo() { el.tempoOut.textContent = settings.tempo + ' pro Minute'; }

/* ---------- Öffnen und schließen ---------- */
function openMenu() {
  stopPlay();
  closeSavePop();
  el.songName.value = S.name;
  hint('');
  // Das Menü zeigt die Lieder des offenen Bereichs; die bekannten Lieder sind Melodien
  const mel = settings.mode === 'mel';
  el.drawerTitle.textContent = 'Menü · ' + (mel ? 'Melodie' : 'Rhythmus');
  el.saveTitle.textContent = mel ? 'Melodie speichern' : 'Rhythmus speichern';
  el.songsTitle.textContent = mel ? 'Gespeicherte Melodien' : 'Gespeicherte Rhythmen';
  el.melodiesSec.hidden = !mel;
  renderSongs();
  renderAuto();
  renderMelodies();
  renderThemes();
  TOGGLES.forEach(renderToggle);
  el.tempo.value = settings.tempo;
  renderTempo();
  el.backdrop.hidden = false;
  el.drawer.inert = false;
  el.drawer.classList.add('open');
  el.btnClose.focus();
}
function closeMenu() {
  disarm();
  el.songName.blur();
  el.drawer.classList.remove('open');
  el.drawer.inert = true;
  el.backdrop.hidden = true;
}
function loadFromMenu(song) {
  closeMenu();
  loadSong(song);
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
      deleteSong(settings.mode, victim.name);
      renderSongs();
      hint('„' + victim.name + '“ gelöscht.');
    });
  });
  delegate(el.melodies, '[data-melody]', (b) => {
    const m = MELODIES[+b.dataset.melody];
    if (m) loadFromMenu({ name: m.name, rows: melodyRows(m) });
  });
  delegate(el.autosave, '[data-auto]', () => {
    const a = loadAuto(settings.mode);
    if (a) loadFromMenu(a);
  });

  delegate(el.themes, '.theme', (b) => {
    settings.theme = b.dataset.theme;
    persistSettings();
    renderThemes();
    renderPalette();
    render();
  });
  TOGGLES.forEach((t) => t.btn.addEventListener('click', () => {
    settings[t.key] = !settings[t.key];
    persistSettings();
    renderToggle(t);
    (t.apply || render)();
  }));
  el.tempo.addEventListener('input', () => {
    settings.tempo = +el.tempo.value;
    renderTempo();
    persistSettings();
  });
}
