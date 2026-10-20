// Weitere Rhythmus-Spiele („Üben und Spielen“), mit denselben Einstellungen wie das Rhythmus-Echo:
//   Welcher war's?      Auf der Übungstafel stehen 2–4 gewürfelte Rhythmen, einer davon erklingt. Die Kinder tippen
//                       unten seine Nummer. Eine falsche Nummer wird rot (auch auf der Tafel) und erklingt nicht; die
//                       richtige wird grün. Danach spielt ein Tipp auf eine Zeilennummer diesen Rhythmus ab.
//   Vom Blatt klatschen Ein Rhythmus steht auf der Tafel. „Mitklatschen“ zählt ein und gibt den Grundschlag, die Zeichen
//                       leuchten dabei mit, aber es klingt nichts; „Anhören“ spielt ihn zur Kontrolle.
//   Rhythmus legen      Ein Rhythmus erklingt, die Kinder legen ihn unten aus Bausteinen (ta, ti-ti, Pause …) nach.
//                       Jeder richtige Baustein erscheint auf der Tafel, ein falscher wackelt nur.
//   Fehler finden       Ein Rhythmus steht auf der Tafel, die Tafel spielt ihn mit einem Fehler in einem Takt. Die Kinder
//                       tippen den Takt; mit der Lösung wird er rot hinterlegt.
import { makeRhythm, makeBlocks, usableBlocks, meterParts } from './rhythms.js';
import { games, persistGames } from './games.js';
import { S } from './state.js';
import { render } from './render.js';
import { markPlaying } from './board.js';
import { rhythmRow, rowPlan, planOf, AGAIN_ICON } from './echo.js';
import { noteSym, restSym } from './symbols.js';
import { playNow, stopPlay } from '../core/player.js';
import { openGame, endGame, gameBtn, GAME_ICONS, startQuiz } from '../core/game.js';
import { delegate } from '../core/ui.js';
import { el } from './dom.js';

const quiet = () => {};
const rnd = (n) => Math.floor(Math.random() * n);
const cellOf = (d) => (d < 0 ? { k: 'r', d: -d } : { k: 'b', d });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Der Rhythmus in der ersten Zeile, so wie er dasteht (Rhythmus legen, Fehler finden: Tipp auf die Zeilennummer)
const playRow = () => { const p = rowPlan(0); if (p) playNow(p, markPlaying); };
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
// Zeilennummer r auf der Tafel grün (ok) oder rot (bad) hinterlegen, bis zum nächsten Zeichnen
function markNum(r, cls) {
  const x = el.grid.querySelector('.rnum[data-fold="' + r + '"]');
  if (x) x.classList.add(cls);
}
function whichQuiz() {
  const n = games.which.count;
  let ans = 0, solved = false;
  // Antworten: die Nummern der Zeilen
  const keys = Array.from({ length: n }, (_, i) => ({ key: String(i), html: String(i + 1), label: 'Rhythmus ' + (i + 1) }));
  const play = (r, mark) => { const p = rowPlan(r); if (p) playNow(p, mark); };
  return {
    layout: 'words', keys,
    next() {
      stopPlay();
      solved = false;
      S.rows = distinctRhythms(n).map((cells) => rhythmRow(cells, games.echo.meter));
      S.sel = { r: 0, c: 0 };
      ans = Math.floor(Math.random() * S.rows.length);
      render();
      play(ans, quiet); // ohne Leuchten, sonst wäre die Antwort zu sehen
      return { ok: new Set([String(ans)]) };
    },
    hear: () => play(ans, solved ? markPlaying : quiet),
    // Falsch: die Nummer wird rot, es klingt nichts. Gelöst: die richtige wird grün und erklingt, die Zeichen leuchten
    // mit; die Zeilennummern spielen jetzt ihren Rhythmus
    wrong: (key) => markNum(+key, 'bad'),
    solved() {
      solved = true;
      markNum(ans, 'ok');
      play(ans, markPlaying);
    },
    replay: (key) => play(+key, markPlaying),
    row: (r) => play(r, markPlaying),
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

/* ---------- Rhythmus legen ---------- */
const NAMES = { 4: 'Ganze', 3: 'punktierte Halbe', 2: 'Halbe', 1.5: 'punktierte Viertel', 1: 'Viertel', 0.5: 'Achtel', 0.25: 'Sechzehntel' };
// Knopf eines Bausteins: seine Zeichen nebeneinander (Achtel mit Fähnchen)
const blockHTML = (ev) => '<span class="blk">' + ev.map((d) => (d < 0 ? restSym(-d, false) : noteSym(d, false))).join('') + '</span>';
const blockLabel = (ev) => ev.map((d) => (d < 0 ? NAMES[-d] + ' Pause' : NAMES[d])).join(', ');
function buildQuiz() {
  const o = games.echo, blocks = usableBlocks(o);
  const keys = blocks.map((ev, i) => ({ key: String(i), html: blockHTML(ev), label: blockLabel(ev) }));
  let target = [], placed = [];
  // Auf der Tafel steht, was schon gelegt ist; der Schlussstrich kommt erst, wenn alles liegt
  const show = (done) => {
    const r = rhythmRow(placed.map(cellOf), o.meter);
    if (!done) r.pop();
    S.rows = [r];
    S.sel = { r: 0, c: 0 };
    render();
  };
  const hear = () => playNow(planOf(target.map((d) => ({ d })), o.meter), quiet);
  return {
    layout: 'words', keys,
    next() {
      stopPlay();
      target = makeBlocks(o).flat();
      placed = [];
      show(false);
      hear();
      return { ok: new Set() };
    },
    // Ein Baustein passt, wenn seine Längen die nächsten des Rhythmus sind
    answer(key) {
      const ev = blocks[+key];
      if (!ev || !same(ev, target.slice(placed.length, placed.length + ev.length))) return 'wrong';
      placed.push(...ev);
      const done = placed.length === target.length;
      show(done);
      return done ? 'done' : 'step';
    },
    hear,
    solved() {
      placed = target.slice();
      show(true);
      playRow();
    },
    row: playRow,
    stop() { render(); }
  };
}

/* ---------- Fehler finden ---------- */
// Teilt Längen in Takte (kein Baustein ragt über einen Taktstrich)
function byBar(ev, len) {
  const bars = [];
  let t = 0;
  ev.forEach((d) => { const b = Math.floor(t / len + 1e-9); (bars[b] = bars[b] || []).push(d); t += Math.abs(d); });
  return bars;
}
function fixQuiz() {
  // Mindestens zwei Takte, sonst gäbe es nichts zu suchen
  const o = { ...games.echo, bars: Math.max(2, games.echo.bars) }, len = meterParts(o.meter).len;
  const keys = Array.from({ length: o.bars }, (_, i) => ({ key: String(i), html: 'Takt ' + (i + 1), label: 'Takt ' + (i + 1) }));
  let played = [], bad = 0, from = 0, count = 0;
  // Gespielt wird mit dem Fehler; die Zeichen der richtigen Takte leuchten mit, im falschen Takt leuchtet nichts
  const play = () => playNow(planOf(played, o.meter), markPlaying);
  return {
    layout: 'words', keys,
    next() {
      stopPlay();
      const bars = byBar(makeBlocks(o).flat(), len);
      bad = rnd(bars.length);
      let other = bars[bad];
      for (let t = 0; t < 40 && same(other, bars[bad]); t++) other = makeBlocks({ ...o, bars: 1 }).flat();
      played = [];
      let c = 0;
      bars.forEach((bar, b) => {
        if (b === bad) { from = c; count = bar.length; other.forEach((d) => played.push({ d })); c += bar.length; }
        else bar.forEach((d) => played.push({ d, pos: { r: 0, c: c++ } }));
      });
      S.rows = [rhythmRow(bars.flat().map(cellOf), o.meter)];
      S.sel = { r: 0, c: 0 };
      render();
      play();
      return { ok: new Set([String(bad)]) };
    },
    hear: play,
    // Der falsche Takt wird rot hinterlegt (bis zum nächsten Zeichnen)
    solved() {
      for (let c = from; c < from + count; c++) { const x = el.grid.querySelector('.cell[data-r="0"][data-c="' + c + '"]'); if (x) x.classList.add('qbad'); }
      play();
    },
    // Die Zeilennummer spielt den Rhythmus richtig, wie er dasteht
    row: playRow,
    stop() { render(); }
  };
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
  el.buildGo.addEventListener('click', () => startQuiz(buildQuiz()));
  el.fixGo.addEventListener('click', () => startQuiz(fixQuiz()));
  renderSide();
}
