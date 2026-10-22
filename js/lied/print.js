// Druckansicht des Lieds (für „Als PDF speichern“ im Druckdialog). Rein: liefert HTML, ohne DOM.
// Gedruckt wird so, wie es eingestellt ist (Notennamen, Zählzeiten, Taktstriche, Notengröße), nur ohne Markierung
// und rote Takte. Jedes System ist ein eigenes SVG, damit kein System über einen Seitenumbruch zerschnitten wird.
import { layout } from './layout.js';
import { sheetSVG } from './sheet.js';

// Satzbreite auf A4 hochkant mit 15 mm Rand
export const PAGE_MM = 180;
// Linienabstand in mm je nach Notengröße (normal entspricht üblichen Noten, Systemhöhe 7,2 mm)
const SP_MM = { 1: 1.8, 2: 2.4, 3: 3.2 };

const xmlEsc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

// o: { name, autoBar, names, colors, counts, lyrics, wrap, size }
export function printHTML(song, { name = '', autoBar = true, names = false, colors = false, counts = false, lyrics = true, wrap = true, size = 1 } = {}) {
  const sp = SP_MM[size] || SP_MM[1], page = PAGE_MM / sp;
  // Mit Umbruch wird auf die Seitenbreite umbrochen; ohne bleiben die Zeilen von Hand, und ist eine breiter als die
  // Seite, wird alles kleiner. Alle Zeilen außer der letzten reichen über die ganze Breite (Blocksatz wie im Notensatz).
  const o = { autoBar, counts, lyrics, ghost: false };
  const J = wrap ? page - 0.1 : Math.max(page - 0.1, ...layout(song, o).systems.map((s) => s.width));
  const lay = layout(song, { ...o, width: wrap ? J : 0, justify: J });
  const W = Math.max(J, ...lay.systems.map((s) => s.width));
  const { parts } = sheetSVG(song, lay, { width: W, sel: -1, clean: true, insert: false, names, colors, counts, lyrics, target: -1, playing: -1, fit: true });
  const svgs = parts.map((p) =>
    '<svg class="score" viewBox="0 0 ' + W + ' ' + +p.height.toFixed(3) + '" style="width:' + +(W * sp).toFixed(2) + 'mm" fill="currentColor">' + p.svg + '</svg>'
  ).join('');
  return (name ? '<h1>' + xmlEsc(name) + '</h1>' : '') + svgs;
}
