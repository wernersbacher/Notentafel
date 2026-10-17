// Datenmodell des Lieds. Alle Funktionen hier sind rein.
//
// Ein Lied ist { meter, ev }: die Taktart ('' = ohne) und eine durchgehende Folge von Ereignissen.
//   { p, v, dot?, acc? }  Note: p Tonhöhe ('c1' = c', 'a0' = a, 'c2' = c''), v Grundwert (1 Ganze, 2 Halbe, 4 Viertel,
//                         8 Achtel, 16 Sechzehntel), dot punktiert, acc Vorzeichen (1 ♯, −1 ♭, 0 ♮; fehlt = keins)
//   { v, dot? }           Pause
// Jedes Ereignis kann zusätzlich tragen: bar (1 Taktstrich, 2 Schlussstrich) und brk (Zeilenumbruch), beide dahinter.
// Die Zeilen (Notensysteme) entstehen erst beim Zeichnen.

export const STEPS = ['c', 'd', 'e', 'f', 'g', 'a', 'h'];
export const VALUES = [1, 2, 4, 8, 16];
export const METERS = ['2/2', '2/4', '3/4', '4/4', '6/8'];
// Oktaven von der kleinen (c) bis zur dreigestrichenen (c''')
export const OCT_MIN = 0, OCT_MAX = 3;
export const MAX_EV = 2000;
// Dauer in Ticks, damit auch punktierte Werte ganze Zahlen bleiben: Viertel = 8, Ganze = 32
export const QUARTER = 8;

export const isNote = (e) => !!(e && e.p);
export const isRest = (e) => !!e && !e.p;
export const canDot = (v) => v < 16; // eine punktierte Sechzehntel gibt es nicht
export const ticks = (e) => 32 / e.v * (e.dot ? 1.5 : 1);

export function emptySong() {
  return { meter: '4/4', ev: [] };
}

/* ---------- Tonhöhen ---------- */
export function parsePitch(p) {
  const m = /^([cdefgah])([0-3])$/.exec(p || '');
  return m ? { step: STEPS.indexOf(m[1]), oct: +m[2] } : null;
}
export const makePitch = (step, oct) => STEPS[step] + oct;
const diatonic = (p) => { const x = parsePitch(p); return x.oct * 7 + x.step; };
// Platz im Notensystem in halben Linienabständen: unterste Linie e' = 0, oberste Linie f'' = 8, c' = −2
export const staffPos = (p) => diatonic(p) - 9;

const SEMI = [0, 2, 4, 5, 7, 9, 11];
export function freq(e) {
  const { step, oct } = parsePitch(e.p);
  const midi = 48 + oct * 12 + SEMI[step] + (e.acc || 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

// Deutscher Notenname, z. B. C, Fis, B, Es
export function noteName(e) {
  const base = STEPS[parsePitch(e.p).step], a = e.acc || 0;
  let n = base;
  if (a === 1) n = base + 'is';
  else if (a === -1) n = base === 'h' ? 'b' : base === 'e' ? 'es' : base === 'a' ? 'as' : base + 'es';
  return n[0].toUpperCase() + n.slice(1);
}

// Stammton step in der Oktave, die dem Ton prev am nächsten liegt (ohne prev: c'–h')
export function nearestPitch(step, prev) {
  if (!prev) return makePitch(step, 1);
  const d0 = diatonic(prev);
  let best = null;
  for (let o = OCT_MIN; o <= OCT_MAX; o++) {
    const d = o * 7 + step;
    if (!best || Math.abs(d - d0) < Math.abs(best.d - d0)) best = { d, o };
  }
  return makePitch(step, best.o);
}
// Eine Oktave höher (by = 1) oder tiefer (−1); am Rand bleibt der Ton, wie er ist
export function shiftOct(p, by) {
  const { step, oct } = parsePitch(p), o = oct + by;
  return o < OCT_MIN || o > OCT_MAX ? p : makePitch(step, o);
}

/* ---------- Takte ---------- */
// Länge eines Takts in Ticks, z. B. 32 für 4/4, 24 für 6/8
export function measureTicks(m) {
  const [n, base] = m.split('/');
  return +n * 32 / +base;
}
// Strich hinter jedem Ereignis: 0 keiner, 1 Taktstrich, 2 Schlussstrich.
// Automatisch (wie in der Tafel): Taktstriche nach der Taktart, wo ein Takt genau aufgeht; von Hand gesetzte
// Taktstriche sind dann ausgeblendet, der Schlussstrich bleibt.
export function barsAfter(song, auto) {
  const len = auto && song.meter ? measureTicks(song.meter) : 0;
  let pos = 0;
  return song.ev.map((e) => {
    pos += ticks(e);
    if (e.bar === 2) return 2;
    if (auto) return len && pos % len === 0 ? 1 : 0;
    return e.bar ? 1 : 0;
  });
}

/* ---------- Gespeicherte Stände prüfen ---------- */
function cleanEvent(e) {
  if (!e || typeof e !== 'object' || !VALUES.includes(e.v)) return null;
  const o = {};
  if (e.p != null) {
    if (!parsePitch(e.p)) return null;
    o.p = e.p;
  }
  o.v = e.v;
  if (e.dot && canDot(e.v)) o.dot = 1;
  if (o.p && [-1, 0, 1].includes(e.acc)) o.acc = e.acc;
  if (e.bar) o.bar = e.bar === 2 ? 2 : 1;
  if (e.brk) o.brk = 1;
  return o;
}
// Prüft ein gespeichertes Lied und liefert eine saubere Kopie (oder null). Ungültige Ereignisse fallen weg.
export function cleanSong(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.ev) || raw.ev.length > MAX_EV) return null;
  return {
    meter: METERS.includes(raw.meter) ? raw.meter : '',
    ev: raw.ev.map(cleanEvent).filter(Boolean)
  };
}
