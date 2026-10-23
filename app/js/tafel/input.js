// Tafel: antippen zum Markieren, ziehen zum Verschieben oder Tauschen
import { filled } from './model.js';
import { S } from './state.js';
import { render } from './redraw.js';
import { cellEl } from './board.js';
import { tapCell, swapCells, deleteCell, revealRow, toggleFold } from './actions.js';
import { quizRow, quizCell } from '../core/quiz.js';
import { pointerDrag } from '../core/pointer.js';
import { el } from './dom.js';

// Ab dieser Strecke in Pixeln wird aus einem Tipp ein Ziehen
const DRAG_START = 12;

function cellAt(x, y) {
  const t = document.elementFromPoint(x, y);
  const cell = t && t.closest ? t.closest('.cell') : null;
  if (!cell || !el.grid.contains(cell)) return null;
  return { r: +cell.dataset.r, c: +cell.dataset.c, el: cell };
}
// Hebt den Kreis an: eine Kopie folgt dem Finger, der Platz selbst wird blass
function beginDrag(d) {
  const src = cellEl(d.r, d.c);
  const dotEl = src.querySelector('.dot');
  const rect = dotEl.getBoundingClientRect();
  const ghost = dotEl.cloneNode(true);
  ghost.classList.add('dragging');
  ghost.style.setProperty('--d', rect.width + 'px');
  document.body.appendChild(ghost);
  src.classList.add('lifting');
  Object.assign(d, { src, ghost, w: rect.width, active: true });
}

function onDown(e) {
  if (e.target.closest('[data-fold]')) return; // Zeilennummer: klappt beim Tippen ein (siehe click)
  const cell = e.target.closest('.cell');
  if (!cell) return;
  if (quizCell(+cell.dataset.r, +cell.dataset.c)) return; // im Spiel ist der Tipp eine Antwort (Fehler finden)
  return { r: +cell.dataset.r, c: +cell.dataset.c, active: false, over: null };
}
function onMove(e, d, dragging) {
  if (!dragging) return;
  if (!d.active) {
    if (!filled(S.rows[d.r][d.c])) return; // leere Plätze lassen sich nicht ziehen
    beginDrag(d);
  }
  d.ghost.style.transform = 'translate(' + (e.clientX - d.w / 2) + 'px,' + (e.clientY - d.w / 2) + 'px) scale(1.1)';
  const t = cellAt(e.clientX, e.clientY), over = t ? t.el : null;
  if (d.over && d.over !== over) d.over.classList.remove('drop');
  if (over && over !== d.src) { over.classList.add('drop'); d.over = over; } else { d.over = null; }
}
function onEnd(e, d, cancel) {
  if (d.active) {
    d.ghost.remove();
    const t = cancel ? null : cellAt(e.clientX, e.clientY);
    if (t && (t.r !== d.r || t.c !== d.c)) swapCells(d, t);
    else render();
  } else if (!cancel) tapCell(d.r, d.c);
}
// Mit Tastatur: Eingabe/Leertaste markiert, Entfernen löscht
function onKey(e) {
  const f = e.target.closest ? e.target.closest('.row.folded') : null;
  if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleFold(+f.dataset.fold); return; }
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
  pointerDrag(el.grid, {
    threshold: DRAG_START,
    start: onDown,
    move: onMove,
    end: onEnd,
    // Nur eine Geste, die auf einem belegten Platz begann, gehört dem Ziehen; von leeren Plätzen und aus den Lücken
    // wischt man weiter. Der Schutz greift für Browser, die touch-action auf den Plätzen nicht beachten.
    scroll: (d) => filled(S.rows[d.r][d.c])
  });
  el.grid.addEventListener('keydown', onKey);
  // Tipp auf das Tuch deckt die nächste Zeile auf, Tipp auf eine Zeilennummer klappt die Zeile ein oder wieder auf
  // (in manchen Spielen spielt er stattdessen die Zeile ab)
  el.grid.addEventListener('click', (e) => {
    const f = e.target.closest('[data-fold]');
    if (f) { if (!quizRow(+f.dataset.fold)) toggleFold(+f.dataset.fold); }
    else if (e.target.closest('.cloth')) revealRow();
  });
}
