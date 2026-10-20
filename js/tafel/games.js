// Einstellungen von „Üben und Spielen“ auf der Tafel. Rhythmus: echo gilt für alle Rhythmus-Spiele (Rhythmus-Echo,
// Welcher war's?, Vom Blatt klatschen), dazu which. Farbnoten: quiz (Tonnamen-Quiz; die Töne gelten auch für
// Melodie-Echo und Höher oder tiefer?), dazu melo (Melodie-Echo).
// Eigener Speicherplatz, damit die Einstellungen der Tafel selbst unberührt bleiben.
import { readJSON, writeJSON } from '../core/store.js';

const KEY = 'notentafel.games.v1';
const pickOf = (v, list, d) => (list.includes(v) ? v : d);
const objOf = (v) => (v && typeof v === 'object' ? v : {});

export function cleanGames(s) {
  s = objOf(s);
  const e = objOf(s.echo), q = objOf(s.quiz), w = objOf(s.which), m = objOf(s.melo);
  return {
    which: { count: pickOf(w.count, [2, 3, 4], 3) }, // Welcher war's?: so viele Rhythmen zur Auswahl
    melo: {
      len: pickOf(m.len, [2, 3, 4, 5], 3), // Melodie-Echo: so viele Töne
      steps: m.steps !== false // nur Nachbartöne (Schritte), sonst auch Sprünge
    },
    echo: {
      meter: pickOf(e.meter, ['2/4', '3/4', '4/4', '6/8'], '4/4'), // Taktart
      bars: pickOf(e.bars, [1, 2, 3], 2), // Länge in Takten
      notes: pickOf(e.notes, [1, 2, 3], 1), // Notenwerte: leicht, mittel, schwer
      rests: pickOf(e.rests, [0, 1, 2, 3], 0), // Pausen: ohne, leicht, mittel, schwer
      pulse: e.pulse !== false, // leiser Grundschlag unter dem Rhythmus
      sound: pickOf(e.sound, ['clap', 'wood', 'bell', 'piano'], 'clap') // Klatschen, Woodblock, Glockenspiel, Klavier
    },
    quiz: {
      mode: pickOf(q.mode, ['rand', 'song'], 'rand'), // Zufallspunkt oder Melodie durchgehen
      ask: pickOf(q.ask, ['color', 'name'], 'color'), // Farbe zeigen, Namen tippen – oder Namen zeigen, Farbe tippen
      high: !!q.high, // auch die hohen Töne (hohes C bis hohes F)
      semis: pickOf(q.semis, [0, 1, 2], 0) // Halbtöne: keine, Fis und B, alle
    }
  };
}
export const games = cleanGames(readJSON(KEY));
export const persistGames = () => writeJSON(KEY, games);
