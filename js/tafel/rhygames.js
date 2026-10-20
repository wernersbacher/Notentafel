// Weitere Rhythmus-Spiele („Üben und Spielen“), mit denselben Einstellungen wie das Rhythmus-Echo:
//   Welcher war's?      Auf der Übungstafel stehen 2–4 gewürfelte Rhythmen, einer davon erklingt. Die Kinder tippen
//                       unten seine Nummer; ein falscher erklingt zum Vergleich.
//   Vom Blatt klatschen Ein Rhythmus steht auf der Tafel. „Mitklatschen“ zählt ein und gibt den Grundschlag, die Zeichen
//                       leuchten dabei mit, aber es klingt nichts; „Anhören“ spielt ihn zur Kontrolle.
import { makeRhythm } from './rhythms.js';
import { games, persistGames } from './games.js';
import { S } from './state.js';
import { render } from './render.js';
import { markPlaying } from './board.js';
import { rhythmRow, rowPlan, AGAIN_ICON } from './echo.js';
import { playNow, stopPlay, planMs } from '../core/player.js';
import { openGame, endGame, gameBtn, GAME_ICONS, startQuiz } from '../core/game.js';
import { delegate } from '../core/ui.js';
import { el } from './dom.js';

const quiet = () => {};
// n verschiedene Rhythmen (gibt es nicht so viele, z. B. 1 Takt 2/4 leicht, dann weniger)
function distinctRhythms(n) {
  const seen = new Set(), out = [];
  for (let t = 0; out.length < n && t < 60; t++) {
    const cells = makeRhythm(games.echo), key = JSON.stringify(cells);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cells);
  }
  return out;
}

/* ---------- Welcher war's? ---------- */
function whichQuiz() {
  const n = games.which.count;
  let ans = 0;
  // Antworten: die Nummern der Zeilen
  const keys = Array.from({ length: n }, (_, i) => ({ key: String(i), html: String(i + 1), label: 'Rhythmus ' + (i + 1) }));
  const play = (r, mark) => { const p = rowPlan(r); if (p) playNow(p, mark); };
  return {
    layout: 'words', keys,
    next() {
      stopPlay();
      S.rows = distinctRhythms(n).map((cells) => rhythmRow(cells, games.echo.meter));
      S.sel = { r: 0, c: 0 };
      ans = Math.floor(Math.random() * S.rows.length);
      render();
      play(ans, quiet); // ohne Leuchten, sonst wäre die Antwort zu sehen
      return { ok: new Set([String(ans)]) };
    },
    hear: () => play(ans, quiet),
    // Gelöst: der richtige Rhythmus erklingt, seine Zeichen leuchten mit; falsch: der getippte erklingt zum Vergleich
    solved: () => play(ans, markPlaying),
    wrong: (key) => { if (S.rows[+key]) play(+key, markPlaying); },
    wait: () => { const p = rowPlan(ans); return (p ? planMs(p) : 0) + 1400; },
    stop() { render(); }
  };
}

/* ---------- Vom Blatt klatschen ---------- */
// Vier Schläge
const CLAP_ICON = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 9v6M9.5 7v10M14.5 7v10M19.5 9v6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
function newSheet() {
  stopPlay();
  S.rows = [rhythmRow(makeRhythm(games.echo), games.echo.meter)];
  S.sel = { r: 0, c: 0 };
  render();
}
// Mitklatschen: Einzählen und deutlicher Grundschlag, die Zeichen leuchten mit, der Rhythmus selbst klingt nicht
function clapAlong() {
  const p = rowPlan(0);
  if (p) playNow({ ...p, items: p.items.map((s) => ({ ...s, sound: '' })), silent: true, countIn: true, metro: true, pulse: false }, markPlaying);
}
function readTap(b) {
  const act = b.dataset.act;
  if (act === 'main') newSheet();
  else if (act === 'clap') clapAlong();
  else if (act === 'hear') { const p = rowPlan(0); if (p) playNow(p, markPlaying); }
  else if (act === 'end') endGame();
}
function startRead() {
  openGame('echo', gameBtn('clap', CLAP_ICON, 'Mitklatschen') + gameBtn('hear', AGAIN_ICON, 'Anhören') +
    gameBtn('main', GAME_ICONS.dice, 'Neuer Rhythmus', 'main big') + gameBtn('end', GAME_ICONS.close, 'Ende'), { tap: readTap, stop: stopPlay });
  newSheet();
}

/* ---------- Leiste rechts ---------- */
function renderSide() {
  el.whichCount.querySelectorAll('[data-v]').forEach((b) => {
    const on = +b.dataset.v === games.which.count;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
export function initRhyGames() {
  delegate(el.whichCount, '[data-v]', (b) => { games.which.count = +b.dataset.v; persistGames(); renderSide(); });
  el.whichGo.addEventListener('click', () => startQuiz(whichQuiz()));
  el.readGo.addEventListener('click', startRead);
  renderSide();
}
