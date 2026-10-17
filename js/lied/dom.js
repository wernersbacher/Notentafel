// Elemente des Lieds nach ihrer id, zusammen mit den gemeinsamen aus dem Kern
import { el as core } from '../core/dom.js';

const ids = [
  'sheet', 'panelLied', 'liedSteps', 'liedMore', 'liedMeters', 'liedSharp', 'liedFlat', 'liedNat',
  'liedValues', 'liedRests', 'liedTie', 'liedBar', 'liedEnd', 'liedPickups', 'liedShowCounts', 'btnAutoBarToggle', 'autoBarToggleState',
  'btnNamesToggle', 'namesToggleState', 'btnColorsToggle', 'colorsToggleState', 'liedShowNames', 'liedShowColors', 'btnCheckToggle', 'checkToggleState', 'btnWrapToggle', 'wrapToggleState', 'liedSizes', 'liedSongs', 'btnLiedExport', 'btnLiedPrint', 'printOut'
];
export const el = Object.assign(Object.create(core), Object.fromEntries(ids.map((id) => [id, document.getElementById(id)])));
