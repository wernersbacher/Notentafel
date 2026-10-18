// Aufklappbare Blöcke der Leiste: Tipp auf die Überschrift klappt auf oder zu, jeder Block für sich.
// Welche offen sind, bleibt gemerkt (settings.open, z. B. 'lied2'). Eingeklappt zeigt die Überschrift eine Kurzinfo (blockSum).
import { settings, persistSettings } from './settings.js';

function setOpen(block, on) {
  block.classList.toggle('open', on);
  block.querySelector('.bhead').setAttribute('aria-expanded', on ? 'true' : 'false');
}

export function initBlocks() {
  document.querySelectorAll('.side .panel').forEach((panel) => {
    const area = panel.id.replace('panel', '').toLowerCase();
    panel.querySelectorAll(':scope > .block').forEach((b, i) => {
      const key = area + (i + 1);
      setOpen(b, settings.open.includes(key));
      b.querySelector('.bhead').addEventListener('click', () => {
        const on = !b.classList.contains('open');
        setOpen(b, on);
        settings.open = settings.open.filter((k) => k !== key).concat(on ? [key] : []);
        persistSettings();
      });
    });
  });
}

// Kurzinfo in der Überschrift eines Blocks, z. B. „4/4 · C-Dur“ beim Einrichten
export function blockSum(id, text) {
  const sum = document.querySelector('#' + id + ' .bsum');
  if (sum && sum.textContent !== text) sum.textContent = text;
}
