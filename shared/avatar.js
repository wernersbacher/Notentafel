// Initialen-Avatar (kein Foto-Upload): ein Rund mit den Initialen, die Farbe kommt aus einem festen Satz von
// acht Farben (--av-1 … --av-8 in tokens.css) und hängt nur am Namen oder der E-Mail, bleibt also gleich.
// Stile (.avatar, .av-1 …) stehen in header.css.
import { initials } from './auth.js';

export const AVATAR_FARBEN = 8;
// Nummer 1 bis 8 aus einem einfachen Hash über Name, sonst E-Mail
export function avatarFarbe(user) {
  const src = ((user && (user.name || '').trim()) || (user && user.email) || '').toLowerCase();
  let h = 0;
  for (const ch of src) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return (h % AVATAR_FARBEN) + 1;
}
// size in px; der Text wird mitskaliert
export function avatar(user, size = 40) {
  const e = document.createElement('span');
  e.className = 'avatar av-' + avatarFarbe(user);
  e.textContent = initials(user);
  e.style.width = e.style.height = size + 'px';
  e.style.fontSize = Math.round(size * 0.4) + 'px';
  e.setAttribute('aria-hidden', 'true');
  return e;
}
