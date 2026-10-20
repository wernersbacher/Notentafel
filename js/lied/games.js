// Weitere Spiele im Notenblatt („Üben und Spielen“), im Tonraum des Tonnamen-Quiz und nur mit Stammtönen:
//   Note setzen          Ein Notenname steht über leeren Notenlinien; die Kinder tippen die Linie oder den Zwischenraum.
//                        Eine falsche Note bleibt kurz rot stehen und erklingt nicht.
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
import { delegate } from '../core/ui.js';
import { el } from './dom.js';

const rnd = (n) => Math.floor(Math.random() * n);

// Eine Note auf dem Platz von p bei x, mit Hilfslinien und Hals; cls für das CSS (z. B. blass), color nach Wahl farbig
function note(x, p, cls = '', color = null) {
  const pos = staffPos(p), y = yOf(pos);
  let s = '';
  for (let q = -2; q >= pos; q -= 2) s += ledger(x, yOf(q), 1.05);
  for (let q = 10; q <= pos; q += 2) s += ledger(x, yOf(q), 1.05);
  s += head(x, y, 4, color);
  const up = pos < 4, end = up ? Math.max(pos + 7, 4) : Math.min(pos - 7, 4);
  s += stem(x + (up ? 0.6 : -0.6), y + (up ? -0.1 : 0.1), yOf(end));
  return '<g class="qn' + (cls ? ' ' + cls : '') + '">' + s + '</g>';
}
const colorOf = (p) => (opts.colors ? toneColor(parsePitch(p).step, 0) : null);
const staffSVG = (frame, inner, label) =>
  '<svg class="qstaff" viewBox="0 ' + frame.top + ' 16 ' + (frame.bottom - frame.top) + '" fill="currentColor" role="img" aria-label="' + label + '">' +
  staffLines(0.4, 15.6) + clef(1, yOf(2)) + inner + '</svg>';

/* ---------- Note setzen ---------- */
const X = 10.5;
let onStaff = null; // während „Note setzen“: Tipp auf die Notenlinien (Höhe in Linienabständen)

// Tonhöhe auf dem Platz pos (halbe Linienabstände, unterste Linie 0), begrenzt auf den Tonumfang des Notenblatts
function pitchAt(pos) {
  const d = Math.max(OCT_MIN * 7, Math.min(OCT_MAX * 7 + 6, pos + 9));
  return makePitch(d % 7, Math.floor(d / 7));
}
function placeQuiz() {
  const lo = opts.quizLo, hi = opts.quizHi, frame = frameOf(lo, hi), whites = whiteRange(lo, hi);
  let target = null, miss = null, solved = false, fade = null;
  const show = () => {
    const inner = (miss ? note(X, miss, 'miss') : '') + (solved ? note(X, target, 'hit', colorOf(target)) : '');
    el.quizView.innerHTML = '<div class="qset"><p class="qname">' + pitchLabel(target) + '</p>' +
      staffSVG(frame, inner, 'Notenlinien: Wo steht ' + pitchLabel(target) + '?') + '</div>';
  };
  onStaff = (y) => quizAnswer(pitchAt(Math.round(8 - 2 * y)));
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
    layout: 'words', sound: 'piano', keys: STEP_KEYS, look: true,
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
    layout: 'words', keys, look: true,
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
  el.valLevel.querySelectorAll('[data-v]').forEach((b) => { const on = +b.dataset.v === opts.valLevel; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  el.valRests.classList.toggle('on', opts.valRests);
  el.valRests.setAttribute('aria-pressed', opts.valRests ? 'true' : 'false');
}

export function initLiedGames() {
  delegate(el.valLevel, '[data-v]', (b) => { opts.valLevel = +b.dataset.v; persistOpts(); renderValSide(); });
  el.valRests.addEventListener('click', () => { opts.valRests = !opts.valRests; persistOpts(); renderValSide(); });
  el.valuesGo.addEventListener('click', () => startQuiz(valuesQuiz()));
  renderValSide();
  // Tipp auf die Notenlinien bei „Note setzen“: Höhe in den Maßen des Bilds
  el.quizView.addEventListener('click', (e) => {
    const svg = onStaff && e.target.closest && e.target.closest('.qstaff');
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    onStaff(pt.matrixTransform(svg.getScreenCTM().inverse()).y);
  });
  el.placeGo.addEventListener('click', () => startQuiz(placeQuiz()));
  el.stepGo.addEventListener('click', () => startQuiz(stepQuiz()));
}
