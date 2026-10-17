// Meldet Melodie und Rhythmus beim Kern an. Beide nutzen dieselbe Tafel, jede mit eigenem Stand.
import { register } from '../core/shell.js';
import { beatsOf, startAt } from '../core/plan.js';
import { confirmTap } from '../core/ui.js';
import { NOTE_BY } from './config.js';
import { isNote, isBeat, sounds, dur, emptyRows, appendPos, playOrderRows } from './model.js';
import { S, persistBoard, useVariant } from './state.js';
import { loadBoard, stores } from './storage.js';
import { render } from './render.js';
import { markPlaying } from './board.js';
import { renderPalette, buildCounts } from './sidebar.js';
import { initControls } from './controls.js';
import { initBoardInput } from './input.js';
import { initTafelMenu, openTafelMenu } from './menu.js';
import * as act from './actions.js';
import { el } from './dom.js';

// Macht die Tafel des Bereichs v sichtbar. Die aktuelle Tafel ist schon gespeichert; Markierung und
// Rückgängig-Verlauf werden geparkt, die andere Tafel kommt aus dem Speicher.
function enter(v) {
  if (S.variant !== v) {
    S.parked[S.variant] = { sel: S.sel, hist: S.hist };
    useVariant(v);
    const d = loadBoard(v), p = S.parked[v];
    S.rows = d ? d.rows : emptyRows(v === 'rhy');
    S.name = d ? d.name : '';
    S.hist = p ? p.hist : [];
    S.sel = p && p.sel.r < S.rows.length ? p.sel : appendPos(S.rows);
  }
  S.insertMode = false; S.clean = false; S.countAt = null;
  render();
}

// Ablaufplan fürs Abspielen: Zeile für Zeile bis zur letzten Note; leere Plätze innerhalb einer Zeile sind Pausen
function plan() {
  const items = [];
  let last = -1, t = 0, end = 0;
  // Wiederholungen werden mitgespielt (playOrderRows)
  playOrderRows(S.rows).forEach(({ r, c }) => {
    const cell = S.rows[r][c];
    const sound = isNote(cell) ? 'bell' : isBeat(cell) ? 'clave' : '';
    items.push({ t, len: dur(cell), sound, f: isNote(cell) ? NOTE_BY[cell.n].f : 0, pos: { r, c } });
    t += dur(cell);
    if (sounds(cell)) { last = items.length - 1; end = t; }
  });
  // Zählschlag nach der ersten Taktart auf der Tafel; abgespielt wird ab der Markierung (dahinter nichts mehr: von vorn)
  const plan = { items: items.slice(0, last + 1), end, ...beatsOf((S.rows.find((row) => row.meter) || {}).meter || '') };
  const sel = S.sel;
  return startAt(plan, plan.items.findIndex((s) => s.pos.r > sel.r || (s.pos.r === sel.r && s.pos.c >= sel.c)));
}

const tools = {
  insert: act.toggleInsert,
  gap: act.closeGap,
  del: act.deleteCell,
  brk: act.lineBreak,
  done: act.toggleClean,
  undo: act.undo,
  addRow: act.addRow,
  // − Zeile (wenn in der Zeile Noten stehen) und Alles löschen muss man zweimal antippen
  delRow: (btn) => { if (act.lastRowHasNotes()) confirmTap(btn, 'Sicher? Nochmal', act.delRow); else act.delRow(); },
  clear: (btn) => confirmTap(btn, 'Sicher? Nochmal tippen', act.clearAll)
};

function area(id, label, panel, texts) {
  return {
    id, label, panel, board: el.grid, tools,
    enter: () => enter(id),
    plan,
    mark: markPlaying,
    songs: {
      store: stores[id],
      texts,
      name: () => S.name,
      data: () => S.rows,
      saved(n) { S.name = n; persistBoard(); },
      load: act.loadSong
    },
    menu: { open: openTafelMenu }
  };
}

// Verdrahtet die Tafel einmal und meldet beide Bereiche an
export function registerTafel() {
  buildCounts();
  renderPalette();
  initControls();
  initBoardInput();
  initTafelMenu();
  register(area('mel', 'Melodie', el.panelMel, { save: 'Melodie speichern', songs: 'Gespeicherte Melodien' }));
  register(area('rhy', 'Rhythmus', el.panelRhy, { save: 'Rhythmus speichern', songs: 'Gespeicherte Rhythmen' }));
}
