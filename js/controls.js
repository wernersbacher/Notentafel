// Bedienung der Leiste: Knöpfe, Umschalter Melodie/Rhythmus, Auswahl der Taktart und Speichern-Feld
import { METERS } from './config.js';
import { emptyRows, appendPos, hasMeter } from './model.js';
import { S, settings, curRow, persistSettings } from './state.js';
import { loadBoard } from './storage.js';
import { meterHTML } from './symbols.js';
import { render } from './render.js';
import { stopPlay, togglePlay } from './player.js';
import { toast, confirmTap, disarm, isArmed, popover, delegate, onEnter } from './ui.js';
import * as act from './actions.js';
import { el } from './dom.js';

// Auswahl der Taktart (unter den Werkzeugen) und Speichern-Feld (über den Knöpfen unten); in initControls erzeugt
let meterPop, savePop;

function fillMeterPop() {
  const cur = curRow().meter;
  el.meterPop.innerHTML = [''].concat(METERS).map((m) =>
    '<button type="button" class="btn' + (m === cur ? ' on' : '') + '" data-m="' + m + '" aria-label="' + (m ? 'Taktart ' + m : 'ohne Taktart') + '">' +
    (m ? meterHTML(m) : '<span class="small">ohne</span>') + '</button>'
  ).join('');
}
function prepareSavePop() {
  stopPlay();
  meterPop.close();
  el.saveName.value = S.name;
  el.saveHintSide.textContent = '';
  el.saveHintSide.classList.remove('warn');
  el.saveName.focus();
}
function leaveSavePop() {
  if (isArmed(el.btnSaveOk)) disarm();
  el.saveName.blur();
}
function saveFromSide() {
  act.saveAs(el.saveName, el.btnSaveOk, (text, warn) => {
    if (warn) { el.saveHintSide.textContent = text; el.saveHintSide.classList.add('warn'); return; }
    savePop.close();
    toast(text);
  });
}

// Wechselt zwischen der Melodie- und der Rhythmus-Tafel. Die aktuelle Tafel ist schon gespeichert;
// Markierung und Rückgängig-Verlauf werden geparkt, die andere Tafel kommt aus dem Speicher.
function setMode(m) {
  meterPop.close();
  savePop.close();
  if (m === settings.mode) return;
  stopPlay();
  disarm();
  S.parked[settings.mode] = { sel: S.sel, hist: S.hist };
  settings.mode = m;
  persistSettings();
  const d = loadBoard(m), p = S.parked[m];
  S.rows = d ? d.rows : emptyRows();
  S.name = d ? d.name : '';
  S.hist = p ? p.hist : [];
  S.sel = p && p.sel.r < S.rows.length ? p.sel : appendPos(S.rows);
  S.insertMode = false; S.clean = false; S.countAt = null;
  render();
}
function toggleAuto(key) {
  settings[key] = !settings[key];
  persistSettings();
  if (settings[key] && !hasMeter(S.rows)) toast('Wähle zuerst eine Taktart. Ab dieser Zeile wird dann automatisch gezählt.');
  render();
}

export function initControls() {
  meterPop = popover(el.meterPop, el.btnMeter, { onOpen: fillMeterPop });
  savePop = popover(el.savePop, el.btnSaveSide, { onOpen: prepareSavePop, onClose: leaveSavePop });

  delegate(el.palette, '.note', (b) => act.placeNote(b.dataset.id));
  [el.valuesMel, el.values].forEach((box) => delegate(box, '[data-d]', (b) => act.placeValue(+b.dataset.d)));
  delegate(el.rests, '[data-d]', (b) => act.placeRest(+b.dataset.d));
  delegate(el.counts, 'button', (b) => { if (b.dataset.z) act.placeCount(b.dataset.z); else act.clearCount(); });
  delegate(el.meterPop, '[data-m]', (b) => { meterPop.close(); act.setMeter(b.dataset.m); });

  el.tabMel.addEventListener('click', () => setMode('mel'));
  el.tabRhy.addEventListener('click', () => setMode('rhy'));
  el.btnAutoBar.addEventListener('click', () => toggleAuto('autoBar'));
  el.btnAutoZ.addEventListener('click', () => toggleAuto('autoZ'));

  el.btnBar.addEventListener('click', () => act.toggleBar(1));
  el.btnEnd.addEventListener('click', () => act.toggleBar(2));
  el.btnLine.addEventListener('click', act.toggleLine);
  el.btnR.addEventListener('click', () => act.setHand('r'));
  el.btnL.addEventListener('click', () => act.setHand('l'));
  el.btnIns.addEventListener('click', act.toggleInsert);
  el.btnDel.addEventListener('click', act.deleteCell);
  el.btnBreak.addEventListener('click', act.lineBreak);
  el.btnDone.addEventListener('click', act.toggleClean);

  el.btnPlay.addEventListener('click', togglePlay);
  el.btnUndo.addEventListener('click', act.undo);
  el.btnAddRow.addEventListener('click', act.addRow);
  // Alles löschen und − Zeile (wenn in der Zeile Noten stehen) muss man zweimal antippen
  el.btnDelRow.addEventListener('click', () => {
    if (act.lastRowHasNotes()) confirmTap(el.btnDelRow, 'Sicher? Nochmal', act.delRow);
    else act.delRow();
  });
  el.btnClear.addEventListener('click', () => confirmTap(el.btnClear, 'Sicher? Nochmal tippen', act.clearAll));

  el.btnSaveOk.addEventListener('click', saveFromSide);
  onEnter(el.saveName, saveFromSide);
  el.saveName.addEventListener('input', () => { if (isArmed(el.btnSaveOk)) disarm(); });
}
export const closeSavePop = () => savePop.close();
