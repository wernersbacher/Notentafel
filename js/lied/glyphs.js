// Zeichen der Notenschrift als SVG, selbst gezeichnet (keine Notenschrift aus dem Netz); der Violinschlüssel kommt aus assets/Violinschlüssel.svg, die Viertelpause aus assets/Viertelpause.png (core/shapes.js).
// Maße in Linienabständen (sp); y wächst nach unten. Linien und Flächen nehmen die Textfarbe (currentColor).

import { f, line, yOf } from '../core/glyphs.js';
// Gemeinsame Zeichen (auch für die Tafel) liegen im Kern; das Lied gibt sie unter den bisherigen Namen weiter
export { yOf, head, stem, ledger, dot, flags, beam, rest, noteIcon, dotIcon, restIcon } from '../core/glyphs.js';

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
// Strich an x: 1 Taktstrich, 2 Schlussstrich, 3 Wiederholung Ende (Punkte links), 4 Wiederholung Anfang (Punkte rechts),
// 5 beides (dicker Strich in der Mitte)
const repDots = (x) => '<circle cx="' + f(x) + '" cy="1.5" r="0.24"/><circle cx="' + f(x) + '" cy="2.5" r="0.24"/>';
const thick = (x1) => '<rect x="' + f(x1) + '" y="0" width="0.45" height="4"/>';
export function barline(x, k) {
  if (k === 2) return line(x - 0.75, 0, x - 0.75, 4, 0.14) + thick(x - 0.42);
  if (k === 3) return repDots(x - 1.3) + line(x - 0.75, 0, x - 0.75, 4, 0.14) + thick(x - 0.42);
  if (k === 4) return thick(x - 0.03) + line(x + 0.75, 0, x + 0.75, 4, 0.14) + repDots(x + 1.3);
  if (k === 5) return repDots(x - 1.6) + line(x - 1.05, 0, x - 1.05, 4, 0.14) + thick(x - 0.22) + line(x + 0.65, 0, x + 0.65, 4, 0.14) + repDots(x + 1.2);
  return line(x, 0, x, 4, 0.14);
}
// Klammer der 1. oder 2. Wiederholung über dem System von x1 bis x2 auf Höhe y; open: rechts ohne Haken
export function volta(x1, x2, y, n, open) {
  return '<path d="M' + f(x1) + ' ' + f(y + 1.6) + 'V' + f(y) + 'H' + f(x2) + (open ? '' : 'V' + f(y + 1.6)) +
    '" fill="none" stroke="currentColor" stroke-width="0.12"/><text class="vt" x="' + f(x1 + 0.4) + '" y="' + f(y + 1.25) + '">' + n + '.</text>';
}
export const staffLines = (x1, x2) => [0, 1, 2, 3, 4].map((y) => line(x1, y, x2, y, 0.11)).join('');
// Haltebogen von x1 nach x2 auf Höhe y, nach unten (down) oder oben gewölbt: eine schmale Sichel
export function tie(x1, x2, y, down) {
  const s = down ? 1 : -1, w = x2 - x1, h = Math.min(1.1, 0.35 + w * 0.12), a = x1 + w * 0.25, b = x2 - w * 0.25;
  return '<path d="M' + f(x1) + ' ' + f(y) + 'C' + f(a) + ' ' + f(y + s * h) + ' ' + f(b) + ' ' + f(y + s * h) + ' ' + f(x2) + ' ' + f(y) +
    'C' + f(b) + ' ' + f(y + s * (h - 0.22)) + ' ' + f(a) + ' ' + f(y + s * (h - 0.22)) + ' ' + f(x1) + ' ' + f(y) + 'Z"/>';
}

