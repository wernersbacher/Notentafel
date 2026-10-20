// Üben und Spielen: die Leiste unten auf der Tafel (Rhythmus-Echo, Tonnamen-Quiz) und der Ablauf des Tonnamen-Quiz.
// Es läuft immer nur ein Spiel; ein neues beendet das alte. Beim Wechsel des Bereichs endet es (endGame).
import { previewTone } from './player.js';
import { toast } from './ui.js';
import { el } from './dom.js';

let game = null; // { kind, tap, stop }

// Öffnet die Leiste für ein Spiel: kind 'echo' oder 'quiz', html der Inhalt, tap(knopf) bei jedem Tipp auf einen
// Knopf darin, stop() räumt beim Beenden auf
export function openGame(kind, html, { tap, stop }) {
  endGame();
  game = { kind, tap, stop };
  el.gameBar.className = 'gamebar ' + kind;
  el.gameBar.innerHTML = html;
  el.gameBar.hidden = false;
  el.gameBar.parentNode.classList.add('game-' + kind);
}
export function endGame() {
  if (!game) return;
  const g = game;
  game = null;
  el.gameBar.hidden = true;
  el.gameBar.innerHTML = '';
  el.gameBar.parentNode.classList.remove('game-' + g.kind);
  if (g.stop) g.stop();
}
export const gameOn = (kind) => !!game && (!kind || game.kind === kind);
el.gameBar.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b && !b.disabled && game && game.tap) game.tap(b);
});

export const GAME_ICONS = {
  close: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
  ear: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  eye: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>'
};
// Runder Knopf der Leiste mit Zeichen und kleiner Schrift darunter; act steht in data-act
export const gameBtn = (act, icon, text, cls = '') =>
  '<button type="button" class="gbtn' + (cls ? ' ' + cls : '') + '" data-act="' + act + '" aria-label="' + text + '">' + icon + '<span>' + text + '</span></button>';

/* ---------- Tonnamen-Quiz ---------- */
// q beschreibt, was gefragt wird:
//   keys     Knöpfe unten: [{ key, html, label, style, f, black?, col? }]. layout 'piano': Stammtöne (col 0, 1, 2 …) unten,
//            Halbtöne (black, col = der Stammton links daneben) darüber dazwischen; 'row': alle runden Knöpfe in einer Reihe
//   next()   stellt die nächste Frage und liefert { ok: Set der richtigen keys, f } oder null, wenn es keine mehr gibt
//   solved() zeigt die Lösung; stop() räumt auf; sound 'piano' oder 'bell'; done: Hinweis am Ende
let quiz = null; // { q, cur, timer }

function keysHTML(q) {
  // Klaviatur: jeder Stammton zwei Spalten breit, ein Halbton liegt mittig über der Grenze zweier Stammtöne
  const n = q.keys.filter((k) => !k.black).length;
  const cols = q.layout === 'piano' ? ' style="grid-template-columns:repeat(' + 2 * n + ', minmax(0, 1fr))"' : '';
  return '<div class="qkeys ' + q.layout + '"' + cols + '>' + q.keys.map((k) => {
    const pos = q.layout === 'piano' ? ';grid-column:' + (2 * k.col + (k.black ? 2 : 1)) + ' / span 2;grid-row:' + (k.black ? 1 : 2) : '';
    return '<button type="button" class="qkey' + (k.black ? ' black' : '') + '" data-key="' + k.key + '" style="' + k.style + pos +
      '" aria-label="' + k.label + '">' + k.html + '</button>';
  }).join('') + '</div>';
}
export function startQuiz(q) {
  const html = keysHTML(q) + '<div class="gctl">' + gameBtn('hear', GAME_ICONS.ear, 'anhören') +
    gameBtn('solve', GAME_ICONS.eye, 'Lösung') + gameBtn('end', GAME_ICONS.close, 'Ende') + '</div>';
  openGame('quiz', html, {
    tap: quizTap,
    stop() { clearTimeout(quiz.timer); const x = quiz; quiz = null; x.q.stop(); }
  });
  quiz = { q, cur: null, timer: null };
  quizNext();
}
function quizNext() {
  el.gameBar.querySelectorAll('.qkey').forEach((b) => b.classList.remove('right', 'wrong'));
  quiz.timer = null;
  quiz.cur = quiz.q.next();
  if (!quiz.cur) {
    const done = quiz.q.done;
    endGame();
    if (done) toast(done);
  }
}
// Lösung zeigen und nach einer Pause weiter (die richtigen Knöpfe leuchten so lange)
function solve(wait) {
  quiz.q.solved();
  el.gameBar.querySelectorAll('.qkey').forEach((b) => { if (quiz.cur.ok.has(b.dataset.key)) b.classList.add('right'); });
  previewTone(quiz.cur.f, quiz.q.sound, 0.9);
  quiz.timer = setTimeout(quizNext, wait);
}
function quizTap(b) {
  if (!quiz || !quiz.cur) return;
  const act = b.dataset.act;
  if (act === 'end') { endGame(); return; }
  if (act === 'hear') { previewTone(quiz.cur.f, quiz.q.sound, 0.9); return; }
  if (quiz.timer) return; // die Lösung steht gerade da
  if (act === 'solve') { solve(2200); return; }
  const key = b.dataset.key;
  if (key == null) return;
  if (quiz.cur.ok.has(key)) { solve(1300); return; }
  // Falsch: der Knopf wackelt und wird blass, sein Ton erklingt zum Vergleichen
  b.classList.remove('wrong');
  void b.offsetWidth; // Wackeln neu starten
  b.classList.add('wrong');
  const k = quiz.q.keys.find((x) => String(x.key) === key);
  if (k) previewTone(k.f, quiz.q.sound, 0.6);
}
