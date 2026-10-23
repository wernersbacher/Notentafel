// Startbildschirm: die drei Bereiche groß nebeneinander, je mit „schreiben“ und „Üben und Spielen“ (zusammen sechs
// Kacheln). Ein Tipp öffnet den Bereich in dieser Hälfte. Er erscheint beim Start der App und über den Titel oben links.
// shell.js reicht Registry und Wechsel herein (wie bei initBar) und ruft initStart beim Start.
import { settings } from './settings.js';
import { el } from './dom.js';

// Was man im Bereich tut, in einem Satz; die Spiele der Hälfte „Üben und Spielen“ liest start.js aus der Kachelreihe
const INTRO = {
  rhy: { head: 'Klatschen, Zählen und Rhythmen lesen', write: 'Notenwerte und Pausen auf die Tafel setzen' },
  mel: { head: 'Bunte Töne wie bei Glockenspiel und Boomwhackers', write: 'Töne als bunte Punkte setzen' },
  lied: { head: 'Lieder im Notensystem lesen, schreiben und spielen', write: 'Noten setzen und den Liedtext darunter schreiben' }
};

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
// Namen der Spiele eines Bereichs, so wie sie in seiner Kachelreihe stehen
const gamesOf = (id) => [...document.querySelectorAll('.gamepick[data-area="' + id + '"] [data-game]')].map((b) => b.textContent.trim());

const tile = (a, part, name, text, last) =>
  '<button type="button" class="stile" data-area="' + a.id + '" data-part="' + part + '">' +
  '<span class="sname">' + esc(name) + '</span><span class="stext">' + esc(text) + '</span>' +
  (last ? '<span class="slast">zuletzt</span>' : '') + '</button>';

function build(areas) {
  const lastArea = settings.mode, lastPlay = !!settings.play[settings.mode];
  return '<h1 class="stitle">Musiktafel</h1><p class="ssub">Was möchtest du tun?</p><div class="sareas">' +
    areas.map((a, i) => {
      const t = INTRO[a.id] || { head: '', write: '' };
      const games = gamesOf(a.id).join(' · ');
      return '<section class="sarea" data-area="' + a.id + '" aria-labelledby="sarea-' + a.id + '">' +
        '<h2 id="sarea-' + a.id + '"><span class="snum">' + (i + 1) + '</span>' + esc(a.label) + '</h2>' +
        '<p class="shead">' + esc(t.head) + '</p>' +
        tile(a, 'write', a.write || 'schreiben', t.write, a.id === lastArea && !lastPlay) +
        (a.play ? tile(a, 'play', 'Üben und Spielen', games, a.id === lastArea && lastPlay) : '') +
        '</section>';
    }).join('') + '</div>';
}

// Zeigt den Startbildschirm (neu gebaut, damit „zuletzt“ stimmt)
export function showStart(areas) {
  el.start.innerHTML = build(areas);
  el.start.hidden = false;
  document.querySelector('.app').inert = true;
  const last = el.start.querySelector('.slast');
  (last ? last.parentElement : el.start.querySelector('.stile')).focus({ preventScroll: true });
}
export function hideStart() {
  el.start.hidden = true;
  document.querySelector('.app').inert = false;
}

export function initStart(areas, setArea, setPlay) {
  el.start.addEventListener('click', (e) => {
    const t = e.target.closest('.stile');
    if (!t) return;
    hideStart();
    setArea(t.dataset.area);
    setPlay(t.dataset.part === 'play');
  });
  el.btnStart.addEventListener('click', () => showStart(areas));
  showStart(areas);
}
