// Weitere Farbnoten-Spiele („Üben und Spielen“), mit den Tönen des Tonnamen-Quiz:
//   Melodie-Echo        Die Tafel spielt 2–5 Töne vor; sie liegen als verdeckte Karten in einer neuen Zeile der
//                       Übungstafel. Die Kinder tippen sie unten der Reihe nach, jeder richtige Ton deckt seine Karte auf.
//   Höher oder tiefer?  Zwei Töne erklingen nacheinander; die Kinder sagen, ob der zweite höher, tiefer oder gleich ist.
//                       Erst mit der Lösung bekommen die beiden Punkte über der Tafel ihre Farbe.
import { MAX_ROWS, NOTE_BY } from './config.js';
import { newRow } from './model.js';
import { makeMelody } from './theory.js';
import { pool } from './quiz.js';
import { games, persistGames } from './games.js';
import { S } from './state.js';
import { render } from './render.js';
import { markPlaying } from './board.js';
import { colorStyle, noteLabel } from './symbols.js';
import { previewTone, stopPlay } from '../core/player.js';
import { settings } from '../core/settings.js';
import { startQuiz, playTones } from '../core/game.js';
import { delegate } from '../core/ui.js';
import { el } from './dom.js';

const rnd = (n) => Math.floor(Math.random() * n);
// Die Töne von tief nach hoch
const sortedPool = () => [...new Set(pool())].sort((a, b) => NOTE_BY[a].f - NOTE_BY[b].f);

/* ---------- Melodie-Echo ---------- */
function meloQuiz() {
  const ids = sortedPool();
  const keys = ids.map((id) => { const n = NOTE_BY[id]; return { key: id, html: noteLabel(n), label: n.n, style: colorStyle(n), f: n.f }; });
  let seq = [], r = -1, i = 0, live = true, later = null, fresh = true;
  const mark = (k) => markPlaying(k == null ? null : { r, c: k });
  const hear = () => playTones(seq.map((id) => ({ f: NOTE_BY[id].f })), 'bell', mark);
  return {
    layout: 'row', sound: 'bell', keys,
    next() {
      stopPlay();
      seq = makeMelody(ids, games.melo.len, games.melo.steps);
      if (fresh) { S.rows = []; fresh = false; } // ein neues Melodie-Echo beginnt auf einer leeren Übungstafel
      while (S.rows.length && !S.rows[S.rows.length - 1].some(Boolean)) S.rows.pop();
      // Ist die Tafel voll, fällt die älteste Melodie weg
      if (S.rows.length >= MAX_ROWS) S.rows.splice(0, S.rows.length - MAX_ROWS + 1);
      const row = newRow(false);
      seq.forEach((id) => row.push({ n: id, h: '', q: 1 }));
      S.rows.push(row);
      r = S.rows.length - 1;
      i = 0;
      S.sel = { r, c: 0 };
      render();
      hear();
      return { ok: new Set(seq), f: NOTE_BY[seq[0]].f };
    },
    // Der Reihe nach: ein richtiger Ton deckt seine Karte auf und erklingt
    answer(key) {
      if (key !== seq[i]) return 'wrong';
      delete S.rows[r][i].q;
      i++;
      render();
      previewTone(NOTE_BY[key].f, 'bell', 0.6);
      return i >= seq.length ? 'done' : 'step';
    },
    hear,
    // Alle Karten auf, dann erklingt die ganze Melodie noch einmal
    solved() {
      S.rows[r].forEach((c) => { if (c) delete c.q; });
      render();
      later = setTimeout(() => { if (live) hear(); }, 700);
    },
    wait: () => 700 + seq.length * 1.15 * 60000 / settings.tempo + 1200,
    stop() { live = false; clearTimeout(later); render(); }
  };
}

/* ---------- Höher oder tiefer? ---------- */
const ARROW = (d) => '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const UPDOWN_KEYS = [
  { key: 'up', html: ARROW('M12 20V5M5.5 11.5 12 5l6.5 6.5') + '<span>höher</span>', label: 'höher' },
  { key: 'same', html: ARROW('M5 9h14M5 15h14') + '<span>gleich</span>', label: 'gleich' },
  { key: 'down', html: ARROW('M12 4v15M5.5 12.5 12 19l6.5-6.5') + '<span>tiefer</span>', label: 'tiefer' }
];
function updownQuiz() {
  const ids = sortedPool();
  let a, b;
  // Zwei große Punkte: erst ohne Farbe mit ihrer Nummer, mit der Lösung farbig mit Buchstabe
  const show = (solved) => {
    const dot = (id, k) => {
      const n = NOTE_BY[id];
      return '<div class="dot qdot' + (solved ? '' : ' plain') + '" style="' + colorStyle(n) + '">' + (solved ? noteLabel(n) : '<span class="ltr">' + k + '</span>') + '</div>';
    };
    el.quizView.innerHTML = '<div class="qfarb"><p class="qask">Ist der zweite Ton höher oder tiefer?</p><div class="qpair">' + dot(a, 1) + dot(b, 2) + '</div></div>';
  };
  // Der klingende Punkt leuchtet
  const mark = (k) => el.quizView.querySelectorAll('.qdot').forEach((d, i) => d.classList.toggle('on', i === k));
  const hear = () => playTones([{ f: NOTE_BY[a].f }, { f: NOTE_BY[b].f }], 'bell', mark, 0.4);
  el.quizView.hidden = false;
  return {
    layout: 'words', sound: 'bell', keys: UPDOWN_KEYS,
    next() {
      stopPlay();
      a = ids[rnd(ids.length)];
      // Etwa jedes fünfte Mal derselbe Ton
      if (Math.random() < 0.2) b = a;
      else { const j = rnd(ids.length - 1), k = ids.indexOf(a); b = ids[j >= k ? j + 1 : j]; }
      const fa = NOTE_BY[a].f, fb = NOTE_BY[b].f;
      show(false);
      hear();
      return { ok: new Set([fb > fa ? 'up' : fb < fa ? 'down' : 'same']) };
    },
    hear,
    solved() { show(true); hear(); },
    wait: () => 2.8 * 60000 / settings.tempo + 1500,
    stop() { el.quizView.hidden = true; el.quizView.innerHTML = ''; }
  };
}

/* ---------- Leiste rechts ---------- */
function pressed(b, on) {
  b.classList.toggle('on', on);
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
}
function renderSide() {
  el.meloLen.querySelectorAll('[data-v]').forEach((b) => pressed(b, +b.dataset.v === games.melo.len));
  el.meloSteps.querySelectorAll('[data-v]').forEach((b) => pressed(b, (b.dataset.v === 'steps') === games.melo.steps));
}
export function initMelGames() {
  delegate(el.meloLen, '[data-v]', (b) => { games.melo.len = +b.dataset.v; persistGames(); renderSide(); });
  delegate(el.meloSteps, '[data-v]', (b) => { games.melo.steps = b.dataset.v === 'steps'; persistGames(); renderSide(); });
  el.meloGo.addEventListener('click', () => startQuiz(meloQuiz()));
  el.updownGo.addEventListener('click', () => startQuiz(updownQuiz()));
  renderSide();
}
