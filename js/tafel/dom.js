// Elemente der Tafel (Melodie und Rhythmus) nach ihrer id, zusammen mit den gemeinsamen aus dem Kern
import { el as core } from '../core/dom.js';

const ids = [
  'grid', 'palette', 'values', 'rests', 'valuesMel', 'counts',
  'btnR', 'btnL', 'btnBar', 'btnEnd', 'btnRepStart', 'btnRepEnd', 'btnRepStartMel', 'btnRepEndMel', 'btnLine', 'rhyMeters', 'melMeters', 'btnAutoBarMel', 'btnAutoZMel',
  'panelMel', 'panelRhy', 'btnAutoBar', 'btnAutoZ', 'btnSyl', 'btnToLied',
  'melodiesSec', 'melodies', 'themesSec', 'themes',
  'btnLensToggle', 'lensToggleState'
];
export const el = Object.assign(Object.create(core), Object.fromEntries(ids.map((id) => [id, document.getElementById(id)])));
// Der Rahmen um die Tafel, der seitlich wischen lässt
el.board = el.grid.parentNode;
