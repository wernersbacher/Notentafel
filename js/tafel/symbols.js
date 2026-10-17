// HTML-Bausteine für Töne, Noten- und Pausenzeichen und Taktarten
import { head, stem, flags, dot, rest, line } from '../core/glyphs.js';
import { THEME_BY } from './config.js';
import { settings } from './state.js';

// Farbe eines Tons im gewählten Thema, als CSS-Variable für style="…"
export const colorStyle = (n) => '--c:' + (THEME_BY[settings.theme].colors[n.id] || n.bg);

// Buchstabe des Tons, bei hohen Tönen mit Pfeil nach oben, bei Fis mit Kreuz
export function noteLabel(n) {
  const arrow = n.up
    ? '<svg class="arr" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V5M5.5 11.5 12 5l6.5 6.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '';
  return arrow + '<span class="ltr">' + n.l + (n.sharp ? '<span class="sharp">♯</span>' : '') + '</span>';
}

// Noten- und Pausenzeichen der Tafel: dieselben Formen wie im Lied (core/glyphs.js), gesetzt in einen festen Rahmen
// (22 × 30), damit das CSS Balken und Notenlinie ansetzen kann. Ein Linienabstand des Lieds sind K Einheiten: Der Kopf
// sitzt bei y = 24.6, der Hals (rechts vom Kopf bei x = 14) reicht bis y = 2.55; die Notenlinie der Zeile liegt bei y = 15.
// beam: Achtel ohne Fähnchen, der Balken zur nächsten Achtel kommt aus dem CSS.
const K = 6.3;
const sym = (s) => '<svg class="sym" viewBox="0 0 22 30" fill="currentColor" aria-hidden="true">' + s + '</svg>';
// Länge in Schlägen → Notenwert des Lieds (1 Ganze … 8 Achtel)
const V = { 0.5: 8, 1: 4, 1.5: 4, 2: 2, 3: 2, 4: 1 };
export function noteSym(d, beam) {
  const v = V[d], hx = v === 1 ? 11 : 14 - 0.6 * K;
  let s = head(0, 0, v);
  if (v > 1) s += stem(0.6, -0.1, -3.5);
  if (v === 8 && !beam) s += flags(0.6, -3.5, 1, true);
  if (d === 1.5 || d === 3) s += dot(1.45, -0.3);
  return sym('<g transform="translate(' + hx + ' 24.6) scale(' + K + ')">' + s + '</g>');
}
// Pausen wie im Lied; die Linie, an der sie stehen (die Mittellinie, bei der Ganzen die Linie darüber), kommt auf y = 15.
// onLine: Die Zeile hat eine Notenlinie; sonst bekommen Ganze und Halbe ein kurzes Linienstück, an dem sie hängen bzw. liegen.
export function restSym(d, onLine) {
  const v = V[d], lineY = v === 1 ? 1 : 2;
  let s = rest(0, v);
  if (!onLine && v <= 2) s += line(-1, lineY, 1, lineY, 0.14);
  if (d === 1.5 || d === 3) s += dot(v === 2 ? 1 : 0.9, lineY - 0.5);
  return sym('<g transform="translate(11 ' + (15 - lineY * K) + ') scale(' + K + ')">' + s + '</g>');
}

// Taktart als zwei Zahlen übereinander
export function meterHTML(m) {
  const [top, bottom] = m.split('/');
  return '<span class="mtr"><span>' + top + '</span><span>' + bottom + '</span></span>';
}

export const ICONS = {
  clearCount: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h11v14H9l-6-7z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M12 9.5l5 5M17 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
};
