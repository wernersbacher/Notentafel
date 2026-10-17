// Zeichen der Notenschrift als SVG, selbst gezeichnet (keine Notenschrift aus dem Netz); der Violinschlüssel kommt aus Violinschlüssel.svg, die Viertelpause aus Viertelpause.png (core/shapes.js).
// Maße in Linienabständen (sp); y wächst nach unten. Linien und Flächen nehmen die Textfarbe (currentColor).

import { QUARTER_REST } from '../core/shapes.js';

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

/* ---------- Schlüssel, Taktart, Striche ---------- */
// Violinschlüssel: Umriss aus Violinschlüssel.svg (Potrace), in dessen Einheiten mit y nach oben.
// Breite 957 bis 5447, Höhe 5 bis 12799; die Mitte der Schnecke liegt bei y = CLEF_G.
const CLEF_D = 'M4128 12781 c-166 -53 -386 -249 -543 -482 -83 -123 -238 -429 -314 -622 -167 -425 -246 -822 -258 -1307 -9 -350 13 -649 88 -1209 39 -293 40 -305 22 -321 -10 -9 -112 -96 -228 -192 -829 -692 -1259 -1160 -1574 -1715 -183 -323 -306 -697 -352 -1068 -16 -126 -16 -417 0 -555 44 -391 178 -789 374 -1115 138 -230 375 -500 587 -669 400 -318 859 -520 1292 -567 127 -14 488 -5 608 14 47 8 87 13 88 11 2 -1 42 -285 89 -631 l85 -628 2 -235 c1 -249 -5 -311 -51 -475 -106 -384 -378 -636 -766 -710 -103 -20 -326 -19 -439 0 -191 34 -347 104 -443 199 l-60 60 105 8 c315 25 509 136 615 351 52 106 68 196 62 352 -9 227 -71 380 -212 520 -89 89 -157 133 -267 173 -66 24 -86 27 -213 27 -111 0 -151 -4 -195 -19 -242 -83 -419 -260 -499 -501 -43 -128 -55 -219 -48 -360 21 -408 258 -772 627 -963 111 -58 213 -94 354 -124 132 -28 450 -31 590 -5 411 78 705 256 893 543 202 308 250 656 169 1239 -86 627 -167 1237 -164 1239 2 2 39 15 83 30 298 105 598 308 790 537 313 373 455 839 416 1366 -23 312 -79 530 -197 768 -113 229 -270 418 -469 568 -101 76 -308 183 -430 222 -183 60 -417 91 -582 79 -91 -6 -92 -6 -97 17 -3 13 -22 146 -41 294 -20 149 -58 436 -86 640 l-50 370 28 24 c91 77 389 360 514 487 506 518 752 1038 834 1764 57 512 60 849 9 1215 -68 493 -208 904 -401 1177 -133 189 -202 225 -345 179z m284 -1129 c100 -44 172 -142 204 -279 19 -82 21 -275 4 -388 -40 -274 -185 -663 -344 -925 -147 -240 -434 -586 -662 -795 -164 -151 -264 -238 -268 -234 -4 4 -25 147 -46 312 -51 406 -25 763 84 1139 132 451 309 792 526 1008 108 107 171 149 270 177 60 17 173 10 232 -15z m-1043 -4513 l77 -577 -56 -17 c-229 -71 -507 -257 -672 -449 -251 -293 -390 -635 -405 -996 -15 -383 122 -753 372 -1006 143 -146 306 -238 477 -272 71 -14 79 -14 102 2 30 19 34 56 10 81 -9 9 -44 30 -78 47 -249 125 -411 349 -462 641 -73 415 180 878 579 1062 67 31 234 82 242 73 1 -1 77 -563 168 -1248 113 -848 162 -1247 155 -1251 -6 -4 -56 -14 -112 -23 -284 -43 -581 -46 -780 -6 -408 81 -848 336 -1099 639 -305 366 -448 745 -448 1183 0 237 31 425 106 653 139 424 366 769 795 1208 265 272 942 878 949 849 2 -9 38 -276 80 -593z m596 -1415 c166 -32 355 -114 487 -214 95 -72 235 -224 291 -317 135 -225 184 -429 174 -728 -12 -391 -132 -688 -367 -909 -107 -101 -313 -226 -411 -251 l-25 -6 -27 203 c-15 112 -54 401 -87 643 -173 1284 -210 1562 -210 1582 0 21 3 22 48 17 26 -3 83 -12 127 -20z';
const CLEF_X0 = 957, CLEF_G = 4500, CLEF_S = 7.5 / 12794; // 7,5 Linienabstände hoch
// (x, y) ist der linke Rand auf der g'-Linie, um die sich die Schnecke legt
export function clef(x, y) {
  return '<g class="clef" transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + CLEF_S.toFixed(6) + ' ' + (-CLEF_S).toFixed(6) +
    ') translate(' + -CLEF_X0 + ' ' + -CLEF_G + ')"><path d="' + CLEF_D + '"/></g>';
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
// Haltebogen von x1 nach x2 auf Höhe y, nach unten (down) oder oben gewölbt: eine schmale Sichel
export function tie(x1, x2, y, down) {
  const s = down ? 1 : -1, w = x2 - x1, h = Math.min(1.1, 0.35 + w * 0.12), a = x1 + w * 0.25, b = x2 - w * 0.25;
  return '<path d="M' + f(x1) + ' ' + f(y) + 'C' + f(a) + ' ' + f(y + s * h) + ' ' + f(b) + ' ' + f(y + s * h) + ' ' + f(x2) + ' ' + f(y) +
    'C' + f(b) + ' ' + f(y + s * (h - 0.22)) + ' ' + f(a) + ' ' + f(y + s * (h - 0.22)) + ' ' + f(x1) + ' ' + f(y) + 'Z"/>';
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
