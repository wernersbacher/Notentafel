// Gemeinsame Helfer der Lied-Aktionen: die Ereignisse des Lieds und das gerade markierte Zeichen.
import { L } from './state.js';

export const ev = () => L.song.ev;
export const cur = () => L.song.ev[L.sel];
