// Rhythmus-Echo (Rhythmus, „Üben und Spielen“): Die Tafel würfelt einen Rhythmus, legt ihn verdeckt in eine neue Zeile
// und spielt ihn vor. Die Kinder klatschen nach, dann wird er aufgedeckt. Die Rhythmen sammeln sich auf einer eigenen
// Tafel „Rhythmus-Echo“; die bisherige Tafel wandert beim ersten Mal unter „Zuletzt ersetzt“.
import { MAX_ROWS } from './config.js';
import { filled, isBeat, dur, newRow, hasNotes } from './model.js';
import { meterOf } from './theory.js';
import { makeRhythm, meterParts } from './rhythms.js';
import { games, persistGames } from './games.js';
import { S, snap, stashBoard } from './state.js';
import { commit } from './render.js';
import { markPlaying } from './board.js';
import { revealRow } from './actions.js';
import { playNow, stopPlay } from '../core/player.js';
import { beatsOf } from '../core/plan.js';
import { openGame, endGame, gameOn, gameBtn, GAME_ICONS } from '../core/game.js';
import { toast, delegate } from '../core/ui.js';
import { blockSum } from '../core/blocks.js';
import { el } from './dom.js';

export const ECHO_NAME = 'Rhythmus-Echo';
const ICONS = {
  dice: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="8.5" cy="8.5" r="1.7" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.7" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.7" fill="currentColor"/></svg>',
  again: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4.5H9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
let row = -1; // Zeile des zuletzt gewürfelten Rhythmus

const echoRow = () => S.rows[row];
const covered = () => !!(echoRow() && echoRow().cover);

/* ---------- Würfeln, Vorspielen, Aufdecken ---------- */
function newRhythm() {
  stopPlay();
  // Taktart der markierten Zeile (beim nächsten Echo also die des letzten), ohne Taktart 4/4
  const meter = meterParts(meterOf(S.rows, S.sel.r)).meter;
  const cells = makeRhythm({ meter, ...games.echo });
  snap();
  if (S.name !== ECHO_NAME) {
    if (hasNotes(S.rows)) {
      stashBoard();
      toast('Neue Tafel fürs Rhythmus-Echo. Die bisherige liegt in der Liedersammlung unter „Zuletzt ersetzt“.');
    }
    S.rows = [];
    S.name = ECHO_NAME;
  }
  while (S.rows.length && !S.rows[S.rows.length - 1].some(Boolean)) S.rows.pop();
  // Ist die Tafel voll, fällt der älteste Rhythmus weg
  if (S.rows.length >= MAX_ROWS) S.rows.splice(0, S.rows.length - MAX_ROWS + 1);
  S.rows.forEach((x) => { delete x.cover; delete x.coverFrom; });
  // Jede Zeile mit Taktart, Taktstrichen (falls sie nicht automatisch kommen) und Schlussstrich
  const r = newRow(true), len = meterParts(meter).len;
  r.meter = meter;
  let pos = 0;
  cells.forEach((c) => {
    if (pos > 0 && pos % len === 0) c.bar = 1;
    pos += c.d;
    r.push(c);
  });
  r.push({ bar: 2 });
  r.cover = r.coverFrom = true;
  S.rows.push(r);
  row = S.rows.length - 1;
  S.sel = { r: row, c: 0 };
  commit();
  playEcho();
  updateBar();
}
// Unter dem Tuch blinkt es bei jedem Schlag kurz, aufgedeckt leuchtet das klingende Zeichen wie beim Abspielen
function pulse(pos) {
  const cloth = el.grid.querySelector('.cloth'), cell = pos && S.rows[pos.r] && S.rows[pos.r][pos.c];
  if (!cloth || !isBeat(cell)) return;
  cloth.classList.remove('beat');
  void cloth.offsetWidth;
  cloth.classList.add('beat');
}
function playEcho() {
  const x = echoRow();
  if (!x || !x.some(filled)) { toast('Erst mit „Neuer Rhythmus“ einen Rhythmus würfeln.', true); return; }
  const items = [];
  let t = 0;
  x.forEach((cell, c) => {
    if (!filled(cell)) return;
    items.push({ t, len: dur(cell), sound: isBeat(cell) ? 'clave' : '', f: 0, pos: { r: row, c } });
    t += dur(cell);
  });
  playNow({ items, end: t, ...beatsOf(meterOf(S.rows, row)) }, covered() ? pulse : markPlaying);
}
function reveal() {
  if (!covered()) return;
  stopPlay();
  revealRow();
  updateBar();
}

/* ---------- Leiste auf der Tafel ---------- */
function updateBar() {
  const b = el.gameBar.querySelector('.gbtn[data-act="show"]');
  if (gameOn('echo') && b) b.disabled = !covered();
}
function tap(b) {
  const act = b.dataset.act;
  if (act === 'new') newRhythm();
  else if (act === 'again') playEcho();
  else if (act === 'show') reveal();
  else if (act === 'end') endGame();
}
function startEcho() {
  if (!gameOn('echo')) {
    openGame('echo', gameBtn('new', ICONS.dice, 'Neuer Rhythmus', 'main') + gameBtn('again', ICONS.again, 'Nochmal hören') +
      gameBtn('show', GAME_ICONS.eye, 'Aufdecken') + gameBtn('end', GAME_ICONS.close, 'Ende'), { tap, stop: stopPlay });
  }
  newRhythm();
}

/* ---------- Leiste rechts ---------- */
const OPTS = [['echoBars', 'bars'], ['echoNotes', 'notes'], ['echoRests', 'rests']];
const LEVEL = ['ohne Pausen', 'leicht', 'mittel', 'schwer'];
function renderEchoSide() {
  OPTS.forEach(([id, k]) => el[id].querySelectorAll('[data-v]').forEach((b) => {
    const on = +b.dataset.v === games.echo[k];
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }));
  const e = games.echo;
  blockSum('rhyGame', e.bars + (e.bars > 1 ? ' Takte' : ' Takt') + ' · ' + LEVEL[e.notes] + (e.rests ? ' · Pausen ' + LEVEL[e.rests] : ''));
}
export function initEcho() {
  OPTS.forEach(([id, k]) => delegate(el[id], '[data-v]', (b) => {
    games.echo[k] = +b.dataset.v;
    persistGames();
    renderEchoSide();
  }));
  el.echoGo.addEventListener('click', startEcho);
  // Ein Tipp aufs Tuch deckt auch auf: dann ist „Aufdecken“ erledigt
  el.grid.addEventListener('click', () => setTimeout(updateBar, 0));
  renderEchoSide();
}
