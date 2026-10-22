// Tonnamen-Quiz der Farbnoten („Üben und Spielen“): Ein Farbpunkt erscheint ohne Buchstaben (groß über der Tafel oder
// Punkt für Punkt in der Melodie), die Kinder sagen seinen Namen und tippen ihn unten auf der Tafel – oder andersherum:
// der Name erscheint auf einem Punkt ohne Farbe, die Kinder tippen die Farbe.
import { NOTE_BY, GROUPS } from './config.js';
import { isNote } from './model.js';
import { S, practiceWritten } from './state.js';
import { render } from './redraw.js';
import { games, persistGames } from './gameOptions.js';
import { colorStyle, noteLabel, upArrow } from './symbols.js';
import { startQuiz, answerOf, randomQuiz as coreRandomQuiz, songQuiz as coreSongQuiz } from '../core/quiz.js';
import { toast, delegate, setPressed as pressed } from '../core/ui.js';
import { el } from './dom.js';

// Töne der Zufallspunkte: die Grundtöne, dazu nach Wahl die hohen Töne und Halbtöne
export function pool() {
  const g = games.quiz, ids = GROUPS[0].slice();
  if (g.high) ids.push(...GROUPS[1]);
  if (g.semis >= 1) ids.push('Fis', 'B');
  if (g.semis === 2) ids.push('Cis', 'Dis', 'Gis', ...(g.high ? ['Cis+', 'Dis+'] : []));
  return ids;
}
// Knöpfe unten auf der Tafel, von tief nach hoch, wie die Töne der Leiste: Namen tippen ohne Farbe (plain, der richtige
// färbt sich mit der Lösung), Farbe tippen ohne Buchstaben (nur der Pfeil der hohen Töne). Sie bleiben hier und nicht im
// Kern: die Tafel baut sie aus Punkt-ids (NOTE_BY), das Lied aus Tonhöhen (quizKeys, mit Oktavstrichen).
const keysOf = (ids) => [...new Set(ids)].sort((a, b) => NOTE_BY[a].f - NOTE_BY[b].f).map((id) => {
  const n = NOTE_BY[id], byName = games.quiz.ask === 'name';
  return { key: id, html: byName ? upArrow(n) : noteLabel(n), label: n.n, style: colorStyle(n), f: n.f, cls: byName ? '' : 'plain' };
});
const question = (id) => answerOf(id, NOTE_BY[id].f);

// Großer Punkt über der Tafel. Farbe gefragt: ohne Lösung nur mit dem Pfeil der hohen Töne; Name gefragt: Buchstabe auf
// einem Punkt ohne Farbe. Mit Lösung farbig mit Buchstabe. Darunter der Name, wenn er mehr sagt als der Buchstabe
// (hohes C, Fis) und schon zu sehen sein soll
function showDot(id, solved) {
  const n = NOTE_BY[id], byName = games.quiz.ask === 'name';
  el.quizView.innerHTML = '<div class="qfarb"><div class="dot qdot' + (byName && !solved ? ' plain' : '') + '" style="' + colorStyle(n) + '">' +
    (solved || byName ? noteLabel(n) : upArrow(n)) + '</div><p class="qname">' + ((solved || byName) && n.n !== n.l ? n.n : '&nbsp;') + '</p></div>';
}
function randomQuiz() {
  el.quizView.hidden = false;
  return coreRandomQuiz({
    layout: 'row', sound: 'bell', keys: keysOf(pool()),
    candidates: pool,
    same: (a, b) => a === b,
    draw: (x, solved) => showDot(x, solved),
    answer: question,
    stop() { el.quizView.hidden = true; el.quizView.innerHTML = ''; }
  });
}

// Melodie durchgehen: Punkt für Punkt (eingeklappte Zeilen nicht); die Buchstaben erscheinen erst, wenn der Punkt
// benannt ist (S.quiz, siehe board.js), der gefragte Punkt leuchtet wie beim Abspielen
function songQuiz() {
  // Erst prüfen, ob es etwas zu üben gibt: sonst wäre die Übungstafel schon getauscht, bevor das Quiz abbricht.
  if (!practiceWritten()) { toast('Auf der Tafel stehen noch keine Farbpunkte.', true); return null; }
  const order = [];
  S.rows.forEach((row, r) => { if (!row.fold) row.forEach((x, c) => { if (isNote(x)) order.push({ r, c }); }); });
  if (!order.length) { toast('Auf der Tafel stehen noch keine Farbpunkte.', true); return null; }
  S.quiz = { pos: null, done: new Set(), ask: games.quiz.ask };
  return coreSongQuiz({
    layout: 'row', sound: 'bell', keys: keysOf(GROUPS[0].concat(order.map((p) => S.rows[p.r][p.c].n))),
    done: 'Geschafft: Alle Farbpunkte sind benannt.',
    items: () => order,
    step: (p) => isNote(S.rows[p.r] && S.rows[p.r][p.c]), // inzwischen geändert
    draw: (p) => { S.quiz.pos = p; render(); },
    answer: (p) => question(S.rows[p.r][p.c].n), // gelesen nach dem Zeichnen, also wie die Frage jetzt steht
    solve: (p) => { S.quiz.done.add(p.r + ',' + p.c); render(); },
    stop() { S.quiz = null; render(); }
  });
}

function startMelQuiz() {
  const q = games.quiz.mode === 'song' ? songQuiz() : randomQuiz();
  if (q) startQuiz(q);
}

/* ---------- Leiste rechts ---------- */
function renderQuizSide() {
  const g = games.quiz;
  el.melQuizHint.textContent = g.ask === 'name'
    ? 'Ein Tonname erscheint auf einem Punkt ohne Farbe. Die Kinder tippen unten auf der Tafel die passende Farbe.'
    : 'Ein Farbpunkt erscheint ohne Buchstaben. Die Kinder sagen seinen Namen und tippen ihn unten auf der Tafel.';
  el.melQuizAsk.querySelectorAll('[data-v]').forEach((b) => pressed(b, b.dataset.v === g.ask));
  el.melQuizMode.querySelectorAll('[data-v]').forEach((b) => pressed(b, b.dataset.v === g.mode));
  el.melQuizSemis.querySelectorAll('[data-v]').forEach((b) => pressed(b, +b.dataset.v === g.semis));
  pressed(el.melQuizHigh, g.high);
  // Die Töne gelten auch für die anderen Spiele; nur beim Durchgehen der Melodie im Quiz braucht es sie nicht
  el.melQuizRand.classList.toggle('songmode', g.mode === 'song');
}
export function initMelQuiz() {
  const set = (k, v) => { games.quiz[k] = v; persistGames(); renderQuizSide(); };
  delegate(el.melQuizAsk, '[data-v]', (b) => set('ask', b.dataset.v));
  delegate(el.melQuizMode, '[data-v]', (b) => set('mode', b.dataset.v));
  delegate(el.melQuizSemis, '[data-v]', (b) => set('semis', +b.dataset.v));
  el.melQuizHigh.addEventListener('click', () => set('high', !games.quiz.high));
  el.melQuizGo.addEventListener('click', startMelQuiz);
  renderQuizSide();
}
