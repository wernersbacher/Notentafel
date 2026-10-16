// Feste Größen und Tabellen der App

// Zeilen sind beliebig lang (bis MAX_LEN)
export const MAX_LEN = 32, MAX_ROWS = 8, START_ROWS = 3;
// So viele Schritte nimmt „Rückgängig“ zurück
export const HISTORY = 60;

// f = Frequenz in Hz (C = c', hohe Töne eine Oktave darüber).
// Die Schrift ist auf allen Tönen schwarz; jede Farbe muss dafür hell genug sein (Kontrast ≥ 4,5).
export const NOTES = [
  { id: 'C',   l: 'C',   bg: '#e5383b', n: 'C',  f: 261.63 },
  { id: 'D',   l: 'D',   bg: '#f58a1f', n: 'D',  f: 293.66 },
  { id: 'E',   l: 'E',   bg: '#f7d11e', n: 'E',  f: 329.63 },
  { id: 'F',   l: 'F',   bg: '#9bd74a', n: 'F',  f: 349.23 },
  { id: 'G',   l: 'G',   bg: '#1e8449', n: 'G',  f: 392.00 },
  { id: 'A',   l: 'A',   bg: '#9b6fd1', n: 'A',  f: 440.00 },
  { id: 'H',   l: 'H',   bg: '#ec4899', n: 'H',  f: 493.88 },
  { id: 'C+',  l: 'C',   up: 1, bg: '#e5383b', n: 'hohes C', f: 523.25 },
  { id: 'D+',  l: 'D',   up: 1, bg: '#e5383b', n: 'hohes D', f: 587.33 },
  { id: 'E+',  l: 'E',   up: 1, bg: '#e5383b', n: 'hohes E', f: 659.25 },
  { id: 'F+',  l: 'F',   up: 1, bg: '#e5383b', n: 'hohes F', f: 698.46 },
  { id: 'Fis', l: 'F', sharp: 1, bg: '#9bd74a', n: 'Fis', f: 369.99 },
  { id: 'B',   l: 'B',   bg: '#ec4899', n: 'B',  f: 466.16 }
];
export const NOTE_BY = Object.fromEntries(NOTES.map((n) => [n.id, n]));
// Gruppen der Leiste: Grundtöne, hohe Töne, Halbtöne
export const GROUPS = [['C', 'D', 'E', 'F', 'G', 'A', 'H'], ['C+', 'D+', 'E+', 'F+'], ['Fis', 'B']];

// Farbthemen überschreiben nur einzelne Töne; alles andere kommt aus NOTES
export const THEMES = [
  { id: 'original', name: 'Original', desc: 'Hohe Töne sind alle rot.', colors: {} },
  { id: 'oktave', name: 'Oktavfarben', desc: 'Hohe Töne in der Farbe ihres Grundtons.', colors: {
    'D+': '#f58a1f', 'E+': '#f7d11e', 'F+': '#9bd74a'
  } }
];
export const THEME_BY = Object.fromEntries(THEMES.map((t) => [t.id, t]));
// Töne, die im Menü als Farbmuster eines Themas gezeigt werden
export const SWATCHES = ['C', 'D', 'E', 'F', 'C+', 'D+', 'E+', 'F+'];

// Tonlängen in Schlägen; Viertel (1) ist der Normalfall
export const DURS = [
  { d: 0.5, l: '½', n: 'Achtel', p: 'Achtelpause' },
  { d: 1,   l: '1', n: 'Viertel', p: 'Viertelpause' },
  { d: 2,   l: '2', n: 'Halbe', p: 'Halbe Pause' },
  { d: 3,   l: '3', n: 'Punktierte Halbe', p: 'Punktierte halbe Pause' },
  { d: 4,   l: '4', n: 'Ganze', p: 'Ganze Pause' }
];
export const DUR_BY = Object.fromEntries(DURS.map((x) => [x.d, x]));

// Taktarten zur Auswahl; sie stehen vorn in der Zeile
export const METERS = ['2/2', '2/4', '3/4', '4/4', '6/8'];
// Zählzeiten zum Tippen: 1–6 und „+“ (und)
export const COUNTS = ['1', '2', '3', '4', '5', '6', '+'];

export const TEMPO = { min: 50, max: 160, start: 90 };
