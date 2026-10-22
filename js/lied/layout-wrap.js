// Zeilenumbruch: verteilt die Ereignisse auf Zeilen. Kennt nur die Maße aus layout-metrics.js; wie ein Blatt entsteht,
// steht in layout.js.
import { G, MAX_MEASURES } from './layout-metrics.js';

// Automatische Umbrüche: Jede Zeile wird Takt für Takt gefüllt, solange sie in die Breite passt und höchstens
// MAX_MEASURES Takte hat. Passt etwas nicht mehr, wird hinter dem letzten Taktende (cuts) der Zeile umbrochen, gibt es
// keins, direkt davor (ein Takt allein ist zu breit). Der leere Platz am Ende zählt mit. Umbrüche von Hand bleiben.
// Muss eine Zeile (von Hand bis Hand) geteilt werden, werden ihre Stücke möglichst gleich lang: Statt drei Takten und
// einem übrigen stehen zwei und zwei da. Dafür wird die Breite so weit verringert, wie es ohne weitere Zeile und
// ohne Umbruch mitten im Takt geht. growing: In der letzten Zeile wird gerade geschrieben, sie bleibt einfach gefüllt
// (sonst sprängen beim Schreiben die Takte zwischen ihren Stücken hin und her).
// Liefert brk (Umbruch hinter Ereignis i) und full (Zeile endet mit einem automatischen Umbruch – die wird gestreckt).
export function wrap(ev, cuts, wOf, lead, width, growing) {
  const brk = ev.map((e) => !!e.brk), full = [];
  let first = 0;
  ev.forEach((e, i) => {
    if (!e.brk && i < ev.length - 1) return;
    const cut = (w) => wrapLine(ev, cuts, wOf, lead, first, i + 1, w);
    let best = cut(width);
    const atCuts = (b) => b.every((k) => cuts[k]), whole = atCuts(best);
    if (best.length && !(growing && i === ev.length - 1)) {
      let lo = 0, hi = width;
      for (let n = 0; n < 14; n++) {
        const mid = (lo + hi) / 2, b = cut(mid);
        if (b.length === best.length && (atCuts(b) || !whole)) { hi = mid; best = b; } else lo = mid;
      }
    }
    best.forEach((b) => { brk[b] = true; full[b] = true; });
    // Das letzte Stück einer geteilten Zeile wird genauso gestreckt wie die anderen (nicht am Ende des Lieds)
    if (best.length && i < ev.length - 1) full[i] = true;
    first = i + 1;
  });
  return { brk, full };
}
// Automatische Umbrüche in den Ereignissen first … end−1 (eine Zeile von Hand) bei der Breite width
function wrapLine(ev, cuts, wOf, lead, first, end, width) {
  const out = [], last = end === ev.length;
  let start = first, x = lead(first === 0), count = 0;
  for (let i = first; i <= end; i++) {
    if (i === end && !last) break;
    const w = i < end ? wOf(i) : G.ghost;
    while (x + w + 0.6 > width && i > start) {
      let b = i - 1;
      for (let k = i - 1; k >= start; k--) if (cuts[k]) { b = k; break; }
      out.push(b);
      start = b + 1;
      x = lead(false);
      count = 0;
      for (let k = start; k < i; k++) { x += wOf(k); if (cuts[k]) count++; }
    }
    if (i === end) break;
    x += w;
    if (cuts[i] && ++count === MAX_MEASURES && i < end - 1) { out.push(i); start = i + 1; x = lead(false); count = 0; }
  }
  return out;
}
