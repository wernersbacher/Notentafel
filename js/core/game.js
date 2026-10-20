// Üben und Spielen: die Spielauswahl in der Leiste, die Leiste unten auf der Tafel und der Ablauf der Ratespiele
// (Tonnamen-Quiz, Welcher war's?, Melodie-Echo, Höher oder tiefer?, Note setzen, Schritt oder Sprung).
// Es läuft immer nur ein Spiel; ein neues beendet das alte. Beim Wechsel des Bereichs endet es (endGame).
import { previewTone, playNow, stopPlay, holdSound, releaseSound } from './player.js';
import { settings, persistSettings } from './settings.js';
import { clearPractice, playing, onShow } from './shell.js';
import { toast } from './ui.js';
import { el } from './dom.js';

let game = null; // { kind, tap, stop }

// Öffnet die Leiste für ein Spiel: kind z. B. 'echo' oder 'quiz', html der Inhalt, tap(knopf) bei jedem Tipp auf einen
// Knopf darin, stop() räumt beim Beenden auf
export function openGame(kind, html, { tap, stop }) {
  endGame();
  el.gameIntro.hidden = true;
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
  showIntro(); // zurück auf die Startseite des Spiels
}
export const gameOn = (kind) => !!game && (!kind || game.kind === kind);
el.gameBar.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || b.disabled || !game) return;
  // Vor „Spiel starten“ wirken nur dieser Knopf und „Ende“
  if (game.gate) { if (b.dataset.act === 'start') gameStart(); else if (b.dataset.act === 'end') endGame(); return; }
  if (game.tap) game.tap(b);
});
// Spiele, bei denen man die Aufgabe sieht und zugleich hört: Die erste Aufgabe (first()) steht gleich auf der Tafel,
// ihr Ton aber noch nicht. Erst „Spiel starten“ in der Leiste lässt ihn erklingen, so sehen die Kinder sie zuerst in
// Ruhe. Bis dahin ist die Leiste blass und nur „Ende“ wirkt. Klingt bei first() nichts, geht es gleich los.
function gameFirst(first) {
  holdSound();
  try { first(); } finally {
    const replay = releaseSound();
    if (replay && game) {
      game.gate = replay;
      el.gameBar.classList.add('gated');
      const box = el.gameBar.querySelector('.gctl');
      (box || el.gameBar).insertAdjacentHTML('afterbegin', gameBtn('start', PLAY_ICON, 'Spiel starten', box ? 'main' : 'main big'));
    }
  }
}
// Lässt den zurückgehaltenen Ton erklingen
function gameStart() {
  if (!game || !game.gate) return;
  const replay = game.gate;
  game.gate = null;
  el.gameBar.classList.remove('gated');
  el.gameBar.querySelector('.gbtn[data-act="start"]').remove();
  replay();
}

export const GAME_ICONS = {
  close: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
  ear: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  eye: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
  check: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5L19.5 6.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 5.5l6.5 6.5-6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
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
// Ein Tipp auf eine Kachel beendet das laufende Spiel und macht die Übungstafel leer.
function showPick(box) {
  const play = box.closest('.play'), ids = [...box.querySelectorAll('[data-game]')].map((b) => b.dataset.game);
  const want = settings.game[box.dataset.area], g = ids.includes(want) ? want : ids[0];
  play.dataset.game = g;
  box.querySelectorAll('[data-game]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.game === g ? 'true' : 'false'));
  play.querySelectorAll('.game[data-game]').forEach((x) => { x.hidden = x.dataset.game !== g; });
  play.querySelectorAll('[data-for]').forEach((x) => { x.hidden = !x.dataset.for.split(' ').includes(g); });
}
// Startseite auf der Tafel, solange beim Üben kein Spiel läuft: Name des gewählten Spiels, eine kurze Erklärung für die
// Kinder (data-intro an seinem Abschnitt) und „Los geht's!“, das wie der Startknopf in der Leiste wirkt (.gamego)
const PLAY_ICON = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>';
let introGo = null;
function showIntro() {
  const box = playing() && !game && document.querySelector('.gamepick[data-area="' + document.getElementById('side').dataset.area + '"]');
  const tile = box && box.querySelector('[aria-pressed="true"]');
  const sec = tile && box.closest('.play').querySelector('.game[data-game="' + tile.dataset.game + '"]');
  introGo = sec && sec.querySelector('.gamego');
  el.gameIntro.hidden = !introGo;
  if (!introGo) { el.gameIntro.innerHTML = ''; return; }
  el.gameIntro.innerHTML = '<div class="gintro"><h2>' + tile.textContent + '</h2><p>' + (sec.dataset.intro || '') + '</p>' +
    '<button type="button" class="gbtn main big" data-act="go">' + PLAY_ICON + '<span>Los geht\'s!</span></button></div>';
}
el.gameIntro.addEventListener('click', (e) => { if (e.target.closest('[data-act="go"]') && introGo) introGo.click(); });

export function initGamePicks() {
  document.querySelectorAll('.gamepick').forEach((box) => {
    showPick(box);
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-game]');
      if (!b) return;
      settings.game[box.dataset.area] = b.dataset.game;
      persistSettings();
      endGame();
      clearPractice(); // jedes Spiel beginnt auf einer leeren Tafel
      showPick(box);
      showIntro();
    });
  });
  onShow(showIntro); // beim Wechsel des Bereichs oder zwischen schreiben und üben
  showIntro();
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
//   wrong(key)  (optional) nach einer falschen Antwort, z. B. sie auf der Tafel rot markieren. Dabei klingt nichts:
//            zu hören ist nur, was richtig ist
//   solved() zeigt die Lösung (mit hear() lässt sie sie auch selbst hören)
//   replay(key)  (optional) Tipp auf eine Antwort, wenn die Frage gelöst ist (z. B. diesen Rhythmus abspielen); sonst
//            klingt der Ton des Knopfs, falls er einen hat
//   row(r)   (optional, Tafel) Tipp auf die Zeilennummer r, wenn die Frage gelöst ist; die Zeile klappt dann nie ein
//   cell(r, c)  (optional, Tafel) die Antwort, die ein Tipp auf den Platz (r, c) gibt, oder null
//   stop()   räumt auf; sound 'piano' oder 'bell'; done: Hinweis am Ende
//   rekey    die Antwortknöpfe ändern sich mit jeder Frage (next() setzt q.keys neu, z. B. Lied erraten)
//   look     die Aufgabe ist zu sehen und zu hören (z. B. Fehler finden): Die erste erklingt erst mit „Spiel starten“
// Rückmeldung: Eine richtige Antwort wird grün, eine falsche rot (sie bleibt es bis zur nächsten Frage), über der Leiste
// steht dazu ein Hinweis. Ist die Frage gelöst (richtig getippt oder „Lösung“), geht es erst mit „Weiter“ weiter.
let quiz = null; // { q, cur, solved: false, 'right' (richtig getippt) oder 'shown' (Lösung gezeigt) }

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
  quiz = { q, cur: null, solved: false };
  if (q.look) gameFirst(quizNext); else quizNext();
}
function quizNext() {
  el.gameBar.querySelectorAll('.qkey').forEach((b) => b.classList.remove('right', 'wrong', 'shown'));
  quiz.solved = false;
  el.gameBar.parentNode.classList.remove('rowplay');
  feedback(null);
  setMain(false);
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
  if (!quiz || !quiz.cur || game.gate) return; // vor „Spiel starten“ wird noch nicht geantwortet
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
  if (act === 'next') { quizNext(); return; }
  if (act === 'solve') { if (!quiz.solved) solve(false); return; }
  if (b.dataset.key != null) answer(b.dataset.key, b);
}
