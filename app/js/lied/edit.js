// Markieren, Zeichen setzen und ziehen. Jede Aktion merkt sich vorher den Stand für „Rückgängig“ und endet mit commit().
import { toast } from '../core/ui.js';
import { plan, limitText } from '../core/tier.js';
import { stopPlay } from '../core/player.js';
import { MAX_EV, measureCount, isNote, canDot, splitAtBar, keepMarks, canTie, toggleTieAt, changePitch, swapEvents } from './model.js';
import { L, opts, snap, restore } from './state.js';
import { render, commit } from './render.js';
import { ev, cur } from './common.js';

// Neues Ereignis mit dem vorgewählten Wert (außer es bringt seinen Wert schon mit)
function fresh(o) {
  if (o.v) return o;
  o.v = L.pen.v;
  if (L.pen.dot && canDot(L.pen.v)) o.dot = 1;
  return o;
}
function full() {
  if (ev().length < MAX_EV) return false;
  toast('Das Lied ist voll (' + MAX_EV + ' Zeichen).', true);
  return true;
}

// Lite: höchstens limit('measures') Takte. Wurde der Stand nach einer Änderung (snap() ist schon gelaufen) länger als erlaubt
// und länger als vorher (ein Lied, das schon darüber liegt, bleibt, wie es ist), geht die Änderung zurück. true: zurückgenommen.
function tooLong(was) {
  const max = plan.limit('measures');
  if (max == null || measureCount(L.song) <= Math.max(max, was)) return false;
  restore();
  toast(limitText('measures'), true);
  return true;
}

/* ---------- Markierung ---------- */
// Tippen auf einen Platz: markiert ihn; steht dort ein Zeichen, übernimmt der Stift seinen Wert.
// Beendet Abspielen und Schritt für Schritt: weiter geht es ab der neuen Markierung (z. B. eine Stelle mehrmals üben)
export function select(i) {
  stopPlay();
  L.sel = Math.max(0, Math.min(i, ev().length));
  L.last = null;
  const e = cur();
  if (e) L.pen = { v: e.v, dot: e.dot ? 1 : 0 };
  render();
}
export function toggleInsert() { L.insertMode = !L.insertMode; render(); }

// Der Ton, auf den Vorzeichen und Bogen wirken: der zuletzt gesetzte, sonst der markierte (oder keiner)
export function target() {
  if (L.last != null && isNote(ev()[L.last])) return L.last;
  return isNote(cur()) ? L.sel : null;
}

/* ---------- Zeichen setzen ---------- */
// Passt das Zeichen an Index i nicht mehr in seinen Takt, wird es am Taktstrich aufgeteilt (Noten mit Haltebogen);
// nur mit Taktart und automatischen Taktstrichen. Liefert die Anzahl der Stücke.
function splitHere(i) {
  if (!opts.autoBar) return 1;
  const parts = splitAtBar(L.song, i);
  if (parts.length > 1) ev().splice(i, 1, ...parts);
  return parts.length;
}
// Setzt ein Ereignis an der Markierung: am Ende oder im Einfügen-Modus kommt es dazu, sonst ersetzt es das Zeichen dort.
// Der zuletzt gesetzte Ton ist bei einer aufgeteilten Note ihr letztes Stück (dort setzt ein Bogen an).
function place(o, keepValue) {
  const prev = cur(), was = measureCount(L.song);
  if (L.insertMode || !prev) {
    if (full()) return;
    snap();
    ev().splice(L.sel, 0, fresh(o));
  } else {
    snap();
    if (keepValue) { o.v = prev.v; if (prev.dot) o.dot = 1; } else fresh(o);
    ev()[L.sel] = keepMarks(prev, o);
  }
  const k = splitHere(L.sel);
  if (tooLong(was)) return;
  L.last = L.sel + k - 1;
  L.sel += k;
  commit();
}
// Ton p (z. B. 'c1' = c') setzen. Beim Ersetzen bleibt der Wert des Zeichens, damit der Rhythmus stimmt.
// Hängt der Ton an einem Haltebogen und ist es derselbe, übernimmt er das Vorzeichen (sonst wäre es kein Haltebogen mehr).
export function placePitch(p) {
  const o = { p }, before = ev()[L.sel - 1];
  if (isNote(before) && before.tie && before.p === o.p && before.acc != null) o.acc = before.acc;
  place(o, true);
}
// Pause mit dem Wert v (1 Ganze … 16 Sechzehntel), ohne Punkt
export const placeRest = (v) => place({ v }, false);

// Zeichen an der Markierung, das ein Notenwert oder Punkt mit ändert (im Einfügen-Modus keins: dort ist die Markierung nur die Einfügestelle)
const valueTarget = () => (L.insertMode ? null : cur());
// Stift: Notenwert wählen (ohne Punkt; den tippt man danach dazu). Steht die Markierung auf einem Zeichen,
// bekommt auch dieses den Wert.
export function setValue(v) {
  L.pen = { v, dot: 0 };
  const e = valueTarget();
  if (!e) { render(); return; }
  const was = measureCount(L.song);
  snap();
  e.v = v;
  delete e.dot;
  splitHere(L.sel);
  if (tooLong(was)) { render(); return; }
  commit();
}
export function toggleDot() {
  if (!canDot(L.pen.v)) return;
  L.pen.dot = L.pen.dot ? 0 : 1;
  const e = valueTarget();
  if (!e || !canDot(e.v)) { render(); return; }
  const was = measureCount(L.song);
  snap();
  if (L.pen.dot) e.dot = 1; else delete e.dot;
  splitHere(L.sel);
  if (tooLong(was)) { render(); return; }
  commit();
}
// Vorzeichen (1 ♯, −1 ♭, 0 ♮) am Ton umschalten; es gilt für alle Noten, die mit ihm durch Haltebögen zu einem Ton
// verbunden sind (sonst wäre es kein Haltebogen mehr)
export function setAcc(a) {
  const t = target();
  if (t == null) return;
  snap();
  const e = ev()[t], same = (x) => isNote(x) && x.p === e.p;
  let i = t, j = t;
  while (same(ev()[i - 1]) && ev()[i - 1].tie) i--;
  while (ev()[j].tie && same(ev()[j + 1])) j++;
  const off = e.acc === a;
  for (let k = i; k <= j; k++) { if (off) delete ev()[k].acc; else ev()[k].acc = a; }
  commit();
}
// Haltebogen von der Note zur nächsten an- oder abschalten (zwei gleiche Töne werden ein langer). Gesetzt wird er nur,
// wenn die Folgenote vorhanden ist und gleich klingt; sonst passiert nichts.
export function toggleTie() {
  const t = target();
  if (t == null) return;
  const e = ev()[t];
  if (!e.tie && !canTie(e, ev()[t + 1])) return; // würde nicht klingen
  snap();
  toggleTieAt(ev(), t);
  commit();
}

/* ---------- Ziehen ---------- */
// Tonhöhe beim Ziehen: Der Stand vor dem Ziehen wird einmal gemerkt, gespeichert wird erst am Ende (endDrag).
// Das Vorzeichen fällt weg, weil es zum alten Ton gehörte.
let dragged = false;
export function dragPitch(i, p) {
  const e = ev()[i];
  if (!isNote(e) || e.p === p) return;
  if (!dragged) { snap(); dragged = true; }
  changePitch(ev(), i, p); // räumt auch Haltebögen ab, die zum neuen Ton nicht mehr passen
  L.last = null;
  render();
}
export function endDrag() {
  if (!dragged) return;
  dragged = false;
  commit();
}
// Ziehen abgebrochen (pointercancel: der Browser übernimmt die Geste, z. B. zum Scrollen): Der beim ersten Schritt
// gemerkte Stand kommt zurück, statt dass die ungewollte Tonänderung gespeichert wird.
export function cancelDrag() {
  if (!dragged) return;
  dragged = false;
  restore();
  render();
}
// Tauscht zwei Zeichen (Ziehen zur Seite). Takt-, Schlussstrich und Umbruch bleiben an ihrer Stelle.
export function swap(i, j) {
  const a = ev()[i], b = ev()[j];
  if (!a || !b || i === j) return;
  snap();
  swapEvents(ev(), i, j); // lässt keine Haltebögen stehen, die nach dem Tausch nicht mehr passen
  L.sel = j;
  L.last = null;
  commit();
}
