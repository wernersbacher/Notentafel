// Aktuelle Größe eines Linienabstands in Pixeln (zum Umrechnen beim Ziehen). render.js setzt sie beim Zeichnen
// (renderSheet), overlays.js und input.js lesen sie.
export let spPx = 16;
export const setSpPx = (v) => { spPx = v; };
