// Bereich Lied: echtes Notenblatt. Noch leer – bisher nur fünf Notenlinien, siehe plan-lied.md.
import { register } from '../core/shell.js';

const sheet = document.getElementById('sheet');
const panel = document.getElementById('panelLied');

// Fünf Notenlinien über die ganze Breite
function render() {
  const lines = [0, 1, 2, 3, 4].map((i) => '<line x1="0" x2="1000" y1="' + (20 + i * 10) + '" y2="' + (20 + i * 10) + '"/>').join('');
  sheet.innerHTML = '<svg class="staff" viewBox="0 0 1000 80" preserveAspectRatio="none" aria-label="Leere Notenlinien">' + lines + '</svg>';
}

export function registerLied() {
  register({ id: 'lied', label: 'Lied', panel, board: sheet, enter: render });
}
