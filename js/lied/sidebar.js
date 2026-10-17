// Leiste des Lieds: Stammtöne, Oktave, Vorzeichen, Notenwerte, Pause, Bogen und das Feld „Takt …“
import { STEPS, VALUES, METERS, isNote, canDot, pickupsFor } from './model.js';
import { noteIcon, dotIcon, restIcon } from './glyphs.js';
import { L, opts } from './state.js';
import { el } from './dom.js';

const VALUE_NAMES = { 1: 'Ganze', 2: 'Halbe', 4: 'Viertel', 8: 'Achtel', 16: 'Sechzehntel' };
// Auftakte in Ticks als Notenwert (mit Punkt) für Symbol und Namen
const PICKUP_NOTES = { 4: [8, 0], 8: [4, 0], 12: [4, 1], 16: [2, 0], 24: [2, 1] };
const valueName = ([v, d]) => (d ? 'punktierte ' : '') + VALUE_NAMES[v];

const pressed = (btn, on) => {
  btn.classList.toggle('on', on);
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
};
const meterHTML = (m) => {
  const [top, bottom] = m.split('/');
  return '<span class="mtr"><span>' + top + '</span><span>' + bottom + '</span></span>';
};

// Einmal beim Start: Knöpfe für die Stammtöne und die Notenwerte
export function buildPanel() {
  el.liedSteps.innerHTML = STEPS.map((s, i) =>
    '<button type="button" class="btn step" data-step="' + i + '" aria-label="' + s.toUpperCase() + '">' + s.toUpperCase() + '</button>'
  ).join('');
  el.liedValues.innerHTML = VALUES.map((v) =>
    '<button type="button" class="btn" data-v="' + v + '" title="' + VALUE_NAMES[v] + '" aria-label="' + VALUE_NAMES[v] + '">' + noteIcon(v) + '</button>'
  ).join('') + '<button type="button" class="btn" data-dot title="Punkt (anderthalbmal so lang)" aria-label="Punkt">' + dotIcon() + '</button>';
  el.liedRest.insertAdjacentHTML('afterbegin', '<span class="big">' + restIcon() + '</span>');
}

// Inhalt des Felds „Takt …“: Taktart, Auftakt, Takt- und Schlussstrich vor der Markierung, Automatik für Taktstriche und Zählzeiten
export function fillTaktPop() {
  const prev = L.song.ev[L.sel - 1], bar = prev ? prev.bar : 0, pk = L.song.pickup;
  const label = (t) => '<p class="poplabel">' + t + '</p>';
  el.liedTaktPop.innerHTML = label('Taktart') + [''].concat(METERS).map((m) =>
    '<button type="button" class="btn' + (m === L.song.meter ? ' on' : '') + '" data-m="' + m + '" aria-label="' + (m ? 'Taktart ' + m : 'ohne Taktart') + '">' +
    (m ? meterHTML(m) : '<span class="small">ohne</span>') + '</button>'
  ).join('') +
    label('Auftakt') + '<button type="button" class="btn' + (!pk ? ' on' : '') + '" data-pk="0" aria-label="ohne Auftakt"><span class="small">ohne</span></button>' +
    pickupsFor(L.song.meter).map((t) =>
      '<button type="button" class="btn' + (t === pk ? ' on' : '') + '" data-pk="' + t + '" aria-label="Auftakt: ' + valueName(PICKUP_NOTES[t]) + '">' +
      noteIcon(PICKUP_NOTES[t][0], PICKUP_NOTES[t][1]) + '</button>'
    ).join('') +
    label('Striche und Zählzeiten') + '<button type="button" class="btn wide' + (bar === 1 && !opts.autoBar ? ' on' : '') + '" data-bar="1"' + (!prev || opts.autoBar ? ' disabled' : '') + '>Taktstrich</button>' +
    '<button type="button" class="btn wide' + (bar === 2 ? ' on' : '') + '" data-bar="2"' + (!prev ? ' disabled' : '') + '>Schlussstrich</button>' +
    '<button type="button" class="btn wide' + (opts.autoBar ? ' on' : '') + '" data-auto aria-pressed="' + opts.autoBar + '">Taktstriche automatisch</button>' +
    '<button type="button" class="btn wide' + (opts.autoZ ? ' on' : '') + '" data-autoz aria-pressed="' + opts.autoZ + '">Zählzeiten automatisch</button>';
}

export function renderSidebar() {
  const ev = L.song.ev, cur = ev[L.sel];
  const t = L.last != null && isNote(ev[L.last]) ? ev[L.last] : isNote(cur) ? cur : null;
  [el.liedDown, el.liedUp, el.liedTie].forEach((b) => { b.disabled = !t; });
  pressed(el.liedTie, !!t && !!t.tie);
  [[el.liedSharp, 1], [el.liedFlat, -1], [el.liedNat, 0]].forEach(([b, a]) => {
    b.disabled = !t;
    pressed(b, !!t && t.acc === a);
  });
  el.liedValues.querySelectorAll('[data-v]').forEach((b) => pressed(b, +b.dataset.v === L.pen.v));
  const dotBtn = el.liedValues.querySelector('[data-dot]');
  pressed(dotBtn, !!L.pen.dot);
  dotBtn.disabled = !canDot(L.pen.v);
  el.liedMeterShow.innerHTML = L.song.meter ? meterHTML(L.song.meter) : '<span class="mtr off"><span>?</span><span>?</span></span>';
  if (!el.liedTaktPop.hidden) fillTaktPop();

  // Gemeinsame Knöpfe
  pressed(el.btnIns, L.insertMode);
  el.delLabel.textContent = L.insertMode ? 'Lücke zu' : 'entfernen';
  el.btnDel.disabled = !cur;
  el.btnBreak.disabled = L.sel === 0;
  pressed(el.btnDone, L.clean);
  el.btnUndo.disabled = L.hist.length === 0;
}
