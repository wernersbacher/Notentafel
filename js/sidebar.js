// Darstellung der Leiste: Töne, Werte, Zählzeiten und der Zustand aller Knöpfe
import { MAX_ROWS, NOTE_BY, GROUPS, DURS, COUNTS } from './config.js';
import { isNote, isBeat, isRest, filled, canStepDown } from './model.js';
import { S, settings, curCell, curRow } from './state.js';
import { colorStyle, noteLabel, noteSym, restSym, meterHTML, ICONS } from './symbols.js';
import { el } from './dom.js';

const pressed = (btn, on) => {
  btn.classList.toggle('on', on);
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
};

// Töne der Leiste; nach einem Wechsel des Farbthemas neu zeichnen
export function renderPalette() {
  el.palette.innerHTML = GROUPS.map((g) => '<div class="pal">' + g.map((id) => {
    const n = NOTE_BY[id];
    return '<button type="button" class="note' + (n.up ? ' up' : '') + '" data-id="' + n.id +
      '" style="' + colorStyle(n) + '" aria-label="' + n.n + '">' + noteLabel(n) + '</button>';
  }).join('') + '</div>').join('');
}

// Zählzeiten-Knöpfe: 1–6, „+“ (und) und Löschen
export function buildCounts() {
  el.counts.innerHTML = COUNTS.map((t) =>
    '<button type="button" class="btn" data-z="' + t + '" aria-label="Zählzeit ' + (t === '+' ? 'und' : t) + '">' + t + '</button>'
  ).join('') + '<button type="button" class="btn" data-zclear aria-label="Zählzeiten entfernen" title="Zählzeiten entfernen">' + ICONS.clearCount + '</button>';
}

// Notenwerte und Pausenwerte; hervorgehoben ist der Wert des markierten Platzes
function valueBtns(on, sym, names) {
  return DURS.map((x) =>
    '<button type="button" class="btn' + (x.d === on ? ' on' : '') + '" data-d="' + x.d + '" title="' + x[names] +
    '" aria-label="' + x[names] + '">' + sym(x.d) + '<span class="small">' + x.l + '</span></button>'
  ).join('');
}
function renderValues(cur) {
  el.valuesMel.innerHTML = valueBtns(isNote(cur) && cur.d, noteSym, 'n');
  el.values.innerHTML = valueBtns((isNote(cur) || isBeat(cur)) && cur.d, noteSym, 'n');
  el.rests.innerHTML = valueBtns(isRest(cur) && cur.d, restSym, 'p');
}
// Aus, solange die Zählzeiten automatisch kommen
function renderCounts(cur) {
  el.counts.querySelectorAll('[data-z]').forEach((b) => { b.disabled = settings.autoZ || !filled(cur); });
  el.counts.querySelector('[data-zclear]').disabled = settings.autoZ || !(cur && cur.z);
}

export function renderSidebar() {
  const cur = curCell(), row = curRow();
  el.btnR.classList.toggle('on', isNote(cur) && cur.h === 'r');
  el.btnL.classList.toggle('on', isNote(cur) && cur.h === 'l');
  el.btnR.disabled = el.btnL.disabled = !isNote(cur);
  renderValues(cur);

  const hasBar = !!(cur && cur.bar === 1), hasEnd = !!(cur && cur.bar === 2);
  el.btnBar.classList.toggle('on', hasBar && !settings.autoBar);
  el.btnBar.disabled = settings.autoBar;
  el.btnBar.setAttribute('aria-pressed', hasBar ? 'true' : 'false');
  pressed(el.btnEnd, hasEnd);
  pressed(el.btnLine, !!row.line);
  el.meterShow.innerHTML = row.meter ? meterHTML(row.meter) : '<span class="mtr off"><span>?</span><span>?</span></span>';
  el.btnMeter.classList.toggle('on', !!row.meter);

  const mel = settings.mode === 'mel';
  el.tabMel.setAttribute('aria-selected', mel ? 'true' : 'false');
  el.tabRhy.setAttribute('aria-selected', mel ? 'false' : 'true');
  el.panelMel.hidden = !mel;
  el.panelRhy.hidden = mel;
  pressed(el.btnAutoBar, settings.autoBar);
  pressed(el.btnAutoZ, settings.autoZ);
  renderCounts(cur);

  pressed(el.btnIns, S.insertMode);
  el.delLabel.textContent = S.insertMode ? 'Lücke zu' : 'entfernen';
  el.btnDel.disabled = S.insertMode ? S.sel.c >= row.length : !filled(cur);
  el.btnBreak.disabled = S.rows.length >= MAX_ROWS && !canStepDown(S.rows, S.sel);
  pressed(el.btnDone, S.clean);
  el.btnUndo.disabled = S.hist.length === 0;
  el.btnAddRow.disabled = S.rows.length >= MAX_ROWS;
  el.btnDelRow.disabled = S.rows.length <= 1;
}
