// Aufklappbare Blöcke der Leiste: Tipp auf die Überschrift klappt auf oder zu, jeder Block für sich.
// Welche offen sind, bleibt gemerkt (settings.open über den stabilen Namen aus data-block, z. B. 'mel-notes').
// Eingeklappt zeigt die Überschrift eine Kurzinfo (blockSum).
import { settings, persistSettings } from './settings.js';

// Schlüssel eines Blocks: der Name aus data-block, sonst wie früher Bereich + Position im DOM (z. B. 'mel2'),
// damit ein Block ohne data-block nichts hart bricht. Der Verdecken-Block steht in der Vorlage einmal für mehrere
// Bereiche (data-block="cover"); dort kommt der Bereich davor, also 'mel-cover' bzw. 'rhy-cover'.
export function blockKey(block, area, i) {
  const name = block.dataset && block.dataset.block;
  if (!name) return area + (i + 1);
  return name.startsWith(area + '-') ? name : area + '-' + name;
}

function setOpen(block, on) {
  block.classList.toggle('open', on);
  block.querySelector('.bhead').setAttribute('aria-expanded', on ? 'true' : 'false');
}

export function initBlocks() {
  document.querySelectorAll('.side .panel').forEach((panel) => {
    const area = panel.id.replace('panel', '').toLowerCase();
    panel.querySelectorAll(':scope > .block').forEach((b, i) => {
      const key = blockKey(b, area, i);
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
