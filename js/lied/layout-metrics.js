// Maße des Notensatzes: Rand, Schlüssel, Tonart, Abstände, Zeilenbreite und Umbrüche pro Takt. Alle Funktionen hier
// sind rein, dieses Modul kennt kein anderes aus lied/ (unterste Schicht). Wie ein Blatt entsteht, steht in layout.js.
import { ticks, drawnBars, shownAccidentals } from './model.js';

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

// Waagerechte Maße: Platz eines Zeichens ohne (advance) bzw. mit Vorzeichen und Strich dahinter (wOf),
// und der Anfang einer Zeile bis zum ersten Zeichen (lead; in der ersten Zeile mit Taktart)
// cuts: Stellen, an denen ein Takt endet und umbrochen werden darf – hinter jedem Strich, ohne Taktart zusätzlich
// nach je einer Ganzen (wie 4/4, nur ohne gezeichnete Striche), damit auch dann Zeilen entstehen.
// lyrics: Mit Liedtext rückt eine Note so weit von der nächsten ab, dass ihre Silben nicht zusammenstoßen
// (zwischen verbundenen Silben bleibt Platz für den Bindestrich).
export function measurer(song, autoBar, lyrics) {
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
