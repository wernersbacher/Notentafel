// Rhythmus-Echo (Rhythmus, „Üben und Spielen“): Die Tafel würfelt einen Rhythmus, legt ihn verdeckt in eine neue Zeile
// und spielt ihn vor. Die Kinder klatschen nach, dann wird er aufgelöst. Bis dahin steht in der Zeile nur die leere
// Notenlinie mit Taktart und Taktstrichen (row.hide, siehe board.js). Die Rhythmen sammeln sich auf der Übungstafel,
// die geschriebene Tafel bleibt unberührt.
import { MAX_ROWS } from './config.js';
import { filled, isBeat, dur, newRow } from './model.js';
import { meterOf } from './theory.js';
import { makeRhythm, meterParts } from './rhythms.js';
import { games, persistGames } from './gameOptions.js';
import { S, snap } from './state.js';
import { commit } from './redraw.js';
import { markPlaying } from './board.js';
import { playNow, stopPlay, previewTone } from '../core/player.js';
import { beatsOf } from '../core/plan.js';
import { openGame, endGame, gameOn, gameFirst, gameStart, gameBtn, GAME_ICONS } from '../core/game.js';
import { toast, delegate, setPressed as pressed } from '../core/ui.js';
import { el } from './dom.js';

export const AGAIN_ICON = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4.5H9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let row = -1; // Zeile des zuletzt gewürfelten Rhythmus
// Glockenspiel und Klavier spielen den Rhythmus auf einem Ton (g')
const ECHO_F = 392;

const echoRow = () => S.rows[row];
const covered = () => !!(echoRow() && echoRow().hide);

/* ---------- Für alle Rhythmus-Spiele ---------- */
// Eine Zeile aus gewürfelten Plätzen (makeRhythm) mit Taktart, Taktstrichen (falls sie nicht automatisch kommen) und
// Schlussstrich
export function rhythmRow(cells, meter) {
  const r = newRow(true), len = meterParts(meter).len;
  r.meter = meter;
  let pos = 0;
  cells.forEach((c) => {
    if (pos > 0 && pos % len === 0) c.bar = 1;
    pos += c.d;
    r.push(c);
  });
  r.push({ bar: 2 });
  return r;
}
// Ablaufplan für die Zeile r im gewählten Klang, mit leisem Grundschlag nach Wahl; null, wenn darin nichts steht
export function rowPlan(r) {
  const x = S.rows[r];
  if (!x || !x.some(filled)) return null;
  const ev = [];
  x.forEach((cell, c) => { if (filled(cell)) ev.push({ d: isBeat(cell) ? dur(cell) : -dur(cell), pos: { r, c } }); });
  return planOf(ev, meterOf(S.rows, r));
}
// Ablaufplan für Längen, die nicht (so) auf der Tafel stehen: [{ d (negativ: Pause), pos }] in der Taktart meter
export function planOf(ev, meter) {
  const items = [];
  let t = 0;
  ev.forEach(({ d, pos }) => {
    items.push({ t, len: Math.abs(d), sound: d > 0 ? games.echo.sound : '', f: ECHO_F, pos: pos || null });
    t += Math.abs(d);
  });
  return { items, end: t, pulse: games.echo.pulse, ...beatsOf(meter) };
}

/* ---------- Würfeln, Vorspielen, Auflösen ---------- */
function newRhythm() {
  stopPlay();
  const meter = games.echo.meter;
  const cells = makeRhythm(games.echo);
  snap();
  while (S.rows.length && !S.rows[S.rows.length - 1].some(Boolean)) S.rows.pop();
  // Ist die Tafel voll, fällt der älteste Rhythmus weg
  if (S.rows.length >= MAX_ROWS) S.rows.splice(0, S.rows.length - MAX_ROWS + 1);
  S.rows.forEach((x) => { delete x.cover; delete x.coverFrom; delete x.hide; });
  const r = rhythmRow(cells, meter);
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
  const plan = rowPlan(row);
  if (!plan) { toast('Erst mit „Neuer Rhythmus“ einen Rhythmus würfeln.', true); return; }
  playNow(plan, covered() ? pulse : markPlaying);
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
  b.innerHTML = (covered() ? GAME_ICONS.eye : GAME_ICONS.dice) + '<span>' + text + '</span>';
  b.setAttribute('aria-label', text);
}
function tap(b) {
  const act = b.dataset.act;
  if (act === 'main') { if (covered()) reveal(); else newRhythm(); }
  else if (act === 'again') playEcho();
  else if (act === 'end') endGame();
}
// Ein neues Echo beginnt auf einer leeren Übungstafel, der erste Rhythmus erklingt erst mit „Abspielen“; läuft es
// schon, kommt nur ein neuer Rhythmus dazu (wartet der erste noch, erklingt er)
function startEcho() {
  if (gameOn('echo')) { if (!gameStart()) newRhythm(); return; }
  openGame('echo', gameBtn('again', AGAIN_ICON, 'Nochmal hören') + gameBtn('main', GAME_ICONS.eye, 'Auflösen', 'main big') +
    gameBtn('end', GAME_ICONS.close, 'Ende'), { tap, stop: stopPlay });
  S.rows = [];
  gameFirst(newRhythm);
}

/* ---------- Leiste rechts ---------- */
const OPTS = [['echoBars', 'bars'], ['echoNotes', 'notes'], ['echoRests', 'rests']];
function renderEchoSide() {
  OPTS.forEach(([id, k]) => el[id].querySelectorAll('[data-v]').forEach((b) => pressed(b, +b.dataset.v === games.echo[k])));
  el.echoMeter.querySelectorAll('[data-v]').forEach((b) => pressed(b, b.dataset.v === games.echo.meter));
  el.echoSound.querySelectorAll('[data-v]').forEach((b) => pressed(b, b.dataset.v === games.echo.sound));
  pressed(el.echoPulse, games.echo.pulse);
}
export function initEcho() {
  OPTS.forEach(([id, k]) => delegate(el[id], '[data-v]', (b) => {
    games.echo[k] = +b.dataset.v;
    persistGames();
    renderEchoSide();
  }));
  delegate(el.echoMeter, '[data-v]', (b) => { games.echo.meter = b.dataset.v; persistGames(); renderEchoSide(); });
  // Ein Tipp auf einen Klang wählt ihn und lässt ihn einmal hören
  delegate(el.echoSound, '[data-v]', (b) => {
    games.echo.sound = b.dataset.v;
    persistGames();
    renderEchoSide();
    previewTone(ECHO_F, games.echo.sound, 0.5);
  });
  el.echoPulse.addEventListener('click', () => { games.echo.pulse = !games.echo.pulse; persistGames(); renderEchoSide(); });
  el.echoGo.addEventListener('click', startEcho);
  renderEchoSide();
}
