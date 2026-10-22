// Alles, was das Lied verändert. Jede Aktion merkt sich vorher den Stand für „Rückgängig“ und endet mit commit().
// Die Aktionen liegen nach Themen in eigenen Dateien; diese Datei führt sie zusammen.
export * from './edit.js';
export * from './lyrics.js';
export * from './meter.js';
export * from './lines.js';
export * from './song.js';
export * from './cover.js';
