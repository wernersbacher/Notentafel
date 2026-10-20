// Datenmodell des Lieds. Alle Funktionen hier sind rein.
//
// Ein Lied ist { meter, pickup, key, ev }: die Taktart ('' = ohne), der Auftakt in Ticks (0 = keiner), die Tonart als
// Zahl der Vorzeichen (1 = ein ♯ wie G-Dur, −1 = ein ♭ wie F-Dur, 0 = C-Dur) und eine durchgehende Folge von Ereignissen.
//   { p, v, dot?, acc? }  Note: p Tonhöhe ('c1' = c', 'a0' = a, 'c2' = c''), v Grundwert (1 Ganze, 2 Halbe, 4 Viertel,
//                         8 Achtel, 16 Sechzehntel), dot punktiert, acc Vorzeichen (1 ♯, −1 ♭, 0 ♮; fehlt = wie die Tonart)
//   tie: 1               an einer Note: Haltebogen zur nächsten Note
//   ly: 'Al-'            an einer Note: Silbe des Liedtexts (ein „-“ am Ende verbindet mit der nächsten Silbe)
//   { v, dot? }           Pause
// Jedes Ereignis kann zusätzlich tragen: bar (dahinter: 1 Taktstrich, 2 Schlussstrich, 3 Wiederholung Ende :‖,
// 4 Wiederholung Anfang ‖:, 5 beides :‖:), volta (nur mit 3 oder 5: der Takt davor ist die 1. Klammer, der danach die 2.)
// und brk (Zeilenumbruch dahinter).
// Die Zeilen (Notensysteme) entstehen erst beim Zeichnen.

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
const diatonic = (p) => { const x = parsePitch(p); return x.oct * 7 + x.step; };
// Platz im Notensystem in halben Linienabständen: unterste Linie e' = 0, oberste Linie f'' = 8, c' = −2
export const staffPos = (p) => diatonic(p) - 9;

const SEMI = [0, 2, 4, 5, 7, 9, 11];
// Frequenz einer Note in der Tonart k
export function freq(e, k = 0) {
  const { step, oct } = parsePitch(e.p);
  const midi = 48 + oct * 12 + SEMI[step] + accOf(e, k);
  return 440 * 2 ** ((midi - 69) / 12);
}

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

/* ---------- Als Melodie übernehmen ---------- */
// Farbnoten zu Stufe (0 = c) und Vorzeichen, je Oktave: c'–h' mit allen Halbtönen, c''–f'' mit Cis und Dis
// (Des wie Cis, Es wie Dis, Ges wie Fis, As wie Gis, Ais wie B)
const MEL_IDS = [
  { '0:0': 'C', '0:1': 'Cis', '1:-1': 'Cis', '1:0': 'D', '1:1': 'Dis', '2:-1': 'Dis', '2:0': 'E', '3:0': 'F', '3:1': 'Fis', '4:-1': 'Fis',
    '4:0': 'G', '4:1': 'Gis', '5:-1': 'Gis', '5:0': 'A', '5:1': 'B', '6:-1': 'B', '6:0': 'H' },
  { '0:0': 'C+', '0:1': 'Cis+', '1:-1': 'Cis+', '1:0': 'D+', '1:1': 'Dis+', '2:-1': 'Dis+', '2:0': 'E+', '3:0': 'F+' }
];
const MEL_BEATS = [0.5, 1, 1.5, 2, 3, 4];
const MEL_PER_ROW = 10; // Schläge pro Zeile der Melodie (wie MAX_PER_ROW in tafel/config.js)
const MEL_ROWS = 8;     // Zeilen der Tafel (wie MAX_ROWS)
// Nächste Länge, die die Melodie kennt (gleich weit: die längere)
const melBeats = (b) => MEL_BEATS.reduce((a, x) => (Math.abs(x - b) < Math.abs(a - b) || (Math.abs(x - b) === Math.abs(a - b) && x > a) ? x : a));
// Das Lied als Melodie (Format der Tafel: rows mit Plätzen, lines mit Taktart; siehe tafel/model.js). Jede Note wird ein
// Farbpunkt mit Notenwert, übergebundene Noten werden zu einer langen zusammengefasst, wenn es die Länge gibt. Töne
// außerhalb des Vorrats (c'–f'' mit Halbtönen) werden Pausen gleicher Länge, andere Längen gerundet. Takte bleiben zusammen in
// einer Zeile (höchstens 10 Schläge), ein Umbruch beginnt eine neue; Schluss- und Wiederholungsstriche kommen mit.
// Liefert { rows, lines, skipped (Töne als Pause), cut (Zeilen, die nicht mehr auf die Tafel passten) }.
export function songToMelody(song, autoBar = true) {
  const ev = song.ev, bars = barsAfter(song, autoBar), units = [];
  let skipped = 0;
  for (let i = 0; i < ev.length; i++) {
    const e = ev[i];
    let beats = ticks(e) / QUARTER, j = i;
    if (isNote(e)) {
      let more = beats, k = i;
      while (k + 1 < ev.length && tiedFrom(ev[k], ev[k + 1])) { k++; more += ticks(ev[k]) / QUARTER; }
      if (k > i && MEL_BEATS.includes(more)) { beats = more; j = k; }
    }
    const d = melBeats(beats);
    let cell = { k: 'r', d };
    if (isNote(e)) {
      const { step, oct } = parsePitch(e.p), id = (MEL_IDS[oct - 1] || {})[step + ':' + accOf(e, song.key || 0)];
      if (id) cell = { n: id, h: '', d }; else skipped++;
    }
    units.push({ cell, beats: d, bar: bars[j], brk: !!ev[j].brk });
    i = j;
  }
  // Takte (bis zu einem Strich oder Umbruch) zu Zeilen
  const rows = [[]];
  let beatsInRow = 0, chunk = [], chunkBeats = 0;
  const flush = (brk) => {
    if (chunk.length) {
      if (beatsInRow && beatsInRow + chunkBeats > MEL_PER_ROW) { rows.push([]); beatsInRow = 0; }
      rows[rows.length - 1].push(...chunk);
      beatsInRow += chunkBeats;
    }
    chunk = []; chunkBeats = 0;
    if (brk && rows[rows.length - 1].length) { rows.push([]); beatsInRow = 0; }
  };
  units.forEach((u) => {
    chunk.push(u); chunkBeats += u.beats;
    if (u.bar || u.brk) flush(u.brk);
  });
  flush(false);
  if (!rows[rows.length - 1].length) rows.pop();
  // Striche: im Lied hinter einem Zeichen, auf der Tafel vor dem nächsten Platz (am Zeilenende ein leerer Platz mit Strich)
  const out = rows.slice(0, MEL_ROWS).map((us) => {
    const cells = us.map((u) => ({ ...u.cell }));
    us.forEach((u, k) => {
      if (!u.bar || (u.bar === 1 && autoBar)) return;
      if (k + 1 < cells.length) cells[k + 1].bar = u.bar; else cells.push({ bar: u.bar });
    });
    return cells.slice(0, 32);
  });
  return { rows: out, lines: out.map((_, r) => (r === 0 && song.meter ? { l: 0, m: song.meter } : 0)), skipped, cut: Math.max(0, rows.length - MEL_ROWS) };
}

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
  if (o.p && typeof e.ly === 'string' && e.ly.trim()) o.ly = e.ly.trim().slice(0, MAX_LY);
  if (e.bar) o.bar = [2, 3, 4, 5].includes(e.bar) ? e.bar : 1;
  if (e.volta && (o.bar === 3 || o.bar === 5)) o.volta = 1;
  if (e.brk) o.brk = 1;
  // Verdecken: q ?-Karte über der Note, qn über ihrem Notennamen (je 1 verdeckt, 2 aufgedeckt), cv ab hier liegt jetzt
  // das Tuch, cf hier lag es am Anfang; fd: die Zeile mit diesem Ereignis ist eingeklappt
  if (e.q === 1 || e.q === 2) o.q = e.q;
  if (o.p && (e.qn === 1 || e.qn === 2)) o.qn = e.qn;
  if (e.cv) o.cv = 1;
  if (e.cf) o.cf = 1;
  if (e.fd) o.fd = 1;
  return o;
}
// Prüft ein gespeichertes Lied und liefert eine saubere Kopie (oder null). Ungültige Ereignisse fallen weg.
export function cleanSong(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.ev) || raw.ev.length > MAX_EV) return null;
  const meter = METERS.includes(raw.meter) ? raw.meter : '';
  return {
    meter,
    pickup: pickupsFor(meter).includes(raw.pickup) ? raw.pickup : 0,
    key: Number.isInteger(raw.key) && raw.key >= KEY_MIN && raw.key <= KEY_MAX ? raw.key : 0,
    ev: raw.ev.map(cleanEvent).filter(Boolean)
  };
}

/* ---------- Regeln im Takt ---------- */
// Gezeichnete Vorzeichen pro Ereignis (1 ♯, −1 ♭, 0 ♮, null keins). Ohne eigenes Vorzeichen gilt die Tonart; ein
// gesetztes Vorzeichen gilt bis zum nächsten Strich für denselben Ton in derselben Oktave, danach wird es nötigenfalls
// aufgelöst. Ein acc: 0 am Modell zeigt immer ♮. Eine Note hinter einem Haltebogen zeigt keins und ändert nichts.
// Ein Umbruch ohne Strich setzt nichts zurück.
export function shownAccidentals(song, autoBar) {
  const bars = barsAfter(song, autoBar), k = song.key || 0;
  let now = {};
  return song.ev.map((e, i) => {
    let out = null;
    if (isNote(e) && !tiedFrom(song.ev[i - 1], e)) {
      const a = accOf(e, k), was = e.p in now ? now[e.p] : keyAcc(k, parsePitch(e.p).step);
      if (e.acc === 0 || a !== was) out = a;
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
// Reihenfolge, in der die Ereignisse erklingen: Wiederholungen ausgeschrieben. Am Wiederholungsende (:‖) geht es einmal
// zurück zum letzten Wiederholungsanfang (‖:, sonst zum Anfang); mit volta wird beim zweiten Mal der Takt davor
// (1. Klammer) übersprungen und gleich hinter dem Strich weitergespielt (2. Klammer).
export function playOrder(song, autoBar = true) {
  const ev = song.ev, bars = barsAfter(song, autoBar), order = [], done = new Set();
  const measureStart = (i) => { let j = i; while (j > 0 && !bars[j - 1]) j--; return j; };
  let i = 0, start = 0, skip = null;
  while (i < ev.length) {
    if (skip && i === skip.from) { i = skip.to; skip = null; continue; }
    order.push(i);
    const b = bars[i];
    if ((b === 3 || b === 5) && !done.has(i)) {
      done.add(i);
      if (ev[i].volta) skip = { from: measureStart(i), to: i + 1 };
      i = start;
      continue;
    }
    if (b === 4 || b === 5) start = i + 1;
    i++;
  }
  return order;
}
export function playPlan(song, autoBar = true) {
  const items = [];
  let t = 0, end = 0, last = -1, held = null, prev = -1;
  playOrder(song, autoBar).forEach((i) => {
    const e = song.ev[i];
    const len = ticks(e) / QUARTER;
    if (held && prev === i - 1 && tiedFrom(song.ev[i - 1], e)) {
      held.len += len;
      items.push({ t, len, sound: '', f: 0, pos: i });
    } else {
      const it = { t, len, sound: isNote(e) ? 'piano' : '', f: isNote(e) ? freq(e, song.key) : 0, pos: i };
      items.push(it);
      held = isNote(e) ? it : null;
    }
    t += len;
    prev = i;
    if (isNote(e)) { last = items.length - 1; end = t; }
  });
  return { items: items.slice(0, last + 1), end };
}
