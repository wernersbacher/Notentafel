// Abspielplan und Intervall fürs Üben. Kennt theory.js und measures.js.
import { ticks, isNote, freq, QUARTER } from './theory.js';
import { barsAfter, tiedFrom } from './measures.js';

/* ---------- Abspielen ---------- */
// Ablaufplan für den Player: alle Zeichen nacheinander bis zum letzten Ton, Zeiten in Vierteln.
// Eine Note hinter einem Haltebogen klingt nicht neu, sondern verlängert die vorige.
// Reihenfolge, in der die Ereignisse erklingen: Wiederholungen ausgeschrieben. Am Wiederholungsende (:‖) geht es einmal
// zurück zum letzten Wiederholungsanfang (‖:, sonst zum Anfang); mit volta wird beim zweiten Mal der Takt davor
// (1. Klammer) übersprungen und gleich hinter dem Strich weitergespielt (2. Klammer).
export function playOrder(song, autoBar = true) {
  const ev = song.ev, bars = barsAfter(song, autoBar), order = [], done = new Set();
  const measureStart = (i) => { let j = i; while (j > 0 && !bars[j - 1]) j--; return j; };
  let i = 0, start = 0, skip = null;
  while (i < ev.length) {
    if (skip && i === skip.from) { i = skip.to; skip = null; continue; }
    order.push(i);
    const b = bars[i];
    if ((b === 3 || b === 5) && !done.has(i)) {
      done.add(i);
      if (ev[i].volta) skip = { from: measureStart(i), to: i + 1 };
      i = start;
      continue;
    }
    if (b === 4 || b === 5) start = i + 1;
    i++;
  }
  return order;
}
export function playPlan(song, autoBar = true) {
  const items = [];
  let t = 0, end = 0, last = -1, held = null, prev = -1;
  playOrder(song, autoBar).forEach((i) => {
    const e = song.ev[i];
    const len = ticks(e) / QUARTER;
    if (held && prev === i - 1 && tiedFrom(song.ev[i - 1], e)) {
      held.len += len;
      items.push({ t, len, sound: '', f: 0, pos: i });
    } else {
      const it = { t, len, sound: isNote(e) ? 'piano' : '', f: isNote(e) ? freq(e, song.key) : 0, pos: i };
      items.push(it);
      held = isNote(e) ? it : null;
    }
    t += len;
    prev = i;
    if (isNote(e)) { last = items.length - 1; end = t; }
  });
  return { items: items.slice(0, last + 1), end };
}

/* ---------- Schritt oder Sprung? ---------- */
// Zwei Stammtöne aus whites: etwa jedes fünfte Mal derselbe, sonst je zur Hälfte ein Schritt oder ein Sprung (bis zur
// Oktave). Liefert [a, b, Art].
export function makeInterval(whites, random = Math.random) {
  const pick = (n) => Math.floor(random() * n);
  const r = random(), want = r < 0.2 ? 'same' : r < 0.6 ? 'step' : 'leap';
  for (let t = 0; t < 40; t++) {
    const i = pick(whites.length);
    const ds = want === 'same' ? [0] : want === 'step' ? [-1, 1] : [-7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7];
    const ok = ds.filter((d) => i + d >= 0 && i + d < whites.length);
    if (ok.length) return [whites[i], whites[i + ok[pick(ok.length)]], want];
  }
  return [whites[0], whites[0], 'same'];
}
