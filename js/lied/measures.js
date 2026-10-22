// Takte, Raster, Zählzeiten und alles, was an Haltebögen hängt. Kennt nur theory.js.
import { ticks, isNote } from './theory.js';

/* ---------- Takte ---------- */
// Länge eines Takts in Ticks, z. B. 32 für 4/4, 24 für 6/8
export function measureTicks(m) {
  const [n, base] = m.split('/');
  return +n * 32 / +base;
}
// Mögliche Auftakte in Ticks (Achtel, Viertel, punktierte Viertel, Halbe, punktierte Halbe); kürzer als ein Takt
export const PICKUPS = [4, 8, 12, 16, 24];
export const pickupsFor = (m) => (m ? PICKUPS.filter((t) => t < measureTicks(m)) : []);
// Verschiebung auf das Taktraster: Mit Auftakt beginnt das Lied so viele Ticks vor dem ersten vollen Takt,
// das erste Ereignis steht also bei Takt − Auftakt. Ohne Taktart oder Auftakt 0.
export const gridOffset = (song) => (song.meter && song.pickup ? measureTicks(song.meter) - song.pickup : 0);
// Beginn und Ende jedes Ereignisses auf dem Taktraster in Ticks (ein Vielfaches der Taktlänge ist ein Taktanfang).
// Ragt ein Zeichen über eine Taktgrenze, endet der Takt hinter ihm und der nächste beginnt neu; sonst wären alle
// folgenden Takte verschoben.
function grid(song) {
  const len = song.meter ? measureTicks(song.meter) : 0;
  let pos = gridOffset(song);
  return song.ev.map((e) => {
    const start = pos;
    pos += ticks(e);
    if (len && pos % len && Math.floor((pos - 1) / len) > Math.floor(start / len)) pos = Math.ceil(pos / len) * len;
    return { start, end: pos };
  });
}
export const gridStarts = (song) => grid(song).map((g) => g.start);

// Notenwerte [v, dot] nach Länge in Ticks, die längsten zuerst
const PIECES = [[1, 0], [2, 1], [2, 0], [4, 1], [4, 0], [8, 1], [8, 0], [16, 0]].map(([v, dot]) => ({ v, dot, t: ticks({ v, dot }) }));
// Eine Länge in Ticks als Folge von Notenwerten, die längsten zuerst (z. B. 10 = Viertel + Sechzehntel)
function piecesOf(t) {
  const out = [];
  for (const p of PIECES) while (t >= p.t) { out.push(p); t -= p.t; }
  return out;
}
// Ragt Ereignis i über einen Taktstrich (der Taktart nach), wird es dort aufgeteilt: Der Teil, der noch passt, bleibt im
// Takt, der Rest kommt in den nächsten (und übernächsten …) Takt. Noten werden mit Haltebögen verbunden und behalten
// Tonhöhe und Vorzeichen; Strich und Umbruch hinter dem Ereignis wandern ans letzte Stück. Liefert die Ereignisse, die
// an die Stelle von Ereignis i treten (ohne Taktart oder wenn es passt: nur das Ereignis selbst).
export function splitAtBar(song, i) {
  const e = song.ev[i], len = song.meter ? measureTicks(song.meter) : 0;
  if (!e || !len) return [e];
  let room = len - grid(song)[i].start % len, left = ticks(e);
  if (left <= room) return [e];
  const parts = [];
  while (left > 0) {
    const t = Math.min(left, room);
    parts.push(...piecesOf(t));
    left -= t;
    room = len;
  }
  return parts.map(({ v, dot }, k) => {
    const o = isNote(e) ? { p: e.p, v } : { v }, last = k === parts.length - 1;
    if (dot) o.dot = 1;
    if (isNote(e) && e.acc != null) o.acc = e.acc;
    if (isNote(e) && (!last || e.tie)) o.tie = 1;
    if (k === 0 && e.ly) o.ly = e.ly; // die Silbe gehört zum Anschlag
    if (last && e.bar) o.bar = e.bar;
    if (last && e.brk) o.brk = 1;
    return o;
  });
}
// Strich hinter jedem Ereignis: 0 keiner, 1 Taktstrich, 2 Schlussstrich.
// Automatisch (wie in der Tafel): Taktstriche nach der Taktart, wo ein Takt aufgeht (nach dem Auftakt gezählt), und hinter
// einem Zeichen, das über die Taktgrenze ragt (dieser Takt ist dann zu voll); von Hand gesetzte Taktstriche sind dann
// ausgeblendet, der Schlussstrich bleibt.
export function barsAfter(song, auto) {
  const len = auto && song.meter ? measureTicks(song.meter) : 0, g = grid(song);
  return song.ev.map((e, i) => {
    if (e.bar >= 2) return e.bar; // Schluss- und Wiederholungsstriche gelten auch mit Automatik
    if (auto) return len && g[i].end % len === 0 ? 1 : 0;
    return e.bar ? 1 : 0;
  });
}

// Striche so, wie sie gezeichnet werden: Mit Automatik und Taktart endet das Lied immer mit einem Schlussstrich
// (außer es endet schon mit einem Wiederholungszeichen).
export function drawnBars(song, auto) {
  const bars = barsAfter(song, auto), n = bars.length;
  if (auto && song.meter && n && bars[n - 1] < 2) bars[n - 1] = 2;
  return bars;
}

// Zählzeiten wie in der Tafel, nach dem Auftakt gezählt: pro Ereignis [{ t, held, o }]. Auf der Zählzeit steht die Zahl,
// genau dazwischen „+“; Zählzeiten, die das Zeichen hält, folgen blasser (held) mit ihrem Abstand o in Ticks.
// Gezählt wird in der Einheit der Taktart (6/8 in Achteln, 2/2 in Halben). Eine Note hinter einem Haltebogen
// wird nicht neu angeschlagen, ihre erste Zählzeit ist deshalb auch blass. Ohne Taktart: keine Zählzeiten.
export function countsOf(song) {
  if (!song.meter) return song.ev.map(() => []);
  const [n, base] = song.meter.split('/'), unit = 32 / +base, len = measureTicks(song.meter), starts = gridStarts(song);
  return song.ev.map((e, i) => {
    const p = starts[i] % len, d = ticks(e), q = p / unit, k = Math.floor(q), out = [];
    const tied = isNote(e) && tiedFrom(song.ev[i - 1], e);
    if (q === k) out.push({ t: String(k + 1), held: tied });
    else if (q - k === 0.5) out.push({ t: '+', held: tied });
    for (let x = k + 1; x < +n && x * unit < p + d; x++) out.push({ t: String(x + 1), held: true, o: x * unit - p });
    return out;
  });
}
// Können zwei aufeinanderfolgende Ereignisse überhaupt durch einen Haltebogen verbunden werden? Nur dann klingt die
// zweite Note als Fortsetzung der ersten: Beide müssen Noten sein und gleich hoch klingen (Tonhöhe und Vorzeichen gleich).
export const canTie = (a, b) => !!(isNote(a) && isNote(b) && a.p === b.p && (a.acc ?? null) === (b.acc ?? null));
// Hängt Note e mit einem Haltebogen an prev (gleiche Tonhöhe samt Vorzeichen)? Nur dann klingt sie nicht neu.
export const tiedFrom = (prev, e) => !!(prev && prev.tie && canTie(prev, e));
// Gültiger Haltebogen an Ereignis i (zum Zeichnen): dieselbe Prüfung wie beim Abspielen, nur mit Index.
export const tieValidAt = (ev, i) => tiedFrom(ev[i], ev[i + 1]);

/* ---------- Änderungen, die Haltebögen betreffen ---------- */
// Haltebogen an Note i an- oder abschalten. Gesetzt wird er nur, wenn er gültig wäre (sonst stünde ein Bogen da, der
// nicht klingt); ein vorhandener fällt immer weg. Liefert, ob sich etwas geändert hat.
export function toggleTieAt(ev, i) {
  const a = ev[i];
  if (!isNote(a)) return false;
  if (a.tie) { delete a.tie; return true; }
  if (!canTie(a, ev[i + 1])) return false;
  a.tie = 1;
  return true;
}
// Bogen an Note i und an der Note davor entfernen, wenn er nach einer Änderung nicht mehr passt
function pruneTies(ev, i) {
  for (const k of [i - 1, i]) if (ev[k] && ev[k].tie && !canTie(ev[k], ev[k + 1])) delete ev[k].tie;
}
// Tonhöhe der Note i ändern (beim Ziehen): Das Vorzeichen gehörte zum alten Ton und fällt weg, ebenso Haltebögen, die
// danach nicht mehr passen. Liefert false, wenn sich nichts ändert.
export function changePitch(ev, i, p) {
  const e = ev[i];
  if (!isNote(e) || e.p === p) return false;
  e.p = p;
  delete e.acc;
  pruneTies(ev, i);
  return true;
}
// Takt- und Schlussstrich, Umbruch, Tuch und Einklappen bleiben stehen, wenn das Zeichen ersetzt wird
export function keepMarks(prev, o) {
  if (prev.bar) o.bar = prev.bar;
  if (prev.brk) o.brk = 1;
  if (prev.cv) o.cv = 1;
  if (prev.cf) o.cf = 1;
  if (prev.fd) o.fd = 1;
  return o;
}
// Zwei Ereignisse tauschen (Ziehen zur Seite); Takte und Umbrüche bleiben an ihrer Stelle. Haltebögen, die danach
// nicht mehr passen, fallen weg.
export function swapEvents(ev, i, j) {
  const a = ev[i], b = ev[j];
  if (!a || !b || i === j) return false;
  const content = (e) => { const o = { ...e }; delete o.bar; delete o.brk; return o; };
  ev[i] = keepMarks(a, content(b));
  ev[j] = keepMarks(b, content(a));
  pruneTies(ev, i);
  pruneTies(ev, j);
  return true;
}
