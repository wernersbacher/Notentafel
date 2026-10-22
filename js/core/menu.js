// Seitenleiste (Slide-in) für Liedersammlung und Einstellungen; früher ein gemeinsames Menü, jetzt zwei Knöpfe. Gruppen: oben der offene Bereich (Lieder speichern und laden, seine eigenen Abschnitte und
// darunter seine Einstellungen), unten die Einstellungen für alle Bereiche (Tempo, Bildschirm anlassen).
// Eigene Abschnitte eines Bereichs tragen im HTML data-area und werden von ihm selbst eingeblendet.
import { settings, persistSettings, clampUi, setTempo } from './settings.js';
import { current, saveAs, closeSavePop, playing, setPlay } from './shell.js';
import { stopPlay } from './player.js';
import { esc, confirmTap, disarm, isArmed, delegate, onEnter, downloadFile } from './ui.js';
import { exportAll, importAll } from './store.js';
import { el } from './dom.js';
import { updateWake } from './wake.js';
import { localOnly } from './cloud.js';

function hint(text, warn) {
  el.saveHint.textContent = text;
  el.saveHint.classList.toggle('warn', !!warn);
}
const dateOf = (t) => new Date(t).toLocaleDateString('de-DE');
const dateTimeOf = (t) => new Date(t).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });

/* ---------- Listen ---------- */
// Die gespeicherten Lieder des offenen Bereichs, so wie sie gerade angezeigt werden
let shown = [];
let renaming = null; // id des Lieds, das gerade umbenannt wird: Statt Name und Knöpfen steht dort ein Feld
const PENCIL = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
const CROSS = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>';
function renderSongs() {
  disarm();
  const s = current().songs;
  shown = s.store.loadSongs();
  if (!shown.some((x) => x.id === renaming)) renaming = null;
  if (!shown.length) {
    el.songs.innerHTML = '<li><p class="empty">Noch keine Lieder gespeichert.</p></li>';
    return;
  }
  const name = s.name();
  el.songs.innerHTML = shown.map((x, i) => x.id === renaming
    ? '<li class="song renaming"><input type="text" class="renamein" maxlength="40" autocomplete="off" enterkeyhint="done" aria-label="Neuer Name" value="' + esc(x.name) + '">' +
      '<button type="button" class="btn" data-ren-ok>Umbenennen</button>' +
      '<button type="button" class="btn icon" data-ren-no title="Abbrechen" aria-label="Abbrechen">' + CROSS + '</button></li>'
    : '<li class="song' + (x.name === name ? ' current' : '') + '">' +
      '<span class="name">' + esc(x.name) + '<span class="date">' + (x.savedAt ? dateOf(x.savedAt) : '') + '</span>' +
      (localOnly(s.store.area, x.id) ? '<span class="here">nur auf diesem Gerät</span>' : '') + '</span>' +
      '<button type="button" class="btn icon" data-ren="' + i + '" title="Umbenennen" aria-label="„' + esc(x.name) + '“ umbenennen">' + PENCIL + '</button>' +
      '<button type="button" class="btn" data-load="' + i + '">Laden</button>' +
      '<button type="button" class="btn danger" data-del="' + i + '">Löschen</button></li>'
  ).join('');
  const input = el.songs.querySelector('.renamein');
  if (input) {
    onEnter(input, rename);
    input.focus();
    input.select();
  }
}
// Lieder vom Server sind angekommen: die Liste neu zeichnen, falls sie gerade offen ist (nicht mitten im Umbenennen)
export function refreshSongs() {
  if (el.drawer.classList.contains('open') && el.drawer.dataset.mode === 'songs' && current().songs && !renaming) renderSongs();
}
// Umbenennen mit dem Namen aus dem Feld. Ist das Lied gerade auf der Tafel, heißt die Tafel danach auch so.
function rename() {
  const s = current().songs, song = shown.find((x) => x.id === renaming), input = el.songs.querySelector('.renamein');
  if (!song || !input) return;
  const n = input.value.trim();
  if (!n) { hint('Bitte einen Namen eingeben.', true); input.focus(); return; }
  if (n === song.name) { renaming = null; renderSongs(); return; }
  const res = s.store.renameSong(song.id, n);
  if (res === 'taken') { hint('Ein anderes Lied heißt schon „' + n + '“.', true); input.focus(); return; }
  if (res !== 'ok') { hint('Umbenennen hat nicht geklappt (Speicher voll oder gesperrt).', true); return; }
  if (s.name() === song.name) s.saved(n);
  renaming = null;
  renderSongs();
  hint('Umbenannt in „' + n + '“.');
}
function renderAuto() {
  const a = current().songs.store.loadAuto();
  el.autoSec.hidden = !a;
  if (!a) return;
  el.autosave.innerHTML = '<span class="name">' + esc(a.name || 'Ohne Namen') + '<span class="date">' + (a.savedAt ? dateTimeOf(a.savedAt) : '') + '</span></span>' +
    '<button type="button" class="btn" data-auto>Laden</button>';
}

/* ---------- Einstellungen ---------- */
// An/Aus-Schalter im Menü; renderToggle und toggleSetting nutzen auch die Bereiche für ihre eigenen Schalter.
// t = { key, btn, state }; liegt die Einstellung nicht in den gemeinsamen, kommen obj und save (zum Speichern) dazu.
export function renderToggle(t) {
  const on = (t.obj || settings)[t.key];
  t.btn.classList.toggle('on', on);
  t.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  t.state.textContent = on ? 'an' : 'aus';
}
// apply setzt die Einstellung um, nachdem sie umgeschaltet und gespeichert wurde
export function toggleSetting(t, apply) {
  t.btn.addEventListener('click', () => {
    const obj = t.obj || settings;
    obj[t.key] = !obj[t.key];
    (t.save || persistSettings)();
    renderToggle(t);
    apply();
  });
}
const WAKE = { key: 'wake', btn: el.btnWakeToggle, state: el.wakeToggleState };
function showUi(pct) {
  el.uiRange.value = pct;
  if (document.activeElement !== el.uiNum) el.uiNum.value = pct;
}
function setUi(v) {
  settings.ui = clampUi(v);
  persistSettings();
  applyUiScale();
}
export function applyUiScale() {
  document.body.style.zoom = settings.ui === 1 ? '' : String(settings.ui);
  showUi(Math.round(settings.ui * 100));
  el.uiScale.querySelectorAll('[data-ui]').forEach((b) => {
    const on = +b.dataset.ui === settings.ui;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
// Bekannte Lieder nach Thema oder alphabetisch: die Knöpfe mit data-sort stehen über den Listen der Bereiche
export const sortAbc = () => settings.songSort === 'abc';
function renderSort() {
  el.drawer.querySelectorAll('[data-sort]').forEach((b) => {
    const on = b.dataset.sort === settings.songSort;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
// Suche in den bekannten Liedern: zeigt nur Lieder, deren Name den Suchtext enthält (ohne Groß/klein, Umlaute und
// Satzzeichen, „hanschen“ findet „Hänschen klein“); Überschriften ohne Treffer verschwinden mit
const fold = (t) => t.toLocaleLowerCase('de').replace(/ß/g, 'ss').normalize('NFD').replace(/[^a-z0-9]+/g, '');
function searchSongs(input) {
  const sec = input.closest('section'), q = fold(input.value);
  let head = null, found = 0;
  sec.querySelectorAll('.songs > li').forEach((li) => {
    if (li.classList.contains('sgroup')) { head = li; li.hidden = true; return; }
    li.hidden = !fold(li.querySelector('.name').textContent).includes(q);
    if (li.hidden) return;
    found++;
    if (head) head.hidden = false;
  });
  sec.querySelector('[data-none]').hidden = found > 0;
}
const searchAll = () => el.drawer.querySelectorAll('.songsearch').forEach(searchSongs);
function renderTempo() { el.tempoOut.textContent = settings.tempo + ' pro Minute'; }

/* ---------- Öffnen und schließen ---------- */
// mode 'songs' (Liedersammlung) oder 'settings' (Einstellungen): beide nutzen dieselbe Seitenleiste, jeder zeigt nur
// seine Abschnitte (data-part im HTML)
function openMenu(mode) {
  const a = current(), s = a.songs;
  el.drawer.dataset.mode = mode;
  el.drawerTitle.textContent = mode === 'songs' ? 'Liedersammlung' : 'Einstellungen';
  stopPlay();
  closeSavePop();
  hint('');
  backupHint('');
  renaming = null;
  el.menuAreaTitle.textContent = a.label;
  el.menuSettingsTitle.textContent = 'Einstellungen für ' + a.label;
  el.menuSettings.hidden = !a.menu;
  el.saveSec.hidden = el.songsSec.hidden = !s;
  // Die Übungstafel wird nicht gespeichert; Laden wechselt zurück zum Schreiben
  if (playing()) el.saveSec.hidden = true;
  el.autoSec.hidden = true;
  if (s) {
    el.songName.value = s.name();
    el.saveTitle.textContent = s.texts.save;
    el.songsTitle.textContent = s.texts.songs;
    renderSongs();
    renderAuto();
  }
  el.drawer.querySelectorAll('[data-area]').forEach((sec) => { sec.hidden = true; });
  el.drawer.querySelectorAll('.songsearch').forEach((i) => { i.value = ''; });
  if (a.menu) a.menu.open();
  searchAll();
  renderSort();
  renderToggle(WAKE);
  el.tempo.value = settings.tempo;
  renderTempo();
  el.backdrop.hidden = false;
  el.drawer.inert = false;
  el.drawer.classList.add('open');
  el.btnClose.focus();
}
export function closeMenu() {
  disarm();
  el.songName.blur();
  el.drawer.querySelectorAll('.songsearch').forEach((i) => i.blur());
  el.drawer.classList.remove('open');
  el.drawer.inert = true;
  el.backdrop.hidden = true;
}
function loadFromMenu(song) {
  closeMenu();
  setPlay(false);
  current().songs.load(song);
}
/* ---------- Alle Lieder sichern ---------- */
function backupHint(text, warn) {
  el.backupHint.textContent = text;
  el.backupHint.classList.toggle('warn', !!warn);
}
function exportSongs() {
  const file = exportAll(), n = Object.values(file.areas).reduce((k, a) => k + a.songs.length, 0);
  if (!n) { backupHint('Es sind noch keine Lieder gespeichert.', true); return; }
  downloadFile('musiktafel-lieder-' + file.exportedAt.slice(0, 10) + '.json', JSON.stringify(file), 'application/json');
  backupHint(n === 1 ? 'Ein Lied exportiert.' : n + ' Lieder exportiert.');
}
async function importSongs(f) {
  let n;
  try { n = importAll(JSON.parse(await f.text())); } catch (e) { n = -1; }
  if (n < 0) { backupHint('Das ist keine Sicherungsdatei der Musiktafel.', true); return; }
  renderSongs();
  backupHint(!n ? 'Alle Lieder aus der Datei waren schon da.' : n === 1 ? 'Ein Lied importiert.' : n + ' Lieder importiert.');
}

function saveSong() {
  saveAs(el.songName, el.btnSave, (text, warn) => { if (!warn) renderSongs(); hint(text, warn); });
}

export function initMenu() {
  applyUiScale();
  el.btnSongs.addEventListener('click', () => openMenu('songs'));
  el.btnSettings.addEventListener('click', () => openMenu('settings'));
  el.btnClose.addEventListener('click', closeMenu);
  el.backdrop.addEventListener('click', closeMenu);

  el.btnSave.addEventListener('click', saveSong);
  onEnter(el.songName, saveSong);
  el.songName.addEventListener('input', () => { if (isArmed(el.btnSave)) disarm(); });

  delegate(el.songs, '[data-load]', (b) => { const s = shown[+b.dataset.load]; if (s) loadFromMenu(s); });
  delegate(el.songs, '[data-del]', (b) => {
    const victim = shown[+b.dataset.del];
    if (!victim) return;
    confirmTap(b, 'Sicher?', () => {
      // Konnte nicht geschrieben werden, ist das Lied noch da; nicht „gelöscht“ melden
      if (!current().songs.store.deleteSong(victim.id)) { hint('Löschen hat nicht geklappt (Speicher gesperrt).', true); renderSongs(); return; }
      renderSongs();
      hint('„' + victim.name + '“ gelöscht.');
    });
  });
  delegate(el.songs, '[data-ren]', (b) => {
    const x = shown[+b.dataset.ren];
    if (!x) return;
    renaming = x.id;
    hint('');
    renderSongs();
  });
  delegate(el.songs, '[data-ren-ok]', rename);
  delegate(el.songs, '[data-ren-no]', () => { renaming = null; hint(''); renderSongs(); });
  el.btnExportAll.addEventListener('click', exportSongs);
  el.btnImportAll.addEventListener('click', () => el.importFile.click());
  el.importFile.addEventListener('change', () => {
    const f = el.importFile.files[0];
    el.importFile.value = ''; // dieselbe Datei noch einmal wählen geht so auch
    if (f) importSongs(f);
  });
  delegate(el.autosave, '[data-auto]', () => {
    const a = current().songs.store.loadAuto();
    if (a) loadFromMenu(a);
  });

  // Sortierung umschalten: der Bereich zeichnet seine Abschnitte im Menü neu
  delegate(el.drawer, '[data-sort]', (b) => {
    settings.songSort = b.dataset.sort;
    persistSettings();
    renderSort();
    if (current().menu) current().menu.open();
    searchAll();
  });
  el.drawer.querySelectorAll('.songsearch').forEach((input) => {
    input.addEventListener('input', () => searchSongs(input));
    onEnter(input, () => input.blur()); // Tastatur zu, die Treffer bleiben
  });
  toggleSetting(WAKE, updateWake);
  // Größe der Oberfläche: skaliert die ganze Seite (CSS zoom), Tippen und Ziehen bleiben dabei genau
  delegate(el.uiScale, '[data-ui]', (b) => setUi(+b.dataset.ui));
  // Regler: beim Ziehen nur die Zahl zeigen, erst beim Loslassen anwenden (sonst springt die Seite unter dem Finger)
  el.uiRange.addEventListener('input', () => { el.uiNum.value = el.uiRange.value; });
  el.uiRange.addEventListener('change', () => setUi(el.uiRange.value / 100));
  el.uiMinus.addEventListener('click', () => setUi(settings.ui - 0.05));
  el.uiPlus.addEventListener('click', () => setUi(settings.ui + 0.05));
  // Feld: eigene Prozentzahl, gilt beim Bestätigen oder Verlassen
  el.uiNum.addEventListener('change', () => { setUi(el.uiNum.value / 100); el.uiNum.value = Math.round(settings.ui * 100); });
  onEnter(el.uiNum, () => el.uiNum.blur());
  el.tempo.addEventListener('input', () => {
    setTempo(+el.tempo.value);
    renderTempo();
  });
}
