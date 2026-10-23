// Kleine Bausteine der Oberfläche: Einblendung, Knopfzustände, Hinweise und „Nochmal tippen“-Bestätigung
import { el } from './dom.js';

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

// Knopf an oder aus: leuchtet und meldet es der Sprachausgabe
export const setPressed = (btn, on) => {
  btn.classList.toggle('on', on);
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
};

// Knopf aus, solange why einen Grund nennt (Text), sonst an. Der Grund bleibt am Knopf (data-why): ein Tipp auf den
// grauen Knopf blendet ihn ein (explainLocked), denn auf dem Tablet gibt es kein title zum Hovern.
export function lock(btn, why) {
  btn.disabled = !!why;
  if (why) btn.dataset.why = why;
  else delete btn.dataset.why;
}
// Tipp auf einen grauen Knopf mit Grund in root: den Grund kurz einblenden. Solche Knöpfe fangen in CSS keine Tipps ab
// (pointer-events: none), der Tipp landet auf dem Behälter; welcher Knopf darunter liegt, sagt die Lage des Tipps.
export function explainLocked(root) {
  root.addEventListener('click', (e) => {
    const hit = [...root.querySelectorAll('button[data-why]:disabled')].find((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    if (hit) toast(hit.dataset.why);
  });
}

// Hinweis unter einem Feld; warn färbt ihn rot
export function status(node, text, warn) {
  node.textContent = text;
  node.classList.toggle('warn', !!warn);
}

// Deutsch geschriebene Zeit und Daten für die Hinweise an den gespeicherten Liedern
export const timeOf = (t) => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
export const dateOf = (t) => new Date(t).toLocaleDateString('de-DE');
export const dateTimeOf = (t) => new Date(t).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });

// „120 pro Minute“ – im Menü und am runden Tempoknopf der Tafel
export const tempoText = (v) => v + ' pro Minute';

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

// Holt beim Abspielen die markierte Stelle node ins Bild der scrollbaren Fläche box: Liegt sie (fast) draußen,
// rückt sie mit etwas Vorlauf nach oben bzw. ein Stück nach links, sodass man das Folgende sieht.
// Unten zählt der Streifen hinter den runden Knöpfen (FABS) schon als draußen.
const FABS = 96;
export function follow(node, box) {
  const r = node.getBoundingClientRect(), b = box.getBoundingClientRect(), m = 12;
  const top = r.bottom > b.bottom - FABS || r.top < b.top ? r.top - b.top - m : 0;
  const left = r.right > b.right - m || r.left < b.left ? r.left - b.left - b.width / 4 : 0;
  if (!top && !left) return;
  const smooth = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  box.scrollBy({ top, left, behavior: smooth ? 'smooth' : 'auto' });
}

// Liste mit Zwischenüberschriften: Einträge mit group bekommen eine Überschrift, wenn die Gruppe wechselt.
// abc: stattdessen alphabetisch nach name, ohne Überschriften. itemHTML bekommt immer die Stelle in items.
export function groupedHTML(items, itemHTML, abc) {
  if (abc) {
    return items.map((it, i) => [it, i]).sort((a, b) => a[0].name.localeCompare(b[0].name, 'de'))
      .map(([it, i]) => itemHTML(it, i)).join('');
  }
  let last = null;
  return items.map((it, i) => {
    const head = it.group && it.group !== last ? '<li class="sgroup">' + esc(it.group) + '</li>' : '';
    last = it.group;
    return head + itemHTML(it, i);
  }).join('');
}

// Liedersammlung ohne Pro: Der Abschnitt (die Liste ul liegt darin) zeigt statt Suche und Liste nur die Karte .procard
// („Bekannte Lieder gibt es mit Pro“, im HTML; das CSS blendet sie nur bei .locked ein). Tipp-tauglich, kein Hover.
export function lockLibrary(ul, locked) {
  const sec = ul.closest('section');
  if (sec) sec.classList.toggle('locked', locked);
}

