// Bedienung der Tafel-eigenen Knöpfe in der Leiste: Töne, Werte, Zählzeiten, Takt und die Auswahl der Taktart.
// Die gemeinsamen Knöpfe (einfügen, entfernen, Abspielen …) verdrahtet die Shell, siehe area.js.
import { METERS } from './config.js';
import { hasMeter } from './model.js';
import { S, settings, curRow } from './state.js';
import { persistSettings } from '../core/settings.js';
import { meterHTML } from './symbols.js';
import { render } from './render.js';
import { toast, popover, delegate } from '../core/ui.js';
import * as act from './actions.js';
import { el } from './dom.js';

// Auswahl der Taktart (unter den Werkzeugen); in initControls erzeugt
let meterPop;

function fillMeterPop() {
  const cur = curRow().meter;
  el.meterPop.innerHTML = [''].concat(METERS).map((m) =>
    '<button type="button" class="btn' + (m === cur ? ' on' : '') + '" data-m="' + m + '" aria-label="' + (m ? 'Taktart ' + m : 'ohne Taktart') + '">' +
    (m ? meterHTML(m) : '<span class="small">ohne</span>') + '</button>'
  ).join('');
}
function toggleAuto(key) {
  settings[key] = !settings[key];
  persistSettings();
  if (settings[key] && !hasMeter(S.rows)) toast('Wähle zuerst eine Taktart. Ab dieser Zeile wird dann automatisch gezählt.');
  render();
}
export const closeMeterPop = () => meterPop.close();

export function initControls() {
  meterPop = popover(el.meterPop, el.btnMeter, { onOpen: fillMeterPop });

  delegate(el.palette, '.note', (b) => act.placeNote(b.dataset.id));
  [el.valuesMel, el.values].forEach((box) => delegate(box, '[data-d]', (b) => act.placeValue(+b.dataset.d)));
  delegate(el.rests, '[data-d]', (b) => act.placeRest(+b.dataset.d));
  delegate(el.counts, 'button', (b) => { if (b.dataset.z) act.placeCount(b.dataset.z); else act.clearCount(); });
  delegate(el.meterPop, '[data-m]', (b) => { meterPop.close(); act.setMeter(b.dataset.m); });

  el.btnAutoBar.addEventListener('click', () => toggleAuto('autoBar'));
  el.btnAutoZ.addEventListener('click', () => toggleAuto('autoZ'));
  el.btnSyl.addEventListener('click', () => { settings.syl = !settings.syl; persistSettings(); render(); });
  el.btnBar.addEventListener('click', () => act.toggleBar(1));
  el.btnEnd.addEventListener('click', () => act.toggleBar(2));
  el.btnLine.addEventListener('click', act.toggleLine);
  el.btnR.addEventListener('click', () => act.setHand('r'));
  el.btnL.addEventListener('click', () => act.setHand('l'));
}
