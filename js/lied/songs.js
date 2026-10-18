import { VALUES, canDot } from './model.js';
import { byGroup } from '../core/groups.js';

// Bekannte Lieder in einer kurzen Schreibweise zum Abtippen.
// Ein Ton ist deutscher Tonname + Oktave (0 kleine, 1 eingestrichene …), optional „:“ + Wert (1, 2, 4, 8, 16,
// mit „.“ punktiert). Der Wert gilt weiter bis zum nächsten, am Anfang Viertel. „r“ ist eine Pause, „~“ am Ton ein
// Haltebogen zur nächsten Note, „/“ ein Zeilenumbruch. „|“ dient nur dem Lesen, die Taktstriche kommen automatisch.
// Bruder Jakob und Ode an die Freude stehen in F-Dur wie in der Tafel.
// tempo: eigenes Tempo des Lieds in Vierteln pro Minute, wird beim Laden eingestellt.
export const SONGS = byGroup([
  {
    name: 'Alle meine Entchen', group: 'Kinderlieder', meter: '4/4', tempo: 110,
    notes: 'c1 d1 e1 f1 | g1:2 g1 / a1:4 a1 a1 a1 | g1:1 / a1:4 a1 a1 a1 | g1:1 / f1:4 f1 f1 f1 | e1:2 e1 / d1:4 d1 d1 d1 | c1:1'
  },
  {
    name: 'Hänschen klein', group: 'Kinderlieder', meter: '4/4', tempo: 110,
    notes: 'g1 e1 e1:2 | f1:4 d1 d1:2 / c1:4 d1 e1 f1 | g1 g1 g1:2 / g1:4 e1 e1:2 | f1:4 d1 d1:2 / c1:4 e1 g1 g1 | c1:1 / ' +
      'd1:4 d1 d1 d1 | d1 e1 f1:2 / e1:4 e1 e1 e1 | e1 f1 g1:2 / g1:4 e1 e1:2 | f1:4 d1 d1:2 / c1:4 e1 g1 g1 | c1:1'
  },
  {
    name: 'Kuckuck, Kuckuck', group: 'Frühling', meter: '3/4', tempo: 120,
    notes: 'g1:2 e1:4 | g1:2 e1:4 | f1 e1 d1 | c1:2. / d1:4 d1 e1 | f1:2 d1:4 | e1 e1 f1 | g1:2 e1:4 / ' +
      'g1:2 e1:4 | g1:2 e1:4 | f1 e1 d1 | c1:2.'
  },
  {
    name: 'Bruder Jakob', group: 'Kinderlieder', meter: '4/4', tempo: 100,
    notes: 'f1 g1 a1 f1 | f1 g1 a1 f1 / a1 b1 c2:2 | a1:4 b1 c2:2 / ' +
      'c2:8 d2 c2 b1 a1:4 f1 | c2:8 d2 c2 b1 a1:4 f1 / f1 c1 f1:2 | f1:4 c1 f1:2'
  },
  {
    name: 'Morgen kommt der Weihnachtsmann', group: 'Weihnachten', meter: '4/4', tempo: 110,
    notes: 'c1 c1 g1 g1 | a1 a1 g1:2 / f1:4 f1 e1 e1 | d1 d1 c1:2 / g1:4 g1 f1 f1 | e1 e1 d1:2 / ' +
      'g1:4 g1 f1 f1 | e1 e1 d1:2 / c1:4 c1 g1 g1 | a1 a1 g1:2 / f1:4 f1 e1 e1 | d1 d1 c1:2'
  },
  {
    name: 'Ode an die Freude', group: 'Feste und mehr', meter: '4/4', tempo: 100,
    notes: 'a1 a1 b1 c2 | c2 b1 a1 g1 / f1 f1 g1 a1 | a1:4. g1:8 g1:2 / a1:4 a1 b1 c2 | c2 b1 a1 g1 / f1 f1 g1 a1 | g1:4. f1:8 f1:2 / ' +
      'g1:4 g1 a1 f1 | g1 a1:8 b1 a1:4 f1 / g1 a1:8 b1 a1:4 g1 | f1 g1 c1:2 / ' +
      'a1:4 a1 b1 c2 | c2 b1 a1 g1 / f1 f1 g1 a1 | g1:4. f1:8 f1:2'
  },
  {
    name: 'Zum Geburtstag viel Glück', group: 'Feste und mehr', meter: '3/4', tempo: 100, pickup: 8,
    notes: 'g1:8. g1:16 | a1:4 g1 c2 | h1:2 g1:8. g1:16 | a1:4 g1 d2 | c2:2 g1:8. g1:16 / ' +
      'g2:4 e2 c2 | h1 a1 f2:8. f2:16 | e2:4 c2 d2 | c2:2'
  },
  // Quellen: de.wikipedia.org (Noten im Artikel) und volksliederarchiv.de; Tonarten so, dass alles in c'–f'' liegt
  { name: 'Alle Vögel sind schon da', group: 'Frühling', meter: '4/4', tempo: 100, notes: 'c1:4. e1:8 g1:4 c2 | a1 c2:8 a1 g1:2 | f1:4. g1:8 e1:4 c1 | d1:2 c1:4 r / g1 g1 f1 f1 | e1 g1:8 e1 d1:2 | g1:4 g1 f1 f1 | e1 g1:8 e1 d1:2 / c1:4. e1:8 g1:4 c2 | a1 c2:8 a1 g1:2 | f1:4. g1:8 e1:4 c1 | d1:2 c1:4 r' },
  { name: 'Summ, summ, summ', group: 'Kinderlieder', meter: '2/4', tempo: 110, key: 1, notes: 'd2:4 c2 | h1 r | a1:8 h1 c2 a1 | g1:4 r / h1:8 c2 d2 h1 | a1 h1 c2 a1 | h1 c2 d2 h1 | a1 h1 c2 a1 / d2:4 c2 | h1 r | a1:8 h1 c2 a1 | g1:4 r' },
  { name: 'Fuchs, du hast die Gans gestohlen', group: 'Kinderlieder', meter: '4/4', tempo: 120, notes: 'c1 d1 e1 f1 | g1 g1 g1 g1 | a1 f1 c2 a1 | g1:1 / a1:4 f1 c2 a1 | g1:1 / g1:4 f1 f1 f1 | f1 e1 e1 e1 | e1 d1 e1 d1 | c1 e1 g1:2 / g1:4 f1 f1 f1 | f1 e1 e1 e1 | e1 d1 e1 d1 | c1:1' },
  { name: 'Ein Vogel wollte Hochzeit machen', group: 'Kinderlieder', meter: '2/4', tempo: 80, pickup: 4, key: 1, notes: 'h1:8 | d2 h1 d2 h1 | c2 a1 c2 a1 | h1 g1 d2 h1 | a1 d2 d2 d2:16 h1 / g1:8 g1 g1 d2:16 h1 | a1:8 a1 a1 d2:16 c2 | h1:8 g1 a1 fis1 | g1:4 r:8' },
  { name: 'Kommt ein Vogel geflogen', group: 'Kinderlieder', meter: '3/4', tempo: 100, pickup: 8, key: -1, notes: 'a1:8 b1 | c2:4 a1 a1 | a1 g1 g1:8 a1 | b1:4 g1 g1:8 d2 | c2:4 r a1:8 b1 / c2:4 a1 a1 | a1 g1 g1:8 a1 | b1:4 e1 e1 | f1 r' },
  { name: 'Winter ade', group: 'Frühling', meter: '3/4', tempo: 110, key: 1, notes: 'h1:4 h1 a1 | g1:2. | h1:4 h1 a1 | g1:2. / h1:4 c2 d2 | d2 c2:8 h1 c2:4 | a1 h1 c2 | c2 h1:8 a1 h1:4 / h1 h1 c2 | d2:2. | h1:4 h1 a1 | g1:2.' },
  { name: 'Hejo, spann den Wagen an', group: 'Herbst und Sankt Martin', meter: '4/4', tempo: 120, notes: 'a1:2 g1 | a1:8 a1 a1 a1 e1:2 / a1:4 a1 h1 h1 | c2:8 c2 c2 c2 h1:2 / e2:8 e2 e2 e2 e2:4 e2 | e2:8 e2 e2 e2 e2 d2 c2 h1' },
  { name: 'Backe, backe Kuchen', group: 'Kinderlieder', meter: '2/2', tempo: 120, notes: 'g1 g1 a1 a1 | g1:2 e1:4 c1 | g1 g1 a1 a1 | g1:2 e1 / g1:4 g1 a1 a1 | g1 g1 e1 c1 | g1 g1 a1 a1 | g1 g1 e1 e1 / g1:8 g1 g1:4 e1:2 | g1:8 g1 g1:4 e1:2 | g1:4 g1 e1:2 / g1:4 g1 a1 a1 | g1 g1 e1:2 | c2 g1:4 f1 | e1 d1 c1:2' },
  // Quellen: ingeb.org (Melodie-MIDIs), de.wikipedia.org, abcnotation.com, flutetunes.com
  { name: 'O Tannenbaum', group: 'Weihnachten', meter: '3/4', tempo: 90, pickup: 4, key: 1, notes: 'd1:8 | g1:8. g1:16 g1:4 a1 | h1:8. h1:16 h1:4. h1:8 | a1:8 h1 c2:4 fis1 | a1:4 g1 r:8 d2:8 / d2:8 h1 e2:4. d2:8 | d2:8 c2 c2:4. c2:8 | c2:8 a1 d2:4. c2:8 | c2:8 h1 h1:4 r:8 d1:8 / g1:8. g1:16 g1:4 a1 | h1:8. h1:16 h1:4. h1:8 | a1:8 h1 c2:4 fis1 | a1:4 g1 r:8' },
  { name: 'Kling, Glöckchen', group: 'Weihnachten', meter: '2/4', tempo: 80, key: -1, notes: 'c2:4 a1:8 b1 | c2:16 d2 c2 d2 c2:4 | b1:4 g1:8 c2 | a1:2 / g1:8 g1 a1 f1 | a1:4 g1 | b1:8 b1 c2 g1 | b1:4 a1 / g1:8 g1 a1 h1 | c2:4 g1 | a1:8 d2 c2 h1 | d2:4 c2 / c2:4 a1:8 b1 | c2:16 d2 c2 d2 c2:4 | b1:4 g1:8 c2 | a1:2' },
  { name: 'Leise rieselt der Schnee', group: 'Weihnachten', meter: '6/8', tempo: 70, key: 1, notes: 'h1:4 h1:8 a1 h1 a1 | g1:4.~ g1:4 r:8 / g1:4 e1:8 g1 fis1 e1 | d1:4.~ d1:4 r:8 / a1:8 gis1 a1 c2 h1 a1 | g1:4.~ g1:4 r:8 / a1:8. e1:16 e1:8 fis1 e1 fis1 | g1:4.~ g1:4 r:8' },
  { name: 'Stille Nacht', group: 'Weihnachten', meter: '6/8', tempo: 60, notes: 'g1:8. a1:16 g1:8 e1:4. | g1:8. a1:16 g1:8 e1:4. / d2:4 d2:8 h1:4. | c2:4 c2:8 g1:4. / a1:4 a1:8 c2:8. h1:16 a1:8 | g1:8. a1:16 g1:8 e1:4. / a1:4 a1:8 c2:8. h1:16 a1:8 | g1:8. a1:16 g1:8 e1:4. / d2:4 d2:8 f2:8. d2:16 h1:8 | c2:4. e2:4. / c2:8 g1 e1 g1:8. f1:16 d1:8 | c1:2.' },
  { name: 'Bunt sind schon die Wälder', group: 'Herbst und Sankt Martin', meter: '6/8', tempo: 90, key: 1, notes: 'g1:4 g1:8 g1 fis1 g1 | a1:4. g1 / h1:4 h1:8 h1 a1 h1 | c2:4. h1 / a1:4 a1:8 g1 h1 cis1 | d1:4. r / h1:4 a1:8 g1:4 fis1:8 | e1:4. e1 / c2:4 h1:8 a1 h1 g1 | fis1:4. fis1 / g1:8 h1 d2 d1 e1 fis1 | g1:4. r' },
  { name: 'Ein Männlein steht im Walde', group: 'Herbst und Sankt Martin', meter: '4/4', tempo: 110, pickup: 8, key: 1, notes: 'd1 | g1 a1 h1 c2 | d2:2 e2:4 c2 | h1:2 a1 | g1:2. d1:4 / g1:4 a1 h1 c2 | d2:2 e2:4 c2 | h1:2 a1 | g1:1 / d2:4. c2:8 h1:4 d2 | c2 h1 a1:2 | d2:4. c2:8 h1:4 d2 | c2 h1 a1:2 / g1:4 a1 h1 c2 | d2:2 e2:4 c2 | h1:2 a1 | g1:2.' },
  { name: 'Laterne, Laterne', group: 'Herbst und Sankt Martin', meter: '2/4', tempo: 80, pickup: 4, key: -1, notes: 'd2:8 | c2:4 a1:8 d2 | c2:4 a1 | c2:8 c2 d2 d2 | c2:4 a1:8 f1:16 a1 / c2:8 c2 a1 f1:16 a1 | c2:8 c2 a1 f1:16 a1 | c2:8 c2:16 c2 d2 d2 d2:8 | c2 c2 a1' },
  { name: 'Ich geh mit meiner Laterne', group: 'Herbst und Sankt Martin', meter: '6/8', tempo: 90, pickup: 4, key: 1, notes: 'd1:8 | g1:4 g1:8 h1 g1 h1 | d2:4. h1:4 g1:8 | a1:8 a1 a1 a1 h1 a1 | g1:4. r:4 d1:8 / g1:4 g1:8 h1 g1 h1 | d2:4. h1:4 g1:8 | a1:4 a1:8 a1 h1 a1 | g1:4. r:4 h1:8 / d2:4 h1:8 g1:4 h1:8 | d2:4 h1:8 g1:4 g1:8 | a1:8 a1 a1 a1 h1 a1 | g1:4. r:4 h1:8 / d2:4 h1:8 g1:4 h1:8 | d2:4 h1:8 g1:4 g1:8 | a1:8 a1 a1 a1 h1 a1 | g1:4. r:4' },
  { name: 'Sankt Martin', group: 'Herbst und Sankt Martin', meter: '4/4', tempo: 100, pickup: 8, key: 1, notes: 'd1 | g1:2 d1:4 g1:8 a1 | h1:2 g1:4 h1:8 c2 / d2:4 h1 c2 e2 | d2 d2:8 c2 h1:4 d2 | c2 a1 a1 d2 | h1 h1:8 a1 g1:4 d1 / g1 h1 h1 a1:8 g1 | a1:4 c2 c2 h1:8 a1 | h1:4 d2 h1 g1 | h1:8 a1 a1 fis1 g1:2' }

])

// Tonname → [Stammton, Vorzeichen]
const NAMES = {
  c: ['c'], cis: ['c', 1], ces: ['c', -1], d: ['d'], dis: ['d', 1], des: ['d', -1], e: ['e'], eis: ['e', 1], es: ['e', -1],
  f: ['f'], fis: ['f', 1], g: ['g'], gis: ['g', 1], ges: ['g', -1], a: ['a'], ais: ['a', 1], as: ['a', -1],
  h: ['h'], his: ['h', 1], b: ['h', -1]
};

// Macht aus einem Lied der Liste oben ein Lied im Format von model.js
export function songOf(def) {
  const ev = [];
  let v = 4, dot = false;
  for (const tok of def.notes.trim().split(/\s+/)) {
    if (tok === '|') continue;
    if (tok === '/') {
      if (!ev.length) throw new Error(`Zeilenumbruch am Anfang: ${tok}`);
      ev[ev.length - 1].brk = 1;
      continue;
    }
    const m = /^(?:r|([a-h][a-z]*)([0-3]))(?::(\d+)(\.)?)?(~)?$/.exec(tok);
    const name = m && m[1] && NAMES[m[1]];
    if (!m || (m[1] && !name) || (!m[1] && m[5])) throw new Error(`Unbekanntes Token: ${tok}`);
    if (m[3]) {
      v = +m[3];
      dot = !!m[4];
      if (!VALUES.includes(v) || (dot && !canDot(v))) throw new Error(`Unbekanntes Token: ${tok}`);
    }
    const e = name ? { p: name[0] + m[2], v } : { v };
    if (dot) e.dot = 1;
    if (name && name[1]) e.acc = name[1];
    if (m[5]) e.tie = 1;
    ev.push(e);
  }
  return { name: def.name, song: { meter: def.meter, pickup: def.pickup || 0, key: def.key || 0, ev } };
}
