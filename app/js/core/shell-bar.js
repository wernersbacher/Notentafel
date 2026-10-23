// Leiste der Shell: Reiter der Bereiche, Umschalter „schreiben“ / „Üben und Spielen“, gemeinsame Werkzeugknöpfe,
// Verdecken, Abspielen und die obere Leiste. shell.js reicht Registry und Wechsel herein und ruft initBar beim Start.
import { settings, persistSettings } from './settings.js';
import { togglePlay } from './player.js';
import { el } from './dom.js';
import { shellState } from './shell-state.js';

// Zuordnung der Werkzeuge eines Bereichs zu ihren Knöpfen; show() in shell.js blendet danach aus
export const TOOL_BTNS = { insert: 'btnIns', gap: 'btnGap', del: 'btnDel', brk: 'btnBreak', undo: 'btnUndo', redo: 'btnRedo', addRow: 'btnAddRow', delRow: 'btnDelRow', clear: 'btnClear' };

export function initBar(areas, setArea, setPlay) {
  el.tabs.innerHTML = areas.map((a) =>
    '<button type="button" class="tab" role="tab" id="tab-' + a.id + '" data-area="' + a.id + '" aria-controls="' + a.panel.id + '">' + a.label + '</button>'
  ).join('');
  el.tabs.style.setProperty('--n', areas.length);
  el.tabs.addEventListener('click', (e) => {
    const t = e.target.closest('.tab');
    if (t) setArea(t.dataset.area);
  });
  el.parts.addEventListener('click', (e) => {
    const p = e.target.closest('.part');
    if (p) setPlay(p.dataset.part === 'play');
  });

  for (const k in TOOL_BTNS) {
    const btn = el[TOOL_BTNS[k]];
    btn.addEventListener('click', () => { const f = shellState.area.tools && shellState.area.tools[k]; if (f) f(btn); });
  }
  el.btnPlay.addEventListener('click', () => togglePlay(shellState.area.plan, shellState.area.mark));
  // Verdecken: dieselben Knöpfe in der Leiste jedes Bereichs
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-cover]');
    const f = b && shellState.area.cover && shellState.area.cover[b.dataset.cover];
    if (f) f();
  });
  // Leiste oben mit den Tafeln ein- und ausklappen (bleibt gemerkt)
  const setTop = (hide) => {
    document.querySelector('.app').classList.toggle('notop', hide);
    el.btnTopShow.hidden = !hide;
    settings.topHidden = hide;
    persistSettings();
  };
  el.btnTopHide.addEventListener('click', () => setTop(true));
  el.btnTopShow.addEventListener('click', () => setTop(false));
  if (settings.topHidden) setTop(true);
}
