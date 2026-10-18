// Aufklappbare Blöcke der Leiste: Tipp auf die Überschrift klappt auf oder zu, je Bereich ist immer nur einer offen.
// Am Anfang ist jeweils der zweite Block offen (Noten schreiben). Eingeklappt zeigt die Überschrift eine Kurzinfo (blockSum).

function setOpen(block, on) {
  block.classList.toggle('open', on);
  block.querySelector('.bhead').setAttribute('aria-expanded', on ? 'true' : 'false');
}

export function initBlocks() {
  document.querySelectorAll('.side .panel').forEach((panel) => {
    const blocks = [...panel.querySelectorAll(':scope > .block')];
    blocks.forEach((b) => b.querySelector('.bhead').addEventListener('click', () => {
      const on = !b.classList.contains('open');
      blocks.forEach((x) => setOpen(x, x === b && on));
    }));
    blocks.forEach((b, i) => setOpen(b, i === 1));
  });
}

// Kurzinfo in der Überschrift eines Blocks, z. B. „4/4 · C-Dur“ beim Einrichten
export function blockSum(id, text) {
  const sum = document.querySelector('#' + id + ' .bsum');
  if (sum && sum.textContent !== text) sum.textContent = text;
}
