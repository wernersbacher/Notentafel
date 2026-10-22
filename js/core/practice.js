// Üben und Spielen für alle Bereiche: Was geschrieben ist, wartet während der Übung in state.written; die Übungstafel
// selbst wird nie gespeichert. Die Bereiche sagen nur, welche Felder eine Tafel ausmachen und wie eine leere aussieht.
//
// makePractice({ state, fields, fresh, copy }):
//   state    der Zustand des Bereichs (L oder S) mit state.written und state.hist
//   fields   die Felder, die eine Tafel ausmachen und in written warten (z. B. ['rows', 'sel', 'hist'])
//   fresh()  eine leere Übungstafel: die Felder ohne name (der Name beginnt leer, resetPractice lässt ihn stehen)
//   copy(w)  legt den Inhalt von written auf die Übungstafel; false, wenn es nichts zu üben gibt – dann bleibt die
//            Übungstafel unangetastet (das Quiz prüft es damit vor dem Umschalten)
// Felder der laufenden Eingabe (insertMode, countAt, last) setzt der Kern zurück, soweit der Bereich sie kennt.

// Zurückgesetzt beim Beginnen und Beenden der Übung, nicht beim Leeren (dort nur, was fresh() liefert)
const INPUT = { insertMode: false, countAt: null, last: null };
const resetInput = (state) => Object.fromEntries(Object.entries(INPUT).filter(([k]) => k in state));

export function makePractice({ state, fields, fresh, copy }) {
  // Eine neue, leere Übungstafel; das Geschriebene bleibt unberührt liegen
  function startPractice() {
    if (state.written) return;
    state.written = Object.fromEntries([...fields, 'name'].map((k) => [k, state[k]]));
    Object.assign(state, fresh(), resetInput(state), { name: '' });
  }
  // Die Übungstafel wieder leer (beim Wählen eines Spiels); der Name bleibt stehen
  function resetPractice() {
    if (state.written) Object.assign(state, fresh());
  }
  // Legt eine Kopie des Geschriebenen auf die Übungstafel; false, wenn nichts zu üben ist
  function practiceWritten() {
    return !!(state.written && copy(state.written) !== false);
  }
  function endPractice() {
    if (!state.written) return;
    const w = state.written;
    state.written = null;
    Object.assign(state, w, resetInput(state));
  }
  return { startPractice, resetPractice, practiceWritten, endPractice };
}
