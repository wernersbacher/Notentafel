// Einstellungen der Seitenleiste für alle Bereiche: An/Aus-Schalter, Größe der Oberfläche und Tempo.
// Die Seitenleiste selbst öffnen und schließen menu.js; hier liegen nur diese Abschnitte samt ihrer Verdrahtung.
import { settings, persistSettings, clampUi, setTempo } from './settings.js';
import { setPressed, tempoText, delegate, onEnter } from './ui.js';
import { el } from './dom.js';
import { updateWake } from './wake.js';

/* ---------- Einstellungen ---------- */
// An/Aus-Schalter im Menü; renderToggle und toggleSetting nutzen auch die Bereiche für ihre eigenen Schalter.
// t = { key, btn, state }; liegt die Einstellung nicht in den gemeinsamen, kommen obj und save (zum Speichern) dazu.
export function renderToggle(t) {
  const on = (t.obj || settings)[t.key];
  setPressed(t.btn, on);
  t.state.textContent = on ? 'an' : 'aus';
}
// apply setzt die Einstellung um, nachdem sie umgeschaltet und gespeichert wurde
export function toggleSetting(t, apply) {
  t.btn.addEventListener('click', () => {
    const obj = t.obj || settings;
    obj[t.key] = !obj[t.key];
    (t.save || persistSettings)();
    renderToggle(t);
    apply();
  });
}
export const WAKE = { key: 'wake', btn: el.btnWakeToggle, state: el.wakeToggleState };
function showUi(pct) {
  el.uiRange.value = pct;
  if (document.activeElement !== el.uiNum) el.uiNum.value = pct;
}
function setUi(v) {
  settings.ui = clampUi(v);
  persistSettings();
  applyUiScale();
}
export function applyUiScale() {
  document.body.style.zoom = settings.ui === 1 ? '' : String(settings.ui);
  showUi(Math.round(settings.ui * 100));
  el.uiScale.querySelectorAll('[data-ui]').forEach((b) => setPressed(b, +b.dataset.ui === settings.ui));
}
// Tempoanzeige im Menü; der runde Knopf der Tafel zeigt dasselbe (player.js)
export function renderTempo() { el.tempoOut.textContent = tempoText(settings.tempo); }

/* ---------- Verdrahtung ---------- */
// Schalter, Größe der Oberfläche und Tempo; menu.js ruft das beim Start auf
export function initSettings() {
  toggleSetting(WAKE, updateWake);
  // Größe der Oberfläche: skaliert die ganze Seite (CSS zoom), Tippen und Ziehen bleiben dabei genau
  delegate(el.uiScale, '[data-ui]', (b) => setUi(+b.dataset.ui));
  // Regler: beim Ziehen nur die Zahl zeigen, erst beim Loslassen anwenden (sonst springt die Seite unter dem Finger)
  el.uiRange.addEventListener('input', () => { el.uiNum.value = el.uiRange.value; });
  el.uiRange.addEventListener('change', () => setUi(el.uiRange.value / 100));
  el.uiMinus.addEventListener('click', () => setUi(settings.ui - 0.05));
  el.uiPlus.addEventListener('click', () => setUi(settings.ui + 0.05));
  // Feld: eigene Prozentzahl, gilt beim Bestätigen oder Verlassen
  el.uiNum.addEventListener('change', () => { setUi(el.uiNum.value / 100); el.uiNum.value = Math.round(settings.ui * 100); });
  onEnter(el.uiNum, () => el.uiNum.blur());
  el.tempo.addEventListener('input', () => {
    setTempo(+el.tempo.value);
    renderTempo();
  });
}
