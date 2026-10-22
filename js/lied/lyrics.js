// Liedtext: Silben an Noten schreiben und von Note zu Note gehen.
import { MAX_LY, isNote, tiedFrom } from './model.js';
import { L, opts, persistOpts, persistSong, snap } from './state.js';
import { render, renderSheet } from './render.js';
import { ev, cur } from './common.js';

/* ---------- Liedtext ---------- */
// Note, die eine Silbe bekommen kann: die markierte, wenn sie nicht nur eine übergebundene Fortsetzung ist
const lyricTarget = () => { const e = cur(); return isNote(e) && !tiedFrom(ev()[L.sel - 1], e) ? e : null; };
// Beim Schreiben einer Silbe wird nur einmal (beim Hineintippen ins Feld) für „Rückgängig“ gemerkt
// Ist der Liedtext ausgeblendet, kommt er dabei wieder, damit man sieht, was man schreibt
export function beginLyric() {
  if (!lyricTarget()) return;
  snap();
  if (!opts.lyrics) { opts.lyrics = true; persistOpts(); render(); }
}
export function setLyric(text) {
  const e = lyricTarget();
  if (!e) return;
  const t = text.trim().slice(0, MAX_LY);
  if (t) e.ly = t; else delete e.ly;
  persistSong();
  renderSheet();
}
// Markierung zur nächsten Note mit eigenem Ton (Pausen und übergebundene Fortsetzungen überspringen)
export function nextLyric() {
  for (let i = L.sel + 1; i < ev().length; i++) {
    if (isNote(ev()[i]) && !tiedFrom(ev()[i - 1], ev()[i])) { L.sel = i; L.last = null; render(); return true; }
  }
  return false;
}
