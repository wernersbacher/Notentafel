// Lied transponieren. Kennt theory.js.
// Das Lied als Melodie übernehmen (songToMelody) wandert ins gemeinsame songformat.js (oberste Schicht, verbindet Lied
// und Tafel) und wird hier nur weitergereicht, damit die Importe aus './model.js' unverändert bleiben.
import { isNote, parsePitch, makePitch, accOf, keyAcc, SEMI, OCT_MIN, OCT_MAX, KEY_MIN, KEY_MAX } from './theory.js';

export { songToMelody } from '../songformat.js';

/* ---------- Transponieren ---------- */
// Grundton (Stufe) der Dur-Tonart k: eine Quinte sind vier Stufen
const rootStep = (k) => ((k * 4) % 7 + 7) % 7;
// Das ganze Lied um semis Halbtöne höher (positiv) oder tiefer. Die Tonart wandert mit (die mit den wenigsten
// Vorzeichen), jede Note um dasselbe Intervall, richtig geschrieben in der neuen Tonart. null, wenn ein Ton aus dem
// Tonvorrat c bis h''' fiele.
export function transpose(song, semis) {
  const k0 = song.key || 0;
  let k = null;
  for (let c = KEY_MIN; c <= KEY_MAX; c++) {
    if (((c - k0 - 7 * semis) % 12 + 12) % 12 === 0 && (k === null || Math.abs(c) < Math.abs(k))) k = c;
  }
  let ds = rootStep(k) - rootStep(k0);
  if (semis > 0 && ds < 0) ds += 7;
  if (semis < 0 && ds > 0) ds -= 7;
  const ev = [];
  for (const e of song.ev) {
    if (!isNote(e)) { ev.push({ ...e }); continue; }
    const { step, oct } = parsePitch(e.p), target = oct * 12 + SEMI[step] + accOf(e, k0) + semis;
    let d = oct * 7 + step + ds;
    let acc = target - (Math.floor(d / 7) * 12 + SEMI[d % 7]);
    // Doppelte Vorzeichen vermeiden: dann den Nachbarton nehmen
    if (acc > 1) { d += 1; acc = target - (Math.floor(d / 7) * 12 + SEMI[d % 7]); }
    if (acc < -1) { d -= 1; acc = target - (Math.floor(d / 7) * 12 + SEMI[d % 7]); }
    const o = Math.floor(d / 7);
    if (o < OCT_MIN || o > OCT_MAX) return null;
    const n = { ...e, p: makePitch(d % 7, o) };
    if (acc === keyAcc(k, d % 7)) delete n.acc; else n.acc = acc;
    ev.push(n);
  }
  return { ...song, key: k, ev };
}
