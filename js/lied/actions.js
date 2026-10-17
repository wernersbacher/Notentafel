// Alles, was das Lied verändert. Jede Aktion merkt sich vorher den Stand für „Rückgängig“ und endet mit commit().
import { toast } from '../core/ui.js';
import { handOver } from '../core/shell.js';
import { MAX_EV, MAX_LY, isNote, canDot, pickupsFor, splitAtBar, splitAll, cleanSong, songToMelody, transpose, keyName, tiedFrom, KEY_MIN, KEY_MAX } from './model.js';
import { L, opts, persistOpts, persistSong, snap, restore, stashSong } from './state.js';
import { render, renderSheet, commit } from './render.js';

const ev = () => L.song.ev;
const cur = () => L.song.ev[L.sel];
// Neues Ereignis mit dem vorgewählten Wert (außer es bringt seinen Wert schon mit)
function fresh(o) {
  if (o.v) return o;
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
  const k = splitHere(L.sel);
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
  snap();
  e.v = v;
  delete e.dot;
  splitHere(L.sel);
  commit();
}
export function toggleDot() {
  if (!canDot(L.pen.v)) return;
  L.pen.dot = L.pen.dot ? 0 : 1;
  const e = valueTarget();
  if (!e || !canDot(e.v)) { render(); return; }
  snap();
  if (L.pen.dot) e.dot = 1; else delete e.dot;
  splitHere(L.sel);
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
// Haltebogen von der Note zur nächsten an- oder abschalten (zwei gleiche Töne werden ein langer)
export function toggleTie() {
  const t = target();
  if (t == null) return;
  snap();
  const e = ev()[t];
  if (e.tie) delete e.tie; else e.tie = 1;
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
  e.p = p;
  delete e.acc;
  L.last = null;
  render();
}
export function endDrag() {
  if (!dragged) return;
  dragged = false;
  commit();
}
// Tauscht zwei Zeichen (Ziehen zur Seite). Takt-, Schlussstrich und Umbruch bleiben an ihrer Stelle.
export function swap(i, j) {
  const a = ev()[i], b = ev()[j];
  if (!a || !b || i === j) return;
  snap();
  const content = (e) => { const o = { ...e }; delete o.bar; delete o.brk; return o; };
  ev()[i] = keepMarks(a, content(b));
  ev()[j] = keepMarks(b, content(a));
  L.sel = j;
  L.last = null;
  commit();
}

/* ---------- Liedtext ---------- */
// Note, die eine Silbe bekommen kann: die markierte, wenn sie nicht nur eine übergebundene Fortsetzung ist
export const lyricTarget = () => { const e = cur(); return isNote(e) && !tiedFrom(ev()[L.sel - 1], e) ? e : null; };
// Beim Schreiben einer Silbe wird nur einmal (beim Hineintippen ins Feld) für „Rückgängig“ gemerkt
export function beginLyric() { if (lyricTarget()) snap(); }
export function setLyric(text) {
  const e = lyricTarget();
  if (!e) return;
  const t = text.trim().slice(0, MAX_LY);
  if (t) e.ly = t; else delete e.ly;
  persistSong();
  renderSheet();
}
// Markierung zur nächsten Note mit eigenem Ton (Pausen und übergebundene Fortsetzungen überspringen)
export function nextLyric() {
  for (let i = L.sel + 1; i < ev().length; i++) {
    if (isNote(ev()[i]) && !tiedFrom(ev()[i - 1], ev()[i])) { L.sel = i; L.last = null; render(); return true; }
  }
  return false;
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
// Wiederholungszeichen hinter dem Zeichen vor der Markierung: which 'start' (‖:) oder 'end' (:‖) an- oder abschalten.
// Beide zusammen ergeben :‖: (5). Fällt das Ende weg, fällt auch die 1./2. Klammer weg.
export function toggleRepeat(which) {
  const e = ev()[L.sel - 1];
  if (!e) return;
  snap();
  let start = e.bar === 4 || e.bar === 5, end = e.bar === 3 || e.bar === 5;
  if (which === 'start') start = !start; else end = !end;
  if (start && end) e.bar = 5;
  else if (start) e.bar = 4;
  else if (end) e.bar = 3;
  else delete e.bar;
  if (!end) delete e.volta;
  commit();
}
// 1./2. Klammer am Wiederholungsende vor der Markierung an- oder abschalten
export function toggleVolta() {
  const e = ev()[L.sel - 1];
  if (!e || !(e.bar === 3 || e.bar === 5)) return;
  snap();
  if (e.volta) delete e.volta; else e.volta = 1;
  commit();
}
// Taktart des Lieds; ein Auftakt, der in der neuen Taktart nicht passt, fällt weg
export function setMeter(m) {
  if (L.song.meter === m) return;
  snap();
  L.song.meter = m;
  if (!pickupsFor(m).includes(L.song.pickup)) L.song.pickup = 0;
  commit();
}
// Tonart: by = 1 ein ♯ mehr (bzw. ein ♭ weniger), −1 umgekehrt. Die Noten bleiben auf ihren Linien und klingen nach der Tonart.
export function stepKey(by) {
  const k = (L.song.key || 0) + by;
  if (k < KEY_MIN || k > KEY_MAX) return;
  snap();
  L.song.key = k;
  commit();
}
// Das ganze Lied um semis Halbtöne verschieben, samt Tonart
export function transposeSong(semis) {
  const t = transpose(L.song, semis);
  if (!t) { toast(semis > 0 ? 'Höher geht es nicht, ein Ton läge über h\'\'\'.' : 'Tiefer geht es nicht, ein Ton läge unter c.', true); return; }
  snap();
  L.song = t;
  commit();
  toast('Jetzt in ' + keyName(t.key) + '.');
}
// Auftakt in Ticks (0 = keiner)
export function setPickup(t) {
  if (L.song.pickup === t) return;
  snap();
  L.song.pickup = t;
  commit();
}
export function toggleAutoBar() {
  opts.autoBar = !opts.autoBar;
  persistOpts();
  if (opts.autoBar && !L.song.meter) toast('Wähle zuerst eine Taktart, dann kommen die Taktstriche von selbst.');
  render();
}
export function toggleAutoZ() {
  opts.autoZ = !opts.autoZ;
  persistOpts();
  if (opts.autoZ && !L.song.meter) toast('Wähle zuerst eine Taktart, dann stehen die Zählzeiten unter den Noten.');
  render();
}

/* ---------- Entfernen und Umbruch ---------- */
// Entfernen: Eine Note wird zur Pause gleicher Länge (damit die Takte stimmen); eine Pause oder das letzte Zeichen verschwinden
export function deleteEv() {
  const e = cur();
  if (!e) return;
  snap();
  if (isNote(e) && L.sel < ev().length - 1) {
    const o = { v: e.v };
    if (e.dot) o.dot = 1;
    ev()[L.sel] = keepMarks(e, o);
  } else ev().splice(L.sel, 1);
  L.last = null;
  commit();
}
// Löschen wie die Löschtaste: Das Zeichen an der Markierung verschwindet ganz, alles dahinter rückt nach vorn (mehrmals
// tippen löscht nach rechts). Steht die Markierung am Ende, verschwindet das Zeichen davor (wie die Rücktaste).
export function removeEv() {
  if (!cur() && L.sel === 0) return;
  snap();
  if (cur()) ev().splice(L.sel, 1);
  else ev().splice(--L.sel, 1);
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
  L.song = { meter: L.song.meter, pickup: L.song.pickup, key: L.song.key || 0, ev: [] };
  L.name = '';
  L.sel = 0;
  L.last = null;
  commit();
}
// Übergibt das Lied als Melodie an den Bereich Melodie (der Kern wechselt dorthin)
export function sendToMelody() {
  if (!ev().some(isNote)) { toast('Im Lied steht noch keine Note.', true); return; }
  const m = songToMelody(L.song, opts.autoBar);
  handOver('mel', { name: L.name, rows: m.rows, lines: m.lines, skipped: m.skipped, cut: m.cut });
}
// Nimmt ein Lied aus Melodie oder Rhythmus an ({ name, song, colors }); das bisherige wandert in den Autosave-Platz.
// Was über einen Taktstrich ragt, wird aufgeteilt; aus Melodie kommen die Noten farbig.
export function receiveSong({ name, song, colors }) {
  const s = cleanSong(song);
  if (!s) return;
  snap();
  stashSong();
  L.song = opts.autoBar ? splitAll(s) : s;
  L.name = name || '';
  L.sel = L.song.ev.length;
  L.last = null;
  if (colors) { opts.colors = true; persistOpts(); }
  commit();
  toast('Ins Lied übernommen. Das vorherige Lied liegt in der Liedersammlung unter „Zuletzt ersetzt“.');
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
  toast('„' + (s.name || 'Ohne Namen') + '“ geladen. Das vorherige Lied liegt in der Liedersammlung unter „Zuletzt ersetzt“.');
}
