// Elemente der Tafel (Melodie und Rhythmus) nach ihrer id, zusammen mit den gemeinsamen aus dem Kern
import { el as core } from '../core/dom.js';

const ids = [
  'grid', 'palette', 'values', 'rests', 'valuesMel', 'counts',
  'btnR', 'btnL', 'btnBar', 'btnEnd', 'btnLine', 'btnMeter', 'meterShow', 'meterPop',
  'panelMel', 'panelRhy', 'btnAutoBar', 'btnAutoZ', 'btnSyl', 'btnToLied',
  'melodiesSec', 'melodies', 'themesSec', 'themes',
  'btnLensToggle', 'lensToggleState', 'btnPropToggle', 'propToggleState'
];
export const el = Object.assign(Object.create(core), Object.fromEntries(ids.map((id) => [id, document.getElementById(id)])));
// Der Rahmen um die Tafel, der seitlich wischen lässt
el.board = el.grid.parentNode;
