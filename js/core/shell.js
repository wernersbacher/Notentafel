// Rahmen der App: Reiter der Bereiche, Wechsel zwischen ihnen, gemeinsame Knöpfe und das Speichern-Feld der Leiste.
//
// Ein Bereich meldet sich mit register(area) an:
//   id, label        Schlüssel (auch in den Einstellungen) und Name auf dem Reiter
//   panel, board     seine Elemente in der Leiste und im Rahmen der Tafel
//   enter()          wird sichtbar: Stand laden und zeichnen
//   leave()          wird verlassen (optional)
//   tools            gemeinsame Knöpfe: insert, gap, del, brk, undo, addRow, delRow(btn), clear(btn);
//                    fehlt einer, ist der Knopf ausgeblendet. Ihren Zustand zeichnet der Bereich selbst.
//   plan(), mark(pos)  Abspielen (siehe player.js); ohne plan kein Abspielen-Knopf
//   songs            Speichern und Laden (optional): store (aus makeStore), texts { menu, save, songs },
//                    name(), data(), saved(name) nach dem Speichern, load(song) aus der Liste oder dem Autosave
//   menu             eigene Abschnitte im Menü (optional): open() blendet sie ein (sie tragen data-area im HTML)
//   receive(data)    nimmt etwas aus einem anderen Bereich entgegen (optional, siehe handOver)
//   cover            Verdecken (optional): from, card, reset, clear für die Knöpfe mit data-cover in seiner Leiste
//   write            Name der Hälfte „schreiben“ des Umschalters unter den Reitern, z. B. „Rhythmus schreiben“
//   play             Üben und Spielen (optional): enter() legt eine neue, leere Übungstafel an (vor enter() des
//                    Bereichs), leave() holt die geschriebene Tafel unverändert zurück. Die Übungstafel wird nie
//                    gespeichert. Ob ein Bereich gerade übt, bleibt gemerkt (settings.play). clear() macht die
//                    Übungstafel wieder leer (beim Wählen eines Spiels).
import { settings, persistSettings } from './settings.js';
import { stopPlay, togglePlay } from './player.js';
import { toast, confirmTap, disarm, isArmed, popover, onEnter } from './ui.js';
import { el } from './dom.js';

const areas = [];
let cur = null;
let savePop;

export const register = (area) => { areas.push(area); };
export const current = () => cur;

/* ---------- Bereiche ---------- */
const TOOL_BTNS = { insert: 'btnIns', gap: 'btnGap', del: 'btnDel', brk: 'btnBreak', undo: 'btnUndo', addRow: 'btnAddRow', delRow: 'btnDelRow', clear: 'btnClear' };

function show(a) {
  areas.forEach((x) => { x.panel.hidden = x !== a; });
  // Melodie und Rhythmus teilen sich eine Tafel; ausgeblendet wird nur, was der neue Bereich nicht nutzt
  areas.forEach((x) => { x.board.hidden = x.board !== a.board; });
  el.tabs.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.area === a.id ? 'true' : 'false'));
  const tools = a.tools || {}, play = playing();
  for (const k in TOOL_BTNS) el[TOOL_BTNS[k]].hidden = !tools[k];
  el.sharedTools.hidden = !['insert', 'gap', 'del', 'brk'].some((k) => tools[k]);
  el.btnPlay.hidden = !a.plan || play;
  el.btnSaveSide.hidden = !a.songs || play;
  // Umschalter unter den Reitern: schreiben oder Üben und Spielen; beim Üben blendet die Leiste ihre Werkzeuge aus
  el.parts.hidden = !a.play;
  el.parts.innerHTML = a.play ? partBtn('write', a.write || 'schreiben', !play) + partBtn('play', 'Üben und Spielen', play) : '';
  const side = document.getElementById('side');
  side.dataset.area = a.id;
  side.dataset.part = play ? 'play' : 'write';
  document.querySelector('.app').classList.toggle('practice', play);
}
const partBtn = (part, text, on) =>
  '<button type="button" class="part" data-part="' + part + '" aria-pressed="' + on + '">' + text + '</button>';
// Übt der offene Bereich gerade (Üben und Spielen)?
export const playing = () => !!(cur && cur.play && settings.play[cur.id]);

// Zwischen schreiben (play false) und Üben und Spielen umschalten. Üben beginnt immer auf einer neuen Übungstafel.
export function setPlay(play) {
  if (!cur || !cur.play || playing() === play) return;
  savePop.close();
  stopPlay();
  disarm();
  if (cur.leave) cur.leave();
  if (play) settings.play[cur.id] = true; else delete settings.play[cur.id];
  persistSettings();
  if (play) cur.play.enter(); else cur.play.leave();
  show(cur);
  cur.enter();
}
// Der Knopf „Umbruch“ wird zu „verbinden“, wenn die Markierung am Anfang einer Zeile steht, die man selbst umbrochen
// hat: Dann nimmt er den Umbruch wieder weg und die Zeile rückt an die vorige an.
const BREAK = { title: 'Ab der Markierung in einer neuen Zeile weiterschreiben', small: 'Umbruch', path: 'M19 5v6a3 3 0 0 1-3 3H6M10 10l-4 4 4 4' };
const JOIN = { title: 'Den Umbruch vor der Markierung entfernen: Die Zeile rückt an die vorige an', small: 'verbinden', path: 'M5 19v-6a3 3 0 0 1 3-3h10M14 6l4 4-4 4' };
export function breakJoins(join) {
  const t = join ? JOIN : BREAK, b = el.btnBreak;
  if (b.dataset.join === String(join)) return;
  b.dataset.join = String(join);
  b.title = t.title;
  b.querySelector('.small').textContent = t.small;
  b.querySelector('path').setAttribute('d', t.path);
}

// Übergibt data an den Bereich id und wechselt dorthin (z. B. eine Melodie als Lied). Was data ist, vereinbaren die
// beiden Bereiche; der Kern reicht es nur weiter. false, wenn es den Bereich nicht gibt oder er nichts annimmt.
export function handOver(id, data) {
  const a = areas.find((x) => x.id === id);
  if (!a || !a.receive) return false;
  setArea(id);
  setPlay(false); // angekommen wird beim Schreiben, nicht auf der Übungstafel
  a.receive(data);
  return true;
}
// Beim Üben: die Übungstafel wieder leer und neu gezeichnet
export function clearPractice() {
  if (!playing()) return;
  stopPlay();
  cur.play.clear();
  cur.enter();
}
/* ---------- Leiste ein- und ausklappen ---------- */
// Eingeklappt nutzt die Tafel die ganze Breite und das Bearbeiten ist beendet: Die Bereiche zeichnen dann ohne Markierung
// und ohne leere Plätze (sideCollapsed() beim Zeichnen abfragen). Ausgeklappt erscheint die Markierung wieder.
let collapsed = false;
export const sideCollapsed = () => collapsed;
// keepPlay: Abspielen läuft weiter (beim Vorführen ändert sich nur, was zu sehen ist)
function setCollapsed(on, keepPlay) {
  collapsed = on;
  if (!keepPlay) stopPlay();
  savePop.close();
  document.querySelector('.app').classList.toggle('collapsed', on);
  el.btnSide.setAttribute('aria-expanded', on ? 'false' : 'true');
  el.btnSide.title = on ? 'Leiste ausklappen (bearbeiten)' : 'Leiste einklappen (Bearbeiten beenden)';
  el.btnSide.setAttribute('aria-label', on ? 'Leiste ausklappen' : 'Leiste einklappen');
  if (cur) cur.enter();
}

/* ---------- Vorführen ---------- */
// Blendet Leiste oben und Werkzeuge rechts aus (das Bearbeiten ist beendet wie beim Einklappen), die Tafel füllt den
// Bildschirm, wo der Browser es kann im Vollbild. Ein Tipp auf denselben Knopf holt alles zurück, wie es vorher war.
// Wird nicht gemerkt: Nach dem Neuladen ist man wieder im Bearbeiten.
const PRESENT_ICONS = {
  on: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  off: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
let present = null; // während des Vorführens: { collapsed } von vorher
function showPresent() {
  const on = !!present, b = el.btnPresent;
  b.innerHTML = on ? PRESENT_ICONS.off : PRESENT_ICONS.on;
  b.classList.toggle('on', on);
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  b.title = on ? 'Vorführen beenden: Leisten wieder einblenden' : 'Vorführen: nur die Tafel, über den ganzen Bildschirm';
}
function setPresent(on) {
  if (!!present === on) return;
  const before = present;
  present = on ? { collapsed } : null;
  document.body.classList.toggle('present', on);
  showPresent();
  if (on && !collapsed) setCollapsed(true, true);
  else if (!on && !before.collapsed) setCollapsed(false, true);
  else if (cur) cur.enter(); // die Tafel ist größer oder kleiner geworden
  const d = document;
  try {
    if (on && d.fullscreenEnabled && !d.fullscreenElement) d.documentElement.requestFullscreen().catch(() => {});
    else if (!on && d.fullscreenElement) d.exitFullscreen().catch(() => {});
  } catch (e) { /* kein Vollbild möglich: dann nur ohne Leisten */ }
}

function setArea(id) {
  savePop.close();
  if (cur && cur.id === id) return;
  const next = areas.find((a) => a.id === id);
  if (!next) return;
  stopPlay();
  disarm();
  if (cur && cur.leave) cur.leave();
  if (playing()) cur.play.leave();
  cur = next;
  settings.mode = id;
  persistSettings();
  if (playing()) cur.play.enter();
  show(cur);
  cur.enter();
}

/* ---------- Speichern ---------- */
// Speichert den offenen Bereich unter dem Namen aus input (im Menü oder in der Leiste). Gleicher Name heißt ersetzen,
// dafür muss btn ein zweites Mal getippt werden. report(text, warn) meldet das Ergebnis.
export function saveAs(input, btn, report) {
  const s = cur.songs, n = input.value.trim();
  if (!n) { report('Bitte zuerst einen Namen eingeben.', true); input.focus(); return; }
  const doSave = () => {
    if (!s.store.saveSong(s.data(), n)) { report('Speichern hat nicht geklappt (Speicher voll oder gesperrt).', true); return; }
    s.saved(n);
    report('Gespeichert: „' + n + '“');
  };
  if (s.store.songExists(n)) confirmTap(btn, 'Ersetzen?', doSave);
  else doSave();
}
function prepareSavePop() {
  stopPlay();
  el.saveName.value = cur.songs.name();
  el.saveHintSide.textContent = '';
  el.saveHintSide.classList.remove('warn');
  el.saveName.focus();
}
function leaveSavePop() {
  if (isArmed(el.btnSaveOk)) disarm();
  el.saveName.blur();
}
function saveFromSide() {
  saveAs(el.saveName, el.btnSaveOk, (text, warn) => {
    if (warn) { el.saveHintSide.textContent = text; el.saveHintSide.classList.add('warn'); return; }
    savePop.close();
    toast(text);
  });
}
export const closeSavePop = () => savePop.close();

/* ---------- Start ---------- */
// Nach dem Anmelden aller Bereiche: Reiter bauen, Knöpfe verdrahten, den zuletzt offenen Bereich zeigen
export function startShell() {
  el.sharedTools = el.btnIns.parentNode;
  el.tabs.innerHTML = areas.map((a) =>
    '<button type="button" class="tab" role="tab" id="tab-' + a.id + '" data-area="' + a.id + '" aria-controls="' + a.panel.id + '">' + a.label + '</button>'
  ).join('');
  el.tabs.style.setProperty('--n', areas.length);
  el.tabs.addEventListener('click', (e) => {
    const t = e.target.closest('.tab');
    if (t) setArea(t.dataset.area);
  });
  el.parts.addEventListener('click', (e) => {
    const p = e.target.closest('.part');
    if (p) setPlay(p.dataset.part === 'play');
  });

  for (const k in TOOL_BTNS) {
    const btn = el[TOOL_BTNS[k]];
    btn.addEventListener('click', () => { const f = cur.tools && cur.tools[k]; if (f) f(btn); });
  }
  el.btnPlay.addEventListener('click', () => togglePlay(cur.plan, cur.mark));
  // Verdecken: dieselben Knöpfe in der Leiste jedes Bereichs
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-cover]');
    const f = b && cur.cover && cur.cover[b.dataset.cover];
    if (f) f();
  });
  el.btnSide.addEventListener('click', () => setCollapsed(!collapsed));
  showPresent();
  el.btnPresent.addEventListener('click', () => setPresent(!present));
  // Vollbild vom Gerät aus beendet (z. B. Wischgeste): dann auch das Vorführen
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) setPresent(false); });
  // Leiste oben mit den Tafeln ein- und ausklappen (bleibt gemerkt)
  const setTop = (hide) => {
    document.querySelector('.app').classList.toggle('notop', hide);
    el.btnTopShow.hidden = !hide;
    settings.topHidden = hide;
    persistSettings();
  };
  el.btnTopHide.addEventListener('click', () => setTop(true));
  el.btnTopShow.addEventListener('click', () => setTop(false));
  if (settings.topHidden) setTop(true);

  savePop = popover(el.savePop, el.btnSaveSide, { onOpen: prepareSavePop, onClose: leaveSavePop });
  el.btnSaveOk.addEventListener('click', saveFromSide);
  onEnter(el.saveName, saveFromSide);
  el.saveName.addEventListener('input', () => { if (isArmed(el.btnSaveOk)) disarm(); });

  setArea(areas.some((a) => a.id === settings.mode) ? settings.mode : areas[0].id);
}
