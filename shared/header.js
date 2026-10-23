// Gemeinsame Kopfleiste für Landing, Konto und (später) App: links „Musiktafel“, rechts „Anmelden“ oder der
// Initialen-Avatar mit Menü. Bedient wird per Touch: große Tippflächen, das Menü hängt nicht an Hover und
// schließt beim Tippen daneben. Stile in header.css, Farben aus tokens.css.
import { initAuth, loadBackend, hasBackend, currentUser, onAuthChange, logout, refresh, initials } from './auth.js';

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

export function mountHeader(container) {
  container.classList.add('kopf');
  const brand = link('/', 'Musiktafel', 'kopf-name');
  const side = node('div', 'kopf-seite');
  container.replaceChildren(brand, side);
  let menu = null, avatar = null;

  const close = () => {
    if (!menu) return;
    menu.hidden = true;
    avatar.setAttribute('aria-expanded', 'false');
  };
  function render() {
    const user = currentUser();
    side.replaceChildren();
    menu = avatar = null;
    if (!user) {
      // ohne Backend (npm start) gibt es keine Konten
      if (hasBackend()) side.append(link('/login/', 'Anmelden', 'kopf-knopf'));
      return;
    }
    avatar = node('button', 'kopf-avatar', initials(user));
    avatar.type = 'button';
    avatar.setAttribute('aria-haspopup', 'true');
    avatar.setAttribute('aria-expanded', 'false');
    avatar.setAttribute('aria-label', 'Konto ' + (user.name || user.email));
    menu = node('div', 'kopf-menue');
    menu.hidden = true;
    const out = node('button', 'kopf-punkt', 'Abmelden');
    out.type = 'button';
    out.addEventListener('click', () => { close(); logout(); });
    menu.append(node('p', 'kopf-wer', user.email), link('/account/', 'Mein Konto', 'kopf-punkt'), link('/app/', 'App öffnen', 'kopf-punkt'), out);
    avatar.addEventListener('click', () => {
      menu.hidden = !menu.hidden;
      avatar.setAttribute('aria-expanded', String(!menu.hidden));
    });
    side.append(avatar, menu);
  }
  // Tipp außerhalb schließt das Menü (pointerdown gilt für Finger, Stift und Maus)
  document.addEventListener('pointerdown', (e) => { if (menu && !menu.hidden && !side.contains(e.target)) close(); });
  onAuthChange(render);
  render();
  // Backend und gespeicherte Anmeldung nachladen; bis dahin steht nur der Name da
  return loadBackend().then((backend) => {
    initAuth(backend);
    render();
    // Token erneuern: Ist es abgelaufen oder das Konto weg, meldet auth.js ab und die Leiste zeigt wieder „Anmelden“
    if (currentUser()) refresh().catch(() => {});
  });
}
