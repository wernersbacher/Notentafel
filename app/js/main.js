// Einstieg: Bereiche anmelden, Kern starten
import { initPlayer } from './core/player.js';
import { initMenu } from './core/menu.js';
import { initAccount } from './core/account.js';
import { initCloud } from './core/cloud.js';
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
// Backend nur im Docker-Image (app/js/env.js, siehe deploy/env.prod.js); mit npm start fehlt die Datei, dann ohne Konto
import('./env.js').then((m) => m.ENV.backend, () => null).then(initCloud);
