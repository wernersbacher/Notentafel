// Feste Größen und Tabellen der Tafel (Melodie und Rhythmus)
import { TONE_COLORS as T, SEMI_COLORS as S } from '../core/colors.js';

// Zeilen sind beliebig lang (bis MAX_LEN)
export const MAX_LEN = 32, MAX_ROWS = 8, START_ROWS = 3;
// Höchstens so viele Plätze stehen in einer Zeile; dann geht es automatisch in der nächsten weiter.
// (Ältere Stände mit längeren Zeilen, bis MAX_LEN, bleiben, wie sie sind.)
export const MAX_PER_ROW = 10;
// Rhythmus: so viele Felder (Schläge) hat jede Zeile; die Felder werden so breit, dass sie die Zeile füllen
export const RHY_PER_ROW = 12;

// f = Frequenz in Hz (C = c', hohe Töne eine Oktave darüber).
// Farben aus core/colors.js (dort auch die Regel für den Kontrast).
export const NOTES = [
  { id: 'C',   l: 'C',   bg: T.C, n: 'C',  f: 261.63 },
  { id: 'D',   l: 'D',   bg: T.D, n: 'D',  f: 293.66 },
  { id: 'E',   l: 'E',   bg: T.E, n: 'E',  f: 329.63 },
  { id: 'F',   l: 'F',   bg: T.F, n: 'F',  f: 349.23 },
  { id: 'G',   l: 'G',   bg: T.G, n: 'G',  f: 392.00 },
  { id: 'A',   l: 'A',   bg: T.A, n: 'A',  f: 440.00 },
  { id: 'H',   l: 'H',   bg: T.H, n: 'H',  f: 493.88 },
  { id: 'C+',  l: 'C',   up: 1, bg: T.C, n: 'hohes C', f: 523.25 },
  { id: 'D+',  l: 'D',   up: 1, bg: T.C, n: 'hohes D', f: 587.33 },
  { id: 'E+',  l: 'E',   up: 1, bg: T.C, n: 'hohes E', f: 659.25 },
  { id: 'F+',  l: 'F',   up: 1, bg: T.C, n: 'hohes F', f: 698.46 },
  { id: 'Fis', l: 'F', sharp: 1, bg: S.Fis, n: 'Fis', f: 369.99 },
  { id: 'B',   l: 'B',   bg: S.B, n: 'B',  f: 466.16 },
  // weitere Halbtöne (in der Leiste aufklappbar)
  { id: 'Cis', l: 'C', sharp: 1, bg: S.Cis, n: 'Cis', f: 277.18 },
  { id: 'Dis', l: 'D', sharp: 1, bg: S.Dis, n: 'Dis', f: 311.13 },
  { id: 'Gis', l: 'G', sharp: 1, bg: S.Gis, n: 'Gis', f: 415.30 },
  { id: 'Cis+', l: 'C', up: 1, sharp: 1, bg: T.C, n: 'hohes Cis', f: 554.37 },
  { id: 'Dis+', l: 'D', up: 1, sharp: 1, bg: T.C, n: 'hohes Dis', f: 622.25 }
];
export const NOTE_BY = Object.fromEntries(NOTES.map((n) => [n.id, n]));
// Gruppen der Leiste: Grundtöne, hohe Töne, Halbtöne
export const GROUPS = [['C', 'D', 'E', 'F', 'G', 'A', 'H'], ['C+', 'D+', 'E+', 'F+'], ['Fis', 'B']];
// Weitere Halbtöne, mit „weitere Halbtöne“ aufklappbar
export const MORE_SEMIS = ['Cis', 'Dis', 'Gis', 'Cis+', 'Dis+'];

// Farbthemen überschreiben nur einzelne Töne; alles andere kommt aus NOTES
export const THEMES = [
  { id: 'original', name: 'Original', desc: 'Hohe Töne sind alle rot.', colors: {} },
  { id: 'oktave', name: 'Oktavfarben', desc: 'Hohe Töne in der Farbe ihres Grundtons.', colors: {
    'D+': T.D, 'E+': T.E, 'F+': T.F, 'Cis+': S.Cis, 'Dis+': S.Dis
  } }
];
export const THEME_BY = Object.fromEntries(THEMES.map((t) => [t.id, t]));
// Töne, die im Menü als Farbmuster eines Themas gezeigt werden
export const SWATCHES = ['C', 'D', 'E', 'F', 'C+', 'D+', 'E+', 'F+'];

// Tonlängen in Schlägen; Viertel (1) ist der Normalfall. Punktierte Werte entstehen mit dem Punkt (DOTTED).
export const DURS = [
  { d: 0.5, l: '½', n: 'Achtel', p: 'Achtelpause' },
  { d: 1,   l: '1', n: 'Viertel', p: 'Viertelpause' },
  { d: 1.5, l: '1½', n: 'Punktierte Viertel', p: 'Punktierte Viertelpause' },
  { d: 2,   l: '2', n: 'Halbe', p: 'Halbe Pause' },
  { d: 3,   l: '3', n: 'Punktierte Halbe', p: 'Punktierte halbe Pause' },
  { d: 4,   l: '4', n: 'Ganze', p: 'Ganze Pause' }
];
// Knöpfe wie im Lied: Ganze, Halbe, Viertel, Achtel (der Platz der Sechzehntel bleibt frei), dann der Punkt
export const VALUE_BTNS = [4, 2, 1, 0.5];
// Punkt an- und ausschalten: Halbe ↔ punktierte Halbe, Viertel ↔ punktierte Viertel
export const DOTTED = { 2: 3, 3: 2, 1: 1.5, 1.5: 1 };
export const DUR_BY = Object.fromEntries(DURS.map((x) => [x.d, x]));

// Taktarten zur Auswahl; sie stehen vorn in der Zeile
export const METERS = ['2/2', '2/4', '3/4', '4/4', '6/8'];
// Zählzeiten zum Tippen: 1–6 und „+“ (und)
export const COUNTS = ['1', '2', '3', '4', '5', '6', '+'];
