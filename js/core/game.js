// Üben und Spielen: die Spielauswahl in der Leiste, die Leiste unten auf der Tafel und der Ablauf der Ratespiele
// (Tonnamen-Quiz, Welcher war's?, Melodie-Echo, Höher oder tiefer?, Note setzen, Schritt oder Sprung).
// Es läuft immer nur ein Spiel; ein neues beendet das alte. Beim Wechsel des Bereichs endet es (endGame).
import { previewTone, playNow, stopPlay } from './player.js';
import { settings, persistSettings } from './settings.js';
import { toast } from './ui.js';
import { el } from './dom.js';

let game = null; // { kind, tap, stop }

// Öffnet die Leiste für ein Spiel: kind z. B. 'echo' oder 'quiz', html der Inhalt, tap(knopf) bei jedem Tipp auf einen
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
  eye: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
  dice: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="8.5" cy="8.5" r="1.7" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.7" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.7" fill="currentColor"/></svg>'
};
// Runder Knopf der Leiste mit Zeichen und kleiner Schrift darunter; act steht in data-act
export const gameBtn = (act, icon, text, cls = '') =>
  '<button type="button" class="gbtn' + (cls ? ' ' + cls : '') + '" data-act="' + act + '" aria-label="' + text + '">' + icon + '<span>' + text + '</span></button>';

// Spielt Töne nacheinander, ohne Einzählen und Metronom: [{ f, len }] in Schlägen (mit gap Schlägen Pause dazwischen),
// sound wie beim Player; mark(i) bekommt den klingenden Ton (null am Ende)
export function playTones(tones, sound, mark = () => {}, gap = 0.15) {
  const items = [];
  let t = 0;
  tones.forEach((x, i) => { items.push({ t, len: x.len || 1, sound, f: x.f, pos: i }); t += (x.len || 1) + gap; });
  playNow({ items, end: t - gap, bare: true }, mark);
}

/* ---------- Spielauswahl ---------- */
// In der Leiste jedes Bereichs wählen Kacheln (.gamepick mit data-area, Knöpfe mit data-game) ein Spiel. Zu sehen ist
// dann sein Abschnitt (.game mit data-game) und die Einstellungen, die es betreffen (data-for: Spiele, durch Leerzeichen
// getrennt). Der Rahmen .play trägt das Spiel in data-game (für das CSS). Die Wahl bleibt gemerkt (settings.game).
function showPick(box) {
  const play = box.closest('.play'), ids = [...box.querySelectorAll('[data-game]')].map((b) => b.dataset.game);
  const want = settings.game[box.dataset.area], g = ids.includes(want) ? want : ids[0];
  play.dataset.game = g;
  box.querySelectorAll('[data-game]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.game === g ? 'true' : 'false'));
  play.querySelectorAll('.game[data-game]').forEach((x) => { x.hidden = x.dataset.game !== g; });
  play.querySelectorAll('[data-for]').forEach((x) => { x.hidden = !x.dataset.for.split(' ').includes(g); });
}
export function initGamePicks() {
  document.querySelectorAll('.gamepick').forEach((box) => {
    showPick(box);
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-game]');
      if (!b) return;
      settings.game[box.dataset.area] = b.dataset.game;
      persistSettings();
      endGame();
      showPick(box);
    });
  });
}

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
//   wrong(key)  (optional) nach einer falschen Antwort; sonst klingt der Ton des Knopfs zum Vergleichen
//   solved() zeigt die Lösung (mit hear() lässt sie sie auch selbst hören); wait: Pause danach in ms (Zahl oder Funktion)
//   stop()   räumt auf; sound 'piano' oder 'bell'; done: Hinweis am Ende
let quiz = null; // { q, cur, timer }

function keysHTML(q) {
  if (!q.keys || !q.keys.length) return '';
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
  const html = keysHTML(q) + '<div class="gctl">' + gameBtn('hear', GAME_ICONS.ear, 'anhören') +
    gameBtn('solve', GAME_ICONS.eye, 'Lösung') + gameBtn('end', GAME_ICONS.close, 'Ende') + '</div>';
  openGame('quiz', html, {
    tap: quizTap,
    stop() { clearTimeout(quiz.timer); stopPlay(); const x = quiz; quiz = null; x.q.stop(); }
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
function hear() {
  if (quiz.q.hear) quiz.q.hear();
  else previewTone(quiz.cur.f, quiz.q.sound, 0.9);
}
// Lösung zeigen und nach einer Pause weiter (die richtigen Knöpfe leuchten so lange)
function solve(wait) {
  quiz.q.solved();
  el.gameBar.querySelectorAll('.qkey').forEach((b) => { if (quiz.cur.ok.has(b.dataset.key)) b.classList.add('right'); });
  if (!quiz.q.hear) previewTone(quiz.cur.f, quiz.q.sound, 0.9);
  const w = quiz.q.wait;
  quiz.timer = setTimeout(quizNext, typeof w === 'function' ? w() : w || wait);
}
function answer(key, b) {
  if (!quiz || !quiz.cur || quiz.timer) return; // keine Frage, oder die Lösung steht gerade da
  const r = quiz.q.answer ? quiz.q.answer(key) : quiz.cur.ok.has(key) ? 'done' : 'wrong';
  if (r === 'done') { solve(1300); return; }
  if (r === 'step') {
    // Richtig, es geht weiter: der Knopf leuchtet kurz auf
    if (b) { b.classList.add('right'); setTimeout(() => b.classList.remove('right'), 450); }
    return;
  }
  // Falsch: der Knopf wackelt und wird blass, sein Ton erklingt zum Vergleichen
  if (b) {
    b.classList.remove('wrong');
    void b.offsetWidth; // Wackeln neu starten
    b.classList.add('wrong');
  }
  if (quiz.q.wrong) { quiz.q.wrong(key); return; }
  const k = (quiz.q.keys || []).find((x) => String(x.key) === key);
  if (k && k.f) previewTone(k.f, quiz.q.sound, 0.6);
}
// Antwort von außerhalb der Leiste (z. B. ein Tipp auf die Notenlinien)
export const quizAnswer = (key) => answer(String(key), null);
function quizTap(b) {
  if (!quiz || !quiz.cur) return;
  const act = b.dataset.act;
  if (act === 'end') { endGame(); return; }
  if (act === 'hear') { hear(); return; }
  if (quiz.timer) return; // die Lösung steht gerade da
  if (act === 'solve') { solve(2200); return; }
  if (b.dataset.key != null) answer(b.dataset.key, b);
}
