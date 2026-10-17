// Notensatz: berechnet aus dem Lied die Lage aller Zeichen, ohne DOM. Gezeichnet wird in sheet.js.
// Waagerecht zählt alles in Linienabständen (sp), senkrecht in Plätzen (pos, halbe Linienabstände, unterste Linie = 0).
import { isNote, ticks, staffPos, barsAfter, gridStarts } from './model.js';

export const G = {
  left: 0.8,   // Rand vor dem Schlüssel
  clef: 3.6,   // Breite des Violinschlüssels
  meter: 3.2,  // Breite der Taktart
  lead: 1.4,   // Abstand vor dem ersten Zeichen
  acc: 1.5,    // Platz für ein Vorzeichen vor dem Kopf
  head: 1.3,   // Breite eines Notenkopfs
  bar: 1.2,    // Abstand hinter einem Taktstrich
  ghost: 3.4,  // Platz für den leeren Platz am Zeilenende
  stem: 7,     // Halslänge in Plätzen (3,5 Linienabstände)
  stemX: 0.6   // Hals rechts bzw. links neben der Kopfmitte
};
// Platz für ein Zeichen nach seiner Dauer in Ticks: Sechzehntel 1,6, Achtel 2,5, Viertel 3,4, Halbe 4,3, Ganze 5,2
// (mindestens Kopf, Punkt und etwas Luft, siehe layout)
export const spacing = (t) => 1.6 + 0.9 * Math.log2(t / 2);

// Achtel und Sechzehntel innerhalb eines Schlags bekommen einen gemeinsamen Balken. Schlag: Viertel, im 2/2-Takt Halbe,
// im 6/8-Takt punktierte Viertel. Im 4/4-Takt teilen sich zwei volle Schläge einfacher Achtel in derselben Takthälfte
// einen Balken. Im 2/2-Takt werden Gruppen mit Sechzehnteln wieder pro Viertel getrennt (nach dem Beginn jeder Note).
// Pausen, Taktstriche und Zeilenumbrüche unterbrechen den Balken. Liefert Gruppen von Indizes (mindestens zwei).
export function beamGroups(song, bars) {
  const m = song.meter, ev = song.ev, starts = gridStarts(song);
  const beat = m === '2/2' ? 16 : m === '6/8' ? 12 : 8;
  // Die Taktlänge ist ein Vielfaches des Schlags, die Schläge zählen also einfach vom Anfang des Rasters
  const key = (p) => Math.floor(p / beat);
  const linked = (i) => !bars[i - 1] && !ev[i - 1].brk;
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

function noteShape(it, e) {
  const pos = staffPos(e.p);
  it.pos = pos;
  it.ledger = [];
  for (let p = -2; p >= pos; p -= 2) it.ledger.push(p);
  for (let p = 10; p <= pos; p += 2) it.ledger.push(p);
  if (e.v > 1) {
    // Ab der Mittellinie zeigt der Hals nach unten; weit außen reicht er bis zur Mittellinie
    const up = pos < 4, extra = e.v === 16 ? 1 : 0;
    it.stem = { up, end: up ? Math.max(pos + G.stem + extra, 4) : Math.min(pos - G.stem - extra, 4) };
    if (e.v >= 8) it.flags = e.v === 8 ? 1 : 2;
  }
  // Der Punkt steht immer in einem Zwischenraum
  if (e.dot) it.dot = Math.abs(pos % 2) === 0 ? pos + 1 : pos;
}

// Ergebnis: { systems, at } – at[i] ist das Zeichen von Ereignis i. Ein System (eine Zeile) hat
//   first, end      Ereignisse first … end−1
//   clefX, meterX   Lage von Schlüssel und Taktart (meterX nur in der ersten Zeile mit Taktart)
//   items           pro Ereignis: i, x (Mitte des Kopfs), l/r (Spalte zum Antippen), pos, ledger, stem { up, end, x },
//                   flags, dot (Platz des Punkts), accX, rest
//   bars            { x, k } Takt- (1) und Schlussstriche (2)
//   beams           { up, x1, x2, end1, end2, sub: [[x1, x2]] } Balken von (x1, end1) nach (x2, end2); sub sind die
//                   zweiten Balken der Sechzehntel
//   ghost           der leere Platz am Ende (nur in der letzten Zeile)
//   width, top, bottom   Breite und Platz über bzw. unter dem System in sp
export function layout(song, { autoBar = false } = {}) {
  const ev = song.ev, bars = barsAfter(song, autoBar), at = [];
  // Zeilen: hinter einem Ereignis mit brk beginnt eine neue (auch, wenn danach noch nichts steht)
  const systems = [{ first: 0, end: 0 }];
  ev.forEach((e, i) => {
    systems[systems.length - 1].end = i + 1;
    if (e.brk) systems.push({ first: i + 1, end: i + 1 });
  });

  systems.forEach((s, si) => {
    s.items = []; s.bars = []; s.beams = [];
    let x = G.left;
    s.clefX = x;
    x += G.clef;
    if (si === 0 && song.meter) { s.meterX = x + G.meter / 2; x += G.meter; }
    x += G.lead;
    for (let i = s.first; i < s.end; i++) {
      const e = ev[i], it = { i, l: x - 0.5 };
      if (isNote(e) && e.acc != null) { it.accX = x + 0.4; x += G.acc; }
      it.x = x + G.head / 2;
      x += Math.max(spacing(ticks(e)), G.head + (e.dot ? 1 : 0) + 0.9);
      if (isNote(e)) noteShape(it, e);
      else { it.rest = true; if (e.dot) it.dot = 5; }
      s.items.push(it);
      at[i] = it;
      if (bars[i]) { s.bars.push({ x: x - 0.5, k: bars[i] }); x += G.bar; }
    }
    s.items.forEach((it, j) => { it.r = j + 1 < s.items.length ? s.items[j + 1].l : x - 0.5; });
    if (si === systems.length - 1) {
      s.ghost = { l: x - 0.5, x: x + 0.3 + G.head / 2, r: x + G.ghost };
      x += G.ghost;
    }
    s.width = x + 0.6;
  });

  beamGroups(song, bars).forEach((idx) => {
    const its = idx.map((i) => at[i]);
    // Die Note, die am weitesten von der Mittellinie entfernt ist, bestimmt die Richtung aller Hälse
    const far = its.reduce((a, b) => (Math.abs(b.pos - 4) > Math.abs(a.pos - 4) ? b : a));
    const up = far.pos < 4, dir = up ? 1 : -1;
    const sx = (it) => it.x + (up ? G.stemX : -G.stemX);
    const a = its[0], z = its[its.length - 1], x1 = sx(a), x2 = sx(z);
    // Neigung nach erstem und letztem Kopf, höchstens ein Linienabstand; waagerecht, wenn ein innerer Kopf weiter außen liegt
    const inner = its.slice(1, -1).some((it) => dir * it.pos > Math.max(dir * a.pos, dir * z.pos));
    const slope = inner ? 0 : Math.max(-2, Math.min(2, (z.pos - a.pos) / 2));
    const at0 = (it) => slope * (sx(it) - x1) / (x2 - x1);
    // Dann die Linie so legen, dass jeder Hals lang genug ist und weit außen bis zur Mittellinie reicht
    const need = (it) => (up ? Math.max(it.pos + G.stem, 4) : Math.min(it.pos - G.stem, 4)) - at0(it);
    const end1 = up ? Math.max(...its.map(need)) : Math.min(...its.map(need)), end2 = end1 + slope;
    its.forEach((it) => { it.stem = { up, end: end1 + at0(it) }; delete it.flags; });
    // Zweiter Balken über aufeinanderfolgenden Sechzehnteln; eine einzelne bekommt einen kurzen Ansatz
    const sub = [];
    for (let j = 0; j < its.length; j++) {
      if (ev[its[j].i].v !== 16) continue;
      let k = j;
      while (k + 1 < its.length && ev[its[k + 1].i].v === 16) k++;
      if (k > j) sub.push([sx(its[j]), sx(its[k])]);
      else if (j > 0) sub.push([sx(its[j]) - 1, sx(its[j])]);
      else sub.push([sx(its[j]), sx(its[j]) + 1]);
      j = k;
    }
    systems.find((s) => idx[0] < s.end).beams.push({ up, x1, x2, end1, end2, sub });
  });

  systems.forEach((s) => {
    let hi = 8, lo = 0;
    s.items.forEach((it) => {
      if (it.stem) it.stem.x = it.x + (it.stem.up ? G.stemX : -G.stemX);
      if (it.rest) return;
      hi = Math.max(hi, it.pos + 1, it.stem && it.stem.up ? it.stem.end : -99);
      lo = Math.min(lo, it.pos - 1, it.stem && !it.stem.up ? it.stem.end : 99);
    });
    s.top = Math.max(2.5, (hi - 8) / 2 + 1.5);
    s.bottom = Math.max(2.5, -lo / 2 + 1.5);
  });
  return { systems, at };
}
