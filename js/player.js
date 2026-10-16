// Abspielen der Tafel
import { NOTE_BY } from './config.js';
import { isNote, isBeat, sounds, dur } from './model.js';
import { S, settings } from './state.js';
import { audioCtx, bell, clave } from './audio.js';
import { markPlaying } from './board.js';
import { ICONS } from './symbols.js';
import { toast } from './ui.js';
import { el } from './dom.js';

let play = null; // { out, timers, cur } während des Abspielens

// Der Platz, der gerade klingt (damit er nach einem Neuzeichnen hervorgehoben bleibt)
export const playingPos = () => play && play.cur;

function showButton(playing) {
  el.btnPlay.innerHTML = playing ? ICONS.stop + 'Stopp' : ICONS.play + 'Abspielen';
  el.btnPlay.classList.toggle('on', playing);
}

// Spielt die Tafel Zeile für Zeile bis zur letzten Note; leere Plätze innerhalb einer Zeile sind Pausen
function startPlay() {
  // t = Startzeit in Schlägen; leere Plätze zählen einen Schlag
  const seq = [];
  let last = -1, t = 0, end = 0;
  S.rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      seq.push({ cell, r, c, t });
      t += dur(cell);
      if (sounds(cell)) { last = seq.length - 1; end = t; }
    });
  });
  if (last < 0) { toast('Noch keine Töne auf der Tafel.', true); return; }
  const ctx = audioCtx();
  if (!ctx) { toast('Abspielen wird von diesem Browser nicht unterstützt.', true); return; }
  const out = ctx.createGain();
  out.gain.value = 0.6;
  out.connect(ctx.destination);
  const step = 60 / settings.tempo, t0 = ctx.currentTime + 0.08;
  // Verzögerung bis Schlag t in Millisekunden
  const delay = (beats) => (t0 - ctx.currentTime + beats * step) * 1000;
  play = { out, timers: [], cur: null };
  seq.slice(0, last + 1).forEach((s) => {
    if (isNote(s.cell)) bell(out, NOTE_BY[s.cell.n].f, t0 + s.t * step, dur(s.cell) * step * 0.95);
    else if (isBeat(s.cell)) clave(out, t0 + s.t * step);
    const pos = { r: s.r, c: s.c };
    play.timers.push(setTimeout(() => { play.cur = pos; markPlaying(pos); }, delay(s.t)));
  });
  play.timers.push(setTimeout(stopPlay, delay(end)));
  showButton(true);
}

export function stopPlay() {
  if (!play) return;
  play.timers.forEach(clearTimeout);
  try { play.out.disconnect(); } catch (e) { /* schon getrennt */ }
  play = null;
  markPlaying(null);
  showButton(false);
}

export const togglePlay = () => (play ? stopPlay() : startPlay());
export const initPlayer = () => showButton(false);
