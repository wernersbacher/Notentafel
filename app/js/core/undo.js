// „Rückgängig“ für alle Bereiche. Der Verlauf selbst liegt in core/history.js; ein Bereich sagt nur, was zu einem Stand
// gehört und wie er ihn zurücksetzt.
//
// makeUndo({ state, snapshot, apply }):
//   state     der Zustand des Bereichs mit dem Verlauf state.hist und den zurückgenommenen Ständen state.redo
//   snapshot() der zu merkende Stand (wird als JSON abgelegt)
//   apply(d)  setzt einen zurückgeholten Stand im Zustand um
import { pushState, popState } from './history.js';

export function makeUndo({ state, snapshot, apply }) {
  const redoStack = () => state.redo || (state.redo = []);
  // Merkt sich den Stand vor einer Änderung; eine neue Änderung verwirft, was man noch wiederholen könnte
  function snap() {
    pushState(state.hist, snapshot());
    redoStack().length = 0;
  }
  // Holt den letzten gemerkten Stand zurück (der jetzige wartet auf „Wiederholen“); false, wenn es keinen gibt
  function restore() {
    const d = popState(state.hist);
    if (!d) return false;
    pushState(redoStack(), snapshot());
    apply(d);
    return true;
  }
  // Stellt den zuletzt zurückgenommenen Stand wieder her; false, wenn es keinen gibt
  function redo() {
    const d = popState(redoStack());
    if (!d) return false;
    pushState(state.hist, snapshot());
    apply(d);
    return true;
  }
  return { snap, restore, redo };
}
