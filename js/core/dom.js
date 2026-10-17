// Gemeinsame Elemente aus index.html nach ihrer id: Rahmen, gemeinsame Knöpfe der Leiste und das Menü
const ids = [
  'toast', 'tabs', 'btnMenu',
  'btnIns', 'btnGap', 'btnDel', 'btnBreak', 'btnDone',
  'btnPlay', 'btnUndo', 'btnClear', 'btnAddRow', 'btnDelRow',
  'btnSaveSide', 'savePop', 'saveName', 'btnSaveOk', 'saveHintSide',
  'drawer', 'backdrop', 'btnClose', 'drawerTitle', 'menuAreaTitle', 'menuSettings', 'menuSettingsTitle', 'saveSec', 'saveTitle', 'songName', 'btnSave', 'saveHint',
  'autoSec', 'autosave', 'songsSec', 'songsTitle', 'songs',
  'wakeSec', 'btnWakeToggle', 'wakeToggleState', 'btnCountInToggle', 'countInToggleState', 'btnMetroToggle', 'metroToggleState', 'tempo', 'tempoOut'
];
export const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
// Der Rahmen um die Tafel, in dem jeder Bereich seine eigene Fläche hat
el.board = document.querySelector('.board');
