// Einstieg: Bereiche anmelden, Kern starten
import { initPlayer } from './core/player.js';
import { initMenu } from './core/menu.js';
import { initWake } from './core/wake.js';
import { startShell } from './core/shell.js';
import { registerTafel } from './tafel/area.js';
import { registerLied } from './lied/area.js';

initPlayer();
registerTafel();
registerLied();
initMenu();
initWake();
startShell();
