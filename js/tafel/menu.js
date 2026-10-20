// Abschnitte der Tafel im Menü: Bekannte Lieder (nur Melodie), Notenzeichen.
// Die Einstellungen gelten jeweils für die offene Tafel; settings aus state.js wechselt mit ihr.
import { MELODIES, melodyRows } from './melodies.js';
import { S, settings } from './state.js';
import { setTempo } from '../core/settings.js';
import { closeMenu, renderToggle, toggleSetting, sortAbc } from '../core/menu.js';
import { esc, delegate, toast, groupedHTML } from '../core/ui.js';
import { handOver, playing, setPlay } from '../core/shell.js';
import { hasNotes, rowsToSong } from './model.js';
import { render } from './render.js';
import { loadSong } from './actions.js';
import { el } from './dom.js';

function renderMelodies() {
  el.melodies.innerHTML = groupedHTML(MELODIES, (m, i) =>
    '<li class="song one' + (m.name === S.name ? ' current' : '') + '"><span class="name">' + esc(m.name) + '</span>' +
    '<button type="button" class="btn" data-melody="' + i + '">Laden</button></li>', sortAbc()
  );
}
const TOGGLES = [
  { key: 'lens', btn: el.btnLensToggle, state: el.lensToggleState, get obj() { return settings; } }
];

// Blendet die Abschnitte der Tafel ein; die bekannten Lieder sind Melodien
export function openTafelMenu() {
  el.drawer.querySelectorAll('[data-area="tafel"]').forEach((sec) => { sec.hidden = false; });
  el.melodiesSec.hidden = S.variant !== 'mel';
  el.btnToLied.closest('section').hidden = playing(); // die Übungstafel geht nicht ins Notenblatt
  renderMelodies();
  TOGGLES.forEach(renderToggle);
}

export function initTafelMenu() {
  delegate(el.melodies, '[data-melody]', (b) => {
    const m = MELODIES[+b.dataset.melody];
    if (!m) return;
    closeMenu();
    setPlay(false);
    setTempo(m.tempo);
    loadSong({ name: m.name, rows: melodyRows(m) });
  });
  TOGGLES.forEach((t) => toggleSetting(t, render));
  // Ins Notenblatt übernehmen: im Menü und unten in der Leiste
  const toLied = () => {
    if (!hasNotes(S.rows)) { toast('Auf der Tafel steht noch nichts.', true); return; }
    closeMenu();
    handOver('lied', { name: S.name, song: rowsToSong(S.rows), colors: S.variant === 'mel' });
  };
  el.btnToLied.addEventListener('click', toLied);
  el.btnToLiedSide.addEventListener('click', toLied);
}
