// Elemente der Tafel (Melodie und Rhythmus) nach ihrer id, zusammen mit den gemeinsamen aus dem Kern
import { el as core } from '../core/dom.js';

const ids = [
  'grid', 'palette', 'values', 'rests', 'valuesMel', 'counts',
  'btnR', 'btnL', 'btnBar', 'btnEnd', 'btnBarMel', 'btnEndMel', 'btnRepStart', 'btnRepEnd', 'btnRepStartMel', 'btnRepEndMel', 'btnLine', 'rhyMeters', 'melMeters', 'restsMel', 'btnAutoBarMel', 'btnAutoZMel',
  'panelMel', 'panelRhy', 'btnAutoBar', 'btnAutoZ', 'btnSyl', 'btnToLied', 'btnToLiedSide',
  'melodiesSec', 'melodies',
  'btnLensToggle', 'lensToggleState',
  'whichCount', 'whichGo', 'readGo', 'buildGo', 'fixGo', 'guessGo', 'guessLen', 'meloLen', 'meloSteps', 'meloGo', 'updownGo',
  'echoMeter', 'echoBars', 'echoNotes', 'echoRests', 'echoSound', 'echoPulse', 'echoGo', 'melQuizHint', 'melQuizMode', 'melQuizAsk', 'melQuizRand', 'melQuizSemis', 'melQuizHigh', 'melQuizGo'
];
export const el = Object.assign(Object.create(core), Object.fromEntries(ids.map((id) => [id, document.getElementById(id)])));
// Der Rahmen um die Tafel, der seitlich wischen lässt
el.board = el.grid.parentNode;
