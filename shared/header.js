// Gemeinsame Kopfleiste für Landing und Konto, der rechte Teil auch in der App: links „Musiktafel“, rechts „Anmelden“ oder der
// Initialen-Avatar mit Menü. Bedient wird per Touch: große Tippflächen, das Menü hängt nicht an Hover und
// schließt beim Tippen daneben. Stile in header.css, Farben aus tokens.css.
import { initAuth, loadBackend, hasBackend, currentUser, onAuthChange, logout, refresh } from './auth.js';
import { avatar as avatarBild } from './avatar.js';

function node(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function link(href, text, cls) {
  const a = node('a', cls, text);
  a.href = href;
  return a;
}

// Personen-Symbol für Gäste (wie die Symbole der App: Linie 2.2, abgerundet)
function personSymbol() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'kopf-symbol');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', 'M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 21c0-4.2 3.4-7 7.5-7s7.5 2.8 7.5 7');
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke', 'currentColor');
  p.setAttribute('stroke-width', '2.2');
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-linejoin', 'round');
  svg.append(p);
  return svg;
}

// Rechter Teil: „Anmelden“ oder der Avatar mit Menü. Initialisiert nichts selbst (kein loadBackend/initAuth/refresh):
// auf der Website macht das mountHeader, in der App cloud.js. Liefert die Funktion zum Neuzeichnen (mit .close zum
// Schließen des Menüs von außen). Ohne Backend bleibt der Teil leer.
// Optionen: guestMenu = Gäste sehen ein Personen-Symbol mit Menü (Anmelden, Konto anlegen) statt des Anmelden-Knopfs;
// status = () => ({ text, warn }) | null, steht im Menü unter der E-Mail (warn in Warnfarbe, am Avatar ein Punkt).
export function mountAccount(container, { guestMenu = false, status = null } = {}) {
  container.classList.add('kopf-seite');
  let menu = null, knopf = null, open = false;

  const setOpen = (on) => {
    open = on;
    if (!menu) return;
    menu.hidden = !on;
    knopf.setAttribute('aria-expanded', String(on));
  };
  const close = () => setOpen(false);
  // Knopf (Avatar oder Symbol) und Menü; ein offenes Menü bleibt beim Neuzeichnen offen
  const build = (cls, label) => {
    knopf = node('button', cls);
    knopf.type = 'button';
    knopf.setAttribute('aria-haspopup', 'true');
    knopf.setAttribute('aria-label', label);
    menu = node('div', 'kopf-menue');
    knopf.addEventListener('click', () => setOpen(menu.hidden));
    container.append(knopf, menu);
  };
  function render() {
    const user = currentUser();
    container.replaceChildren();
    menu = knopf = null;
    if (!user) {
      // ohne Backend (npm start) gibt es keine Konten
      // auf der Anmeldeseite selbst wäre der Knopf doppelt
      if (!hasBackend() || location.pathname === '/login/') return;
      const next = location.pathname.startsWith('/app/') ? '/app/' : '';
      if (!guestMenu) {
        container.append(link('/login/' + (next ? '?next=' + next : ''), 'Anmelden', 'kopf-knopf'));
        return;
      }
      build('kopf-person', 'Konto: anmelden oder Konto anlegen');
      knopf.append(personSymbol());
      menu.append(
        node('p', 'kopf-text', 'Freiwillig: Mit einem Konto sind deine Lieder auf allen Geräten da.'),
        link('/login/?next=/app/', 'Anmelden', 'kopf-punkt'),
        link('/login/?mode=register&next=/app/', 'Konto anlegen', 'kopf-punkt'),
        link('/privacy/', 'Datenschutz', 'kopf-punkt kopf-klein')
      );
      menu.lastChild.target = '_blank';
      menu.lastChild.rel = 'noopener';
    } else {
      const st = status && status();
      build('kopf-avatar', 'Konto ' + (user.name || user.email));
      knopf.append(avatarBild(user, 40));
      knopf.classList.toggle('warn', !!(st && st.warn));
      const out = node('button', 'kopf-punkt', 'Abmelden');
      out.type = 'button';
      out.addEventListener('click', () => { close(); logout(); });
      menu.append(node('p', 'kopf-wer', user.email));
      if (st && st.text) menu.append(node('p', st.warn ? 'kopf-status warn' : 'kopf-status', st.text));
      menu.append(link('/account/', 'Mein Konto', 'kopf-punkt'));
      // in der App wäre „App öffnen“ der Ort, an dem man schon ist
      if (!location.pathname.startsWith('/app/')) menu.append(link('/app/', 'App öffnen', 'kopf-punkt'));
      menu.append(out);
    }
    setOpen(open);
  }
  // Tipp außerhalb schließt das Menü (pointerdown gilt für Finger, Stift und Maus)
  document.addEventListener('pointerdown', (e) => { if (menu && !menu.hidden && !container.contains(e.target)) close(); });
  onAuthChange(render);
  render();
  // wer initAuth später aufruft, zeichnet damit neu (initAuth meldet nichts)
  render.close = close;
  return render;
}

export function mountHeader(container) {
  container.classList.add('kopf');
  const brand = link('/', 'Musiktafel', 'kopf-name');
  const side = node('div');
  container.replaceChildren(brand, side);
  const render = mountAccount(side);
  // Backend und gespeicherte Anmeldung nachladen; bis dahin steht nur der Name da
  return loadBackend().then((backend) => {
    initAuth(backend);
    render();
    // Token erneuern: Ist es abgelaufen oder das Konto weg, meldet auth.js ab und die Leiste zeigt wieder „Anmelden“
    if (currentUser()) refresh().catch(() => {});
  });
}
