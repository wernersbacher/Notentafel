// Bereich markieren: Note oder Zeilennummer gedrückt halten, dann ziehen oder an den Griffen ziehen (input.js). Der Bereich
// gilt nur zum Abspielen und Wiederholen; jede Änderung am Lied hebt ihn auf (snap in state.js), ein Tipp aufs Notenblatt auch.
import { replay } from '../core/player.js';
import { L } from './state.js';
import { render, renderSheet, lineSpan } from './render.js';
import { ev } from './common.js';

// Der Bereich a … b (beide eingeschlossen, auf das Lied begrenzt, a <= b); die Markierung rückt an seinen Anfang.
// Was gerade klingt, läuft weiter, bis die Geste endet (endRange).
export function setRange(a, b) {
  const last = ev().length - 1;
  if (last < 0) return;
  a = Math.max(0, Math.min(a, last));
  b = Math.max(a, Math.min(b, last));
  const r = L.range;
  if (r && r.a === a && r.b === b) return;
  L.range = { a, b };
  const moved = L.sel !== a;
  L.sel = a;
  L.last = null;
  if (moved) render(); else renderSheet();
}
// Die Notenzeilen k1 bis k2 (Nummern in der Reihenfolge des Blatts, egal in welcher Richtung)
export function setLines(k1, k2) {
  const x = lineSpan(Math.min(k1, k2)), y = lineSpan(Math.max(k1, k2));
  if (x && y) setRange(x.first, y.end - 1);
}
export function clearRange() {
  if (!L.range) return;
  L.range = null;
  renderSheet();
  replay();
}
// Die Geste am Bereich ist zu Ende: Was gerade klingt, spielt mit dem neuen Bereich von vorn weiter
export const endRange = replay;
