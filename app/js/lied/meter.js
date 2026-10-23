// Takt, Taktarten, Tonart, Vorzeichen und die automatischen Funktionen.
import { toast } from '../core/ui.js';
import { pickupsFor, transpose, keyName, hasLyrics, KEY_MIN, KEY_MAX } from './model.js';
import { L, opts, persistOpts, snap } from './state.js';
import { render, commit } from './render.js';
import { ev } from './common.js';

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
export function toggleLyrics() {
  opts.lyrics = !opts.lyrics;
  persistOpts();
  if (opts.lyrics && !hasLyrics(L.song)) toast('Das Lied hat noch keinen Liedtext. Silben schreibt man unter ④ Liedtext.');
  render();
}
export function toggleAutoZ() {
  opts.autoZ = !opts.autoZ;
  persistOpts();
  if (opts.autoZ && !L.song.meter) toast('Wähle zuerst eine Taktart, dann stehen die Zählzeiten unter den Noten.');
  render();
}
