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

// Rechter Teil: „Anmelden“ oder der Avatar mit Menü. Initialisiert nichts selbst (kein loadBackend/initAuth/refresh):
// auf der Website macht das mountHeader, in der App cloud.js. Liefert die Funktion zum Neuzeichnen. Ohne Backend bleibt der Teil leer.
export function mountAccount(container) {
  container.classList.add('kopf-seite');
  let menu = null, avatar = null;

  const close = () => {
    if (!menu) return;
    menu.hidden = true;
    avatar.setAttribute('aria-expanded', 'false');
  };
  function render() {
    const user = currentUser();
    container.replaceChildren();
    menu = avatar = null;
    if (!user) {
      // ohne Backend (npm start) gibt es keine Konten
      // auf der Anmeldeseite selbst wäre der Knopf doppelt
      if (hasBackend() && location.pathname !== '/login/') {
        const next = location.pathname.startsWith('/app/') ? '?next=/app/' : '';
        container.append(link('/login/' + next, 'Anmelden', 'kopf-knopf'));
      }
      return;
    }
    avatar = node('button', 'kopf-avatar');
    avatar.append(avatarBild(user, 40));
    avatar.type = 'button';
    avatar.setAttribute('aria-haspopup', 'true');
    avatar.setAttribute('aria-expanded', 'false');
    avatar.setAttribute('aria-label', 'Konto ' + (user.name || user.email));
    menu = node('div', 'kopf-menue');
    menu.hidden = true;
    const out = node('button', 'kopf-punkt', 'Abmelden');
    out.type = 'button';
    out.addEventListener('click', () => { close(); logout(); });
    menu.append(node('p', 'kopf-wer', user.email), link('/account/', 'Mein Konto', 'kopf-punkt'));
    // in der App wäre „App öffnen“ der Ort, an dem man schon ist
    if (!location.pathname.startsWith('/app/')) menu.append(link('/app/', 'App öffnen', 'kopf-punkt'));
    menu.append(out);
    avatar.addEventListener('click', () => {
      menu.hidden = !menu.hidden;
      avatar.setAttribute('aria-expanded', String(!menu.hidden));
    });
    container.append(avatar, menu);
  }
  // Tipp außerhalb schließt das Menü (pointerdown gilt für Finger, Stift und Maus)
  document.addEventListener('pointerdown', (e) => { if (menu && !menu.hidden && !container.contains(e.target)) close(); });
  onAuthChange(render);
  render();
  // wer initAuth später aufruft, zeichnet damit neu (initAuth meldet nichts)
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
