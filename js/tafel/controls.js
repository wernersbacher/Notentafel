// Bedienung der Tafel-eigenen Knöpfe in der Leiste: Töne, Werte, Zählzeiten, Takt und die Taktarten.
// Die gemeinsamen Knöpfe (einfügen, entfernen, Abspielen …) verdrahtet die Shell, siehe area.js.
import { METERS } from './config.js';
import { hasMeter } from './model.js';
import { S, settings } from './state.js';
import { persistSettings } from '../core/settings.js';
import { meterHTML } from './symbols.js';
import { render } from './render.js';
import { toast, delegate } from '../core/ui.js';
import * as act from './actions.js';
import { el } from './dom.js';

// Alle Taktarten nebeneinander (für die markierte Zeile); welche gilt, zeigt die Leiste beim Zeichnen
function buildMeters() {
  el.rhyMeters.innerHTML = [''].concat(METERS).map((m) =>
    '<button type="button" class="btn" data-m="' + m + '" aria-pressed="false" aria-label="' + (m ? 'Taktart ' + m : 'ohne Taktart') + '">' +
    (m ? meterHTML(m) : '<span class="small">ohne</span>') + '</button>'
  ).join('');
}
function toggleAuto(key) {
  settings[key] = !settings[key];
  persistSettings();
  if (settings[key] && !hasMeter(S.rows)) toast('Wähle zuerst eine Taktart. Ab dieser Zeile wird dann automatisch gezählt.');
  render();
}
export function initControls() {
  buildMeters();
  delegate(el.rhyMeters, '[data-m]', (b) => act.setMeter(b.dataset.m));

  delegate(el.palette, '.note', (b) => act.placeNote(b.dataset.id));
  [el.valuesMel, el.values].forEach((box) => delegate(box, '[data-d]', (b) => act.placeValue(+b.dataset.d)));
  delegate(el.rests, '[data-d]', (b) => act.placeRest(+b.dataset.d));
  delegate(el.counts, 'button', (b) => { if (b.dataset.z) act.placeCount(b.dataset.z); else act.clearCount(); });

  el.btnAutoBar.addEventListener('click', () => toggleAuto('autoBar'));
  el.btnAutoZ.addEventListener('click', () => toggleAuto('autoZ'));
  el.btnSyl.addEventListener('click', () => { settings.syl = !settings.syl; persistSettings(); render(); });
  el.btnBar.addEventListener('click', () => act.toggleBar(1));
  el.btnEnd.addEventListener('click', () => act.toggleBar(2));
  [el.btnRepStart, el.btnRepStartMel].forEach((b) => b.addEventListener('click', () => act.toggleRepeat('start')));
  [el.btnRepEnd, el.btnRepEndMel].forEach((b) => b.addEventListener('click', () => act.toggleRepeat('end')));
  el.btnLine.addEventListener('click', act.toggleLine);
  el.btnR.addEventListener('click', () => act.setHand('r'));
  el.btnL.addEventListener('click', () => act.setHand('l'));
}
