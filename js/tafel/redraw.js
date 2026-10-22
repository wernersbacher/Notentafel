// Zeichnet Tafel und Leiste neu
import { S, persistBoard } from './state.js';
import { renderBoard, markPlaying } from './board.js';
import { renderSidebar } from './sidebar.js';
import { stopPlay, playingPos } from '../core/player.js';

// Hervorgehoben ist, was gerade klingt, sonst der Punkt, nach dem das Tonnamen-Quiz fragt
export function render() {
  renderBoard();
  markPlaying(playingPos() || (S.quiz && S.quiz.pos));
  renderSidebar();
}

// Nach jeder Änderung der Tafel: Abspielen stoppen, Markierung wieder einblenden, speichern, neu zeichnen
export function commit() {
  stopPlay();
  persistBoard();
  render();
}
