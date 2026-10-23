// Grundbegriffe des Lieds: Werte, Tonart und Tonhöhen. Alle Funktionen hier sind rein, dieses Modul kennt kein anderes
// aus lied/ (unterste Schicht). Wie ein Lied aufgebaut ist, steht in model.js.

export const STEPS = ['c', 'd', 'e', 'f', 'g', 'a', 'h'];
export const VALUES = [1, 2, 4, 8, 16];
export const METERS = ['2/2', '2/4', '3/4', '4/4', '6/8'];
// Oktaven von der kleinen (c) bis zur dreigestrichenen (c''')
export const OCT_MIN = 0, OCT_MAX = 3;
export const MAX_EV = 2000;
export const MAX_LY = 16; // Zeichen einer Silbe des Liedtexts
// Dauer in Ticks, damit auch punktierte Werte ganze Zahlen bleiben: Viertel = 8, Ganze = 32
export const QUARTER = 8;

export const isNote = (e) => !!(e && e.p);
export const isRest = (e) => !!e && !e.p;
export const hasLyrics = (song) => song.ev.some((e) => e.ly);
export const canDot = (v) => v < 16; // eine punktierte Sechzehntel gibt es nicht
export const ticks = (e) => 32 / e.v * (e.dot ? 1.5 : 1);

export function emptySong() {
  return { meter: '4/4', pickup: 0, key: 0, ev: [] };
}

/* ---------- Tonart ---------- */
// Tonarten von 6 ♭ bis 6 ♯; die Vorzeichen kommen in der üblichen Reihenfolge dazu (Stufen 0 = c … 6 = h)
export const KEY_MIN = -6, KEY_MAX = 6;
const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6], FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];
const KEY_NAMES = { '-6': 'Ges', '-5': 'Des', '-4': 'As', '-3': 'Es', '-2': 'B', '-1': 'F', 0: 'C', 1: 'G', 2: 'D', 3: 'A', 4: 'E', 5: 'H', 6: 'Fis' };
export const keyName = (k) => KEY_NAMES[k] + '-Dur';
// Vorzeichen, das die Tonart k der Stufe step gibt (1, −1 oder 0)
export function keyAcc(k, step) {
  if (k > 0) return SHARP_ORDER.slice(0, k).includes(step) ? 1 : 0;
  if (k < 0) return FLAT_ORDER.slice(0, -k).includes(step) ? -1 : 0;
  return 0;
}
// Die Vorzeichen der Tonart als [Stufe, Vorzeichen] in der Reihenfolge, in der sie gezeichnet werden
export const keySignature = (k) => (k >= 0 ? SHARP_ORDER.slice(0, k).map((s) => [s, 1]) : FLAT_ORDER.slice(0, -k).map((s) => [s, -1]));
// Vorzeichen, mit dem eine Note klingt: ihr eigenes, sonst das der Tonart
export const accOf = (e, k = 0) => (e.acc != null ? e.acc : keyAcc(k, parsePitch(e.p).step));

/* ---------- Tonhöhen ---------- */
export function parsePitch(p) {
  const m = /^([cdefgah])([0-3])$/.exec(p || '');
  return m ? { step: STEPS.indexOf(m[1]), oct: +m[2] } : null;
}
export const makePitch = (step, oct) => STEPS[step] + oct;
export const diatonic = (p) => { const x = parsePitch(p); return x.oct * 7 + x.step; };
// Platz im Notensystem in halben Linienabständen: unterste Linie e' = 0, oberste Linie f'' = 8, c' = −2
export const staffPos = (p) => diatonic(p) - 9;

export const SEMI = [0, 2, 4, 5, 7, 9, 11];
// Klingende Tonhöhe einer Note in der Tonart k als MIDI-Nummer (c' = 60)
export function midiOf(e, k = 0) {
  const { step, oct } = parsePitch(e.p);
  return 48 + oct * 12 + SEMI[step] + accOf(e, k);
}
// Frequenz einer Note in der Tonart k
export const freq = (e, k = 0) => 440 * 2 ** ((midiOf(e, k) - 69) / 12);

// Deutscher Notenname in der Schreibweise mit Oktavstrichen, z. B. c', fis'', b', es (kleine Oktave ohne Strich)
export function noteName(e, k = 0) {
  const { step, oct } = parsePitch(e.p), base = STEPS[step], a = accOf(e, k);
  let n = base;
  if (a === 1) n = base + 'is';
  else if (a === -1) n = base === 'h' ? 'b' : base === 'e' ? 'es' : base === 'a' ? 'as' : base + 'es';
  return n + "'".repeat(oct);
}

// Musikalische Bezeichnung ohne Vorzeichen: c (kleine Oktave), c', c'', c'''
export function pitchLabel(p) {
  const { step, oct } = parsePitch(p);
  return STEPS[step] + "'".repeat(oct);
}
// Liegt Tonhöhe a tiefer als b (nach Linien und Zwischenräumen)? 0 gleich hoch, negativ tiefer, positiv höher
export const comparePitch = (a, b) => diatonic(a) - diatonic(b);
