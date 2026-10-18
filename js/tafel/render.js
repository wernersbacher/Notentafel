// Zeichnet Tafel und Leiste neu
import { S, persistBoard } from './state.js';
import { renderBoard, markPlaying } from './board.js';
import { renderSidebar } from './sidebar.js';
import { stopPlay, playingPos } from '../core/player.js';

export function render() {
  renderBoard();
  markPlaying(playingPos());
  renderSidebar();
}

// Nach jeder Änderung der Tafel: Abspielen stoppen, Markierung wieder einblenden, speichern, neu zeichnen
export function commit() {
  stopPlay();
  persistBoard();
  render();
}
