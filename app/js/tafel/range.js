// Bereich markieren: Platz oder Zeilennummer gedrückt halten, dann ziehen oder an den Griffen ziehen (input.js). Der Bereich
// gilt nur zum Abspielen und Wiederholen; jede Änderung der Tafel hebt ihn auf (snap in state.js), ein Tipp aufs Brett auch.
import { replay } from '../core/player.js';
import { S } from './state.js';
import { lineSpan } from './model.js';
import { render } from './redraw.js';

const before = (p, q) => p.r - q.r || p.c - q.c;

// Der Bereich von a bis b ({ r, c }, in beliebiger Reihenfolge), auf Plätze mit Zeichen begrenzt. Was gerade klingt, endet:
// Die Markierung rückt an seinen Anfang. Was gerade klingt, läuft weiter, bis die Geste endet (endRange).
export function setRange(p, q) {
  const fit = (x) => {
    const last = S.rows[x.r] ? lineSpan(S.rows[x.r]) : -1;
    return last < 0 ? null : { r: x.r, c: Math.max(0, Math.min(x.c, last)) };
  };
  let a = fit(p), b = fit(q);
  if (!a || !b) return;
  if (before(a, b) > 0) [a, b] = [b, a];
  const g = S.range;
  if (g && !before(g.a, a) && !before(g.b, b)) return;
  S.range = { a, b };
  S.sel = { ...a };
  S.countAt = null;
  render();
}
// Die Zeilen r1 bis r2 ganz (in beliebiger Richtung); leere Zeilen am Rand zählen nicht
export function setRows(r1, r2) {
  const lo = Math.min(r1, r2), hi = Math.max(r1, r2);
  let first = lo, last = hi;
  while (first <= hi && lineSpan(S.rows[first]) < 0) first++;
  while (last >= lo && lineSpan(S.rows[last]) < 0) last--;
  if (first > last) return;
  setRange({ r: first, c: 0 }, { r: last, c: lineSpan(S.rows[last]) });
}
export function clearRange() {
  if (!S.range) return;
  S.range = null;
  render();
  replay();
}
// Die Geste am Bereich ist zu Ende: Was gerade klingt, spielt mit dem neuen Bereich von vorn weiter
export const endRange = replay;
