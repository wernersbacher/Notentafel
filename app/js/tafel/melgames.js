// Weitere Farbnoten-Spiele („Üben und Spielen“), mit den Tönen des Tonnamen-Quiz:
//   Melodie-Echo        Die Tafel spielt 2–5 Töne vor; sie liegen als verdeckte Karten in einer neuen Zeile der
//                       Übungstafel. Die Kinder tippen sie unten der Reihe nach, jeder richtige Ton deckt seine Karte auf.
//   Höher oder tiefer?  Zwei Töne erklingen nacheinander; die Kinder sagen, ob der zweite höher, tiefer oder gleich ist.
//                       Erst mit der Lösung bekommen die beiden Punkte über der Tafel ihre Farbe.
//   Lied erraten        Der Anfang eines mitgelieferten Lieds erklingt (die ersten Töne oder die erste Zeile); die Kinder
//                       wählen unten aus drei Namen. Mit der Lösung steht der Anfang als Farbpunkte auf der Tafel;
//                       danach lässt ein Tipp auf einen Namen den Anfang dieses Lieds hören.
// Eine falsche Antwort wird rot und erklingt nicht (Melodie-Echo: auch der falsche Ton nicht).
import { MAX_ROWS, NOTE_BY } from './config.js';
import { newRow, isNote, dur } from './model.js';
import { MELODIES, melodyRows } from './melodies.js';
import { makeMelody } from './theory.js';
import { pool } from './quiz.js';
import { games, persistGames } from './gameOptions.js';
import { S } from './state.js';
import { render } from './redraw.js';
import { markPlaying } from './board.js';
import { colorStyle, noteLabel } from './symbols.js';
import { previewTone, stopPlay, playNow } from '../core/player.js';
import { playTones } from '../core/game.js';
import { startQuiz } from '../core/quiz.js';
import { delegate, setPressed as pressed } from '../core/ui.js';
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
    // Tipp auf eine Zeilennummer: diese Melodie noch einmal (die Punkte leuchten mit)
    row(k) {
      const x = S.rows[k], at = [];
      if (!x) return;
      x.forEach((c, j) => { if (isNote(c)) at.push(j); });
      playTones(at.map((j) => ({ f: NOTE_BY[x[j].n].f })), 'bell', (m) => markPlaying(m == null ? null : { r: k, c: at[m] }));
    },
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
    stop() { el.quizView.hidden = true; el.quizView.innerHTML = ''; }
  };
}

/* ---------- Lied erraten ---------- */
// Der Anfang eines Lieds: die erste Zeile, bei „short“ nur bis zum fünften Ton (Pausen am Anfang zählen nicht)
function openingOf(m, short) {
  const row = melodyRows(m)[0].filter(Boolean), out = [];
  let n = 0;
  for (const c of row) {
    if (short && n >= 5) break;
    out.push({ ...c });
    if (isNote(c)) n++;
  }
  return out;
}
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function guessQuiz() {
  let cells = [], last = -1, solved = false;
  const plan = (cs = cells) => {
    const items = [];
    let t = 0;
    cs.forEach((c, i) => {
      items.push({ t, len: dur(c), sound: isNote(c) ? 'bell' : '', f: isNote(c) ? NOTE_BY[c.n].f : 0, pos: { r: 0, c: i } });
      t += dur(c);
    });
    return { items, end: t, bare: true };
  };
  // Vor der Lösung ist die Tafel leer, danach leuchten die Punkte mit
  const hear = () => playNow(plan(), solved ? markPlaying : () => {});
  const q = {
    layout: 'words', rekey: true, keys: [],
    next() {
      stopPlay();
      let k = rnd(MELODIES.length);
      if (k === last) k = (k + 1) % MELODIES.length;
      last = k;
      const others = shuffle(MELODIES.map((_, i) => i).filter((i) => i !== k)).slice(0, 2);
      q.keys = shuffle([k, ...others]).map((i) => ({ key: String(i), html: '<span>' + MELODIES[i].name + '</span>', label: MELODIES[i].name, cls: 'name' }));
      cells = openingOf(MELODIES[k], games.guess.len === 'short');
      solved = false;
      S.rows = [newRow(false)];
      S.sel = { r: 0, c: 0 };
      render();
      hear();
      return { ok: new Set([String(k)]) };
    },
    hear,
    solved() {
      solved = true;
      const row = newRow(false);
      cells.forEach((c) => row.push({ ...c }));
      row.meter = MELODIES[last].meter;
      S.rows = [row];
      render();
      hear();
    },
    // Danach lässt ein Tipp auf einen Namen den Anfang dieses Lieds hören, die Zeilennummer den richtigen
    replay: (key) => playNow(plan(openingOf(MELODIES[+key], games.guess.len === 'short')), () => {}),
    row: () => hear(),
    stop() { render(); }
  };
  return q;
}

/* ---------- Leiste rechts ---------- */
function renderSide() {
  el.meloLen.querySelectorAll('[data-v]').forEach((b) => pressed(b, +b.dataset.v === games.melo.len));
  el.meloSteps.querySelectorAll('[data-v]').forEach((b) => pressed(b, (b.dataset.v === 'steps') === games.melo.steps));
  el.guessLen.querySelectorAll('[data-v]').forEach((b) => pressed(b, b.dataset.v === games.guess.len));
}
export function initMelGames() {
  delegate(el.meloLen, '[data-v]', (b) => { games.melo.len = +b.dataset.v; persistGames(); renderSide(); });
  delegate(el.meloSteps, '[data-v]', (b) => { games.melo.steps = b.dataset.v === 'steps'; persistGames(); renderSide(); });
  el.meloGo.addEventListener('click', () => startQuiz(meloQuiz()));
  el.updownGo.addEventListener('click', () => startQuiz(updownQuiz()));
  delegate(el.guessLen, '[data-v]', (b) => { games.guess.len = b.dataset.v; persistGames(); renderSide(); });
  el.guessGo.addEventListener('click', () => startQuiz(guessQuiz()));
  renderSide();
}
