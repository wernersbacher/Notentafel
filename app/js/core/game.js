// Üben und Spielen: die Spielauswahl in der Leiste, die Leiste unten auf der Tafel und der Ablauf der Ratespiele
// (Tonnamen-Quiz, Welcher war's?, Melodie-Echo, Höher oder tiefer?, Note setzen, Schritt oder Sprung).
// Es läuft immer nur ein Spiel; ein neues beendet das alte. Beim Wechsel des Bereichs endet es (endGame).
import { playNow, holdSound, releaseSound } from './player.js';
import { settings, persistSettings } from './settings.js';
import { clearPractice, playing, onShow } from './shell.js';
import { el } from './dom.js';
import { PLAY, CLOSE, EAR } from './icons.js';

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
// Wartet das Spiel noch auf „Abspielen“? Bis dahin wird nicht geantwortet (die Quiz-Engine fragt hier nach)
export const gameGated = () => !!game && !!game.gate;
el.gameBar.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || b.disabled || !game) return;
  // Vor „Abspielen“ wirken nur dieser Knopf und „Ende“
  if (game.gate) { if (b.dataset.act === 'start') gameStart(); else if (b.dataset.act === 'end') endGame(); return; }
  if (game.tap) game.tap(b);
});
// Spiele mit Ton: Die erste Aufgabe (first()) steht gleich auf der Tafel,
// ihr Ton aber noch nicht. Erst „Abspielen“ in der Leiste lässt ihn erklingen, so sehen die Kinder sie zuerst in
// Ruhe. Bis dahin ist die Leiste blass und nur „Ende“ wirkt. Klingt bei first() nichts, geht es gleich los.
export function gameFirst(first) {
  holdSound();
  try { first(); } finally {
    const replay = releaseSound();
    if (replay && game) {
      game.gate = replay;
      el.gameBar.classList.add('gated');
      const box = el.gameBar.querySelector('.gctl');
      (box || el.gameBar).insertAdjacentHTML('afterbegin', gameBtn('start', PLAY, 'Abspielen', box ? 'main' : 'main big'));
    }
  }
}
// Lässt den zurückgehaltenen Ton erklingen; false, wenn nichts wartet
export function gameStart() {
  if (!game || !game.gate) return false;
  const replay = game.gate;
  game.gate = null;
  el.gameBar.classList.remove('gated');
  el.gameBar.querySelector('.gbtn[data-act="start"]').remove();
  replay();
  return true;
}

export const GAME_ICONS = {
  close: CLOSE,
  ear: EAR,
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

/* ---------- Rahmen der Spielabschnitte ---------- */
// Ein Bereich beschreibt seine Spiele selbst ({ game, intro, hint, hintId?, go, label }, siehe tafel/gameFrames.js);
// daraus entstehen sein Hinweis und sein Startknopf. frameHTML liefert den Rahmen als String, fillGameFrames setzt
// data-intro am Abschnitt und fügt ihn vorn ein – vor den Einstellungen, die im HTML stehen bleiben.
function frameHTML(f) {
  return '<p class="ghint"' + (f.hintId ? ' id="' + f.hintId + '"' : '') + '>' + f.hint + '</p>' +
    '<button type="button" class="btn gamego" id="' + f.go + '"><svg class="ico" aria-hidden="true"><use href="#play"/></svg><span>' + f.label + '</span></button>';
}
export function fillGameFrames(sectionId, frames) {
  const box = document.getElementById(sectionId);
  frames.forEach((f) => {
    const sec = box.querySelector('.game[data-game="' + f.game + '"]');
    sec.dataset.intro = f.intro;
    sec.insertAdjacentHTML('afterbegin', frameHTML(f));
  });
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
let introGo = null;
function showIntro() {
  const box = playing() && !game && document.querySelector('.gamepick[data-area="' + document.getElementById('side').dataset.area + '"]');
  const tile = box && box.querySelector('[aria-pressed="true"]');
  const sec = tile && box.closest('.play').querySelector('.game[data-game="' + tile.dataset.game + '"]');
  introGo = sec && sec.querySelector('.gamego');
  el.gameIntro.hidden = !introGo;
  if (!introGo) { el.gameIntro.innerHTML = ''; return; }
  el.gameIntro.innerHTML = '<div class="gintro"><h2>' + tile.textContent + '</h2><p>' + (sec.dataset.intro || '') + '</p>' +
    '<button type="button" class="gbtn main big" data-act="go">' + PLAY + '<span>Los geht\'s!</span></button></div>';
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

// quiz.js nutzt den Rahmen von hier; seine bisherigen Exporte bleiben unter ../core/game.js erreichbar
