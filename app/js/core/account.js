// Konto in der App: Avatar (oder Personen-Symbol für Gäste) mit Menü in der Leiste oben und der Hinweis unter den
// gespeicherten Liedern, wo sie liegen. Den Abgleich selbst macht cloud.js; ohne Backend bleibt alles ausgeblendet.
import { cloudInfo, onCloudChange } from './cloud.js';
import { mountAccount } from '../../../shared/header.js';
import { timeOf } from './ui.js';
import { el } from './dom.js';
import { refreshSongs } from './menu.js';
import { accountStatus, songsHint } from './account-text.js';

function render() {
  const c = cloudInfo();
  el.cloudHint.hidden = !c.available;
  el.cloudHint.textContent = songsHint(c);
}

export function initAccount() {
  // der Avatar liest die Anmeldung aus shared/auth.js; initAuth läuft erst in initCloud, danach meldet cloud.js eine Änderung
  const redraw = mountAccount(el.accMount, { guestMenu: true, status: () => accountStatus(cloudInfo(), timeOf) });
  // beim Einklappen der Leiste oben schließt das Menü mit
  el.btnTopHide.addEventListener('click', redraw.close);
  onCloudChange(() => {
    render();
    redraw();
    refreshSongs(); // auch ohne neue Lieder: „nur auf diesem Gerät“ kann sich geändert haben
  });
  render();
}
