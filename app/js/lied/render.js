// Zeichnet Notenblatt und Leiste neu (render) und schließt Änderungen ab (commit).
// Die Felder über dem Notenblatt (Tuch, Karten, Greifer) stehen in overlays.js.
import { stopPlay, playingPos, stepHides } from '../core/player.js';
import { sideCollapsed } from '../core/shell.js';
import { follow } from '../core/ui.js';
import { isNote } from './model.js';
import { layout, widestMeasure } from './layout.js';
import { sheetSVG, NUM_W, foldedLine } from './sheet.js';
import { L, opts, persistSong, written, resolveRange } from './state.js';
import { renderSidebar } from './sidebar.js';
import { el } from './dom.js';
import { setSpPx } from './scale.js';
import { clothFrom, placeCovers, placeGrabber, placeGrips } from './overlays.js';

export { spPx } from './scale.js';
export { lineStartAfter } from './overlays.js';

// Größe eines Linienabstands in Pixeln je nach Notengröße (normal, groß, sehr groß).
// Mit automatischem Umbruch steht sie fest (WRAP) und die Zeilen werden so umbrochen, dass sie in die Breite passen;
// kleiner wird sie nur, wenn sonst nicht einmal der breiteste Takt in eine Zeile passt (aber nicht unter 8 Pixel).
// Ohne: so groß wie möglich, bis die längste Zeile die Breite füllt, aber nie kleiner als das Minimum der Stufe (SP);
// passt eine Zeile dann nicht, lässt sich das Notenblatt seitlich wischen.
const WRAP = { 1: 14, 2: 20, 3: 28 };
const SP = { 1: [8, 20], 2: [16, 28], 3: [22, 36] };
// Erstes Ereignis der letzten Zeile, so wie das Notenblatt gerade umbrochen ist (für „− Zeile“)
let lastFirst = 0;
export const lastLineStart = () => lastFirst;
// Ereignisse in eingeklappten Zeilen, so wie das Notenblatt gerade umbrochen ist (sie werden nicht abgespielt)
let folded = new Set();
export const isFolded = (i) => folded.has(i);
// Die Notenzeilen, so wie das Notenblatt gerade umbrochen ist: { first, end } (Ereignisse first … end−1), nur mit Zeichen
let lines = [];
export const lineAt = (i) => lines.findIndex((s) => i >= s.first && i < s.end);
export const lineSpan = (k) => lines[k];
export const lineCount = () => lines.length;

export function renderSheet() {
  resolveRange();
  // Übt man gerade, liefert written() das wartende Lied statt L selbst
  const practicing = written() !== L;
  // Leere Übungstafel: ganz leer, ohne Notenlinien
  if (practicing && !L.song.ev.length) { el.sheet.innerHTML = ''; lastFirst = 0; folded = new Set(); lines = []; return; }
  // Schreibt man gerade am Ende, bleibt die letzte Zeile beim Umbrechen einfach gefüllt (growing in layout.js)
  const avail = el.sheet.clientWidth || 600, o = { autoBar: opts.autoBar, counts: opts.autoZ, check: opts.check, lyrics: opts.lyrics };
  const growing = L.last != null && L.sel >= L.song.ev.length;
  let lay, sp;
  if (opts.wrap) {
    sp = Math.max(8, Math.min(WRAP[opts.size], avail / (widestMeasure(L.song, o) + NUM_W + 0.2)));
    lay = layout(L.song, { ...o, width: avail / sp - 0.1 - NUM_W, growing });
  } else {
    lay = layout(L.song, o);
    const [min, max] = SP[opts.size];
    sp = Math.max(min, Math.min(max, avail / (Math.max(...lay.systems.map((s) => s.width)) + NUM_W)));
  }
  // Vor jeder Zeile steht ihre Nummer (NUM_W breit)
  const W = Math.max(...lay.systems.map((s) => s.width + NUM_W), avail / sp - 0.1);
  setSpPx(sp);
  lastFirst = lay.systems[lay.systems.length - 1].first;
  folded = new Set();
  lines = lay.systems.filter((s) => s.end > s.first).map((s) => ({ first: s.first, end: s.end }));
  lay.systems.forEach((s) => { if (foldedLine(L.song.ev, s)) for (let i = s.first; i < s.end; i++) folded.add(i); });
  // Eingeklappte Leiste, Tonnamen-Quiz und Übungstafel: Bearbeiten beendet, ohne Markierung und leeren Platz
  const clean = sideCollapsed() || !!L.quiz || practicing;
  const last = !clean && L.last != null && isNote(L.song.ev[L.last]) ? L.last : -1;
  // Hervorgehoben ist, was gerade klingt, sonst die Note, nach der das Tonnamen-Quiz fragt. Beim Quiz stehen die
  // Notennamen nur unter den Noten, die schon benannt sind.
  const q = L.quiz, pos = playingPos() ?? (q ? q.i : null);
  const { svg, height } = sheetSVG(L.song, lay, {
    width: W, sel: L.sel, clean, insert: L.insertMode, names: opts.names || !!q, nameIf: q ? (i) => q.done.has(i) : null,
    colors: opts.colors, counts: opts.autoZ, lyrics: opts.lyrics, target: last, playing: pos == null ? -1 : pos, nums: true,
    range: L.range && L.range.b < L.song.ev.length ? L.range : null
  });
  el.sheet.innerHTML = '<svg class="score' + (clean ? ' clean' : '') + '" width="' + Math.floor(W * sp) + '" height="' + Math.ceil(height * sp) +
    '" viewBox="0 0 ' + W + ' ' + height + '" fill="currentColor" role="img" aria-label="Notenblatt">' + svg + '</svg>';
  placeGrabber();
  placeGrips();
  placeCovers();
  if (pos != null && stepHides()) clothFrom(pos + 1, 'cloth stepcloth');
  showMark();
}

// Holt die Markierung ins Bild, wenn sie außerhalb liegt (z. B. nach dem Schreiben am unteren Rand) – nur, wenn sie sich
// bewegt hat. Sonst sprünge das Blatt bei jedem Neuzeichnen zur Markierung, die nach dem Laden am Ende des Lieds steht.
let shownSel = null;
function showMark() {
  const first = shownSel === null, moved = L.sel !== shownSel;
  shownSel = L.sel;
  if (first || !moved) return; // beim Start der App bleibt das Blatt oben
  const c = el.sheet.querySelector('.cur');
  if (!c) return;
  const r = c.getBoundingClientRect(), b = el.sheet.getBoundingClientRect();
  if (r.bottom > b.bottom) el.sheet.scrollTop += r.bottom - b.bottom + 8;
  else if (r.top < b.top) el.sheet.scrollTop -= b.top - r.top + 8;
  if (r.right > b.right) el.sheet.scrollLeft += r.right - b.right + 8;
  else if (r.left < b.left) el.sheet.scrollLeft -= b.left - r.left + 8;
}

// Nach dem Laden eines Lieds: oben beginnen (die Markierung steht am Ende, dorthin wird nicht gescrollt)
export function scrollTop() {
  shownSel = L.sel;
  el.sheet.scrollTop = 0;
  el.sheet.scrollLeft = 0;
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
// Schritt für Schritt mit „Noten erst beim Weitertippen anzeigen“: alles dahinter liegt unter einem schlichten Tuch
export function markPlaying(i) {
  const old = el.sheet.querySelector('.ev.playing');
  if (old) old.classList.remove('playing');
  el.sheet.querySelectorAll('.playbar, .stepcloth').forEach((b) => b.remove());
  const now = i != null && el.sheet.querySelector('.ev[data-i="' + i + '"]');
  if (!now) return;
  if (stepHides()) clothFrom(i + 1, 'cloth stepcloth');
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
  follow(hit, el.sheet);
}
