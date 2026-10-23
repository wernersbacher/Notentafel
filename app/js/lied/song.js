// Ganzes Lied: Rückgängig, leeren, an die Melodie übergeben, empfangen und laden.
import { toast } from '../core/ui.js';
import { handOver } from '../core/shell.js';
import { isNote, emptySong, songToMelody, cleanSong, splitAll } from './model.js';
import { L, opts, persistOpts, snap, restore, redo as redoStep, stashSong } from './state.js';
import { commit, scrollTop } from './render.js';
import { ev } from './common.js';

/* ---------- Ganzes Lied ---------- */
export function undo() {
  if (restore()) commit();
}
export function redo() {
  if (redoStep()) commit();
}
// Neues, leeres Lied in der Grundeinstellung: 4/4, C-Dur, ohne Auftakt
export function clearAll() {
  snap();
  stashSong();
  L.song = emptySong();
  L.name = '';
  L.sel = 0;
  L.last = null;
  commit();
}
// Übergibt das Lied als Melodie an den Bereich Melodie (der Kern wechselt dorthin)
export function sendToMelody() {
  if (!ev().some(isNote)) { toast('Im Lied steht noch keine Note.', true); return; }
  const m = songToMelody(L.song, opts.autoBar);
  handOver('mel', { name: L.name, rows: m.rows, lines: m.lines, skipped: m.skipped, cut: m.cut });
}
// Nimmt ein Lied aus Melodie oder Rhythmus an ({ name, song, colors }); das bisherige wandert in den Autosave-Platz.
// Was über einen Taktstrich ragt, wird aufgeteilt; aus Melodie kommen die Noten farbig.
export function receiveSong({ name, song, colors }) {
  const s = cleanSong(song);
  if (!s) return;
  snap();
  stashSong();
  L.song = opts.autoBar ? splitAll(s) : s;
  L.name = name || '';
  L.sel = 0;
  L.last = null;
  if (colors) { opts.colors = true; persistOpts(); }
  commit();
  scrollTop();
  toast('Ins Notenblatt übernommen. Das vorherige Lied liegt in der Liedersammlung unter „Zuletzt ersetzt“.');
}
// Lädt ein Lied (oder den Autosave). Das bisherige wandert in den Autosave-Platz.
export function loadSong(s) {
  snap();
  stashSong();
  L.song = JSON.parse(JSON.stringify(s.song));
  L.name = s.name;
  L.sel = 0; // am Anfang, damit das Lied mit seinem Schlussstrich abgeschlossen dasteht (Weiterschreiben: hinter das Ende tippen)
  L.last = null;
  commit();
  scrollTop();
  toast('„' + (s.name || 'Ohne Namen') + '“ geladen. Das vorherige Lied liegt in der Liedersammlung unter „Zuletzt ersetzt“.');
}
