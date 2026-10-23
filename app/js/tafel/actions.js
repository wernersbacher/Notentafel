// Alles, was die Tafel verändert. Jede Aktion merkt sich vorher den Stand für „Rückgängig“ und endet mit commit().
// Die Aktionen liegen nach Themen in eigenen Dateien; diese Datei führt sie zusammen.
export * from './bars.js';
export * from './rows.js';
export * from './board-actions.js';
export * from './cover.js';
export * from './range.js';
// Aus edit.js kommen nur die Aktionen; advance darin braucht allein bars.js (Zählzeiten).
export { select, toggleInsert, placeNote, placeValue, toggleDot, placeRest, setHand, closeGap, deleteCell } from './edit.js';
