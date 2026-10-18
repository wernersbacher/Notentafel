// Darstellung der Leiste: Töne, Werte, Zählzeiten und der Zustand aller Knöpfe
import { MAX_ROWS, NOTE_BY, GROUPS, DUR_BY, VALUE_BTNS, COUNTS } from './config.js';
import { isNote, isBeat, isRest, filled, canStepDown, canCloseGap, dotTargetIn } from './model.js';
import { meterOf } from './theory.js';
import { S, settings, curCell, curRow } from './state.js';
import { colorStyle, noteLabel, ICONS } from './symbols.js';
import { noteIcon, restIcon, dotIcon } from '../core/glyphs.js';
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

// Noten- und Pausenwerte wie im Lied angeordnet: Ganze, Halbe, Viertel, Achtel, (frei), Punkt. Hervorgehoben ist der Wert
// des markierten Platzes (ein punktierter zählt als sein Grundwert mit Punkt).
// Die Zeichen sind dieselben wie im Lied (core/glyphs.js); V: Länge in Schlägen → Notenwert (1 Ganze … 8 Achtel).
const BASE = { 1.5: 1, 3: 2 }, V = { 4: 1, 2: 2, 1: 4, 0.5: 8 };
function valueBtns(on, sym, names) {
  return VALUE_BTNS.map((d) =>
    '<button type="button" class="btn' + (d === (BASE[on] || on) ? ' on' : '') + '" data-d="' + d + '" title="' + DUR_BY[d][names] +
    '" aria-label="' + DUR_BY[d][names] + '">' + sym(V[d]) + '</button>'
  ).join('');
}
const dotBtn = (on) => '<span class="vgap" aria-hidden="true"></span><button type="button" class="btn' + (on ? ' on' : '') +
  '" data-dot title="Punkt: aus der Halben eine punktierte Halbe, aus der Viertel eine punktierte Viertel" aria-label="Punkt">' + dotIcon() + '</button>';
function renderValues(cur) {
  const dt = dotTargetIn(S.rows, S.sel), dotted = !!(dt && BASE[dt.d]);
  el.valuesMel.innerHTML = valueBtns(isNote(cur) && cur.d, noteIcon, 'n') + dotBtn(dotted);
  el.values.innerHTML = valueBtns((isNote(cur) || isBeat(cur)) && cur.d, noteIcon, 'n') + dotBtn(dotted);
  el.restsMel.innerHTML = el.rests.innerHTML = valueBtns(isRest(cur) && cur.d, restIcon, 'p');
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
  const rb = cur && cur.bar;
  [el.btnRepStart, el.btnRepStartMel].forEach((b) => pressed(b, rb === 4 || rb === 5));
  [el.btnRepEnd, el.btnRepEndMel].forEach((b) => pressed(b, rb === 3 || rb === 5));
  pressed(el.btnLine, !!row.line);
  [el.rhyMeters, el.melMeters].forEach((box) => box.querySelectorAll('[data-m]').forEach((b) => pressed(b, b.dataset.m === meterOf(S.rows, S.sel.r))));

  [el.btnAutoBar, el.btnAutoBarMel].forEach((b) => pressed(b, settings.autoBar));
  [el.btnAutoZ, el.btnAutoZMel].forEach((b) => pressed(b, settings.autoZ));
  pressed(el.btnSyl, settings.syl);
  renderCounts(cur);

  pressed(el.btnIns, S.insertMode);
  el.btnDel.disabled = !filled(cur);
  el.btnGap.disabled = !canCloseGap(S.rows, S.sel);
  el.btnBreak.disabled = S.rows.length >= MAX_ROWS && !canStepDown(S.rows, S.sel);
  el.btnUndo.disabled = S.hist.length === 0;
  el.btnAddRow.disabled = S.rows.length >= MAX_ROWS;
  el.btnDelRow.disabled = S.rows.length <= 1;
}
