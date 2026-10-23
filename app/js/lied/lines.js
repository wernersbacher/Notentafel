// Entfernen, Umbruch und Zeilen.
import { toast } from '../core/ui.js';
import { plan, limitText } from '../core/tier.js';
import { isNote, keepMarks, measuresFull } from './model.js';
import { L, snap } from './state.js';
import { render, commit, lastLineStart } from './render.js';
import { ev, cur } from './common.js';

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

/* ---------- Zeilen ---------- */
// + Zeile: hinter dem letzten Zeichen beginnt eine neue, leere Zeile, dort geht es weiter (wie auf der Tafel)
export function addLine() {
  const last = ev()[ev().length - 1];
  if (!last) { toast('Das Lied ist noch leer.', true); return; }
  if (measuresFull(L.song, plan.limit('measures'))) { toast(limitText('measures'), true); return; }
  if (last.brk) { L.sel = ev().length; L.last = null; render(); return; } // eine leere Zeile gibt es schon
  snap();
  last.brk = 1;
  L.sel = ev().length;
  L.last = null;
  commit();
}
// Stehen in der letzten Zeile Noten? (Dann fragt „− Zeile“ nach.)
export const lastLineHasNotes = () => ev().length > 0 && !ev()[ev().length - 1].brk;
// − Zeile: die letzte Zeile entfernen; eine leere verschwindet mit ihrem Umbruch
export function delLine() {
  const n = ev().length;
  if (!n) return;
  snap();
  if (ev()[n - 1].brk) delete ev()[n - 1].brk;
  else {
    const k = lastLineStart();
    ev().splice(k);
    if (k > 0 && ev()[k - 1].brk) delete ev()[k - 1].brk; // sonst bliebe eine leere Zeile stehen
  }
  L.sel = Math.min(L.sel, ev().length);
  L.last = null;
  commit();
}
