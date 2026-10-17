// Datenmodell des Lieds. Alle Funktionen hier sind rein.
//
// Ein Lied ist { meter, pickup, ev }: die Taktart ('' = ohne), der Auftakt in Ticks (0 = keiner) und eine durchgehende
// Folge von Ereignissen.
//   { p, v, dot?, acc? }  Note: p Tonhöhe ('c1' = c', 'a0' = a, 'c2' = c''), v Grundwert (1 Ganze, 2 Halbe, 4 Viertel,
//                         8 Achtel, 16 Sechzehntel), dot punktiert, acc Vorzeichen (1 ♯, −1 ♭, 0 ♮; fehlt = keins)
//   tie: 1               an einer Note: Haltebogen zur nächsten Note
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
  return { meter: '4/4', pickup: 0, ev: [] };
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
// Mögliche Auftakte in Ticks (Achtel, Viertel, punktierte Viertel, Halbe, punktierte Halbe); kürzer als ein Takt
export const PICKUPS = [4, 8, 12, 16, 24];
export const pickupsFor = (m) => (m ? PICKUPS.filter((t) => t < measureTicks(m)) : []);
// Verschiebung auf das Taktraster: Mit Auftakt beginnt das Lied so viele Ticks vor dem ersten vollen Takt,
// das erste Ereignis steht also bei Takt − Auftakt. Ohne Taktart oder Auftakt 0.
export const gridOffset = (song) => (song.meter && song.pickup ? measureTicks(song.meter) - song.pickup : 0);
// Beginn jedes Ereignisses auf dem Taktraster in Ticks (ein Vielfaches der Taktlänge ist ein Taktanfang)
export function gridStarts(song) {
  let pos = gridOffset(song);
  return song.ev.map((e) => { const p = pos; pos += ticks(e); return p; });
}
// Strich hinter jedem Ereignis: 0 keiner, 1 Taktstrich, 2 Schlussstrich.
// Automatisch (wie in der Tafel): Taktstriche nach der Taktart, wo ein Takt genau aufgeht (nach dem Auftakt gezählt); von Hand gesetzte
// Taktstriche sind dann ausgeblendet, der Schlussstrich bleibt.
export function barsAfter(song, auto) {
  const len = auto && song.meter ? measureTicks(song.meter) : 0;
  let pos = gridOffset(song);
  return song.ev.map((e) => {
    pos += ticks(e);
    if (e.bar === 2) return 2;
    if (auto) return len && pos % len === 0 ? 1 : 0;
    return e.bar ? 1 : 0;
  });
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
// Hängt Note e mit einem Haltebogen an prev (gleiche Tonhöhe samt Vorzeichen)? Nur dann klingt sie nicht neu.
export const tiedFrom = (prev, e) => !!(prev && prev.tie && isNote(e) && prev.p === e.p && (prev.acc ?? null) === (e.acc ?? null));

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
  if (o.p && e.tie) o.tie = 1;
  if (e.bar) o.bar = e.bar === 2 ? 2 : 1;
  if (e.brk) o.brk = 1;
  return o;
}
// Prüft ein gespeichertes Lied und liefert eine saubere Kopie (oder null). Ungültige Ereignisse fallen weg.
export function cleanSong(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.ev) || raw.ev.length > MAX_EV) return null;
  const meter = METERS.includes(raw.meter) ? raw.meter : '';
  return {
    meter,
    pickup: pickupsFor(meter).includes(raw.pickup) ? raw.pickup : 0,
    ev: raw.ev.map(cleanEvent).filter(Boolean)
  };
}

/* ---------- Regeln im Takt ---------- */
// Gezeichnete Vorzeichen pro Ereignis (1 ♯, −1 ♭, 0 ♮, null keins). Ein Vorzeichen gilt bis zum nächsten Strich für
// denselben Ton in derselben Oktave; ohne Vorzeichen danach bekommt er ein ♮. Ein acc: 0 am Modell zeigt immer ♮.
// Eine Note hinter einem Haltebogen zeigt keins und ändert nichts. Ein Umbruch ohne Strich setzt nichts zurück.
export function shownAccidentals(song, autoBar) {
  const bars = barsAfter(song, autoBar);
  let now = {};
  return song.ev.map((e, i) => {
    let out = null;
    if (isNote(e) && !tiedFrom(song.ev[i - 1], e)) {
      const a = e.acc || 0;
      if (e.acc === 0 || a !== (now[e.p] || 0)) out = a;
      now[e.p] = a;
    }
    if (bars[i]) now = {};
    return out;
  });
}

// Takte, die nicht aufgehen: Abschnitte zwischen zwei gezeichneten Strichen, deren Länge nicht der Taktart entspricht
// (der erste bei Auftakt dem Auftakt). Der letzte Abschnitt (Schlusstakt) und Lieder ohne Taktart werden nicht geprüft.
// Liefert [{ first, last, ticks, want }] mit den Indizes der Ereignisse.
export function badMeasures(song, autoBar) {
  if (!song.meter) return [];
  const bars = barsAfter(song, autoBar), len = measureTicks(song.meter), n = song.ev.length, out = [];
  let first = 0, sum = 0;
  song.ev.forEach((e, i) => {
    sum += ticks(e);
    if (!bars[i]) return;
    const want = first === 0 && song.pickup > 0 ? song.pickup : len;
    if (i < n - 1 && sum !== want) out.push({ first, last: i, ticks: sum, want });
    first = i + 1; sum = 0;
  });
  return out;
}

/* ---------- Abspielen ---------- */
// Ablaufplan für den Player: alle Zeichen nacheinander bis zum letzten Ton, Zeiten in Vierteln.
// Eine Note hinter einem Haltebogen klingt nicht neu, sondern verlängert die vorige.
export function playPlan(song) {
  const items = [];
  let t = 0, end = 0, last = -1, held = null;
  song.ev.forEach((e, i) => {
    const len = ticks(e) / QUARTER;
    if (held && tiedFrom(song.ev[i - 1], e)) {
      held.len += len;
      items.push({ t, len, sound: '', f: 0, pos: i });
    } else {
      const it = { t, len, sound: isNote(e) ? 'piano' : '', f: isNote(e) ? freq(e) : 0, pos: i };
      items.push(it);
      held = isNote(e) ? it : null;
    }
    t += len;
    if (isNote(e)) { last = i; end = t; }
  });
  return { items: items.slice(0, last + 1), end };
}
