// Antippen und Ziehen auf dem Notenblatt.
// Antippen markiert. Die markierte Note lässt sich ziehen: nach oben oder unten ändert die Tonhöhe stufenweise
// (man hört den neuen Ton), zur Seite auf ein anderes Zeichen tauscht beide. Nur die markierte Note ist ziehbar,
// damit sich das Notenblatt sonst wie gewohnt mit dem Finger scrollen lässt.
// Gedrückt halten auf einer Note oder einer Zeilennummer markiert einen Bereich zum Abspielen und Wiederholen (range.js);
// ohne den Finger zu lösen weiterziehen vergrößert ihn, später ziehen die Griffe an seinen Enden. ✕ hebt ihn auf.
import { previewTone } from '../core/player.js';
import { pointerDrag } from '../core/pointer.js';
import { isNote, stepPitch, freq } from './model.js';
import { L } from './state.js';
import { render, spPx, lineAt, isFolded } from './render.js';
import * as act from './actions.js';
import { el } from './dom.js';

// Ab dieser Strecke in Pixeln wird aus einem Tipp ein Ziehen
const DRAG_START = 10;

let justDragged = false; // nach dem Ziehen kein Klick hinterher
// Nach dem Halten und an den Griffen kommt der Klick des Fingers erst später (nach dem Loslassen auf dem Tablet) und träfe das
// neu gezeichnete Blatt: er soll weder den Bereich aufheben noch eine Zeile einklappen. Ein neues Aufsetzen beendet die Sperre.
function swallowClick() {
  justDragged = true;
  setTimeout(() => { justDragged = false; }, 400);
}

const hitAt = (x, y) => {
  const t = document.elementFromPoint(x, y);
  const h = t && t.closest ? t.closest('.hit[data-i]') : null;
  return h && el.sheet.contains(h) ? +h.dataset.i : null;
};
// Alle Elemente des Notenblatts unter dem Finger (ein Griff liegt über den Zeichen und würde sonst alles andere verdecken)
const under = (x, y) => (document.elementsFromPoint ? document.elementsFromPoint(x, y) : []).filter((n) => el.sheet.contains(n));
// Das Zeichen unter dem Finger für den Bereich; in der Fläche hinter einer Zeile gilt das letzte Zeichen dieser Zeile
function evAt(x, y) {
  const n = L.song.ev.length;
  for (const t of under(x, y)) {
    const h = t.closest('.hit[data-i]');
    if (!h || !n) continue;
    const i = +h.dataset.i;
    return Math.max(0, Math.min(h.matches(':first-child') ? i - 1 : i, n - 1));
  }
  return null;
}
// Die Notenzeile (Nummer in der Reihenfolge des Blatts) unter dem Finger: auf der Spalte der Zeilennummern, sonst die der
// Zeichen dahinter
function lineIndexAt(x, y) {
  for (const t of under(x, y)) {
    const f = t.closest('[data-fold]');
    if (f) return lineAt(+f.dataset.fold.split(',')[0]);
  }
  const i = evAt(x, y);
  return i == null ? null : lineAt(i);
}
// Bereiche lassen sich nicht markieren, solange ein Quiz läuft oder geübt wird
const rangeOk = () => !L.quiz && !L.written;
const evEl = (i) => el.sheet.querySelector('.ev[data-i="' + i + '"]');

function onDown(e) {
  const handle = e.target.closest('.rgrip');
  if (handle) return { kind: 'handle', which: handle.dataset.handle };
  if (e.target.closest('.rclear')) return; // ✕: ein Tipp (siehe click)
  const h = e.target.closest('.grabber');
  if (h) {
    const i = +h.dataset.i, ev = L.song.ev[i];
    if (!ev) return;
    return { kind: 'grab', i, mode: null, p0: ev.p, steps: 0, over: null, hold: rangeOk() };
  }
  if (!rangeOk()) return;
  // Zeilennummer und Zeichen: ein Tipp klappt ein bzw. markiert (siehe click), erst das Halten markiert den Bereich
  const fold = e.target.closest('[data-fold]');
  if (fold) {
    const first = +fold.dataset.fold.split(',')[0];
    return isFolded(first) ? undefined : { kind: 'line', k: lineAt(first), nocapture: true, hold: true };
  }
  const hit = e.target.closest('.hit[data-i]');
  if (hit && +hit.dataset.i < L.song.ev.length && !hit.matches(':first-child')) return { kind: 'press', i: +hit.dataset.i, nocapture: true, hold: true };
}
// Der Finger blieb liegen: Der Bereich beginnt hier (eine Note oder eine ganze Zeile)
function onHold(d) {
  if (d.kind === 'line') { if (d.k < 0) return false; act.setLines(d.k, d.k); return true; }
  act.setRange(d.i, d.i);
  return true;
}
// Gehalten und weiter gezogen, oder ein Griff: der Bereich wächst oder schrumpft bis unter den Finger
function onExtend(e, d) {
  if (d.kind === 'line') {
    const k = lineIndexAt(e.clientX, e.clientY);
    if (k != null && k >= 0) act.setLines(d.k, k);
    return;
  }
  const j = evAt(e.clientX, e.clientY), r = L.range;
  if (j == null || !r) return;
  if (d.kind === 'handle') {
    if (d.which === 'a') act.setRange(Math.min(j, r.b), r.b);
    else act.setRange(r.a, Math.max(j, r.a));
  } else act.setRange(Math.min(d.i, j), Math.max(d.i, j));
}
function onMove(e, drag, dragging) {
  if (!dragging) return;
  if (drag.held || drag.kind === 'handle') { onExtend(e, drag); return; }
  if (drag.kind !== 'grab') return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.mode) {
    // Senkrecht: Tonhöhe (nur bei Noten); waagerecht: tauschen
    drag.mode = Math.abs(dy) > Math.abs(dx) ? (isNote(L.song.ev[drag.i]) ? 'pitch' : 'none') : 'move';
    if (drag.mode === 'move') { const g = evEl(drag.i); if (g) g.classList.add('lifting'); }
  }
  if (drag.mode === 'pitch') {
    // Eine Stufe ist ein halber Linienabstand
    const steps = Math.round(-dy / (spPx / 2));
    if (steps === drag.steps) return;
    drag.steps = steps;
    const p = stepPitch(drag.p0, steps);
    if (p === L.song.ev[drag.i].p) return;
    act.dragPitch(drag.i, p);
    previewTone(freq(L.song.ev[drag.i], L.song.key));
  } else if (drag.mode === 'move') {
    const j = hitAt(e.clientX, e.clientY), target = j != null && j !== drag.i && L.song.ev[j] ? j : null;
    if (target === drag.over) return;
    if (drag.over != null) { const g = evEl(drag.over); if (g) g.classList.remove('drop'); }
    drag.over = target;
    if (target != null) { const g = evEl(target); if (g) g.classList.add('drop'); }
  }
}
function onEnd(e, d, cancel) {
  if (d.held || d.kind === 'handle') { swallowClick(); return; }
  if (!d.mode) return; // ein Tipp: das erledigt der Klick
  justDragged = true;
  setTimeout(() => { justDragged = false; }, 0);
  // Abbruch (pointercancel): Die Tonhöhe kommt auf den Stand vor dem Ziehen zurück, getauscht wird nicht
  if (d.mode === 'pitch') { if (cancel) act.cancelDrag(); else act.endDrag(); }
  else if (d.mode === 'move' && !cancel && d.over != null) act.swap(d.i, d.over);
  else render();
}

export function initSheetInput() {
  pointerDrag(el.sheet, {
    threshold: DRAG_START,
    start: onDown,
    move: onMove,
    end: onEnd,
    hold: onHold,
    // Eine Geste am Griff, an einem Griff des Bereichs und nach dem Halten gehört dem Ziehen, nicht dem Scrollen
    scroll: (d) => d.kind === 'grab' || d.kind === 'handle' || d.held
  });
  el.sheet.addEventListener('pointerdown', () => { justDragged = false; }, true);
  // Antippen markiert den Platz darunter
  el.sheet.addEventListener('click', (e) => {
    if (justDragged) return;
    if (e.target.closest('[data-rclear]')) { act.clearRange(); return; }
    // Tipp auf eine Zeilennummer klappt die Zeile ein oder wieder auf
    const fold = e.target.closest('[data-fold]');
    if (fold) { const [a, b] = fold.dataset.fold.split(',').map(Number); act.toggleFold(a, b); return; }
    // Tipp auf das Tuch deckt die nächste Notenzeile auf, auf eine ?-Karte deckt sie auf
    if (e.target.closest('.cloth:not(.stepcloth)')) { act.revealLine(); return; }
    const hit = e.target.closest('[data-i]');
    if (hit) act.tapEv(+hit.dataset.i, 'name' in hit.dataset);
  });
}
