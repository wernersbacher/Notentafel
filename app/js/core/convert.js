// Feld „Umwandeln“ unten in der Leiste: klappt über dem Knopf auf, ein Tipp auf eine Umwandlung (oder woanders) schließt es.
// Die Umwandlungen selbst verdrahten die Bereiche (btnToLiedSide in tafel/menu.js, btnToMelody in lied/area.js).
import { el } from './dom.js';
import { popover } from './ui.js';
import { onShow } from './shell.js';

export function initConvert() {
  const pop = popover(el.convertPop, el.btnConvert);
  el.convertPop.addEventListener('click', (e) => { if (e.target.closest('.btn')) pop.close(); });
  onShow(pop.close); // beim Wechsel des Bereichs steht dort eine andere Umwandlung
}
