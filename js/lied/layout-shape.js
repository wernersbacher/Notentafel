// Form eines Zeichens: Lage (Platz), Hilfslinien, Hals, Fahnen und Punkt. Kennt model.js und die Maße aus
// layout-metrics.js; wie ein Blatt entsteht, steht in layout.js.
import { staffPos } from './model.js';
import { G } from './layout-metrics.js';

export function noteShape(it, e) {
  const pos = staffPos(e.p);
  it.pos = pos;
  it.ledger = [];
  for (let p = -2; p >= pos; p -= 2) it.ledger.push(p);
  for (let p = 10; p <= pos; p += 2) it.ledger.push(p);
  if (e.v > 1) {
    // Ab der Mittellinie zeigt der Hals nach unten; weit außen reicht er bis zur Mittellinie
    const up = pos < 4, extra = e.v === 16 ? 1 : 0;
    it.stem = { up, end: up ? Math.max(pos + G.stem + extra, 4) : Math.min(pos - G.stem - extra, 4) };
    if (e.v >= 8) it.flags = e.v === 8 ? 1 : 2;
  }
  // Der Punkt steht immer in einem Zwischenraum
  if (e.dot) it.dot = Math.abs(pos % 2) === 0 ? pos + 1 : pos;
}
