// Darstellung der Leiste: Töne, Werte, Zählzeiten und der Zustand aller Knöpfe
import { maxRows, NOTE_BY, GROUPS, MORE_SEMIS, DUR_BY, VALUE_BTNS, RHY_VALUE_BTNS, COUNTS } from './config.js';
import { isNote, isBeat, isRest, filled, canStepDown, canCloseGap, dotTargetIn } from './model.js';
import { meterOf } from './theory.js';
import { S, settings, curCell, curRow } from './state.js';
import { colorStyle, noteLabel, ICONS } from './symbols.js';
import { noteIcon, restIcon, dotIcon } from '../core/glyphs.js';
import { el } from './dom.js';
import { blockSum } from '../core/blocks.js';
import { breakJoins } from '../core/shell.js';
import { setPressed as pressed, lock } from '../core/ui.js';

// Töne der Leiste; nach einem Wechsel des Farbthemas neu zeichnen. Darunter klappen die weiteren Halbtöne auf.
let moreSemis = false;
const toneBtn = (id) => {
  const n = NOTE_BY[id];
  return '<button type="button" class="note' + (n.up ? ' up' : '') + '" data-id="' + n.id +
    '" style="' + colorStyle(n) + '" aria-label="' + n.n + '">' + noteLabel(n) + '</button>';
};
export function renderPalette() {
  el.palette.innerHTML = GROUPS.map((g) => '<div class="pal">' + g.map(toneBtn).join('') + '</div>').join('') +
    '<button type="button" class="btn more" data-more aria-expanded="' + moreSemis + '">' +
    (moreSemis ? '▴ weniger Halbtöne' : '▾ weitere Halbtöne: Cis, Dis, Gis') + '</button>' +
    (moreSemis ? '<div class="pal">' + MORE_SEMIS.map(toneBtn).join('') + '</div>' : '');
}
export function toggleMoreSemis() {
  moreSemis = !moreSemis;
  renderPalette();
}

// Zählzeiten-Knöpfe: 1–6, „+“ (und) und Löschen
export function buildCounts() {
  el.counts.innerHTML = COUNTS.map((t) =>
    '<button type="button" class="btn" data-z="' + t + '" aria-label="Zählzeit ' + (t === '+' ? 'und' : t) + '">' + t + '</button>'
  ).join('') + '<button type="button" class="btn" data-zclear aria-label="Zählzeiten entfernen" title="Zählzeiten entfernen">' + ICONS.clearCount + '</button>';
}

// Noten- und Pausenwerte wie im Lied angeordnet: Ganze, Halbe, Viertel, Achtel, Sechzehntel (bei den Farbnoten frei),
// Punkt. Hervorgehoben ist der Wert des markierten Platzes (ein punktierter zählt als sein Grundwert mit Punkt).
// Die Zeichen sind dieselben wie im Lied (core/glyphs.js); V: Länge in Schlägen → Notenwert (1 Ganze … 16 Sechzehntel).
const BASE = { 1.5: 1, 3: 2 }, V = { 4: 1, 2: 2, 1: 4, 0.5: 8, 0.25: 16 };
function valueBtns(list, on, sym, names) {
  return list.map((d) =>
    '<button type="button" class="btn' + (d === (BASE[on] || on) ? ' on' : '') + '" data-d="' + d + '" title="' + DUR_BY[d][names] +
    '" aria-label="' + DUR_BY[d][names] + '">' + sym(V[d]) + '</button>'
  ).join('');
}
const dotBtn = (on, gap) => (gap ? '<span class="vgap" aria-hidden="true"></span>' : '') + '<button type="button" class="btn' + (on ? ' on' : '') +
  '" data-dot title="Punkt: aus der Halben eine punktierte Halbe, aus der Viertel eine punktierte Viertel" aria-label="Punkt">' + dotIcon() + '</button>';
function renderValues(cur) {
  const dt = dotTargetIn(S.rows, S.sel), dotted = !!(dt && BASE[dt.d]);
  el.valuesMel.innerHTML = valueBtns(VALUE_BTNS, isNote(cur) && cur.d, noteIcon, 'n') + dotBtn(dotted, true);
  el.values.innerHTML = valueBtns(RHY_VALUE_BTNS, (isNote(cur) || isBeat(cur)) && cur.d, noteIcon, 'n') + dotBtn(dotted, false);
  el.restsMel.innerHTML = valueBtns(VALUE_BTNS, isRest(cur) && cur.d, restIcon, 'p');
  el.rests.innerHTML = valueBtns(RHY_VALUE_BTNS, isRest(cur) && cur.d, restIcon, 'p');
}
// Aus, solange die Zählzeiten automatisch kommen
const AUTO_Z = 'Die Zählzeiten kommen von selbst. Zum Selbersetzen „Zählzeiten“ unter „Taktart & Hilfen“ ausschalten.';
function renderCounts(cur) {
  const empty = filled(cur) ? '' : 'Auf einem leeren Platz gibt es nichts zu zählen.';
  el.counts.querySelectorAll('[data-z]').forEach((b) => lock(b, settings.autoZ ? AUTO_Z : empty));
  lock(el.counts.querySelector('[data-zclear]'), settings.autoZ ? AUTO_Z : !(cur && cur.z) && 'Hier steht keine Zählzeit.');
}

export function renderSidebar() {
  const cur = curCell(), row = curRow();
  el.btnR.classList.toggle('on', isNote(cur) && cur.h === 'r');
  el.btnL.classList.toggle('on', isNote(cur) && cur.h === 'l');
  [el.btnR, el.btnL].forEach((b) => lock(b, !isNote(cur) && 'Rechts oder links gibt es nur bei einem gesetzten Ton.'));
  renderValues(cur);

  const hasBar = !!(cur && cur.bar === 1), hasEnd = !!(cur && cur.bar === 2);
  [el.btnBar, el.btnBarMel].forEach((b) => {
    b.classList.toggle('on', hasBar && !settings.autoBar);
    lock(b, settings.autoBar && 'Die Taktstriche kommen von selbst. Zum Selbersetzen „Taktstriche“ unter „Taktart & Hilfen“ ausschalten.');
    b.setAttribute('aria-pressed', hasBar ? 'true' : 'false');
  });
  [el.btnEnd, el.btnEndMel].forEach((b) => pressed(b, hasEnd));
  const rb = cur && cur.bar;
  [el.btnRepStart, el.btnRepStartMel].forEach((b) => pressed(b, rb === 4 || rb === 5));
  [el.btnRepEnd, el.btnRepEndMel].forEach((b) => pressed(b, rb === 3 || rb === 5));
  pressed(el.btnLine, !!row.line);
  [el.rhyMeters, el.melMeters].forEach((box) => box.querySelectorAll('[data-m]').forEach((b) => pressed(b, b.dataset.m === meterOf(S.rows, S.sel.r))));

  [el.btnAutoBar, el.btnAutoBarMel].forEach((b) => pressed(b, settings.autoBar));
  [el.btnAutoZ, el.btnAutoZMel].forEach((b) => pressed(b, settings.autoZ));
  const sum = meterOf(S.rows, S.sel.r) || 'ohne Taktart';
  blockSum('melSetup', sum);
  blockSum('rhySetup', sum);
  pressed(el.btnSyl, settings.syl);
  renderCounts(cur);

  pressed(el.btnIns, S.insertMode);
  lock(el.btnDel, !filled(cur) && 'Auf diesem Platz steht nichts, das sich leeren ließe.');
  lock(el.btnGap, !canCloseGap(S.rows, S.sel) && 'Hier gibt es keine Lücke zu schließen.');
  lock(el.btnBreak, S.rows.length >= maxRows() && !canStepDown(S.rows, S.sel) && 'Hier passt keine neue Zeile mehr auf die Tafel.');
  breakJoins(false);
  lock(el.btnUndo, S.hist.length === 0 && 'Es gibt noch nichts zurückzunehmen.');
  lock(el.btnRedo, S.redo.length === 0 && 'Es gibt nichts zu wiederholen.');
  lock(el.btnAddRow, S.rows.length >= maxRows() && 'Mehr Zeilen passen nicht auf die Tafel.');
  lock(el.btnDelRow, S.rows.length <= 1 && 'Eine Zeile bleibt immer stehen.');
}
