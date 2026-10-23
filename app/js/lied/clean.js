// Gespeicherte Stände prüfen und Regeln im Takt. Kennt theory.js und measures.js.
import {
  VALUES, METERS, MAX_EV, MAX_LY, isNote, ticks, canDot, parsePitch, accOf, keyAcc, KEY_MIN, KEY_MAX
} from './theory.js';
import { pickupsFor, measureTicks, barsAfter, canTie, tiedFrom } from './measures.js';

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
  const ev = raw.ev.map(cleanEvent).filter(Boolean);
  // Haltebögen ohne passende Folgenote bleiben nicht stehen: Sie würden gezeichnet, aber nicht klingen
  ev.forEach((e, i) => { if (e.tie && !canTie(e, ev[i + 1])) delete e.tie; });
  return {
    meter,
    pickup: pickupsFor(meter).includes(raw.pickup) ? raw.pickup : 0,
    key: Number.isInteger(raw.key) && raw.key >= KEY_MIN && raw.key <= KEY_MAX ? raw.key : 0,
    ev
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
