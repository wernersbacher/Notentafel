// Blöcke, die in mehreren Bereichen gleich aussehen, stehen in index.html einmal als <template>; hier kommen sie
// in die Leiste, bevor die Knöpfe gebunden werden.
export function initParts() {
  const tpl = document.getElementById('tplCover');
  if (!tpl) return;
  // Jeder Platzhalter in der Leiste bekommt seine eigene Kopie des Blocks, die Nummer steht im Slot
  document.querySelectorAll('.cover-slot').forEach((slot) => {
    const block = tpl.content.cloneNode(true);
    block.querySelector('.num').textContent = slot.dataset.num;
    slot.replaceWith(block);
  });
}
