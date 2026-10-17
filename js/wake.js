// Bildschirm anlassen (Screen Wake Lock), solange die Einstellung an ist
import { settings } from './state.js';
import { el } from './dom.js';

const can = 'wakeLock' in navigator;
let lock = null; // aktiver Lock (Sentinel) oder null
let asking = false;

// Fordert den Lock an oder gibt ihn frei, je nach Einstellung. Fehler (z. B. Akku sparen) bleiben still.
export async function updateWake() {
  if (!can) return;
  if (!settings.wake) {
    const l = lock;
    lock = null;
    if (l) l.release().catch(() => {});
    return;
  }
  if (lock || asking || document.visibilityState !== 'visible') return;
  asking = true;
  try {
    const l = await navigator.wakeLock.request('screen');
    // Der Browser gibt den Lock beim Verlassen der Seite von selbst frei
    l.addEventListener('release', () => { if (lock === l) lock = null; });
    lock = l;
    if (!settings.wake) updateWake(); // inzwischen ausgeschaltet
  } catch (e) { /* nicht erlaubt oder nicht möglich */ }
  asking = false;
}

export function initWake() {
  // Ohne Unterstützung im Browser gibt es den Schalter nicht
  el.wakeSec.hidden = !can;
  if (!can) return;
  document.addEventListener('visibilitychange', updateWake);
  // Manche Browser wollen eine Berührung, bevor sie den Lock geben
  document.addEventListener('pointerdown', updateWake, { once: true });
  updateWake();
}
