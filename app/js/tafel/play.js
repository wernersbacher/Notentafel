// Abspielreihenfolge der Tafel. Alle Funktionen hier sind rein; die Zell-Grundbegriffe kommen aus cells.js.
import { isBarOnly } from './cells.js';

// Reihenfolge, in der die Plätze erklingen ([{ r, c }]), Wiederholungen ausgeschrieben: An einem :‖ geht es einmal zurück
// zum letzten ‖: (sonst zum Anfang). Ein leerer Platz am Zeilenende, der nur einen Strich trägt, ist kein Schlag.
export function playOrderRows(rows) {
  const seq = [];
  rows.forEach((row, r) => row.forEach((x, c) => {
    seq.push({ r, c, bar: x && x.bar ? x.bar : 0, mark: isBarOnly(x) && c === row.length - 1 });
  }));
  const order = [], done = new Set();
  let k = 0, start = 0;
  while (k < seq.length) {
    const s = seq[k];
    if ((s.bar === 3 || s.bar === 5) && !done.has(k)) { done.add(k); k = start; continue; }
    if (s.bar === 4 || s.bar === 5) start = k;
    if (!s.mark) order.push({ r: s.r, c: s.c });
    k++;
  }
  return order;
}
