// Weitere Spiele im Notenblatt („Üben und Spielen“), im Tonraum des Tonnamen-Quiz und nur mit Stammtönen:
//   Note setzen          Ein Notenname steht unter leeren Notenlinien; die Kinder schieben mit dem Finger eine Note auf
//                        die Linie oder in den Zwischenraum, sie rastet dort ein, erst das Loslassen zählt. Eine falsche
//                        Note bleibt kurz rot stehen und erklingt nicht.
//   Schritt oder Sprung? Zwei Noten stehen nebeneinander und erklingen; die Kinder sagen, ob es ein Schritt zum
//                        Nachbarton, ein Sprung oder derselbe Ton ist.
//   Notenwerte           Eine Note oder Pause steht groß über der Tafel und erklingt mit dem Grundschlag; die Kinder
//                        tippen ihren Namen (Ganze, Halbe, Viertel …).
import { parsePitch, makePitch, staffPos, freq, pitchLabel, whiteRange, makeInterval, OCT_MIN, OCT_MAX } from './model.js';
import { clef, staffLines, yOf, head, stem, ledger, flags, dot, rest } from './glyphs.js';
import { frameOf } from './quiz.js';
import { opts, persistOpts } from './state.js';
import { toneColor } from '../core/colors.js';
import { startQuiz, quizAnswer, playTones } from '../core/game.js';
import { previewTone, stopPlay, playNow } from '../core/player.js';
import { delegate, setPressed } from '../core/ui.js';
import { el } from './dom.js';

const rnd = (n) => Math.floor(Math.random() * n);

// Eine Note auf dem Platz von p bei x, mit Hilfslinien und Hals (v 1: ganze Note ohne Hals); cls für das CSS (z. B.
// blass), color nach Wahl farbig
function note(x, p, cls = '', color = null, v = 4) {
  const pos = staffPos(p), y = yOf(pos);
  let s = '';
  for (let q = -2; q >= pos; q -= 2) s += ledger(x, yOf(q), 1.05);
  for (let q = 10; q <= pos; q += 2) s += ledger(x, yOf(q), 1.05);
  s += head(x, y, v, color);
  const up = pos < 4, end = up ? Math.max(pos + 7, 4) : Math.min(pos - 7, 4);
  if (v > 1) s += stem(x + (up ? 0.6 : -0.6), y + (up ? -0.1 : 0.1), yOf(end));
  return '<g class="qn' + (cls ? ' ' + cls : '') + '">' + s + '</g>';
}
const colorOf = (p) => (opts.colors ? toneColor(parsePitch(p).step, 0) : null);
const staffSVG = (frame, inner, label) =>
  '<svg class="qstaff" viewBox="0 ' + frame.top + ' 16 ' + (frame.bottom - frame.top) + '" fill="currentColor" role="img" aria-label="' + label + '">' +
  staffLines(0.4, 15.6) + clef(1, yOf(2)) + inner + '</svg>';

/* ---------- Note setzen ---------- */
const X = 10.5;
let onStaff = null; // während „Note setzen“: { move(y), up(y) } für den Finger auf den Notenlinien (Höhe in Linienabständen)

// Tonhöhe auf dem Platz pos (halbe Linienabstände, unterste Linie 0), begrenzt auf den Tonumfang des Notenblatts
function pitchAt(pos) {
  const d = Math.max(OCT_MIN * 7, Math.min(OCT_MAX * 7 + 6, pos + 9));
  return makePitch(d % 7, Math.floor(d / 7));
}
function placeQuiz() {
  const lo = opts.quizLo, hi = opts.quizHi, whites = whiteRange(lo, hi);
  // Nur so viel Platz um die Notenlinien wie der Tonraum braucht (ganze Noten, ohne Hälse): So werden die Linien groß
  const frame = { top: Math.min(-1.2, yOf(staffPos(hi)) - 1.2), bottom: Math.max(5.2, yOf(staffPos(lo)) + 1.2) };
  // Ein Tipp über oder unter dem Bild zählt für den äußersten Platz darin
  const posAt = (y) => Math.max(Math.ceil(8 - 2 * frame.bottom), Math.min(Math.floor(8 - 2 * frame.top), Math.round(8 - 2 * y)));
  let target = null, miss = null, solved = false, fade = null;
  const show = () => {
    const inner = (miss ? note(X, miss, 'miss', null, 1) : '') + (solved ? note(X, target, 'hit', colorOf(target), 1) : '');
    el.quizView.innerHTML = '<div class="qset">' + staffSVG(frame, inner + '<g class="qghost"></g>', 'Notenlinien: Wo steht ' + pitchLabel(target) + '?') +
      '<p class="qname">' + pitchLabel(target) + '</p></div>';
  };
  // Unter dem Finger: blasse Note auf dem nächsten Platz, die Linie oder der Zwischenraum hinterlegt (y null: weg)
  const ghost = (y) => {
    const g = el.quizView.querySelector('.qghost');
    if (!g) return;
    const pos = y == null ? null : posAt(y);
    g.innerHTML = pos == null ? '' : '<rect class="qband" x="0.4" y="' + (yOf(pos) - 0.25) + '" width="15.2" height="0.5"/>' + note(X, pitchAt(pos), 'ghost', null, 1);
  };
  onStaff = { move: ghost, up(y) { ghost(null); quizAnswer(pitchAt(posAt(y))); } };
  el.quizView.hidden = false;
  return {
    sound: 'piano',
    next() {
      const all = whites.filter((p) => p !== target);
      target = all[rnd(all.length)];
      miss = null;
      solved = false;
      show();
      return { ok: new Set([target]), f: freq({ p: target }) };
    },
    // Daneben: die getippte Note bleibt kurz rot stehen, es klingt nichts
    wrong(p) {
      miss = p;
      show();
      clearTimeout(fade);
      fade = setTimeout(() => { miss = null; if (!solved) show(); }, 1400);
    },
    solved() { miss = null; solved = true; show(); },
    // Gelöst: ein Tipp auf die Notenlinien lässt den Ton dort hören
    replay: (p) => previewTone(freq({ p }), 'piano', 0.6),
    stop() { onStaff = null; clearTimeout(fade); el.quizView.hidden = true; el.quizView.innerHTML = ''; }
  };
}

/* ---------- Schritt oder Sprung? ---------- */
const STEP_KEYS = [
  { key: 'step', html: '<span>Schritt</span>', label: 'Schritt' },
  { key: 'leap', html: '<span>Sprung</span>', label: 'Sprung' },
  { key: 'same', html: '<span>gleich</span>', label: 'gleich' }
];
function stepQuiz() {
  const lo = opts.quizLo, hi = opts.quizHi, frame = frameOf(lo, hi), whites = whiteRange(lo, hi);
  let a, b, solved = false;
  const show = () => {
    let inner = note(6.5, a, '', solved ? colorOf(a) : null) + note(12, b, '', solved ? colorOf(b) : null);
    if (solved) inner += [[6.5, a], [12, b]].map(([x, p]) => '<text class="qnm" x="' + x + '" y="' + (frame.bottom - 0.9) + '">' + pitchLabel(p) + '</text>').join('');
    el.quizView.innerHTML = staffSVG(frame, inner, 'Zwei Noten');
  };
  // Die klingende Note leuchtet
  const mark = (k) => el.quizView.querySelectorAll('.qn').forEach((g, i) => g.classList.toggle('on', i === k));
  const hear = () => playTones([{ f: freq({ p: a }) }, { f: freq({ p: b }) }], 'piano', mark, 0.3);
  el.quizView.hidden = false;
  return {
    layout: 'words', sound: 'piano', keys: STEP_KEYS,
    next() {
      stopPlay();
      let kind;
      [a, b, kind] = makeInterval(whites);
      solved = false;
      show();
      hear();
      return { ok: new Set([kind]) };
    },
    hear,
    solved() { solved = true; show(); hear(); },
    stop() { el.quizView.hidden = true; el.quizView.innerHTML = ''; }
  };
}

/* ---------- Notenwerte ---------- */
// Werte je Stufe: key ist Grundwert und Punkt (z. B. '2.' punktierte Halbe)
const VALUES = [
  ['1', 'Ganze', 1], ['2', 'Halbe', 1], ['4', 'Viertel', 1], ['8', 'Achtel', 2], ['16', 'Sechzehntel', 3],
  ['2.', 'punktierte Halbe', 3], ['4.', 'punktierte Viertel', 3]
];
// Die Note (oder Pause, ohne p) groß auf Notenlinien, Hals und Fähnchen wie im Notenblatt
function valueSVG(e) {
  const x = 10.5;
  let s = '';
  if (!e.p) {
    s += rest(x, e.v);
    if (e.dot) s += dot(x + 1.2, yOf(5));
  } else {
    const pos = staffPos(e.p), y = yOf(pos), up = pos < 4, xs = x + (up ? 0.6 : -0.6), ye = up ? y - 3.5 : y + 3.5;
    s += head(x, y, e.v);
    if (e.v > 1) s += stem(xs, y + (up ? -0.1 : 0.1), ye);
    if (e.v >= 8) s += flags(xs, ye, e.v === 8 ? 1 : 2, up);
    if (e.dot) s += dot(x + 1.2, pos % 2 === 0 ? y - 0.5 : y); // der Punkt steht im Zwischenraum
  }
  return staffSVG({ top: -3, bottom: 7.5 }, s, e.p ? 'Note' : 'Pause');
}
function valuesQuiz() {
  const vals = VALUES.filter((x) => x[2] <= opts.valLevel), pitches = whiteRange('e1', 'f2');
  const keys = vals.map(([key, name]) => ({ key, html: '<span>' + name + '</span>', label: name }));
  let cur = null, plan = null;
  el.quizView.hidden = false;
  // Die Note klingt so lange, wie sie dauert; dazu klickt jeder Schlag, damit man mitzählen kann
  const hear = () => playNow(plan, () => {});
  return {
    layout: 'words', keys,
    next() {
      stopPlay();
      const pick = vals.filter((x) => x[0] !== cur);
      cur = pick[rnd(pick.length)][0];
      const v = parseInt(cur, 10), dot = cur.endsWith('.') ? 1 : 0, silent = opts.valRests && Math.random() < 0.4;
      const e = { v, dot, p: silent ? null : pitches[rnd(pitches.length)] };
      el.quizView.innerHTML = valueSVG(e);
      const beats = 4 / v * (dot ? 1.5 : 1);
      plan = { items: [{ t: 0, len: beats, sound: silent ? '' : 'piano', f: silent ? 0 : freq(e), pos: 0 }], end: Math.max(1, beats), metro: true, silent, beat: 1, perBar: 4 };
      hear();
      return { ok: new Set([cur]) };
    },
    hear,
    solved: hear,
    stop() { el.quizView.hidden = true; el.quizView.innerHTML = ''; }
  };
}
function renderValSide() {
  el.valLevel.querySelectorAll('[data-v]').forEach((b) => setPressed(b, +b.dataset.v === opts.valLevel));
  setPressed(el.valRests, opts.valRests);
}

export function initLiedGames() {
  delegate(el.valLevel, '[data-v]', (b) => { opts.valLevel = +b.dataset.v; persistOpts(); renderValSide(); });
  el.valRests.addEventListener('click', () => { opts.valRests = !opts.valRests; persistOpts(); renderValSide(); });
  el.valuesGo.addEventListener('click', () => startQuiz(valuesQuiz()));
  renderValSide();
  // Finger auf den Notenlinien bei „Note setzen“: Die Note folgt ihm, das Loslassen zählt. Höhe in den Maßen des Bilds
  let held = null;
  // Höhe unter dem Finger in den Maßen des Bilds; null, wenn das Bild gerade nicht messbar ist (noch nicht im Layout,
  // bereits ausgeblendet oder die Matrix nicht umkehrbar) – dann bleibt der Zeiger wirkungslos, statt zu stören
  const yAt = (e) => {
    const svg = el.quizView.querySelector('.qstaff') || held; // das Bild kann inzwischen neu gezeichnet sein
    if (!svg) return null;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    try { return pt.matrixTransform(m.inverse()).y; } catch (_) { return null; }
  };
  // Zeiger freigeben (er kann schon weg sein); die Aufgabe bleibt in jedem Fall wieder bedienbar
  const release = (e) => {
    if (!held) return;
    try { held.releasePointerCapture(e.pointerId); } catch (_) { /* Zeiger schon weg */ }
    held = null;
  };
  el.quizView.addEventListener('pointerdown', (e) => {
    if (!onStaff) { held = null; return; } // kein „Note setzen“ (mehr): einen alten Zeiger nicht mitschleppen
    const svg = e.target.closest && e.target.closest('.qstaff');
    if (!svg || held) return;
    try { svg.setPointerCapture(e.pointerId); } catch (_) { /* Zeiger schon weg */ }
    held = svg;
    const y = yAt(e);
    if (y == null) { release(e); return; }
    onStaff.move(y);
  });
  el.quizView.addEventListener('pointermove', (e) => {
    if (!held || !onStaff) return;
    const y = yAt(e);
    if (y != null) onStaff.move(y);
  });
  el.quizView.addEventListener('pointerup', (e) => {
    if (!held) return;
    const y = yAt(e);
    release(e);
    if (!onStaff) return;
    if (y == null) onStaff.move(null); // nicht messbar: wie ein Abbruch, keine Antwort
    else onStaff.up(y);
  });
  el.quizView.addEventListener('pointercancel', (e) => { if (held && onStaff) onStaff.move(null); release(e); });
  el.placeGo.addEventListener('click', () => startQuiz(placeQuiz()));
  el.stepGo.addEventListener('click', () => startQuiz(stepQuiz()));
}
