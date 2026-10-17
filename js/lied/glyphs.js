// Zeichen der Notenschrift als SVG, alle selbst gezeichnet (keine Notenschrift aus dem Netz).
// Maße in Linienabständen (sp); y wächst nach unten. Linien und Flächen nehmen die Textfarbe (currentColor).

const f = (n) => +n.toFixed(3);
// y eines Platzes, gemessen von der obersten Linie
export const yOf = (pos) => (8 - pos) / 2;

const line = (x1, y1, x2, y2, w) =>
  '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="currentColor" stroke-width="' + w + '"/>';

// Ellipse als Pfad (damit sich Köpfe mit Loch als eine Fläche zeichnen lassen); rot in Grad
function ellipse(cx, cy, rx, ry, rot) {
  const a = rot * Math.PI / 180, dx = rx * Math.cos(a), dy = rx * Math.sin(a);
  const arc = (x, y) => 'A' + rx + ' ' + ry + ' ' + rot + ' 1 0 ' + f(x) + ' ' + f(y);
  return 'M' + f(cx - dx) + ' ' + f(cy - dy) + arc(cx + dx, cy + dy) + arc(cx - dx, cy - dy) + 'Z';
}

/* ---------- Noten ---------- */
// Kopf: v = 1 Ganze, 2 Halbe (beide hohl), sonst gefüllt
export function head(x, y, v) {
  if (v === 1) return '<path class="hd" fill-rule="evenodd" d="' + ellipse(x, y, 0.82, 0.52, 0) + ellipse(x, y, 0.36, 0.27, 55) + '"/>';
  if (v === 2) return '<path class="hd" fill-rule="evenodd" d="' + ellipse(x, y, 0.66, 0.46, -22) + ellipse(x, y, 0.5, 0.19, -32) + '"/>';
  return '<path class="hd" d="' + ellipse(x, y, 0.66, 0.46, -22) + '"/>';
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

/* ---------- Vorzeichen (x: Mitte, y: Höhe des Kopfs) ---------- */
export function accidental(x, y, a) {
  if (a === 1) {
    return line(x - 0.22, y - 1.35, x - 0.22, y + 1.55, 0.12) + line(x + 0.22, y - 1.55, x + 0.22, y + 1.35, 0.12) +
      line(x - 0.55, y - 0.3, x + 0.55, y - 0.62, 0.32) + line(x - 0.55, y + 0.62, x + 0.55, y + 0.3, 0.32);
  }
  if (a === -1) {
    return line(x - 0.35, y - 2.1, x - 0.35, y + 0.55, 0.13) +
      '<path fill="none" stroke="currentColor" stroke-width="0.24" d="M' + f(x - 0.35) + ' ' + f(y - 0.25) + 'C' + f(x + 0.2) + ' ' + f(y - 0.8) + ' ' +
      f(x + 0.85) + ' ' + f(y - 0.35) + ' ' + f(x - 0.35) + ' ' + f(y + 0.5) + '"/>';
  }
  return line(x - 0.3, y - 1.5, x - 0.3, y + 0.55, 0.12) + line(x + 0.3, y - 0.55, x + 0.3, y + 1.5, 0.12) +
    line(x - 0.3, y - 0.3, x + 0.3, y - 0.5, 0.3) + line(x - 0.3, y + 0.5, x + 0.3, y + 0.3, 0.3);
}

/* ---------- Pausen (x: Mitte) ---------- */
// Viertel-, Achtel- und Sechzehntelpause als Linienzug in einem Rahmen von 22 × 30, verkleinert
const REST_PATHS = {
  4: '<path d="M8.5 3.5l5.5 6.5-4.5 5 5.5 6c-3.5-1.5-7-.3-4.5 4" fill="none" stroke-width="2.4" stroke-linejoin="round"/>',
  8: '<circle cx="8.5" cy="11" r="2.6"/><path d="M8 13.2c3 .8 5.5-.3 7.5-3L10 25" fill="none" stroke-width="2"/>',
  16: '<circle cx="9.5" cy="5" r="2.6"/><path d="M9 7.2c3 .8 5.5-.3 7.5-3L9.5 29" fill="none" stroke-width="2"/>' +
    '<circle cx="7.7" cy="13.5" r="2.6"/><path d="M7.2 15.7c3 .8 5-.3 7-2.8" fill="none" stroke-width="2"/>'
};
// Mitte jedes Rahmens (x, y) und Verkleinerung
const REST_FIT = { 4: [11, 14.2, 0.135], 8: [11, 17, 0.12], 16: [12, 17, 0.12] };
export function rest(x, v) {
  if (v === 1) return '<rect x="' + f(x - 0.6) + '" y="' + yOf(6) + '" width="1.2" height="0.5"/>';
  if (v === 2) return '<rect x="' + f(x - 0.6) + '" y="' + (yOf(4) - 0.5) + '" width="1.2" height="0.5"/>';
  const [cx, cy, s] = REST_FIT[v];
  return '<g transform="translate(' + f(x - cx * s) + ' ' + f(yOf(4) - cy * s) + ') scale(' + s + ')" stroke="currentColor">' + REST_PATHS[v] + '</g>';
}

/* ---------- Schlüssel, Taktart, Striche ---------- */
// Violinschlüssel; (x, y) ist der linke Rand auf der g'-Linie, um die sich die Schnecke legt
export function clef(x, y) {
  return '<g class="clef" transform="translate(' + f(x) + ' ' + f(y) + ')" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' +
    // Schnecke um die g'-Linie, dann nach links oben in den Bogen
    '<path stroke-width="0.17" d="M1.85 0.12C1.25 0.18 1.02-0.55 1.55-0.92C2.25-1.4 3.05-0.75 2.75 0.2C2.45 1.1 1.1 1.25 0.55 0.55' +
    'C-0.05-0.25 0.55-1.35 1.2-2.0C1.85-2.65 2.35-3.25 2.25-4.05C2.15-4.85 1.45-4.75 1.25-4.15C1.05-3.55 1.15-2.9 1.25-2.4L1.95 2.35' +
    'C2.05 3.05 1.45 3.35 1.0 3.1"/>' +
    // Kräftiger Bauch rechts und unten
    '<path stroke-width="0.36" d="M2.2-1.12C2.75-0.95 2.95-0.35 2.75 0.2C2.45 1.1 1.1 1.25 0.6 0.62"/>' +
    '<circle cx="1.05" cy="2.85" r="0.38" fill="currentColor" stroke="none"/></g>';
}
export function meter(x, m) {
  const [top, bottom] = m.split('/');
  const t = (s, pos) => '<text x="' + f(x) + '" y="' + yOf(pos) + '" class="mt">' + s + '</text>';
  return t(top, 6) + t(bottom, 2);
}
export function barline(x, k) {
  if (k === 2) return line(x - 0.75, 0, x - 0.75, 4, 0.14) + '<rect x="' + f(x - 0.42) + '" y="0" width="0.45" height="4"/>';
  return line(x, 0, x, 4, 0.14);
}
export const staffLines = (x1, x2) => [0, 1, 2, 3, 4].map((y) => line(x1, y, x2, y, 0.11)).join('');

/* ---------- Kleine Zeichen für die Knöpfe der Leiste ---------- */
const icon = (vb, s) => '<svg class="sym" viewBox="' + vb + '" fill="currentColor" aria-hidden="true">' + s + '</svg>';
// Notenwert v
export function noteIcon(v) {
  // Die Ganze hat keinen Hals und steht deshalb in der Mitte
  if (v === 1) return icon('-0.3 -4 3.4 4.8', head(1, -1.6, 1));
  let s = head(1, 0, v) + stem(1.6, -0.1, -3.5);
  if (v >= 8) s += flags(1.6, -3.5, v === 8 ? 1 : 2, true);
  return icon('-0.3 -4 3.4 4.8', s);
}
export const dotIcon = () => icon('-1.7 -1.7 3.4 3.4', dot(0, 0).replace('r="0.2"', 'r="0.4"'));
export const restIcon = () => icon('-1.3 -0.3 2.6 4.4', rest(0, 4));
