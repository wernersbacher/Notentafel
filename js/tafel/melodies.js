import { START_ROWS } from './config.js';

// Mitgelieferte Lieder, immer im Menü ladbar. „|“ trennt Zeilen, „-“ ist eine Pause,
// „:2“ hängt die Länge in Schlägen an (ohne Angabe ein Schlag), z. B. „G:2“ oder „-:2“.
// Bruder Jakob und Ode an die Freude stehen in F-Dur, weil der Tonvorrat unter dem C endet.
// Die punktierte Viertel der Ode gibt es nicht, dort stehen zwei Viertel.
export const MELODIES = [
  { name: 'Alle meine Entchen', meter: '4/4', notes: 'C D E F G:2 G:2 | A A A A G:4 | A A A A G:4 | F F F F E:2 E:2 | D D D D C:4' },
  { name: 'Hänschen klein', meter: '4/4', notes: 'G E E:2 F D D:2 | C D E F G G G:2 | G E E:2 F D D:2 | C E G G C:4 | D D D D D E F:2 | E E E E E F G:2 | G E E:2 F D D:2 | C E G G C:4' },
  { name: 'Kuckuck, Kuckuck', meter: '3/4', notes: 'G:2 E G:2 E F E D C:3 | D D E F:2 D E E F G:2 E | G:2 E G:2 E F E D C:3' },
  { name: 'Bruder Jakob', meter: '4/4', notes: 'F G A F F G A F | A B C+:2 A B C+:2 | C+:.5 D+:.5 C+:.5 B:.5 A F | C+:.5 D+:.5 C+:.5 B:.5 A F | F C F:2 F C F:2' },
  { name: 'Morgen kommt der Weihnachtsmann', meter: '4/4', notes: 'C C G G A A G:2 | F F E E D D C:2 | G G F F E E D:2 | G G F F E E D:2 | C C G G A A G:2 | F F E E D D C:2' },
  { name: 'Ode an die Freude', meter: '4/4', notes: 'A A B C+ C+ B A G | F F G A A G G:2 | A A B C+ C+ B A G | F F G A G F F:2 | G G A F G A:.5 B:.5 A F | G A:.5 B:.5 A G F G C:2 | A A B C+ C+ B A G | F F G A G F F:2' }
];

// Macht aus der Schreibweise oben die Zeilen der Tafel
export function melodyRows(m) {
  const rs = m.notes.split('|').map((line) =>
    line.trim().split(/\s+/).map((tok) => {
      const [id, len] = tok.split(':'), d = len ? +len : 1;
      if (id === '-') return { k: 'r', d };
      return { n: id, h: '', d };
    }));
  while (rs.length < START_ROWS) rs.push([]);
  rs[0].meter = m.meter;
  return rs;
}
