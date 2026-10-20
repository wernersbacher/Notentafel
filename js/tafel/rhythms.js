// Zufällige Rhythmen für das Rhythmus-Echo. Rein: Der Zufall kommt als Funktion rnd() herein (0 ≤ rnd() < 1).
//
// Ein Rhythmus besteht aus Bausteinen, die Schlag für Schlag in die Takte gelegt werden. Ein Baustein ist eine Folge von
// Längen in Vierteln (negativ: Pause), mit
//   lv  Schwierigkeit der Noten, ab der er vorkommt: 1 leicht (Viertel, Halbe, Ganze), 2 mittel (dazu Achtel),
//       3 schwer (dazu punktierte Viertel mit Achtel, Synkope und – selten – Sechzehntel)
//   rv  Schwierigkeit der Pausen, ab der er vorkommt (0: ohne Pause): 1 Viertelpausen, 2 dazu halbe Pausen und
//       Achtelpausen, 3 dazu Pausen auf der Zählzeit vor einer Achtel oder Sechzehntel und öfter Pausen
//   w   Gewicht (wie oft er gezogen wird), at: Stellen im Takt (in Vierteln), an denen er beginnen darf (ohne: überall)
import { METERS } from './config.js';

const B = (ev, lv, rv, w, at) => ({ ev, len: ev.reduce((s, d) => s + Math.abs(d), 0), lv, rv, w, at });

// Bausteine für Takte aus Vierteln (2/4, 3/4, 4/4, 2/2); Halbe und längere beginnen auf einem betonten Schlag
const QUARTERS = [
  B([1], 1, 0, 6),
  B([2], 1, 0, 2.2, [0, 2]),
  B([3], 1, 0, 1, [0]),
  B([4], 1, 0, 0.5, [0]),
  B([0.5, 0.5], 2, 0, 5),
  B([1.5, 0.5], 3, 0, 2, [0, 2]),
  B([0.5, 1, 0.5], 3, 0, 1, [0, 2]),
  B([0.25, 0.25, 0.25, 0.25], 3, 0, 0.8),
  B([0.5, 0.25, 0.25], 3, 0, 0.6),
  B([0.25, 0.25, 0.5], 3, 0, 0.6),
  B([-1], 1, 1, 1.6),
  B([-2], 1, 2, 0.6, [0, 2]),
  B([0.5, -0.5], 2, 2, 1),
  B([-0.5, 0.5], 2, 3, 1.4),
  B([-0.25, 0.25, 0.5], 3, 3, 0.4)
];
// Bausteine für den 6/8-Takt: zwei Schläge zu je drei Achteln (eine punktierte Viertel)
const EIGHTHS = [
  B([1.5], 1, 0, 4),
  B([1, 0.5], 1, 0, 4),
  B([3], 1, 0, 1, [0]),
  B([0.5, 0.5, 0.5], 2, 0, 4),
  B([0.5, 1], 2, 0, 1.5),
  B([0.25, 0.25, 0.5, 0.5], 3, 0, 0.8),
  B([0.5, 0.5, 0.25, 0.25], 3, 0, 0.8),
  B([-1, 0.5], 1, 1, 1.4),
  B([-1.5], 1, 2, 0.8),
  B([1, -0.5], 1, 2, 1),
  B([0.5, -0.5, 0.5], 2, 2, 1),
  B([-0.5, 0.5, 0.5], 2, 3, 1.2)
];

// Taktlänge in Vierteln und die Bausteine einer Taktart (ohne Taktart: 4/4)
export function meterParts(meter) {
  const m = METERS.includes(meter) ? meter : '4/4';
  if (m === '6/8') return { meter: m, len: 3, parts: EIGHTHS };
  return { meter: m, len: m === '2/4' ? 2 : m === '3/4' ? 3 : 4, parts: QUARTERS };
}

// So oft kommen bei „schwer“ Sechzehntel vor: in etwa jedem siebten Rhythmus (in der Grundschule sind sie selten)
export const SIXTEENTHS = 0.15;
const has16 = (p) => p.ev.some((d) => Math.abs(d) === 0.25);

// Ein Rhythmus: bars Takte (1–3) in der Taktart meter. notes 1–3 und rests 0–3 wie oben. Liefert die Plätze einer
// Zeile der Tafel: { k: 'b', d } für Noten, { k: 'r', d } für Pausen.
// Ob Sechzehntel darin vorkommen, wird vorab entschieden (SIXTEENTHS). Damit die Stufe auch zu hören ist, wird dann so
// lange neu gewürfelt, bis ein Baustein der gewählten Stufe vorkommt (bei Pausen: überhaupt eine Pause), gegebenenfalls
// Sechzehntel, der Rhythmus mit einer Note beginnt und höchstens gut ein Drittel davon Pause ist.
export function makeRhythm({ meter = '4/4', bars = 2, notes = 1, rests = 0 } = {}, rnd = Math.random) {
  const mp = meterParts(meter), with16 = notes >= 3 && rnd() < SIXTEENTHS;
  const usable = mp.parts.filter((p) => p.lv <= notes && p.rv <= rests && (with16 || !has16(p)));
  const topLv = Math.max(...usable.map((p) => p.lv)), topRv = Math.max(...usable.map((p) => p.rv));
  let best = null;
  for (let tries = 0; tries < 60; tries++) {
    const used = [];
    for (let b = 0; b < bars; b++) {
      for (let pos = 0; pos < mp.len;) {
        const fit = usable.filter((p) => p.len <= mp.len - pos && (!p.at || p.at.includes(pos)) &&
          !(used.length === 0 && p.ev[0] < 0));
        const part = pick(fit, rnd);
        used.push(part);
        pos += part.len;
      }
    }
    const ev = used.flatMap((p) => p.ev);
    const silent = ev.filter((d) => d < 0).reduce((s, d) => s - d, 0);
    const ok = used.some((p) => p.lv === topLv) && (!rests || used.some((p) => p.rv === topRv)) &&
      (!with16 || used.some(has16)) && silent <= bars * mp.len * 0.36;
    best = ev;
    if (ok) break;
  }
  return best.map((d) => (d < 0 ? { k: 'r', d: -d } : { k: 'b', d }));
}

function pick(list, rnd) {
  const sum = list.reduce((s, p) => s + p.w, 0);
  let x = rnd() * sum;
  for (const p of list) { x -= p.w; if (x < 0) return p; }
  return list[list.length - 1];
}
