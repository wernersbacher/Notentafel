// Gemeinsame Zeichen der Notenschrift als SVG für Lied und Tafel: Notenköpfe, Hälse, Fähnchen, Balken, Punkte, Pausen
// und die kleinen Zeichen für die Knöpfe der Leisten (damit alle Bereiche dieselben Noten- und Pausenzeichen zeigen).
// Maße in Linienabständen (sp); y wächst nach unten. Linien und Flächen nehmen die Textfarbe (currentColor).
import { QUARTER_REST } from './shapes.js';

export const f = (n) => +n.toFixed(3);
// y eines Platzes, gemessen von der obersten Linie
export const yOf = (pos) => (8 - pos) / 2;

export const line = (x1, y1, x2, y2, w) =>
  '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="currentColor" stroke-width="' + w + '"/>';

// Ellipse als Pfad (damit sich Köpfe mit Loch als eine Fläche zeichnen lassen); rot in Grad
function ellipse(cx, cy, rx, ry, rot) {
  const a = rot * Math.PI / 180, dx = rx * Math.cos(a), dy = rx * Math.sin(a);
  const arc = (x, y) => 'A' + rx + ' ' + ry + ' ' + rot + ' 1 0 ' + f(x) + ' ' + f(y);
  return 'M' + f(cx - dx) + ' ' + f(cy - dy) + arc(cx + dx, cy + dy) + arc(cx - dx, cy - dy) + 'Z';
}

/* ---------- Noten ---------- */
// Kopf: v = 1 Ganze, 2 Halbe (beide hohl), sonst gefüllt. Mit color bekommt er diese Farbe und einen dunklen Rand,
// damit auch helle Farben (Gelb) auf Weiß zu sehen sind.
export function head(x, y, v, color) {
  const c = color ? ' fill="' + color + '" stroke="currentColor" stroke-width="0.07"' : '';
  if (v === 1) return '<path class="hd"' + c + ' fill-rule="evenodd" d="' + ellipse(x, y, 0.82, 0.52, 0) + ellipse(x, y, 0.36, 0.27, 55) + '"/>';
  if (v === 2) return '<path class="hd"' + c + ' fill-rule="evenodd" d="' + ellipse(x, y, 0.66, 0.46, -22) + ellipse(x, y, 0.5, 0.19, -32) + '"/>';
  return '<path class="hd"' + c + ' d="' + ellipse(x, y, 0.66, 0.46, -22) + '"/>';
}
export const stem = (x, y1, y2) => line(x, y1, x, y2, 0.12);
export const ledger = (x, y, half = 1) => line(x - half, y, x + half, y, 0.14);
export const dot = (x, y) => '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="0.2"/>';

// Fähnchen am Halsende (x, y); up: Hals nach oben (Fähnchen hängt nach unten)
export function flags(x, y, n, up) {
  const s = up ? 1 : -1;
  let out = '';
  for (let k = 0; k < n; k++) {
    const y0 = y + s * k * 0.85;
    out += '<path d="M' + f(x) + ' ' + f(y0) + 'C' + f(x + 0.1) + ' ' + f(y0 + s * 1.1) + ' ' + f(x + 1.4) + ' ' + f(y0 + s * 1.4) +
      ' ' + f(x + 1.05) + ' ' + f(y0 + s * 3) + 'C' + f(x + 1.2) + ' ' + f(y0 + s * 1.8) + ' ' + f(x + 0.5) + ' ' + f(y0 + s * 1.45) +
      ' ' + f(x) + ' ' + f(y0 + s * 1.05) + 'Z"/>';
  }
  return out;
}
// Balken von (x1, y1) nach (x2, y2) an den Halsenden, auch geneigt; up: Hälse nach oben, der Balken wächst also nach unten
export function beam(x1, y1, x2, y2, up) {
  const k = (y2 - y1) / (x2 - x1), h = up ? 0.5 : -0.5;
  const xa = x1 - 0.06, ya = y1 - 0.06 * k, xb = x2 + 0.06, yb = y2 + 0.06 * k;
  return '<path d="M' + f(xa) + ' ' + f(ya) + 'L' + f(xb) + ' ' + f(yb) + 'L' + f(xb) + ' ' + f(yb + h) +
    'L' + f(xa) + ' ' + f(ya + h) + 'Z"/>';
}

/* ---------- Pausen (x: Mitte) ---------- */
// Achtel- und Sechzehntelpause als Linienzug in einem Rahmen von 22 × 30, die Viertelpause als Fläche (Rahmen 64 × 64),
// jeweils verkleinert
const REST_PATHS = {
  4: '<path d="' + QUARTER_REST + '" stroke="none"/>',
  8: '<circle cx="8.5" cy="11" r="2.6"/><path d="M8 13.2c3 .8 5.5-.3 7.5-3L10 25" fill="none" stroke-width="2"/>',
  16: '<circle cx="9.5" cy="5" r="2.6"/><path d="M9 7.2c3 .8 5.5-.3 7.5-3L9.5 29" fill="none" stroke-width="2"/>' +
    '<circle cx="7.7" cy="13.5" r="2.6"/><path d="M7.2 15.7c3 .8 5-.3 7-2.8" fill="none" stroke-width="2"/>'
};
// Punkt jedes Rahmens, der auf die Mittellinie kommt (x, y), und Verkleinerung; bei der Achtel liegt so der Punkt genau auf der zweiten Linie von oben
const REST_FIT = { 4: [31, 31.5, 0.047], 8: [11, 19.33, 0.12], 16: [12, 17, 0.12] };
export function rest(x, v) {
  if (v === 1) return '<rect x="' + f(x - 0.6) + '" y="' + yOf(6) + '" width="1.2" height="0.5"/>';
  if (v === 2) return '<rect x="' + f(x - 0.6) + '" y="' + (yOf(4) - 0.5) + '" width="1.2" height="0.5"/>';
  const [cx, cy, s] = REST_FIT[v];
  return '<g transform="translate(' + f(x - cx * s) + ' ' + f(yOf(4) - cy * s) + ') scale(' + s + ')" stroke="currentColor">' + REST_PATHS[v] + '</g>';
}

/* ---------- Kleine Zeichen für die Knöpfe der Leiste ---------- */
const icon = (vb, s) => '<svg class="sym" viewBox="' + vb + '" fill="currentColor" aria-hidden="true">' + s + '</svg>';
// Notenwert v, mit Punkt, wenn withDot
export function noteIcon(v, withDot) {
  // Die Ganze hat keinen Hals und steht deshalb in der Mitte
  if (v === 1) return icon('-0.3 -4 3.4 4.8', head(1, -1.6, 1));
  let s = head(1, 0, v) + stem(1.6, -0.1, -3.5);
  if (v >= 8) s += flags(1.6, -3.5, v === 8 ? 1 : 2, true);
  if (withDot) s += dot(2.45, -0.3);
  return icon('-0.3 -4 3.4 4.8', s);
}
export const dotIcon = () => icon('-1.7 -1.7 3.4 3.4', dot(0, 0).replace('r="0.2"', 'r="0.4"'));
// Pause mit Wert v; Ganze und Halbe brauchen ein Stück der Linie, an der sie hängen bzw. auf der sie liegen
export const restIcon = (v) => icon('-1.3 -0.3 2.6 4.4', (v <= 2 ? line(-1, yOf(v === 1 ? 6 : 4), 1, yOf(v === 1 ? 6 : 4), 0.14) : '') + rest(0, v));
