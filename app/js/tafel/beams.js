// Balken und Rhythmussprache der Tafel. Alle Funktionen hier sind rein; die Zell-Grundbegriffe kommen aus cells.js.
import { isNote, isBeat, dur } from './cells.js';

// Achtel und Sechzehntel hintereinander bekommen einen gemeinsamen Balken, solange sie im selben Schlag liegen (zwei
// Achtel, vier Sechzehntel, eine Achtel und zwei Sechzehntel …; beat: Länge eines Schlags in Vierteln, im 6/8-Takt 1,5)
// – bunte Punkte untereinander, eigenständige Notenzeichen untereinander. Gezählt wird vom Zeilenanfang (dort beginnt ein
// Takt). b[c] = 1: mit Balken zur nächsten, 2: am Ende eines Balkens.
export function beams(row, beat = 1) {
  const b = [], at = [];
  const short = (x) => !!(x && x.d < 1 && (isNote(x) || isBeat(x)));
  row.reduce((t, x, c) => { at[c] = t; return t + dur(x); }, 0);
  for (let c = 0; c < row.length; c++) {
    if (!short(row[c])) continue;
    const end = (Math.floor(at[c] / beat + 1e-9) + 1) * beat + 1e-9;
    let k = c;
    while (short(row[k + 1]) && isNote(row[k + 1]) === isNote(row[c]) && at[k + 1] + row[k + 1].d <= end) k++;
    if (k > c) { for (let j = c; j < k; j++) b[j] = 1; b[k] = 2; }
    c = k;
  }
  return b;
}
// Zweiter Balken der Sechzehntel in einer Balkengruppe (b aus beams): s[c] = 1 durchgehend zur nächsten Sechzehntel,
// 3 kurzer Ansatz nach rechts, 4 nach links (eine einzelne Sechzehntel neben Achteln)
export function subBeams(row, b) {
  const s = [], sixteenth = (c) => !!(b[c] && row[c] && row[c].d === 0.25);
  for (let c = 0; c < row.length; c++) {
    if (!sixteenth(c)) continue;
    if (b[c] === 1 && sixteenth(c + 1)) s[c] = 1;
    else if (!(b[c - 1] === 1 && sixteenth(c - 1))) s[c] = b[c] === 1 ? 3 : 4;
  }
  return s;
}

// Rhythmussprache unter einem Notenzeichen: Viertel ta, Halbe taja, punktierte Halbe tajaja, Ganze tajajaja; jede
// Achtel ti (zwei mit Balken verbindet auf der Tafel ein Bogen); Sechzehntel ti ri ti ri – ri steht auf der zweiten
// Sechzehntel einer Achtel (odd). Pausen und leere Plätze: nichts.
const SYL = { 1: 'ta', 1.5: 'tai', 2: 'taja', 3: 'tajaja', 4: 'tajajaja' };
// Verteilt auf die Schläge (bei Breite nach Notenlänge): [Silbe, Abstand in Sechzehnteln] – Halbe ta (Schlag 1) ja
// (Schlag 2), punktierte Halbe ta ja ja, Ganze ta ja ja ja; alles andere eine Silbe am Anfang
export function syllableParts(c, beam, odd) {
  if ((isBeat(c) || isNote(c)) && c.d === 1.5) return [['ta', 0], ['i', 4]]; // punktierte Viertel: ta (i auf dem Schlag danach)
  const n = isBeat(c) || (isNote(c) && c.d) ? Math.round(c.d) : 0;
  if (n < 2) { const s = syllable(c, beam, odd); return s ? [[s, 0]] : []; }
  return Array.from({ length: n }, (_, k) => [k ? 'ja' : 'ta', k * 4]);
}
export function syllable(c, beam, odd) {
  if (!(isBeat(c) || (isNote(c) && c.d))) return '';
  if (c.d === 0.5) return 'ti';
  if (c.d === 0.25) return odd ? 'ri' : 'ti';
  return SYL[c.d] || '';
}
