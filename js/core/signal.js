// Ein Signal ist ein gemeinsames Muster für „etwas ist passiert, sag es allen, die es wissen wollen“.
// makeSignal() liefert signal; signal(f) meldet f an und gibt eine Funktion zum Abmelden zurück.
// signal.emit(…args) ruft alle Angemeldeten mit denselben Argumenten auf. Es läuft dabei über eine Kopie der Liste:
// Wer sich während des Durchlaufs ab- oder anmeldet, wirkt erst beim nächsten Mal. Ohne Angemeldete tut emit nichts.
export function makeSignal() {
  const listeners = [];
  const signal = (f) => {
    listeners.push(f);
    let off = false;
    return () => {
      if (off) return; // zweimal abmelden ist harmlos
      off = true;
      const i = listeners.indexOf(f);
      if (i >= 0) listeners.splice(i, 1);
    };
  };
  signal.emit = (...args) => { for (const f of listeners.slice()) f(...args); };
  signal.clear = () => { listeners.length = 0; };
  return signal;
}
