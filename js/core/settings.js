// Einstellungen. Alle stehen zusammen unter einem Schlüssel; der Kern prüft seine eigenen Felder,
// ein Bereich ergänzt seine mit useSettings.
import { readJSON, writeJSON } from './store.js';

const KEY = 'notentafel.settings.v1';
export const TEMPO = { min: 50, max: 160, start: 90 };

export function cleanCoreSettings(s) {
  return {
    tempo: (s.tempo >= TEMPO.min && s.tempo <= TEMPO.max) ? s.tempo : TEMPO.start,
    mode: typeof s.mode === 'string' ? s.mode : '', // offener Bereich; ob es ihn gibt, prüft die Shell
    wake: s.wake !== false, // Bildschirm anlassen
    countIn: !!s.countIn, // vor dem Abspielen einen Takt einzählen
    metro: !!s.metro // beim Abspielen jeden Schlag mitklicken
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
