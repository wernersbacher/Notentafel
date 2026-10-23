// „Rückgängig“ für alle Bereiche. Der Verlauf selbst liegt in core/history.js; ein Bereich sagt nur, was zu einem Stand
// gehört und wie er ihn zurücksetzt.
//
// makeUndo({ state, snapshot, apply }):
//   state     der Zustand des Bereichs mit dem Verlauf state.hist
//   snapshot() der zu merkende Stand (wird als JSON abgelegt)
//   apply(d)  setzt einen zurückgeholten Stand im Zustand um
import { pushState, popState } from './history.js';

export function makeUndo({ state, snapshot, apply }) {
  // Merkt sich den Stand vor einer Änderung
  function snap() {
    pushState(state.hist, snapshot());
  }
  // Holt den letzten gemerkten Stand zurück; false, wenn es keinen gibt
  function restore() {
    const d = popState(state.hist);
    if (!d) return false;
    apply(d);
    return true;
  }
  return { snap, restore };
}
