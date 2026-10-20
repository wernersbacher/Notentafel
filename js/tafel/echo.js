// Rhythmus-Echo (Rhythmus, „Üben und Spielen“): Die Tafel würfelt einen Rhythmus, legt ihn verdeckt in eine neue Zeile
// und spielt ihn vor. Die Kinder klatschen nach, dann wird er aufgelöst. Bis dahin steht in der Zeile nur die leere
// Notenlinie mit Taktart und Taktstrichen (row.hide, siehe board.js). Die Rhythmen sammeln sich auf einer eigenen
// Tafel „Rhythmus-Echo“; die bisherige Tafel wandert beim ersten Mal unter „Zuletzt ersetzt“.
import { MAX_ROWS } from './config.js';
import { filled, isBeat, dur, newRow, hasNotes } from './model.js';
import { meterOf } from './theory.js';
import { makeRhythm, meterParts } from './rhythms.js';
import { games, persistGames } from './games.js';
import { S, snap, stashBoard } from './state.js';
import { commit } from './render.js';
import { markPlaying } from './board.js';
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
const covered = () => !!(echoRow() && echoRow().hide);

/* ---------- Würfeln, Vorspielen, Auflösen ---------- */
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
  S.rows.forEach((x) => { delete x.cover; delete x.coverFrom; delete x.hide; });
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
  r.hide = true;
  S.rows.push(r);
  row = S.rows.length - 1;
  S.sel = { r: row, c: 0 };
  commit();
  playEcho();
  updateBar();
}
// Solange der Rhythmus nicht aufgelöst ist, blinkt seine leere Zeile bei jedem Schlag kurz, aufgelöst leuchtet das
// klingende Zeichen wie beim Abspielen
function pulse(pos) {
  const line = el.grid.querySelector('.row.blank:nth-child(' + (row + 1) + ')'), cell = pos && S.rows[pos.r] && S.rows[pos.r][pos.c];
  if (!line || !isBeat(cell)) return;
  line.classList.remove('beat');
  void line.offsetWidth;
  line.classList.add('beat');
}
function playEcho() {
  const x = echoRow();
  if (!x || !x.some(filled)) { toast('Erst mit „Neuer Rhythmus“ einen Rhythmus würfeln.', true); return; }
  const items = [];
  let t = 0;
  x.forEach((cell, c) => {
    if (!filled(cell)) return;
    items.push({ t, len: dur(cell), sound: isBeat(cell) ? 'drum' : '', f: 0, pos: { r: row, c } });
    t += dur(cell);
  });
  playNow({ items, end: t, pulse: games.echo.pulse, ...beatsOf(meterOf(S.rows, row)) }, covered() ? pulse : markPlaying);
}
function reveal() {
  if (!covered()) return;
  stopPlay();
  snap();
  delete echoRow().hide;
  S.sel = { r: row, c: 0 };
  commit();
  updateBar();
}

/* ---------- Leiste auf der Tafel ---------- */
// Unten in der Mitte: Nochmal hören, der große Knopf (erst „Auflösen“, danach „Neuer Rhythmus“) und Ende
function updateBar() {
  const b = el.gameBar.querySelector('.gbtn[data-act="main"]');
  if (!gameOn('echo') || !b) return;
  const text = covered() ? 'Auflösen' : 'Neuer Rhythmus';
  b.innerHTML = (covered() ? GAME_ICONS.eye : ICONS.dice) + '<span>' + text + '</span>';
  b.setAttribute('aria-label', text);
}
function tap(b) {
  const act = b.dataset.act;
  if (act === 'main') { if (covered()) reveal(); else newRhythm(); }
  else if (act === 'again') playEcho();
  else if (act === 'end') endGame();
}
function startEcho() {
  if (!gameOn('echo')) {
    openGame('echo', gameBtn('again', ICONS.again, 'Nochmal hören') + gameBtn('main', GAME_ICONS.eye, 'Auflösen', 'main big') +
      gameBtn('end', GAME_ICONS.close, 'Ende'), { tap, stop: stopPlay });
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
  el.echoPulse.classList.toggle('on', games.echo.pulse);
  el.echoPulse.setAttribute('aria-pressed', games.echo.pulse ? 'true' : 'false');
  const e = games.echo;
  blockSum('rhyGame', e.bars + (e.bars > 1 ? ' Takte' : ' Takt') + ' · ' + LEVEL[e.notes] + (e.rests ? ' · Pausen ' + LEVEL[e.rests] : ''));
}
export function initEcho() {
  OPTS.forEach(([id, k]) => delegate(el[id], '[data-v]', (b) => {
    games.echo[k] = +b.dataset.v;
    persistGames();
    renderEchoSide();
  }));
  el.echoPulse.addEventListener('click', () => { games.echo.pulse = !games.echo.pulse; persistGames(); renderEchoSide(); });
  el.echoGo.addEventListener('click', startEcho);
  renderEchoSide();
}
