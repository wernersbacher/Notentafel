// Elemente des Lieds nach ihrer id, zusammen mit den gemeinsamen aus dem Kern
import { el as core, byId } from '../core/dom.js';

const ids = [
  'sheet', 'panelLied', 'liedSteps', 'liedLyric', 'liedLyricNext', 'liedMore', 'liedMeters', 'liedKeyDown', 'liedKeyUp', 'liedKeyName', 'btnTransDown', 'btnTransUp', 'btnToMelody', 'liedSharp', 'liedFlat', 'liedNat',
  'liedValues', 'liedRests', 'liedTie', 'liedBar', 'liedEnd', 'liedRepStart', 'liedRepEnd', 'liedVolta', 'liedPickups', 'liedShowCounts', 'liedShowLyrics', 'btnAutoBarToggle', 'liedBarAuto', 'liedBarHand', 'autoBarToggleState',
  'btnNamesToggle', 'namesToggleState', 'btnColorsToggle', 'colorsToggleState', 'liedShowNames', 'liedShowColors', 'btnCheckToggle', 'checkToggleState', 'btnWrapToggle', 'wrapToggleState', 'liedSizes', 'liedSongs', 'btnLiedExport', 'btnLiedPrint', 'printOut',
  'liedQuizMode', 'liedQuizRand', 'liedQuizRange', 'placeGo', 'stepGo', 'valuesGo', 'valLevel', 'valRests', 'liedQuizLo', 'liedQuizHi', 'liedQuizLoDown', 'liedQuizLoUp', 'liedQuizHiDown', 'liedQuizHiUp', 'liedQuizSharp', 'liedQuizFlat', 'liedQuizGo'
];
export const el = Object.assign(Object.create(core), byId(ids));
