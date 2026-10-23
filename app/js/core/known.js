// Die bekannten Lieder (Funktion 'known', nur Pro). Die Daten stecken nicht in der App, sondern kommen vom Server:
// GET /api/known liefert { mel, lied } nur an Konten mit Pro (pb_hooks/known.pb.js, Daten in pb_hooks/known.js), sonst 403.
// Ohne Backend (Dev) beantwortet tools/serve.js dieselbe Adresse, im Lite-Modus ebenfalls mit 403.
// known() gibt die geladenen Listen zurück (leer, solange nichts da ist); onKnown(f) meldet jede Änderung daran.
import { makeSignal } from './signal.js';
import { byGroup } from './groups.js';
import { plan, onTier } from './tier.js';
import { api, hasBackend } from '../../../shared/auth.js';

const EMPTY = Object.freeze({ mel: [], lied: [] });
let data = EMPTY; // mel: Tafel (Zeilen mit notes im Tafel-Format), lied: Notenblatt (siehe lied/songs.js)
let pending = null; // laufende Anfrage, damit gleichzeitige Aufrufe nur eine auslösen
let epoch = 0; // zählt mit, wann sich die Stufe geändert hat; eine verspätete Antwort der alten Stufe gilt nicht mehr
const changed = makeSignal();

export const known = () => data;
export const onKnown = (f) => changed(f);

function set(next) {
  data = next;
  changed.emit(data);
}

async function fetchKnown() {
  // Mit Backend über api() (hängt den Token an), sonst vom Dev-Server derselben Seite
  if (hasBackend()) return api('/known');
  const res = await fetch('/api/known');
  if (!res.ok) throw new Error('Fehler ' + res.status);
  return res.json();
}

// Holt die Lieder, wenn die Stufe sie erlaubt; mehrfach aufrufen ist billig (Cache). Ein Fehler (kein Netz, 403) ergibt
// leere Listen und wird beim nächsten Aufruf erneut versucht. Liefert die Listen.
export function loadKnown() {
  if (!plan.has('known')) return Promise.resolve(data);
  if (data !== EMPTY) return Promise.resolve(data);
  if (pending) return pending;
  const mine = epoch;
  pending = fetchKnown().then((r) => {
    if (mine !== epoch) return data;
    const ok = r && Array.isArray(r.mel) && Array.isArray(r.lied);
    if (ok) set({ mel: byGroup(r.mel), lied: byGroup(r.lied) });
    return data;
  }, () => data).finally(() => { if (mine === epoch) pending = null; });
  return pending;
}

// Anmelden oder Abmelden: alles Geladene verwerfen (es gehörte der alten Stufe), mit Pro neu holen
onTier(() => {
  epoch++;
  pending = null;
  data = EMPTY;
  changed.emit(data); // Anzeigen müssen auch ohne Daten zwischen „Mit Pro“ und „lädt“ wechseln
  loadKnown();
});
