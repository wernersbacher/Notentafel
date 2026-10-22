// Tonnamen-Quiz im Notenblatt („Üben und Spielen“): Eine Zufallsnote erscheint groß auf eigenen Notenlinien, oder das Lied
// wird Note für Note durchgegangen. Die Kinder tippen unten auf der Tafel den Namen – die Knöpfe liegen wie eine Klaviatur,
// jeder in der Farbe seines Tons und mit seinem Namen samt Oktavstrichen (c', fis'', b).
import { isNote, parsePitch, staffPos, noteName, midiOf, freq, tiedFrom, quizPitches, quizKeys, songRange, stepPitch, comparePitch, pitchLabel } from './model.js';
import { clef, staffLines, accidental, yOf, head, stem, ledger } from './glyphs.js';
import { L, opts, persistOpts, practiceWritten } from './state.js';
import { render, markPlaying } from './render.js';
import { toneColor } from '../core/colors.js';
import { startQuiz, answerOf, randomQuiz as coreRandomQuiz, songQuiz as coreSongQuiz } from '../core/quiz.js';
import { toast, delegate, setPressed as pressed } from '../core/ui.js';
import { el } from './dom.js';

// Knöpfe aus quizKeys: Name (ein Halbton mit beiden Namen übereinander) auf der Farbe des Tons. Sie bleiben hier und
// nicht im Kern: das Lied baut sie aus Tonhöhen (quizKeys, mit Oktavstrichen), die Tafel aus Punkt-ids (NOTE_BY).
const keysOf = (lo, hi, sharp, flat) => quizKeys(lo, hi, sharp, flat).map((k) => ({
  ...k,
  html: k.names.map((n) => '<span>' + n + '</span>').join(''),
  label: k.names.join(' oder '),
  style: '--c:' + toneColor(parsePitch(k.p).step, k.acc),
  f: freq({ p: k.p, acc: k.acc })
}));
const question = (e, key = 0) => answerOf(midiOf(e, key), freq(e, key));

/* ---------- Zufallsnote ---------- */
// Die Note groß mit Violinschlüssel; darunter nach dem Lösen ihr Name. frame: Höhe von oben bis unten (in Linienabständen),
// fest für den ganzen Tonraum, damit die Notenlinien nicht springen.
const X = 10.5;
export function frameOf(lo, hi) {
  const a = staffPos(lo), b = staffPos(hi);
  // Hälse: unter der Mittellinie nach oben, sonst nach unten, je 3,5 Linienabstände (sie reichen also bis 7 Plätze weiter)
  const up = a < 4 ? Math.min(b, 3) + 7 : -99, down = b >= 4 ? Math.max(a, 4) - 7 : 99;
  const top = Math.min(-2.2, yOf(Math.max(b, up)) - 1.4), bottom = Math.max(6.2, yOf(Math.min(a, down)) + 1.4);
  return { top, bottom: bottom + 3.2 };
}
function noteView(e, frame, solved) {
  const pos = staffPos(e.p), y = yOf(pos);
  let s = staffLines(0.4, 15.6) + clef(1, yOf(2));
  for (let p = -2; p >= pos; p -= 2) s += ledger(X, yOf(p), 1.05);
  for (let p = 10; p <= pos; p += 2) s += ledger(X, yOf(p), 1.05);
  if (e.acc) s += accidental(X - 1.9, y, e.acc);
  s += head(X, y, 4, opts.colors ? toneColor(parsePitch(e.p).step, e.acc) : null);
  const up = pos < 4, end = up ? Math.max(pos + 7, 4) : Math.min(pos - 7, 4);
  s += stem(X + (up ? 0.6 : -0.6), y + (up ? -0.1 : 0.1), yOf(end));
  if (solved) s += '<text class="qnm" x="' + X + '" y="' + (frame.bottom - 0.9) + '">' + noteName(e) + '</text>';
  el.quizView.innerHTML = '<svg class="qstaff" viewBox="0 ' + frame.top + ' 16 ' + (frame.bottom - frame.top) +
    '" fill="currentColor" role="img" aria-label="Note' + (solved ? ' ' + noteName(e) : '') + '">' + s + '</svg>';
}
function randomQuiz() {
  const { quizLo: lo, quizHi: hi, quizSharp: sharp, quizFlat: flat } = opts, frame = frameOf(lo, hi);
  el.quizView.hidden = false;
  return coreRandomQuiz({
    layout: 'piano', sound: 'piano', keys: keysOf(lo, hi, sharp, flat),
    candidates: () => quizPitches(lo, hi, sharp, flat),
    same: (a, b) => a.p === b.p && a.acc === b.acc,
    draw: (x, solved) => noteView(x, frame, solved),
    answer: question,
    stop() { el.quizView.hidden = true; el.quizView.innerHTML = ''; }
  });
}

/* ---------- Lied durchgehen ---------- */
// Note für Note von vorn (die zweite Note eines Haltebogens zählt nicht mit); die gefragte leuchtet wie beim Abspielen,
// ihr Name erscheint erst, wenn sie benannt ist (L.quiz, siehe render.js)
function songQuiz() {
  practiceWritten(); // das geschriebene Lied, als Kopie auf der Übungstafel
  const range = songRange(L.song);
  if (!range) { toast('Im Lied stehen noch keine Noten.', true); return null; }
  L.quiz = { i: -1, done: new Set() };
  return coreSongQuiz({
    layout: 'piano', sound: 'piano', keys: keysOf(range.lo, range.hi, range.sharp, range.flat),
    done: 'Geschafft: Alle Noten des Lieds sind benannt.',
    // Jede Stelle ist Ereignis und Index zugleich: den Index braucht render (L.quiz.i) und die Lösung (L.quiz.done)
    items: () => L.song.ev.map((e, i) => ({ e, i })),
    step: ({ e, i }) => isNote(e) && !(i > 0 && tiedFrom(L.song.ev[i - 1], e)), // keine Pausen, keine zweite Note eines Haltebogens
    draw: ({ i }) => { L.quiz.i = i; render(); markPlaying(i); },
    answer: ({ e }) => question(e, L.song.key || 0),
    solve: ({ i }) => { L.quiz.done.add(i); render(); },
    stop() { L.quiz = null; render(); }
  });
}

function startLiedQuiz() {
  const q = opts.quizMode === 'song' ? songQuiz() : randomQuiz();
  if (q) startQuiz(q);
}

/* ---------- Leiste rechts ---------- */
function renderQuizSide() {
  el.liedQuizMode.querySelectorAll('[data-v]').forEach((b) => pressed(b, b.dataset.v === opts.quizMode));
  // Der Tonraum gilt auch für die anderen Spiele; nur beim Durchgehen des Lieds im Quiz braucht es ihn und die
  // Vorzeichen nicht
  [el.liedQuizRange, el.liedQuizRand].forEach((x) => x.classList.toggle('songmode', opts.quizMode === 'song'));
  el.liedQuizLo.textContent = pitchLabel(opts.quizLo);
  el.liedQuizHi.textContent = pitchLabel(opts.quizHi);
  el.liedQuizLoDown.disabled = stepPitch(opts.quizLo, -1) === opts.quizLo;
  el.liedQuizHiUp.disabled = stepPitch(opts.quizHi, 1) === opts.quizHi;
  pressed(el.liedQuizSharp, opts.quizSharp);
  pressed(el.liedQuizFlat, opts.quizFlat);
}
// Tonraum: unten und oben je eine Stufe weiter; der untere Ton bleibt unter dem oberen (er schiebt ihn notfalls mit)
function moveRange(which, steps) {
  if (which === 'lo') {
    opts.quizLo = stepPitch(opts.quizLo, steps);
    if (comparePitch(opts.quizLo, opts.quizHi) >= 0) opts.quizHi = stepPitch(opts.quizLo, 1);
    if (comparePitch(opts.quizLo, opts.quizHi) >= 0) opts.quizLo = stepPitch(opts.quizHi, -1);
  } else {
    opts.quizHi = stepPitch(opts.quizHi, steps);
    if (comparePitch(opts.quizLo, opts.quizHi) >= 0) opts.quizLo = stepPitch(opts.quizHi, -1);
    if (comparePitch(opts.quizLo, opts.quizHi) >= 0) opts.quizHi = stepPitch(opts.quizLo, 1);
  }
  persistOpts();
  renderQuizSide();
}
export function initLiedQuiz() {
  delegate(el.liedQuizMode, '[data-v]', (b) => { opts.quizMode = b.dataset.v; persistOpts(); renderQuizSide(); });
  el.liedQuizLoDown.addEventListener('click', () => moveRange('lo', -1));
  el.liedQuizLoUp.addEventListener('click', () => moveRange('lo', 1));
  el.liedQuizHiDown.addEventListener('click', () => moveRange('hi', -1));
  el.liedQuizHiUp.addEventListener('click', () => moveRange('hi', 1));
  el.liedQuizSharp.addEventListener('click', () => { opts.quizSharp = !opts.quizSharp; persistOpts(); renderQuizSide(); });
  el.liedQuizFlat.addEventListener('click', () => { opts.quizFlat = !opts.quizFlat; persistOpts(); renderQuizSide(); });
  el.liedQuizGo.addEventListener('click', startLiedQuiz);
  renderQuizSide();
}
