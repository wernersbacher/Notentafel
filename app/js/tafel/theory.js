// Taktarten, Zählzeiten und automatische Taktstriche
import { filled, dur, lineSpan } from './model.js';

// Taktart als Zahlen: n Zählzeiten im Takt, jede unit Schläge lang (Schlag = Viertel)
export function meterInfo(m) {
  const [n, base] = m.split('/'), unit = 4 / +base;
  return { n: +n, unit, len: +n * unit };
}
// Taktart, die für eine Zeile gilt: die eigene oder die zuletzt darüber gesetzte
export function meterOf(rows, r) {
  for (; r >= 0; r--) if (rows[r].meter) return rows[r].meter;
  return '';
}
// Wie viele Zählzeiten man unter ein Zeichen tippt (z. B. zwei für eine Halbe im 4/4-Takt)
export function countSlots(rows, r, cell) {
  const m = meterOf(rows, r), unit = m ? meterInfo(m).unit : 1;
  return Math.max(1, Math.round(dur(cell) / unit));
}
// Zählzeiten eines Zeichens, das an Stelle p im Takt beginnt und d Schläge dauert.
// Auf der Zählzeit steht die Zahl, genau dazwischen „+“, auf den Sechzehnteln dazwischen „e“ (1 e + e);
// gehaltene Zählzeiten folgen blasser.
function countsAt(p, d, mi) {
  const out = [], q = p / mi.unit, k = Math.floor(q);
  if (q === k) out.push({ t: String(k + 1) });
  else if (q - k === 0.5) out.push({ t: '+' });
  else if (mi.unit === 1 && (q - k === 0.25 || q - k === 0.75)) out.push({ t: 'e' });
  // o: Abstand zum Anfang des Zeichens in Sechzehnteln (für „Breite nach Notenlänge“)
  for (let x = k + 1; x < mi.n && x * mi.unit < p + d; x++) out.push({ t: String(x + 1), held: true, o: (x * mi.unit - p) * 4 });
  return out;
}
// Automatische Taktstriche und Zählzeiten. Gezählt wird ab der ersten Zeile mit Taktart über die Zeilen hinweg;
// eine neue Taktart beginnt wieder bei 1. Pro Zeile: b[c] = Taktstrich vor Platz c, z[c] = Zählzeiten.
// Geht ein Takt genau am Zeilenende auf, steht der Taktstrich hinter dem letzten Zeichen.
export function autoMarks(rows, on) {
  const res = { rows: [], any: false };
  if (!on) return res;
  let mi = null, pos = 0;
  rows.forEach((row, r) => {
    const a = res.rows[r] = { b: {}, z: [] };
    if (row.meter) { mi = meterInfo(row.meter); pos = 0; }
    if (!mi) return;
    const last = lineSpan(row);
    for (let c = 0; c <= last; c++) {
      const p = pos % mi.len;
      if (c > 0 && pos > 0 && p === 0) a.b[c] = 1;
      if (filled(row[c])) { a.z[c] = countsAt(p, dur(row[c]), mi); res.any = true; }
      pos += dur(row[c]);
    }
    if (last >= 0 && pos % mi.len === 0) a.b[last + 1] = 1;
  });
  return res;
}
// Wo in Zeile r der angefangene letzte Takt beginnt (gezählt wie autoMarks, über die Zeilen hinweg). Ohne Taktart oder
// wenn die Zeile mit einem vollen Takt endet: die Länge der Zeile (nichts angefangen). 0: Der Takt beginnt schon am
// Zeilenanfang (dann lässt er sich nicht in die nächste Zeile schieben).
export function openMeasureAt(rows, r) {
  let mi = null, pos = 0;
  for (let q = 0; q < r; q++) {
    if (rows[q].meter) { mi = meterInfo(rows[q].meter); pos = 0; }
    rows[q].forEach((x) => { pos += dur(x); });
  }
  const row = rows[r];
  if (row.meter) { mi = meterInfo(row.meter); pos = 0; }
  if (!mi) return row.length;
  let start = 0;
  row.forEach((x, c) => {
    if (pos % mi.len === 0) start = c;
    pos += dur(x);
  });
  return pos % mi.len === 0 ? row.length : start;
}

// Strich vor Platz c: 0 keiner, 1 Taktstrich, 2 Schlussstrich, 3–5 Wiederholung (Ende, Anfang, beides). a sind die
// automatischen Marken der Zeile. Schluss- und Wiederholungsstriche bleiben immer; von Hand gesetzte Taktstriche
// weichen den automatischen.
export function barAt(cell, c, a, autoBar) {
  if (cell && cell.bar >= 2) return cell.bar; // Schluss- und Wiederholungsstriche gelten auch mit Automatik
  if (autoBar) return a && a.b[c] ? 1 : 0;
  return cell && cell.bar ? 1 : 0;
}

/* ---------- Melodie-Echo ---------- */
// len Töne aus ids (aufsteigend sortiert): mit steps nur Schritte zum Nachbarton, sonst beliebig (aber nie zweimal
// derselbe Ton hintereinander)
export function makeMelody(ids, len, steps, random = Math.random) {
  const pick = (n) => Math.floor(random() * n);
  let k = pick(ids.length);
  const out = [ids[k]];
  while (out.length < len) {
    if (steps) {
      const next = [k - 1, k + 1].filter((x) => x >= 0 && x < ids.length);
      k = next[pick(next.length)];
    } else {
      const j = pick(ids.length - 1);
      k = j >= k ? j + 1 : j;
    }
    out.push(ids[k]);
  }
  return out;
}
