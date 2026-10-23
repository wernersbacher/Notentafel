// Einstellungen. Alle stehen zusammen unter einem Schlüssel; der Kern prüft seine eigenen Felder,
// ein Bereich ergänzt seine mit useSettings.
import { readJSON, writeJSON } from './store.js';
import { makeSignal } from './signal.js';

const KEY = 'notentafel.settings.v1';
export const TEMPO = { min: 50, max: 160, start: 90 };
const UI_SCALE = { min: 0.5, max: 2 };
// Aufgeklappte Blöcke der Leiste, über ihren stabilen Namen aus data-block (früher Bereich + Nummer, z. B. 'mel2');
// am Anfang je Bereich „schreiben“
export const OPEN_START = ['mel-notes', 'rhy-notes', 'lied-notes'];
// Schlüssel aus der Zeit vor data-block (Bereich + Position im HTML, z. B. 'mel2') auf die stabilen Namen. Beim
// Einlesen wird der gespeicherte Stand einmal abgebildet, damit nach dem Update dieselben Blöcke offen sind; ein
// solcher Schlüssel wird nicht erneut gespeichert. Die Zuordnung steht fest (Stand beim Wechsel), damit auch ein
// späteres Umsortieren der Blöcke alte Stände nicht falsch deutet. Unbekannte Schlüssel in alter Form bleiben, wie
// sie sind (sie öffnen nichts, bis ein Block so heißt), neue Namen werden unverändert übernommen.
const OLD_BLOCK_KEYS = {
  mel1: 'mel-setup', mel2: 'mel-notes', mel3: 'mel-symbols', mel4: 'mel-cover',
  rhy1: 'rhy-setup', rhy2: 'rhy-notes', rhy3: 'rhy-symbols', rhy4: 'rhy-counts', rhy5: 'rhy-cover',
  lied1: 'lied-setup', lied2: 'lied-notes', lied3: 'lied-symbols', lied4: 'lied-lyrics', lied5: 'lied-cover'
};
// Alte Form (Bereich + Nummer) und neuer Name (Bereich + sprechender Name, z. B. 'mel-notes' oder 'mel-3')
const isBlockKey = (k) => /^[a-z]+\d$/.test(k) || /^[a-z]+-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(k);
const openKey = (k) => OLD_BLOCK_KEYS[k] || k;
// Größe der Oberfläche: auf ganze Prozent gerundet und begrenzt, Unbrauchbares wird 100 %
export function clampUi(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.round(Math.min(UI_SCALE.max, Math.max(UI_SCALE.min, n)) * 100) / 100;
}

const entriesOf = (o) => Object.entries(o && typeof o === 'object' && !Array.isArray(o) ? o : {});

export function cleanCoreSettings(s) {
  return {
    tempo: (s.tempo >= TEMPO.min && s.tempo <= TEMPO.max) ? s.tempo : TEMPO.start,
    mode: typeof s.mode === 'string' ? s.mode : '', // offener Bereich; ob es ihn gibt, prüft die Shell
    wake: s.wake !== false, // Bildschirm anlassen
    countIn: !!s.countIn, // vor dem Abspielen einen Takt einzählen
    metro: !!s.metro, // beim Abspielen jeden Schlag mitklicken
    loop: !!s.loop, // den markierten Bereich (ohne Markierung das ganze Stück) immer wieder abspielen
    loopHint: !!s.loopHint, // der Hinweis zum Markieren eines Bereichs wurde beim ersten Einschalten schon gezeigt
    songSort: s.songSort === 'abc' ? 'abc' : 'group', // bekannte Lieder nach Thema oder alphabetisch
    step: !!s.step, // Schritt für Schritt: jeder Tipp auf den großen Knopf eine Note weiter
    stepSound: !!s.stepSound, // dabei die erreichte Note auch erklingen lassen
    stepHide: !!s.stepHide, // dabei nur bis zur aktuellen Note zeigen, der Rest ist ausgeblendet
    topHidden: !!s.topHidden, // Leiste oben (die Tafeln) eingeklappt
    // Bereiche, die „Üben und Spielen“ zeigen statt „schreiben“, z. B. { rhy: true }
    play: Object.fromEntries(entriesOf(s.play).filter(([, v]) => v === true)),
    // Gewähltes Spiel je Bereich, z. B. { rhy: 'which' }; ob es das Spiel gibt, prüft game.js
    game: Object.fromEntries(entriesOf(s.game).filter(([, v]) => typeof v === 'string' && /^[a-z]+$/.test(v))),
    ui: s.ui === undefined ? 1 : clampUi(s.ui), // Größe der ganzen Oberfläche (z. B. 1.3 für eine Spiegelung auf den großen Bildschirm)
    // Immer nur ein Block je Bereich offen; wer die Blöcke schon einzeln auf- und zugeklappt hat (open gespeichert), behält mehrere
    accordion: s.accordion === undefined ? !Array.isArray(s.open) : !!s.accordion,
    open: Array.isArray(s.open) ? [...new Set(s.open.filter((k) => typeof k === 'string' && isBlockKey(k)).map(openKey))] : OPEN_START.slice()
  };
}

const raw = readJSON(KEY) || {};
export const settings = cleanCoreSettings(raw);

// clean(raw) liefert die geprüften Felder eines Bereichs; sie landen im selben Objekt und werden mitgespeichert
export function useSettings(clean) {
  Object.assign(settings, clean(raw));
  return settings;
}
export const persistSettings = () => writeJSON(KEY, settings);

// Tempo setzen, begrenzt und in Fünferschritten wie der Regler (z. B. das eigene Tempo eines bekannten Lieds).
// watchTempo(f): f wird danach aufgerufen, damit jede Anzeige des Tempos (Menü, Knopf auf der Tafel) mitgeht.
// Liefert eine Funktion zum Abmelden.
const tempoChanged = makeSignal();
export const watchTempo = (f) => tempoChanged(f);
export function setTempo(v) {
  settings.tempo = Math.min(TEMPO.max, Math.max(TEMPO.min, Math.round(v / 5) * 5));
  persistSettings();
  tempoChanged.emit();
}
