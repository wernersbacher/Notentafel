// Zeichnet Notenblatt und Leiste neu (render) und schließt Änderungen ab (commit)
import { stopPlay, playingPos } from '../core/player.js';
import { isNote } from './model.js';
import { layout } from './layout.js';
import { sheetSVG } from './sheet.js';
import { L, opts, persistSong } from './state.js';
import { renderSidebar } from './sidebar.js';
import { el } from './dom.js';

// Größe eines Linienabstands in Pixeln: so groß wie möglich, bis die längste Zeile die Breite füllt.
// Passt sie auch bei der kleinsten Größe nicht, lässt sich das Notenblatt seitlich wischen.
const SP = { min: 8, max: 20 };

export function renderSheet() {
  const lay = layout(L.song, { autoBar: opts.autoBar });
  const avail = el.sheet.clientWidth || 600, U = Math.max(...lay.systems.map((s) => s.width));
  const sp = Math.max(SP.min, Math.min(SP.max, avail / U)), W = Math.max(U, avail / sp - 0.1);
  const last = !L.clean && L.last != null && isNote(L.song.ev[L.last]) ? L.last : -1;
  const pos = playingPos();
  const { svg, height } = sheetSVG(L.song, lay, {
    width: W, sel: L.sel, clean: L.clean, insert: L.insertMode, names: opts.names, target: last, playing: pos == null ? -1 : pos
  });
  el.sheet.innerHTML = '<svg class="score' + (L.clean ? ' clean' : '') + '" width="' + Math.floor(W * sp) + '" height="' + Math.ceil(height * sp) +
    '" viewBox="0 0 ' + W + ' ' + height + '" fill="currentColor" role="img" aria-label="Notenblatt">' + svg + '</svg>';
  showMark();
}
// Holt die Markierung ins Bild, wenn sie außerhalb liegt (z. B. nach dem Schreiben am unteren Rand)
function showMark() {
  const c = el.sheet.querySelector('.cur');
  if (!c) return;
  const r = c.getBoundingClientRect(), b = el.sheet.getBoundingClientRect();
  if (r.bottom > b.bottom) el.sheet.scrollTop += r.bottom - b.bottom + 8;
  else if (r.top < b.top) el.sheet.scrollTop -= b.top - r.top + 8;
  if (r.right > b.right) el.sheet.scrollLeft += r.right - b.right + 8;
  else if (r.left < b.left) el.sheet.scrollLeft -= b.left - r.left + 8;
}

export function render() {
  renderSheet();
  renderSidebar();
}

// Nach jeder Änderung: Abspielen stoppen, Markierung wieder einblenden, speichern, neu zeichnen
export function commit() {
  stopPlay();
  L.clean = false;
  persistSong();
  render();
}

// Hebt beim Abspielen das klingende Zeichen hervor (i = null: keins)
export function markPlaying(i) {
  const old = el.sheet.querySelector('.ev.playing');
  if (old) old.classList.remove('playing');
  const now = i != null && el.sheet.querySelector('.ev[data-i="' + i + '"]');
  if (now) now.classList.add('playing');
}
