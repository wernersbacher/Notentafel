import { START_ROWS } from './config.js';
import { byGroup } from '../core/groups.js';

// Mitgelieferte Lieder, immer im Menü ladbar. „|“ trennt Zeilen, „-“ ist eine Pause,
// „:2“ hängt die Länge in Schlägen an (ohne Angabe ein Schlag), z. B. „G:2“ oder „-:2“.
// Bruder Jakob und Ode an die Freude stehen in F-Dur, weil der Tonvorrat unter dem C endet.
// Die punktierte Viertel der Ode gibt es nicht, dort stehen zwei Viertel.
export const MELODIES = byGroup([
  { name: 'Alle meine Entchen', group: 'Kinderlieder', meter: '4/4', notes: 'C D E F G:2 G:2 | A A A A G:4 | A A A A G:4 | F F F F E:2 E:2 | D D D D C:4' },
  { name: 'Hänschen klein', group: 'Kinderlieder', meter: '4/4', notes: 'G E E:2 F D D:2 | C D E F G G G:2 | G E E:2 F D D:2 | C E G G C:4 | D D D D D E F:2 | E E E E E F G:2 | G E E:2 F D D:2 | C E G G C:4' },
  { name: 'Kuckuck, Kuckuck', group: 'Frühling', meter: '3/4', notes: 'G:2 E G:2 E F E D C:3 | D D E F:2 D E E F G:2 E | G:2 E G:2 E F E D C:3' },
  { name: 'Bruder Jakob', group: 'Kinderlieder', meter: '4/4', notes: 'F G A F F G A F | A B C+:2 A B C+:2 | C+:.5 D+:.5 C+:.5 B:.5 A F | C+:.5 D+:.5 C+:.5 B:.5 A F | F C F:2 F C F:2' },
  { name: 'Morgen kommt der Weihnachtsmann', group: 'Weihnachten', meter: '4/4', notes: 'C C G G A A G:2 | F F E E D D C:2 | G G F F E E D:2 | G G F F E E D:2 | C C G G A A G:2 | F F E E D D C:2' },
  { name: 'Ode an die Freude', group: 'Feste und mehr', meter: '4/4', notes: 'A A B C+ C+ B A G | F F G A A G G:2 | A A B C+ C+ B A G | F F G A G F F:2 | G G A F G A:.5 B:.5 A F | G A:.5 B:.5 A G F G C:2 | A A B C+ C+ B A G | F F G A G F F:2' },
  // Neu (Quellen wie im Notenblatt). Vogelhochzeit mit verdoppelten Werten als 4/4, damit die Sechzehntel bleiben;
  // Geburtstag in G-Dur (in C-Dur ginge es über f''), punktierte Achtel als zwei Achtel.
  { name: 'Alle Vögel sind schon da', group: 'Frühling', meter: '4/4', notes: 'C:1.5 E:.5 G C+ A C+:.5 A:.5 G:2 | F:1.5 G:.5 E C D:2 C - | G G F F E G:.5 E:.5 D:2 | G G F F E G:.5 E:.5 D:2 | C:1.5 E:.5 G C+ A C+:.5 A:.5 G:2 | F:1.5 G:.5 E C D:2 C -' },
  { name: 'Summ, summ, summ', group: 'Kinderlieder', meter: '2/4', notes: 'D+ C+ H - A:.5 H:.5 C+:.5 A:.5 G - | H:.5 C+:.5 D+:.5 H:.5 A:.5 H:.5 C+:.5 A:.5 H:.5 C+:.5 D+:.5 H:.5 A:.5 H:.5 C+:.5 A:.5 | D+ C+ H - A:.5 H:.5 C+:.5 A:.5 G -' },
  { name: 'Fuchs, du hast die Gans gestohlen', group: 'Kinderlieder', meter: '4/4', notes: 'C D E F G G G G | A F C+ A G:4 | A F C+ A G:4 | G F F F F E E E | E D E D C E G:2 | G F F F F E E E | E D E D C:4' },
  { name: 'Ein Vogel wollte Hochzeit machen', group: 'Kinderlieder', meter: '4/4', notes: '-:3 H D+ H D+ H | C+ A C+ A H G D+ H | A D+ D+ D+:.5 H:.5 G G G D+:.5 H:.5 | A A A D+:.5 C+:.5 H G A Fis | G:2 -:2' },
  { name: 'Kommt ein Vogel geflogen', group: 'Kinderlieder', meter: '3/4', notes: '-:2 A:.5 B:.5 C+ A A A G G:.5 A:.5 | B G G:.5 D+:.5 C+ - A:.5 B:.5 C+ A A | A G G:.5 A:.5 B E E F -:2' },
  { name: 'Winter ade', group: 'Frühling', meter: '3/4', notes: 'H H A G:3 H H A | G:3 H C+ D+ D+ C+:.5 H:.5 C+ | A H C+ C+ H:.5 A:.5 H H H C+ | D+:3 H H A G:3' },
  { name: 'Hejo, spann den Wagen an', group: 'Herbst und Sankt Martin', meter: '4/4', notes: 'A:2 G:2 A:.5 A:.5 A:.5 A:.5 E:2 | A A H H C+:.5 C+:.5 C+:.5 C+:.5 H:2 | E+:.5 E+:.5 E+:.5 E+:.5 E+ E+ E+:.5 E+:.5 E+:.5 E+:.5 E+:.5 D+:.5 C+:.5 H:.5' },
  { name: 'Backe, backe Kuchen', group: 'Kinderlieder', meter: '4/4', notes: 'G G A A G:2 E C | G G A A G:2 E:2 | G G A A G G E C | G G A A G G E E | G:.5 G:.5 G E:2 G:.5 G:.5 G E:2 | G G E:2 | G G A A G G E:2 | C+:2 G F E D C:2' },
  { name: 'Zum Geburtstag viel Glück', group: 'Feste und mehr', meter: '3/4', notes: '-:2 D:.5 D:.5 E D G Fis:2 D:.5 D:.5 | E D A G:2 D:.5 D:.5 D+ H G | Fis E C+:.5 C+:.5 H G A G:2 -' },
  // Kling, Glöckchen und Laterne mit verdoppelten Werten als 4/4 (wegen der Sechzehntel); punktierte Achtel als zwei Achtel.
  // Männlein im 2/4-Takt (wie bei ingeb.org), damit es in 8 Zeilen passt.
  { name: 'O Tannenbaum', group: 'Weihnachten', meter: '3/4', notes: '-:2 -:.5 D:.5 G:.5 G:.5 G A H:.5 H:.5 H:1.5 H:.5 | A:.5 H:.5 C+ Fis A G -:.5 D+:.5 | D+:.5 H:.5 E+:1.5 D+:.5 D+:.5 C+:.5 C+:1.5 C+:.5 | C+:.5 A:.5 D+:1.5 C+:.5 C+:.5 H:.5 H -:.5 D:.5 | G:.5 G:.5 G A H:.5 H:.5 H:1.5 H:.5 | A:.5 H:.5 C+ Fis A G:2' },
  { name: 'Kling, Glöckchen', group: 'Weihnachten', meter: '4/4', notes: 'C+:2 A B C+:.5 D+:.5 C+:.5 D+:.5 C+:2 | B:2 G C+ A:4 | G G A F A:2 G:2 | B B C+ G B:2 A:2 | G G A H C+:2 G:2 | A D+ C+ H D+:2 C+:2 | C+:2 A B C+:.5 D+:.5 C+:.5 D+:.5 C+:2 | B:2 G C+ A:4' },
  { name: 'Leise rieselt der Schnee', group: 'Weihnachten', meter: '6/8', notes: 'H H:.5 A:.5 H:.5 A:.5 G:1.5 G -:.5 | G E:.5 G:.5 Fis:.5 E:.5 D:1.5 D -:.5 | A:.5 Gis:.5 A:.5 C+:.5 H:.5 A:.5 G:1.5 G -:.5 | A:.5 E:.5 E:.5 Fis:.5 E:.5 Fis:.5 G:1.5 G -:.5' },
  { name: 'Stille Nacht', group: 'Weihnachten', meter: '6/8', notes: 'G:.5 A:.5 G:.5 E:1.5 G:.5 A:.5 G:.5 E:1.5 | D+ D+:.5 H:1.5 C+ C+:.5 G:1.5 | A A:.5 C+:.5 H:.5 A:.5 G:.5 A:.5 G:.5 E:1.5 | A A:.5 C+:.5 H:.5 A:.5 G:.5 A:.5 G:.5 E:1.5 | D+ D+:.5 F+:.5 D+:.5 H:.5 C+:1.5 E+:1.5 | C+:.5 G:.5 E:.5 G:.5 F:.5 D:.5 C:3' },
  { name: 'Bunt sind schon die Wälder', group: 'Herbst und Sankt Martin', meter: '6/8', notes: 'G G:.5 G:.5 Fis:.5 G:.5 A:1.5 G:1.5 | H H:.5 H:.5 A:.5 H:.5 C+:1.5 H:1.5 | A A:.5 G:.5 H:.5 Cis:.5 D:1.5 -:1.5 | H A:.5 G Fis:.5 E:1.5 E:1.5 | C+ H:.5 A:.5 H:.5 G:.5 Fis:1.5 Fis:1.5 | G:.5 H:.5 D+:.5 D:.5 E:.5 Fis:.5 G:1.5 -:1.5' },
  { name: 'Ein Männlein steht im Walde', group: 'Herbst und Sankt Martin', meter: '2/4', notes: '- D G A H C+ D+:2 | E+ C+ H:2 A:2 G:2 | - D G A H C+ D+:2 | E+ C+ H:2 A:2 G:2 | -:2 D+:1.5 C+:.5 H D+ C+ H | A:2 D+:1.5 C+:.5 H D+ C+ H | A:2 G A H C+ D+:2 | E+ C+ H:2 A:2 G:2' },
  { name: 'Laterne, Laterne', group: 'Herbst und Sankt Martin', meter: '4/4', notes: '-:3 D+ C+:2 A D+ | C+:2 A:2 C+ C+ D+ D+ | C+:2 A F:.5 A:.5 C+ C+ A F:.5 A:.5 | C+ C+ A F:.5 A:.5 C+ C+:.5 C+:.5 D+:.5 D+:.5 D+ | C+ C+ A:2' },
  { name: 'Ich geh mit meiner Laterne', group: 'Herbst und Sankt Martin', meter: '6/8', notes: '-:2 -:.5 D:.5 G G:.5 H:.5 G:.5 H:.5 D+:1.5 H G:.5 | A:.5 A:.5 A:.5 A:.5 H:.5 A:.5 G:1.5 - D:.5 | G G:.5 H:.5 G:.5 H:.5 D+:1.5 H G:.5 | A A:.5 A:.5 H:.5 A:.5 G:1.5 - H:.5 | D+ H:.5 G H:.5 D+ H:.5 G G:.5 | A:.5 A:.5 A:.5 A:.5 H:.5 A:.5 G:1.5 - H:.5 | D+ H:.5 G H:.5 D+ H:.5 G G:.5 | A:.5 A:.5 A:.5 A:.5 H:.5 A:.5 G:1.5 -:1.5' },
  { name: 'Sankt Martin', group: 'Herbst und Sankt Martin', meter: '4/4', notes: '-:3 D G:2 D G:.5 A:.5 | H:2 G H:.5 C+:.5 D+ H C+ E+ | D+ D+:.5 C+:.5 H D+ C+ A A D+ | H H:.5 A:.5 G D G H H A:.5 G:.5 | A C+ C+ H:.5 A:.5 H D+ H G | H:.5 A:.5 A:.5 Fis:.5 G:2' }

])

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
