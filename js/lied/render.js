// Zeichnet Notenblatt und Leiste neu (render) und schließt Änderungen ab (commit)
import { stopPlay, playingPos } from '../core/player.js';
import { sideCollapsed } from '../core/shell.js';
import { isNote } from './model.js';
import { layout, widestMeasure } from './layout.js';
import { sheetSVG } from './sheet.js';
import { L, opts, persistSong } from './state.js';
import { renderSidebar } from './sidebar.js';
import { el } from './dom.js';

// Größe eines Linienabstands in Pixeln je nach Notengröße (normal, groß, sehr groß).
// Mit automatischem Umbruch steht sie fest (WRAP) und die Zeilen werden so umbrochen, dass sie in die Breite passen;
// kleiner wird sie nur, wenn sonst nicht einmal der breiteste Takt in eine Zeile passt (aber nicht unter 8 Pixel).
// Ohne: so groß wie möglich, bis die längste Zeile die Breite füllt, aber nie kleiner als das Minimum der Stufe (SP);
// passt eine Zeile dann nicht, lässt sich das Notenblatt seitlich wischen.
const WRAP = { 1: 14, 2: 20, 3: 28 };
const SP = { 1: [8, 20], 2: [16, 28], 3: [22, 36] };
// Aktuelle Größe eines Linienabstands in Pixeln (zum Umrechnen beim Ziehen)
export let spPx = 16;

export function renderSheet() {
  const avail = el.sheet.clientWidth || 600, o = { autoBar: opts.autoBar, counts: opts.autoZ, check: opts.check };
  let lay, sp;
  if (opts.wrap) {
    sp = Math.max(8, Math.min(WRAP[opts.size], avail / (widestMeasure(L.song, o) + 0.2)));
    lay = layout(L.song, { ...o, width: avail / sp - 0.1 });
  } else {
    lay = layout(L.song, o);
    const [min, max] = SP[opts.size];
    sp = Math.max(min, Math.min(max, avail / Math.max(...lay.systems.map((s) => s.width))));
  }
  const W = Math.max(...lay.systems.map((s) => s.width), avail / sp - 0.1);
  spPx = sp;
  // Eingeklappte Leiste: Bearbeiten beendet, ohne Markierung und leeren Platz
  const clean = sideCollapsed();
  const last = !clean && L.last != null && isNote(L.song.ev[L.last]) ? L.last : -1;
  const pos = playingPos();
  const { svg, height } = sheetSVG(L.song, lay, {
    width: W, sel: L.sel, clean, insert: L.insertMode, names: opts.names, colors: opts.colors, counts: opts.autoZ,
    target: last, playing: pos == null ? -1 : pos
  });
  el.sheet.innerHTML = '<svg class="score' + (clean ? ' clean' : '') + '" width="' + Math.floor(W * sp) + '" height="' + Math.ceil(height * sp) +
    '" viewBox="0 0 ' + W + ' ' + height + '" fill="currentColor" role="img" aria-label="Notenblatt">' + svg + '</svg>';
  placeGrabber();
  showMark();
}
// Über die markierte Note kommt ein unsichtbares HTML-Feld zum Ziehen. Anders als SVG-Elemente beachten es alle
// Browser mit touch-action: none, sodass der Finger dort zieht statt zu scrollen.
function placeGrabber() {
  const g = el.sheet.querySelector('.hit.grab');
  if (!g) return;
  const r = g.getBoundingClientRect(), b = el.sheet.getBoundingClientRect(), d = document.createElement('div');
  d.className = 'grabber';
  d.dataset.i = g.dataset.i;
  d.style.cssText = 'left:' + (r.left - b.left + el.sheet.scrollLeft) + 'px;top:' + (r.top - b.top + el.sheet.scrollTop) + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
  el.sheet.appendChild(d);
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
  persistSong();
  render();
}

// Hebt beim Abspielen das klingende Zeichen hervor (i = null: keins)
// Hebt beim Abspielen die klingende Note hervor: farbig und mit einem Balken dahinter (so groß wie ihre Tippfläche,
// ganz hinten im System, damit er nichts verdeckt)
export function markPlaying(i) {
  const old = el.sheet.querySelector('.ev.playing');
  if (old) old.classList.remove('playing');
  el.sheet.querySelectorAll('.playbar').forEach((b) => b.remove());
  const now = i != null && el.sheet.querySelector('.ev[data-i="' + i + '"]');
  if (!now) return;
  now.classList.add('playing');
  const hit = el.sheet.querySelector('.hit[data-i="' + i + '"]:not(:first-child)');
  if (!hit) return;
  const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  const x = +hit.getAttribute('x') + 0.1, y = +hit.getAttribute('y') + 0.2;
  bar.setAttribute('class', 'playbar');
  bar.setAttribute('x', x); bar.setAttribute('y', y);
  bar.setAttribute('width', Math.max(0, +hit.getAttribute('width') - 0.2));
  bar.setAttribute('height', Math.max(0, +hit.getAttribute('height') - 0.4));
  bar.setAttribute('rx', 0.8);
  hit.parentNode.insertBefore(bar, hit.parentNode.firstChild);
}
