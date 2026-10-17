// Einstieg: Knöpfe verdrahten und die Tafel zum ersten Mal zeichnen
import { appendPos } from './model.js';
import { S } from './state.js';
import { render } from './render.js';
import { renderPalette, buildCounts } from './sidebar.js';
import { initPlayer } from './player.js';
import { initControls } from './controls.js';
import { initMenu } from './menu.js';
import { initBoardInput } from './input.js';
import { initWake } from './wake.js';

initPlayer();
buildCounts();
renderPalette();
initControls();
initMenu();
initBoardInput();
initWake();
S.sel = appendPos(S.rows);
render();
