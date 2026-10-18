// Tafel: antippen zum Markieren, ziehen zum Verschieben oder Tauschen
import { filled } from './model.js';
import { S } from './state.js';
import { render } from './render.js';
import { cellEl } from './board.js';
import { tapCell, swapCells, deleteCell, revealRow } from './actions.js';
import { el } from './dom.js';

// Ab dieser Strecke in Pixeln wird aus einem Tipp ein Ziehen
const DRAG_START = 12;

let drag = null;

function cellAt(x, y) {
  const t = document.elementFromPoint(x, y);
  const cell = t && t.closest ? t.closest('.cell') : null;
  if (!cell || !el.grid.contains(cell)) return null;
  return { r: +cell.dataset.r, c: +cell.dataset.c, el: cell };
}
// Hebt den Kreis an: eine Kopie folgt dem Finger, der Platz selbst wird blass
function beginDrag() {
  const src = cellEl(drag.r, drag.c);
  const dotEl = src.querySelector('.dot');
  const rect = dotEl.getBoundingClientRect();
  const ghost = dotEl.cloneNode(true);
  ghost.classList.add('dragging');
  ghost.style.setProperty('--d', rect.width + 'px');
  document.body.appendChild(ghost);
  src.classList.add('lifting');
  Object.assign(drag, { src, ghost, w: rect.width, active: true });
}

function onDown(e) {
  if (e.button > 0) return;
  const cell = e.target.closest('.cell');
  if (!cell) return;
  drag = { r: +cell.dataset.r, c: +cell.dataset.c, id: e.pointerId, x: e.clientX, y: e.clientY, active: false, over: null };
  try { el.grid.setPointerCapture(e.pointerId); } catch (_) { /* Zeiger schon weg */ }
}
function onMove(e) {
  if (!drag || e.pointerId !== drag.id) return;
  if (!drag.active) {
    if (!filled(S.rows[drag.r][drag.c])) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < DRAG_START) return;
    beginDrag();
  }
  drag.ghost.style.transform = 'translate(' + (e.clientX - drag.w / 2) + 'px,' + (e.clientY - drag.w / 2) + 'px) scale(1.1)';
  const t = cellAt(e.clientX, e.clientY), over = t ? t.el : null;
  if (drag.over && drag.over !== over) drag.over.classList.remove('drop');
  if (over && over !== drag.src) { over.classList.add('drop'); drag.over = over; } else { drag.over = null; }
}
function onEnd(e, cancel) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag;
  drag = null;
  try { el.grid.releasePointerCapture(e.pointerId); } catch (_) { /* Zeiger schon weg */ }
  if (d.active) {
    d.ghost.remove();
    const t = cancel ? null : cellAt(e.clientX, e.clientY);
    if (t && (t.r !== d.r || t.c !== d.c)) swapCells(d, t);
    else render();
  } else if (!cancel) tapCell(d.r, d.c);
}
// Mit Tastatur: Eingabe/Leertaste markiert, Entfernen löscht
function onKey(e) {
  const cell = e.target.closest ? e.target.closest('.cell') : null;
  if (!cell) return;
  const r = +cell.dataset.r, c = +cell.dataset.c;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); S.sel = { r, c }; render(); }
  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); S.sel = { r, c }; deleteCell(); }
  else return;
  const again = el.grid.querySelector('.cell.sel');
  if (again) again.focus();
}

export function initBoardInput() {
  el.grid.addEventListener('pointerdown', onDown);
  el.grid.addEventListener('pointermove', onMove);
  el.grid.addEventListener('pointerup', (e) => onEnd(e, false));
  el.grid.addEventListener('pointercancel', (e) => onEnd(e, true));
  el.grid.addEventListener('contextmenu', (e) => e.preventDefault());
  el.grid.addEventListener('keydown', onKey);
  // Tipp auf das Tuch deckt die nächste Zeile auf
  el.grid.addEventListener('click', (e) => { if (e.target.closest('.cloth')) revealRow(); });
}
