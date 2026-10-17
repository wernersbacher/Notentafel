// Alles, was das Lied verändert. Jede Aktion merkt sich vorher den Stand für „Rückgängig“ und endet mit commit().
import { toast } from '../core/ui.js';
import { MAX_EV, isNote, canDot, nearestPitch, shiftOct } from './model.js';
import { L, opts, persistOpts, snap, restore, stashSong } from './state.js';
import { render, commit } from './render.js';

const ev = () => L.song.ev;
const cur = () => L.song.ev[L.sel];
// Neues Ereignis mit dem vorgewählten Wert
function fresh(o) {
  o.v = L.pen.v;
  if (L.pen.dot && canDot(L.pen.v)) o.dot = 1;
  return o;
}
// Takt- und Schlussstrich und Umbruch hinter dem Platz bleiben stehen, wenn das Zeichen ersetzt wird
function keepMarks(prev, o) {
  if (prev.bar) o.bar = prev.bar;
  if (prev.brk) o.brk = 1;
  return o;
}
function full() {
  if (ev().length < MAX_EV) return false;
  toast('Das Lied ist voll (' + MAX_EV + ' Zeichen).', true);
  return true;
}

/* ---------- Markierung ---------- */
// Tippen auf einen Platz: markiert ihn; steht dort ein Zeichen, übernimmt der Stift seinen Wert
export function select(i) {
  L.sel = Math.max(0, Math.min(i, ev().length));
  L.last = null;
  L.clean = false;
  const e = cur();
  if (e) L.pen = { v: e.v, dot: e.dot ? 1 : 0 };
  render();
}
export function toggleInsert() { L.insertMode = !L.insertMode; L.clean = false; render(); }
export function toggleClean() { L.clean = !L.clean; render(); }

// Der Ton, auf den Vorzeichen und Oktave wirken: der zuletzt gesetzte, sonst der markierte (oder keiner)
export function target() {
  if (L.last != null && isNote(ev()[L.last])) return L.last;
  return isNote(cur()) ? L.sel : null;
}

/* ---------- Zeichen setzen ---------- */
// Setzt ein Ereignis an der Markierung: am Ende oder im Einfügen-Modus kommt es dazu, sonst ersetzt es das Zeichen dort
function place(o, keepValue) {
  const prev = cur();
  if (L.insertMode || !prev) {
    if (full()) return;
    snap();
    ev().splice(L.sel, 0, fresh(o));
  } else {
    snap();
    if (keepValue) { o.v = prev.v; if (prev.dot) o.dot = 1; } else fresh(o);
    ev()[L.sel] = keepMarks(prev, o);
  }
  L.last = L.sel;
  L.sel++;
  commit();
}
// Stammton step (0 = c … 6 = h) in der Oktave, die dem vorigen Ton am nächsten liegt.
// Beim Ersetzen bleibt der Wert des Zeichens, damit der Rhythmus stimmt.
export function placePitch(step) {
  let prev = null;
  for (let i = L.sel - 1; i >= 0 && !prev; i--) if (isNote(ev()[i])) prev = ev()[i].p;
  place({ p: nearestPitch(step, prev) }, true);
}
// Pause mit dem vorgewählten Wert
export const placeRest = () => place({}, false);

// Zeichen an der Markierung, das ein Notenwert oder Punkt mit ändert (im Einfügen-Modus keins: dort ist die Markierung nur die Einfügestelle)
const valueTarget = () => (L.insertMode ? null : cur());
// Stift: Notenwert wählen (ohne Punkt; den tippt man danach dazu). Steht die Markierung auf einem Zeichen,
// bekommt auch dieses den Wert.
export function setValue(v) {
  L.pen = { v, dot: 0 };
  const e = valueTarget();
  if (!e) { render(); return; }
  snap();
  e.v = v;
  delete e.dot;
  commit();
}
export function toggleDot() {
  if (!canDot(L.pen.v)) return;
  L.pen.dot = L.pen.dot ? 0 : 1;
  const e = valueTarget();
  if (!e || !canDot(e.v)) { render(); return; }
  snap();
  if (L.pen.dot) e.dot = 1; else delete e.dot;
  commit();
}
// Vorzeichen (1 ♯, −1 ♭, 0 ♮) am Ton umschalten
export function setAcc(a) {
  const t = target();
  if (t == null) return;
  snap();
  const e = ev()[t];
  if (e.acc === a) delete e.acc; else e.acc = a;
  commit();
}
// Eine Oktave höher (1) oder tiefer (−1)
export function shift(by) {
  const t = target();
  if (t == null) return;
  const e = ev()[t], p = shiftOct(e.p, by);
  if (p === e.p) { toast(by > 0 ? 'Höher geht es nicht.' : 'Tiefer geht es nicht.', true); return; }
  snap();
  e.p = p;
  commit();
}

/* ---------- Takt ---------- */
// Takt- (1) oder Schlussstrich (2) vor der Markierung, also hinter dem Zeichen davor
export function toggleBar(kind) {
  const e = ev()[L.sel - 1];
  if (!e) return;
  snap();
  if (e.bar === kind) delete e.bar; else e.bar = kind;
  commit();
}
export function setMeter(m) {
  if (L.song.meter === m) return;
  snap();
  L.song.meter = m;
  commit();
}
export function toggleAutoBar() {
  opts.autoBar = !opts.autoBar;
  persistOpts();
  if (opts.autoBar && !L.song.meter) toast('Wähle zuerst eine Taktart, dann kommen die Taktstriche von selbst.');
  render();
}

/* ---------- Entfernen und Umbruch ---------- */
// Ein Ton wird zur Pause gleicher Länge, damit die Takte stimmen. Pausen und das letzte Zeichen verschwinden ganz.
// Im Einfügen-Modus („Lücke zu“) verschwindet das Zeichen immer, der Rest rückt nach.
export function deleteEv() {
  const e = cur();
  if (!e) return;
  snap();
  if (!L.insertMode && isNote(e) && L.sel < ev().length - 1) {
    const o = { v: e.v };
    if (e.dot) o.dot = 1;
    ev()[L.sel] = keepMarks(e, o);
  } else ev().splice(L.sel, 1);
  L.last = null;
  commit();
}
// Umbruch vor der Markierung: ab hier geht es in einer neuen Zeile weiter. Steht dort schon einer, verschwindet er.
export function lineBreak() {
  const e = ev()[L.sel - 1];
  if (!e) return;
  snap();
  if (e.brk) delete e.brk; else e.brk = 1;
  commit();
}

/* ---------- Ganzes Lied ---------- */
export function undo() {
  if (restore()) commit();
}
// Neues, leeres Lied; Taktart und Auftakt bleiben
export function clearAll() {
  snap();
  stashSong();
  L.song = { meter: L.song.meter, pickup: L.song.pickup, ev: [] };
  L.name = '';
  L.sel = 0;
  L.last = null;
  commit();
}
// Lädt ein Lied (oder den Autosave). Das bisherige wandert in den Autosave-Platz.
export function loadSong(s) {
  snap();
  stashSong();
  L.song = JSON.parse(JSON.stringify(s.song));
  L.name = s.name;
  L.sel = L.song.ev.length;
  L.last = null;
  commit();
  toast('„' + (s.name || 'Ohne Namen') + '“ geladen. Das vorherige Lied liegt im Menü unter „Zuletzt ersetzt“.');
}
