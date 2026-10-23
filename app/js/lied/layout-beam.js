// Balken: Achtel und Sechzehntel innerhalb eines Schlags bekommen einen gemeinsamen Balken. Kennt nur model.js;
// wie die Lage eines Zeichens entsteht, steht in layout.js.
import { isNote, ticks, gridStarts } from './model.js';

// Achtel und Sechzehntel innerhalb eines Schlags bekommen einen gemeinsamen Balken. Schlag: Viertel, im 2/2-Takt Halbe,
// im 6/8-Takt punktierte Viertel. Im 4/4-Takt teilen sich zwei volle Schläge einfacher Achtel in derselben Takthälfte
// einen Balken. Im 2/2-Takt werden Gruppen mit Sechzehnteln wieder pro Viertel getrennt (nach dem Beginn jeder Note).
// Pausen, Taktstriche und Zeilenumbrüche unterbrechen den Balken (brks: Umbruch hinter jedem Ereignis; ohne: die von Hand).
// Liefert Gruppen von Indizes (mindestens zwei).
export function beamGroups(song, bars, brks) {
  const m = song.meter, ev = song.ev, starts = gridStarts(song);
  const beat = m === '2/2' ? 16 : m === '6/8' ? 12 : 8;
  // Die Taktlänge ist ein Vielfaches des Schlags, die Schläge zählen also einfach vom Anfang des Rasters
  const key = (p) => Math.floor(p / beat);
  const linked = (i) => !bars[i - 1] && !(brks ? brks[i - 1] : ev[i - 1].brk);
  let groups = [], cur = null;
  ev.forEach((e, i) => {
    const p = starts[i], k = key(p);
    const ok = isNote(e) && e.v >= 8 && key(p + ticks(e) - 1) === k;
    if (ok && cur && cur.k === k && cur.end === i - 1 && linked(i)) { cur.idx.push(i); cur.end = i; }
    else if (ok) { cur = { k, idx: [i], end: i }; groups.push(cur); }
    else cur = null;
  });
  if (m === '2/2') {
    groups = groups.flatMap((g) => {
      if (!g.idx.some((i) => ev[i].v === 16)) return [g];
      const out = [];
      g.idx.forEach((i) => {
        const q = Math.floor(starts[i] / 8), last = out[out.length - 1];
        if (last && last.q === q) last.idx.push(i);
        else out.push({ q, idx: [i] });
      });
      return out;
    });
  }
  if (m === '4/4') {
    // Ein voller Schlag aus zwei einfachen Achteln
    const plain = (g) => g.idx.length === 2 && g.idx.every((i) => ev[i].v === 8 && !ev[i].dot);
    groups = groups.reduce((out, g) => {
      const a = out[out.length - 1];
      if (a && plain(a) && plain(g) && a.k % 2 === 0 && g.k === a.k + 1 && g.idx[0] === a.end + 1 && linked(g.idx[0])) {
        out[out.length - 1] = { k: g.k, idx: [...a.idx, ...g.idx], end: g.end };
      } else out.push(g);
      return out;
    }, []);
  }
  return groups.map((g) => g.idx).filter((g) => g.length > 1);
}
