// Meldet Melodie und Rhythmus beim Kern an. Beide nutzen dieselbe Tafel, jede mit eigenem Stand.
import { register } from '../core/shell.js';
import { beatsOf, startAt, cutAt } from '../core/plan.js';
import { confirmTap } from '../core/ui.js';
import { NOTE_BY } from './config.js';
import { isNote, isBeat, sounds, dur, emptyRows, appendPos, playOrderRows } from './model.js';
import { S, persistBoard, useVariant, startPractice, endPractice } from './state.js';
import { loadBoard, stores } from './storage.js';
import { render } from './render.js';
import { markPlaying } from './board.js';
import { renderPalette, buildCounts } from './sidebar.js';
import { initControls } from './controls.js';
import { initBoardInput } from './input.js';
import { initTafelMenu, openTafelMenu } from './menu.js';
import { initEcho } from './echo.js';
import { initMelQuiz } from './quiz.js';
import { initRhyGames } from './rhygames.js';
import { initMelGames } from './melgames.js';
import { endGame } from '../core/game.js';
import * as act from './actions.js';
import { el } from './dom.js';

// Holt die Tafel des Bereichs v. Die aktuelle Tafel ist schon gespeichert; Markierung und
// Rückgängig-Verlauf werden geparkt, die andere Tafel kommt aus dem Speicher.
function useBoard(v) {
  if (S.variant === v) return;
  S.parked[S.variant] = { sel: S.sel, hist: S.hist };
  useVariant(v);
  const d = loadBoard(v), p = S.parked[v];
  S.rows = d ? d.rows : emptyRows(v === 'rhy');
  S.name = d ? d.name : '';
  S.hist = p ? p.hist : [];
  S.sel = p && p.sel.r < S.rows.length ? p.sel : appendPos(S.rows);
}
// Macht die Tafel des Bereichs v sichtbar
function enter(v) {
  useBoard(v);
  S.insertMode = false; S.countAt = null;
  render();
}

// Ablaufplan fürs Abspielen: Zeile für Zeile bis zur letzten Note; leere Plätze innerhalb einer Zeile sind Pausen
function plan() {
  const items = [];
  let last = -1, t = 0, end = 0;
  // Wiederholungen werden mitgespielt (playOrderRows), eingeklappte Zeilen nicht
  playOrderRows(S.rows).forEach(({ r, c }) => {
    if (S.rows[r].fold) return;
    const cell = S.rows[r][c];
    const sound = isNote(cell) ? 'bell' : isBeat(cell) ? 'clave' : '';
    items.push({ t, len: dur(cell), sound, f: isNote(cell) ? NOTE_BY[cell.n].f : 0, pos: { r, c } });
    t += dur(cell);
    if (sounds(cell)) { last = items.length - 1; end = t; }
  });
  // Zählschlag nach der ersten Taktart auf der Tafel; abgespielt wird ab der Markierung (dahinter nichts mehr: von vorn)
  let plan = { items: items.slice(0, last + 1), end, ...beatsOf((S.rows.find((row) => row.meter) || {}).meter || '') };
  // Was unter dem Tuch liegt, klingt noch nicht
  const k = act.coverRow();
  if (k >= 0) plan = cutAt(plan, (s) => s.pos.r >= k);
  const sel = S.sel;
  return startAt(plan, plan.items.findIndex((s) => s.pos.r > sel.r || (s.pos.r === sel.r && s.pos.c >= sel.c)));
}

const tools = {
  insert: act.toggleInsert,
  gap: act.closeGap,
  del: act.deleteCell,
  brk: act.lineBreak,
  undo: act.undo,
  addRow: act.addRow,
  // − Zeile (wenn in der Zeile Noten stehen) und Alles löschen muss man zweimal antippen
  delRow: (btn) => { if (act.lastRowHasNotes()) confirmTap(btn, 'Sicher? Nochmal', act.delRow); else act.delRow(); },
  clear: (btn) => confirmTap(btn, 'Sicher? Nochmal tippen', act.clearAll)
};

function area(id, label, panel, write, texts) {
  return {
    id, label, panel, board: el.grid, tools, write,
    enter: () => enter(id),
    // Rhythmus-Echo und Tonnamen-Quiz gehören zu ihrer Tafel und enden beim Wechsel
    leave: endGame,
    // Üben und Spielen: eine neue Übungstafel für diesen Bereich, die geschriebene wartet so lange
    play: { enter() { useBoard(id); startPractice(); }, leave: endPractice },
    receive: act.receiveRows,
    plan,
    mark: markPlaying,
    cover: { from: act.coverFrom, card: act.toggleCard, reset: act.resetCover, clear: act.clearCover },
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
  initEcho();
  initMelQuiz();
  initRhyGames();
  initMelGames();
  // Reihenfolge der Reiter als Lernweg: erst Rhythmus, dann Farbnoten (danach das Notenblatt)
  register(area('rhy', 'Rhythmus', el.panelRhy, 'Rhythmus schreiben', { save: 'Rhythmus speichern', songs: 'Gespeicherte Rhythmen' }));
  register(area('mel', 'Farbnoten', el.panelMel, 'Melodie schreiben', { save: 'Melodie speichern', songs: 'Gespeicherte Melodien' }));
}
