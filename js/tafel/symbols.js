// HTML-Bausteine für Töne, Noten- und Pausenzeichen und Taktarten
import { QUARTER_REST } from '../core/shapes.js';
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

// Noten- und Pausenzeichen, alle im selben Rahmen (22 × 30), damit Hals und Balken sauber anschließen.
// beam: Achtel ohne Fähnchen, der Balken zur nächsten Achtel kommt aus dem CSS.
const HEAD = 'cx="9.4" cy="24.6" transform="rotate(-22 9.4 24.6)"';
const sym = (s) => '<svg class="sym" viewBox="0 0 22 30" stroke="currentColor" stroke-linecap="round" aria-hidden="true">' + s + '</svg>';
// thin: feinere Striche (Rhythmus-Tafel, wo die Zeichen groß und ohne Kreis stehen)
export function noteSym(d, beam, thin) {
  const w = thin ? { stem: 1.5, ring: 1.8, whole: 2, flag: 1.6, rx: 5, ry: 3.5 } : { stem: 2.4, ring: 2.4, whole: 2.6, flag: 2.2, rx: 5.3, ry: 3.8 };
  let s;
  if (d === 4) s = '<ellipse cx="11" cy="24.6" rx="6.4" ry="4.3" fill="none" stroke-width="' + w.whole + '"/>';
  else {
    s = '<path d="M14 24V2.5" stroke-width="' + w.stem + '"/>' + (d >= 2
      ? '<ellipse ' + HEAD + ' rx="4.5" ry="3.1" fill="none" stroke-width="' + w.ring + '"/>'
      : '<ellipse ' + HEAD + ' rx="' + w.rx + '" ry="' + w.ry + '" fill="currentColor" stroke="none"/>');
    if (d === 0.5 && !beam) s += '<path d="M14 2.5c.5 5 7 6.5 5.2 14" fill="none" stroke-width="' + w.flag + '"/>';
    if (d === 3) s += '<circle cx="19.8" cy="25" r="1.9" fill="currentColor" stroke="none"/>';
  }
  return sym(s);
}
const RESTS = {
  0.5: '<circle cx="8.5" cy="11" r="2.6" fill="currentColor" stroke="none"/><path d="M8 13.2c3 .8 5.5-.3 7.5-3L10 25" fill="none" stroke-width="2"/>',
  // Viertelpause: Fläche aus core/shapes.js (Rahmen 64 × 64), so hoch wie zuvor und in der Mitte des Rahmens
  1: '<path transform="translate(0.15 3.2) scale(0.35)" d="' + QUARTER_REST + '" fill="currentColor" stroke="none"/>',
  2: '<path d="M3 18.5h16" stroke-width="1.8"/><rect x="6" y="13" width="10" height="5.5" fill="currentColor" stroke="none"/>',
  3: '<path d="M2 18.5h14" stroke-width="1.8"/><rect x="4.5" y="13" width="9" height="5.5" fill="currentColor" stroke="none"/><circle cx="19" cy="15.5" r="1.9" fill="currentColor" stroke="none"/>',
  4: '<path d="M3 11.5h16" stroke-width="1.8"/><rect x="6" y="11.5" width="10" height="5.5" fill="currentColor" stroke="none"/>'
};
// onLine: Die Pause steht auf der Notenlinie der Zeile; dann fällt ihr eigenes kurzes Linienstück weg (sonst wäre die
// Linie dort doppelt so dick), es bleibt nur das Rechteck
export const restSym = (d, onLine) => sym(onLine ? RESTS[d].replace(/<path d="M\d+ [\d.]+h\d+" stroke-width="1.8"\/>/, '') : RESTS[d]);

// Taktart als zwei Zahlen übereinander
export function meterHTML(m) {
  const [top, bottom] = m.split('/');
  return '<span class="mtr"><span>' + top + '</span><span>' + bottom + '</span></span>';
}

export const ICONS = {
  clearCount: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h11v14H9l-6-7z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M12 9.5l5 5M17 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
};
