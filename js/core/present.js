// Einklappen der Leiste und Vorführen. Beides ändert nur, was zu sehen ist; der offene Bereich kommt aus shell-state.js.
import { stopPlay } from './player.js';
import { setPressed } from './ui.js';
import { el } from './dom.js';
import { shellState } from './shell-state.js';

/* ---------- Leiste ein- und ausklappen ---------- */
// Eingeklappt nutzt die Tafel die ganze Breite und das Bearbeiten ist beendet: Die Bereiche zeichnen dann ohne Markierung
// und ohne leere Plätze (sideCollapsed() beim Zeichnen abfragen). Ausgeklappt erscheint die Markierung wieder.
let collapsed = false;
export const sideCollapsed = () => collapsed;
// keepPlay: Abspielen läuft weiter (beim Vorführen ändert sich nur, was zu sehen ist)
function setCollapsed(on, keepPlay) {
  collapsed = on;
  if (!keepPlay) stopPlay();
  shellState.savePop.close();
  document.querySelector('.app').classList.toggle('collapsed', on);
  el.btnSide.setAttribute('aria-expanded', on ? 'false' : 'true');
  el.btnSide.title = on ? 'Leiste ausklappen (bearbeiten)' : 'Leiste einklappen (Bearbeiten beenden)';
  el.btnSide.setAttribute('aria-label', on ? 'Leiste ausklappen' : 'Leiste einklappen');
  const cur = shellState.area;
  if (cur) cur.enter();
}

/* ---------- Vorführen ---------- */
// Blendet Leiste oben und Werkzeuge rechts aus (das Bearbeiten ist beendet wie beim Einklappen), die Tafel füllt den
// Bildschirm, wo der Browser es kann im Vollbild. Ein Tipp auf denselben Knopf holt alles zurück, wie es vorher war.
// Wird nicht gemerkt: Nach dem Neuladen ist man wieder im Bearbeiten.
const PRESENT_ICONS = {
  on: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  off: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
let present = null; // während des Vorführens: { collapsed } von vorher
function showPresent() {
  const on = !!present, b = el.btnPresent;
  b.innerHTML = on ? PRESENT_ICONS.off : PRESENT_ICONS.on;
  setPressed(b, on);
  b.title = on ? 'Vorführen beenden: Leisten wieder einblenden' : 'Vorführen: nur die Tafel, über den ganzen Bildschirm';
}
function setPresent(on) {
  if (!!present === on) return;
  const before = present;
  present = on ? { collapsed } : null;
  document.body.classList.toggle('present', on);
  showPresent();
  if (on && !collapsed) setCollapsed(true, true);
  else if (!on && !before.collapsed) setCollapsed(false, true);
  else if (shellState.area) shellState.area.enter(); // die Tafel ist größer oder kleiner geworden
  const d = document;
  try {
    if (on && d.fullscreenEnabled && !d.fullscreenElement) d.documentElement.requestFullscreen().catch(() => {});
    else if (!on && d.fullscreenElement) d.exitFullscreen().catch(() => {});
  } catch (e) { /* kein Vollbild möglich: dann nur ohne Leisten */ }
}

// Knöpfe der Leiste für Einklappen und Vorführen; wird Vollbild vom Gerät aus beendet (z. B. Wischgeste), endet auch
// das Vorführen
export function initPresent() {
  el.btnSide.addEventListener('click', () => setCollapsed(!collapsed));
  showPresent();
  el.btnPresent.addEventListener('click', () => setPresent(!present));
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) setPresent(false); });
}
