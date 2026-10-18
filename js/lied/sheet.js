// Zeichnet das berechnete Notenblatt (layout.js) als ein SVG. Maße in Linienabständen (sp); sp ist die Größe in Pixeln.
import { isNote, noteName, parsePitch, accOf, keySignature, hasLyrics } from './model.js';
import { toneColor } from '../core/colors.js';
import { yOf, head, stem, ledger, dot, flags, beam, accidental, rest, clef, meter, barline, volta, staffLines } from './glyphs.js';
import { tie } from './glyphs.js';

const f = (n) => +n.toFixed(3);
const NAMES_H = 1.8; // Platz für die Notennamen unter dem System
const COUNTS_H = 1.9; // Platz für die Zählzeiten unter dem System
const LYRICS_H = 2;   // Platz für den Liedtext darunter
const GAP = 0.6;     // Abstand zwischen zwei Systemen
// Plätze der Tonart-Vorzeichen im Violinschlüssel (unterste Linie = 0): ♯ f'' c'' g'' d'' a' e'' h', ♭ b' es'' as' des'' ges' ces'' fes'
const SHARP_POS = [8, 5, 9, 6, 3, 7, 4], FLAT_POS = [4, 7, 3, 6, 2, 5, 1];

const escText = (t) => String(t).replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch]);
const rect = (cls, x1, y1, x2, y2, attrs = '') =>
  '<rect class="' + cls + '" x="' + f(x1) + '" y="' + f(y1) + '" width="' + f(x2 - x1) + '" height="' + f(y2 - y1) + '"' + attrs + '/>';

// Farbe eines Tons wie bei den Farbnoten, nach dem klingenden Ton (mit Tonart und Vorzeichen; Fis mittelgrün, B violett)
const colorOf = (e, key) => toneColor(parsePitch(e.p).step, accOf(e, key));

// key: Tonart, wenn die Notenköpfe farbig sein sollen (sonst null)
function itemSVG(it, e, key) {
  let s = '';
  if (it.rest) s += rest(it.x, e.v);
  else {
    const y = yOf(it.pos);
    it.ledger.forEach((p) => { s += ledger(it.x, yOf(p), e.v === 1 ? 1.25 : 1.05); });
    if (it.accX != null) s += accidental(it.accX, y, it.acc);
    s += head(it.x, y, e.v, key != null ? colorOf(e, key) : null);
    if (it.stem) {
      s += stem(it.stem.x, y + (it.stem.up ? -0.1 : 0.1), yOf(it.stem.end));
      if (it.flags) s += flags(it.stem.x, yOf(it.stem.end), it.flags, it.stem.up);
    }
  }
  if (it.dot != null) s += dot(it.x + (e.v === 1 ? 1.35 : 1.15), yOf(it.dot));
  return s;
}

// lay: Ergebnis von layout(). o: { width (in sp), sel, clean, insert, names, colors, counts, target, playing, fit }.
// fit (für den Druck): Die Notenlinien jeder Zeile enden an ihrem letzten Strich statt am rechten Rand.
// Liefert { svg, height, parts } – height in sp, damit der Aufrufer die Größe setzen kann; parts sind die Systeme
// einzeln ({ svg, height }, jedes ab seiner Oberkante), z. B. für den Druck.
export function sheetSVG(song, lay, o) {
  const ev = song.ev, W = o.width, lyrics = hasLyrics(song);
  let y = 0, out = '';
  const parts = [];
  lay.systems.forEach((s) => {
    // Unter dem System: Zählzeiten, dann Liedtext, dann Notennamen
    const zz = o.counts ? COUNTS_H : 0, ly = lyrics ? LYRICS_H : 0;
    const top = y + s.top, bottom = s.bottom + zz + ly + (o.names ? NAMES_H : 0), h = s.top + 4 + bottom;
    let g = '';
    // Antippen neben die Zeichen markiert den Platz am Ende dieser Zeile
    g += rect('hit', 0, -s.top, W, 4 + bottom, ' data-i="' + s.end + '"');
    // Beim Abspielen: farbiger Balken hinter der klingenden Note (über die ganze Höhe des Systems)
    if (o.playing >= s.first && o.playing < s.end) {
      const col = lay.at[o.playing];
      g += rect('playbar', col.l + 0.1, -s.top + 0.2, col.r - 0.1, 4 + bottom - 0.2, ' rx="0.8"');
    }
    // Markierung (nicht nach „fertig“)
    if (!o.clean) {
      const col = o.sel < ev.length ? (o.sel >= s.first && o.sel < s.end ? lay.at[o.sel] : null) : s.ghost;
      if (col) {
        g += rect('cur', col.l + 0.15, -s.top + 0.4, col.r - 0.15, 4 + bottom - 0.4, ' rx="0.6"');
        if (o.insert) g += rect('caret', col.l - 0.12, -s.top + 0.4, col.l + 0.12, 4 + bottom - 0.4);
      }
    }
    // Takte, die nicht aufgehen, sanft hinter den Noten
    s.bad.forEach((b) => { g += rect('bad', b.x1, -0.6, b.x2, 4.6, ' rx="0.6"'); });
    // Endet die Zeile mit einem Strich, enden dort auch die Linien; sonst laufen sie bis zum Rand (beim Druck bis hinter das letzte Zeichen)
    const last = s.bars[s.bars.length - 1];
    const end = s.barEnd ? last.x + (last.k === 2 || last.k === 3 ? 0.03 : 0) : !o.fit ? W : s.width - 0.6;
    g += staffLines(0, end) + clef(s.clefX, yOf(2));
    // Tonart-Vorzeichen in der üblichen Lage (♯ ab f'', ♭ ab b')
    keySignature(song.key || 0).forEach(([, a], j) => {
      g += accidental(s.keyX + 0.45 + j * 0.9, yOf((a > 0 ? SHARP_POS : FLAT_POS)[j]), a);
    });
    if (s.meterX != null) g += meter(s.meterX, song.meter);
    s.items.forEach((it) => {
      const e = ev[it.i];
      const cls = 'ev' + (it.i === o.target ? ' target' : '') + (it.i === o.playing ? ' playing' : '');
      g += '<g class="' + cls + '" data-i="' + it.i + '">' + itemSVG(it, e, o.colors ? song.key || 0 : null);
      // Zählzeiten direkt unter dem System, darunter die Notennamen
      if (it.counts) it.counts.forEach((c) => { g += '<text class="cnt' + (c.held ? ' held' : '') + '" x="' + f(c.x) + '" y="' + f(4 + s.bottom + 1.1) + '">' + c.t + '</text>'; });
      if (e.ly) g += '<text class="ly" x="' + f(it.x) + '" y="' + f(4 + s.bottom + zz + 1.35) + '">' + escText(e.ly) + '</text>';
      if (o.names && isNote(e)) g += '<text class="nm" x="' + f(it.x) + '" y="' + f(4 + bottom - 0.55) + '">' + noteName(e, song.key) + '</text>';
      g += '</g>';
    });
    s.beams.forEach((b) => {
      // Höhe auf der Linie des Balkens; die zweiten Balken liegen parallel dazu, zum Kopf hin versetzt
      const y1 = yOf(b.end1), y2 = yOf(b.end2), d = b.up ? 0.75 : -0.75;
      const by = (x) => y1 + (y2 - y1) * (x - b.x1) / (b.x2 - b.x1) + d;
      g += beam(b.x1, y1, b.x2, y2, b.up);
      b.sub.forEach(([x1, x2]) => { g += beam(x1, by(x1), x2, by(x2), b.up); });
    });
    s.bars.forEach((b) => { g += barline(b.x, b.k); });
    if (s.rep != null) g += barline(s.rep, 4);
    s.voltas.forEach((v) => { g += volta(v.x1, v.x2, -s.top + 0.6, v.n, v.open); });
    if (s.ghost && !o.clean) g += '<g class="ghost">' + head(s.ghost.x, yOf(4), 4) + '</g>';
    s.ties.forEach((t) => {
      const y = yOf(t.pos) + (t.down ? 0.55 : -0.55);
      g += tie(t.x1, t.x2 == null ? end - 0.6 : t.x2, y, t.down);
    });
    // Tippflächen über den Zeichen: jede Spalte reicht über die ganze Höhe des Systems
    // Die markierte Spalte lässt sich ziehen (grab), alle anderen scrollen wie gewohnt
    s.items.forEach((it) => { g += rect(it.i === o.sel && !o.clean ? 'hit grab' : 'hit', it.l, -s.top, it.r, 4 + bottom, ' data-i="' + it.i + '"'); });
    if (s.ghost) g += rect('hit', s.ghost.l, -s.top, s.ghost.r, 4 + bottom, ' data-i="' + ev.length + '"');
    out += '<g transform="translate(0 ' + f(top) + ')">' + g + '</g>';
    parts.push({ svg: '<g transform="translate(0 ' + f(s.top) + ')">' + g + '</g>', height: h });
    y += h + GAP;
  });
  return { svg: out, height: y, parts };
}
