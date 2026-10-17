// Zeichnet das berechnete Notenblatt (layout.js) als ein SVG. Maße in Linienabständen (sp); sp ist die Größe in Pixeln.
import { isNote, noteName } from './model.js';
import { yOf, head, stem, ledger, dot, flags, beam, accidental, rest, clef, meter, barline, staffLines } from './glyphs.js';

const f = (n) => +n.toFixed(3);
const NAMES_H = 1.8; // Platz für die Notennamen unter dem System
const GAP = 0.6;     // Abstand zwischen zwei Systemen

const rect = (cls, x1, y1, x2, y2, attrs = '') =>
  '<rect class="' + cls + '" x="' + f(x1) + '" y="' + f(y1) + '" width="' + f(x2 - x1) + '" height="' + f(y2 - y1) + '"' + attrs + '/>';

function itemSVG(it, e) {
  let s = '';
  if (it.rest) s += rest(it.x, e.v);
  else {
    const y = yOf(it.pos);
    it.ledger.forEach((p) => { s += ledger(it.x, yOf(p), e.v === 1 ? 1.25 : 1.05); });
    if (it.accX != null) s += accidental(it.accX, y, e.acc);
    s += head(it.x, y, e.v);
    if (it.stem) {
      s += stem(it.stem.x, y + (it.stem.up ? -0.1 : 0.1), yOf(it.stem.end));
      if (it.flags) s += flags(it.stem.x, yOf(it.stem.end), it.flags, it.stem.up);
    }
  }
  if (it.dot != null) s += dot(it.x + (e.v === 1 ? 1.35 : 1.15), yOf(it.dot));
  return s;
}

// lay: Ergebnis von layout(). o: { width (in sp), sel, clean, insert, names, target, playing }.
// Liefert { svg, height } – height in sp, damit der Aufrufer die Größe setzen kann.
export function sheetSVG(song, lay, o) {
  const ev = song.ev, W = o.width;
  let y = 0, out = '';
  lay.systems.forEach((s) => {
    const top = y + s.top, bottom = s.bottom + (o.names ? NAMES_H : 0), h = s.top + 4 + bottom;
    let g = '';
    // Antippen neben die Zeichen markiert den Platz am Ende dieser Zeile
    g += rect('hit', 0, -s.top, W, 4 + bottom, ' data-i="' + s.end + '"');
    // Markierung (nicht nach „fertig“)
    if (!o.clean) {
      const col = o.sel < ev.length ? (o.sel >= s.first && o.sel < s.end ? lay.at[o.sel] : null) : s.ghost;
      if (col) {
        g += rect('cur', col.l + 0.15, -s.top + 0.4, col.r - 0.15, 4 + bottom - 0.4, ' rx="0.6"');
        if (o.insert) g += rect('caret', col.l - 0.12, -s.top + 0.4, col.l + 0.12, 4 + bottom - 0.4);
      }
    }
    g += staffLines(0, W) + clef(s.clefX, yOf(2));
    if (s.meterX != null) g += meter(s.meterX, song.meter);
    s.items.forEach((it) => {
      const e = ev[it.i];
      const cls = 'ev' + (it.i === o.target ? ' target' : '') + (it.i === o.playing ? ' playing' : '');
      g += '<g class="' + cls + '" data-i="' + it.i + '">' + itemSVG(it, e);
      if (o.names && isNote(e)) g += '<text class="nm" x="' + f(it.x) + '" y="' + f(4 + bottom - 0.55) + '">' + noteName(e) + '</text>';
      g += '</g>';
    });
    s.beams.forEach((b) => {
      const by = yOf(b.end);
      g += beam(b.x1, b.x2, by, b.up);
      b.sub.forEach(([x1, x2]) => { g += beam(x1, x2, by + (b.up ? 0.75 : -0.75), b.up); });
    });
    s.bars.forEach((b) => { g += barline(b.x, b.k); });
    if (s.ghost && !o.clean) g += '<g class="ghost">' + head(s.ghost.x, yOf(4), 4) + '</g>';
    // Tippflächen über den Zeichen: jede Spalte reicht über die ganze Höhe des Systems
    s.items.forEach((it) => { g += rect('hit', it.l, -s.top, it.r, 4 + bottom, ' data-i="' + it.i + '"'); });
    if (s.ghost) g += rect('hit', s.ghost.l, -s.top, s.ghost.r, 4 + bottom, ' data-i="' + ev.length + '"');
    out += '<g transform="translate(0 ' + f(top) + ')">' + g + '</g>';
    y += h + GAP;
  });
  return { svg: out, height: y };
}
