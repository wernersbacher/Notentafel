// Gemeinsame Elemente aus index.html nach ihrer id: Rahmen, gemeinsame Knöpfe der Leiste und das Menü
const ids = [
  'toast', 'tabs', 'parts','btnSongs', 'btnSettings', 'drawerTitle',
  'btnIns', 'btnGap', 'btnDel', 'btnBreak', 'btnSide', 'btnTopHide', 'btnTopShow',
  'gameBar', 'quizView', 'gameIntro',
  'btnPlay', 'btnPresent', 'btnTempo', 'tempoNum', 'tempoPop', 'tempoPopOut', 'tempoRange', 'tempoMinus', 'tempoPlus', 'btnUndo', 'btnClear', 'btnAddRow', 'btnDelRow',
  'btnSaveSide', 'savePop', 'saveName', 'btnSaveOk', 'saveHintSide',
  'drawer', 'backdrop', 'btnClose', 'menuAreaTitle', 'menuSettings', 'menuSettingsTitle', 'saveSec', 'saveTitle', 'songName', 'btnSave', 'saveHint',
  'autoSec', 'autosave', 'songsSec', 'songsTitle', 'songs', 'cloudHint', 'btnExportAll', 'btnImportAll', 'importFile', 'backupHint',
  'accMount', 'accountSec', 'accOut', 'accIn', 'accWho', 'accState', 'btnLogout',
  'wakeSec', 'btnWakeToggle', 'wakeToggleState', 'tempo', 'tempoOut', 'uiScale', 'uiRange', 'uiNum', 'uiMinus', 'uiPlus'
];
// Zu einer Liste von ids das Objekt id → Element; das Einlesen steht so nur einmal da
export function byId(ids) {
  return Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
}
export const el = byId(ids);
// Der Rahmen um die Tafel, in dem jeder Bereich seine eigene Fläche hat
el.board = document.querySelector('.board');
// Der gemeinsame Behälter der Werkzeugknöpfe oben in der Leiste (index.html: .tools.toprow mit insert, gap, del, brk);
// shell.js blendet ihn aus, wenn der Bereich keine dieser Werkzeuge hat
el.sharedTools = document.querySelector('.tools.toprow');
