import { VALUES, canDot, isNote, tiedFrom, MAX_LY } from './model.js';

// Die Lieder selbst (SONGS) liegen nicht in der App, sondern in pb_hooks/known.js und kommen mit Pro über core/known.js.
// Kurze Schreibweise: ein Ton ist deutscher Tonname + Oktave (0 kleine, 1 eingestrichene …), optional „:“ + Wert (1, 2, 4, 8, 16,
// mit „.“ punktiert), der Wert gilt weiter bis zum nächsten, am Anfang Viertel. „r“ ist eine Pause, „~“ am Ton ein Haltebogen
// zur nächsten Note, „/“ ein Zeilenumbruch, „|“ dient nur dem Lesen. lyrics: eine Silbe je Note, „-“ verbindet mit der nächsten,
// „_“ lässt eine Note ohne Silbe, „/“ steht an denselben Stellen wie in notes.

// Tonname → [Stammton, Vorzeichen]
const NAMES = {
  c: ['c'], cis: ['c', 1], ces: ['c', -1], d: ['d'], dis: ['d', 1], des: ['d', -1], e: ['e'], eis: ['e', 1], es: ['e', -1],
  f: ['f'], fis: ['f', 1], g: ['g'], gis: ['g', 1], ges: ['g', -1], a: ['a'], ais: ['a', 1], as: ['a', -1],
  h: ['h'], his: ['h', 1], b: ['h', -1]
};

// Macht aus einem Lied (Schreibweise s. o.) ein Lied im Format von model.js
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
  if (def.lyrics) setLyrics(ev, def.lyrics);
  return { name: def.name, song: { meter: def.meter, pickup: def.pickup || 0, key: def.key || 0, ev } };
}

// Verteilt den Liedtext Zeile für Zeile auf die Noten, die eine Silbe bekommen können
function setLyrics(ev, lyrics) {
  const lines = [[]];
  ev.forEach((e, i) => {
    if (isNote(e) && !tiedFrom(ev[i - 1], e)) lines[lines.length - 1].push(e);
    if (e.brk) lines.push([]);
  });
  const text = lyrics.split('/').map((l) => l.trim().split(/\s+/).filter(Boolean));
  if (text.length !== lines.length) throw new Error(`Liedtext hat ${text.length} Zeilen, die Noten ${lines.length}`);
  text.forEach((syl, k) => {
    if (syl.length !== lines[k].length) throw new Error(`Liedtext Zeile ${k + 1}: ${syl.length} Silben für ${lines[k].length} Noten`);
    syl.forEach((t, j) => {
      if (t.length > MAX_LY) throw new Error(`Silbe zu lang: ${t}`);
      if (t !== '_') lines[k][j].ly = t;
    });
  });
}
