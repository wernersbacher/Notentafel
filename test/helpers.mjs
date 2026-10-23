// Gemeinsame Helfer für die Tests: ein localStorage-Ersatz und die kleinen Lied-Bausteine.
// Diese Datei hat beim Import keine Seiteneffekte (node --test lädt sie als Datei ohne Testfälle mit).

// In-Memory-localStorage wie im Browser: setItem speichert den Wert als String, getItem gibt null für fehlende
// Schlüssel. failKey: dieser Schlüssel scheitert beim Schreiben (Speicher voll oder gesperrt). Er lässt sich am
// zurückgegebenen Objekt umstellen, damit ein Test das Scheitern an- und wieder abschalten kann.
export function fakeStorage({ failKey = null } = {}) {
  const mem = new Map();
  const storage = {
    failKey,
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { if (k === storage.failKey) throw new Error('voll'); mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); },
    clear: () => mem.clear()
  };
  return storage;
}

// Lied-Bausteine: Note mit Tonhöhe p und Wert v, Pause, Lied aus Ereignissen (pickup 0 = kein Auftakt)
export const n = (p, v = 4, x = {}) => ({ p, v, ...x });
export const r = (v = 4, x = {}) => ({ v, ...x });
export const song = (ev, meter = '4/4', pickup = 0) => ({ meter, pickup, ev });

// DOM-Ersatz (jsdom) für die Module, die beim Import Elemente aus app/index.html einlesen (core/dom.js, lied/dom.js,
// tafel/dom.js). installDom() lädt die echte index.html (ohne Scripts) und legt document, window, localStorage usw. als
// globals an; uninstallDom() entfernt sie wieder. Die Module halten ihre Elemente nach dem Import fest, deshalb:
// installDom() VOR dem dynamischen import() der App-Module aufrufen, pro Testdatei einmal (before/after), und die
// Elemente zwischen den Tests selbst leeren (innerHTML, Klassen) statt das Dokument zu ersetzen.
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

let current = null;
const saved = new Map();

export function installDom({ storage = fakeStorage() } = {}) {
  if (current) throw new Error('installDom: schon installiert, erst uninstallDom()');
  const html = fs.readFileSync(path.resolve(import.meta.dirname, '../app/index.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/' });
  const w = dom.window;
  const set = { window: w, document: w.document, localStorage: storage, Node: w.Node, Element: w.Element, HTMLElement: w.HTMLElement, SVGElement: w.SVGElement, Event: w.Event, MouseEvent: w.MouseEvent, getComputedStyle: w.getComputedStyle.bind(w) };
  for (const [k, v] of Object.entries(set)) {
    saved.set(k, Object.getOwnPropertyDescriptor(globalThis, k));
    Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  }
  // Layout gibt es in jsdom nicht (clientWidth ist 0, getBoundingClientRect liefert Nullen); Scrollen fehlt ganz
  for (const f of ['scrollIntoView', 'scrollBy', 'scrollTo']) w.Element.prototype[f] ??= function () {};
  // SVG-Geometrie: Einheitsmatrix und die Maße aus den Attributen (reicht für die Rechtecke des Notenblatts)
  const num = (e, a) => parseFloat(e.getAttribute(a)) || 0;
  w.SVGElement.prototype.getCTM ??= () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
  w.SVGElement.prototype.getBBox ??= function () { return { x: num(this, 'x'), y: num(this, 'y'), width: num(this, 'width'), height: num(this, 'height') }; };
  current = { dom, storage, html };
  return { window: w, document: w.document, storage };
}

// Entfernt das DOM und die globals wieder (die vorherigen Werte kommen zurück)
export function uninstallDom() {
  if (!current) return;
  current.dom.window.close();
  for (const [k, d] of saved) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; }
  saved.clear();
  current = null;
}

// Die Daten der bekannten Lieder, wie die App sie vom Server bekommt (pb_hooks/known.js, nach Gruppen geordnet wie in
// core/known.js). Sie liegen nicht mehr in app/, die Tests lesen sie direkt aus der Server-Datei.
import { createRequire } from 'node:module';
import { byGroup } from '../app/js/core/groups.js';
const known = createRequire(import.meta.url)('../pb_hooks/known.js');
export const MELODIES = byGroup(known.MELODIES);
export const SONGS = byGroup(known.SONGS);
