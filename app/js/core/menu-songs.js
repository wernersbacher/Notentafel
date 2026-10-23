// Lied-Abschnitte der Seitenleiste: speichern, laden, umbenennen, löschen, suchen, sortieren und alle Lieder sichern.
// Die Seitenleiste selbst öffnen und schließen menu.js; hier liegen nur die Liedliste samt ihrer Verdrahtung.
import { settings, persistSettings } from './settings.js';
import { current, saveAs, setPlay } from './shell.js';
import { esc, confirmTap, disarm, isArmed, delegate, onEnter, downloadFile, setPressed, status, dateOf, dateTimeOf } from './ui.js';
import { exportAll, importAll, songRoom } from './store.js';
import { plan, limitText } from './tier.js';
import { el } from './dom.js';
import { localOnly } from './cloud.js';
import { CLOSE } from './icons.js';

export const hint = (text, warn) => status(el.saveHint, text, warn);

/* ---------- Listen ---------- */
// Die gespeicherten Lieder des offenen Bereichs, so wie sie gerade angezeigt werden
let shown = [];
let renaming = null; // id des Lieds, das gerade umbenannt wird: Statt Name und Knöpfen steht dort ein Feld
const PENCIL = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
// openMenu beginnt ohne Umbenennen
export function clearRenaming() { renaming = null; }
export function renderSongs() {
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
      '<button type="button" class="btn icon" data-ren-no title="Abbrechen" aria-label="Abbrechen">' + CLOSE + '</button></li>'
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
export function renderAuto() {
  const a = current().songs.store.loadAuto();
  el.autoSec.hidden = !a;
  if (!a) return;
  el.autosave.innerHTML = '<span class="name">' + esc(a.name || 'Ohne Namen') + '<span class="date">' + (a.savedAt ? dateTimeOf(a.savedAt) : '') + '</span></span>' +
    '<button type="button" class="btn" data-auto>Laden</button>';
}

// Bekannte Lieder nach Thema oder alphabetisch: die Knöpfe mit data-sort stehen über den Listen der Bereiche
export const sortAbc = () => settings.songSort === 'abc';
export function renderSort() {
  el.drawer.querySelectorAll('[data-sort]').forEach((b) => setPressed(b, b.dataset.sort === settings.songSort));
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
export const searchAll = () => el.drawer.querySelectorAll('.songsearch').forEach(searchSongs);

// closeMenu kommt von menu.js herein; menu-songs.js importiert menu.js nicht (kein Zyklus)
function loadFromMenu(song, close) {
  close();
  setPlay(false);
  current().songs.load(song);
}
/* ---------- Alle Lieder sichern ---------- */
export function backupHint(text, warn) { status(el.backupHint, text, warn); }
function exportSongs() {
  const file = exportAll(), n = Object.values(file.areas).reduce((k, a) => k + a.songs.length, 0);
  if (!n) { backupHint('Es sind noch keine Lieder gespeichert.', true); return; }
  downloadFile('musiktafel-lieder-' + file.exportedAt.slice(0, 10) + '.json', JSON.stringify(file), 'application/json');
  backupHint(n === 1 ? 'Ein Lied exportiert.' : n + ' Lieder exportiert.');
}
async function importSongs(f) {
  let n;
  // Die Grenze der Stufe gilt auch hier: nur so viele neue Lieder, wie noch hineinpassen (Export bleibt frei)
  const max = plan.limit('songs'), info = {};
  try { n = importAll(JSON.parse(await f.text()), max == null ? null : songRoom(max), info); } catch (e) { n = -1; }
  if (n < 0) { backupHint('Das ist keine Sicherungsdatei der Musiktafel.', true); return; }
  renderSongs();
  const rest = info.skipped ? ' ' + info.skipped + (info.skipped === 1 ? ' Lied' : ' Lieder') + ' nicht übernommen. ' + limitText('songs') : '';
  if (rest) { backupHint((!n ? 'Kein Lied importiert.' : n === 1 ? 'Ein Lied importiert.' : n + ' Lieder importiert.') + rest, true); return; }
  backupHint(!n ? 'Alle Lieder aus der Datei waren schon da.' : n === 1 ? 'Ein Lied importiert.' : n + ' Lieder importiert.');
}

function saveSong() {
  saveAs(el.songName, el.btnSave, (text, warn) => { if (!warn) renderSongs(); hint(text, warn); });
}

/* ---------- Verdrahtung ---------- */
// Knöpfe und Felder der Lied-Abschnitte; menu.js ruft das beim Start auf und reicht closeMenu herein
export function initSongs(close) {
  el.btnSave.addEventListener('click', saveSong);
  onEnter(el.songName, saveSong);
  el.songName.addEventListener('input', () => { if (isArmed(el.btnSave)) disarm(); });

  delegate(el.songs, '[data-load]', (b) => { const s = shown[+b.dataset.load]; if (s) loadFromMenu(s, close); });
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
    if (a) loadFromMenu(a, close);
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
}
