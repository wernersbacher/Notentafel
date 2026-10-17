// Notensatz: berechnet aus dem Lied die Lage aller Zeichen, ohne DOM. Gezeichnet wird in sheet.js.
// Waagerecht zählt alles in Linienabständen (sp), senkrecht in Plätzen (pos, halbe Linienabstände, unterste Linie = 0).
import { isNote, ticks, staffPos, measureTicks, barsAfter } from './model.js';
import { countsOf } from './model.js';

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

// Achtel und Sechzehntel innerhalb eines Schlags bekommen einen gemeinsamen Balken (Schlag: Viertel, im x/8-Takt punktierte Viertel).
// Pausen, Taktstriche und Zeilenumbrüche unterbrechen den Balken. Liefert Gruppen von Indizes (mindestens zwei).
export function beamGroups(song, bars) {
  const m = song.meter, len = m ? measureTicks(m) : 0, beat = m && m.endsWith('/8') ? 12 : 8;
  const key = (p) => (len ? Math.floor(p / len) * 1000 + Math.floor((p % len) / beat) : Math.floor(p / beat));
  const groups = [];
  let cur = null, pos = 0;
  song.ev.forEach((e, i) => {
    const t = ticks(e), k = key(pos);
    const ok = isNote(e) && e.v >= 8 && key(pos + t - 1) === k;
    const prev = song.ev[i - 1];
    if (ok && cur && cur.k === k && cur.end === i - 1 && !bars[i - 1] && !prev.brk) { cur.idx.push(i); cur.end = i; }
    else if (ok) { cur = { k, idx: [i], end: i }; groups.push(cur); }
    else cur = null;
    pos += t;
  });
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
//   beams           { up, end, x1, x2, sub: [[x1, x2]] } Balken; sub sind die zweiten Balken der Sechzehntel
//   ghost           der leere Platz am Ende (nur in der letzten Zeile)
//   ties            Haltebögen { x1, x2, pos, down }; über einen Umbruch hinweg in zwei Stücken
//   width, top, bottom   Breite und Platz über bzw. unter dem System in sp
// counts: Zählzeiten berechnen (pro Item counts: [{ t, held, x }])
export function layout(song, { autoBar = false, counts = false } = {}) {
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
    const up = far.pos < 4;
    const end = up ? Math.max(...its.map((it) => it.pos + G.stem)) : Math.min(...its.map((it) => it.pos - G.stem));
    its.forEach((it) => { it.stem = { up, end }; delete it.flags; });
    const sx = (it) => it.x + (up ? G.stemX : -G.stemX);
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
    systems.find((s) => idx[0] < s.end).beams.push({ up, end, x1: sx(its[0]), x2: sx(its[its.length - 1]), sub });
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
  addTies(ev, systems, at);
  if (counts) addCounts(song, systems);
  return { systems, at };
}

// Haltebögen: von einer Note mit tie zur nächsten. Sie liegen gegenüber dem Hals (bei Hälsen nach oben unter den Köpfen).
// Steht die nächste Note in der nächsten Zeile, läuft der Bogen bis zum Zeilenende und beginnt dort neu vor der Note;
// ohne nächste Note ist er ein kurzer Ansatz.
function addTies(ev, systems, at) {
  const sysOf = (i) => systems.find((s) => i < s.end);
  systems.forEach((s) => { s.ties = []; });
  ev.forEach((e, i) => {
    if (!e.tie) return;
    const a = at[i], b = at[i + 1], s = sysOf(i);
    const down = a.stem ? a.stem.up : a.pos < 4;
    if (!b) { s.ties.push({ x1: a.x + 0.5, x2: a.x + 2.2, pos: a.pos, down }); return; }
    const t = sysOf(i + 1), pos = b.rest ? a.pos : b.pos;
    if (t === s) { s.ties.push({ x1: a.x + 0.5, x2: b.x - 0.5, pos: a.pos, down }); return; }
    s.ties.push({ x1: a.x + 0.5, x2: null, pos: a.pos, down }); // x2 null: bis zum Zeilenende
    t.ties.push({ x1: Math.max(b.x - 2.6, G.left + G.clef), x2: b.x - 0.5, pos, down });
  });
}

// Zählzeiten unter dem System: die erste unter dem Kopf, gehaltene an ihrer Stelle zwischen diesem und dem nächsten Zeichen
function addCounts(song, systems) {
  const zz = countsOf(song);
  systems.forEach((s) => {
    s.items.forEach((it, j) => {
      const next = j + 1 < s.items.length ? s.items[j + 1].x : it.r + 0.5, d = ticks(song.ev[it.i]);
      it.counts = zz[it.i].map((c) => ({ t: c.t, held: !!c.held, x: c.o ? it.x + (next - it.x) * c.o / d : it.x }));
    });
  });
}
