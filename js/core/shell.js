// Rahmen der App: Reiter der Bereiche, Wechsel zwischen ihnen, gemeinsame Knöpfe und das Speichern-Feld der Leiste.
//
// Ein Bereich meldet sich mit register(area) an:
//   id, label        Schlüssel (auch in den Einstellungen) und Name auf dem Reiter
//   panel, board     seine Elemente in der Leiste und im Rahmen der Tafel
//   enter()          wird sichtbar: Stand laden und zeichnen
//   leave()          wird verlassen (optional)
//   tools            gemeinsame Knöpfe: insert, gap, del, brk, done, undo, addRow, delRow(btn), clear(btn);
//                    fehlt einer, ist der Knopf ausgeblendet. Ihren Zustand zeichnet der Bereich selbst.
//   plan(), mark(pos)  Abspielen (siehe player.js); ohne plan kein Abspielen-Knopf
//   songs            Speichern und Laden (optional): store (aus makeStore), texts { menu, save, songs },
//                    name(), data(), saved(name) nach dem Speichern, load(song) aus der Liste oder dem Autosave
//   menu             eigene Abschnitte im Menü (optional): open() blendet sie ein (sie tragen data-area im HTML)
//   receive(data)    nimmt etwas aus einem anderen Bereich entgegen (optional, siehe handOver)
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
const TOOL_BTNS = { insert: 'btnIns', gap: 'btnGap', del: 'btnDel', brk: 'btnBreak', done: 'btnDone', undo: 'btnUndo', addRow: 'btnAddRow', delRow: 'btnDelRow', clear: 'btnClear' };

function show(a) {
  areas.forEach((x) => { x.panel.hidden = x !== a; });
  // Melodie und Rhythmus teilen sich eine Tafel; ausgeblendet wird nur, was der neue Bereich nicht nutzt
  areas.forEach((x) => { x.board.hidden = x.board !== a.board; });
  el.tabs.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.area === a.id ? 'true' : 'false'));
  const tools = a.tools || {};
  for (const k in TOOL_BTNS) el[TOOL_BTNS[k]].hidden = !tools[k];
  el.sharedTools.hidden = !['insert', 'gap', 'del', 'brk', 'done'].some((k) => tools[k]);
  el.btnPlay.hidden = !a.plan;
  el.btnSaveSide.hidden = !a.songs;
}
// Übergibt data an den Bereich id und wechselt dorthin (z. B. eine Melodie als Lied). Was data ist, vereinbaren die
// beiden Bereiche; der Kern reicht es nur weiter. false, wenn es den Bereich nicht gibt oder er nichts annimmt.
export function handOver(id, data) {
  const a = areas.find((x) => x.id === id);
  if (!a || !a.receive) return false;
  setArea(id);
  a.receive(data);
  return true;
}
function setArea(id) {
  savePop.close();
  if (cur && cur.id === id) return;
  const next = areas.find((a) => a.id === id);
  if (!next) return;
  stopPlay();
  disarm();
  if (cur && cur.leave) cur.leave();
  cur = next;
  settings.mode = id;
  persistSettings();
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

  for (const k in TOOL_BTNS) {
    const btn = el[TOOL_BTNS[k]];
    btn.addEventListener('click', () => { const f = cur.tools && cur.tools[k]; if (f) f(btn); });
  }
  el.btnPlay.addEventListener('click', () => togglePlay(cur.plan, cur.mark));

  savePop = popover(el.savePop, el.btnSaveSide, { onOpen: prepareSavePop, onClose: leaveSavePop });
  el.btnSaveOk.addEventListener('click', saveFromSide);
  onEnter(el.saveName, saveFromSide);
  el.saveName.addEventListener('input', () => { if (isArmed(el.btnSaveOk)) disarm(); });

  setArea(areas.some((a) => a.id === settings.mode) ? settings.mode : areas[0].id);
}
