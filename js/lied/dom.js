// Elemente des Lieds nach ihrer id, zusammen mit den gemeinsamen aus dem Kern
import { el as core } from '../core/dom.js';

const ids = [
  'sheet', 'panelLied', 'liedSteps', 'liedDown', 'liedUp', 'liedSharp', 'liedFlat', 'liedNat',
  'liedValues', 'liedRest', 'liedTie', 'liedTakt', 'liedMeterShow', 'liedTaktPop',
  'btnNamesToggle', 'namesToggleState', 'btnCheckToggle', 'checkToggleState', 'btnWrapToggle', 'wrapToggleState', 'liedSizes', 'liedSongs', 'btnLiedExport'
];
export const el = Object.assign(Object.create(core), Object.fromEntries(ids.map((id) => [id, document.getElementById(id)])));
