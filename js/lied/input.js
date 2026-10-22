// Antippen und Ziehen auf dem Notenblatt.
// Antippen markiert. Die markierte Note lässt sich ziehen: nach oben oder unten ändert die Tonhöhe stufenweise
// (man hört den neuen Ton), zur Seite auf ein anderes Zeichen tauscht beide. Nur die markierte Note ist ziehbar,
// damit sich das Notenblatt sonst wie gewohnt mit dem Finger scrollen lässt.
import { previewTone } from '../core/player.js';
import { isNote, stepPitch, freq } from './model.js';
import { L } from './state.js';
import { render, spPx } from './render.js';
import * as act from './actions.js';
import { el } from './dom.js';

// Ab dieser Strecke in Pixeln wird aus einem Tipp ein Ziehen
const DRAG_START = 10;

let drag = null;
let justDragged = false; // nach dem Ziehen kein Klick hinterher

const hitAt = (x, y) => {
  const t = document.elementFromPoint(x, y);
  const h = t && t.closest ? t.closest('.hit[data-i]') : null;
  return h && el.sheet.contains(h) ? +h.dataset.i : null;
};
const evEl = (i) => el.sheet.querySelector('.ev[data-i="' + i + '"]');

function onDown(e) {
  if (e.button > 0 || drag) return;
  const h = e.target.closest('.grabber');
  if (!h) return;
  const i = +h.dataset.i, ev = L.song.ev[i];
  if (!ev) return;
  drag = { i, id: e.pointerId, x: e.clientX, y: e.clientY, mode: null, p0: ev.p, steps: 0, over: null };
  try { el.sheet.setPointerCapture(e.pointerId); } catch (_) { /* Zeiger schon weg */ }
}
function onMove(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.mode) {
    if (Math.hypot(dx, dy) < DRAG_START) return;
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
function onEnd(e, cancel) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag;
  drag = null;
  try { el.sheet.releasePointerCapture(e.pointerId); } catch (_) { /* Zeiger schon weg */ }
  if (!d.mode) return; // ein Tipp: das erledigt der Klick
  justDragged = true;
  setTimeout(() => { justDragged = false; }, 0);
  // Abbruch (pointercancel): Die Tonhöhe kommt auf den Stand vor dem Ziehen zurück, getauscht wird nicht
  if (d.mode === 'pitch') { if (cancel) act.cancelDrag(); else act.endDrag(); }
  else if (d.mode === 'move' && !cancel && d.over != null) act.swap(d.i, d.over);
  else render();
}

export function initSheetInput() {
  el.sheet.addEventListener('pointerdown', onDown);
  el.sheet.addEventListener('pointermove', onMove);
  el.sheet.addEventListener('pointerup', (e) => onEnd(e, false));
  el.sheet.addEventListener('pointercancel', (e) => onEnd(e, true));
  // Während des Ziehens nicht scrollen (für Browser, die touch-action auf SVG-Elementen nicht beachten)
  el.sheet.addEventListener('touchmove', (e) => { if (drag) e.preventDefault(); }, { passive: false });
  el.sheet.addEventListener('contextmenu', (e) => e.preventDefault());
  // Antippen markiert den Platz darunter
  el.sheet.addEventListener('click', (e) => {
    if (justDragged) return;
    // Tipp auf eine Zeilennummer klappt die Zeile ein oder wieder auf
    const fold = e.target.closest('[data-fold]');
    if (fold) { const [a, b] = fold.dataset.fold.split(',').map(Number); act.toggleFold(a, b); return; }
    // Tipp auf das Tuch deckt die nächste Notenzeile auf, auf eine ?-Karte deckt sie auf
    if (e.target.closest('.cloth:not(.stepcloth)')) { act.revealLine(); return; }
    const hit = e.target.closest('[data-i]');
    if (hit) act.tapEv(+hit.dataset.i, 'name' in hit.dataset);
  });
}
