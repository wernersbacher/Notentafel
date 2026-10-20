// Tonnamen-Quiz der Farbnoten („Üben und Spielen“): Ein Farbpunkt erscheint ohne Buchstaben (groß über der Tafel oder
// Punkt für Punkt in der Melodie), die Kinder sagen seinen Namen und tippen ihn unten auf der Tafel.
import { NOTE_BY, GROUPS } from './config.js';
import { isNote } from './model.js';
import { S } from './state.js';
import { render } from './render.js';
import { games, persistGames } from './games.js';
import { colorStyle, noteLabel, upArrow } from './symbols.js';
import { startQuiz } from '../core/game.js';
import { toast, delegate } from '../core/ui.js';
import { blockSum } from '../core/blocks.js';
import { el } from './dom.js';

// Töne der Zufallspunkte: die Grundtöne, dazu nach Wahl die hohen Töne und Halbtöne
function pool() {
  const g = games.quiz, ids = GROUPS[0].slice();
  if (g.high) ids.push(...GROUPS[1]);
  if (g.semis >= 1) ids.push('Fis', 'B');
  if (g.semis === 2) ids.push('Cis', 'Dis', 'Gis', ...(g.high ? ['Cis+', 'Dis+'] : []));
  return ids;
}
// Knöpfe unten auf der Tafel, von tief nach hoch, wie die Töne der Leiste
const keysOf = (ids) => [...new Set(ids)].sort((a, b) => NOTE_BY[a].f - NOTE_BY[b].f).map((id) => {
  const n = NOTE_BY[id];
  return { key: id, html: noteLabel(n), label: n.n, style: colorStyle(n), f: n.f };
});
const question = (id) => ({ ok: new Set([id]), f: NOTE_BY[id].f });

// Großer Farbpunkt über der Tafel; ohne Lösung nur mit dem Pfeil der hohen Töne, mit Lösung mit Buchstabe und – wenn er
// mehr sagt als der Buchstabe (hohes C, Fis) – darunter dem Namen
function showDot(id, solved) {
  const n = NOTE_BY[id];
  el.quizView.innerHTML = '<div class="qfarb"><div class="dot qdot" style="' + colorStyle(n) + '">' + (solved ? noteLabel(n) : upArrow(n)) +
    '</div><p class="qname">' + (solved && n.n !== n.l ? n.n : '&nbsp;') + '</p></div>';
}
function randomQuiz() {
  let cur = null;
  el.quizView.hidden = false;
  return {
    layout: 'row', sound: 'bell', keys: keysOf(pool()),
    next() {
      const ids = pool().filter((x) => x !== cur);
      cur = ids[Math.floor(Math.random() * ids.length)];
      showDot(cur, false);
      return question(cur);
    },
    solved() { showDot(cur, true); },
    stop() { el.quizView.hidden = true; el.quizView.innerHTML = ''; }
  };
}

// Melodie durchgehen: Punkt für Punkt (eingeklappte Zeilen nicht); die Buchstaben erscheinen erst, wenn der Punkt
// benannt ist (S.quiz, siehe board.js), der gefragte Punkt leuchtet wie beim Abspielen
function songQuiz() {
  const order = [];
  S.rows.forEach((row, r) => { if (!row.fold) row.forEach((x, c) => { if (isNote(x)) order.push({ r, c }); }); });
  if (!order.length) { toast('Auf der Tafel stehen noch keine Farbpunkte.', true); return null; }
  let k = -1;
  S.quiz = { pos: null, done: new Set() };
  return {
    layout: 'row', sound: 'bell', keys: keysOf(GROUPS[0].concat(order.map((p) => S.rows[p.r][p.c].n))),
    done: 'Geschafft: Alle Farbpunkte sind benannt.',
    next() {
      for (k++; k < order.length; k++) {
        const p = order[k], cell = S.rows[p.r] && S.rows[p.r][p.c];
        if (!isNote(cell)) continue; // inzwischen geändert
        S.quiz.pos = p;
        render();
        return question(cell.n);
      }
      return null;
    },
    solved() { S.quiz.done.add(S.quiz.pos.r + ',' + S.quiz.pos.c); render(); },
    stop() { S.quiz = null; render(); }
  };
}

function startMelQuiz() {
  const q = games.quiz.mode === 'song' ? songQuiz() : randomQuiz();
  if (q) startQuiz(q);
}

/* ---------- Leiste rechts ---------- */
const SEMIS = ['ohne Halbtöne', 'Fis und B', 'alle Halbtöne'];
function pressed(b, on) {
  b.classList.toggle('on', on);
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
}
function renderQuizSide() {
  const g = games.quiz;
  el.melQuizMode.querySelectorAll('[data-v]').forEach((b) => pressed(b, b.dataset.v === g.mode));
  el.melQuizSemis.querySelectorAll('[data-v]').forEach((b) => pressed(b, +b.dataset.v === g.semis));
  pressed(el.melQuizHigh, g.high);
  el.melQuizRand.hidden = g.mode !== 'rand';
  blockSum('melGame', g.mode === 'song' ? 'Melodie' : 'Zufall · ' + SEMIS[g.semis] + (g.high ? ' · hohe Töne' : ''));
}
export function initMelQuiz() {
  const set = (k, v) => { games.quiz[k] = v; persistGames(); renderQuizSide(); };
  delegate(el.melQuizMode, '[data-v]', (b) => set('mode', b.dataset.v));
  delegate(el.melQuizSemis, '[data-v]', (b) => set('semis', +b.dataset.v));
  el.melQuizHigh.addEventListener('click', () => set('high', !games.quiz.high));
  el.melQuizGo.addEventListener('click', startMelQuiz);
  renderQuizSide();
}
