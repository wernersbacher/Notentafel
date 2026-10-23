// Konto in den Einstellungen (anmelden, Konto anlegen, abmelden, löschen) und der Hinweis unter den gespeicherten
// Liedern, wo sie liegen. Den Abgleich selbst macht cloud.js; ohne Backend bleibt der Abschnitt ausgeblendet.
import { cloudInfo, onCloudChange, login, register, logout, deleteAccount } from './cloud.js';
import { confirmTap, onEnter, status, timeOf } from './ui.js';
import { el } from './dom.js';
import { refreshSongs } from './menu.js';

let busy = false;

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
const hint = (text, warn) => status(el.accHint, text, warn);

// Anmelden oder Konto anlegen mit den Feldern; die Knöpfe sind gesperrt, bis der Server geantwortet hat
async function submit(fn, doing) {
  const email = el.accEmail.value.trim(), pass = el.accPass.value;
  if (!email || !pass) { hint('Bitte E-Mail und Passwort eingeben.', true); return; }
  if (busy) return;
  busy = true;
  el.btnLogin.disabled = el.btnRegister.disabled = true;
  hint(doing);
  const err = await fn(email, pass);
  busy = false;
  el.btnLogin.disabled = el.btnRegister.disabled = false;
  if (err) { hint(err, true); return; }
  el.accPass.value = '';
  el.accPass.blur();
  hint('');
}

export function initAccount() {
  onCloudChange(() => {
    render();
    refreshSongs(); // auch ohne neue Lieder: „nur auf diesem Gerät“ kann sich geändert haben
  });
  el.btnLogin.addEventListener('click', () => submit(login, 'Anmelden …'));
  el.btnRegister.addEventListener('click', () => submit(register, 'Konto wird angelegt …'));
  onEnter(el.accEmail, () => el.accPass.focus());
  onEnter(el.accPass, () => submit(login, 'Anmelden …'));
  el.btnLogout.addEventListener('click', () => confirmTap(el.btnLogout, 'Sicher?', logout));
  el.btnDelAcc.addEventListener('click', () => confirmTap(el.btnDelAcc, 'Wirklich löschen?', async () => {
    const err = await deleteAccount();
    if (err) { el.accState.textContent = err; el.accState.classList.add('warn'); }
  }));
  render();
}
