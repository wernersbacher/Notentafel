// Abspielen. Der Bereich liefert einen fertigen Ablaufplan, der Player kennt weder Zeilen noch Takte.
// Plan: { items: [{ t, len, sound, f, pos }], end, beat?, perBar?, barStart?, pulse? } – Zeiten in Schlägen (Vierteln); sound ist
// 'bell', 'piano', 'clave', 'triangle' oder leer (still). pos wird beim Erreichen von t an mark(pos) gemeldet, damit der Bereich die
// Stelle hervorheben kann. beat (Länge eines Zählschlags), perBar (Schläge pro Takt) und barStart (wo ein Takt beginnt,
// z. B. nach einem Auftakt) braucht der Player für Einzähler und Metronom; ohne sie zählt er Viertel, vier pro Takt.
// Schritt für Schritt (settings.step): statt im Tempo rückt die Markierung bei jedem Tipp auf den großen Knopf eine Note
// oder Pause weiter, ohne Klang – gespielt wird auf Boomwhackers oder Glockenspiel. Mit settings.stepSound erklingt die
// erreichte Note dabei in ihrer Länge im eingestellten Tempo. Nach der letzten Note ist Schluss.
import { audioCtx, bell, clave, piano, triangle, tick } from './audio.js';
import { settings, persistSettings, setTempo, watchTempo } from './settings.js';
import { startAt } from './plan.js';
import { toast, popover } from './ui.js';
import { el } from './dom.js';

export const ICONS = {
  play: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>',
  stop: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
  sound: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  mute: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  next: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 4.5v15l11-7.5z" fill="currentColor"/><rect x="16.5" y="4.5" width="3.2" height="15" rx="1" fill="currentColor"/></svg>'
};

let play = null; // { out, timers, cur, mark } während des Abspielens; Schritt für Schritt dazu steps und i

// Die Stelle, die gerade klingt (damit sie nach einem Neuzeichnen hervorgehoben bleibt)
export const playingPos = () => play && play.cur;
// Schritt für Schritt mit „Noten erst beim Weitertippen anzeigen“ (settings.stepHide): die Bereiche blenden alles hinter der
// markierten Stelle aus
export const stepHides = () => !!(play && play.steps && settings.stepHide);

// Der runde Abspielen-Knopf unten rechts auf der Tafel: ▶ oder ■, Schritt für Schritt ▶| (nächste Note)
function showButton(playing) {
  const b = el.btnPlay;
  if (settings.step) {
    b.innerHTML = ICONS.next;
    b.classList.remove('on');
    b.title = playing ? 'Nächste Note' : 'Schritt für Schritt (ab der Markierung)';
    b.setAttribute('aria-label', 'Nächste Note');
    return;
  }
  b.innerHTML = playing ? ICONS.stop : ICONS.play;
  b.classList.toggle('on', playing);
  b.title = playing ? 'Stopp' : 'Abspielen (ab der Markierung)';
  b.setAttribute('aria-label', playing ? 'Stopp' : 'Abspielen');
}

// again: Weiterspielen nach einer Tempoänderung, dann ohne Einzählen
function startPlay(plan, mark, again) {
  if (!plan || !plan.items.some((s) => s.sound)) { toast('Noch keine Töne auf der Tafel.', true); return; }
  const ctx = audioCtx();
  if (!ctx) { toast('Abspielen wird von diesem Browser nicht unterstützt.', true); return; }
  const out = ctx.createGain();
  out.gain.value = 0.6;
  out.connect(ctx.destination);
  const beat = plan.beat || 1, perBar = plan.perBar || 4, bar = beat * perBar;
  // Einzählen: ein ganzer Takt Klicks vorweg, danach beginnt das Stück
  const pre = settings.countIn && !again ? bar : 0;
  const step = 60 / settings.tempo, t0 = ctx.currentTime + 0.08 + pre * step;
  // Verzögerung bis Schlag t in Millisekunden
  const delay = (beats) => (t0 - ctx.currentTime + beats * step) * 1000;
  // plan und k (der Eintrag, der gerade klingt) braucht ein Tempowechsel zum Weiterspielen
  play = { out, timers: [], cur: null, mark, plan, k: -1 };
  for (let k = 0; k < perBar && pre; k++) tick(out, t0 - pre * step + k * beat * step, k === 0);
  // Metronom: jeder Schlag des Stücks, betont am Taktanfang (gerechnet ab barStart). plan.pulse: leiser Grundschlag
  // unabhängig vom Metronom-Schalter (Rhythmus-Echo)
  if (settings.metro || plan.pulse) {
    const first = ((plan.barStart || 0) % beat + beat) % beat;
    for (let t = first; t < plan.end - 1e-9; t += beat) {
      const inBar = ((t - (plan.barStart || 0)) % bar + bar) % bar;
      tick(out, t0 + t * step, Math.abs(inBar) < 1e-6 || Math.abs(inBar - bar) < 1e-6, !settings.metro);
    }
  }
  plan.items.forEach((s, k) => {
    if (s.sound === 'bell') bell(out, s.f, t0 + s.t * step, s.len * step * 0.95);
    else if (s.sound === 'piano') piano(out, s.f, t0 + s.t * step, s.len * step * 0.95);
    else if (s.sound === 'clave') clave(out, t0 + s.t * step);
    else if (s.sound === 'triangle') triangle(out, t0 + s.t * step, s.len * step * 0.95);
    play.timers.push(setTimeout(() => { play.cur = s.pos; play.k = k; mark(s.pos); }, delay(s.t)));
  });
  play.timers.push(setTimeout(stopPlay, delay(plan.end)));
  showButton(true);
}

export function stopPlay() {
  if (!play) return;
  const { timers, out, mark } = play;
  timers.forEach(clearTimeout);
  if (out) { try { out.disconnect(); } catch (e) { /* schon getrennt */ } }
  play = null;
  mark(null);
  showButton(false);
}

// Schritt für Schritt mit Ton: die erreichte Note klingt in ihrer Länge, die vorige verstummt
function stepSound(s) {
  if (play.out) { try { play.out.disconnect(); } catch (e) { /* schon getrennt */ } play.out = null; }
  if (!settings.stepSound || !s.sound) return;
  const ctx = audioCtx();
  if (!ctx) return;
  const out = play.out = ctx.createGain(), t0 = ctx.currentTime + 0.01, len = s.len * 60 / settings.tempo * 0.95;
  out.gain.value = 0.6;
  out.connect(ctx.destination);
  if (s.sound === 'bell') bell(out, s.f, t0, len);
  else if (s.sound === 'piano') piano(out, s.f, t0, len);
  else if (s.sound === 'clave') clave(out, t0);
  else if (s.sound === 'triangle') triangle(out, t0, len);
}

// Schritt für Schritt: der erste Tipp zeigt die erste Note ab der Markierung, jeder weitere die nächste.
// Jede Note und jede Pause ist ein Schritt, auch die zweite Note eines Haltebogens; Wiederholungen laufen mit.
function stepNext(getPlan, mark) {
  // Läuft gerade etwas im Tempo (z. B. das Rhythmus-Echo), beendet der erste Tipp es nur
  if (play && !play.steps) { stopPlay(); return; }
  if (!play) {
    const plan = getPlan(), steps = plan ? plan.items : [];
    if (!steps.some((s) => s.sound)) { toast('Noch keine Töne auf der Tafel.', true); return; }
    play = { out: null, timers: [], cur: null, mark, steps, i: -1 };
    showButton(true);
  }
  if (++play.i >= play.steps.length) { stopPlay(); return; }
  play.cur = play.steps[play.i].pos;
  mark(play.cur);
  stepSound(play.steps[play.i]);
}

// getPlan() liefert den Ablaufplan erst beim Start; mark(pos) hebt die klingende Stelle hervor (null: keine)
export function togglePlay(getPlan, mark) {
  if (settings.step) stepNext(getPlan, mark);
  else if (play) stopPlay();
  else startPlay(getPlan(), mark);
}
// Spielt einen Plan gleich im Tempo ab, auch wenn Schritt für Schritt eingeschaltet ist (z. B. das Rhythmus-Echo);
// was gerade läuft, endet. Einzählen und Metronom gelten wie sonst.
export function playNow(plan, mark) {
  stopPlay();
  startPlay(plan, mark);
}
// Einzählen und Metronom: die Knöpfe mit data-play (unten rechts auf der Tafel) schalten die gemeinsame Einstellung um.
// Der Ton-Knopf (stepSound) gibt es nur bei Schritt für Schritt: Lautsprecher oder durchgestrichener Lautsprecher.
function renderPlayOpts() {
  document.querySelectorAll('[data-play]').forEach((b) => {
    const on = !!settings[b.dataset.play];
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (b.dataset.play !== 'stepSound') return;
    b.hidden = !settings.step;
    b.innerHTML = on ? ICONS.sound : ICONS.mute;
    b.title = on ? 'Ton an: jede Note erklingt beim Weitertippen' : 'Ton aus: Schritt für Schritt ohne Klang';
  });
}
/* ---------- Tempo auf der Tafel ---------- */
// Der runde Knopf zeigt das Tempo, ein Tipp öffnet darüber − Regler +. Es ist dieselbe Einstellung wie im Menü.
// Ändert es sich beim Abspielen, geht es ab der nächsten Note im neuen Tempo weiter.
function renderTempo(v = settings.tempo) {
  el.tempoNum.textContent = v;
  el.tempoPopOut.textContent = v + ' pro Minute';
  el.btnTempo.setAttribute('aria-label', 'Tempo ' + v + ' pro Minute');
  if (document.activeElement !== el.tempoRange) el.tempoRange.value = v;
}
function changeTempo(v) {
  if (v === settings.tempo) return;
  setTempo(v);
  if (!play || !play.plan) return;
  const { plan, k, mark } = play, next = startAt(plan, k + 1);
  if (k >= 0 && next === plan) return; // es kommt nichts mehr
  stopPlay();
  startPlay(next, mark, true);
}
function initTempo() {
  renderTempo();
  watchTempo(() => renderTempo());
  popover(el.tempoPop, el.btnTempo, { onOpen: () => renderTempo() });
  el.tempoMinus.addEventListener('click', () => changeTempo(settings.tempo - 5));
  el.tempoPlus.addEventListener('click', () => changeTempo(settings.tempo + 5));
  // Beim Ziehen nur die Zahl zeigen, erst beim Loslassen übernehmen (sonst beginnt das Abspielen ständig neu)
  el.tempoRange.addEventListener('input', () => renderTempo(+el.tempoRange.value));
  el.tempoRange.addEventListener('change', () => { changeTempo(+el.tempoRange.value); el.tempoRange.blur(); });
}

export function initPlayer() {
  showButton(false);
  renderPlayOpts();
  initTempo();
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-play]');
    if (!b) return;
    // Wechsel zwischen Abspielen und Schritt für Schritt: was gerade läuft, endet
    if (b.dataset.play === 'step' || b.dataset.play === 'stepHide') stopPlay();
    settings[b.dataset.play] = !settings[b.dataset.play];
    persistSettings();
    renderPlayOpts();
    showButton(!!play);
  });
}

// Ein einzelner kurzer Ton zum Vorhören (z. B. beim Ziehen einer Note), unabhängig vom Abspielen.
// sound: 'piano' (Notenblatt) oder 'bell' (Farbnoten); len: Länge in Sekunden
let preview = null;
export function previewTone(f, sound = 'piano', len = 0.35) {
  const ctx = audioCtx();
  if (!ctx) return;
  if (preview) { try { preview.disconnect(); } catch (e) { /* schon getrennt */ } }
  preview = ctx.createGain();
  preview.gain.value = 0.5;
  preview.connect(ctx.destination);
  (sound === 'bell' ? bell : piano)(preview, f, ctx.currentTime + 0.01, len);
}
