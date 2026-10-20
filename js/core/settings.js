// Einstellungen. Alle stehen zusammen unter einem Schlüssel; der Kern prüft seine eigenen Felder,
// ein Bereich ergänzt seine mit useSettings.
import { readJSON, writeJSON } from './store.js';

const KEY = 'notentafel.settings.v1';
export const TEMPO = { min: 50, max: 160, start: 90 };
export const UI_SCALE = { min: 0.5, max: 2 };
// Aufgeklappte Blöcke der Leiste (Bereich + Nummer); am Anfang je Bereich „schreiben“
export const OPEN_START = ['mel2', 'rhy2', 'lied2'];
// Größe der Oberfläche: auf ganze Prozent gerundet und begrenzt, Unbrauchbares wird 100 %
export function clampUi(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.round(Math.min(UI_SCALE.max, Math.max(UI_SCALE.min, n)) * 100) / 100;
}

export function cleanCoreSettings(s) {
  return {
    tempo: (s.tempo >= TEMPO.min && s.tempo <= TEMPO.max) ? s.tempo : TEMPO.start,
    mode: typeof s.mode === 'string' ? s.mode : '', // offener Bereich; ob es ihn gibt, prüft die Shell
    wake: s.wake !== false, // Bildschirm anlassen
    countIn: !!s.countIn, // vor dem Abspielen einen Takt einzählen
    metro: !!s.metro, // beim Abspielen jeden Schlag mitklicken
    songSort: s.songSort === 'abc' ? 'abc' : 'group', // bekannte Lieder nach Thema oder alphabetisch
    step: !!s.step, // Schritt für Schritt: jeder Tipp auf den großen Knopf eine Note weiter
    stepSound: !!s.stepSound, // dabei die erreichte Note auch erklingen lassen
    stepHide: !!s.stepHide, // dabei nur bis zur aktuellen Note zeigen, der Rest ist ausgeblendet
    topHidden: !!s.topHidden, // Leiste oben (die Tafeln) eingeklappt
    ui: s.ui === undefined ? 1 : clampUi(s.ui), // Größe der ganzen Oberfläche (z. B. 1.3 für eine Spiegelung auf den großen Bildschirm)
    open: Array.isArray(s.open) ? s.open.filter((k) => typeof k === 'string' && /^[a-z]+\d$/.test(k)) : OPEN_START.slice()
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
const tempoWatchers = [];
export const watchTempo = (f) => { tempoWatchers.push(f); };
export function setTempo(v) {
  settings.tempo = Math.min(TEMPO.max, Math.max(TEMPO.min, Math.round(v / 5) * 5));
  persistSettings();
  tempoWatchers.forEach((f) => f());
}
