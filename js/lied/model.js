// Datenmodell des Lieds. Alle Funktionen hier sind rein.
//
// Dies ist die Fassade: Die Abschnitte liegen in einzelnen Dateien und werden hier gesammelt, damit alle
// bestehenden Importe aus './model.js' unverändert bleiben. Dazu kommt findCoverIndex, weil Notenblatt (overlays.js)
// und Aktionen (cover.js) dieselbe Stelle des Tuchs brauchen.
//   theory.js   Grundbegriffe: Werte, Tonart, Tonhöhen (kennt kein anderes Modul aus lied/)
//   measures.js Takte, Raster, Zählzeiten, Haltebögen und Änderungen daran (kennt theory)
//   quizpool.js Stammtöne, Knöpfe und Tonraum fürs Tonnamen-Quiz (kennt theory und measures)
//   melody.js   Transponieren; reicht songToMelody aus dem gemeinsamen songformat.js weiter (kennt theory)
//   clean.js    gespeicherte Stände prüfen, Vorzeichen und unvollständige Takte (kennt theory und measures)
//   play.js     Abspielplan und Intervall fürs Üben (kennt theory und measures)
//
// Ein Lied ist { meter, pickup, key, ev }: die Taktart ('' = ohne), der Auftakt in Ticks (0 = keiner), die Tonart als
// Zahl der Vorzeichen (1 = ein ♯ wie G-Dur, −1 = ein ♭ wie F-Dur, 0 = C-Dur) und eine durchgehende Folge von Ereignissen.
//   { p, v, dot?, acc? }  Note: p Tonhöhe ('c1' = c', 'a0' = a, 'c2' = c''), v Grundwert (1 Ganze, 2 Halbe, 4 Viertel,
//                         8 Achtel, 16 Sechzehntel), dot punktiert, acc Vorzeichen (1 ♯, −1 ♭, 0 ♮; fehlt = wie die Tonart)
//   tie: 1               an einer Note: Haltebogen zur nächsten Note
//   ly: 'Al-'            an einer Note: Silbe des Liedtexts (ein „-“ am Ende verbindet mit der nächsten Silbe)
//   { v, dot? }           Pause
// Jedes Ereignis kann zusätzlich tragen: bar (dahinter: 1 Taktstrich, 2 Schlussstrich, 3 Wiederholung Ende :‖,
// 4 Wiederholung Anfang ‖:, 5 beides :‖:), volta (nur mit 3 oder 5: der Takt davor ist die 1. Klammer, der danach die 2.)
// und brk (Zeilenumbruch dahinter).
// Die Zeilen (Notensysteme) entstehen erst beim Zeichnen.

export * from './theory.js';
export * from './measures.js';
export * from './quizpool.js';
export * from './melody.js';
export * from './clean.js';
export * from './play.js';

/* ---------- Verdecken ---------- */
// Ereignis, ab dem das Tuch liegt (-1: keins); rein, damit Notenblatt und Aktionen dieselbe Stelle fragen
export const findCoverIndex = (events) => events.findIndex((e) => e.cv);
