// Elemente der Tafel (Melodie und Rhythmus) nach ihrer id, zusammen mit den gemeinsamen aus dem Kern
import { el as core, byId } from '../core/dom.js';
import { fillGameFrames } from '../core/game.js';
import { MEL_FRAMES, RHY_FRAMES } from './gameFrames.js';

// Hinweis und Startknopf der Spielabschnitte entstehen erst hier, deshalb vor dem Einlesen ihrer ids (melQuizGo, echoGo, …)
fillGameFrames('melPlay', MEL_FRAMES);
fillGameFrames('rhyPlay', RHY_FRAMES);

const ids = [
  'grid', 'palette', 'values', 'rests', 'valuesMel', 'counts',
  'btnR', 'btnL', 'btnBar', 'btnEnd', 'btnBarMel', 'btnEndMel', 'btnRepStart', 'btnRepEnd', 'btnRepStartMel', 'btnRepEndMel', 'btnLine', 'rhyMeters', 'melMeters', 'restsMel', 'btnAutoBarMel', 'btnAutoZMel',
  'panelMel', 'panelRhy', 'btnAutoBar', 'btnAutoZ', 'btnSyl', 'btnToLied', 'btnToLiedSide',
  'melodiesSec', 'melodies',
  'btnLensToggle', 'lensToggleState',
  'whichCount', 'whichGo', 'readGo', 'buildGo', 'fixGo', 'guessGo', 'guessLen', 'meloLen', 'meloSteps', 'meloGo', 'updownGo',
  'echoMeter', 'echoBars', 'echoNotes', 'echoRests', 'echoSound', 'echoPulse', 'echoGo', 'melQuizHint', 'melQuizMode', 'melQuizAsk', 'melQuizRand', 'melQuizSemis', 'melQuizHigh', 'melQuizGo'
];
export const el = Object.assign(Object.create(core), byId(ids));
// Der Rahmen um die Tafel, der seitlich wischen lässt
el.board = el.grid.parentNode;
