// Leiste des Lieds: Taktart und Auftakt, Notenwerte, Pausen, Töne (c'–h'', die übrigen ausklappbar), Vorzeichen, Anzeige, Bogen und Striche
import { STEPS, OCT_MIN, OCT_MAX, VALUES, METERS, isNote, canDot, pickupsFor, makePitch, pitchLabel, keyName, tiedFrom, KEY_MIN, KEY_MAX } from './model.js';
import { noteIcon, dotIcon, restIcon } from './glyphs.js';
import { L, opts } from './state.js';
import { el } from './dom.js';
import { blockSum } from '../core/blocks.js';

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

// Knöpfe für die Töne, eine Reihe je Oktave, die höchste oben: sonst c'–h'', ausgeklappt c–h'''
export function buildSteps() {
  const lo = opts.allTones ? OCT_MIN : 1, hi = opts.allTones ? OCT_MAX : 2;
  let html = '';
  for (let o = hi; o >= lo; o--) {
    for (let s = 0; s < STEPS.length; s++) {
      const p = makePitch(s, o);
      html += '<button type="button" class="btn step" data-p="' + p + '">' + pitchLabel(p) + '</button>';
    }
  }
  el.liedSteps.innerHTML = html;
  el.liedMore.textContent = opts.allTones ? "▴ weniger" : "▾ alle Töne";
  el.liedMore.title = opts.allTones ? "Nur c' bis h'' zeigen" : "Auch c bis h und c''' bis h''' zeigen";
  el.liedMore.setAttribute('aria-expanded', opts.allTones ? 'true' : 'false');
}

// Einmal beim Start: Taktarten, Töne, Notenwerte und Pausen
export function buildPanel() {
  buildSteps();
  el.liedMeters.innerHTML = [''].concat(METERS).map((m) =>
    '<button type="button" class="btn" data-m="' + m + '" aria-label="' + (m ? 'Taktart ' + m : 'ohne Taktart') + '">' +
    (m ? meterHTML(m) : '<span class="small">ohne</span>') + '</button>'
  ).join('');
  el.liedValues.innerHTML = VALUES.map((v) =>
    '<button type="button" class="btn" data-v="' + v + '" title="' + VALUE_NAMES[v] + '" aria-label="' + VALUE_NAMES[v] + '">' + noteIcon(v) + '</button>'
  ).join('') + '<button type="button" class="btn" data-dot title="Punkt (anderthalbmal so lang)" aria-label="Punkt">' + dotIcon() + '</button>';
  el.liedRests.innerHTML = VALUES.map((v) =>
    '<button type="button" class="btn" data-rv="' + v + '" title="' + VALUE_NAMES[v] + 'pause" aria-label="' + VALUE_NAMES[v] + 'pause">' + restIcon(v) + '</button>'
  ).join('');
}

// Auftakte, die zur Taktart passen (ohne Taktart keiner); der gewählte ist gedrückt
function renderPickups() {
  const pk = L.song.pickup, list = pickupsFor(L.song.meter);
  const btn = (t, inner, label) => '<button type="button" class="btn' + (t === pk ? ' on' : '') + '" data-pk="' + t + '" aria-pressed="' + (t === pk) + '" aria-label="' + label + '">' + inner + '</button>';
  el.liedPickups.innerHTML = btn(0, '<span class="small">ohne</span>', 'ohne Auftakt') +
    list.map((t) => btn(t, noteIcon(PICKUP_NOTES[t][0], PICKUP_NOTES[t][1]), 'Auftakt: ' + valueName(PICKUP_NOTES[t]))).join('');
}

export function renderSidebar() {
  const ev = L.song.ev, cur = ev[L.sel];
  const t = L.last != null && isNote(ev[L.last]) ? ev[L.last] : isNote(cur) ? cur : null;
  el.liedTie.disabled = !t;
  pressed(el.liedTie, !!t && !!t.tie);
  [[el.liedSharp, 1], [el.liedFlat, -1], [el.liedNat, 0]].forEach(([b, a]) => {
    b.disabled = !t;
    pressed(b, !!t && t.acc === a);
  });
  el.liedValues.querySelectorAll('[data-v]').forEach((b) => pressed(b, +b.dataset.v === L.pen.v));
  const dotBtn = el.liedValues.querySelector('[data-dot]');
  pressed(dotBtn, !!L.pen.dot);
  dotBtn.disabled = !canDot(L.pen.v);
  pressed(el.liedShowNames, opts.names);
  pressed(el.liedShowColors, opts.colors);
  pressed(el.liedShowCounts, opts.autoZ);
  // Takt- und Schlussstrich hinter dem Zeichen vor der Markierung; Taktstriche von Hand nur ohne Automatik
  const prev = ev[L.sel - 1], bar = prev ? prev.bar : 0;
  el.liedBar.disabled = !prev || opts.autoBar;
  pressed(el.liedBar, bar === 1 && !opts.autoBar);
  el.liedEnd.disabled = !prev;
  pressed(el.liedEnd, bar === 2);
  el.liedRepStart.disabled = el.liedRepEnd.disabled = !prev;
  pressed(el.liedRepStart, bar === 4 || bar === 5);
  pressed(el.liedRepEnd, bar === 3 || bar === 5);
  el.liedVolta.disabled = !(bar === 3 || bar === 5);
  pressed(el.liedVolta, !!(prev && prev.volta));
  el.liedMeters.querySelectorAll('[data-m]').forEach((b) => pressed(b, b.dataset.m === L.song.meter));
  renderPickups();
  // Liedtext der markierten Note (beim Schreiben nicht überschreiben)
  const lt = isNote(cur) && !tiedFrom(ev[L.sel - 1], cur) ? cur : null;
  el.liedLyric.disabled = !lt;
  el.liedLyricNext.disabled = !ev.slice(L.sel + 1).some(isNote);
  el.liedLyric.placeholder = lt ? 'Silbe, z. B. Al-' : 'erst eine Note antippen';
  if (document.activeElement !== el.liedLyric) el.liedLyric.value = lt && lt.ly ? lt.ly : '';
  const k = L.song.key || 0;
  el.liedKeyName.textContent = keyName(k) + (k ? ' · ' + Math.abs(k) + (k > 0 ? '♯' : '♭') : '');
  el.liedKeyDown.disabled = k <= KEY_MIN;
  el.liedKeyUp.disabled = k >= KEY_MAX;
  blockSum('liedSetup', (L.song.meter || 'ohne Taktart') + ' · ' + keyName(k) + (L.song.pickup ? ' · Auftakt' : ''));

  // Gemeinsame Knöpfe
  pressed(el.btnIns, L.insertMode);
  el.btnDel.disabled = !cur;
  el.btnGap.disabled = !cur && L.sel === 0;
  el.btnBreak.disabled = L.sel === 0;
  el.btnUndo.disabled = L.hist.length === 0;
}
