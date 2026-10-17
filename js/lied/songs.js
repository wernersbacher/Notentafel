import { VALUES, canDot } from './model.js';

// Bekannte Lieder in einer kurzen Schreibweise zum Abtippen.
// Ein Ton ist deutscher Tonname + Oktave (0 kleine, 1 eingestrichene …), optional „:“ + Wert (1, 2, 4, 8, 16,
// mit „.“ punktiert). Der Wert gilt weiter bis zum nächsten, am Anfang Viertel. „r“ ist eine Pause, „~“ am Ton ein
// Haltebogen zur nächsten Note, „/“ ein Zeilenumbruch. „|“ dient nur dem Lesen, die Taktstriche kommen automatisch.
// Bruder Jakob und Ode an die Freude stehen in F-Dur wie in der Tafel.
export const SONGS = [
  {
    name: 'Alle meine Entchen', meter: '4/4',
    notes: 'c1 d1 e1 f1 | g1:2 g1 / a1:4 a1 a1 a1 | g1:1 / a1:4 a1 a1 a1 | g1:1 / f1:4 f1 f1 f1 | e1:2 e1 / d1:4 d1 d1 d1 | c1:1'
  },
  {
    name: 'Hänschen klein', meter: '4/4',
    notes: 'g1 e1 e1:2 | f1:4 d1 d1:2 / c1:4 d1 e1 f1 | g1 g1 g1:2 / g1:4 e1 e1:2 | f1:4 d1 d1:2 / c1:4 e1 g1 g1 | c1:1 / ' +
      'd1:4 d1 d1 d1 | d1 e1 f1:2 / e1:4 e1 e1 e1 | e1 f1 g1:2 / g1:4 e1 e1:2 | f1:4 d1 d1:2 / c1:4 e1 g1 g1 | c1:1'
  },
  {
    name: 'Kuckuck, Kuckuck', meter: '3/4',
    notes: 'g1:2 e1:4 | g1:2 e1:4 | f1 e1 d1 | c1:2. / d1:4 d1 e1 | f1:2 d1:4 | e1 e1 f1 | g1:2 e1:4 / ' +
      'g1:2 e1:4 | g1:2 e1:4 | f1 e1 d1 | c1:2.'
  },
  {
    name: 'Bruder Jakob', meter: '4/4',
    notes: 'f1 g1 a1 f1 | f1 g1 a1 f1 / a1 b1 c2:2 | a1:4 b1 c2:2 / ' +
      'c2:8 d2 c2 b1 a1:4 f1 | c2:8 d2 c2 b1 a1:4 f1 / f1 c1 f1:2 | f1:4 c1 f1:2'
  },
  {
    name: 'Morgen kommt der Weihnachtsmann', meter: '4/4',
    notes: 'c1 c1 g1 g1 | a1 a1 g1:2 / f1:4 f1 e1 e1 | d1 d1 c1:2 / g1:4 g1 f1 f1 | e1 e1 d1:2 / ' +
      'g1:4 g1 f1 f1 | e1 e1 d1:2 / c1:4 c1 g1 g1 | a1 a1 g1:2 / f1:4 f1 e1 e1 | d1 d1 c1:2'
  },
  {
    name: 'Ode an die Freude', meter: '4/4',
    notes: 'a1 a1 b1 c2 | c2 b1 a1 g1 / f1 f1 g1 a1 | a1:4. g1:8 g1:2 / a1:4 a1 b1 c2 | c2 b1 a1 g1 / f1 f1 g1 a1 | g1:4. f1:8 f1:2 / ' +
      'g1:4 g1 a1 f1 | g1 a1:8 b1 a1:4 f1 / g1 a1:8 b1 a1:4 g1 | f1 g1 c1:2 / ' +
      'a1:4 a1 b1 c2 | c2 b1 a1 g1 / f1 f1 g1 a1 | g1:4. f1:8 f1:2'
  },
  {
    name: 'Zum Geburtstag viel Glück', meter: '3/4', pickup: 8,
    notes: 'g1:8. g1:16 | a1:4 g1 c2 | h1:2 g1:8. g1:16 | a1:4 g1 d2 | c2:2 g1:8. g1:16 / ' +
      'g2:4 e2 c2 | h1 a1 f2:8. f2:16 | e2:4 c2 d2 | c2:2'
  }
];

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
  return { name: def.name, song: { meter: def.meter, pickup: def.pickup || 0, ev } };
}
