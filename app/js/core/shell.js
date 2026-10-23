// Rahmen der App: Reiter der Bereiche, Wechsel zwischen ihnen, gemeinsame Knöpfe und das Speichern-Feld der Leiste.
// Die Verdrahtung der Leiste liegt in shell-bar.js, Einklappen und Vorführen in present.js.
//
// Ein Bereich meldet sich mit register(area) an:
//   id, label        Schlüssel (auch in den Einstellungen) und Name auf dem Reiter
//   panel, board     seine Elemente in der Leiste und im Rahmen der Tafel
//   enter()          wird sichtbar: Stand laden und zeichnen
//   leave()          wird verlassen (optional)
//   tools            gemeinsame Knöpfe: insert, gap, del, brk, undo, addRow, delRow(btn), clear(btn);
//                    fehlt einer, ist der Knopf ausgeblendet. Ihren Zustand zeichnet der Bereich selbst.
//   plan(), mark(pos)  Abspielen (siehe player.js); ohne plan kein Abspielen-Knopf
//   songs            Speichern und Laden (optional): store (aus makeStore), texts { save, songs },
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
import { stopPlay } from './player.js';
import { toast, confirmTap, disarm, isArmed, popover, onEnter } from './ui.js';
import { el } from './dom.js';
import { accountFull, cloudInfo } from './cloud.js';
import { shellState } from './shell-state.js';
import { initBar, TOOL_BTNS } from './shell-bar.js';
import { initPresent } from './present.js';
import { makeSignal } from './signal.js';
// Einklappen und Vorführen liegen in present.js, sind aber wie bisher über shell.js erreichbar
export { sideCollapsed } from './present.js';

const areas = [];

export const register = (area) => { areas.push(area); };
// f() nach jedem Zeigen eines Bereichs (Wechsel des Bereichs, schreiben oder üben), z. B. für die Startseite der Spiele.
// Liefert eine Funktion zum Abmelden.
const shown = makeSignal();
export const onShow = (f) => shown(f);
export const current = () => shellState.area;

/* ---------- Bereiche ---------- */

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
  shown.emit();
}
const partBtn = (part, text, on) =>
  '<button type="button" class="part" data-part="' + part + '" aria-pressed="' + on + '">' + text + '</button>';
// Übt der offene Bereich gerade (Üben und Spielen)?
export const playing = () => !!(shellState.area && shellState.area.play && settings.play[shellState.area.id]);

// Zwischen schreiben (play false) und Üben und Spielen umschalten. Üben beginnt immer auf einer neuen Übungstafel.
export function setPlay(play) {
  if (!shellState.area || !shellState.area.play || playing() === play) return;
  shellState.savePop.close();
  stopPlay();
  disarm();
  if (shellState.area.leave) shellState.area.leave();
  if (play) settings.play[shellState.area.id] = true; else delete settings.play[shellState.area.id];
  persistSettings();
  if (play) shellState.area.play.enter(); else shellState.area.play.leave();
  show(shellState.area);
  shellState.area.enter();
}
// Der Knopf „Umbruch“ wird zu „verbinden“, wenn die Markierung am Anfang einer Zeile steht, die man selbst umbrochen
// hat: Dann nimmt er den Umbruch wieder weg und die Zeile rückt an die vorige an.
// Die Zeichnungen stehen als Symbol im Sprite von index.html.
const BREAK = { title: 'Ab der Markierung in einer neuen Zeile weiterschreiben', small: 'Umbruch', icon: '#umbruch' };
const JOIN = { title: 'Den Umbruch vor der Markierung entfernen: Die Zeile rückt an die vorige an', small: 'verbinden', icon: '#verbinden' };
export function breakJoins(join) {
  const t = join ? JOIN : BREAK, b = el.btnBreak;
  if (b.dataset.join === String(join)) return;
  b.dataset.join = String(join);
  b.title = t.title;
  b.querySelector('.small').textContent = t.small;
  b.querySelector('use').setAttribute('href', t.icon);
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
  shellState.area.play.clear();
  shellState.area.enter();
}

function setArea(id) {
  shellState.savePop.close();
  if (shellState.area && shellState.area.id === id) return;
  const next = areas.find((a) => a.id === id);
  if (!next) return;
  stopPlay();
  disarm();
  if (shellState.area && shellState.area.leave) shellState.area.leave();
  if (playing()) shellState.area.play.leave();
  shellState.area = next;
  settings.mode = id;
  persistSettings();
  if (playing()) shellState.area.play.enter();
  show(shellState.area);
  shellState.area.enter();
}

/* ---------- Speichern ---------- */
// Speichert den offenen Bereich unter dem Namen aus input (im Menü oder in der Leiste). Gleicher Name heißt ersetzen,
// dafür muss btn ein zweites Mal getippt werden. report(text, warn) meldet das Ergebnis.
export function saveAs(input, btn, report) {
  const s = shellState.area.songs, n = input.value.trim();
  if (!n) { report('Bitte zuerst einen Namen eingeben.', true); input.focus(); return; }
  const exists = s.store.songExists(n);
  const doSave = () => {
    // Ein neues Lied passt nicht mehr ins Konto: Es wird trotzdem gespeichert, aber nur auf diesem Gerät
    const full = !exists && accountFull();
    if (!s.store.saveSong(s.data(), n)) { report('Speichern hat nicht geklappt (Speicher voll oder gesperrt).', true); return; }
    s.saved(n);
    if (full) report('Gespeichert, aber nur auf diesem Gerät: In dein Konto passen höchstens ' + cloudInfo().limit + ' Lieder.', true);
    else report('Gespeichert: „' + n + '“');
  };
  if (exists) confirmTap(btn, 'Ersetzen?', doSave);
  else doSave();
}
function prepareSavePop() {
  stopPlay();
  el.saveName.value = shellState.area.songs.name();
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
    shellState.savePop.close();
    toast(text);
  });
}
export const closeSavePop = () => shellState.savePop.close();

/* ---------- Start ---------- */
// Nach dem Anmelden aller Bereiche: Reiter bauen, Knöpfe verdrahten, den zuletzt offenen Bereich zeigen
export function startShell() {
  initBar(areas, setArea, setPlay);
  initPresent();

  shellState.savePop = popover(el.savePop, el.btnSaveSide, { onOpen: prepareSavePop, onClose: leaveSavePop });
  el.btnSaveOk.addEventListener('click', saveFromSide);
  onEnter(el.saveName, saveFromSide);
  el.saveName.addEventListener('input', () => { if (isArmed(el.btnSaveOk)) disarm(); });

  setArea(areas.some((a) => a.id === settings.mode) ? settings.mode : areas[0].id);
}
