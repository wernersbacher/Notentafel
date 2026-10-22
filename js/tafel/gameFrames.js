// Der Rahmen der Spiele von Melodie (#melPlay) und Rhythmus (#rhyPlay): was über dem Startknopf steht und was die
// Startseite erklärt. fillGameFrames aus core/game.js baut daraus den Hinweis und den Startknopf; die Abschnitte selbst
// stehen in index.html. Reines Modul ohne DOM: nur Texte und ids, so wie sie früher im HTML standen.
export const MEL_FRAMES = [
  {
    game: 'quiz',
    intro: 'Ein Ton erscheint auf einem großen Punkt. Weißt du, welcher es ist? Tippe unten den passenden Knopf.',
    hintId: 'melQuizHint', // hier meldet das Quiz seinen Fortschritt in den Hinweis
    hint: '',
    go: 'melQuizGo',
    label: 'Quiz starten'
  },
  {
    game: 'melo',
    intro: 'Hör gut zu: Die Tafel spielt eine kleine Melodie. Tippe die Töne unten in der richtigen Reihenfolge nach.',
    hint: 'Die Tafel spielt eine kurze Melodie vor, sie liegt verdeckt auf der Tafel. Die Kinder tippen die Töne unten der Reihe nach – jeder richtige Ton deckt seine Karte auf.',
    go: 'meloGo',
    label: 'Melodie-Echo starten'
  },
  {
    game: 'updown',
    intro: 'Zwei Töne erklingen nacheinander. Ist der zweite höher, tiefer oder gleich? Tippe unten deine Antwort.',
    hint: 'Zwei Töne erklingen nacheinander. Die Kinder sagen, ob der zweite höher, tiefer oder gleich ist, und tippen es unten. Mit der Lösung bekommen die beiden Punkte ihre Farbe.',
    go: 'updownGo',
    label: 'Spiel starten'
  },
  {
    game: 'guess',
    intro: 'Hör dir den Anfang eines Lieds an. Welches Lied ist es? Wähle unten den richtigen Namen.',
    hint: 'Der Anfang eines bekannten Lieds erklingt, die Kinder wählen unten aus drei Namen. Mit der Lösung steht der Anfang als Farbpunkte auf der Tafel.',
    go: 'guessGo',
    label: 'Spiel starten'
  }
];

export const RHY_FRAMES = [
  {
    game: 'echo',
    intro: 'Die Tafel spielt einen Rhythmus vor. Hör gut zu und klatsche ihn nach! Danach könnt ihr ihn euch auf der Tafel ansehen.',
    hint: 'Die Tafel spielt einen Rhythmus vor, die Kinder klatschen ihn nach. Die Zeile bleibt leer, bis man ihn auflöst.',
    go: 'echoGo',
    label: 'Neuer Rhythmus'
  },
  {
    game: 'which',
    intro: 'Auf der Tafel stehen mehrere Rhythmen, aber nur einer erklingt. Welcher war\'s? Tippe unten seine Nummer.',
    hint: 'Auf der Tafel stehen mehrere Rhythmen, einer davon erklingt. Die Kinder tippen unten seine Nummer – eine falsche wird rot, die richtige grün. Danach spielt ein Tipp auf eine Zeilennummer diesen Rhythmus ab.',
    go: 'whichGo',
    label: 'Spiel starten'
  },
  {
    game: 'read',
    intro: 'Auf der Tafel steht ein Rhythmus. Kannst du ihn vom Blatt klatschen? „Mitklatschen“ gibt dir den Grundschlag.',
    hint: 'Ein Rhythmus steht auf der Tafel, die Kinder klatschen ihn vom Blatt. „Mitklatschen“ zählt ein und gibt den Grundschlag, die Noten leuchten mit. „Anhören“ spielt ihn zur Kontrolle.',
    go: 'readGo',
    label: 'Spiel starten'
  },
  {
    game: 'build',
    intro: 'Ein Rhythmus erklingt. Lege ihn unten Stück für Stück aus Bausteinen nach.',
    hint: 'Ein Rhythmus erklingt, die Kinder legen ihn unten aus Bausteinen nach. Jeder richtige Baustein erscheint auf der Tafel, ein falscher wackelt nur. Je schwerer die Notenwerte, desto mehr Bausteine.',
    go: 'buildGo',
    label: 'Spiel starten'
  },
  {
    game: 'fix',
    intro: 'Die Tafel spielt den Rhythmus – aber in einem Takt ist ein Fehler versteckt. Tippe auf den Takt, der anders klingt.',
    hint: 'Ein Rhythmus steht auf der Tafel, die Tafel spielt ihn aber mit einem Fehler in einem Takt. Die Kinder tippen den Takt auf der Tafel oder unten – unten wird ein falscher rot, mit der Lösung der gesuchte grün. Es sind immer mindestens zwei Takte.',
    go: 'fixGo',
    label: 'Spiel starten'
  }
];
