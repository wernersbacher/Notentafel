// Tonnamen-Quiz: Stammton-Reihen, Knöpfe und Tonraum. Kennt theory.js und measures.js (splitAll).
import {
  isNote, parsePitch, makePitch, diatonic, accOf, midiOf, noteName, pitchLabel, OCT_MIN, OCT_MAX
} from './theory.js';
import { splitAtBar } from './measures.js';

/* ---------- Tonnamen-Quiz ---------- */
// Stammtöne von lo bis hi (z. B. 'c1' bis 'c3'), aufsteigend
export function whiteRange(lo, hi) {
  const out = [];
  for (let d = diatonic(lo); d <= diatonic(hi); d++) out.push(makePitch(d % 7, Math.floor(d / 7)));
  return out;
}
// Fragen für die Zufallsnote: alle Stammtöne von lo bis hi, mit sharp dazu die mit ♯ (ohne eis und his), mit flat die
// mit ♭ (ohne ces und fes) – je { p, acc }. Ein Halbton kommt nur vor, wenn auch der Stammton auf seiner anderen Seite
// im Tonraum liegt (die Knöpfe zeigen ihn zwischen beiden).
export function quizPitches(lo, hi, sharp, flat) {
  const whites = whiteRange(lo, hi), out = [];
  whites.forEach((p, i) => {
    const step = parsePitch(p).step;
    out.push({ p, acc: 0 });
    if (sharp && i + 1 < whites.length && step !== 2 && step !== 6) out.push({ p, acc: 1 });
    if (flat && i > 0 && step !== 0 && step !== 3) out.push({ p, acc: -1 });
  });
  return out;
}
// Knöpfe des Quiz wie eine Klaviatur von lo bis hi: Stammtöne { key, p, acc: 0, col } (col zählt sie von links), dazwischen
// die Halbtöne { key, p, acc: 1, col, black, names } mit col des Stammtons links daneben – nur, wenn sharp oder flat.
// names: Namen auf dem Knopf (ein Halbton mit ♯- und/oder ♭-Namen); key: klingende Tonhöhe (MIDI-Nummer als Text), damit
// cis' und des' denselben Knopf treffen.
export function quizKeys(lo, hi, sharp, flat) {
  const whites = whiteRange(lo, hi), keys = [];
  whites.forEach((p, i) => {
    keys.push({ key: String(midiOf({ p })), p, acc: 0, col: i, names: [pitchLabel(p)] });
    const step = parsePitch(p).step, next = whites[i + 1];
    if (!next || step === 2 || step === 6 || !(sharp || flat)) return;
    const names = [];
    if (sharp) names.push(noteName({ p, acc: 1 }));
    if (flat) names.push(noteName({ p: next, acc: -1 }));
    keys.push({ key: String(midiOf({ p, acc: 1 })), p, acc: 1, col: i, black: true, names });
  });
  return keys;
}
// Tonraum der Noten eines Lieds für die Knöpfe: tiefster und höchster Stammton (so erweitert, dass jeder Halbton
// zwischen zwei Knöpfen liegt) und ob Töne mit ♯ bzw. ♭ vorkommen (mit der Tonart). null ohne Noten.
export function songRange(song) {
  let lo = null, hi = null, sharp = false, flat = false;
  song.ev.forEach((e) => {
    if (!isNote(e)) return;
    const d = diatonic(e.p), a = accOf(e, song.key || 0);
    if (a === 1) sharp = true;
    if (a === -1) flat = true;
    const dl = a === -1 ? d - 1 : d, dh = a === 1 ? d + 1 : d;
    if (lo === null || dl < lo) lo = dl;
    if (hi === null || dh > hi) hi = dh;
  });
  if (lo === null) return null;
  const at = (d) => makePitch(((d % 7) + 7) % 7, Math.floor(d / 7));
  return { lo: at(Math.max(lo, OCT_MIN * 7)), hi: at(Math.min(hi, OCT_MAX * 7 + 6)), sharp, flat };
}

// Um steps Stufen (Linien und Zwischenräume) höher oder tiefer, begrenzt auf den Tonvorrat c bis h'''
export function stepPitch(p, steps) {
  const d = Math.max(OCT_MIN * 7, Math.min(OCT_MAX * 7 + 6, diatonic(p) + steps));
  return makePitch(d % 7, Math.floor(d / 7));
}

// Alle Zeichen, die über einen Taktstrich ragen, dort aufteilen (z. B. nach dem Übernehmen von der Tafel)
export function splitAll(song) {
  const s = { ...song, ev: song.ev.slice() };
  for (let i = 0; i < s.ev.length; i++) {
    const parts = splitAtBar(s, i);
    if (parts.length > 1) { s.ev.splice(i, 1, ...parts); i += parts.length - 1; }
  }
  return s;
}
