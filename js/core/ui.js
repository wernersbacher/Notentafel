// Kleine Bausteine der Oberfläche: Einblendung und „Nochmal tippen“-Bestätigung
import { el } from './dom.js';

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

// Kurze Einblendung unten auf der Tafel – verschiebt nichts im Layout
let toastTimer = null;
export function toast(text, warn) {
  clearTimeout(toastTimer);
  el.toast.textContent = text;
  el.toast.classList.toggle('warn', !!warn);
  el.toast.hidden = false;
  toastTimer = setTimeout(() => { el.toast.hidden = true; }, 3500);
}

// Erster Tipp färbt den Knopf rot, ein zweiter innerhalb von 3,5 s führt run aus
let armed = null;
export function disarm() {
  if (!armed) return;
  clearTimeout(armed.timer);
  armed.btn.classList.remove('confirm');
  armed.btn.innerHTML = armed.html;
  armed = null;
}
export const isArmed = (btn) => !!armed && armed.btn === btn;
export function confirmTap(btn, text, run) {
  if (isArmed(btn)) { disarm(); run(); return; }
  disarm();
  armed = { btn, html: btn.innerHTML, timer: setTimeout(disarm, 3500) };
  btn.classList.add('confirm');
  btn.textContent = text;
}

// Kleines Feld, das ein Knopf auf- und zuklappt. Ein Tipp irgendwo anders schließt es.
export function popover(pop, btn, { onOpen, onClose } = {}) {
  const p = {
    isOpen: () => !pop.hidden,
    open() {
      pop.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      if (onOpen) onOpen();
    },
    close() {
      if (pop.hidden) return;
      if (onClose) onClose();
      pop.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    },
    toggle() { if (pop.hidden) p.open(); else p.close(); }
  };
  btn.addEventListener('click', p.toggle);
  document.addEventListener('pointerdown', (e) => {
    if (!pop.hidden && !pop.contains(e.target) && !btn.contains(e.target)) p.close();
  });
  return p;
}

// Klick auf ein Element im Container, das zu selector passt; run bekommt das Element
export function delegate(container, selector, run) {
  container.addEventListener('click', (e) => {
    const b = e.target.closest(selector);
    if (b) run(b);
  });
}
// Feld abschicken mit der Eingabetaste der Bildschirmtastatur
export function onEnter(input, run) {
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } });
}

// Bietet einen Text als Datei zum Herunterladen an
export function downloadFile(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
