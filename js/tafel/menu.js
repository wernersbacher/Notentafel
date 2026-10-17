// Abschnitte der Tafel im Menü: Bekannte Lieder (nur Melodie), Farben, Notenzeichen, Breite nach Notenlänge
import { THEMES, NOTE_BY, SWATCHES } from './config.js';
import { MELODIES, melodyRows } from './melodies.js';
import { S, settings } from './state.js';
import { persistSettings } from '../core/settings.js';
import { closeMenu, renderToggle, toggleSetting } from '../core/menu.js';
import { esc, delegate } from '../core/ui.js';
import { render } from './render.js';
import { renderPalette } from './sidebar.js';
import { loadSong } from './actions.js';
import { el } from './dom.js';

function renderMelodies() {
  el.melodies.innerHTML = MELODIES.map((m, i) =>
    '<li class="song one' + (m.name === S.name ? ' current' : '') + '"><span class="name">' + esc(m.name) + '</span>' +
    '<button type="button" class="btn" data-melody="' + i + '">Laden</button></li>'
  ).join('');
}
function renderThemes() {
  el.themes.innerHTML = THEMES.map((t) => {
    const sw = SWATCHES.map((id) => '<span style="--c:' + (t.colors[id] || NOTE_BY[id].bg) + '"></span>').join('');
    return '<button type="button" class="btn theme' + (t.id === settings.theme ? ' on' : '') + '" data-theme="' + t.id +
      '" aria-pressed="' + (t.id === settings.theme) + '">' + t.name +
      '<span class="desc">' + t.desc + '</span><span class="swatches">' + sw + '</span></button>';
  }).join('');
}
const TOGGLES = [
  { key: 'lens', btn: el.btnLensToggle, state: el.lensToggleState },
  { key: 'prop', btn: el.btnPropToggle, state: el.propToggleState }
];

// Blendet die Abschnitte der Tafel ein; die bekannten Lieder sind Melodien
export function openTafelMenu() {
  el.drawer.querySelectorAll('[data-area="tafel"]').forEach((sec) => { sec.hidden = false; });
  el.melodiesSec.hidden = S.variant !== 'mel';
  renderMelodies();
  renderThemes();
  TOGGLES.forEach(renderToggle);
}

export function initTafelMenu() {
  delegate(el.melodies, '[data-melody]', (b) => {
    const m = MELODIES[+b.dataset.melody];
    if (!m) return;
    closeMenu();
    loadSong({ name: m.name, rows: melodyRows(m) });
  });
  delegate(el.themes, '.theme', (b) => {
    settings.theme = b.dataset.theme;
    persistSettings();
    renderThemes();
    renderPalette();
    render();
  });
  TOGGLES.forEach((t) => toggleSetting(t, render));
}
