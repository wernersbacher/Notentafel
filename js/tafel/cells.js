// Zell- und Zeilen-Grundbegriffe der Tafel: Was ist ein Ton, ein Schlag, eine Pause, wie viele Sechzehntel belegt ein
// Platz. Diese Datei kennt kein anderes Modul der Tafel; model.js, beams.js, play.js und clean.js (und das gemeinsame
// songformat.js) bauen darauf auf. Alle Funktionen hier sind rein.

export const isNote = (c) => !!(c && c.n);
export const isBeat = (c) => !!(c && c.k === 'b');
export const isRest = (c) => !!(c && c.k === 'r');
export const filled = (c) => isNote(c) || !!(c && c.k);
export const sounds = (c) => isNote(c) || isBeat(c);
export const dur = (c) => (c && c.d) || 1;
// Länge eines Platzes in Sechzehnteln (so viele Spalten belegt er auf der Tafel; ein Schlag sind vier)
export const units = (c) => Math.round(dur(c) * 4);
// Ein Platz, der nur einen Strich trägt (z. B. der Schlussstrich am Zeilenende), ist keine Zeit, sondern eine
// Markierung – er zählt nichts (sonst schöbe er beim Umbrechen einen Geisterschlag in die Zeile). Ein leerer Platz
// bleibt ein stiller Schlag. Für Umbruch, Zeichnen, Abspielen und Übergabe ans Lied dieselbe Bedingung.
export const isBarOnly = (c) => !filled(c) && !!(c && c.bar);
// Belegte Zeit eines Platzes in Sechzehnteln; ein Strich-Platz zählt nichts
export const cellUnits = (c) => (isBarOnly(c) ? 0 : units(c));
// Belegte Sechzehntel einer Zeile bzw. bis zum Platz c: die eine Zählung für Zeilenbreite, Umbruch und volle Zeile
export const rowUnits = (row) => row.reduce((u, c) => u + cellUnits(c), 0);
export const rowUnitsAt = (row, c) => rowUnits(row.slice(0, c + 1));
// Ist die Zeile bis zum Platz c voll? cap Schläge je Zeile (ein Schlag sind vier Sechzehntel).
export const rowFullAt = (row, c, cap) => rowUnitsAt(row, c) >= 4 * cap;
// Passt ein neues Zeichen noch ans Ende der Zeile?
export const fitsInRow = (row, v, cap) => rowUnits(row) + units(v) <= 4 * cap;
// Breite der Tafel in --L: die breiteste Zeile; ohne Zeilen der CSS-Standard (--fr: 2 statt -Infinity)
export const widest = (widths) => (widths.length ? Math.max(...widths) : 2);
// Zeile, ab der das Tuch liegt (-1: keine); board.js zeichnet es, cover.js verschiebt es
export const findCoverRow = (rows) => rows.findIndex((row) => row.cover);
// Leere Plätze am Zeilenende fallen weg (ein leerer Platz mit Taktstrich bleibt)
export function trimRow(row) {
  while (row.length && !row[row.length - 1]) row.pop();
}
