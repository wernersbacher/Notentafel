// Abspielen. Der Bereich liefert einen fertigen Ablaufplan, der Player kennt weder Zeilen noch Takte.
// Plan: { items: [{ t, len, sound, f, pos }], end, beat?, perBar?, barStart? } – Zeiten in Schlägen (Vierteln); sound ist
// 'bell', 'piano', 'clave' oder leer (still). pos wird beim Erreichen von t an mark(pos) gemeldet, damit der Bereich die
// Stelle hervorheben kann. beat (Länge eines Zählschlags), perBar (Schläge pro Takt) und barStart (wo ein Takt beginnt,
// z. B. nach einem Auftakt) braucht der Player für Einzähler und Metronom; ohne sie zählt er Viertel, vier pro Takt.
import { audioCtx, bell, clave, piano, tick } from './audio.js';
import { settings, persistSettings } from './settings.js';
import { toast } from './ui.js';
import { el } from './dom.js';

export const ICONS = {
  play: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>',
  stop: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>'
};

let play = null; // { out, timers, cur, mark } während des Abspielens

// Die Stelle, die gerade klingt (damit sie nach einem Neuzeichnen hervorgehoben bleibt)
export const playingPos = () => play && play.cur;

// Der runde Abspielen-Knopf unten rechts auf der Tafel: ▶ oder ■
function showButton(playing) {
  const b = el.btnPlay, t = playing ? 'Stopp' : 'Abspielen (ab der Markierung)';
  b.innerHTML = playing ? ICONS.stop : ICONS.play;
  b.classList.toggle('on', playing);
  b.title = t;
  b.setAttribute('aria-label', playing ? 'Stopp' : 'Abspielen');
}

function startPlay(plan, mark) {
  if (!plan || !plan.items.some((s) => s.sound)) { toast('Noch keine Töne auf der Tafel.', true); return; }
  const ctx = audioCtx();
  if (!ctx) { toast('Abspielen wird von diesem Browser nicht unterstützt.', true); return; }
  const out = ctx.createGain();
  out.gain.value = 0.6;
  out.connect(ctx.destination);
  const beat = plan.beat || 1, perBar = plan.perBar || 4, bar = beat * perBar;
  // Einzählen: ein ganzer Takt Klicks vorweg, danach beginnt das Stück
  const pre = settings.countIn ? bar : 0;
  const step = 60 / settings.tempo, t0 = ctx.currentTime + 0.08 + pre * step;
  // Verzögerung bis Schlag t in Millisekunden
  const delay = (beats) => (t0 - ctx.currentTime + beats * step) * 1000;
  play = { out, timers: [], cur: null, mark };
  for (let k = 0; k < perBar && pre; k++) tick(out, t0 - pre * step + k * beat * step, k === 0);
  // Metronom: jeder Schlag des Stücks, betont am Taktanfang (gerechnet ab barStart)
  if (settings.metro) {
    const first = ((plan.barStart || 0) % beat + beat) % beat;
    for (let t = first; t < plan.end - 1e-9; t += beat) {
      const inBar = ((t - (plan.barStart || 0)) % bar + bar) % bar;
      tick(out, t0 + t * step, Math.abs(inBar) < 1e-6 || Math.abs(inBar - bar) < 1e-6);
    }
  }
  plan.items.forEach((s) => {
    if (s.sound === 'bell') bell(out, s.f, t0 + s.t * step, s.len * step * 0.95);
    else if (s.sound === 'piano') piano(out, s.f, t0 + s.t * step, s.len * step * 0.95);
    else if (s.sound === 'clave') clave(out, t0 + s.t * step);
    play.timers.push(setTimeout(() => { play.cur = s.pos; mark(s.pos); }, delay(s.t)));
  });
  play.timers.push(setTimeout(stopPlay, delay(plan.end)));
  showButton(true);
}

export function stopPlay() {
  if (!play) return;
  const { timers, out, mark } = play;
  timers.forEach(clearTimeout);
  try { out.disconnect(); } catch (e) { /* schon getrennt */ }
  play = null;
  mark(null);
  showButton(false);
}

// getPlan() liefert den Ablaufplan erst beim Start; mark(pos) hebt die klingende Stelle hervor (null: keine)
export function togglePlay(getPlan, mark) {
  if (play) stopPlay();
  else startPlay(getPlan(), mark);
}
// Einzählen und Metronom: die Knöpfe mit data-play (unten rechts auf der Tafel) schalten die gemeinsame Einstellung um
function renderPlayOpts() {
  document.querySelectorAll('[data-play]').forEach((b) => {
    const on = !!settings[b.dataset.play];
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
export function initPlayer() {
  showButton(false);
  renderPlayOpts();
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-play]');
    if (!b) return;
    settings[b.dataset.play] = !settings[b.dataset.play];
    persistSettings();
    renderPlayOpts();
  });
}

// Ein einzelner kurzer Ton zum Vorhören (z. B. beim Ziehen einer Note), unabhängig vom Abspielen
let preview = null;
export function previewTone(f) {
  const ctx = audioCtx();
  if (!ctx) return;
  if (preview) { try { preview.disconnect(); } catch (e) { /* schon getrennt */ } }
  preview = ctx.createGain();
  preview.gain.value = 0.5;
  preview.connect(ctx.destination);
  piano(preview, f, ctx.currentTime + 0.01, 0.35);
}
