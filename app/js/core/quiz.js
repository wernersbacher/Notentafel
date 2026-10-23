// Die Quiz-Engine der Ratespiele: Leiste mit Antwortknöpfen, Frage, Lösung und Rückmeldung. Den Rahmen (openGame,
// endGame, gameFirst) und die Auswahl der Spiele gibt game.js vor; hier liegt nur, wie eine Frage abläuft.
import { previewTone, stopPlay } from './player.js';
import { toast } from './ui.js';
import { plan, limitText } from './tier.js';
import { el } from './dom.js';
import { openGame, endGame, gameFirst, gameBtn, GAME_ICONS, gameGated } from './game.js';

/* ---------- Ratespiele ---------- */
// q beschreibt das Spiel:
//   keys     Antwortknöpfe unten: [{ key, html, label, style, f, black?, col?, cls? }]. layout 'piano': Stammtöne (col 0,
//            1, 2 …) unten, Halbtöne (black, col = der Stammton links daneben) darüber dazwischen; 'row': runde Knöpfe in
//            einer Reihe; 'words': breite Knöpfe mit Wörtern. Ohne keys keine Knöpfe: Geantwortet wird dann mit
//            quizAnswer(key), z. B. durch Tippen auf die Notenlinien (Note setzen).
//   next()   stellt die nächste Frage und liefert { ok: Set der richtigen keys, f } oder null, wenn es keine mehr gibt
//   answer(key)  (optional) prüft selbst: 'done' gelöst, 'step' richtig und es geht weiter (Melodie-Echo), 'wrong';
//            sonst ist key richtig, wenn er in ok steht
//   hear()   (optional) lässt die Frage noch einmal hören; sonst klingt der Ton f
//   wrong(key)  (optional) nach einer falschen Antwort, z. B. sie auf der Tafel rot markieren. Dabei klingt nichts:
//            zu hören ist nur, was richtig ist
//   solved() zeigt die Lösung (mit hear() lässt sie sie auch selbst hören)
//   replay(key)  (optional) Tipp auf eine Antwort, wenn die Frage gelöst ist (z. B. diesen Rhythmus abspielen); sonst
//            klingt der Ton des Knopfs, falls er einen hat
//   row(r)   (optional, Tafel) Tipp auf die Zeilennummer r, wenn die Frage gelöst ist; die Zeile klappt dann nie ein
//   cell(r, c)  (optional, Tafel) die Antwort, die ein Tipp auf den Platz (r, c) gibt, oder null
//   stop()   räumt auf; sound 'piano' oder 'bell'; done: Hinweis am Ende
//   rekey    die Antwortknöpfe ändern sich mit jeder Frage (next() setzt q.keys neu, z. B. Lied erraten)
//   gateEach  auch nach „Weiter“ steht die Frage erst in Ruhe da und ihr Ton klingt erst nach „Abspielen“ (sonst gilt das
//            nur für die erste Frage)
// Rückmeldung: Eine richtige Antwort wird grün, eine falsche rot (sie bleibt es bis zur nächsten Frage), über der Leiste
// steht dazu ein Hinweis. Ist die Frage gelöst (richtig getippt oder „Lösung“), geht es erst mit „Weiter“ weiter.
let quiz = null; // { q, cur, solved: false, 'right' (richtig getippt) oder 'shown' (Lösung gezeigt) }

/* ---------- Fragen bauen ---------- */
// Die Antwort einer Frage: richtiger Schlüssel als String und der Ton, der dazu klingt
export const answerOf = (key, f) => ({ ok: new Set([String(key)]), f });

// Zufallsfragen für ein q: candidates() liefert alle möglichen Fragen (bei jedem next() neu, sie hängen an den
// Einstellungen), same(a, b) erkennt dieselbe Frage (sie kommt nicht zweimal hintereinander), draw(x, solved) zeichnet
// die Frage ungelöst bzw. mit Lösung, answer(x) liefert ihre Antwort, stop() räumt die Ansicht auf
export function randomQuiz({ layout, sound, keys, candidates, same, draw, answer, stop }) {
  let cur = null;
  return {
    layout, sound, keys,
    next() {
      const all = candidates().filter((x) => !cur || !same(x, cur));
      cur = all[Math.floor(Math.random() * all.length)];
      draw(cur, false);
      return answer(cur);
    },
    solved() { draw(cur, true); },
    stop
  };
}

// Fragen der Reihe nach für ein q: items() liefert die Stellen in Fragefolge, step(item) sagt, ob eine Stelle noch zählt
// (Lied und Tafel können sich inzwischen geändert haben), draw(item) zeigt sie als aktuelle Frage, answer(item) liefert
// ihre Antwort, solve(item) merkt sie als benannt, stop() räumt auf. draw läuft vor answer: die Antwort wird erst nach
// dem Zeichnen gelesen.
export function songQuiz({ layout, sound, keys, done, items, step, draw, answer, solve, stop }) {
  let k = -1, cur = null;
  return {
    layout, sound, keys, done,
    next() {
      const all = items();
      for (k++; k < all.length; k++) {
        const item = all[k];
        if (!step(item)) continue;
        cur = item;
        draw(item);
        return answer(item);
      }
      return null;
    },
    solved() { solve(cur); },
    stop
  };
}

const FEED = {
  right: ['check', 'Richtig!'],
  wrong: ['close', 'Leider falsch – probier es nochmal'],
  shown: ['eye', 'Das ist die Lösung']
};
// Hinweis über der Leiste (kind null: keiner); er springt bei jeder Antwort neu auf
function feedback(kind) {
  const f = el.gameBar.querySelector('.gfeed');
  if (!f) return;
  f.hidden = !kind;
  f.className = 'gfeed';
  if (!kind) return;
  f.innerHTML = GAME_ICONS[FEED[kind][0]] + '<span>' + FEED[kind][1] + '</span>';
  void f.offsetWidth; // Aufspringen neu starten
  f.classList.add(kind);
}
// Ungelöst „Lösung“, gelöst „Weiter“ (dunkel, damit man ihn findet)
function setMain(solved) {
  const b = el.gameBar.querySelector('.gbtn[data-act="solve"], .gbtn[data-act="next"]');
  if (b) b.outerHTML = solved ? gameBtn('next', GAME_ICONS.next, 'Weiter', 'main') : gameBtn('solve', GAME_ICONS.eye, 'Lösung');
}
// Tipp auf den Platz (r, c) der Tafel: true, wenn das Spiel ihn übernimmt (dann wird nichts markiert oder verschoben).
// q.cell(r, c) liefert die Antwort dazu (wie ein Tipp auf ihren Knopf) oder null
export function quizCell(r, c) {
  if (!quiz || !quiz.q.cell) return false;
  const key = quiz.q.cell(r, c);
  if (key != null) answer(String(key), el.gameBar.querySelector('.qkey[data-key="' + key + '"]'));
  return true;
}
// Tipp auf eine Zeilennummer der Tafel: true, wenn das Spiel ihn übernimmt (dann klappt die Zeile nicht ein)
export function quizRow(r) {
  if (!quiz || !quiz.q.row) return false;
  if (quiz.solved) quiz.q.row(r);
  return true;
}

function keysHTML(q) {
  if (!q.keys || !q.keys.length) return q.rekey ? '<div class="qkeys ' + q.layout + '"></div>' : ''; // rekey: Platz für die Knöpfe der ersten Frage
  // Klaviatur: jeder Stammton zwei Spalten breit, ein Halbton liegt mittig über der Grenze zweier Stammtöne
  const n = q.keys.filter((k) => !k.black).length;
  const cols = q.layout === 'piano' ? ' style="grid-template-columns:repeat(' + 2 * n + ', minmax(0, 1fr))"' : '';
  return '<div class="qkeys ' + q.layout + '"' + cols + '>' + q.keys.map((k) => {
    const pos = q.layout === 'piano' ? ';grid-column:' + (2 * k.col + (k.black ? 2 : 1)) + ' / span 2;grid-row:' + (k.black ? 1 : 2) : '';
    return '<button type="button" class="qkey' + (k.black ? ' black' : '') + (k.cls ? ' ' + k.cls : '') + '" data-key="' + k.key + '" style="' + (k.style || '') + pos +
      '" aria-label="' + k.label + '">' + k.html + '</button>';
  }).join('') + '</div>';
}
export function startQuiz(q) {
  const html = '<div class="gfeed" role="status" hidden></div>' + keysHTML(q) + '<div class="gctl">' + gameBtn('hear', GAME_ICONS.ear, 'anhören') +
    gameBtn('solve', GAME_ICONS.eye, 'Lösung') + gameBtn('end', GAME_ICONS.close, 'Ende') + '</div>';
  openGame('quiz', html, {
    tap: quizTap,
    stop() { stopPlay(); el.gameBar.parentNode.classList.remove('rowplay'); const x = quiz; quiz = null; x.q.stop(); }
  });
  quiz = { q, cur: null, solved: false, asked: 0 };
  gameFirst(quizNext);
}
function quizNext() {
  el.gameBar.querySelectorAll('.qkey').forEach((b) => b.classList.remove('right', 'wrong', 'shown'));
  quiz.solved = false;
  el.gameBar.parentNode.classList.remove('rowplay');
  feedback(null);
  setMain(false);
  // Lite: eine Runde hat höchstens limit('quizQuestions') Fragen, danach endet sie mit einem Hinweis
  const max = plan.limit('quizQuestions');
  if (max != null && quiz.asked >= max) { endGame(); toast(limitText('quizQuestions'), true); return; }
  quiz.asked++;
  quiz.cur = quiz.q.next();
  const box = quiz.cur && quiz.q.rekey && el.gameBar.querySelector('.qkeys');
  if (box) box.outerHTML = keysHTML(quiz.q);
  if (!quiz.cur) {
    const done = quiz.q.done;
    endGame();
    if (done) toast(done);
  }
}
function hear() {
  if (quiz.q.hear) quiz.q.hear();
  else previewTone(quiz.cur.f, quiz.q.sound, 0.9);
}
// Lösung zeigen: richtig getippt (right) werden die richtigen Knöpfe grün, sonst grün umrandet. Es bleibt so bis „Weiter“
function solve(right) {
  quiz.solved = right ? 'right' : 'shown';
  quiz.q.solved();
  el.gameBar.querySelectorAll('.qkey').forEach((b) => { if (quiz.cur.ok.has(b.dataset.key)) b.classList.add(quiz.solved); });
  if (!quiz.q.hear) previewTone(quiz.cur.f, quiz.q.sound, 0.9);
  feedback(quiz.solved);
  setMain(true);
  if (quiz.q.row) el.gameBar.parentNode.classList.add('rowplay'); // die Zeilennummern spielen jetzt ab
}
function answer(key, b) {
  if (!quiz || !quiz.cur || gameGated()) return; // vor „Abspielen“ wird noch nicht geantwortet
  // Gelöst: ein Tipp auf eine Antwort lässt sie hören
  if (quiz.solved) {
    if (quiz.q.replay) { quiz.q.replay(key); return; }
    const k = (quiz.q.keys || []).find((x) => String(x.key) === key);
    if (k && k.f) previewTone(k.f, quiz.q.sound, 0.6);
    return;
  }
  const r = quiz.q.answer ? quiz.q.answer(key) : quiz.cur.ok.has(key) ? 'done' : 'wrong';
  if (r === 'done') { solve(true); return; }
  if (r === 'step') {
    // Richtig, es geht weiter: der Knopf leuchtet kurz grün, die falschen von vorher sind wieder normal
    el.gameBar.querySelectorAll('.qkey.wrong').forEach((x) => x.classList.remove('wrong'));
    feedback(null);
    if (b) { b.classList.add('right'); setTimeout(() => b.classList.remove('right'), 450); }
    return;
  }
  // Falsch: der Knopf wackelt und wird rot; es klingt nichts
  if (b) {
    b.classList.remove('wrong');
    void b.offsetWidth; // Wackeln neu starten
    b.classList.add('wrong');
  }
  feedback('wrong');
  if (quiz.q.wrong) quiz.q.wrong(key);
}
// Antwort von außerhalb der Leiste (z. B. ein Tipp auf die Notenlinien)
export const quizAnswer = (key) => answer(String(key), null);
function quizTap(b) {
  if (!quiz || !quiz.cur) return;
  const act = b.dataset.act;
  if (act === 'end') { endGame(); return; }
  if (act === 'hear') { hear(); return; }
  if (act === 'next') { if (quiz.q.gateEach) gameFirst(quizNext); else quizNext(); return; }
  if (act === 'solve') { if (!quiz.solved) solve(false); return; }
  if (b.dataset.key != null) answer(b.dataset.key, b);
}
