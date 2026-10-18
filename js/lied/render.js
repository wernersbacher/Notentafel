// Zeichnet Notenblatt und Leiste neu (render) und schließt Änderungen ab (commit)
import { stopPlay, playingPos, stepHides } from '../core/player.js';
import { sideCollapsed } from '../core/shell.js';
import { follow } from '../core/ui.js';
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
  placeCovers(clean);
  if (pos != null && stepHides()) clothFrom(pos + 1, 'cloth stepcloth');
  showMark();
}

/* ---------- Verdecken ---------- */
// Tuch und ?-Karten liegen als HTML-Felder über dem Notenblatt (wie das Feld zum Ziehen)
const hitOf = (i) => el.sheet.querySelector('.hit[data-i="' + i + '"]:not(:first-child)');
// i: das Ereignis, zu dem das Feld gehört (ein Tipp darauf geht an tapEv); name: das Feld liegt über dem Notennamen
function addBox(cls, x, html = '', i = null, name = false) {
  const d = document.createElement('div');
  d.className = cls;
  if (i != null) d.dataset.i = i;
  if (name) d.dataset.name = '';
  d.style.cssText = 'left:' + x.l + 'px;top:' + x.t + 'px;width:' + x.w + 'px;height:' + x.h + 'px';
  d.innerHTML = html;
  el.sheet.appendChild(d);
}
// Tuch ab Ereignis i: der Rest seiner Notenzeile und alles darunter
function clothFrom(i, cls, tip = '') {
  const h = hitOf(i), score = el.sheet.querySelector('.score');
  if (!h || !score) return;
  const r = boxOf(h), s = { ...scoreAt(), w: score.width.baseVal.value, h: score.height.baseVal.value };
  const l = Math.max(0, r.l - 2), below = r.t + r.h;
  addBox(cls, { l, t: r.t, w: s.l + s.w - l, h: r.h }, tip);
  if (s.t + s.h > below + 1) addBox(cls + ' rest', { l: s.l, t: below, w: s.w, h: s.t + s.h - below });
}
function placeCovers(clean) {
  const k = L.song.ev.findIndex((e) => e.cv);
  if (k >= 0) clothFrom(k, 'cloth', '<span class="clothtip">▼ antippen: nächste Zeile aufdecken</span>');
  // ?-Karten: verdeckt eine Karte über der Note bzw. ihrem Namen; aufgedeckt beim Bearbeiten ein kleines „?“ als Hinweis
  L.song.ev.forEach((e, i) => {
    if (e.q) noteCard(e.q, i, clean);
    if (e.qn) nameCard(e.qn, i, clean);
  });
}
// Karte über der Note: so hoch wie alle fünf Notenlinien (mit etwas Rand), bei Noten über oder unter dem System auch
// über sie hinaus. Der Notenname darunter bleibt zu sehen.
function noteCard(q, i, clean) {
  const g = el.sheet.querySelector('.ev[data-i="' + i + '"] > .nh'), h = hitOf(i);
  if (!g || !h || (q === 2 && clean)) return;
  const x = boxOf(g);
  if (q === 2) { addBox('qcard qopen', { l: x.l + x.w - 4, t: x.t - 8, w: 16, h: 16 }, '?'); return; }
  g.parentNode.classList.add('quiz');
  // Notenlinien: im System von y = 0 bis 4 (in Linienabständen)
  const m = h.getCTM(), top0 = scoreAt().t + m.f, pad = spPx * 0.7;
  const top = Math.min(top0 - pad, x.t - pad / 2), bottom = Math.max(top0 + 4 * m.d + pad, x.t + x.h + pad / 2);
  const w = Math.max(x.w + spPx, spPx * 2.6);
  addBox('qcard', { l: x.l + x.w / 2 - w / 2, t: top, w, h: bottom - top }, '?', i);
}
// Karte über dem Notennamen (nur, wenn die Namen zu sehen sind); die Note selbst bleibt
function nameCard(q, i, clean) {
  const t = el.sheet.querySelector('.ev[data-i="' + i + '"] > .nm');
  if (!t || (q === 2 && clean)) return;
  const x = boxOf(t);
  if (q === 2) { addBox('qcard qopen', { l: x.l + x.w - 2, t: x.t - 10, w: 16, h: 16 }, '?'); return; }
  t.classList.add('quiz');
  const w = Math.max(x.w + spPx, spPx * 2.2), hh = x.h + spPx * 0.6;
  addBox('qcard qname', { l: x.l + x.w / 2 - w / 2, t: x.t + x.h / 2 - hh / 2, w, h: hh }, '?', i, true);
}
// Erste Note der nächsten Notenzeile nach Ereignis i (-1: es kommt keine mehr); so weit deckt ein Tipp aufs Tuch auf
export function lineStartAfter(i) {
  const h = hitOf(i);
  if (!h) return -1;
  const top = h.getBoundingClientRect().top;
  for (let j = i + 1; j < L.song.ev.length; j++) {
    const x = hitOf(j);
    if (x && x.getBoundingClientRect().top > top + 1) return j;
  }
  return -1;
}
// Über die markierte Note kommt ein unsichtbares HTML-Feld zum Ziehen. Anders als SVG-Elemente beachten es alle
// Browser mit touch-action: none, sodass der Finger dort zieht statt zu scrollen.
function placeGrabber() {
  const g = el.sheet.querySelector('.hit.grab');
  if (!g) return;
  const r = boxOf(g), d = document.createElement('div');
  d.className = 'grabber';
  d.dataset.i = g.dataset.i;
  d.style.cssText = 'left:' + r.l + 'px;top:' + r.t + 'px;width:' + r.w + 'px;height:' + r.h + 'px';
  el.sheet.appendChild(d);
}
// Lage eines Elements des Notenblatts im Notenblatt (in CSS-Pixeln, wie left/top der Felder darüber). Gerechnet aus den
// Koordinaten der Noten, nicht aus der Lage auf dem Bildschirm: Die enthält die Größe der Oberfläche (CSS zoom), und die
// Felder säßen bei mehr als 100 % umso weiter daneben, je weiter unten sie liegen.
// Das Notenblatt (svg) steht als Block oben links im Innenabstand der Fläche.
function scoreAt() {
  const cs = getComputedStyle(el.sheet);
  return { l: parseFloat(cs.paddingLeft) || 0, t: parseFloat(cs.paddingTop) || 0 };
}
function boxOf(node) {
  const o = scoreAt(), m = node.getCTM(), b = node.getBBox();
  return { l: o.l + m.a * b.x + m.e, t: o.t + m.d * b.y + m.f, w: m.a * b.width, h: m.d * b.height };
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
