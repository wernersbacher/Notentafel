// Einstieg: Bereiche anmelden, Kern starten
import { initPlayer } from './core/player.js';
import { initMenu } from './core/menu.js';
import { initAccount } from './core/account.js';
import { initCloud } from './core/cloud.js';
import { loadBackend } from '../../shared/auth.js';
import { loadPlan } from './core/tier.js';
import { initWake } from './core/wake.js';
import { startShell } from './core/shell.js';
import { initParts } from './core/parts.js';
import { initBlocks } from './core/blocks.js';
import { initGamePicks } from './core/game.js';
import { setWriteError } from './core/store.js';
import { toast } from './core/ui.js';
import { registerTafel } from './tafel/area.js';
import { registerLied } from './lied/area.js';

// Speicher voll oder gesperrt: einmal pro Seitenaufruf sagen, dass neue Lieder verloren gehen können
let writeErrorShown = false;
setWriteError(() => {
  if (writeErrorShown) return;
  writeErrorShown = true;
  toast('Der Speicher des Geräts ist voll. Neue Lieder können verloren gehen.', true);
});

// Stufe klären, bevor die Bereiche sich anmelden (gesperrt wird hier noch nichts)
await loadPlan();

// Die geteilten Blöcke einsetzen, bevor die Leiste ihre Knöpfe bindet
initParts();
initBlocks();
initGamePicks();
initPlayer();
registerTafel();
registerLied();
initMenu();
initAccount();
initWake();
startShell();
// Ladeschirm (index.html) weg, jetzt steht die Seite
const boot = document.getElementById('boot');
if (boot) {
  boot.classList.add('done');
  setTimeout(() => boot.remove(), 300);
}
// Backend nur im Docker-Image (shared/env.js, siehe deploy/env.prod.js); mit npm start ist backend null, dann ohne Konto
loadBackend().then(initCloud);
