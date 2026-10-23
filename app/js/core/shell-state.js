// Zustand, den die Shell (shell.js) mit der Leiste (shell-bar.js) und dem Vorführen (present.js) teilt: der offene Bereich und
// das Speichern-Feld der Leiste. Geschrieben wird er nur in shell.js (setArea, startShell). Eigene Datei, damit
// present.js nicht shell.js importieren muss und so kein Zyklus entsteht.
export const shellState = { area: null, savePop: null };
