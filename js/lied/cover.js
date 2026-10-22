// Verdecken: Tuch, ?-Karten, eingeklappte Zeilen und das Aufdecken per Tipp.
import { toast } from '../core/ui.js';
import { isNote } from './model.js';
import { L, opts, persistOpts, snap } from './state.js';
import { commit, lineStartAfter } from './render.js';
import { ev, cur } from './common.js';
import { select } from './edit.js';

/* ---------- Verdecken ---------- */
// Tuch: ab dem Ereignis mit cv ist alles abgedeckt; cf merkt, wo es am Anfang lag. ?-Karten: q über der Note, qn über
// ihrem Notennamen (1 verdeckt, 2 aufgedeckt). Alles hängt an den Ereignissen und wird mit dem Lied gespeichert.
export const coverIndex = () => ev().findIndex((e) => e.cv);

// Tuch ab der markierten Note
export function coverFrom() {
  if (!cur()) { toast('Erst eine Note markieren, ab der abgedeckt wird.', true); return; }
  snap();
  ev().forEach((e) => { delete e.cv; delete e.cf; });
  cur().cv = cur().cf = 1;
  commit();
}
// Tipp auf das Tuch: die nächste Notenzeile kommt hervor, ab ihr geht es beim Abspielen weiter
export function revealLine() {
  const k = coverIndex();
  if (k < 0) return;
  const next = lineStartAfter(k);
  snap();
  delete ev()[k].cv;
  if (next > 0) ev()[next].cv = 1;
  L.sel = k;
  L.last = null;
  commit();
}
// ?-Karte auf die markierte Note legen oder wieder wegnehmen
export function toggleCard() {
  const e = cur();
  if (!e) { toast('Erst eine Note markieren, dann die Karte darauflegen.', true); return; }
  snap();
  if (e.q) delete e.q; else e.q = 1;
  commit();
}
// ?-Karte nur über den Notennamen der markierten Note legen oder wieder wegnehmen (die Note bleibt zu sehen)
export function toggleNameCard() {
  const e = cur();
  if (!isNote(e)) { toast('Erst eine Note markieren, dann die Karte auf ihren Namen legen.', true); return; }
  snap();
  if (e.qn) delete e.qn; else e.qn = 1;
  if (!opts.names) { opts.names = true; persistOpts(); toast('Notennamen eingeschaltet, damit es etwas abzudecken gibt.'); }
  commit();
}
// Alle Notennamen verdecken; liegen schon auf allen Namen verdeckte Karten, kommen sie alle wieder weg
export function toggleAllNames() {
  const notes = ev().filter(isNote);
  if (!notes.length) { toast('Im Lied stehen noch keine Noten.', true); return; }
  snap();
  const all = notes.every((e) => e.qn === 1);
  notes.forEach((e) => { if (all) delete e.qn; else e.qn = 1; });
  if (!all && !opts.names) { opts.names = true; persistOpts(); }
  commit();
  toast(all ? 'Alle Notennamen wieder offen.' : 'Alle Notennamen verdeckt. Antippen deckt einen auf.');
}
// Tipp auf eine Note: eine verdeckte Karte wird aufgedeckt (name: die über dem Notennamen) und die Note markiert,
// sonst wird nur markiert
export function tapEv(i, name) {
  const e = ev()[i], key = name ? 'qn' : 'q';
  if (!e || e[key] !== 1) { select(i); return; }
  snap();
  e[key] = 2;
  L.sel = i;
  L.last = null;
  commit();
}
// Tipp auf eine Zeilennummer: die Zeile (Ereignisse first … end−1) einklappen oder wieder aufklappen. Eingeklappt ist
// sie, wenn eines ihrer Ereignisse fd trägt; so bleibt sie es auch, wenn anders umbrochen wird.
export function toggleFold(first, end) {
  const part = ev().slice(first, end);
  if (!part.length) return;
  snap();
  if (part.some((e) => e.fd)) part.forEach((e) => { delete e.fd; }); else part[0].fd = 1;
  commit();
}
// Alles wieder wie am Anfang: Tuch an seinen Anfang, alle Karten zu
export function resetCover() {
  snap();
  ev().forEach((e) => {
    if (e.cf) e.cv = 1; else delete e.cv;
    if (e.q) e.q = 1;
    if (e.qn) e.qn = 1;
  });
  commit();
}
// Tuch und alle Karten weg, alle Zeilen aufgeklappt
export function clearCover() {
  snap();
  ev().forEach((e) => { delete e.cv; delete e.cf; delete e.q; delete e.qn; delete e.fd; });
  commit();
}
