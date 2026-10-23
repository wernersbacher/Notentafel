import { START_ROWS } from './config.js';

// Die Lieder selbst (MELODIES) liegen nicht in der App, sondern in pb_hooks/known.js und kommen mit Pro über core/known.js.
// „|“ trennt Zeilen, „-“ ist eine Pause, „:2“ hängt die Länge in Schlägen an (ohne Angabe ein Schlag), z. B. „G:2“ oder „-:2“.

// Macht aus der Schreibweise die Zeilen der Tafel
export function melodyRows(m) {
  const rs = m.notes.split('|').map((line) =>
    line.trim().split(/\s+/).map((tok) => {
      const [id, len] = tok.split(':'), d = len ? +len : 1;
      if (id === '-') return { k: 'r', d };
      return { n: id, h: '', d };
    }));
  while (rs.length < START_ROWS) rs.push([]);
  rs[0].meter = m.meter;
  return rs;
}
