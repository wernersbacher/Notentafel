// HTML-Bausteine für Töne, Noten- und Pausenzeichen und Taktarten
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
export function noteSym(d, beam) {
  let s;
  if (d === 4) s = '<ellipse cx="11" cy="24.6" rx="6.4" ry="4.3" fill="none" stroke-width="2.6"/>';
  else {
    s = '<path d="M14 24V2.5" stroke-width="2.4"/>' + (d >= 2
      ? '<ellipse ' + HEAD + ' rx="4.5" ry="3.1" fill="none" stroke-width="2.4"/>'
      : '<ellipse ' + HEAD + ' rx="5.3" ry="3.8" fill="currentColor" stroke="none"/>');
    if (d === 0.5 && !beam) s += '<path d="M14 2.5c.5 5 7 6.5 5.2 14" fill="none" stroke-width="2.2"/>';
    if (d === 3) s += '<circle cx="19.8" cy="25" r="1.9" fill="currentColor" stroke="none"/>';
  }
  return sym(s);
}
const RESTS = {
  0.5: '<circle cx="8.5" cy="11" r="2.6" fill="currentColor" stroke="none"/><path d="M8 13.2c3 .8 5.5-.3 7.5-3L10 25" fill="none" stroke-width="2"/>',
  1: '<path d="M8.5 3.5l5.5 6.5-4.5 5 5.5 6c-3.5-1.5-7-.3-4.5 4" fill="none" stroke-width="2.4" stroke-linejoin="round"/>',
  2: '<path d="M3 18.5h16" stroke-width="1.8"/><rect x="6" y="13" width="10" height="5.5" fill="currentColor" stroke="none"/>',
  3: '<path d="M2 18.5h14" stroke-width="1.8"/><rect x="4.5" y="13" width="9" height="5.5" fill="currentColor" stroke="none"/><circle cx="19" cy="15.5" r="1.9" fill="currentColor" stroke="none"/>',
  4: '<path d="M3 11.5h16" stroke-width="1.8"/><rect x="6" y="11.5" width="10" height="5.5" fill="currentColor" stroke="none"/>'
};
export const restSym = (d) => sym(RESTS[d]);

// Taktart als zwei Zahlen übereinander
export function meterHTML(m) {
  const [top, bottom] = m.split('/');
  return '<span class="mtr"><span>' + top + '</span><span>' + bottom + '</span></span>';
}

export const ICONS = {
  play: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>',
  stop: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
  clearCount: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h11v14H9l-6-7z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M12 9.5l5 5M17 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
};
