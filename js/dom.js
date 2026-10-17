// Alle Elemente aus index.html, die das Skript braucht, nach ihrer id
const ids = [
  'grid', 'toast', 'palette', 'values', 'rests', 'valuesMel', 'counts',
  'btnR', 'btnL', 'btnIns', 'btnDel', 'delLabel', 'btnBreak', 'btnDone', 'btnBar', 'btnEnd', 'btnLine',
  'btnMeter', 'meterShow', 'meterPop', 'btnPlay', 'btnUndo', 'btnClear', 'btnAddRow', 'btnDelRow', 'btnMenu',
  'tabMel', 'tabRhy', 'panelMel', 'panelRhy', 'btnAutoBar', 'btnAutoZ',
  'btnSaveSide', 'savePop', 'saveName', 'btnSaveOk', 'saveHintSide',
  'drawer', 'backdrop', 'btnClose', 'drawerTitle', 'saveTitle', 'songName', 'btnSave', 'saveHint',
  'autoSec', 'autosave', 'songsTitle', 'songs', 'melodiesSec', 'melodies', 'themes',
  'btnLensToggle', 'lensToggleState', 'btnPropToggle', 'propToggleState',
  'wakeSec', 'btnWakeToggle', 'wakeToggleState', 'tempo', 'tempoOut'
];
export const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
// Der Rahmen um die Tafel, der seitlich wischen lässt
el.board = el.grid.parentNode;
