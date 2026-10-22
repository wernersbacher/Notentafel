// Notensatz: berechnet aus dem Lied die Lage aller Zeichen, ohne DOM. Gezeichnet wird in sheet.js.
// Waagerecht zählt alles in Linienabständen (sp), senkrecht in Plätzen (pos, halbe Linienabstände, unterste Linie = 0).
import { isNote, ticks, staffPos, drawnBars, gridStarts, countsOf, shownAccidentals, badMeasures, tieValidAt } from './model.js';

export const G = {
  left: 0.8,   // Rand vor dem Schlüssel
  clef: 3.6,   // Breite des Violinschlüssels
  meter: 3.2,  // Breite der Taktart
  keyAcc: 0.9, // Platz für ein Vorzeichen der Tonart (dazu einmal keyPad)
  keyPad: 0.5,
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
// Breite einer Silbe des Liedtexts (ohne den Bindestrich am Ende, der steht zwischen den Silben)
export const lyricText = (ly) => (ly.length > 1 && ly.endsWith('-') ? ly.slice(0, -1) : ly);
export const lyricWidth = (ly) => (ly ? lyricText(ly).length * 0.74 : 0);
// Zusätzlicher Platz vor und hinter Wiederholungsstrichen (für die Punkte)
export const barExtra = (k) => ({ before: k === 3 || k === 5 ? 0.9 : 0, after: k === 4 || k === 5 ? 1.3 : 0 });
// Breite der Tonart-Vorzeichen hinter dem Schlüssel (in jeder Zeile)
export const keyWidth = (song) => (song.key ? Math.abs(song.key) * G.keyAcc + G.keyPad : 0);

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

// Waagerechte Maße: Platz eines Zeichens ohne (advance) bzw. mit Vorzeichen und Strich dahinter (wOf),
// und der Anfang einer Zeile bis zum ersten Zeichen (lead; in der ersten Zeile mit Taktart)
// cuts: Stellen, an denen ein Takt endet und umbrochen werden darf – hinter jedem Strich, ohne Taktart zusätzlich
// nach je einer Ganzen (wie 4/4, nur ohne gezeichnete Striche), damit auch dann Zeilen entstehen.
// lyrics: Mit Liedtext rückt eine Note so weit von der nächsten ab, dass ihre Silben nicht zusammenstoßen
// (zwischen verbundenen Silben bleibt Platz für den Bindestrich).
function measurer(song, autoBar, lyrics) {
  const ev = song.ev, bars = drawnBars(song, autoBar), shown = shownAccidentals(song, autoBar);
  const room = (i) => {
    const ly = ev[i].ly, next = ev[i + 1];
    if (!ly) return next && next.ly ? lyricWidth(next.ly) / 2 + 0.3 : 0;
    return lyricWidth(ly) / 2 + (next && next.ly ? lyricWidth(next.ly) / 2 : 0) + (ly.length > 1 && ly.endsWith('-') ? 1.3 : 0.7);
  };
  const advance = (i) => Math.max(spacing(ticks(ev[i])), G.head + (ev[i].dot ? 1 : 0) + 0.9, lyrics ? room(i) : 0);
  const wOf = (i) => (shown[i] != null ? G.acc : 0) + advance(i) + (bars[i] ? G.bar + barExtra(bars[i]).before + barExtra(bars[i]).after : 0);
  const lead = (first) => G.left + G.clef + keyWidth(song) + (first && song.meter ? G.meter : 0) + G.lead;
  let pos = 0;
  const cuts = ev.map((e, i) => { pos += ticks(e); return !!bars[i] || (!song.meter && pos % 32 === 0); });
  return { bars, cuts, shown, advance, wOf, lead };
}
// Breite einer Zeile, die nur den breitesten Takt enthält (samt Schlüssel, in der ersten Zeile auch Taktart).
// Damit lässt sich die Notengröße so begrenzen, dass ein Takt immer in eine Zeile passt.
export function widestMeasure(song, { autoBar = false, lyrics = false } = {}) {
  const { cuts, wOf, lead } = measurer(song, autoBar, lyrics);
  let w = lead(true), max = w;
  song.ev.forEach((e, i) => {
    w += wOf(i);
    max = Math.max(max, w);
    if (cuts[i] || e.brk) w = lead(false);
  });
  return max + 0.6;
}

// Höchstens so viele Takte stehen in einer automatisch umbrochenen Zeile
export const MAX_MEASURES = 5;
// Automatische Umbrüche: Jede Zeile wird Takt für Takt gefüllt, solange sie in die Breite passt und höchstens
// MAX_MEASURES Takte hat. Passt etwas nicht mehr, wird hinter dem letzten Taktende (cuts) der Zeile umbrochen, gibt es
// keins, direkt davor (ein Takt allein ist zu breit). Der leere Platz am Ende zählt mit. Umbrüche von Hand bleiben.
// Muss eine Zeile (von Hand bis Hand) geteilt werden, werden ihre Stücke möglichst gleich lang: Statt drei Takten und
// einem übrigen stehen zwei und zwei da. Dafür wird die Breite so weit verringert, wie es ohne weitere Zeile und
// ohne Umbruch mitten im Takt geht. growing: In der letzten Zeile wird gerade geschrieben, sie bleibt einfach gefüllt
// (sonst sprängen beim Schreiben die Takte zwischen ihren Stücken hin und her).
// Liefert brk (Umbruch hinter Ereignis i) und full (Zeile endet mit einem automatischen Umbruch – die wird gestreckt).
function wrap(ev, cuts, wOf, lead, width, growing) {
  const brk = ev.map((e) => !!e.brk), full = [];
  let first = 0;
  ev.forEach((e, i) => {
    if (!e.brk && i < ev.length - 1) return;
    const cut = (w) => wrapLine(ev, cuts, wOf, lead, first, i + 1, w);
    let best = cut(width);
    const atCuts = (b) => b.every((k) => cuts[k]), whole = atCuts(best);
    if (best.length && !(growing && i === ev.length - 1)) {
      let lo = 0, hi = width;
      for (let n = 0; n < 14; n++) {
        const mid = (lo + hi) / 2, b = cut(mid);
        if (b.length === best.length && (atCuts(b) || !whole)) { hi = mid; best = b; } else lo = mid;
      }
    }
    best.forEach((b) => { brk[b] = true; full[b] = true; });
    // Das letzte Stück einer geteilten Zeile wird genauso gestreckt wie die anderen (nicht am Ende des Lieds)
    if (best.length && i < ev.length - 1) full[i] = true;
    first = i + 1;
  });
  return { brk, full };
}
// Automatische Umbrüche in den Ereignissen first … end−1 (eine Zeile von Hand) bei der Breite width
function wrapLine(ev, cuts, wOf, lead, first, end, width) {
  const out = [], last = end === ev.length;
  let start = first, x = lead(first === 0), count = 0;
  for (let i = first; i <= end; i++) {
    if (i === end && !last) break;
    const w = i < end ? wOf(i) : G.ghost;
    while (x + w + 0.6 > width && i > start) {
      let b = i - 1;
      for (let k = i - 1; k >= start; k--) if (cuts[k]) { b = k; break; }
      out.push(b);
      start = b + 1;
      x = lead(false);
      count = 0;
      for (let k = start; k < i; k++) { x += wOf(k); if (cuts[k]) count++; }
    }
    if (i === end) break;
    x += w;
    if (cuts[i] && ++count === MAX_MEASURES && i < end - 1) { out.push(i); start = i + 1; x = lead(false); count = 0; }
  }
  return out;
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
//   clefX, keyX, meterX   Lage von Schlüssel, Tonart-Vorzeichen und Taktart (meterX nur in der ersten Zeile mit Taktart)
//   items           pro Ereignis: i, x (Mitte des Kopfs), l/r (Spalte zum Antippen), pos, ledger, stem { up, end, x },
//                   flags, dot (Platz des Punkts), acc/accX (gezeichnetes Vorzeichen und seine Lage), rest
//   bars            { x, k } Takt- (1) und Schlussstriche (2); barEnd: das letzte Zeichen der Zeile hat einen Strich
//   beams           { up, x1, x2, end1, end2, sub: [[x1, x2]] } Balken von (x1, end1) nach (x2, end2); sub sind die
//                   zweiten Balken der Sechzehntel
//   ghost           der leere Platz am Ende (nur in der letzten Zeile)
//   ties            Haltebögen { x1, x2, pos, down }; über einen Umbruch hinweg in zwei Stücken
//   bad             { x1, x2 } Takte, die nicht aufgehen (nur mit check); über einen Umbruch pro System ein Stück
//   width, top, bottom   Breite und Platz über bzw. unter dem System in sp
// counts: Zählzeiten berechnen (pro Item counts: [{ t, held, x }]); check: Takte prüfen;
// lyrics: Platz für den Liedtext lassen (siehe measurer);
// width: verfügbare Breite in sp, growing: siehe wrap – dann wird zusätzlich automatisch umgebrochen (siehe wrap), sonst nur von Hand.
// Für den Druck: justify (Breite in sp) streckt alle Zeilen außer der letzten auf diese Breite; ghost: false lässt den
// leeren Platz am Ende weg.
export function layout(song, { autoBar = false, counts = false, check = false, lyrics = false, width = 0, growing = false, justify = 0, ghost = true } = {}) {
  const ev = song.ev, at = [], barX = [];
  const { bars, cuts, shown, advance, wOf, lead } = measurer(song, autoBar, lyrics);
  const { brk, full } = width ? wrap(ev, cuts, wOf, lead, width, growing) : { brk: ev.map((e) => !!e.brk), full: [] };
  // Zeilen: hinter einem Umbruch beginnt eine neue (auch, wenn danach noch nichts steht)
  const systems = [{ first: 0, end: 0 }];
  ev.forEach((e, i) => {
    systems[systems.length - 1].end = i + 1;
    if (brk[i]) systems.push({ first: i + 1, end: i + 1 });
  });
  // Automatisch umbrochene Zeilen werden auf die ganze Breite gestreckt, gleichmäßig verteilt auf ihre Zeichen
  // (höchstens 3 sp mehr pro Zeichen); mit justify alle außer der letzten, ohne Grenze
  systems.forEach((s, si) => {
    s.stretch = 0;
    const fill = justify ? si < systems.length - 1 : full[s.end - 1];
    if (s.end === s.first || !fill) return;
    let w = lead(si === 0);
    for (let i = s.first; i < s.end; i++) w += wOf(i);
    const extra = ((justify || width) - 0.6 - w) / (s.end - s.first);
    s.stretch = Math.max(0, justify ? extra : Math.min(3, extra));
  });

  systems.forEach((s, si) => {
    s.items = []; s.bars = []; s.beams = []; s.bad = [];
    let x = G.left;
    s.clefX = x;
    x += G.clef;
    s.keyX = x;
    x += keyWidth(song);
    if (si === 0 && song.meter) { s.meterX = x + G.meter / 2; x += G.meter; }
    x += G.lead;
    for (let i = s.first; i < s.end; i++) {
      const e = ev[i], it = { i, l: x - 0.5 };
      if (shown[i] != null) { it.acc = shown[i]; it.accX = x + 0.4; x += G.acc; }
      it.x = x + G.head / 2;
      x += advance(i) + s.stretch;
      if (isNote(e)) noteShape(it, e);
      else { it.rest = true; if (e.dot) it.dot = 5; }
      s.items.push(it);
      at[i] = it;
      if (bars[i]) {
        const ex = barExtra(bars[i]);
        x += ex.before;
        barX[i] = x - 0.5;
        s.bars.push({ x: barX[i], k: bars[i], i });
        x += G.bar + ex.after;
      }
    }
    s.items.forEach((it, j) => { it.r = j + 1 < s.items.length ? s.items[j + 1].l : x - 0.5; });
    if (ghost && si === systems.length - 1) {
      s.ghost = { l: x - 0.5, x: x + 0.3 + G.head / 2, r: x + G.ghost };
      x += G.ghost;
    }
    s.barEnd = !s.ghost && s.end > s.first && !!bars[s.end - 1];
    s.width = x + 0.6;
  });

  addRepeatStarts(systems, bars, barX);
  beamGroups(song, bars, brk).forEach((idx) => {
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
  addVoltas(song.ev, systems, bars, at, barX);
  addTies(ev, systems, at);
  if (counts) addCounts(song, systems);
  if (check) addBad(song, autoBar, systems, at, barX);
  return { systems, at };
}

// Takte, die nicht aufgehen: pro System ein Stück von der ersten bis zur letzten Spalte, vor einem Strich nur bis kurz davor
function addBad(song, autoBar, systems, at, barX) {
  badMeasures(song, autoBar).forEach((m) => {
    systems.forEach((s) => {
      const a = Math.max(m.first, s.first), b = Math.min(m.last, s.end - 1);
      if (a <= b) s.bad.push({ x1: at[a].l, x2: barX[b] != null ? barX[b] - 0.25 : at[b].r });
    });
  });
}

// Ein Wiederholungsanfang am Zeilenende gehört an den Anfang der nächsten Zeile: dort steht ‖: (rep), am Ende der Zeile
// bleibt ein einfacher Strich bzw. bei :‖: das Wiederholungsende. Die Zeichen der neuen Zeile rücken dafür etwas nach rechts.
function addRepeatStarts(systems, bars, barX) {
  systems.forEach((s, si) => {
    const p = systems[si - 1], pb = p && p.end > p.first ? bars[p.end - 1] : 0;
    if (pb !== 4 && pb !== 5) return;
    const last = p.bars[p.bars.length - 1];
    if (last) last.k = pb === 5 ? 3 : 1;
    const first = s.items[0];
    if (!first) return;
    s.rep = first.l - 0.1;
    const d = 1.9;
    s.items.forEach((it) => {
      it.x += d; it.l += d; it.r += d;
      if (it.accX != null) it.accX += d;
    });
    s.bars.forEach((b) => { b.x += d; barX[b.i] = b.x; });
    if (s.ghost) { s.ghost.x += d; s.ghost.l += d; s.ghost.r += d; }
    s.width += d;
  });
}
// Klammern der 1. und 2. Wiederholung: die 1. über dem Takt vor einem :‖ mit volta, die 2. über dem Takt dahinter
// (rechts offen). Pro System ein Stück; das System bekommt oben Platz dafür.
function addVoltas(ev, systems, bars, at, barX) {
  systems.forEach((s) => { s.voltas = []; });
  const sysOf = (i) => systems.find((s) => i < s.end);
  ev.forEach((e, i) => {
    if (!e.volta || !(bars[i] === 3 || bars[i] === 5)) return;
    let a = i;
    while (a > 0 && !bars[a - 1]) a--;
    let b = i + 1;
    while (b < ev.length - 1 && !bars[b]) b++;
    const put = (from, to, n, open, x1, x2) => {
      const s1 = sysOf(from), s2 = sysOf(to);
      if (!s1) return;
      if (s1 === s2 || !s2) s1.voltas.push({ x1, x2: s2 ? x2 : at[from].r, n, open });
      else {
        s1.voltas.push({ x1, x2: at[s1.end - 1].r, n, open: true });
        s2.voltas.push({ x1: at[s2.first].l, x2, n: '', open });
      }
    };
    put(a, i, 1, false, at[a].l, barX[i] - 0.2);
    // Die 2. Klammer beginnt am Strich, steht sie am Anfang einer neuen Zeile, beim ersten Zeichen dort
    if (i + 1 < ev.length) put(i + 1, b, 2, true, sysOf(i) === sysOf(i + 1) ? barX[i] + 0.4 : at[i + 1].l, barX[b] != null ? barX[b] - 0.2 : at[b].r);
  });
  systems.forEach((s) => { if (s.voltas.length) s.top += 1.8; });
}

// Haltebögen: von einer Note mit tie zur nächsten. Gezeichnet wird nur, was auch klingt (tieValidAt, dieselbe Prüfung
// wie beim Setzen und Abspielen). Sie liegen gegenüber dem Hals (bei Hälsen nach oben unter den Köpfen). Steht die
// nächste Note in der nächsten Zeile, läuft der Bogen bis zum Zeilenende und beginnt dort neu vor der Note.
function addTies(ev, systems, at) {
  const sysOf = (i) => systems.find((s) => i < s.end);
  systems.forEach((s) => { s.ties = []; });
  ev.forEach((e, i) => {
    if (!tieValidAt(ev, i)) return;
    const a = at[i], b = at[i + 1], s = sysOf(i);
    const down = a.stem ? a.stem.up : a.pos < 4;
    const t = sysOf(i + 1), pos = b.pos;
    if (t === s) { s.ties.push({ x1: a.x + 0.5, x2: b.x - 0.5, pos: a.pos, down }); return; }
    s.ties.push({ x1: a.x + 0.5, x2: null, pos: a.pos, down }); // x2 null: bis zum Zeilenende
    t.ties.push({ x1: Math.max(b.x - 2.6, G.left + G.clef + 0.6), x2: b.x - 0.5, pos, down });
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
