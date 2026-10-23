// Tafel: antippen zum Markieren, ziehen zum Verschieben oder Tauschen.
// Gedrückt halten auf einem Platz oder einer Zeilennummer markiert einen Bereich zum Abspielen und Wiederholen (range.js);
// ohne den Finger zu lösen weiterziehen vergrößert ihn, später ziehen die Griffe an seinen Enden. ✕ hebt ihn auf.
import { filled, lineSpan } from './model.js';
import { S } from './state.js';
import { render } from './redraw.js';
import { cellEl } from './board.js';
import { tapCell, swapCells, deleteCell, revealRow, toggleFold, setRange, setRows, clearRange } from './actions.js';
import { quizRow, quizCell } from '../core/quiz.js';
import { pointerDrag } from '../core/pointer.js';
import { el } from './dom.js';

// Ab dieser Strecke in Pixeln wird aus einem Tipp ein Ziehen
const DRAG_START = 12;

// Nach dem Halten und an den Griffen kommt der Klick des Fingers erst später (nach dem Loslassen auf dem Tablet) und träfe die
// neu gezeichnete Tafel: er soll weder den Bereich aufheben noch eine Zeile einklappen. Ein neues Aufsetzen beendet die Sperre.
let justHeld = false;
function swallowClick() {
  justHeld = true;
  setTimeout(() => { justHeld = false; }, 400);
}

function cellAt(x, y) {
  const t = document.elementFromPoint(x, y);
  const cell = t && t.closest ? t.closest('.cell') : null;
  if (!cell || !el.grid.contains(cell)) return null;
  return { r: +cell.dataset.r, c: +cell.dataset.c, el: cell };
}
// Die Zeile unter dem Finger: ein Platz oder die Fläche der Zeile (Zeilennummer, Lücken)
function rowAt(x, y) {
  const t = document.elementFromPoint(x, y);
  const cell = t && t.closest ? t.closest('.cell') : null;
  if (cell && el.grid.contains(cell)) return +cell.dataset.r;
  const row = t && t.closest ? t.closest('.row') : null;
  const r = row ? Array.prototype.indexOf.call(el.grid.children, row) : -1;
  return r >= 0 ? r : null;
}
// Bereiche lassen sich nicht markieren, solange ein Quiz läuft oder geübt wird
const rangeOk = () => !S.quiz && !S.written;
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
  const handle = e.target.closest('.rhandle');
  if (handle) {
    // Das andere Ende des Bereichs bleibt stehen, das gegriffene folgt dem Finger
    const g = S.range;
    return g ? { kind: 'handle', fixed: handle.dataset.handle === 'a' ? g.b : g.a } : undefined;
  }
  if (e.target.closest('.rclear')) return; // ✕: ein Tipp (siehe click)
  // Zeilennummer: ein Tipp klappt die Zeile ein (siehe click), erst das Halten markiert die Zeile als Bereich
  const fold = e.target.closest('[data-fold]');
  if (fold) {
    const r = +fold.dataset.fold;
    return rangeOk() && S.rows[r] && !S.rows[r].fold ? { kind: 'line', r, nocapture: true, hold: true } : undefined;
  }
  const cell = e.target.closest('.cell');
  if (!cell) return;
  if (quizCell(+cell.dataset.r, +cell.dataset.c)) return; // im Spiel ist der Tipp eine Antwort (Fehler finden)
  const r = +cell.dataset.r, c = +cell.dataset.c;
  return { kind: 'cell', r, c, active: false, over: null, hold: rangeOk() && filled(S.rows[r][c]) };
}
// Der Finger blieb liegen: Der Bereich beginnt hier (ein Platz oder eine ganze Zeile)
function onHold(d) {
  if (d.kind === 'line') {
    if (lineSpan(S.rows[d.r]) < 0) return false;
    setRows(d.r, d.r);
  } else setRange({ r: d.r, c: d.c }, { r: d.r, c: d.c });
  return true;
}
// Gehalten und weiter gezogen, oder ein Griff: der Bereich wächst oder schrumpft bis unter den Finger
function onExtend(e, d) {
  if (d.kind === 'line') {
    const r = rowAt(e.clientX, e.clientY);
    if (r != null) setRows(d.r, r);
    return;
  }
  const t = cellAt(e.clientX, e.clientY);
  if (!t) return;
  setRange(d.kind === 'handle' ? d.fixed : { r: d.r, c: d.c }, { r: t.r, c: t.c });
}
function onMove(e, d, dragging) {
  if (!dragging) return;
  if (d.held || d.kind === 'handle') { onExtend(e, d); return; }
  if (d.kind !== 'cell') return;
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
  if (d.held || d.kind === 'handle') { swallowClick(); return; } // der Bereich ist schon gesetzt
  if (d.kind === 'line') return; // ein Tipp auf die Nummer klappt per Klick (siehe click)
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
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); S.range = null; S.sel = { r, c }; render(); }
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
    hold: onHold,
    // Nur eine Geste, die auf einem belegten Platz begann, gehört dem Ziehen; von leeren Plätzen und aus den Lücken
    // wischt man weiter. Der Schutz greift für Browser, die touch-action auf den Plätzen nicht beachten.
    scroll: (d) => d.kind === 'handle' || d.held || filled(S.rows[d.r][d.c])
  });
  el.grid.addEventListener('keydown', onKey);
  // Tipp auf das Tuch deckt die nächste Zeile auf, Tipp auf eine Zeilennummer klappt die Zeile ein oder wieder auf
  // (in manchen Spielen spielt er stattdessen die Zeile ab)
  el.grid.addEventListener('pointerdown', () => { justHeld = false; }, true);
  el.grid.addEventListener('click', (e) => {
    if (justHeld) return;
    if (e.target.closest('[data-rclear]')) { clearRange(); return; }
    const f = e.target.closest('[data-fold]');
    if (f) { if (!quizRow(+f.dataset.fold)) toggleFold(+f.dataset.fold); }
    else if (e.target.closest('.cloth')) revealRow();
  });
}
