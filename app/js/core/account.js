// Konto in den Einstellungen (Status und Links; Anmelden, Passwort, Daten und Löschen stehen auf /login/ und /account/),
// der Avatar mit Menü in der Leiste oben und der Hinweis unter den gespeicherten Liedern, wo sie liegen. Den Abgleich
// selbst macht cloud.js; ohne Backend bleiben Abschnitt und Avatar ausgeblendet.
import { cloudInfo, onCloudChange } from './cloud.js';
import { logout } from '../../../shared/auth.js';
import { mountAccount } from '../../../shared/header.js';
import { confirmTap, timeOf } from './ui.js';
import { el } from './dom.js';
import { refreshSongs } from './menu.js';

function render() {
  const c = cloudInfo();
  el.accountSec.hidden = !c.available;
  el.accOut.hidden = !!c.user;
  el.accIn.hidden = !c.user;
  if (c.user) {
    el.accWho.textContent = c.user.email;
    el.accState.textContent = c.error ? c.error + ' Die Lieder bleiben vorgemerkt und gehen beim nächsten Mal mit.'
      : !c.sync ? (c.tier ? 'Mit diesem Konto werden die Lieder nicht abgeglichen.' : '')
      : (c.lastSync ? 'Lieder abgeglichen um ' + timeOf(c.lastSync) + ' Uhr.' : 'Lieder werden abgeglichen …') + full(c);
    el.accState.classList.toggle('warn', !!c.error || !!c.rejected || !!c.invalid);
  }
  el.cloudHint.hidden = !c.available;
  el.cloudHint.textContent = c.user && c.sync ? 'Liegen auch in deinem Konto (' + c.user.email + ') und sind auf allen deinen Geräten da.' + full(c)
    : 'Liegen nur auf diesem Gerät. Mit einem Konto (in den Einstellungen) sind sie auf allen deinen Geräten da.';
}
// Hinweis, wenn Lieder nur auf diesem Gerät liegen: rejected = über dem Limit (rücken beim Löschen nach),
// invalid = nimmt der Server nicht an (Name zu lang oder Inhalt zu groß, das bleibt so)
function full(c) {
  const n = c.rejected + c.invalid;
  if (!n) return '';
  const advice = c.rejected ? ' Lösche Lieder, die du nicht mehr brauchst, dann rücken sie nach.' : '';
  if (!c.rejected) {
    return ' ' + (n === 1 ? 'Ein Lied nimmt' : n + ' Lieder nimmt') + ' der Server nicht an (Name zu lang oder ' +
      'Inhalt zu groß) und ' + (n === 1 ? 'es liegt' : 'sie liegen') + ' nur auf diesem Gerät.';
  }
  const over = (c.rejected === 1 ? 'Ein Lied passt' : c.rejected + ' Lieder passen') +
    ' nicht mehr ins Konto (höchstens ' + c.limit + ')';
  if (!c.invalid) {
    return ' ' + over + ' und ' + (n === 1 ? 'es liegt' : 'sie liegen') + ' nur auf diesem Gerät.' + advice;
  }
  // beides zusammen: erst wie viele, dann die beiden Gründe
  return ' ' + n + ' Lieder liegen nur auf diesem Gerät: ' +
    (c.rejected === 1 ? '1 passt' : c.rejected + ' passen') + ' nicht mehr ins Konto (höchstens ' + c.limit + '), ' +
    (c.invalid === 1 ? '1 nimmt' : c.invalid + ' nehmen') + ' der Server nicht an (Name zu lang oder Inhalt zu groß).' + advice;
}

export function initAccount() {
  // der Avatar liest die Anmeldung aus shared/auth.js; initAuth läuft erst in initCloud, danach meldet cloud.js eine Änderung
  const redraw = mountAccount(el.accMount);
  onCloudChange(() => {
    render();
    redraw();
    refreshSongs(); // auch ohne neue Lieder: „nur auf diesem Gerät“ kann sich geändert haben
  });
  el.btnLogout.addEventListener('click', () => confirmTap(el.btnLogout, 'Sicher?', logout));
  render();
}
